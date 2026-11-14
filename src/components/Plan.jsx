import React,{useId} from 'react';
import {ClipboardPlus,LayoutTemplate,Lightbulb,ListChecks,Users,Clock,ShieldAlert,MapPinned,Wrench} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card} from '@/components/ui/card';

export function Diagram({diagram:d}){
 const id=useId().replaceAll(':','');
 if(!d)return null;
 return <div className="overflow-hidden rounded-xl border border-brand/20 bg-brand-deep shadow-inner">
  <svg viewBox="0 0 440 280" role="img" aria-label={d.caption} className="block h-auto w-full">
   <defs><marker id={id} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="white"/></marker></defs>
   <rect width="440" height="280" rx="10" fill="#005800"/>
   <rect x="20" y="20" width="400" height="240" fill="none" stroke="#b0f800" strokeOpacity=".7"/>
   <line x1="220" y1="20" x2="220" y2="260" stroke="#b0f800" strokeOpacity=".55" strokeWidth="1.5"/>
   <circle cx="220" cy="140" r="34" fill="none" stroke="#b0f800" strokeOpacity=".55"/>
   {d.arrows?.map((a,i)=><line key={i} x1={20+a.x1*4} y1={20+a.y1*2.4} x2={20+a.x2*4} y2={20+a.y2*2.4} stroke="white" strokeWidth="2" strokeDasharray={a.kind==='pass'?'6 4':undefined} markerEnd={`url(#${id})`}/>)}
   {d.objects?.map((o,i)=>{const x=20+o.x*4,y=20+o.y*2.4;return <g key={i}>
    {o.kind==='cone'?<path d={`M${x} ${y-7}l7 14h-14z`} fill="#b0f800"/>:o.kind==='goal'?<rect x={x-10} y={y-5} width="20" height="10" fill="none" stroke="white"/>:<circle cx={x} cy={y} r={o.kind==='ball'?4:10} fill={o.team===2?'#b0f800':o.team===1?'#ffffff':'white'}/>}
    <text x={x} y={y-13} fill="white" textAnchor="middle" fontSize="10">{o.label}</text>
   </g>})}
  </svg>
  <p className="border-t border-white/10 px-3 py-2 text-[11px] text-white/70">{d.caption} · Gestrichelt: Pass · Durchgezogen: Laufweg</p>
 </div>;
}

export function ExerciseContent({exercise:e}){
 return <div className="space-y-4">
  <div className="grid gap-2 sm:grid-cols-2">
   <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm"><MapPinned className="mt-0.5 size-4 shrink-0 text-primary"/><span><strong className="font-semibold">Fläche:</strong> <span className="text-muted-foreground">{e.fieldSize}</span></span></div>
   <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm"><Wrench className="mt-0.5 size-4 shrink-0 text-primary"/><span><strong className="font-semibold">Material:</strong> <span className="text-muted-foreground">{e.materials}</span></span></div>
  </div>
  <section>
   <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><LayoutTemplate className="size-4 text-primary"/>Aufbau</h4>
   <p className="text-sm leading-relaxed text-muted-foreground">{e.organization}</p>
  </section>
  <Diagram diagram={e.diagram}/>
  <section>
   <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><ListChecks className="size-4 text-primary"/>Ablauf</h4>
   <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:font-semibold marker:text-primary">{e.steps?.map((s,i)=><li key={i}>{s}</li>)}</ol>
  </section>
  <section>
   <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4 text-primary"/>Coachingpunkte</h4>
   <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-primary">{e.coaching?.map((s,i)=><li key={i}>{s}</li>)}</ul>
  </section>
  <div className="grid gap-2 sm:grid-cols-2">
   <p className="rounded-lg border border-brand-lime/50 bg-brand-lime/15 px-3 py-2 text-sm text-brand-deep"><strong className="font-semibold">Einfacher:</strong> {e.easier}</p>
   <p className="rounded-lg border border-primary/20 bg-secondary px-3 py-2 text-sm text-secondary-foreground"><strong className="font-semibold">Schwerer:</strong> {e.harder}</p>
  </div>
 </div>;
}

export default function Plan({record,onAdopt,busy}){
 if(!record)return <Card className="items-center border-dashed px-6 py-12 text-center">
  <img src="/images/empty-plan.svg" alt="" aria-hidden="true" width="160" height="160" decoding="async" className="h-40 w-40 rounded-2xl object-cover shadow-sm"/>
  <h3 className="mt-4 text-lg font-semibold">Was möchtest du mit deinem Team verbessern?</h3>
  <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">Gib eure Rahmenbedingungen ein. Hier erscheint dein vollständiger Trainingsentwurf.</p>
 </Card>;

 return <div className="space-y-4">
  <Card className="print-avoid-break gap-0 py-0">
   <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
     <Badge variant="outline" className="border-brand-lime/60 bg-brand-lime/15 text-brand-deep">KI-Entwurf · fachlich ungeprüft</Badge>
     <h2 className="mt-2 text-xl font-semibold tracking-tight">{record.plan.title}</h2>
     <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{record.plan.summary}</p>
    </div>
   </div>
   <div className="grid grid-cols-3 gap-px border-t bg-border text-center">
    <div className="bg-card px-2 py-3"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Alter</p><p className="mt-0.5 truncate text-sm font-semibold">{record.criteria.age}</p></div>
    <div className="bg-card px-2 py-3"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Personen</p><p className="mt-0.5 truncate text-sm font-semibold">{record.criteria.players}</p></div>
    <div className="bg-card px-2 py-3"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Minuten</p><p className="mt-0.5 truncate text-sm font-semibold">{record.criteria.minutes}</p></div>
   </div>
  </Card>

  {record.plan.blocks.map((b,i)=><Card className="print-avoid-break gap-0 py-0" key={i}>
   <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-5 py-3">
    <Badge variant="secondary">{b.phase}</Badge>
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3.5"/>{b.minutes} Minuten</span>
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3.5"/>{b.groups.join(' + ')} Personen</span>
   </div>
   <div className="space-y-4 px-5 py-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
     <div className="min-w-0">
      <h3 className="text-lg font-semibold tracking-tight">{b.title}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldAlert className="size-3.5"/>{b.sourceExerciseId?'Auf Basis des Grundstocks · '+b.sourceExerciseId+' · angepasst / ungeprüft':'Neuer KI-Vorschlag · ungeprüft'}</p>
     </div>
     {b.phase!=='Pause'&&<Button variant="outline" size="sm" className="print-hidden shrink-0" disabled={busy} onClick={()=>onAdopt(b)}><ClipboardPlus/>Als Übungsentwurf übernehmen</Button>}
    </div>
    <ExerciseContent exercise={b}/>
   </div>
  </Card>)}
 </div>;
}
