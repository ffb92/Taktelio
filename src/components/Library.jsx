import React,{useState} from 'react';
import {Search,BookOpen,ArrowUpRight,Sparkles,Filter} from 'lucide-react';
import {ExerciseContent} from './Plan.jsx';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';
import {NativeSelect} from '@/components/ui/native-select';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';

function Detail({exercise,onClose}){
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}>
  <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-3xl">
   <DialogHeader className="gap-2">
    <Badge variant="outline" className="w-fit border-brand-lime/60 bg-brand-lime/15 text-brand-deep">Übungsentwurf · ungeprüft</Badge>
    <DialogTitle className="text-xl font-semibold tracking-tight">{exercise.title}</DialogTitle>
    <DialogDescription className="text-sm">{exercise.topic} · {exercise.ageMin}–{exercise.ageMax} Jahre · {exercise.playersMin}–{exercise.playersMax} Personen pro Feld</DialogDescription>
   </DialogHeader>
   <ExerciseContent exercise={exercise}/>
   <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">{exercise.notes}<br/>{exercise.origin} · Version {exercise.version}</p>
   <DialogFooter><Button variant="outline" onClick={onClose}>Schließen</Button></DialogFooter>
  </DialogContent>
 </Dialog>;
}

export default function Library({catalog,onPlan,message}){
 const [query,setQuery]=useState(''),[topic,setTopic]=useState(''),[age,setAge]=useState(''),[detail,setDetail]=useState(null);
 const found=catalog.filter(e=>(!query||(e.title+' '+e.topic+' '+e.organization).toLowerCase().includes(query.toLowerCase()))&&(!topic||e.topic===topic)&&(!age||(+age>=e.ageMin&&+age<=e.ageMax)));
 return <section>
  <div className="mb-5">
   <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Grundstock</p>
   <h2 className="mt-1 text-2xl font-semibold tracking-tight">Übungsbibliothek</h2>
   <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Übungsentwürfe als Grundstock für eure Planung. Alle Inhalte sind fachlich ungeprüft.</p>
  </div>

  <Card className="mb-5 gap-0 py-0">
   <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_200px_200px]">
    <div className="relative">
     <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
     <Input aria-label="Übung suchen" placeholder="Übung oder Schwerpunkt suchen …" className="pl-9" value={query} onChange={e=>setQuery(e.target.value)}/>
    </div>
    <div>
     <Label htmlFor="catalog-topic" className="sr-only">Schwerpunkt</Label>
     <NativeSelect id="catalog-topic" value={topic} onChange={e=>setTopic(e.target.value)}>
      <option value="">Alle Schwerpunkte</option>
      {[...new Set(catalog.map(e=>e.topic))].map(t=><option key={t}>{t}</option>)}
     </NativeSelect>
    </div>
    <div>
     <Label htmlFor="catalog-age" className="sr-only">Alter</Label>
     <NativeSelect id="catalog-age" value={age} onChange={e=>setAge(e.target.value)}>
      <option value="">Alle Altersbereiche</option>
      {[9,11,13,15,17,18].map(a=><option key={a} value={a}>{a===18?'Senioren':a===17?'U17 / U19':'U'+a}</option>)}
     </NativeSelect>
    </div>
   </div>
  </Card>

  {message&&<p role="status" className="mb-4 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-foreground">{message}</p>}
  <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground"><Filter className="size-3.5"/>{found.length} von {catalog.length} Übungen · Suchen und Ansehen verbraucht kein API-Guthaben</p>

  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
   {found.map(e=><Card key={e.id} className="gap-0 py-0">
    <div className="flex flex-1 flex-col px-5 py-5">
     <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{e.topic} · {e.id}</p>
     <h3 className="mt-1.5 text-lg font-semibold tracking-tight">{e.title}</h3>
     <p className="mt-1 text-xs text-muted-foreground">{e.ageMin}–{e.ageMax} Jahre · {e.playersMin}–{e.playersMax} Personen pro Gruppe · ca. {e.duration} min</p>
     <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{e.organization}</p>
     <div className="mt-auto flex flex-wrap gap-2 pt-4">
      <Button variant="outline" size="sm" className="min-h-11" onClick={()=>setDetail(e)}><BookOpen/>Aufbau & Ablauf<ArrowUpRight/></Button>
      <Button size="sm" className="min-h-11" onClick={()=>onPlan(e)}><Sparkles/>Training damit planen</Button>
     </div>
     <p className="mt-3 text-[11px] text-muted-foreground">{e.scope==='global'?'Gemeinsamer Grundstock':'Eigener Verein'} · fachlich ungeprüft</p>
    </div>
   </Card>)}
  </div>
  {!found.length&&<Card className="items-center border-dashed px-6 py-14 text-center">
   <BookOpen className="size-6 text-muted-foreground"/>
   <p className="mt-3 text-sm text-muted-foreground">Keine passende Übung gefunden.</p>
  </Card>}
  {detail&&<Detail exercise={detail} onClose={()=>setDetail(null)}/>}
 </section>;
}
