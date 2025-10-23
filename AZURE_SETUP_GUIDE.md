# Azure OpenAI Setup - Komplett Guide 🚀

## ✅ Hva Vi Har Gjort

### 1. Database Setup ✅
- [x] Aktivert pgvector i Supabase
- [x] Opprettet `ai_embeddings` tabell
- [x] Opprettet `match_embeddings` funksjon
- [x] Satt opp RLS policies

### 2. Edge Function ✅
- [x] Opprettet `supabase/functions/ai-chat/index.ts`
- [x] Konfigurert for Azure OpenAI

### 3. React Component ✅
- [x] Opprettet `src/components/AIChat.tsx`
- [x] Lagt til i `App.tsx`

---

## 🔄 Gjenstående Steg

### Steg 1: Opprett Azure-konto (10 min)

1. Gå til https://portal.azure.com
2. Klikk "Start free" eller "Sign in"
3. Registrer deg med Microsoft-konto
4. Legg til betalingskort (får $200 gratis credits)
5. Verifiser med SMS-kode

### Steg 2: Søk om Azure OpenAI Tilgang (5 min)

1. Gå til https://aka.ms/oai/access
2. Fyll ut skjema:
   - Company: BSV Fire AS
   - Use case: AI assistant for internal business application
   - Expected usage: 100-500 requests/month
   - Region: Norway East
3. Vent på godkjenning (1-2 virkedager)

### Steg 3: Opprett Azure OpenAI Ressurs (15 min)

**Når du har fått godkjenning:**

1. Gå til https://portal.azure.com
2. Klikk "Create a resource" (+ ikon)
3. Søk etter "Azure OpenAI"
4. Klikk "Create"
5. Fyll ut:
   - Subscription: Din subscription
   - Resource group: Opprett ny → `bsvfire-ai`
   - Region: **Norway East** (viktig!)
   - Name: `bsvfire-openai`
   - Pricing tier: Standard S0
6. Klikk "Review + create"
7. Klikk "Create"
8. Vent 2-3 minutter

### Steg 4: Deploy Modeller (10 min)

1. Gå til https://oai.azure.com
2. Klikk "Deployments"
3. Klikk "+ Create new deployment"

**Deploy GPT-4:**
- Model: `gpt-4-turbo-preview`
- Deployment name: `gpt-4-turbo`
- Tokens per minute: 10K
- Klikk "Create"

**Deploy Embeddings:**
- Model: `text-embedding-ada-002`
- Deployment name: `text-embedding-ada-002`
- Tokens per minute: 10K
- Klikk "Create"

### Steg 5: Få API-nøkler (5 min)

1. Gå til Azure Portal
2. Åpne din `bsvfire-openai` ressurs
3. Klikk "Keys and Endpoint"
4. Kopier:
   - **KEY 1**
   - **Endpoint** (f.eks. `https://bsvfire-openai.openai.azure.com/`)

### Steg 6: Sett Secrets i Supabase (5 min)

```bash
# I terminalen:
cd /Users/eriksebastianskille/Documents/Firebase_BSVFire

# Login til Supabase
supabase login

# Link til prosjekt (finn project ref i Supabase dashboard)
supabase link --project-ref din-project-ref

# Sett Azure endpoint
supabase secrets set AZURE_OPENAI_ENDPOINT=https://bsvfire-openai.openai.azure.com/

# Sett Azure key
supabase secrets set AZURE_OPENAI_KEY=din-api-key-her
```

### Steg 7: Deploy Edge Function (2 min)

```bash
supabase functions deploy ai-chat
```

### Steg 8: Test! (5 min)

1. Start dev server:
```bash
npm run dev
```

2. Åpne appen i nettleser
3. Se etter AI-knappen nederst til høyre (✨ ikon)
4. Klikk på den
5. Test med: "Hei, hvem er du?"

---

## 🧪 Testing

### Test 1: Basis-test

```
Du: "Hei, hvem er du?"
AI: "Hei! Jeg er BSV Fire AI-assistent..."
```

### Test 2: Søk (når du har data)

```
Du: "Finn alle kunder"
AI: "Jeg fant X kunder i databasen..."
```

### Test 3: Feilhåndtering

```
Du: "Noe som ikke finnes"
AI: "Jeg finner ingen relevante dokumenter..."
```

---

## 🐛 Feilsøking

### Problem: "Function not found"

**Løsning:**
```bash
# Sjekk at function er deployet
supabase functions list

# Deploy på nytt hvis nødvendig
supabase functions deploy ai-chat
```

### Problem: "Azure API error"

**Løsning:**
```bash
# Sjekk at secrets er satt
supabase secrets list

# Sett på nytt hvis nødvendig
supabase secrets set AZURE_OPENAI_ENDPOINT=...
supabase secrets set AZURE_OPENAI_KEY=...
```

### Problem: "No matches found"

**Årsak:** Ingen data i `ai_embeddings` tabellen ennå

**Løsning:** Dette er normalt! AI-en vil fortsatt svare, men uten kontekst fra databasen.

For å legge til data, se neste steg.

---

## 📊 Neste Steg: Legg til Data

### Steg 1: Generer Embeddings for Eksisterende Data

Opprett fil: `scripts/generate-embeddings.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'DIN_SUPABASE_URL',
  'DIN_SERVICE_KEY'
)

const AZURE_ENDPOINT = 'https://bsvfire-openai.openai.azure.com/'
const AZURE_KEY = 'DIN_AZURE_KEY'

async function generateEmbedding(text: string) {
  const response = await fetch(
    `${AZURE_ENDPOINT}/openai/deployments/text-embedding-ada-002/embeddings?api-version=2024-02-01`,
    {
      method: 'POST',
      headers: {
        'api-key': AZURE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
      }),
    }
  )
  const data = await response.json()
  return data.data[0].embedding
}

async function main() {
  console.log('Genererer embeddings for kunder...')
  
  // Hent alle kunder
  const { data: kunder } = await supabase
    .from('kunder')
    .select('*')
    .limit(10) // Start med 10 for testing
  
  for (const kunde of kunder || []) {
    const content = `Kunde: ${kunde.navn}\nAdresse: ${kunde.adresse || 'Ikke oppgitt'}`
    const embedding = await generateEmbedding(content)
    
    await supabase.from('ai_embeddings').insert({
      content,
      embedding,
      table_name: 'kunder',
      record_id: kunde.id,
      metadata: { navn: kunde.navn },
    })
    
    console.log(`✓ ${kunde.navn}`)
  }
  
  console.log('Ferdig!')
}

main()
```

### Steg 2: Kjør Script

```bash
# Installer tsx hvis du ikke har det
npm install -D tsx

# Kjør script
npx tsx scripts/generate-embeddings.ts
```

---

## 💰 Kostnader

### Estimert Månedlig Kostnad (100 spørringer)

```
Embeddings:
- 100 spørringer × 50 tokens = 5,000 tokens
- $0.0001 per 1K tokens = $0.0005

GPT-4 Turbo:
- Input: 100 × 600 tokens = 60,000 tokens
- Output: 100 × 100 tokens = 10,000 tokens
- Input: $0.01 per 1K = $0.60
- Output: $0.03 per 1K = $0.30

Total: ~$0.90/måned (8 kr)
```

**Med gratis $200 credits: Gratis i 200+ måneder!** 🎉

---

## 📚 Dokumentasjon

### Relaterte Filer

- `AI_ASSISTANT_README.md` - Komplett oversikt
- `docs/AI_ASSISTANT_QUICKSTART.md` - Rask oppstart
- `docs/AI_ASSISTANT_IMPLEMENTATION.md` - Detaljert implementering
- `docs/AI_ASSISTANT_EXAMPLES.md` - Eksempler på bruk
- `docs/AI_TIDSBESPARENDE_FUNKSJONER.md` - Andre AI-funksjoner

### Azure Dokumentasjon

- [Azure OpenAI Service](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [Quickstart Guide](https://learn.microsoft.com/en-us/azure/ai-services/openai/quickstart)
- [API Reference](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference)

---

## ✅ Sjekkliste

### Setup
- [ ] Azure-konto opprettet
- [ ] Søkt om Azure OpenAI tilgang
- [ ] Fått godkjenning
- [ ] Azure OpenAI ressurs opprettet
- [ ] GPT-4 Turbo deployet
- [ ] text-embedding-ada-002 deployet
- [ ] API-nøkler kopiert

### Supabase
- [ ] Database setup kjørt (pgvector)
- [ ] Secrets satt (AZURE_OPENAI_ENDPOINT)
- [ ] Secrets satt (AZURE_OPENAI_KEY)
- [ ] Edge Function deployet

### Testing
- [ ] Dev server startet
- [ ] AI-knapp vises
- [ ] Kan sende melding
- [ ] Får svar fra AI

### Data (Valgfritt)
- [ ] Embeddings-script opprettet
- [ ] Embeddings generert for test-data
- [ ] AI finner data i søk

---

## 🎉 Gratulerer!

Du har nå en fungerende AI-assistent med:
- ✅ GDPR-compliant (data i Norge)
- ✅ Serverless (ingen servere å administrere)
- ✅ Rimelig (~8 kr/måned for 100 spørringer)
- ✅ Profesjonell (Azure/Microsoft)

**Neste steg:**
1. Test med ekte data
2. Generer embeddings for alle kunder/anlegg
3. Utforsk andre AI-funksjoner (se `AI_TIDSBESPARENDE_FUNKSJONER.md`)

**Spørsmål?** Kontakt erik.skille@bsvfire.no
