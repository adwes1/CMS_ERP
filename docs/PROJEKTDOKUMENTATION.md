# CMS ERP – Projektdokumentation

**Dokumentationsstand:** 15. August 2026
**Projektversion:** 0.3.1a
**Status:** lauffähige lokale Entwicklungsgrundlage mit ersten Kernfunktionen

## 1. Projektziel

CMS ERP ist als modular erweiterbares CMS-/ERP-System angelegt. Die aktuelle
Version stellt eine vollständig containerisierte lokale Entwicklungsumgebung sowie
erste fachliche Funktionen bereit. Der Schwerpunkt der bisherigen Arbeiten lag auf:

- einer wartbaren technischen Basis als modularer Monolith,
- zentraler Anmeldung und rollenbasierter Autorisierung,
- einer konsistenten Weboberfläche,
- Benutzer- und Adressverwaltung,
- Artikel-, Lager- und Produktionsverwaltung,
- Verwaltung externer Schnittstellen,
- konfigurierbaren Spezifikationen für Adressen,
- reproduzierbarem Betrieb über Docker Compose und lokalem HTTPS sowie
  vorbereiteter Bereitstellung über GitHub Container Registry und Portainer.

Die Bereiche Aufträge, Angebote und Buchhaltung sowie Lagerbewegungen sind in der
Navigation bereits vorgesehen, aber noch nicht fachlich implementiert. In der
Produktion sind Anweisungsvorlagen und daraus erzeugte Produktionen umgesetzt.

## 2. Aktueller Funktionsumfang

| Bereich | Stand | Umgesetzte Funktionen |
| --- | --- | --- |
| Infrastruktur | umgesetzt | lokales Docker Compose, Portainer-Stack, Dienstabhängigkeiten, Healthchecks, persistente Volumes und Multi-Arch-Containerworkflow |
| HTTPS und Routing | umgesetzt | zentraler Caddy-Gateway, lokale CA, Sicherheitsheader |
| Authentifizierung | umgesetzt | Keycloak, OIDC Authorization Code Flow mit PKCE, Token-Aktualisierung |
| Autorisierung | umgesetzt | zentrale API-Guards und Realm-Rollen `cms-erp-user`/`cms-erp-admin` |
| Benutzerverwaltung | umgesetzt | auflisten, anlegen, bearbeiten, aktivieren/deaktivieren, Administratorrolle, Passwortwechsel |
| Benutzerprofile | umgesetzt | automatische Synchronisierung eines lokalen Profils beim ersten API-Aufruf |
| Adressen | umgesetzt | Übersicht, Suche, Anlage und Bearbeitung mit automatisch vergebener Adressnummer |
| Adressdetails | umgesetzt | Stammdaten, Lieferadressen, Bankdaten, Ansprechpartner, Dokumentverweise und gekaufte Artikel |
| Spezifikationen | umgesetzt | auflisten sowie durch Administratoren anlegen, umbenennen und löschen |
| Artikel | umgesetzt | Übersicht, Detailabruf, Suche, Anlage und Bearbeitung einschließlich automatischer Nummern, Preisen, Lagerbeständen, Varianten, ausgelagertem Produktbild und Produktionspositionen |
| Artikelarten | umgesetzt | sieben konfigurierbare Arten mit Bezeichnung, Nummernpräfix, Textfarbe und nächster Nummer |
| Artikeleinheiten | umgesetzt | auflisten; durch Administratoren anlegen, umbenennen und löschen |
| Lagerplätze | umgesetzt | Übersicht, Suche sowie Anlage, Bearbeitung und geschützte Löschung |
| Bestandsübersicht | umgesetzt | Kennzahlen, lagerplatzbezogene Bestände, Bewertung, kritische und unbewertete Positionen |
| Produktionsanweisungen | umgesetzt | Übersicht und vollständige Pflege verschachtelter Elemente und Arbeitsschritte |
| Produktionen | umgesetzt | Produktionsübersicht, Suche und Erzeugung unveränderlicher Arbeitskopien aus Anweisungsvorlagen |
| Zahlungsarten | umgesetzt | auflisten; durch Administratoren anlegen und löschen |
| Externe Schnittstellen | umgesetzt | Shopware-6-Verbindungen verwalten, Zugangsdaten verschlüsseln und Verbindung testen |
| Datenfreigaben | umgesetzt | Import, separaten Bestandsimport, Export, Änderung und Löschung je Schnittstelle freigeben oder sperren |
| Shopware-Kundenimport | umgesetzt | schreibfreie Vorschau und bestätigter, paketweiser Import mit Dublettenprüfung |
| Shopware-Artikelimport | umgesetzt | Vorschau und paketweiser Import einschließlich Bestand, Medien und Variantenbeziehungen |
| Shopware-Bestandsabgleich | umgesetzt | konfigurierbarer Hintergrundabgleich, Status und letzte Laufmeldung; Fremdbestände bleiben erhalten |
| Backup | umgesetzt | Datenbank und Artikelbilder als ZIP sichern, herunterladen, wiederherstellen und löschen |
| Systemaktualisierung | umgesetzt | Versions-, Container-, Datenbank-, Migrations-, Speicher- und Backup-Prüfungen anzeigen |
| Eigene API-Anbindung | umgesetzt | Basis-URL, Authentifizierungsart und verfügbare REST-Ressourcen anzeigen |
| API-Dokumentation | umgesetzt | Swagger/OpenAPI unter `/api/docs` |
| Tests | begonnen | 18 bestandene API-Tests; Vitest ist konfiguriert, Frontend-Testfälle fehlen |
| Weitere ERP-Module | geplant | Aufträge, Angebote, Buchhaltung, Lagerbewegungen, Systemgrundeinstellungen sowie Rollen & Rechte zeigen Platzhalterseiten |

## 3. Bisher durchgeführte Arbeiten

### 3.1 Technische Grundlage

- Monorepository mit getrennten Anwendungen unter `apps/api` und `apps/web`
- Node.js 22 als Laufzeitbasis
- NestJS-API und React-SPA mit TypeScript
- PostgreSQL als gemeinsame relationale Datenbank
- Prisma als Datenzugriffsschicht mit versionierten Migrationen
- Multi-Stage-Docker-Builds für API und Webanwendung
- eigener API-Docker-Test-Stage und getrennte Produktionsabhängigkeiten
- GitHub-Actions-Workflow für getestete Multi-Arch-Images (`amd64`/`arm64`) in GHCR
- nginx zur Auslieferung der kompilierten SPA
- Caddy als einziger veröffentlichter Einstiegspunkt auf Port 80/443
- zusätzlicher Portainer-Stack für NAS-/Serverbetrieb mit vorkompilierten Images
- getrennte persistente Ablagen für Datenbank, Artikelbilder und ZIP-Backups
- PostgreSQL-Client sowie ZIP-Werkzeuge im API-Laufzeitimage für Sicherung und
  Wiederherstellung
- Lazy Loading der größeren Fachseiten zur Aufteilung des Frontend-Bundles

### 3.2 Identität und Sicherheit

- Keycloak-Realm `cms-erp` mit deaktivierter Selbstregistrierung
- öffentlicher Web-Client `cms-erp-web` mit PKCE/S256
- vertraulicher Service-Client `cms-erp-api` für administrative Benutzeroperationen
- Rollen `cms-erp-user` und `cms-erp-admin`
- globaler Bearer-Token-Guard mit RS256-Signatur-, Issuer-, Client- und
  Pflichtrollenprüfung
- separater Rollen-Guard für administrative Endpunkte
- öffentlich erreichbarer Healthcheck als explizite Ausnahme
- Schutz davor, das eigene Administratorkonto zu deaktivieren oder herabzustufen
- UUID-Prüfung für Ressourcen-IDs an den neueren beziehungsweise überarbeiteten
  API-Endpunkten
- Zurückweisung unbekannter Eingabefelder durch die globale DTO-Validierung
- Zeitlimits und verständliche Gateway-Fehler für Keycloak-Admin-Anfragen
- verschlüsselte Speicherung externer Client-Secrets mit AES-256-GCM
- Schutz externer Verbindungstests vor einfachen SSRF-Angriffen: ausschließlich
  HTTPS-Basis-URLs, keine URL-Zugangsdaten, Pfade, Parameter oder Fragmente,
  Ablehnung interner/reservierter IP-Adressen, keine Redirects und zehn Sekunden
  Zeitlimit
- HTTPS, HSTS, Content Security Policy, Permissions Policy, Frame-Schutz,
  `X-Content-Type-Options` und restriktive Referrer-Policy am Gateway

### 3.3 Oberfläche

- responsive React-Oberfläche auf Basis von Material UI
- Hash-Routing ohne zusätzliche Router-Abhängigkeit
- zentrale Navigation und Sitzungsanzeige
- Dark-Theme im terminalähnlichen Erscheinungsbild mit JetBrains Mono
- automatische Token-Erneuerung vor API-Anfragen
- Logout über Keycloak
- sichtbare Fehler- und Erfolgsmeldungen in den Verwaltungsdialogen
- eigenes Keycloak-Login-Theme passend zur Anwendungsoberfläche
- Informationsseite für die eigene REST-API mit kopierbarer Basis-URL
- eigene Vorschau- und Fortschrittsseiten für Kunden- und Artikelimporte
- Einstellungsseite für Schnittstellenintervalle, Bestandsfreigabe und Laufstatus
- Bestandsübersicht mit Kennzahlen, Bewertung und Suche
- Produktionsanweisungen mit verschachteltem Editor für Elemente und Arbeitsschritte
- Produktionsübersicht mit Suche und Anlage aus einer Anweisungsvorlage
- administrative Backup-Verwaltung mit Sicherheitsabfragen vor Wiederherstellung
  und Löschung
- Update-Statusseite mit manueller Neuprüfung der Systemvoraussetzungen
- Einstellungsseiten für Zahlungs- und Artikelarten
- kompakte zentrale Liste aller Einstellungsbereiche statt dauerhaft aufgeklappter
  Unterpunkte in der Hauptnavigation

### 3.4 Fachmodule

**Benutzerverwaltung**

- Keycloak-Benutzer werden über die NestJS-API verwaltet.
- Servicekonten werden aus der sichtbaren Benutzerliste entfernt.
- Neue Benutzer erhalten immer `cms-erp-user`; `cms-erp-admin` ist optional.
- Benutzername, E-Mail, Aktivstatus und Administratorrecht können geändert werden.
- Passwörter können durch Administratoren neu gesetzt werden.
- Das lokale `UserProfile` wird aus den Claims des angemeldeten Benutzers erzeugt
  beziehungsweise aktualisiert.

**Adressverwaltung**

- Adressen werden serverseitig gesucht und seitenweise mit 10, 50, 100, 200,
  500 oder 1.000 Einträgen geladen. Die Seitenauswahl bleibt unterhalb des
  scrollbaren Tabellenbereichs sichtbar.
- Ein Datensatz kann Kunde, Lieferant oder beides sein.
- Jede Adresse erhält eine eindeutige fortlaufende Nummer; die Oberfläche zeigt sie
  beispielsweise als `ADR-000001` an.
- Firma oder Nachname ist als fachliche Mindestangabe erforderlich.
- Stammdaten, Kontaktwege, Steuerdaten und Notizen werden relational gespeichert.
- Bankdaten, Ansprechpartner, Dokumentverweise und gekaufte Artikel werden aktuell
  als JSON-Strukturen innerhalb der Adresse gespeichert.
- Mehrere Lieferadressen können als JSON-Struktur gepflegt werden. Beim
  Shopware-Import wird eine vom Rechnungskontakt abweichende Standardlieferadresse
  übernommen.
- Adressen können einer Spezifikation zugeordnet werden.

**Spezifikationen**

- Spezifikationen dienen derzeit als frei verwaltbare Quelle beziehungsweise
  Projektzuordnung einer Adresse.
- Namen werden getrimmt und unabhängig von Groß-/Kleinschreibung auf Duplikate
  geprüft.
- Administratoren können bestehende Spezifikationen umbenennen; dabei gelten
  dieselben Pflicht- und Eindeutigkeitsregeln wie bei der Anlage.
- Eine verwendete Spezifikation kann aufgrund der restriktiven Datenbankbeziehung
  nicht gelöscht werden; die API übersetzt den Konflikt in eine Fachmeldung.

**Artikelverwaltung**

- Artikel werden nach Artikelnummer sortiert, tabellarisch dargestellt und
  clientseitig durchsucht.
- Unterstützt werden Einkaufs-, Produktions-, Produktionsmaterial-,
  Stücklisten-, Digital-Download-, Rabatt-/Gutschein- und Versandgebührenartikel.
- Artikelnummern sind eindeutig und können aus dem je Artikelart konfigurierten
  Präfix, einer laufenden Nummer und einer Auffülllänge automatisch vergeben
  werden. Eine manuelle Artikelnummer bleibt möglich.
- Bezeichnung, Präfix, nächste Nummer und Textfarbe der Artikelarten können durch
  Administratoren gepflegt werden.
- Jeder Artikel verweist auf eine zentral verwaltete Einheit und besitzt einen
  Mehrwertsteuersatz. Fehlt die Einheit bei der Anlage, wird bevorzugt `Stück`
  beziehungsweise die erste vorhandene Einheit verwendet.
- Netto-/Bruttogewicht und Abmessungen können mit drei Nachkommastellen gepflegt
  werden. Negative Werte sowie ein Bruttogewicht unter dem Nettogewicht werden
  abgelehnt.
- Preis- und Lagerzeilen sind optional; vorhandene Zeilen müssen vollständig und
  gültig sein. Der Gesamtbestand wird serverseitig aus allen Lagerplatzbeständen
  berechnet.
- Produktions- und Stücklistenartikel benötigen mindestens zwei Positionen.
- Bestehende Artikel können als Varianten eines Elternartikels verknüpft werden;
  Selbstverknüpfungen und unbekannte Varianten-IDs werden abgelehnt.
- Ein Produktbild kann direkt hochgeladen werden. JPEG, PNG, WebP und GIF bis 2 MB
  werden in einem persistenten Dateivolume gespeichert; der Artikel enthält nur
  die öffentliche `/api/article-images/...`-Referenz. Beim API-Start werden ältere
  eingebettete Produktbilder in diese Ablage migriert.
- Die Artikelliste lässt große Dateidaten aus; der neue Detailendpunkt liefert den
  vollständigen Datensatz zur Bearbeitung.
- Zusätzlich stehen Fremdnummern, weitere Dateiverweise, Notizen und
  Einkaufsinformationen zur Verfügung.

**Artikeleinheiten**

- Einheiten werden zentral in den Einstellungen gepflegt; initial werden `Stück`,
  `Liter` und `Meter` angelegt.
- Namen sind eindeutig und werden ohne Beachtung der Groß-/Kleinschreibung geprüft.
- Verwendete Einheiten können aufgrund der Datenbankbeziehung nicht gelöscht werden.

**Lagerplätze**

- Ein Lagerplatz wird durch Ort, Regal und Platz eindeutig beschrieben.
- Optional können Maximalgewicht sowie Länge, Breite und Tiefe hinterlegt werden.
- Die Übersicht unterstützt Suche, Anlage, Bearbeitung und Löschung.
- Ein in einem Artikelbestand verwendeter Lagerplatz kann nicht gelöscht werden.

**Bestandsübersicht**

- Die Seite unter `#/inventory/stock` verdichtet die artikelbezogenen Bestände je
  Lagerplatz und unterstützt eine Volltextsuche.
- Sie zeigt Gesamtmenge, Artikel mit Bestand, aktuellen Netto-Lagerwert, kritische
  Bestände und Artikel ohne ermittelbaren Einkaufspreis.
- Der Lagerwert wird aus Bestand und dem aktuell gültigen Einkaufspreis berechnet.
  Eine eigene Bewegungs- oder Bewertungsentität existiert noch nicht.

**Produktionsanweisungen**

- Produktions- und Stücklistenartikeln können datierte Produktionsanweisungen mit
  automatisch fortlaufender Anweisungsnummer zugeordnet werden.
- Eine Anweisung besteht aus bis zu 100 benannten Elementen mit jeweils bis zu 200
  geordneten Arbeitsschritten; insgesamt sind höchstens 1.000 Schritte zulässig.
- Arbeitsschritte unterscheiden körperliche Arbeit und Prozess, unterstützen
  Kontrollstatus, Mitarbeiterhinweis, Bestätigung, Planzeit, Timer und optionale
  Seriennummern per Generator oder manueller Eingabe.
- Anlage, Detailabruf, Bearbeitung und Löschung stehen allen angemeldeten Benutzern
  zur Verfügung. Verschachtelte Elemente werden bei Änderungen transaktional
  ersetzt; die Teileanzahl muss ihrer Anzahl entsprechen.

**Produktionen**

- Eine Produktion wird aus einer vorhandenen Produktionsanweisung erzeugt und
  erhält eine automatisch fortlaufende Produktionsnummer.
- Artikel, Name, Zeitraum, Anweisungsnummer, Elemente und Arbeitsschritte werden als
  eigenständige Arbeitskopie übernommen. Spätere Änderungen an der Vorlage ändern
  eine bereits angelegte Produktion nicht.
- Für jedes Element muss mindestens ein Arbeitsschritt vorhanden sein. Neue
  Produktionen beginnen mit dem Status `PLANNED`, ihre Schritte mit
  `NOT_STARTED`.
- Die Oberfläche listet und durchsucht Produktionen nach Nummer, Anweisung,
  Artikel, Name und Status. Statusänderungen und die operative Bearbeitung der
  Arbeitsschritte sind noch nicht implementiert.

**Zahlungsarten**

- Angemeldete Benutzer können die zentrale Liste lesen; Administratoren können
  Einträge anlegen und löschen.
- Namen werden getrimmt und unabhängig von Groß-/Kleinschreibung auf Duplikate
  geprüft. Eine Verknüpfung mit Aufträgen oder Rechnungen existiert noch nicht.

**Backup und Systemaktualisierung**

- Administratoren können ZIP-Sicherungen erstellen, auflisten, herunterladen,
  wiederherstellen und löschen. Eine Sicherung enthält einen PostgreSQL-Dump, die
  Artikelbildablage und ein versioniertes Manifest; Programm- und Systemdateien
  gehören nicht dazu.
- Backup-Erstellung und Wiederherstellung sind innerhalb eines API-Prozesses
  gegenseitig gesperrt. Archive und Pfade werden vor dem Zugriff validiert; eine
  Wiederherstellung ersetzt Datenbank und Artikelbilder nach Bestätigung.
- Die Update-Seite vergleicht den aktuellen Commit mit dem letzten erfolgreichen
  Container-Workflow auf GitHub. Zusätzlich prüft sie Datenbank und Constraints,
  Prisma-Migrationen, API-, Web- und Keycloak-Erreichbarkeit, freien Speicher sowie
  Vorhandensein und Alter der jüngsten Sicherung.
- Die Seite installiert keine Aktualisierung. Das Update erfolgt weiterhin durch
  erneutes Laden des Docker-/Portainer-Stacks; ausstehende Migrationen werden beim
  API-Start angewendet.

**Externe Schnittstellen**

- Administratoren können externe Anbieter anlegen, bearbeiten, aktivieren,
  deaktivieren, testen und löschen.
- Aktuell ist ausschließlich Shopware 6 als Anbieter implementiert.
- Pro Verbindung werden Bezeichnung, Shop-Basis-URL, Access-Key-ID, verschlüsseltes
  Secret, Aktivstatus und das Ergebnis des letzten Verbindungstests gespeichert.
- Das Secret wird nach dem Speichern weder über die API noch in der Oberfläche
  zurückgegeben. Beim Bearbeiten bleibt es erhalten, solange kein neues Secret
  eingegeben wird.
- Der Verbindungstest fordert über `/api/oauth/token` mit dem
  Client-Credentials-Flow ein Shopware-Token an. Er prüft nur die technische
  Authentifizierung und greift nicht auf Shopdaten zu.
- Testergebnis, Zeitpunkt und verständliche Statusmeldung werden persistiert.
- Import, Export, Änderung und Löschung sind getrennte Freigaben. Der sichere
  Standard ist, dass alle vier Aktionen gesperrt sind.
- Der Bestandsimport besitzt eine zusätzliche Freigabe, die nur zusammen mit der
  allgemeinen Importfreigabe aktiv sein kann.

**Shopware-Kundenimport**

- Der Import ist nur bei aktiver Schnittstelle, freigegebenem Import und zuvor
  erfolgreichem Verbindungstest verfügbar.
- Eine schreibfreie Vorschau liest höchstens zehn Kunden und kennzeichnet sie als
  bereit, bereits importiert oder Dublette.
- Nach ausdrücklicher Bestätigung arbeitet der Import in Paketen zu je 25 Kunden.
- Übernommen werden Kunden-/Adressstammdaten, Rechnungsadresse, Kontakt- und
  Steuerdaten, Kommentare sowie eine abweichende Standardlieferadresse.
- Bestehende Datensätze werden anhand der externen Shopware-ID, Kundennummer oder
  E-Mail-Adresse übersprungen. Externe Referenzen sichern die Wiederholbarkeit.
- Importläufe speichern Status, Seite, Gesamtzahl sowie verarbeitete, importierte,
  übersprungene und fehlgeschlagene Datensätze.

**Shopware-Artikelimport**

- Auch der Artikelimport beginnt mit einer schreibfreien Vorschau von höchstens
  zehn Artikeln und erfordert eine Bestätigung.
- Der eigentliche Import verarbeitet Pakete zu je 25 Produkten und protokolliert
  seinen Fortschritt wie der Kundenimport.
- Übernommen werden Artikelnummer, Name, optionaler Bestand, Einheit, Mehrwertsteuer,
  Einkaufs-/Verkaufspreis, Gewicht, Abmessungen, Beschreibung, EAN und optional das
  Shopware-Titelbild.
- Nicht vorhandene Einheiten sowie der Lagerplatz
  `Shopware / Import / Bestand` werden bei Bedarf angelegt.
- Titelbilder werden nur vom selben HTTPS-Ursprung geladen, auf unterstützte
  Bildtypen geprüft und auf 2 MB begrenzt.
- Shopware-Eltern-/Kindbeziehungen werden als Artikelvarianten rekonstruiert;
  Variantentypen entstehen aus den sortierten Shopware-Optionen, etwa
  `Farbe: Rot · Größe: M`.
- Bereits referenzierte externe IDs und vorhandene Artikelnummern werden nicht
  erneut importiert.

**Schnittstellen-Zeitpläne**

- Administratoren können je externer Verbindung ein Intervall von einer Minute bis
  10.080 Minuten und einen Aktivstatus speichern.
- Ein Zeitplan lässt sich nur für eine aktive, erfolgreich getestete Schnittstelle
  mit allgemeiner Import- und Bestandsimportfreigabe aktivieren.
- Die API prüft alle 30 Sekunden fällige Verbindungen und synchronisiert
  Shopware-Bestände in Paketen zu je 25 Produkten. Aktualisiert werden nur zuvor
  importierte Artikel mit externer Referenz.
- Der Shopware-Lagerwert wird ersetzt, Bestände anderer Lagerplätze bleiben
  erhalten; Gesamtbestände werden neu berechnet. Zeitpunkt, Status und Meldung des
  letzten Laufs werden gespeichert.

**API-Anbindung**

- Eine eigene Einstellungsseite zeigt Basis-URL, JSON als Datenformat, HTTPS und
  OAuth 2.0/OpenID Connect mit Bearer-Token als Zugriffsmethode.
- Aufgeführt werden die Ressourcen Adressen, Artikel, Artikeleinheiten,
  Lagerplätze und Spezifikationen.
- Die Seite stellt Informationen bereit, erzeugt aber keine separaten API-Schlüssel
  oder Servicekonten.

## 4. Systemarchitektur

Das System ist als modularer Monolith umgesetzt. Fachmodule liegen getrennt in API
und Webanwendung, laufen aber jeweils in einem gemeinsamen Prozess. Damit bleibt die
lokale Entwicklung einfach, während Modulgrenzen für eine spätere Erweiterung
erhalten bleiben.

```mermaid
flowchart LR
    B["Browser"] -->|"HTTPS"| G["Caddy Gateway"]
    G -->|"/"| W["React SPA / nginx"]
    G -->|"/api/*"| A["NestJS API"]
    G -->|"/auth/*"| K["Keycloak"]
    A -->|"Prisma"| P[("PostgreSQL")]
    A -->|"Produktbilder / Sicherungen"| I[("persistente Dateispeicher")]
    A -->|"OIDC / Admin API"| K
    A -->|"HTTPS / Client Credentials"| E["Externer Anbieter / Shopware 6"]
    K -->|"Realm-Daten"| P
```

### 4.1 Laufende Dienste

| Dienst | Technologie | Aufgabe | Host-Port |
| --- | --- | --- | --- |
| `gateway` | Caddy 2.10 | TLS-Terminierung, Routing, Sicherheitsheader | 80, 443 |
| `web` | nginx 1.29 | Auslieferung der gebauten React-SPA | keiner |
| `api` | Node.js 22 / NestJS 11 | API, Validierung und Fachlogik | keiner |
| `postgres` | PostgreSQL 18 | Anwendungs- und Keycloak-Daten | keiner |
| `keycloak` | Keycloak 26.7 | Anmeldung, Token, Benutzer und Rollen | keiner |
| `keycloak-config` | Keycloak-Werkzeuge | einmalige/idempotente Nachkonfiguration | keiner |

Nur der Gateway ist vom Host erreichbar. Die übrigen Dienste kommunizieren im
internen Docker-Netzwerk.

### 4.2 Repository-Struktur

```text
CMS_ERP/
├── apps/
│   ├── api/                    NestJS-API, Prisma-Schema und Migrationen
│   └── web/                    React-SPA, Theme und Fachseiten
├── docs/                       Projektdokumentation
├── infrastructure/
│   ├── caddy/                  Gateway-Konfiguration
│   ├── keycloak/               Realm-Import und Nachkonfiguration
│   └── postgres/               Initiales Keycloak-Datenbankschema
├── .github/workflows/          Test-, Build- und Container-Workflow
├── UI-Vorlage/                 gestalterische Ausgangsreferenz
├── compose.yaml                lokale Gesamtumgebung
├── compose.portainer.yaml      Stack mit Images aus einer Container Registry
├── .env.portainer.example      Konfigurationsvorlage für Portainer
├── ARCHITECTURE.md             verbindliche Architekturgrundsätze
└── README.md                   Schnellstart
```

Neue Fachmodule sollen dem Vertrag in `ARCHITECTURE.md` folgen: getrennte
Modulordner, eigene Tabellen und Migrationen, explizite Berechtigungen sowie Unit-,
Integrations- und Browser-Tests.

## 5. Datenmodell

### 5.1 `UserProfile`

Lokale Projektion eines Keycloak-Benutzers. Das eigentliche Kennwort und die
Autorisierungsdaten verbleiben ausschließlich in Keycloak.

| Feld | Bedeutung |
| --- | --- |
| `id` | interne UUID |
| `identityId` | eindeutige Keycloak-Subject-ID (`sub`) |
| `username`, `email`, `displayName` | aus dem Access Token synchronisierte Angaben |
| `createdAt`, `updatedAt` | technische Zeitstempel |

### 5.2 `Address`

| Feldgruppe | Inhalt |
| --- | --- |
| Identität | UUID und eindeutige fortlaufende `addressNumber` |
| Zuordnung | optionale Kunden-/Lieferantennummer, Art, Spezifikation |
| Person/Firma | Firma, Anrede, Vorname, Nachname |
| Anschrift | Straße, Hausnummer, PLZ, Ort, Land |
| Kommunikation | E-Mail, Telefon, Mobil, Webseite |
| Weitere Daten | Steuernummer und Notizen |
| JSON-Daten | Bankdaten, Lieferadressen, Ansprechpartner, Dokumentverweise, gekaufte Artikel |
| Technik | Erstellungs- und Änderungszeitpunkt |

Indizes bestehen auf Firma, Nachname, Kunden-/Lieferantennummer und
Spezifikations-ID.

### 5.3 `Specification`

Eine Spezifikation besteht aus UUID, eindeutigem Namen und Erstellungszeitpunkt. Die
Beziehung zu `Address` ist optional; beim Löschen gilt `RESTRICT`.

### 5.4 `Article`

| Feldgruppe | Inhalt |
| --- | --- |
| Identität | UUID, eindeutige Artikelnummer und Bezeichnung |
| Klassifikation | eine von sieben konfigurierbaren Artikelarten |
| Einheit und Steuer | Relation zu `ArticleUnit`, Mehrwertsteuersatz |
| Bestand | berechneter Gesamtbestand und lagerplatzbezogene Bestände als JSON |
| Maße | Netto-/Bruttogewicht in kg sowie Länge, Breite und Höhe in cm |
| Preise | Einkaufs- und Verkaufspreisverläufe als JSON |
| Fertigung | Positionen beziehungsweise Stücklistenbestandteile als JSON |
| Varianten | relationale Selbstbeziehung über `ArticleVariantLink` einschließlich optionalem Variantentyp |
| Weitere Daten | Fremdnummern, persistenter Produktbildverweis, weitere Dateiverweise, Einkaufskonfiguration und Notizen |
| Technik | Erstellungs- und Änderungszeitpunkt |

Indizes bestehen auf Bezeichnung, Artikelart und Einheit. Die Artikelnummer ist
eindeutig. Der Gesamtbestand wird nicht unabhängig eingegeben, sondern beim
Speichern aus `stockEntries` summiert. Produktbilddateien liegen außerhalb der
Datenbank; `files` enthält lediglich die Referenz und weitere Metadaten.

### 5.5 `ArticleVariantLink`

Verknüpft einen Elternartikel mit einem eigenständigen Variantenartikel. Der
zusammengesetzte Primärschlüssel verhindert doppelte Links; ein Datenbank-Check
verhindert Selbstverknüpfungen. `variantType` enthält eine optionale fachliche
Beschreibung der Ausprägung. Beim Löschen eines beteiligten Artikels werden die
Links kaskadierend entfernt.

### 5.6 `ArticleUnit`

Zentraler, eindeutig benannter Einheitenstamm mit UUID und Zeitstempeln. Artikel
referenzieren eine Einheit per Fremdschlüssel; beim Löschen gilt `RESTRICT`.

### 5.7 `WarehouseLocation`

Lagerplätze besitzen die Pflichtfelder Ort, Regal und Platz sowie optionale
Kapazitätsangaben für Maximalgewicht und Abmessungen. Die Kombination aus Ort,
Regal und Platz ist eindeutig. Artikel referenzieren Lagerplätze aktuell innerhalb
der JSON-Struktur `stockEntries` über deren UUID.

### 5.8 `ExternalIntegration`

| Feldgruppe | Inhalt |
| --- | --- |
| Identität | UUID und eindeutige Bezeichnung |
| Anbieter | derzeit `SHOPWARE_6`, Basis-URL und Client-ID |
| Zugang | mit AES-256-GCM verschlüsseltes Client-Secret |
| Betrieb | Aktivstatus, Testergebnis, Zeitplan und Intervall sowie letzter Bestandsabgleich mit Status und Meldung |
| Freigaben | Import, Bestandsimport, Export, Änderung und Löschung; jeweils standardmäßig `false` |
| Technik | Erstellungs- und Änderungszeitpunkt |

Indizes bestehen auf Anbieter und Aktivstatus. Öffentliche API-Antworten schließen
das verschlüsselte Secret konsequent aus und liefern stattdessen nur
`credentialConfigured: true`.

### 5.9 `ExternalEntityReference`

Ordnet eine externe Shopware-ID eindeutig einer Integration und einem lokalen
Kunden- oder Artikeldatensatz zu. Für Artikel werden zusätzlich externe Eltern-ID
und Variantentyp gespeichert. Die eindeutige Kombination aus Integration,
Entitätstyp und externer ID verhindert Mehrfachimporte. Beim Löschen der Integration
oder des lokalen Datensatzes werden die Referenzen kaskadierend entfernt.

### 5.10 `CustomerImportJob` und `ArticleImportJob`

Persistente Fortschrittsmodelle für paketweise Importe. Sie speichern Status,
aktuelle Seite, Paketgröße, Gesamtzahl, Zähler für verarbeitet/importiert/
übersprungen/fehlgeschlagen, letzte Fehlermeldung und Abschlusszeitpunkt. Pro
Integration wird ein Index auf Integration und Status verwendet.

### 5.11 `ArticleTypeSetting`

Konfiguriert jede Artikelart über technischen Typ, sichtbare Bezeichnung,
Nummernpräfix, Textfarbe, nächste laufende Nummer und Auffülllänge. Die initialen
Präfixe sind `EK-`, `PA-`, `PM-`, `SL-`, `DD-`, `RG-` und `VG-`; laufende Nummern
starten bei 1 und werden standardmäßig auf sechs Stellen aufgefüllt. Die Reservierung
einer automatischen Nummer erfolgt gemeinsam mit der Artikelanlage in einer
Datenbanktransaktion.

### 5.12 `PaymentMethod`

Zentraler, eindeutig benannter Zahlungsartenstamm mit UUID und
Erstellungszeitpunkt. Das Modell ist noch nicht mit einem Belegmodell verbunden.

### 5.13 Produktionsanweisungen

`ProductionInstruction` enthält UUID, automatisch fortlaufende Nummer,
Artikelrelation, beim Anlegen kopierten Artikelnamen, Start- und Fertigstellungsdatum
sowie Teileanzahl. `ProductionInstructionElement` ordnet benannte Elemente über ihre
Position; `ProductionInstructionStep` speichert die geordneten Arbeitsschritte samt
Arbeitsart, Steuerungsoptionen, Zeiten und Seriennummernmodus. Elemente und Schritte
werden beim Löschen ihrer Eltern kaskadierend entfernt; das Löschen eines verwendeten
Artikels bleibt durch `RESTRICT` gesperrt.

### 5.14 Produktionen

`Production` referenziert die zugrunde liegende Produktionsanweisung und den
Artikel, speichert aber Anweisungsnummer, Namen, Zeitraum und Status zusätzlich als
eigenen Arbeitsstand. `ProductionElement` und `ProductionStep` sind kaskadierende
Kopien der Vorlagenelemente und -schritte. Die möglichen vorbereiteten
Produktionsstatus sind `PLANNED`, `IN_PROGRESS`, `PAUSED`, `COMPLETED` und
`PROBLEM`; Schritte beginnen mit `NOT_STARTED` und besitzen Felder für Start- und
Abschlusszeitpunkt. Die derzeitige API legt Produktionen an und liest sie, verändert
diese Statusfelder aber noch nicht.

## 6. API-Übersicht

Alle 62 Endpunkte liegen unter `/api`. Bis auf den Healthcheck und die Auslieferung
bereits gespeicherter Produktbilder wird ein gültiges Keycloak-Bearer-Token benötigt.

| Methode | Pfad | Berechtigung | Zweck |
| --- | --- | --- | --- |
| `GET` | `/health` | öffentlich | API- und Datenbankstatus |
| `GET` | `/users/me` | angemeldet | eigenes lokales Profil laden/synchronisieren |
| `GET` | `/users` | `cms-erp-admin` | Benutzer auflisten |
| `POST` | `/users` | `cms-erp-admin` | Benutzer anlegen |
| `PATCH` | `/users/:id` | `cms-erp-admin` | Benutzer und Rollen ändern |
| `PUT` | `/users/:id/password` | `cms-erp-admin` | Passwort neu setzen |
| `GET` | `/addresses?page=1&pageSize=100&search=…` | angemeldet | Adressen mit Spezifikation suchen und seitenweise auflisten |
| `POST` | `/addresses` | angemeldet | Adresse anlegen |
| `PATCH` | `/addresses/:id` | angemeldet | Adresse bearbeiten |
| `GET` | `/specifications` | angemeldet | Spezifikationen auflisten |
| `POST` | `/specifications` | `cms-erp-admin` | Spezifikation anlegen |
| `PATCH` | `/specifications/:id` | `cms-erp-admin` | Spezifikation umbenennen |
| `DELETE` | `/specifications/:id` | `cms-erp-admin` | unbenutzte Spezifikation löschen |
| `GET` | `/articles` | angemeldet | Artikel mit Einheit auflisten |
| `GET` | `/articles/:id` | angemeldet | vollständigen Artikel einschließlich Dateiverweisen laden |
| `POST` | `/articles` | angemeldet | Artikel anlegen und Bestand berechnen |
| `PATCH` | `/articles/:id` | angemeldet | Artikel bearbeiten und Bestand neu berechnen |
| `POST` | `/article-images` | angemeldet | Produktbild bis 2 MB speichern |
| `GET` | `/article-images/:filename` | öffentlich | gespeichertes Produktbild mit langfristigem Cache ausliefern |
| `GET` | `/article-type-settings` | angemeldet | Konfigurationen aller Artikelarten auflisten |
| `PATCH` | `/article-type-settings/:type` | `cms-erp-admin` | Bezeichnung, Präfix, Farbe oder nächste Nummer ändern |
| `GET` | `/article-units` | angemeldet | Artikeleinheiten auflisten |
| `POST` | `/article-units` | `cms-erp-admin` | Artikeleinheit anlegen |
| `PATCH` | `/article-units/:id` | `cms-erp-admin` | Artikeleinheit umbenennen |
| `DELETE` | `/article-units/:id` | `cms-erp-admin` | unbenutzte Artikeleinheit löschen |
| `GET` | `/warehouse-locations` | angemeldet | Lagerplätze auflisten |
| `POST` | `/warehouse-locations` | `cms-erp-admin` | Lagerplatz anlegen |
| `PATCH` | `/warehouse-locations/:id` | `cms-erp-admin` | Lagerplatz bearbeiten |
| `DELETE` | `/warehouse-locations/:id` | `cms-erp-admin` | unbenutzten Lagerplatz löschen |
| `GET` | `/payment-methods` | angemeldet | Zahlungsarten auflisten |
| `POST` | `/payment-methods` | `cms-erp-admin` | Zahlungsart anlegen |
| `DELETE` | `/payment-methods/:id` | `cms-erp-admin` | Zahlungsart löschen |
| `GET` | `/production-instructions` | angemeldet | Produktionsanweisungen auflisten |
| `GET` | `/production-instructions/:id` | angemeldet | verschachtelte Produktionsanweisung laden |
| `POST` | `/production-instructions` | angemeldet | Produktionsanweisung anlegen |
| `PATCH` | `/production-instructions/:id` | angemeldet | Produktionsanweisung vollständig bearbeiten |
| `DELETE` | `/production-instructions/:id` | angemeldet | Produktionsanweisung löschen |
| `GET` | `/productions` | angemeldet | Produktionen mit kopierten Elementen und Schritten auflisten |
| `GET` | `/productions/:id` | angemeldet | einzelne Produktion laden |
| `POST` | `/productions` | angemeldet | Produktion aus einer Anweisung erzeugen |
| `GET` | `/backups` | `cms-erp-admin` | verfügbare ZIP-Sicherungen auflisten |
| `POST` | `/backups` | `cms-erp-admin` | Datenbank- und Dateisicherung erstellen |
| `GET` | `/backups/:id/download` | `cms-erp-admin` | Sicherung herunterladen |
| `POST` | `/backups/:id/restore` | `cms-erp-admin` | Datenbank und Artikelbilder wiederherstellen |
| `DELETE` | `/backups/:id` | `cms-erp-admin` | Sicherung löschen |
| `GET` | `/system-update/status` | `cms-erp-admin` | Versions- und Systembereitschaft prüfen |
| `GET` | `/external-integrations` | `cms-erp-admin` | externe Verbindungen auflisten |
| `GET` | `/external-integrations/:id` | `cms-erp-admin` | Verbindung ohne Secret laden |
| `POST` | `/external-integrations` | `cms-erp-admin` | Shopware-Verbindung anlegen |
| `PATCH` | `/external-integrations/:id` | `cms-erp-admin` | Verbindung bearbeiten/aktivieren |
| `PATCH` | `/external-integrations/:id/data-permissions` | `cms-erp-admin` | Datenaktionen freigeben oder sperren |
| `PATCH` | `/external-integrations/:id/cron-settings` | `cms-erp-admin` | Zeitplan und Intervall konfigurieren |
| `POST` | `/external-integrations/:id/test` | `cms-erp-admin` | Shopware-Authentifizierung testen |
| `POST` | `/external-integrations/:id/customer-import/preview` | `cms-erp-admin` | schreibfreie Kundenvorschau laden |
| `GET` | `/external-integrations/:id/customer-import/latest` | `cms-erp-admin` | letzten Kundenimportlauf laden |
| `POST` | `/external-integrations/:id/customer-import/start` | `cms-erp-admin` | bestätigten Kundenimport starten |
| `POST` | `/external-integrations/:id/customer-import/:jobId/next` | `cms-erp-admin` | nächsten Kundenblock verarbeiten |
| `POST` | `/external-integrations/:id/article-import/preview` | `cms-erp-admin` | schreibfreie Artikelvorschau laden |
| `GET` | `/external-integrations/:id/article-import/latest` | `cms-erp-admin` | letzten Artikelimportlauf laden |
| `POST` | `/external-integrations/:id/article-import/start` | `cms-erp-admin` | bestätigten Artikelimport starten |
| `POST` | `/external-integrations/:id/article-import/:jobId/next` | `cms-erp-admin` | nächsten Artikelblock verarbeiten |
| `DELETE` | `/external-integrations/:id` | `cms-erp-admin` | Verbindung löschen |

Die interaktive Swagger-Dokumentation ist unter
`https://cms-erp.localhost/api/docs` erreichbar. Eingaben werden global durch
`class-validator` geprüft; unbekannte Felder weist die API zurück. Ressourcen-IDs
werden an den Benutzer-, Spezifikations-, Artikel-, Einheiten-, Lagerplatz-,
Zahlungsarten-, Produktions- und Schnittstellen-Endpunkten als UUID validiert.
Backup-IDs sind streng validierte serverseitige Dateinamen und deshalb keine UUIDs.

## 7. Rollen- und Berechtigungskonzept

| Rolle | Zugriff |
| --- | --- |
| `cms-erp-user` | Anmeldung und reguläre geschützte Funktionen, einschließlich Adress-, Artikel- und Produktionsanweisungspflege, Erzeugung und Einsicht von Produktionen sowie lesendem Zugriff auf Lagerplätze, Zahlungs- und Artikelarten |
| `cms-erp-admin` | zusätzlich Benutzerverwaltung, Pflege von Spezifikationen, Artikelarten, Artikeleinheiten und Zahlungsarten, schreibender Lagerplatzzugriff, vollständige Schnittstellenverwaltung sowie Backup- und Systemstatusfunktionen |

Die Oberfläche blendet beziehungsweise sperrt administrative Funktionen. Die
maßgebliche Durchsetzung erfolgt jedoch serverseitig durch den Rollen-Guard.

## 8. Lokale Inbetriebnahme

### 8.1 Voraussetzungen

- Docker mit Compose-Unterstützung
- freie Host-Ports 80 und 443
- lokaler Browser; für warnungsfreies HTTPS optional Zugriff auf den macOS-Schlüsselbund

### 8.2 Konfiguration

Die Datei `.env.example` enthält alle benötigten Variablen:

```dotenv
POSTGRES_DB=cms_erp
POSTGRES_USER=cms_erp
POSTGRES_PASSWORD=local-db-password
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=local-admin-password
KEYCLOAK_APP_ADMIN_PASSWORD=admin
KEYCLOAK_API_CLIENT_SECRET=local-api-client-secret
```

Für die lokale Umgebung wird daraus eine nicht einzucheckende `.env` angelegt. Die
Beispielwerte und das Anwendungskonto `admin`/`admin` sind ausschließlich für die
Entwicklung vorgesehen.

Die Compose-Konfiguration übergibt `KEYCLOAK_API_CLIENT_SECRET` derzeit zusätzlich
als `INTEGRATION_ENCRYPTION_KEY` an die API. Daraus leitet die Anwendung per SHA-256
den AES-256-GCM-Schlüssel für externe Client-Secrets ab. Ein Wechsel dieses Wertes
macht bereits gespeicherte Secrets ohne vorherige Rotation unlesbar. Für einen
produktiven Betrieb sollte deshalb ein eigener, langlebiger Verschlüsselungsschlüssel
mit geregelter Rotation und Sicherung verwendet werden.

### 8.3 Start und Erreichbarkeit

```bash
docker compose up --build -d
docker compose ps
```

| Ziel | URL |
| --- | --- |
| Anwendung | `https://cms-erp.localhost` |
| Swagger/API | `https://cms-erp.localhost/api/docs` |
| Healthcheck | `https://cms-erp.localhost/api/health` |
| Keycloak-Administration | `https://cms-erp.localhost/auth/admin/` |

Beim Start führt die API ausstehende Prisma-Migrationen automatisch aus. Keycloak
importiert den Realm und bindet das projektspezifische Login-Theme ein.
`keycloak-config` gleicht Benutzerprofil, Login-Theme, Service-Client,
Servicekonto-Rechte und das lokale Administratorkonto ab. Das Kennwort des
Anwendungskontos stammt aus `KEYCLOAK_APP_ADMIN_PASSWORD`; die Compose-Konfiguration
bricht ab, wenn diese Variable fehlt.

Die benannten Volumes `article_images` und `backup_data` erhalten Produktbilder und
ZIP-Sicherungen über Neustarts und Container-Neuerstellungen hinweg. Die API
verwendet `/app/data/article-images` als `ARTICLE_IMAGE_DIR` und
`/app/data/backups` als `BACKUP_DIR`. Buildargumente übergeben außerdem
Anwendungsversion und Commit-SHA für den Updatevergleich.

### 8.4 Lokales Zertifikat unter macOS

```bash
docker compose cp gateway:/data/caddy/pki/authorities/local/root.crt ./cms-erp-local-ca.crt
security add-trusted-cert -r trustRoot \
  -k "$HOME/Library/Keychains/login.keychain-db" ./cms-erp-local-ca.crt
```

Ohne Installation der lokalen CA bleibt die Anwendung erreichbar, der Browser zeigt
jedoch eine Zertifikatswarnung.

### 8.5 Betrieb und Fehleranalyse

```bash
docker compose ps
docker compose logs -f
docker compose logs -f api keycloak gateway
docker compose down
```

`docker compose down` erhält die Daten in den benannten Volumes. Der Zusatz `-v`
löscht Datenbank, Produktbilder, Sicherungen, Keycloak- und Caddy-Daten dauerhaft
und darf nur bewusst verwendet werden.

### 8.6 Portainer- und Synology-Bereitstellung

`compose.portainer.yaml` ist für einen Portainer-Stack mit bereits gebauten Images
aus GHCR vorgesehen. Die Werte aus `.env.portainer.example` werden als
Stack-Umgebungsvariablen übernommen. Wesentlich sind die von Browsern erreichbare
`APP_ORIGIN`, der veröffentlichte `APP_PORT`, Registry-Namespace und Image-Tag sowie
starke, getrennte Werte für Datenbank, Keycloak-Administration, Anwendungskonto,
API-Client und `INTEGRATION_ENCRYPTION_KEY`.

Der Stack bindet PostgreSQL-Daten, Produktbilder und Sicherungen standardmäßig aus
`/volume1/docker/CMS_ERP/postgres`, `article-images` und `backups` in die Container
ein. Diese Verzeichnisse müssen vor dem ersten Start existieren und können für ein
anderes Synology-Volume in der Compose-Datei angepasst werden. Caddy veröffentlicht
bewusst nur HTTP auf `${APP_PORT:-8090}`. Für einen Zugriff aus dem Internet muss
davor ein vertrauenswürdiger TLS-Reverse-Proxy, beispielsweise der Synology Reverse
Proxy, betrieben und `APP_ORIGIN` auf dessen öffentliche HTTPS-Adresse gesetzt
werden.

Der Workflow `.github/workflows/container-images.yml` führt zuerst den API-Teststage
aus und baut anschließend API, Web, Gateway, Keycloak und PostgreSQL für
`linux/amd64` und `linux/arm64`. Bei Änderungen auf `main` sowie bei manueller
Ausführung werden `latest`- und Commit-SHA-Tags in GHCR veröffentlicht.

## 9. Entwicklung und Qualitätssicherung

Aus dem Repository-Wurzelverzeichnis sind folgende Skripte definiert:

```bash
npm run build
npm test
```

Sie rufen die Build- beziehungsweise Testskripte beider Workspaces auf. Zusätzlich
stehen in den Anwendungen unter anderem `start:dev`, `prisma:generate`,
`prisma:migrate` und `dev` bereit.

Das API-Dockerfile besitzt außerdem einen separaten `test`-Stage. Der Runtime-Stage
enthält nur Produktionsabhängigkeiten; Prisma ist deshalb als Laufzeitabhängigkeit
eingetragen, damit Migrationen beim Containerstart ausgeführt werden können.

### Verifizierter Stand am 15. August 2026

- Der Prisma-Client entspricht dem aktuellen Schema; anschließend liefen der
  NestJS-Build und alle vier API-Testsuiten erfolgreich durch: 18 von 18 Tests
  bestanden.
- Abgedeckt sind insbesondere Schutzmaßnahmen externer Verbindungen,
  Produktionsanweisungs-Validierung, das Erzeugen von Produktionen als Kopie der
  Vorlage und das Weglassen großer Dateidaten in der Artikelliste.
- Der Web-TypeScript-Build und der Vite-Produktionsbuild laufen erfolgreich durch.
- Vitest läuft erfolgreich, meldet aber ausdrücklich, dass keine Testdateien
  vorhanden sind.
- Die Fachseiten werden per Lazy Loading in eigene JavaScript-Chunks aufgeteilt.
  Der größte initiale Chunk liegt nach dem aktuellen Produktionsbuild bei rund
  379 kB; Vites Warnschwelle von 500 kB wird nicht überschritten.
- `docker compose config --quiet` bestätigt die lokale Konfiguration. Auch
  `docker compose -f compose.portainer.yaml --env-file .env.portainer.example
  config --quiet` bestätigt den Portainer-Stack.
- Ein vollständiger Docker-Integrationstest wurde in diesem Arbeitsschritt nicht
  durchgeführt.

## 10. Bekannte Grenzen und offene Punkte

- Die automatisierte Testabdeckung ist weiterhin gering: 18 API-Unit-Tests decken
  ausgewählte Sicherheits- und Fachregeln ab; Integrations-, Browser- und
  Frontend-Testfälle fehlen.
- Aufträge, Angebote, Buchhaltung, Lagerbewegungen, Systemgrundeinstellungen sowie
  Rollen & Rechte sind noch Platzhalter. Produktionsanweisungen, Produktionen,
  Bestandsübersicht, Backup und Update-Status sind dagegen umgesetzt.
- Kunden-, Lieferanten- und Ansprechpartner-Unterseiten sind vorbereitet, besitzen
  aber noch keine eigene gefilterte Fachansicht.
- Adressen können derzeit nicht gelöscht werden; die API bietet Auflisten, Anlegen
  und Bearbeiten.
- Artikel können derzeit nicht gelöscht werden; die API bietet Auflisten, Anlegen
  und Bearbeiten.
- Produktionen sind derzeit unveränderliche Kopien einer Anweisung. Obwohl das
  Datenmodell Status, Schrittstatus sowie Start- und Abschlusszeitpunkte vorsieht,
  fehlen API und Oberfläche für Start, Pause, Fortschrittsmeldung, Bestätigung,
  Störung und Abschluss.
- Alle angemeldeten Benutzer dürfen derzeit Adressen und Artikel anlegen und
  bearbeiten sowie Produktionsanweisungen und Produktionen verwalten. Lagerplätze
  können sie lesen; Änderungen, Schnittstellen-, Backup- und Systemstatusverwaltung
  sind Administratoren vorbehalten. Falls feinere Zuständigkeiten erforderlich
  sind, müssen zusätzliche Rollen eingeführt werden.
- Bankdaten, Lieferadressen, Ansprechpartner, Dokumentverweise und gekaufte Artikel
  sind flexible JSON-Felder. Eigene Tabellen werden erforderlich, sobald diese
  Daten separat gesucht, validiert, versioniert oder referenziert werden sollen.
- Adressdokumente und zusätzliche Artikeldateien sind aktuell nur Verweise oder
  Metadaten. Produktbilder besitzen eine persistente Dateiablage, aber noch keine
  allgemeine Medienverwaltung, Bereinigung verwaister Dateien oder Referenzzählung.
- Lagerplatzreferenzen eines Artikels werden in JSON gespeichert und nicht durch
  Datenbank-Fremdschlüssel abgesichert. Vor dem Speichern prüft die API zwar die
  Existenz; referenzielle Integrität und Abfragen bleiben jedoch aufwendiger als bei
  einer relationalen Bestandsentität.
- Die Shopware-Anbindung importiert Kunden und Artikel ausschließlich neu. Bereits
  importierte beziehungsweise als Dublette erkannte Datensätze werden übersprungen;
  ein Update-/Merge-Verfahren für spätere Shopware-Änderungen fehlt.
- Export, Aktualisierung und Löschung über Shopware sind noch nicht implementiert.
  Die entsprechenden Freigaben werden bislang nur gespeichert.
- Nur der Shopware-Bestandsabgleich läuft automatisch. Kunden- und Artikelimporte
  verarbeiten ihre Pakete weiterhin durch aktive Anforderungen der
  Verwaltungsseite. Für dauerhaft im Status `PROCESSING` verbliebene Importläufe
  fehlt eine automatische Wiederherstellung.
- Der Bestandszeitplan läuft als Timer im API-Prozess und ist keine verteilte
  Jobwarteschlange. Für mehrere API-Replikate fehlen robuste verteilte Sperren,
  vollständige Laufhistorie, Wiederholungsstrategie und Monitoring.
- Die Datenfreigaben sind grob nach Aktion getrennt, aber noch nicht nach
  Ressourcen, Feldern oder Datenrichtung je Entität differenziert.
- Importfehler werden nur als Summenzähler und letzte Laufmeldung gespeichert; eine
  revisionsfähige Fehlerliste je Datensatz fehlt.
- Der Verschlüsselungsschlüssel für externe Secrets ist in der lokalen
  Compose-Konfiguration an das Keycloak-API-Client-Secret gekoppelt. Es gibt noch
  keinen Rotations- oder Wiederherstellungsprozess.
- Passwortregeln beschränken sich in den API-DTOs auf einen nichtleeren Wert. Eine
  produktionsgerechte Keycloak-Passwortrichtlinie ist noch festzulegen.
- Konfiguration und mitgelieferte Konten sind ausdrücklich nicht für den
  Produktivbetrieb gehärtet.
- Manuelle Backups und Wiederherstellung sind vorhanden, aber noch nicht geplant,
  extern repliziert oder regelmäßig durch Wiederherstellungstests geprüft. Eine
  Sicherung erfasst Datenbank und Artikelbilder, nicht jedoch Konfiguration,
  Secrets, Programmdateien oder Caddy-/Keycloak-Laufzeitdaten.
- Die Update-Seite prüft die Bereitschaft und zeigt einen verfügbaren Containerstand
  an, führt aber selbst weder Image-Download noch Stack-Neustart oder Rollback aus.
- Eine Container-CI und ein Portainer-Stack sind vorhanden; automatische
  Deployment-Freigaben, Migrationstests und umfassende Observability fehlen
  weiterhin.

## 11. Empfohlene nächste Schritte

1. Automatisierte Tests für Auth-Guards, Schnittstellenverschlüsselung,
   Verbindungstest, Fachservices und zentrale UI-Abläufe ergänzen.
2. Rollen für lesenden und schreibenden Adress-, Artikel- und Lagerzugriff fachlich
   festlegen.
3. Artikelmodul um serverseitige Suche, Paginierung und Filter sowie Adress- und
   Artikelmodule um Löschung beziehungsweise Archivierung erweitern.
4. Lagerbestände, Preisverläufe, Stücklisten und weitere fachlich relevante
   JSON-Strukturen nach Klärung in eigenständige Entitäten überführen.
5. Shopware-Import um Aktualisierungs-/Merge-Strategie, detaillierte
   Datensatzprotokolle und kontrollierte Wiederholung fehlgeschlagener Datensätze
   erweitern; anschließend Export und Löschung fachlich konzipieren.
6. Bestandsbewegungen als revisionsfähige Buchungen umsetzen, statt Bestände nur
   als aktuellen Zahlenwert zu speichern.
7. Den Produktionsablauf um Statusübergänge, Schrittbearbeitung, Zeitmessung,
   Bestätigungen, Seriennummern und revisionsfähige Ereignisse erweitern.
8. Den Bestandszeitplan in einen robusten Hintergrund-Worker überführen und mit
   verteilter Sperre, Wiederholungen, Laufhistorie und Monitoring absichern.
9. Backups automatisiert planen, verschlüsselt extern replizieren und durch
   regelmäßige Wiederherstellungstests sowie Aufbewahrungsregeln absichern.
10. Vor einem produktiven Einsatz eigenständige Schlüsselverwaltung und Rotation,
   Secrets, Passwortregeln, Monitoring und extern vertrauenswürdiges TLS
   konzipieren.
11. Die vorhandene Container-CI um Webtests, Migrationstest, Sicherheitsprüfung und
   kontrollierte Deployment-Freigaben erweitern.

## 12. Wichtige Projektdateien

| Datei/Verzeichnis | Zweck |
| --- | --- |
| `README.md` | kompakter Schnellstart |
| `ARCHITECTURE.md` | Architekturentscheidung und Modulvertrag |
| `compose.yaml` | Orchestrierung der lokalen Dienste |
| `compose.portainer.yaml` | Portainer-Stack mit Registry-Images |
| `.env.example` | Vorlage der lokalen Konfiguration |
| `.env.portainer.example` | Vorlage für Portainer und öffentliche Herkunft |
| `.github/workflows/container-images.yml` | API-Test sowie Multi-Arch-Build und Veröffentlichung in GHCR |
| `apps/api/prisma/schema.prisma` | aktuelles relationales Datenmodell |
| `apps/api/prisma/migrations/` | versionierte Datenbankänderungen |
| `apps/api/src/core/auth/` | Authentifizierungs- und Rollenprüfung |
| `apps/api/src/modules/` | API-Fachmodule |
| `apps/api/src/modules/backups/` | Erstellung, Download und Wiederherstellung von Sicherungen |
| `apps/api/src/modules/system-update/` | Versions- und Systembereitschaftsprüfung |
| `apps/api/src/modules/productions/` | Produktionen als Arbeitskopien von Anweisungen |
| `apps/api/src/modules/external-integrations/` | Verwaltung, Verschlüsselung und Test externer Verbindungen |
| `apps/web/src/modules/` | Oberflächen der Fachmodule |
| `infrastructure/keycloak/` | Realm, Benutzerprofil und Nachkonfiguration |
| `infrastructure/keycloak/themes/` | projektspezifisches Keycloak-Login-Theme |
| `infrastructure/caddy/Caddyfile` | HTTPS und Reverse-Proxy-Routing |
