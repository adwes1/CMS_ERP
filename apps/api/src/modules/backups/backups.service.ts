import { ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { cp, mkdtemp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const BACKUP_NAME = /^cms-erp-backup-\d{8}-\d{6}-[0-9a-f-]{36}\.zip$/;

export type BackupEntry = {
  id: string;
  filename: string;
  createdAt: string;
  sizeBytes: number;
};

@Injectable()
export class BackupsService implements OnModuleInit {
  private readonly logger = new Logger(BackupsService.name);
  private readonly backupDirectory = process.env.BACKUP_DIR || join(process.cwd(), 'data', 'backups');
  private readonly filesDirectory = process.env.ARTICLE_IMAGE_DIR || join(process.cwd(), 'data', 'article-images');
  private operationRunning = false;

  async onModuleInit() {
    await Promise.all([
      mkdir(this.backupDirectory, { recursive: true }),
      mkdir(this.filesDirectory, { recursive: true }),
    ]);
    const staleRestoreDirectories = (await readdir(this.filesDirectory)).filter((name) => name.startsWith('.restore-'));
    await Promise.all(staleRestoreDirectories.map((name) => rm(join(this.filesDirectory, name), { recursive: true, force: true })));
  }

  async list(): Promise<BackupEntry[]> {
    await mkdir(this.backupDirectory, { recursive: true });
    const filenames = (await readdir(this.backupDirectory)).filter((name) => BACKUP_NAME.test(name));
    const entries = await Promise.all(filenames.map(async (filename) => {
      const fileStat = await stat(join(this.backupDirectory, filename));
      return {
        id: filename,
        filename,
        createdAt: fileStat.mtime.toISOString(),
        sizeBytes: fileStat.size,
      };
    }));
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create(): Promise<BackupEntry> {
    return this.exclusive(async () => {
      const workspace = await mkdtemp(join(tmpdir(), 'cms-erp-backup-'));
      const filename = this.newFilename();
      const archivePath = join(this.backupDirectory, filename);
      try {
        const dumpPath = join(workspace, 'database.dump');
        const filesPath = join(workspace, 'files');
        await mkdir(filesPath, { recursive: true });
        await this.runPostgres('pg_dump', [
          '--format=custom',
          '--no-owner',
          '--no-privileges',
          `--file=${dumpPath}`,
        ]);
        await cp(this.filesDirectory, filesPath, { recursive: true, force: true });
        await writeFile(join(workspace, 'manifest.json'), JSON.stringify({
          formatVersion: 1,
          createdAt: new Date().toISOString(),
          contents: ['database.dump', 'files'],
        }, null, 2));
        await run('zip', ['-q', '-r', archivePath, 'manifest.json', 'database.dump', 'files'], {
          cwd: workspace,
          maxBuffer: 5 * 1024 * 1024,
        });
        const fileStat = await stat(archivePath);
        return {
          id: filename,
          filename,
          createdAt: fileStat.mtime.toISOString(),
          sizeBytes: fileStat.size,
        };
      } catch (error) {
        await rm(archivePath, { force: true });
        this.logger.error('Backup konnte nicht erstellt werden', error);
        throw new InternalServerErrorException('Backup konnte nicht erstellt werden');
      } finally {
        await rm(workspace, { recursive: true, force: true });
      }
    });
  }

  async open(id: string) {
    const path = await this.resolveExisting(id);
    const fileStat = await stat(path);
    return { filename: basename(path), size: fileStat.size, stream: createReadStream(path) };
  }

  async restore(id: string) {
    return this.exclusive(async () => {
      const archivePath = await this.resolveExisting(id);
      const workspace = await mkdtemp(join(tmpdir(), 'cms-erp-restore-'));
      const stagedFiles = join(this.filesDirectory, `.restore-${randomUUID()}`);
      try {
        await run('unzip', ['-q', archivePath, '-d', workspace], { maxBuffer: 5 * 1024 * 1024 });
        await this.validateManifest(workspace);
        await mkdir(stagedFiles);
        await cp(join(workspace, 'files'), stagedFiles, { recursive: true, force: true });
        await this.runPostgres('pg_restore', [
          '--clean',
          '--if-exists',
          '--no-owner',
          '--no-privileges',
          '--exit-on-error',
          '--single-transaction',
          `--dbname=${this.databaseConnection().PGDATABASE}`,
          join(workspace, 'database.dump'),
        ]);
        await this.activateStagedFiles(stagedFiles);
        return { restored: true, restoredAt: new Date().toISOString() };
      } catch (error) {
        this.logger.error(`Backup ${id} konnte nicht wiederhergestellt werden`, error);
        if (error instanceof NotFoundException) throw error;
        throw new InternalServerErrorException('Backup konnte nicht wiederhergestellt werden');
      } finally {
        await rm(stagedFiles, { recursive: true, force: true });
        await rm(workspace, { recursive: true, force: true });
      }
    });
  }

  async remove(id: string) {
    if (this.operationRunning) throw new ConflictException('Es läuft bereits ein Backup-Vorgang');
    const path = await this.resolveExisting(id);
    await rm(path);
  }

  private async validateManifest(workspace: string) {
    try {
      const manifest = JSON.parse(await readFile(join(workspace, 'manifest.json'), 'utf8')) as { formatVersion?: number };
      if (manifest.formatVersion !== 1) throw new Error('Unbekanntes Backup-Format');
      const dump = await stat(join(workspace, 'database.dump'));
      const files = await stat(join(workspace, 'files'));
      if (!dump.isFile() || !files.isDirectory()) throw new Error('Backup ist unvollständig');
    } catch {
      throw new InternalServerErrorException('Backup-Datei ist ungültig oder unvollständig');
    }
  }

  private async activateStagedFiles(stagedFiles: string) {
    const stagingName = basename(stagedFiles);
    const currentEntries = (await readdir(this.filesDirectory)).filter((entry) => entry !== stagingName);
    await Promise.all(currentEntries.map((entry) => rm(join(this.filesDirectory, entry), { recursive: true, force: true })));
    const restoredEntries = await readdir(stagedFiles);
    await Promise.all(restoredEntries.map((entry) => rename(join(stagedFiles, entry), join(this.filesDirectory, entry))));
  }

  private async resolveExisting(id: string) {
    if (basename(id) !== id || !BACKUP_NAME.test(id)) throw new NotFoundException('Backup wurde nicht gefunden');
    const path = join(this.backupDirectory, id);
    try {
      const fileStat = await stat(path);
      if (!fileStat.isFile()) throw new Error('Kein reguläres Backup');
      return path;
    } catch {
      throw new NotFoundException('Backup wurde nicht gefunden');
    }
  }

  private async runPostgres(command: 'pg_dump' | 'pg_restore', args: string[]) {
    await run(command, args, {
      env: { ...process.env, ...this.databaseConnection() },
      maxBuffer: 5 * 1024 * 1024,
    });
  }

  private databaseConnection(): NodeJS.ProcessEnv {
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl) throw new Error('DATABASE_URL fehlt');
    const url = new URL(rawUrl);
    const sslMode = url.searchParams.get('sslmode');
    return {
      PGHOST: url.hostname,
      PGPORT: url.port || '5432',
      PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, '')),
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      ...(sslMode ? { PGSSLMODE: sslMode } : {}),
    };
  }

  private newFilename() {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    return `cms-erp-backup-${timestamp}-${randomUUID()}.zip`;
  }

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.operationRunning) throw new ConflictException('Es läuft bereits ein Backup-Vorgang');
    this.operationRunning = true;
    try {
      return await operation();
    } finally {
      this.operationRunning = false;
    }
  }
}
