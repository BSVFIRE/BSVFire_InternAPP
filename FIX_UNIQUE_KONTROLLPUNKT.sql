-- ⚠️ VIKTIG: Endre unique constraint på ns3960_kontrollpunkter ⚠️
-- Fjern gammel constraint (anlegg_id, kontrollpunkt_navn)
-- Legg til ny constraint (kontroll_id, kontrollpunkt_navn)

-- Fjern gammel unique constraint
ALTER TABLE ns3960_kontrollpunkter 
DROP CONSTRAINT IF EXISTS unique_kontrollpunkt;

-- Legg til ny unique constraint basert på kontroll_id (ikke anlegg_id)
-- Dette tillater samme kontrollpunkt for forskjellige kontroller på samme anlegg
ALTER TABLE ns3960_kontrollpunkter 
ADD CONSTRAINT unique_kontroll_kontrollpunkt 
UNIQUE (kontroll_id, kontrollpunkt_navn);

-- Bekreft at ny constraint er opprettet
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'ns3960_kontrollpunkter'::regclass
AND conname = 'unique_kontroll_kontrollpunkt';

-- Nå kan du ha flere kontroller per anlegg, 
-- men ikke duplikate kontrollpunkter innenfor samme kontroll! ✅
