import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.com/'});
for(const name of ['window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement','HTMLDivElement','HTMLButtonElement','HTMLFormElement','SVGElement','NodeFilter','NodeList','Text','ShadowRoot','Event','CustomEvent','KeyboardEvent','MouseEvent','PointerEvent','InputEvent','FocusEvent','Element','Node','location','history','localStorage','sessionStorage','MutationObserver','IntersectionObserver','confirm','prompt','ResizeObserver','getComputedStyle','DOMRect','DOMRectReadOnly','requestAnimationFrame','cancelAnimationFrame','CSS'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true,writable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
Object.defineProperty(globalThis,'getComputedStyle',{value:dom.window.getComputedStyle.bind(dom.window),configurable:true,writable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=(await import('react')).default;
const {render,screen,fireEvent,waitFor,cleanup,within,act}=await import('@testing-library/react');
const {default:Events}=await import('../src/components/Events.jsx');
const originalFetch=globalThis.fetch;
const workspaceId='11111111-1111-4111-8111-111111111111';
const team={id:'22222222-2222-4222-8222-222222222222',name:'U13',memberCount:2,myRole:'coach'};
const pad=n=>String(n).padStart(2,'0');
const localInput=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const inDays=(days,hour=18)=>localInput(new Date(Date.now()+days*86400000)).slice(0,11)+pad(hour)+':00';

function backend({role='trainer',events=[],plans=[]}={}){
 const state={events:[...events],writes:[],responds:[],failNextWrite:false,role,plans};
 globalThis.fetch=async(path,options={})=>{
  const method=options.method||'GET';
  if(path.startsWith('/api/teams'))return Response.json({role:state.role,canManage:true,teams:[team]});
  if(path.startsWith('/api/storage'))return Response.json({records:state.plans.map(p=>({id:p.id,payload:{plan:{title:p.title},criteria:{minutes:60},mode:'hybrid'}})),nextOffset:null});
  if(path.startsWith('/api/events/respond')){
   const body=JSON.parse(options.body);state.responds.push(body);
   const target=state.events.find(e=>e.id===body.eventId);
   if(target)target.myResponse={status:body.status,note:body.note,updatedAt:new Date().toISOString()};
   return Response.json({ok:true,response:{status:body.status,note:body.note}});
  }
  if(path.startsWith('/api/events')){
   if(method==='GET')return Response.json({role:state.role,canManage:state.role!=='player',events:state.events});
   const body=JSON.parse(options.body);state.writes.push(body);
   if(state.failNextWrite){state.failNextWrite=false;return Response.json({error:'Speichern fehlgeschlagen.'},{status:503})}
   const planOf=id=>state.plans.find(p=>p.id===id)||null;
   if(body.action==='create'){
    const id='eeeeeeee-eeee-4eee-8eee-'+String(state.events.length+1).padStart(12,'0');
    state.events.push({id,myTrainingPlan:planOf(body.trainingPlanId),teamId:body.teamId,teamName:'U13',kind:body.kind,title:body.title,startsAt:body.startsAt,endsAt:body.endsAt,meetAt:body.meetAt,location:body.location,notes:body.notes,responseDeadline:body.responseDeadline,cancelledAt:null,canManage:true,myUserId:'trainer-1',myTeamRole:'coach',myResponse:null,summary:{accepted:0,declined:0,maybe:0,open:2,total:2},roster:[{userId:'trainer-1',name:'Trainer',teamRole:'coach'},{userId:'p1',name:'Pia',teamRole:'player'},{userId:'p2',name:'Bea',teamRole:'player'}],responses:[]});
    return Response.json({event:{id},created:true},state.writes.filter(w=>w.requestId===body.requestId).length>1?{status:200}:{status:200});
   }
   const target=state.events.find(e=>e.id===body.id);
   if(!target)return Response.json({error:'Termin nicht gefunden.'},{status:404});
   if(body.action==='update')Object.assign(target,{myTrainingPlan:planOf(body.trainingPlanId),startsAt:body.startsAt,location:body.location,title:body.title,notes:body.notes,endsAt:body.endsAt,meetAt:body.meetAt,responseDeadline:body.responseDeadline,kind:body.kind});
   if(body.action==='cancel')target.cancelledAt=body.cancelled?new Date().toISOString():null;
   if(body.action==='delete')state.events=state.events.filter(e=>e.id!==body.id);
   return Response.json({ok:true,event:{id:target.id}});
  }
  throw Error('Unexpected request: '+path);
 };
 return state;
}
async function mount({manage=true}={}){
 render(React.createElement(Events,{workspaceId}));
 await screen.findByRole('heading',{name:'Termine und Anwesenheit'});
 // Der Anlegen-Knopf erscheint erst, wenn Termine und Mannschaften geladen sind.
 if(manage)await waitFor(()=>{if(!screen.queryByRole('button',{name:'Termin anlegen'}))throw Error('loading')});
 else await waitFor(()=>{if(screen.queryByText('Termine werden geladen …'))throw Error('loading')});
}
const sortKey=events=>[...events].sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt)).map(e=>e.title);

test('P5: an empty list produces a game, a moved day and a deleted entry in the right order',async()=>{
 const state=backend();
 globalThis.confirm=()=>true;
 try{
  await mount();
  await screen.findByText('Kein anstehender Termin.');
  fireEvent.click(screen.getByRole('button',{name:'Termin anlegen'}));
  const dialog=await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Titel'),{target:{value:'Spiel gegen FC Test'}});
  fireEvent.change(within(dialog).getByLabelText('Art'),{target:{value:'match'}});
  fireEvent.change(within(dialog).getByLabelText('Beginn'),{target:{value:inDays(3)}});
  fireEvent.change(within(dialog).getByLabelText('Ort'),{target:{value:'Sportplatz Nord'}});
  fireEvent.click(within(dialog).getByRole('button',{name:'Termin anlegen'}));
  const card=await screen.findByText('Spiel gegen FC Test');
  assert.equal(state.writes.at(-1).kind,'match');
  assert.equal(state.writes.at(-1).location,'Sportplatz Nord');
  assert.ok(card.closest('[class*=rounded]')||card);

  // Ort und Tag ändern
  fireEvent.click(screen.getByText('Spiel gegen FC Test'));
  await screen.findByRole('button',{name:'Bearbeiten'});
  fireEvent.click(screen.getByRole('button',{name:'Bearbeiten'}));
  const editDialog=await screen.findByRole('dialog');
  fireEvent.change(within(editDialog).getByLabelText('Ort'),{target:{value:'Kunstrasen Süd'}});
  fireEvent.change(within(editDialog).getByLabelText('Beginn'),{target:{value:inDays(1)}});
  fireEvent.click(within(editDialog).getByRole('button',{name:'Änderungen speichern'}));
  await waitFor(()=>assert.equal(state.events[0].location,'Kunstrasen Süd'));
  assert.equal(state.writes.at(-1).startsAt,new Date(inDays(1)).toISOString());

  // Neuladen: Ortszeit und Inhalt bleiben
  cleanup();
  await mount();
  await screen.findByText('Spiel gegen FC Test');
  await screen.findByText(/Kunstrasen Süd/);

  // Entfernen
  fireEvent.click(screen.getByText('Spiel gegen FC Test'));
  await screen.findByRole('button',{name:'Löschen'});
  fireEvent.click(screen.getByRole('button',{name:'Löschen'}));
  await screen.findByText('Kein anstehender Termin.');
  assert.equal(state.events.length,0);
 }finally{cleanup();globalThis.fetch=originalFetch;globalThis.confirm=dom.window.confirm}
});

test('P5: a failed save keeps the dialog open with the entered values',async()=>{
 const state=backend();
 try{
  await mount();
  fireEvent.click(screen.getByRole('button',{name:'Termin anlegen'}));
  const dialog=await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Titel'),{target:{value:'Training mit Fehler'}});
  fireEvent.change(within(dialog).getByLabelText('Ort'),{target:{value:'Halle 2'}});
  state.failNextWrite=true;
  fireEvent.click(within(dialog).getByRole('button',{name:'Termin anlegen'}));
  await screen.findByText('Speichern fehlgeschlagen.');
  assert.ok(screen.getByRole('dialog'));
  assert.equal(within(dialog).getByLabelText('Titel').value,'Training mit Fehler');
  assert.equal(within(dialog).getByLabelText('Ort').value,'Halle 2');
  // Korrigieren und erneut speichern nutzt dieselbe Kennung.
  fireEvent.click(within(dialog).getByRole('button',{name:'Termin anlegen'}));
  await screen.findByText('Training mit Fehler');
  assert.equal(state.writes[0].requestId,state.writes[1].requestId);
 }finally{cleanup();globalThis.fetch=originalFetch}
});

test('P5: sorting puts the nearer day first after a move across days',async()=>{
 const state=backend();
 try{
  await mount();
  for(const [title,day] of [['Später',5],['Früher',2]]){
   fireEvent.click(screen.getByRole('button',{name:'Termin anlegen'}));
   const dialog=await screen.findByRole('dialog');
   fireEvent.change(within(dialog).getByLabelText('Titel'),{target:{value:title}});
   fireEvent.change(within(dialog).getByLabelText('Beginn'),{target:{value:inDays(day)}});
   fireEvent.click(within(dialog).getByRole('button',{name:'Termin anlegen'}));
   await screen.findByText(title);
  }
  assert.deepEqual(sortKey(state.events),['Früher','Später']);
  // Den späteren Termin auf einen früheren Tag verschieben.
  fireEvent.click(screen.getByText('Später'));
  await screen.findByRole('button',{name:'Bearbeiten'});
  fireEvent.click(screen.getByRole('button',{name:'Bearbeiten'}));
  const dialog=await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Beginn'),{target:{value:inDays(1)}});
  fireEvent.click(within(dialog).getByRole('button',{name:'Änderungen speichern'}));
  await waitFor(()=>assert.ok(Date.parse(state.events.find(e=>e.title==='Später').startsAt)<Date.parse(state.events.find(e=>e.title==='Früher').startsAt)));
 }finally{cleanup();globalThis.fetch=originalFetch}
});

test('P5: a player answers two games separately and the trainer sees what is open',async()=>{
 const base={teamId:team.id,teamName:'U13',kind:'match',endsAt:null,meetAt:null,responseDeadline:null,cancelledAt:null,myResponse:null};
 const events=[
  {...base,id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',title:'Spiel Eins',startsAt:new Date(Date.now()+2*86400000).toISOString(),location:'Platz A',notes:'',summary:{accepted:0,declined:0,maybe:0,open:3,total:3},
   canManage:false,myUserId:'p1',myTeamRole:'player',roster:[{userId:'p1',name:'Pia',teamRole:'player'},{userId:'p2',name:'Bea',teamRole:'player'},{userId:'p3',name:'Cem',teamRole:'player'}],responses:[]},
  {...base,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',title:'Spiel Zwei',startsAt:new Date(Date.now()+3*86400000).toISOString(),location:'Platz B',notes:'',summary:{accepted:0,declined:0,maybe:0,open:3,total:3},
   canManage:false,myUserId:'p1',myTeamRole:'player',roster:[{userId:'p1',name:'Pia',teamRole:'player'},{userId:'p2',name:'Bea',teamRole:'player'},{userId:'p3',name:'Cem',teamRole:'player'}],responses:[]},
 ];
 const state=backend({role:'player',events});
 try{
  await mount({manage:false});
  await screen.findByText('Spiel Eins');
  await screen.findByText('Spiel Zwei');
  const cards=screen.getAllByRole('group',{name:'Deine Rückmeldung'});
  assert.equal(cards.length,2);
  fireEvent.click(within(cards[0]).getByRole('button',{name:/Zusage/}));
  await waitFor(()=>assert.equal(state.responds.length,1));
  assert.equal(state.responds[0].eventId,events[0].id);
  assert.equal(state.responds[0].status,'accepted');
  fireEvent.click(within(cards[1]).getByRole('button',{name:/Absage/}));
  await waitFor(()=>assert.equal(state.responds.length,2));
  assert.equal(state.responds[1].eventId,events[1].id);
  assert.equal(state.responds[1].status,'declined');
 }finally{cleanup();globalThis.fetch=originalFetch}
});

test('P5: a cancelled game stays visible but closed for answers',async()=>{
 const cancelledAt=new Date().toISOString();
 const state=backend({role:'player',events:[{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',teamId:team.id,teamName:'U13',kind:'match',title:'Ausgefallen',startsAt:new Date(Date.now()+2*86400000).toISOString(),endsAt:null,meetAt:null,location:'Platz',notes:'',responseDeadline:null,cancelledAt,canManage:false,myUserId:'p1',myTeamRole:'player',myResponse:null,summary:{accepted:0,declined:0,maybe:0,open:1,total:1},roster:[{userId:'p1',name:'Pia',teamRole:'player'}],responses:[]}]});
 try{
  await mount({manage:false});
  await screen.findByText('Ausgefallen');
  await screen.findByText('Dieser Termin wurde abgesagt.');
  assert.equal(screen.queryByRole('group',{name:'Deine Rückmeldung'}),null);
 }finally{cleanup();globalThis.fetch=originalFetch}
});

test('P5: the trainer sees open answers after a reload',async()=>{
 const event={id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',teamId:team.id,teamName:'U13',kind:'match',title:'Spiel Samstag',startsAt:new Date(Date.now()+2*86400000).toISOString(),endsAt:null,meetAt:null,location:'Platz',notes:'',responseDeadline:null,cancelledAt:null,canManage:true,myUserId:'coach-1',myTeamRole:'coach',myResponse:null,summary:{accepted:1,declined:1,maybe:0,open:1,total:3},roster:[{userId:'p1',name:'Pia',teamRole:'player'},{userId:'p2',name:'Bea',teamRole:'player'},{userId:'p3',name:'Cem',teamRole:'player'}],responses:[{userId:'p1',name:'Pia',status:'accepted',note:''},{userId:'p2',name:'Bea',status:'declined',note:''}]};
 const state=backend({events:[event]});
 try{
  await mount();
  await screen.findByText('Spiel Samstag');
  fireEvent.click(screen.getByText('Spiel Samstag'));
  const dialog=await screen.findByRole('dialog');
  await within(dialog).findByText('Anwesenheit');
  assert.match(within(dialog).getByText(/1 zu · 0 vielleicht · 1 ab · 1 offen/).textContent,/1 offen/);
  assert.ok(within(dialog).getByText('Offen'));
  assert.equal(within(dialog).getAllByText('Zugesagt').length,1);
  assert.equal(within(dialog).getAllByText('Abgesagt').length,1);
 }finally{cleanup();globalThis.fetch=originalFetch}
});

test('P5: a coach is not offered response buttons the server would reject',async()=>{
 const event={id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',teamId:team.id,teamName:'U13',kind:'match',title:'Spiel Sonntag',startsAt:new Date(Date.now()+2*86400000).toISOString(),endsAt:null,meetAt:null,location:'Platz',notes:'',responseDeadline:null,cancelledAt:null,canManage:true,myUserId:'coach-1',myTeamRole:'coach',myResponse:null,summary:{accepted:0,declined:0,maybe:0,open:1,total:1},roster:[{userId:'p1',name:'Pia',teamRole:'player'}],responses:[]};
 const state=backend({events:[event]});
 try{
  await mount();
  await screen.findByText('Spiel Sonntag');
  assert.equal(screen.queryByRole('group',{name:'Deine Rückmeldung'}),null);
 }finally{cleanup();globalThis.fetch=originalFetch}
});

test('P5: cancelling from the detail view marks the game and keeps it visible',async()=>{
 const event={id:'ffffffff-ffff-4fff-8fff-ffffffffffff',teamId:team.id,teamName:'U13',kind:'match',title:'Spiel Montag',startsAt:new Date(Date.now()+2*86400000).toISOString(),endsAt:null,meetAt:null,location:'Platz',notes:'',responseDeadline:null,cancelledAt:null,canManage:true,myUserId:'coach-1',myTeamRole:'coach',myResponse:null,summary:{accepted:0,declined:0,maybe:0,open:1,total:1},roster:[{userId:'p1',name:'Pia',teamRole:'player'}],responses:[]};
 const state=backend({events:[event]});
 try{
  await mount();
  await screen.findByText('Spiel Montag');
  fireEvent.click(screen.getByText('Spiel Montag'));
  const dialog=await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button',{name:'Absagen'}));
  await waitFor(()=>assert.ok(state.events[0].cancelledAt));
  const write=state.writes.at(-1);
  assert.equal(write.action,'cancel');
  assert.equal(write.id,event.id);
  assert.equal(write.cancelled,true);
  // Nach dem Neuladen bleibt die Absage sichtbar.
  cleanup();
  await mount();
  await screen.findByText('Spiel Montag');
  await screen.findByText('Abgesagt');
 }finally{cleanup();globalThis.fetch=originalFetch}
});

test('P6: the coach links an own plan to an event and opens it from there',async()=>{
 const plan={id:'99999999-9999-4999-8999-999999999999',title:'Passspiel Dienstag'};
 const state=backend({plans:[plan]});
 let opened=null;
 try{
  render(React.createElement(Events,{workspaceId,onOpenPlan:id=>{opened=id}}));
  await screen.findByRole('heading',{name:'Termine und Anwesenheit'});
  await waitFor(()=>{if(!screen.queryByRole('button',{name:'Termin anlegen'}))throw Error('loading')});
  fireEvent.click(screen.getByRole('button',{name:'Termin anlegen'}));
  const dialog=await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Titel'),{target:{value:'Training mit Plan'}});
  fireEvent.change(within(dialog).getByLabelText(/Eigene Einheit/),{target:{value:plan.id}});
  fireEvent.click(within(dialog).getByRole('button',{name:'Termin anlegen'}));
  await screen.findByText('Training mit Plan');
  assert.equal(state.writes.at(-1).trainingPlanId,plan.id);
  assert.deepEqual(state.events[0].myTrainingPlan,plan);

  // Der Plan ist aus dem Termin heraus erreichbar.
  fireEvent.click(screen.getByText('Training mit Plan'));
  const detail=await screen.findByRole('dialog');
  await within(detail).findByText('Deine Einheit');
  assert.ok(within(detail).getByText('Passspiel Dienstag'));
  fireEvent.click(within(detail).getByRole('button',{name:'Plan öffnen'}));
  await waitFor(()=>assert.equal(opened,plan.id));
  assert.equal(screen.queryByRole('dialog'),null);
 }finally{cleanup();globalThis.fetch=originalFetch}
});

test('P6: a player sees the event without any hint of the coach plan',async()=>{
 const event={id:'abababab-abab-4bab-8bab-abababababab',teamId:team.id,teamName:'U13',kind:'training',title:'Training ohne Plananzeige',startsAt:new Date(Date.now()+2*86400000).toISOString(),endsAt:null,meetAt:null,location:'Platz',notes:'',responseDeadline:null,cancelledAt:null,canManage:false,myUserId:'p1',myTeamRole:'player',myResponse:null,myTrainingPlan:null,summary:{accepted:0,declined:0,maybe:0,open:1,total:1},roster:[{userId:'p1',name:'Pia',teamRole:'player'}],responses:[]};
 const state=backend({role:'player',events:[event],plans:[{id:'99999999-9999-4999-8999-999999999999',title:'Geheim'}]});
 try{
  await mount({manage:false});
  await screen.findByText('Training ohne Plananzeige');
  fireEvent.click(screen.getByText('Training ohne Plananzeige'));
  const dialog=await screen.findByRole('dialog');
  await within(dialog).findByText('Anwesenheit');
  assert.equal(within(dialog).queryByText('Deine Einheit'),null);
  assert.equal(within(dialog).queryByText('Geheim'),null);
  assert.equal(within(dialog).queryByRole('button',{name:'Plan öffnen'}),null);
 }finally{cleanup();globalThis.fetch=originalFetch}
});
