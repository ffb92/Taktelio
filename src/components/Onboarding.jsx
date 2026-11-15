import React,{useEffect,useState} from 'react';
import {Building2,Users,LoaderCircle,MailWarning,ArrowRight} from 'lucide-react';
import {apiFetch} from '../lib/api.js';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';

export default function Onboarding({invite,user,onLogout,onComplete,onDismiss}){
 const [name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[details,setDetails]=useState(null),[checking,setChecking]=useState(!!invite);
 useEffect(()=>{if(!invite)return;const controller=new AbortController();setChecking(true);setDetails(null);setMessage('');apiFetch('/api/club/preview',{body:{token:invite},signal:controller.signal}).then(d=>setDetails(d.invitation)).catch(e=>{if(e.name!=='AbortError')setMessage(e.message)}).finally(()=>{if(!controller.signal.aborted)setChecking(false)});return()=>controller.abort()},[invite]);
 async function submit(e){e.preventDefault();setBusy(true);try{const d=await apiFetch(invite?'/api/club/accept':'/api/workspaces',{body:invite?{token:invite}:{name}});await onComplete(d.id)}catch(error){setMessage(error.message)}finally{setBusy(false)}}

 return <div className="mx-auto max-w-lg">
  <Card className="gap-0 overflow-hidden py-0 shadow-sm">
   <div className="relative overflow-hidden bg-primary px-6 py-6 text-primary-foreground">
    <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true"/>
    <span className="grid size-11 place-items-center rounded-xl bg-white/10"><Building2 className="size-5"/></span>
    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/65">Dein Verein</p>
    <h1 className="mt-1 text-2xl font-semibold tracking-tight">{invite?'Du wurdest eingeladen':'Willkommen bei Taktelio'}</h1>
    <p className="mt-2 text-sm leading-relaxed text-primary-foreground/75">{invite?'Bestätige den Beitritt, um deine Termine zu sehen.':'Lege deinen Verein an. Danach kannst du weitere Mitglieder im Profil einladen.'}</p>
   </div>

   <div className="space-y-4 px-6 py-6">
    {invite&&<div className="rounded-xl border bg-muted/40 p-4">
     {checking&&<p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin"/>Einladung wird geprüft …</p>}
     {details&&<>
      <p className="flex items-center gap-2 text-sm"><Users className="size-4 text-primary"/><strong className="font-semibold">{details.inviter}</strong> hat dich in den Verein <strong className="font-semibold">{details.club}</strong> eingeladen.</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Einladung für {details.email}. Mit deiner Bestätigung trittst du dem Verein als {details.role==='player'?'Spieler':'Trainer'}{details.team?` der Mannschaft ${details.team}`:''} bei.</p>
     </>}
     <p className="mt-3 text-xs text-muted-foreground">Angemeldet als {user?.email}</p>
    </div>}

    <form className="space-y-4" onSubmit={submit}>
     {!invite&&<div className="space-y-1.5">
      <Label htmlFor="workspace-name">Vereinsname</Label>
      <Input id="workspace-name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={100} placeholder="Zum Beispiel FC Musterstadt" required/>
     </div>}
     <Button type="submit" size="lg" className="min-h-11 w-full" disabled={busy||(!!invite&&!details)}>
      {busy?<LoaderCircle className="animate-spin"/>:invite?<Users/>:<Building2/>}
      {invite?'Einladung annehmen':'Verein anlegen'}
      {!busy&&<ArrowRight className="ml-auto"/>}
     </Button>
    </form>

    {invite&&<div className="grid gap-2 sm:grid-cols-2">
     <Button variant="outline" disabled={busy} onClick={onDismiss}><MailWarning/>Einladung verwerfen</Button>
     <Button variant="ghost" disabled={busy} onClick={()=>{setBusy(true);onLogout().catch(e=>{setMessage(e.message);setBusy(false)})}}>Mit anderer E-Mail anmelden</Button>
    </div>}

    {message&&<p role="status" className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-foreground">{message}</p>}
    <Badge variant="secondary" className="w-fit">Alle Angaben bleiben in deinem Verein.</Badge>
   </div>
  </Card>
 </div>;
}
