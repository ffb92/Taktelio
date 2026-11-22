import React,{useCallback,useEffect,useState} from 'react';
import {LoaderCircle,Info} from 'lucide-react';
import {apiFetch,startSession,storage} from './lib/api.js';
import ResetPassword from './components/ResetPassword.jsx';
import Auth from './components/Auth.jsx';
import Onboarding from './components/Onboarding.jsx';
import Profile from './components/Profile.jsx';
import Club from './components/Club.jsx';
import TeamsPage from './components/TeamsPage.jsx';
import Training from './components/Training.jsx';
import Events from './components/Events.jsx';
import AppShell from './components/AppShell.jsx';
import {Badge} from '@/components/ui/badge';
import {Card} from '@/components/ui/card';

const ALL_PAGES=['training','events','social','scouting','profil','verein','mannschaft'];
const PLAYER_PAGES=['events','profil','verein'];

function LoadingScreen(){
  return <div className="grid min-h-dvh place-items-center bg-background p-6">
    <div className="flex flex-col items-center gap-4 text-center">
      <img src="/images/brand-icon.webp" alt="" width="56" height="56" decoding="async" className="size-14 shadow-lg"/>
      <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <LoaderCircle className="size-4 animate-spin"/>Taktelio wird geladen …
      </div>
    </div>
  </div>;
}

function Notice({children}){
  return <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground">
    <Info className="mt-0.5 size-4 shrink-0 text-primary"/><span>{children}</span>
  </div>;
}

function ComingSoon({module}){
  const social=module==='social';
  return <Card className="overflow-hidden border-dashed">
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <img src={social?'/images/social-soon.svg':'/images/scouting-soon.svg'} alt="" aria-hidden="true" width="208" height="208" decoding="async" className="h-44 w-44 rounded-2xl object-cover shadow-sm sm:h-52 sm:w-52"/>
      <Badge variant="secondary" className="mt-5 tracking-[0.16em]">{social?'SOCIAL MEDIA':'SCOUTING'}</Badge>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">{social?'Dein Verein. Mehr Sichtbarkeit.':'Talente im Blick.'}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Hier entsteht dein Bereich für {social?'Social Media':'Scouting'}.</p>
      <Badge variant="outline" className="mt-5">Demnächst verfügbar</Badge>
    </div>
  </Card>;
}

export default function App(){
  const [user,setUser]=useState(null),[starting,setStarting]=useState(true),[loadingClubs,setLoadingClubs]=useState(false),[workspaces,setWorkspaces]=useState([]),[workspaceId,setWorkspaceId]=useState(null),[invite,setInvite]=useState(null),[page,setPage]=useState('training'),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[recovery,setRecovery]=useState(false),[openPlanId,setOpenPlanId]=useState(null);
  const reset=useCallback(()=>{setUser(null);setWorkspaces([]);setWorkspaceId(null);setBusy(false);setPage('training');setMessage('Deine Sitzung ist abgelaufen. Bitte erneut anmelden.')},[]);
  useEffect(()=>{let active=true;startSession().then(d=>{if(!active)return;setUser(d.user);setRecovery(d.recovery);setMessage(d.error||'');setInvite(storage.get('trainer-club-invite',true));setStarting(false)});window.addEventListener('taktelio:session-expired',reset);return()=>{active=false;window.removeEventListener('taktelio:session-expired',reset)}},[reset]);
  const choose=useCallback((list,preferred)=>{const remembered=storage.get('trainer-workspace-'+user.id);const selected=list.find(w=>w.id===(preferred||remembered))||list[0];setWorkspaces(list);setWorkspaceId(selected?.id||null);setPage(current=>selected?.role==='player'?(PLAYER_PAGES.includes(current)?current:'events'):(ALL_PAGES.includes(current)?current:'training'));if(selected)storage.set('trainer-workspace-'+user.id,selected.id)},[user?.id]);
  useEffect(()=>{if(!user)return;const controller=new AbortController();setLoadingClubs(true);apiFetch('/api/workspaces',{signal:controller.signal}).then(d=>choose(d.workspaces)).catch(e=>{if(e.name!=='AbortError')setMessage(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoadingClubs(false)});return()=>controller.abort()},[user?.id,choose]);

  async function login(){const d=await apiFetch('/api/auth/me');setMessage('');setUser(d.user);setPage('training')}
  async function complete(id){const d=await apiFetch('/api/workspaces');choose(d.workspaces,id);storage.remove('trainer-club-invite',true);setInvite(null);setMessage('')}
  async function logout(){await apiFetch('/api/auth/logout',{body:{}});reset();setMessage('');setRecovery(false)}
  function switchClub(id){if(busy)return;setWorkspaceId(id);storage.set('trainer-workspace-'+user.id,id);setPage(current=>workspaces.find(w=>w.id===id)?.role==='player'&&!PLAYER_PAGES.includes(current)?'events':current);setMessage('')}

  if(starting)return <LoadingScreen/>;
  if(recovery)return <ResetPassword onComplete={()=>{setRecovery(false);reset();history.replaceState(null,'','/');setMessage('Dein Passwort wurde geändert. Bitte melde dich mit deinem neuen Passwort an.')}} onCancel={async()=>{await logout();history.replaceState(null,'','/')}}/>;
  if(!user)return <Auth onLogin={login} initialMessage={message} invite={invite}/>;

  const needsOnboarding=!workspaceId||!!invite;
  const navigation=!loadingClubs&&!needsOnboarding;
  const role=workspaces.find(w=>w.id===workspaceId)?.role||'trainer';
  const currentPage=role==='player'&&!PLAYER_PAGES.includes(page)?'events':page;

  return <AppShell page={currentPage} onNavigate={setPage} onLogout={logout} role={role} user={user} workspaces={workspaces} workspaceId={workspaceId} navigation={navigation}>
    {message&&<Notice>{message}</Notice>}
    {loadingClubs
      ? <Card className="items-center py-16"><div className="flex items-center gap-3 text-sm text-muted-foreground" role="status"><LoaderCircle className="size-4 animate-spin"/>Verein wird geladen …</div></Card>
      : needsOnboarding
        ? <Onboarding user={user} onLogout={logout} invite={invite} onComplete={complete} onDismiss={()=>{storage.remove('trainer-club-invite',true);setInvite(null)}}/>
        : currentPage==='profil'
          ? <Profile key={workspaceId} user={user} workspaceId={workspaceId} workspaces={workspaces} onSwitch={switchClub} onUserUpdate={setUser} busy={busy}/>
          : currentPage==='verein'
            ? <Club key={workspaceId} workspaceId={workspaceId} onRename={club=>setWorkspaces(old=>old.map(w=>w.id===club.id?{...w,name:club.name}:w))}/>
            : currentPage==='mannschaft'
              ? <TeamsPage key={workspaceId} workspaceId={workspaceId}/>
              : null}
    {navigation&&['social','scouting'].includes(currentPage)&&<ComingSoon module={currentPage}/>}
    {navigation&&currentPage==='events'&&<Events key={user.id+':'+workspaceId} workspaceId={workspaceId} onOpenPlan={id=>{setOpenPlanId(id);setPage('training')}}/>}
    {navigation&&role!=='player'&&<div hidden={currentPage!=='training'}><Training key={user.id+':'+workspaceId} userId={user.id} workspaceId={workspaceId} openPlanId={openPlanId} onPlanOpened={()=>setOpenPlanId(null)} onBusy={setBusy}/></div>}
  </AppShell>;
}
