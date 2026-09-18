-- Legg til sist_oppdatert kolonne i nettverk-tabeller
-- Dette gjelder: nettverk_brannalarm og nettverk_nodlys

-- nettverk_brannalarm
ALTER TABLE nettverk_brannalarm 
ADD COLUMN IF NOT EXISTS sist_oppdatert TIMESTAMPTZ;

UPDATE nettverk_brannalarm 
SET sist_oppdatert = NOW() 
WHERE sist_oppdatert IS NULL;

CREATE OR REPLACE FUNCTION update_nettverk_brannalarm_sist_oppdatert_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sist_oppdatert = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_nettverk_brannalarm_sist_oppdatert ON nettverk_brannalarm;

CREATE TRIGGER update_nettverk_brannalarm_sist_oppdatert
    BEFORE UPDATE ON nettverk_brannalarm
    FOR EACH ROW
    EXECUTE FUNCTION update_nettverk_brannalarm_sist_oppdatert_column();

-- nettverk_nodlys
ALTER TABLE nettverk_nodlys 
ADD COLUMN IF NOT EXISTS sist_oppdatert TIMESTAMPTZ;

UPDATE nettverk_nodlys 
SET sist_oppdatert = NOW() 
WHERE sist_oppdatert IS NULL;

CREATE OR REPLACE FUNCTION update_nettverk_nodlys_sist_oppdatert_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sist_oppdatert = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_nettverk_nodlys_sist_oppdatert ON nettverk_nodlys;

CREATE TRIGGER update_nettverk_nodlys_sist_oppdatert
    BEFORE UPDATE ON nettverk_nodlys
    FOR EACH ROW
    EXECUTE FUNCTION update_nettverk_nodlys_sist_oppdatert_column();

-- Verifiser at alle kolonner er opprettet
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name = 'sist_oppdatert'
  AND table_name LIKE 'nettverk_%'
ORDER BY table_name;
