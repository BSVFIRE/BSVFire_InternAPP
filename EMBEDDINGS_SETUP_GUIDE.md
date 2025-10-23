# Embeddings Setup Guide 🚀

## 📋 Hva Er Embeddings?

**Embeddings** er matematiske representasjoner av tekst som lar AI-en forstå betydning og sammenheng.

**Eksempel:**
```
"Telenor i Oslo" → [0.123, -0.456, 0.789, ..., 0.321] (1536 tall)
"DNB i Oslo"     → [0.125, -0.450, 0.790, ..., 0.318] (lignende tall)
```

AI-en kan da finne at disse er relaterte fordi vektorene er like!

---

## ✅ Steg 1: Sett Opp Database (5 min)

### Gå til Supabase SQL Editor

1. Åpne Supabase Dashboard
2. Klikk "SQL Editor" i venstre meny
3. Klikk "New Query"

### Kjør Denne SQL-en

```sql
-- 1. Aktiver pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Opprett tabell for embeddings
CREATE TABLE ai_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indeks for rask vektorsøk
CREATE INDEX ai_embeddings_embedding_idx 
ON ai_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Indeks for tabell-lookup
CREATE INDEX ai_embeddings_table_record_idx 
ON ai_embeddings (table_name, record_id);

-- 5. RLS policies
ALTER TABLE ai_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read embeddings"
  ON ai_embeddings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage embeddings"
  ON ai_embeddings FOR ALL
  TO service_role
  USING (true);

-- 6. Funksjon for å søke i embeddings
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  table_name TEXT,
  record_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
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
$$;
```

**Klikk "Run"**

Du skal få: `Success. No rows returned`

✅ **Database klar!**

---

## ✅ Steg 2: Konfigurer Embedding-Script (5 min)

### Åpne `scripts/generate-embeddings.ts`

Fyll ut disse verdiene øverst i filen:

```typescript
// 1. SUPABASE_URL
const SUPABASE_URL = 'https://din-project.supabase.co'
// Finn: Supabase Dashboard → Settings → API → Project URL

// 2. SUPABASE_SERVICE_KEY
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
// Finn: Supabase Dashboard → Settings → API → service_role key (secret!)

// 3. AZURE_ENDPOINT
const AZURE_ENDPOINT = 'https://bsvfire-openai.openai.azure.com/'
// Finn: Azure Portal → Din OpenAI ressurs → Keys and Endpoint

// 4. AZURE_KEY
const AZURE_KEY = 'abc123...'
// Finn: Azure Portal → Din OpenAI ressurs → Keys and Endpoint → KEY 1
```

**⚠️ VIKTIG:** Ikke commit service_role key til Git!

---

## ✅ Steg 3: Installer Dependencies (1 min)

```bash
cd /Users/eriksebastianskille/Documents/Firebase_BSVFire

# Installer tsx (for å kjøre TypeScript)
npm install -D tsx
```

---

## ✅ Steg 4: Kjør Embedding-Generering (5-10 min)

```bash
npx tsx scripts/generate-embeddings.ts
```

**Du vil se:**

```
🚀 Starter embedding-generering...
═══════════════════════════════════════

📊 Genererer embeddings for kunder...

Fant 45 kunder

  Genererer embedding for: "Kunde: Telenor Norge AS..."
  ✅ Telenor Norge AS
  Genererer embedding for: "Kunde: DNB Bank ASA..."
  ✅ DNB Bank ASA
  ...

✅ Ferdig! 45 suksess, 0 feil

🏢 Genererer embeddings for anlegg...

Fant 120 anlegg

  Genererer embedding for: "Anlegg: Fornebu Hovedbygg..."
  ✅ Fornebu Hovedbygg
  ...

✅ Ferdig! 120 suksess, 0 feil

═══════════════════════════════════════
🎉 Alle embeddings generert!

Du kan nå teste AI-assistenten!
```

**Tid:** ~5-10 minutter avhengig av antall kunder/anlegg

---

## ✅ Steg 5: Verifiser i Database (1 min)

Gå til Supabase → Table Editor → `ai_embeddings`

Du skal se:
- Mange rader (én per kunde + én per anlegg)
- `content` kolonne med tekst
- `embedding` kolonne med tall
- `table_name` med "kunder" eller "anlegg"

**Eksempel rad:**
```
id: 123e4567-...
content: "Kunde: Telenor Norge AS\nAdresse: Snarøyveien 30..."
embedding: [0.123, -0.456, ...]
table_name: kunder
record_id: 456e7890-...
```

✅ **Embeddings generert!**

---

## ✅ Steg 6: Test AI-Assistenten! (2 min)

### Start Dev Server

```bash
npm run dev
```

### Åpne Appen

1. Gå til http://localhost:5173
2. Se etter ✨ AI-knappen nederst til høyre
3. Klikk på den

### Test Søk

```
Du: "Finn alle kunder i Oslo"
AI: "Jeg fant 12 kunder i Oslo:
     1. Telenor Norge AS - Fornebu
     2. DNB Bank ASA - Aker Brygge
     ..."

Du: "Hvilke anlegg har vi hos Telenor?"
AI: "Telenor har følgende anlegg:
     1. Fornebu Hovedbygg
     2. Snarøya Kontorbygg
     ..."
```

🎉 **Det fungerer!**

---

## 📊 Hva Skjedde?

### 1. Database Setup
```
Opprettet ai_embeddings tabell
→ Kan lagre vektorer (embeddings)
→ Kan søke raskt med pgvector
```

### 2. Embedding-Generering
```
For hver kunde/anlegg:
1. Bygg tekst: "Kunde: Telenor..."
2. Send til Azure OpenAI
3. Få tilbake vektor [0.123, ...]
4. Lagre i ai_embeddings
```

### 3. Søk
```
Bruker spør: "Finn kunder i Oslo"
1. Generer embedding av spørsmål
2. Søk i ai_embeddings (match_embeddings)
3. Finn mest like vektorer
4. Returner kunder med høyest similarity
5. Send til GPT-4o for naturlig svar
```

---

## 💰 Kostnader

### Embedding-Generering (Engangs)

```
165 kunder/anlegg × 50 tokens = 8,250 tokens
$0.10 per 1M tokens = $0.0008

Kostnad: ~$0.001 (0.01 kr) 🎉
```

### Søk (Løpende)

```
Per søk:
- Embedding: ~50 tokens = $0.000005
- GPT-4o: ~700 tokens = $0.007

Total per søk: ~$0.007 (0.06 kr)
100 søk/måned: $0.70 (6 kr)
```

**Nesten gratis!**

---

## 🔄 Oppdatere Embeddings

### Når Legger Du Til Ny Kunde?

**Alternativ 1: Kjør Script På Nytt**
```bash
npx tsx scripts/generate-embeddings.ts
```

**Alternativ 2: Automatisk (Avansert)**

Sett opp trigger som genererer embedding automatisk når ny kunde legges til.

Se `docs/AI_ASSISTANT_IMPLEMENTATION.md` for detaljer.

---

## 🐛 Feilsøking

### Problem: "Extension vector does not exist"

**Løsning:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Problem: "Azure API error"

**Sjekk:**
- Er AZURE_ENDPOINT riktig?
- Er AZURE_KEY riktig?
- Er text-embedding-ada-002 deployet i Azure?

### Problem: "No matches found"

**Årsak:** Ingen embeddings i databasen

**Løsning:**
1. Sjekk `ai_embeddings` tabell i Supabase
2. Kjør embedding-script på nytt

### Problem: "Service role key invalid"

**Løsning:**
- Bruk service_role key, IKKE anon key
- Finn i Supabase → Settings → API → service_role

---

## 📚 Neste Steg

### 1. Legg Til Flere Tabeller

Utvid scriptet til å inkludere:
- Kontaktpersoner
- Servicerapporter
- Dokumenter

### 2. Automatiser

Sett opp automatisk embedding-generering ved nye data.

### 3. Optimaliser

- Juster match_threshold (0.7 = standard)
- Øk match_count for flere resultater
- Legg til flere metadata-felt

---

## ✅ Sjekkliste

- [ ] Database setup kjørt (pgvector)
- [ ] Embedding-script konfigurert
- [ ] tsx installert
- [ ] Embeddings generert
- [ ] Verifisert i database
- [ ] AI-assistent testet
- [ ] Søk fungerer

---

## 🎉 Gratulerer!

Du har nå:
- ✅ pgvector database
- ✅ Embeddings for alle kunder/anlegg
- ✅ Fungerende AI-søk
- ✅ Intelligent assistent

**Neste:** Utforsk andre AI-funksjoner i `AI_TIDSBESPARENDE_FUNKSJONER.md`!

**Spørsmål?** Bare spør! 🚀
