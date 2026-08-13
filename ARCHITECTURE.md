# CMS ERP – Technische Basis

## Architekturentscheidung

Das System startet als **modularer Monolith**. Fachmodule bleiben in Code, API,
Datenmodell, Berechtigungen und Tests getrennt. Ein Modul darf nur über seine
öffentlichen Services oder definierte Ereignisse mit anderen Modulen kommunizieren.

## Laufzeit

| Dienst | Aufgabe |
| --- | --- |
| `gateway` | Caddy, HTTPS und Routing |
| `web` | React-SPA, ausgeliefert durch nginx |
| `api` | NestJS-API und Fachmodule |
| `postgres` | Gemeinsame relationale Datenbank |
| `keycloak` | Anmeldung, Benutzer, Rollen und OIDC |

Die Anwendung ist ausschließlich über `https://cms-erp.localhost` erreichbar.
PostgreSQL, API, Web und Keycloak veröffentlichen keine eigenen Host-Ports.

## Modulvertrag

Jedes neue Fachmodul erhält:

- `apps/api/src/modules/<modul>` für Controller, Services und Domänenlogik,
- `apps/web/src/modules/<modul>` für Seiten und UI-Komponenten,
- eigene Tabellen und versionierte Prisma-Migrationen,
- eigene Rollen beziehungsweise Berechtigungen,
- Unit-, Integrations- und Browser-Tests.

Fremde Modultabellen werden nicht direkt gelesen oder verändert. Gemeinsam genutzte
technische Funktionen liegen unter `core`, wiederverwendbare UI-Bausteine später
unter `shared`.

## Sicherheit

- OIDC Authorization Code Flow mit PKCE über Keycloak
- zentrale Prüfung signierter Access Tokens in der API
- keine Kennwörter in der Anwendungsdatenbank
- HTTPS mit Caddys lokaler Certificate Authority
- Entwicklungskennwörter nur in der nicht eingecheckten `.env`

Die mitgelieferten Konten und Kennwörter sind ausschließlich für lokale Entwicklung.

