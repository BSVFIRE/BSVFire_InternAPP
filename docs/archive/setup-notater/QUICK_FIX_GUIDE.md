# 🚨 Rask feilsøking: AI-funksjon 500-feil

## Mest sannsynlige problem: Feil deployment-navn

Edge Function får fortsatt 500-feil. Det mest sannsynlige problemet er at **deployment-navnet ikke matcher** det som er i Azure.

## Hva du må gjøre NÅ

### 1. Finn deployment-navnet i Azure

**Alternativ A: Azure OpenAI Studio**
1. Gå til https://ai.azure.com
2. Klikk **Deployments** i venstre meny
3. Se på **Deployment name** kolonnen
4. Kopier det eksakte navnet

**Alternativ B: Azure Portal**
1. Gå til https://portal.azure.com
2. Søk etter din Azure OpenAI ressurs
3. Klikk **Model deployments**
4. Kopier deployment-navnet

### 2. Oppdater Supabase secret

```bash
cd /Users/eriksebastianskille/Documents/Firebase_BSVFire

# Erstatt "ditt-deployment-navn" med det du fant i Azure
supabase secrets set AZURE_GPT_DEPLOYMENT_NAME="ditt-deployment-navn"
```

**Eksempler på mulige deployment-navn:**
- `gpt-4`
- `gpt-4o`
- `gpt-4-turbo`
- `gpt-4-32k`
- `gpt-35-turbo`

### 3. Sjekk Edge Function logs

Gå til Supabase Dashboard for å se den faktiske feilen:

1. Gå til: https://supabase.com/dashboard/project/snyzduzqyjsllzvwuahh/functions
2. Klikk på **ai-improve-servicerapport**
3. Klikk på **Logs**-fanen
4. Se etter feilmeldinger

**Typiske feilmeldinger:**

#### "Deployment not found" eller 404
→ Deployment-navnet er feil. Sjekk i Azure og oppdater secret.

#### "401 Unauthorized"
→ API-nøkkelen er feil. Hent ny nøkkel fra Azure Portal → Keys and Endpoint.

#### "429 Too Many Requests"
→ Quota er overskredet. Gå til Azure Portal → Quotas og øk grensen.

## Alternativ løsning: Test med curl først

Test at Azure OpenAI fungerer før du prøver Edge Function:

```bash
# Erstatt verdiene med dine egne
ENDPOINT="https://bsvfire-ai2-resource.cognitiveservices.azure.com/"
API_KEY="din-api-key"
DEPLOYMENT="ditt-deployment-navn"

curl -X POST "${ENDPOINT}openai/deployments/${DEPLOYMENT}/chat/completions?api-version=2024-12-01-preview" \
  -H "api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Test"}
    ],
    "max_tokens": 10
  }'
```

**Hvis curl fungerer:**
→ Problemet er i Supabase secrets. Dobbeltsjekk at alle verdier er riktige.

**Hvis curl IKKE fungerer:**
→ Problemet er i Azure-konfigurasjonen. Sjekk endpoint, API-key og deployment-navn.

## Trenger du hjelp?

Vis meg ett av følgende:
1. **Skjermbilde av Azure Portal → Model deployments** (viser deployment-navn)
2. **Skjermbilde av Supabase Dashboard → Logs** (viser faktisk feilmelding)
3. **Output fra curl-kommandoen** over

Da kan jeg hjelpe deg videre! 🔍
