-- ============================================
-- STEG 1: Opprett companies-tabell
-- Kjør dette FØRST i nytt Supabase-prosjekt
-- ============================================

-- Companies tabell - hovedtabell for alle selskaper
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  navn TEXT NOT NULL,
  org_nr TEXT UNIQUE,
  epost TEXT,
  telefon TEXT,
  adresse TEXT,
  postnr TEXT,
  poststed TEXT,
  logo_url TEXT,
  aktiv BOOLEAN DEFAULT true,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks for raskere oppslag
CREATE INDEX IF NOT EXISTS idx_companies_org_nr ON companies(org_nr);
CREATE INDEX IF NOT EXISTS idx_companies_aktiv ON companies(aktiv);

-- ============================================
-- User-Company mapping tabell
-- Kobler brukere til selskaper
-- MÅ opprettes FØR RLS-policies som refererer til den
-- ============================================

CREATE TABLE IF NOT EXISTS user_company_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rolle TEXT DEFAULT 'bruker', -- 'admin', 'bruker', 'leser'
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_company_user ON user_company_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_company ON user_company_mapping(company_id);

-- ============================================
-- Hjelpefunksjon for å hente brukerens company_id
-- MÅ opprettes FØR RLS-policies som bruker den
-- ============================================

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id 
  FROM user_company_mapping 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- RLS for companies (nå kan vi referere til user_company_mapping)
-- ============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brukere kan se eget selskap" ON companies
  FOR SELECT USING (
    id = get_user_company_id()
  );

-- ============================================
-- RLS for user_company_mapping
-- ============================================

ALTER TABLE user_company_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brukere kan se egen mapping" ON user_company_mapping
  FOR SELECT USING (user_id = auth.uid());

-- ============================================
-- Sett inn BSVFire som første selskap
-- ============================================

INSERT INTO companies (navn, org_nr, epost, telefon, adresse, postnr, poststed)
VALUES (
  'Brannteknisk Service og Vedlikehold AS',
  '921044879',
  'mail@bsvfire.no',
  '900 46 600',
  'Sælenveien 44',
  '5151',
  'Straumsgrend'
);

-- Vis company_id for BSVFire (du trenger denne for neste steg)
SELECT id, navn, org_nr FROM companies WHERE org_nr = '921044879';
