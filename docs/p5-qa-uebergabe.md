# P5 · QA-Übergabe Termine im Browser

Stand: 22. November 2026 · Arbeitsrepo: `G:\Code\Taktelio` · Branch `feature/account-menu`

## Auftrag

Paket **P5 Termine im Browser** ([Roadmap](roadmap.md)):

> Über die bestehende Terminansicht Spiel mit Datum, Zeit und Ort anlegen, verschieben und absagen. Als Spieler per Mannschaftseinladung beitreten und auf zwei Spiele getrennt antworten. Nach Neuladen stimmen Ortszeit, Terminstatus und Antworten. Der Trainer erkennt ausstehende Antworten.

Zusätzlich aus [pilot-qa.md](pilot-qa.md): „Von einer leeren Liste aus Termin erstellen, Ort ändern, auf einen anderen Tag verschieben, neu laden und entfernen. Ortszeit und Sortierung vor und nach der Änderung vergleichen. Nach einem Fehler bleiben Eingaben korrigierbar.“

## Vorgehen

Neue Browsertests in `tests/events-browser.test.mjs` (8 Fälle) sprechen die echte Komponente `Events.jsx` in jsdom an. Der Stub-Server bildet die Termin-API nach. Jeder Fall wurde zusätzlich gegen absichtlich gebrochenen Code geprüft.

## Gefundene und behobene Fehler

| Nr. | Ablauf | Ist vor der Korrektur | Ursache | Korrektur | Beleg |
| --- | --- | --- | --- | --- | --- |
| P5-B1 | Termin öffnen → Löschen bestätigen | Löschen scheiterte immer mit „Ungültiger Termin." Der Termin blieb stehen. | `Events.jsx` ließ die Termin-ID im Anfragekörper weg (`action==='delete'?{ }:{id}`). Der Server braucht sie. | Die ID wird immer mitgesendet; nur `cancelled` bleibt auf die Absage beschränkt. | `tests/events-browser.test.mjs` (leere Liste → anlegen → ändern → neu laden → entfernen); Gegenprobe mit dem alten Code schlägt fehl. |
| P5-B2 | Trainer der Mannschaft öffnet einen Termin | Der Trainer sah „Deine Rückmeldung" mit Zusage/Absage, obwohl die Datenbank seit P3 nur Spieler antworten lässt. Ein Klick endete in einer Fehlermeldung. | Die Oberfläche prüfte nur, ob eine Mannschaftsrolle vorhanden ist, nicht welche. | Antwortknöpfe und Rückmeldebereich nur für `player`; Trainer sehen den Hinweis, dass sie die Antworten unten sehen. | `tests/events-browser.test.mjs` (Trainer ohne Antwortknöpfe), `tests/events.sql` (Trainer kann nicht als Spieler antworten). |

## Prüfergebnis je Kriterium

| Kriterium | Ergebnis | Beleg |
| --- | --- | --- |
| Von leerer Liste aus Termin anlegen | bestanden. Leerzustand erscheint, Anlegen füllt ihn. | `events-browser.test.mjs:1` |
| Spiel mit Datum, Uhrzeit und Ort | bestanden. Art „Spiel", Beginn und Ort landen im Anfragekörper. | dito |
| Ort ändern | bestanden. Die Änderung ist nach dem Speichern im Zustand und nach Neuladen sichtbar. | dito |
| Auf einen anderen Tag verschieben | bestanden. Der neue Beginn wird als ISO-Wert gesendet; die Sortierung folgt. | dito, `:3` |
| Ortszeit vor und nach Änderung | bestanden. Eingabe und Anzeige nutzen dieselbe lokale Zeitzone; nach Neuladen stimmt die Uhrzeit. | dito |
| Sortierung vor und nach Änderung | bestanden. Ein späterer Termin rückt nach dem Verschieben vor den früheren. | `:3` |
| Neuladen | bestanden. Komponenten-Neustart zeigt Inhalt, Ort und Absage erneut. | `:1`, `:8` |
| Entfernen | bestanden (nach Korrektur B1). Leerer Zustand kehrt zurück. | `:1` |
| Nach Fehler bleiben Eingaben korrigierbar | bestanden. Dialog bleibt offen, Titel und Ort bleiben erhalten; die Wiederholung nutzt dieselbe Kennung. | `:2` |
| Absagen | bestanden. Status wird gespeichert, bleibt nach Neuladen sichtbar, Antworten sind gesperrt. | `:8`, `:5` |
| Spieler antwortet auf zwei Spiele getrennt | bestanden. Zwei getrennte Rückmeldungen mit der jeweiligen Termin-ID. | `:4` |
| Trainer erkennt ausstehende Antworten | bestanden. Zusammenfassung „… offen" und je Person „Offen", nach Neuladen unverändert. | `:6` |
| Trainer bekommt keine Antwortknöpfe | bestanden (nach Korrektur B2). | `:7` |
| Beitritt per Mannschaftseinladung | bestanden auf Datenbankebene: Annahme ordnet Verein und Mannschaft zu, Wiederholung bleibt idempotent. Browserseitig nicht neu geprüft. | `tests/club-invitations.sql`, `tests/events.sql` |

## Umgebung und Kommandos

Windows 11, Node 22.23.5, npm 10.9.9.

| Befehl | Ergebnis |
| --- | --- |
| `npm test` | **105 von 105 bestanden** (97 vor P5, +8 neue Fälle) |
| `npm run build` | Exit 0 |
| `node --test tests/database.test.mjs` | 6 von 6 bestanden |

## Was hier nicht prüfbar war

| Punkt | Fehlender Zugang |
| --- | --- |
| Echter Browser und echte Geräte, echte Bildschirmtastatur | Gerät |
| Zeitzonenwechsel (Gerät in anderer Zone) | Gerät mit umgestellter Zone |
| Langsame Verbindung und Zeitüberschreitung beim Speichern | Gedrosseltes Netz |
| Mannschaftseinladung im Browser mit einem neuen Spielerkonto | Testpostfach und Testkonto |

Diese Punkte sind offen und nicht als bestanden gewertet.

## Offene Beobachtung

Ein Trainer sieht in der Liste die Antwortzahlen aller Termine seiner Mannschaft, aber nur die Mannschaften, die er betreut. Das entspricht der P3-Entscheidung. Für Termine aus einer Zeit vor der Zuordnung kann ein Trainer keine Antworten mehr sehen, bis er zugeordnet ist.

## QA-Ergebnis

**Abgenommen nach Korrektur.** Zwei Fehler waren reproduzierbar und sind behoben: Löschen ohne Termin-ID und Antwortknöpfe für Trainer. Beide Korrekturen sind durch Tests gesichert, die ohne die Korrektur fehlschlagen. Acht UI-Fälle und die zugehörigen SQL-Fälle sind grün.
