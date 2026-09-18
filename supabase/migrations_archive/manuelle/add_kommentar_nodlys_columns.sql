-- Add opprettet_av and opprettet_dato columns to kommentar_nodlys table
ALTER TABLE kommentar_nodlys 
ADD COLUMN IF NOT EXISTS opprettet_av TEXT,
ADD COLUMN IF NOT EXISTS opprettet_dato TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN kommentar_nodlys.opprettet_av IS 'Navn på personen som opprettet kommentaren';
COMMENT ON COLUMN kommentar_nodlys.opprettet_dato IS 'Dato når kommentaren ble opprettet (YYYY-MM-DD format)';
