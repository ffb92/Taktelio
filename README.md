# Taktelio

Virtueller Trainingsassistent für Fußballvereine. React-Oberfläche mit Anmeldung, Vereinseinrichtung, Mitgliederverwaltung, Übungsbibliothek und KI-Trainingsplanung.

Produktziel, vorhandene Funktionen und priorisierte nächste Schritte stehen in [PROJEKT.md](PROJEKT.md).

## Entwicklung

Voraussetzung: Node.js 22.

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm run dev` startet das Vite-Frontend und dieselben serverseitigen `/api/*`-Handler wie das Deployment. Im Browser `http://localhost:5173` verwenden. Die Sitzungscookies bleiben auch lokal `HttpOnly`, `Secure` und `__Host-`-gebunden; Zugriffe über eine unverschlüsselte LAN-IP unterstützen diese Cookies nicht. Der Build schreibt die statischen Dateien nach `dist/client`; `npm run preview` liefert nur die gebauten Dateien aus.

Für eine getrennte Testumgebung `.env.example` nach `.env.local` kopieren und `SUPABASE_URL` sowie `SUPABASE_PUBLISHABLE_KEY` gemeinsam auf ein separates Supabase-Projekt setzen. Beide Werte sind ausschließlich serverseitig; ohne diese Angaben bleibt das bestehende Taktelio-Projekt aktiv. KI-Schlüssel sind für Tests, Build und die Anmeldeseite nicht erforderlich. Der lokale API-Adapter befindet sich in `scripts/dev-api.mjs`.

## Struktur

- `src/App.jsx`: Sitzung, Verein und Navigation.
- `src/components/`: Anmeldung, Profil, Planung, Bibliothek und gespeicherte Einheiten.
- `src/lib/`: gemeinsamer API-Client und Übernahme früherer lokaler Entwürfe.
- `api/index.mjs`: Vercel-Serverfunktion.
- `worker/`: vorhandene Serverlogik für Auth, Datenzugriffe und KI-Limits.
- `shared/training-plan.mjs`: gemeinsamer Datenvertrag für KI-Ausgabe, gespeicherte Pläne und ältere Entwürfe.
- `tests/`: Server- und React-Integrationstests mit simulierten Diensten.

Die Benutzeroberfläche wird vollständig von React gerendert. Der Server prüft Identität und Vereinsmitgliedschaft; Datenzugriffe unterliegen den Datenbank-Zugriffsregeln. Ein Vereinswechsel oder eine Abmeldung verwirft den zugehörigen Trainingszustand.

## Deployment

GitHub `main` ist mit Vercel verbunden. `vercel.json` definiert Build, Ausgabeordner und API-Routing. Die bestehende Datenbank wird weiterverwendet.

Servervariablen werden ausschließlich in den Vercel-Projekteinstellungen gesetzt, siehe `.env.example`. Keine API-Schlüssel in Git eintragen. Die KI bleibt ohne vollständige Serverkonfiguration deaktiviert. E-Mail-Bestätigung und Passwort-Wiederherstellung benötigen passende Auth-Redirects und funktionierenden Mailversand.

Historische Datenbankdateien bleiben unverändert. Für eine leere Supabase-Testdatenbank lässt sich ein vollständiges Schema einschließlich Übungsgrundstock erzeugen; siehe [Datenbankentwicklung](docs/database-development.md). Das Schema verweigert die Ausführung, sobald im öffentlichen Schema Tabellen existieren. Bereits angewandte Migrationen nicht erneut ausführen.

## Prüfungen

`npm test` prüft unter anderem Anmeldung, Vereinseinrichtung, Vereinswechsel, Abmeldung, idempotente KI-Anfragen und Speichern. Es werden keine kostenpflichtigen Modellaufrufe ausgeführt. Ein vollständig angemeldeter Produktionsablauf ist zusätzlich manuell zu prüfen.

Die SQL-Tests laufen ebenfalls in `npm test` und separat mit `npm run test:db`. Sie erzeugen eine isolierte PostgreSQL-Datenbank im Arbeitsspeicher mit PGlite. Nur die für Policies benötigte Auth-Schnittstelle wird simuliert; Tabellen, Funktionen, Grants und RLS werden tatsächlich durch PostgreSQL ausgeführt. Keine Netzwerkverbindung und keine Produktionszugänge sind dafür nötig. GitHub Actions führt bei Push und Pull Request Installation, Tests und Build unter Node 22 aus.
