# Datenbankentwicklung und technische Prüfung

## Lokale Sicherheitsprüfungen

```sh
npm ci
npm run test:db
```

Die Tests erstellen für jeden SQL-Test eine neue PGlite-Datenbank im Arbeitsspeicher und schließen sie anschließend. Sie verwenden das echte Anwendungsschema, die PostgreSQL-Zugriffsrechte und RLS-Policies. Die Rollen `anon` und `authenticated` besitzen kein `BYPASSRLS`. Ein kleiner Testadapter stellt `auth.users` und `auth.uid()` bereit; er simuliert weder JWT-Signaturprüfung noch Mailversand oder PostgREST. PGlite ist ausschließlich eine Entwicklungsabhängigkeit.

Geprüft werden:

- Aufbau aus leerem Anwendungsschema einschließlich 30 Katalogübungen und RLS auf allen Anwendungstabellen.
- Einmaliger Bootstrap; bestehende Tabellen verhindern eine erneute Installation.
- Vereinserstellung, Umbenennung, Mitgliedseinladung, Empfängerbindung, Wiederholung und Widerruf.
- KI-Gate-Secret, Kontingente, Budget, Wiederholungen, laufende Anfragen, Abrechnung und Monatswechsel.
- Trennung zwischen zwei Vereinen, Verhinderung gefälschter Eigentümerschaft und Schreibschutz des globalen Katalogs.
- Persönliche Pläne bleiben auch gegenüber anderen Mitgliedern desselben Vereins privat; eigene Vereinsübungen sind innerhalb des Vereins sichtbar.
- Anonyme Rollen dürfen keine Pläne oder Mitgliedschaften auslesen.

Mehrere parallele Datenbankverbindungen werden mit PGlite nicht geprüft. Sperrverhalten unter Last sowie die tatsächlich aktivierten Policies der gehosteten Datenbank brauchen eine separate Integrationstestumgebung.

## Leere Supabase-Testdatenbank aufbauen

Ein separates, frisches Supabase-Projekt verwenden. Das bestehende Produktionsprojekt ist dafür ungeeignet.

```sh
node scripts/database-schema.mjs > fresh-install.sql
```

Alternativ gibt `npm run --silent db:schema` denselben SQL-Text aus. Die erzeugte Datei kann im SQL-Editor der **leeren Testdatenbank** ausgeführt werden. Sie enthält eine Transaktion, prüft das Vorhandensein von Supabase Auth und bricht ab, wenn `public` bereits Tabellen enthält. Das Skript führt selbst keine Datenbankanfrage aus.

Der Generator setzt die vorhandenen Dateien aus `db/` und die anwendbaren Migrationen in ihrer notwendigen Reihenfolge zusammen. Nur das Kopieren aus dem alten Prototyp-Katalog wird durch `data/exercises.json` ersetzt. Die Migration zum Löschen ehemaliger Prototyp-Tabellen entfällt, da diese in einer frischen Datenbank nicht angelegt werden. Ein Test verlangt, dass jede weitere Migration ausdrücklich im Generator berücksichtigt wird. Die historische Migrationsfolge wird nicht umgeschrieben.

Das ist ein Schema-Bootstrap, kein Import produktiver Benutzer, Daten oder Migrationshistorie. Er setzt keine Supabase-Migrationshistorie. Vor späterem Einsatz von CLI-Migrationsbefehlen auf dieser Testdatenbank muss deren Historie separat mit dem Bootstrap abgeglichen werden. Keine Änderungen an der Historie einer bestehenden Produktionsdatenbank aus dieser Anleitung ableiten.

Das KI-Gate erhält absichtlich kein Secret. Ohne eigenen Serverzugang, passend eingerichteten Gate-Secret-Hash und freigegebenes Budget bleibt KI deaktiviert. Auth-Redirects, SMTP, Mailvorlagen und Data-API-Konfiguration sind Projekteinstellungen und werden durch diesen Bootstrap nicht eingerichtet. Ihre Anleitung steht in [Domain und Auth-Mails](domain-and-email-setup.md).

## Lokale Oberfläche mit Testprojekt

1. `.env.example` nach `.env.local` kopieren.
2. `SUPABASE_URL` und `SUPABASE_PUBLISHABLE_KEY` gemeinsam vom separaten Testprojekt übernehmen.
3. Die lokale Adresse in der Redirect-Allowlist dieses Testprojekts erlauben.
4. `npm run dev` starten und `http://localhost:5173` öffnen.

Server und Client laufen dabei unter derselben lokalen Adresse. Die Umgebungsvariablen werden beim Serverstart gelesen; nach Änderungen neu starten. Keine Secret- oder Service-Role-Keys als Publishable Key verwenden. Die lokale API verändert keine Authentifizierungs- oder Autorisierungsregeln.
