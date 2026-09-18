# Løsning: Azure OpenAI 401 Unauthorized Error

## Problem
Edge Function får 401 Unauthorized fra Azure OpenAI API:
```
Access denied due to invalid subscription key or wrong API endpoint.
```

## Årsak
- API-nøkkelen er feil eller utløpt
- Endpoint-URLen er feil formatert
- Feil region i endpoint

## Løsning

### 1. Hent korrekte verdier fra Azure Portal

1. Gå til [Azure Portal](https://portal.azure.com)
2. Søk etter din Azure OpenAI-ressurs
3. Klikk på ressursen
4. Gå til **Keys and Endpoint** (under Resource Management)
5. Kopier:
   - **KEY 1** (hele nøkkelen)
   - **Endpoint** (f.eks. `https://bsvfire-openai.openai.azure.com/`)

**VIKTIG:** Endpoint skal slutte med `/`

### 2. Hent deployment-navn

1. I samme Azure OpenAI-ressurs
2. Gå til **Model deployments** (eller klikk "Go to Azure OpenAI Studio")
3. Se på deployment-navnet for GPT-4 modellen
4. Kopier det eksakte navnet (f.eks. `gpt-4`, `gpt-4-turbo`, eller noe annet)

### 3. Oppdater Supabase secrets

**Via CLI:**
```bash
cd /Users/eriksebastianskille/Documents/Firebase_BSVFire

# Link til prosjektet (hvis ikke allerede gjort)
supabase link --project-ref snyzduzqyjsllzvwuahh

# Sett endpoint (HUSK / på slutten!)
supabase secrets set AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"

# Sett API key (bruk KEY 1 fra Azure Portal)
supabase secrets set AZURE_OPENAI_KEY="your-key-here"
supabase secrets set AZURE_OPENAI_API_KEY="your-key-here"

# Sett deployment-navn (eksakt som i Azure)
supabase secrets set AZURE_GPT_DEPLOYMENT_NAME="gpt-4"
```

**Via Supabase Dashboard:**
1. Gå til [Supabase Dashboard](https://supabase.com/dashboard/project/snyzduzqyjsllzvwuahh/settings/functions)
2. Klikk på **Edge Functions** → **Secrets**
3. Oppdater eller legg til:
   - `AZURE_OPENAI_ENDPOINT` = `https://your-resource.openai.azure.com/`
   - `AZURE_OPENAI_KEY` = `your-key-from-azure`
   - `AZURE_OPENAI_API_KEY` = `your-key-from-azure` (samme som over)
   - `AZURE_GPT_DEPLOYMENT_NAME` = `gpt-4` (eller ditt deployment-navn)

### 4. Test igjen

1. Refresh nettleseren (Cmd+R)
2. Gå til **Teknisk** → **Ny servicerapport**
3. Skriv stikkord i rapport-feltet
4. Klikk **"Forbedre med AI"**

## Vanlige feil

### Endpoint mangler `/` på slutten
❌ `https://bsvfire-openai.openai.azure.com`  
✅ `https://bsvfire-openai.openai.azure.com/`

### Feil region i endpoint
Sjekk at regionen i endpoint matcher der ressursen er opprettet:
- Norway East: `norwayeast`
- Sweden Central: `swedencentral`
- West Europe: `westeurope`

Eksempel: `https://bsvfire-openai-norwayeast.openai.azure.com/`

### Deployment-navn matcher ikke
Deployment-navnet i Supabase secrets må være **eksakt** det samme som i Azure Portal.

Sjekk i Azure Portal → Model deployments → Deployment name

### API-nøkkel er regenerert
Hvis du har regenerert API-nøkkelen i Azure Portal, må du oppdatere den i Supabase secrets.

## Verifiser at det fungerer

Etter å ha oppdatert secrets, sjekk logs i Supabase Dashboard:

1. Gå til **Edge Functions** → **ai-improve-servicerapport** → **Logs**
2. Prøv funksjonen igjen
3. Se etter:
   - ✅ "Azure response received, generating report..."
   - ❌ "Azure OpenAI API error: 401"

## Hvis det fortsatt ikke fungerer

### Test Azure OpenAI direkte

Test at Azure OpenAI fungerer med curl:

```bash
# Erstatt verdiene med dine egne
ENDPOINT="https://your-resource.openai.azure.com/"
API_KEY="your-key-here"
DEPLOYMENT="gpt-4"

curl -X POST "${ENDPOINT}openai/deployments/${DEPLOYMENT}/chat/completions?api-version=2024-06-01" \
  -H "api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hei, dette er en test"}
    ],
    "max_tokens": 50
  }'
```

Hvis dette fungerer, er problemet i Supabase secrets.  
Hvis dette IKKE fungerer, er problemet i Azure-konfigurasjonen.

---

**Opprettet:** 25. oktober 2025
