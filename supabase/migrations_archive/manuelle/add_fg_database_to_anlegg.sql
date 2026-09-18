-- Legg til 'fg_database_registrert' kolonne i anlegg-tabellen
-- Dette feltet brukes for å indikere om anlegget er registrert i FG Database
-- Gjelder kun anlegg med kontrolltype Brannalarm

ALTER TABLE anlegg
ADD COLUMN IF NOT EXISTS fg_database_registrert BOOLEAN DEFAULT FALSE;

-- Kommentar for dokumentasjon
COMMENT ON COLUMN anlegg.fg_database_registrert IS 'Indikerer om anlegget er registrert i FG Database (kun relevant for brannalarm-anlegg)';

-- Opprett indeks for raskere filtrering
CREATE INDEX IF NOT EXISTS idx_anlegg_fg_database ON anlegg(fg_database_registrert);
