-- Legg til ansvarlig_tekniker_id kolonne i anlegg-tabellen
-- Brukes for å tildele en tekniker til et anlegg i kontrollplanen

ALTER TABLE anlegg 
ADD COLUMN IF NOT EXISTS ansvarlig_tekniker_id UUID REFERENCES ansatte(id) ON DELETE SET NULL;

-- Opprett indeks for raskere oppslag
CREATE INDEX IF NOT EXISTS idx_anlegg_ansvarlig_tekniker ON anlegg(ansvarlig_tekniker_id);
