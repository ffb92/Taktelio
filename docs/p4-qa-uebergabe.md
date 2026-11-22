# P4 · QA-Übergabe Kalenderzugriff

Stand: 22. November 2026 · Arbeitsrepo: `G:\Code\Taktelio` · Branch `feature/account-menu`

## Auftrag

Paket **P4 Kalenderzugriff** ([Roadmap](roadmap.md)) mit den Prüfungen aus [pilot-qa.md](pilot-qa.md):

> Eine erneut abgegebene Rückmeldung desselben Spielers aktualisiert dessen vorhandenen Eintrag. Frist, abgesagten Termin, zweite Mannschaft und wiederholten Speicherversuch des Trainers getrennt prüfen. Für Termin-Neuanlage ist Idempotenz gesondert nachzuweisen.

Abnahme: „Mannschaftsgrenzen, Rückmeldefrist, Absage eines Spiels und Rechte beim Löschen sind belegt. Eine zusätzliche Migration braucht eine nachgewiesene Schemalücke.“

## Prüfergebnis je Kriterium

| Kriterium | Ergebnis | Beleg |
| --- | --- | --- |
| Erneut abgegebene Rückmeldung aktualisiert den vorhandenen Eintrag | bestanden. Ein Spieler antwortet mehrfach; es bleibt genau eine Zeile, der letzte Stand gewinnt. | `tests/events.sql` (Abschnitt „Wiederholte Rückmeldung"), Primärschlüssel `event_id,user_id`, Upsert `on_conflict` |
| Keine Doppelzählung in der Übersicht | bestanden. Die Zusammenfassung zählt Antwortzeilen und die Mannschaftsliste getrennt; offene Antworten werden über eine Menge der antwortenden Personen bestimmt. | `worker/events.mjs` (`summary`), `tests/events.test.mjs` |
| Rückmeldefrist | bestanden. Server und Oberfläche schließen zum Fristzeitpunkt oder zu Beginn; Frist nach Beginn wird abgewiesen. | `worker/events.mjs` (409), `shared/events.mjs` (`validEventInput`), `tests/events.test.mjs`, `tests/events.sql` |
| Abgesagter Termin | bestanden. Absage beendet Rückmeldungen; Server antwortet 409, Oberfläche blendet die Antwortknöpfe aus. | `tests/events.sql`, `tests/events.test.mjs` |
| Zweite Mannschaft | bestanden. Seit P3 sieht und ändert ein Trainer nur seine Mannschaft; zwei Trainer desselben Vereins sind getrennt geprüft. | `tests/events.sql` (Mannschaftsgrenze), `tests/events.test.mjs` |
| Spieler sieht bestehende und später erstellte Termine | bestanden. Ein später angelegter Termin ist für die Mannschaft sichtbar; der Spieler antwortet darauf. | `tests/events.sql` („Offener Termin") |
| Einladung einmal annehmen | bestanden. Die zweite Annahme derselben Einladung liefert denselben Verein und legt kein Duplikat an. | `tests/club-invitations.sql:25` |
| Rechte beim Löschen | bestanden. Löschen dürfen Administratoren sowie der Ersteller, wenn er die Mannschaft betreut. | `event_delete`, `tests/events.sql` |
| **Wiederholter Speicherversuch des Trainers** | **fehlgeschlagen, behoben.** Zwei identische Neuanlagen erzeugten zwei Termine. | siehe unten |
| **Idempotenz der Termin-Neuanlage** | **nicht vorhanden gewesen, jetzt nachgewiesen.** | siehe unten |

## Nachgewiesene Schemalücke: doppelte Termin-Neuanlage

**Nachweis vor der Korrektur.** Zwei Aufrufe von `eventsApi` mit identischem Rumpf erzeugten zwei `INSERT`-Vorgänge:

```
status 200 200 inserts 2
Abschlusstraining @ 2099-12-01T18:00:00.000Z
Abschlusstraining @ 2099-12-01T18:00:00.000Z
```

**Auswirkung.** Antwortet der Server nach dem Schreiben nicht rechtzeitig, sieht der Trainer einen Fehler. Er speichert erneut, und es entstehen zwei Termine. Beide erscheinen in der Mannschaft und in der Anwesenheitsliste. Der Fall gilt besonders am Handy mit wackliger Verbindung.

**Korrektur.**

| Ebene | Änderung |
| --- | --- |
| Datenbank | `supabase/migrations/20261122180000_event_idempotency.sql`: Spalte `client_request_id uuid`, eindeutiger Teilindex je Verein. |
| Server | `worker/events.mjs`: Die Kennung wird geprüft; der Schreibvorgang nutzt `resolution=ignore-duplicates`. Bei leerer Antwort wird der bereits angelegte Termin über die Kennung gelesen und dieselbe ID zurückgegeben. |
| Oberfläche | `src/components/Events.jsx`: Das Formular erzeugt eine Kennung je Sitzung; ein Wiederholungsversuch nutzt dieselbe. |
| Neuinstallation | `scripts/database-schema.mjs` nimmt die Migration auf. |

**Nachweis nach der Korrektur.** Zwei Aufrufe mit derselben Kennung liefern dieselbe Termin-ID; in der Datenbank steht genau ein Termin bei zwei Schreibversuchen:

```
Antworten: {"event":{"id":"event-0"}} {"event":{"id":"event-0"}}
Termine in der Datenbank: 1 | Schreibversuche: 2
```

**Gegenprobe.** Wird die Kennung im Serveraufruf entfernt, schlägt der neue Test fehl (`a repeated create with the same request id returns the existing event instead of duplicating it`). Eine fehlerhafte Kennung wird mit 400 abgewiesen, bevor geschrieben wird.

**Grenze der Korrektur.** Ohne Kennung bleibt die Neuanlage nicht idempotent. Die App sendet sie immer; alte Clients und direkte API-Aufrufe ohne Kennung sind davon nicht geschützt. Das ist bewusst so, damit ein laufender Client nach dem Deploy weiter funktioniert.

## Umgebung und Kommandos

Windows 11, Node 22.23.5, npm 10.9.9.

| Befehl | Ergebnis |
| --- | --- |
| `npm test` | **97 von 97 bestanden** (93 vor P4, +4 neue Fälle) |
| `npm run build` | Exit 0 |
| `node --test tests/database.test.mjs` | 6 von 6 bestanden, inklusive `events.sql` und der neuen Migration |

## Was in dieser Umgebung nicht prüfbar war

| Punkt | Fehlender Zugang |
| --- | --- |
| Zwei echte Konten in zwei Mannschaften desselben Vereins im Browser | Testkonten und Gerät |
| Zeitüberschreitung nach dem Schreiben im echten Netz | Gedrosselte Verbindung oder Proxy auf echtem Gerät |
| Anzeige der „Frist abgelaufen“-Meldung in einem echten Browser | Gerät/Browser |

Diese Punkte stehen als offen und sind nicht als bestanden gewertet.

## Offene Beobachtung, keine Abweichung

Ein Trainer der Mannschaft kann einen Termin **ändern**, aber nur **löschen**, wenn er ihn selbst angelegt hat. Das entspricht der in [produktfragen.md](produktfragen.md) festgehaltenen bestehenden Regel („Ersteller sowie Vereinsadministratoren“) und ist nicht geändert. Soll ein Trainer auch Termine anderer Trainer seiner Mannschaft löschen dürfen, ist das eine Produktentscheidung.

## QA-Ergebnis

**Abgenommen nach Korrektur.** Alle Kriterien des Auftrags sind belegt. Der wiederholte Speicherversuch war die einzige Lücke; die Schemalücke dafür ist nachgewiesen und die Korrektur durch einen Test gesichert, der ohne die Korrektur fehlschlägt. Die drei Punkte mit echtem Netz und echten Konten bleiben als offen dokumentiert.
