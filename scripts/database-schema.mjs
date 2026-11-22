import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root=new URL('../',import.meta.url);
const sqlLiteral=value=>"'"+JSON.stringify(value).replaceAll("'","''")+"'::jsonb";

// A fresh-install snapshot assembled from the original SQL, not a migration
// for an existing project. Historical migration files remain unchanged.
export async function freshDatabaseSql(){
 const foundation=await readFile(new URL('db/workspace-foundation.sql',root),'utf8');
 const legacyCopy='insert into public.exercises(id,payload) select id,payload from public.sc27_exercises where created_by is null;';
 if(!foundation.includes(legacyCopy))throw Error('Foundation changed: review fresh-install assembly.');
 const files=[
  'db/workspace-grants.sql',
  'db/workspace-owner-constraint.sql',
  'db/club-profile-invitations.sql',
  'db/club-members-fix.sql',
  'supabase/migrations/20261113074651_ai_usage_limits.sql',
  'supabase/migrations/20261114162537_authenticated_invitation_preview.sql',
  'supabase/migrations/20261114183347_invitation_names_and_public_preview.sql',
  'supabase/migrations/20261114203043_raise_ai_pilot_limits.sql',
  'supabase/migrations/20261115120000_training_plan_updates.sql',
  'supabase/migrations/20261115130000_teams_events_attendance.sql',
  'supabase/migrations/20261115150000_event_write_privileges.sql',
  'supabase/migrations/20261122170000_team_coach_scope.sql',
  'supabase/migrations/20261122180000_event_idempotency.sql',
  'supabase/migrations/20261122190000_event_training_plan.sql',
 ];
 const fragments=await Promise.all(files.map(async file=>'-- '+file+'\n'+await readFile(new URL(file,root),'utf8')));
 const exercises=JSON.parse(await readFile(new URL('data/exercises.json',root),'utf8'));
 const seed=exercises.map(e=>`insert into public.exercises(id,payload) values('${e.id.replaceAll("'","''")}',${sqlLiteral(e)});`).join('\n');
 return `-- Fresh Supabase database only. Never apply to an existing application database.
begin;
do $$ begin
 if to_regclass('auth.users') is null then raise exception 'Supabase Auth schema required'; end if;
 if exists(select 1 from pg_tables where schemaname='public') then
  raise exception 'Fresh-install schema requires an empty public schema';
 end if;
end $$;
${foundation.replace(legacyCopy,'-- Legacy catalog copy omitted; seed comes from data/exercises.json.')}
${fragments.join('\n')}
${seed}
commit;
`;
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))process.stdout.write(await freshDatabaseSql());
