import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.com/'});
for(const name of ['window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','Event','CustomEvent','KeyboardEvent','MouseEvent','PointerEvent','Element','Node','location','history','localStorage','sessionStorage','MutationObserver','confirm','prompt'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true,writable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
Object.defineProperty(globalThis,'getComputedStyle',{value:dom.window.getComputedStyle.bind(dom.window),configurable:true,writable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=(await import('react')).default;
const {render,screen,fireEvent,waitFor,cleanup}=await import('@testing-library/react');
const {default:Training}=await import('../src/components/Training.jsx');
const originalFetch=globalThis.fetch;
const workspaceId='11111111-1111-4111-8111-111111111111';
const criteria={age:'U11',players:12,minutes:60,goal:'Passen',material:'Bälle',space:'Halber Platz',notes:''};
const block=(title,phase)=>({sourceExerciseId:'',title,phase,minutes:30,groups:[6,6],organization:'Zwei Felder',materials:'Bälle',fieldSize:'20 x 20 m',steps:['Passen und freilaufen'],coaching:['Anbieten'],easier:'Mehr Raum',harder:'Weniger Kontakte',intensity:'mittel',workRest:'3 × 4 Min., 90 Sek. Pause',netPlayingMinutes:12,diagram:{caption:'Sechs Personen pro Feld',objects:[],arrows:[]}});
const planA={title:'Plan A',summary:'Erster Entwurf',blocks:[block('A-Einstieg','Einstieg'),block('A-Spiel','Spielform')]};
const planB={title:'Plan B',summary:'Überarbeitet',blocks:[block('B-Einstieg','Einstieg'),block('B-Spiel','Spielform')]};
const savedId='22222222-2222-4222-8222-222222222222';

function mockBackend(){
 const state={planCalls:[],statusCalls:0,saves:[],deleted:[],listing:[],catalog:[],failNextPlan:false,failNextSave:false};
 globalThis.fetch=async(path,options={})=>{
  if(path==='/api/status'){state.statusCalls++;return Response.json({ready:true,message:`${state.saves.length?0:state.statusCalls-1} von 10 KI-Generierungen verwendet`})}
  if(path==='/api/exercises')return Response.json({exercises:state.catalog});
  if(path==='/api/plan'){
   const body=JSON.parse(options.body);state.planCalls.push(body);
   if(state.failNextPlan){state.failNextPlan=false;return Response.json({error:'Vorübergehend nicht erreichbar'},{status:503})}
   return Response.json({plan:body.change?planB:planA,mode:'hybrid',source:'ai'});
  }
  if(path==='/api/storage'){
   const method=options.method||'GET';
   if(method==='GET')return Response.json({records:state.listing,nextOffset:null});
   const body=JSON.parse(options.body);
   if(state.failNextSave){state.failNextSave=false;return Response.json({error:'Diese Einheit ist nicht mehr vorhanden. Bitte erneut speichern.'},{status:404})}
   if(body.action==='save'){
    state.saves.push(body);
    if(!body.id){const row={id:savedId,payload:body.payload,created_at:'2026-11-22T10:00:00.000Z',updated_at:'2026-11-22T10:00:00.000Z'};state.listing=[row];return Response.json({record:row})}
    const row=state.listing.find(r=>r.id===body.id)||{id:body.id,payload:body.payload};
    row.payload=body.payload;return Response.json({record:row});
   }
   if(body.action==='delete'){state.deleted.push(body.id);state.listing=state.listing.filter(r=>r.id!==body.id);return Response.json({ok:true})}
  }
  throw Error('Unexpected request: '+path);
 };
 return state;
}

test('P1 journey: generate, adjust, restore, save, reopen and delete keep every step visible',async()=>{
 const state=mockBackend();
 globalThis.confirm=()=>true;
 try{
  render(React.createElement(Training,{workspaceId,onBusy:()=>{}}));
  await waitFor(()=>assert.equal(screen.getByRole('button',{name:'KI-Training erstellen'}).disabled,false));
  fireEvent.change(screen.getByLabelText('Minuten'),{target:{value:'60'}});

  // Erzeugung
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
  await screen.findByRole('heading',{name:'Plan A'});
  assert.equal(state.planCalls.length,1);
  assert.equal(state.planCalls[0].criteria.minutes,60);
  assert.equal(state.planCalls[0].mode,'hybrid');
  // Restkontingent kommt nach der Anfrage erneut vom Server
  await waitFor(()=>assert.equal(state.statusCalls,2));
  await screen.findByText(/von 10 KI-Generierungen verwendet/);

  // Änderung mit dem letzten gültigen Plan als Vorlage
  fireEvent.change(screen.getByPlaceholderText(/einfachere Übungen/),{target:{value:'nur noch 5 Bälle'}});
  fireEvent.click(screen.getByRole('button',{name:'Anpassung vorschlagen'}));
  await screen.findByRole('heading',{name:'Plan B'});
  assert.equal(state.planCalls.length,2);
  assert.equal(state.planCalls[1].change,'nur noch 5 Bälle');
  assert.deepEqual(state.planCalls[1].previous,planA);

  // Rückkehr zur Vorversion stellt alle Blöcke und Eingaben wieder her
  fireEvent.click(screen.getByRole('button',{name:'Vorherige Version'}));
  await screen.findByRole('heading',{name:'Plan A'});
  assert.ok(screen.getByRole('heading',{name:'A-Einstieg'}));
  assert.ok(screen.getByRole('heading',{name:'A-Spiel'}));
  assert.equal(screen.getByLabelText('Minuten').value,'60');
  assert.equal(screen.getByLabelText('Teilnehmende').value,'12');

  // Speichern
  fireEvent.click(screen.getByRole('button',{name:'Einheit speichern'}));
  await screen.findByText('Einheit für deinen Verein gespeichert.');
  assert.equal(state.saves[0].action,'save');
  assert.equal(state.saves[0].payload.plan.title,'Plan A');

  // Wiederöffnen nach erneutem Aufruf der Liste
  fireEvent.click(screen.getByRole('button',{name:'Einheiten',exact:true}));
  await screen.findByRole('heading',{name:'Plan A'});
  fireEvent.click(screen.getByRole('button',{name:'Öffnen',exact:true}));
  await screen.findByRole('button',{name:'Einheit speichern'});
  assert.equal(screen.getByLabelText('Minuten').value,'60');
  assert.equal(screen.getByLabelText('Teilnehmende').value,'12');
  assert.ok(screen.getByRole('heading',{name:'A-Einstieg'}));
  assert.ok(screen.getByRole('heading',{name:'A-Spiel'}));

  // Löschen
  fireEvent.click(screen.getByRole('button',{name:'Einheiten',exact:true}));
  await screen.findByRole('heading',{name:'Plan A'});
  fireEvent.click(screen.getByRole('button',{name:'Löschen'}));
  await waitFor(()=>assert.deepEqual(state.deleted,[savedId]));
  await screen.findByText('Noch keine Einheit gespeichert.');
 }finally{cleanup();globalThis.fetch=originalFetch;globalThis.confirm=dom.window.confirm;localStorage.clear()}
});

test('saving an adjusted, already stored unit updates that unit instead of creating a duplicate',async()=>{
 const state=mockBackend();
 try{
  state.listing=[{id:savedId,payload:{criteria,mode:'hybrid',plan:planA},created_at:'2026-11-22T10:00:00.000Z',updated_at:'2026-11-22T10:00:00.000Z'}];
  render(React.createElement(Training,{workspaceId,onBusy:()=>{}}));
  await waitFor(()=>assert.equal(screen.getByRole('button',{name:'KI-Training erstellen'}).disabled,false));
  fireEvent.click(screen.getByRole('button',{name:'Einheiten',exact:true}));
  await screen.findByRole('heading',{name:'Plan A'});
  fireEvent.click(screen.getByRole('button',{name:'Öffnen',exact:true}));
  await screen.findByRole('button',{name:'Einheit speichern'});

  fireEvent.change(screen.getByPlaceholderText(/einfachere Übungen/),{target:{value:'nur noch 5 Bälle'}});
  fireEvent.click(screen.getByRole('button',{name:'Anpassung vorschlagen'}));
  await screen.findByRole('heading',{name:'Plan B'});
  fireEvent.click(screen.getByRole('button',{name:'Einheit speichern'}));
  await screen.findByText('Einheit aktualisiert.');
  assert.equal(state.saves[0].id,savedId);
  assert.equal(state.saves.length,1);
 }finally{cleanup();globalThis.fetch=originalFetch;localStorage.clear()}
});

test('a unit deleted elsewhere stays recoverable when saving again',async()=>{
 const state=mockBackend();
 try{
  state.listing=[{id:savedId,payload:{criteria,mode:'hybrid',plan:planA},created_at:'2026-11-22T10:00:00.000Z',updated_at:'2026-11-22T10:00:00.000Z'}];
  render(React.createElement(Training,{workspaceId,onBusy:()=>{}}));
  await waitFor(()=>assert.equal(screen.getByRole('button',{name:'KI-Training erstellen'}).disabled,false));
  fireEvent.click(screen.getByRole('button',{name:'Einheiten',exact:true}));
  await screen.findByRole('heading',{name:'Plan A'});
  fireEvent.click(screen.getByRole('button',{name:'Öffnen',exact:true}));
  await screen.findByRole('button',{name:'Einheit speichern'});

  state.failNextSave=true;
  fireEvent.click(screen.getByRole('button',{name:'Einheit speichern'}));
  await screen.findByText(/nicht mehr vorhanden/);
  // Nach dem 404 muss ein erneutes Speichern als neue Einheit möglich sein.
  fireEvent.click(screen.getByRole('button',{name:'Einheit speichern'}));
  await screen.findByText('Einheit für deinen Verein gespeichert.');
  assert.equal(state.saves.length,1);
  assert.equal(state.saves[0].id,null);
 }finally{cleanup();globalThis.fetch=originalFetch;localStorage.clear()}
});

test('a failed change request keeps inputs, change text and the last valid plan',async()=>{
 const state=mockBackend();
 try{
  render(React.createElement(Training,{workspaceId,onBusy:()=>{}}));
  await waitFor(()=>assert.equal(screen.getByRole('button',{name:'KI-Training erstellen'}).disabled,false));
  fireEvent.change(screen.getByLabelText('Minuten'),{target:{value:'60'}});
  fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
  await screen.findByRole('heading',{name:'Plan A'});

  fireEvent.change(screen.getByPlaceholderText(/einfachere Übungen/),{target:{value:'nur noch 5 Bälle'}});
  state.failNextPlan=true;
  fireEvent.click(screen.getByRole('button',{name:'Anpassung vorschlagen'}));
  await screen.findByText('Vorübergehend nicht erreichbar');
  assert.ok(screen.getByRole('heading',{name:'Plan A'}));
  assert.equal(screen.getByLabelText('Minuten').value,'60');
  assert.equal(screen.getByLabelText('Teilnehmende').value,'12');
  assert.equal(screen.getByPlaceholderText(/einfachere Übungen/).value,'nur noch 5 Bälle');

  // Die Wiederholung setzt dieselbe Anfragekennung und denselben letzten Plan fort.
  fireEvent.click(screen.getByRole('button',{name:'Anpassung vorschlagen'}));
  await screen.findByRole('heading',{name:'Plan B'});
  assert.equal(state.planCalls.length,3);
  assert.equal(state.planCalls[1].requestId,state.planCalls[2].requestId);
  assert.deepEqual(state.planCalls[2].previous,planA);
 }finally{cleanup();globalThis.fetch=originalFetch;localStorage.clear()}
});

test('a library exercise starts the planner with the shared criteria and one of three modes',async()=>{
 const state=mockBackend();
 state.catalog=[{id:'ex-1',title:'Passdreieck',topic:'Passspiel',ageMin:9,ageMax:13,playersMin:6,playersMax:12,duration:20,organization:'Dreieck bilden',materials:'Bälle',scope:'global',notes:'',origin:'Grundstock',version:1}];
 try{
  render(React.createElement(Training,{workspaceId,onBusy:()=>{}}));
  await waitFor(()=>assert.equal(screen.getByRole('button',{name:'KI-Training erstellen'}).disabled,false));
  fireEvent.click(screen.getByRole('button',{name:'Übungen',exact:true}));
  await screen.findByRole('heading',{name:'Passdreieck'});
  fireEvent.click(screen.getByRole('button',{name:'Training damit planen'}));

  const mode=screen.getByLabelText('Planungsmodus');
  assert.equal(mode.value,'hybrid');
  assert.deepEqual([...mode.options].map(o=>o.value),['hybrid','library','new']);
  assert.equal(screen.getByLabelText('Schwerpunkt').value,'Passspiel');
  assert.match(screen.getByLabelText('Weitere Wünsche').value,/Passdreieck/);
 }finally{cleanup();globalThis.fetch=originalFetch;localStorage.clear()}
});
