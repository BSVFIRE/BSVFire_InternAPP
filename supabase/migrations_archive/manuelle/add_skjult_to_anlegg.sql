-- Legg til 'skjult' kolonne i anlegg-tabellen
-- Dette feltet brukes for å skjule anlegg fra standard visning uten å slette dem

ALTER TABLE anlegg
ADD COLUMN IF NOT EXISTS skjult BOOLEAN DEFAULT FALSE;

-- Kommentar for dokumentasjon
COMMENT ON COLUMN anlegg.skjult IS 'Indikerer om anlegget er skjult fra standard visning';

-- Opprett indeks for raskere filtrering
CREATE INDEX IF NOT EXISTS idx_anlegg_skjult ON anlegg(skjult);
