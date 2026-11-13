create table public.workspaces (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100),
 owner_id uuid not null references auth.users(id), tier text not null default 'starter' check(tier in ('starter','pro')),
 created_at timestamptz not null default now()
);
create table public.memberships (
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin','trainer')), primary key(workspace_id,user_id)
);
create index memberships_user on public.memberships(user_id);
create table public.exercises (
 id text primary key, workspace_id uuid references public.workspaces(id), created_by uuid references auth.users(id),
 payload jsonb not null check(jsonb_typeof(payload)='object'), created_at timestamptz not null default now(),
 check(workspace_id is null or created_by is not null)
);
create index exercises_workspace on public.exercises(workspace_id);
create table public.training_plans (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 created_by uuid not null references auth.users(id), payload jsonb not null check(jsonb_typeof(payload)='object'),
 created_at timestamptz not null default now()
);
create index plans_workspace_owner on public.training_plans(workspace_id,created_by,created_at desc);
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.exercises enable row level security;
alter table public.training_plans enable row level security;
grant select on public.workspaces,public.memberships,public.exercises,public.training_plans to authenticated;
grant insert(name,owner_id) on public.workspaces to authenticated;
grant insert on public.memberships,public.exercises,public.training_plans to authenticated;
grant delete on public.training_plans to authenticated;
create policy own_membership on public.memberships for select to authenticated using(user_id=(select auth.uid()));
create policy workspace_read on public.workspaces for select to authenticated using(owner_id=(select auth.uid()) or id in(select workspace_id from public.memberships where user_id=(select auth.uid())));
create policy workspace_create on public.workspaces for insert to authenticated with check(owner_id=(select auth.uid()));
create policy owner_membership_create on public.memberships for insert to authenticated with check(user_id=(select auth.uid()) and role='owner' and workspace_id in(select id from public.workspaces where owner_id=(select auth.uid())));
create policy catalog_read on public.exercises for select to authenticated using(workspace_id is null or workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid())));
create policy draft_create on public.exercises for insert to authenticated with check(created_by=(select auth.uid()) and workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid())) and payload->>'status'='unreviewed');
create policy plan_read on public.training_plans for select to authenticated using(created_by=(select auth.uid()) and workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid())));
create policy plan_create on public.training_plans for insert to authenticated with check(created_by=(select auth.uid()) and workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid())));
create policy plan_delete on public.training_plans for delete to authenticated using(created_by=(select auth.uid()) and workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid())));
create function public.create_workspace(workspace_name text) returns uuid language plpgsql security invoker set search_path='' as $$
declare wid uuid;
begin
 if auth.uid() is null then raise exception 'Login erforderlich'; end if;
 insert into public.workspaces(name,owner_id) values(trim(workspace_name),auth.uid()) returning id into wid;
 insert into public.memberships(workspace_id,user_id,role) values(wid,auth.uid(),'owner');
 return wid;
end; $$;
revoke all on function public.create_workspace(text) from public,anon;
grant execute on function public.create_workspace(text) to authenticated;
insert into public.exercises(id,payload) select id,payload from public.sc27_exercises where created_by is null;

