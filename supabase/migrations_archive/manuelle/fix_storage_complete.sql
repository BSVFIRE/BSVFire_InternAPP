-- STEG 1: Fjern ALLE eksisterende policies på storage.objects for anlegg.dokumenter
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- STEG 2: Opprett nye, enkle policies for anlegg.dokumenter bucket
-- Les-tilgang
CREATE POLICY "Allow authenticated read access to anlegg.dokumenter"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'anlegg.dokumenter');

-- Skriv-tilgang (INSERT)
CREATE POLICY "Allow authenticated insert access to anlegg.dokumenter"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'anlegg.dokumenter');

-- Oppdater-tilgang
CREATE POLICY "Allow authenticated update access to anlegg.dokumenter"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'anlegg.dokumenter')
WITH CHECK (bucket_id = 'anlegg.dokumenter');

-- Slett-tilgang
CREATE POLICY "Allow authenticated delete access to anlegg.dokumenter"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'anlegg.dokumenter');

-- STEG 3: Verifiser at policies er opprettet
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;
