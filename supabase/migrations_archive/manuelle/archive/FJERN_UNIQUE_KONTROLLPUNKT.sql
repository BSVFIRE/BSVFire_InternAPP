-- ⚠️ VIKTIG: Fjern unique constraint på ns3960_kontrollpunkter ⚠️
-- Dette tillater å lagre samme kontrollpunkt flere ganger (for forskjellige kontroller)

-- Sjekk hvilke constraints som finnes
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'ns3960_kontrollpunkter'::regclass;

-- Fjern unique constraint
ALTER TABLE ns3960_kontrollpunkter 
DROP CONSTRAINT IF EXISTS unique_kontrollpunkt;

-- Sjekk også om det er en unique index
DROP INDEX IF EXISTS unique_kontrollpunkt;
DROP INDEX IF EXISTS ns3960_kontrollpunkter_unique_kontrollpunkt;

-- Bekreft at constraint er fjernet
SELECT 
    conname AS constraint_name
FROM pg_constraint
WHERE conrelid = 'ns3960_kontrollpunkter'::regclass
AND conname LIKE '%unique%';

-- Hvis resultatet er tomt, er constraint fjernet! ✅
