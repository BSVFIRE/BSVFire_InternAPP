-- ⚠️ KJØR DENNE SQL-EN FOR Å TILLATE FLERE KONTROLLER PER ANLEGG ⚠️

-- Først, sjekk hvilke constraints som finnes
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'anleggsdata_kontroll'::regclass;

-- Hvis du ser en constraint som inneholder (anlegg_id, rapport_type),
-- kjør denne for å fjerne den (erstatt 'CONSTRAINT_NAME' med faktisk navn):

-- ALTER TABLE anleggsdata_kontroll DROP CONSTRAINT IF EXISTS anleggsdata_kontroll_anlegg_id_rapport_type_key;

-- Eller hvis det er en unique index:
-- DROP INDEX IF EXISTS anleggsdata_kontroll_anlegg_id_rapport_type_key;

-- Vanlige navn på slike constraints:
ALTER TABLE anleggsdata_kontroll DROP CONSTRAINT IF EXISTS anleggsdata_kontroll_anlegg_id_rapport_type_key;
ALTER TABLE anleggsdata_kontroll DROP CONSTRAINT IF EXISTS anleggsdata_kontroll_unique_anlegg_rapport;
DROP INDEX IF EXISTS anleggsdata_kontroll_anlegg_id_rapport_type_key;
DROP INDEX IF EXISTS idx_anleggsdata_kontroll_unique;

-- Nå kan du ha flere kontroller (utkast, ferdig, sendt) per anlegg! ✅
