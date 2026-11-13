alter table public.workspaces add constraint workspace_owner_pair unique(id,owner_id);
alter table public.memberships add column owner_check uuid generated always as (case when role='owner' then user_id else null end) stored;
alter table public.memberships add constraint membership_owner_fk foreign key(workspace_id,owner_check) references public.workspaces(id,owner_id);
alter policy owner_membership_create on public.memberships with check(user_id=(select auth.uid()) and role='owner');
