-- Add betalingsbetingelser (payment terms) column to serviceavtale_tilbud table

ALTER TABLE serviceavtale_tilbud 
ADD COLUMN IF NOT EXISTS betalingsbetingelser INTEGER DEFAULT 20;

COMMENT ON COLUMN serviceavtale_tilbud.betalingsbetingelser IS 'Payment terms in days (default 20 days)';
