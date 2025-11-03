-- Fjern gammel trigger og funksjon som refererer til updated_at
DROP TRIGGER IF EXISTS servicerapporter_updated_at ON servicerapporter;
DROP FUNCTION IF EXISTS update_servicerapport_updated_at();

-- Sørg for at riktig trigger og funksjon eksisterer for sist_oppdatert
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

-- Legg til image_urls kolonne hvis den ikke finnes
ALTER TABLE servicerapporter 
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

COMMENT ON COLUMN servicerapporter.image_urls IS 'Array of storage paths for uploaded images';
