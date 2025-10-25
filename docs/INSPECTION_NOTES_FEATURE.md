# Kontrollnotater - Inspeksjonsnotatfunksjon

## Oversikt

Denne funksjonen lar brukere ta notater under brannalarmkontroller med støtte for:
- **Manuell tekstinput** - Skriv notater direkte
- **Taleinndata (Whisper AI)** - Bruk mikrofon til å diktere notater
- **AI-assistanse** - Få forslag til forbedring og strukturering av notater
- **Automatisk lagring** - Notater lagres automatisk til databasen

## Komponenter

### 1. InspectionNotes.tsx
Hovedkomponenten som håndterer notatfunksjonaliteten.

**Funksjoner:**
- Vis liste over eksisterende notater
- Legg til nye notater (tekst eller tale)
- Slett notater
- AI-forbedring av notater
- Talegjenkjenning med Web Speech API
- Whisper API fallback for taletranskribering

### 2. FloatingNotesButton.tsx
En flytende knapp som åpner notatpanelet.

**Funksjoner:**
- Vises som en flytende knapp nederst til høyre
- Åpner/lukker notatpanelet
- Backdrop for å lukke panelet

## Database Schema

### Tabell: `kontroll_notater`

```sql
CREATE TABLE kontroll_notater (
  id UUID PRIMARY KEY,
  kontroll_id UUID REFERENCES anleggsdata_kontroll(id),
  anlegg_id UUID REFERENCES anlegg(id),
  content TEXT NOT NULL,
  is_voice BOOLEAN DEFAULT FALSE,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Supabase Edge Functions

### 1. ai-improve-note
Bruker OpenAI GPT-4 til å forbedre og strukturere notater.

**Endpoint:** `/functions/v1/ai-improve-note`

**Request:**
```json
{
  "note": "notat tekst her",
  "context": "brannalarm kontroll"
}
```

**Response:**
```json
{
  "suggestion": "Forbedret og strukturert notat"
}
```

### 2. transcribe-audio
Bruker OpenAI Whisper til å transkribere lydopptak.

**Endpoint:** `/functions/v1/transcribe-audio`

**Request:** FormData med audio file

**Response:**
```json
{
  "text": "Transkribert tekst"
}
```

## Installasjon

### 1. Kjør database-migrering

```bash
# Koble til Supabase
supabase link --project-ref <your-project-ref>

# Kjør migrering
supabase db push
```

Eller kjør SQL-filen manuelt i Supabase Dashboard:
```
supabase/migrations/20250124_kontroll_notater.sql
```

### 2. Deploy Edge Functions

```bash
# Deploy AI improve note function
supabase functions deploy ai-improve-note

# Deploy transcribe audio function
supabase functions deploy transcribe-audio
```

### 3. Sett opp miljøvariabler

I Supabase Dashboard → Edge Functions → Secrets, legg til:

```
OPENAI_API_KEY=sk-your-openai-api-key-here
```

## Bruk

### I FG790 Kontroll

Notatknappen vises automatisk når du er inne i en FG790-kontroll. Klikk på den flytende knappen nederst til høyre for å åpne notatpanelet.

### I NS3960 Kontroll

Samme funksjonalitet som FG790 - klikk på den flytende knappen for å åpne notater.

## Funksjoner

### Taleinndata

1. **Web Speech API (Standard)**
   - Fungerer i Chrome, Edge, Safari
   - Støtter norsk språk (`nb-NO`)
   - Sanntids transkribering

2. **Whisper API (Fallback)**
   - Brukes hvis Web Speech API ikke fungerer
   - Krever OpenAI API-nøkkel
   - Høyere nøyaktighet for norsk

### AI-assistanse

AI-assistenten kan:
- Forbedre grammatikk og struktur
- Formatere notater profesjonelt
- Strukturere informasjon logisk
- Beholde all teknisk informasjon

### Eksempel på AI-forbedring

**Før:**
```
sjekket detektorer i 2 etg, noen var skitne, må byttes snart
```

**Etter AI-forbedring:**
```
Kontroll av detektorer - 2. etasje:
• Visuell inspeksjon gjennomført
• Observasjon: Flere detektorer viser tegn til forurensning
• Anbefaling: Utskifting anbefales ved neste serviceavtale
```

## Sikkerhet

- Row Level Security (RLS) er aktivert på `kontroll_notater`-tabellen
- Kun autentiserte brukere kan lese, opprette, oppdatere og slette notater
- Notater er knyttet til spesifikke kontroller og anlegg

## Feilsøking

### Mikrofon fungerer ikke

1. Sjekk nettlesertillatelser for mikrofon
2. Bruk HTTPS (kreves for Web Speech API)
3. Test i Chrome/Edge (best støtte)

### AI-funksjoner fungerer ikke

1. Sjekk at OpenAI API-nøkkel er satt i Supabase Secrets
2. Verifiser at Edge Functions er deployet
3. Sjekk Edge Function logs i Supabase Dashboard

### Notater lagres ikke

1. Sjekk database-tilkoblinger
2. Verifiser at migrering er kjørt
3. Sjekk RLS-policies

## Fremtidige forbedringer

- [ ] Støtte for bilder i notater
- [ ] Eksport av notater til PDF
- [ ] Deling av notater mellom brukere
- [ ] Maler for vanlige notater
- [ ] Offline-støtte med lokal lagring
- [ ] Søk i notater
- [ ] Tagging av notater

## Teknisk stack

- **Frontend:** React + TypeScript
- **UI:** Tailwind CSS + Lucide Icons
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **AI:** OpenAI GPT-4 + Whisper
- **Talegjenkjenning:** Web Speech API

## Support

For spørsmål eller problemer, kontakt utviklingsteamet eller opprett en issue i prosjektets repository.
