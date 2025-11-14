-- Endre kundenummer-kolonnen fra numeric til text/uuid for å støtte UUID-er

-- Først, sjekk hva som finnes i tabellen
SELECT id, anlegg_id, kundenummer, prisbrannalarm, prisnodlys, prisekstern 
FROM priser_kundenummer 
LIMIT 5;

-- Endre kolonnetypen fra numeric til text
ALTER TABLE priser_kundenummer 
ALTER COLUMN kundenummer TYPE TEXT USING kundenummer::TEXT;

-- Alternativt, hvis det skal være UUID:
-- ALTER TABLE priser_kundenummer 
-- ALTER COLUMN kundenummer TYPE UUID USING kundenummer::UUID;

-- Verifiser endringen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'priser_kundenummer' 
  AND column_name = 'kundenummer';
