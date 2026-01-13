-- Fix alarmoverforing status check constraint
-- Fjern eksisterende constraint og legg til ny med riktige verdier

-- Først, fjern den eksisterende constraint
ALTER TABLE alarmoverforing DROP CONSTRAINT IF EXISTS alarmoverforing_status_check;

-- Legg til ny constraint med alle tillatte verdier
ALTER TABLE alarmoverforing ADD CONSTRAINT alarmoverforing_status_check 
  CHECK (status IN ('Utkast', 'Sendt', 'Aktiv', 'Inaktiv', 'Avsluttet'));

-- Sett default verdi
ALTER TABLE alarmoverforing ALTER COLUMN status SET DEFAULT 'Utkast';
