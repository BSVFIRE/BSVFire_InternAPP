-- Legg til tilleggsutstyr-kolonner i anleggsdata_brannalarm tabellen

-- Talevarsling
ALTER TABLE anleggsdata_brannalarm 
ADD COLUMN IF NOT EXISTS talevarsling BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS talevarsling_leverandor TEXT,
ADD COLUMN IF NOT EXISTS talevarsling_batteri_type TEXT,
ADD COLUMN IF NOT EXISTS talevarsling_batteri_alder TEXT,
ADD COLUMN IF NOT EXISTS talevarsling_plassering TEXT,
ADD COLUMN IF NOT EXISTS talevarsling_kommentar TEXT;

-- Alarmsender
ALTER TABLE anleggsdata_brannalarm 
ADD COLUMN IF NOT EXISTS alarmsender_i_anlegg BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mottaker TEXT[],
ADD COLUMN IF NOT EXISTS gsm_nummer TEXT,
ADD COLUMN IF NOT EXISTS plassering TEXT,
ADD COLUMN IF NOT EXISTS batterialder TEXT,
ADD COLUMN IF NOT EXISTS batteritype TEXT,
ADD COLUMN IF NOT EXISTS forsynet_fra_brannsentral BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "sender_2G_4G" TEXT,
ADD COLUMN IF NOT EXISTS mottaker_kommentar TEXT,
ADD COLUMN IF NOT EXISTS ekstern_mottaker TEXT[],
ADD COLUMN IF NOT EXISTS ekstern_mottaker_info TEXT,
ADD COLUMN IF NOT EXISTS ekstern_mottaker_aktiv BOOLEAN DEFAULT FALSE;

-- Nøkkelsafe
ALTER TABLE anleggsdata_brannalarm 
ADD COLUMN IF NOT EXISTS nokkelsafe BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nokkelsafe_type TEXT,
ADD COLUMN IF NOT EXISTS nokkelsafe_plassering TEXT,
ADD COLUMN IF NOT EXISTS nokkelsafe_innhold TEXT,
ADD COLUMN IF NOT EXISTS nokkelsafe_kommentar TEXT;
