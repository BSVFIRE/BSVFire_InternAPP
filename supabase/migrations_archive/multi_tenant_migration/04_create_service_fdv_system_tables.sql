-- ============================================
-- STEG 4: Serviceavtaler, Priser, FDV og System-tabeller
-- Kjør dette ETTER steg 3
-- ============================================

-- ============================================
-- SERVICEAVTALER OG PRISER
-- ============================================

-- Serviceavtale Priser
CREATE TABLE IF NOT EXISTS serviceavtale_priser (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  navn TEXT NOT NULL,
  beskrivelse TEXT,
  pris DECIMAL(10,2),
  enhet TEXT DEFAULT 'stk',
  kategori TEXT,
  aktiv BOOLEAN DEFAULT true,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_serviceavtale_priser_company ON serviceavtale_priser(company_id);

-- Serviceavtale Tilbud
CREATE TABLE IF NOT EXISTS serviceavtale_tilbud (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  kunde_id UUID REFERENCES customer(id),
  anlegg_id UUID REFERENCES anlegg(id),
  tilbudsnummer TEXT,
  tittel TEXT,
  beskrivelse TEXT,
  total_pris DECIMAL(12,2),
  gyldig_til DATE,
  status TEXT DEFAULT 'Utkast',
  opprettet_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_serviceavtale_tilbud_company ON serviceavtale_tilbud(company_id);

-- Priser per kundenummer
CREATE TABLE IF NOT EXISTS priser_kundenummer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  kunde_id UUID REFERENCES customer(id),
  produkt TEXT NOT NULL,
  pris DECIMAL(10,2),
  rabatt_prosent DECIMAL(5,2),
  gyldig_fra DATE,
  gyldig_til DATE,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_priser_kundenummer_company ON priser_kundenummer(company_id);

-- Prishistorikk
CREATE TABLE IF NOT EXISTS prishistorikk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  produkt TEXT,
  gammel_pris DECIMAL(10,2),
  ny_pris DECIMAL(10,2),
  endret_av UUID REFERENCES ansatte(id),
  endret_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prishistorikk_company ON prishistorikk(company_id);

-- ============================================
-- FDV TABELLER
-- ============================================

-- FDV Leverandører
CREATE TABLE IF NOT EXISTS fdv_leverandorer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  navn TEXT NOT NULL,
  kontaktperson TEXT,
  epost TEXT,
  telefon TEXT,
  adresse TEXT,
  nettside TEXT,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fdv_leverandorer_company ON fdv_leverandorer(company_id);

-- FDV Produkttyper
CREATE TABLE IF NOT EXISTS fdv_produkttyper (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  navn TEXT NOT NULL,
  kategori TEXT,
  beskrivelse TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fdv_produkttyper_company ON fdv_produkttyper(company_id);

-- FDV Datablader
CREATE TABLE IF NOT EXISTS fdv_datablader (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  leverandor_id UUID REFERENCES fdv_leverandorer(id),
  produkttype_id UUID REFERENCES fdv_produkttyper(id),
  navn TEXT NOT NULL,
  beskrivelse TEXT,
  fil_url TEXT,
  fil_navn TEXT,
  versjon TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fdv_datablader_company ON fdv_datablader(company_id);

-- FDV Anlegg Datablader (kobling)
CREATE TABLE IF NOT EXISTS fdv_anlegg_datablader (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  datablad_id UUID NOT NULL REFERENCES fdv_datablader(id) ON DELETE CASCADE,
  antall INTEGER DEFAULT 1,
  plassering TEXT,
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fdv_anlegg_datablader_company ON fdv_anlegg_datablader(company_id);
CREATE INDEX IF NOT EXISTS idx_fdv_anlegg_datablader_anlegg ON fdv_anlegg_datablader(anlegg_id);

-- FDV Genererte Dokumenter
CREATE TABLE IF NOT EXISTS fdv_genererte_dokumenter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  fil_url TEXT,
  fil_navn TEXT,
  generert_av UUID REFERENCES ansatte(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fdv_genererte_company ON fdv_genererte_dokumenter(company_id);
CREATE INDEX IF NOT EXISTS idx_fdv_genererte_anlegg ON fdv_genererte_dokumenter(anlegg_id);

-- ============================================
-- KONTAKTPERSON EKSTERN
-- ============================================

CREATE TABLE IF NOT EXISTS kontaktperson_ekstern (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  navn TEXT NOT NULL,
  firma TEXT,
  epost TEXT,
  telefon TEXT,
  rolle TEXT,
  type TEXT DEFAULT 'ekstern',
  notat TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kontaktperson_ekstern_company ON kontaktperson_ekstern(company_id);

-- ============================================
-- SYSTEM OG LOGGING
-- ============================================

-- Epost Logg
CREATE TABLE IF NOT EXISTS epost_logg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  til TEXT NOT NULL,
  fra TEXT,
  emne TEXT,
  innhold TEXT,
  status TEXT DEFAULT 'Sendt',
  feilmelding TEXT,
  sendt_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epost_logg_company ON epost_logg(company_id);

-- System Logs
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  type TEXT NOT NULL,
  melding TEXT,
  detaljer JSONB,
  bruker_id UUID REFERENCES auth.users(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_company ON system_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON system_logs(type);

-- Knowledge Base (for AI)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  tittel TEXT NOT NULL,
  innhold TEXT,
  kategori TEXT,
  tags TEXT[],
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_company ON knowledge_base(company_id);

-- AI Embeddings (krever pgvector extension)
-- Kjør først: CREATE EXTENSION IF NOT EXISTS vector;
-- Hvis du ikke bruker AI/embeddings, kan du hoppe over denne tabellen

DO $$
BEGIN
  -- Sjekk om vector extension finnes
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS ai_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id),
        source_type TEXT NOT NULL,
        source_id UUID,
        content TEXT,
        embedding vector(1536),
        metadata JSONB,
        opprettet_dato TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_embeddings_company ON ai_embeddings(company_id);
    ';
  ELSE
    -- Opprett uten vector-kolonne
    CREATE TABLE IF NOT EXISTS ai_embeddings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id),
      source_type TEXT NOT NULL,
      source_id UUID,
      content TEXT,
      embedding TEXT, -- Lagres som TEXT hvis vector ikke er tilgjengelig
      metadata JSONB,
      opprettet_dato TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_embeddings_company ON ai_embeddings(company_id);
    RAISE NOTICE 'pgvector extension ikke funnet - ai_embeddings opprettet uten vector-type';
  END IF;
END $$;

-- Meldinger System
CREATE TABLE IF NOT EXISTS meldinger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  fra_bruker_id UUID REFERENCES auth.users(id),
  til_bruker_id UUID REFERENCES auth.users(id),
  emne TEXT,
  innhold TEXT NOT NULL,
  lest BOOLEAN DEFAULT false,
  lest_dato TIMESTAMPTZ,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meldinger_company ON meldinger(company_id);
CREATE INDEX IF NOT EXISTS idx_meldinger_til ON meldinger(til_bruker_id);

-- Dropbox Tokens
CREATE TABLE IF NOT EXISTS dropbox_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dropbox_tokens_company ON dropbox_tokens(company_id);
