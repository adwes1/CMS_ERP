import { BackupsService } from './backups.service';

describe('BackupsService', () => {
  const service = new BackupsService();

  it.each([
    'manifest.json',
    'database.dump',
    'files/',
    'files/article-image.webp',
    'files/nested/article-image.webp',
  ])('akzeptiert erwartete Archivpfade: %s', (entry) => {
    expect(service['archiveEntryIsSafe'](entry)).toBe(true);
  });

  it.each([
    '../database.dump',
    'files/../../outside',
    '/absolute/path',
    'files\\..\\outside',
    'unexpected.txt',
  ])('blockiert unzulässige Archivpfade: %s', (entry) => {
    expect(service['archiveEntryIsSafe'](entry)).toBe(false);
  });
});
