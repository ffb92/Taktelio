import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.com/'});
for(const name of ['window','document','HTMLElement','HTMLInputElement','Event','location','history','localStorage','sessionStorage'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true,writable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=(await import('react')).default;
const {render,screen,fireEvent,waitFor,cleanup}=await import('@testing-library/react');
const {default:App}=await import('../src/App.jsx');
const {default:Auth}=await import('../src/components/Auth.jsx');
const realFetch=globalThis.fetch;
const clubA={id:'11111111-1111-4111-8111-111111111111',name:'Verein A'},clubB={id:'22222222-2222-4222-8222-222222222222',name:'Verein B'};
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
 try{const calls=mockBackend([clubA,clubB]);render(React.createElement(App));await login();await screen.findByRole('button',{name:'KI-Training erstellen'});fireEvent.click(screen.getByRole('button',{name:'Profil & Verein'}));await screen.findByDisplayValue('Verein A');fireEvent.change(screen.getByLabelText('Verein wechseln'),{target:{value:clubB.id}});await screen.findByDisplayValue('Verein B');await waitFor(()=>assert.ok(calls.some(c=>c.path==='/api/exercises'&&c.options.headers['x-workspace-id']===clubB.id)));fireEvent.click(screen.getByRole('button',{name:'Abmelden'}));await screen.findByRole('button',{name:'Anmelden',exact:true});assert.equal(screen.queryByRole('button',{name:'Profil & Verein'}),null);assert.equal(screen.queryByRole('button',{name:'KI-Training erstellen'}),null)}finally{cleanup();globalThis.fetch=realFetch;localStorage.clear()}
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
