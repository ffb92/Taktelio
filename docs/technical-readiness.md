# Technischer Stand vor der UI-Überarbeitung

Ausgangsstand: `d994898` auf `main`. Aktualisiert am 14. November 2026 für `f7757af`: committed, gepusht und über Vercel als Production veröffentlicht.

## Umgesetzt

- Ein gemeinsamer Datenvertrag prüft Trainingsvorgaben, alle Planblöcke, Gruppen, Zeiten und Diagramme. Die Speicher-API weist unvollständige Pläne ab. Die KI verwendet dasselbe Schema.
- Vollständige ältere Entwürfe werden ohne Datenverlust übernommen. Beschädigte gespeicherte Einheiten können die Planansicht nicht mehr durch Öffnen zum Absturz bringen; lokale Altbestände bleiben erhalten und sind bei ungültigem Aufbau nicht öffnbar.
- GitHub-Actions-Konfiguration für Installation, gesamte Testsuite und Produktionsbuild unter Node 22 ergänzt. Sie läuft bei Push und Pull Request; der Lauf zu `f7757af` war erfolgreich.
- Frischaufbau des Anwendungsschemas mit 40 Katalogübungen aus den ursprünglichen SQL-Dateien und Migrationen; Abbruch bei bestehenden öffentlichen Tabellen. Anleitung: [Datenbankentwicklung](database-development.md).
- Die SQL-Tests laufen automatisch in einer isolierten PostgreSQL-Datenbank mit PGlite, einschließlich zusätzlicher Prüfungen für Vereinsgrenzen, persönliche Pläne, Rollen und anonymen Zugriff.
- `npm run dev` bietet Frontend und dieselben API-Handler wie das Deployment unter einer lokalen Adresse an. Ein HTTP-Integrationstest prüft Origin-Schutz, Sitzungscookies, Fehlerantworten und Größenlimit.
- Supabase-Projektkonfiguration zentralisiert und über ein gemeinsam erforderliches URL-/Key-Paar umgebungsabhängig gemacht. Ohne Konfiguration bleibt das bestehende Projekt erhalten.

## Verifikation

- **50 Tests unter Node 22.23.5 bestanden**: vollständiger Lauf mit 49 Tests, danach die ergänzte Altbestandsprüfung zusammen mit allen sechs React-Tests erfolgreich nachgeprüft.
- Lokal am 15. November 2026 nach der Einführung der Altersregeln: 59 Tests und Produktionsbuild erfolgreich; die Änderung ist noch nicht committed oder veröffentlicht.
- Lokal am 15. November 2026 nach der Bereinigung von Speichern und Altresten: 71 Tests inklusive Datenbanktests und Produktionsbuild erfolgreich. Die Migration `20261115120000_training_plan_updates.sql` ist noch nicht auf die Produktionsdatenbank angewendet.
- Lokal am 15. November 2026 nach Nettospielzeit und Erholung: 75 Tests und Produktionsbuild erfolgreich. Neue Angaben sind Pflicht für KI-Pläne, für ältere gespeicherte Einheiten aber optional, damit sie lesbar bleiben.
- Produktionsbuild unter Node 22 erfolgreich.
- Lokaler Vite-Start und Darstellung der Anmeldeseite im echten Browser erfolgreich.
- Der Ursprungsstand wurde ohne Produktionsdaten und ohne kostenpflichtige Modellaufrufe geprüft. Inzwischen sind `f81b907` und `f7757af` committed, gepusht und über Vercel veröffentlicht.
- Produktions-Smoke-Test am 14. November 2026: Anmeldeseite HTTP 200, `/api/status` ohne Sitzung HTTP 401, öffentliche Einladungsvorschau HTTP 404 bei unbekanntem Token (Supabase-RPC erreichbar).
- Manueller Ablauf am 14. November 2026 durch den Nutzer mit echten Konten und Mails: Anmeldung, Passwort-Zurücksetzen, Einladung und KI-Planung funktionieren.

## Noch offen

- Nicht ausdrücklich nachgewiesen: Registrierung mit Bestätigung in einem frischen Browser, Session-Erneuerung, Passwortänderung im angemeldeten Zustand sowie Speichern und erneutes Öffnen einer Einheit nach neuer Anmeldung. Ein kompletter Lauf mit separater Supabase-Testumgebung steht weiterhin aus.
- Die Supabase-Live-Konfiguration wurde am 14. November 2026 per `supabase config diff` gelesen: Site URL `https://www.taktelio.app`, Redirect-Allowlist mit `www`, Apex und `taktelio.vercel.app`, SMTP über Resend. Passwort-Zurücksetzen hat am 14. November 2026 eine echte Mail zugestellt; Registrierungsvorlagen und Data-API-Einstellungen bleiben ungeprüft. Die `?invite=*`-Muster für `www` und Apex sind seit dem 14. November 2026 in der Allowlist eingetragen.
- PGlite führt echte PostgreSQL-Policies aus, simuliert aber die Auth-Schnittstelle. Es ersetzt keinen vollständigen Supabase-Stack, kein Browser-Login und keinen Mehrverbindungs-/Lasttest.
- Der Frischaufbau erzeugt Anwendungsschema und Grundstock, aber keine Supabase-Migrationshistorie und keine externen Projekteinstellungen. Die Produktionshistorie wurde am 14. November 2026 für die beiden manuell eingespielten Migrationen abgeglichen; der ältere Doppeleintrag `20261113131024` bleibt in der Remote-Historie.
- Ein Linter oder Typecheck ist weiterhin nicht eingerichtet. Die automatische Basisprüfung umfasst Tests und Build.
- Social Media und Scouting bleiben Platzhalter. Ein vollständiger Anforderungskatalog für diese Module fehlt.

Das Trainingsgrundgerüst ist damit für die weitere UI-Arbeit abgesichert. Eine vollständige Produktionsfreigabe ist noch nicht nachgewiesen.
