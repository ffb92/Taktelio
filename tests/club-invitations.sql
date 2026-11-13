begin;
insert into auth.users(id,email,email_confirmed_at) values
('20000000-0000-4000-8000-000000000001','owner@example.invalid',now()),
('20000000-0000-4000-8000-000000000002','trainer@example.invalid',now()),
('20000000-0000-4000-8000-000000000003','other@example.invalid',now());
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select set_config('test.club',public.create_workspace('Invitation Test')::text,true);
select set_config('test.invite',public.create_club_invitation(current_setting('test.club')::uuid,'trainer@example.invalid')->>'token',true);
select set_config('test.other_invite',public.create_club_invitation(current_setting('test.club')::uuid,'other@example.invalid')->>'token',true);
do $$ begin
 begin perform public.create_workspace('Unexpected second club');raise exception 'TEST: duplicate onboarding allowed';exception when raise_exception then if SQLERRM like 'TEST:%' then raise;end if;end;
 update public.workspaces set name='Renamed Test Club' where id=current_setting('test.club')::uuid;
 if not exists(select 1 from public.workspaces where id=current_setting('test.club')::uuid and name='Renamed Test Club') then raise exception 'TEST: owner rename failed';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ begin
 begin perform public.accept_club_invitation(current_setting('test.invite'));raise exception 'TEST: wrong email accepted';exception when raise_exception then if SQLERRM like 'TEST:%' then raise;end if;end;
 begin perform public.create_club_invitation(current_setting('test.club')::uuid,'attacker@example.invalid');raise exception 'TEST: outsider invited member';exception when raise_exception then if SQLERRM like 'TEST:%' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ declare joined uuid; changed int; begin
 joined:=public.accept_club_invitation(current_setting('test.invite'));
 if joined<>current_setting('test.club')::uuid then raise exception 'TEST: wrong club';end if;
 if public.accept_club_invitation(current_setting('test.invite'))<>joined then raise exception 'TEST: repeat acceptance failed';end if;
 if not exists(select 1 from public.memberships where workspace_id=joined and user_id=auth.uid() and role='trainer') then raise exception 'TEST: trainer membership missing';end if;
 update public.workspaces set name='Unauthorized' where id=joined;get diagnostics changed=row_count;
 if changed<>0 then raise exception 'TEST: trainer renamed club';end if;
 begin perform public.create_club_invitation(joined,'attacker@example.invalid');raise exception 'TEST: trainer invited member';exception when raise_exception then if SQLERRM like 'TEST:%' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.club_members(current_setting('test.club')::uuid))<>2 then raise exception 'TEST: member list failed';end if;
 perform public.revoke_club_invitation((select id from public.club_invitations where workspace_id=current_setting('test.club')::uuid and email='other@example.invalid'));
end $$;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ begin
 begin perform public.accept_club_invitation(current_setting('test.other_invite'));raise exception 'TEST: revoked link accepted';exception when raise_exception then if SQLERRM like 'TEST:%' then raise;end if;end;
end $$;
reset role;
rollback;
select 'Club onboarding, rename, member invitation, email binding, idempotency, revocation and permissions passed; transaction rolled back' as result;
