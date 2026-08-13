import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../core/database/prisma.service';
import { ExternalIntegrationsService } from './external-integrations.service';

describe('ExternalIntegrationsService URL-Schutz', () => {
  let service: ExternalIntegrationsService;

  beforeEach(() => {
    process.env.INTEGRATION_ENCRYPTION_KEY = 'test-key-used-only-by-the-unit-tests';
    service = new ExternalIntegrationsService({} as PrismaService);
  });

  afterEach(() => {
    delete process.env.INTEGRATION_ENCRYPTION_KEY;
  });

  it.each([
    ['unverschlüsseltes HTTP', 'http://example.com'],
    ['Zugangsdaten in der URL', 'https://user:password@example.com'],
    ['zusätzlicher Pfad', 'https://example.com/shop'],
    ['Loopback-Adresse', 'https://127.0.0.1'],
    ['IPv6-Loopback-Adresse', 'https://[::1]'],
    ['Cloud-Metadatenadresse', 'https://169.254.169.254'],
  ])('blockiert %s', async (_description, url) => {
    await expect(service['normalizeBaseUrl'](url)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bricht übergroße JSON-Antworten anhand der tatsächlichen Datenmenge ab', async () => {
    const response = new Response(JSON.stringify({ data: 'x'.repeat(2_000) }));

    await expect(service['readJson'](response, 1_000)).rejects.toThrow(
      'Die Antwort der Schnittstelle ist zu groß',
    );
  });

  it('lehnt ungültiges JSON kontrolliert ab', async () => {
    await expect(service['readJson'](new Response('{kaputt'), 1_000)).rejects.toThrow(
      'Die Schnittstelle hat ungültiges JSON geliefert',
    );
  });

  it('bricht auch Binärdaten ohne Content-Length am Größenlimit ab', async () => {
    const response = new Response(new Uint8Array(2_000));

    await expect(service['readBytes'](response, 1_000)).rejects.toThrow(
      'Die Antwort der Schnittstelle ist zu groß',
    );
  });
});
