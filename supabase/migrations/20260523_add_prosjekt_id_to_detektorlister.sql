-- Legg til prosjekt_id kolonne i detektorlister-tabellen
-- Dette kobler detektorlister til prosjekter

ALTER TABLE detektorlister 
ADD COLUMN IF NOT EXISTS prosjekt_id UUID REFERENCES prosjekter(id) ON DELETE SET NULL;

-- Opprett indeks for raskere oppslag
CREATE INDEX IF NOT EXISTS idx_detektorlister_prosjekt_id ON detektorlister(prosjekt_id);
