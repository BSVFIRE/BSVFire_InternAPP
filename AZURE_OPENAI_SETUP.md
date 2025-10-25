# Oppsett av Azure OpenAI for Kontrollnotater

## Hvorfor Azure OpenAI?

✅ **GDPR-kompatibel** - Data lagres i Europa  
✅ **Bedre sikkerhet** - Enterprise-grade sikkerhet  
✅ **Norsk support** - Microsoft har norsk kundeservice  
✅ **Samme modeller** - GPT-4 og Whisper tilgjengelig  
✅ **Bedre SLA** - 99.9% oppetid garantert  

## Steg 1: Opprett Azure OpenAI Resource

1. Gå til [Azure Portal](https://portal.azure.com)
2. Søk etter "Azure OpenAI" i søkefeltet
3. Klikk "Create" for å opprette en ny ressurs

### Konfigurering:
- **Subscription:** Velg din Azure-abonnement
- **Resource Group:** Opprett ny eller velg eksisterende
- **Region:** **Norway East** (anbefalt for norske bedrifter)
- **Name:** Velg et unikt navn (f.eks. `bsvfire-openai`)
- **Pricing tier:** Standard S0

4. Klikk "Review + create" og deretter "Create"

## Steg 2: Deploy Whisper-modellen

1. Gå til din Azure OpenAI-ressurs
2. Klikk på "Model deployments" i menyen
3. Klikk "Create new deployment"

### Whisper Deployment:
- **Model:** `whisper`
- **Deployment name:** `whisper` (eller velg eget navn)
- **Model version:** Velg nyeste versjon
- **Deployment type:** Standard

4. Klikk "Create"

## Steg 3: Deploy GPT-4-modellen

1. I samme "Model deployments"-vindu
2. Klikk "Create new deployment" igjen

### GPT-4 Deployment:
- **Model:** `gpt-4` eller `gpt-4-turbo`
- **Deployment name:** `gpt-4` (eller velg eget navn)
- **Model version:** Velg nyeste versjon
- **Deployment type:** Standard

3. Klikk "Create"

## Steg 4: Hent API-nøkler og Endpoint

1. Gå til din Azure OpenAI-ressurs
2. Klikk på "Keys and Endpoint" i menyen
3. Kopier følgende verdier:
   - **KEY 1** (eller KEY 2)
   - **Endpoint** (f.eks. `https://bsvfire-openai.openai.azure.com/`)

## Steg 5: Konfigurer Supabase Edge Functions

Gå til Supabase Dashboard → Edge Functions → Secrets og legg til:

```
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_WHISPER_DEPLOYMENT_NAME=whisper
AZURE_GPT_DEPLOYMENT_NAME=gpt-4
```

**Viktig:** Erstatt verdiene med dine egne fra Steg 4.

## Steg 6: Deploy Azure-versjonene av Edge Functions

```bash
# Deploy Azure Whisper function
supabase functions deploy transcribe-audio-azure

# Deploy Azure GPT-4 function
supabase functions deploy ai-improve-note-azure
```

## Steg 7: Oppdater frontend til å bruke Azure-funksjoner

Oppdater `src/components/InspectionNotes.tsx`:

### Endre Whisper-kall (linje ~140):

```typescript
// Før:
const { data, error } = await supabase.functions.invoke('transcribe-audio', {
  body: formData
})

// Etter:
const { data, error } = await supabase.functions.invoke('transcribe-audio-azure', {
  body: formData
})
```

### Endre AI-forbedring-kall (linje ~180):

```typescript
// Før:
const { data, error } = await supabase.functions.invoke('ai-improve-note', {
  body: { note: currentNote, context: 'brannalarm kontroll' }
})

// Etter:
const { data, error } = await supabase.functions.invoke('ai-improve-note-azure', {
  body: { note: currentNote, context: 'brannalarm kontroll' }
})
```

## Kostnader (Azure OpenAI)

### Whisper (Norway East):
- **Pris:** ~$0.006 per minutt audio
- **Estimat:** 10 notater/dag = ~$1.80/måned

### GPT-4 (Norway East):
- **Input:** ~$0.03 per 1K tokens
- **Output:** ~$0.06 per 1K tokens
- **Estimat:** 10 forbedringer/dag = ~$3-5/måned

**Total estimert kostnad:** ~$5-7/måned for normal bruk

## Fordeler med Azure vs. OpenAI direkte

| Feature | Azure OpenAI | OpenAI Direkte |
|---------|-------------|----------------|
| **Data lokasjon** | Norge/Europa | USA |
| **GDPR** | ✅ Fullt kompatibel | ⚠️ Krever ekstra avtaler |
| **SLA** | 99.9% | Ingen garanti |
| **Support** | Enterprise support | Community/Email |
| **Fakturering** | Azure-faktura | Kredittkort |
| **Sikkerhet** | Azure AD, Private endpoints | API-nøkkel |
| **Pris** | Litt høyere | Litt lavere |

## Feilsøking

### "Deployment not found"
- Sjekk at deployment-navnet matcher i Secrets og Azure Portal
- Verifiser at modellen er ferdig deployet (kan ta noen minutter)

### "Quota exceeded"
- Gå til Azure Portal → din OpenAI-ressurs → Quotas
- Øk quota for modellen du bruker
- Eller vent til quota resettes (månedlig)

### "Invalid API key"
- Sjekk at API-nøkkelen er kopiert riktig
- Prøv KEY 2 hvis KEY 1 ikke fungerer
- Regenerer nøkkel hvis nødvendig

### "Region not available"
- Ikke alle regioner har alle modeller
- Prøv **Norway East**, **Sweden Central**, eller **West Europe**

## Sikkerhet og compliance

### GDPR:
✅ Data behandles i Norge/Europa  
✅ Microsoft er databehandler  
✅ Databehandleravtale inkludert  

### Logging:
- Azure logger alle API-kall
- Se logs i Azure Portal → Monitoring → Logs
- Sett opp alerts for feil eller høy bruk

### Private Endpoints (Valgfritt):
For ekstra sikkerhet kan du sette opp Private Endpoints:
1. Azure Portal → din OpenAI-ressurs
2. Networking → Private endpoint connections
3. Opprett private endpoint i ditt VNet

## Testing

Test at alt fungerer:

```bash
# Test Whisper
curl -X POST https://your-project.supabase.co/functions/v1/transcribe-audio-azure \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -F "file=@test-audio.mp3"

# Test GPT-4
curl -X POST https://your-project.supabase.co/functions/v1/ai-improve-note-azure \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"note":"test notat","context":"brannalarm kontroll"}'
```

## Neste steg

1. ✅ Opprett Azure OpenAI-ressurs
2. ✅ Deploy Whisper og GPT-4
3. ✅ Konfigurer Supabase Secrets
4. ✅ Deploy Edge Functions
5. ✅ Oppdater frontend-kode
6. ✅ Test funksjonen
7. 📊 Sett opp monitoring og alerts

## Support

- **Azure Support:** https://portal.azure.com → Support
- **Azure OpenAI Docs:** https://learn.microsoft.com/azure/ai-services/openai/
- **Pricing Calculator:** https://azure.microsoft.com/pricing/calculator/

---

**Lykke til med Azure OpenAI! 🚀**
