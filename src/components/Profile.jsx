import React,{useEffect,useState} from 'react';
import {apiFetch} from '../lib/api.js';
import {UserRound,LockKeyhole,Users,ShieldCheck,Mail,Link2,Copy,LogOut,LoaderCircle,Building2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';
import {NativeSelect} from '@/components/ui/native-select';
import {Separator} from '@/components/ui/separator';

const roles={owner:'Vereinsinhaber',admin:'Administrator',trainer:'Trainer'};

function Field({label,htmlFor,children,hint}){
 return <div className="space-y-1.5"><Label htmlFor={htmlFor}>{label}</Label>{children}{hint&&<p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}</div>;
}

export default function Profile({user,workspaceId,workspaces,onSwitch,onRename,onLogout,onUserUpdate,busy:aiBusy}){
 const [club,setClub]=useState(null),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[link,setLink]=useState(''),[busy,setBusy]=useState(false);
 const [profile,setProfile]=useState(()=>({firstName:'',lastName:'',displayName:'',team:'',qualification:'',...user.profile}));
 const profileInput=(key,value)=>setProfile(old=>({...old,[key]:value}));
 const admin=club&&['owner','admin'].includes(club.role);
 const displayName=profile.displayName||[profile.firstName,profile.lastName].filter(Boolean).join(' ')||user.email;
 const initials=(()=>{const parts=displayName.trim().split(/\s+/).filter(Boolean);return ((parts[0]?.[0]||'')+(parts.length>1?parts[parts.length-1][0]:'')).toUpperCase()||'T'})();
 const request=(path,body)=>apiFetch(path,{workspaceId,body});
 const applyClub=d=>{setClub({...d.club,role:d.role,members:d.members||[],invitations:d.invitations||[]});setName(d.club.name)};
 async function reload(){const d=await request('/api/club');applyClub(d)}
 useEffect(()=>{if(!workspaceId)return;const controller=new AbortController();apiFetch('/api/club',{workspaceId,signal:controller.signal}).then(applyClub).catch(e=>{if(e.name!=='AbortError')setMessage(e.message)});return()=>controller.abort()},[workspaceId]);
 async function run(action){setBusy(true);setMessage('');try{await action()}catch(error){setMessage(error.message)}finally{setBusy(false)}}

 return <section className="space-y-5">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
   <div className="flex items-center gap-4">
    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">{initials}</span>
    <div className="min-w-0">
     <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Konto</p>
     <h2 className="text-2xl font-semibold tracking-tight">{displayName}</h2>
     <p className="truncate text-sm text-muted-foreground">{user.email}</p>
    </div>
   </div>
   {club&&<Badge variant="secondary" className="w-fit"><ShieldCheck className="size-3.5"/>{roles[club.role]||club.role}</Badge>}
  </div>

  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-start">
   <Card className="gap-0 py-0">
    <div className="border-b bg-muted/40 px-5 py-4">
     <h3 className="flex items-center gap-2 text-sm font-semibold"><UserRound className="size-4 text-primary"/>Persönliche Angaben</h3>
    </div>
    <form onSubmit={e=>{e.preventDefault();run(async()=>{const d=await request('/api/auth/profile',{profile});setProfile(d.user.profile);onUserUpdate(d.user);setMessage('Profil gespeichert.')})}}>
     <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
      <Field label="Vorname" htmlFor="profile-first-name"><Input id="profile-first-name" autoComplete="given-name" maxLength={80} required value={profile.firstName} onChange={e=>profileInput('firstName',e.target.value)}/></Field>
      <Field label="Nachname" htmlFor="profile-last-name"><Input id="profile-last-name" autoComplete="family-name" maxLength={80} required value={profile.lastName} onChange={e=>profileInput('lastName',e.target.value)}/></Field>
      <div className="sm:col-span-2"><Field label="Anzeigename (optional)" htmlFor="profile-display-name" hint="Bei deinen Einladungen sehen Empfänger diesen Namen und den Vereinsnamen bereits vor der Anmeldung. Ohne Anzeigenamen verwenden wir Vor- und Nachname."><Input id="profile-display-name" autoComplete="nickname" maxLength={80} placeholder="Zum Beispiel Benni Westphal" value={profile.displayName} onChange={e=>profileInput('displayName',e.target.value)}/></Field></div>
      <Field label="Betreute Mannschaft(en) (optional)" htmlFor="profile-team"><Input id="profile-team" maxLength={100} placeholder="Zum Beispiel U13 und 2. Herren" value={profile.team} onChange={e=>profileInput('team',e.target.value)}/></Field>
      <Field label="Trainerqualifikation (optional)" htmlFor="profile-qualification"><Input id="profile-qualification" maxLength={100} placeholder="Zum Beispiel Kindertrainer-Zertifikat oder C-Lizenz" value={profile.qualification} onChange={e=>profileInput('qualification',e.target.value)}/></Field>
      <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2">Mannschaft und Qualifikation sind persönliche Profilangaben. Sie ändern keine Vereinsrechte und werden nicht auf Einladungsseiten angezeigt.</p>
     </div>
     <div className="border-t px-5 py-4"><Button className="min-h-10" disabled={busy}>{busy&&<LoaderCircle className="animate-spin"/>}Profil speichern</Button></div>
    </form>
   </Card>

   <div className="space-y-5">
    <Card className="gap-0 py-0">
     <div className="border-b bg-muted/40 px-5 py-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><LockKeyhole className="size-4 text-primary"/>Passwort ändern</h3></div>
     <form onSubmit={e=>{e.preventDefault();run(async()=>{await request('/api/auth/password',{password});setPassword('');setMessage('Passwort geändert.')})}}>
      <div className="px-5 py-5"><Field label="Neues Passwort" htmlFor="new-password"><Input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={200} required value={password} onChange={e=>setPassword(e.target.value)}/></Field></div>
      <div className="border-t px-5 py-4"><Button variant="outline" disabled={busy}>Passwort ändern</Button></div>
     </form>
    </Card>

    {workspaces.length>1&&<Card className="gap-0 py-0">
     <div className="border-b bg-muted/40 px-5 py-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Building2 className="size-4 text-primary"/>Vereinswechsel</h3></div>
     <div className="px-5 py-5"><Field label="Verein wechseln" htmlFor="club-switcher"><NativeSelect id="club-switcher" value={workspaceId} disabled={busy||aiBusy} onChange={e=>onSwitch(e.target.value)}>{workspaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</NativeSelect></Field></div>
    </Card>}
   </div>
  </div>

  {workspaceId&&!club&&<p className="text-sm text-muted-foreground">Vereinsdaten werden geladen …</p>}

  {club&&<Card className="gap-0 py-0">
   <div className="flex flex-col gap-2 border-b bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><Building2 className="size-4 text-primary"/>Dein Verein</h3>
    <p className="text-xs text-muted-foreground">Deine Rolle: {roles[club.role]||club.role}</p>
   </div>
   <form onSubmit={e=>{e.preventDefault();run(async()=>{const d=await request('/api/club',{name});onRename(d.club);setMessage('Vereinsdaten gespeichert.')})}}>
    <div className="px-5 py-5"><Field label="Vereinsname" htmlFor="club-name"><Input id="club-name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={100} disabled={!admin} required/></Field></div>
    {admin&&<div className="border-t px-5 py-4"><Button disabled={busy}>Verein speichern</Button></div>}
   </form>

   {admin&&<>
    <Separator/>
    <div className="px-5 py-5">
     <h4 className="flex items-center gap-2 text-sm font-semibold"><Users className="size-4 text-primary"/>Mitglieder</h4>
     <div className="mt-3 divide-y rounded-xl border">
      {club.members.map(m=><div className="flex items-center justify-between gap-3 px-3 py-2.5" key={m.user_id}><span className="truncate text-sm">{m.email}</span><Badge variant="secondary" className="shrink-0">{roles[m.role]||m.role}</Badge></div>)}
     </div>
    </div>
    <Separator/>
    <div className="px-5 py-5">
     <h4 className="flex items-center gap-2 text-sm font-semibold"><Mail className="size-4 text-primary"/>Mitglied einladen</h4>
     <form className="mt-3" onSubmit={e=>{e.preventDefault();run(async()=>{const d=await request('/api/club/invite',{email});setLink(d.url);setEmail('');await reload();setMessage('Einladung erstellt. Bitte den Link weitergeben.')})}}>
      <Field label="E-Mail-Adresse" htmlFor="invite-email"><div className="flex flex-col gap-2 sm:flex-row"><Input id="invite-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><Button className="min-h-9 shrink-0" disabled={busy}>Einladungslink erstellen</Button></div></Field>
     </form>
     <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Der Link gilt sieben Tage. Es wird keine E-Mail automatisch versendet.</p>
     {link&&<div className="mt-4 space-y-1.5">
      <Label htmlFor="invite-link">Einladungslink</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
       <Input id="invite-link" readOnly value={link} onFocus={e=>e.target.select()} className="font-mono text-xs"/>
       <Button variant="outline" className="shrink-0" onClick={()=>run(async()=>{await navigator.clipboard.writeText(link);setMessage('Einladungslink kopiert.')})}><Copy/>Link kopieren</Button>
      </div>
     </div>}
    </div>
    <Separator/>
    <div className="px-5 py-5">
     <h4 className="flex items-center gap-2 text-sm font-semibold"><Link2 className="size-4 text-primary"/>Einladungen</h4>
     <div className="mt-3 space-y-2">
      {club.invitations.map(i=>{const state=i.accepted_at?'Angenommen':i.revoked_at?'Widerrufen':Date.parse(i.expires_at)<Date.now()?'Abgelaufen':'Offen';return <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5" key={i.id}><span className="truncate text-sm">{i.email} · {state}</span>{state==='Offen'&&<Button variant="outline" size="xs" disabled={busy} onClick={()=>run(async()=>{await request('/api/club/revoke',{id:i.id});await reload()})}>Widerrufen</Button>}</div>})}
     </div>
    </div>
   </>}
  </Card>}

  <div className="flex flex-col gap-3 rounded-xl border border-dashed bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
   <p role="status" className="flex min-h-5 items-center gap-2 text-sm text-muted-foreground">{busy&&<LoaderCircle className="size-4 animate-spin"/>}{message||' '}</p>
   <Button variant="outline" className="text-destructive hover:text-destructive" disabled={busy||aiBusy} onClick={()=>run(onLogout)}><LogOut/>Abmelden</Button>
  </div>
 </section>;
}
