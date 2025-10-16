# 🔒 Administrator-tilgang

**Administrator:** Erik Skille (erik.skille@bsvfire.no)

---

## ✅ Hva er implementert

### Admin-seksjon i sidebar
Når du logger inn med `erik.skille@bsvfire.no`, ser du en ekstra seksjon nederst i sidebaren:

```
┌─────────────────────┐
│ Hjem                │
│ Kunder              │
│ Anlegg              │
│ ...                 │
│ Dokumentasjon       │
│                     │
│ 🛡️ ADMINISTRATOR    │
│ 🐛 System Logger    │ ← Kun synlig for deg!
└─────────────────────┘
```

### Visuelle forskjeller
- **Overskrift:** "ADMINISTRATOR" med skjold-ikon
- **Farge:** Rød (for å skille fra vanlige menyvalg)
- **Hover:** Rød bakgrunn ved hover
- **Aktiv:** Rød bakgrunn med border når siden er aktiv

---

## 🎯 Tilgang

### Hvem ser admin-menyen?
**Kun:** `erik.skille@bsvfire.no`

### Hvem ser IKKE admin-menyen?
**Alle andre brukere** - de ser kun standard menyvalg.

### Legge til flere administratorer
Rediger `src/components/Layout.tsx`:

```typescript
// Linje 44
const ADMIN_EMAILS = [
  'erik.skille@bsvfire.no',
  'ny.admin@bsvfire.no'  // Legg til her
]
```

---

## 📊 Admin-funksjoner

### 1. System Logger (`/admin/logger`)
**Hva:** Se alle feil og advarsler fra brukerne  
**Tilgang:** Kun administratorer  
**Funksjonalitet:**
- Se alle logger i sanntid
- Filtrer etter bruker, modul, nivå
- Eksporter til CSV
- Rydd opp i gamle logger

**Dokumentasjon:** Se `ADMIN_LOGGING_GUIDE.md`

---

## 🔐 Sikkerhet

### Frontend-beskyttelse
✅ Admin-menyen skjules for ikke-administratorer  
✅ Sjekker brukerens e-post mot ADMIN_EMAILS  

### Backend-beskyttelse (anbefalt)
⚠️ **Viktig:** Frontend-beskyttelse er ikke nok!

**Implementer også backend-beskyttelse:**

```sql
-- Opprett admin-tabell
CREATE TABLE admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legg til deg som admin
INSERT INTO admin_users (user_id, email)
SELECT id, email FROM auth.users 
WHERE email = 'erik.skille@bsvfire.no';

-- Oppdater RLS policy for system_logs
DROP POLICY IF EXISTS "Administratorer kan lese logger" ON system_logs;

CREATE POLICY "Administratorer kan lese logger"
  ON system_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );
```

**Fordeler:**
- ✅ Selv om noen endrer frontend-koden, kan de ikke se logger
- ✅ Database beskytter dataene
- ✅ Enklere å legge til/fjerne administratorer

---

## 🎨 Hvordan det ser ut

### For deg (erik.skille@bsvfire.no)
```
┌─────────────────────────┐
│ 🏠 Hjem                 │
│ 👥 Kunder               │
│ 🏢 Anlegg               │
│ 👥 Kontaktpersoner      │
│ 📋 Ordre                │
│ ✅ Oppgaver             │
│ 📁 Prosjekter           │
│ 📄 Rapporter            │
│ ⚙️ Teknisk              │
│ 📖 Dokumentasjon        │
│                         │
│ 🛡️ ADMINISTRATOR        │
│ 🐛 System Logger        │ ← Kun du ser denne!
└─────────────────────────┘
```

### For andre brukere
```
┌─────────────────────────┐
│ 🏠 Hjem                 │
│ 👥 Kunder               │
│ 🏢 Anlegg               │
│ 👥 Kontaktpersoner      │
│ 📋 Ordre                │
│ ✅ Oppgaver             │
│ 📁 Prosjekter           │
│ 📄 Rapporter            │
│ ⚙️ Teknisk              │
│ 📖 Dokumentasjon        │
│                         │
│ (ingen admin-seksjon)   │
└─────────────────────────┘
```

---

## 🚀 Test det

### Steg 1: Logg inn som admin
```
E-post: erik.skille@bsvfire.no
Passord: [ditt passord]
```

### Steg 2: Sjekk sidebaren
Du skal se:
- ✅ "ADMINISTRATOR" overskrift
- ✅ "System Logger" menyvalg (rød)

### Steg 3: Klikk på "System Logger"
- ✅ Går til `/admin/logger`
- ✅ Ser alle logger

### Steg 4: Test med annen bruker
Logg inn med en annen e-post:
- ❌ Skal IKKE se admin-seksjonen
- ❌ Skal IKKE kunne gå til `/admin/logger` (vises tom side)

---

## 🔮 Fremtidige admin-funksjoner

### Planlagt
- [ ] **Brukeradministrasjon** - Se alle brukere, deaktiver/aktiver
- [ ] **Statistikk** - Avansert statistikk og rapporter
- [ ] **Innstillinger** - Systeminnstillinger
- [ ] **Backup** - Database backup og restore
- [ ] **Audit Log** - Se hvem som har gjort hva

### Legg til nye admin-sider
1. Opprett ny side i `src/pages/Admin[Navn].tsx`
2. Legg til rute i `src/App.tsx`
3. Legg til i `adminNavigation` i `Layout.tsx`:

```typescript
const adminNavigation = [
  { name: 'System Logger', href: '/admin/logger', icon: Bug },
  { name: 'Brukere', href: '/admin/users', icon: Users },  // Ny!
  { name: 'Innstillinger', href: '/admin/settings', icon: Settings },  // Ny!
]
```

---

## 📝 Oppsummering

✅ **Admin-meny er kun synlig for deg**  
✅ **Rød farge for å skille fra vanlige menyvalg**  
✅ **System Logger er klar for bruk**  
✅ **Enkelt å legge til flere administratorer**  

**Tilgang:** Logg inn med `erik.skille@bsvfire.no` og se admin-seksjonen nederst i sidebaren!

---

**Lykke til med administreringen!** 🎉
