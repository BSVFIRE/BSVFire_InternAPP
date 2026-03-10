-- Legg til opprettet_av kolonne i ordre-tabellen
-- Dette feltet lagrer hvem som opprinnelig opprettet ordren

ALTER TABLE ordre
ADD COLUMN IF NOT EXISTS opprettet_av TEXT;

COMMENT ON COLUMN ordre.opprettet_av IS 'Navn på personen som opprinnelig opprettet ordren';
