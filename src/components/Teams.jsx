import React,{useState} from 'react';
import {apiFetch} from '../lib/api.js';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';
import {NativeSelect} from '@/components/ui/native-select';
import {Separator} from '@/components/ui/separator';
import {Users,Plus,LoaderCircle,ChevronDown,Trash2,UserMinus,Pencil} from 'lucide-react';

const teamRoleLabels={coach:'Trainer',player:'Spieler'};

export default function Teams({workspaceId,teams,club,role,onReload}){
 const [name,setName]=useState(''),[busy,setBusy]=useState(''),[message,setMessage]=useState('');
 const [openId,setOpenId]=useState(''),[rosters,setRosters]=useState({}),[picker,setPicker]=useState({});
 const [renaming,setRenaming]=useState(null);
 const admin=['owner','admin'].includes(role);

 async function run(tag,action,success){
  setBusy(tag);setMessage('');
  try{await action();if(success)setMessage(success);onReload()}
  catch(error){setMessage(error.message)}finally{setBusy('')}
 }
 async function fetchRoster(teamId){
  const data=await apiFetch('/api/teams/roster?teamId='+encodeURIComponent(teamId),{workspaceId});
  setRosters(old=>({...old,[teamId]:data.members}));
 }
 async function loadRoster(teamId){
  if(openId===teamId){setOpenId('');return}
  setOpenId(teamId);
  if(rosters[teamId])return;
  setBusy('roster');
  try{await fetchRoster(teamId)}
  catch(error){setMessage(error.message)}finally{setBusy('')}
 }

 return <div className="space-y-4">
  <form className="flex flex-col gap-2 sm:flex-row" onSubmit={e=>{e.preventDefault();run('create',async()=>{await apiFetch('/api/teams',{workspaceId,body:{action:'create',name}});setName('')},'Mannschaft angelegt.')}}>
   <div className="flex-1"><Label htmlFor="team-name" className="sr-only">Neue Mannschaft</Label><Input id="team-name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={80} placeholder="Zum Beispiel U13 oder 2. Herren" required/></div>
   <Button className="min-h-9 shrink-0" disabled={!!busy}><Plus/>Mannschaft anlegen</Button>
  </form>
  <p className="text-xs leading-relaxed text-muted-foreground">Spieler sehen nur Termine ihrer Mannschaft. Spieler-Zugänge lädst du weiter unten per E-Mail ein.</p>

  <div className="space-y-2">
   {teams.map(team=><div key={team.id} className="rounded-xl border">
    <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
     <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Users className="size-4"/></span>
     <div className="min-w-0 flex-1">
      {renaming?.id===team.id?<form className="flex gap-2" onSubmit={e=>{e.preventDefault();run('rename-'+team.id,async()=>{await apiFetch('/api/teams',{workspaceId,body:{action:'rename',id:team.id,name:renaming.name}});setRenaming(null)},'Mannschaft umbenannt.')}}>
       <Input aria-label="Mannschaftsname" className="h-8 max-w-64" value={renaming.name} onChange={e=>setRenaming({...renaming,name:e.target.value})} minLength={2} maxLength={80} required autoFocus/>
       <Button size="sm">Speichern</Button>
       <Button type="button" size="sm" variant="ghost" onClick={()=>setRenaming(null)}>Abbrechen</Button>
      </form>:<p className="truncate text-sm font-medium">{team.name}</p>}
      <p className="text-xs text-muted-foreground">{team.memberCount} {team.memberCount===1?'Person':'Personen'}{team.myRole?` · Du bist ${teamRoleLabels[team.myRole]}`:''}</p>
     </div>
     <Button type="button" variant="ghost" size="xs" onClick={()=>loadRoster(team.id)} aria-expanded={openId===team.id}><ChevronDown className={openId===team.id?'rotate-180 transition-transform':''}/>{openId===team.id?'Schließen':'Mitglieder'}</Button>
     <Button type="button" variant="ghost" size="xs" onClick={()=>setRenaming({id:team.id,name:team.name})} aria-label={'Mannschaft '+team.name+' umbenennen'}><Pencil/></Button>
     {admin&&<Button type="button" variant="ghost" size="xs" className="text-destructive hover:text-destructive" disabled={!!busy} onClick={()=>{if(confirm(`Mannschaft „${team.name}“ mit allen Terminen löschen?`))run('delete-'+team.id,()=>apiFetch('/api/teams',{workspaceId,body:{action:'delete',id:team.id}}),'Mannschaft gelöscht.')}} aria-label={'Mannschaft '+team.name+' löschen'}><Trash2/></Button>}
    </div>

    {openId===team.id&&<div className="border-t px-3 py-3">
     {busy==='roster'&&!rosters[team.id]&&<p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-3.5 animate-spin"/>Mitglieder werden geladen …</p>}
     <div className="divide-y">
      {(rosters[team.id]||[]).map(member=><div key={member.userId} className="flex items-center justify-between gap-3 py-2">
       <span className="min-w-0"><span className="block truncate text-sm">{member.name}</span>{member.email&&<span className="block truncate text-xs text-muted-foreground">{member.email}</span>}</span>
       <div className="flex shrink-0 items-center gap-1.5">
        <Badge variant="secondary">{teamRoleLabels[member.role]||member.role}</Badge>
        {admin&&<Button type="button" variant="ghost" size="xs" className="text-muted-foreground" disabled={!!busy} onClick={()=>{if(confirm(`${member.name} aus „${team.name}“ entfernen?`))run('remove-'+member.userId,async()=>{await apiFetch('/api/teams',{workspaceId,body:{action:'removeMember',teamId:team.id,userId:member.userId}});await fetchRoster(team.id)},'Person entfernt.')}} aria-label={member.name+' entfernen'}><UserMinus/></Button>}
       </div>
      </div>)}
      {rosters[team.id]&&!rosters[team.id].length&&<p className="py-2 text-xs text-muted-foreground">Noch niemand in dieser Mannschaft.</p>}
     </div>
     {admin&&club?.members?.length>0&&<>
      <Separator className="my-3"/>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={e=>{e.preventDefault();const userId=picker[team.id];if(!userId)return;run('add-'+team.id,async()=>{await apiFetch('/api/teams',{workspaceId,body:{action:'addMember',teamId:team.id,userId}});setPicker(old=>({...old,[team.id]:''}));await fetchRoster(team.id)},'Person hinzugefügt.')}}>
       <div className="flex-1"><Label htmlFor={'team-member-'+team.id} className="mb-1.5">Vereinsmitglied hinzufügen</Label><NativeSelect id={'team-member-'+team.id} value={picker[team.id]||''} onChange={e=>setPicker(old=>({...old,[team.id]:e.target.value}))}><option value="">Person wählen</option>{club.members.filter(m=>!(rosters[team.id]||[]).some(r=>r.userId===m.user_id)).map(m=><option key={m.user_id} value={m.user_id}>{m.email}</option>)}</NativeSelect></div>
       <Button variant="outline" disabled={!!busy||!picker[team.id]}><Plus/>Hinzufügen</Button>
      </form>
     </>}
     {!admin&&<p className="mt-3 text-xs leading-relaxed text-muted-foreground">Spieler fügst du über die Einladung unten hinzu.</p>}
    </div>}
   </div>)}
   {!teams.length&&<p className="rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground">Noch keine Mannschaft. Lege die erste Mannschaft an, um Termine zu planen.</p>}
  </div>
  {message&&<p role="status" className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm">{message}</p>}
 </div>;
}
