-- Nachtrag zu 20261115130000_teams_events_attendance.sql.
-- Die Spaltenrechte dort deckten nur einen Teil der Nutzlast ab. Die
-- Datenbank-API schreibt UPDATE und Upsert mit allen mitgeschickten Spalten;
-- fehlt das Recht auf einer davon, bricht die ganze Anweisung ab.
-- Betroffen waren das Bearbeiten eines Termins (team_id) und das wiederholte
-- Zu- oder Absagen (event_id, user_id). Zeilenrechte bleiben unverändert: die
-- Policies beschränken weiterhin, wer welche Zeile ändern darf.

grant update(team_id) on public.events to authenticated;
grant update(event_id,user_id) on public.event_responses to authenticated;
