import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.com/'});
for(const name of ['window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','Event','CustomEvent','KeyboardEvent','MouseEvent','PointerEvent','Element','Node','location','history','localStorage','sessionStorage','MutationObserver','confirm','prompt'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true,writable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
Object.defineProperty(globalThis,'getComputedStyle',{value:dom.window.getComputedStyle.bind(dom.window),configurable:true,writable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=(await import('react')).default;
const {render,screen,fireEvent,waitFor,cleanup,act}=await import('@testing-library/react');
const {default:Training}=await import('../src/components/Training.jsx');
const originalFetch=globalThis.fetch;
const workspaceId='11111111-1111-4111-8111-111111111111',otherWorkspace='33333333-3333-4333-8333-333333333333';
const userId='user-a',otherUser='user-b';
const criteria={age:'U11',players:12,minutes:60,goal:'Passspiel und Freilaufen',material:'8 Bälle, 12 Hütchen, Leibchen, 2 Minitore',space:'Halber Platz',notes:''};
const plan={title:'Plan A',summary:'Entwurf',blocks:[
 {sourceExerciseId:'',title:'A-Einstieg',phase:'Einstieg',minutes:30,groups:[6,6],organization:'Zwei Felder',materials:'Bälle',fieldSize:'20 x 20 m',steps:['Passen'],coaching:['Anbieten'],easier:'Mehr Raum',harder:'Weniger Kontakte',intensity:'mittel',workRest:'3 × 4 Min.',netPlayingMinutes:12,diagram:{caption:'Zwei Felder',objects:[],arrows:[]}},
 {sourceExerciseId:'',title:'A-Spiel',phase:'Spielform',minutes:30,groups:[6,6],organization:'Zwei Felder',materials:'Bälle',fieldSize:'20 x 20 m',steps:['Spielen'],coaching:['Raum'],easier:'Mehr Raum',harder:'Weniger Kontakte',intensity:'mittel',workRest:'3 × 4 Min.',netPlayingMinutes:12,diagram:{caption:'Zwei Felder',objects:[],arrows:[]}},
]};

function mockBackend(state){
 globalThis.fetch=async(path,options={})=>{
  if(path==='/api/status'){state.statusCalls++;return Response.json({ready:true,message:'8 von 10 KI-Generierungen verwendet'})}
  if(path==='/api/exercises')return Response.json({exercises:[]});
  if(path==='/api/plan'){const body=JSON.parse(options.body);state.planCalls.push(body);if(state.failNext){state.failNext=false;return Response.json({error:'Vorübergehend nicht erreichbar'},{status:503})}if(state.failNetwork){state.failNetwork=false;throw new TypeError('Failed to fetch')}return Response.json({plan,mode:body.mode,source:'ai'})}
  if(path==='/api/storage')return Response.json({records:[],nextOffset:null});
  throw Error('Unexpected request: '+path);
 };
 return state;
}
const fresh=()=>({statusCalls:0,planCalls:[],failNext:false});
const mount=(props={})=>React.createElement(Training,{workspaceId,userId,onBusy:()=>{},...props});
async function ready(){await waitFor(()=>assert.equal(screen.getByRole('button',{name:'KI-Training erstellen'}).disabled,false))}

test('a reloaded page resumes the same pending request instead of starting a second generation',async()=>{
 const state=mockBackend(fresh());
 try{
  state.failNext=true;
  render(mount());
  await ready();
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
  await screen.findByText('Vorübergehend nicht erreichbar');
  assert.equal(state.planCalls.length,1);

  // Neuladen: gleiche Nutzer- und Vereinsbindung, neue Komponenteninstanz.
  cleanup();
  render(mount());
  await screen.findByText(/Eine Generierung wurde unterbrochen/);
  await ready();
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
  await screen.findByRole('heading',{name:'Plan A'});
  assert.equal(state.planCalls.length,2);
  assert.equal(state.planCalls[0].requestId,state.planCalls[1].requestId);
 }finally{cleanup();globalThis.fetch=originalFetch;sessionStorage.clear();localStorage.clear()}
});

test('the restored draft stays with its user and club',async()=>{
 const state=mockBackend(fresh());
 try{
  render(mount());
  await ready();
  fireEvent.change(screen.getByLabelText('Minuten'),{target:{value:'60'}});
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
  await screen.findByRole('heading',{name:'Plan A'});

  cleanup();
  // Anderer Nutzer, anderer Verein: weder Entwurf noch laufende Anfrage dürfen erscheinen.
  render(mount({userId:otherUser,workspaceId:otherWorkspace}));
  await ready();
  assert.equal(screen.queryByRole('heading',{name:'Plan A'}),null);
  assert.equal(screen.queryByText(/wurde wiederhergestellt/),null);
  assert.equal(screen.queryByText(/Eine Generierung wurde unterbrochen/),null);

  cleanup();
  // Gleicher Nutzer, aber anderer Verein: ebenfalls getrennt.
  render(mount({workspaceId:otherWorkspace}));
  await ready();
  assert.equal(screen.queryByRole('heading',{name:'Plan A'}),null);

  cleanup();
  // Eigene Bindung: Entwurf kommt zurück.
  render(mount());
  await screen.findByRole('heading',{name:'Plan A'});
  await screen.findByText('Dein letzter Entwurf wurde wiederhergestellt.');
 }finally{cleanup();globalThis.fetch=originalFetch;sessionStorage.clear();localStorage.clear()}
});

test('reloading while the request is still running resumes that very request',async()=>{
 const state=fresh();state.planCalls=[];
 let release;const first=new Promise(r=>{release=r});
 const base=mockBackend(state);const routed=globalThis.fetch;
 globalThis.fetch=async(path,options={})=>{
  if(path==='/api/plan'&&state.planCalls.length===0){const body=JSON.parse(options.body);state.planCalls.push(body);await first;return Response.json({plan,mode:body.mode,source:'ai'})}
  if(path==='/api/plan'){const body=JSON.parse(options.body);state.planCalls.push(body);return Response.json({plan,mode:body.mode,source:'ai'})}
  return routed(path,options);
 };
 try{
  render(mount());
  await ready();
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
  await waitFor(()=>assert.equal(state.planCalls.length,1));

  // Neuladen, während die erste Anfrage noch läuft.
  cleanup();
  render(mount());
  await screen.findByText(/Eine Generierung wurde unterbrochen/);
  await ready();
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
  await screen.findByRole('heading',{name:'Plan A'});
  assert.equal(state.planCalls.length,2);
  assert.equal(state.planCalls[0].requestId,state.planCalls[1].requestId);
  release();
 }finally{cleanup();globalThis.fetch=originalFetch;sessionStorage.clear();localStorage.clear()}
});

test('a dropped connection keeps the draft and resumes the same request',async()=>{
 const state=mockBackend(fresh());
 state.failNetwork=true;
 try{
  render(mount());
  await ready();
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
  await screen.findByText(/Verbindung unterbrochen\. Dein bisheriger Plan bleibt erhalten\./);
  assert.equal(state.planCalls.length,1);
  await ready();
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
  await screen.findByRole('heading',{name:'Plan A'});
  assert.equal(state.planCalls.length,2);
  assert.equal(state.planCalls[0].requestId,state.planCalls[1].requestId);
 }finally{cleanup();globalThis.fetch=originalFetch;sessionStorage.clear();localStorage.clear()}
});

test('switching the browser tab during generation neither aborts nor duplicates the request',async()=>{
 const state=mockBackend(fresh());
 let release;const pending=new Promise(r=>{release=r});
 const planFetch=globalThis.fetch;
 globalThis.fetch=async(path,options={})=>{
  if(path==='/api/plan'){const body=JSON.parse(options.body);state.planCalls.push(body);await pending;return Response.json({plan,mode:body.mode,source:'ai'})}
  return planFetch(path,options);
 };
 try{
  render(mount());
  await ready();
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
  await waitFor(()=>assert.equal(state.planCalls.length,1));
  // Hintergrundwechsel: das Dokument wird verborgen und wieder sichtbar.
  act(()=>{document.dispatchEvent(new Event('visibilitychange'))});
  act(()=>{document.dispatchEvent(new Event('visibilitychange'))});
  assert.equal(state.planCalls.length,1);
  release();
  await screen.findByRole('heading',{name:'Plan A'});
  assert.equal(state.planCalls.length,1);
 }finally{cleanup();globalThis.fetch=originalFetch;sessionStorage.clear();localStorage.clear()}
});

function setOnline(value){
 Object.defineProperty(dom.window.navigator,'onLine',{configurable:true,value});
 // Der Browser löst die Ereignisse außerhalb von React aus; act() sorgt dafür,
 // dass die Aktualisierung im Test sofort sichtbar ist.
 act(()=>{dom.window.dispatchEvent(new Event(value?'online':'offline'))});
}
test('a corrupted stored draft is ignored without losing the pending request',async()=>{
 const state=mockBackend(fresh());
 try{
  sessionStorage.setItem('taktelio-training:'+userId+':'+workspaceId,JSON.stringify({draft:{plan:{title:'Kaputt',blocks:[{}]},criteria:{}},pending:{id:'resume-me',fingerprint:'x'}}));
  render(mount());
  await screen.findByText(/Eine Generierung wurde unterbrochen/);
  assert.equal(screen.queryByText('Kaputt'),null);
  // Die Ansicht bleibt bedienbar; eine neue Anfrage startet normal.
  await ready();
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
  await screen.findByRole('heading',{name:'Plan A'});
  assert.equal(state.planCalls.length,1);
 }finally{cleanup();globalThis.fetch=originalFetch;sessionStorage.clear();localStorage.clear()}
});

test('without a connection the page explains what stays usable and blocks new generation',async()=>{
 const state=mockBackend(fresh());
 try{
  render(mount());
  await ready();
  setOnline(false);
  await screen.findByText(/Keine Verbindung\. Dein bisheriger Entwurf und gespeicherte Einheiten bleiben nutzbar\./);
  assert.equal(screen.getByRole('button',{name:'KI-Training erstellen'}).disabled,true);
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
  assert.equal(state.planCalls.length,0);
  setOnline(true);
  await waitFor(()=>assert.equal(screen.queryByText(/Keine Verbindung\./),null));
  await ready();
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
  await screen.findByRole('heading',{name:'Plan A'});
  assert.equal(state.planCalls.length,1);
 }finally{cleanup();globalThis.fetch=originalFetch;setOnline(true);sessionStorage.clear();localStorage.clear()}
});

test('the plan overview names focus, age group, duration, players and material',async()=>{
 const state=mockBackend(fresh());
 try{
  render(mount());
  await ready();
  fireEvent.change(screen.getByLabelText('Minuten'),{target:{value:'60'}});
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
  await screen.findByRole('heading',{name:'Plan A'});
  // Die Übersicht selbst muss die fünf Angaben nennen, nicht nur das Formular.
  const focus=screen.getByRole('group',{name:'Schwerpunkt und Material'});
  assert.deepEqual([...focus.querySelectorAll('dt')].map(n=>n.textContent),['Schwerpunkt','Material']);
  assert.deepEqual([...focus.querySelectorAll('dd')].map(n=>n.textContent),[criteria.goal,criteria.material]);
  const stats=screen.getByRole('group',{name:'Eckdaten'}).textContent;
  for(const entry of ['Alter','Personen','Minuten','U11','12','60'])assert.ok(stats.includes(entry),entry+' fehlt in der Übersicht');
 }finally{cleanup();globalThis.fetch=originalFetch;sessionStorage.clear();localStorage.clear()}
});

test('required fields and the optional wish are distinguishable',async()=>{
 const state=mockBackend(fresh());
 try{
  render(mount());
  await ready();
  for(const label of ['Altersgruppe','Teilnehmende','Minuten','Schwerpunkt','Verfügbares Material','Fläche']){
   assert.equal(screen.getByLabelText(label).required,true,label+' muss als Pflichtfeld markiert sein');
  }
  const wishes=screen.getByLabelText(/Weitere Wünsche/);
  assert.equal(wishes.required,false);
  assert.match(wishes.labels[0].textContent,/optional/);
  await screen.findByText(/Alle Angaben außer „Weitere Wünsche“ sind Pflichtfelder\./);
 }finally{cleanup();globalThis.fetch=originalFetch;sessionStorage.clear();localStorage.clear()}
});
