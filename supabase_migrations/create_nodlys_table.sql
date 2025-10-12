-- Opprett nødlys-tabell
CREATE TABLE IF NOT EXISTS nodlys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  plassering TEXT NOT NULL,
  type TEXT NOT NULL,
  watt INTEGER,
  status TEXT NOT NULL,
  sist_kontrollert DATE,
  kommentar TEXT,
  opprettet_dato TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT nodlys_status_check CHECK (status IN ('OK', 'Defekt', 'Mangler', 'Utskiftet')),
  CONSTRAINT nodlys_type_check CHECK (type IN ('LED', 'Halogen', 'Fluorescerende', 'Annet'))
);

-- Opprett indekser for bedre ytelse
CREATE INDEX IF NOT EXISTS idx_nodlys_anlegg_id ON nodlys(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_nodlys_status ON nodlys(status);
CREATE INDEX IF NOT EXISTS idx_nodlys_sist_kontrollert ON nodlys(sist_kontrollert);

-- Aktiver Row Level Security
ALTER TABLE nodlys ENABLE ROW LEVEL SECURITY;

-- Opprett policy for autentiserte brukere (alle kan lese og skrive)
CREATE POLICY "Autentiserte brukere kan se nødlys"
  ON nodlys FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autentiserte brukere kan legge til nødlys"
  ON nodlys FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Autentiserte brukere kan oppdatere nødlys"
  ON nodlys FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Autentiserte brukere kan slette nødlys"
  ON nodlys FOR DELETE
  TO authenticated
  USING (true);

-- Kommentar på tabellen
COMMENT ON TABLE nodlys IS 'Registrering av nødlysarmaturer per anlegg';
COMMENT ON COLUMN nodlys.plassering IS 'Plassering av nødlysenheten (f.eks. Gang 1. etasje)';
COMMENT ON COLUMN nodlys.type IS 'Type nødlys (LED, Halogen, Fluorescerende, Annet)';
COMMENT ON COLUMN nodlys.watt IS 'Effekt i watt';
COMMENT ON COLUMN nodlys.status IS 'Status på nødlysenheten (OK, Defekt, Mangler, Utskiftet)';
COMMENT ON COLUMN nodlys.sist_kontrollert IS 'Dato for siste kontroll';
COMMENT ON COLUMN nodlys.kommentar IS 'Eventuelle merknader';
