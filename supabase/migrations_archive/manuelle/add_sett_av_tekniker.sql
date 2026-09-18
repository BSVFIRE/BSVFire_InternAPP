-- Legg til sett_av_tekniker kolonner for ordre og oppgaver
-- Dette sporer om teknikeren har sett/åpnet ordren/oppgaven

-- Ordre-tabellen
ALTER TABLE ordre
ADD COLUMN IF NOT EXISTS sett_av_tekniker BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sett_dato TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN ordre.sett_av_tekniker IS 'Om teknikeren har sett/åpnet ordren';
COMMENT ON COLUMN ordre.sett_dato IS 'Tidspunkt når teknikeren så ordren';

-- Oppgaver-tabellen
ALTER TABLE oppgaver
ADD COLUMN IF NOT EXISTS sett_av_tekniker BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sett_dato TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN oppgaver.sett_av_tekniker IS 'Om teknikeren har sett/åpnet oppgaven';
COMMENT ON COLUMN oppgaver.sett_dato IS 'Tidspunkt når teknikeren så oppgaven';

-- Indekser for raskere søk etter usette elementer
CREATE INDEX IF NOT EXISTS idx_ordre_tekniker_sett 
ON ordre(tekniker_id, sett_av_tekniker) 
WHERE tekniker_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_oppgaver_tekniker_sett 
ON oppgaver(tekniker_id, sett_av_tekniker) 
WHERE tekniker_id IS NOT NULL;
