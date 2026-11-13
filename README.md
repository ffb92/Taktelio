# Taktelio – Plattformbasis

Stand: 13.11.2026. Private Pilotumgebung für eine spätere Plattform mit mehreren Vereinen. Hosting auf Vercel, Quellcode auf GitHub; Supabase bleibt für Auth und Datenbank zuständig.

## Implementiert

- Registrierung, Login, Logout, Passwort-Wiederherstellung und Passwortänderung über Supabase Auth. Eigene Anmeldeseite vor der App. Der Worker prüft bestätigte Nutzer über den Auth-Server; eine Client-ID oder ein Plattform-Header reicht nicht für Datenzugriff.
- Access- und Refresh-Token in Secure/HttpOnly/SameSite=Lax Cookies. Keine Sitzungstoken in localStorage/sessionStorage. Automatische Erneuerung bei abgelaufenen API-Sitzungen, Origin-Prüfung für schreibende Requests, keine geheimen Server-Keys im Client.
- Bereiche (workspaces) mit Mitgliedschaften und Rollen owner/admin/trainer. Bereichserstellung ist eine atomare SECURITY INVOKER RPC. Der Ersteller bekommt eine Owner-Mitgliedschaft; ein zusammengesetzter Fremdschlüssel stellt sicher, dass selbst angelegte Owner-Mitgliedschaften ausschließlich dem tatsächlichen Eigentümer gehören. Die Vereinserstellung läuft mit Nutzerrechten; eng begrenzte private Definer-Funktionen für Einladungen und KI-Limits sind unten beschrieben.
- 30 ursprüngliche Übungsentwürfe in der neuen Tabelle exercises als gemeinsamer, für Clients unveränderbarer Grundstock. Eigene Übungen gehören einem Bereich. RLS verhindert bereichsfremden Zugriff. Trainingspläne bleiben innerhalb des Bereichs zusätzlich privat für ihren Ersteller.
- KI liest ausschließlich den erlaubten Datenbankkatalog des ausgewählten Bereichs inklusive Grundstock. Keine stille Dateifallback-Bibliothek. Die bestehende OpenAI Responses-Anbindung, strukturierte Diagramme, Plausibilitätsprüfungen und Quellenbezüge bleiben erhalten.
- Zwei Hauptbereiche: Training und Bibliothek. Übungen und Einheiten sind innerhalb der Bibliothek zusammengefasst. Demo-Planer entfernt; frühere lokale KI-Entwürfe können ausdrücklich übernommen werden.
- Serverseitiges tier-Feld als Vorbereitung für Berechtigungen späterer Tarife. Keine Bezahlstrecke, kein aktives Pro-Angebot. Nutzer können tier nicht selbst schreiben. Mitgliedereinladungen sind implementiert; Rollenbearbeitung bleibt offen.

## Datenbank

Produktive Migrationen in Reihenfolge (SQL im Ordner db):
1. add_workspace_foundation / workspace-foundation.sql
2. restrict_new_workspace_table_grants / workspace-grants.sql
3. verify_workspace_owner_without_recursive_policy / workspace-owner-constraint.sql

Tabellen: workspaces, memberships, exercises, training_plans. Alle haben RLS. Zusätzlich explizite minimale Tabellen-/Spaltenrechte statt der standardmäßig breiten Supabase-Grants. Die ungenutzten Prototyp-Tabellen `sc27_members`, `sc27_plans` und `sc27_exercises` wurden mit einer abgesicherten Bereinigungsmigration entfernt. Mitglieder und Pläne waren leer; alle 30 Übungsinhalte lagen bereits identisch in `exercises`. Aktive Vereinsdaten bleiben erhalten.

## Erweiterung und Automatisierung

Worker-Module: auth.mjs (Identität/Sitzungen), storage.mjs (Bereichsprüfung/Datenzugriff), catalog.mjs (Auswahl), api.mjs (Generierung/Validierung). REST-Routen unter /api/auth/*, /api/workspaces, /api/exercises, /api/storage und /api/plan.

Weitere Module beziehen sich immer auf workspace_id plus echte Nutzer-/Dienstidentität. Für spätere Hintergrundaufträge braucht es eine persistente Job-Warteschlange mit workspace_id, Auftraggeber, Idempotenzschlüssel, Status, Ergebnis und Nutzungsprotokoll. Ein Worker muss dieselbe Bereichs- und Featureprüfung vor Generierung ausführen. Es gibt aktuell keinen Scheduler oder Automatisierungsrunner und keine API-Keys für externe Automatisierungen.

Tarife später über eine serverseitig verwaltete Entitlement-Tabelle, verifizierte Zahlungs-Webhooks und persistente Nutzungsmessung erweitern. Kein im Browser gesetztes Pro-Flag. Persistente Mengen- und Kostenlimits sind implementiert (siehe unten); Schutz gegen Mehrfachkonten bleibt vor öffentlicher Freigabe zu ergänzen. Die KI-Route benötigt eine bestätigte Supabase-Sitzung, eine Vereinsmitgliedschaft und die serverseitige Budgetfreigabe. Eine Sites-Nutzeridentität wird nicht mehr benötigt.

## Noch nötige Konfiguration vor öffentlicher Registrierung

Supabase Auth: Site URL und Redirect-Allowlist auf die tatsächliche App-Domain setzen; SMTP mit eigener Absenderdomain konfigurieren. Provider-Standardmail ist kein verlässlicher Versand für beliebige externe Nutzer. Die E-Mail-Bestätigung bleibt aktiviert. Bestätigungs-/Recovery-Redirects werden von der App verarbeitet; vollständige Mailzustellung und Anmeldung sind ohne ein echtes Nutzerkonto noch nicht end-to-end bestätigt.

Vercel veröffentlicht die Anmeldeseite. Datenzugriffe bleiben durch Supabase Auth und RLS geschützt. Ohne vollständige Serverkonfiguration bleibt die KI gesperrt. Vor externer Registrierung Mailkonfiguration und Domain-Redirects prüfen.

## Prüfung

Build: node scripts/build.mjs. Lokale Tests: node --test tests/*.test.mjs. Keine kostenpflichtigen OpenAI-Testaufrufe.

Tests prüfen Cookie-Sicherheit, fremde Origins, fehlende Identität, Bereichszuordnung und Modellvalidierung mit Mocks. tests/tenant-isolation.sql wurde produktiv in einer vollständig zurückgerollten Transaktion mit zwei synthetischen Identitäten ausgeführt: getrennte Bereiche/Übungen/Pläne, lesbarer Grundstock, kein selbst gewähltes Pro und keine Einfügung globaler Übungen. Keine Testkonten bleiben bestehen. Supabase Security Advisor: bekannte Passwortschutz-Warnung; private KI-Tabellen sind absichtlich ohne Client-Policies gesperrt (siehe unten). Login-/Registrierungsansicht im Browser geprüft; vollständiger angemeldeter Ablauf und mobiles Gerät noch unbestätigt.

## Vereinseinrichtung und Profil (13.11.2026)

Beim ersten bestätigten Login ohne Mitgliedschaft erscheint die Vereinseinrichtung. Danach keine Erstellen-Schaltfläche in der Hauptansicht; Vereinsname, Vereinswechsel (nur bei mehreren bestehenden Mitgliedschaften) und Mitgliederverwaltung liegen im Profil. Die öffentliche create_workspace RPC verhindert wiederholte Erstellung durch bereits zugeordnete Nutzer und serialisiert gleichzeitige Aufrufe pro Nutzer.

/api/club: Profil laden / Name ändern. /api/club/invite: E-Mail-gebundene Einladung erstellen. /api/club/accept: Einladung mit bestätigter Empfängeridentität annehmen. /api/club/revoke: offene Einladung widerrufen. Neue Mitglieder erhalten ausschließlich trainer. Owner/Admin dürfen Einladungen erstellen und Mitgliederdaten ihres Vereins lesen. Keine automatische Versandintegration: UI erstellt einen kopierbaren Link und kennzeichnet dies ausdrücklich.

club_invitations speichert nur SHA-256-Hashes der zufälligen Token, E-Mail, Verein, Ersteller, Ablauf, Annahme und Widerruf. Gültigkeit sieben Tage. Annahme erfolgt gesperrt in einer Transaktion und ist für denselben Empfänger wiederholbar. Privilegierte Funktionen sind auf die konkrete Operation beschränkt, liegen im privaten Schema, prüfen auth.uid und Berechtigungen aus Tabellen, verwenden einen leeren search_path und sind nicht für anon/PUBLIC ausführbar. Öffentliche RPC-Hüllen sind SECURITY INVOKER.

Tests: tests/club-invitations.sql testet mit drei temporären Identitäten in einer zurückgerollten Transaktion Einrichtung, Umbenennen, falsche Empfänger, Trainerrechte, Annahme, Wiederholung und Widerruf. tests/club-navigation.test.mjs prüft Onboarding-Sperre und Einladungszustand ohne KI-Aufruf. Vollständiger Live-Beitritt eines externen Nutzers ist nach dem Hostingwechsel noch zu prüfen. Mail-Redirect-Konfiguration ist weiterhin offen.

Security Advisor meldet inzwischen deaktivierten Schutz gegen bekannte kompromittierte Passwörter. Provider-Konfiguration noch offen: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection


## KI-Nutzungslimits (13.11.2026)

| Regel | Pilotwert |
| --- | --- |
| Gemeinsames Vereinskontingent | 10 erfolgreiche Generierungen je UTC-Kalendermonat |
| Anpassung eines Plans | Zählt ebenfalls als Generierung |
| Starts je Nutzer | Maximal 3 innerhalb der letzten 60 Sekunden |
| Parallelität | Maximal eine laufende Anfrage je Nutzer, auch vereinsübergreifend |
| Globales Budget | 1 USD ab Aktivierung für alle Vereine; keine automatische Erneuerung |
| Kostenreserve | 0,10 USD vor jedem Aufruf; bei weniger Restbudget wird gesperrt |

`worker/limits.mjs` verbindet den Worker mit `public.ai_gate`. Die öffentliche
Invoker-Hülle delegiert an eine eng begrenzte private Definer-Funktion. Sie prüft
bestätigte Identität, Vereinsmitgliedschaft und ein ausschließlich serverseitiges
`AI_LIMIT_SECRET` (Datenbank speichert nur SHA-256). Ohne Prüfung oder bei Ausfall
startet kein Modellaufruf. Kein Service-Role-Key nötig.

`workspace_entitlements` hält die serverseitig verwalteten Vereinsregeln. Neue
Vereine bekommen bei der ersten Prüfung den Pilotstandard. Mitglieder dürfen nur
ihre eigenen Regeln lesen, nicht verändern. `private.ai_requests` hält Reservierung,
Nutzer, Verein, Monat, Fingerprint, Status, Tokenverbrauch, Kosten und erfolgreiche
Ergebnisse für Wiederholungen; `private.ai_budget_periods` enthält das Gesamtbudget.
Die privaten Tabellen sind ohne direkte Clientrechte und mit RLS absichtlich ohne
Client-Policies gesperrt. Ein Budget-Zeilenlock serialisiert Reservierung und Abrechnung.

Erfolgreiche Ergebnisse zählen einmal. Gleiche Anfrage-ID mit gleichem Inhalt liefert
das gespeicherte Ergebnis ohne zweiten Modellaufruf; andere Inhalte werden abgewiesen.
Fehler zählen nicht als erfolgreiche Generierung. Bekannte Tokenkosten werden trotzdem
verbucht. Bei Timeout, unbekanntem Verbrauch oder abgebrochenem Worker bleibt die volle
Reserve belastet. Nach zwei Minuten wird eine verwaiste Reservierung bei der nächsten
Prüfung auf `unknown` gesetzt und blockiert nicht dauerhaft die Nutzerparallelität.

Aktuell freigegeben: `gpt-4.1-mini`, Standard-Service-Tier, maximal 11.000 Ausgabetokens
und 100.000 Bytes serialisierte Provideranfrage. Kostenansatz: 0,40 USD/Mio. Eingabetokens
und 1,60 USD/Mio. Ausgabetokens; Cache-Rabatte werden vorsichtig nicht abgezogen.
Quelle, geprüft 13.11.2026: https://developers.openai.com/api/docs/models/gpt-4.1-mini
Andere Modelle bleiben bis zur Freigabe einer passenden Kostenregel gesperrt.
Dies ist das App-Budget ab Aktivierung; frühere oder externe API-Nutzung wird nicht erfasst.

Die Planungsansicht zeigt Verbrauch, Monatslimit und Resetdatum und erklärt Sperren.
Speichern, Öffnen und Katalogzugriff bleiben ohne KI-Verbrauch möglich.
Es gibt noch keine Tarifabrechnung und keine Administrationsoberfläche für die Limits.

Migration: `supabase/migrations/20261113074651_ai_usage_limits.sql` (bereits angewandt).
`AI_LIMIT_SECRET` muss als Hosting-Secret eingerichtet sein. Nicht in Quellcode oder Logs kopieren.
Tests: `npm test`, `npm run build` und `tests/ai-limits.sql` in einer vollständig
zurückgerollten Datenbanktransaktion. Geprüft: Berechtigungen, Vereinsgrenzen,
Wiederholung, Parallelitätssperre, Kontingent, Rate, Budget, Abrechnung, verwaiste
Reservierungen und Monatswechsel. API-Tests verwenden einen simulierten Provider;
keine kostenpflichtige Live-Generierung oder vollständige angemeldete Browserstrecke.

## Bereinigung für Taktelio

Produktname, Seitentitel, Anmeldung, Fußzeile und Paketname sind auf Taktelio umgestellt. Der Vereinsname ist ein frei gewählter Datensatz, kein Bestandteil der Tabellenstruktur. `window.workspaceHeaders` übermittelt die gewählte Vereins-ID; der Server prüft sie gegen die bestätigte Mitgliedschaft.

Die Migration `supabase/migrations/20261113130800_retire_legacy_club_tables.sql` sperrt die alten Tabellen und prüft vor dem Entfernen, dass keine Mitglieder/Pläne vorhanden und sämtliche Übungen identisch im gemeinsamen Katalog erhalten sind. Sie verwendet kein CASCADE und bricht bei unerwarteten Abhängigkeiten ab. Die alten Tabellenrechte und Policies entfallen mit den Tabellen.

Historische SQL-Dateien in `db/` bleiben unverändert: Sie dokumentieren den bereits angewandten Plattformumbau und sind kein vollständiger Bootstrap für eine leere Datenbank. Die zusätzliche Reihenfolge nach der Workspace-Basis ist `club-profile-invitations.sql`, `club-members-fix.sql`, die KI-Limit-Migration und schließlich die Bereinigungsmigration. Für eine komplett neue Supabase-Instanz fehlt noch eine konsolidierte Baseline mit Seed-Daten; diese historischen Dateien nicht blind erneut ausführen.

Frühere lokale Entwürfe werden beim nächsten Öffnen derselben Domain von `sc27-ai-plans` nach `taktelio-ai-plans` übernommen. Der alte Schlüssel wird erst nach erfolgreichem Schreiben entfernt; bei Speicherfehlern bleiben die Originale erhalten. `sc27-cloud-session` wird weiterhin ausschließlich gelöscht, niemals zur Anmeldung verwendet. Diese beiden Altnamen, historische Migrationen und Sicherheitstests sind bewusste Kompatibilitätsreferenzen. Browserdaten sind an die Domain gebunden und wechseln bei einem Hosting-Umzug nicht automatisch mit; wichtige Entwürfe vorher in den Verein speichern.

## Hosting und Entwicklung

Repository: https://github.com/ffb92/Taktelio

Vercel baut mit `npm run build` die statischen Dateien unter `dist/client`. `api/index.mjs` verbindet alle `/api/*`-Routen mit der bestehenden Serverlogik. Node.js 22, Region Frankfurt, Laufzeitlimit 120 Sekunden. Die Anwendung nutzt keine Sites-Kennung oder Sites-Runtime. Das bisherige Worker-Bundle wird für lokale Entwicklung weiterhin erzeugt.

`npm test` prüft die Serverlogik mit simulierten Diensten, `npm run build` erstellt die Ausgaben. `npm run dev` startet den lokalen Worker-Adapter; für produktionsnahe HTTPS-/Cookie-Tests `vercel dev` oder ein geschütztes Preview verwenden.

Vercel-Servervariablen: `OPENAI_API_KEY`, `AI_MODEL=gpt-4.1-mini`, `AI_LIMIT_SECRET`. Der Hash des Limit-Schlüssels muss in `private.ai_gate_config` übereinstimmen. Keine Geheimnisse in Git oder Browsercode. Die vorhandenen Supabase-URL und der Publishable-Key sind öffentliche Projektkonfiguration; Zugriffe bleiben durch Auth/RLS begrenzt.

Supabase Auth: Produktionsdomain als Site URL und exakten erlaubten Redirect setzen. Preview-Domains nicht pauschal freigeben. Für E-Mails an externe Nutzer SMTP konfigurieren. Der bestehende globale KI-Budgetstand wird beim Hostingwechsel nicht zurückgesetzt.

Offen bis zur Live-Verifikation: OpenAI-Schlüssel auf Vercel, Auth-Redirect-Konfiguration/SMTP und vollständiger angemeldeter Browserablauf.
