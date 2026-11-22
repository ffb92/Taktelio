# P3 · Rollenabgleich

Stand: 22. November 2026 · Arbeitsrepo: `G:\Code\Taktelio` · Branch `feature/account-menu`

## Auftrag

Paket **P3 Rollenabgleich** aus der [Roadmap](roadmap.md): „Bestehende Vereinsrollen, Mannschaftszuordnung und Einladungsannahme mit dem gewünschten Pilot vergleichen. Besonders prüfen, welche Termine ein Trainer einer anderen Mannschaft desselben Vereins verwalten darf.“

Abnahme: „Ist- und Sollrechte je Rolle sind festgehalten. Abweichende Produktentscheidungen sind vor Änderungen geklärt.“

**Es wurde kein Code geändert.** Dieses Paket besteht aus dem Ist-Stand, dem Soll und den zu klärenden Entscheidungen.

## Ausgewertete Quellen

| Quelle | Rolle |
| --- | --- |
| `supabase/migrations/20261115130000_teams_events_attendance.sql` | Rollen, Tabellen, Policies (RLS) |
| `supabase/migrations/20261115150000_event_write_privileges.sql` | Nachtrag zu Spaltenrechten |
| `worker/events.mjs`, `worker/teams.mjs` | API-Prüfungen |
| `worker/storage.mjs:6` (`cloudContext`) | Vereinsrollen-Prüfung je Anfrage |
| `src/components/Club.jsx`, `Teams.jsx`, `TeamsPage.jsx`, `Events.jsx`, `App.jsx` | Oberflächenrechte |
| `docs/produktfragen.md` T1, T2, offene Fragen 1–4 | Soll |
| `docs/pilot-design.md` Abschnitt „Mannschaftskalender“ | Soll |
| `tests/events.sql`, `tests/events.test.mjs` | Bestehende Nachweise |

## Rollenmodell im Bestand

- **Vereinsrolle** (`memberships.role`): `owner`, `admin`, `trainer`, `player`.
- **Mannschaftsrolle** (`team_members.role`): `coach`, `player`.
- **Befund R1:** Die Mannschaftsrolle `coach` wird **von keiner Stelle geschrieben**. `addMember` schreibt immer `player` (`worker/teams.mjs:65`), die Einladungsannahme schreibt `player` (`accept_club_invitation`, Migration `:197`), und Einladungen kennen nur die Rollen `trainer` und `player` auf Vereinsebene. `Teams.jsx:12` beschriftet `coach` als „Trainer“, es entsteht aber nie. Ein Trainer ist damit **keiner Mannschaft zugeordnet**; es gibt keinen Datenweg für „Trainer von Mannschaft X“.

## Ist-Rechte je Rolle

Geprüft an Policies und API. „Vereinsweit“ heißt: für alle Mannschaften des eigenen Vereins.

| Recht | owner | admin | trainer | player | Beleg |
| --- | --- | --- | --- | --- | --- |
| Verein und eigene Rolle lesen | ja | ja | ja | ja | `cloudContext` (`storage.mjs:6`) |
| Verein umbenennen | ja | ja | nein | nein | `/:api/club` POST, `admin` prüfen |
| Mitgliederliste inkl. E-Mail | ja | ja | nein (Oberfläche) | nein (Oberfläche) | `Club.jsx:47` |
| Teilnehmernamen über Roster | ja | ja | ja, **vereinsweit** | ja, **vereinsweit** (ohne E-Mail) | `workspace_roster`, `worker/teams.mjs:31-36` |
| Mannschaft anlegen | ja | ja | ja | nein | `team_create` |
| Mannschaft umbenennen | ja | ja | ja, **jede** | nein | `team_rename` |
| Mannschaft löschen | ja | ja | nein | nein | `teamsApi`, `team_delete` |
| Person einer Mannschaft hinzufügen | ja | ja | ja, **jede Mannschaft** | nein | `team_member_create` |
| Person aus Mannschaft entfernen | ja | ja | ja, **jede Mannschaft** | nein | `team_member_delete` |
| Trainer einladen | ja | ja | nein | nein | `create_club_invitation` |
| Spieler einladen | ja | ja | ja | nein | `create_club_invitation` |
| Einladung widerrufen | alle | alle | nur selbst erstellte | nein | `revoke_club_invitation` |
| Termin **lesen** | vereinsweit | vereinsweit | **vereinsweit** | nur eigene Mannschaften | `event_read` |
| Termin **anlegen** | beliebige Mannschaft | beliebige | **beliebige** | nein | `event_create`, `events.mjs:129-139` |
| Termin **bearbeiten** | jeder Termin | jeder | **jeder Termin** | nein | `event_update`, `events.mjs:141-151` |
| Termin **absagen/wieder öffnen** | jeder | jeder | **jeder** | nein | `events.mjs:153-160` |
| Termin **löschen** | jeder | jeder | nur selbst erstellte | nein | `event_delete`, `events.mjs:165` |
| Rückmeldungen aller Personen sehen | ja | ja | **vereinsweit** | nur Termine eigener Mannschaften | `event_response_read` |
| Eigene Rückmeldung abgeben/ändern/widerrufen | nur als Mannschaftsmitglied | dito | dito | ja, bis Frist, nicht bei Absage | `event_response_create/update/delete` |

### Wichtige Einzelbefunde

| Nr. | Befund | Beleg |
| --- | --- | --- |
| R2 | **Jeder Trainer darf Termine jeder Mannschaft des Vereins anlegen, ändern und absagen.** Die Datenbank prüft nur die Vereinsrolle, nicht die Mannschaftszugehörigkeit. | `event_create`, `event_update` |
| R3 | **Jeder Trainer sieht die Termine und alle Rückmeldungen aller Mannschaften.** | `event_read`, `event_response_read` |
| R4 | Löschen ist enger als Ändern: nur Ersteller oder Inhaber/Administrator. Ein Trainer kann den Termin einer fremden Mannschaft ändern, aber nicht löschen. | `events.mjs:165`, `event_delete` |
| R5 | Die Oberfläche zeigt `canManage` **global je Verein** (`ctx.role!=='player'`). Ein Trainer sieht also Bearbeiten-Knöpfe an fremden Mannschaftsterminen, weil er sie tatsächlich ändern darf. | `events.mjs:54`, `Events.jsx:170` |
| R6 | **Teilnehmernamen sind vereinsweit lesbar.** `workspace_roster` liefert Namen für alle Mannschaften an jedes Vereinsmitglied; `/api/teams/roster` filtert nur nach `teamId`, nicht nach Zugehörigkeit. Ein Spieler einer Mannschaft kann damit die Namen der Mannschaft einer anderen Mannschaft abrufen. | `workspace_roster`, `worker/teams.mjs:31-36` |
| R7 | Spieler sehen Termine **nur** ihrer Mannschaften, auch wenn sie erst später beitreten. Das entspricht T1. | `event_read`, `tests/events.sql:62-66` |
| R8 | Wiederholte Rückmeldung aktualisiert die Zeile (Primärschlüssel `event_id,user_id`), zählt niemanden doppelt. | `event_responses` PK, `tests/events.sql:127` |
| R9 | Fremde Vereine haben keinen Zugriff auf Termine, Mannschaften oder Roster. | `tests/events.sql:86-91` |
| R10 | `team_members` ist für alle Vereinsmitglieder lesbar (`team_id in (select id from teams)`), also auch für Spieler fremder Mannschaften — allerdings ohne Namen; die kommen über R6. | `team_member_read` |

## Soll aus den beschlossenen Antworten

| Quelle | Aussage | Folge für die Rechte |
| --- | --- | --- |
| T1 | „Trainer der Mannschaft erstellen ihren Kalender und ihre Termine.“ | Trainerrechte sind an eine **Mannschaft** gebunden, nicht an den Verein. |
| T1 | „Nach Annahme sehen [Spieler] alle bestehenden und künftigen Mannschaftstermine.“ | Spielersicht ist an die Mannschaft gebunden. Im Bestand erfüllt. |
| Design, „Mannschaftskalender“ | „Die Vereinszugehörigkeit allein gewährt keinen Zugriff auf alle Mannschaftskalender.“ | Widerspricht R2/R3, wenn der Satz auch für Trainer gilt. |
| Produktfragen 3 | „Soll ein Trainer ausschließlich die eigene Mannschaft verwalten dürfen?“ | Ausdrücklich offen; Entscheidung vor Änderung. |
| Design, D4 | „Ein zweites Konto im selben Verein … darf den persönlichen Plan nicht lesen.“ | Für Trainingspläne erfüllt; für Teilnehmernamen gilt es nicht (R6). |

## Offene Produktentscheidungen

Jede Entscheidung ändert Rechte und braucht vor einer Umsetzung eine Antwort.

1. **Trainerrechte je Mannschaft.** Dürfen Trainer nur die eigene Mannschaft verwalten (Anlegen, Ändern, Absagen, Rückmeldungen sehen), oder bleibt es vereinsweit? Die Designformulierung und T1 weisen auf „nur eigene Mannschaft“; der Bestand ist vereinsweit. Für „nur eigene“ fehlt zudem die Datenzuordnung: es gibt keinen Weg, einen Trainer einer Mannschaft zuzuordnen (R1).
2. **Leserechte.** Sollen Trainer fremde Mannschaftstermine wenigstens sehen dürfen (nur lesen, nicht ändern)? Das ist eine übliche Vereinspraxis und lässt sich unabhängig von Punkt 1 entscheiden.
3. **Löschrecht.** Soll ein Trainer, der einen fremden Termin ändern darf, ihn auch löschen dürfen? Derzeit nein (R4).
4. **Teilnehmernamen und E-Mail-Adressen.** Soll ein Trainer die Namen und Adressen aller Vereinsmitglieder sehen, ein Spieler die Namen fremder Mannschaften? Design und Datenschutz sprechen für „nein“ bei Spielern (R6).
5. **Rolle `coach`.** Soll die Mannschaftsrolle `coach` genutzt werden, um „Trainer von Mannschaft X“ auszudrücken, oder bleibt die Zuordnung ausschließlich über die Vereinsrolle? Ohne Nutzung ist `coach` totes Modell (R1).

## Beschlossene Soll-Rechte (Verein, 22. November 2026)

Der Verein hat zwei Fragen entschieden:

| Entscheidung | Antwort | Begründung |
| --- | --- | --- |
| Trainerrechte je Mannschaft | **Nur eigene Mannschaft** | T1 („Trainer der Mannschaft erstellen ihren Kalender“) und der Design-Satz zur Mannschaftsgrenze. |
| Teilnehmernamen | **Nur eigene Mannschaft** | Mannschaftsgrenze gilt auch für personenbezogene Daten. |

Damit gilt als Soll:

| Recht | Trainer | Spieler |
| --- | --- | --- |
| Termine der eigenen Mannschaft lesen | ja | ja |
| Termine fremder Mannschaften lesen | **nein** | nein |
| Termine der eigenen Mannschaft anlegen/ändern/absagen | ja | nein |
| Termine fremder Mannschaften anlegen/ändern/absagen | **nein** | nein |
| Rückmeldungen der eigenen Mannschaft sehen | ja | ja (soweit die Sichtbarkeit nach T2 entschieden ist) |
| Rückmeldungen fremder Mannschaften sehen | **nein** | nein |
| Teilnehmernamen der eigenen Mannschaft sehen | ja, mit E-Mail | ja, ohne E-Mail |
| Teilnehmernamen fremder Mannschaften sehen | **nein** | nein |
| Eigene Rückmeldung abgeben/ändern/widerrufen | nur als Mannschaftsmitglied | ja, bis Frist, nicht bei Absage |
| Verein umbenennen, Mannschaft löschen, Trainer einladen | nur Inhaber/Administrator | nein |

### Voraussetzung, die daraus folgt

„Nur eigene Mannschaft“ setzt voraus, dass ein Trainer einer oder mehreren Mannschaften zugeordnet ist. Dieser Weg fehlt im Bestand (R1): `team_members.role='coach'` wird nirgends geschrieben, und Trainer-Einladungen tragen keine Mannschaft.

Zu entscheiden bleibt deshalb:

- **Weg der Zuordnung.** Wird die vorhandene Mannschaftsrolle `coach` genutzt (Trainer wird beim Zuordnen in `team_members` eingetragen), oder kommt eine eigene Zuordnung?
- **Wer ordnet zu.** Ein Vereinsadministrator in der Mannschaftsverwaltung, oder der Trainer selbst?
- **Mehrere Mannschaften.** Darf ein Trainer mehr als eine Mannschaft betreuen? Das Modell `team_members` erlaubt es ohne Änderung.
- **Bestehende Vereine.** Trainer ohne Zuordnung verlieren nach der Umstellung die Rechte auf alle Mannschaften. Für den Pilot sind das die Testkonten; eine Migration braucht trotzdem eine Regel.

Ohne diese Zuordnung würde die Entscheidung „nur eigene Mannschaft“ dazu führen, dass ein frisch eingeladener Trainer **keine** Mannschaft verwalten kann.

## Technische Prüfung und fachliches Urteil

| Punkt | Technische Prüfung | Fachliches Urteil |
| --- | --- | --- |
| Einladungsannahme | Getestet: Spieler wird Verein und Mannschaft zugeordnet, richtiger Verein, kein fremder Verein (`tests/events.sql:35-42`). | Der Weg passt zu T1. |
| Rückmeldung je Spieler | Getestet: nur eigene Person, Upsert, Frist, Absage (`tests/events.sql:62-72`, `:127`). | Passt zu T2. |
| Mannschaftsgrenze für Spieler | Getestet (`tests/events.sql:62-66`). | Passt zu T1. |
| Mannschaftsgrenze für Trainer | **Nicht vorhanden**; Tests belegen sie nicht, weil sie nicht existiert. | Widerspruch zu T1/Design — offene Entscheidung 1. |
| Roster-Sichtbarkeit | E-Mail nur für Trainer belegt (`tests/events.sql:75-83`); vereinsweite Namenssichtbarkeit nicht geprüft. | Offene Entscheidung 4. |

## Gewählte Zuordnung (umgesetzt)

| Frage | Entscheidung |
| --- | --- |
| Datenweg | Die vorhandene Mannschaftsrolle `coach` in `team_members`. Keine neue Tabelle. |
| Wer ordnet zu | Vereinsadministrator in der Mannschaftsverwaltung (Rolle „Trainer“ beim Hinzufügen). |
| Selbstzuordnung | Wer als Trainer eine Mannschaft anlegt, wird automatisch ihr Coach. |
| Mehrere Mannschaften | Erlaubt; `team_members` kennt keine Obergrenze. |
| Bestehende Vereine | Keine pauschale Zuordnung. Nur der eindeutige Fall (genau eine Mannschaft und genau ein Trainer) wird automatisch gesetzt; alles andere ordnet ein Administrator zu. |

## Umsetzung

| Datei | Änderung |
| --- | --- |
| `supabase/migrations/20261122170000_team_coach_scope.sql` | Helfer `is_team_coach`, `is_team_member`, `is_workspace_admin`, `team_workspace`, `is_workspace_member`; neue Policies für Mannschaften, Mitglieder, Termine und Rückmeldungen; `workspace_roster` auf eigene Mannschaften begrenzt; eindeutige Migration. |
| `scripts/database-schema.mjs` | Migration in die Neuinstallation aufgenommen. |
| `worker/teams.mjs` | `addMember` kennt die Rolle; Trainer einer Mannschaft ernennt nur ein Administrator. Trainer werden beim Anlegen selbst Coach. |
| `worker/events.mjs` | `canManage` je Termin aus der Mannschaftsrolle statt aus der Vereinsrolle. |
| `src/components/Teams.jsx` | Rollenauswahl für Administratoren, Bearbeiten nur für Administrator oder Coach der Mannschaft. |
| `tests/events.sql` | Zuordnung, Grenze zwischen zwei Trainern desselben Vereins, Roster-Grenze, Eigentümersicht. |
| `tests/events.test.mjs` | Coach-Ernennung, `canManage` je Mannschaft, Anlegen mit Selbstzuordnung. |

Ergebnis: `npm test` 95 von 95, `npm run build` Exit 0.

## Ergebnis

**Abgenommen und umgesetzt.** Ist- und Sollrechte sind je Rolle festgehalten, die beiden offenen Fragen sind entschieden und im Code umgesetzt. R2, R3 und R6 gelten damit nicht mehr: Trainer verwalten nur ihre Mannschaft, Teilnehmernamen sind auf eigene Mannschaften begrenzt.

Offen bleibt der Rest von P4: Rückmeldefrist, Absage eines Spiels, wiederholte Rückmeldung und Idempotenz der Termin-Neuanlage sind noch nicht als eigenes Paket geprüft.
