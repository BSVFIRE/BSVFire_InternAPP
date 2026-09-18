# Feilsøking: AI-funksjon returnerer 500-feil

## Problem
Edge Functions `ai-improve-servicerapport` og `ai-improve-note-azure` returnerer 500-feil.

## Årsak
Azure OpenAI credentials er sannsynligvis ikke konfigurert i Supabase Edge Functions secrets.

## Løsning

### 1. Verifiser at Azure OpenAI er satt opp

Gå til [Azure Portal](https://portal.azure.com) og sjekk at du har:
- ✅ Azure OpenAI ressurs opprettet
- ✅ GPT-4 modell deployet
- ✅ API-nøkkel og endpoint tilgjengelig

### 2. Sett secrets i Supabase

**Via Supabase Dashboard:**
1. Gå til [Supabase Dashboard](https://supabase.com/dashboard)
2. Velg prosjektet ditt
3. Gå til **Edge Functions** → **Secrets**
4. Legg til følgende secrets:

```
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_GPT_DEPLOYMENT_NAME=gpt-4
```

**Via CLI:**
```bash
# Link til prosjektet (hvis ikke allerede gjort)
supabase link --project-ref snyzduzqyjsllzvwuahh

# Sett secrets
supabase secrets set AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
supabase secrets set AZURE_OPENAI_API_KEY=your-api-key-here
supabase secrets set AZURE_GPT_DEPLOYMENT_NAME=gpt-4
```

### 3. Verifiser secrets

```bash
# List alle secrets
supabase secrets list
```

Du skal se:
```
AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_API_KEY
AZURE_GPT_DEPLOYMENT_NAME
```

### 4. Redeploy Edge Functions (hvis nødvendig)

Etter å ha satt secrets, kan det være nødvendig å redeploye funksjonene:

```bash
supabase functions deploy ai-improve-servicerapport
supabase functions deploy ai-improve-note-azure
```

### 5. Test funksjonen

1. Refresh nettleseren
2. Gå til **Teknisk** → **Ny servicerapport**
3. Skriv stikkord i rapport-feltet
4. Klikk **"Forbedre med AI"**

## Sjekk Edge Function logs

For å se hva som går galt, sjekk loggene i Supabase Dashboard:

1. Gå til **Edge Functions** → **ai-improve-servicerapport**
2. Klikk på **Logs**-fanen
3. Se etter feilmeldinger

Typiske feilmeldinger:

### "Azure OpenAI credentials not configured"
**Løsning:** Sett `AZURE_OPENAI_ENDPOINT` og `AZURE_OPENAI_API_KEY` secrets (se steg 2)

### "Deployment not found"
**Løsning:** 
- Sjekk at deployment-navnet i `AZURE_GPT_DEPLOYMENT_NAME` matcher navnet i Azure Portal
- Gå til Azure Portal → din OpenAI-ressurs → Model deployments
- Kopier det eksakte navnet på GPT-4 deployment

### "Invalid API key"
**Løsning:**
- Gå til Azure Portal → din OpenAI-ressurs → Keys and Endpoint
- Kopier KEY 1 eller KEY 2
- Oppdater `AZURE_OPENAI_API_KEY` secret

### "Quota exceeded"
**Løsning:**
- Gå til Azure Portal → din OpenAI-ressurs → Quotas
- Øk quota for GPT-4 modellen
- Eller vent til quota resettes (månedlig)

## Alternativ: Bruk OpenAI direkte (midlertidig)

Hvis Azure OpenAI ikke er tilgjengelig, kan du midlertidig bruke OpenAI direkte:

1. Få API-nøkkel fra [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sett secret:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...
   ```
3. Opprett en enklere Edge Function som bruker OpenAI direkte

**Merk:** Dette er ikke GDPR-kompatibelt for produksjon!

## Kontakt support

Hvis problemet vedvarer:

**Azure Support:**
- https://portal.azure.com → Support
- Opprett support ticket

**Supabase Support:**
- https://supabase.com/dashboard → Support
- Eller Discord: https://discord.supabase.com

## Sjekkliste

- [ ] Azure OpenAI ressurs opprettet
- [ ] GPT-4 modell deployet i Azure
- [ ] `AZURE_OPENAI_ENDPOINT` secret satt i Supabase
- [ ] `AZURE_OPENAI_API_KEY` secret satt i Supabase
- [ ] `AZURE_GPT_DEPLOYMENT_NAME` secret satt i Supabase
- [ ] Edge Functions redeployet
- [ ] Testet funksjonen i nettleseren
- [ ] Sjekket Edge Function logs

---

**Opprettet:** 25. oktober 2025
