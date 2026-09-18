-- Legg til storage policies for servicerapport-bilder
-- Disse bildene lagres i anlegg.dokumenter bucket under anlegg/{anlegg_id}/servicerapporter/

-- Fjern eksisterende policies først hvis de finnes
DROP POLICY IF EXISTS "Authenticated users can upload servicerapport images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read servicerapport images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete servicerapport images" ON storage.objects;

-- Gi autentiserte brukere lov til å laste opp bilder til servicerapporter-mappen
CREATE POLICY "Authenticated users can upload servicerapport images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'anlegg.dokumenter' 
  AND (storage.foldername(name))[1] = 'anlegg'
  AND (storage.foldername(name))[3] = 'servicerapporter'
);

-- Gi autentiserte brukere lov til å lese servicerapport-bilder
CREATE POLICY "Authenticated users can read servicerapport images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'anlegg.dokumenter'
  AND (storage.foldername(name))[1] = 'anlegg'
  AND (storage.foldername(name))[3] = 'servicerapporter'
);

-- Gi autentiserte brukere lov til å slette servicerapport-bilder
CREATE POLICY "Authenticated users can delete servicerapport images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'anlegg.dokumenter'
  AND (storage.foldername(name))[1] = 'anlegg'
  AND (storage.foldername(name))[3] = 'servicerapporter'
);
