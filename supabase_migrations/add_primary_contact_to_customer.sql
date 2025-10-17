-- Legg til sist_oppdatert timestamp
ALTER TABLE customer
ADD COLUMN IF NOT EXISTS sist_oppdatert timestamp with time zone DEFAULT now();

-- Kommentar
COMMENT ON COLUMN customer.sist_oppdatert IS 'Tidspunkt for siste oppdatering';
