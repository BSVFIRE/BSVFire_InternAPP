# AI-assistent for BSV Fire - Implementeringsguide

## 📋 Oversikt

Denne guiden beskriver hvordan du kan bygge en AI-assistent som kan søke og hjelpe med:
- 🔍 Søk i kunder, anlegg, kontaktpersoner
- 📄 Dokumentsøk og analyse
- 📊 Rapportgenerering og innsikt
- 💬 Naturlig språk-spørsmål om databasen
- 🤖 Intelligente anbefalinger

---

## 🎯 Tre Hovedtilnærminger

### 1. RAG med Supabase pgvector (ANBEFALT)
**Best for:** Semantisk søk i dokumenter, rapporter og kundedata

**Fordeler:**
- ✅ Integrert med eksisterende Supabase
- ✅ Forstår intensjon, ikke bare nøkkelord
- ✅ Søk i alle tabeller samtidig
- ✅ Kostnadseffektiv (~$0.0001 per søk)

**Ulemper:**
- ❌ Krever OpenAI API-nøkkel
- ❌ Må generere embeddings for data

### 2. SQL-Agent med Function Calling
**Best for:** Strukturerte spørringer og aggregeringer

**Fordeler:**
- ✅ Presis for tallbaserte spørringer
- ✅ Kan gjøre komplekse aggregeringer

**Ulemper:**
- ❌ Sikkerhetsproblemer (SQL injection)
- ❌ Mindre fleksibel for semantisk søk

### 3. Hybrid (RAG + SQL)
**Best for:** Kombinerer begge tilnærminger

---

## 🛠️ Implementering - RAG (Anbefalt)

### Steg 1: Aktiver pgvector i Supabase

```sql
-- Kjør i Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE ai_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB,
  table_name TEXT,
  record_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON ai_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

ALTER TABLE ai_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read embeddings"
  ON ai_embeddings FOR SELECT
  TO authenticated
  USING (true);
```

Se fullstendig implementering i:
- `AI_ASSISTANT_IMPLEMENTATION.md` - Detaljert kode
- `AI_ASSISTANT_EXAMPLES.md` - Eksempler på bruk

---

## 💰 Kostnader

### OpenAI Pricing (per 1M tokens)
- **Embeddings (ada-002):** $0.10
- **GPT-4 Turbo:** $10 (input) + $30 (output)
- **GPT-3.5 Turbo:** $0.50 (input) + $1.50 (output)

### Estimert månedlig kostnad
- 1000 spørringer/måned: ~$5-10
- 10000 spørringer/måned: ~$50-100

---

## 🚀 Alternativer til OpenAI

### 1. Anthropic Claude
- Bedre på norsk
- Større kontekst-vindu (200k tokens)
- Lignende pricing

### 2. Lokal LLM (Ollama)
- Gratis
- Kjører lokalt
- Mindre kraftig, men OK for enkle oppgaver

### 3. Azure OpenAI
- Bedre for bedrifter
- GDPR-compliant
- Samme API som OpenAI

---

## 📝 Eksempler på Bruk

### Søk etter kunder
**Bruker:** "Finn alle kunder i Oslo"
**AI:** "Jeg fant 12 kunder i Oslo. Her er de 5 største..."

### Finn kontaktpersoner
**Bruker:** "Hvem er kontaktperson hos Telenor?"
**AI:** "Kontaktperson hos Telenor er..."

### Dokumentsøk
**Bruker:** "Finn alle rapporter fra siste måned"
**AI:** "Her er 8 rapporter fra siste måned..."

---

## 🔒 Sikkerhet

### Best Practices
1. **RLS (Row Level Security):** Bruk Supabase RLS for tilgangskontroll
2. **API-nøkler:** Lagre i miljøvariabler, aldri i kode
3. **Rate limiting:** Begrens antall spørringer per bruker
4. **Input validering:** Valider all brukerinput
5. **Logging:** Logg alle AI-interaksjoner for audit

---

## 📚 Neste Steg

1. Les `AI_ASSISTANT_IMPLEMENTATION.md` for fullstendig kode
2. Les `AI_ASSISTANT_EXAMPLES.md` for eksempler
3. Sett opp OpenAI API-nøkkel
4. Aktiver pgvector i Supabase
5. Generer embeddings for eksisterende data
6. Test AI-chatten

---

**Spørsmål?** Kontakt erik.skille@bsvfire.no
