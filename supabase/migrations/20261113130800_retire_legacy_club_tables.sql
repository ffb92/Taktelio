-- Retire unused prototype tables only when no unique data can be lost.
-- Existing migration files are historical records; do not rename their objects.
begin;
set local lock_timeout = '5s';
lock table public.sc27_members, public.sc27_plans, public.sc27_exercises in access exclusive mode;
lock table public.exercises in share mode;
do $$
begin
  if exists(select 1 from public.sc27_members) or exists(select 1 from public.sc27_plans) then
    raise exception 'Legacy members or plans are not empty; migrate them before cleanup';
  end if;
  if exists(
    select 1 from public.sc27_exercises old
    left join public.exercises current on current.id=old.id
    where old.created_by is not null or current.id is null
       or current.workspace_id is not null
       or current.payload is distinct from old.payload
  ) then
    raise exception 'Legacy exercises are not fully preserved in the shared catalog';
  end if;
end $$;
-- No CASCADE: unexpected external dependencies must abort the migration.
drop table public.sc27_exercises;
drop table public.sc27_plans;
drop table public.sc27_members;
commit;
