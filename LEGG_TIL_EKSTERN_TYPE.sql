-- Legg til ekstern_type og ekstern_type_annet kolonner i serviceavtale_tilbud tabellen

-- Legg til kolonne for ekstern type
ALTER TABLE serviceavtale_tilbud
ADD COLUMN IF NOT EXISTS ekstern_type TEXT;

-- Legg til kolonne for ekstern type annet (fritekst)
ALTER TABLE serviceavtale_tilbud
ADD COLUMN IF NOT EXISTS ekstern_type_annet TEXT;

-- Legg til kommentar for dokumentasjon
COMMENT ON COLUMN serviceavtale_tilbud.ekstern_type IS 'Type ekstern tjeneste: Sprinkler, Elektro, Ventilasjon, Rør, Gass anlegg, Slukke anlegg, eller Annet';
COMMENT ON COLUMN serviceavtale_tilbud.ekstern_type_annet IS 'Fritekst beskrivelse når ekstern_type er "Annet"';
