-- Add missing columns to kommentar_brannslukkere
ALTER TABLE kommentar_brannslukkere
ADD COLUMN IF NOT EXISTS opprettet_av TEXT,
ADD COLUMN IF NOT EXISTS opprettet_dato DATE;

-- Add missing columns to kommentar_brannslanger
ALTER TABLE kommentar_brannslanger
ADD COLUMN IF NOT EXISTS opprettet_av TEXT,
ADD COLUMN IF NOT EXISTS opprettet_dato DATE;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
