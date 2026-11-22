# Produktionsmigration 22. November 2026

## Was angewendet wurde

| Migration | Inhalt | Wirkung |
| --- | --- | --- |
| `20261122170000_team_coach_scope.sql` | Mannschaftsgrenze für Trainer und Teilnehmernamen | **Verhaltensändernd.** Trainer verwalten nur noch Termine ihrer zugeordneten Mannschaften. |
| `20261122180000_event_idempotency.sql` | `client_request_id` je Verein eindeutig | Additiv, für alte Clients wirkungslos. |
| `20261122190000_event_training_plan.sql` | `training_plan_id` mit Eigentumsprüfung | Additiv, für alte Clients wirkungslos. |

Ziel: Projekt `Taktelio`, `iyhyibjmfzjuypgybnno`, vom CLI als **production** gekennzeichnet.
Ausgeführt am 22. November 2026 mit `supabase db push --remote --yes`. Die drei Migrationen wurden ohne Fehler angewendet.

**Kein Datenbank-Backup vor der Migration.** `supabase db dump` scheitert auf diesem Rechner, weil Docker fehlt; `pg_dump` und `psql` sind nicht installiert. Die Migrationen löschen keine Daten; die einzige aggressive Änderung ist das Ersetzen von Policies, deren alte Fassung in den Migrationsdateien `20261115130000` und `20261115150000` erhalten ist.

## Dringender Zustand: Datenbank ist voraus

Produktion läuft auf `de0877a` vom 15. November. Der Branch `feature/account-menu` enthält **12 Commits** mit dem Code, der zu den neuen Regeln gehört. Bis dieser Code deployt ist, gelten die alten Regeln in der Oberfläche und die neuen in der Datenbank.

### Was dadurch jetzt in Produktion bricht

| Ablauf | Ursache | Wirkung |
| --- | --- | --- |
| Trainer legt Termin für eine Mannschaft ohne Zuordnung an | Oberfläche erlaubt es (`canManage` = Rolle ≠ Spieler), Datenbank verlangt `role='coach'` | Fehlermeldung „Terminaktion nicht möglich. Bitte Berechtigung und Angaben prüfen." |
| Trainer öffnet die Mannschaftsliste | `team_read` liefert nur eigene Mannschaften | Nicht zugeordnete Trainer sehen keine Mannschaft, obwohl welche existieren. Die Meldung „Noch keine Mannschaft angelegt" ist dann falsch. |
| Trainer der Mannschaft antwortet auf einen Termin | Datenbank erlaubt nur `player` | Fehlermeldung statt Antwort. |
| Teilnehmernamen | `workspace_roster` liefert nur eigene Mannschaften | Führungskräfte sehen weniger Namen als vorher. |
| Termin löschen | Fehler aus P5 (keine ID gesendet) | Weiterhin defekt, bis der Branch deployt ist. |

### Erforderliche Reihenfolge jetzt

1. **Trainer zuordnen** — sonst erleben sie die Fehler aus der Tabelle. Ein Administrator fügt sie in *Mannschaften → Mitglieder* mit Rolle „Trainer" hinzu. Wer eine Mannschaft selbst angelegt hat, ist automatisch zugeordnet.
2. **Branch deployen** — erst danach passen Oberfläche, API und Datenbank wieder zusammen.
3. Erst dann mit P7 beginnen.

## Prüfabfrage für die Zuordnung

Im SQL-Editor ausführen. Zeilen mit `coach_teams = 0` verlieren den Zugriff, bis sie zugeordnet sind.

```sql
select w.name as verein, u.email, m.role,
       (select count(*) from public.team_members tm
          join public.teams t on t.id = tm.team_id
         where t.workspace_id = w.id and tm.user_id = m.user_id and tm.role = 'coach') as coach_teams
from public.memberships m
join public.workspaces w on w.id = m.workspace_id
join auth.users u on u.id = m.user_id
where m.role = 'trainer'
order by w.name, u.email;
```

## Rücknahme

Falls nötig, stellt die alte Fassung der Policies den vorherigen Zustand wieder her. Dafür die Policy-Blöcke aus `20261115130000_teams_events_attendance.sql` (Abschnitt 5) erneut ausführen und die Spalten `client_request_id` sowie `training_plan_id` per `alter table … drop column` entfernen. Der Datenbestand bleibt in beiden Fällen erhalten.
