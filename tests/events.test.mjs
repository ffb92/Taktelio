import {test} from 'node:test';
import assert from 'node:assert/strict';
import {eventsApi} from '../worker/events.mjs';
import {teamsApi} from '../worker/teams.mjs';
import {validEventInput,validResponse} from '../shared/events.mjs';

const ws='11111111-1111-4111-8111-111111111111',teamId='22222222-2222-4222-8222-222222222222',eventId='44444444-4444-4444-8444-444444444444';
const base={teamId,kind:'training',title:'Abschlusstraining',startsAt:'2099-12-01T18:00:00.000Z',endsAt:null,meetAt:null,responseDeadline:null,location:'Sportplatz',notes:''};
const req=(path,body,{method='POST',origin='https://example.com',cookie='__Host-trainer-access=token'}={})=>new Request('https://example.com'+path,{method,headers:{origin,cookie,'x-workspace-id':ws,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body||{})}:{})});

// Simuliert die Supabase-REST-Aufrufe des Workers. Kein Netzwerk, keine echte Datenbank.
function stub({role='trainer',eventGet=[],eventPost=[{id:eventId}],eventPatch=[{id:eventId}],responsePost=[{event_id:eventId,user_id:'user-a',status:'accepted',note:'',updated_at:'2099-01-01T00:00:00Z'}],teamMembers=[],teamPost=[{id:'team-1',name:'U13'}],teamGet=[]}={}){
 const calls=[];
 globalThis.fetch=async(url,init={})=>{
  const target=String(url),method=init.method||'GET';
  let body=null;try{body=init.body?JSON.parse(init.body):null}catch{}
  calls.push({url:target,method,body,headers:init.headers||{}});
  if(target.includes('/auth/v1/user'))return Response.json({id:'user-a',email:'a@example.com',email_confirmed_at:'2026-01-01'});
  if(target.includes('/rest/v1/memberships'))return Response.json([{role}]);
  if(target.includes('/rest/v1/rpc/workspace_roster'))return Response.json(teamMembers);
  if(target.includes('/rest/v1/event_responses')){
   if(method==='DELETE')return Response.json(null);
   if(method==='GET')return Response.json([]);
   return Response.json(responsePost);
  }
  if(target.includes('/rest/v1/events')){
   if(method==='POST')return Response.json(eventPost);
   if(method==='PATCH')return Response.json(eventPatch);
   if(method==='DELETE')return Response.json(null);
   return Response.json(eventGet);
  }
  if(target.includes('/rest/v1/team_members')){
   if(method==='GET')return Response.json(teamMembers);
   return Response.json(null);
  }
  if(target.includes('/rest/v1/teams')){
   if(method==='POST')return Response.json(teamPost);
   if(method==='PATCH')return Response.json(teamPost);
   if(method==='DELETE')return Response.json(null);
   return Response.json(teamGet);
  }
  throw Error('Unexpected request: '+target);
 };
 return calls;
}
async function withStub(options,run){
 const original=globalThis.fetch;
 const calls=stub(options);
 try{return await run(calls)}finally{globalThis.fetch=original}
}

test('event input rejects impossible or oversized values and normalizes text',()=>{
 assert.ok(validEventInput(base));
 assert.equal(validEventInput({...base,endsAt:'2099-12-01T17:00:00.000Z'}),null);
 assert.equal(validEventInput({...base,meetAt:'2099-12-01T19:00:00.000Z'}),null);
 assert.equal(validEventInput({...base,responseDeadline:'2099-12-02T00:00:00.000Z'}),null);
 assert.equal(validEventInput({...base,kind:'party'}),null);
 assert.equal(validEventInput({...base,startsAt:'morgen'}),null);
 assert.equal(validEventInput({...base,notes:'x'.repeat(2001)}),null);
 assert.equal(validEventInput({...base,teamId:'not-a-team'}),null);
 assert.equal(validEventInput({...base,notes:'  Hinweis  '}).notes,'Hinweis');
 assert.equal(validResponse({eventId:'wrong',status:'accepted'}),null);
 assert.ok(validResponse({eventId:teamId,status:'accepted',note:'Komme später'}));
});

test('players cannot create, change or cancel events',async()=>withStub({role:'player'},async calls=>{
 const response=await eventsApi(req('/api/events',{action:'create',...base}));
 assert.equal(response.status,403);
 assert.ok(!calls.some(c=>c.method==='POST'&&c.url.includes('/rest/v1/events')));
}));

test('a foreign origin is rejected before any event write',async()=>withStub({role:'trainer'},async calls=>{
 const response=await eventsApi(req('/api/events',{action:'create',...base},{origin:'https://evil.example'}));
 assert.equal(response.status,403);
 assert.ok(!calls.some(c=>c.method==='POST'&&c.url.includes('/rest/v1/events')));
}));

test('coaches create events with tenant and creator derived from the session',async()=>withStub({role:'trainer'},async calls=>{
 const response=await eventsApi(req('/api/events',{action:'create',...base}));
 assert.equal(response.status,200);
 const write=calls.find(c=>c.method==='POST'&&c.url.endsWith('/rest/v1/events'));
 assert.equal(write.body.workspace_id,ws);
 assert.equal(write.body.created_by,'user-a');
 assert.equal(write.body.team_id,teamId);
 assert.equal(write.body.title,'Abschlusstraining');
}));

test('players respond only for themselves and the response is upserted',async()=>withStub({
 role:'player',
 eventGet:[{id:eventId,team_id:teamId,cancelled_at:null,starts_at:'2099-01-01T18:00:00Z',response_deadline:null}],
 teamMembers:[{team_id:teamId,user_id:'user-a',name:'Alex',team_role:'player'}],
},async calls=>{
 const response=await eventsApi(req('/api/events/respond',{eventId:eventId,status:'accepted',note:'Komme später'}));
 assert.equal(response.status,200);
 const write=calls.find(c=>c.method==='POST'&&c.url.includes('/rest/v1/event_responses'));
 assert.equal(write.body.user_id,'user-a');
 assert.equal(write.body.event_id,eventId);
 assert.equal(write.body.status,'accepted');
 assert.equal(write.body.note,'Komme später');
 assert.match(write.headers.Prefer,/merge-duplicates/);
}));

test('responses stop at the deadline and for cancelled events',async()=>withStub({
 role:'player',
 eventGet:[{id:eventId,team_id:teamId,cancelled_at:null,starts_at:'2020-01-01T18:00:00Z',response_deadline:null}],
 teamMembers:[{team_id:teamId,user_id:'user-a'}],
},async calls=>{
 assert.equal((await eventsApi(req('/api/events/respond',{eventId:eventId,status:'declined'}))).status,409);
 assert.ok(!calls.some(c=>c.method==='POST'&&c.url.includes('/rest/v1/event_responses')));
}));

test('members outside the team cannot respond for an event',async()=>withStub({
 role:'player',
 eventGet:[{id:eventId,team_id:teamId,cancelled_at:null,starts_at:'2099-01-01T18:00:00Z',response_deadline:null}],
 teamMembers:[],
},async calls=>{
 assert.equal((await eventsApi(req('/api/events/respond',{eventId:eventId,status:'accepted'}))).status,403);
 assert.ok(!calls.some(c=>c.method==='POST'&&c.url.includes('/rest/v1/event_responses')));
}));

test('team management is closed to players and scoped to the session workspace',async()=>{
 await withStub({role:'player'},async calls=>{
  assert.equal((await teamsApi(req('/api/teams',{action:'create',name:'U13'}))).status,403);
  assert.ok(!calls.some(c=>c.method==='POST'&&c.url.endsWith('/rest/v1/teams')));
 });
 await withStub({role:'trainer'},async calls=>{
  const response=await teamsApi(req('/api/teams',{action:'create',name:'U13'}));
  assert.equal(response.status,200);
  const write=calls.find(c=>c.method==='POST'&&c.url.endsWith('/rest/v1/teams'));
  assert.equal(write.body.workspace_id,ws);
  assert.equal(write.body.created_by,'user-a');
 });
});

test('a rejected database write names its cause instead of hiding it',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(url,init={})=>{
  const target=String(url);
  if(target.includes('/auth/v1/user'))return Response.json({id:'user-a',email:'a@example.com',email_confirmed_at:'2026-01-01'});
  if(target.includes('/rest/v1/memberships'))return Response.json([{role:'trainer'}]);
  if(target.includes('/rest/v1/events')&&(init.method||'GET')==='POST')return Response.json({code:'42501',message:'permission denied for table events'},{status:403});
  return Response.json([]);
 };
 try{
  const response=await eventsApi(req('/api/events',{action:'create',...base}));
  const data=await response.json();
  assert.equal(response.status,403);
  assert.match(data.error,/42501/);
  assert.equal(data.upstream.code,'42501');
 }finally{globalThis.fetch=original}
});

test('list view returns attendance counts and masks nothing beyond the roster',async()=>withStub({
 role:'player',
 eventGet:[{id:eventId,workspace_id:ws,team_id:teamId,created_by:'coach',kind:'training',title:'Training',starts_at:'2099-01-01T18:00:00Z',ends_at:null,meet_at:null,location:'',notes:'',response_deadline:null,cancelled_at:null,created_at:'2099-01-01T00:00:00Z',updated_at:'2099-01-01T00:00:00Z'}],
 teamMembers:[{team_id:teamId,user_id:'user-a',name:'Alex',email:null,team_role:'player'},{team_id:teamId,user_id:'user-b',name:'Bea',email:null,team_role:'player'}],
 teamGet:[{id:teamId,name:'U13'}],
},async calls=>{
 const response=await eventsApi(req('/api/events',undefined,{method:'GET'}));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.canManage,false);
 assert.equal(data.events[0].teamName,'U13');
 assert.equal(data.events[0].summary.total,2);
 assert.equal(data.events[0].summary.open,2);
 assert.equal(data.events[0].myUserId,'user-a');
 assert.deepEqual(data.events[0].roster.map(p=>p.name),['Alex','Bea']);
}));
