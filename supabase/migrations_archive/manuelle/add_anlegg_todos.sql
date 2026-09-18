-- Opprett tabell for anlegg todos
CREATE TABLE IF NOT EXISTS anlegg_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  tittel TEXT NOT NULL,
  beskrivelse TEXT,
  fullfort BOOLEAN DEFAULT FALSE,
  prioritet TEXT CHECK (prioritet IN ('Lav', 'Medium', 'Høy')) DEFAULT 'Medium',
  forfallsdato DATE,
  opprettet_av UUID REFERENCES auth.users(id),
  tildelt_til UUID REFERENCES ansatte(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks for raskere søk
CREATE INDEX IF NOT EXISTS idx_anlegg_todos_anlegg_id ON anlegg_todos(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_anlegg_todos_fullfort ON anlegg_todos(fullfort);
CREATE INDEX IF NOT EXISTS idx_anlegg_todos_tildelt_til ON anlegg_todos(tildelt_til);

-- Trigger for å oppdatere updated_at
CREATE OR REPLACE FUNCTION update_anlegg_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_anlegg_todos_updated_at
  BEFORE UPDATE ON anlegg_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_anlegg_todos_updated_at();

-- RLS policies
ALTER TABLE anlegg_todos ENABLE ROW LEVEL SECURITY;

-- Policy: Alle autentiserte brukere kan lese todos
CREATE POLICY "Alle kan lese anlegg todos"
  ON anlegg_todos
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Alle autentiserte brukere kan opprette todos
CREATE POLICY "Alle kan opprette anlegg todos"
  ON anlegg_todos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Alle autentiserte brukere kan oppdatere todos
CREATE POLICY "Alle kan oppdatere anlegg todos"
  ON anlegg_todos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Alle autentiserte brukere kan slette todos
CREATE POLICY "Alle kan slette anlegg todos"
  ON anlegg_todos
  FOR DELETE
  TO authenticated
  USING (true);

-- Kommentar
COMMENT ON TABLE anlegg_todos IS 'ToDo-liste for anlegg';
