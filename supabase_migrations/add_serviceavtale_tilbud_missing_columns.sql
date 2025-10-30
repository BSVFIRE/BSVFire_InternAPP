-- Add missing columns to serviceavtale_tilbud table

-- Add lokasjon column
ALTER TABLE serviceavtale_tilbud 
ADD COLUMN IF NOT EXISTS lokasjon TEXT;

-- Add pricing columns
ALTER TABLE serviceavtale_tilbud 
ADD COLUMN IF NOT EXISTS pris_detaljer JSONB DEFAULT '{}'::jsonb;

ALTER TABLE serviceavtale_tilbud 
ADD COLUMN IF NOT EXISTS total_pris NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE serviceavtale_tilbud 
ADD COLUMN IF NOT EXISTS rabatt_prosent NUMERIC(5, 2) DEFAULT 0;

ALTER TABLE serviceavtale_tilbud 
ADD COLUMN IF NOT EXISTS timespris NUMERIC(10, 2) DEFAULT 925;

-- Add opprettet_av_navn column to store the name of the user who created the offer
ALTER TABLE serviceavtale_tilbud 
ADD COLUMN IF NOT EXISTS opprettet_av_navn TEXT;

-- Add comment
COMMENT ON COLUMN serviceavtale_tilbud.lokasjon IS 'Location or branch information for the customer';
COMMENT ON COLUMN serviceavtale_tilbud.pris_detaljer IS 'JSON object containing detailed pricing breakdown';
COMMENT ON COLUMN serviceavtale_tilbud.total_pris IS 'Total price for the service agreement';
COMMENT ON COLUMN serviceavtale_tilbud.rabatt_prosent IS 'Discount percentage applied to the offer';
COMMENT ON COLUMN serviceavtale_tilbud.timespris IS 'Hourly rate used in calculations';
COMMENT ON COLUMN serviceavtale_tilbud.opprettet_av_navn IS 'Name of the user who created this offer';
