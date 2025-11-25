-- Fiks RLS (Row Level Security) tillatelser for røykluker
-- Kjør denne SQL-en i Supabase SQL Editor

-- Først, sjekk om RLS er aktivert
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('roykluke_sentraler', 'roykluke_luker');

-- Gi tillatelser for roykluke_luker tabellen
-- Slett eksisterende policies hvis de finnes
DROP POLICY IF EXISTS "Alle kan lese røykluker" ON roykluke_luker;
DROP POLICY IF EXISTS "Autentiserte brukere kan opprette røykluker" ON roykluke_luker;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere røykluker" ON roykluke_luker;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette røykluker" ON roykluke_luker;

-- Opprett nye policies
-- Les tilgang for alle autentiserte brukere
CREATE POLICY "Alle kan lese røykluker" ON roykluke_luker
    FOR SELECT
    TO authenticated
    USING (true);

-- Opprett tilgang for autentiserte brukere
CREATE POLICY "Autentiserte brukere kan opprette røykluker" ON roykluke_luker
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Oppdater tilgang for autentiserte brukere
CREATE POLICY "Autentiserte brukere kan oppdatere røykluker" ON roykluke_luker
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Slett tilgang for autentiserte brukere
CREATE POLICY "Autentiserte brukere kan slette røykluker" ON roykluke_luker
    FOR DELETE
    TO authenticated
    USING (true);

-- Gjør det samme for roykluke_sentraler hvis nødvendig
DROP POLICY IF EXISTS "Alle kan lese røykluker sentraler" ON roykluke_sentraler;
DROP POLICY IF EXISTS "Autentiserte brukere kan opprette røykluker sentraler" ON roykluke_sentraler;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere røykluker sentraler" ON roykluke_sentraler;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette røykluker sentraler" ON roykluke_sentraler;

CREATE POLICY "Alle kan lese røykluker sentraler" ON roykluke_sentraler
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Autentiserte brukere kan opprette røykluker sentraler" ON roykluke_sentraler
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Autentiserte brukere kan oppdatere røykluker sentraler" ON roykluke_sentraler
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Autentiserte brukere kan slette røykluker sentraler" ON roykluke_sentraler
    FOR DELETE
    TO authenticated
    USING (true);
