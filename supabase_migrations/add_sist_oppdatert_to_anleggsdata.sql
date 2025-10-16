-- Legg til sist_oppdatert kolonne i alle anleggsdata-tabeller
-- Dette gjelder: anleggsdata_brannalarm, anleggsdata_nodlys, anleggsdata_brannslukkere, anleggsdata_brannslanger

-- anleggsdata_brannalarm
ALTER TABLE anleggsdata_brannalarm 
ADD COLUMN IF NOT EXISTS sist_oppdatert TIMESTAMPTZ;

UPDATE anleggsdata_brannalarm 
SET sist_oppdatert = NOW() 
WHERE sist_oppdatert IS NULL;

CREATE OR REPLACE FUNCTION update_anleggsdata_brannalarm_sist_oppdatert_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sist_oppdatert = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_anleggsdata_brannalarm_sist_oppdatert ON anleggsdata_brannalarm;

CREATE TRIGGER update_anleggsdata_brannalarm_sist_oppdatert
    BEFORE UPDATE ON anleggsdata_brannalarm
    FOR EACH ROW
    EXECUTE FUNCTION update_anleggsdata_brannalarm_sist_oppdatert_column();

-- anleggsdata_nodlys
ALTER TABLE anleggsdata_nodlys 
ADD COLUMN IF NOT EXISTS sist_oppdatert TIMESTAMPTZ;

UPDATE anleggsdata_nodlys 
SET sist_oppdatert = NOW() 
WHERE sist_oppdatert IS NULL;

CREATE OR REPLACE FUNCTION update_anleggsdata_nodlys_sist_oppdatert_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sist_oppdatert = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_anleggsdata_nodlys_sist_oppdatert ON anleggsdata_nodlys;

CREATE TRIGGER update_anleggsdata_nodlys_sist_oppdatert
    BEFORE UPDATE ON anleggsdata_nodlys
    FOR EACH ROW
    EXECUTE FUNCTION update_anleggsdata_nodlys_sist_oppdatert_column();

-- anleggsdata_brannslukkere
ALTER TABLE anleggsdata_brannslukkere 
ADD COLUMN IF NOT EXISTS sist_oppdatert TIMESTAMPTZ;

UPDATE anleggsdata_brannslukkere 
SET sist_oppdatert = NOW() 
WHERE sist_oppdatert IS NULL;

CREATE OR REPLACE FUNCTION update_anleggsdata_brannslukkere_sist_oppdatert_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sist_oppdatert = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_anleggsdata_brannslukkere_sist_oppdatert ON anleggsdata_brannslukkere;

CREATE TRIGGER update_anleggsdata_brannslukkere_sist_oppdatert
    BEFORE UPDATE ON anleggsdata_brannslukkere
    FOR EACH ROW
    EXECUTE FUNCTION update_anleggsdata_brannslukkere_sist_oppdatert_column();

-- anleggsdata_brannslanger
ALTER TABLE anleggsdata_brannslanger 
ADD COLUMN IF NOT EXISTS sist_oppdatert TIMESTAMPTZ;

UPDATE anleggsdata_brannslanger 
SET sist_oppdatert = NOW() 
WHERE sist_oppdatert IS NULL;

CREATE OR REPLACE FUNCTION update_anleggsdata_brannslanger_sist_oppdatert_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sist_oppdatert = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_anleggsdata_brannslanger_sist_oppdatert ON anleggsdata_brannslanger;

CREATE TRIGGER update_anleggsdata_brannslanger_sist_oppdatert
    BEFORE UPDATE ON anleggsdata_brannslanger
    FOR EACH ROW
    EXECUTE FUNCTION update_anleggsdata_brannslanger_sist_oppdatert_column();

-- Verifiser at alle kolonner er opprettet
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name = 'sist_oppdatert'
  AND table_name LIKE 'anleggsdata_%'
ORDER BY table_name;
