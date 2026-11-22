import {normalizeRecord} from '../../shared/training-plan.mjs';
import React,{useEffect,useState} from 'react';
import {apiFetch} from '../lib/api.js';
import {loadLocalDrafts,LOCAL_DRAFTS_KEY} from '../lib/local-drafts.js';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {ClipboardList,Clock3,HardDrive,Trash2,FolderOpen,LoaderCircle} from 'lucide-react';

const editedFmt=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
const edited=r=>{const value=r.updated_at||r.created_at;const date=value?new Date(value):null;return date&&!Number.isNaN(date.getTime())?editedFmt.format(date):null};

export default function SavedPlans({workspaceId,onOpen}){
 function open(record){const valid=normalizeRecord(record);if(valid)onOpen(valid);else setMessage('Diese Einheit ist unvollständig und kann nicht geöffnet werden. Die gespeicherten Daten bleiben erhalten.')}
 const [rows,setRows]=useState([]),[next,setNext]=useState(null),[local,setLocal]=useState(loadLocalDrafts),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const controller=new AbortController();setBusy(true);apiFetch('/api/storage',{workspaceId,signal:controller.signal}).then(d=>{setRows(d.records);setNext(d.nextOffset)}).catch(e=>{if(e.name!=='AbortError')setMessage(e.message)}).finally(()=>{if(!controller.signal.aborted)setBusy(false)});return()=>controller.abort()},[workspaceId]);
 async function more(){setBusy(true);try{const d=await apiFetch('/api/storage?offset='+next,{workspaceId});setRows(old=>[...old,...d.records]);setNext(d.nextOffset)}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 async function remove(id){if(!confirm('Diese Einheit löschen?'))return;setBusy(true);try{await apiFetch('/api/storage',{workspaceId,body:{action:'delete',id}});setRows(old=>old.filter(r=>r.id!==id))}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 function removeLocal(index){if(!confirm('Gespeicherten lokalen Entwurf löschen?'))return;try{const updated=local.filter((_,i)=>i!==index);localStorage.setItem(LOCAL_DRAFTS_KEY,JSON.stringify(updated));setLocal(updated)}catch{setMessage('Lokaler Speicher nicht verfügbar. Der Entwurf bleibt erhalten.')}}

 return <section>
  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
   <div>
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Archiv</p>
    <h2 className="mt-1 text-2xl font-semibold tracking-tight">Deine Einheiten</h2>
    <p className="mt-1 text-sm text-muted-foreground">Deine gespeicherten Einheiten für deinen Verein.</p>
   </div>
   <Badge variant="secondary" className="w-fit">{rows.length} gespeichert</Badge>
  </div>

  <p role="status" className="mb-4 flex min-h-5 items-center gap-2 text-sm text-muted-foreground">{busy&&<LoaderCircle className="size-4 animate-spin"/>}{busy?'Einheiten werden geladen …':message}</p>

  <div className="space-y-3">
   {rows.map(r=><Card key={r.id} className="gap-0 py-0">
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
     <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="size-5"/></span>
      <div className="min-w-0">
       <h3 className="truncate font-semibold">{typeof r.payload?.plan?.title==='string'?r.payload.plan.title:'Unvollständige Einheit'}</h3>
       <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground"><Clock3 className="size-3.5"/>{r.payload?.criteria?.minutes?`${r.payload.criteria.minutes} Minuten`:'Details beim Öffnen prüfen'}{edited(r)&&<span className="text-muted-foreground/70">· zuletzt bearbeitet {edited(r)}</span>}</p>
      </div>
     </div>
     <div className="flex gap-2 sm:shrink-0">
      <Button variant="outline" size="sm" className="min-h-11" onClick={()=>open({...r.payload,id:r.id})}><FolderOpen/>Öffnen</Button>
      <Button variant="ghost" size="sm" className="min-h-11" disabled={busy} onClick={()=>remove(r.id)}><Trash2/>Löschen</Button>
     </div>
    </div>
   </Card>)}
  </div>

  {!busy&&!rows.length&&<Card className="items-center border-dashed px-6 py-10 text-center">
   <img src="/images/empty-plan.svg" alt="" aria-hidden="true" width="128" height="128" decoding="async" className="h-32 w-32 rounded-2xl object-cover shadow-sm"/>
   <p className="mt-4 text-sm font-medium">Noch keine Einheit gespeichert.</p>
   <p className="mt-1 text-xs text-muted-foreground">Erstelle im Bereich „Planen“ deinen ersten Trainingsentwurf.</p>
  </Card>}

  {next!==null&&<Button variant="outline" className="mt-4 min-h-11" disabled={busy} onClick={more}>Weitere laden</Button>}

  <details className="group mt-8 rounded-xl border bg-card px-4 py-3">
   <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium marker:hidden">
    <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground"><HardDrive className="size-3.5"/></span>
    Frühere lokale Entwürfe auf diesem Gerät
   </summary>
   <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Zum Übernehmen öffnen und anschließend im Verein speichern. Lokale Entwürfe sind nur auf dieser Domain verfügbar.</p>
   <div className="mt-3 space-y-2">
    {local.map((r,i)=><div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2" key={i}>
     <span className="text-sm">{typeof r?.plan?.title==='string'?r.plan.title:'Unvollständiger Entwurf'}</span>
     <div className="flex gap-2">
      <Button variant="outline" size="xs" className="min-h-11" disabled={!normalizeRecord(r)} onClick={()=>open(r)}>Öffnen</Button>
      <Button variant="ghost" size="xs" className="min-h-11" onClick={()=>removeLocal(i)}>Löschen</Button>
     </div>
    </div>)}
   </div>
  </details>
 </section>;
}
