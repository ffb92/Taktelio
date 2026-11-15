-- Saving an existing unit updates its row instead of inserting a duplicate.
alter table public.training_plans add column updated_at timestamptz not null default now();
-- The timestamp is server-controlled so a client cannot hide an edit by backdating it.
create function private.touch_training_plan() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at:=now(); return new; end $$;
create trigger training_plan_touch before update on public.training_plans for each row execute function private.touch_training_plan();
-- The list is ordered by latest edit.
create index plans_workspace_owner_updated on public.training_plans(workspace_id,created_by,updated_at desc);
-- Column level grant: a client may change content, never tenant, owner or timestamps.
grant update(payload) on public.training_plans to authenticated;
create policy plan_update on public.training_plans for update to authenticated
 using(created_by=(select auth.uid()) and workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid())))
 with check(created_by=(select auth.uid()) and workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid())));
