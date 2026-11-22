import React,{useEffect,useState} from 'react';
import {apiFetch} from '../lib/api.js';
import {Building2,Users,ShieldCheck,Mail,Link2,Copy,LoaderCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';
import {NativeSelect} from '@/components/ui/native-select';
import {Separator} from '@/components/ui/separator';

const roles={owner:'Vereinsinhaber',admin:'Administrator',trainer:'Trainer',player:'Spieler'};

function Field({label,htmlFor,children,hint}){
 return <div className="space-y-1.5"><Label htmlFor={htmlFor}>{label}</Label>{children}{hint&&<p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}</div>;
}

export default function Club({workspaceId,onRename}){
 const [club,setClub]=useState(null),[name,setName]=useState(''),[email,setEmail]=useState(''),[message,setMessage]=useState(''),[link,setLink]=useState(''),[busy,setBusy]=useState(false),[teams,setTeams]=useState([]),[inviteRole,setInviteRole]=useState('trainer'),[inviteTeam,setInviteTeam]=useState('');
 const admin=club&&['owner','admin'].includes(club.role);
 const request=(path,body)=>apiFetch(path,{workspaceId,body});
 const applyClub=d=>{setClub({...d.club,role:d.role,members:d.members||[],invitations:d.invitations||[]});setName(d.club.name)};
 async function reload(){const d=await request('/api/club');applyClub(d)}
 useEffect(()=>{const controller=new AbortController();apiFetch('/api/club',{workspaceId,signal:controller.signal}).then(applyClub).catch(e=>{if(e.name!=='AbortError')setMessage(e.message)});apiFetch('/api/teams',{workspaceId,signal:controller.signal}).then(d=>setTeams(d.teams||[])).catch(e=>{if(e.name!=='AbortError')setMessage(e.message)});return()=>controller.abort()},[workspaceId]);
 async function run(action){setBusy(true);setMessage('');try{await action()}catch(error){setMessage(error.message)}finally{setBusy(false)}}

 if(!club)return <Card className="items-center py-16"><p className="flex items-center gap-3 text-sm text-muted-foreground" role="status"><LoaderCircle className="size-4 animate-spin"/>Vereinsdaten werden geladen …</p></Card>;

 return <section className="space-y-5">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
   <div className="flex items-center gap-4">
    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Building2 className="size-6"/></span>
    <div className="min-w-0">
     <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Verein</p>
     <h2 className="truncate text-2xl font-semibold tracking-tight">{club.name}</h2>
    </div>
   </div>
   <Badge variant="secondary" className="w-fit"><ShieldCheck className="size-3.5"/>Deine Rolle: {roles[club.role]||club.role}</Badge>
  </div>

  <Card className="gap-0 py-0">
   <form onSubmit={e=>{e.preventDefault();run(async()=>{const d=await request('/api/club',{name});onRename(d.club);setClub(old=>old?{...old,name:d.club.name}:old);setMessage('Vereinsdaten gespeichert.')})}}>
    <div className="px-5 py-5"><Field label="Vereinsname" htmlFor="club-name"><Input id="club-name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={100} disabled={!admin} required/></Field></div>
    {admin&&<div className="border-t px-5 py-4"><Button disabled={busy}>{busy&&<LoaderCircle className="animate-spin"/>}Verein speichern</Button></div>}
   </form>

   {admin&&<>
    <Separator/>
    <div className="px-5 py-5">
     <h3 className="flex items-center gap-2 text-sm font-semibold"><Users className="size-4 text-primary"/>Mitglieder</h3>
     <div className="mt-3 divide-y rounded-xl border">
      {club.members.map(m=><div className="flex items-center justify-between gap-3 px-3 py-2.5" key={m.user_id}><span className="truncate text-sm">{m.email}</span><Badge variant="secondary" className="shrink-0">{roles[m.role]||m.role}</Badge></div>)}
     </div>
    </div>
   </>}
  </Card>

  {club.role!=='player'&&<Card className="gap-0 py-0">
   <div className="border-b bg-muted/40 px-5 py-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Mail className="size-4 text-primary"/>Mitglied einladen</h3></div>
   <form className="space-y-3 px-5 py-5" onSubmit={e=>{e.preventDefault();run(async()=>{const role=admin?inviteRole:'player';const teamId=role==='player'?(inviteTeam||teams[0]?.id||''):null;if(role==='player'&&!teamId)return setMessage('Bitte zuerst eine Mannschaft anlegen.');const d=await request('/api/club/invite',{email,role,teamId});setLink(d.url);setEmail('');await reload();setMessage(role==='player'?'Einladung für einen Spieler erstellt. Bitte den Link weitergeben.':'Einladung für einen Trainer erstellt. Bitte den Link weitergeben.')})}}>
    <div className="grid gap-3 sm:grid-cols-2">
     <Field label="Rolle" htmlFor="invite-role">{admin?<NativeSelect id="invite-role" value={inviteRole} onChange={e=>setInviteRole(e.target.value)}><option value="trainer">Trainer</option><option value="player">Spieler</option></NativeSelect>:<Input id="invite-role" readOnly value="Spieler"/>}</Field>
     {(admin?inviteRole:'player')==='player'&&<Field label="Mannschaft" htmlFor="invite-team"><NativeSelect id="invite-team" required value={inviteTeam||teams[0]?.id||''} onChange={e=>setInviteTeam(e.target.value)}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</NativeSelect></Field>}
    </div>
    <Field label="E-Mail-Adresse" htmlFor="invite-email"><div className="flex flex-col gap-2 sm:flex-row"><Input id="invite-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><Button className="min-h-9 shrink-0" disabled={busy||((admin?inviteRole:'player')==='player'&&!teams.length)}>Einladungslink erstellen</Button></div></Field>
    {(admin?inviteRole:'player')==='player'&&!teams.length&&<p className="text-xs leading-relaxed text-muted-foreground">Lege zuerst eine Mannschaft an. Spieler werden ihr beim Beitritt automatisch zugeordnet.</p>}
    <p className="text-xs leading-relaxed text-muted-foreground">Der Link gilt sieben Tage. Es wird keine E-Mail automatisch versendet.</p>
    {link&&<div className="space-y-1.5">
     <Label htmlFor="invite-link">Einladungslink</Label>
     <div className="flex flex-col gap-2 sm:flex-row">
      <Input id="invite-link" readOnly value={link} onFocus={e=>e.target.select()} className="font-mono text-xs"/>
      <Button type="button" variant="outline" className="shrink-0" onClick={()=>run(async()=>{await navigator.clipboard.writeText(link);setMessage('Einladungslink kopiert.')})}><Copy/>Link kopieren</Button>
     </div>
    </div>}
   </form>

   <Separator/>
   <div className="px-5 py-5">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><Link2 className="size-4 text-primary"/>Einladungen</h3>
    <div className="mt-3 space-y-2">
     {club.invitations.map(i=>{const state=i.accepted_at?'Angenommen':i.revoked_at?'Widerrufen':Date.parse(i.expires_at)<Date.now()?'Abgelaufen':'Offen';const teamName=teams.find(t=>t.id===i.team_id)?.name;return <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5" key={i.id}><span className="min-w-0 truncate text-sm">{i.email} · {(i.role||'trainer')==='player'?'Spieler':'Trainer'}{teamName?` · ${teamName}`:''} · {state}</span>{state==='Offen'&&<Button variant="outline" size="xs" disabled={busy} onClick={()=>run(async()=>{await request('/api/club/revoke',{id:i.id});await reload()})}>Widerrufen</Button>}</div>})}
     {!club.invitations.length&&<p className="text-xs text-muted-foreground">Noch keine Einladung erstellt.</p>}
    </div>
   </div>
  </Card>}

  <p role="status" className="flex min-h-5 items-center gap-2 text-sm text-muted-foreground">{busy&&<LoaderCircle className="size-4 animate-spin"/>}{message||' '}</p>
 </section>;
}
