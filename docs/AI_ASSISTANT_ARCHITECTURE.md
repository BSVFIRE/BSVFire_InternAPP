# AI-assistent - Arkitektur og Dataflyt

## 🏗️ Systemarkitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              AIChat Component                            │  │
│  │  - Chat UI                                               │  │
│  │  - Message history                                       │  │
│  │  - Input handling                                        │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│                       │ HTTP POST /ai-chat                      │
│                       │ { query: "Finn kunder i Oslo" }         │
└───────────────────────┼─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SUPABASE EDGE FUNCTION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Motta spørsmål fra bruker                           │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  2. Generer embedding av spørsmål                        │  │
│  │     → OpenAI text-embedding-ada-002                      │  │
│  │     → Returnerer vektor[1536]                            │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  3. Søk i pgvector database                              │  │
│  │     → match_embeddings(query_embedding)                  │  │
│  │     → Returnerer topp 5 mest relevante matches           │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  4. Bygg kontekst fra matches                            │  │
│  │     → Kombiner content fra alle matches                  │  │
│  │     → Legg til metadata og relevans-score                │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  5. Send til LLM (GPT-4)                                 │  │
│  │     → System prompt + kontekst + bruker-spørsmål         │  │
│  │     → Generer naturlig språk-svar                        │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  6. Returner svar til frontend                           │  │
│  │     { answer: "...", sources: [...] }                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE DATABASE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ai_embeddings (pgvector)                                │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ id          UUID                                   │  │  │
│  │  │ content     TEXT                                   │  │  │
│  │  │ embedding   VECTOR(1536)  ← Søkes her             │  │  │
│  │  │ table_name  TEXT                                   │  │  │
│  │  │ record_id   UUID                                   │  │  │
│  │  │ metadata    JSONB                                  │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Eksisterende tabeller                                   │  │
│  │  - kunder                                                │  │
│  │  - anlegg                                                │  │
│  │  - kontaktpersoner                                       │  │
│  │  - dokumenter                                            │  │
│  │  - servicerapporter                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OPENAI API                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  text-embedding-ada-002                                  │  │
│  │  - Konverterer tekst til vektor[1536]                   │  │
│  │  - $0.0001 per 1K tokens                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  gpt-4-turbo-preview                                     │  │
│  │  - Genererer svar basert på kontekst                     │  │
│  │  - $0.01 per 1K input tokens                             │  │
│  │  - $0.03 per 1K output tokens                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Dataflyt - Detaljert

### 1. Bruker Stiller Spørsmål

```typescript
// Frontend: AIChat.tsx
const handleSubmit = async (e: React.FormEvent) => {
  const { data } = await supabase.functions.invoke('ai-chat', {
    body: { query: "Finn alle kunder i Oslo" }
  })
}
```

**Data sendt:**
```json
{
  "query": "Finn alle kunder i Oslo"
}
```

---

### 2. Edge Function Mottar Spørsmål

```typescript
// Edge Function: ai-chat/index.ts
const { query } = await req.json()
// query = "Finn alle kunder i Oslo"
```

---

### 3. Generer Embedding

```typescript
const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  body: JSON.stringify({
    model: 'text-embedding-ada-002',
    input: query,
  }),
})

const queryEmbedding = embeddingData.data[0].embedding
// queryEmbedding = [0.123, -0.456, 0.789, ..., 0.321] (1536 tall)
```

**Hva skjer:**
- OpenAI konverterer teksten til en matematisk representasjon
- Vektoren fanger semantisk betydning av spørsmålet
- Lignende spørsmål får lignende vektorer

---

### 4. Søk i pgvector

```typescript
const { data: matches } = await supabaseClient.rpc('match_embeddings', {
  query_embedding: queryEmbedding,
  match_threshold: 0.7,
  match_count: 5,
})
```

**SQL-funksjon:**
```sql
SELECT
  content,
  table_name,
  record_id,
  1 - (embedding <=> query_embedding) AS similarity
FROM ai_embeddings
WHERE 1 - (embedding <=> query_embedding) > 0.7
ORDER BY embedding <=> query_embedding
LIMIT 5;
```

**Resultat:**
```json
[
  {
    "content": "Kunde: Telenor Norge AS\nAdresse: Snarøyveien 30, 1360 Fornebu",
    "table_name": "kunder",
    "record_id": "123e4567-e89b-12d3-a456-426614174000",
    "similarity": 0.92
  },
  {
    "content": "Kunde: DNB Bank ASA\nAdresse: Dronning Eufemias gate 30, 0191 Oslo",
    "table_name": "kunder",
    "record_id": "223e4567-e89b-12d3-a456-426614174001",
    "similarity": 0.89
  },
  ...
]
```

**Hva skjer:**
- pgvector sammenligner query-vektoren med alle lagrede vektorer
- Bruker cosine similarity (0-1, hvor 1 = identisk)
- Returnerer kun matches over threshold (0.7)
- Sorterer etter relevans

---

### 5. Bygg Kontekst

```typescript
const context = matches
  .map((match) => `[${match.table_name}] ${match.content}`)
  .join('\n\n')

// context = 
// "[kunder] Kunde: Telenor Norge AS\nAdresse: Snarøyveien 30, 1360 Fornebu
//  
//  [kunder] Kunde: DNB Bank ASA\nAdresse: Dronning Eufemias gate 30, 0191 Oslo
//  
//  ..."
```

---

### 6. Send til GPT-4

```typescript
const completion = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  body: JSON.stringify({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `Du er en AI-assistent for BSV Fire AS.
        
Relevant informasjon fra databasen:
${context}`
      },
      {
        role: 'user',
        content: query
      }
    ],
    temperature: 0.7,
    max_tokens: 800,
  }),
})
```

**GPT-4 mottar:**
```
System: Du er en AI-assistent for BSV Fire AS.

Relevant informasjon fra databasen:
[kunder] Kunde: Telenor Norge AS
Adresse: Snarøyveien 30, 1360 Fornebu

[kunder] Kunde: DNB Bank ASA
Adresse: Dronning Eufemias gate 30, 0191 Oslo

User: Finn alle kunder i Oslo
```

**GPT-4 genererer:**
```
Jeg fant 2 kunder i Oslo-området:

1. **Telenor Norge AS**
   - Adresse: Snarøyveien 30, 1360 Fornebu
   
2. **DNB Bank ASA**
   - Adresse: Dronning Eufemias gate 30, 0191 Oslo

Ønsker du mer informasjon om noen av disse?
```

---

### 7. Returner til Frontend

```typescript
return new Response(
  JSON.stringify({
    answer: completionData.choices[0].message.content,
    sources: matches.map(m => ({
      table: m.table_name,
      id: m.record_id,
      similarity: m.similarity
    }))
  })
)
```

**Frontend mottar:**
```json
{
  "answer": "Jeg fant 2 kunder i Oslo-området:\n\n1. **Telenor Norge AS**...",
  "sources": [
    { "table": "kunder", "id": "123...", "similarity": 0.92 },
    { "table": "kunder", "id": "223...", "similarity": 0.89 }
  ]
}
```

---

## 🔍 Hvordan pgvector Fungerer

### Cosine Similarity

```
Spørsmål:  [0.8, 0.2, 0.5]
Dokument1: [0.9, 0.1, 0.4]  → Similarity: 0.98 ✅ Veldig lik
Dokument2: [0.1, 0.9, 0.1]  → Similarity: 0.35 ❌ Ikke lik
```

**Visualisering:**
```
         Dokument1
            ↗
           /  (liten vinkel = høy similarity)
          /
Spørsmål ●
          \
           \  (stor vinkel = lav similarity)
            ↘
         Dokument2
```

### IVFFlat Index

```
┌─────────────────────────────────────┐
│  IVFFlat Index (lists = 100)        │
├─────────────────────────────────────┤
│                                     │
│  Cluster 1: [Kunder i Oslo]        │
│    - Telenor                        │
│    - DNB                            │
│    - ...                            │
│                                     │
│  Cluster 2: [Kunder i Bergen]      │
│    - Equinor                        │
│    - ...                            │
│                                     │
│  Cluster 3: [Anlegg - Brannalarm]  │
│    - ...                            │
│                                     │
└─────────────────────────────────────┘
```

**Fordel:**
- Rask søk (kun søker i relevante clusters)
- Skalerer til millioner av vektorer

---

## 📊 Ytelse og Skalerbarhet

### Responstider

```
┌──────────────────────────┬──────────┐
│ Operasjon                │ Tid      │
├──────────────────────────┼──────────┤
│ Generer query embedding  │ 100ms    │
│ pgvector søk (1000 docs) │ 50ms     │
│ pgvector søk (10k docs)  │ 150ms    │
│ pgvector søk (100k docs) │ 500ms    │
│ GPT-4 generering         │ 2000ms   │
├──────────────────────────┼──────────┤
│ Total (typisk)           │ 2-3s     │
└──────────────────────────┴──────────┘
```

### Skalerbarhet

**Antall embeddings:**
- 1,000: Ingen problem
- 10,000: Fungerer bra
- 100,000: Trenger optimalisering (øk lists)
- 1,000,000+: Vurder sharding

**Optimalisering:**
```sql
-- Øk antall clusters for bedre ytelse
CREATE INDEX ai_embeddings_embedding_idx 
ON ai_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 1000);  -- Øk fra 100 til 1000
```

---

## 🔐 Sikkerhet

### Row Level Security (RLS)

```sql
-- Brukere kan kun se egne data
CREATE POLICY "Users see own data"
  ON ai_embeddings FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM kunder WHERE id = record_id
    )
  );
```

### API-nøkler

```
❌ ALDRI hardkode:
const OPENAI_KEY = "sk-..."

✅ Bruk miljøvariabler:
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')
```

### Rate Limiting

```typescript
// Begrens til 10 spørringer per minutt per bruker
const rateLimiter = new Map<string, number[]>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userRequests = rateLimiter.get(userId) || []
  
  // Fjern requests eldre enn 1 minutt
  const recentRequests = userRequests.filter(t => now - t < 60000)
  
  if (recentRequests.length >= 10) {
    return false // Rate limit exceeded
  }
  
  recentRequests.push(now)
  rateLimiter.set(userId, recentRequests)
  return true
}
```

---

## 🎯 Best Practices

### 1. Chunk Store Dokumenter

❌ **Dårlig:** Lagre hele 50-siders rapport som én embedding
✅ **Bra:** Del opp i mindre chunks (500-1000 ord)

```typescript
function chunkDocument(text: string, chunkSize: number = 1000): string[] {
  const words = text.split(' ')
  const chunks: string[] = []
  
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '))
  }
  
  return chunks
}
```

### 2. Oppdater Embeddings Regelmessig

```typescript
// Trigger ved endringer
CREATE TRIGGER update_embedding_on_change
AFTER UPDATE ON kunder
FOR EACH ROW
EXECUTE FUNCTION queue_embedding_update();
```

### 3. Caching

```typescript
// Cache embeddings for vanlige spørsmål
const embeddingCache = new Map<string, number[]>()

function getCachedEmbedding(text: string): number[] | null {
  return embeddingCache.get(text) || null
}
```

### 4. Monitoring

```typescript
// Logg ytelse
await supabase.from('ai_performance_logs').insert({
  query,
  embedding_time_ms: embeddingTime,
  search_time_ms: searchTime,
  llm_time_ms: llmTime,
  total_time_ms: totalTime,
  tokens_used: tokensUsed,
})
```

---

## 📚 Videre Lesning

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Spørsmål om arkitekturen?** Kontakt erik.skille@bsvfire.no
