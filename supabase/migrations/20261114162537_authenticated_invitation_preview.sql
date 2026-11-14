-- Invitation details are visible only to the verified intended recipient.
create or replace function private.preview_club_invitation(invite_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then return null; end if;
 if invite_token is null or invite_token !~ '^[a-f0-9-]{72}$' then return null; end if;
 select jsonb_build_object('club',w.name,'inviter',u.email,'email',i.email,'expiresAt',i.expires_at)
 into result from public.club_invitations i
 join public.workspaces w on w.id=i.workspace_id
 join auth.users u on u.id=i.created_by
 where i.token_hash=encode(sha256(convert_to(invite_token,'UTF8')),'hex')
 and i.email=(select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null)
 and i.revoked_at is null and i.accepted_at is null and i.expires_at>now();
 return result;
end $$;
revoke all on function private.preview_club_invitation(text) from public;
revoke all on function private.preview_club_invitation(text) from anon;
grant execute on function private.preview_club_invitation(text) to authenticated;
create or replace function public.preview_club_invitation(invite_token text)
returns jsonb language sql security invoker set search_path='' as $$
 select private.preview_club_invitation(invite_token)
$$;
revoke all on function public.preview_club_invitation(text) from public,anon;
grant execute on function public.preview_club_invitation(text) to authenticated;
