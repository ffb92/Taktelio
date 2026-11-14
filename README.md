# Taktelio

Virtueller Trainingsassistent für Fußballvereine. React-Oberfläche (Vite, Tailwind CSS, shadcn/ui) mit Anmeldung, Vereinseinrichtung, Mitgliederverwaltung, Übungsbibliothek und KI-Trainingsplanung.

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

Die Bild-Assets unter `public/images/` wurden mit fal AI erzeugt: das Login-Foto mit Flux, die Illustrationen mit Recraft V3. Mit `FAL_KEY` in `.env.local` lassen sich die Illustrationen über `npm run images:generate` neu erzeugen; Prompts, Stil und Farbpalette stehen in `scripts/generate-images.mjs`. Der Prompt für das Login-Foto ist dort ebenfalls dokumentiert.

Für eine getrennte Testumgebung `.env.example` nach `.env.local` kopieren und `SUPABASE_URL` sowie `SUPABASE_PUBLISHABLE_KEY` gemeinsam auf ein separates Supabase-Projekt setzen. Beide Werte sind ausschließlich serverseitig; ohne diese Angaben bleibt das bestehende Taktelio-Projekt aktiv. KI-Schlüssel sind für Tests, Build und die Anmeldeseite nicht erforderlich. Der lokale API-Adapter befindet sich in `scripts/dev-api.mjs`.

## Struktur

- `src/App.jsx`: Sitzung, Verein und Navigation.
- `src/components/`: Anmeldung, Profil, Planung, Bibliothek und gespeicherte Einheiten.
- `src/lib/`: gemeinsamer API-Client und Übernahme früherer lokaler Entwürfe.
- `api/index.mjs`: Vercel-Serverfunktion.
- `worker/`: vorhandene Serverlogik für Auth, Datenzugriffe und KI-Limits.
- `shared/training-plan.mjs`: gemeinsamer Datenvertrag für KI-Ausgabe, gespeicherte Pläne und ältere Entwürfe.
- `tests/`: Server- und React-Integrationstests mit simulierten Diensten.

Die Benutzeroberfläche wird vollständig von React gerendert. Gestaltung und Komponenten basieren auf Tailwind CSS und shadcn/ui. Auf dem Handy führt eine feste untere Navigation durch Training, Social Media und Scouting, das Profil erreichst du oben rechts; auf dem Desktop liegt die Navigation in einer linken Sidebar mit dem Profil unten links. Der Server prüft Identität und Vereinsmitgliedschaft; Datenzugriffe unterliegen den Datenbank-Zugriffsregeln. Ein Vereinswechsel oder eine Abmeldung verwirft den zugehörigen Trainingszustand.

## Übungskatalog

`data/exercises.json` ist die Quelle des gemeinsamen Übungsgrundstocks. Der Server liest den Katalog zur Laufzeit aus der Datenbank; das JSON wird beim Frischaufbau einer leeren Datenbank eingespielt und über den Sync in eine bestehende Datenbank übernommen.

```sh
npm run catalog:validate   # Schema und fachliche Grundregeln
npm run catalog:coverage   # Abdeckung je Altersgruppe, Teilnehmerzahl und Phase
npm run catalog:sync       # Probelauf gegen die Datenbank (nur lesend)
```

Für das Schreiben wird der Service-Role-Key benötigt, nicht der Publishable Key. Der Sync ändert ausschließlich Zeilen des gemeinsamen Katalogs (`workspace_id is null`), niemals Vereinsübungen.

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "…"
npm run catalog:sync -- --apply           # neu und geändert schreiben
npm run catalog:sync -- --apply --prune   # zusätzlich entfernte Einträge löschen
```

Neue Übungen übernehmen dieselbe Struktur wie der bestehende Grundstock. `npm test` prüft den Katalog mit; eine ungültige oder doppelte Übung lässt die Prüfung fehlschlagen.

## Deployment

GitHub `main` ist mit Vercel verbunden. `vercel.json` definiert Build, Ausgabeordner und API-Routing. Die bestehende Datenbank wird weiterverwendet.

Servervariablen werden ausschließlich in den Vercel-Projekteinstellungen gesetzt, siehe `.env.example`. Keine API-Schlüssel in Git eintragen. Die KI bleibt ohne vollständige Serverkonfiguration deaktiviert. E-Mail-Bestätigung und Passwort-Wiederherstellung benötigen passende Auth-Redirects und funktionierenden Mailversand.

Historische Datenbankdateien bleiben unverändert. Für eine leere Supabase-Testdatenbank lässt sich ein vollständiges Schema einschließlich Übungsgrundstock erzeugen; siehe [Datenbankentwicklung](docs/database-development.md). Das Schema verweigert die Ausführung, sobald im öffentlichen Schema Tabellen existieren. Bereits angewandte Migrationen nicht erneut ausführen.

## Prüfungen

`npm test` prüft unter anderem Anmeldung, Vereinseinrichtung, Vereinswechsel, Abmeldung, idempotente KI-Anfragen und Speichern. Es werden keine kostenpflichtigen Modellaufrufe ausgeführt. Ein vollständig angemeldeter Produktionsablauf ist zusätzlich manuell zu prüfen.

Die SQL-Tests laufen ebenfalls in `npm test` und separat mit `npm run test:db`. Sie erzeugen eine isolierte PostgreSQL-Datenbank im Arbeitsspeicher mit PGlite. Nur die für Policies benötigte Auth-Schnittstelle wird simuliert; Tabellen, Funktionen, Grants und RLS werden tatsächlich durch PostgreSQL ausgeführt. Keine Netzwerkverbindung und keine Produktionszugänge sind dafür nötig. GitHub Actions führt bei Push und Pull Request Installation, Tests und Build unter Node 22 aus.

## Anbindungen

Vercel und Supabase sind als gepinnte devDependencies eingebunden (`npx vercel`, `npx supabase`). Nach einem frischen Checkout einmalig `npx vercel link` und `npx supabase link --project-ref iyhyibjmfzjuypgybnno` ausführen; die Login-Tokens liegen außerhalb des Repositories. `supabase/config.toml` enthält lokale Standardwerte und darf nicht per `supabase config push` gegen die Produktion geschrieben werden.

## Lizenz

Proprietär — alle Rechte vorbehalten. Details siehe [LICENSE](LICENSE).
