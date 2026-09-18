-- ============================================
-- STEG 2: Opprett ALLE tabeller med company_id
-- Kjør dette ETTER steg 1 (01_create_companies_table.sql)
-- ============================================

-- ============================================
-- HOVEDTABELLER
-- ============================================

-- Customer (kunder)
CREATE TABLE IF NOT EXISTS customer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  navn TEXT NOT NULL,
  organisasjonsnummer TEXT,
  epost TEXT,
  telefon TEXT,
  adresse TEXT,
  postnr TEXT,
  poststed TEXT,
  land TEXT DEFAULT 'Norge',
  kontaktperson TEXT,
  kontaktperson_telefon TEXT,
  kontaktperson_epost TEXT,
  notat TEXT,
  aktiv BOOLEAN DEFAULT true,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_company ON customer(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_org_nr ON customer(organisasjonsnummer);

-- Anlegg
CREATE TABLE IF NOT EXISTS anlegg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  kundenr UUID REFERENCES customer(id) ON DELETE SET NULL,
  anleggsnavn TEXT NOT NULL,
  adresse TEXT,
  postnummer TEXT,
  poststed TEXT,
  kommune TEXT,
  org_nummer TEXT,
  kunde_nummer TEXT,
  kontaktperson TEXT,
  kontaktperson_telefon TEXT,
  kontaktperson_epost TEXT,
  fg_nummer TEXT,
  fg_dato DATE,
  fg_database TEXT,
  anleggstype TEXT,
  brannalarmsystem TEXT,
  nodlyssystem TEXT,
  slokkesystem TEXT,
  roykluker BOOLEAN DEFAULT false,
  brannslanger BOOLEAN DEFAULT false,
  brannslukkere BOOLEAN DEFAULT false,
  forstehjelp BOOLEAN DEFAULT false,
  serviceavtale BOOLEAN DEFAULT false,
  serviceavtale_type TEXT,
  serviceavtale_pris DECIMAL(10,2),
  serviceavtale_dato DATE,
  neste_service DATE,
  siste_service DATE,
  notat TEXT,
  intern_notat TEXT,
  status TEXT DEFAULT 'Aktiv',
  skjult BOOLEAN DEFAULT false,
  dropbox_synced BOOLEAN DEFAULT false,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anlegg_company ON anlegg(company_id);
CREATE INDEX IF NOT EXISTS idx_anlegg_kunde ON anlegg(kundenr);
CREATE INDEX IF NOT EXISTS idx_anlegg_status ON anlegg(status);
CREATE INDEX IF NOT EXISTS idx_anlegg_skjult ON anlegg(skjult);

-- Kontaktpersoner
CREATE TABLE IF NOT EXISTS kontaktpersoner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  navn TEXT NOT NULL,
  epost TEXT,
  telefon TEXT,
  rolle TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kontaktpersoner_company ON kontaktpersoner(company_id);

-- Anlegg-Kontaktpersoner (junction table - ingen company_id nødvendig)
CREATE TABLE IF NOT EXISTS anlegg_kontaktpersoner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  kontaktperson_id UUID NOT NULL REFERENCES kontaktpersoner(id) ON DELETE CASCADE,
  primar BOOLEAN DEFAULT false,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(anlegg_id, kontaktperson_id)
);

CREATE INDEX IF NOT EXISTS idx_anlegg_kontakt_anlegg ON anlegg_kontaktpersoner(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_anlegg_kontakt_person ON anlegg_kontaktpersoner(kontaktperson_id);

-- Ansatte
CREATE TABLE IF NOT EXISTS ansatte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID REFERENCES auth.users(id),
  navn TEXT NOT NULL,
  epost TEXT,
  telefon TEXT,
  stilling TEXT,
  avdeling TEXT,
  aktiv BOOLEAN DEFAULT true,
  rolle TEXT DEFAULT 'bruker',
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ansatte_company ON ansatte(company_id);
CREATE INDEX IF NOT EXISTS idx_ansatte_user ON ansatte(user_id);

-- Ordre
CREATE TABLE IF NOT EXISTS ordre (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  kunde_id UUID REFERENCES customer(id) ON DELETE SET NULL,
  anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL,
  ordrenummer TEXT,
  tittel TEXT NOT NULL,
  beskrivelse TEXT,
  type TEXT DEFAULT 'Service',
  status TEXT DEFAULT 'Ny',
  prioritet TEXT DEFAULT 'Normal',
  ansvarlig_id UUID REFERENCES ansatte(id),
  planlagt_dato DATE,
  utfort_dato DATE,
  estimert_tid DECIMAL(5,2),
  faktisk_tid DECIMAL(5,2),
  pris DECIMAL(10,2),
  fakturert BOOLEAN DEFAULT false,
  faktura_dato DATE,
  notat TEXT,
  opprettet_av TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ordre_company ON ordre(company_id);
CREATE INDEX IF NOT EXISTS idx_ordre_kunde ON ordre(kunde_id);
CREATE INDEX IF NOT EXISTS idx_ordre_anlegg ON ordre(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_ordre_status ON ordre(status);

-- Servicerapporter
CREATE TABLE IF NOT EXISTS servicerapporter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL,
  ordre_id UUID REFERENCES ordre(id) ON DELETE SET NULL,
  anlegg_navn TEXT,
  rapport_dato DATE NOT NULL DEFAULT CURRENT_DATE,
  tekniker_navn TEXT NOT NULL,
  header TEXT,
  rapport_innhold TEXT,
  image_urls TEXT[],
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servicerapporter_company ON servicerapporter(company_id);
CREATE INDEX IF NOT EXISTS idx_servicerapporter_anlegg ON servicerapporter(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_servicerapporter_dato ON servicerapporter(rapport_dato);

-- Avvik
CREATE TABLE IF NOT EXISTS avvik (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  kunde_id UUID REFERENCES customer(id) ON DELETE SET NULL,
  anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL,
  tittel TEXT NOT NULL,
  beskrivelse TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT 'Sikkerhet',
  alvorlighetsgrad TEXT NOT NULL DEFAULT 'Lav',
  status TEXT NOT NULL DEFAULT 'Åpen',
  dato DATE NOT NULL DEFAULT CURRENT_DATE,
  registrert_av UUID REFERENCES ansatte(id) ON DELETE SET NULL,
  oppdaget_av TEXT,
  ansvarlig_for_lukking UUID REFERENCES ansatte(id) ON DELETE SET NULL,
  korrigerende_tiltak TEXT,
  forebyggende_tiltak TEXT,
  lukket_dato DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avvik_company ON avvik(company_id);
CREATE INDEX IF NOT EXISTS idx_avvik_anlegg ON avvik(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_avvik_status ON avvik(status);

-- Oppgaver
CREATE TABLE IF NOT EXISTS oppgaver (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  tittel TEXT NOT NULL,
  beskrivelse TEXT,
  status TEXT DEFAULT 'Åpen',
  prioritet TEXT DEFAULT 'Normal',
  frist DATE,
  ansvarlig_id UUID REFERENCES ansatte(id),
  kunde_id UUID REFERENCES customer(id) ON DELETE SET NULL,
  anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL,
  ordre_id UUID REFERENCES ordre(id) ON DELETE SET NULL,
  mote_id UUID,
  fullfort_dato TIMESTAMPTZ,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oppgaver_company ON oppgaver(company_id);
CREATE INDEX IF NOT EXISTS idx_oppgaver_status ON oppgaver(status);
CREATE INDEX IF NOT EXISTS idx_oppgaver_ansvarlig ON oppgaver(ansvarlig_id);

-- Anlegg TODOs
CREATE TABLE IF NOT EXISTS anlegg_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  tekst TEXT NOT NULL,
  fullfort BOOLEAN DEFAULT false,
  prioritet TEXT DEFAULT 'normal',
  frist DATE,
  opprettet_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  fullfort_dato TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_anlegg_todos_anlegg ON anlegg_todos(anlegg_id);

-- ============================================
-- MØTER OG PROSJEKTER
-- ============================================

-- Møter
CREATE TABLE IF NOT EXISTS moter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  tittel TEXT NOT NULL,
  beskrivelse TEXT,
  dato DATE NOT NULL,
  starttid TIME,
  sluttid TIME,
  sted TEXT,
  type TEXT DEFAULT 'Internt',
  status TEXT DEFAULT 'Planlagt',
  opprettet_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moter_company ON moter(company_id);
CREATE INDEX IF NOT EXISTS idx_moter_dato ON moter(dato);

-- Møte deltakere
CREATE TABLE IF NOT EXISTS mote_deltakere (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mote_id UUID NOT NULL REFERENCES moter(id) ON DELETE CASCADE,
  ansatt_id UUID REFERENCES ansatte(id) ON DELETE CASCADE,
  ekstern_navn TEXT,
  ekstern_epost TEXT,
  status TEXT DEFAULT 'Invitert',
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

-- Møte agendapunkter
CREATE TABLE IF NOT EXISTS mote_agendapunkter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mote_id UUID NOT NULL REFERENCES moter(id) ON DELETE CASCADE,
  tittel TEXT NOT NULL,
  beskrivelse TEXT,
  rekkefolge INTEGER DEFAULT 0,
  varighet_minutter INTEGER,
  ansvarlig_id UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

-- Møte oppgaver
CREATE TABLE IF NOT EXISTS mote_oppgaver (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mote_id UUID NOT NULL REFERENCES moter(id) ON DELETE CASCADE,
  oppgave_id UUID REFERENCES oppgaver(id) ON DELETE CASCADE,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

-- Møte referater
CREATE TABLE IF NOT EXISTS mote_referater (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mote_id UUID NOT NULL REFERENCES moter(id) ON DELETE CASCADE,
  innhold TEXT,
  opprettet_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

-- Prosjekter
CREATE TABLE IF NOT EXISTS prosjekter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  navn TEXT NOT NULL,
  beskrivelse TEXT,
  kunde_id UUID REFERENCES customer(id),
  anlegg_id UUID REFERENCES anlegg(id),
  status TEXT DEFAULT 'Planlagt',
  startdato DATE,
  sluttdato DATE,
  budsjett DECIMAL(12,2),
  prosjektleder_id UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prosjekter_company ON prosjekter(company_id);

-- Prosjekteringer
CREATE TABLE IF NOT EXISTS prosjekteringer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  prosjekt_id UUID REFERENCES prosjekter(id),
  kunde_id UUID REFERENCES customer(id),
  anlegg_id UUID REFERENCES anlegg(id),
  tittel TEXT NOT NULL,
  beskrivelse TEXT,
  type TEXT,
  status TEXT DEFAULT 'Utkast',
  opprettet_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prosjekteringer_company ON prosjekteringer(company_id);

-- Prosjektering risikoanalyse
CREATE TABLE IF NOT EXISTS prosjektering_risikoanalyse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjektering_id UUID NOT NULL REFERENCES prosjekteringer(id) ON DELETE CASCADE,
  risiko TEXT NOT NULL,
  sannsynlighet INTEGER,
  konsekvens INTEGER,
  tiltak TEXT,
  ansvarlig TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

-- Prosjektering systemplan
CREATE TABLE IF NOT EXISTS prosjektering_systemplan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjektering_id UUID NOT NULL REFERENCES prosjekteringer(id) ON DELETE CASCADE,
  komponent TEXT NOT NULL,
  beskrivelse TEXT,
  antall INTEGER,
  plassering TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SALG
-- ============================================

-- Salgs leads
CREATE TABLE IF NOT EXISTS salgs_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  firmanavn TEXT NOT NULL,
  kontaktperson TEXT,
  epost TEXT,
  telefon TEXT,
  adresse TEXT,
  postnr TEXT,
  poststed TEXT,
  org_nummer TEXT,
  kilde TEXT,
  status TEXT DEFAULT 'Ny',
  verdi DECIMAL(12,2),
  sannsynlighet INTEGER,
  forventet_lukking DATE,
  ansvarlig_id UUID REFERENCES ansatte(id),
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salgs_leads_company ON salgs_leads(company_id);
CREATE INDEX IF NOT EXISTS idx_salgs_leads_status ON salgs_leads(status);

-- Salgs leads kommentarer
CREATE TABLE IF NOT EXISTS salgs_leads_kommentarer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES salgs_leads(id) ON DELETE CASCADE,
  kommentar TEXT NOT NULL,
  opprettet_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DOKUMENTER OG RAPPORTER
-- ============================================

-- Dokumenter
CREATE TABLE IF NOT EXISTS dokumenter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID REFERENCES anlegg(id) ON DELETE CASCADE,
  kunde_id UUID REFERENCES customer(id) ON DELETE SET NULL,
  navn TEXT NOT NULL,
  filnavn TEXT,
  filtype TEXT,
  filstorrelse INTEGER,
  storage_path TEXT,
  kategori TEXT,
  beskrivelse TEXT,
  opprettet_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dokumenter_company ON dokumenter(company_id);
CREATE INDEX IF NOT EXISTS idx_dokumenter_anlegg ON dokumenter(anlegg_id);

-- Rapporter
CREATE TABLE IF NOT EXISTS rapporter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL,
  kunde_id UUID REFERENCES customer(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  tittel TEXT,
  innhold TEXT,
  status TEXT DEFAULT 'Utkast',
  opprettet_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rapporter_company ON rapporter(company_id);

-- Hendelser
CREATE TABLE IF NOT EXISTS hendelser (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  beskrivelse TEXT,
  dato TIMESTAMPTZ DEFAULT NOW(),
  registrert_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hendelser_company ON hendelser(company_id);
CREATE INDEX IF NOT EXISTS idx_hendelser_anlegg ON hendelser(anlegg_id);
