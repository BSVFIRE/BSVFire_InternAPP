-- ============================================================================
-- FIKS: Legg til CASCADE DELETE på alle foreign keys som refererer til anlegg
-- ============================================================================
-- Dette fikser 409-feilen når du prøver å slette et anlegg
-- Problemet er at noen tabeller har foreign keys uten ON DELETE CASCADE
-- ============================================================================

-- 1. Fiks ordre-tabellen (hvis den eksisterer)
DO $$ 
BEGIN
  -- Sjekk om constraint eksisterer
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ordre_anlegg_id_fkey' 
    AND table_name = 'ordre'
  ) THEN
    -- Fjern gammel constraint
    ALTER TABLE ordre DROP CONSTRAINT ordre_anlegg_id_fkey;
    
    -- Legg til ny constraint med CASCADE
    ALTER TABLE ordre 
    ADD CONSTRAINT ordre_anlegg_id_fkey 
    FOREIGN KEY (anlegg_id) REFERENCES anlegg(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'ordre_anlegg_id_fkey oppdatert med CASCADE';
  ELSE
    RAISE NOTICE 'ordre_anlegg_id_fkey finnes ikke';
  END IF;
END $$;

-- 2. Fiks anlegg_kontaktpersoner-tabellen (hvis den eksisterer)
DO $$ 
BEGIN
  -- Sjekk om constraint eksisterer
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'anlegg_kontaktpersoner_anlegg_id_fkey' 
    AND table_name = 'anlegg_kontaktpersoner'
  ) THEN
    -- Fjern gammel constraint
    ALTER TABLE anlegg_kontaktpersoner DROP CONSTRAINT anlegg_kontaktpersoner_anlegg_id_fkey;
    
    -- Legg til ny constraint med CASCADE
    ALTER TABLE anlegg_kontaktpersoner 
    ADD CONSTRAINT anlegg_kontaktpersoner_anlegg_id_fkey 
    FOREIGN KEY (anlegg_id) REFERENCES anlegg(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'anlegg_kontaktpersoner_anlegg_id_fkey oppdatert med CASCADE';
  ELSE
    RAISE NOTICE 'anlegg_kontaktpersoner_anlegg_id_fkey finnes ikke';
  END IF;
END $$;

-- 3. Sjekk og fiks alle andre tabeller som kan ha foreign keys til anlegg
DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Finn alle foreign keys som refererer til anlegg(id) uten ON DELETE CASCADE
  FOR r IN 
    SELECT 
      tc.table_name,
      tc.constraint_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints rc 
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name LIKE '%anlegg_id%'
      AND tc.table_name NOT IN ('ordre', 'anlegg_kontaktpersoner', 'dokumenter', 'nodlys', 'epost_logg', 'servicerapporter', 'evakueringsplan_status', 'anleggsdata_roykluker', 'kontroll_notater')
      -- Ekskluder tabeller vi allerede vet har CASCADE
  LOOP
    -- Sjekk om constraint har CASCADE
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.referential_constraints rc
      WHERE rc.constraint_name = r.constraint_name
        AND rc.delete_rule = 'CASCADE'
    ) THEN
      -- Fjern gammel constraint
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
      
      -- Legg til ny constraint med CASCADE
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES anlegg(id) ON DELETE CASCADE',
        r.table_name,
        r.constraint_name,
        r.column_name
      );
      
      RAISE NOTICE 'Oppdatert % på tabell % med CASCADE', r.constraint_name, r.table_name;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- FERDIG!
-- Nå kan du slette anlegg uten 409-feil
-- ============================================================================
