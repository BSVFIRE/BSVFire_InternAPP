-- Tabell for å logge e-postutsendelser
CREATE TABLE IF NOT EXISTS epost_logg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID REFERENCES anlegg(id) ON DELETE CASCADE,
  dokument_navn TEXT NOT NULL,
  dokument_storage_path TEXT NOT NULL,
  mottaker_epost TEXT NOT NULL,
  mottaker_navn TEXT,
  mottaker_type TEXT CHECK (mottaker_type IN ('kunde', 'tekniker', 'ekstra')),
  sendt_av_ansatt_id UUID REFERENCES ansatte(id),
  sendt_dato TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  emne TEXT,
  status TEXT DEFAULT 'sendt' CHECK (status IN ('sendt', 'feilet')),
  feilmelding TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indekser for rask søking
CREATE INDEX IF NOT EXISTS idx_epost_logg_anlegg_id ON epost_logg(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_epost_logg_sendt_dato ON epost_logg(sendt_dato DESC);
CREATE INDEX IF NOT EXISTS idx_epost_logg_mottaker_epost ON epost_logg(mottaker_epost);
CREATE INDEX IF NOT EXISTS idx_epost_logg_sendt_av ON epost_logg(sendt_av_ansatt_id);

-- RLS policies
ALTER TABLE epost_logg ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ansatte kan se all e-postlogg"
  ON epost_logg FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Ansatte kan opprette e-postlogg"
  ON epost_logg FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Kommentar
COMMENT ON TABLE epost_logg IS 'Logger alle e-postutsendelser av dokumenter med mottakerinformasjon og dato';
