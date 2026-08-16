import { Injectable } from '@nestjs/common';
import { constants } from 'node:fs';
import { access, readdir, stat, statfs } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../../core/database/prisma.service';

type CheckStatus = 'ok' | 'warning' | 'error';

type SystemCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  details?: Record<string, string | number>;
};

type GithubWorkflowRuns = {
  workflow_runs?: Array<{
    head_sha: string;
    html_url: string;
    updated_at: string;
  }>;
};

@Injectable()
export class SystemUpdateService {
  private readonly repository = process.env.UPDATE_REPOSITORY || 'adwes1/CMS_ERP';
  private readonly branch = process.env.UPDATE_BRANCH || 'main';
  private readonly workflow = process.env.UPDATE_WORKFLOW || 'container-images.yml';
  private readonly currentVersion = process.env.APP_VERSION || '0.3.3a';
  private readonly currentCommit = process.env.APP_COMMIT_SHA || 'development';
  private readonly migrationDirectory = join(process.cwd(), 'prisma', 'migrations');
  private readonly filesDirectory = process.env.ARTICLE_IMAGE_DIR || join(process.cwd(), 'data', 'article-images');
  private readonly backupDirectory = process.env.BACKUP_DIR || join(process.cwd(), 'data', 'backups');

  constructor(private readonly prisma: PrismaService) {}

  async status() {
    const [version, databaseChecks, containerChecks] = await Promise.all([
      this.versionStatus(),
      this.databaseChecks(),
      this.containerChecks(),
    ]);
    const checks = [...databaseChecks, ...containerChecks];
    return {
      version,
      checks,
      systemReady: !checks.some((check) => check.status === 'error'),
      checkedAt: new Date().toISOString(),
    };
  }

  private async versionStatus() {
    const repositoryUrl = `https://github.com/${this.repository}`;
    try {
      const query = new URLSearchParams({ branch: this.branch, status: 'success', per_page: '1' });
      const response = await fetch(`https://api.github.com/repos/${this.repository}/actions/workflows/${encodeURIComponent(this.workflow)}/runs?${query}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'CMS-ERP-Version-Check',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error(`GitHub antwortet mit ${response.status}`);
      const workflowRuns = await this.readJson<GithubWorkflowRuns>(response, 1024 * 1024);
      const latest = workflowRuns.workflow_runs?.[0];
      if (!latest) throw new Error('Kein erfolgreicher Container-Build gefunden');
      const comparable = /^[0-9a-f]{40}$/i.test(this.currentCommit);
      return {
        status: comparable && latest.head_sha === this.currentCommit ? 'current' : comparable ? 'update_available' : 'unknown',
        currentVersion: this.currentVersion,
        currentCommit: this.currentCommit,
        latestCommit: latest.head_sha,
        latestPublishedAt: latest.updated_at,
        repositoryUrl,
        latestUrl: latest.html_url,
        branch: this.branch,
      };
    } catch (error) {
      return {
        status: 'unknown',
        currentVersion: this.currentVersion,
        currentCommit: this.currentCommit,
        latestCommit: null,
        latestPublishedAt: null,
        repositoryUrl,
        latestUrl: null,
        branch: this.branch,
        message: error instanceof Error ? error.message : 'GitHub konnte nicht erreicht werden',
      };
    }
  }

  private async databaseChecks(): Promise<SystemCheck[]> {
    try {
      const [database] = await this.prisma.$queryRaw<Array<{ databaseName: string; sizeBytes: bigint; serverVersion: string }>>`
        SELECT
          current_database() AS "databaseName",
          pg_database_size(current_database()) AS "sizeBytes",
          current_setting('server_version') AS "serverVersion"
      `;
      const [schema] = await this.prisma.$queryRaw<Array<{ tableCount: number }>>`
        SELECT COUNT(*)::int AS "tableCount"
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `;
      const [constraints] = await this.prisma.$queryRaw<Array<{ notValidated: number }>>`
        SELECT COUNT(*)::int AS "notValidated"
        FROM pg_constraint constraint_entry
        JOIN pg_namespace namespace_entry ON namespace_entry.oid = constraint_entry.connamespace
        WHERE namespace_entry.nspname = 'public' AND NOT constraint_entry.convalidated
      `;
      const applied = await this.prisma.$queryRaw<Array<{ migrationName: string; finishedAt: Date | null; rolledBackAt: Date | null }>>`
        SELECT
          migration_name AS "migrationName",
          finished_at AS "finishedAt",
          rolled_back_at AS "rolledBackAt"
        FROM "_prisma_migrations"
      `;
      const expected = (await readdir(this.migrationDirectory, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && /^\d{14}_[a-z0-9_]+$/i.test(entry.name))
        .map((entry) => entry.name)
        .sort();
      const completed = new Set(applied.filter((entry) => entry.finishedAt && !entry.rolledBackAt).map((entry) => entry.migrationName));
      const pending = expected.filter((migration) => !completed.has(migration));
      const failed = applied.filter((entry) => !entry.finishedAt && !entry.rolledBackAt).map((entry) => entry.migrationName);

      return [
        {
          id: 'database',
          label: 'Datenbankverbindung',
          status: schema.tableCount === 0 || constraints.notValidated > 0 ? 'error' : 'ok',
          message: schema.tableCount === 0
            ? 'Das öffentliche Datenbankschema enthält keine Tabellen.'
            : constraints.notValidated > 0
              ? `${constraints.notValidated} Datenbank-Constraint(s) sind nicht vollständig validiert.`
              : 'PostgreSQL ist erreichbar; Schema und Constraints sind vollständig lesbar.',
          details: {
            datenbank: database.databaseName,
            version: database.serverVersion,
            groesseBytes: Number(database.sizeBytes),
            tabellen: schema.tableCount,
            nichtValidierteConstraints: constraints.notValidated,
          },
        },
        {
          id: 'migrations',
          label: 'Datenbankmigrationen',
          status: failed.length ? 'error' : pending.length ? 'warning' : 'ok',
          message: failed.length
            ? `${failed.length} Migration(en) sind fehlgeschlagen.`
            : pending.length
              ? `${pending.length} Migration(en) wurden noch nicht angewendet.`
              : `Alle ${expected.length} Migrationen sind vollständig angewendet.`,
          details: {
            erwartet: expected.length,
            angewendet: completed.size,
            ausstehend: pending.length,
            fehlgeschlagen: failed.length,
          },
        },
      ];
    } catch {
      return [{
        id: 'database',
        label: 'Datenbank und Migrationen',
        status: 'error',
        message: 'Die Datenbank oder ihr Migrationsstand konnte nicht vollständig geprüft werden.',
      }];
    }
  }

  private async containerChecks(): Promise<SystemCheck[]> {
    const [web, keycloak, files, backups, latestBackup] = await Promise.all([
      this.endpointCheck('web', 'Web-Container', process.env.WEB_HEALTH_URL || 'http://web/health'),
      this.endpointCheck('keycloak', 'Anmeldedienst', process.env.KEYCLOAK_HEALTH_URL || 'http://keycloak:9000/auth/health/ready'),
      this.storageCheck('article-files', 'Verknüpfte Dateien', this.filesDirectory),
      this.storageCheck('backups', 'Backup-Speicher', this.backupDirectory),
      this.backupCheck(),
    ]);
    return [
      {
        id: 'api',
        label: 'API-Container',
        status: 'ok',
        message: 'Der API-Container arbeitet ordnungsgemäß.',
        details: { node: process.version, laufzeitSekunden: Math.floor(process.uptime()) },
      },
      web,
      keycloak,
      files,
      backups,
      latestBackup,
    ];
  }

  private async endpointCheck(id: string, label: string, url: string): Promise<SystemCheck> {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await response.body?.cancel();
      return { id, label, status: 'ok', message: `${label} ist erreichbar.` };
    } catch (error) {
      return {
        id,
        label,
        status: 'error',
        message: `${label} ist nicht erreichbar${error instanceof Error ? `: ${error.message}` : '.'}`,
      };
    }
  }

  private async readJson<T>(response: Response, maxBytes: number): Promise<T> {
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new Error('GitHub-Antwort überschreitet das erlaubte Größenlimit');
    }
    if (!response.body) throw new Error('GitHub hat keine Antwortdaten geliefert');

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let received = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > maxBytes) {
          await reader.cancel();
          throw new Error('GitHub-Antwort überschreitet das erlaubte Größenlimit');
        }
        chunks.push(Buffer.from(value));
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
    } finally {
      reader.releaseLock();
    }
  }

  private async storageCheck(id: string, label: string, path: string): Promise<SystemCheck> {
    try {
      await access(path, constants.R_OK | constants.W_OK);
      const storage = await statfs(path);
      return {
        id,
        label,
        status: 'ok',
        message: `${label} ist les- und beschreibbar.`,
        details: { freiBytes: storage.bavail * storage.bsize },
      };
    } catch {
      return {
        id,
        label,
        status: 'error',
        message: `${label} kann nicht gelesen oder beschrieben werden.`,
      };
    }
  }

  private async backupCheck(): Promise<SystemCheck> {
    try {
      const names = (await readdir(this.backupDirectory)).filter((name) => /^cms-erp-backup-.+\.zip$/.test(name));
      if (!names.length) {
        return {
          id: 'latest-backup',
          label: 'Datensicherung',
          status: 'warning',
          message: 'Es ist noch kein Backup vorhanden. Vor einem Update sollte ein Backup erstellt werden.',
        };
      }
      const backups = await Promise.all(names.map(async (name) => ({ name, file: await stat(join(this.backupDirectory, name)) })));
      const latest = backups.sort((a, b) => b.file.mtimeMs - a.file.mtimeMs)[0];
      const ageDays = Math.floor((Date.now() - latest.file.mtimeMs) / 86_400_000);
      return {
        id: 'latest-backup',
        label: 'Datensicherung',
        status: ageDays > 7 ? 'warning' : 'ok',
        message: ageDays > 7
          ? `Das jüngste Backup ist ${ageDays} Tage alt. Vor einem Update sollte ein neues Backup erstellt werden.`
          : 'Ein aktuelles, wiederherstellbares ZIP-Backup ist vorhanden.',
        details: {
          datum: latest.file.mtime.toISOString(),
          groesseBytes: latest.file.size,
          alterTage: ageDays,
        },
      };
    } catch {
      return {
        id: 'latest-backup',
        label: 'Datensicherung',
        status: 'warning',
        message: 'Der vorhandene Backup-Stand konnte nicht ermittelt werden.',
      };
    }
  }
}
