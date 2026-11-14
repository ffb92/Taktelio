import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {testDatabase} from './fixtures/database.mjs';
import {freshDatabaseSql} from '../scripts/database-schema.mjs';

test('fresh database contains the catalog and refuses a second installation',async()=>{
 const db=await testDatabase();
 try{
  const {rows}=await db.query('select count(*)::int as count from public.exercises');
  assert.equal(rows[0].count,30);
  const {rows:tables}=await db.query("select tablename,rowsecurity from pg_tables where schemaname in ('public','private')");
  assert.ok(tables.length>=9);assert.ok(tables.every(t=>t.rowsecurity));
  await assert.rejects(db.exec(await freshDatabaseSql()),/empty public schema/);
 }finally{await db.close()}
});

test('fresh-install assembly accounts for every existing migration',async()=>{
 const sql=await freshDatabaseSql();
 const migrations=await readdir(new URL('../supabase/migrations/',import.meta.url));
 for(const file of migrations.filter(f=>f.endsWith('.sql'))){
  // Pre-CLI migrations are reconstructed for history alignment; db/*.sql represents them.
  const migration=await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8');
  if(migration.includes('-- taktelio:pre-cli'))continue;
  // Cleanup of absent prototype tables is intentionally unnecessary on a fresh install.
  if(file==='20261113130800_retire_legacy_club_tables.sql')continue;
  assert.ok(sql.includes('-- supabase/migrations/'+file),'Add migration to fresh-install assembly: '+file);
 }
});

for(const file of ['club-invitations.sql','ai-limits.sql','tenant-isolation.sql']){
 test('Postgres security regression: '+file,async()=>{
  const db=await testDatabase();
  try{await db.exec(await readFile(new URL(file,import.meta.url),'utf8'))}
  finally{await db.close()}
 });
}
