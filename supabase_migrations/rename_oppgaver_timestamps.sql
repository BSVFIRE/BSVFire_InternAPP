-- Endre oppgaver fra created_at til opprettet_dato for konsistens
-- Dette sikrer at alle tabeller bruker norsk navngiving

-- Sjekk om kolonnen allerede heter opprettet_dato
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'oppgaver' 
        AND column_name = 'created_at'
    ) THEN
        -- Endre kolonnenavn
        ALTER TABLE oppgaver 
        RENAME COLUMN created_at TO opprettet_dato;
        
        RAISE NOTICE 'Kolonne created_at endret til opprettet_dato i oppgaver-tabellen';
    ELSE
        RAISE NOTICE 'Kolonnen heter allerede opprettet_dato eller finnes ikke';
    END IF;
END $$;

-- Verifiser endringen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'oppgaver' 
AND column_name IN ('created_at', 'opprettet_dato');
