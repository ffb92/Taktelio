import {readFile} from 'node:fs/promises';
import {groupSizes,catalogVersion} from '../worker/catalog.mjs';

export const PHASES=['Einstieg','Hauptteil','Spielform','Abschluss'];
export const AGE_GROUPS=[['U9',9],['U11',11],['U13',13],['U15',15],['U17 / U19',17],['Senioren',18]];
export const PLAYERS=[6,24];
export const STATUSES=['unreviewed','reviewed','deprecated'];
const catalogUrl=new URL('../data/exercises.json',import.meta.url);

export async function loadCatalog(){return JSON.parse(await readFile(catalogUrl,'utf8'))}

const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const day=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&!Number.isNaN(Date.parse(v));

// Age groups an exercise can actually serve under the planner's selection rules.
export function exerciseAges(e){
 return AGE_GROUPS.filter(([name,age])=>age>=e.ageMin&&(name==='Senioren'?e.ageMax===18:age<=e.ageMax)).map(([name])=>name);
}

export function feasible(e,ageGroup,players){
 const age=AGE_GROUPS.find(([name])=>name===ageGroup)?.[1];
 return age!==undefined && age>=e.ageMin && (ageGroup==='Senioren'?e.ageMax===18:age<=e.ageMax) && !!groupSizes(players,e.playersMin,e.playersMax);
}

// Returns every problem instead of stopping at the first one, so one run fixes all.
export function validateCatalog(catalog){
 const problems=[],ids=new Set(),titles=new Map();
 if(!Array.isArray(catalog))return [{id:'-',message:'Der Katalog muss ein Array sein.'}];
 catalog.forEach((e,index)=>{
  const id=e&&typeof e==='object'&&!Array.isArray(e)?e.id||`#${index+1}`:`#${index+1}`;
  const add=message=>problems.push({id,message});
  if(!e||typeof e!=='object'||Array.isArray(e))return add('Eintrag ist kein Objekt.');
  if(!text(e.id,40)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.id))add('id: 3–40 Zeichen, nur a–z, 0–9 und Bindestrich.');
  else if(ids.has(e.id))add('id ist doppelt.');else ids.add(e.id);
  if(!int(e.version,1,10000))add('version: ganze Zahl ab 1.');
  if(!text(e.title,200))add('title: 1–200 Zeichen.');else if(titles.has(e.title.trim().toLowerCase()))add(`title doppelt (${titles.get(e.title.trim().toLowerCase())}).`);else titles.set(e.title.trim().toLowerCase(),e.id);
  if(!text(e.topic,60))add('topic: 1–60 Zeichen.');
  if(!PHASES.includes(e.phase))add(`phase: ${PHASES.join(', ')}.`);
  if(!int(e.ageMin,5,18)||!int(e.ageMax,5,18)||e.ageMin>e.ageMax)add('ageMin/ageMax: 5–18, ageMin ≤ ageMax.');
  else if(!exerciseAges(e).length)add('Keine Altersgruppe passt zu ageMin/ageMax.');
  if(!int(e.playersMin,2,24)||!int(e.playersMax,2,24)||e.playersMin>e.playersMax)add('playersMin/playersMax: 2–24, playersMin ≤ playersMax.');
  else if(!Array.from({length:PLAYERS[1]-PLAYERS[0]+1},(_,i)=>PLAYERS[0]+i).some(n=>groupSizes(n,e.playersMin,e.playersMax)))add(`Keine gültige Gruppeneinteilung für ${PLAYERS[0]}–${PLAYERS[1]} Teilnehmende.`);
  if(!int(e.duration,5,30))add('duration: 5–30 Minuten.');
  if(!text(e.fieldSize,100))add('fieldSize: 1–100 Zeichen.');
  if(!text(e.materials,300))add('materials: 1–300 Zeichen.');
  if(!text(e.organization,500))add('organization: 1–500 Zeichen.');
  if(!Array.isArray(e.steps)||e.steps.length<2||e.steps.length>8||!e.steps.every(s=>text(s,500)))add('steps: 2–8 nichtleere Schritte.');
  if(!Array.isArray(e.coaching)||e.coaching.length<1||e.coaching.length>5||!e.coaching.every(s=>text(s,500)))add('coaching: 1–5 nichtleere Punkte.');
  if(!text(e.easier,500))add('easier: 1–500 Zeichen.');
  if(!text(e.harder,500))add('harder: 1–500 Zeichen.');
  if(!text(e.notes,1000))add('notes: 1–1000 Zeichen.');
  if(!text(e.origin,100))add('origin: 1–100 Zeichen.');
  if(!day(e.createdAt))add('createdAt: gültiges Datum JJJJ-MM-TT.');
  if(!STATUSES.includes(e.status))add(`status: ${STATUSES.join(', ')}.`);
  if(e.diagram!==undefined&&(!e.diagram||typeof e.diagram!=='object'||!Array.isArray(e.diagram.objects)||!Array.isArray(e.diagram.arrows)))add('diagram: objects und arrows als Arrays.');
 });
 return problems;
}

export function coverage(catalog){
 return AGE_GROUPS.map(([age])=>{
  const eligible=catalog.filter(e=>exerciseAges(e).includes(age));
  const byPhase=Object.fromEntries(PHASES.map(p=>[p,eligible.filter(e=>e.phase===p).length]));
  const missing=[];
  for(let players=PLAYERS[0];players<=PLAYERS[1];players++){
   const absent=PHASES.filter(phase=>!eligible.some(e=>e.phase===phase&&feasible(e,age,players)));
   if(absent.length)missing.push({players,phases:absent});
  }
  const topics={};
  for(const e of eligible)topics[e.topic]=(topics[e.topic]||0)+1;
  return {age,total:eligible.length,byPhase,missing,topics};
 });
}

export function stableStringify(value){
 if(Array.isArray(value))return '['+value.map(stableStringify).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableStringify(value[k])).join(',')+'}';
 return JSON.stringify(value);
}

export {catalogVersion};
