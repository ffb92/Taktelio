# Entwicklungscheckliste für den Trainingspilot

Arbeitsverzeichnis für Claude Code: G:\Code\Taktelio. Für P3–P5 zuerst src/components/TeamsPage.jsx, Teams.jsx, Events.jsx, shared/events.mjs, worker/teams.mjs, worker/events.mjs sowie tests/events.test.mjs und tests/events.sql prüfen. Mannschaften, Termine, Rückmeldungen und zugehörige Migrationen existieren bereits. Bestehende Abläufe gegen das Pilotziel testen und nur belegte Lücken ergänzen.

Arbeitsauftrag für DeepSeek in Claude Code. Der Nutzer hat Codex mit der Checkliste beauftragt.

## Startprompt für jede Entwicklungssitzung

> Bearbeite genau Paket [Paket-ID einsetzen] aus der Roadmap. Lies seine Voraussetzungen, die zugehörigen Produktentscheidungen und Abnahmekriterien. Prüfe den Ist-Stand über den normalen Einstieg. Ist das gewünschte Verhalten schon vorhanden, belege es durch einen passenden Test. Ändere nur, was für dieses Paket fehlt. Bei einer offenen Entscheidung bearbeite die davon unabhängigen Punkte und benenne die konkrete Frage. Dokumentiere am Ende Dateien, Prüfkommando, tatsächliches Ergebnis und offene Punkte beim Paket. Übergebe anschließend an die unabhängige QA. Warte auf den nächsten Paketauftrag.

## Reihenfolge und Einstiegspunkte

| Erledigt | Paket aus der [Roadmap](roadmap.md) | Einstieg im Repository und Nachweis |
| --- | --- | --- |
| ☑ | P1 Trainingsbestand | src/components/Training.jsx, Plan.jsx, Library.jsx und SavedPlans.jsx im selben Ordner, shared/training-plan.mjs. Jeden vorhandenen Nutzerablauf aus P1 prüfen. Betroffene React- und Vertragstests aus tests/ ausführen. |
| ☑ | P2 Mobiler Ablauf | Training.jsx, Sitzungs- und Vereinswechsel in src/App.jsx sowie tests/local-drafts.test.mjs. Ergebnis der Wiederholungsversuche, Kontoabgrenzung und Zielbreiten beilegen. |
| ☑ | P3 Terminregeln | In Club.jsx und Onboarding.jsx die Mannschaftsauswahl und Annahme nachvollziehen. Die tatsächlichen Rollen aus worker/events.mjs und den Termin-Policies gegen T1/T2 prüfen. Insbesondere Trainer anderer Mannschaften desselben Vereins berücksichtigen. |
| ☑ | P4 Kalenderzugriff | tests/events.test.mjs und die über tests/database.test.mjs ausgeführten SQL-Fälle nutzen. Einladung mit Mannschaft, Kalenderzugriff, Fristen und wiederholte Rückmeldung aus Spielersicht prüfen. Nur belegte Lücken ändern. |
| ☑ | P5 Terminansicht | Navigation in src/App.jsx, bestehende Formulare und React-Tests als Muster. Als Trainer Spiel mit Datum, Uhrzeit und Ort anlegen und verschieben. Eine Mannschaftseinladung annehmen, vorhandenes Spiel öffnen und einen danach erstellten zweiten Termin ohne weitere Einladung sehen. Pro Termin getrennt zu- oder absagen. Als Trainer Rückmeldungen nach Reload prüfen. Fehler und Entfernen nach Rollenmatrix testen. |
| ☐ | P6 Training am Termin | Optional. Erst nach Produktfreigabe den derzeit fehlenden Bezug zwischen Termin und persönlicher Einheit bearbeiten. |
| ☐ | P7 Unabhängige Abnahme | npm test und npm run build unter Node 22, danach Trainerdurchlauf und Übergabe an einen frischen QA-Chat mit docs/pilot-qa.md. |

P1-Stand vom 22. November 2026: [QA-Abnahme](p1-qa-abnahme.md) · 93/93 Tests und Build erfolgreich · fünf Testlücken geschlossen · abgenommen.
P2-Stand vom 22. November 2026: [QA-Übergabe](p2-qa-uebergabe.md) · Unterbrechungsfälle lokal belegt · abgenommen mit offenem Kontrastbefund K1.
P3-Stand vom 22. November 2026: [Rollenabgleich](p3-rollenabgleich.md) · Ist-Rechte belegt · entschieden und umgesetzt: Trainer und Namenssicht nur eigene Mannschaft · 95/95 Tests.
P3-Nachtrag: Mannschaftsrolle `coach` als Zuordnung, Migration `20261122170000_team_coach_scope.sql`.
P4-Stand vom 22. November 2026: [QA-Übergabe](p4-qa-uebergabe.md) · Lücke bei wiederholter Termin-Neuanlage nachgewiesen und behoben · 97/97 Tests · abgenommen nach Korrektur.
P5-Stand vom 22. November 2026: [QA-Übergabe](p5-qa-uebergabe.md) · Löschen ohne Termin-ID und Antwortknöpfe für Trainer behoben · 105/105 Tests · abgenommen nach Korrektur.

**Abschluss je Paket:** Paket-ID · Git-Stand und betroffene Dateien · ausgeführte Schritte · Soll/Ist · offene Punkte · QA-Ergebnis. Produktionsänderungen, Commits und Deployments erfordern einen eigenen Auftrag.

**Entwicklungsziel für die Umsetzung**  
Lies zuerst das [Pilotdesign](pilot-design.md) und die Produktanforderungen. Bearbeite das beauftragte Paket anhand seiner Checkpunkte. Halte pro Punkt Änderung, geprüften Ablauf, Ergebnis und offene Voraussetzung fest. Übergib den Arbeitsstand mit Belegen an den unabhängigen QA-Chat.

- [ ] **D1 Zugang.** Separates Testprojekt und Testpostfach verifizieren. Registrierung bis Vereinseinrichtung, Session-Erneuerung, Reset und Einladung mit Testkonten durchspielen. Richtigen Verein belegen.
- [ ] **D2 Planung.** Rahmenbedingungen erfassen, Plan erzeugen und überarbeiten. Gemeinsamen Planvertrag prüfen. Fehler auslösen und Erhalt von Vorgaben und bisherigem Plan belegen.
- [ ] **D3 Unterbrechungen.** Entwurfsstrategie und Löschregeln festlegen. Während einer laufenden Generierung Hintergrundwechsel, Verbindungsabbruch und Reload prüfen. Eine Generierung je Auftrag sowie Entwurfsschutz bei Konten- und Vereinswechsel belegen.
- [ ] **D4 Speichern.** Speichern und nach erneuter Anmeldung inhaltsgleich öffnen. Persönliche Sichtbarkeit innerhalb und außerhalb des Vereins sowie Übernahme eines gültigen Altentwurfs prüfen.
- [ ] **D5 Bedienung.** Kernablauf bei allen vier Designbreiten prüfen. Zielgrößen, Formulare, Fokus, Kontrast, Tastatur und Zustände einschließlich Fehler und Erfolg dokumentieren.
- [ ] **D6 Trainingsqualität.** Fälle aus dem Design mit Trainern durchführen. Pro Fall Sollvorgaben, Summe der Blockzeiten, Spieleraufteilung, Text-Grafik-Abgleich, KI-Kennzeichnung und fachliches Urteil erfassen.
- [ ] **D7 Pilotentscheidung.** Nutzertest am Platz und betriebliche Punkte aus D7 einzeln belegen. Pilotentscheidung mit offenen Voraussetzungen vorlegen.
- [ ] **Übergabe.** Paket und Git-Stand einschließlich lokaler Änderungen benennen. Betroffene Tests ausführen. Ergebnisse, Restbefunde und erforderliche Testzugänge ohne Geheimnisse für [QA](pilot-qa.md) dokumentieren. Einen Punkt erst mit nachvollziehbarem Ergebnis abhaken.

- [ ] **Detailabnahme je Paket.** Aus dem Design ausschließlich die Kriterien des beauftragten Pakets anwenden. Für P1 Altersregeln, Spielform, Nettospielzeit, Intensität, Erholung und Lesbarkeit älterer Einheiten mit tests/age-rules.test.mjs und tests/training-plan.test.mjs prüfen. Fachliche Trainerurteile zu A–C für P7 einholen.

