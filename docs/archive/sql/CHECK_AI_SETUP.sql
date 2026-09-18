-- Sjekk om ai_embeddings tabell finnes
SELECT COUNT(*) as total_embeddings FROM ai_embeddings;

-- Sjekk om match_embeddings funksjon finnes
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'match_embeddings';

-- Sjekk noen eksempel embeddings
SELECT table_name, COUNT(*) as count 
FROM ai_embeddings 
GROUP BY table_name;
