-- Tabell for prosjekt-milepæler/framdriftsplan
CREATE TABLE IF NOT EXISTS prosjekt_milepeler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjekt_id UUID NOT NULL REFERENCES prosjekter(id) ON DELETE CASCADE,
  tittel VARCHAR(255) NOT NULL,
  beskrivelse TEXT,
  ansvarlig_id UUID REFERENCES ansatte(id),
  -- Ekstern leverandør
  er_ekstern BOOLEAN DEFAULT FALSE,
  ekstern_firma VARCHAR(255),
  ekstern_kontakt VARCHAR(255),
  ekstern_telefon VARCHAR(50),
  ekstern_epost VARCHAR(255),
  -- Datoer og status
  planlagt_dato DATE,
  estimert_ferdig DATE,
  utfort_dato DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'planlagt' CHECK (status IN ('planlagt', 'pagaende', 'utfort', 'utsatt')),
  rekkefølge INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabell for dokumenter knyttet til milepæler
CREATE TABLE IF NOT EXISTS prosjekt_milepel_dokumenter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milepel_id UUID NOT NULL REFERENCES prosjekt_milepeler(id) ON DELETE CASCADE,
  filnavn VARCHAR(255) NOT NULL,
  fil_url TEXT NOT NULL,
  fil_type VARCHAR(100),
  fil_storrelse INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milepel_dokumenter_milepel_id ON prosjekt_milepel_dokumenter(milepel_id);

-- Tabell for sjekkliste-oppgaver på milepæler
CREATE TABLE IF NOT EXISTS prosjekt_milepel_oppgaver (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milepel_id UUID NOT NULL REFERENCES prosjekt_milepeler(id) ON DELETE CASCADE,
  tittel VARCHAR(255) NOT NULL,
  fullfort BOOLEAN DEFAULT FALSE,
  fullfort_av UUID REFERENCES ansatte(id),
  fullfort_dato TIMESTAMPTZ,
  rekkefølge INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milepel_oppgaver_milepel_id ON prosjekt_milepel_oppgaver(milepel_id);

ALTER TABLE prosjekt_milepel_oppgaver ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON prosjekt_milepel_oppgaver
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indekser
CREATE INDEX IF NOT EXISTS idx_prosjekt_milepeler_prosjekt_id ON prosjekt_milepeler(prosjekt_id);
CREATE INDEX IF NOT EXISTS idx_prosjekt_milepeler_status ON prosjekt_milepeler(status);
CREATE INDEX IF NOT EXISTS idx_prosjekt_milepeler_ansvarlig ON prosjekt_milepeler(ansvarlig_id);

-- RLS
ALTER TABLE prosjekt_milepeler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON prosjekt_milepeler
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE prosjekt_milepel_dokumenter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON prosjekt_milepel_dokumenter
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_prosjekt_milepeler_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prosjekt_milepeler_updated_at
  BEFORE UPDATE ON prosjekt_milepeler
  FOR EACH ROW
  EXECUTE FUNCTION update_prosjekt_milepeler_updated_at();
