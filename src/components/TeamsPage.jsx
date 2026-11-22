import React,{useEffect,useState} from 'react';
import {apiFetch} from '../lib/api.js';
import {Users,LoaderCircle} from 'lucide-react';
import {Card} from '@/components/ui/card';
import Teams from './Teams.jsx';

export default function TeamsPage({workspaceId}){
 const [club,setClub]=useState(null),[teams,setTeams]=useState([]),[message,setMessage]=useState(''),[ready,setReady]=useState(false);
 const reloadTeams=async()=>{try{const d=await apiFetch('/api/teams',{workspaceId});setTeams(d.teams||[])}catch(error){setMessage(error.message)}};
 useEffect(()=>{
  const controller=new AbortController();
  Promise.all([
   apiFetch('/api/club',{workspaceId,signal:controller.signal}).then(d=>setClub({...d.club,role:d.role,members:d.members||[]})),
   apiFetch('/api/teams',{workspaceId,signal:controller.signal}).then(d=>setTeams(d.teams||[])),
  ]).catch(e=>{if(e.name!=='AbortError')setMessage(e.message)}).finally(()=>{if(!controller.signal.aborted)setReady(true)});
  return()=>controller.abort();
 },[workspaceId]);

 if(!ready)return <Card className="items-center py-16"><p className="flex items-center gap-3 text-sm text-muted-foreground" role="status"><LoaderCircle className="size-4 animate-spin"/>Mannschaften werden geladen …</p></Card>;

 return <section className="space-y-5">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
   <div className="flex items-center gap-4">
    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Users className="size-6"/></span>
    <div className="min-w-0">
     <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Verein</p>
     <h2 className="text-2xl font-semibold tracking-tight">Mannschaften</h2>
     <p className="truncate text-sm text-muted-foreground">{club?.name||''}</p>
    </div>
   </div>
  </div>

  <Card className="gap-0 py-0">
   <div className="border-b bg-muted/40 px-5 py-4"><p className="text-sm text-muted-foreground">Lege Mannschaften an, verwalte Mitglieder und ordne Termine zu.</p></div>
   <div className="px-5 py-5"><Teams workspaceId={workspaceId} teams={teams} club={club} role={club?.role} onReload={reloadTeams}/></div>
  </Card>
  {message&&<p role="status" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{message}</p>}
 </section>;
}
