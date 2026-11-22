import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {apiFetch} from '../lib/api.js';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {NativeSelect} from '@/components/ui/native-select';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {cn} from '@/lib/utils';
import {EVENT_KIND_LABELS,RESPONSE_LABELS} from '../../shared/events.mjs';
import {CalendarDays,CalendarPlus,Check,Clock3,HelpCircle,LoaderCircle,MapPin,Pencil,Trash2,Users,X,Ban,ClipboardList} from 'lucide-react';

const dateFmt=new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
const dayFmt=new Intl.DateTimeFormat('de-DE',{day:'2-digit'});
const monthFmt=new Intl.DateTimeFormat('de-DE',{month:'short'});
const weekdayFmt=new Intl.DateTimeFormat('de-DE',{weekday:'short'});
const timeFmt=new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'});
const pad=value=>String(value).padStart(2,'0');
function localInput(iso){
 if(!iso)return '';
 const d=new Date(iso);
 if(!Number.isFinite(d.getTime()))return '';
 return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function isoFromLocal(value){const d=new Date(value);return value&&Number.isFinite(d.getTime())?d.toISOString():''}
function defaultStart(){const d=new Date();d.setDate(d.getDate()+1);d.setHours(18,0,0,0);return localInput(d.toISOString())}
function timeRange(event){const start=timeFmt.format(new Date(event.startsAt));const end=event.endsAt?timeFmt.format(new Date(event.endsAt)):'';return end?`${start}–${end} Uhr`:`${start} Uhr`}
function isPast(event){return Date.parse(event.endsAt||event.startsAt)<Date.now()}

const RESPONSES=[['accepted','Zusage',Check],['maybe','Vielleicht',HelpCircle],['declined','Absage',X]];

function ResponseButtons({event,onRespond,busy,compact=false}){
 const disabled=busy||!!event.cancelledAt;
 const deadline=Date.parse(event.responseDeadline||event.startsAt);
 const closed=!disabled&&Date.now()>=deadline;
 return <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Deine Rückmeldung">
  {RESPONSES.map(([status,label,Icon])=>{
   const active=event.myResponse?.status===status;
   return <button key={status} type="button" disabled={disabled||closed} aria-pressed={active} onClick={()=>onRespond(event,status)} className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',active?'border-primary bg-primary text-primary-foreground':status==='declined'?'border-border bg-card text-muted-foreground hover:border-destructive/40 hover:text-destructive':'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground')}>
    <Icon className="size-3.5"/>{label}
    {!compact&&event.summary[status]?<span className={cn('ml-0.5 tabular-nums',active?'text-primary-foreground/75':'text-muted-foreground/80')}>{event.summary[status]}</span>:null}
   </button>;
  })}
  {closed&&<span className="text-xs text-muted-foreground">Rückmeldung geschlossen</span>}
 </div>;
}

function EventForm({workspaceId,teams,event,plans,onSaved,onClose}){
 const editing=!!event;
 const [form,setForm]=useState(()=>({
  teamId:event?.teamId||teams[0]?.id||'',
  kind:event?.kind||'training',
  title:event?.title||'',
  startsAt:localInput(event?.startsAt)||defaultStart(),
  endsAt:localInput(event?.endsAt),
  meetAt:localInput(event?.meetAt),
  responseDeadline:localInput(event?.responseDeadline),
  location:event?.location||'',
  notes:event?.notes||'',
  trainingPlanId:event?.myTrainingPlan?.id||'',
 }));
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 // Eine Kennung je Formularsitzung: Ein Wiederholungsversuch nach einem Fehler
 // legt keinen zweiten Termin an, sondern setzt dieselbe Anfrage fort.
 const [requestId]=useState(()=>crypto.randomUUID());
 const field=(key,value)=>setForm(old=>({...old,[key]:value}));
 async function submit(e){
  e.preventDefault();setBusy(true);setMessage('');
  try{
   await apiFetch('/api/events',{workspaceId,body:{
    action:editing?'update':'create',...(editing?{id:event.id}:{}),...(editing?{}:{requestId}),
    // Der eigene Planbezug ist optional; eine leere Auswahl entfernt ihn gezielt.
    trainingPlanId:form.trainingPlanId||null,
    teamId:form.teamId,kind:form.kind,title:form.title,
    startsAt:isoFromLocal(form.startsAt),endsAt:isoFromLocal(form.endsAt)||null,
    meetAt:isoFromLocal(form.meetAt)||null,responseDeadline:isoFromLocal(form.responseDeadline)||null,
    location:form.location,notes:form.notes,
   }});
   onSaved();
  }catch(error){setMessage(error.message)}finally{setBusy(false)}
 }
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose()}}>
  <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
   <DialogHeader>
    <DialogTitle>{editing?'Termin bearbeiten':'Neuer Termin'}</DialogTitle>
    <DialogDescription>Mannschaft, Zeitpunkt und Treffpunkt. Die Mannschaft bestimmt, wer den Termin sieht.</DialogDescription>
   </DialogHeader>
   <form className="space-y-4" onSubmit={submit}>
    <div className="grid gap-3 sm:grid-cols-2">
     <div><Label htmlFor="event-team" className="mb-1.5">Mannschaft</Label><NativeSelect id="event-team" required value={form.teamId} onChange={e=>field('teamId',e.target.value)}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</NativeSelect></div>
     <div><Label htmlFor="event-kind" className="mb-1.5">Art</Label><NativeSelect id="event-kind" value={form.kind} onChange={e=>field('kind',e.target.value)}><option value="training">Training</option><option value="match">Spiel</option><option value="other">Sonstiges</option></NativeSelect></div>
    </div>
    <div><Label htmlFor="event-title" className="mb-1.5">Titel</Label><Input id="event-title" required maxLength={120} placeholder="Zum Beispiel Abschlusstraining" value={form.title} onChange={e=>field('title',e.target.value)}/></div>
    <div className="grid gap-3 sm:grid-cols-2">
     <div><Label htmlFor="event-start" className="mb-1.5">Beginn</Label><Input id="event-start" type="datetime-local" required value={form.startsAt} onChange={e=>field('startsAt',e.target.value)}/></div>
     <div><Label htmlFor="event-end" className="mb-1.5">Ende (optional)</Label><Input id="event-end" type="datetime-local" value={form.endsAt} onChange={e=>field('endsAt',e.target.value)}/></div>
     <div><Label htmlFor="event-meet" className="mb-1.5">Treffpunkt (optional)</Label><Input id="event-meet" type="datetime-local" value={form.meetAt} onChange={e=>field('meetAt',e.target.value)}/><p className="mt-1 text-xs text-muted-foreground">Zum Beispiel 15 Minuten vor Beginn.</p></div>
     <div><Label htmlFor="event-deadline" className="mb-1.5">Rückmeldung bis (optional)</Label><Input id="event-deadline" type="datetime-local" value={form.responseDeadline} onChange={e=>field('responseDeadline',e.target.value)}/><p className="mt-1 text-xs text-muted-foreground">Ohne Angabe bis zum Beginn.</p></div>
    </div>
    <div><Label htmlFor="event-location" className="mb-1.5">Ort</Label><Input id="event-location" maxLength={200} placeholder="Zum Beispiel Sportplatz Nord" value={form.location} onChange={e=>field('location',e.target.value)}/></div>
    <div>
     <Label htmlFor="event-plan" className="mb-1.5">Eigene Einheit <span className="font-normal text-muted-foreground">(optional)</span></Label>
     <NativeSelect id="event-plan" value={form.trainingPlanId} onChange={e=>field('trainingPlanId',e.target.value)}>
      <option value="">Keine Einheit verknüpfen</option>
      {plans.map(plan=><option key={plan.id} value={plan.id}>{plan.title}</option>)}
     </NativeSelect>
     <p className="mt-1 text-xs text-muted-foreground">Nur du siehst diese Verknüpfung. Mitspieler sehen den Plan nicht.</p>
    </div>
    <div><Label htmlFor="event-notes" className="mb-1.5">Hinweise</Label><Textarea id="event-notes" rows={3} maxLength={2000} placeholder="Treffpunkt, Ausrüstung oder organisatorische Hinweise" value={form.notes} onChange={e=>field('notes',e.target.value)}/></div>
    {message&&<p role="status" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{message}</p>}
    <DialogFooter>
     <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Abbrechen</Button>
     <Button type="submit" disabled={busy||!teams.length}>{busy?<LoaderCircle className="animate-spin"/>:<CalendarPlus/>}{editing?'Änderungen speichern':'Termin anlegen'}</Button>
    </DialogFooter>
   </form>
  </DialogContent>
 </Dialog>;
}

function EventDetail({workspaceId,event,onChanged,onEdit,onOpenPlan,onClose}){
 const [note,setNote]=useState(event.myResponse?.note||''),[busy,setBusy]=useState(''),[message,setMessage]=useState('');
 async function respond(status){
  setBusy(status);setMessage('');
  try{await apiFetch('/api/events/respond',{workspaceId,body:{eventId:event.id,status,note}});onChanged()}
  catch(error){setMessage(error.message)}finally{setBusy('')}
 }
 async function manage(action,name){
  setBusy(action);setMessage('');
  // Auch das Löschen braucht die Termin-ID; ohne sie kann der Server den Termin
  // nicht zuordnen und lehnt die Anfrage ab.
  try{await apiFetch('/api/events',{workspaceId,body:{action,id:event.id,...(action==='cancel'?{cancelled:!event.cancelledAt}:{})}});onChanged(name)}
  catch(error){setMessage(error.message)}finally{setBusy('')}
 }
 const responded=new Map((event.responses||[]).map(r=>[r.userId,r.status]));
 const people=(event.roster||[]).map(person=>({...person,status:responded.get(person.userId)||null}));
 const order={accepted:0,maybe:1,null:2,declined:3};
 people.sort((a,b)=>(order[a.status]??2)-(order[b.status]??2)||a.name.localeCompare(b.name,'de'));
 const deadline=Date.parse(event.responseDeadline||event.startsAt);

 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose()}}>
  <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
   <DialogHeader>
    <div className="flex flex-wrap items-center gap-2 pr-8">
     <Badge variant="secondary">{EVENT_KIND_LABELS[event.kind]}</Badge>
     <Badge variant="outline"><Users className="size-3"/>{event.teamName}</Badge>
     {event.cancelledAt&&<Badge variant="destructive">Abgesagt</Badge>}
    </div>
    <DialogTitle className="text-xl">{event.title}</DialogTitle>
    <DialogDescription asChild>
     <div className="space-y-1.5 text-sm text-muted-foreground">
      <p className="flex items-center gap-2 text-foreground"><CalendarDays className="size-4 text-primary"/>{dateFmt.format(new Date(event.startsAt))} · {timeRange(event)}</p>
      {event.meetAt&&<p className="flex items-center gap-2"><Clock3 className="size-4 text-primary"/>Treffpunkt {timeFmt.format(new Date(event.meetAt))} Uhr</p>}
      {event.location&&<p className="flex items-center gap-2"><MapPin className="size-4 text-primary"/>{event.location}</p>}
     </div>
    </DialogDescription>
   </DialogHeader>

   {event.notes&&<p className="whitespace-pre-line rounded-xl bg-muted/60 px-4 py-3 text-sm leading-relaxed">{event.notes}</p>}

   {event.myTrainingPlan&&<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
    <span className="min-w-0 text-sm"><span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">Deine Einheit</span><span className="block truncate font-medium">{event.myTrainingPlan.title}</span></span>
    <Button variant="outline" className="min-h-11 shrink-0" onClick={()=>onOpenPlan(event.myTrainingPlan.id)}><ClipboardList/>Plan öffnen</Button>
   </div>}

   {!event.cancelledAt&&(event.myTeamRole==='player'?<div className="space-y-2 rounded-xl border px-4 py-4">
    <p className="text-sm font-medium">Deine Rückmeldung</p>
    <ResponseButtons event={event} busy={!!busy} onRespond={(_,status)=>respond(status)}/>
    <Label htmlFor="event-response-note" className="sr-only">Hinweis zur Rückmeldung</Label>
    <Input id="event-response-note" maxLength={500} value={note} onChange={e=>setNote(e.target.value)} placeholder="Optionaler Hinweis, zum Beispiel spätere Ankunft"/>
    <p className="text-xs text-muted-foreground">{Date.now()>=deadline?'Die Rückmeldefrist ist abgelaufen.':event.responseDeadline?`Rückmeldung bis ${dateFmt.format(new Date(event.responseDeadline))} um ${timeFmt.format(new Date(event.responseDeadline))} Uhr.`:'Rückmeldung bis zum Beginn möglich.'} Der Hinweis wird mit deiner Rückmeldung gespeichert.</p>
   </div>:(event.myTeamRole==='coach'?<p className="rounded-xl border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground">Du betreust {event.teamName}. Die Rückmeldungen der Spieler siehst du unten.</p>:<p className="rounded-xl border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground">Du gehörst nicht zur Mannschaft {event.teamName}. Nur Teilnehmende können zu- oder absagen; die Antworten siehst du unten.</p>))}

   <div>
    <div className="flex items-center justify-between gap-2">
     <h3 className="text-sm font-semibold">Anwesenheit</h3>
     <p className="text-xs text-muted-foreground">{event.summary.accepted} zu · {event.summary.maybe} vielleicht · {event.summary.declined} ab · {event.summary.open} offen</p>
    </div>
    <div className="mt-2 divide-y rounded-xl border">
     {people.map(person=><div key={person.userId} className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="truncate text-sm">{person.name}{person.userId===event.myUserId?' (du)':''}</span>
      <Badge variant={person.status==='accepted'?'default':person.status==='declined'?'destructive':'secondary'}>{person.status?RESPONSE_LABELS[person.status]:'Offen'}</Badge>
     </div>)}
     {!people.length&&<p className="px-3 py-3 text-sm text-muted-foreground">Noch keine Personen in dieser Mannschaft.</p>}
    </div>
   </div>

   {message&&<p role="status" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{message}</p>}

   {event.canManage&&<DialogFooter className="flex-wrap">
    <Button variant="outline" disabled={!!busy} onClick={onEdit}><Pencil/>Bearbeiten</Button>
    <Button variant="outline" disabled={!!busy} onClick={()=>manage('cancel')}><Ban/>{event.cancelledAt?'Reaktivieren':'Absagen'}</Button>
    <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={!!busy} onClick={()=>{if(confirm('Diesen Termin endgültig löschen? Die Rückmeldungen werden mit gelöscht.'))manage('delete','delete')}}><Trash2/>Löschen</Button>
   </DialogFooter>}
  </DialogContent>
 </Dialog>;
}

export default function Events({workspaceId,onOpenPlan}){
 const [events,setEvents]=useState([]),[teams,setTeams]=useState([]),[plans,setPlans]=useState([]),[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[filter,setFilter]=useState('all'),[selectedId,setSelectedId]=useState(null),[formOpen,setFormOpen]=useState(false),[editing,setEditing]=useState(null),[canManage,setCanManage]=useState(false);
 const load=useCallback(async(signal)=>{
  const [eventData,teamData]=await Promise.all([
   apiFetch('/api/events',{workspaceId,signal}),
   apiFetch('/api/teams',{workspaceId,signal}),
  ]);
  setEvents(eventData.events);setCanManage(eventData.canManage);setTeams(teamData.teams);
 },[workspaceId]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);load(controller.signal).catch(e=>{if(e.name!=='AbortError')setMessage(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[load]);
 // Eigene gespeicherte Einheiten für den optionalen Planbezug. Die Liste ist
 // durch die Datenbankregeln auf den eigenen Bestand begrenzt.
 useEffect(()=>{const controller=new AbortController();apiFetch('/api/storage',{workspaceId,signal:controller.signal}).then(d=>setPlans((d.records||[]).map(r=>({id:r.id,title:typeof r.payload?.plan?.title==='string'?r.payload.plan.title:'Eigene Einheit'})))).catch(()=>{});return()=>controller.abort()},[workspaceId]);

 const visibleTeams=useMemo(()=>canManage?teams:teams.filter(t=>t.myRole),[teams,canManage]);
 const filtered=useMemo(()=>filter==='all'?events:events.filter(e=>e.teamId===filter),[events,filter]);
 const upcoming=filtered.filter(event=>!isPast(event)).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
 const past=filtered.filter(isPast).sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt));
 const selected=events.find(e=>e.id===selectedId)||null;

 async function respond(event,status){
  setMessage('');
  try{await apiFetch('/api/events/respond',{workspaceId,body:{eventId:event.id,status,note:event.myResponse?.note||''}});await load()}
  catch(error){setMessage(error.message)}
 }
 async function refresh(close){
  await load();
  if(close==='delete')setSelectedId(null);
 }
 function openCreate(){setEditing(null);setFormOpen(true)}
 function openEdit(event){setSelectedId(null);setEditing(event);setFormOpen(true)}

 return <section className="space-y-5">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
   <div>
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Mannschaft</p>
    <h2 className="mt-1 text-2xl font-semibold tracking-tight">Termine und Anwesenheit</h2>
    <p className="mt-1 text-sm text-muted-foreground">Trainings, Spiele und Treffen. Alle sagen direkt in der App zu oder ab.</p>
   </div>
   {canManage&&<Button size="lg" className="min-h-11" disabled={!teams.length} onClick={openCreate}><CalendarPlus/>Termin anlegen</Button>}
  </div>

  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
   <div className="flex items-center gap-2">
    <Label htmlFor="event-filter" className="sr-only">Mannschaft filtern</Label>
    <NativeSelect id="event-filter" className="min-w-52" value={filter} onChange={e=>setFilter(e.target.value)}>
     <option value="all">Alle Mannschaften</option>
     {visibleTeams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
    </NativeSelect>
   </div>
   <Badge variant="secondary" className="w-fit">{upcoming.length} anstehend</Badge>
  </div>

  <p role="status" className="flex min-h-5 items-center gap-2 text-sm text-muted-foreground">{loading&&<LoaderCircle className="size-4 animate-spin"/>}{loading?'Termine werden geladen …':message}</p>

  {!loading&&canManage&&!teams.length&&<Card className="border-dashed px-6 py-8 text-center">
   <Users className="mx-auto size-8 text-primary"/>
   <p className="mt-3 text-sm font-medium">Noch keine Mannschaft angelegt.</p>
   <p className="mt-1 text-xs text-muted-foreground">Lege im Profil unter „Mannschaften“ eine Mannschaft an. Danach kannst du Termine planen und Spieler einladen.</p>
  </Card>}

  {!loading&&!canManage&&!visibleTeams.length&&<Card className="border-dashed px-6 py-8 text-center">
   <Users className="mx-auto size-8 text-primary"/>
   <p className="mt-3 text-sm font-medium">Du bist noch keiner Mannschaft zugeordnet.</p>
   <p className="mt-1 text-xs text-muted-foreground">Sobald dein Trainer dich zu einer Mannschaft hinzufügt, erscheinen hier die Termine.</p>
  </Card>}

  <div className="space-y-3">
   {upcoming.map(event=><Card key={event.id} className={cn('gap-0 py-0',event.cancelledAt&&'opacity-70')}>
    <div className="px-4 py-4 sm:px-5">
     <div className="flex items-start gap-3">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
       <span className="text-center leading-none"><span className="block text-base font-bold tabular-nums">{dayFmt.format(new Date(event.startsAt))}</span><span className="block text-[10px] font-semibold uppercase">{monthFmt.format(new Date(event.startsAt))}</span></span>
      </span>
      <div className="min-w-0 flex-1">
       <button type="button" onClick={()=>setSelectedId(event.id)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <h3 className="truncate font-semibold">{event.title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{weekdayFmt.format(new Date(event.startsAt))} · {timeRange(event)}{event.location?` · ${event.location}`:''}</p>
       </button>
       <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline"><Users className="size-3"/>{event.teamName}</Badge>
        <Badge variant="secondary">{EVENT_KIND_LABELS[event.kind]}</Badge>
        {event.cancelledAt&&<Badge variant="destructive">Abgesagt</Badge>}
       </div>
      </div>
     </div>
     <div className="mt-3 flex flex-wrap items-center gap-2">
      {event.cancelledAt?<p className="text-xs text-muted-foreground">Dieser Termin wurde abgesagt.</p>:event.myTeamRole==='player'?<ResponseButtons event={event} onRespond={respond}/>:event.myTeamRole==='coach'?<p className="text-xs text-muted-foreground">Du betreust diese Mannschaft und siehst alle Antworten.</p>:<p className="text-xs text-muted-foreground">Nur Teilnehmende der Mannschaft können zu- oder absagen.</p>}
      <span className="ml-auto text-xs text-muted-foreground">{event.summary.accepted} zu · {event.summary.open} offen</span>
     </div>
    </div>
   </Card>)}

   {!loading&&!upcoming.length&&<Card className="items-center border-dashed px-6 py-10 text-center">
    <img src="/images/empty-plan.svg" alt="" aria-hidden="true" width="128" height="128" decoding="async" className="h-28 w-28 rounded-2xl object-cover shadow-sm"/>
    <p className="mt-3 text-sm font-medium">Kein anstehender Termin.</p>
    <p className="mt-1 text-xs text-muted-foreground">{canManage?'Lege den nächsten Termin an – die Mannschaft sieht ihn sofort.':'Dein Trainer trägt hier die nächsten Termine ein.'}</p>
   </Card>}
  </div>

  {past.length>0&&<details className="rounded-xl border bg-card px-4 py-3">
   <summary className="cursor-pointer text-sm font-medium">Vergangene Termine ({past.length})</summary>
   <div className="mt-3 space-y-2">
    {past.slice(0,20).map(event=><button key={event.id} type="button" onClick={()=>setSelectedId(event.id)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
     <span className="min-w-0 truncate">{event.title} <span className="text-muted-foreground">· {event.teamName}</span></span>
     <span className="text-xs text-muted-foreground">{dateFmt.format(new Date(event.startsAt))}</span>
    </button>)}
   </div>
  </details>}

  {selected&&<EventDetail key={selected.id} workspaceId={workspaceId} event={selected} onChanged={refresh} onEdit={()=>openEdit(selected)} onOpenPlan={id=>{setSelectedId(null);onOpenPlan?.(id)}} onClose={()=>setSelectedId(null)}/>}
  {formOpen&&<EventForm workspaceId={workspaceId} teams={teams} event={editing} plans={plans} onSaved={async()=>{setFormOpen(false);setEditing(null);await load()}} onClose={()=>{setFormOpen(false);setEditing(null)}}/>}
 </section>;
}
