create or replace function private.club_members(wid uuid) returns table(user_id uuid,email text,role text) language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.memberships actor where actor.workspace_id=wid and actor.user_id=auth.uid() and actor.role in('owner','admin')) then raise exception 'Keine Berechtigung'; end if;
 return query select m.user_id,u.email::text,m.role from public.memberships m join auth.users u on u.id=m.user_id where m.workspace_id=wid order by m.role,u.email;
end $$;
