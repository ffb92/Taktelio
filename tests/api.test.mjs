import {test} from 'node:test';import assert from 'node:assert/strict';import {api,validatePlan} from '../worker/api.mjs';import {catalog} from '../worker/catalog.mjs';
const c={age:'U11',players:12,minutes:60,goal:'Passen',material:'Bälle',space:'Platz',notes:''};
const block={sourceExerciseId:'',title:'Spiel',phase:'Hauptteil',minutes:30,groups:[6,6],organization:'Zwei Felder',materials:'Bälle',fieldSize:'20 x 20',steps:['Spielen'],coaching:['Anbieten'],easier:'Mehr Raum',harder:'Weniger Raum',diagram:{caption:'Gruppe',objects:[],arrows:[]}};const plan={title:'Training',summary:'Passspiel',blocks:[block,block]};
const req=(body,extra={})=>new Request('https://example.com/api/plan',{method:'POST',headers:{origin:'https://example.com',cookie:'__Host-trainer-access=token','x-workspace-id':'11111111-1111-4111-8111-111111111111',...extra},body:JSON.stringify({requestId:crypto.randomUUID(),...body})});
test('validates duration and group totals',()=>{assert.ok(validatePlan(plan,c));assert.ok(!validatePlan(plan,{...c,minutes:75}));assert.ok(!validatePlan(plan,{...c,players:13}))});
test('requires real account even with platform header',async()=>assert.equal((await api(new Request('https://example.com/api/exercises',{headers:{'oai-authenticated-user-id':'test'}}),{})).status,401));
test('API checks origin, arguments, tenant and provider output without live calls',async()=>{const old=globalThis.fetch;let providerCalls=0,forged=false;try{globalThis.fetch=async(url,init)=>{if(url.includes('/auth/v1/user'))return Response.json({id:'user-a',email_confirmed_at:'2026-01-01'});if(url.includes('/memberships'))return Response.json([{role:'owner'}]);if(url.includes('/exercises'))return Response.json(catalog.map(e=>({id:e.id,payload:e,workspace_id:null})));if(url.includes('/rpc/ai_gate'))return Response.json({code:JSON.parse(init.body).action==='reserve'?'reserved':'settled'});assert.equal(url,'https://api.openai.com/v1/responses');providerCalls++;const prompt=JSON.parse(JSON.parse(init.body).input);assert.ok(prompt.catalog.length);return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(forged?{...plan,blocks:[{...block,sourceExerciseId:'invented'},block]}:plan)}]}]})};assert.equal((await api(req({criteria:c,change:''},{origin:'https://evil.example'}),{})).status,403);assert.equal((await api(req({criteria:{...c,players:100},change:''}),{})).status,400);assert.equal(providerCalls,0);const env={OPENAI_API_KEY:'mock',AI_MODEL:'gpt-4.1-mini',AI_LIMIT_SECRET:'mock'};assert.equal((await api(req({criteria:c,change:''}),env)).status,200);forged=true;assert.equal((await api(req({criteria:c,change:'',mode:'library'}),env)).status,422)}finally{globalThis.fetch=old}});

test('repairs invalid duration once and settles both provider costs in one reservation',async()=>{
 const old=globalThis.fetch;let calls=0,reserves=0,details;
 try{
  globalThis.fetch=async(url,init)=>{
   if(url.includes('/auth/v1/user'))return Response.json({id:'user-a',email_confirmed_at:'2026-01-01'});
   if(url.includes('/memberships'))return Response.json([{role:'owner'}]);
   if(url.includes('/exercises'))return Response.json(catalog.map(e=>({id:e.id,payload:e,workspace_id:null})));
   if(url.includes('/rpc/ai_gate')){const b=JSON.parse(init.body);if(b.action==='reserve')reserves++;else details=b.details;return Response.json({code:b.action==='reserve'?'reserved':'settled'})}
   calls++;const payload=JSON.parse(init.body);
   if(calls===2)assert.deepEqual(JSON.parse(payload.input).validationErrors,['duration']);
   return Response.json({status:'completed',usage:{input_tokens:1000,output_tokens:1000},output:[{content:[{type:'output_text',text:JSON.stringify(calls===1?{...plan,blocks:[{...block,minutes:20},block]}:plan)}]}]});
  };
  const response=await api(req({criteria:c,change:''}),{OPENAI_API_KEY:'mock',AI_MODEL:'gpt-4.1-mini',AI_LIMIT_SECRET:'mock'});
  assert.equal(response.status,200);assert.equal(calls,2);assert.equal(reserves,1);
  assert.equal(details.outcome,'succeeded');assert.equal(details.cost_microusd,4000);assert.equal(details.output_tokens,2000);
 }finally{globalThis.fetch=old}
});

test('invalid field groups remain rejected after one correction and do not consume success quota',async()=>{
 const old=globalThis.fetch;let calls=0,details;
 try{
  globalThis.fetch=async(url,init)=>{
   if(url.includes('/auth/v1/user'))return Response.json({id:'user-a',email_confirmed_at:'2026-01-01'});
   if(url.includes('/memberships'))return Response.json([{role:'owner'}]);
   if(url.includes('/exercises'))return Response.json([{id:'exercise',workspace_id:null,payload:{...catalog[0],id:'exercise',playersMin:6,playersMax:12}}]);
   if(url.includes('/rpc/ai_gate')){const b=JSON.parse(init.body);details=b.details;return Response.json({code:b.action==='reserve'?'reserved':'settled'})}
   calls++;
   return Response.json({status:'completed',usage:{input_tokens:1000,output_tokens:1000},output:[{content:[{type:'output_text',text:JSON.stringify({...plan,blocks:[{...block,sourceExerciseId:'exercise',groups:[4,4,4]},block]})}]}]});
  };
  const response=await api(req({criteria:c,change:''}),{OPENAI_API_KEY:'mock',AI_MODEL:'gpt-4.1-mini',AI_LIMIT_SECRET:'mock'});
  assert.equal(response.status,422);assert.equal(calls,2);assert.equal(details.outcome,'failed');assert.equal(details.cost_microusd,4000);
  assert.match((await response.json()).error,/Übungsfelder/);
 }finally{globalThis.fetch=old}
});
