# Eksterne Tjenester - FireCTRL

Oversikt over alle eksterne tjenester og integrasjoner.

---

## 🗄️ Supabase (Database & Backend)

**URL:** https://supabase.com/dashboard/project/snyzduzqyjsllzvwuahh

### Database-tabeller (viktigste)
| Tabell | Beskrivelse |
|--------|-------------|
| `customer` | Kunder |
| `anlegg` | Anlegg/bygg |
| `kontaktpersoner` | Kontaktpersoner |
| `ansatte` | Ansatte/teknikere |
| `ordre` | Ordrer |
| `oppgaver` | Oppgaver |
| `tilbud` | Tilbud |
| `servicerapporter` | Servicerapporter |
| `ukesplaner` | Ukesplaner for kontrollbesøk |
| `ukesplan_dager` | Dager i ukesplan |
| `ukesplan_teknikere` | Teknikere tilknyttet ukesplan |
| `kontroll_priser` | Priser for kontrolltyper |
| `dropbox_config` | Dropbox-tilkobling (delt token) |
| `meldinger` | Interne meldinger |
| `prosjekter` | Prosjekter |
| `moter` | Møter |

### Edge Functions (Server-side kode)
| Funksjon | Beskrivelse |
|----------|-------------|
| `import-anlegg` | Server-side import av anlegg fra Excel |
| `dropbox-api` | Proxy for Dropbox API-kall |
| `ai-chat` | AI-chat funksjonalitet |
| `ai-improve-note` | AI-forbedring av notater |
| `ai-improve-servicerapport` | AI-forbedring av servicerapporter |
| `send_email` | Sending av e-post |
| `send-telegram-notification` | Telegram-varsler |
| `telegram-webhook` | Telegram webhook-mottak |
| `parse-pdf` | PDF-parsing |
| `transcribe-audio` | Tale-til-tekst |
| `sync-to-kontrollportal` | Synkronisering til Kontrollportal |
| `poweroffice-proxy` | PowerOffice integrasjon |
| `proff-proxy` | Proff.no bedriftssøk |

### Autentisering
- Supabase Auth med e-post/passord
- Row Level Security (RLS) på alle tabeller

---

## 📁 Dropbox (Fillagring)

**Tilkobling:** Via `dropbox_config`-tabell i Supabase (delt token)

### Mappestruktur
```
/NY MAPPESTRUKTUR 2026/
├── 01_KUNDER/
│   └── {kundenummer}_{kundenavn}/
│       ├── 01_Avtaler/
│       │   └── 03_Ukesplaner/
│       ├── 02_Tilbud/
│       ├── 03_Ordre/
│       └── 04_Anlegg/
│           └── {anleggsnavn}/
│               ├── 01_Bilder/
│               ├── 02_Dokumenter/
│               ├── 03_Rapporter/
│               └── 04_Tegninger/
```

### Funksjoner som bruker Dropbox
- Opprette kundemapper
- Opprette anleggsmapper (ved import og manuell opprettelse)
- Lagre ukesplaner (PDF/HTML)
- Laste opp servicerapporter
- Laste opp bilder og dokumenter

---

## 🐙 GitHub (Kildekode)

**Repository:** https://github.com/BSVFIRE/BSVFire_InternAPP

### Branches
- `main` - Produksjon (deployes automatisk til Netlify)

### Viktige mapper
```
/src
├── components/     # React-komponenter
├── pages/          # Sider/routes
├── lib/            # Hjelpefunksjoner
└── services/       # API-tjenester

/supabase
├── functions/      # Edge Functions
└── migrations/     # Database-migrasjoner
```

---

## 🚀 Netlify (Hosting)

**URL:** https://app.netlify.com (sjekk dashboard for eksakt prosjekt)

**Produksjons-URL:** (din .netlify.app eller custom domain)

### Konfigurasjon
- Bygger automatisk ved push til `main`
- Build command: `npm run build`
- Publish directory: `dist`

---

## 📧 Resend (E-post)

**Tjeneste:** https://resend.com

### Bruksområder
- Sende servicerapporter til kunder
- Vedlegg (PDF-rapporter)
- Standardisert e-postmal med BSVFire-signatur

### Konfigurasjon
- **API-nøkkel:** `RESEND2_API_KEY` (i Supabase Edge Function secrets)
- **Avsender:** mail@bsvfire.no
- **Edge Function:** `send_email`

### E-postmal inneholder
- Hilsen og info om årskontroll
- Kontaktinfo (mail@bsvfire.no, 900 46 600)
- BSVFire-signatur med logo
- Støtte for vedlegg (PDF)

---

## 🤖 Andre integrasjoner

### Telegram
- **Bot:** Brukes for varsler og meldinger
- **Webhook:** Mottar meldinger via Edge Function

### OpenAI / Azure OpenAI
- AI-chat
- Forbedring av notater og rapporter
- Tale-til-tekst (Whisper)

### Proff.no
- Bedriftssøk via organisasjonsnummer
- Proxy via Edge Function

### PowerOffice
- Regnskapsintegrasjon (proxy via Edge Function)

### Brreg
- Bedriftssøk direkte fra frontend (`brregApi.ts`)

---

## 🔑 Miljøvariabler

### Supabase (i koden)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Edge Functions (i Supabase Dashboard)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (eller Azure-variant)
- `TELEGRAM_BOT_TOKEN`
- `DROPBOX_APP_KEY`
- `DROPBOX_APP_SECRET`

---

## 📋 Vedlikehold

### Database-migrasjoner
Migrasjoner ligger i `/supabase/migrations/`. Kjør manuelt i Supabase SQL Editor.

### Edge Functions
Deploy med:
```bash
npx supabase functions deploy <function-name>
```

### Oppdatere produksjon
```bash
git add -A
git commit -m "Beskrivelse"
git push
```
Netlify bygger og deployer automatisk.

---

*Sist oppdatert: August 2026*
