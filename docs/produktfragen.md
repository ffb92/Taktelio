# Produkt-Q&A für die Umsetzung

Bestandsabgleich im Arbeitsrepo: Es gibt eigenständige Mannschafts- und Terminfunktionen. Die Oberfläche unterstützt Zusage, Absage und Vielleicht sowie eine Rückmeldefrist. Bestehendes Verhalten beim Abgleich mit den Pilotanforderungen berücksichtigen.

| Frage | Antwort und Auswirkung |
| --- | --- |
| Wer testet? | Trainer aus dem eigenen Verein. Die Fälle U11 und U15 im Pilotdesign sind Testbeispiele. Die tatsächlichen Altersgruppen der Tester sind offen. |
| Was gehört zum ersten nutzbaren Stand? | Training und Termine sollen im Browser funktionieren. Die spätere Präzisierung bezieht beide in den Pilot ein. |
| Was finden Trainer am Weblink? | Die vorhandene Taktelio-App. Roadmap, Checkliste und QA-Auftrag werden im Projekt geführt. |
| Was wird technisch vorausgesetzt? | Bestehendes React/Vite-Projekt, Vereinsanmeldung und persönliche Trainingspläne. Vercel und Resend sind vom Betreiber bestätigt. Siehe [Einrichtungsstand](domain-and-email-setup.md). |
| Sind Social Media und Scouting Entwicklungsaufträge? | Für diese Phase sind Vorschläge in der Roadmap gewünscht. Eine spätere Beauftragung legt Funktionen fest. |
| Muss die App vollständig offline laufen? | Offen. Geplant sind Schutz vor Verlust und doppelter Generierung bei kurzen Unterbrechungen. Dauerhaftes Offline-Lesen ist eine gesonderte Produktentscheidung. |

## Entscheidungen für Termine

| ID | Antwort des Vereins | Konsequenz |
| --- | --- | --- |
| T1 | Trainer der Mannschaft erstellen ihren Kalender und ihre Termine. Spieler erhalten einmal eine Einladung zur Mannschaft. Nach Annahme sehen sie alle bestehenden und künftigen Mannschaftstermine und können je Termin zu- oder absagen. | Mannschaftszugehörigkeit und Einladung müssen verlässlich prüfbar sein. Die vorhandene Vereinsmitgliedschaft und das Freitextfeld im Profil reichen dafür allein nicht aus. |
| T2 | Vorbild für den Ablauf ist SpielerPlus. Für ein Spiel werden Datum, Uhrzeit und Ort erfasst. Eingeladene Spieler sagen zu oder ab. | Mannschaftskalender, Spieltermin und persönliche Rückmeldung gehören in den Pilot. „Noch offen“ bezeichnet eine ausstehende Antwort. Weitere Funktionen des Vorbilds sind kein Auftrag. |

### Entscheidungen für das nächste Gespräch

1. **Beitritt.** Club.jsx erzeugt einen adressierten Einladungslink mit Spielerrolle und Mannschaft. Die SQL-Tests prüfen die Annahme mit Zuordnung. Im Browser den Ablauf für ein neu registriertes sowie ein bestehendes Konto prüfen. Für Minderjährige die Vertretung durch Erziehungsberechtigte klären.
2. **Rückmeldungen.** Der bestehende Ablauf erlaubt Zusage, Absage und Vielleicht bis zur eingestellten Frist bzw. zum Beginn. Welche namentlichen Antworten Mitspieler sehen sollen, ist eine Produktfrage. Vor einer Änderung die aktuelle Sichtbarkeit mit getrennten Testkonten belegen.
3. **Trainerrechte.** Die bestehenden Verwaltungsregeln orientieren sich auch an der Vereinsrolle. Soll ein Trainer ausschließlich die eigene Mannschaft verwalten dürfen? Entfernung eines Termins ist im API-Handler dem Ersteller sowie Vereinsadministratoren vorbehalten. Eine abweichende Vorgabe erfordert eine Entscheidung.
4. **Termintypen.** Training, Spiel und sonstiger Termin sind im Datenvertrag vorhanden. Der Ort ist optional. Soll er bei Spielen verpflichtend sein? Ein persönlicher Planbezug ist ein Vorschlag. Wiederholungen und Erinnerungen bleiben offen.

P1/P2 können unabhängig starten. Für die Kalenderumsetzung zuerst die offenen Rechte und Einladungsregeln in P3 entscheiden. Für Minderjährige im Verein klären, ob Spieler selbst oder Erziehungsberechtigte antworten sollen.
