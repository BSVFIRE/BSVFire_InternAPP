-- Vektorsøket som AI-assistenten bygger på.
--
-- Funksjonen ble i sin tid opprettet direkte i databasen og fantes ikke i repoet –
-- bare beskrevet i docs/AI_ASSISTANT_ARCHITECTURE.md. Måtte databasen gjenskapes,
-- ville `ai-chat` sluttet å virke uten at noen visste hvordan den hadde sett ut.
--
-- Definisjonen under er hentet ut av produksjonsbasen med pg_get_functiondef og
-- er tatt inn ordrett. Å kjøre denne på en base som allerede har funksjonen
-- endrer ingenting; den er her for gjenoppretting og for at endringer skal kunne
-- spores i git.
--
-- Kalles fra supabase/functions/ai-chat/index.ts med threshold 0.7 og count 3.

CREATE OR REPLACE FUNCTION public.match_embeddings(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  content text,
  metadata jsonb,
  table_name text,
  record_id uuid,
  similarity double precision
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ai_embeddings.id,
    ai_embeddings.content,
    ai_embeddings.metadata,
    ai_embeddings.table_name,
    ai_embeddings.record_id,
    1 - (ai_embeddings.embedding <=> query_embedding) AS similarity
  FROM ai_embeddings
  WHERE 1 - (ai_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY ai_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

COMMENT ON FUNCTION public.match_embeddings(vector, double precision, integer) IS
  'Cosinus-likhetssøk i ai_embeddings. Brukes av ai-chat. Definisjonen er hentet fra produksjon 28.09.2026.';
