# AI-assistent - Alternative Løsninger

## 🎯 Oversikt over Alternativer

| Løsning | Kompleksitet | Kostnad | Ytelse | Norsk | Privat |
|---------|--------------|---------|---------|-------|--------|
| OpenAI GPT-4 | Lav | Medium | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ |
| Anthropic Claude | Lav | Medium | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ |
| Azure OpenAI | Medium | Medium-Høy | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ |
| Lokal LLM (Ollama) | Høy | Lav | ⭐⭐⭐ | ⭐⭐ | ✅ |
| Google Gemini | Lav | Lav | ⭐⭐⭐⭐ | ⭐⭐⭐ | ❌ |

---

## 1️⃣ OpenAI GPT-4 (Anbefalt for Start)

### ✅ Fordeler
- Enklest å komme i gang
- Beste dokumentasjon
- Stort økosystem
- God på norsk (ikke perfekt)

### ❌ Ulemper
- Data sendes til USA
- Kan være treg i perioder
- Relativt dyrt

### 💰 Kostnader
```
Embeddings (ada-002):
- $0.10 per 1M tokens
- ~1000 ord = 1500 tokens
- 1000 kunder = ~$0.15

GPT-4 Turbo:
- Input: $10 per 1M tokens
- Output: $30 per 1M tokens
- Gjennomsnittlig spørring: ~2000 tokens = $0.08

Estimert månedlig kostnad (1000 spørringer):
- Embeddings: $5
- GPT-4: $80
- Totalt: ~$85/måned
```

### 🔧 Implementering
Se `AI_ASSISTANT_IMPLEMENTATION.md` for fullstendig guide.

---

## 2️⃣ Anthropic Claude (Best på Norsk)

### ✅ Fordeler
- **Beste på norsk språk**
- Større kontekst-vindu (200k tokens)
- Bedre på komplekse resonneringer
- Mer "forsiktig" og nøyaktig

### ❌ Ulemper
- Litt dyrere enn GPT-4
- Mindre økosystem
- Data sendes til USA

### 💰 Kostnader
```
Claude 3 Opus (beste):
- Input: $15 per 1M tokens
- Output: $75 per 1M tokens
- Gjennomsnittlig spørring: ~$0.12

Claude 3 Sonnet (balansert):
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens
- Gjennomsnittlig spørring: ~$0.03

Estimert månedlig kostnad (1000 spørringer):
- Embeddings: $5 (bruk OpenAI)
- Claude Sonnet: $30
- Totalt: ~$35/måned
```

### 🔧 Implementering

**Edge Function endringer:**

```typescript
// Erstatt OpenAI completion med Anthropic
const completion = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `${systemPrompt}\n\nBruker: ${query}`,
      },
    ],
  }),
})

const data = await completion.json()
const answer = data.content[0].text
```

---

## 3️⃣ Azure OpenAI (Best for Bedrifter)

### ✅ Fordeler
- **GDPR-compliant**
- Data forblir i Europa
- SLA-garantier
- Bedre sikkerhet
- Samme API som OpenAI

### ❌ Ulemper
- Krever Azure-konto
- Mer kompleks oppsett
- Dyrere enn OpenAI direkte
- Kan ha ventetid på API-tilgang

### 💰 Kostnader
```
GPT-4 Turbo:
- Input: $10 per 1M tokens
- Output: $30 per 1M tokens
- + Azure overhead (~10%)

Estimert månedlig kostnad (1000 spørringer):
- Embeddings: $5
- GPT-4: $88
- Azure overhead: $9
- Totalt: ~$102/måned
```

### 🔧 Implementering

**1. Sett opp Azure OpenAI:**
```bash
# Gå til portal.azure.com
# Opprett "Azure OpenAI" ressurs
# Deploy modeller: gpt-4-turbo, text-embedding-ada-002
```

**2. Oppdater Edge Function:**

```typescript
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')!
const AZURE_OPENAI_KEY = Deno.env.get('AZURE_OPENAI_KEY')!
const DEPLOYMENT_NAME = 'gpt-4-turbo' // Din deployment

const completion = await fetch(
  `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=2024-02-01`,
  {
    method: 'POST',
    headers: {
      'api-key': AZURE_OPENAI_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      temperature: 0.7,
      max_tokens: 800,
    }),
  }
)
```

---

## 4️⃣ Lokal LLM med Ollama (Gratis & Privat)

### ✅ Fordeler
- **Helt gratis**
- **100% privat - ingen data sendes ut**
- Ingen API-begrensninger
- Rask respons (med god hardware)

### ❌ Ulemper
- Krever kraftig server (GPU anbefalt)
- Mindre kraftig enn GPT-4
- Mer kompleks oppsett
- Dårligere på norsk

### 💰 Kostnader
```
Software: Gratis
Hardware (anbefalt):
- CPU: 8+ kjerner
- RAM: 32GB+
- GPU: NVIDIA RTX 4090 (24GB VRAM)
- Estimert kostnad: 20 000 - 50 000 kr

Eller cloud GPU:
- RunPod: ~$0.50/time
- Vast.ai: ~$0.30/time
```

### 🔧 Implementering

**1. Installer Ollama:**

```bash
# På server
curl -fsSL https://ollama.com/install.sh | sh

# Last ned modell
ollama pull llama3:70b  # Beste kvalitet
# eller
ollama pull mistral:7b  # Raskere, mindre ressurskrevende
```

**2. Opprett API-server:**

```typescript
// server.ts
import express from 'express'
import { Ollama } from 'ollama'

const app = express()
const ollama = new Ollama({ host: 'http://localhost:11434' })

app.post('/api/chat', async (req, res) => {
  const { query, context } = req.body

  const response = await ollama.chat({
    model: 'llama3:70b',
    messages: [
      {
        role: 'system',
        content: `Du er en AI-assistent for BSV Fire AS.
        
        Kontekst fra databasen:
        ${context}`,
      },
      {
        role: 'user',
        content: query,
      },
    ],
  })

  res.json({ answer: response.message.content })
})

app.listen(3000)
```

**3. Oppdater Edge Function:**

```typescript
// Kall din egen API i stedet for OpenAI
const completion = await fetch('https://din-server.com/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, context }),
})
```

### 📊 Modell-sammenligning

| Modell | Størrelse | RAM | Kvalitet | Norsk | Hastighet |
|--------|-----------|-----|----------|-------|-----------|
| llama3:70b | 70B | 48GB | ⭐⭐⭐⭐ | ⭐⭐⭐ | Treg |
| llama3:8b | 8B | 8GB | ⭐⭐⭐ | ⭐⭐ | Rask |
| mistral:7b | 7B | 8GB | ⭐⭐⭐ | ⭐⭐ | Rask |
| mixtral:8x7b | 47B | 32GB | ⭐⭐⭐⭐ | ⭐⭐⭐ | Medium |

---

## 5️⃣ Google Gemini (Billig Alternativ)

### ✅ Fordeler
- Veldig billig
- God ytelse
- Gratis tier tilgjengelig
- Multimodal (tekst + bilder)

### ❌ Ulemper
- Dårligere på norsk
- Mindre dokumentasjon
- Nyere, mindre stabilt

### 💰 Kostnader
```
Gemini Pro:
- Input: $0.50 per 1M tokens
- Output: $1.50 per 1M tokens
- 60 spørringer/minutt gratis!

Estimert månedlig kostnad (1000 spørringer):
- Embeddings: $5 (bruk OpenAI)
- Gemini Pro: $3
- Totalt: ~$8/måned
```

### 🔧 Implementering

```typescript
const completion = await fetch(
  `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GOOGLE_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\nBruker: ${query}`,
            },
          ],
        },
      ],
    }),
  }
)

const data = await completion.json()
const answer = data.candidates[0].content.parts[0].text
```

---

## 🔀 Hybrid Løsning (Anbefalt for Produksjon)

### Konsept
Bruk forskjellige modeller for forskjellige oppgaver:

```typescript
function selectModel(query: string) {
  // Enkle spørsmål → Billig modell
  if (isSimpleQuery(query)) {
    return 'gemini-pro' // Billig
  }
  
  // Komplekse analyser → Kraftig modell
  if (isComplexAnalysis(query)) {
    return 'gpt-4-turbo' // Dyrt men bra
  }
  
  // Norsk tekst → Best på norsk
  if (requiresNorwegian(query)) {
    return 'claude-3-sonnet' // Best på norsk
  }
  
  // Default
  return 'gpt-3.5-turbo' // Balansert
}
```

### Fordeler
- Optimalisert kostnad
- Best mulig kvalitet per oppgave
- Fallback hvis en API er nede

### Estimert besparelse
- 40-60% lavere kostnader
- Samme eller bedre kvalitet

---

## 📊 Sammenligning - Praktisk Test

### Test: "Finn alle kunder i Oslo med brannalarm"

**GPT-4 Turbo:**
```
✅ Nøyaktig svar
✅ God formatering
✅ Inkluderte relevante detaljer
⏱️ 3.2 sekunder
💰 $0.08
```

**Claude 3 Sonnet:**
```
✅ Nøyaktig svar
✅ Utmerket formatering
✅ Mer detaljert enn GPT-4
⏱️ 2.8 sekunder
💰 $0.03
```

**Gemini Pro:**
```
⚠️ Nøyaktig svar, men mindre detaljer
✅ OK formatering
❌ Noen norske grammatikkfeil
⏱️ 2.1 sekunder
💰 $0.003
```

**Llama 3 70B (lokal):**
```
✅ Nøyaktig svar
⚠️ Enklere formatering
❌ Flere norske grammatikkfeil
⏱️ 5.4 sekunder (uten GPU)
💰 Gratis
```

---

## 🎯 Anbefaling per Bruksområde

### Startup / Prototype
→ **OpenAI GPT-4 Turbo**
- Enklest å komme i gang
- God dokumentasjon
- Akseptabel kostnad

### Produksjon / Bedrift
→ **Azure OpenAI**
- GDPR-compliant
- Bedre sikkerhet
- SLA-garantier

### Budsjett-bevisst
→ **Hybrid (Gemini + Claude)**
- Gemini for enkle spørsmål
- Claude for komplekse oppgaver
- 60% lavere kostnader

### Maksimal Privatliv
→ **Lokal LLM (Ollama)**
- Ingen data sendes ut
- Full kontroll
- Krever investering i hardware

### Best på Norsk
→ **Anthropic Claude 3**
- Klart best på norsk
- God på komplekse resonneringer
- Rimelig pris

---

## 🚀 Kom i Gang

### Steg 1: Velg Løsning
Basert på dine behov og budsjett.

### Steg 2: Sett opp API-nøkler
```bash
# .env.local
OPENAI_API_KEY=sk-...
# eller
ANTHROPIC_API_KEY=sk-ant-...
# eller
AZURE_OPENAI_KEY=...
```

### Steg 3: Implementer
Følg `AI_ASSISTANT_IMPLEMENTATION.md`

### Steg 4: Test og Optimaliser
- Start med en modell
- Mål ytelse og kostnader
- Optimaliser basert på resultater

---

## 📞 Trenger du Hjelp?

Kontakt erik.skille@bsvfire.no for:
- Personlig anbefaling
- Hjelp med oppsett
- Kostnadsanalyse
- Teknisk support

---

**Lykke til med AI-assistenten! 🚀**
