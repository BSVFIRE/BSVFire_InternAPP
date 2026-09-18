-- Opprett storage bucket for PDF-filer
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base-pdfs', 'knowledge-base-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Sett opp policies for storage bucket
-- Authenticated users kan laste opp PDFs
CREATE POLICY "Authenticated users can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'knowledge-base-pdfs');

-- Authenticated users kan lese PDFs
CREATE POLICY "Authenticated users can read PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'knowledge-base-pdfs');

-- Authenticated users kan slette PDFs
CREATE POLICY "Authenticated users can delete PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'knowledge-base-pdfs');

-- Service role har full tilgang
CREATE POLICY "Service role can manage PDFs"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'knowledge-base-pdfs')
WITH CHECK (bucket_id = 'knowledge-base-pdfs');
