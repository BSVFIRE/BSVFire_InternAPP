# Oppsett av Kontrollnotater-funksjonen

## Rask start-guide

Denne guiden hjelper deg med å sette opp den nye notatfunksjonen for brannalarmkontroller.

## Steg 1: Database-oppsett

Kjør SQL-migrasjonen i Supabase Dashboard:

1. Gå til Supabase Dashboard → SQL Editor
2. Åpne filen: `supabase/migrations/20250124_kontroll_notater.sql`
3. Kopier innholdet og lim det inn i SQL Editor
4. Klikk "Run" for å kjøre migrasjonen

**Eller bruk Supabase CLI:**

```bash
supabase db push
```

## Steg 2: Sett opp AI-tjeneste (Valgfritt, men anbefalt)

Du har to alternativer:

### Alternativ A: Azure OpenAI (Anbefalt for norske bedrifter) ⭐

**Fordeler:**
- ✅ GDPR-kompatibel (data i Norge/Europa)
- ✅ Bedre sikkerhet og SLA
- ✅ Norsk support

**Se detaljert guide:** `AZURE_OPENAI_SETUP.md`

**Kort versjon:**
1. Opprett Azure OpenAI-ressurs i Azure Portal (velg Norway East)
2. Deploy Whisper og GPT-4 modeller
3. Legg til i Supabase Secrets:
   ```
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-api-key
   AZURE_WHISPER_DEPLOYMENT_NAME=whisper
   AZURE_GPT_DEPLOYMENT_NAME=gpt-4
   ```

### Alternativ B: OpenAI direkte

1. Få en OpenAI API-nøkkel fra https://platform.openai.com/api-keys
2. Gå til Supabase Dashboard → Edge Functions → Secrets
3. Legg til:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```
4. Endre i `src/components/InspectionNotes.tsx`:
   - `transcribe-audio-azure` → `transcribe-audio`
   - `ai-improve-note-azure` → `ai-improve-note`

## Steg 3: Deploy Edge Functions (Valgfritt)

Hvis du vil bruke AI-funksjoner:

```bash
# Installer Supabase CLI hvis du ikke har det
npm install -g supabase

# Login til Supabase
supabase login

# Link til prosjektet ditt
supabase link --project-ref <your-project-ref>

# Deploy functions (Azure OpenAI - anbefalt)
supabase functions deploy ai-improve-note-azure
supabase functions deploy transcribe-audio-azure

# ELLER deploy functions (OpenAI direkte)
# supabase functions deploy ai-improve-note
# supabase functions deploy transcribe-audio
```

## Steg 4: Test funksjonen

1. Start utviklingsserveren:
   ```bash
   npm run dev
   ```

2. Naviger til Rapporter → Brannalarm
3. Velg et anlegg og start en ny kontroll (FG790 eller NS3960)
4. Se etter den flytende notatknappen nederst til høyre
5. Klikk på knappen for å åpne notatpanelet

## Funksjoner som fungerer uten OpenAI

Selv uten OpenAI API-nøkkel kan du:
- ✅ Skrive manuelle notater
- ✅ Bruke Web Speech API for taleinndata (i Chrome/Edge/Safari)
- ✅ Lagre og slette notater
- ✅ Se alle notater for en kontroll

Med OpenAI API-nøkkel får du i tillegg:
- 🤖 AI-forbedring av notater
- 🎤 Whisper-transkribering (fallback for taleinndata)

## Nettleserstøtte

### Taleinndata (Web Speech API)
- ✅ Chrome/Edge: Full støtte
- ✅ Safari: God støtte
- ⚠️ Firefox: Begrenset støtte (bruk Whisper fallback)

### Generell funksjonalitet
- ✅ Alle moderne nettlesere støttes

## Feilsøking

### "Mikrofon ikke tilgjengelig"
- Sjekk at nettleseren har tilgang til mikrofon
- Bruk HTTPS (kreves for Web Speech API)
- Prøv en annen nettleser

### "AI-funksjoner fungerer ikke"
- Sjekk at OpenAI API-nøkkel er satt korrekt
- Verifiser at Edge Functions er deployet
- Se Edge Function logs i Supabase Dashboard

### "Notater lagres ikke"
- Sjekk at database-migrasjonen er kjørt
- Verifiser Supabase-tilkobling
- Sjekk nettverksfanen i utviklerverktøy for feil

## Kostnader (OpenAI)

Hvis du bruker OpenAI API:
- **Whisper:** ~$0.006 per minutt audio
- **GPT-4:** ~$0.03 per 1K tokens (ca. 750 ord)

Estimert kostnad per kontroll med AI: $0.05 - $0.20

## Neste steg

Når alt fungerer:
1. Tren teamet i å bruke funksjonen
2. Samle tilbakemeldinger
3. Tilpass AI-prompter etter behov
4. Vurder å legge til maler for vanlige notater

## Support

Hvis du trenger hjelp:
1. Sjekk dokumentasjonen: `docs/INSPECTION_NOTES_FEATURE.md`
2. Se koden i `src/components/InspectionNotes.tsx`
3. Kontakt utviklingsteamet

---

**Lykke til med den nye notatfunksjonen! 🎉**
