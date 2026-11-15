import test from 'node:test';
import assert from 'node:assert/strict';
import {AGE_GROUPS,AGE_RULES,ageRule,blockRuleIssues,fieldLengths,mentionedBallSizes,mentionedFormats,ruleSummary,netPlayTarget} from '../shared/age-rules.mjs';
import {planIssues,api} from '../worker/api.mjs';
import {matches,schema} from '../shared/training-plan.mjs';
import {catalog} from '../worker/catalog.mjs';

const block=(overrides={})=>({sourceExerciseId:'',title:'Spiel',phase:'Hauptteil',minutes:30,groups:[6,6],organization:'Zwei Felder',materials:'Bälle',fieldSize:'20 × 20 m',steps:['Spielen'],coaching:['Anbieten'],easier:'Mehr Raum',harder:'Weniger Raum',intensity:'mittel',workRest:'3 × 4 Min., 90 Sek. Pause',netPlayingMinutes:12,diagram:{caption:'Gruppe',objects:[],arrows:[]},...overrides});
const plan=(age,blocks)=>({title:'Training',summary:'Passspiel',blocks});
const criteria=age=>({age,players:12,minutes:60,goal:'Passen',material:'Bälle',space:'Platz',notes:''});

test('every supported age group has one complete rule set',()=>{
 assert.deepEqual(Object.keys(AGE_RULES),AGE_GROUPS);
 for(const age of AGE_GROUPS){
  const rule=ageRule(age);
  assert.ok(Number.isInteger(rule.age)&&rule.age>0,age);
  assert.ok(rule.level&&rule.gameFormat,age);
  assert.ok(Number.isInteger(rule.ballSize)&&rule.ballSize>=3&&rule.ballSize<=5,age);
  assert.ok(Number.isInteger(rule.maxPlayersPerTeam),age);
  assert.ok(Number.isInteger(rule.maxFieldLength),age);
  assert.match(ruleSummary(rule),/Ballgröße/);
 }
 assert.equal(ageRule('U12'),null);assert.equal(ageRule(undefined),null);
});

test('heading training is rejected for the youngest groups only',()=>{
 const heading=block({title:'Kopfball-Station',steps:['Kopfball nach Anwurf']});
 assert.deepEqual(blockRuleIssues(heading,ageRule('U9')),['heading']);
 assert.deepEqual(blockRuleIssues(heading,ageRule('U11')),['heading']);
 assert.deepEqual(blockRuleIssues(heading,ageRule('U13')),[]);
 assert.deepEqual(blockRuleIssues(block({coaching:['Kopfstoß nur andeuten']}),ageRule('U9')),['heading']);
});

test('ball, field and game format follow the age rules',()=>{
 assert.deepEqual(blockRuleIssues(block({materials:'Bälle in Größe 4'}),ageRule('U9')),['ball']);
 assert.deepEqual(blockRuleIssues(block({materials:'Bälle in Größe 4'}),ageRule('U11')),[]);
 assert.deepEqual(mentionedBallSizes('4 Hütchen in Größe 5, ein Ball in Größe 3'),[3]);
 assert.deepEqual(fieldLengths('60 × 40 m'),[60,40]);
 assert.deepEqual(blockRuleIssues(block({fieldSize:'60 × 40 m'}),ageRule('U9')),['field']);
 assert.deepEqual(blockRuleIssues(block({fieldSize:'24 × 18 m'}),ageRule('U9')),[]);
 assert.deepEqual(mentionedFormats('6 gegen 6 auf zwei Feldern'),[[6,6]]);
 assert.deepEqual(blockRuleIssues(block({phase:'Spielform',title:'Abschlussspiel 6 gegen 6'}),ageRule('U9')),['game_format']);
 assert.deepEqual(blockRuleIssues(block({phase:'Spielform',title:'Abschlussspiel 5 gegen 5'}),ageRule('U9')),[]);
 assert.deepEqual(blockRuleIssues(block({phase:'Hauptteil',title:'Rondo 6 gegen 2'}),ageRule('U9')),[]);
});

test('the shared exercise catalogue never violates the rules of the ages it is offered for',()=>{
 for(const exercise of catalog){
  for(const age of AGE_GROUPS){
   const rule=ageRule(age);
   if(rule.age<exercise.ageMin)continue;
   if(age!=='Senioren'&&rule.age>exercise.ageMax)continue;
   const issues=blockRuleIssues({...block(),...exercise,phase:exercise.phase},rule);
   assert.deepEqual(issues,[],`${exercise.id} (${exercise.title}) violates ${age}: ${issues}`);
  }
 }
});

test('plan validation reports age-rule violations as block issues',()=>{
 const c={age:'U9',players:12,minutes:60,goal:'Passen',material:'Bälle',space:'Platz',notes:''};
 const plan={title:'Training',summary:'Passspiel',blocks:[block({minutes:30,fieldSize:'60 × 40 m'}),block({minutes:30,title:'Kopfball-Spiel',phase:'Spielform'})]};
 const issues=planIssues(plan,c,catalog,'new');
 assert.ok(issues.includes('block_2:heading'),issues.join(','));
 assert.ok(issues.includes('block_1:field'),issues.join(','));
});

test('the model receives the age rules and a repeated violation ends without a saved plan',async()=>{
 const old=globalThis.fetch;let instructions,rules,calls=0;
 const blockBase={title:'Spiel',phase:'Hauptteil',organization:'Zwei Felder',materials:'Bälle',fieldSize:'20 × 20 m',steps:['Spielen'],coaching:['Anbieten'],easier:'Mehr Raum',harder:'Weniger Raum',diagram:{caption:'Gruppe',objects:[],arrows:[]}};
 const c={age:'U9',players:12,minutes:60,goal:'Passen',material:'Bälle',space:'Platz',notes:''};
 const request=()=>new Request('https://example.com/api/plan',{method:'POST',headers:{origin:'https://example.com',cookie:'__Host-trainer-access=token','x-workspace-id':'11111111-1111-4111-8111-111111111111'},body:JSON.stringify({requestId:crypto.randomUUID(),criteria:c,change:'',mode:'new'})});
 try{
  globalThis.fetch=async(url,init)=>{
   if(url.includes('/auth/v1/user'))return Response.json({id:'user-a',email_confirmed_at:'2026-01-01'});
   if(url.includes('/memberships'))return Response.json([{role:'owner'}]);
   if(url.includes('/exercises'))return Response.json([]);
   if(url.includes('/rpc/ai_gate'))return Response.json({code:JSON.parse(init.body).action==='reserve'?'reserved':'settled'});
   calls++;const payload=JSON.parse(init.body);instructions=payload.instructions;rules=JSON.parse(payload.input).ageRules;
   const slots=payload.text.format.schema.properties.blocks.properties;
   const block=Object.fromEntries(Object.entries(slots).map(([key,s])=>[key,{...blockBase,minutes:s.properties.minutes.enum[0],allocationId:s.properties.allocationId.enum[0],title:'Kopfball-Station',steps:['Kopfball nach Anwurf']}]));
   return Response.json({status:'completed',usage:{input_tokens:1000,output_tokens:1000},output:[{content:[{type:'output_text',text:JSON.stringify({title:'Training',summary:'Kopfball',blocks:block})}]}]});
  };
  const response=await api(request(),{OPENAI_API_KEY:'mock',AI_MODEL:'gpt-4.1-mini',AI_LIMIT_SECRET:'mock'});
  assert.equal(response.status,422);assert.equal(calls,2);
  assert.match((await response.json()).error,/Kopfball/);
  assert.match(instructions,/Ballgröße 3/);assert.match(instructions,/Kein Kopfballtraining/);
  assert.equal(rules.ballSize,3);assert.equal(rules.heading,'');
 }finally{globalThis.fetch=old}
});

test('net playing time target follows the weekly recommendation and the session length',()=>{
 // 48 minutes per week over two sessions, but never more than half of a short session.
 assert.equal(netPlayTarget('U9',60),24);
 assert.equal(netPlayTarget('U13',90),24);
 assert.equal(netPlayTarget('U17 / U19',60),16);
 assert.equal(netPlayTarget('Senioren',120),16);
 assert.equal(netPlayTarget('U9',30),15);
 assert.equal(netPlayTarget('U9',120),24);
 assert.equal(netPlayTarget('unbekannt',60),0);
 assert.equal(netPlayTarget('U9',0),0);
});

test('session validation requires real game time, load and recovery',()=>{
 const c=criteria('U11');
 const good=plan(c.age,[block({minutes:30}),block({minutes:30,phase:'Spielform'})]);
 assert.deepEqual(planIssues(good,c,catalog,'new'),[]);
 // A plan without any game block is rejected even when the minutes add up.
 assert.ok(planIssues(plan(c.age,[block({minutes:30}),block({minutes:30})]),c,catalog,'new').includes('game_block'));
 // Too little net playing time is rejected.
 assert.ok(planIssues(plan(c.age,[block({minutes:30,netPlayingMinutes:2}),block({minutes:30,phase:'Spielform',netPlayingMinutes:2})]),c,catalog,'new').includes('net_play_time'));
 // Every working block needs a load description and a recovery.
 const noIntensity=block({minutes:30});delete noIntensity.intensity;
 assert.ok(planIssues(plan(c.age,[noIntensity,block({minutes:30,phase:'Spielform'})]),c,catalog,'new').includes('block_1:intensity'));
 assert.ok(planIssues(plan(c.age,[block({minutes:30,workRest:'   '}),block({minutes:30,phase:'Spielform'})]),c,catalog,'new').includes('block_1:recovery'));
 // Net playing time can never exceed the block duration.
 assert.ok(planIssues(plan(c.age,[block({minutes:30,netPlayingMinutes:40}),block({minutes:30,phase:'Spielform'})]),c,catalog,'new').includes('block_1:net_play'));
 // A break carries no playing time of its own.
 assert.ok(planIssues(plan(c.age,[block({minutes:30}),block({minutes:30,phase:'Pause',netPlayingMinutes:5})]),c,catalog,'new').includes('block_2:net_play'));
});

test('saved units from before the load fields remain readable',()=>{
 const legacy=structuredClone({criteria:criteria('U11'),mode:'hybrid',plan:plan('U11',[block({minutes:30}),block({minutes:30,phase:'Spielform'})])});
 for(const b of legacy.plan.blocks){delete b.intensity;delete b.workRest;delete b.netPlayingMinutes}
 assert.ok(matches(legacy.plan,schema));
});
