-- Legg til skjult-kolonne i customer-tabellen for soft delete
-- Kjør denne i Supabase SQL Editor

ALTER TABLE customer 
ADD COLUMN IF NOT EXISTS skjult BOOLEAN DEFAULT FALSE;

-- Opprett indeks for raskere filtrering
CREATE INDEX IF NOT EXISTS idx_customer_skjult ON customer(skjult);

-- Kommentar
COMMENT ON COLUMN customer.skjult IS 'Soft delete - skjuler kunden fra listen uten å slette data';
