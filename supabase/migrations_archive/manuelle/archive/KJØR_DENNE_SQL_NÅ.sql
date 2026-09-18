-- ⚠️ VIKTIG: Fjern foreign key constraint på kontrollor_id ⚠️
-- Dette tillater å opprette kontroller selv om ansatt ikke finnes i ansatte-tabellen

ALTER TABLE anleggsdata_kontroll 
DROP CONSTRAINT IF EXISTS anleggsdata_kontroll_kontrollor_id_fkey;

-- Gjør også kolonnen nullable (hvis den ikke allerede er det)
ALTER TABLE anleggsdata_kontroll 
ALTER COLUMN kontrollor_id DROP NOT NULL;

-- Bekreft at endringene er gjort
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'anleggsdata_kontroll'::regclass
AND conname LIKE '%kontrollor%';

-- Hvis resultatet er tomt, er constraint fjernet! ✅
