-- Legg til sist_oppdatert kolonne i ordre tabellen

ALTER TABLE ordre 
ADD COLUMN IF NOT EXISTS sist_oppdatert TIMESTAMPTZ;

-- Oppdater eksisterende rader til å ha current timestamp som sist_oppdatert hvis den ikke er satt
UPDATE ordre 
SET sist_oppdatert = NOW() 
WHERE sist_oppdatert IS NULL;

-- Opprett en trigger for å automatisk oppdatere sist_oppdatert
CREATE OR REPLACE FUNCTION update_ordre_sist_oppdatert_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sist_oppdatert = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fjern eksisterende trigger hvis den finnes
DROP TRIGGER IF EXISTS update_ordre_sist_oppdatert ON ordre;

-- Opprett trigger som kjører før UPDATE
CREATE TRIGGER update_ordre_sist_oppdatert
    BEFORE UPDATE ON ordre
    FOR EACH ROW
    EXECUTE FUNCTION update_ordre_sist_oppdatert_column();
