-- Legg til dropbox_synced felt for å spore hvilke anlegg som har Dropbox-mapper
ALTER TABLE anlegg ADD COLUMN IF NOT EXISTS dropbox_synced BOOLEAN DEFAULT FALSE;

-- Kommenter feltet
COMMENT ON COLUMN anlegg.dropbox_synced IS 'Indikerer om Dropbox-mapper er opprettet for dette anlegget';
