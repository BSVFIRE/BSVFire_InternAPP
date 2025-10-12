-- Sikre at anleggsdata_brannalarm har unique constraint på anlegg_id
-- Dette er nødvendig for at upsert skal fungere

-- Sjekk om constraint finnes
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'anleggsdata_brannalarm'::regclass
AND conname LIKE '%anlegg_id%';

-- Legg til unique constraint hvis den ikke finnes
-- (Bare kjør denne hvis du ikke ser en unique constraint på anlegg_id over)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'anleggsdata_brannalarm'::regclass 
    AND conname = 'anleggsdata_brannalarm_anlegg_id_key'
  ) THEN
    ALTER TABLE anleggsdata_brannalarm 
    ADD CONSTRAINT anleggsdata_brannalarm_anlegg_id_key 
    UNIQUE (anlegg_id);
  END IF;
END $$;

-- Bekreft at constraint er opprettet
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'anleggsdata_brannalarm'::regclass
AND conname = 'anleggsdata_brannalarm_anlegg_id_key';
