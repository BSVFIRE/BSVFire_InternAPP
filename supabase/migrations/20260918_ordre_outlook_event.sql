-- Outlook-avtale knyttet til en ordre («Legg i kalender» i FireCtrl).
-- Graph-ID-en brukes for å slette/oppdatere avtalen når ordren endres.
alter table ordre add column if not exists outlook_event_id text;
alter table ordre add column if not exists planlagt_start timestamptz;
