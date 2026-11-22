-- P4: Idempotente Termin-Neuanlage.
--
-- Nachgewiesene Lücke: Ein zweiter Speicherversuch mit denselben Angaben legte
-- einen zweiten Termin an. Bei einem Zeitüberschreitungsfehler nach dem Schreiben
-- sieht der Trainer einen Fehler, obwohl der Termin existiert, und legt beim
-- erneuten Speichern eine Dublette an.
--
-- Lösung: Eine clientseitig erzeugte Anfragekennung wird je Verein eindeutig
-- gespeichert. Dieselbe Kennung erzeugt höchstens einen Termin. Die Kennung ist
-- optional, damit ältere Clients weiter funktionieren.

alter table public.events add column client_request_id uuid;
create unique index events_workspace_request on public.events(workspace_id,client_request_id)
 where client_request_id is not null;
grant insert(client_request_id) on public.events to authenticated;
