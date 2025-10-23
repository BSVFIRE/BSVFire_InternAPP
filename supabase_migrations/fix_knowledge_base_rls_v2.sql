-- Fix RLS policies for knowledge_base table (v2 - safe version)
-- Denne versjonen dropper først alle policies før den oppretter nye

-- Drop alle eksisterende policies for knowledge_base
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'knowledge_base') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON knowledge_base';
    END LOOP;
END $$;

-- Opprett nye policies for knowledge_base
CREATE POLICY "Authenticated users can read knowledge base"
  ON knowledge_base FOR SELECT
  TO authenticated
  USING (true);

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

CREATE POLICY "Service role can manage knowledge base"
  ON knowledge_base FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drop alle eksisterende policies for ai_embeddings
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'ai_embeddings') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ai_embeddings';
    END LOOP;
END $$;

-- Opprett nye policies for ai_embeddings
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
