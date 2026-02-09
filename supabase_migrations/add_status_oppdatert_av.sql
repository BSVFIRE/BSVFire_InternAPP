-- Legg til kolonner for å spore hvem som sist endret status på anlegg
ALTER TABLE anlegg ADD COLUMN IF NOT EXISTS status_oppdatert_av UUID REFERENCES ansatte(id);
ALTER TABLE anlegg ADD COLUMN IF NOT EXISTS status_oppdatert_av_navn TEXT;

-- Kommentar for dokumentasjon
COMMENT ON COLUMN anlegg.status_oppdatert_av IS 'ID til ansatt som sist endret kontroll_status';
COMMENT ON COLUMN anlegg.status_oppdatert_av_navn IS 'Navn på ansatt som sist endret kontroll_status (denormalisert for enkel visning)';
