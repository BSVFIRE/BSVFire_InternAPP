-- Sjekk kontrollor_id kolonnen
SELECT column_name, column_default, is_nullable, data_type
FROM information_schema.columns 
WHERE table_name = 'anleggsdata_kontroll' 
AND column_name = 'kontrollor_id';

-- Hvis kontrollor_id ikke er nullable, gjør den nullable:
ALTER TABLE anleggsdata_kontroll 
ALTER COLUMN kontrollor_id DROP NOT NULL;

-- Eller fjern foreign key constraint helt:
-- ALTER TABLE anleggsdata_kontroll DROP CONSTRAINT IF EXISTS anleggsdata_kontroll_kontrollor_id_fkey;
