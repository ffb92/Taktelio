begin;
insert into auth.users(id,email,email_confirmed_at) values
('30000000-0000-4000-8000-000000000001','limits-owner@example.invalid',now()),
('30000000-0000-4000-8000-000000000002','limits-other@example.invalid',now());
insert into private.ai_gate_config(id,secret_hash) values(true,encode(sha256(convert_to('transaction-only','UTF8')),'hex')) on conflict(id) do update set secret_hash=excluded.secret_hash;
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select set_config('test.club',public.create_workspace('Limit Test')::text,true);
do $$ declare r jsonb; begin
 r:=public.ai_gate('reserve',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000011',repeat('a',64),'wrong','{}');
 if r->>'code'<>'unavailable' then raise exception 'secret bypass';end if;
 begin update public.workspace_entitlements set monthly_generations=999;raise exception 'TEST: entitlement write allowed';exception when insufficient_privilege then null;end;
 r:=public.ai_gate('reserve',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000011',repeat('a',64),'transaction-only','{}');
 if r->>'code'<>'reserved' then raise exception 'reservation failed %',r;end if;
 r:=public.ai_gate('reserve',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000011',repeat('a',64),'transaction-only','{}');
 if r->>'code'<>'running' then raise exception 'duplicate execution';end if;
 r:=public.ai_gate('reserve',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000012',repeat('a',64),'transaction-only','{}');
 if r->>'code'<>'running' then raise exception 'parallel request allowed';end if;
 r:=public.ai_gate('finish',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000011',null,'transaction-only','{"outcome":"succeeded","cost_microusd":2000,"input_tokens":1000,"output_tokens":1000,"result":{"plan":"test"}}');
 if r->>'code'<>'settled' then raise exception 'finish failed';end if;
 r:=public.ai_gate('reserve',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000011',repeat('a',64),'transaction-only','{}');
 if r->>'code'<>'replay' or r->'result'->>'plan'<>'test' then raise exception 'replay failed';end if;
 r:=public.ai_gate('reserve',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000011',repeat('b',64),'transaction-only','{}');
 if r->>'code'<>'conflict' then raise exception 'fingerprint mismatch accepted';end if;
 r:=public.ai_gate('status',current_setting('test.club')::uuid,null,null,'transaction-only','{}');
 if (r->>'used')::int<>1 or (r->>'reserved')::int<>0 then raise exception 'usage incorrect %',r;end if;
end $$;
-- A second verified identity may not use the first club, even with the Worker secret.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 if public.ai_gate('status',current_setting('test.club')::uuid,null,null,'transaction-only','{}')->>'code'<>'forbidden' then raise exception 'tenant bypass';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
reset role;
update public.workspace_entitlements set monthly_generations=1 where workspace_id=current_setting('test.club')::uuid;
set local role authenticated;
do $$ begin
 if public.ai_gate('reserve',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000012',repeat('a',64),'transaction-only','{}')->>'code'<>'quota' then raise exception 'quota bypass';end if;
end $$;
reset role;
update public.workspace_entitlements set monthly_generations=10 where workspace_id=current_setting('test.club')::uuid;
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.ai_gate('reserve',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000012',repeat('a',64),'transaction-only','{}');
 if r->>'code'<>'reserved' then raise exception 'second reserve';end if;
 perform public.ai_gate('finish',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000012',null,'transaction-only','{"outcome":"failed","cost_microusd":1200}');
 r:=public.ai_gate('status',current_setting('test.club')::uuid,null,null,'transaction-only','{}');
 if (r->>'used')::int<>1 then raise exception 'failure consumed quota';end if;
 perform public.ai_gate('reserve',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000013',repeat('a',64),'transaction-only','{}');
 perform public.ai_gate('finish',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000013',null,'transaction-only','{"outcome":"unknown"}');
 if public.ai_gate('reserve',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000014',repeat('a',64),'transaction-only','{}')->>'code'<>'rate' then raise exception 'rate bypass';end if;
end $$;
reset role;
update private.ai_requests set created_at=now()-interval '3 minutes' where user_id='30000000-0000-4000-8000-000000000001';
update private.ai_budget_periods set limit_microusd=100000 where id='pilot';
set local role authenticated;
do $$ begin
 if public.ai_gate('reserve',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000014',repeat('a',64),'transaction-only','{}')->>'code'<>'budget' then raise exception 'budget bypass';end if;
end $$;
reset role;
update private.ai_budget_periods set limit_microusd=1000000 where id='pilot';
set local role authenticated;
select public.ai_gate('reserve',current_setting('test.club')::uuid,'30000000-0000-4000-8000-000000000014',repeat('a',64),'transaction-only','{}');
reset role;
update private.ai_requests set created_at=now()-interval '3 minutes' where id='30000000-0000-4000-8000-000000000014';
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.ai_gate('status',current_setting('test.club')::uuid,null,null,'transaction-only','{}');
 if (r->>'reserved')::int<>0 then raise exception 'stale request blocked user';end if;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from private.ai_requests where id='30000000-0000-4000-8000-000000000014' and status='unknown' and cost_microusd=100000) then raise exception 'stale cost incorrectly refunded';end if;
end $$;
-- Monthly rollover: old success does not consume this month's quota, but still costs global budget.
update private.ai_requests set period_start=(date_trunc('month',now() at time zone 'UTC')-interval '1 month')::date where user_id='30000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
 if (public.ai_gate('status',current_setting('test.club')::uuid,null,null,'transaction-only','{}')->>'used')::int<>0 then raise exception 'monthly rollover failed';end if;
end $$;
reset role;
rollback;
select 'PASS: secret, roles, tenant isolation, idempotency, concurrency guard, quota, rate, budget, settlement, timeout recovery and monthly rollover. Rolled back.' as result;
