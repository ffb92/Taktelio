# P6 · QA-Übergabe Persönlicher Planbezug

Stand: 22. November 2026 · Arbeitsrepo: `G:\Code\Taktelio` · Branch `feature/account-menu`

## Produktfreigabe

Der Verein hat am 22. November 2026 entschieden, den Planbezug umzusetzen: Ein Trainer verknüpft einen Termin mit einer eigenen gespeicherten Einheit und öffnet sie von dort.

**Abgegrenzt:** „Ein Training einem Spieler zuweisen" ist **nicht** Teil von P6. Der Plan bleibt persönlich; Mitspieler sehen weder die Verknüpfung noch den Inhalt. Geteilte oder zugewiesene Pläne wären eine eigene Funktion mit eigener Datenschutzentscheidung und sind hier nicht umgesetzt.

## Auftrag

Paket **P6 Optionaler Planbezug** ([Roadmap](roadmap.md)):

> Im aktuellen Terminvertrag fehlt eine Referenz auf eine gespeicherte Einheit. Erst bei Freigabe die persönliche Verknüpfung für Trainer ergänzen.

Abnahme: „Eigener Plan ist vom Termin aus erreichbar, für Mitspieler bleibt er privat. Der Termin überlebt das Löschen des Plans."

## Umsetzung

| Ebene | Änderung |
| --- | --- |
| Datenbank | `supabase/migrations/20261122190000_event_training_plan.sql`: Spalte `training_plan_id` mit `on delete set null`; Prüftrigger `event_plan_ownership`, der Eigentümer und Verein selbst erzwingt; Index für die Rückbeziehung. |
| Server | `worker/events.mjs`: `trainingPlanId` wird geprüft (Eigentum, Verein, Format); `training_plan_id` wird beim Anlegen und Ändern gesetzt; die Terminliste liefert `myTrainingPlan` nur, wenn der Plan dem Aufrufer gehört. |
| Oberfläche | `Events.jsx`: Auswahl „Eigene Einheit" im Terminformular, Anzeige „Deine Einheit" mit „Plan öffnen" in der Detailansicht. |
| Navigation | `App.jsx` gibt die Absicht an die Trainingsansicht weiter; `Training.jsx` lädt die Einheit aus der eigenen Liste oder meldet, dass sie nicht mehr vorhanden ist. |
| Neuinstallation | `scripts/database-schema.mjs` nimmt die Migration auf. |

## Prüfergebnis je Kriterium

| Kriterium | Ergebnis | Beleg |
| --- | --- | --- |
| Eigener Plan ist vom Termin aus erreichbar | bestanden. Einheit wählen, speichern, im Termin öffnen; der Planer zeigt die Einheit mit Minuten und Blöcken. | `tests/events-browser.test.mjs` (P6-Fälle), `tests/mobile-reliability.test.mjs` |
| Für Mitspieler bleibt der Plan privat | bestanden. Der Spieler sieht im Termin weder „Deine Einheit" noch Titel oder Knopf; die API liefert `myTrainingPlan` nur an den Eigentümer. | `tests/events-browser.test.mjs`, `tests/events.test.mjs` (Liste zeigt Plan nur dem Eigentümer) |
| Ein anderer Trainer desselben Vereins sieht ihn nicht | bestanden. Die Sichtbarkeitsabfrage folgt den Planregeln; die Datenbank lehnt eine fremde Verknüpfung ab. | `tests/events.sql` („foreign plan linked"), Trigger-Gegenprobe |
| Der Termin überlebt das Löschen des Plans | bestanden. Fremdschlüssel `on delete set null`; zwei verknüpfte Termine bleiben nach dem Löschen mit leerem Bezug bestehen. | `tests/events.sql` |
| Eine Einheit an mehreren Terminen | bestanden. Bewusst erlaubt; Löschen leert alle Bezüge. | `tests/events.sql` |
| Gelöschte Einheit während des Öffnens | bestanden. Die Trainingsansicht meldet „Diese Einheit ist nicht mehr vorhanden." statt abzustürzen. | `tests/mobile-reliability.test.mjs` |
| Planbezug entfernen | bestanden. Leere Auswahl entfernt den Bezug gezielt; ein Client ohne das Feld lässt ihn unverändert. | `tests/events.test.mjs` |
| Spieler kann keinen Bezug setzen | bestanden. Terminänderungen sind Spielern verwehrt; die Prüfung greift zusätzlich nur für den Eigentümer. | `event_update`-Policy, `tests/events.sql` |

## Umgebung und Kommandos

Windows 11, Node 22.23.5, npm 10.9.9.

| Befehl | Ergebnis |
| --- | --- |
| `npm test` | **113 von 113 bestanden** (105 vor P6, +8 neue Fälle) |
| `npm run build` | Exit 0 |
| `node --test tests/database.test.mjs` | 6 von 6 bestanden |

**Gegenproben:** Wird der Eigentums-Trigger abgeschaltet, meldet `events.sql` „TEST: foreign plan linked". Wird die Kennungsprüfung im Server umgangen, lehnt die Datenbank ab.

## Was hier nicht prüfbar war

| Punkt | Fehlender Zugang |
| --- | --- |
| Zwei echte Konten, Plan öffnen am Handy | Testkonten und Gerät |
| Gleichzeitiges Löschen des Plans in einer zweiten Sitzung | Zwei echte Sitzungen |
| Druck/PDF der aus dem Termin geöffneten Einheit | Gerät |

Offen, nicht als bestanden gewertet.

## Abgegrenzung (entschieden)

Der Verein hat am 22. November 2026 bestätigt: Die Einheit wird **dem Termin** zugewiesen, nicht einzelnen Spielern. Eine Freigabe an Mitspieler ist kein Auftrag.

Damit gilt:

- Der Plan bleibt persönlich; nur der Trainer, der ihn verknüpft hat, sieht ihn am Termin.
- Mitspieler sehen den Termin wie bisher, ohne Planinhalt oder Hinweis auf einen Plan.
- Eine spätere Freigabe an die Mannschaft wäre eine neue Funktion mit eigener Entscheidung zu Sichtbarkeit und Minderjährigen. Sie ist nicht vorbereitet und nicht nötig.

## QA-Ergebnis

**Abgenommen.** Alle Kriterien der Roadmap sind belegt; die Privatsphäre ist durch Datenbank, API und Oberfläche dreifach abgesichert und durch Gegenproben geprüft. Die Zuweisung gilt dem Termin; eine Zuweisung an einzelne Spieler ist ausdrücklich nicht Teil des Auftrags.
