-- Fix manglende kolonner i hendelser-tabellen
-- Kjør denne i Supabase SQL Editor

-- Legg til manglende kolonner
ALTER TABLE hendelser ADD COLUMN IF NOT EXISTS aarsak_analyse TEXT;
ALTER TABLE hendelser ADD COLUMN IF NOT EXISTS forebyggende_tiltak TEXT;
ALTER TABLE hendelser ADD COLUMN IF NOT EXISTS involverte_personer TEXT;
ALTER TABLE hendelser ADD COLUMN IF NOT EXISTS vitner TEXT;
ALTER TABLE hendelser ADD COLUMN IF NOT EXISTS sted TEXT;

-- Verifiser at kolonnene er lagt til
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hendelser'
ORDER BY ordinal_position;
