-- Mannschaften, Termine und Anwesenheit.
-- Additive Änderung: bestehende Vereine, Pläne und Übungen bleiben unverändert.
-- Spieler erhalten eine eigene Mitgliedschaftsrolle. Ein Termin gehört immer zu
-- genau einer Mannschaft, damit Mitglieder nur die Termine ihrer Mannschaft sehen.

-- 1. Rolle "player" für Vereinsmitglieder mit eigenem Zugang.
alter table public.memberships drop constraint memberships_role_check;
alter table public.memberships add constraint memberships_role_check check(role in ('owner','admin','trainer','player'));

-- 2. Mannschaften und ihre Mitglieder.
create table public.teams (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null check(length(name) between 2 and 80),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(id,workspace_id)
);
create index teams_workspace on public.teams(workspace_id,name);
create unique index teams_workspace_name on public.teams(workspace_id,lower(name));

create table public.team_members (
 team_id uuid not null references public.teams(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'player' check(role in ('coach','player')),
 joined_at timestamptz not null default now(),
 primary key(team_id,user_id)
);
create index team_members_user on public.team_members(user_id);

-- 3. Termine. Der zusammengesetzte Fremdschlüssel verhindert, dass ein Termin
-- eine Mannschaft aus einem anderen Verein referenziert.
create table public.events (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 team_id uuid not null,
 created_by uuid not null references auth.users(id),
 kind text not null default 'training' check(kind in ('training','match','other')),
 title text not null check(length(title) between 1 and 120),
 starts_at timestamptz not null,
 ends_at timestamptz,
 meet_at timestamptz,
 location text not null default '' check(length(location)<=200),
 notes text not null default '' check(length(notes)<=2000),
 response_deadline timestamptz,
 cancelled_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(team_id,workspace_id) references public.teams(id,workspace_id) on delete cascade,
 check(ends_at is null or ends_at>starts_at),
 check(meet_at is null or meet_at<=starts_at),
 check(response_deadline is null or response_deadline<=starts_at)
);
create index events_workspace_start on public.events(workspace_id,starts_at);
create index events_team_start on public.events(team_id,starts_at);

-- 4. Rückmeldungen je Termin und Person.
create table public.event_responses (
 event_id uuid not null references public.events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 status text not null check(status in ('accepted','declined','maybe')),
 note text not null default '' check(length(note)<=500),
 updated_at timestamptz not null default now(),
 primary key(event_id,user_id)
);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.events enable row level security;
alter table public.event_responses enable row level security;

revoke all on public.teams,public.team_members,public.events,public.event_responses from anon,authenticated;
grant select on public.teams,public.team_members,public.events,public.event_responses to authenticated;
grant insert(workspace_id,name,created_by) on public.teams to authenticated;
grant update(name) on public.teams to authenticated;
grant delete on public.teams to authenticated;
grant insert(team_id,user_id,role) on public.team_members to authenticated;
grant delete on public.team_members to authenticated;
grant insert(workspace_id,team_id,created_by,kind,title,starts_at,ends_at,meet_at,location,notes,response_deadline) on public.events to authenticated;
grant update(kind,title,starts_at,ends_at,meet_at,location,notes,response_deadline,cancelled_at,updated_at) on public.events to authenticated;
grant delete on public.events to authenticated;
grant insert(event_id,user_id,status,note,updated_at) on public.event_responses to authenticated;
grant update(status,note,updated_at) on public.event_responses to authenticated;
grant delete on public.event_responses to authenticated;

-- 5. Policies. Lesen darf jede Person ihren Verein; verwalten dürfen nur Trainer
-- und Administratoren. Spieler sehen ausschließlich Termine ihrer Mannschaft.
create policy team_read on public.teams for select to authenticated
 using(workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid())));
create policy team_create on public.teams for insert to authenticated
 with check(created_by=(select auth.uid()) and workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid()) and role in('owner','admin','trainer')));
create policy team_rename on public.teams for update to authenticated
 using(workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid()) and role in('owner','admin','trainer')))
 with check(workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid()) and role in('owner','admin','trainer')));
create policy team_delete on public.teams for delete to authenticated
 using(workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid()) and role in('owner','admin')));

create policy team_member_read on public.team_members for select to authenticated
 using(team_id in(select id from public.teams));
create policy team_member_create on public.team_members for insert to authenticated
 with check(
  exists(select 1 from public.teams t where t.id=team_members.team_id and t.workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid()) and role in('owner','admin','trainer')))
  and exists(select 1 from public.memberships m where m.workspace_id=(select workspace_id from public.teams t where t.id=team_members.team_id) and m.user_id=team_members.user_id)
 );
create policy team_member_delete on public.team_members for delete to authenticated
 using(team_id in(select id from public.teams t where t.workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid()) and role in('owner','admin','trainer'))));

create policy event_read on public.events for select to authenticated
 using(
  workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid()) and role in('owner','admin','trainer'))
  or exists(select 1 from public.team_members tm where tm.team_id=events.team_id and tm.user_id=(select auth.uid()))
 );
create policy event_create on public.events for insert to authenticated
 with check(created_by=(select auth.uid()) and workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid()) and role in('owner','admin','trainer')));
create policy event_update on public.events for update to authenticated
 using(workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid()) and role in('owner','admin','trainer')))
 with check(workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid()) and role in('owner','admin','trainer')));
create policy event_delete on public.events for delete to authenticated
 using(created_by=(select auth.uid()) or workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid()) and role in('owner','admin')));

-- Die Sichtbarkeit des Termins (event_read) begrenzt, wer Rückmeldungen sieht.
-- Schreiben darf nur die eigene Person, solange der Termin offen ist und die
-- Rückmeldefrist läuft.
create policy event_response_read on public.event_responses for select to authenticated
 using(exists(select 1 from public.events e where e.id=event_responses.event_id));
create policy event_response_create on public.event_responses for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(
  select 1 from public.events e join public.team_members tm on tm.team_id=e.team_id and tm.user_id=(select auth.uid())
  where e.id=event_responses.event_id and e.cancelled_at is null
   and coalesce(e.response_deadline,e.starts_at)>now()));
create policy event_response_update on public.event_responses for update to authenticated
 using(user_id=(select auth.uid()) and exists(
  select 1 from public.events e join public.team_members tm on tm.team_id=e.team_id and tm.user_id=(select auth.uid())
  where e.id=event_responses.event_id and e.cancelled_at is null
   and coalesce(e.response_deadline,e.starts_at)>now()))
 with check(user_id=(select auth.uid()));
create policy event_response_delete on public.event_responses for delete to authenticated
 using(user_id=(select auth.uid()));

-- 6. Einladungen erhalten Rolle und Mannschaft. Ein Spieler tritt beim
-- Annehmen automatisch seiner Mannschaft bei.
alter table public.club_invitations
 add column role text not null default 'trainer' check(role in ('trainer','player')),
 add column team_id uuid references public.teams(id) on delete set null;
grant select(role,team_id,created_by) on public.club_invitations to authenticated;
create policy invitation_creator_read on public.club_invitations for select to authenticated
 using(created_by=(select auth.uid()));

drop function if exists public.create_club_invitation(uuid,text);
drop function if exists private.create_club_invitation(uuid,text);
create function private.create_club_invitation(wid uuid, invite_email text, invite_role text default 'trainer', invite_team uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare token text:=gen_random_uuid()::text||gen_random_uuid()::text; invite_id uuid; normalized text:=lower(trim(invite_email));
 is_admin boolean; is_coach boolean;
begin
 if auth.uid() is null then raise exception 'Keine Berechtigung'; end if;
 select exists(select 1 from public.memberships where workspace_id=wid and user_id=auth.uid() and role in('owner','admin')) into is_admin;
 select exists(select 1 from public.memberships where workspace_id=wid and user_id=auth.uid() and role in('owner','admin','trainer')) into is_coach;
 if invite_role is null or invite_role not in ('trainer','player') then raise exception 'Ungültige Rolle'; end if;
 if invite_role='trainer' and not is_admin then raise exception 'Keine Berechtigung'; end if;
 if invite_role='player' and not is_coach then raise exception 'Keine Berechtigung'; end if;
 if length(normalized)>254 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Ungültige E-Mail'; end if;
 if invite_role='player' and invite_team is null then raise exception 'Mannschaft erforderlich'; end if;
 if invite_team is not null and not exists(select 1 from public.teams where id=invite_team and workspace_id=wid) then raise exception 'Mannschaft gehört nicht zum Verein'; end if;
 if exists(select 1 from public.memberships m join auth.users u on u.id=m.user_id where m.workspace_id=wid and lower(u.email)=normalized) then raise exception 'Bereits Mitglied'; end if;
 insert into public.club_invitations(workspace_id,email,token_hash,created_by,role,team_id)
  values(wid,normalized,encode(sha256(convert_to(token,'UTF8')),'hex'),auth.uid(),invite_role,invite_team)
  returning id into invite_id;
 return jsonb_build_object('id',invite_id,'token',token,'email',normalized,'role',invite_role,'teamId',invite_team);
end $$;

-- Trainer dürfen eigene Einladungen widerrufen; fremde Einladungen bleiben
-- Administratoren vorbehalten.
create or replace function private.revoke_club_invitation(invite_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(
  select 1 from public.club_invitations i join public.memberships m on m.workspace_id=i.workspace_id
  where i.id=invite_id and m.user_id=auth.uid()
   and (m.role in('owner','admin') or (m.role='trainer' and i.created_by=auth.uid()))
 ) then raise exception 'Keine Berechtigung'; end if;
 update public.club_invitations set revoked_at=now() where id=invite_id and accepted_at is null;
end $$;

create or replace function private.accept_club_invitation(invite_token text) returns uuid language plpgsql security definer set search_path='' as $$
declare inv public.club_invitations%rowtype; verified_email text;
begin
 if auth.uid() is null then raise exception 'Bitte anmelden'; end if;
 select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is null then raise exception 'Bitte E-Mail bestätigen'; end if;
 select * into inv from public.club_invitations where token_hash=encode(sha256(convert_to(invite_token,'UTF8')),'hex') for update;
 if inv.id is null or inv.email<>verified_email or inv.revoked_at is not null or inv.expires_at<=now() then raise exception 'Einladung ungültig, abgelaufen oder für eine andere E-Mail bestimmt'; end if;
 if inv.accepted_at is not null then
  if inv.accepted_by=auth.uid() and exists(select 1 from public.memberships where workspace_id=inv.workspace_id and user_id=auth.uid()) then return inv.workspace_id; end if;
  raise exception 'Einladung bereits verwendet';
 end if;
 insert into public.memberships(workspace_id,user_id,role) values(inv.workspace_id,auth.uid(),inv.role) on conflict(workspace_id,user_id) do nothing;
 if inv.team_id is not null then
  insert into public.team_members(team_id,user_id,role) values(inv.team_id,auth.uid(),'player') on conflict(team_id,user_id) do nothing;
 end if;
 update public.club_invitations set accepted_at=now(),accepted_by=auth.uid() where id=inv.id;
 return inv.workspace_id;
end $$;

-- 7. Namen für Anwesenheitslisten. Spieler sehen keinen E-Mail-Verkehr ihrer
-- Mitspieler; Trainer erhalten die eingeladene Adresse zur Zuordnung.
create function private.workspace_roster(wid uuid) returns table(team_id uuid,user_id uuid,name text,email text,team_role text)
language plpgsql security definer set search_path='' as $$
declare is_coach boolean;
begin
 if auth.uid() is null then raise exception 'Bitte anmelden'; end if;
 select exists(select 1 from public.memberships m where m.workspace_id=wid and m.user_id=auth.uid() and m.role in('owner','admin','trainer')) into is_coach;
 if not is_coach and not exists(select 1 from public.memberships m where m.workspace_id=wid and m.user_id=auth.uid()) then raise exception 'Keine Berechtigung'; end if;
 return query
  select tm.team_id,tm.user_id,
   coalesce(
    nullif(left(trim(u.raw_user_meta_data->'taktelio_profile'->>'displayName'),80),''),
    nullif(left(trim(concat_ws(' ',u.raw_user_meta_data->'taktelio_profile'->>'firstName',u.raw_user_meta_data->'taktelio_profile'->>'lastName')),161),''),
    nullif(split_part(coalesce(u.email,''),'@',1),''),
    'Mitglied')::text,
   case when is_coach then u.email::text else null end,
   tm.role
  from public.team_members tm
  join public.teams t on t.id=tm.team_id
  join auth.users u on u.id=tm.user_id
  where t.workspace_id=wid
  order by tm.role,u.email;
end $$;

revoke all on function private.create_club_invitation(uuid,text,text,uuid) from public,anon;
revoke all on function private.workspace_roster(uuid) from public,anon;
grant execute on function private.create_club_invitation(uuid,text,text,uuid),private.workspace_roster(uuid) to authenticated;
create function public.create_club_invitation(wid uuid, invite_email text, invite_role text default 'trainer', invite_team uuid default null) returns jsonb language sql security invoker set search_path='' as $$ select private.create_club_invitation(wid,invite_email,invite_role,invite_team) $$;
create function public.workspace_roster(wid uuid) returns table(team_id uuid,user_id uuid,name text,email text,team_role text) language sql security invoker set search_path='' as $$ select * from private.workspace_roster(wid) $$;
revoke all on function public.create_club_invitation(uuid,text,text,uuid),public.workspace_roster(uuid) from public,anon;
grant execute on function public.create_club_invitation(uuid,text,text,uuid),public.workspace_roster(uuid) to authenticated;

-- 8. Einladungsvorschauen nennen Rolle und Mannschaft, damit die eingeladene
-- Person vor der Anmeldung weiß, ob sie als Trainer oder Spieler beitritt.
create or replace function private.public_invitation_preview(invite_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if invite_token is null or invite_token !~ '^[a-f0-9-]{72}$' then return null; end if;
 select jsonb_build_object('club',w.name,'inviter',coalesce(nullif(left(trim(u.raw_user_meta_data->'taktelio_profile'->>'displayName'),80),''),nullif(left(trim(concat_ws(' ',u.raw_user_meta_data->'taktelio_profile'->>'firstName',u.raw_user_meta_data->'taktelio_profile'->>'lastName')),161),''),'Ein Vereinsadministrator'),'role',i.role,'team',t.name)
 into result from public.club_invitations i
 join public.workspaces w on w.id=i.workspace_id
 join auth.users u on u.id=i.created_by
 left join public.teams t on t.id=i.team_id
 where i.token_hash=encode(sha256(convert_to(invite_token,'UTF8')),'hex')
 and i.revoked_at is null and i.accepted_at is null and i.expires_at>now();
 return result;
end $$;

create or replace function private.preview_club_invitation(invite_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then return null; end if;
 if invite_token is null or invite_token !~ '^[a-f0-9-]{72}$' then return null; end if;
 select jsonb_build_object('club',w.name,'inviter',coalesce(nullif(left(trim(u.raw_user_meta_data->'taktelio_profile'->>'displayName'),80),''),nullif(left(trim(concat_ws(' ',u.raw_user_meta_data->'taktelio_profile'->>'firstName',u.raw_user_meta_data->'taktelio_profile'->>'lastName')),161),''),'Ein Vereinsadministrator'),'email',i.email,'expiresAt',i.expires_at,'role',i.role,'team',t.name)
 into result from public.club_invitations i
 join public.workspaces w on w.id=i.workspace_id
 join auth.users u on u.id=i.created_by
 left join public.teams t on t.id=i.team_id
 where i.token_hash=encode(sha256(convert_to(invite_token,'UTF8')),'hex')
 and i.email=(select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null)
 and i.revoked_at is null and i.accepted_at is null and i.expires_at>now();
 return result;
end $$;
