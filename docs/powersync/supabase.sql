-- PowerSync: replikasjonsbruker og publikasjon i Supabase.
-- Kjøres én gang i Supabase Dashboard → SQL Editor.
--
-- MERK: her står ikke passordet, og det skal ikke settes inn her heller.
-- Denne filen ligger i git, og et passord limt inn på en av linjene under ville
-- fulgt med til GitHub. Passordet settes i steg 2 lenger nede, som kjøres for seg.

-- 1) Rollen, uten passord
create role powersync_role with replication bypassrls login;
grant usage on schema public to powersync_role;
grant select on all tables in schema public to powersync_role;
alter default privileges in schema public grant select on tables to powersync_role;

-- 2) Passordet – IKKE skriv det inn i denne filen.
--    Lag et nytt i terminalen:    openssl rand -base64 24
--    Kjør så denne ene linjen direkte i SQL-editoren med passordet ditt,
--    og lim det samme passordet inn i PowerSync → Connections → Postgres:
--
--      alter role powersync_role with password '<passordet ditt>';

-- 3) Tabellene som synkroniseres til enhetene.
--    Utvides når flere moduler bygges om: alter publication powersync add table <tabell>;
create publication powersync for table customer, anlegg, anleggsdata_nodlys, ansatte;
