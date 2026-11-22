begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('30000000-0000-4000-8000-000000000001','owner@example.invalid',now(),'{"taktelio_profile":{"firstName":"Olaf","lastName":"Owner"}}'),
('30000000-0000-4000-8000-000000000002','coach@example.invalid',now(),'{"taktelio_profile":{"firstName":"Carla","lastName":"Coach"}}'),
('30000000-0000-4000-8000-000000000003','player1@example.invalid',now(),'{"taktelio_profile":{"firstName":"Pia","lastName":"Player"}}'),
('30000000-0000-4000-8000-000000000004','player2@example.invalid',now(),'{}'),
('30000000-0000-4000-8000-000000000005','outsider@example.invalid',now(),'{}'),
('30000000-0000-4000-8000-000000000006','owner2@example.invalid',now(),'{}'),
('30000000-0000-4000-8000-000000000007','coach2@example.invalid',now(),'{}');

-- Verein 1: Inhaber legt Mannschaft und Einladungen an.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select set_config('test.club',public.create_workspace('Termin Test')::text,true);
do $$ declare tid uuid; begin
 insert into public.teams(workspace_id,name,created_by) values(current_setting('test.club')::uuid,'U13','30000000-0000-4000-8000-000000000001') returning id into tid;
 perform set_config('test.team',tid::text,true);
end $$;
select set_config('test.coach_invite',public.create_club_invitation(current_setting('test.club')::uuid,'coach@example.invalid','trainer',null)->>'token',true);
select set_config('test.p1_invite',public.create_club_invitation(current_setting('test.club')::uuid,'player1@example.invalid','player',current_setting('test.team')::uuid)->>'token',true);
select set_config('test.p2_invite',public.create_club_invitation(current_setting('test.club')::uuid,'player2@example.invalid','player',current_setting('test.team')::uuid)->>'token',true);
do $$ begin
 begin perform public.create_club_invitation(current_setting('test.club')::uuid,'x@example.invalid','player',null);raise exception 'TEST: player invite without team';exception when raise_exception then if SQLERRM like 'TEST:%' then raise;end if;end;
 begin perform public.create_club_invitation(current_setting('test.club')::uuid,'x@example.invalid','owner',null);raise exception 'TEST: owner role invited';exception when raise_exception then if SQLERRM like 'TEST:%' then raise;end if;end;
end $$;

-- Verein 2: fremder Verein mit eigenem Termin.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select set_config('test.club2',public.create_workspace('Fremdverein')::text,true);
do $$ declare tid uuid; begin
 insert into public.teams(workspace_id,name,created_by) values(current_setting('test.club2')::uuid,'U15','30000000-0000-4000-8000-000000000006') returning id into tid;
 perform set_config('test.team2',tid::text,true);
 insert into public.events(workspace_id,team_id,created_by,kind,title,starts_at) values(current_setting('test.club2')::uuid,tid,'30000000-0000-4000-8000-000000000006','training','Fremdtraining',now()+interval '2 days');
end $$;

-- Spieler treten bei; die Einladung ordnet sie der Mannschaft zu.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ begin
 if public.accept_club_invitation(current_setting('test.p1_invite'))<>current_setting('test.club')::uuid then raise exception 'TEST: wrong club';end if;
 if not exists(select 1 from public.memberships where workspace_id=current_setting('test.club')::uuid and user_id=auth.uid() and role='player') then raise exception 'TEST: player membership missing';end if;
 if not exists(select 1 from public.team_members where team_id=current_setting('test.team')::uuid and user_id=auth.uid()) then raise exception 'TEST: player not in team';end if;
 begin insert into public.teams(workspace_id,name,created_by) values(current_setting('test.club')::uuid,'Falsch','30000000-0000-4000-8000-000000000003');raise exception 'TEST: player created team';exception when others then if SQLERRM like 'TEST:%' then raise;end if;end;
 begin perform public.create_club_invitation(current_setting('test.club')::uuid,'x@example.invalid','player',current_setting('test.team')::uuid);raise exception 'TEST: player invited member';exception when raise_exception then if SQLERRM like 'TEST:%' then raise;end if;end;
end $$;

select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select public.accept_club_invitation(current_setting('test.p2_invite'));

select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.accept_club_invitation(current_setting('test.coach_invite'));

-- Der Inhaber ordnet den Trainer seiner Mannschaft zu und legt eine zweite
-- Mannschaft für einen anderen Trainer an.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare t2 uuid; begin
 insert into public.team_members(team_id,user_id,role) values(current_setting('test.team')::uuid,'30000000-0000-4000-8000-000000000002','coach');
 insert into public.teams(workspace_id,name,created_by) values(current_setting('test.club')::uuid,'U15','30000000-0000-4000-8000-000000000001') returning id into t2;
 perform set_config('test.team_other',t2::text,true);
end $$;
select set_config('test.coach2_invite',public.create_club_invitation(current_setting('test.club')::uuid,'coach2@example.invalid','trainer',null)->>'token',true);

select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000007","role":"authenticated"}',true);
select public.accept_club_invitation(current_setting('test.coach2_invite'));
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.team_members(team_id,user_id,role) values(current_setting('test.team_other')::uuid,'30000000-0000-4000-8000-000000000007','coach');

-- Trainer legt Termine an und darf Spieler einladen, aber keine Trainer.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ declare eid uuid; begin
 insert into public.events(workspace_id,team_id,created_by,kind,title,starts_at,location)
 values(current_setting('test.club')::uuid,current_setting('test.team')::uuid,'30000000-0000-4000-8000-000000000002','training','Abschlusstraining',now()+interval '2 days','Sportplatz') returning id into eid;
 perform set_config('test.event',eid::text,true);
 insert into public.events(workspace_id,team_id,created_by,kind,title,starts_at,response_deadline)
 values(current_setting('test.club')::uuid,current_setting('test.team')::uuid,'30000000-0000-4000-8000-000000000002','training','Alter Termin',now()-interval '1 hour',now()-interval '2 hours');
 begin perform public.create_club_invitation(current_setting('test.club')::uuid,'x@example.invalid','trainer',null);raise exception 'TEST: trainer invited trainer';exception when raise_exception then if SQLERRM like 'TEST:%' then raise;end if;end;
 perform set_config('test.coach_invite2',public.create_club_invitation(current_setting('test.club')::uuid,'newplayer@example.invalid','player',current_setting('test.team')::uuid)->>'token',true);
end $$;

-- Spieler sieht nur Termine seiner Mannschaft und antwortet nur für sich.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ declare n int; changed int; begin
 select count(*) into n from public.events;
 if n<>2 then raise exception 'TEST: player event visibility %',n;end if;
 begin insert into public.events(workspace_id,team_id,created_by,kind,title,starts_at) values(current_setting('test.club')::uuid,current_setting('test.team')::uuid,auth.uid(),'training','Falsch',now()+interval '3 days');raise exception 'TEST: player created event';exception when others then if SQLERRM like 'TEST:%' then raise;end if;end;
 update public.events set title='Falsch' where id=current_setting('test.event')::uuid;get diagnostics changed=row_count;
 if changed<>0 then raise exception 'TEST: player changed event';end if;
 insert into public.event_responses(event_id,user_id,status,note) values(current_setting('test.event')::uuid,auth.uid(),'accepted','Komme später');
 begin insert into public.event_responses(event_id,user_id,status) values(current_setting('test.event')::uuid,'30000000-0000-4000-8000-000000000004','accepted');raise exception 'TEST: response for another user';exception when others then if SQLERRM like 'TEST:%' then raise;end if;end;
 begin insert into public.event_responses(event_id,user_id,status) select id,auth.uid(),'accepted' from public.events where title='Alter Termin';raise exception 'TEST: response after deadline';exception when others then if SQLERRM like 'TEST:%' then raise;end if;end;
end $$;

-- Roster: Spieler sehen keine E-Mail-Adressen, Trainer schon.
do $$ declare mail text; begin
 select email into mail from public.workspace_roster(current_setting('test.club')::uuid) where user_id=auth.uid();
 if mail is not null then raise exception 'TEST: player saw email';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ declare mail text; begin
 select email into mail from public.workspace_roster(current_setting('test.club')::uuid) where user_id='30000000-0000-4000-8000-000000000003';
 if mail is null then raise exception 'TEST: coach did not see email';end if;
end $$;

-- Absage beendet Rückmeldungen; fremde Vereine bleiben unsichtbar.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
do $$ declare n int; begin
 select count(*) into n from public.events;
 if n<>0 then raise exception 'TEST: outsider saw events';end if;
 begin perform public.workspace_roster(current_setting('test.club')::uuid);raise exception 'TEST: outsider read roster';exception when raise_exception then if SQLERRM like 'TEST:%' then raise;end if;end;
end $$;

select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
update public.events set cancelled_at=now() where id=current_setting('test.event')::uuid;
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
do $$ begin
 begin insert into public.event_responses(event_id,user_id,status) values(current_setting('test.event')::uuid,auth.uid(),'accepted');raise exception 'TEST: response to cancelled event';exception when others then if SQLERRM like 'TEST:%' then raise;end if;end;
end $$;

-- Trainer sieht alle Rückmeldungen.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ declare n int; begin
 select count(*) into n from public.event_responses where event_id=current_setting('test.event')::uuid;
 if n<>1 then raise exception 'TEST: coach response visibility %',n;end if;
end $$;

-- Die Datenbank-API schreibt UPDATE und Upsert mit allen Spalten der Nutzlast.
-- Diese beiden Wege brauchen deshalb Spaltenrechte, die ein reines serverseitiges
-- Prüfskript nicht sieht.
do $$ declare open_event uuid; begin
 update public.events set team_id=current_setting('test.team')::uuid,title='Bearbeitet',updated_at=now()
  where id=current_setting('test.event')::uuid;
 if not found then raise exception 'TEST: event update did not reach a row';end if;
 insert into public.events(workspace_id,team_id,created_by,kind,title,starts_at)
 values(current_setting('test.club')::uuid,current_setting('test.team')::uuid,'30000000-0000-4000-8000-000000000002','training','Offener Termin',now()+interval '4 days')
 returning id into open_event;
 perform set_config('test.event_open',open_event::text,true);
end $$;

select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ begin
 insert into public.event_responses(event_id,user_id,status,note,updated_at)
 values(current_setting('test.event_open')::uuid,auth.uid(),'maybe','Erneut geändert',now())
 on conflict(event_id,user_id) do update
  set event_id=excluded.event_id,user_id=excluded.user_id,status=excluded.status,note=excluded.note,updated_at=excluded.updated_at;
 if not exists(select 1 from public.event_responses where event_id=current_setting('test.event_open')::uuid and user_id=auth.uid() and status='maybe') then raise exception 'TEST: response upsert did not persist';end if;
end $$;

-- Mannschaftsgrenze: der Trainer einer anderen Mannschaft desselben Vereins
-- sieht und ändert keine Termine der ersten Mannschaft und keine fremden Namen.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000007","role":"authenticated"}',true);
do $$ declare n int; changed int; begin
 select count(*) into n from public.events;
 if n<>0 then raise exception 'TEST: other coach saw events %',n;end if;
 begin insert into public.events(workspace_id,team_id,created_by,kind,title,starts_at)
  values(current_setting('test.club')::uuid,current_setting('test.team')::uuid,auth.uid(),'training','Fremd',now()+interval '5 days');
  raise exception 'TEST: other coach created event';
 exception when others then if SQLERRM like 'TEST:%' then raise;end if;end;
 update public.events set title='Fremd' where id=current_setting('test.event')::uuid;get diagnostics changed=row_count;
 if changed<>0 then raise exception 'TEST: other coach changed event';end if;
 select count(*) into n from public.workspace_roster(current_setting('test.club')::uuid) where team_id=current_setting('test.team')::uuid;
 if n<>0 then raise exception 'TEST: other coach saw foreign roster %',n;end if;
end $$;

-- Der Trainer der ersten Mannschaft darf ebenso wenig in die zweite Mannschaft
-- schreiben und sieht dort keine Namen.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ declare n int; begin
 begin insert into public.events(workspace_id,team_id,created_by,kind,title,starts_at)
  values(current_setting('test.club')::uuid,current_setting('test.team_other')::uuid,auth.uid(),'training','Fremd',now()+interval '5 days');
  raise exception 'TEST: coach created event for foreign team';
 exception when others then if SQLERRM like 'TEST:%' then raise;end if;end;
 select count(*) into n from public.workspace_roster(current_setting('test.club')::uuid) where team_id=current_setting('test.team_other')::uuid;
 if n<>0 then raise exception 'TEST: coach saw foreign roster %',n;end if;
 select count(*) into n from public.workspace_roster(current_setting('test.club')::uuid) where team_id=current_setting('test.team')::uuid;
 if n<2 then raise exception 'TEST: coach saw own roster only %',n;end if;
end $$;

-- Spieler sehen nur Namen ihrer Mannschaft und keine E-Mail-Adressen.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ declare n int; mails int; begin
 select count(*) into n from public.workspace_roster(current_setting('test.club')::uuid) where team_id<>current_setting('test.team')::uuid;
 if n<>0 then raise exception 'TEST: player saw foreign roster %',n;end if;
 select count(*) into mails from public.workspace_roster(current_setting('test.club')::uuid) where email is not null;
 if mails<>0 then raise exception 'TEST: player saw email';end if;
end $$;

-- Der Inhaber behält die vereinsweite Sicht.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare n int; begin
 select count(*) into n from public.events;
 if n<2 then raise exception 'TEST: owner saw only % events',n;end if;
end $$;

-- Idempotenz der Neuanlage: dieselbe Anfragekennung erzeugt höchstens einen
-- Termin, auch wenn der zweite Versuch den Schreibvorgang wiederholt.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare n int; begin
 insert into public.events(workspace_id,team_id,created_by,kind,title,starts_at,client_request_id)
 values(current_setting('test.club')::uuid,current_setting('test.team')::uuid,auth.uid(),'training','Idempotent',now()+interval '6 days','abababab-abab-4bab-8bab-abababababab')
 on conflict(workspace_id,client_request_id) where client_request_id is not null do nothing;
 insert into public.events(workspace_id,team_id,created_by,kind,title,starts_at,client_request_id)
 values(current_setting('test.club')::uuid,current_setting('test.team')::uuid,auth.uid(),'training','Idempotent',now()+interval '6 days','abababab-abab-4bab-8bab-abababababab')
 on conflict(workspace_id,client_request_id) where client_request_id is not null do nothing;
 select count(*) into n from public.events where client_request_id='abababab-abab-4bab-8bab-abababababab';
 if n<>1 then raise exception 'TEST: duplicate event %',n;end if;
end $$;

-- Wiederholte Rückmeldung desselben Spielers bleibt eine Zeile.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ declare n int; begin
 insert into public.event_responses(event_id,user_id,status,note,updated_at)
 values(current_setting('test.event_open')::uuid,auth.uid(),'accepted','Erneut',now())
 on conflict(event_id,user_id) do update set status=excluded.status,note=excluded.note,updated_at=excluded.updated_at;
 insert into public.event_responses(event_id,user_id,status,note,updated_at)
 values(current_setting('test.event_open')::uuid,auth.uid(),'declined','Nochmals',now())
 on conflict(event_id,user_id) do update set status=excluded.status,note=excluded.note,updated_at=excluded.updated_at;
 select count(*) into n from public.event_responses where event_id=current_setting('test.event_open')::uuid and user_id=auth.uid();
 if n<>1 then raise exception 'TEST: repeated response rows %',n;end if;
 if not exists(select 1 from public.event_responses where event_id=current_setting('test.event_open')::uuid and user_id=auth.uid() and status='declined') then raise exception 'TEST: latest response missing';end if;
end $$;

-- Ein Trainer der Mannschaft verwaltet Termine, antwortet aber nicht für sich:
-- Rückmeldungen gehören Spielern.
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 begin insert into public.event_responses(event_id,user_id,status) values(current_setting('test.event_open')::uuid,auth.uid(),'accepted');
  raise exception 'TEST: coach answered as player';
 exception when others then if SQLERRM like 'TEST:%' then raise;end if;end;
end $$;

reset role;
rollback;
select 'Teams, player invitations, event visibility, attendance responses, roster privacy and team coach scope passed; transaction rolled back' as result;
