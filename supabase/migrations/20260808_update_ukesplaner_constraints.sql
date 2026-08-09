-- Tillat flere ukesplaner per kunde per uke (f.eks. for ulike teknikere)
-- Fjerner UNIQUE constraint og legger til et navn/beskrivelse-felt

-- Fjern eksisterende UNIQUE constraint
ALTER TABLE ukesplaner DROP CONSTRAINT IF EXISTS ukesplaner_kunde_id_uke_nummer_aar_key;

-- Legg til navn-felt for å skille mellom planer
ALTER TABLE ukesplaner ADD COLUMN IF NOT EXISTS navn TEXT;

-- Legg til indeks for raskere oppslag (ikke unique)
CREATE INDEX IF NOT EXISTS idx_ukesplaner_kunde_uke ON ukesplaner(kunde_id, aar, uke_nummer);
