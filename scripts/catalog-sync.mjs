import {loadCatalog,validateCatalog,catalogVersion,stableStringify} from './catalog-lib.mjs';
import {supabaseConfig} from '../worker/config.mjs';

// Writes the reviewed catalog from data/exercises.json into public.exercises.
// Only rows without a workspace_id (the shared catalog) are touched.
// Default is a dry run; pass --apply to write changes and --prune to delete
// shared rows that no longer exist in the file.
const args=new Set(process.argv.slice(2));
const apply=args.has('--apply');
const prune=args.has('--prune');
if(prune&&!apply)throw Error('--prune benötigt --apply.');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if(!key)throw Error('SUPABASE_SERVICE_ROLE_KEY setzen (Service-Role-Key, nicht der Publishable Key).');
if(/publishable/i.test(key)||key.startsWith('sb_publishable_'))throw Error('Das ist der Publishable Key. Der Sync benötigt den Service-Role-Key.');
const {url}=supabaseConfig();
const headers={'apikey':key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};

async function rest(path,method='GET',body){
 const response=await fetch(`${url}/rest/v1/${path}`,{method,headers:{...headers,...(method==='GET'?{Prefer:'count=exact'}:{Prefer:'return=minimal'})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`${method} ${path} → ${response.status} ${(await response.text()).slice(0,300)}`);
 return response.status===204?null:response.json();
}

const catalog=await loadCatalog();
const problems=validateCatalog(catalog);
if(problems.length){
 for(const {id,message} of problems)console.error(`${id}: ${message}`);
 throw Error('Katalog ist ungültig. Nichts geschrieben.');
}

const existing=[];
for(let offset=0;;offset+=1000){
 const page=await rest(`exercises?select=id,payload&workspace_id=is.null&order=id&limit=1000&offset=${offset}`);
 existing.push(...page);
 if(page.length<1000)break;
}
const byId=new Map(existing.map(row=>[row.id,row.payload]));
const create=[],update=[];
for(const exercise of catalog){
 const current=byId.get(exercise.id);
 if(current===undefined)create.push({id:exercise.id,payload:exercise});
 else if(stableStringify(current)!==stableStringify(exercise))update.push({id:exercise.id,payload:exercise});
 byId.delete(exercise.id);
}
const stale=[...byId.keys()];
const unchanged=catalog.length-create.length-update.length;

console.log(`Katalogversion ${catalogVersion(catalog)} · ${catalog.length} Übungen`);
console.log(`neu: ${create.length} · geändert: ${update.length} · unverändert: ${unchanged} · nicht mehr im Katalog: ${stale.length}`);
for(const {id} of create)console.log(`  + ${id}`);
for(const {id} of update)console.log(`  ~ ${id}`);
if(prune)for(const id of stale)console.log(`  - ${id}`);

if(!apply){
 console.log('\nProbelauf. Nichts geschrieben. Mit --apply ausführen.');
 process.exit(0);
}
if(create.length)await rest('exercises','POST',create);
for(const {id,payload} of update)await rest(`exercises?id=eq.${encodeURIComponent(id)}&workspace_id=is.null`,'PATCH',{payload});
if(prune&&stale.length)await rest(`exercises?id=in.(${stale.map(encodeURIComponent).join(',')})&workspace_id=is.null`,'DELETE');
console.log(`\nGeschrieben: ${create.length} neu, ${update.length} aktualisiert${prune?`, ${stale.length} gelöscht`:''}.`);
