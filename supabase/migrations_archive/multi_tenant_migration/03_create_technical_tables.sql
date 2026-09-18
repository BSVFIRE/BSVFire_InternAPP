-- ============================================
-- STEG 3: Tekniske tabeller (anleggsdata, brannalarm, etc.)
-- Kjør dette ETTER steg 2
-- ============================================

-- ============================================
-- ANLEGGSDATA TABELLER
-- ============================================

-- Anleggsdata Brannalarm
CREATE TABLE IF NOT EXISTS anleggsdata_brannalarm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  sentral_type TEXT,
  sentral_produsent TEXT,
  sentral_modell TEXT,
  sentral_programversjon TEXT,
  antall_sloyfter INTEGER,
  antall_detektorer INTEGER,
  antall_manuelle_meldere INTEGER,
  antall_sirener INTEGER,
  antall_blitz INTEGER,
  batteri_type TEXT,
  batteri_kapasitet TEXT,
  siste_batteriskift DATE,
  neste_batteriskift DATE,
  alarmoverfoering TEXT,
  alarmoverfoering_type TEXT,
  alarmoverfoering_mottaker TEXT,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anleggsdata_brannalarm_company ON anleggsdata_brannalarm(company_id);
CREATE INDEX IF NOT EXISTS idx_anleggsdata_brannalarm_anlegg ON anleggsdata_brannalarm(anlegg_id);

-- Anleggsdata Nødlys
CREATE TABLE IF NOT EXISTS anleggsdata_nodlys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  sentral_type TEXT,
  sentral_produsent TEXT,
  sentral_modell TEXT,
  antall_armaturer INTEGER,
  antall_skilt INTEGER,
  batteri_type TEXT,
  test_intervall TEXT,
  siste_test DATE,
  neste_test DATE,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anleggsdata_nodlys_company ON anleggsdata_nodlys(company_id);
CREATE INDEX IF NOT EXISTS idx_anleggsdata_nodlys_anlegg ON anleggsdata_nodlys(anlegg_id);

-- Anleggsdata Brannslanger
CREATE TABLE IF NOT EXISTS anleggsdata_brannslanger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  antall_slanger INTEGER,
  type TEXT,
  lengde TEXT,
  plassering TEXT,
  siste_kontroll DATE,
  neste_kontroll DATE,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anleggsdata_brannslanger_company ON anleggsdata_brannslanger(company_id);
CREATE INDEX IF NOT EXISTS idx_anleggsdata_brannslanger_anlegg ON anleggsdata_brannslanger(anlegg_id);

-- Anleggsdata Brannslukkere
CREATE TABLE IF NOT EXISTS anleggsdata_brannslukkere (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  antall INTEGER,
  type TEXT,
  storrelse TEXT,
  plassering TEXT,
  siste_kontroll DATE,
  neste_kontroll DATE,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anleggsdata_brannslukkere_company ON anleggsdata_brannslukkere(company_id);
CREATE INDEX IF NOT EXISTS idx_anleggsdata_brannslukkere_anlegg ON anleggsdata_brannslukkere(anlegg_id);

-- Anleggsdata Førstehjelp
CREATE TABLE IF NOT EXISTS anleggsdata_forstehjelp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  antall_skap INTEGER,
  plassering TEXT,
  innhold TEXT,
  siste_kontroll DATE,
  neste_kontroll DATE,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anleggsdata_forstehjelp_company ON anleggsdata_forstehjelp(company_id);
CREATE INDEX IF NOT EXISTS idx_anleggsdata_forstehjelp_anlegg ON anleggsdata_forstehjelp(anlegg_id);

-- Anleggsdata Kontroll
CREATE TABLE IF NOT EXISTS anleggsdata_kontroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  kontroll_type TEXT,
  dato DATE,
  utfort_av UUID REFERENCES ansatte(id),
  resultat TEXT,
  avvik TEXT,
  tiltak TEXT,
  neste_kontroll DATE,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anleggsdata_kontroll_company ON anleggsdata_kontroll(company_id);
CREATE INDEX IF NOT EXISTS idx_anleggsdata_kontroll_anlegg ON anleggsdata_kontroll(anlegg_id);

-- ============================================
-- RØYKLUKE TABELLER
-- ============================================

-- Røykluke Sentraler
CREATE TABLE IF NOT EXISTS roykluke_sentraler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  navn TEXT,
  produsent TEXT,
  modell TEXT,
  plassering TEXT,
  antall_grupper INTEGER,
  batteri_type TEXT,
  siste_service DATE,
  neste_service DATE,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roykluke_sentraler_company ON roykluke_sentraler(company_id);
CREATE INDEX IF NOT EXISTS idx_roykluke_sentraler_anlegg ON roykluke_sentraler(anlegg_id);

-- Røykluke Luker
CREATE TABLE IF NOT EXISTS roykluke_luker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  sentral_id UUID REFERENCES roykluke_sentraler(id) ON DELETE SET NULL,
  luke_nr TEXT,
  plassering TEXT,
  type TEXT,
  storrelse TEXT,
  gruppe INTEGER,
  status TEXT DEFAULT 'OK',
  siste_test DATE,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roykluke_luker_company ON roykluke_luker(company_id);
CREATE INDEX IF NOT EXISTS idx_roykluke_luker_anlegg ON roykluke_luker(anlegg_id);

-- ============================================
-- BRANNALARM DETALJER
-- ============================================

-- Brannalarm Styringer
CREATE TABLE IF NOT EXISTS brannalarm_styringer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  navn TEXT,
  type TEXT,
  adresse TEXT,
  funksjon TEXT,
  tilkoblet TEXT,
  status TEXT DEFAULT 'Aktiv',
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brannalarm_styringer_company ON brannalarm_styringer(company_id);
CREATE INDEX IF NOT EXISTS idx_brannalarm_styringer_anlegg ON brannalarm_styringer(anlegg_id);

-- Enheter Brannalarm
CREATE TABLE IF NOT EXISTS enheter_brannalarm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  sloyfe INTEGER,
  adresse INTEGER,
  type TEXT,
  plassering TEXT,
  etasje TEXT,
  rom TEXT,
  status TEXT DEFAULT 'OK',
  siste_test DATE,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enheter_brannalarm_company ON enheter_brannalarm(company_id);
CREATE INDEX IF NOT EXISTS idx_enheter_brannalarm_anlegg ON enheter_brannalarm(anlegg_id);

-- Nettverk Brannalarm
CREATE TABLE IF NOT EXISTS nettverk_brannalarm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  ip_adresse TEXT,
  mac_adresse TEXT,
  gateway TEXT,
  subnet TEXT,
  dns TEXT,
  port INTEGER,
  protokoll TEXT,
  notat TEXT,
  sist_oppdatert TIMESTAMPTZ,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nettverk_brannalarm_company ON nettverk_brannalarm(company_id);
CREATE INDEX IF NOT EXISTS idx_nettverk_brannalarm_anlegg ON nettverk_brannalarm(anlegg_id);

-- Nettverk Nødlys
CREATE TABLE IF NOT EXISTS nettverk_nodlys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  ip_adresse TEXT,
  mac_adresse TEXT,
  gateway TEXT,
  subnet TEXT,
  notat TEXT,
  sist_oppdatert TIMESTAMPTZ,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nettverk_nodlys_company ON nettverk_nodlys(company_id);
CREATE INDEX IF NOT EXISTS idx_nettverk_nodlys_anlegg ON nettverk_nodlys(anlegg_id);

-- Alarmorganisering
CREATE TABLE IF NOT EXISTS alarmorganisering (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  kunde_id UUID REFERENCES customer(id),
  anlegg_id UUID REFERENCES anlegg(id),
  dato DATE NOT NULL DEFAULT CURRENT_DATE,
  revisjon TEXT DEFAULT '1.0',
  service_ingeniør TEXT,
  kundeadresse TEXT,
  kontakt_person TEXT,
  mobil TEXT,
  e_post TEXT,
  annet TEXT,
  samspill_teknisk_organisatorisk TEXT,
  styringsmatrise TEXT,
  type_overforing TEXT,
  overvakingstid TEXT,
  innstallasjon TEXT,
  gjeldende_teknisk_forskrift TEXT,
  antall_styringer TEXT,
  brannklokker_aktivering TEXT,
  visuell_varsling_aktivering TEXT,
  alarm_aktivering TEXT,
  seksjoneringsoppsett TEXT,
  styringer_data JSONB,
  detektortyper TEXT,
  detektorplassering TEXT,
  alarmnivaa_forvarsel TEXT,
  alarmnivaa_stille TEXT,
  alarmnivaa_stor TEXT,
  tekniske_tiltak_unodige_alarmer TEXT,
  hvem_faar_melding TEXT,
  hvordan_melding_mottas TEXT,
  verifikasjonsmetoder TEXT,
  kommunikasjonskanaler TEXT,
  meldingsrutiner TEXT,
  integrasjon_andre_systemer TEXT,
  forriglinger TEXT,
  automatiske_funksjoner TEXT,
  organisatoriske_prosesser TEXT,
  evakueringsprosedyrer TEXT,
  beredskapsplaner TEXT,
  ansvarlige_personer TEXT,
  opplaering_rutiner TEXT,
  status TEXT DEFAULT 'Utkast' CHECK (status IN ('Utkast', 'Ferdig', 'Arkivert')),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  oppdatert_dato TIMESTAMPTZ DEFAULT NOW(),
  opprettet_av UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_alarmorganisering_company ON alarmorganisering(company_id);
CREATE INDEX IF NOT EXISTS idx_alarmorganisering_anlegg ON alarmorganisering(anlegg_id);

-- Alarmoverføring
CREATE TABLE IF NOT EXISTS alarmoverforing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  type TEXT,
  mottaker TEXT,
  telefonnummer TEXT,
  ip_adresse TEXT,
  protokoll TEXT,
  status TEXT DEFAULT 'Aktiv',
  siste_test DATE,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alarmoverforing_company ON alarmoverforing(company_id);
CREATE INDEX IF NOT EXISTS idx_alarmoverforing_anlegg ON alarmoverforing(anlegg_id);

-- ============================================
-- DETEKTOR TABELLER
-- ============================================

-- Detektorlister
CREATE TABLE IF NOT EXISTS detektorlister (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  navn TEXT,
  beskrivelse TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detektorlister_company ON detektorlister(company_id);
CREATE INDEX IF NOT EXISTS idx_detektorlister_anlegg ON detektorlister(anlegg_id);

-- Detektor Items
CREATE TABLE IF NOT EXISTS detektor_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  liste_id UUID NOT NULL REFERENCES detektorlister(id) ON DELETE CASCADE,
  sloyfe INTEGER,
  adresse INTEGER,
  type TEXT,
  plassering TEXT,
  etasje TEXT,
  rom TEXT,
  status TEXT DEFAULT 'OK',
  siste_test DATE,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detektor_items_company ON detektor_items(company_id);
CREATE INDEX IF NOT EXISTS idx_detektor_items_liste ON detektor_items(liste_id);

-- Addressering
CREATE TABLE IF NOT EXISTS addressering (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  sloyfe INTEGER,
  adresse INTEGER,
  type TEXT,
  plassering TEXT,
  etasje TEXT,
  sone TEXT,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addressering_company ON addressering(company_id);
CREATE INDEX IF NOT EXISTS idx_addressering_anlegg ON addressering(anlegg_id);

-- ============================================
-- KONTROLL TABELLER
-- ============================================

-- Kontrollsjekkpunkter Brannalarm
CREATE TABLE IF NOT EXISTS kontrollsjekkpunkter_brannalarm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kontroll_id UUID NOT NULL REFERENCES anleggsdata_kontroll(id) ON DELETE CASCADE,
  sjekkpunkt TEXT NOT NULL,
  status TEXT DEFAULT 'Ikke sjekket',
  kommentar TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

-- Kontroll Notater
CREATE TABLE IF NOT EXISTS kontroll_notater (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kontroll_id UUID NOT NULL REFERENCES anleggsdata_kontroll(id) ON DELETE CASCADE,
  notat TEXT NOT NULL,
  opprettet_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

-- Kommentar tabeller for ulike moduler
CREATE TABLE IF NOT EXISTS kommentar_brannslanger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  kommentar TEXT,
  opprettet_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kommentar_brannslukkere (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  kommentar TEXT,
  opprettet_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kommentar_nodlys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  kommentar TEXT,
  opprettet_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kommentar_roykluker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  kommentar TEXT,
  opprettet_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

-- Intern kommentar
CREATE TABLE IF NOT EXISTS intern_kommentar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID REFERENCES anlegg(id) ON DELETE CASCADE,
  kunde_id UUID REFERENCES customer(id) ON DELETE CASCADE,
  kommentar TEXT NOT NULL,
  opprettet_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

-- Evakueringsplan Status
CREATE TABLE IF NOT EXISTS evakueringsplan_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Nei' CHECK (status IN ('Ja', 'Nei', 'Må oppdateres')),
  siste_oppdatering DATE,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evakueringsplan_company ON evakueringsplan_status(company_id);
CREATE INDEX IF NOT EXISTS idx_evakueringsplan_anlegg ON evakueringsplan_status(anlegg_id);

-- Risikovurderinger
CREATE TABLE IF NOT EXISTS risikovurderinger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL,
  tittel TEXT NOT NULL,
  beskrivelse TEXT,
  dato DATE DEFAULT CURRENT_DATE,
  utfort_av UUID REFERENCES ansatte(id),
  status TEXT DEFAULT 'Utkast',
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risikovurderinger_company ON risikovurderinger(company_id);

-- Risikokategorier
CREATE TABLE IF NOT EXISTS risikokategorier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  navn TEXT NOT NULL,
  beskrivelse TEXT,
  farge TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risikokategorier_company ON risikokategorier(company_id);

-- KS Tiltak
CREATE TABLE IF NOT EXISTS ks_tiltak (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  avvik_id UUID REFERENCES avvik(id) ON DELETE CASCADE,
  tittel TEXT NOT NULL,
  beskrivelse TEXT,
  ansvarlig_id UUID REFERENCES ansatte(id),
  frist DATE,
  status TEXT DEFAULT 'Åpen',
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  fullfort_dato TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ks_tiltak_company ON ks_tiltak(company_id);

-- Opplæring
CREATE TABLE IF NOT EXISTS opplaering (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  ansatt_id UUID REFERENCES ansatte(id) ON DELETE CASCADE,
  kurs_navn TEXT NOT NULL,
  beskrivelse TEXT,
  dato DATE,
  utloper DATE,
  sertifikat_nr TEXT,
  dokumentasjon_url TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opplaering_company ON opplaering(company_id);
CREATE INDEX IF NOT EXISTS idx_opplaering_ansatt ON opplaering(ansatt_id);
