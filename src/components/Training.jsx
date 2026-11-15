import {normalizeRecord} from '../../shared/training-plan.mjs';
import {ageRule} from '../../shared/age-rules.mjs';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Sparkles,SlidersHorizontal,LibraryBig,ClipboardList,LoaderCircle,Save,Printer,Undo2,WandSparkles,CircleAlert,CheckCircle2,Info} from 'lucide-react';
import {apiFetch} from '../lib/api.js';
import Plan from './Plan.jsx';
import Library from './Library.jsx';
import SavedPlans from './SavedPlans.jsx';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {NativeSelect} from '@/components/ui/native-select';
import {cn} from '@/lib/utils';

const initial={age:'U11',players:12,minutes:75,goal:'Passspiel und Freilaufen',material:'8 Bälle, 12 Hütchen, Leibchen, 2 Minitore',space:'Halber Platz',notes:''};
const TABS=[['ai','Planen',Sparkles],['library','Übungen',LibraryBig],['saved','Einheiten',ClipboardList]];

function AgeRuleHint({age}){
 const rule=ageRule(age);
 if(!rule)return null;
 return <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{rule.level}: {rule.gameFormat} · Ballgröße {rule.ballSize} · {rule.heading?`Kopfball ${rule.heading}`:'kein Kopfballtraining'}.</p>;
}

export default function Training({workspaceId,onBusy}){
 const [view,setView]=useState('ai'),[criteria,setCriteria]=useState(initial),[mode,setMode]=useState('hybrid'),[record,setRecord]=useState(null),[previous,setPrevious]=useState(null),[change,setChange]=useState(''),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[status,setStatus]=useState({ready:false,message:'Modellzugang wird geprüft …'}),[catalog,setCatalog]=useState([]),[catalogMessage,setCatalogMessage]=useState('');
 const pending=useRef(null),flight=useRef(false),alive=useRef(true),form=useRef(null);
 const refreshStatus=useCallback(async()=>{try{const d=await apiFetch('/api/status',{workspaceId});if(alive.current)setStatus(d)}catch(e){if(alive.current)setStatus({ready:false,message:e.message})}},[workspaceId]);
 const reloadCatalog=useCallback(async()=>{try{const d=await apiFetch('/api/exercises',{workspaceId});if(alive.current){setCatalog(d.exercises);setCatalogMessage('')}}catch(e){if(alive.current)setCatalogMessage(e.message)}},[workspaceId]);
 useEffect(()=>{alive.current=true;refreshStatus();reloadCatalog();return()=>{alive.current=false}},[refreshStatus,reloadCatalog]);
 const field=(name,value)=>setCriteria(old=>({...old,[name]:value}));
 const load=input=>{const r=normalizeRecord(input);if(!r){setMessage('Diese Einheit ist unvollständig und kann nicht geöffnet werden.');return}setPrevious(record);setRecord(r);setCriteria(r.criteria);setMode(r.mode||'hybrid');setView('ai');setMessage('')};
 async function generate(adjust=false){
  if(flight.current||!form.current.reportValidity())return;
  if(adjust&&!change.trim())return setMessage('Beschreibe zuerst die gewünschte Änderung.');
  if(!status.ready&&!pending.current)return setMessage(status.message);
  flight.current=true;setBusy(true);onBusy(true);setMessage(adjust?'Die KI überarbeitet deine Einheit …':'Die KI plant deine Einheit. Das kann bis zu einer Minute dauern …');
  const payload={criteria,mode,change:adjust?change:'',previous:adjust?record.plan:null};
  const fingerprint=JSON.stringify([workspaceId,payload]);
  if(!pending.current||pending.current.fingerprint!==fingerprint)pending.current={fingerprint,id:crypto.randomUUID()};
  try{
   const d=await apiFetch('/api/plan',{workspaceId,body:{...payload,requestId:pending.current.id}});
   pending.current=null;if(!alive.current)return;
   setPrevious(record);setRecord({...d,criteria});setMessage('Entwurf erstellt. Aufbau, Zeiten und Spielerzahlen geprüft; Inhalte bitte fachlich prüfen.');
  }catch(e){if(e.code==='already_finished'||e.code==='conflict'||(e.status&&![401,503,409,429].includes(e.status)))pending.current=null;if(alive.current)setMessage(e.message||'Verbindung unterbrochen. Dein bisheriger Plan bleibt erhalten.')}
  finally{flight.current=false;if(alive.current){setBusy(false);onBusy(false);await refreshStatus()}}
 }
 async function save(){setSaving(true);const updating=!!record.id;try{const d=await apiFetch('/api/storage',{workspaceId,body:{action:'save',id:record.id||null,payload:record}});if(alive.current){if(d.record?.id)setRecord(old=>old?{...old,id:d.record.id}:old);setMessage(updating?'Einheit aktualisiert.':'Einheit für deinen Verein gespeichert.')}}catch(e){if(alive.current)setMessage(e.message)}finally{if(alive.current)setSaving(false)}}
 async function adopt(block){setSaving(true);try{const age={'U9':9,'U11':11,'U13':13,'U15':15,'U17 / U19':17,'Senioren':18}[record.criteria.age];const payload={title:block.title,topic:record.criteria.goal,phase:block.phase,ageMin:age,ageMax:age,playersMin:Math.min(...block.groups),playersMax:Math.max(...block.groups),duration:block.minutes,fieldSize:block.fieldSize,materials:block.materials,organization:block.organization,steps:block.steps,coaching:block.coaching,easier:block.easier,harder:block.harder,diagram:block.diagram,notes:'Aus einer KI-Einheit übernommen. Fachlich ungeprüft.'};const d=await apiFetch('/api/storage',{workspaceId,body:{action:'adopt',payload}});if(alive.current)setMessage(d.existing?'Dieser Entwurf ist bereits vorhanden.':'Übung im Verein gespeichert.');await reloadCatalog()}catch(e){if(alive.current)setMessage(e.message)}finally{if(alive.current)setSaving(false)}}

 return <section>
  <div className="print-hidden mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
   <div>
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trainingsplanung</p>
    <h2 className="mt-1 text-2xl font-semibold tracking-tight">Deine nächste Einheit</h2>
    <p className="mt-1 text-sm text-muted-foreground">Rahmenbedingungen festlegen, Entwurf prüfen, am Platz nutzen.</p>
   </div>
   <nav aria-label="Training" className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/60 p-1 sm:inline-flex">
    {TABS.map(([id,title,Icon])=><button key={id} type="button" disabled={busy||saving} aria-current={view===id?'page':undefined} onClick={()=>setView(id)} className={cn('flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',view===id?'bg-card text-foreground shadow-sm':'text-muted-foreground hover:text-foreground')}><Icon className="size-4"/>{title}</button>)}
   </nav>
  </div>

  {view==='library'&&<Library catalog={catalog} message={catalogMessage} onPlan={e=>{setCriteria(old=>({...old,goal:e.topic,notes:`Bitte die Übung „${e.title}“ (${e.id}) als einen Baustein verwenden, sofern Alter, Gruppengröße und Material passen.`}));setMode('hybrid');setView('ai')}}/>}
  {view==='saved'&&<SavedPlans workspaceId={workspaceId} onOpen={load}/>}

  <div hidden={view!=='ai'} id="ai" className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)] xl:items-start">
   <Card className="print-hidden gap-0 overflow-hidden py-0 xl:sticky xl:top-20">
    <div className="border-b bg-muted/40 px-5 py-4">
     <Badge variant="secondary" className="mb-2">Trainingsassistent</Badge>
     <h3 className="text-base font-semibold">Dein Ziel. Dein Training.</h3>
     <p role="status" className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
      <span className={cn('size-1.5 rounded-full',status.ready?'bg-brand':'bg-amber-500')}/>
      {status.message}
     </p>
    </div>
    <form ref={form} onSubmit={e=>{e.preventDefault();generate()}}>
     <fieldset disabled={busy||saving} className="space-y-4 px-5 py-5">
      <div>
       <Label htmlFor="ai-age" className="mb-1.5">Altersgruppe</Label>
       <NativeSelect id="ai-age" value={criteria.age} onChange={e=>field('age',e.target.value)}>
        {['U9','U11','U13','U15','U17 / U19','Senioren'].map(a=><option key={a}>{a}</option>)}
       </NativeSelect>
       <AgeRuleHint age={criteria.age}/>
      </div>
      <div className="grid grid-cols-2 gap-3">
       <div><Label htmlFor="ai-players" className="mb-1.5">Teilnehmende</Label><Input id="ai-players" type="number" min={6} max={24} value={criteria.players} onChange={e=>field('players',+e.target.value)} required/></div>
       <div><Label htmlFor="ai-minutes" className="mb-1.5">Minuten</Label><Input id="ai-minutes" type="number" min={30} max={120} value={criteria.minutes} onChange={e=>field('minutes',+e.target.value)} required/></div>
      </div>
      {[['goal','Schwerpunkt',200],['material','Verfügbares Material',400],['space','Fläche',100]].map(([key,title,max])=><div key={key}><Label htmlFor={'ai-'+key} className="mb-1.5">{title}</Label><Input id={'ai-'+key} value={criteria[key]} maxLength={max} onChange={e=>field(key,e.target.value)} required/></div>)}
      <div>
       <Label htmlFor="ai-mode" className="mb-1.5">Planungsmodus</Label>
       <NativeSelect id="ai-mode" value={mode} onChange={e=>setMode(e.target.value)}>
        <option value="hybrid">Grundstock + neue Ideen</option>
        <option value="library">Nur auf Basis des Grundstocks</option>
        <option value="new">Neue Übungen entwerfen</option>
       </NativeSelect>
      </div>
      <div className="flex gap-2 rounded-lg bg-muted/70 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
       <Info className="mt-0.5 size-3.5 shrink-0"/>Übungsentwürfe als Grundlage. Alle fachlich ungeprüft. Die KI passt Gruppen und Ablauf an eure Vorgaben an.
      </div>
      <div><Label htmlFor="ai-notes" className="mb-1.5">Weitere Wünsche</Label><Textarea id="ai-notes" rows={3} maxLength={1000} value={criteria.notes} onChange={e=>field('notes',e.target.value)}/></div>
      <Button type="submit" size="lg" className="min-h-11 w-full" disabled={busy||!(status.ready||pending.current)}>
       {busy?<LoaderCircle className="animate-spin"/>:<Sparkles/>}
       KI-Training erstellen
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">Bitte keine Spielernamen oder Gesundheitsdaten eingeben. KI-Entwürfe vor dem Training fachlich prüfen.</p>
     </fieldset>
    </form>
   </Card>

   <div className="min-w-0 space-y-4">
    <div className="print-hidden relative overflow-hidden rounded-2xl bg-primary px-5 py-6 text-primary-foreground shadow-sm sm:px-7 sm:py-7">
     <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/10 blur-2xl" aria-hidden="true"/>
     <div className="pointer-events-none absolute -bottom-24 right-10 size-48 rounded-full bg-brand-lime/20 blur-3xl" aria-hidden="true"/>
     <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">Dein individueller Trainingsentwurf</p>
     <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Dein Training. Gut vorbereitet.</h2>
     <p className="mt-2 max-w-lg text-sm leading-relaxed text-primary-foreground/75">Übungen, Gruppeneinteilung, Material und Coachingpunkte – zusammen geplant.</p>
    </div>

    <p role="status" aria-live="polite" className={cn('print-hidden flex items-start gap-2 text-sm leading-relaxed',message?'rounded-xl border bg-card px-4 py-3':'sr-only')}>
     {message&&<CircleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground"/>}{message}
    </p>

    <Plan record={record} onAdopt={adopt} busy={busy||saving}/>

    {record&&<Card className="print-hidden gap-0 py-0">
     <div className="border-b bg-muted/40 px-5 py-4">
      <p className="text-sm font-semibold">Einheit anpassen</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Teilnehmerzahl, Dauer und Material bei Bedarf im Formular ändern.</p>
     </div>
     <div className="space-y-3 px-5 py-5">
      <Label htmlFor="ai-change" className="sr-only">Einheit anpassen</Label>
      <Input id="ai-change" value={change} maxLength={1000} disabled={busy||saving} onChange={e=>setChange(e.target.value)} placeholder="Zum Beispiel: einfachere Übungen, weniger Umbauten"/>
      <div className="flex flex-wrap gap-2">
       <Button variant="default" disabled={busy||saving||!(status.ready||pending.current)} onClick={()=>generate(true)}><WandSparkles/>Anpassung vorschlagen</Button>
       <Button variant="outline" disabled={busy||saving||!previous} onClick={()=>{setPrevious(record);setRecord(previous);setCriteria(previous.criteria);setMode(previous.mode||'hybrid')}}><Undo2/>Vorherige Version</Button>
       <Button variant="outline" disabled={busy||saving} onClick={save}><Save/>Einheit speichern</Button>
       <Button variant="ghost" onClick={()=>window.print()}><Printer/>Drucken / PDF</Button>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 className="size-3.5"/>Gespeicherte Einheiten findest du jederzeit unter „Einheiten“.</p>
     </div>
    </Card>}
   </div>
  </div>
 </section>;
}
