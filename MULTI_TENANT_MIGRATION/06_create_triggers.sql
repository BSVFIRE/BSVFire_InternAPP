-- ============================================
-- STEG 6: Triggers for automatisk company_id
-- Kjør dette ETTER steg 5
-- ============================================

-- Denne triggeren setter automatisk company_id ved INSERT
-- slik at du IKKE trenger å endre frontend-koden!

CREATE OR REPLACE FUNCTION auto_set_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Legg til trigger på alle tabeller med company_id
-- ============================================

-- Hovedtabeller
CREATE TRIGGER auto_company_id_customer BEFORE INSERT ON customer FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_anlegg BEFORE INSERT ON anlegg FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_kontaktpersoner BEFORE INSERT ON kontaktpersoner FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_ansatte BEFORE INSERT ON ansatte FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_ordre BEFORE INSERT ON ordre FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_servicerapporter BEFORE INSERT ON servicerapporter FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_avvik BEFORE INSERT ON avvik FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_oppgaver BEFORE INSERT ON oppgaver FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();

-- Møter og prosjekter
CREATE TRIGGER auto_company_id_moter BEFORE INSERT ON moter FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_prosjekter BEFORE INSERT ON prosjekter FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_prosjekteringer BEFORE INSERT ON prosjekteringer FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();

-- Salg
CREATE TRIGGER auto_company_id_salgs_leads BEFORE INSERT ON salgs_leads FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();

-- Dokumenter
CREATE TRIGGER auto_company_id_dokumenter BEFORE INSERT ON dokumenter FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_rapporter BEFORE INSERT ON rapporter FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_hendelser BEFORE INSERT ON hendelser FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();

-- Anleggsdata
CREATE TRIGGER auto_company_id_anleggsdata_brannalarm BEFORE INSERT ON anleggsdata_brannalarm FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_anleggsdata_nodlys BEFORE INSERT ON anleggsdata_nodlys FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_anleggsdata_brannslanger BEFORE INSERT ON anleggsdata_brannslanger FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_anleggsdata_brannslukkere BEFORE INSERT ON anleggsdata_brannslukkere FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_anleggsdata_forstehjelp BEFORE INSERT ON anleggsdata_forstehjelp FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_anleggsdata_kontroll BEFORE INSERT ON anleggsdata_kontroll FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();

-- Røykluke
CREATE TRIGGER auto_company_id_roykluke_sentraler BEFORE INSERT ON roykluke_sentraler FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_roykluke_luker BEFORE INSERT ON roykluke_luker FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();

-- Brannalarm
CREATE TRIGGER auto_company_id_brannalarm_styringer BEFORE INSERT ON brannalarm_styringer FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_enheter_brannalarm BEFORE INSERT ON enheter_brannalarm FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_nettverk_brannalarm BEFORE INSERT ON nettverk_brannalarm FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_nettverk_nodlys BEFORE INSERT ON nettverk_nodlys FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_alarmorganisering BEFORE INSERT ON alarmorganisering FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_alarmoverforing BEFORE INSERT ON alarmoverforing FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();

-- Detektor
CREATE TRIGGER auto_company_id_detektorlister BEFORE INSERT ON detektorlister FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_detektor_items BEFORE INSERT ON detektor_items FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_addressering BEFORE INSERT ON addressering FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();

-- Kontroll og risiko
CREATE TRIGGER auto_company_id_evakueringsplan_status BEFORE INSERT ON evakueringsplan_status FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_risikovurderinger BEFORE INSERT ON risikovurderinger FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_risikokategorier BEFORE INSERT ON risikokategorier FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_ks_tiltak BEFORE INSERT ON ks_tiltak FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_opplaering BEFORE INSERT ON opplaering FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();

-- Serviceavtaler og priser
CREATE TRIGGER auto_company_id_serviceavtale_priser BEFORE INSERT ON serviceavtale_priser FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_serviceavtale_tilbud BEFORE INSERT ON serviceavtale_tilbud FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_priser_kundenummer BEFORE INSERT ON priser_kundenummer FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_prishistorikk BEFORE INSERT ON prishistorikk FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();

-- FDV
CREATE TRIGGER auto_company_id_fdv_leverandorer BEFORE INSERT ON fdv_leverandorer FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_fdv_produkttyper BEFORE INSERT ON fdv_produkttyper FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_fdv_datablader BEFORE INSERT ON fdv_datablader FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_fdv_anlegg_datablader BEFORE INSERT ON fdv_anlegg_datablader FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_fdv_genererte_dokumenter BEFORE INSERT ON fdv_genererte_dokumenter FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();

-- System
CREATE TRIGGER auto_company_id_kontaktperson_ekstern BEFORE INSERT ON kontaktperson_ekstern FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_epost_logg BEFORE INSERT ON epost_logg FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_knowledge_base BEFORE INSERT ON knowledge_base FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_ai_embeddings BEFORE INSERT ON ai_embeddings FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_meldinger BEFORE INSERT ON meldinger FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();
CREATE TRIGGER auto_company_id_dropbox_tokens BEFORE INSERT ON dropbox_tokens FOR EACH ROW EXECUTE FUNCTION auto_set_company_id();

-- ============================================
-- Verifiser at alt er satt opp
-- ============================================

SELECT 'Triggers opprettet!' as status;

-- Vis alle triggers
SELECT 
  trigger_name,
  event_object_table as table_name
FROM information_schema.triggers 
WHERE trigger_name LIKE 'auto_company_id%'
ORDER BY event_object_table;
