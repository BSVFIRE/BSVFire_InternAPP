-- ⚠️ VIKTIG: Fjern unique constraint på anlegg_id ⚠️
-- Dette tillater flere kontroller (utkast, ferdig, sendt) per anlegg

-- Fjern unique constraint
ALTER TABLE anleggsdata_kontroll DROP CONSTRAINT IF EXISTS unique_anlegg_id;

-- Bekreft at den er fjernet
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'anleggsdata_kontroll'::regclass;

-- Nå kan du ha flere kontroller per anlegg! ✅
