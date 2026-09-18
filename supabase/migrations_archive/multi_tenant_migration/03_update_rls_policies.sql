-- ============================================
-- STEG 3: Oppdater RLS-policies for multi-tenant
-- Kjør dette ETTER steg 2
-- ============================================

-- ============================================
-- Customer (kunder)
-- ============================================

DROP POLICY IF EXISTS "Alle kan lese customer" ON customer;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn customer" ON customer;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere customer" ON customer;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette customer" ON customer;

CREATE POLICY "Brukere kan lese egne kunder" ON customer
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan opprette kunder" ON customer
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Brukere kan oppdatere egne kunder" ON customer
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan slette egne kunder" ON customer
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Anlegg
-- ============================================

DROP POLICY IF EXISTS "Alle kan lese anlegg" ON anlegg;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn anlegg" ON anlegg;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere anlegg" ON anlegg;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette anlegg" ON anlegg;

CREATE POLICY "Brukere kan lese egne anlegg" ON anlegg
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan opprette anlegg" ON anlegg
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Brukere kan oppdatere egne anlegg" ON anlegg
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan slette egne anlegg" ON anlegg
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Kontaktpersoner
-- ============================================

DROP POLICY IF EXISTS "Alle kan lese kontaktpersoner" ON kontaktpersoner;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn kontaktpersoner" ON kontaktpersoner;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere kontaktpersoner" ON kontaktpersoner;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette kontaktpersoner" ON kontaktpersoner;

CREATE POLICY "Brukere kan lese egne kontaktpersoner" ON kontaktpersoner
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan opprette kontaktpersoner" ON kontaktpersoner
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Brukere kan oppdatere egne kontaktpersoner" ON kontaktpersoner
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan slette egne kontaktpersoner" ON kontaktpersoner
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Ansatte
-- ============================================

DROP POLICY IF EXISTS "Alle kan lese ansatte" ON ansatte;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn ansatte" ON ansatte;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere ansatte" ON ansatte;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette ansatte" ON ansatte;

CREATE POLICY "Brukere kan lese egne ansatte" ON ansatte
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan opprette ansatte" ON ansatte
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Brukere kan oppdatere egne ansatte" ON ansatte
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan slette egne ansatte" ON ansatte
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Ordre
-- ============================================

DROP POLICY IF EXISTS "Alle kan lese ordre" ON ordre;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn ordre" ON ordre;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere ordre" ON ordre;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette ordre" ON ordre;

CREATE POLICY "Brukere kan lese egne ordre" ON ordre
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan opprette ordre" ON ordre
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Brukere kan oppdatere egne ordre" ON ordre
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan slette egne ordre" ON ordre
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Servicerapporter
-- ============================================

DROP POLICY IF EXISTS "Alle kan lese servicerapporter" ON servicerapporter;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn servicerapporter" ON servicerapporter;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere servicerapporter" ON servicerapporter;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette servicerapporter" ON servicerapporter;

CREATE POLICY "Brukere kan lese egne servicerapporter" ON servicerapporter
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan opprette servicerapporter" ON servicerapporter
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Brukere kan oppdatere egne servicerapporter" ON servicerapporter
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan slette egne servicerapporter" ON servicerapporter
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Avvik
-- ============================================

DROP POLICY IF EXISTS "Alle kan lese avvik" ON avvik;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn avvik" ON avvik;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere avvik" ON avvik;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette avvik" ON avvik;

CREATE POLICY "Brukere kan lese egne avvik" ON avvik
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan opprette avvik" ON avvik
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Brukere kan oppdatere egne avvik" ON avvik
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan slette egne avvik" ON avvik
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Oppgaver
-- ============================================

DROP POLICY IF EXISTS "Alle kan lese oppgaver" ON oppgaver;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn oppgaver" ON oppgaver;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere oppgaver" ON oppgaver;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette oppgaver" ON oppgaver;

CREATE POLICY "Brukere kan lese egne oppgaver" ON oppgaver
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan opprette oppgaver" ON oppgaver
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Brukere kan oppdatere egne oppgaver" ON oppgaver
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Brukere kan slette egne oppgaver" ON oppgaver
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Legg til flere tabeller etter samme mønster...
-- ============================================

-- MERK: Du må gjenta dette for ALLE tabeller som har company_id
-- Bruk samme mønster:
-- 1. DROP gamle policies
-- 2. CREATE nye policies med company_id = get_user_company_id()
