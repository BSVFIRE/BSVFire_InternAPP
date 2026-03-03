-- Legg til manglende kolonner i avvik-tabellen
ALTER TABLE avvik ADD COLUMN IF NOT EXISTS lukket_dato DATE;
ALTER TABLE avvik ADD COLUMN IF NOT EXISTS korrigerende_tiltak TEXT;
ALTER TABLE avvik ADD COLUMN IF NOT EXISTS forebyggende_tiltak TEXT;
ALTER TABLE avvik ADD COLUMN IF NOT EXISTS oppdaget_av TEXT;
ALTER TABLE avvik ADD COLUMN IF NOT EXISTS ansvarlig_for_lukking UUID REFERENCES ansatte(id) ON DELETE SET NULL;

-- Opprett opplaering-tabell for KS/HMS opplæringshåndtering
CREATE TABLE IF NOT EXISTS opplaering (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tittel TEXT NOT NULL,
  beskrivelse TEXT,
  type TEXT NOT NULL DEFAULT 'Kurs',
  varighet TEXT,
  status TEXT NOT NULL DEFAULT 'Planlagt',
  dato DATE NOT NULL DEFAULT CURRENT_DATE,
  sluttdato DATE,
  registrert_av UUID REFERENCES ansatte(id) ON DELETE SET NULL,
  instruktor TEXT,
  deltakere JSONB,
  sertifikat_utloper DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indekser for opplaering
CREATE INDEX IF NOT EXISTS idx_opplaering_status ON opplaering(status);
CREATE INDEX IF NOT EXISTS idx_opplaering_type ON opplaering(type);
CREATE INDEX IF NOT EXISTS idx_opplaering_dato ON opplaering(dato);

-- RLS policies for opplaering
ALTER TABLE opplaering ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle kan lese opplaering" ON opplaering
  FOR SELECT USING (true);

CREATE POLICY "Alle kan opprette opplaering" ON opplaering
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Alle kan oppdatere opplaering" ON opplaering
  FOR UPDATE USING (true);

CREATE POLICY "Alle kan slette opplaering" ON opplaering
  FOR DELETE USING (true);
