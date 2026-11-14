import React,{useEffect,useState} from 'react';
import {Mail,LockKeyhole,LoaderCircle,ArrowRight,UserPlus,ShieldCheck,Sparkles,ClipboardCheck} from 'lucide-react';
import {apiFetch} from '../lib/api.js';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';

function InvertedBrand(){
 return <div className="flex items-center gap-3">
  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white shadow-lg">
   <img src="/images/brand-icon.webp" alt="" width="40" height="40" decoding="async" className="size-10"/>
  </span>
  <span className="flex flex-col">
   <img src="/images/brand-wordmark.webp" alt="Taktelio" width="113" height="24" decoding="async" className="h-6 w-auto brightness-0 invert"/>
   <span className="text-xs text-primary-foreground/60">Raum für dein Team.</span>
  </span>
 </div>;
}

export default function Auth({onLogin,initialMessage='',invite}){
 const [signup,setSignup]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(initialMessage);
 const [invitation,setInvitation]=useState(null),[inviteError,setInviteError]=useState(''),[checking,setChecking]=useState(!!invite);
 useEffect(()=>{if(!invite)return;const controller=new AbortController();setChecking(true);setInvitation(null);setInviteError('');apiFetch('/api/invitation',{body:{token:invite},signal:controller.signal}).then(d=>setInvitation(d.invitation)).catch(e=>{if(e.name!=='AbortError')setInviteError(e.message)}).finally(()=>{if(!controller.signal.aborted)setChecking(false)});return()=>controller.abort()},[invite]);
 async function submit(e){e.preventDefault();setBusy(true);setMessage('');try{const d=await apiFetch('/api/auth/'+(signup?'register':'login'),{body:{email,password,...(signup&&invite?{invite}:{})}});setPassword('');if(d.message)setMessage(d.message);else await onLogin()}catch(error){setMessage(error.message)}finally{setBusy(false)}}
 async function recover(){if(!email.includes('@'))return setMessage('Bitte zuerst deine E-Mail-Adresse eingeben.');setBusy(true);try{await apiFetch('/api/auth/recover',{body:{email}});setMessage('Falls ein Konto existiert, erhältst du eine E-Mail zum Zurücksetzen.')}catch(error){setMessage(error.message)}finally{setBusy(false)}}

 return <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
  <aside className="relative hidden overflow-hidden bg-primary px-12 py-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
   <img src="/images/auth-hero-photo.webp" alt="" aria-hidden="true" decoding="async" className="absolute inset-0 size-full object-cover object-[62%_42%]"/>
   <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/60 to-primary/25" aria-hidden="true"/>
   <div className="absolute inset-0 bg-gradient-to-r from-primary/75 via-primary/20 to-transparent" aria-hidden="true"/>
   <div className="relative"><InvertedBrand/></div>
   <div className="relative max-w-lg">
    <Badge className="bg-white/10 text-primary-foreground hover:bg-white/10">Für Fußballtrainer</Badge>
    <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight">Mehr Zeit<br/>auf dem Platz.</h1>
    <p className="mt-5 text-base leading-relaxed text-primary-foreground/75">Dein Training, deine Übungen und dein Team – an einem Ort.</p>
    <ul className="mt-8 space-y-4 text-sm text-primary-foreground/85">
     <li className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-white/10"><Sparkles className="size-4"/></span>Trainingsentwürfe, die zu deiner Gruppe passen.</li>
     <li className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-white/10"><ClipboardCheck className="size-4"/></span>Übungen am Platz griffbereit – auch auf dem Handy.</li>
     <li className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-white/10"><ShieldCheck className="size-4"/></span>Gemeinsam im Verein, getrennt nach Rolle.</li>
    </ul>
   </div>
   <p className="relative text-xs text-primary-foreground/60">Taktelio · Gemeinsam besser trainieren.</p>
  </aside>

  <div className="flex min-h-dvh flex-col">
   <header className="flex items-center justify-between border-b border-border/70 px-5 py-4 lg:hidden">
    <div className="flex items-center gap-3">
     <img src="/images/brand-icon.webp" alt="" width="40" height="40" decoding="async" className="size-10"/>
     <span className="flex flex-col">
      <img src="/images/brand-wordmark.webp" alt="Taktelio" width="94" height="20" decoding="async" className="h-5 w-auto"/>
      <span className="text-[11px] text-muted-foreground">Raum für dein Team.</span>
     </span>
    </div>
   </header>

   <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
    <div className="w-full max-w-md space-y-5">
     <div className="text-center lg:text-left">
      <h2 className="text-3xl font-semibold tracking-tight lg:hidden">Mehr Zeit auf dem Platz.</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Dein Training, deine Übungen und dein Team – an einem Ort.</p>
     </div>

     <Card className="gap-0 py-0 shadow-sm">
      <div className="space-y-5 px-5 py-6 sm:px-6">
       {invite&&<div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Einladung</p>
        <h3 className="mt-1 text-base font-semibold">{invitation?'Einladung zu '+invitation.club:'Einladung zu einem Verein'}</h3>
        {checking?<p role="status" className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin"/>Einladung wird geprüft …</p>:invitation?<><p className="mt-2 text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">{invitation.inviter}</strong> hat dich in den Verein <strong className="text-foreground">{invitation.club}</strong> eingeladen.</p><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Melde dich mit der eingeladenen E-Mail-Adresse an oder erstelle damit ein Konto. Anschließend kannst du den Beitritt bestätigen.</p></>:<p role="status" className="mt-2 text-sm text-destructive">{inviteError}</p>}
       </div>}

       <div>
        <h2 className="text-xl font-semibold tracking-tight">{signup?'Dein Konto erstellen':'Willkommen zurück'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{signup?'Starte mit deiner E-Mail-Adresse.':'Melde dich mit deinem Taktelio-Konto an.'}</p>
       </div>

       <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-1.5">
         <Label htmlFor="login-email">E-Mail</Label>
         <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
          <Input id="login-email" type="email" autoComplete="email" className="h-11 pl-9" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254} required/>
         </div>
        </div>
        <div className="space-y-1.5">
         <Label htmlFor="login-password">Passwort</Label>
         <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
          <Input id="login-password" type="password" autoComplete={signup?'new-password':'current-password'} className="h-11 pl-9" minLength={8} maxLength={200} value={password} onChange={e=>setPassword(e.target.value)} required/>
         </div>
        </div>
        <Button type="submit" size="lg" className="min-h-11 w-full" disabled={busy}>
         {busy&&<LoaderCircle className="animate-spin"/>}
         {busy?'Bitte warten …':signup?'Registrieren':'Anmelden'}
         {!busy&&!signup&&<ArrowRight/>}
        </Button>
       </form>

       {message&&<p role="status" className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm leading-relaxed text-foreground">{message}</p>}

       <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" disabled={busy} onClick={()=>{setSignup(!signup);setMessage('')}}>
         {signup?<ArrowRight/>:<UserPlus/>}{signup?'Ich habe bereits ein Konto':'Konto erstellen'}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={recover}>Passwort vergessen</Button>
       </div>
      </div>
     </Card>

     <p className="px-1 text-center text-xs leading-relaxed text-muted-foreground lg:text-left">{invite?'Deine Einladung bleibt während der Registrierung und E-Mail-Bestätigung erhalten.':'Registriere dich und richte anschließend deinen Verein ein – oder tritt über eine Einladung bei.'}</p>
    </div>
   </main>
  </div>
 </div>;
}
