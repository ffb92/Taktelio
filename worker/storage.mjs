import {verifiedUser,authToken} from './auth.mjs';
const DB_URL='https://iyhyibjmfzjuypgybnno.supabase.co';
const DB_KEY='sb_publishable_aGDtN2MZowyJdpQsS8qjrA_TN7SI_KN';
const dbJson=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function cloudContext(request,requireWorkspace=true){const user=await verifiedUser(request);if(!user)throw Error('Bitte anmelden.');const ctx={user,headers:{apikey:DB_KEY,Authorization:'Bearer '+authToken(request),'Content-Type':'application/json'}};if(!requireWorkspace)return ctx;const wid=request.headers.get('x-workspace-id');if(!/^[a-f0-9-]{36}$/.test(wid||''))throw Error('Bitte zuerst deinen Verein einrichten.');const rows=await cloudQuery(ctx,'memberships?workspace_id=eq.'+wid+'&user_id=eq.'+user.id+'&select=role');if(!rows.length)throw Error('Kein Zugriff auf diesen Verein.');ctx.workspaceId=wid;ctx.role=rows[0].role;return ctx}
export async function cloudQuery(ctx,path,method='GET',payload){const r=await fetch(DB_URL+'/rest/v1/'+path,{method,headers:{...ctx.headers,Prefer:'return=representation'},body:payload===undefined?undefined:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Daten konnten nicht geladen oder gespeichert werden.');return r.status===204?null:await r.json()}
export async function cloudCatalog(request){const ctx=await cloudContext(request);let result=[];for(let offset=0;offset<10000;offset+=500){const rows=await cloudQuery(ctx,'exercises?select=id,payload,workspace_id&or=(workspace_id.is.null,workspace_id.eq.'+ctx.workspaceId+')&order=id&limit=500&offset='+offset);result.push(...rows.map(x=>({...x.payload,id:x.id,scope:x.workspace_id?'workspace':'global'})));if(rows.length<500)break}return result}
export async function workspaceApi(request){try{const ctx=await cloudContext(request,false);if(request.method==='GET')return dbJson({workspaces:await cloudQuery(ctx,'workspaces?select=id,name,tier,owner_id&order=created_at')});if(request.method!=='POST')return dbJson({error:'Methode nicht erlaubt'},405);if(request.headers.get('origin')!==new URL(request.url).origin)return dbJson({error:'Anfrage nicht erlaubt'},403);const raw=await request.text();if(raw.length>1000)return dbJson({error:'Anfrage zu groß'},413);const b=JSON.parse(raw);if(typeof b.name!=='string'||b.name.trim().length<2||b.name.length>100)return dbJson({error:'Name: 2 bis 100 Zeichen'},400);const id=await cloudQuery(ctx,'rpc/create_workspace','POST',{workspace_name:b.name});return dbJson({id})}catch(e){return dbJson({error:e.message},403)}}
export function validExercise(e){return e&&typeof e.title==='string'&&e.title.length>0&&e.title.length<=200&&typeof e.topic==='string'&&typeof e.organization==='string'&&['Einstieg','Hauptteil','Spielform','Abschluss'].includes(e.phase)&&Number.isInteger(e.ageMin)&&e.ageMin>=5&&Number.isInteger(e.ageMax)&&e.ageMax>=e.ageMin&&e.ageMax<=18&&Number.isInteger(e.playersMin)&&e.playersMin>=1&&Number.isInteger(e.playersMax)&&e.playersMax>=e.playersMin&&e.playersMax<=40&&Number.isInteger(e.duration)&&e.duration>0&&e.duration<=120&&['fieldSize','materials','easier','harder'].every(k=>typeof e[k]==='string'&&e[k].length<=2000)&&['steps','coaching'].every(k=>Array.isArray(e[k])&&e[k].length>0&&e[k].length<=20&&e[k].every(s=>typeof s==='string'&&s.length<=2000))}
export async function storageApi(request){try{const ctx=await cloudContext(request);if(request.method==='GET'){const url=new URL(request.url),offset=Math.max(0,Math.min(100000,Number(url.searchParams.get('offset'))||0));const rows=await cloudQuery(ctx,'training_plans?workspace_id=eq.'+ctx.workspaceId+'&select=id,payload,created_at&order=created_at.desc&limit=50&offset='+offset);return dbJson({records:rows,nextOffset:rows.length===50?offset+50:null})}if(request.method!=='POST')return dbJson({error:'Methode nicht erlaubt'},405);if(request.headers.get('origin')!==new URL(request.url).origin)return dbJson({error:'Anfrage nicht erlaubt'},403);const raw=await request.text();if(raw.length>100000)return dbJson({error:'Einheit zu groß'},413);const b=JSON.parse(raw);if(b.action==='save'){if(!b.payload?.plan?.blocks?.length||typeof b.payload.plan.title!=='string'||!b.payload.criteria)return dbJson({error:'Ungültige Einheit'},400);const rows=await cloudQuery(ctx,'training_plans','POST',{workspace_id:ctx.workspaceId,created_by:ctx.user.id,payload:b.payload});return dbJson({record:rows[0]})}if(b.action==='delete'){if(!/^[a-f0-9-]{36}$/.test(b.id||''))return dbJson({error:'Ungültige ID'},400);await cloudQuery(ctx,'training_plans?id=eq.'+b.id+'&workspace_id=eq.'+ctx.workspaceId,'DELETE');return dbJson({ok:true})}if(b.action==='adopt'){const e=b.payload;if(!validExercise(e))return dbJson({error:'Ungültige Übung'},400);const fingerprint=JSON.stringify([ctx.workspaceId,e.title,e.steps,e.organization]);const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint)))).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,24);const id='ex-'+digest;const existing=await cloudQuery(ctx,'exercises?id=eq.'+id+'&select=payload');if(existing.length)return dbJson({exercise:existing[0].payload,existing:true});const payload={...e,id,version:1,status:'unreviewed',origin:'Eigener Übungsentwurf',createdAt:new Date().toISOString().slice(0,10)};await cloudQuery(ctx,'exercises','POST',{id,payload,workspace_id:ctx.workspaceId,created_by:ctx.user.id});return dbJson({exercise:payload})}return dbJson({error:'Ungültige Aktion'},400)}catch(e){return dbJson({error:e.message||'Speichern fehlgeschlagen'},403)}}

export async function clubApi(request){
 try{
  const path=new URL(request.url).pathname;
  if(request.method!=='GET'&&request.method!=='POST')return dbJson({error:'Methode nicht erlaubt'},405);
  if(request.method==='POST'&&request.headers.get('origin')!==new URL(request.url).origin)return dbJson({error:'Anfrage nicht erlaubt'},403);
  let b={};if(request.method==='POST'){const raw=await request.text();if(raw.length>3000)return dbJson({error:'Anfrage zu groß'},413);b=JSON.parse(raw)}
  if(path==='/api/club/accept'&&request.method==='POST'){
   if(typeof b.token!=='string'||!/^[a-f0-9-]{72}$/.test(b.token))return dbJson({error:'Ungültiger Einladungslink.'},400);
   const ctx=await cloudContext(request,false);
   try{const id=await cloudQuery(ctx,'rpc/accept_club_invitation','POST',{invite_token:b.token});return dbJson({id})}catch{return dbJson({error:'Einladung abgelaufen, widerrufen oder für eine andere E-Mail-Adresse bestimmt. Bitte mit der eingeladenen Adresse anmelden.'},403)}
  }
  const ctx=await cloudContext(request),admin=['owner','admin'].includes(ctx.role);
  if(request.method==='GET'&&path==='/api/club'){
   const clubs=await cloudQuery(ctx,'workspaces?id=eq.'+ctx.workspaceId+'&select=id,name,tier');
   const [members,invitations]=admin?await Promise.all([cloudQuery(ctx,'rpc/club_members','POST',{wid:ctx.workspaceId}),cloudQuery(ctx,'club_invitations?workspace_id=eq.'+ctx.workspaceId+'&select=id,email,created_at,expires_at,accepted_at,revoked_at&order=created_at.desc&limit=100')]):[[],[]];
   return dbJson({club:clubs[0],role:ctx.role,members,invitations});
  }
  if(!admin)return dbJson({error:'Nur Vereinsadministratoren können den Verein bearbeiten und Mitglieder einladen.'},403);
  if(path==='/api/club'&&request.method==='POST'){
   if(typeof b.name!=='string'||b.name.trim().length<2||b.name.length>100)return dbJson({error:'Vereinsname: 2 bis 100 Zeichen.'},400);
   const rows=await cloudQuery(ctx,'workspaces?id=eq.'+ctx.workspaceId,'PATCH',{name:b.name.trim()});if(!rows.length)throw Error('Änderung nicht erlaubt');return dbJson({club:rows[0]});
  }
  if(path==='/api/club/invite'&&request.method==='POST'){
   if(typeof b.email!=='string'||b.email.length>254||!b.email.includes('@'))return dbJson({error:'Bitte gültige E-Mail eingeben.'},400);
   const data=await cloudQuery(ctx,'rpc/create_club_invitation','POST',{wid:ctx.workspaceId,invite_email:b.email});
   return dbJson({id:data.id,email:data.email,url:new URL(request.url).origin+'/?invite='+encodeURIComponent(data.token)});
  }
  if(path==='/api/club/revoke'&&request.method==='POST'){
   if(!/^[a-f0-9-]{36}$/.test(b.id||''))return dbJson({error:'Ungültige Einladung.'},400);
   await cloudQuery(ctx,'rpc/revoke_club_invitation','POST',{invite_id:b.id});return dbJson({ok:true});
  }
  return dbJson({error:'Nicht gefunden'},404);
 }catch{return dbJson({error:'Aktion nicht möglich. Bitte Berechtigung und Angaben prüfen. Eventuell ist die Person bereits Mitglied.'},403)}
}
