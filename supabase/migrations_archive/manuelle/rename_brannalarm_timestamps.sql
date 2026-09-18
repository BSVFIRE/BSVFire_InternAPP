-- Endre brannalarm-tabeller fra created_at til opprettet_dato (hvis de finnes)
-- Påvirker: anleggsdata_brannalarm og nettverk_brannalarm

-- Endre anleggsdata_brannalarm
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'anleggsdata_brannalarm' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE anleggsdata_brannalarm 
        RENAME COLUMN created_at TO opprettet_dato;
        
        RAISE NOTICE 'Kolonne created_at endret til opprettet_dato i anleggsdata_brannalarm-tabellen';
    ELSE
        RAISE NOTICE 'Kolonnen finnes ikke eller heter allerede opprettet_dato i anleggsdata_brannalarm';
    END IF;
END $$;

-- Endre nettverk_brannalarm
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'nettverk_brannalarm' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE nettverk_brannalarm 
        RENAME COLUMN created_at TO opprettet_dato;
        
        RAISE NOTICE 'Kolonne created_at endret til opprettet_dato i nettverk_brannalarm-tabellen';
    ELSE
        RAISE NOTICE 'Kolonnen finnes ikke eller heter allerede opprettet_dato i nettverk_brannalarm';
    END IF;
END $$;

-- Verifiser endringene
SELECT 
    table_name,
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('anleggsdata_brannalarm', 'nettverk_brannalarm')
AND column_name IN ('created_at', 'opprettet_dato')
ORDER BY table_name, column_name;
