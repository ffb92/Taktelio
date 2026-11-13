create schema if not exists private;
create table public.club_invitations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 email text not null check(length(email) between 3 and 254), token_hash text unique not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days', accepted_at timestamptz, accepted_by uuid references auth.users(id), revoked_at timestamptz
);
create index club_invitations_workspace on public.club_invitations(workspace_id,created_at desc);
alter table public.club_invitations enable row level security;
revoke all on public.club_invitations from anon,authenticated;
grant select(id,workspace_id,email,created_at,expires_at,accepted_at,revoked_at) on public.club_invitations to authenticated;
create policy invitation_admin_read on public.club_invitations for select to authenticated using(workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid()) and role in('owner','admin')));
grant update(name) on public.workspaces to authenticated;
create policy club_admin_update on public.workspaces for update to authenticated using(id in(select workspace_id from public.memberships where user_id=(select auth.uid()) and role in('owner','admin'))) with check(id in(select workspace_id from public.memberships where user_id=(select auth.uid()) and role in('owner','admin')));
create function private.create_club_invitation(wid uuid, invite_email text) returns jsonb language plpgsql security definer set search_path='' as $$
declare token text:=gen_random_uuid()::text||gen_random_uuid()::text; invite_id uuid; normalized text:=lower(trim(invite_email));
begin
 if auth.uid() is null or not exists(select 1 from public.memberships where workspace_id=wid and user_id=auth.uid() and role in('owner','admin')) then raise exception 'Keine Berechtigung'; end if;
 if length(normalized)>254 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Ungültige E-Mail'; end if;
 if exists(select 1 from public.memberships m join auth.users u on u.id=m.user_id where m.workspace_id=wid and lower(u.email)=normalized) then raise exception 'Bereits Mitglied'; end if;
 insert into public.club_invitations(workspace_id,email,token_hash,created_by) values(wid,normalized,encode(sha256(convert_to(token,'UTF8')),'hex'),auth.uid()) returning id into invite_id;
 return jsonb_build_object('id',invite_id,'token',token,'email',normalized);
end $$;
create function private.accept_club_invitation(invite_token text) returns uuid language plpgsql security definer set search_path='' as $$
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
 insert into public.memberships(workspace_id,user_id,role) values(inv.workspace_id,auth.uid(),'trainer') on conflict(workspace_id,user_id) do nothing;
 update public.club_invitations set accepted_at=now(),accepted_by=auth.uid() where id=inv.id;
 return inv.workspace_id;
end $$;
create function private.revoke_club_invitation(invite_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.club_invitations i join public.memberships m on m.workspace_id=i.workspace_id where i.id=invite_id and m.user_id=auth.uid() and m.role in('owner','admin')) then raise exception 'Keine Berechtigung'; end if;
 update public.club_invitations set revoked_at=now() where id=invite_id and accepted_at is null;
end $$;
create function private.club_members(wid uuid) returns table(user_id uuid,email text,role text) language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.memberships where workspace_id=wid and user_id=auth.uid() and role in('owner','admin')) then raise exception 'Keine Berechtigung'; end if;
 return query select m.user_id,u.email::text,m.role from public.memberships m join auth.users u on u.id=m.user_id where m.workspace_id=wid order by m.role,u.email;
end $$;
revoke all on function private.create_club_invitation(uuid,text),private.accept_club_invitation(text),private.revoke_club_invitation(uuid),private.club_members(uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.create_club_invitation(uuid,text),private.accept_club_invitation(text),private.revoke_club_invitation(uuid),private.club_members(uuid) to authenticated;
create function public.create_club_invitation(wid uuid,invite_email text) returns jsonb language sql security invoker set search_path='' as $$ select private.create_club_invitation(wid,invite_email) $$;
create function public.accept_club_invitation(invite_token text) returns uuid language sql security invoker set search_path='' as $$ select private.accept_club_invitation(invite_token) $$;
create function public.revoke_club_invitation(invite_id uuid) returns void language sql security invoker set search_path='' as $$ select private.revoke_club_invitation(invite_id) $$;
create function public.club_members(wid uuid) returns table(user_id uuid,email text,role text) language sql security invoker set search_path='' as $$ select * from private.club_members(wid) $$;
revoke all on function public.create_club_invitation(uuid,text),public.accept_club_invitation(text),public.revoke_club_invitation(uuid),public.club_members(uuid) from public,anon;
grant execute on function public.create_club_invitation(uuid,text),public.accept_club_invitation(text),public.revoke_club_invitation(uuid),public.club_members(uuid) to authenticated;
create or replace function public.create_workspace(workspace_name text) returns uuid language plpgsql security invoker set search_path='' as $$
declare wid uuid;
begin
 if auth.uid() is null then raise exception 'Login erforderlich'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if exists(select 1 from public.memberships where user_id=auth.uid()) then raise exception 'Ein Verein ist bereits eingerichtet. Bitte im Profil bearbeiten.'; end if;
 insert into public.workspaces(name,owner_id) values(trim(workspace_name),auth.uid()) returning id into wid;
 insert into public.memberships(workspace_id,user_id,role) values(wid,auth.uid(),'owner');
 return wid;
end $$;
