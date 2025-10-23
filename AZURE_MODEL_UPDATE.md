# Azure OpenAI - Modell Oppdatering 🔄

## ⚠️ Problem: Modell Blir Retired

Du får denne meldingen:
```
This deployment is using model gpt-4 turbo 2024-04-09 
which will be retired on 11.11.2025
```

**Løsning:** Bytt til nyere modell (gpt-4o)

---

## ✅ Løsning: Bruk gpt-4o (Anbefalt)

### Hva er gpt-4o?

**OpenAI sin nyeste modell:**
- Lansert høsten 2024
- Bedre kvalitet enn turbo
- Raskere respons
- **50% billigere!**

**Pris:**
- Input: $5 per 1M tokens (vs $10 for turbo)
- Output: $15 per 1M tokens (vs $30 for turbo)

**For 100 spørringer:**
- Turbo: $0.90/måned
- **gpt-4o: $0.45/måned** (4 kr) 🎉

---

## 🔧 Steg-for-Steg Oppdatering

### Steg 1: Slett Gammel Deployment

1. Gå til https://oai.azure.com
2. Klikk "Deployments"
3. Finn deployment med "2024-04-09"
4. Klikk "..." → "Delete"
5. Bekreft sletting

### Steg 2: Opprett Ny Deployment (gpt-4o)

1. Klikk "+ Create new deployment"
2. Fyll ut:

```
┌─────────────────────────────────────────────┐
│  Select a model:                            │
│  ┌─────────────────────────────────────┐   │
│  │ gpt-4o                         [▼]  │   │ ← Velg denne
│  └─────────────────────────────────────┘   │
│                                             │
│  Model version:                             │
│  ┌─────────────────────────────────────┐   │
│  │ 2024-11-20 (Default)           [▼]  │   │ ← Nyeste
│  └─────────────────────────────────────┘   │
│                                             │
│  Deployment name:                           │
│  ┌─────────────────────────────────────┐   │
│  │ gpt-4o                              │   │ ← Viktig!
│  └─────────────────────────────────────┘   │
│                                             │
│  Tokens per Minute Rate Limit:             │
│  ┌─────────────────────────────────────┐   │
│  │ 10                                  │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

3. Klikk "Create"

### Steg 3: Verifiser

Du skal nå se:

```
Deployments:
✓ gpt-4o                    (gpt-4o 2024-11-20)
✓ text-embedding-ada-002    (text-embedding-ada-002)
```

### Steg 4: Deploy Edge Function

Edge Function er allerede oppdatert til å bruke `gpt-4o`!

```bash
# Deploy
supabase functions deploy ai-chat
```

**Ferdig!** 🎉

---

## 🔄 Hvis gpt-4o Ikke Er Tilgjengelig

### Alternativ: Nyere gpt-4-turbo Versjon

Hvis `gpt-4o` ikke vises i listen:

1. Velg model: `gpt-4`
2. Velg version: `1106-Preview` eller `0125-Preview`
3. Deployment name: `gpt-4-turbo`

**Oppdater da Edge Function:**

Endre linje 58 i `supabase/functions/ai-chat/index.ts`:

```typescript
// Fra:
`${AZURE_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-01`,

// Til:
`${AZURE_ENDPOINT}/openai/deployments/gpt-4-turbo/chat/completions?api-version=2024-02-01`,
```

Deploy på nytt:
```bash
supabase functions deploy ai-chat
```

---

## 📊 Sammenligning

| Modell | Kvalitet | Hastighet | Pris (100 spørringer) | Status |
|--------|----------|-----------|----------------------|--------|
| **gpt-4o** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $0.45 (4 kr) | ✅ Anbefalt |
| gpt-4-turbo (ny) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $0.90 (8 kr) | ✅ OK |
| gpt-4-turbo (2024-04-09) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $0.90 (8 kr) | ❌ Retired 11.11.2025 |

---

## 🎯 Anbefaling

### For BSV Fire: Bruk gpt-4o

**Hvorfor:**
- ✅ Nyeste modell
- ✅ Bedre kvalitet
- ✅ Raskere
- ✅ **50% billigere!**
- ✅ Ikke retired

**Kostnad:**
- 100 spørringer: $0.45/måned (4 kr)
- 400 spørringer: $1.80/måned (16 kr)
- 1000 spørringer: $4.50/måned (40 kr)

---

## ✅ Sjekkliste

- [ ] Slettet gammel deployment (2024-04-09)
- [ ] Opprettet ny deployment (gpt-4o)
- [ ] Deployment name er nøyaktig: `gpt-4o`
- [ ] Edge Function deployet
- [ ] Testet AI-assistenten

---

## 🧪 Test

Etter oppdatering, test AI-en:

```
Du: "Hei, hvem er du?"
AI: "Hei! Jeg er BSV Fire AI-assistent..."
```

Hvis det fungerer: **Perfekt!** 🎉

---

## 🐛 Feilsøking

### Problem: "Deployment not found"

**Løsning:**
1. Sjekk at deployment name er nøyaktig `gpt-4o`
2. Sjekk at Edge Function er deployet
3. Sjekk Azure OpenAI Studio at deployment er "Succeeded"

### Problem: "Model not available"

**Løsning:**
- gpt-4o er kanskje ikke tilgjengelig i din region ennå
- Bruk gpt-4-turbo (nyere versjon) i stedet
- Se "Alternativ" over

---

## 💡 Fremtidige Oppdateringer

**Azure OpenAI oppdaterer modeller jevnlig:**
- Du vil få varsler når modeller blir retired
- Alltid velg nyeste versjon
- Eller sett "Auto-update to default"

**Slik setter du auto-update:**
1. Gå til Deployments
2. Klikk på deployment
3. Velg "Auto-update to default"
4. Klikk "Save"

**Fordel:** Automatisk oppdatering til nyeste versjon
**Ulempe:** Kan endre oppførsel uten varsel

---

## 🎉 Konklusjon

**gpt-4o er den beste løsningen:**
- Nyeste teknologi
- Bedre kvalitet
- Raskere
- Billigere
- Ikke retired

**Du sparer 50% på kostnader!** 🎉

**Spørsmål?** Bare spør! 🚀
