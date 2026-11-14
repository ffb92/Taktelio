import React from 'react';
import {ClipboardList,ChevronRight,Megaphone,Search,Users} from 'lucide-react';
import {cn} from '@/lib/utils';

const NAV_ITEMS=[
  {id:'training',label:'Training',shortLabel:'Training',icon:ClipboardList},
  {id:'social',label:'Social Media',shortLabel:'Social',icon:Megaphone},
  {id:'scouting',label:'Scouting',shortLabel:'Scouting',icon:Search},
];

const PAGE_TITLES={training:'Training',social:'Social Media',scouting:'Scouting',profile:'Profil & Verein'};

export function Brand({className}){
  return <div className={cn('flex items-center gap-3',className)}>
    <img src="/images/brand-icon.webp" alt="" width="40" height="40" decoding="async" className="size-10 shrink-0"/>
    <span className="flex min-w-0 flex-col">
      <img src="/images/brand-wordmark.webp" alt="Taktelio" width="113" height="24" decoding="async" className="h-6 w-auto"/>
      <span className="text-[11px] leading-tight text-muted-foreground">Raum für dein Team.</span>
    </span>
  </div>;
}

function initials(name){
  const parts=name.trim().split(/\s+/).filter(Boolean);
  if(!parts.length)return 'T';
  return (parts[0][0]+(parts.length>1?parts[parts.length-1][0]:'')).toUpperCase();
}

export default function AppShell({page,onNavigate,user,workspaces=[],workspaceId,navigation=true,children}){
  const club=workspaces.find(w=>w.id===workspaceId);
  const profile=user?.profile||{};
  const fullName=profile.displayName||[profile.firstName,profile.lastName].filter(Boolean).join(' ')||user?.email||'Trainer';

  return <div className="flex min-h-dvh flex-col lg:flex-row">
    {navigation&&<aside className="print-hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card lg:sticky lg:top-0 lg:inset-x-auto lg:bottom-auto lg:flex lg:h-dvh lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-t-0 lg:bg-sidebar">
      <div className="hidden items-center px-5 pb-5 pt-6 lg:flex">
        <Brand/>
      </div>

      <div className="hidden px-3 lg:block">
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/50 px-3 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Users className="size-4"/></span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Verein</p>
            <p className="truncate text-sm font-semibold leading-tight">{club?.name||'Noch kein Verein'}</p>
          </div>
        </div>
      </div>

      <nav aria-label="Hauptnavigation" className="grid grid-cols-3 gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:mt-6 lg:flex lg:flex-1 lg:flex-col lg:gap-1 lg:px-3 lg:pb-0 lg:pt-0">
        {NAV_ITEMS.map(item=>{
          const Icon=item.icon,active=page===item.id;
          return <button key={item.id} type="button" aria-label={item.label} aria-current={active?'page':undefined} onClick={()=>onNavigate(item.id)} className={cn('group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-lg lg:px-3 lg:text-sm',active?'text-primary':'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',active&&'lg:bg-sidebar-accent lg:font-semibold lg:text-sidebar-accent-foreground')}>
            {active&&<span className="absolute left-0 top-1/2 hidden h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-lime lg:block" aria-hidden="true"/>}
            <span className={cn('grid size-9 place-items-center rounded-full transition-colors lg:size-5 lg:rounded-none',active&&'bg-primary/10 lg:bg-transparent')}>
              <Icon className="size-5 lg:size-[18px]"/>
            </span>
            <span className="lg:hidden">{item.shortLabel}</span>
            <span className="hidden lg:inline">{item.label}</span>
          </button>;
        })}
      </nav>

      <button type="button" aria-label="Profil & Verein" aria-current={page==='profile'?'page':undefined} onClick={()=>onNavigate('profile')} className={cn('fixed right-2 top-1 z-40 grid size-12 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:static lg:mt-auto lg:flex lg:size-auto lg:w-full lg:items-center lg:justify-start lg:gap-3 lg:rounded-none lg:border-t lg:border-sidebar-border lg:px-4 lg:py-4',page==='profile'?'lg:bg-sidebar-accent':'lg:hover:bg-sidebar-accent/60')}>
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm transition-shadow',page==='profile'&&'ring-2 ring-brand-lime/70 ring-offset-2 ring-offset-background lg:ring-0 lg:ring-offset-0')}>{initials(fullName)}</span>
        <span className="hidden min-w-0 flex-1 lg:block">
          <span className="block truncate text-sm font-semibold leading-tight">{fullName}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
        </span>
        <ChevronRight className={cn('hidden size-4 shrink-0 text-muted-foreground lg:block',page==='profile'&&'text-primary')}/>
      </button>
    </aside>}

    <div className="flex min-w-0 flex-1 flex-col">
      <header className={cn('print-hidden sticky top-0 z-30 flex items-center gap-3 border-b border-border/80 bg-background/85 backdrop-blur-md',navigation?'h-14 px-4 lg:h-16 lg:px-8':'h-16 px-4 sm:px-6')}>
        {navigation?<>
          <div className="lg:hidden"><Brand/></div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{club?.name||'Taktelio'}</p>
            <h1 className="truncate text-lg font-semibold tracking-tight">{PAGE_TITLES[page]||'Taktelio'}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {club&&<span className="hidden max-w-56 items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground lg:inline-flex">
              <Users className="size-3.5"/><span className="truncate">{club.name}</span>
            </span>}
          </div>
        </>:<Brand/>}
      </header>

      <main className={cn('mx-auto w-full flex-1 px-4 py-5 sm:px-6',navigation?'max-w-6xl pb-28 lg:px-8 lg:py-8 lg:pb-12':'max-w-xl pb-12 pt-8')}>
        {children}
      </main>

      {navigation&&<footer className="print-hidden mt-auto hidden px-8 pb-6 text-xs text-muted-foreground lg:block">Taktelio · Gemeinsam besser trainieren.</footer>}
    </div>
  </div>;
}
