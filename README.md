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

## 📦 Installasjon

```bash
# Installer dependencies
npm install

# Start utviklingsserver
npm run dev

# Bygg for produksjon
npm run build
```

## 🏗️ Struktur

```
src/
├── components/       # Gjenbrukbare komponenter
│   └── Layout.tsx   # Hovedlayout med sidebar
├── pages/           # Sider
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   └── ...
├── store/           # State management (Zustand)
│   ├── authStore.ts
│   └── themeStore.ts
├── lib/             # Utilities og konfigurasjon
│   ├── supabase.ts
│   └── utils.ts
├── App.tsx          # Hovedapp med routing
├── main.tsx         # Entry point
└── index.css        # Global styling
```

## 📋 Moduler

- ✅ **Dashboard** - Oversikt over ordre, oppgaver, prosjekter
- 🚧 **Kunder** - Kundeadministrasjon
- 🚧 **Anlegg** - Anleggshåndtering
- 🚧 **Ordre** - Ordrehåndtering
- 🚧 **Oppgaver** - Oppgavestyring
- 🚧 **Prosjekter** - Prosjektstyring
- 🚧 **Rapporter** - PDF-rapporter

## 🔐 Autentisering

Appen bruker Supabase Auth. Logg inn med din BSV Fire e-post.

## 🎯 Neste steg

1. Implementere Kunder-modul med CRUD
2. Implementere Anlegg-modul
3. Implementere Ordre-modul
4. Implementere Oppgaver-modul
5. PDF-generering for rapporter
6. Offline-funksjonalitet

## 📱 Mobil (Fremtidig)

React Native versjon planlagt med:
- iOS/iPad support
- Offline-first arkitektur
- Synkronisering med Supabase

---

**BSV Fire AS** © 2025
