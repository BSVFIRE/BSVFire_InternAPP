-- Legg til prosjekt_id kolonne i alarmorganisering-tabellen
-- Dette kobler alarmorganisering til prosjekter

ALTER TABLE alarmorganisering 
ADD COLUMN IF NOT EXISTS prosjekt_id UUID REFERENCES prosjekter(id) ON DELETE SET NULL;

-- Opprett indeks for raskere oppslag
CREATE INDEX IF NOT EXISTS idx_alarmorganisering_prosjekt_id ON alarmorganisering(prosjekt_id);
