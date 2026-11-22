# Design für den mobilen Trainingspilot

Dieses Design beschreibt den gewünschten Pilotablauf im Arbeitsrepo G:\Code\Taktelio. Dort bestehen bereits Mannschaftsverwaltung, Terminoberfläche und Rückmeldungen. Die Abnahme prüft das tatsächliche Zusammenspiel.

Die Trainingsanforderungen stehen in [PROJEKT.md](../PROJEKT.md). Für Termine gelten die später beschlossenen Anforderungen im [Produkt-Q&A](produktfragen.md).

| ID | Entscheidung und beobachtbares Ergebnis |
| --- | --- |
| D1 · Zugang | Ein Trainer bestätigt seine Registrierung, meldet sich an, erneuert die Sitzung und setzt das Passwort zurück. Vereinseinrichtung und Einladungsannahme führen in den richtigen Verein. Für diesen Nachweis werden getrennte Testkonten, Testmail und ein ausdrücklich konfiguriertes Testprojekt benötigt. |
| D2 · Planung | In Training.jsx erfasst der Trainer Alter, Schwerpunkt, Zeit, Teilnehmende, Platz und Material. Generierung und Änderungswunsch verwenden den gemeinsamen Vertrag aus shared/training-plan.mjs. Eingaben und letzter gültiger Plan bleiben bei einem Fehler erhalten. |
| D3 · Unterbrechung | Training.jsx hält die Anfragekennung derzeit in einem React-Ref. Für dasselbe laufende Vorhaben Kennung und Zahl der Generierungen bei Tabwechsel, Netzunterbrechung und Neuladen separat prüfen. Reload-sichere Wiederholung und Schutz des letzten Entwurfs sind Pilotziele. Wiederherstellung auf Nutzer und Verein begrenzen. |
| D4 · Speichern | Der Trainer speichert den Plan und öffnet ihn nach erneuter Anmeldung mit denselben Inhalten. Ein zweites Konto im selben Verein und ein Konto in einem anderen Verein dürfen den persönlichen Plan nicht lesen. Bestehende gültige lokale Entwürfe bleiben nutzbar. |
| D5 · Bedienung | Trainingsformular, Planübersicht, Blöcke und gespeicherte Einheiten funktionieren bei 360, 390, 768 und 1280 Pixel Breite. Hauptaktionen bleiben erreichbar, häufige Aktionen haben mindestens 44 × 44 Pixel. Fokus, Beschriftungen, Kontrast, Bildschirmtastatur sowie Lade-, Leer-, Fehler- und Erfolgszustände prüfen. |
| D6 · Inhalt | KI-Entwurf kennzeichnen. Trainer beurteilen typische Fälle mit unterschiedlichen Altersgruppen, wenig Material, ungerader Spielerzahl, engem Platz und Änderungswunsch. Dauer, Einbindung aller Spieler, Umsetzbarkeit und Übereinstimmung von Text und Grafik sind pro Fall zu belegen. |
| D7 · Pilotentscheidung | P0-Nachweise und mobiler Kernablauf sind Voraussetzung. Nutzertest am Platz, Budget, Mail und Redirects, Rechte, Datensicherung und Wiederherstellung, Support und Nutzerinformationen aus PROJEKT.md erhalten jeweils einen Nachweis oder einen offenen Befund. Pilotentscheidung dokumentieren. |

Die Paketfolge P1–P7 steht in der [Roadmap](roadmap.md). Altersregeln in shared/age-rules.mjs sowie Nettospielzeit, Intensität und Erholung bei neuen Einheiten sind Teil des Bestands. Für A–C zusätzlich Lernziel, überprüfbares Erfolgskriterium, methodische Progression, Torwartrolle soweit relevant sowie Umbauzeiten und Puffer fachlich beurteilen. Ältere Einheiten müssen weiterhin lesbar sein.

## Verbindliche Abnahmekriterien aus der Planungs-QA

- D2. Nach erfolgreicher Überarbeitung die Vorversion wiederherstellen und alle Blöcke vergleichen. Restkontingent nach erfolgreicher Anfrage mit dem Serverwert vergleichen.
- D3. Zusätzlich den Tab während der Generierung wechseln. Ohne Netz muss die Anzeige erklären, welche vorhandenen Inhalte zugänglich sind und dass neue Generierungen Verbindung benötigen.
- D5. Vom Einstieg aus „Training erstellen“ und gespeicherte Einheiten direkt erreichen. Pflichtangaben und optionale Wünsche sind unterscheidbar. Übersicht auf Schwerpunkt, Altersgruppe, Dauer, Teilnehmerzahl und Material prüfen.
- D6. Für den Pilot gelten zunächst die folgenden festen Testeingaben. Pro Block müssen alle angegebenen Spieler zugeteilt sein. Der Trainer prüft Schwerpunkt, Materialgrenze, Fläche und Grafik. Das Formular weist darauf hin, Spielernamen und Gesundheitsdaten auszulassen.

| Fall | Vorgaben | Messbares Soll |
| --- | --- | --- |
| A | U11, 9 Spieler, 45 Minuten, 20 × 15 m, 3 Bälle, Dribbling | Blockzeiten ergeben 45 Minuten, alle 9 je Block beteiligt, Aufbau mit 3 Bällen umsetzbar |
| B | U15, 14 Spieler, 60 Minuten, 30 × 20 m, 7 Bälle und 8 Hütchen, Passspiel | 60 Minuten, 14 je Block, Material und Fläche eingehalten |
| C | Fall B überarbeiten mit „nur noch 5 Bälle“ | Weiterhin 60 Minuten und 14 je Block, höchstens 5 Bälle, Vorversion abrufbar |

- D7. Testfehler auslösen und Servermeldungen auf Passwörter, Tokens und unnötige Trainingsinhalte prüfen. Für Kontolöschung zuständige Stelle, Ablauf und auffindbare Nutzerinformation dokumentieren.

## Mannschaftskalender im Vereinspilot

Neben Training gehört der Mannschaftskalender zum Pilot. Trainer der Mannschaft erstellen Spieltermine mit Datum, Uhrzeit und Ort. Nach einmaliger Annahme der Mannschaftseinladung sehen Spieler alle bestehenden und künftig angelegten Termine dieser Mannschaft und können zu- oder absagen. Die Rückmeldung gehört eindeutig zu Spieler und Termin. Eine fehlende Rückmeldung bleibt als ausstehend erkennbar. Die Vereinszugehörigkeit allein gewährt keinen Zugriff auf alle Mannschaftskalender. Einladungsweg, Rollen und Detailentscheidungen sind im [Produkt-Q&A](produktfragen.md) festgehalten. Die [Roadmap](roadmap.md) verbindet diese Anforderungen mit Umsetzung und unabhängiger Abnahme.
