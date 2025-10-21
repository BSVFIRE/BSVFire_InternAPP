-- FIX: Feil i RLS policy for anleggsdata_nodlys
-- Problemet: En policy refererer til "anleatte.bruker_id" i stedet for "anlegg.bruker_id"
-- Dette forårsaker at siden crasher i produksjon

-- Først: Vis alle eksisterende policies for anleggsdata_nodlys
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'anleggsdata_nodlys';

-- Drop alle eksisterende policies (inkludert duplikater)
DROP POLICY IF EXISTS "Autentiserte brukere kan se nødlys" ON anleggsdata_nodlys;
DROP POLICY IF EXISTS "Autentiserte brukere kan legge til nødlys" ON anleggsdata_nodlys;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere nødlys" ON anleggsdata_nodlys;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette nødlys" ON anleggsdata_nodlys;
DROP POLICY IF EXISTS "Alle kan lese anleggsdata_nodlys" ON anleggsdata_nodlys;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn anleggsdata_nodlys" ON anleggsdata_nodlys;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere anleggsdata_nodlys" ON anleggsdata_nodlys;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette anleggsdata_nodlys" ON anleggsdata_nodlys;
DROP POLICY IF EXISTS "Users can view anleggsdata_nodlys" ON anleggsdata_nodlys;
DROP POLICY IF EXISTS "Users can insert anleggsdata_nodlys" ON anleggsdata_nodlys;
DROP POLICY IF EXISTS "Users can update anleggsdata_nodlys" ON anleggsdata_nodlys;
DROP POLICY IF EXISTS "Users can delete anleggsdata_nodlys" ON anleggsdata_nodlys;

-- Opprett nye, korrekte policies
CREATE POLICY "Alle kan lese anleggsdata_nodlys" 
ON anleggsdata_nodlys 
FOR SELECT 
USING (true);

CREATE POLICY "Autentiserte brukere kan sette inn anleggsdata_nodlys" 
ON anleggsdata_nodlys 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autentiserte brukere kan oppdatere anleggsdata_nodlys" 
ON anleggsdata_nodlys 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autentiserte brukere kan slette anleggsdata_nodlys" 
ON anleggsdata_nodlys 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Verifiser at policies er opprettet korrekt
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'anleggsdata_nodlys';
