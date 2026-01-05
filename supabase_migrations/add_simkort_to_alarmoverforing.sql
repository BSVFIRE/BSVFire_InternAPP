-- Legg til simkort og fakturering-kolonner i alarmoverforing-tabellen
-- Kjør denne i Supabase SQL Editor

ALTER TABLE alarmoverforing 
ADD COLUMN IF NOT EXISTS inkluderer_simkort BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS simkort_pris DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS simkort_bsv_kostnad DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fakturering VARCHAR(20) DEFAULT 'kvartal';

-- Kommentarer for dokumentasjon
COMMENT ON COLUMN alarmoverforing.inkluderer_simkort IS 'Om tilbudet inkluderer simkort (100 kr/mnd)';
COMMENT ON COLUMN alarmoverforing.simkort_pris IS 'Simkort pris per måned (100 kr eks mva)';
COMMENT ON COLUMN alarmoverforing.simkort_bsv_kostnad IS 'BSV kostnad for simkort per måned (49 kr)';
COMMENT ON COLUMN alarmoverforing.fakturering IS 'Faktureringsfrekvens: kvartal eller aar';
