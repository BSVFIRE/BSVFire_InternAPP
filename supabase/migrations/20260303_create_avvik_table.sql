-- Opprett avvik-tabell for KS/HMS avvikshåndtering
CREATE TABLE IF NOT EXISTS avvik (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kunde_id UUID REFERENCES customer(id) ON DELETE SET NULL,
  anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL,
  tittel TEXT NOT NULL,
  beskrivelse TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT 'Sikkerhet',
  alvorlighetsgrad TEXT NOT NULL DEFAULT 'Lav',
  status TEXT NOT NULL DEFAULT 'Åpen',
  dato DATE NOT NULL DEFAULT CURRENT_DATE,
  registrert_av UUID REFERENCES ansatte(id) ON DELETE SET NULL,
  oppdaget_av TEXT,
  ansvarlig_for_lukking UUID REFERENCES ansatte(id) ON DELETE SET NULL,
  korrigerende_tiltak TEXT,
  forebyggende_tiltak TEXT,
  lukket_dato DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indekser for raskere søk
CREATE INDEX IF NOT EXISTS idx_avvik_kunde_id ON avvik(kunde_id);
CREATE INDEX IF NOT EXISTS idx_avvik_anlegg_id ON avvik(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_avvik_status ON avvik(status);
CREATE INDEX IF NOT EXISTS idx_avvik_kategori ON avvik(kategori);
CREATE INDEX IF NOT EXISTS idx_avvik_dato ON avvik(dato);

-- RLS policies
ALTER TABLE avvik ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle kan lese avvik" ON avvik
  FOR SELECT USING (true);

CREATE POLICY "Alle kan opprette avvik" ON avvik
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Alle kan oppdatere avvik" ON avvik
  FOR UPDATE USING (true);

CREATE POLICY "Alle kan slette avvik" ON avvik
  FOR DELETE USING (true);
