# Taktelio vom heutigen Stand bis zum Vereinspilot

Gültiger Projektordner: G:\Code\Taktelio. P3–P5 beschreiben Abnahmeziele für die vorhandenen Mannschafts- und Terminfunktionen. Ausgangspunkte sind TeamsPage.jsx, Teams.jsx, Events.jsx, die Servermodule teams.mjs und events.mjs sowie die vorhandenen Terminmigrationen und Tests. Insbesondere den vollständigen Weg von der Mannschaftseinladung bis zur Terminansicht prüfen.

**Pilotziel.** Ein Trainer aus dem eigenen Verein bereitet auf dem Handy ein Training vor, passt es an, speichert es und findet es zum geplanten Termin am Platz wieder. Der bekannte Weblink öffnet die App. Vercel und Resend sind eingerichtet und laut Betreiber funktionsfähig. Die Entwicklungsunterlagen liegen im Repository.

| Paket | Voraussetzung | Auftrag | Abnahme |
| --- | --- | --- | --- |
| P1 · Trainingsbestand | Sofort startbar | Vorhandene Abläufe anhand von D1, D2 und D4 aus dem [Design](pilot-design.md) prüfen. Je Abweichung einen reproduzierbaren Fehler festhalten und gezielt beheben. Bibliothek, drei Planungsmodi, Speichern, Wiederöffnen, Löschen und Drucken berücksichtigen. | Vom Login über Erzeugung, Änderung und Rückkehr zur Vorversion bis zur wieder geöffneten Einheit ist jeder Schritt mit Ergebnis belegt. |
| P2 · Verlässlichkeit am Handy | Vorhandenen Ablauf aus P1 kennen | D3 und D5 abarbeiten. Eingaben und alten Plan nach Fehler erhalten, dieselbe ausstehende Anfrage nach Unterbrechung fortsetzen. Entwurfsstrategie und Löschverhalten dokumentieren. | Unterbrechung und alle vier Zielbreiten geprüft. Beim Vereins- oder Kontowechsel erscheint kein fremder Entwurf. |
| P3 · Rollenabgleich | [Produkt-Q&A](produktfragen.md) | Bestehende Vereinsrollen, Mannschaftszuordnung und Einladungsannahme mit dem gewünschten Pilot vergleichen. Besonders prüfen, welche Termine ein Trainer einer anderen Mannschaft desselben Vereins verwalten darf. | Ist- und Sollrechte je Rolle sind festgehalten. Abweichende Produktentscheidungen sind vor Änderungen geklärt. |
| P4 · Kalenderzugriff | P3 geklärt | Vorhandene Termin-API und Datenbankregeln mit zwei Mannschaften prüfen. Einladung einmal annehmen, bestehenden und später erstellten Termin lesen, eine Antwort je Spieler ändern. | Mannschaftsgrenzen, Rückmeldefrist, Absage eines Spiels und Rechte beim Löschen sind belegt. Eine zusätzliche Migration braucht eine nachgewiesene Schemalücke. |
| P5 · Termine im Browser | Regeln aus P3 | Über die bestehende Terminansicht Spiel mit Datum, Zeit und Ort anlegen, verschieben und absagen. Als Spieler per Mannschaftseinladung beitreten und auf zwei Spiele getrennt antworten. | Nach Neuladen stimmen Ortszeit, Terminstatus und Antworten. Der Trainer erkennt ausstehende Antworten. |
| P6 · Optionaler Planbezug | Produktentscheidung erforderlich | Im aktuellen Terminvertrag fehlt eine Referenz auf eine gespeicherte Einheit. Erst bei Freigabe die persönliche Verknüpfung für Trainer ergänzen. | Eigener Plan ist vom Termin aus erreichbar, für Mitspieler bleibt er privat. Der Termin überlebt das Löschen des Plans. |
| P7 · Vereinsabnahme | P1–P5, P6 bei Freigabe | Trainer und Spieler durchlaufen die Einladung, Spielansetzung und Rückmeldung. Trainer beurteilen A–C und nutzen eine Einheit am Platz. | [QA-Protokoll](pilot-qa.md) mit Testergebnissen, Praxisbefunden und Pilotentscheidung. |

Die Paketnummern dieser Roadmap geben die Arbeitsreihenfolge an. PROJEKT.md verwendet P0/P1/P2 als Prioritätsstufen. Zum Trainingsumfang von P1 gehören Altersregeln, Nettospielzeit, Belastung/Erholung und Lesbarkeit älterer Pläne. Lernziele mit Erfolgskriterium, Progression, Torwartrolle und Zeitpuffer aus PROJEKT.md als eigene Befunde verfolgen. Die [historische QA](pilot-qa-ergebnis.md) bezieht sich auf eine andere Arbeitskopie.

## Nach dem Pilot

**Nominierung.** Trainer könnten einzelne Spieler pro Spiel auf „nicht nominiert“ setzen. Wie sich das auf Sichtbarkeit und Rückmeldungen auswirkt, wird bei Beauftragung entschieden.

**Social Media.** Als ersten Versuch einen Spieltagsbeitrag vorschlagen lassen. Ein Trainer wählt Anlass und freigegebene Vereinsangaben, prüft eine Textvorschau und kopiert sie. Feedbackfrage für den Verein: Spart das bei Spielankündigung, Ergebnis oder Trainingsrückblick am meisten Zeit? Erst danach über Bildvorlagen, Freigaberollen und Veröffentlichung entscheiden.

**Scouting.** Mit Trainern zunächst an einem fiktiven Spiel klären, welche Beobachtung sie später wiederfinden müssen. Ein möglicher erster Prototyp ist eine Spielbeobachtung mit Datum, Gegner und Freitext zum Mannschaftsverhalten. Vor personenbezogenen Berichten Zweck, Zugriff und Aufbewahrung klären.

