-- Fjern eksisterende policies
DROP POLICY IF EXISTS "Authenticated users can upload servicerapport images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read servicerapport images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete servicerapport images" ON storage.objects;

-- Enkel policy: Gi autentiserte brukere full tilgang til anlegg.dokumenter bucket
-- Dette er trygt siden alle brukere er autentiserte ansatte

-- Les-tilgang til alle filer i anlegg.dokumenter
CREATE POLICY "Authenticated users can read anlegg dokumenter"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'anlegg.dokumenter');

-- Skriv-tilgang til alle filer i anlegg.dokumenter
CREATE POLICY "Authenticated users can upload anlegg dokumenter"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'anlegg.dokumenter');

-- Slett-tilgang til alle filer i anlegg.dokumenter
CREATE POLICY "Authenticated users can delete anlegg dokumenter"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'anlegg.dokumenter');

-- Oppdater-tilgang til alle filer i anlegg.dokumenter
CREATE POLICY "Authenticated users can update anlegg dokumenter"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'anlegg.dokumenter')
WITH CHECK (bucket_id = 'anlegg.dokumenter');
