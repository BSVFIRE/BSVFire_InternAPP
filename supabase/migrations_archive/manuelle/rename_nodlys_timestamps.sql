-- Endre nødlys-tabeller fra created_at til opprettet_dato
-- Påvirker: anleggsdata_nodlys og nettverk_nodlys

-- Endre anleggsdata_nodlys
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'anleggsdata_nodlys' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE anleggsdata_nodlys 
        RENAME COLUMN created_at TO opprettet_dato;
        
        RAISE NOTICE 'Kolonne created_at endret til opprettet_dato i anleggsdata_nodlys-tabellen';
    ELSE
        RAISE NOTICE 'Kolonnen finnes ikke eller heter allerede opprettet_dato i anleggsdata_nodlys';
    END IF;
END $$;

-- Endre nettverk_nodlys
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'nettverk_nodlys' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE nettverk_nodlys 
        RENAME COLUMN created_at TO opprettet_dato;
        
        RAISE NOTICE 'Kolonne created_at endret til opprettet_dato i nettverk_nodlys-tabellen';
    ELSE
        RAISE NOTICE 'Kolonnen finnes ikke eller heter allerede opprettet_dato i nettverk_nodlys';
    END IF;
END $$;

-- Verifiser endringene
SELECT 
    table_name,
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('anleggsdata_nodlys', 'nettverk_nodlys')
AND column_name IN ('created_at', 'opprettet_dato')
ORDER BY table_name, column_name;
