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
- Kennwort: `admin` (lokale Entwicklungsumgebung)

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

## Installation auf Synology mit Portainer

Für eine Installation auf einer Synology ist die separate Datei
[`compose.portainer.yaml`](./compose.portainer.yaml) vorgesehen. Sie verwendet
fertige Multi-Arch-Images aus der GitHub Container Registry und funktioniert
dadurch sowohl auf Intel-/AMD- als auch auf ARM-Synology-Systemen. Nach einem Push
auf `main` baut der Workflow `.github/workflows/container-images.yml` die Images.

Den Stack in Portainer über **Stacks → Add stack → Repository** anlegen, das
Git-Repository eintragen und als Compose-Pfad `compose.portainer.yaml` verwenden.
Alternativ kann die YAML im Web-Editor eingefügt werden. Bei einem Fork muss
`IMAGE_NAMESPACE` auf den eigenen, kleingeschriebenen GitHub-Benutzernamen bzw.
Organisationsnamen gesetzt werden. Sind die GHCR-Pakete privat, muss `ghcr.io`
zuvor unter **Registries** mit einem GitHub-Paket-Token hinterlegt werden.

Unter **Environment variables** mindestens die Werte aus
`.env.portainer.example` eintragen. `APP_ORIGIN` ist die vollständige, vom Browser
erreichbare Adresse ohne abschließenden Slash, zum Beispiel
`http://192.168.1.20:8090`. `APP_PORT` muss denselben Port enthalten. Alle mit
`CHANGE_ME` markierten Werte müssen durch eigene, sichere Kennwörter bzw. lange
zufällige Secrets ersetzt werden. `KEYCLOAK_API_CLIENT_SECRET` und
`INTEGRATION_ENCRYPTION_KEY` müssen unterschiedliche Werte erhalten.

Ein geeignetes Secret kann beispielsweise mit `openssl rand -hex 32` erzeugt
werden. Die mitgelieferte Portainer-Variante verwendet zunächst HTTP und sollte
so nur im vertrauenswürdigen Heim-/Firmennetz betrieben werden. Für einen Zugriff
aus dem Internet sollte davor HTTPS über Synology Reverse Proxy oder einen
anderen TLS-Reverse-Proxy eingerichtet und dessen öffentliche URL als
`APP_ORIGIN` verwendet werden.

Vor dem ersten Deployment auf der Synology diese Verzeichnisse anlegen:

```text
/volume1/docker/CMS_ERP/postgres
/volume1/docker/CMS_ERP/article-images
/volume1/docker/CMS_ERP/backups
```

Nach erfolgreichem Deployment ist die Anwendung unter `APP_ORIGIN` erreichbar.
Die Datenbank, Artikelbilder und Sicherungen liegen damit sichtbar unter
`/volume1/docker/CMS_ERP` und bleiben beim Aktualisieren oder erneuten Erstellen
des Stacks erhalten. Falls das Docker-Share auf einem anderen Volume liegt, sind
die drei Quellpfade in `compose.portainer.yaml` entsprechend anzupassen.
