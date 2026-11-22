import {cloudContext,cloudQuery,upstreamDetail} from './storage.mjs';
import {isUuid,validTeamName} from '../shared/events.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const sameOrigin=request=>request.headers.get('origin')===new URL(request.url).origin;
async function body(request,limit=4000){
 const raw=await request.text();
 if(raw.length>limit){const error=Error('Anfrage zu groß.');error.status=413;throw error}
 if(!raw)return {};
 const value=JSON.parse(raw);
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Ungültige Anfrage.');
 return value;
}
const pickTeam=t=>({id:t.id,name:t.name});

export async function teamsApi(request){
 try{
  const url=new URL(request.url),path=url.pathname;
  const ctx=await cloudContext(request);
  if(request.method==='GET'){
   if(path==='/api/teams'){
    const teams=await cloudQuery(ctx,'teams?workspace_id=eq.'+ctx.workspaceId+'&select=id,name,created_at&order=name.asc');
    const ids=teams.map(t=>t.id);
    const members=ids.length?await cloudQuery(ctx,'team_members?team_id=in.('+ids.join(',')+')&select=team_id,user_id,role'):[];
    return json({role:ctx.role,canManage:ctx.role!=='player',teams:teams.map(t=>{
     const roster=members.filter(m=>m.team_id===t.id);
     const mine=roster.find(m=>m.user_id===ctx.user.id);
     return {...pickTeam(t),memberCount:roster.length,myRole:mine?mine.role:null};
    })});
   }
   if(path==='/api/teams/roster'){
    const teamId=url.searchParams.get('teamId');
    if(!isUuid(teamId))return json({error:'Ungültige Mannschaft.'},400);
    const rows=await cloudQuery(ctx,'rpc/workspace_roster','POST',{wid:ctx.workspaceId});
    return json({members:(rows||[]).filter(r=>r.team_id===teamId).map(r=>({userId:r.user_id,name:r.name,email:r.email,role:r.team_role}))});
   }
   return json({error:'Nicht gefunden.'},404);
  }
  if(request.method!=='POST')return json({error:'Methode nicht erlaubt.'},405);
  if(!sameOrigin(request))return json({error:'Anfrage nicht erlaubt.'},403);
  if(ctx.role==='player')return json({error:'Nur Trainer können Mannschaften verwalten.'},403);
  const b=await body(request);
  if(b.action==='create'){
   const name=validTeamName(b.name);
   if(!name)return json({error:'Mannschaftsname: 2 bis 80 Zeichen.'},400);
   const rows=await cloudQuery(ctx,'teams','POST',{workspace_id:ctx.workspaceId,name,created_by:ctx.user.id});
   // Wer eine Mannschaft anlegt, betreut sie auch. Administratoren sehen ohnehin
   // den ganzen Verein und brauchen keinen Eintrag.
   if(ctx.role==='trainer')await cloudQuery(ctx,'team_members','POST',{team_id:rows[0].id,user_id:ctx.user.id,role:'coach'});
   return json({team:pickTeam(rows[0])});
  }
  if(b.action==='rename'){
   const name=validTeamName(b.name);
   if(!isUuid(b.id)||!name)return json({error:'Bitte gültige Mannschaft und Namen angeben.'},400);
   const rows=await cloudQuery(ctx,'teams?id=eq.'+b.id+'&workspace_id=eq.'+ctx.workspaceId,'PATCH',{name});
   if(!rows.length)return json({error:'Mannschaft nicht gefunden.'},404);
   return json({team:pickTeam(rows[0])});
  }
  if(b.action==='delete'){
   if(!['owner','admin'].includes(ctx.role))return json({error:'Nur Vereinsadministratoren können Mannschaften löschen.'},403);
   if(!isUuid(b.id))return json({error:'Ungültige Mannschaft.'},400);
   await cloudQuery(ctx,'teams?id=eq.'+b.id+'&workspace_id=eq.'+ctx.workspaceId,'DELETE');
   return json({ok:true});
  }
  if(b.action==='addMember'||b.action==='removeMember'){
   if(!isUuid(b.teamId)||!isUuid(b.userId))return json({error:'Bitte Mannschaft und Person angeben.'},400);
   if(b.action==='addMember'){
    const role=b.role==='coach'?'coach':'player';
    // Trainer der Mannschaft fügen Spieler hinzu; Trainer einer Mannschaft
    // ernennt nur ein Vereinsadministrator.
    if(role==='coach'&&!['owner','admin'].includes(ctx.role))return json({error:'Nur Vereinsadministratoren können Trainer einer Mannschaft zuordnen.'},403);
    await cloudQuery(ctx,'team_members','POST',{team_id:b.teamId,user_id:b.userId,role});
   }else{
    await cloudQuery(ctx,'team_members?team_id=eq.'+b.teamId+'&user_id=eq.'+b.userId,'DELETE');
   }
   return json({ok:true});
  }
  return json({error:'Unbekannte Aktion.'},400);
 }catch(e){
  if(e?.upstream)console.error('teams_api_failed',JSON.stringify(e.upstream));
  return json({error:(e.status===413?e.message:'Mannschaftsaktion nicht möglich. Bitte Berechtigung und Angaben prüfen.')+upstreamDetail(e),...(e?.upstream?{upstream:e.upstream}:{})},e.status||403);
 }
}
