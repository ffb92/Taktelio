import React,{useState} from 'react';
import {apiFetch} from '../lib/api.js';
export default function Onboarding({invite,onComplete,onDismiss}){
 const [name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function submit(e){e.preventDefault();setBusy(true);try{const d=await apiFetch(invite?'/api/club/accept':'/api/workspaces',{body:invite?{token:invite}:{name}});await onComplete(d.id)}catch(error){setMessage(error.message)}finally{setBusy(false)}}
 return <section className="panel onboarding"><span className="tag">Dein Verein</span><h1>{invite?'Du wurdest eingeladen':'Willkommen bei Taktelio'}</h1><p>{invite?'Nimm die Einladung mit der E-Mail-Adresse an, an die sie gerichtet wurde.':'Lege deinen Verein an. Danach kannst du weitere Mitglieder im Profil einladen.'}</p><form onSubmit={submit}>{!invite&&<><label htmlFor="workspace-name">Vereinsname</label><input id="workspace-name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={100} placeholder="Zum Beispiel FC Musterstadt" required/></>}<button className="primary full" disabled={busy}>{invite?'Einladung annehmen':'Verein anlegen'}</button></form>{invite&&<button disabled={busy} onClick={onDismiss}>Einladung verwerfen</button>}<p role="status">{message}</p></section>
}
