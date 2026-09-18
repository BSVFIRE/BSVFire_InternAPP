-- Opprett førstehjelp-tabell
CREATE TABLE IF NOT EXISTS anleggsdata_forstehjelp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  internnummer TEXT,
  type TEXT,
  plassering TEXT,
  etasje TEXT,
  produsent TEXT,
  utlopsdato DATE,
  status TEXT,
  kontrollert BOOLEAN DEFAULT FALSE,
  kommentar TEXT,
  kundenavn TEXT,
  sjekkpunkter JSONB DEFAULT '{}',
  tillegg TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT forstehjelp_status_check CHECK (status IN ('OK', 'Defekt', 'Mangler', 'Utskiftet', 'Utgått'))
);

-- Opprett indekser for bedre ytelse
CREATE INDEX IF NOT EXISTS idx_forstehjelp_anlegg_id ON anleggsdata_forstehjelp(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_forstehjelp_status ON anleggsdata_forstehjelp(status);

-- Aktiver Row Level Security
ALTER TABLE anleggsdata_forstehjelp ENABLE ROW LEVEL SECURITY;

-- Opprett policy for autentiserte brukere (alle kan lese og skrive)
CREATE POLICY "Autentiserte brukere kan se førstehjelp"
  ON anleggsdata_forstehjelp FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autentiserte brukere kan legge til førstehjelp"
  ON anleggsdata_forstehjelp FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Autentiserte brukere kan oppdatere førstehjelp"
  ON anleggsdata_forstehjelp FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Autentiserte brukere kan slette førstehjelp"
  ON anleggsdata_forstehjelp FOR DELETE
  TO authenticated
  USING (true);

-- Kommentar på tabellen
COMMENT ON TABLE anleggsdata_forstehjelp IS 'Registrering av førstehjelpstasjoner per anlegg';
COMMENT ON COLUMN anleggsdata_forstehjelp.internnummer IS 'Internt nummer for førstehjelpstasjonen';
COMMENT ON COLUMN anleggsdata_forstehjelp.type IS 'Type førstehjelp (f.eks. Førstehjelpskoffert, Øyeskylling, Hjertestarter)';
COMMENT ON COLUMN anleggsdata_forstehjelp.plassering IS 'Plassering av førstehjelpstasjonen';
COMMENT ON COLUMN anleggsdata_forstehjelp.etasje IS 'Etasje der førstehjelpstasjonen befinner seg';
COMMENT ON COLUMN anleggsdata_forstehjelp.produsent IS 'Produsent av utstyret';
COMMENT ON COLUMN anleggsdata_forstehjelp.utlopsdato IS 'Utløpsdato for utstyret';
COMMENT ON COLUMN anleggsdata_forstehjelp.status IS 'Status på førstehjelpstasjonen (OK, Defekt, Mangler, Utskiftet, Utgått)';
COMMENT ON COLUMN anleggsdata_forstehjelp.kontrollert IS 'Om stasjonen er kontrollert';
COMMENT ON COLUMN anleggsdata_forstehjelp.kommentar IS 'Eventuelle merknader';

-- Legg til førstehjelp_fullfort kolonne i anlegg-tabellen
ALTER TABLE anlegg ADD COLUMN IF NOT EXISTS forstehjelp_fullfort BOOLEAN DEFAULT FALSE;
