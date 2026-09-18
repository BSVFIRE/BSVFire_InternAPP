# Sjekkliste: Azure OpenAI Konfigurasjon

## Verifiser i Azure Portal

### 1. Endpoint
✅ Korrekt format: `https://bsvfire-ai2-resource.cognitiveservices.azure.com/`

### 2. API Key
Gå til Azure Portal → din Azure OpenAI ressurs → **Keys and Endpoint**

Kopier **KEY 1** og kjør:
```bash
supabase secrets set AZURE_OPENAI_KEY="din-key-her"
supabase secrets set AZURE_OPENAI_API_KEY="din-key-her"
```

### 3. Deployment Name
Dette er KRITISK! Deployment-navnet må være eksakt det samme som i Azure.

**Hvordan finne deployment-navnet:**

#### Metode A: Azure Portal
1. Gå til Azure Portal
2. Finn din Azure OpenAI ressurs
3. Klikk **Model deployments** (eller "Go to Azure OpenAI Studio")
4. Se på **Deployment name** kolonnen
5. Kopier det eksakte navnet (f.eks. `gpt-4`, `gpt-4o`, `gpt-4-turbo`)

#### Metode B: Fra Python-koden
I Python-koden du bruker, se etter:
```python
completion = client.chat.completions.create(
    model="DEPLOYMENT_NAME_HER",  # <-- Dette er deployment-navnet
    messages=[...]
)
```

**Sett deployment-navnet:**
```bash
supabase secrets set AZURE_GPT_DEPLOYMENT_NAME="deployment-name-fra-azure"
```

## Vanlige problemer

### Problem 1: Feil deployment-navn
❌ Du har satt: `gpt-4`  
✅ Azure har: `gpt-4o` eller `gpt-4-turbo`

**Løsning:** Deployment-navnet må matche EKSAKT!

### Problem 2: API-nøkkel er feil
Hvis du har regenerert nøkkelen i Azure, må du oppdatere den i Supabase.

### Problem 3: Modellen er ikke deployet
Sjekk at GPT-4 modellen faktisk er deployet i Azure OpenAI Studio.

### Problem 4: Feil API-versjon
Vi bruker `2024-12-01-preview`. Hvis dette ikke fungerer, prøv:
- `2024-10-21`
- `2024-08-01-preview`
- `2024-06-01`

## Test Azure OpenAI direkte

Test at Azure fungerer med curl (erstatt verdiene):

```bash
ENDPOINT="https://bsvfire-ai2-resource.cognitiveservices.azure.com/"
API_KEY="din-key-her"
DEPLOYMENT="ditt-deployment-navn"

curl -X POST "${ENDPOINT}openai/deployments/${DEPLOYMENT}/chat/completions?api-version=2024-12-01-preview" \
  -H "api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hei, dette er en test"}
    ],
    "max_tokens": 50
  }'
```

**Forventet resultat:**
```json
{
  "choices": [
    {
      "message": {
        "content": "Hei! Hvordan kan jeg hjelpe deg?"
      }
    }
  ]
}
```

**Hvis du får feil:**
- 401: API-nøkkel er feil
- 404: Deployment-navn er feil eller endpoint er feil
- 429: Quota er overskredet

## Neste steg

1. ✅ Verifiser deployment-navnet i Azure Portal
2. ✅ Oppdater `AZURE_GPT_DEPLOYMENT_NAME` i Supabase
3. ✅ Test med curl-kommandoen over
4. ✅ Hvis curl fungerer, prøv AI-funksjonen igjen

---

**Viktig:** Ta et skjermbilde av:
1. Azure Portal → Model deployments (viser deployment-navn)
2. Supabase Dashboard → Edge Functions → ai-improve-servicerapport → Logs (viser faktisk feil)
