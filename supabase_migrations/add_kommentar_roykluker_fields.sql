-- Add opprettet_av and opprettet_dato columns to kommentar_roykluker table

ALTER TABLE kommentar_roykluker
ADD COLUMN IF NOT EXISTS opprettet_av TEXT,
ADD COLUMN IF NOT EXISTS opprettet_dato DATE;

-- Add comment to describe the columns
COMMENT ON COLUMN kommentar_roykluker.opprettet_av IS 'Navn på personen som opprettet kommentaren';
COMMENT ON COLUMN kommentar_roykluker.opprettet_dato IS 'Dato når kommentaren ble opprettet';
