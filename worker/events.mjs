import {cloudContext,cloudQuery,upstreamDetail} from './storage.mjs';
import {isUuid,isoInstant,validEventInput,validResponse} from '../shared/events.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const sameOrigin=request=>request.headers.get('origin')===new URL(request.url).origin;
async function body(request,limit=8000){
 const raw=await request.text();
 if(raw.length>limit){const error=Error('Anfrage zu groß.');error.status=413;throw error}
 if(!raw)return {};
 const value=JSON.parse(raw);
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Ungültige Anfrage.');
 return value;
}
const EVENT_FIELDS='id,workspace_id,team_id,created_by,kind,title,starts_at,ends_at,meet_at,location,notes,response_deadline,cancelled_at,created_at,updated_at,training_plan_id';
const DAY=86400000;
const uuidPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

async function eventRows(ctx,{eventId,from,to}){
 const filters=['workspace_id=eq.'+ctx.workspaceId];
 if(eventId)filters.push('id=eq.'+eventId);
 else{
  filters.push('starts_at=gte.'+encodeURIComponent(from));
  filters.push('starts_at=lte.'+encodeURIComponent(to));
 }
 return cloudQuery(ctx,'events?'+filters.join('&')+'&select='+EVENT_FIELDS+'&order=starts_at.asc&limit=500');
}
async function responseRows(ctx,ids){
 const rows=[];
 for(let i=0;i<ids.length;i+=40){
  const chunk=ids.slice(i,i+40);
  rows.push(...await cloudQuery(ctx,'event_responses?event_id=in.('+chunk.join(',')+')&select=event_id,user_id,status,note,updated_at'));
 }
 return rows;
}

// Der Planbezug ist persönlich. Die Sichtbarkeit folgt deshalb nicht der
// Termin-Sichtbarkeit: Nur der Eigentümer erfährt davon.
async function ownPlanTitles(ctx,ids){
 const unique=[...new Set(ids.filter(Boolean))];
 const titles=new Map();
 for(let i=0;i<unique.length;i+=40){
  const chunk=unique.slice(i,i+40);
  const rows=await cloudQuery(ctx,'training_plans?id=in.('+chunk.join(',')+')&select=id,payload');
  for(const row of rows)titles.set(row.id,typeof row.payload?.plan?.title==='string'?row.payload.plan.title:'Eigene Einheit');
 }
 return titles;
}

// Prüft, ob der Plan dem Aufrufer gehört und zum Verein passt. Die Datenbank
// erzwingt dasselbe; hier entsteht nur eine verständliche Meldung.
async function ownPlan(ctx,planId){
 if(planId===null)return null;
 if(!uuidPattern.test(planId))return undefined;
 const rows=await cloudQuery(ctx,'training_plans?id=eq.'+planId+'&workspace_id=eq.'+ctx.workspaceId+'&select=id');
 return rows.length?planId:undefined;
}
async function load(ctx,options){
 const rows=await eventRows(ctx,options);
 if(!rows.length)return [];
 const [teams,roster,responses,plans]=await Promise.all([
  cloudQuery(ctx,'teams?workspace_id=eq.'+ctx.workspaceId+'&select=id,name'),
  cloudQuery(ctx,'rpc/workspace_roster','POST',{wid:ctx.workspaceId}),
  responseRows(ctx,rows.map(r=>r.id)),
  ownPlanTitles(ctx,rows.map(r=>r.training_plan_id)),
 ]);
 const teamName=new Map(teams.map(t=>[t.id,t.name]));
 const byTeam=new Map(),names=new Map();
 for(const person of roster||[]){
  if(!byTeam.has(person.team_id))byTeam.set(person.team_id,[]);
  byTeam.get(person.team_id).push(person);
  names.set(person.team_id+':'+person.user_id,person.name);
 }
 const byEvent=new Map();
 for(const response of responses){
  if(!byEvent.has(response.event_id))byEvent.set(response.event_id,[]);
  byEvent.get(response.event_id).push(response);
 }
 const isAdmin=['owner','admin'].includes(ctx.role);
 return rows.map(row=>{
  const group=byTeam.get(row.team_id)||[], answered=byEvent.get(row.id)||[];
  const summary={accepted:0,declined:0,maybe:0};
  for(const response of answered)if(response.status in summary)summary[response.status]++;
  const responded=new Set(answered.map(r=>r.user_id));
  summary.open=group.filter(person=>!responded.has(person.user_id)).length;
  summary.total=group.length;
  const mine=answered.find(r=>r.user_id===ctx.user.id)||null;
  const rosterRole=group.find(person=>person.user_id===ctx.user.id);
  // Verwalten darf, wer Administrator ist oder diese Mannschaft betreut.
  const canManage=isAdmin||rosterRole?.team_role==='coach';
  return {
   id:row.id,teamId:row.team_id,teamName:teamName.get(row.team_id)||'Mannschaft',
   kind:row.kind,title:row.title,startsAt:row.starts_at,endsAt:row.ends_at,meetAt:row.meet_at,
   location:row.location,notes:row.notes,responseDeadline:row.response_deadline,cancelledAt:row.cancelled_at,
   createdAt:row.created_at,updatedAt:row.updated_at,canManage,
   // Nur sichtbar, wenn der Plan dem Aufrufer gehört; für andere bleibt das Feld leer.
   myTrainingPlan:row.training_plan_id&&plans.has(row.training_plan_id)?{id:row.training_plan_id,title:plans.get(row.training_plan_id)}:null,
   myUserId:ctx.user.id,
   myTeamRole:rosterRole?rosterRole.team_role:null,
   myResponse:mine?{status:mine.status,note:mine.note,updatedAt:mine.updated_at}:null,
   summary,
   roster:group.map(person=>({userId:person.user_id,name:person.name,teamRole:person.team_role})),
   responses:answered
    .map(r=>({userId:r.user_id,name:names.get(row.team_id+':'+r.user_id)||'Mitglied',status:r.status,note:r.note,updatedAt:r.updated_at}))
    .sort((a,b)=>a.name.localeCompare(b.name,'de')),
  };
 });
}

export async function eventsApi(request){
 try{
  const url=new URL(request.url),path=url.pathname;
  const ctx=await cloudContext(request);
  if(request.method==='GET'){
   if(path==='/api/events'){
    const now=Date.now();
    const from=url.searchParams.has('from')?isoInstant(url.searchParams.get('from')):new Date(now-90*DAY).toISOString();
    const to=url.searchParams.has('to')?isoInstant(url.searchParams.get('to')):new Date(now+365*DAY).toISOString();
    if(!from||!to||Date.parse(from)>=Date.parse(to))return json({error:'Ungültiger Zeitraum.'},400);
    if(Date.parse(to)-Date.parse(from)>2*366*DAY)return json({error:'Zeitraum höchstens zwei Jahre.'},400);
    // Anlegen dürfen Administratoren und Trainer mit mindestens einer eigenen Mannschaft.
    const coached=ctx.role==='player'?[]:await cloudQuery(ctx,'team_members?user_id=eq.'+ctx.user.id+'&role=eq.coach&select=team_id');
    const canManage=['owner','admin'].includes(ctx.role)||coached.length>0;
    return json({role:ctx.role,canManage,events:await load(ctx,{from,to})});
   }
   if(path==='/api/events/attendance'){
    const eventId=url.searchParams.get('eventId');
    if(!isUuid(eventId))return json({error:'Ungültiger Termin.'},400);
    const events=await load(ctx,{eventId});
    if(!events.length)return json({error:'Termin nicht gefunden.'},404);
    return json({event:events[0]});
   }
   return json({error:'Nicht gefunden.'},404);
  }
  if(request.method!=='POST')return json({error:'Methode nicht erlaubt.'},405);
  if(!sameOrigin(request))return json({error:'Anfrage nicht erlaubt.'},403);

  if(path==='/api/events/respond'){
   const b=await body(request,2000);
   if(b.clear===true){
    if(!isUuid(b.eventId))return json({error:'Ungültiger Termin.'},400);
    await cloudQuery(ctx,'event_responses?event_id=eq.'+b.eventId+'&user_id=eq.'+ctx.user.id,'DELETE');
    return json({ok:true,response:null});
   }
   const input=validResponse(b);
   if(!input)return json({error:'Bitte gültige Rückmeldung wählen.'},400);
   const rows=await cloudQuery(ctx,'events?id=eq.'+input.eventId+'&workspace_id=eq.'+ctx.workspaceId+'&select=id,team_id,cancelled_at,starts_at,response_deadline');
   if(!rows.length)return json({error:'Termin nicht gefunden.'},404);
   const event=rows[0];
   if(event.cancelled_at)return json({error:'Dieser Termin wurde abgesagt.'},409);
   const deadline=event.response_deadline||event.starts_at;
   if(Date.now()>=Date.parse(deadline))return json({error:'Die Rückmeldefrist ist abgelaufen.'},409);
   const member=await cloudQuery(ctx,'team_members?team_id=eq.'+event.team_id+'&user_id=eq.'+ctx.user.id+'&select=user_id');
   if(!member.length)return json({error:'Nur Teilnehmende dieser Mannschaft können antworten.'},403);
   const updated=await cloudQuery(ctx,'event_responses?on_conflict=event_id,user_id','POST',{
    event_id:input.eventId,user_id:ctx.user.id,status:input.status,note:input.note,updated_at:new Date().toISOString(),
   },'resolution=merge-duplicates,return=representation');
   return json({ok:true,response:updated[0]||null});
  }

  if(ctx.role==='player')return json({error:'Nur Trainer können Termine verwalten.'},403);
  const b=await body(request);
  if(b.action==='create'){
   const input=validEventInput(b);
   if(!input)return json({error:'Bitte Titel, Mannschaft und Beginn prüfen.'},400);
   const planId=await ownPlan(ctx,b.trainingPlanId??null);
   if(planId===undefined)return json({error:'Trainingsplan nicht gefunden. Bitte eigene Einheit wählen.'},400);
   // Dieselbe Anfragekennung darf höchstens einen Termin anlegen. Nach einem
   // Zeitüberschreitungsfehler setzt der zweite Versuch sie fort, statt zu duplizieren.
   const requestId=b.requestId??null;
   if(requestId!==null&&!uuidPattern.test(requestId))return json({error:'Ungültige Anfragekennung.'},400);
   const rows=await cloudQuery(ctx,'events','POST',{
    workspace_id:ctx.workspaceId,team_id:input.teamId,created_by:ctx.user.id,kind:input.kind,title:input.title,
    starts_at:input.startsAt,ends_at:input.endsAt,meet_at:input.meetAt,location:input.location,notes:input.notes,
    response_deadline:input.responseDeadline,...(planId?{training_plan_id:planId}:{}),...(requestId?{client_request_id:requestId}:{}),
   },requestId?'resolution=ignore-duplicates,return=representation':undefined);
   if(rows.length)return json({event:{id:rows[0].id}});
   // Kein Ergebnis trotz Schreibversuch: die Kennung ist bereits vergeben. Der
   // vorhandene Termin wird zurückgegeben, damit ein Wiederholungsversuch
   // dieselbe Antwort erhält.
   if(requestId){
    const existing=await cloudQuery(ctx,'events?workspace_id=eq.'+ctx.workspaceId+'&client_request_id=eq.'+requestId+'&select=id');
    if(existing.length)return json({event:{id:existing[0].id}});
   }
   return json({error:'Der Termin konnte nicht angelegt werden. Bitte erneut versuchen.'},503);
  }
  if(b.action==='update'){
   if(!isUuid(b.id))return json({error:'Ungültiger Termin.'},400);
   const input=validEventInput(b);
   if(!input)return json({error:'Bitte Titel, Mannschaft und Beginn prüfen.'},400);
   const planId=await ownPlan(ctx,b.trainingPlanId??null);
   if(planId===undefined)return json({error:'Trainingsplan nicht gefunden. Bitte eigene Einheit wählen.'},400);
   // Ein Client ohne dieses Feld lässt den bestehenden Bezug unverändert.
   const planField=b.trainingPlanId===undefined?{}:{training_plan_id:planId};
   const rows=await cloudQuery(ctx,'events?id=eq.'+b.id+'&workspace_id=eq.'+ctx.workspaceId,'PATCH',{
    team_id:input.teamId,kind:input.kind,title:input.title,starts_at:input.startsAt,ends_at:input.endsAt,
    meet_at:input.meetAt,location:input.location,notes:input.notes,response_deadline:input.responseDeadline,
    ...planField,updated_at:new Date().toISOString(),
   });
   if(!rows.length)return json({error:'Termin nicht gefunden.'},404);
   return json({event:{id:rows[0].id}});
  }
  if(b.action==='cancel'){
   if(!isUuid(b.id)||typeof b.cancelled!=='boolean')return json({error:'Ungültige Absage.'},400);
   const rows=await cloudQuery(ctx,'events?id=eq.'+b.id+'&workspace_id=eq.'+ctx.workspaceId,'PATCH',{
    cancelled_at:b.cancelled?new Date().toISOString():null,updated_at:new Date().toISOString(),
   });
   if(!rows.length)return json({error:'Termin nicht gefunden.'},404);
   return json({ok:true});
  }
  if(b.action==='delete'){
   if(!isUuid(b.id))return json({error:'Ungültiger Termin.'},400);
   const rows=await cloudQuery(ctx,'events?id=eq.'+b.id+'&workspace_id=eq.'+ctx.workspaceId+'&select=id,created_by');
   if(!rows.length)return json({error:'Termin nicht gefunden.'},404);
   if(rows[0].created_by!==ctx.user.id&&!['owner','admin'].includes(ctx.role))return json({error:'Nur Ersteller oder Vereinsadministratoren können diesen Termin löschen.'},403);
   await cloudQuery(ctx,'events?id=eq.'+b.id+'&workspace_id=eq.'+ctx.workspaceId,'DELETE');
   return json({ok:true});
  }
  return json({error:'Unbekannte Aktion.'},400);
 }catch(e){
  if(e?.upstream)console.error('events_api_failed',JSON.stringify(e.upstream));
  const message=e.status===413?e.message:'Terminaktion nicht möglich. Bitte Berechtigung und Angaben prüfen.'+upstreamDetail(e);
  return json({error:message,...(e?.upstream?{upstream:e.upstream}:{})},e.status||403);
 }
}
