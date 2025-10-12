-- ⚠️ VIKTIG: Fjern foreign key constraint på kontrollor_id ⚠️
-- Dette tillater å opprette kontroller uten å spesifisere kontrollør

-- Alternativ 1: Fjern foreign key constraint helt (anbefalt)
ALTER TABLE anleggsdata_kontroll 
DROP CONSTRAINT IF EXISTS anleggsdata_kontroll_kontrollor_id_fkey;

-- Alternativ 2: Gjør kolonnen nullable (hvis den ikke allerede er det)
ALTER TABLE anleggsdata_kontroll 
ALTER COLUMN kontrollor_id DROP NOT NULL;

-- Bekreft at endringene er gjort
SELECT 
    column_name, 
    is_nullable, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'anleggsdata_kontroll' 
AND column_name = 'kontrollor_id';

-- Nå kan du opprette kontroller uten kontrollør! ✅
