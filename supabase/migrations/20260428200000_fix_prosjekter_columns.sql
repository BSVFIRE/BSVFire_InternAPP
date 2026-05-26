-- Legg til manglende kolonner i prosjekter
ALTER TABLE prosjekter ADD COLUMN IF NOT EXISTS kunde_id UUID REFERENCES customer(id) ON DELETE SET NULL;
ALTER TABLE prosjekter ADD COLUMN IF NOT EXISTS anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL;
ALTER TABLE prosjekter ADD COLUMN IF NOT EXISTS prosjektleder_id UUID REFERENCES ansatte(id) ON DELETE SET NULL;
ALTER TABLE prosjekter ADD COLUMN IF NOT EXISTS dokumentasjonskrav JSONB DEFAULT '[]'::jsonb;
ALTER TABLE prosjekter ADD COLUMN IF NOT EXISTS prioritet VARCHAR(20) DEFAULT 'normal';
ALTER TABLE prosjekter ADD COLUMN IF NOT EXISTS notater TEXT;
ALTER TABLE prosjekter ADD COLUMN IF NOT EXISTS opprettet_av UUID;
ALTER TABLE prosjekter ADD COLUMN IF NOT EXISTS startdato DATE;
ALTER TABLE prosjekter ADD COLUMN IF NOT EXISTS forventet_sluttdato DATE;
ALTER TABLE prosjekter ADD COLUMN IF NOT EXISTS faktisk_sluttdato DATE;
ALTER TABLE prosjekter ADD COLUMN IF NOT EXISTS prosjekt_type VARCHAR(50);
ALTER TABLE prosjekter ADD COLUMN IF NOT EXISTS tjeneste VARCHAR(50);

-- Opprett prosjekt_medlemmer hvis den ikke finnes
CREATE TABLE IF NOT EXISTS prosjekt_medlemmer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjekt_id UUID NOT NULL REFERENCES prosjekter(id) ON DELETE CASCADE,
  ansatt_id UUID NOT NULL REFERENCES ansatte(id) ON DELETE CASCADE,
  rolle VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prosjekt_id, ansatt_id)
);

-- RLS for prosjekt_medlemmer
ALTER TABLE prosjekt_medlemmer ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prosjekt_medlemmer' AND policyname = 'Authenticated users can all on prosjekt_medlemmer') THEN
    CREATE POLICY "Authenticated users can all on prosjekt_medlemmer" ON prosjekt_medlemmer FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
