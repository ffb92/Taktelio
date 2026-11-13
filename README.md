# Taktelio

Virtueller Trainingsassistent für Fußballvereine. React-Oberfläche mit Anmeldung, Vereinseinrichtung, Mitgliederverwaltung, Übungsbibliothek und KI-Trainingsplanung.

## Entwicklung

Voraussetzung: Node.js 22.

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm run dev` startet das Vite-Frontend. Für die serverseitigen `/api/*`-Routen einen Vercel-Entwicklungsserver oder ein Deployment verwenden. Der Build schreibt die statischen Dateien nach `dist/client`.

## Struktur

- `src/App.jsx`: Sitzung, Verein und Navigation.
- `src/components/`: Anmeldung, Profil, Planung, Bibliothek und gespeicherte Einheiten.
- `src/lib/`: gemeinsamer API-Client und Übernahme früherer lokaler Entwürfe.
- `api/index.mjs`: Vercel-Serverfunktion.
- `worker/`: vorhandene Serverlogik für Auth, Datenzugriffe und KI-Limits.
- `tests/`: Server- und React-Integrationstests mit simulierten Diensten.

Die Benutzeroberfläche wird vollständig von React gerendert. Der Server prüft Identität und Vereinsmitgliedschaft; Datenzugriffe unterliegen den Datenbank-Zugriffsregeln. Ein Vereinswechsel oder eine Abmeldung verwirft den zugehörigen Trainingszustand.

## Deployment

GitHub `main` ist mit Vercel verbunden. `vercel.json` definiert Build, Ausgabeordner und API-Routing. Die bestehende Datenbank wird weiterverwendet.

Servervariablen werden ausschließlich in den Vercel-Projekteinstellungen gesetzt, siehe `.env.example`. Keine API-Schlüssel in Git eintragen. Die KI bleibt ohne vollständige Serverkonfiguration deaktiviert. E-Mail-Bestätigung und Passwort-Wiederherstellung benötigen passende Auth-Redirects und funktionierenden Mailversand.

Historische Datenbankdateien dokumentieren frühere Migrationen und sind kein vollständiger Bootstrap für eine neue Datenbank. Bereits angewandte Migrationen nicht erneut ausführen.

## Prüfungen

`npm test` prüft unter anderem Anmeldung, Vereinseinrichtung, Vereinswechsel, Abmeldung, idempotente KI-Anfragen und Speichern. Es werden keine kostenpflichtigen Modellaufrufe ausgeführt. Ein vollständig angemeldeter Produktionsablauf ist zusätzlich manuell zu prüfen.
