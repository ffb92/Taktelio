begin;
insert into auth.users(id,email,email_confirmed_at) values
('40000000-0000-4000-8000-000000000001','owner-a@example.invalid',now()),
('40000000-0000-4000-8000-000000000002','owner-b@example.invalid',now()),
('40000000-0000-4000-8000-000000000003','trainer-a@example.invalid',now());
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000001"}',true);
set local role authenticated;
select set_config('test.club_a',public.create_workspace('Club A')::text,true);
insert into public.training_plans(workspace_id,created_by,payload)
 values(current_setting('test.club_a')::uuid,auth.uid(),'{"plan":{"title":"Private A"}}');
do $$ declare changed integer; before timestamptz; begin
 -- The owner updates their own unit in place instead of saving a second copy.
 select updated_at into before from public.training_plans where workspace_id=current_setting('test.club_a')::uuid;
 update public.training_plans set payload='{"plan":{"title":"Private A, revised"}}'
  where workspace_id=current_setting('test.club_a')::uuid;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Owner could not update own plan'; end if;
 if not exists(select 1 from public.training_plans
  where workspace_id=current_setting('test.club_a')::uuid and updated_at>=before) then
  raise exception 'Update timestamp not advanced'; end if;
 begin
  update public.training_plans set created_by=auth.uid() where workspace_id=current_setting('test.club_a')::uuid;
  if found then raise exception 'TEST: ownership column writable'; end if;
 exception when insufficient_privilege then null; end;
 begin
  update public.training_plans set updated_at='2000-01-01' where workspace_id=current_setting('test.club_a')::uuid;
  if found then raise exception 'TEST: timestamp column writable'; end if;
 exception when insufficient_privilege then null; end;
end $$;
insert into public.exercises(id,workspace_id,created_by,payload)
 values('private-exercise-a',current_setting('test.club_a')::uuid,auth.uid(),'{"status":"unreviewed"}');
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000002"}',true);
select set_config('test.club_b',public.create_workspace('Club B')::text,true);
do $$ declare changed integer; begin
 if exists(select 1 from public.workspaces where id=current_setting('test.club_a')::uuid) then raise exception 'Tenant workspace leaked'; end if;
 if exists(select 1 from public.training_plans where workspace_id=current_setting('test.club_a')::uuid) then raise exception 'Tenant plans leaked'; end if;
 if exists(select 1 from public.exercises where id='private-exercise-a') then raise exception 'Tenant exercise leaked'; end if;
 delete from public.training_plans where workspace_id=current_setting('test.club_a')::uuid;
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Tenant plans deleted'; end if;
 update public.training_plans set payload='{"plan":{"title":"Hijacked"}}' where workspace_id=current_setting('test.club_a')::uuid;
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Tenant plans updated'; end if;
 begin
  insert into public.training_plans(workspace_id,created_by,payload) values(current_setting('test.club_a')::uuid,auth.uid(),'{}');
  raise exception 'TEST: cross-tenant write allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.memberships(workspace_id,user_id,role) values(current_setting('test.club_a')::uuid,auth.uid(),'owner');
  raise exception 'TEST: ownership forged';
 exception when foreign_key_violation or insufficient_privilege then null; end;
 begin
  insert into public.exercises(id,payload) values('forged-global','{"status":"unreviewed"}');
  raise exception 'TEST: global catalog write allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into public.memberships(workspace_id,user_id,role)
 values(current_setting('test.club_a')::uuid,'40000000-0000-4000-8000-000000000003','trainer');
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000003"}',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.training_plans where workspace_id=current_setting('test.club_a')::uuid) then raise exception 'Other trainer private plan leaked'; end if;
 if not exists(select 1 from public.exercises where id='private-exercise-a') then raise exception 'Club exercise inaccessible'; end if;
 if not exists(select 1 from public.exercises where workspace_id is null) then raise exception 'Global catalog inaccessible'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform * from public.training_plans;raise exception 'TEST: anonymous plans access';exception when insufficient_privilege then null;end;
 begin update public.training_plans set payload='{}';raise exception 'TEST: anonymous plans update';exception when insufficient_privilege then null;end;
 begin perform * from public.memberships;raise exception 'TEST: anonymous membership access';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
