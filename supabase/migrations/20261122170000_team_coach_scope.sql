-- P3/P4: Mannschaftsgrenze für Trainer und Teilnehmernamen.
-- Beschlossen am 22.11.2026: Trainer verwalten nur ihre eigene Mannschaft,
-- und Teilnehmernamen fremder Mannschaften sind nicht sichtbar.
--
-- Die Zuordnung "Trainer von Mannschaft X" nutzt die bereits vorhandene
-- Mannschaftsrolle 'coach' in public.team_members. Ein Vereinsadministrator
-- ordnet zu; wer eine neue Mannschaft anlegt, wird für sie selbst Trainer.
-- Bestehende Trainer ohne Zuordnung verlieren den Zugriff auf fremde
-- Mannschaften und müssen einmalig zugeordnet werden. Das ist beabsichtigt:
-- eine automatische Zuordnung würde die alte, vereinsweite Sicht fortschreiben.

-- 1. Hilfsfunktionen. Security definer, damit Policies nicht rekursiv auf
-- team_members zugreifen müssen.
create or replace function private.workspace_role(wid uuid) returns text
language sql stable security definer set search_path='' as $$
 select role from public.memberships where workspace_id=wid and user_id=auth.uid()
$$;

create or replace function private.is_workspace_admin(wid uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships
  where workspace_id=wid and user_id=auth.uid() and role in('owner','admin'))
$$;

create or replace function private.is_team_member(tid uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.team_members where team_id=tid and user_id=auth.uid())
$$;

create or replace function private.is_team_coach(tid uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.team_members
  where team_id=tid and user_id=auth.uid() and role='coach')
$$;

-- Liest den Verein einer Mannschaft ohne RLS der Tabelle teams.
create or replace function private.team_workspace(tid uuid) returns uuid
language sql stable security definer set search_path='' as $$
 select workspace_id from public.teams where id=tid
$$;

-- Prüft eine beliebige Vereinsmitgliedschaft ohne RLS der Tabelle memberships.
create or replace function private.is_workspace_member(wid uuid, uid uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships where workspace_id=wid and user_id=uid)
$$;

-- 2. Mannschaften: sichtbar für Administratoren und eigene Mannschaften.
drop policy if exists team_read on public.teams;
create policy team_read on public.teams for select to authenticated
 using(private.is_workspace_admin(workspace_id) or private.is_team_member(id));

-- Anlegen bleibt für Trainer möglich; sie werden beim Anlegen selbst Coach.
-- Umbenennen dürfen Administratoren und der Trainer der Mannschaft.
drop policy if exists team_rename on public.teams;
create policy team_rename on public.teams for update to authenticated
 using(private.is_workspace_admin(workspace_id) or private.is_team_coach(id))
 with check(private.is_workspace_admin(workspace_id) or private.is_team_coach(id));

-- 3. Mannschaftsmitglieder: nur eigene Mannschaften.
-- Administratoren ordnen jede Rolle zu. Trainer der Mannschaft fügen Spieler
-- hinzu. Wer eine Mannschaft angelegt hat, darf sich selbst als Coach eintragen.
drop policy if exists team_member_read on public.team_members;
create policy team_member_read on public.team_members for select to authenticated
 using(
  private.is_team_member(team_id)
  or private.is_workspace_admin(private.team_workspace(team_id))
 );

drop policy if exists team_member_create on public.team_members;
create policy team_member_create on public.team_members for insert to authenticated
 with check(
  private.is_workspace_member(private.team_workspace(team_members.team_id),team_members.user_id)
  and (
   private.is_workspace_admin(private.team_workspace(team_members.team_id))
   or (team_members.role='player' and private.is_team_coach(team_members.team_id))
   or (team_members.role='coach' and team_members.user_id=auth.uid()
       and exists(select 1 from public.teams t where t.id=team_members.team_id and t.created_by=auth.uid()))
  )
 );

drop policy if exists team_member_delete on public.team_members;
create policy team_member_delete on public.team_members for delete to authenticated
 using(
  private.is_workspace_admin(private.team_workspace(team_id))
  or (role='player' and private.is_team_coach(team_id))
 );

-- 4. Termine: Administratoren vereinsweit, sonst nur die eigene Mannschaft.
drop policy if exists event_read on public.events;
create policy event_read on public.events for select to authenticated
 using(private.is_workspace_admin(workspace_id) or private.is_team_member(team_id));

drop policy if exists event_create on public.events;
create policy event_create on public.events for insert to authenticated
 with check(
  created_by=(select auth.uid())
  and (private.is_workspace_admin(workspace_id) or private.is_team_coach(team_id))
 );

drop policy if exists event_update on public.events;
create policy event_update on public.events for update to authenticated
 using(private.is_workspace_admin(workspace_id) or private.is_team_coach(team_id))
 with check(private.is_workspace_admin(workspace_id) or private.is_team_coach(team_id));

drop policy if exists event_delete on public.events;
create policy event_delete on public.events for delete to authenticated
 using(
  private.is_workspace_admin(workspace_id)
  or (created_by=(select auth.uid()) and private.is_team_coach(team_id))
 );

-- 5. Rückmeldungen: nur Spieler der Mannschaft geben Antworten ab. Die
-- Lesbarkeit folgt event_read, weil die Subquery der RLS der Tabelle unterliegt.
drop policy if exists event_response_create on public.event_responses;
create policy event_response_create on public.event_responses for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(
  select 1 from public.events e join public.team_members tm on tm.team_id=e.team_id and tm.user_id=(select auth.uid())
  where e.id=event_responses.event_id and e.cancelled_at is null and tm.role='player'
   and coalesce(e.response_deadline,e.starts_at)>now()));

drop policy if exists event_response_update on public.event_responses;
create policy event_response_update on public.event_responses for update to authenticated
 using(user_id=(select auth.uid()) and exists(
  select 1 from public.events e join public.team_members tm on tm.team_id=e.team_id and tm.user_id=(select auth.uid())
  where e.id=event_responses.event_id and e.cancelled_at is null and tm.role='player'
   and coalesce(e.response_deadline,e.starts_at)>now()))
 with check(user_id=(select auth.uid()));

-- 6. Teilnehmernamen: nur Personen der eigenen Mannschaften. Administratoren
-- sehen den ganzen Verein. E-Mail-Adressen bleiben Trainern und Administratoren
-- vorbehalten.
create or replace function private.workspace_roster(wid uuid)
returns table(team_id uuid,user_id uuid,name text,email text,team_role text)
language plpgsql security definer set search_path='' as $$
declare actor_role text;
begin
 if auth.uid() is null then raise exception 'Bitte anmelden'; end if;
 select m.role into actor_role from public.memberships m
  where m.workspace_id=wid and m.user_id=auth.uid();
 if actor_role is null then raise exception 'Keine Berechtigung'; end if;
 return query
  select tm.team_id,tm.user_id,
   coalesce(
    nullif(left(trim(u.raw_user_meta_data->'taktelio_profile'->>'displayName'),80),''),
    nullif(left(trim(concat_ws(' ',u.raw_user_meta_data->'taktelio_profile'->>'firstName',u.raw_user_meta_data->'taktelio_profile'->>'lastName')),161),''),
    nullif(split_part(coalesce(u.email,''),'@',1),''),
    'Mitglied')::text,
   case when actor_role in('owner','admin','trainer') and private.is_team_coach(tm.team_id) then u.email::text
        when actor_role in('owner','admin') then u.email::text
        else null end,
   tm.role
  from public.team_members tm
  join public.teams t on t.id=tm.team_id
  join auth.users u on u.id=tm.user_id
  where t.workspace_id=wid
   and (actor_role in('owner','admin') or private.is_team_member(tm.team_id))
  order by tm.role,u.email;
end $$;

revoke all on function private.workspace_roster(uuid) from public,anon;
grant execute on function private.workspace_roster(uuid) to authenticated;
revoke all on function private.workspace_role(uuid),private.is_workspace_admin(uuid),private.is_team_member(uuid),private.is_team_coach(uuid),private.team_workspace(uuid),private.is_workspace_member(uuid,uuid) from public,anon;
grant execute on function private.workspace_role(uuid),private.is_workspace_admin(uuid),private.is_team_member(uuid),private.is_team_coach(uuid),private.team_workspace(uuid),private.is_workspace_member(uuid,uuid) to authenticated;

-- 7. Migration bestehender Daten: keine automatische Zuordnung. Ein Verein mit
-- nur einer Mannschaft und genau einem Trainer erhält diese Zuordnung, weil sie
-- eindeutig ist; alles andere bleibt offen und wird in der Mannschaftsverwaltung
-- durch einen Administrator gesetzt.
insert into public.team_members(team_id,user_id,role)
select t.id,m.user_id,'coach'
from public.teams t
join public.memberships m on m.workspace_id=t.workspace_id and m.role='trainer'
where (select count(*) from public.teams t2 where t2.workspace_id=t.workspace_id)=1
  and (select count(*) from public.memberships m2 where m2.workspace_id=t.workspace_id and m2.role='trainer')=1
on conflict(team_id,user_id) do nothing;
