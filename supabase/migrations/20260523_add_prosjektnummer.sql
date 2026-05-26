-- Legg til prosjektnummer-kolonne med automatisk generering

-- Legg til kolonnen
ALTER TABLE prosjekter ADD COLUMN IF NOT EXISTS prosjektnummer VARCHAR(20) UNIQUE;

-- Opprett sekvens for prosjektnummer
CREATE SEQUENCE IF NOT EXISTS prosjektnummer_seq START WITH 1001;

-- Funksjon for å generere prosjektnummer
CREATE OR REPLACE FUNCTION generate_prosjektnummer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prosjektnummer IS NULL THEN
    NEW.prosjektnummer := 'P-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('prosjektnummer_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatisk generering ved insert
DROP TRIGGER IF EXISTS set_prosjektnummer ON prosjekter;
CREATE TRIGGER set_prosjektnummer
  BEFORE INSERT ON prosjekter
  FOR EACH ROW
  EXECUTE FUNCTION generate_prosjektnummer();

-- Oppdater eksisterende prosjekter som mangler prosjektnummer
UPDATE prosjekter p
SET prosjektnummer = 'P-' || TO_CHAR(p.created_at, 'YYYY') || '-' || LPAD(nextval('prosjektnummer_seq')::text, 4, '0')
WHERE p.prosjektnummer IS NULL;
