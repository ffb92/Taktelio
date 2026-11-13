begin;
-- Ephemeral test identities; the entire transaction is rolled back.
insert into auth.users(id,email,email_confirmed_at) values
('10000000-0000-4000-8000-000000000001','tenant-a@example.invalid',now()),
('10000000-0000-4000-8000-000000000002','tenant-b@example.invalid',now());
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.create_workspace('Isolation A');
insert into public.exercises(id,workspace_id,created_by,payload) select 'isolation-exercise',id,auth.uid(),'{"status":"unreviewed"}'::jsonb from public.workspaces where name='Isolation A';
insert into public.training_plans(workspace_id,created_by,payload) select id,auth.uid(),'{}'::jsonb from public.workspaces where name='Isolation A';
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.create_workspace('Isolation B');
do $$ begin
 if (select count(*) from public.workspaces)<>1 then raise exception 'Workspace isolation failed'; end if;
 if exists(select 1 from public.exercises where id='isolation-exercise') then raise exception 'Exercise isolation failed'; end if;
 if exists(select 1 from public.training_plans) then raise exception 'Plan isolation failed'; end if;
 if (select count(*) from public.exercises where workspace_id is null)<>30 then raise exception 'Global catalog missing'; end if;
 begin
  insert into public.workspaces(name,owner_id,tier) values('Forged Pro',auth.uid(),'pro');
  raise exception 'Tier escalation accepted';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.exercises(id,payload) values('forged-global','{}');
  raise exception 'Global catalog insertion accepted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
