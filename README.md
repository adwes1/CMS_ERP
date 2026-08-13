# CMS ERP

Lokale, Docker-basierte Grundlage für ein modulares CMS-/ERP-System mit React,
NestJS, PostgreSQL, Keycloak und HTTPS über Caddy.

## Start

Voraussetzung ist ein laufender Docker-Dienst.

```bash
docker compose up --build -d
```

Danach:

- Anwendung: `https://cms-erp.localhost`
- API-Dokumentation: `https://cms-erp.localhost/api/docs`
- API-Healthcheck: `https://cms-erp.localhost/api/health`
- Keycloak-Administration: `https://cms-erp.localhost/auth/admin/`

Lokaler Anwendungsbenutzer:

- Benutzername: `admin`
- Kennwort: Wert von `KEYCLOAK_APP_ADMIN_PASSWORD` in `.env`

Keycloak-Administration:

- Benutzername: `admin`
- Kennwort: Wert von `KEYCLOAK_ADMIN_PASSWORD` in `.env`

## Lokales HTTPS vertrauen

Caddy erzeugt eine lokale CA. Nach dem ersten Start kann ihr Root-Zertifikat kopiert
und unter macOS als vertrauenswürdig eingetragen werden:

```bash
docker compose cp gateway:/data/caddy/pki/authorities/local/root.crt ./cms-erp-local-ca.crt
security add-trusted-cert -r trustRoot \
  -k "$HOME/Library/Keychains/login.keychain-db" ./cms-erp-local-ca.crt
```

Ohne diesen Schritt funktioniert HTTPS ebenfalls, der Browser zeigt jedoch eine
Zertifikatswarnung. Die Vertrauensstellung gilt nur für den aktuellen macOS-Benutzer.
Kommandozeilenwerkzeuge mit eigenem CA-Bundle können das Zertifikat explizit über
`--cacert ./cms-erp-local-ca.crt` verwenden.

## Betrieb

```bash
docker compose ps
docker compose logs -f
docker compose down
```

Daten liegen in Docker-Volumes. `docker compose down` behält sie; der Zusatz `-v`
würde sie unwiderruflich entfernen und sollte nur bewusst verwendet werden.

Die ausführliche Beschreibung des aktuellen Funktionsstands, der API, des
Datenmodells, des Betriebs und der offenen Punkte steht in
[docs/PROJEKTDOKUMENTATION.md](./docs/PROJEKTDOKUMENTATION.md). Verbindliche
Architekturregeln stehen ergänzend in [ARCHITECTURE.md](./ARCHITECTURE.md).
