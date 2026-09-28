-- Fjerner vektorindeksen på ai_embeddings.
--
-- Indeksen var en ivfflat med lists = 100, opprettet i samme skript som tabellen
-- – altså mens tabellen var tom. En ivfflat deler vektorene i lister ut fra
-- sentroider som beregnes av dataene som finnes når indeksen bygges; bygges den
-- på en tom tabell, blir inndelingen meningsløs.
--
-- Verre er størrelsen: 100 lister over 3315 rader gir ~33 rader per liste, og et
-- søk leter som standard i én liste (ivfflat.probes = 1). Søket vurderte dermed
-- rundt én prosent av kunnskapsbasen og valgte sine tre treff derfra. Det ga
-- ingen feilmelding – bare tilfeldig dårlige svar fra assistenten.
--
-- Ved denne datamengden er nøyaktig søk både raskere å ha med å gjøre og alltid
-- riktig: ~20 MB vektorer skannes på noen titalls millisekunder, mot ett–to
-- sekunder ventetid på språkmodellen uansett.
--
-- Vokser ai_embeddings forbi noen titusen rader, legg på en HNSW-indeks i stedet
-- (pgvector 0.5+). HNSW slipper ivfflats felle, siden den ikke må bygges på nytt
-- etter at dataene er lastet inn:
--
--   CREATE INDEX ai_embeddings_embedding_idx ON ai_embeddings
--     USING hnsw (embedding vector_cosine_ops);

DROP INDEX IF EXISTS ai_embeddings_embedding_idx;

-- Kontroll: skal nå gi like mange rader som tabellen har.
--   SELECT count(*) FROM ai_embeddings;
--   SELECT count(*) FROM match_embeddings(
--     (SELECT embedding FROM ai_embeddings LIMIT 1), 0, 100000);
