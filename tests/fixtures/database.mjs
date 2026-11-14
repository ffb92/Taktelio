import {PGlite} from '@electric-sql/pglite';
import {freshDatabaseSql} from '../../scripts/database-schema.mjs';

export async function testDatabase(){
 const db=await PGlite.create();
 try{
  // Test-only Auth adapter: SQL policies run in real Postgres with non-bypass
  // roles. HTTP Auth, JWT signatures and PostgREST are outside this fixture.
  await db.exec(`
   create role anon nologin;
   create role authenticated nologin;
   grant usage on schema public to anon,authenticated;
   create schema auth;
   create table auth.users (
    id uuid primary key, email text, email_confirmed_at timestamptz,
    raw_user_meta_data jsonb not null default '{}'::jsonb
   );
   create function auth.uid() returns uuid language sql stable as $$
    select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
   $$;
   grant usage on schema auth to anon,authenticated;
   grant execute on function auth.uid() to anon,authenticated;
  `);
  await db.exec(await freshDatabaseSql());
  return db;
 }catch(error){await db.close();throw error}
}
