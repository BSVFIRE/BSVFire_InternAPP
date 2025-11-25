-- Legg til manglende kolonner i roykluke_sentraler tabellen
-- Kjør denne SQL-en i Supabase SQL Editor

ALTER TABLE roykluke_sentraler
ADD COLUMN IF NOT EXISTS manuell_utlos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS funksjonsteste BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS service_resatt BOOLEAN DEFAULT false;

-- Kommenter på kolonnene for dokumentasjon
COMMENT ON COLUMN roykluke_sentraler.manuell_utlos IS 'Om manuell utløs er testet';
COMMENT ON COLUMN roykluke_sentraler.funksjonsteste IS 'Om funksjonstest er utført';
COMMENT ON COLUMN roykluke_sentraler.service_resatt IS 'Om service er resatt';
