-- Endre servicerapporter fra created_at/updated_at til opprettet_dato/sist_oppdatert
-- Dette sikrer konsistens med resten av databasen

-- Endre created_at til opprettet_dato
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'servicerapporter' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE servicerapporter 
        RENAME COLUMN created_at TO opprettet_dato;
        
        RAISE NOTICE 'Kolonne created_at endret til opprettet_dato i servicerapporter-tabellen';
    ELSE
        RAISE NOTICE 'Kolonnen created_at finnes ikke eller heter allerede opprettet_dato';
    END IF;
END $$;

-- Endre updated_at til sist_oppdatert
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'servicerapporter' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE servicerapporter 
        RENAME COLUMN updated_at TO sist_oppdatert;
        
        RAISE NOTICE 'Kolonne updated_at endret til sist_oppdatert i servicerapporter-tabellen';
    ELSE
        RAISE NOTICE 'Kolonnen updated_at finnes ikke eller heter allerede sist_oppdatert';
    END IF;
END $$;

-- Opprett trigger for automatisk oppdatering av sist_oppdatert
CREATE OR REPLACE FUNCTION update_servicerapporter_sist_oppdatert_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sist_oppdatert = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_servicerapporter_sist_oppdatert ON servicerapporter;

CREATE TRIGGER update_servicerapporter_sist_oppdatert
    BEFORE UPDATE ON servicerapporter
    FOR EACH ROW
    EXECUTE FUNCTION update_servicerapporter_sist_oppdatert_column();

-- Verifiser endringene
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'servicerapporter' 
AND column_name IN ('created_at', 'updated_at', 'opprettet_dato', 'sist_oppdatert')
ORDER BY column_name;
