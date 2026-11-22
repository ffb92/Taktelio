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
// Jeder Block trägt eindeutige Textmarker, damit ein Vergleich alle sichtbaren
// Felder abdeckt und nicht nur Titel, Minuten und Teilnehmerzahl.
const block=(tag,title,phase)=>({sourceExerciseId:'',title,phase,minutes:30,groups:[6,6],organization:`${tag} Organisation`,materials:`${tag} Material`,fieldSize:`${tag} Feld`,steps:[`${tag} Schritt`],coaching:[`${tag} Coaching`],easier:`${tag} leichter`,harder:`${tag} schwerer`,intensity:tag[0]==='A'?'hoch':'niedrig',workRest:`${tag} Belastung`,netPlayingMinutes:tag[0]==='A'?17:11,diagram:{caption:`${tag} Grafik`,objects:[],arrows:[]}});
const planA={title:'Plan A',summary:'Erster Entwurf',blocks:[block('A1','A-Einstieg','Einstieg'),block('A2','A-Spiel','Spielform')]};
const planB={title:'Plan B',summary:'Überarbeitet',blocks:[block('B1','B-Einstieg','Einstieg'),block('B2','B-Spiel','Spielform')]};
// Alle sichtbaren Textfelder eines Plans; fehlende oder verbliebene Inhalte fallen so auf.
const visibleTexts=tags=>tags.flatMap(t=>[`${t} Organisation`,`${t} Material`,`${t} Feld`,`${t} Schritt`,`${t} Coaching`,`${t} leichter`,`${t} schwerer`,`${t} Belastung`,`${t} Grafik`]);
const A_TEXTS=visibleTexts(['A1','A2']),B_TEXTS=visibleTexts(['B1','B2']);
const rx=text=>new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
const savedId='22222222-2222-4222-8222-222222222222';

function mockBackend(){
 const state={planCalls:[],statusCalls:0,saves:[],deleted:[],listing:[],catalog:[],failNextPlan:false,failNextSave:false};
 globalThis.fetch=async(path,options={})=>{
  // Der zweite Aufruf liefert bewusst einen anderen Wert: Nur so belegt die
  // Oberfläche, dass nach der Generierung der Serverwert erneut gelesen wird.
  if(path==='/api/status'){state.statusCalls++;return Response.json({ready:true,message:`${state.statusCalls===1?8:7} von 10 KI-Generierungen verwendet`})}
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
  // Restkontingent kommt nach der Anfrage erneut vom Server (7, nicht der Startwert 8).
  await waitFor(()=>assert.equal(state.statusCalls,2));
  await screen.findByText('7 von 10 KI-Generierungen verwendet');

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
  for(const text of A_TEXTS)assert.ok(screen.getByText(rx(text)),'fehlt nach Rückkehr: '+text);
  for(const text of B_TEXTS)assert.equal(screen.queryByText(rx(text)),null,'Überarbeitung blieb sichtbar: '+text);
  assert.equal(screen.getByLabelText('Minuten').value,'60');
  assert.equal(screen.getByLabelText('Teilnehmende').value,'12');
  assert.equal(screen.getByLabelText('Schwerpunkt').value,'Passspiel und Freilaufen');

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
  // Beim Wiederöffnen müssen alle Inhalte der gespeicherten Einheit zurückkommen.
  for(const text of A_TEXTS)assert.ok(screen.getByText(rx(text)),'fehlt beim Wiederöffnen: '+text);
  for(const text of B_TEXTS)assert.equal(screen.queryByText(rx(text)),null,'fremder Inhalt beim Wiederöffnen: '+text);

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

test('every planning mode is selectable and reaches the shared contract',async()=>{
 const state=mockBackend();
 try{
  render(React.createElement(Training,{workspaceId,onBusy:()=>{}}));
  await waitFor(()=>assert.equal(screen.getByRole('button',{name:'KI-Training erstellen'}).disabled,false));
  for(const mode of ['library','new','hybrid']){
   fireEvent.change(screen.getByLabelText('Planungsmodus'),{target:{value:mode}});
   const before=state.planCalls.length;
   fireEvent.click(screen.getByRole('button',{name:'KI-Training erstellen'}));
   await waitFor(()=>assert.equal(state.planCalls.length,before+1));
   await waitFor(()=>assert.equal(screen.getByRole('button',{name:'KI-Training erstellen'}).disabled,false));
   assert.equal(state.planCalls[before].mode,mode);
  }
  assert.deepEqual(state.planCalls.map(c=>c.mode),['library','new','hybrid']);
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
  assert.match(screen.getByLabelText(/Weitere Wünsche/).value,/Passdreieck/);
 }finally{cleanup();globalThis.fetch=originalFetch;localStorage.clear()}
});
