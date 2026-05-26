-- Prosjekter modul - Database struktur

-- Hovedtabell for prosjekter
CREATE TABLE IF NOT EXISTS prosjekter (
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
  -- Mulige verdier: detektorliste, alarmorganisering, prosjektering, fdv_datablader
  
  -- Datoer
  startdato DATE,
  forventet_sluttdato DATE,
  faktisk_sluttdato DATE,
  
  -- Prioritet
  prioritet VARCHAR(20) DEFAULT 'normal' CHECK (prioritet IN ('lav', 'normal', 'hoy', 'kritisk')),
  
  -- Notater
  notater TEXT,
  
  -- Metadata
  opprettet_av UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prosjektmedlemmer (mange-til-mange mellom prosjekter og ansatte)
CREATE TABLE IF NOT EXISTS prosjekt_medlemmer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjekt_id UUID NOT NULL REFERENCES prosjekter(id) ON DELETE CASCADE,
  ansatt_id UUID NOT NULL REFERENCES ansatte(id) ON DELETE CASCADE,
  rolle VARCHAR(100), -- f.eks. "Montør", "Tekniker", "Prosjektleder"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(prosjekt_id, ansatt_id)
);

-- Prosjektdokumenter (sporing av hvilke dokumenter som er fullført)
CREATE TABLE IF NOT EXISTS prosjekt_dokumenter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjekt_id UUID NOT NULL REFERENCES prosjekter(id) ON DELETE CASCADE,
  
  -- Type dokument
  dokument_type VARCHAR(50) NOT NULL CHECK (dokument_type IN ('detektorliste', 'alarmorganisering', 'prosjektering', 'fdv_datablader')),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'ikke_startet' CHECK (status IN ('ikke_startet', 'under_arbeid', 'fullfort')),
  
  -- Referanse til faktisk dokument (kan være URL eller ID)
  dokument_url TEXT,
  dokument_referanse TEXT,
  
  -- Ansvarlig
  ansvarlig_id UUID REFERENCES ansatte(id) ON DELETE SET NULL,
  
  -- Datoer
  fullfort_dato TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(prosjekt_id, dokument_type)
);

-- Prosjektlogg (aktivitetslogg for prosjektet)
CREATE TABLE IF NOT EXISTS prosjekt_logg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjekt_id UUID NOT NULL REFERENCES prosjekter(id) ON DELETE CASCADE,
  
  -- Hendelse
  hendelse_type VARCHAR(50) NOT NULL, -- opprettet, status_endret, medlem_lagt_til, dokument_fullfort, etc.
  beskrivelse TEXT NOT NULL,
  
  -- Hvem gjorde det
  utfort_av UUID REFERENCES ansatte(id) ON DELETE SET NULL,
  
  -- Metadata (ekstra info som JSON)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legg til manglende kolonner hvis de ikke finnes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prosjekter' AND column_name = 'kunde_id') THEN
    ALTER TABLE prosjekter ADD COLUMN kunde_id UUID REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prosjekter' AND column_name = 'anlegg_id') THEN
    ALTER TABLE prosjekter ADD COLUMN anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prosjekter' AND column_name = 'prosjektleder_id') THEN
    ALTER TABLE prosjekter ADD COLUMN prosjektleder_id UUID REFERENCES ansatte(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prosjekter' AND column_name = 'dokumentasjonskrav') THEN
    ALTER TABLE prosjekter ADD COLUMN dokumentasjonskrav JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prosjekter' AND column_name = 'prioritet') THEN
    ALTER TABLE prosjekter ADD COLUMN prioritet VARCHAR(20) DEFAULT 'normal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prosjekter' AND column_name = 'notater') THEN
    ALTER TABLE prosjekter ADD COLUMN notater TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prosjekter' AND column_name = 'opprettet_av') THEN
    ALTER TABLE prosjekter ADD COLUMN opprettet_av UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Indekser for ytelse (bare hvis kolonnene finnes)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prosjekter' AND column_name = 'kunde_id') THEN
    CREATE INDEX IF NOT EXISTS idx_prosjekter_kunde ON prosjekter(kunde_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prosjekter' AND column_name = 'anlegg_id') THEN
    CREATE INDEX IF NOT EXISTS idx_prosjekter_anlegg ON prosjekter(anlegg_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prosjekter' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_prosjekter_status ON prosjekter(status);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prosjekter' AND column_name = 'prosjektleder_id') THEN
    CREATE INDEX IF NOT EXISTS idx_prosjekter_prosjektleder ON prosjekter(prosjektleder_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prosjekt_medlemmer_prosjekt ON prosjekt_medlemmer(prosjekt_id);
CREATE INDEX IF NOT EXISTS idx_prosjekt_medlemmer_ansatt ON prosjekt_medlemmer(ansatt_id);
CREATE INDEX IF NOT EXISTS idx_prosjekt_dokumenter_prosjekt ON prosjekt_dokumenter(prosjekt_id);
CREATE INDEX IF NOT EXISTS idx_prosjekt_logg_prosjekt ON prosjekt_logg(prosjekt_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_prosjekter_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prosjekter_updated_at ON prosjekter;
CREATE TRIGGER prosjekter_updated_at
  BEFORE UPDATE ON prosjekter
  FOR EACH ROW
  EXECUTE FUNCTION update_prosjekter_updated_at();

DROP TRIGGER IF EXISTS prosjekt_dokumenter_updated_at ON prosjekt_dokumenter;
CREATE TRIGGER prosjekt_dokumenter_updated_at
  BEFORE UPDATE ON prosjekt_dokumenter
  FOR EACH ROW
  EXECUTE FUNCTION update_prosjekter_updated_at();

-- RLS Policies
ALTER TABLE prosjekter ENABLE ROW LEVEL SECURITY;
ALTER TABLE prosjekt_medlemmer ENABLE ROW LEVEL SECURITY;
ALTER TABLE prosjekt_dokumenter ENABLE ROW LEVEL SECURITY;
ALTER TABLE prosjekt_logg ENABLE ROW LEVEL SECURITY;

-- Alle autentiserte brukere kan lese prosjekter
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prosjekter' AND policyname = 'Authenticated users can read prosjekter') THEN
    CREATE POLICY "Authenticated users can read prosjekter" ON prosjekter FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prosjekter' AND policyname = 'Authenticated users can insert prosjekter') THEN
    CREATE POLICY "Authenticated users can insert prosjekter" ON prosjekter FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prosjekter' AND policyname = 'Authenticated users can update prosjekter') THEN
    CREATE POLICY "Authenticated users can update prosjekter" ON prosjekter FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prosjekter' AND policyname = 'Authenticated users can delete prosjekter') THEN
    CREATE POLICY "Authenticated users can delete prosjekter" ON prosjekter FOR DELETE TO authenticated USING (true);
  END IF;
  
  -- Samme for relaterte tabeller
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prosjekt_medlemmer' AND policyname = 'Authenticated users can all on prosjekt_medlemmer') THEN
    CREATE POLICY "Authenticated users can all on prosjekt_medlemmer" ON prosjekt_medlemmer FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prosjekt_dokumenter' AND policyname = 'Authenticated users can all on prosjekt_dokumenter') THEN
    CREATE POLICY "Authenticated users can all on prosjekt_dokumenter" ON prosjekt_dokumenter FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prosjekt_logg' AND policyname = 'Authenticated users can all on prosjekt_logg') THEN
    CREATE POLICY "Authenticated users can all on prosjekt_logg" ON prosjekt_logg FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Kommentar
COMMENT ON TABLE prosjekter IS 'Hovedtabell for prosjektstyring';
COMMENT ON TABLE prosjekt_medlemmer IS 'Kobling mellom prosjekter og ansatte som er med i prosjektet';
COMMENT ON TABLE prosjekt_dokumenter IS 'Sporing av dokumentasjonskrav og status for hvert prosjekt';
COMMENT ON TABLE prosjekt_logg IS 'Aktivitetslogg for prosjekter';
