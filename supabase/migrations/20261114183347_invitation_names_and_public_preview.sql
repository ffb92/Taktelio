-- Public invitation details authorized by possession of an active unguessable token.
-- No email addresses, other profile fields, IDs or membership access are exposed.
create or replace function private.public_invitation_preview(invite_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if invite_token is null or invite_token !~ '^[a-f0-9-]{72}$' then return null; end if;
 select jsonb_build_object('club',w.name,'inviter',coalesce(nullif(left(trim(u.raw_user_meta_data->'taktelio_profile'->>'displayName'),80),''),nullif(left(trim(concat_ws(' ',u.raw_user_meta_data->'taktelio_profile'->>'firstName',u.raw_user_meta_data->'taktelio_profile'->>'lastName')),161),''),'Ein Vereinsadministrator'))
 into result from public.club_invitations i
 join public.workspaces w on w.id=i.workspace_id
 join auth.users u on u.id=i.created_by
 where i.token_hash=encode(sha256(convert_to(invite_token,'UTF8')),'hex')
 and i.revoked_at is null and i.accepted_at is null and i.expires_at>now();
 return result;
end $$;
revoke all on function private.public_invitation_preview(text) from public;
grant usage on schema private to anon;
grant execute on function private.public_invitation_preview(text) to anon,authenticated;
create or replace function public.public_invitation_preview(invite_token text)
returns jsonb language sql security invoker set search_path='' as $$
 select private.public_invitation_preview(invite_token)
$$;
revoke all on function public.public_invitation_preview(text) from public;
grant execute on function public.public_invitation_preview(text) to anon,authenticated;

create or replace function private.preview_club_invitation(invite_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then return null; end if;
 if invite_token is null or invite_token !~ '^[a-f0-9-]{72}$' then return null; end if;
 select jsonb_build_object('club',w.name,'inviter',coalesce(nullif(left(trim(u.raw_user_meta_data->'taktelio_profile'->>'displayName'),80),''),nullif(left(trim(concat_ws(' ',u.raw_user_meta_data->'taktelio_profile'->>'firstName',u.raw_user_meta_data->'taktelio_profile'->>'lastName')),161),''),'Ein Vereinsadministrator'),'email',i.email,'expiresAt',i.expires_at)
 into result from public.club_invitations i
 join public.workspaces w on w.id=i.workspace_id
 join auth.users u on u.id=i.created_by
 where i.token_hash=encode(sha256(convert_to(invite_token,'UTF8')),'hex')
 and i.email=(select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null)
 and i.revoked_at is null and i.accepted_at is null and i.expires_at>now();
 return result;
end $$;
