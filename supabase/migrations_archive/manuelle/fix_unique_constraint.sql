-- Sjekk og fjern unique constraint som forhindrer flere kontroller per anlegg
-- Dette er nødvendig for å kunne ha flere kontroller (utkast, ferdig, sendt) per anlegg

-- Først, sjekk hvilke constraints som finnes
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'anleggsdata_kontroll'::regclass;

-- Hvis det finnes en unique constraint på (anlegg_id, rapport_type), fjern den:
-- (Kjør denne bare hvis du ser en slik constraint i resultatet over)

-- Eksempel på hvordan du fjerner en constraint (erstatt 'constraint_name' med faktisk navn):
-- ALTER TABLE anleggsdata_kontroll DROP CONSTRAINT IF EXISTS anleggsdata_kontroll_anlegg_id_rapport_type_key;

-- Hvis det finnes en unique index, fjern den:
-- DROP INDEX IF EXISTS idx_anleggsdata_kontroll_unique_anlegg_rapport;
