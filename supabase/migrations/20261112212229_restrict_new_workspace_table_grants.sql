-- taktelio:pre-cli migration
-- Applied manually before this repository adopted the Supabase CLI. Reconstructed from
-- supabase_migrations.schema_migrations. The fresh-install assembly uses db/*.sql instead.

revoke all on public.workspaces,public.memberships,public.exercises,public.training_plans from anon,authenticated; grant select on public.workspaces,public.memberships,public.exercises,public.training_plans to authenticated; grant insert(name,owner_id) on public.workspaces to authenticated; grant insert on public.memberships,public.exercises,public.training_plans to authenticated; grant delete on public.training_plans to authenticated;

