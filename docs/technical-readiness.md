# Technischer Stand vor der UI-Überarbeitung

Ausgangsstand: `d994898` auf `main`. Lokale Weiterentwicklung: 14. November 2026; noch nicht committed oder veröffentlicht.

## Umgesetzt

- Ein gemeinsamer Datenvertrag prüft Trainingsvorgaben, alle Planblöcke, Gruppen, Zeiten und Diagramme. Die Speicher-API weist unvollständige Pläne ab. Die KI verwendet dasselbe Schema.
- Vollständige ältere Entwürfe werden ohne Datenverlust übernommen. Beschädigte gespeicherte Einheiten können die Planansicht nicht mehr durch Öffnen zum Absturz bringen; lokale Altbestände bleiben erhalten und sind bei ungültigem Aufbau nicht öffnbar.
- GitHub-Actions-Konfiguration für Installation, gesamte Testsuite und Produktionsbuild unter Node 22 ergänzt. Sie wird nach einem autorisierten Push wirksam.
- Frischaufbau des Anwendungsschemas mit 30 Katalogübungen aus den ursprünglichen SQL-Dateien und Migrationen; Abbruch bei bestehenden öffentlichen Tabellen. Anleitung: [Datenbankentwicklung](database-development.md).
- Die SQL-Tests laufen automatisch in einer isolierten PostgreSQL-Datenbank mit PGlite, einschließlich zusätzlicher Prüfungen für Vereinsgrenzen, persönliche Pläne, Rollen und anonymen Zugriff.
- `npm run dev` bietet Frontend und dieselben API-Handler wie das Deployment unter einer lokalen Adresse an. Ein HTTP-Integrationstest prüft Origin-Schutz, Sitzungscookies, Fehlerantworten und Größenlimit.
- Supabase-Projektkonfiguration zentralisiert und über ein gemeinsam erforderliches URL-/Key-Paar umgebungsabhängig gemacht. Ohne Konfiguration bleibt das bestehende Projekt erhalten.

## Verifikation

- **50 Tests unter Node 22.23.5 bestanden**: vollständiger Lauf mit 49 Tests, danach die ergänzte Altbestandsprüfung zusammen mit allen sechs React-Tests erfolgreich nachgeprüft.
- Produktionsbuild unter Node 22 erfolgreich.
- Lokaler Vite-Start und Darstellung der Anmeldeseite im echten Browser erfolgreich.
- Keine Produktionsdaten geändert, keine kostenpflichtigen Modellaufrufe, kein Commit, Push oder Deployment.

## Noch offen

- Ein vollständiger Ablauf mit echten Testkonten: Registrierung und Mailbestätigung, Session-Erneuerung, Passwort-Reset, Einladungsannahme, Generierung, Speichern und erneutes Öffnen. Dafür sind eine konfigurierte separate Supabase-Testumgebung und geeignete Konten erforderlich.
- Live-Konfiguration von Redirect-Allowlist, SMTP, Mailvorlagen und Data API sowie die tatsächlich angewandten produktiven Policies wurden nicht geprüft.
- PGlite führt echte PostgreSQL-Policies aus, simuliert aber die Auth-Schnittstelle. Es ersetzt keinen vollständigen Supabase-Stack, kein Browser-Login und keinen Mehrverbindungs-/Lasttest.
- Der Frischaufbau erzeugt Anwendungsschema und Grundstock, aber keine Supabase-Migrationshistorie und keine externen Projekteinstellungen. Die Übernahme in den CLI-Migrationsworkflow muss gesondert abgestimmt werden.
- Ein Linter oder Typecheck ist weiterhin nicht eingerichtet. Die automatische Basisprüfung umfasst Tests und Build.
- Social Media und Scouting bleiben Platzhalter. Ein vollständiger Anforderungskatalog für diese Module fehlt.

Das Trainingsgrundgerüst ist damit für die weitere UI-Arbeit abgesichert. Eine vollständige Produktionsfreigabe ist noch nicht nachgewiesen.
