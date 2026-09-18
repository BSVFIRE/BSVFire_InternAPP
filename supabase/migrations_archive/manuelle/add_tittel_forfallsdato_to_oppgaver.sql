-- Legg til tittel og forfallsdato kolonner til oppgaver tabellen
-- Dette gjør at oppgaver kan vises i Dashboard med kommende oppgaver

-- Legg til tittel kolonne
ALTER TABLE oppgaver 
ADD COLUMN IF NOT EXISTS tittel TEXT;

-- Legg til forfallsdato kolonne med default 2 uker frem i tid
ALTER TABLE oppgaver 
ADD COLUMN IF NOT EXISTS forfallsdato TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 weeks');

-- Oppdater eksisterende oppgaver med tittel basert på type
UPDATE oppgaver 
SET tittel = type || ' - ' || COALESCE(beskrivelse, 'Ingen beskrivelse')
WHERE tittel IS NULL;

-- Oppdater eksisterende oppgaver med forfallsdato (2 uker fra opprettet_dato)
UPDATE oppgaver 
SET forfallsdato = opprettet_dato + INTERVAL '2 weeks'
WHERE forfallsdato IS NULL;

-- Legg til kommentar på kolonnene
COMMENT ON COLUMN oppgaver.tittel IS 'Tittel på oppgaven';
COMMENT ON COLUMN oppgaver.forfallsdato IS 'Forfallsdato for oppgaven (default 2 uker frem i tid)';
