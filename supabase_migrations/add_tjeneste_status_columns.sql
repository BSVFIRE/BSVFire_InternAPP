-- Legg til kolonner for individuell tjenestestatus i anlegg-tabellen
-- Dette gjør det mulig å spore fullføringsstatus for hver tjeneste separat

ALTER TABLE anlegg 
ADD COLUMN IF NOT EXISTS brannalarm_fullfort BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nodlys_fullfort BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS roykluker_fullfort BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS slukkeutstyr_fullfort BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ekstern_fullfort BOOLEAN DEFAULT FALSE;

-- Kommentarer for dokumentasjon
COMMENT ON COLUMN anlegg.brannalarm_fullfort IS 'Indikerer om brannalarm-kontroll er fullført for dette anlegget';
COMMENT ON COLUMN anlegg.nodlys_fullfort IS 'Indikerer om nødlys-kontroll er fullført for dette anlegget';
COMMENT ON COLUMN anlegg.roykluker_fullfort IS 'Indikerer om røykluker-kontroll er fullført for dette anlegget';
COMMENT ON COLUMN anlegg.slukkeutstyr_fullfort IS 'Indikerer om slukkeutstyr-kontroll er fullført for dette anlegget';
COMMENT ON COLUMN anlegg.ekstern_fullfort IS 'Indikerer om ekstern kontroll er fullført for dette anlegget (settes manuelt)';
