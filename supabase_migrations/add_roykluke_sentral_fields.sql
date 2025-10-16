-- Legg til manglende kolonner i roykluke_sentraler

-- Type (Branngardin eller Røykluker)
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS anlegg_type TEXT DEFAULT 'Branngardin';

-- Anleggsinfo
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS anleggsinfo TEXT;

-- Sentral info (produsent er allerede i tabellen som 'sentral_nr' men vi trenger mer)
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS sentral_produsent TEXT;

-- Batteri
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS ladespenning TEXT;

-- Branngardin detaljer
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS branngardin_type TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS branngardin_antall INTEGER;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS branngardin_produsent TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS branngardin_klassifisering TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS aktiveringspenning TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS hvilespenning TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS branngardin_merknad TEXT;

-- Sjekkpunkter (status OK/Avvik)
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS sjekk_ledeskinner TEXT DEFAULT 'Ok';
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS sjekk_beslag TEXT DEFAULT 'Ok';
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS sjekk_motor TEXT DEFAULT 'Ok';
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS sjekk_gardin_status TEXT DEFAULT 'Ok';

-- Signal
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS signaltype TEXT;

-- Sjekkpunkter tilstand
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS tilstand_sentral TEXT DEFAULT 'Ok';
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS tilstand_ladespenning TEXT DEFAULT 'Ok';
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS tilstand_nettspenning TEXT DEFAULT 'Ok';
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS tilstand_nettlampe TEXT DEFAULT 'Ok';
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS tilstand_feillampe TEXT DEFAULT 'Ok';
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS tilstand_aktiveringslampe TEXT DEFAULT 'Ok';
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS tilstand_bryter TEXT DEFAULT 'Ok';
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS tilstand_signal TEXT DEFAULT 'Ok';

-- Kontroll
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS kontroll_funksjonstest TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS kontroll_forskriftsmessig TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS kontroll_anbefalte_utbedringer TEXT;

-- Røykluker-spesifikke felter
-- Motor
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS motor_type TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS motor_antall INTEGER;

-- Røykluker detaljer
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS roykluke_type TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS roykluke_luketype TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS roykluke_storrelse TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS roykluke_antall INTEGER;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS roykluke_merknad TEXT;

-- Batteri utvidet
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS batteri_type TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS batteri_spenning TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS ladespenning_status TEXT;

-- Krets
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS krets_nr TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS krets_aktiveringspenning TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS krets_hvilespenning TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS krets_motstand TEXT;

-- Sjekkpunkter utvidet for røykluker
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS sjekk_manuell_utloser TEXT DEFAULT 'Ok';
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS sjekk_karm TEXT DEFAULT 'Ok';
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS sjekk_overlys TEXT DEFAULT 'Ok';
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS sjekk_beslag_roykluke TEXT DEFAULT 'Ok';
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS sjekk_krets TEXT DEFAULT 'Ok';

-- Byttet utstyr
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS byttet_utstyr TEXT;
ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS byttet_utstyr_antall INTEGER;

-- Legg til type på luker også
ALTER TABLE roykluke_luker ADD COLUMN IF NOT EXISTS luke_type TEXT DEFAULT 'Branngardin';

-- Kommentar på endringer
COMMENT ON COLUMN roykluke_sentraler.anleggsinfo IS 'Generell informasjon om anlegget';
COMMENT ON COLUMN roykluke_sentraler.sentral_produsent IS 'Produsent av sentralen (f.eks. Coopers)';
COMMENT ON COLUMN roykluke_sentraler.ladespenning IS 'Ladespenning for batteriet';
COMMENT ON COLUMN roykluke_sentraler.branngardin_type IS 'Type branngardin';
COMMENT ON COLUMN roykluke_sentraler.signaltype IS 'Type signal (f.eks. Br.signal, testet lokalt)';
COMMENT ON COLUMN roykluke_sentraler.anlegg_type IS 'Type anlegg: Branngardin eller Røykluker';
COMMENT ON COLUMN roykluke_luker.luke_type IS 'Type luke: Branngardin eller Røykluker';
