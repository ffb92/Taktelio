-- P6: optionaler persönlicher Planbezug am Termin.
--
-- Ein Trainer kann einen Termin mit einer eigenen gespeicherten Einheit
-- verknüpfen und sie von dort öffnen. Der Plan bleibt persönlich: Andere
-- Personen sehen die Verknüpfung nicht, auch nicht andere Trainer derselben
-- Mannschaft. Wird der Plan gelöscht, bleibt der Termin bestehen; die
-- Verknüpfung wird nur geleert.
--
-- Die Datenbank prüft das Eigentum selbst. Eine fremde Plan-ID kann so auch
-- über die API nicht gesetzt werden.

alter table public.events add column training_plan_id uuid
 references public.training_plans(id) on delete set null;
grant insert(training_plan_id) on public.events to authenticated;
grant update(training_plan_id) on public.events to authenticated;
create index events_training_plan on public.events(training_plan_id)
 where training_plan_id is not null;
-- Eine Einheit darf an mehreren Terminen hängen: dieselbe Einheit wird oft
-- mehrfach genutzt. Gelöscht wird sie an allen Terminen gemeinsam geleert.

create function private.check_event_plan() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.training_plan_id is null then return new; end if;
 if not exists(
  select 1 from public.training_plans p
  where p.id=new.training_plan_id
   and p.created_by=auth.uid()
   and p.workspace_id=new.workspace_id
 ) then
  raise exception 'Plan gehört nicht zu dieser Person und diesem Verein';
 end if;
 return new;
end $$;

create trigger event_plan_ownership before insert or update of training_plan_id on public.events
 for each row execute function private.check_event_plan();

revoke all on function private.check_event_plan() from public,anon;
