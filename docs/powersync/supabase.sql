-- PowerSync: replikasjonsbruker og publikasjon i Supabase.
-- Kjøres én gang i Supabase Dashboard → SQL Editor. Bytt ut passordet før du kjører.
-- Passordet limes deretter inn i PowerSync-dashboardet (Connections → Postgres), aldri i kode.

create role powersync_role with replication bypassrls login password 'BYTT-TIL-ET-LANGT-TILFELDIG-PASSORD';
grant usage on schema public to powersync_role;
grant select on all tables in schema public to powersync_role;
alter default privileges in schema public grant select on tables to powersync_role;

-- Tabellene som synkroniseres til enhetene. Utvides når flere moduler bygges om
-- (alter publication powersync add table <tabell>).
create publication powersync for table customer, anlegg, anleggsdata_nodlys;
