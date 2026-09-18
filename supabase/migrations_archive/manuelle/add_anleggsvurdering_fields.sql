-- Legg til felter for anleggsvurdering i anleggsdata_kontroll tabellen
-- Disse feltene brukes i FG790 Tabell 3.5.2-1

ALTER TABLE anleggsdata_kontroll
ADD COLUMN IF NOT EXISTS kontrollor_vurdering_sum INTEGER,
ADD COLUMN IF NOT EXISTS kontrollor_vurdering_kommentar TEXT,
ADD COLUMN IF NOT EXISTS ingen_anleggsvurdering BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ingen_anleggsvurdering_kommentar TEXT,
ADD COLUMN IF NOT EXISTS kritisk_feil BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS kritisk_feil_kommentar TEXT;

-- Kommentarer
COMMENT ON COLUMN anleggsdata_kontroll.kontrollor_vurdering_sum IS 'Kontrollørens vurdering av anlegget (0-100 poeng)';
COMMENT ON COLUMN anleggsdata_kontroll.kontrollor_vurdering_kommentar IS 'Kommentar til kontrollørens vurdering';
COMMENT ON COLUMN anleggsdata_kontroll.ingen_anleggsvurdering IS 'Om anlegget ikke kan få anleggsvurdering (Se 3.5.3.2)';
COMMENT ON COLUMN anleggsdata_kontroll.ingen_anleggsvurdering_kommentar IS 'Kommentar til hvorfor det ikke er anleggsvurdering';
COMMENT ON COLUMN anleggsdata_kontroll.kritisk_feil IS 'Om anlegget har kritisk funksjonsfeil (Se 3.5.3.3)';
COMMENT ON COLUMN anleggsdata_kontroll.kritisk_feil_kommentar IS 'Kommentar til kritisk funksjonsfeil';
