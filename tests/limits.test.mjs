import {test} from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../worker/api.mjs';
import {usageCost} from '../worker/limits.mjs';
const wid='11111111-1111-4111-8111-111111111111';
const criteria={age:'U11',players:12,minutes:60,goal:'Passspiel',material:'Bälle',space:'Platz',notes:''};
const req=(id=crypto.randomUUID())=>new Request('https://example.com/api/plan',{method:'POST',headers:{origin:'https://example.com',cookie:'__Host-trainer-access=token','x-workspace-id':wid,'oai-authenticated-user-id':'test'},body:JSON.stringify({requestId:id,criteria,change:'',mode:'new'})});
const env={OPENAI_API_KEY:'mock',AI_MODEL:'gpt-4.1-mini',AI_LIMIT_SECRET:'test-only'};
test('micro-dollar cost is conservative; malformed usage stays unknown',()=>{assert.deepEqual(usageCost({input_tokens:1000,output_tokens:2000}),{cost_microusd:3600,input_tokens:1000,output_tokens:2000});assert.equal(usageCost({input_tokens:-1,output_tokens:0}),null);assert.equal(usageCost(null),null)});
test('quota, concurrent, budget, rate and replay requests never invoke provider; timeout settles unknown',async()=>{
 const old=fetch;let code='quota',calls=0,settlements=[];
 globalThis.fetch=async(url,init)=>{
  if(url.includes('/auth/v1/user'))return Response.json({id:'user-a',email_confirmed_at:'2026-01-01'});
  if(url.includes('/memberships'))return Response.json([{role:'owner'}]);
  if(url.includes('/exercises'))return Response.json([]);
  if(url.includes('/rpc/ai_gate')){const b=JSON.parse(init.body);assert.equal(b.gate_secret,'test-only');if(b.action==='finish'){settlements.push(b.details);return Response.json({code:'settled'})}return Response.json({code,result:{title:'cached'}})}
  calls++;throw Error('simulated network timeout');
 };
 try{
  for(code of ['quota','running','budget','rate'])assert.equal((await api(req(),env)).status,429);
  code='replay';assert.deepEqual(await (await api(req(),env)).json(),{title:'cached'});assert.equal(calls,0);
  code='reserved';assert.equal((await api(req(),{...env,AI_LIMIT_SECRET:undefined})).status,503);assert.equal(calls,0);
  assert.equal((await api(req(),env)).status,502);assert.equal(calls,1);assert.equal(settlements[0].outcome,'unknown');assert.equal(settlements[0].cost_microusd,undefined);
 }finally{globalThis.fetch=old}
});
test('status exposes quota and reset; database outage fails closed',async()=>{
 const old=fetch; let outage=false,providerCalls=0;
 globalThis.fetch=async(url)=>{
  if(url.includes('/auth/v1/user'))return Response.json({id:'user-a',email_confirmed_at:'2026-01-01'});
  if(url.includes('/memberships'))return Response.json([{role:'owner'}]);
  if(url.includes('/exercises'))return Response.json([]);
  if(url.includes('/rpc/ai_gate')){if(outage)throw Error('database unavailable');return Response.json({code:'ok',used:10,limit:10,reserved:0,reset_at:'2026-12-01T00:00:00Z',available:false,reason:'quota'})}
  providerCalls++;throw Error('unexpected provider');
 };
 try{
  const request=new Request('https://example.com/api/status',{headers:{cookie:'__Host-trainer-access=token','x-workspace-id':wid}});
  const status=await (await api(request,env)).json();assert.equal(status.ready,false);assert.equal(status.quota.used,10);assert.match(status.message,/1.12.2026/);
  outage=true;assert.equal((await api(req(),env)).status,503);assert.equal(providerCalls,0);
 }finally{globalThis.fetch=old}
});
test('successful and invalid results settle measured cost; settlement failure is retryable',async()=>{
 const old=fetch;let invalid=false,settlementFails=false,details;
 const block={sourceExerciseId:'',title:'Spiel',phase:'Hauptteil',minutes:30,groups:[6,6],organization:'Zwei Felder',materials:'Bälle',fieldSize:'20 x 20',steps:['Spielen'],coaching:['Anbieten'],easier:'Mehr Raum',harder:'Weniger Raum',diagram:{caption:'Gruppe',objects:[],arrows:[]}};
 globalThis.fetch=async(url,init)=>{
  if(url.includes('/auth/v1/user'))return Response.json({id:'user-a',email_confirmed_at:'2026-01-01'});
  if(url.includes('/memberships'))return Response.json([{role:'owner'}]);
  if(url.includes('/exercises'))return Response.json([]);
  if(url.includes('/rpc/ai_gate')){const b=JSON.parse(init.body);if(b.action==='finish'){details=b.details;if(settlementFails)throw Error('lost settlement response');return Response.json({code:'settled'})}return Response.json({code:'reserved'})}
  assert.equal(JSON.parse(init.body).service_tier,'default');
  return Response.json({status:'completed',usage:{input_tokens:1000,output_tokens:2000},output:[{content:[{type:'output_text',text:JSON.stringify({title:'Training',summary:'Passspiel',blocks:[block,{...block,minutes:invalid?20:30}]})}]}]});
 };
 try{
  assert.equal((await api(req(),env)).status,200);assert.equal(details.outcome,'succeeded');assert.equal(details.cost_microusd,3600);assert.equal(details.result.plan.title,'Training');
  invalid=true;assert.equal((await api(req(),env)).status,422);assert.equal(details.outcome,'failed');assert.equal(details.cost_microusd,7200);
  invalid=false;settlementFails=true;assert.equal((await api(req(),env)).status,503);
 }finally{globalThis.fetch=old}
});
