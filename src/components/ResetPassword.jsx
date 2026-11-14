import React,{useState} from 'react';
import {LockKeyhole,LoaderCircle,ArrowLeft,KeyRound} from 'lucide-react';
import {apiFetch} from '../lib/api.js';
import {Brand} from './AppShell.jsx';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

export default function ResetPassword({onComplete,onCancel}){
 const [password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function submit(e){e.preventDefault();if(password!==repeat)return setMessage('Die Passwörter stimmen nicht überein.');setBusy(true);setMessage('');try{await apiFetch('/api/auth/reset-password',{body:{password}});setPassword('');setRepeat('');onComplete()}catch(e){setMessage(e.message)}finally{setBusy(false)}}

 return <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
  <div className="w-full max-w-md space-y-5">
   <Brand/>

   <Card className="gap-0 py-0 shadow-sm">
    <div className="border-b bg-muted/40 px-6 py-5">
     <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound className="size-5"/></span>
     <h1 className="mt-3 text-xl font-semibold tracking-tight">Passwort zurücksetzen</h1>
     <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Vergib ein neues Passwort. Danach meldest du dich damit erneut an.</p>
    </div>
    <form className="space-y-4 px-6 py-6" onSubmit={submit}>
     <div className="space-y-1.5"><Label htmlFor="reset-password">Neues Passwort</Label><Input id="reset-password" type="password" autoComplete="new-password" minLength={8} maxLength={200} value={password} onChange={e=>setPassword(e.target.value)} required/></div>
     <div className="space-y-1.5"><Label htmlFor="repeat-password">Passwort wiederholen</Label><Input id="repeat-password" type="password" autoComplete="new-password" minLength={8} maxLength={200} value={repeat} onChange={e=>setRepeat(e.target.value)} required/></div>
     <Button type="submit" className="min-h-11 w-full" disabled={busy}>{busy?<LoaderCircle className="animate-spin"/>:<LockKeyhole/>}{busy?'Bitte warten …':'Neues Passwort speichern'}</Button>
     {message&&<p role="status" className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-foreground">{message}</p>}
    </form>
    <div className="border-t px-6 py-4"><Button variant="ghost" className="w-full" disabled={busy} onClick={async()=>{setBusy(true);try{await onCancel()}catch(e){setMessage(e.message);setBusy(false)}}}><ArrowLeft/>Zurück zur Anmeldung</Button></div>
   </Card>
  </div>
 </div>;
}
