-- Ukesplaner for kontrollbesøk
-- Brukes for å planlegge og kommunisere kontrollbesøk til rammeavtale-kunder

-- Hovedtabell for ukesplaner
CREATE TABLE IF NOT EXISTS ukesplaner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kunde_id UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  uke_nummer INTEGER NOT NULL CHECK (uke_nummer >= 1 AND uke_nummer <= 53),
  aar INTEGER NOT NULL CHECK (aar >= 2020 AND aar <= 2100),
  status TEXT DEFAULT 'utkast' CHECK (status IN ('utkast', 'sendt', 'fullfort')),
  dropbox_path TEXT,
  notater TEXT,
  opprettet_av UUID REFERENCES auth.users(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  oppdatert_dato TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kunde_id, uke_nummer, aar)
);

-- Dager i ukesplanen med anlegg
CREATE TABLE IF NOT EXISTS ukesplan_dager (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ukesplan_id UUID NOT NULL REFERENCES ukesplaner(id) ON DELETE CASCADE,
  dag INTEGER NOT NULL CHECK (dag >= 1 AND dag <= 7), -- 1=mandag, 7=søndag
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  rekkefolge INTEGER DEFAULT 0,
  estimert_oppstart TIME,
  alarmprove_tid TIME,
  notater TEXT,
  UNIQUE(ukesplan_id, dag, anlegg_id)
);

-- Indekser for raskere oppslag
CREATE INDEX IF NOT EXISTS idx_ukesplaner_kunde ON ukesplaner(kunde_id);
CREATE INDEX IF NOT EXISTS idx_ukesplaner_uke ON ukesplaner(aar, uke_nummer);
CREATE INDEX IF NOT EXISTS idx_ukesplan_dager_plan ON ukesplan_dager(ukesplan_id);
CREATE INDEX IF NOT EXISTS idx_ukesplan_dager_anlegg ON ukesplan_dager(anlegg_id);

-- RLS policies
ALTER TABLE ukesplaner ENABLE ROW LEVEL SECURITY;
ALTER TABLE ukesplan_dager ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle autentiserte brukere kan lese ukesplaner"
  ON ukesplaner FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Alle autentiserte brukere kan opprette ukesplaner"
  ON ukesplaner FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Alle autentiserte brukere kan oppdatere ukesplaner"
  ON ukesplaner FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Alle autentiserte brukere kan slette ukesplaner"
  ON ukesplaner FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Alle autentiserte brukere kan lese ukesplan_dager"
  ON ukesplan_dager FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Alle autentiserte brukere kan opprette ukesplan_dager"
  ON ukesplan_dager FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Alle autentiserte brukere kan oppdatere ukesplan_dager"
  ON ukesplan_dager FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Alle autentiserte brukere kan slette ukesplan_dager"
  ON ukesplan_dager FOR DELETE
  TO authenticated
  USING (true);

-- Trigger for oppdatert_dato
CREATE OR REPLACE FUNCTION update_ukesplan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.oppdatert_dato = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ukesplan_updated
  BEFORE UPDATE ON ukesplaner
  FOR EACH ROW
  EXECUTE FUNCTION update_ukesplan_timestamp();
