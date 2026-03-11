-- ============================================
-- STEG 5: RLS Policies for alle tabeller
-- Kjør dette ETTER steg 4
-- ============================================

-- ============================================
-- HOVEDTABELLER
-- ============================================

-- Customer
ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON customer FOR ALL USING (company_id = get_user_company_id());

-- Anlegg
ALTER TABLE anlegg ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON anlegg FOR ALL USING (company_id = get_user_company_id());

-- Kontaktpersoner
ALTER TABLE kontaktpersoner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON kontaktpersoner FOR ALL USING (company_id = get_user_company_id());

-- Anlegg Kontaktpersoner (via anlegg)
ALTER TABLE anlegg_kontaktpersoner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_anlegg" ON anlegg_kontaktpersoner FOR ALL 
  USING (anlegg_id IN (SELECT id FROM anlegg WHERE company_id = get_user_company_id()));

-- Ansatte
ALTER TABLE ansatte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON ansatte FOR ALL USING (company_id = get_user_company_id());

-- Ordre
ALTER TABLE ordre ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON ordre FOR ALL USING (company_id = get_user_company_id());

-- Servicerapporter
ALTER TABLE servicerapporter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON servicerapporter FOR ALL USING (company_id = get_user_company_id());

-- Avvik
ALTER TABLE avvik ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON avvik FOR ALL USING (company_id = get_user_company_id());

-- Oppgaver
ALTER TABLE oppgaver ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON oppgaver FOR ALL USING (company_id = get_user_company_id());

-- Anlegg TODOs (via anlegg)
ALTER TABLE anlegg_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_anlegg" ON anlegg_todos FOR ALL 
  USING (anlegg_id IN (SELECT id FROM anlegg WHERE company_id = get_user_company_id()));

-- ============================================
-- MØTER OG PROSJEKTER
-- ============================================

-- Møter
ALTER TABLE moter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON moter FOR ALL USING (company_id = get_user_company_id());

-- Møte deltakere (via møte)
ALTER TABLE mote_deltakere ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_mote" ON mote_deltakere FOR ALL 
  USING (mote_id IN (SELECT id FROM moter WHERE company_id = get_user_company_id()));

-- Møte agendapunkter (via møte)
ALTER TABLE mote_agendapunkter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_mote" ON mote_agendapunkter FOR ALL 
  USING (mote_id IN (SELECT id FROM moter WHERE company_id = get_user_company_id()));

-- Møte oppgaver (via møte)
ALTER TABLE mote_oppgaver ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_mote" ON mote_oppgaver FOR ALL 
  USING (mote_id IN (SELECT id FROM moter WHERE company_id = get_user_company_id()));

-- Møte referater (via møte)
ALTER TABLE mote_referater ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_mote" ON mote_referater FOR ALL 
  USING (mote_id IN (SELECT id FROM moter WHERE company_id = get_user_company_id()));

-- Prosjekter
ALTER TABLE prosjekter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON prosjekter FOR ALL USING (company_id = get_user_company_id());

-- Prosjekteringer
ALTER TABLE prosjekteringer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON prosjekteringer FOR ALL USING (company_id = get_user_company_id());

-- Prosjektering risikoanalyse (via prosjektering)
ALTER TABLE prosjektering_risikoanalyse ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_prosjektering" ON prosjektering_risikoanalyse FOR ALL 
  USING (prosjektering_id IN (SELECT id FROM prosjekteringer WHERE company_id = get_user_company_id()));

-- Prosjektering systemplan (via prosjektering)
ALTER TABLE prosjektering_systemplan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_prosjektering" ON prosjektering_systemplan FOR ALL 
  USING (prosjektering_id IN (SELECT id FROM prosjekteringer WHERE company_id = get_user_company_id()));

-- ============================================
-- SALG
-- ============================================

-- Salgs leads
ALTER TABLE salgs_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON salgs_leads FOR ALL USING (company_id = get_user_company_id());

-- Salgs leads kommentarer (via lead)
ALTER TABLE salgs_leads_kommentarer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_lead" ON salgs_leads_kommentarer FOR ALL 
  USING (lead_id IN (SELECT id FROM salgs_leads WHERE company_id = get_user_company_id()));

-- ============================================
-- DOKUMENTER OG RAPPORTER
-- ============================================

-- Dokumenter
ALTER TABLE dokumenter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON dokumenter FOR ALL USING (company_id = get_user_company_id());

-- Rapporter
ALTER TABLE rapporter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON rapporter FOR ALL USING (company_id = get_user_company_id());

-- Hendelser
ALTER TABLE hendelser ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON hendelser FOR ALL USING (company_id = get_user_company_id());

-- ============================================
-- ANLEGGSDATA
-- ============================================

-- Anleggsdata Brannalarm
ALTER TABLE anleggsdata_brannalarm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON anleggsdata_brannalarm FOR ALL USING (company_id = get_user_company_id());

-- Anleggsdata Nødlys
ALTER TABLE anleggsdata_nodlys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON anleggsdata_nodlys FOR ALL USING (company_id = get_user_company_id());

-- Anleggsdata Brannslanger
ALTER TABLE anleggsdata_brannslanger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON anleggsdata_brannslanger FOR ALL USING (company_id = get_user_company_id());

-- Anleggsdata Brannslukkere
ALTER TABLE anleggsdata_brannslukkere ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON anleggsdata_brannslukkere FOR ALL USING (company_id = get_user_company_id());

-- Anleggsdata Førstehjelp
ALTER TABLE anleggsdata_forstehjelp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON anleggsdata_forstehjelp FOR ALL USING (company_id = get_user_company_id());

-- Anleggsdata Kontroll
ALTER TABLE anleggsdata_kontroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON anleggsdata_kontroll FOR ALL USING (company_id = get_user_company_id());

-- ============================================
-- RØYKLUKE
-- ============================================

-- Røykluke Sentraler
ALTER TABLE roykluke_sentraler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON roykluke_sentraler FOR ALL USING (company_id = get_user_company_id());

-- Røykluke Luker
ALTER TABLE roykluke_luker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON roykluke_luker FOR ALL USING (company_id = get_user_company_id());

-- ============================================
-- BRANNALARM DETALJER
-- ============================================

-- Brannalarm Styringer
ALTER TABLE brannalarm_styringer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON brannalarm_styringer FOR ALL USING (company_id = get_user_company_id());

-- Enheter Brannalarm
ALTER TABLE enheter_brannalarm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON enheter_brannalarm FOR ALL USING (company_id = get_user_company_id());

-- Nettverk Brannalarm
ALTER TABLE nettverk_brannalarm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON nettverk_brannalarm FOR ALL USING (company_id = get_user_company_id());

-- Nettverk Nødlys
ALTER TABLE nettverk_nodlys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON nettverk_nodlys FOR ALL USING (company_id = get_user_company_id());

-- Alarmorganisering
ALTER TABLE alarmorganisering ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON alarmorganisering FOR ALL USING (company_id = get_user_company_id());

-- Alarmoverføring
ALTER TABLE alarmoverforing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON alarmoverforing FOR ALL USING (company_id = get_user_company_id());

-- ============================================
-- DETEKTOR
-- ============================================

-- Detektorlister
ALTER TABLE detektorlister ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON detektorlister FOR ALL USING (company_id = get_user_company_id());

-- Detektor Items
ALTER TABLE detektor_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON detektor_items FOR ALL USING (company_id = get_user_company_id());

-- Addressering
ALTER TABLE addressering ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON addressering FOR ALL USING (company_id = get_user_company_id());

-- ============================================
-- KONTROLL (junction tables via parent)
-- ============================================

-- Kontrollsjekkpunkter (via kontroll)
ALTER TABLE kontrollsjekkpunkter_brannalarm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_kontroll" ON kontrollsjekkpunkter_brannalarm FOR ALL 
  USING (kontroll_id IN (SELECT id FROM anleggsdata_kontroll WHERE company_id = get_user_company_id()));

-- Kontroll Notater (via kontroll)
ALTER TABLE kontroll_notater ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_kontroll" ON kontroll_notater FOR ALL 
  USING (kontroll_id IN (SELECT id FROM anleggsdata_kontroll WHERE company_id = get_user_company_id()));

-- Kommentar tabeller (via anlegg)
ALTER TABLE kommentar_brannslanger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_anlegg" ON kommentar_brannslanger FOR ALL 
  USING (anlegg_id IN (SELECT id FROM anlegg WHERE company_id = get_user_company_id()));

ALTER TABLE kommentar_brannslukkere ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_anlegg" ON kommentar_brannslukkere FOR ALL 
  USING (anlegg_id IN (SELECT id FROM anlegg WHERE company_id = get_user_company_id()));

ALTER TABLE kommentar_nodlys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_anlegg" ON kommentar_nodlys FOR ALL 
  USING (anlegg_id IN (SELECT id FROM anlegg WHERE company_id = get_user_company_id()));

ALTER TABLE kommentar_roykluker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_anlegg" ON kommentar_roykluker FOR ALL 
  USING (anlegg_id IN (SELECT id FROM anlegg WHERE company_id = get_user_company_id()));

-- Intern kommentar (via anlegg eller kunde)
ALTER TABLE intern_kommentar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_anlegg_or_kunde" ON intern_kommentar FOR ALL 
  USING (
    anlegg_id IN (SELECT id FROM anlegg WHERE company_id = get_user_company_id())
    OR kunde_id IN (SELECT id FROM customer WHERE company_id = get_user_company_id())
  );

-- Evakueringsplan Status
ALTER TABLE evakueringsplan_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON evakueringsplan_status FOR ALL USING (company_id = get_user_company_id());

-- Risikovurderinger
ALTER TABLE risikovurderinger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON risikovurderinger FOR ALL USING (company_id = get_user_company_id());

-- Risikokategorier
ALTER TABLE risikokategorier ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON risikokategorier FOR ALL USING (company_id = get_user_company_id());

-- KS Tiltak
ALTER TABLE ks_tiltak ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON ks_tiltak FOR ALL USING (company_id = get_user_company_id());

-- Opplæring
ALTER TABLE opplaering ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON opplaering FOR ALL USING (company_id = get_user_company_id());

-- ============================================
-- SERVICEAVTALER OG PRISER
-- ============================================

-- Serviceavtale Priser
ALTER TABLE serviceavtale_priser ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON serviceavtale_priser FOR ALL USING (company_id = get_user_company_id());

-- Serviceavtale Tilbud
ALTER TABLE serviceavtale_tilbud ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON serviceavtale_tilbud FOR ALL USING (company_id = get_user_company_id());

-- Priser Kundenummer
ALTER TABLE priser_kundenummer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON priser_kundenummer FOR ALL USING (company_id = get_user_company_id());

-- Prishistorikk
ALTER TABLE prishistorikk ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON prishistorikk FOR ALL USING (company_id = get_user_company_id());

-- ============================================
-- FDV
-- ============================================

-- FDV Leverandører
ALTER TABLE fdv_leverandorer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON fdv_leverandorer FOR ALL USING (company_id = get_user_company_id());

-- FDV Produkttyper
ALTER TABLE fdv_produkttyper ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON fdv_produkttyper FOR ALL USING (company_id = get_user_company_id());

-- FDV Datablader
ALTER TABLE fdv_datablader ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON fdv_datablader FOR ALL USING (company_id = get_user_company_id());

-- FDV Anlegg Datablader
ALTER TABLE fdv_anlegg_datablader ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON fdv_anlegg_datablader FOR ALL USING (company_id = get_user_company_id());

-- FDV Genererte Dokumenter
ALTER TABLE fdv_genererte_dokumenter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON fdv_genererte_dokumenter FOR ALL USING (company_id = get_user_company_id());

-- ============================================
-- SYSTEM
-- ============================================

-- Kontaktperson Ekstern
ALTER TABLE kontaktperson_ekstern ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON kontaktperson_ekstern FOR ALL USING (company_id = get_user_company_id());

-- Epost Logg
ALTER TABLE epost_logg ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON epost_logg FOR ALL USING (company_id = get_user_company_id());

-- System Logs
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON system_logs FOR ALL USING (company_id = get_user_company_id() OR company_id IS NULL);

-- Knowledge Base
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON knowledge_base FOR ALL USING (company_id = get_user_company_id());

-- AI Embeddings
ALTER TABLE ai_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON ai_embeddings FOR ALL USING (company_id = get_user_company_id());

-- Meldinger
ALTER TABLE meldinger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON meldinger FOR ALL USING (company_id = get_user_company_id());

-- Dropbox Tokens
ALTER TABLE dropbox_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON dropbox_tokens FOR ALL USING (company_id = get_user_company_id());
