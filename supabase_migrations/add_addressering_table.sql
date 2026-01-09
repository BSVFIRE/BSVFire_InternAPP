-- Opprett tabell for addressering (DIP-switch konfigurasjon)
-- Lagrer enheter per anlegg med alle tekstfelter

CREATE TABLE IF NOT EXISTS addressering (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kunde_id UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
    leverandor VARCHAR(50) NOT NULL DEFAULT 'panasonic',
    
    -- Base og enhet info
    base_nr INTEGER NOT NULL,  -- 0-3
    teknisk_adresse INTEGER NOT NULL,
    enhets_adresse INTEGER NOT NULL,  -- 0 for base, 1-16 for enheter
    
    -- DIP-switch verdier (beregnes automatisk, men lagres for referanse)
    switch1 INTEGER NOT NULL DEFAULT 0,
    switch2 INTEGER NOT NULL DEFAULT 0,
    switch3 INTEGER NOT NULL DEFAULT 0,
    switch4 INTEGER NOT NULL DEFAULT 0,
    switch5 INTEGER NOT NULL DEFAULT 0,
    switch6 INTEGER NOT NULL DEFAULT 0,
    switch7 INTEGER NOT NULL DEFAULT 0,
    switch8 INTEGER NOT NULL DEFAULT 0,
    
    -- Bruker-redigerbare felter
    enhet_merket VARCHAR(100),
    type VARCHAR(50),
    plassering VARCHAR(255),
    etasje VARCHAR(50),
    kart VARCHAR(100),
    
    -- Metadata
    opprettet_dato TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    oppdatert_dato TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unik kombinasjon av anlegg + base + teknisk adresse
    UNIQUE(anlegg_id, base_nr, teknisk_adresse)
);

-- Indekser for raskere oppslag
CREATE INDEX IF NOT EXISTS idx_addressering_anlegg ON addressering(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_addressering_kunde ON addressering(kunde_id);
CREATE INDEX IF NOT EXISTS idx_addressering_base ON addressering(anlegg_id, base_nr);

-- Trigger for å oppdatere oppdatert_dato
CREATE OR REPLACE FUNCTION update_addressering_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.oppdatert_dato = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS addressering_updated ON addressering;
CREATE TRIGGER addressering_updated
    BEFORE UPDATE ON addressering
    FOR EACH ROW
    EXECUTE FUNCTION update_addressering_timestamp();

-- RLS policies
ALTER TABLE addressering ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on addressering" ON addressering
    FOR ALL USING (true) WITH CHECK (true);

-- Kommentar på tabellen
COMMENT ON TABLE addressering IS 'Lagrer DIP-switch konfigurasjon for trådløse baser og enheter per anlegg';
COMMENT ON COLUMN addressering.base_nr IS 'Base nummer 0-3 (tilsvarer Channel 0-3)';
COMMENT ON COLUMN addressering.teknisk_adresse IS 'Teknisk adresse (144, 145, etc.)';
COMMENT ON COLUMN addressering.enhets_adresse IS '0 for base, 1-16 for enheter';
COMMENT ON COLUMN addressering.enhet_merket IS 'Bruker-definert merking, f.eks. 001.01';
