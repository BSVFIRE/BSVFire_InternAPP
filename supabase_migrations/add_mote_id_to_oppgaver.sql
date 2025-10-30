-- Legg til mote_id kolonne i oppgaver-tabellen for å koble møteoppgaver
ALTER TABLE oppgaver ADD COLUMN IF NOT EXISTS mote_id UUID REFERENCES moter(id) ON DELETE SET NULL;

-- Indeks for bedre ytelse
CREATE INDEX IF NOT EXISTS idx_oppgaver_mote_id ON oppgaver(mote_id);

-- Kommentar for dokumentasjon
COMMENT ON COLUMN oppgaver.mote_id IS 'Kobling til møte hvis oppgaven ble opprettet fra et møte';
