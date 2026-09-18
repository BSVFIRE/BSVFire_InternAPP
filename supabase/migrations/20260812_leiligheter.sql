-- Legg til felt for å markere anlegg som leilighetsbygg
ALTER TABLE anlegg ADD COLUMN IF NOT EXISTS er_leilighetsbygg BOOLEAN DEFAULT FALSE;
ALTER TABLE anlegg ADD COLUMN IF NOT EXISTS antall_etasjer INTEGER;

-- Tabell for leiligheter i et anlegg
CREATE TABLE IF NOT EXISTS anlegg_leiligheter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  leilighet_nummer VARCHAR(20) NOT NULL, -- F.eks. H0101, H0201
  etasje INTEGER NOT NULL,
  beskrivelse TEXT, -- Valgfri beskrivelse
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(anlegg_id, leilighet_nummer)
);

-- Tabell for kontroller av leiligheter
CREATE TABLE IF NOT EXISTS leilighet_kontroller (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leilighet_id UUID NOT NULL REFERENCES anlegg_leiligheter(id) ON DELETE CASCADE,
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  kontroll_dato DATE NOT NULL,
  kontroll_aar INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('ok', 'avvik', 'ikke_hjemme')),
  avvik_beskrivelse TEXT, -- Beskrivelse hvis avvik
  utfort_av UUID REFERENCES ansatte(id),
  kommentar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- En leilighet kan bare ha én kontroll per år
  UNIQUE(leilighet_id, kontroll_aar)
);

-- Indekser for raskere oppslag
CREATE INDEX IF NOT EXISTS idx_anlegg_leiligheter_anlegg_id ON anlegg_leiligheter(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_anlegg_leiligheter_etasje ON anlegg_leiligheter(etasje);
CREATE INDEX IF NOT EXISTS idx_leilighet_kontroller_leilighet_id ON leilighet_kontroller(leilighet_id);
CREATE INDEX IF NOT EXISTS idx_leilighet_kontroller_anlegg_id ON leilighet_kontroller(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_leilighet_kontroller_aar ON leilighet_kontroller(kontroll_aar);

-- RLS policies
ALTER TABLE anlegg_leiligheter ENABLE ROW LEVEL SECURITY;
ALTER TABLE leilighet_kontroller ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON anlegg_leiligheter
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON leilighet_kontroller
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
