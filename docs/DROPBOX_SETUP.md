# Dropbox Integrasjon - Oppsett

## Oversikt

Dropbox-integrasjonen bruker en delt tilkobling via Supabase Edge Function. Dette betyr:
- **Én admin** kobler til Dropbox én gang
- **Alle brukere** får automatisk tilgang til Dropbox-funksjonene
- **Tokens lagres sikkert** i databasen (ikke i frontend)
- **Automatisk fornyelse** av tokens

## Deployment-steg

### 1. Kjør database-migrering

```sql
-- Kjør i Supabase SQL Editor
-- Fil: supabase_migrations/add_dropbox_tokens.sql
```

### 2. Sett opp Dropbox App

1. Gå til [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Opprett ny app eller bruk eksisterende
3. Under **Settings**:
   - Kopier **App key** og **App secret**
4. Under **OAuth 2** → **Redirect URIs**, legg til:
   - `http://localhost:5173/dropbox-callback` (utvikling)
   - `https://bsvfire-intern-app.netlify.app/dropbox-callback` (produksjon)
5. Under **Permissions**, aktiver:
   - `files.metadata.read`
   - `files.content.write`
   - `files.content.read`
6. Klikk **Submit**

### 3. Konfigurer Supabase Secrets

I Supabase Dashboard → Settings → Edge Functions → Secrets:

```
DROPBOX_APP_KEY=din-app-key
DROPBOX_APP_SECRET=din-app-secret
```

### 4. Deploy Edge Function

```bash
# Logg inn på Supabase CLI
supabase login

# Link til prosjekt
supabase link --project-ref snyzduzqyjsllzvwuahh

# Deploy Edge Function
supabase functions deploy dropbox-api
```

### 5. Koble til Dropbox (Admin)

1. Logg inn i appen som admin
2. Gå til **Administrator** → **Dropbox Mapper**
3. Klikk **Koble til Dropbox**
4. Logg inn med Dropbox-kontoen som har tilgang til team space
5. Godkjenn tilkoblingen

Nå er Dropbox tilgjengelig for alle brukere!

## Bruk

### Automatisk mappeopprettelse

Når en servicerapport genereres med Dropbox-checkbox aktivert:
1. Mappen opprettes automatisk hvis den ikke finnes
2. PDF-en lastes opp til riktig kundemappe

### Manuell mappeopprettelse

1. Gå til **Administrator** → **Dropbox Mapper**
2. Velg kunde og anlegg
3. Klikk **Opprett full struktur**

## Mappestruktur

```
NY MAPPESTRUKTUR 2026/
└── 01_KUNDER/
    └── {kundenr}_{kundenavn}/
        ├── 01_Avtaler/
        │   ├── 01_Serviceavtale/
        │   └── 02_Alarmoverføring/
        ├── 02_Bygg/
        │   └── {anleggsnavn}/
        │       ├── 01_Tegninger/
        │       ├── 02_Brannalarm/
        │       ├── 07_Rapporter/
        │       │   ├── 01_Servicerapport/
        │       │   └── 02_Kontrollrapport/
        │       └── 99_Foto/
        ├── 03_FDV/
        ├── 04_Faktura/
        └── 99_Korrespondanse/
```

## Feilsøking

### "Dropbox ikke konfigurert"
- Sjekk at admin har koblet til Dropbox
- Sjekk at Edge Function er deployet
- Sjekk at secrets er satt i Supabase

### "Kunne ikke opprette mappe"
- Sjekk at Dropbox-kontoen har skrivetilgang
- Sjekk at team space er tilgjengelig

### Token utløpt
- Admin må koble til Dropbox på nytt
- Gå til **Dropbox Mapper** → **Koble fra** → **Koble til Dropbox**

## Sikkerhet

- App Secret lagres kun i Supabase Secrets (ikke i frontend)
- Tokens lagres kryptert i databasen
- Kun autentiserte brukere kan bruke Dropbox-funksjonene
- Edge Function validerer alle requests
