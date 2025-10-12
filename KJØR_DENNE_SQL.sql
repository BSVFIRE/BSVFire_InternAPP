-- ⚠️ VIKTIG: Kjør denne SQL-en i Supabase SQL Editor FØRST! ⚠️
-- Gå til: Supabase Dashboard → SQL Editor → New Query
-- Kopier og lim inn denne SQL-en, og trykk "Run"

-- Legg til kontroll_id kolonne i ns3960_kontrollpunkter
ALTER TABLE ns3960_kontrollpunkter 
ADD COLUMN IF NOT EXISTS kontroll_id UUID REFERENCES anleggsdata_kontroll(id) ON DELETE CASCADE;

-- Opprett indeks for raskere søk
CREATE INDEX IF NOT EXISTS idx_ns3960_kontrollpunkter_kontroll_id 
ON ns3960_kontrollpunkter(kontroll_id);

-- Legg til kommentar
COMMENT ON COLUMN ns3960_kontrollpunkter.kontroll_id 
IS 'Referanse til spesifikk kontroll i anleggsdata_kontroll';

-- Ferdig! Nå kan du bruke NS3960 kontroll-funksjonen ✅
