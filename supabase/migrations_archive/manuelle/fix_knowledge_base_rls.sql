-- Fix RLS policies for knowledge_base table
-- Problemet: Authenticated users kan bare lese, ikke skrive
-- Løsning: Legg til INSERT, UPDATE og DELETE policies for authenticated users

-- Fjern eksisterende policies (hvis de finnes)
DROP POLICY IF EXISTS "Authenticated users can read knowledge base" ON knowledge_base;
DROP POLICY IF EXISTS "Service role can manage knowledge base" ON knowledge_base;

-- Opprett nye policies
-- Les: Alle autentiserte brukere kan lese
CREATE POLICY "Authenticated users can read knowledge base"
  ON knowledge_base FOR SELECT
  TO authenticated
  USING (true);

-- Skriv: Alle autentiserte brukere kan skrive (for admin-funksjoner)
CREATE POLICY "Authenticated users can insert knowledge base"
  ON knowledge_base FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update knowledge base"
  ON knowledge_base FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete knowledge base"
  ON knowledge_base FOR DELETE
  TO authenticated
  USING (true);

-- Service role har fortsatt full tilgang
CREATE POLICY "Service role can manage knowledge base"
  ON knowledge_base FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Samme for ai_embeddings tabell
DROP POLICY IF EXISTS "Authenticated users can read embeddings" ON ai_embeddings;
DROP POLICY IF EXISTS "Service role can manage embeddings" ON ai_embeddings;

CREATE POLICY "Authenticated users can read embeddings"
  ON ai_embeddings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert embeddings"
  ON ai_embeddings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update embeddings"
  ON ai_embeddings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete embeddings"
  ON ai_embeddings FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage embeddings"
  ON ai_embeddings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
