# Unabhängige QA für den Trainingspilot

QA im Arbeitsrepo G:\Code\Taktelio durchführen. tests/events.test.mjs und tests/events.sql als vorhandene Nachweise einbeziehen. Der frühere QA-Bericht stammt aus einer anderen Arbeitskopie.

**Ziel für einen neuen Chat**  
Prüfe den übergebenen Arbeitsstand unabhängig anhand des [Designs](pilot-design.md), der [Entwicklungscheckliste](entwicklungsplan-entwurf.md) und von [PROJEKT.md](../PROJEKT.md). Ermittle zuerst, welche Arbeitspakete tatsächlich übergeben wurden. Prüfe deren Vollständigkeit und führe die zugehörigen Prüfungen selbst durch. Dokumentiere Stand, Umgebung, Soll, Ist, Beleg und Befund je Design-ID. Benenne offene Voraussetzungen und entscheide getrennt über die Abnahme des Arbeitspakets und die Pilotreife.

## Prüfablauf

1. Git-Stand einschließlich lokaler Änderungen erfassen. Für eine reine Planungsübergabe jede Design-ID auf Produktanforderung, Entwicklungsaufgabe und prüfbares Ergebnis zurückverfolgen. Jede Abweichung mit Fundstelle belegen.
2. Technische Basis im Projektverzeichnis mit Node 22 prüfen. Version, Ergebnis von `npm test` und `npm run build` dokumentieren. Die isolierten SQL-Tests sind im Gesamtlauf enthalten.
3. Für implementierte Pakete die folgenden Szenarien ausführen. Als Status sind bestanden, fehlgeschlagen, blockiert und ausstehend vorgesehen. Fehlende Testdienste, Konten oder Trainer konkret benennen. Historische Testergebnisse und Entwickler-Häkchen ersetzen keine eigene Beobachtung.

| ID | Unabhängige Prüfung und Beleg |
| --- | --- |
| D1 | In einer verifizierten separaten Umgebung Registrierung, Bestätigung, Login, Erneuerung, Reset und Einladung durchführen. Konto, Vereinsrolle und Zielverein mit anonymen Testkennungen protokollieren. |
| D2 | Plan erzeugen, ändern und einen Fehler simulieren. Eingaben und letzten gültigen Plan vor und nach dem Fehler vergleichen. |
| D3 | Hintergrundwechsel, Reload und Verbindungsabbruch während einer Anfrage getrennt prüfen. Anfragekennung und Zahl der Generierungen vergleichen. Entwurfsschutz sowie Sichtbarkeit nach Konto- und Vereinswechsel kontrollieren. |
| D4 | Speichern, abmelden, erneut öffnen und Inhalte vergleichen. Zugriff mit zwei weiteren Testkonten gemäß Design prüfen. Gültigen Altentwurf öffnen. |
| D5 | Vier Zielbreiten durchgehen. Überlauf, Erreichbarkeit und Zielgrößen messen. Tastatur, Fokus, Kontrast, Formularzustände und echte Bildschirmtastatur am Handy prüfen. |
| D6 | Fälle A–C mit Trainern beurteilen. Altersregeln, Nettospielzeit und Erholung gemäß shared/age-rules.mjs sowie Lernziel, Progression, Torwartrolle und Zeitbudget überprüfen. Technische Prüfung und fachliches Urteil getrennt dokumentieren. |
| D7 | Beobachtungen aus dem Platztest und Betriebsnachweise je Punkt erfassen. Offene P0-Nachweise oder ein ungeprüfter mobiler Kernablauf verhindern eine positive Pilotentscheidung. |

## Ergebnisformat

### Erweiterung für den Vereinspilot mit Terminen

Im unabhängigen Chat zuerst die übergebene Paket-ID aus der [Roadmap](roadmap.md) und die beschlossenen Antworten T1/T2 im [Produkt-Q&A](produktfragen.md) lesen. Ergebnisse des früheren Trainingsberichts beziehen sich auf dessen damaligen Umfang.

| Prüfung | Erwartung und Nachweis |
| --- | --- |
| P3 Entscheidungsstand | Ersteller, zweiter Trainer derselben Mannschaft, Trainer einer anderen Mannschaft desselben Vereins, Spieler und fremder Verein getrennt prüfen. Vereinsweite Trainerrechte im Bestand mit dem beschlossenen Umfang vergleichen. |
| P4 Datenzugriff | Eine erneut abgegebene Rückmeldung desselben Spielers aktualisiert dessen vorhandenen Eintrag. Frist, abgesagten Termin, zweite Mannschaft und wiederholten Speicherversuch des Trainers getrennt prüfen. Für Termin-Neuanlage ist Idempotenz gesondert nachzuweisen. |
| P5 Mobile Nutzung | Von einer leeren Liste aus Termin erstellen, Ort ändern, auf einen anderen Tag verschieben, neu laden und entfernen. Ortszeit und Sortierung vor und nach der Änderung vergleichen. Nach einem Fehler bleiben Eingaben korrigierbar. |
| P6 Persönliche Einheit | Nur bei beauftragtem Planbezug prüfen. Dann Zugriff als Trainer und Spieler, Öffnen des eigenen Plans und Verhalten nach Löschen der Einheit belegen. |
| P7 Praxistest | Trainer findet die gespeicherte Einheit am Handy und ein Spieler öffnet nach dem Beitritt ein bestehendes sowie ein neues Spiel. Nur bei freigegebenem P6 gehört das Öffnen der Einheit direkt aus dem Termin zur Abnahme. |

Pro Prüfung eine Zeile mit ID, Stand, Umgebung, Soll, Ist, Status und reproduzierbarem Beleg. Bei einem Fehler Schritte, betroffenen Ablauf und Auswirkung ergänzen. Nach einer Korrektur im Entwicklungsauftrag prüft QA den betroffenen Ablauf erneut. Keine Zugangsdaten oder persönlichen Trainingsdaten ins Protokoll übernehmen.

Zum Nachtest für D2, D3, D5, D6 und D7 alle Schritte im Abschnitt „Verbindliche Abnahmekriterien aus der Planungs-QA“ des Designs unabhängig wiederholen. Für die drei festen Fälle die angegebenen Sollwerte verwenden und jeden Fall einzeln protokollieren.

**Pflichtfall Mannschaftsspiel (P3–P7).** Trainer A legt für seine Mannschaft ein Spiel mit Datum, Uhrzeit und Ort an. Drei Testspieler nehmen jeweils einmal ihre Mannschaftseinladung an und sehen das bestehende Spiel. Trainer A legt danach einen zweiten Termin an. Alle drei sehen ihn ohne weitere Einladung. Beim ersten Spiel sagt einer zu, einer ab und der dritte lässt seine Rückmeldung offen. Für den zweiten Termin bleiben alle Antworten ausstehend. Nach Neuladen muss der Trainer die drei Zustände richtig zuordnen können. Die wiederholte Abgabe derselben Antwort darf niemanden doppelt zählen. Ein Spieler darf weder einen Termin bearbeiten noch für einen anderen Spieler antworten. Ein unbeteiligter Spieler einer anderen Mannschaft desselben Vereins und ein fremder Verein erhalten keinen Zugriff. Widerruf, Antwortänderung und Sichtbarkeit anderer Antworten nach den in P3 beschlossenen Regeln prüfen. Persönliche Trainingspläne bleiben beim Trainer.
