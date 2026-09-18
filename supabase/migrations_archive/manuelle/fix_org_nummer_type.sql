-- Fix org_nummer og kunde_nummer column types in anlegg and customer tables
-- Endre fra integer til text for å støtte organisasjonsnummer med mellomrom og ledende nuller

-- ============================================
-- Fix anlegg table
-- ============================================

-- Endre org_nummer kolonnetypen fra integer til text
ALTER TABLE anlegg 
ALTER COLUMN org_nummer TYPE TEXT USING org_nummer::TEXT;

-- Endre kunde_nummer kolonnetypen fra integer til text (hvis den er integer)
ALTER TABLE anlegg 
ALTER COLUMN kunde_nummer TYPE TEXT USING kunde_nummer::TEXT;

-- ============================================
-- Fix customer table
-- ============================================

-- Endre organisasjonsnummer kolonnetypen fra integer til text
ALTER TABLE customer 
ALTER COLUMN organisasjonsnummer TYPE TEXT USING organisasjonsnummer::TEXT;

-- ============================================
-- Bekreft endringene
-- ============================================

SELECT 'anlegg' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'anlegg' AND column_name IN ('org_nummer', 'kunde_nummer')
UNION ALL
SELECT 'customer' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customer' AND column_name = 'organisasjonsnummer';
