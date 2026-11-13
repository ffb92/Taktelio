create table public.workspace_entitlements (
 workspace_id uuid primary key references public.workspaces(id) on delete cascade,
 ai_enabled boolean not null default true,
 monthly_generations integer not null default 10 check(monthly_generations between 0 and 100000),
 updated_at timestamptz not null default now()
);
create table private.ai_budget_periods (
 id text primary key, limit_microusd bigint not null check(limit_microusd>=0),
 enabled boolean not null default true, created_at timestamptz not null default now()
);
create table private.ai_gate_config (
 id boolean primary key default true check(id), secret_hash text not null
);
create table private.ai_requests (
 id uuid primary key, workspace_id uuid not null references public.workspaces(id),
 user_id uuid not null references auth.users(id), budget_id text not null references private.ai_budget_periods(id),
 fingerprint text not null, status text not null check(status in ('reserved','succeeded','failed','unknown')),
 period_start date not null, reserved_microusd bigint not null default 100000,
 cost_microusd bigint, input_tokens integer, output_tokens integer,
 created_at timestamptz not null default now(), finished_at timestamptz, result jsonb
);
create index ai_requests_workspace_period on private.ai_requests(workspace_id,period_start,status);
create index ai_requests_user_time on private.ai_requests(user_id,created_at desc);
create index ai_requests_budget on private.ai_requests(budget_id);
create index ai_requests_pending on private.ai_requests(created_at) where status='reserved';
alter table public.workspace_entitlements enable row level security;
alter table private.ai_budget_periods enable row level security;
alter table private.ai_gate_config enable row level security;
alter table private.ai_requests enable row level security;
revoke all on public.workspace_entitlements,private.ai_budget_periods,private.ai_gate_config,private.ai_requests from public,anon,authenticated;
grant select on public.workspace_entitlements to authenticated;
create policy entitlement_member_read on public.workspace_entitlements for select to authenticated using(workspace_id in(select workspace_id from public.memberships where user_id=(select auth.uid())));
insert into private.ai_budget_periods(id,limit_microusd) values('pilot',1000000);
insert into public.workspace_entitlements(workspace_id) select id from public.workspaces;

-- Only the trusted Worker knows gate_secret. User identity and membership remain mandatory.
create function private.ai_gate(action text,wid uuid,rid uuid,fingerprint text,gate_secret text,details jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); budget private.ai_budget_periods%rowtype; ent public.workspace_entitlements%rowtype;
 req private.ai_requests%rowtype; used integer; pending integer; cost bigint; total bigint;
 month_start date:=date_trunc('month',now() at time zone 'UTC')::date; outcome text;
begin
 if actor is null or not exists(select 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null)
 or not exists(select 1 from public.memberships m where m.workspace_id=wid and m.user_id=actor) then
 return jsonb_build_object('code','forbidden'); end if;
 if gate_secret is null or not exists(select 1 from private.ai_gate_config c where c.secret_hash=encode(sha256(convert_to(gate_secret,'UTF8')),'hex')) then
 return jsonb_build_object('code','unavailable'); end if;
 -- One short transaction lock serializes reserve/settle across all clubs and budget rollover.
 select * into budget from private.ai_budget_periods where id='pilot' for update;
 if budget.id is null then return jsonb_build_object('code','unavailable'); end if;
 -- An unknown provider outcome must never refund potentially spent money.
 update private.ai_requests set status='unknown',cost_microusd=reserved_microusd,finished_at=now()
 where status='reserved' and created_at<now()-interval '2 minutes';
 insert into public.workspace_entitlements(workspace_id) values(wid) on conflict do nothing;
 select * into ent from public.workspace_entitlements where workspace_id=wid;
 if action='finish' then
  select * into req from private.ai_requests r where r.id=rid and r.user_id=actor and r.workspace_id=wid;
  if req.id is null then return jsonb_build_object('code','forbidden');end if;
  if req.status<>'reserved' then return jsonb_build_object('code','settled');end if;
  outcome:=details->>'outcome';
  if outcome is null or outcome not in ('succeeded','failed','unknown') then return jsonb_build_object('code','invalid');end if;
  cost:=case when outcome='unknown' or details->>'cost_microusd' is null then req.reserved_microusd else (details->>'cost_microusd')::bigint end;
  if cost<0 or (outcome='succeeded' and jsonb_typeof(details->'result') is distinct from 'object') then return jsonb_build_object('code','invalid');end if;
  update private.ai_requests set status=outcome,cost_microusd=cost,input_tokens=(details->>'input_tokens')::integer,
   output_tokens=(details->>'output_tokens')::integer,finished_at=now(),result=case when outcome='succeeded' then details->'result' else null end where id=rid;
  return jsonb_build_object('code','settled');
 end if;
 if action not in ('status','reserve') or action is null then return jsonb_build_object('code','invalid');end if;
 if action='reserve' then
  if rid is null or fingerprint is null or fingerprint !~ '^[a-f0-9]{64}$' then return jsonb_build_object('code','invalid');end if;
  select * into req from private.ai_requests r where r.id=rid;
  if req.id is not null then
   if req.user_id<>actor or req.workspace_id<>wid or req.fingerprint<>fingerprint then return jsonb_build_object('code','conflict');end if;
   if req.status='succeeded' then return jsonb_build_object('code','replay','result',req.result);end if;
   return jsonb_build_object('code',case when req.status='reserved' then 'running' else 'already_finished' end);
  end if;
 end if;
 select count(*) filter(where status='succeeded'),count(*) filter(where status='reserved') into used,pending
 from private.ai_requests where workspace_id=wid and period_start=month_start;
 select coalesce(sum(case when status='reserved' then reserved_microusd else coalesce(cost_microusd,reserved_microusd) end),0)
 into total from private.ai_requests where budget_id=budget.id;
 if action='status' then return jsonb_build_object('code','ok','used',used,'reserved',pending,'limit',ent.monthly_generations,
 'reset_at',(month_start+interval '1 month') at time zone 'UTC','available',ent.ai_enabled and budget.enabled and used+pending<ent.monthly_generations and total+100000<=budget.limit_microusd,
 'reason',case when not ent.ai_enabled then 'disabled' when not budget.enabled or total+100000>budget.limit_microusd then 'budget' when used+pending>=ent.monthly_generations then 'quota' else null end);end if;
 if not ent.ai_enabled then return jsonb_build_object('code','disabled');end if;
 if exists(select 1 from private.ai_requests where user_id=actor and status='reserved') then return jsonb_build_object('code','running');end if;
 if (select count(*) from private.ai_requests where user_id=actor and created_at>now()-interval '1 minute')>=3 then return jsonb_build_object('code','rate');end if;
 if used+pending>=ent.monthly_generations then return jsonb_build_object('code','quota');end if;
 if not budget.enabled or total+100000>budget.limit_microusd then return jsonb_build_object('code','budget');end if;
 insert into private.ai_requests(id,workspace_id,user_id,budget_id,fingerprint,status,period_start)
 values(rid,wid,actor,budget.id,fingerprint,'reserved',month_start);
 return jsonb_build_object('code','reserved');
end $$;
create function public.ai_gate(action text,wid uuid,rid uuid,fingerprint text,gate_secret text,details jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select private.ai_gate(action,wid,rid,fingerprint,gate_secret,details) $$;
revoke all on function private.ai_gate(text,uuid,uuid,text,text,jsonb),public.ai_gate(text,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function private.ai_gate(text,uuid,uuid,text,text,jsonb),public.ai_gate(text,uuid,uuid,text,text,jsonb) to authenticated;
