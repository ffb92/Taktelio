import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.com/'});
for(const name of ['window','document','HTMLElement','HTMLInputElement','Event','CustomEvent','KeyboardEvent','MouseEvent','PointerEvent','Element','Node','location','history','localStorage','sessionStorage','MutationObserver'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true,writable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
Object.defineProperty(globalThis,'getComputedStyle',{value:dom.window.getComputedStyle.bind(dom.window),configurable:true,writable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=(await import('react')).default;
const {render,screen,fireEvent,waitFor,cleanup}=await import('@testing-library/react');
const {default:App}=await import('../src/App.jsx');
const {default:Auth}=await import('../src/components/Auth.jsx');
const realFetch=globalThis.fetch;
const clubA={id:'11111111-1111-4111-8111-111111111111',name:'Verein A',role:'trainer'},clubB={id:'22222222-2222-4222-8222-222222222222',name:'Verein B',role:'trainer'};
const teamA={id:'33333333-3333-4333-8333-333333333333',name:'U13',memberCount:2,myRole:null};
function mockBackend(clubs){
 let authenticated=false;const calls=[];
 globalThis.fetch=async(path,options={})=>{
  calls.push({path,options});
  if(path==='/api/auth/refresh')return Response.json({error:'Bitte anmelden'},{status:401});
  if(path==='/api/auth/me')return Response.json(authenticated?{user:{id:'test-user',email:'trainer@example.com'}}:{user:null},{status:authenticated?200:401});
  if(path==='/api/auth/login'){authenticated=true;return Response.json({ok:true})}
  if(path==='/api/auth/logout'){authenticated=false;return Response.json({ok:true})}
  if(path==='/api/workspaces')return Response.json({workspaces:clubs});
  if(path==='/api/status')return Response.json({ready:false,message:'KI-Zugang noch nicht eingerichtet.'});
  if(path==='/api/exercises')return Response.json({exercises:[]});
  if(path==='/api/teams')return Response.json({role:'trainer',canManage:true,teams:clubs.length?[teamA]:[]});
  if(path==='/api/events')return Response.json({role:'trainer',canManage:true,events:[]});
  if(path==='/api/club')return Response.json({club:clubs.find(c=>c.id===options.headers['x-workspace-id']),role:'trainer',members:[],invitations:[]});
  throw Error('Unexpected request: '+path);
 };return calls;
}
async function login(){await screen.findByRole('button',{name:'Anmelden',exact:true});fireEvent.change(screen.getByLabelText('E-Mail'),{target:{value:'trainer@example.com'}});fireEvent.change(screen.getByLabelText('Passwort'),{target:{value:'test-password'}});fireEvent.submit(screen.getByLabelText('Passwort').closest('form'))}
test('React login reports server errors without entering the app',async()=>{
 try{globalThis.fetch=async()=>Response.json({error:'Anmeldung fehlgeschlagen.'},{status:400});let entered=false;render(React.createElement(Auth,{onLogin:()=>{entered=true}}));fireEvent.change(screen.getByLabelText('E-Mail'),{target:{value:'trainer@example.com'}});fireEvent.change(screen.getByLabelText('Passwort'),{target:{value:'test-password'}});fireEvent.submit(screen.getByLabelText('Passwort').closest('form'));await screen.findByText('Anmeldung fehlgeschlagen.');assert.equal(entered,false)}finally{cleanup();globalThis.fetch=realFetch}
});
test('new members must create a club before training and navigation become available',async()=>{
 try{mockBackend([]);render(React.createElement(App));await login();await screen.findByRole('button',{name:'Verein anlegen'});assert.equal(screen.queryByRole('navigation',{name:'Training'}),null);assert.equal(screen.queryByRole('navigation',{name:'Hauptnavigation'}),null)}finally{cleanup();globalThis.fetch=realFetch;localStorage.clear()}
});
test('club switching scopes requests and logout clears all club UI',async()=>{
 try{
  const calls=mockBackend([clubA,clubB]);render(React.createElement(App));await login();await screen.findByRole('button',{name:'KI-Training erstellen'});
  const openMenu=async()=>{fireEvent.pointerDown(screen.getByRole('button',{name:'Konto-Menü'}),{button:0,ctrlKey:false,pointerType:'mouse'});return screen.findByRole('menu')};
  await openMenu();
  assert.ok(screen.getByRole('menuitem',{name:'Profil'}));assert.ok(screen.getByRole('menuitem',{name:'Mannschaft'}));
  fireEvent.click(screen.getByRole('menuitem',{name:'Verein'}));
  await screen.findByDisplayValue('Verein A');
  assert.equal(screen.queryByRole('heading',{name:'Persönliche Angaben'}),null);
  await openMenu();fireEvent.click(screen.getByRole('menuitem',{name:'Profil'}));
  await screen.findByRole('heading',{name:'Persönliche Angaben'});
  fireEvent.change(screen.getByLabelText('Verein wechseln'),{target:{value:clubB.id}});
  await waitFor(()=>assert.ok(calls.some(c=>c.path==='/api/exercises'&&c.options.headers['x-workspace-id']===clubB.id)));
  await openMenu();fireEvent.click(screen.getByRole('menuitem',{name:'Verein'}));
  await screen.findByDisplayValue('Verein B');
  await openMenu();fireEvent.click(screen.getByRole('menuitem',{name:'Profil'}));
  await screen.findByRole('heading',{name:'Persönliche Angaben'});
  assert.equal(screen.queryByRole('button',{name:'Abmelden'}),null);
  await openMenu();fireEvent.click(screen.getByRole('menuitem',{name:'Abmelden'}));
  await screen.findByRole('button',{name:'Anmelden',exact:true});
  assert.equal(screen.queryByRole('button',{name:'Konto-Menü'}),null);assert.equal(screen.queryByRole('button',{name:'KI-Training erstellen'}),null);
 }finally{cleanup();globalThis.fetch=realFetch;localStorage.clear()}
});
test('players see their team events and respond without the trainer planner',async()=>{
 const playerClub={...clubA,role:'player'};
 const event={id:'44444444-4444-4444-8444-444444444444',teamId:teamA.id,teamName:'U13',kind:'training',title:'Abschlusstraining',startsAt:'2099-12-01T18:00:00.000Z',endsAt:'2099-12-01T19:30:00.000Z',meetAt:null,location:'Sportplatz',notes:'',responseDeadline:null,cancelledAt:null,canManage:false,myTeamRole:'player',myUserId:'test-user',myResponse:null,summary:{accepted:0,declined:0,maybe:0,open:2,total:2},roster:[{userId:'test-user',name:'Alex',teamRole:'player'},{userId:'other-user',name:'Bea',teamRole:'player'}],responses:[]};
 let authenticated=false;const calls=[];
 globalThis.fetch=async(path,options={})=>{
  calls.push({path,options});
  if(path==='/api/auth/refresh')return Response.json({error:'Bitte anmelden'},{status:401});
  if(path==='/api/auth/me')return Response.json(authenticated?{user:{id:'test-user',email:'player@example.com'}}:{user:null},{status:authenticated?200:401});
  if(path==='/api/auth/login'){authenticated=true;return Response.json({ok:true})}
  if(path==='/api/workspaces')return Response.json({workspaces:[playerClub]});
  if(path==='/api/events')return Response.json({role:'player',canManage:false,events:[event]});
  if(path==='/api/teams')return Response.json({role:'player',canManage:false,teams:[{...teamA,myRole:'player'}]});
  if(path==='/api/events/respond')return Response.json({ok:true});
  throw Error('Unexpected request: '+path);
 };
 try{
  render(React.createElement(App));
  await login();
  await screen.findByRole('heading',{name:'Termine und Anwesenheit'});
  assert.equal(screen.queryByRole('button',{name:'KI-Training erstellen'}),null);
  assert.ok(screen.getByRole('button',{name:'Termine'}));
  fireEvent.pointerDown(screen.getByRole('button',{name:'Konto-Menü'}),{button:0,ctrlKey:false,pointerType:'mouse'});
  assert.ok(await screen.findByRole('menuitem',{name:'Verein'}));
  assert.equal(screen.queryByRole('menuitem',{name:'Mannschaft'}),null);
  fireEvent.keyDown(screen.getByRole('menu'),{key:'Escape'});
  await screen.findByText('Abschlusstraining');
  fireEvent.click(screen.getByRole('button',{name:'Zusage'}));
  await waitFor(()=>{const call=calls.find(c=>c.path==='/api/events/respond');assert.ok(call);assert.deepEqual(JSON.parse(call.options.body),{eventId:event.id,status:'accepted',note:''})});
 }finally{cleanup();globalThis.fetch=realFetch;localStorage.clear()}
});

test('React planner retries uncertain requests with the same ID and saves the result',async()=>{
 const {default:Training}=await import('../src/components/Training.jsx');
 const ids=[];let saved;
 const plan={title:'Passspiel am Dienstag',summary:'Gemeinsam trainieren',blocks:[{title:'Passdreieck',phase:'Hauptteil',minutes:75,groups:[6,6],sourceExerciseId:'',fieldSize:'20 x 20 m',materials:'Bälle',organization:'Zwei Felder',steps:['Passen'],coaching:['Freilaufen'],easier:'Mehr Platz',harder:'Weniger Kontakte',diagram:{caption:'Eine Gruppe',objects:[],arrows:[]}}]};
 try{
  globalThis.fetch=async(path,options={})=>{
   if(path==='/api/status')return Response.json({ready:true,message:'0 von 10 KI-Generierungen verwendet'});
   if(path==='/api/exercises')return Response.json({exercises:[]});
   if(path==='/api/plan'){ids.push(JSON.parse(options.body).requestId);if(ids.length===1)return Response.json({error:'Vorübergehend nicht erreichbar'},{status:503});return Response.json({plan,mode:'hybrid'})}
   if(path==='/api/storage'){saved=JSON.parse(options.body);return Response.json({record:{id:'saved'}})}
   throw Error(path);
  };
  render(React.createElement(Training,{workspaceId:clubA.id,onBusy:()=>{}}));
  await waitFor(()=>assert.equal(screen.getByRole('button',{name:'KI-Training erstellen'}).disabled,false));
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));await screen.findByText('Vorübergehend nicht erreichbar');
  await waitFor(()=>assert.equal(screen.getByRole('button',{name:'KI-Training erstellen'}).disabled,false));
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));await screen.findByText('Passspiel am Dienstag');assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);
  fireEvent.click(screen.getByRole('button',{name:'Einheit speichern'}));await screen.findByText('Einheit für deinen Verein gespeichert.');assert.equal(saved.action,'save');assert.equal(saved.payload.plan.title,plan.title);assert.equal(saved.payload.criteria.players,12);
 }finally{cleanup();globalThis.fetch=realFetch}
});


test('malformed saved and local plans remain removable without crashing or opening',async()=>{
 const {default:SavedPlans}=await import('../src/components/SavedPlans.jsx');let opened=false;
 try{
  localStorage.setItem('taktelio-ai-plans',JSON.stringify([null,{plan:{title:'Lokaler Altbestand',blocks:[{}]},criteria:{}}]));
  globalThis.fetch=async()=>Response.json({records:[{id:'broken',payload:null},{id:'bad-groups',payload:{plan:{title:'Defekter Plan',blocks:[{}]},criteria:{}}}],nextOffset:null});
  render(React.createElement(SavedPlans,{workspaceId:clubA.id,onOpen:()=>{opened=true}}));
  await screen.findByText('Unvollständige Einheit');
  fireEvent.click(screen.getAllByRole('button',{name:'Öffnen'})[0]);
  await screen.findByText(/Diese Einheit ist unvollständig/);
  assert.equal(opened,false);assert.equal(JSON.parse(localStorage.getItem('taktelio-ai-plans')).length,2);
  fireEvent.click(screen.getByText('Frühere lokale Entwürfe auf diesem Gerät'));
  const localLabel=screen.getByText('Lokaler Altbestand');
  assert.equal(localLabel.parentElement.querySelector('button').disabled,true);
 }finally{cleanup();globalThis.fetch=realFetch;localStorage.clear()}
});


test('a complete legacy saved plan opens in the planner with its criteria intact',async()=>{
 const {default:Training}=await import('../src/components/Training.jsx');
 const {trainingRecord}=await import('./fixtures/training-plan.mjs');
 const record=trainingRecord();record.plan.title='Bestehende Einheit';delete record.mode;delete record.plan.blocks[0].sourceExerciseId;
 try{
  globalThis.fetch=async path=>{
   if(path==='/api/status')return Response.json({ready:false,message:'KI deaktiviert'});
   if(path==='/api/exercises')return Response.json({exercises:[]});
   if(path==='/api/storage')return Response.json({records:[{id:'legacy',payload:record}],nextOffset:null});
   throw Error(path);
  };
  render(React.createElement(Training,{workspaceId:clubA.id,onBusy:()=>{}}));
  fireEvent.click(screen.getByRole('button',{name:'Einheiten',exact:true}));
  await screen.findByRole('heading',{name:'Bestehende Einheit'});
  fireEvent.click(screen.getByRole('button',{name:'Öffnen',exact:true}));
  await screen.findByRole('button',{name:'Einheit speichern'});
  assert.equal(screen.getByLabelText('Minuten').value,'60');
  assert.equal(screen.getByLabelText('Teilnehmende').value,'12');
  assert.equal(screen.getByLabelText('Planungsmodus').value,'hybrid');
  assert.equal(screen.getAllByRole('heading',{name:'Passspiel',exact:true}).length,2);
 }finally{cleanup();globalThis.fetch=realFetch;localStorage.clear()}
});
