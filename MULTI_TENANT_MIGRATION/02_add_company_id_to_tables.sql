-- ============================================
-- STEG 2: Legg til company_id på alle tabeller
-- Kjør dette ETTER steg 1
-- ============================================

-- VIKTIG: Erstatt 'BSVFIRE_COMPANY_ID' med faktisk UUID fra steg 1
-- Du finner den ved å kjøre: SELECT id FROM companies WHERE org_nr = '921044879';

-- Sett variabel (erstatt med faktisk ID)
-- DO $$ DECLARE bsv_id UUID := 'din-uuid-her'; BEGIN ... END $$;

-- ============================================
-- Hovedtabeller - legg til company_id
-- ============================================

-- customer (kunder)
ALTER TABLE customer ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE customer SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- anlegg
ALTER TABLE anlegg ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE anlegg SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- kontaktpersoner
ALTER TABLE kontaktpersoner ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE kontaktpersoner SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- ansatte
ALTER TABLE ansatte ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE ansatte SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- ordre
ALTER TABLE ordre ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE ordre SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- servicerapporter
ALTER TABLE servicerapporter ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE servicerapporter SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- avvik
ALTER TABLE avvik ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE avvik SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- oppgaver
ALTER TABLE oppgaver ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE oppgaver SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- moter
ALTER TABLE moter ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE moter SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- prosjekter
ALTER TABLE prosjekter ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE prosjekter SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- prosjekteringer
ALTER TABLE prosjekteringer ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE prosjekteringer SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- salgs_leads
ALTER TABLE salgs_leads ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE salgs_leads SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- rapporter
ALTER TABLE rapporter ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE rapporter SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- dokumenter
ALTER TABLE dokumenter ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE dokumenter SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- hendelser
ALTER TABLE hendelser ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE hendelser SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- ============================================
-- Anleggsdata-tabeller
-- ============================================

ALTER TABLE anleggsdata_brannalarm ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE anleggsdata_brannalarm SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE anleggsdata_brannslanger ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE anleggsdata_brannslanger SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE anleggsdata_brannslukkere ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE anleggsdata_brannslukkere SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE anleggsdata_forstehjelp ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE anleggsdata_forstehjelp SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE anleggsdata_nodlys ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE anleggsdata_nodlys SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE anleggsdata_kontroll ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE anleggsdata_kontroll SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- ============================================
-- Røykluke-tabeller
-- ============================================

ALTER TABLE roykluke_sentraler ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE roykluke_sentraler SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE roykluke_luker ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE roykluke_luker SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- ============================================
-- Brannalarm-tabeller
-- ============================================

ALTER TABLE brannalarm_styringer ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE brannalarm_styringer SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE enheter_brannalarm ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE enheter_brannalarm SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE nettverk_brannalarm ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE nettverk_brannalarm SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE alarmorganisering ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE alarmorganisering SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE alarmoverforing ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE alarmoverforing SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- ============================================
-- Detektor-tabeller
-- ============================================

ALTER TABLE detektorlister ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE detektorlister SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE detektor_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE detektor_items SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- ============================================
-- Serviceavtale-tabeller
-- ============================================

ALTER TABLE serviceavtale_priser ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE serviceavtale_priser SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE serviceavtale_tilbud ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE serviceavtale_tilbud SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- ============================================
-- Priser og fakturering
-- ============================================

ALTER TABLE priser_kundenummer ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE priser_kundenummer SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE prishistorikk ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE prishistorikk SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- ============================================
-- FDV-tabeller
-- ============================================

ALTER TABLE fdv_leverandorer ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE fdv_leverandorer SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE fdv_produkttyper ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE fdv_produkttyper SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE fdv_datablader ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE fdv_datablader SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE fdv_anlegg_datablader ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE fdv_anlegg_datablader SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE fdv_genererte_dokumenter ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE fdv_genererte_dokumenter SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- ============================================
-- Diverse tabeller
-- ============================================

ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE knowledge_base SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE epost_logg ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE epost_logg SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE system_logs SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879') WHERE company_id IS NULL;

-- ============================================
-- Opprett indekser for company_id
-- ============================================

CREATE INDEX IF NOT EXISTS idx_customer_company ON customer(company_id);
CREATE INDEX IF NOT EXISTS idx_anlegg_company ON anlegg(company_id);
CREATE INDEX IF NOT EXISTS idx_kontaktpersoner_company ON kontaktpersoner(company_id);
CREATE INDEX IF NOT EXISTS idx_ansatte_company ON ansatte(company_id);
CREATE INDEX IF NOT EXISTS idx_ordre_company ON ordre(company_id);
CREATE INDEX IF NOT EXISTS idx_servicerapporter_company ON servicerapporter(company_id);
CREATE INDEX IF NOT EXISTS idx_avvik_company ON avvik(company_id);
CREATE INDEX IF NOT EXISTS idx_oppgaver_company ON oppgaver(company_id);

-- Verifiser at alle rader har company_id
SELECT 'customer' as tabell, COUNT(*) as uten_company FROM customer WHERE company_id IS NULL
UNION ALL
SELECT 'anlegg', COUNT(*) FROM anlegg WHERE company_id IS NULL
UNION ALL
SELECT 'kontaktpersoner', COUNT(*) FROM kontaktpersoner WHERE company_id IS NULL
UNION ALL
SELECT 'ansatte', COUNT(*) FROM ansatte WHERE company_id IS NULL
UNION ALL
SELECT 'ordre', COUNT(*) FROM ordre WHERE company_id IS NULL;
