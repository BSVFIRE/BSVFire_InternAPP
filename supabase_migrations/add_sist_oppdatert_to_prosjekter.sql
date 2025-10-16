-- Legg til sist_oppdatert kolonne i prosjekter tabellen

ALTER TABLE prosjekter 
ADD COLUMN IF NOT EXISTS sist_oppdatert TIMESTAMPTZ;

-- Oppdater eksisterende rader til å ha current timestamp som sist_oppdatert hvis den ikke er satt
UPDATE prosjekter 
SET sist_oppdatert = NOW() 
WHERE sist_oppdatert IS NULL;

-- Opprett en trigger for å automatisk oppdatere sist_oppdatert
CREATE OR REPLACE FUNCTION update_prosjekter_sist_oppdatert_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sist_oppdatert = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fjern eksisterende trigger hvis den finnes
DROP TRIGGER IF EXISTS update_prosjekter_sist_oppdatert ON prosjekter;

-- Opprett trigger som kjører før UPDATE
CREATE TRIGGER update_prosjekter_sist_oppdatert
    BEFORE UPDATE ON prosjekter
    FOR EACH ROW
    EXECUTE FUNCTION update_prosjekter_sist_oppdatert_column();
