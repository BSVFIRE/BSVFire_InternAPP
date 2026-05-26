-- Dropp og gjenskape prosjekter-tabellen med riktig struktur

-- Dropp eksisterende tabeller (i riktig rekkefølge pga foreign keys)
DROP TABLE IF EXISTS prosjekt_logg CASCADE;
DROP TABLE IF EXISTS prosjekt_dokumenter CASCADE;
DROP TABLE IF EXISTS prosjekt_medlemmer CASCADE;
DROP TABLE IF EXISTS prosjekter CASCADE;

-- Hovedtabell for prosjekter
CREATE TABLE prosjekter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Kobling til kunde/anlegg
  kunde_id UUID REFERENCES customer(id) ON DELETE SET NULL,
  anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL,
  
  -- Prosjektinfo
  navn VARCHAR(255) NOT NULL,
  beskrivelse TEXT,
  
  -- Prosjekttype: utbedring, oppgradering, ny_installasjon
  prosjekt_type VARCHAR(50) NOT NULL CHECK (prosjekt_type IN ('utbedring', 'oppgradering', 'ny_installasjon')),
  
  -- Tjeneste: brannalarm, nodlys, slukkeutstyr, roykluker, dokumentasjon
  tjeneste VARCHAR(50) NOT NULL CHECK (tjeneste IN ('brannalarm', 'nodlys', 'slukkeutstyr', 'roykluker', 'dokumentasjon')),
  
  -- Status: ventende, pagaende, fullfort, kansellert
  status VARCHAR(50) NOT NULL DEFAULT 'ventende' CHECK (status IN ('ventende', 'pagaende', 'fullfort', 'kansellert')),
  
  -- Prosjektleder (ansatt)
  prosjektleder_id UUID REFERENCES ansatte(id) ON DELETE SET NULL,
  
  -- Dokumentasjonskrav (JSON array med valgte krav)
  dokumentasjonskrav JSONB DEFAULT '[]'::jsonb,
  
  -- Datoer
  startdato DATE,
  forventet_sluttdato DATE,
  faktisk_sluttdato DATE,
  
  -- Prioritet
  prioritet VARCHAR(20) DEFAULT 'normal' CHECK (prioritet IN ('lav', 'normal', 'hoy', 'kritisk')),
  
  -- Notater
  notater TEXT,
  
  -- Metadata
  opprettet_av UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prosjektmedlemmer
CREATE TABLE prosjekt_medlemmer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjekt_id UUID NOT NULL REFERENCES prosjekter(id) ON DELETE CASCADE,
  ansatt_id UUID NOT NULL REFERENCES ansatte(id) ON DELETE CASCADE,
  rolle VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prosjekt_id, ansatt_id)
);

-- Prosjektdokumenter
CREATE TABLE prosjekt_dokumenter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjekt_id UUID NOT NULL REFERENCES prosjekter(id) ON DELETE CASCADE,
  dokument_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'ikke_startet',
  fil_url TEXT,
  notater TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prosjektlogg
CREATE TABLE prosjekt_logg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjekt_id UUID NOT NULL REFERENCES prosjekter(id) ON DELETE CASCADE,
  bruker_id UUID,
  handling VARCHAR(100) NOT NULL,
  beskrivelse TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indekser
CREATE INDEX idx_prosjekter_kunde ON prosjekter(kunde_id);
CREATE INDEX idx_prosjekter_anlegg ON prosjekter(anlegg_id);
CREATE INDEX idx_prosjekter_status ON prosjekter(status);
CREATE INDEX idx_prosjekter_prosjektleder ON prosjekter(prosjektleder_id);
CREATE INDEX idx_prosjekt_medlemmer_prosjekt ON prosjekt_medlemmer(prosjekt_id);
CREATE INDEX idx_prosjekt_medlemmer_ansatt ON prosjekt_medlemmer(ansatt_id);
CREATE INDEX idx_prosjekt_dokumenter_prosjekt ON prosjekt_dokumenter(prosjekt_id);
CREATE INDEX idx_prosjekt_logg_prosjekt ON prosjekt_logg(prosjekt_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_prosjekter_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prosjekter_updated_at
  BEFORE UPDATE ON prosjekter
  FOR EACH ROW
  EXECUTE FUNCTION update_prosjekter_updated_at();

CREATE TRIGGER prosjekt_dokumenter_updated_at
  BEFORE UPDATE ON prosjekt_dokumenter
  FOR EACH ROW
  EXECUTE FUNCTION update_prosjekter_updated_at();

-- RLS Policies
ALTER TABLE prosjekter ENABLE ROW LEVEL SECURITY;
ALTER TABLE prosjekt_medlemmer ENABLE ROW LEVEL SECURITY;
ALTER TABLE prosjekt_dokumenter ENABLE ROW LEVEL SECURITY;
ALTER TABLE prosjekt_logg ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read prosjekter" ON prosjekter
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert prosjekter" ON prosjekter
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update prosjekter" ON prosjekter
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete prosjekter" ON prosjekter
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can all on prosjekt_medlemmer" ON prosjekt_medlemmer
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can all on prosjekt_dokumenter" ON prosjekt_dokumenter
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can all on prosjekt_logg" ON prosjekt_logg
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
