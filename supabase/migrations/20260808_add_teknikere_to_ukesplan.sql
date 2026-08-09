-- Legg til teknikere for ukesplaner
-- Teknikere tildeles for hele uken, ikke per bygg

-- Koblingstabell mellom ukesplaner og ansatte (teknikere)
CREATE TABLE IF NOT EXISTS ukesplan_teknikere (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ukesplan_id UUID NOT NULL REFERENCES ukesplaner(id) ON DELETE CASCADE,
  ansatt_id UUID NOT NULL REFERENCES ansatte(id) ON DELETE CASCADE,
  UNIQUE(ukesplan_id, ansatt_id)
);

-- Indekser
CREATE INDEX IF NOT EXISTS idx_ukesplan_teknikere_plan ON ukesplan_teknikere(ukesplan_id);
CREATE INDEX IF NOT EXISTS idx_ukesplan_teknikere_ansatt ON ukesplan_teknikere(ansatt_id);

-- RLS policies
ALTER TABLE ukesplan_teknikere ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle autentiserte brukere kan lese ukesplan_teknikere"
  ON ukesplan_teknikere FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Alle autentiserte brukere kan opprette ukesplan_teknikere"
  ON ukesplan_teknikere FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Alle autentiserte brukere kan oppdatere ukesplan_teknikere"
  ON ukesplan_teknikere FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Alle autentiserte brukere kan slette ukesplan_teknikere"
  ON ukesplan_teknikere FOR DELETE
  TO authenticated
  USING (true);
