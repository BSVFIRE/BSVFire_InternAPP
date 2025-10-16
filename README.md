# BSV Fire - Intern Bedriftsapp

Moderne web- og mobilapplikasjon for BSV Fire AS.

## 🎨 Design

- **Svart bakgrunn** (#0a0a0a) med mørk UI
- **Turkis accent** (#14b8a6) som primærfarge
- **Lys/Mørk modus** med brukervalg

## 🚀 Teknologi

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **State**: Zustand
- **Routing**: React Router v6
- **Ikoner**: Lucide React
- **Logging**: Sentralisert logging med database-lagring

## 📦 Installasjon

```bash
# Installer dependencies
npm install

# Start utviklingsserver
npm run dev

# Bygg for produksjon
npm run build
```

## 🏗️ Prosjektstruktur

```
/
├── docs/                          # 📚 Dokumentasjon
│   ├── ADMIN_LOGGING_GUIDE.md    # Admin logging-system
│   ├── ADMIN_TILGANG.md          # Administrator-tilgang
│   ├── ANLEGG_MODULE.md          # Anlegg-modul dokumentasjon
│   ├── KUNDER_MODULE.md          # Kunder-modul dokumentasjon
│   ├── RAPPORT_MODULE.md         # Rapport-modul dokumentasjon
│   ├── OFFLINE_GUIDE.md          # Offline-funksjonalitet
│   └── ...                       # Mer dokumentasjon
│
├── src/
│   ├── components/               # Gjenbrukbare komponenter
│   │   ├── Layout.tsx           # Hovedlayout med sidebar
│   │   └── OfflineIndicator.tsx # Offline-indikator
│   │
│   ├── pages/                    # Sider
│   │   ├── Dashboard.tsx        # Dashboard
│   │   ├── Kunder.tsx           # Kundeadministrasjon
│   │   ├── Anlegg.tsx           # Anleggshåndtering
│   │   ├── Ordre.tsx            # Ordrehåndtering
│   │   ├── Oppgaver.tsx         # Oppgavestyring
│   │   ├── Rapporter.tsx        # Rapporter
│   │   ├── AdminLogger.tsx      # 🔒 Admin: System logger
│   │   └── ...
│   │
│   ├── lib/                      # Utilities og konfigurasjon
│   │   ├── supabase.ts          # Supabase client
│   │   ├── logger.ts            # Logging-system
│   │   ├── offline.ts           # Offline-funksjonalitet
│   │   ├── utils.ts             # Hjelpefunksjoner
│   │   └── constants/           # Konstanter
│   │       ├── statuser.ts      # Status-konstanter
│   │       ├── kontroll.ts      # Kontroll-konstanter
│   │       └── index.ts         # Samlet eksport
│   │
│   ├── store/                    # State management (Zustand)
│   │   ├── authStore.ts         # Autentisering
│   │   └── themeStore.ts        # Tema (lys/mørk)
│   │
│   ├── hooks/                    # Custom React hooks
│   │   └── useOffline.ts        # Offline-hook
│   │
│   ├── App.tsx                   # Hovedapp med routing
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styling
│
├── supabase_migrations/          # Database-migrasjoner
│   ├── create_system_logs_table.sql
│   ├── add_sist_oppdatert_to_*.sql
│   ├── rename_*_timestamps.sql
│   ├── KJØR_DISSE_FØRST.md      # Migrasjonsinstruksjoner
│   └── archive/                  # Gamle migrasjoner
│
├── public/                       # Statiske filer
├── package.json                  # Dependencies
└── README.md                     # Denne filen
```

## 📋 Moduler

### Produksjon
- ✅ **Dashboard** - Oversikt over ordre, oppgaver, prosjekter
- ✅ **Kunder** - Kundeadministrasjon med CRUD
- ✅ **Anlegg** - Anleggshåndtering med kontaktpersoner
- ✅ **Kontaktpersoner** - Kontaktpersonadministrasjon
- ✅ **Ordre** - Ordrehåndtering med fakturering
- ✅ **Oppgaver** - Oppgavestyring
- ✅ **Rapporter** - Brannalarm, Nødlys, Slukkeutstyr
- ✅ **Teknisk** - Servicerapporter og detektorlister
- ✅ **Offline** - Offline-funksjonalitet med synkronisering

### Administrator (🔒 Kun erik.skille@bsvfire.no)
- ✅ **System Logger** - Se alle feil og hendelser fra brukerne

### Under utvikling
- 🚧 **Prosjekter** - Prosjektstyring

## 🔐 Autentisering

Appen bruker Supabase Auth. Logg inn med din BSV Fire e-post.

### Administrator-tilgang
Kun `erik.skille@bsvfire.no` har tilgang til admin-funksjoner.

## 📊 Logging

Systemet har sentralisert logging som:
- Logger kun i development (konsoll)
- Lagrer advarsler og feil i database
- Lar administratorer se alle logger
- Inkluderer brukerinfo og kontekst

**Se:** `docs/ADMIN_LOGGING_GUIDE.md`

## 🌐 Offline-funksjonalitet

Appen støtter offline-modus:
- Caching av data i localStorage
- Kø for ventende endringer
- Automatisk synkronisering ved tilkobling

**Se:** `docs/OFFLINE_GUIDE.md`

## 📚 Dokumentasjon

All dokumentasjon ligger i `docs/`-mappen:
- **Moduler**: Dokumentasjon for hver modul
- **Guides**: Hvordan bruke forskjellige funksjoner
- **Admin**: Administrator-dokumentasjon
- **Teknisk**: Teknisk dokumentasjon

## 🚀 Deployment

```bash
# Bygg for produksjon
npm run build

# Preview produksjonsbygg
npm run preview
```

## 🔧 Vedlikehold

### Database-migrasjoner
Alle SQL-migrasjoner ligger i `supabase_migrations/`.

**Kjør migrasjoner:**
1. Åpne Supabase SQL Editor
2. Kjør filer i rekkefølge (se `KJØR_DISSE_FØRST.md`)

### Logging
Logger ryddes automatisk:
- Debug: 7 dager
- Info: 30 dager
- Warn: 90 dager
- Error: 1 år

## 📱 Mobil (Fremtidig)

React Native versjon planlagt med:
- iOS/iPad support
- Offline-first arkitektur
- Synkronisering med Supabase

---

**BSV Fire AS** © 2025
