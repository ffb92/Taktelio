-- Raise the pilot AI limits: 5.00 USD total budget and 30 monthly generations per club.
-- The pilot budget is a lifetime cap, not a monthly allowance.
update private.ai_budget_periods set limit_microusd = 5000000 where id = 'pilot';
alter table public.workspace_entitlements alter column monthly_generations set default 30;
update public.workspace_entitlements set monthly_generations = 30 where monthly_generations < 30;
