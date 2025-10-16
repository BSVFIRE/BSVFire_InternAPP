# 📊 Admin Logging System - Komplett Guide

**Mål:** La administratorer se alle feil og hendelser fra brukerne  
**Status:** Klar for bruk  
**Tilgang:** `/admin/logger`

---

## ✅ Hva er implementert

### 1. Database-tabell (`system_logs`)
✅ Lagrer alle advarsler og feil automatisk  
✅ Inkluderer brukerinfo, side, nettleser, etc.  
✅ Automatisk opprydding av gamle logger  

### 2. Logger-system (`src/lib/logger.ts`)
✅ Miljøbasert logging (kun dev i konsoll)  
✅ Automatisk lagring til database  
✅ Navngitte loggere for moduler  

### 3. Admin Logger-side (`/admin/logger`)
✅ Oversikt over alle logger  
✅ Filtrering etter nivå, modul, bruker  
✅ Detaljert visning av hver logg  
✅ Eksport til CSV  
✅ Automatisk opprydding  

---

## 🚀 Kom i gang

### Steg 1: Kjør SQL-migrasjonen
```bash
# Åpne Supabase SQL Editor og kjør:
supabase_migrations/create_system_logs_table.sql
```

Dette oppretter:
- `system_logs` tabell
- Indekser for rask søking
- Row Level Security policies
- Automatisk oppryddingsfunksjon

### Steg 2: Test logging-systemet
```typescript
import { createLogger } from '@/lib/logger'

const log = createLogger('TestModule')

// Disse vises kun i konsollen (dev)
log.log('Debug melding')
log.info('Info melding')

// Disse lagres OGSÅ i databasen
log.warn('Advarsel!') // ⚠️ Lagres
log.error('Feil oppstod!') // ❌ Lagres
```

### Steg 3: Åpne Admin Logger
Gå til: `http://localhost:5173/admin/logger`

---

## 📋 Hva lagres i databasen?

### Automatisk lagring
- ✅ **Advarsler** (`log.warn()`)
- ✅ **Feil** (`log.error()`)

### IKKE lagret (kun konsoll i dev)
- ❌ Debug (`log.log()`, `log.debug()`)
- ❌ Info (`log.info()`)

### Informasjon som lagres
For hver logg lagres:
- **Tidspunkt** - Når feilen skjedde
- **Nivå** - warn eller error
- **Melding** - Feilmeldingen
- **Ekstra data** - JSON med detaljer
- **Bruker** - Hvem som opplevde feilen
- **Side** - Hvilken side feilen skjedde på
- **Modul** - Hvilken komponent/fil
- **Nettleser** - Browser info, skjermstørrelse, etc.

---

## 🎯 Brukseksempler

### Eksempel 1: Feilhåndtering i komponent
```typescript
import { createLogger } from '@/lib/logger'

const log = createLogger('Anlegg')

async function loadAnlegg() {
  try {
    log.log('Laster anlegg...') // Kun konsoll
    const { data, error } = await supabase.from('anlegg').select('*')
    
    if (error) {
      log.error('Feil ved lasting av anlegg:', error) // ❌ Lagres i DB!
      throw error
    }
    
    log.log('Anlegg lastet:', data.length) // Kun konsoll
    return data
  } catch (err) {
    log.error('Kritisk feil:', err) // ❌ Lagres i DB!
    throw err
  }
}
```

### Eksempel 2: Validering med advarsel
```typescript
import { createLogger } from '@/lib/logger'

const log = createLogger('Ordre')

function validateOrdre(ordre: Ordre) {
  if (!ordre.kundenr) {
    log.error('Ordre mangler kundenr!', { ordre }) // ❌ Lagres i DB!
    throw new Error('Kundenr er påkrevd')
  }
  
  if (!ordre.anlegg_id) {
    log.warn('Ordre mangler anlegg_id', { ordre }) // ⚠️ Lagres i DB!
    // Fortsett likevel
  }
  
  log.debug('Ordre validert OK') // Kun konsoll
}
```

### Eksempel 3: Offline-synkronisering
```typescript
import { createLogger } from '@/lib/logger'

const log = createLogger('Offline')

async function syncChanges() {
  log.info('Starter synkronisering...') // Kun konsoll
  
  try {
    const result = await syncToDatabase()
    log.info('Synkronisering fullført:', result) // Kun konsoll
  } catch (error) {
    log.error('Synkronisering feilet!', error) // ❌ Lagres i DB!
    // Administrator vil se denne feilen i /admin/logger
  }
}
```

---

## 🔍 Bruke Admin Logger-siden

### Hovedfunksjoner

#### 1. Statistikk
- **Totalt logger** - Alle logger i databasen
- **Feil** - Antall error-logger
- **Advarsler** - Antall warn-logger
- **Info** - Antall info-logger

#### 2. Filtrering
- **Søk** - Søk i meldinger, brukere, moduler
- **Nivå** - Filtrer på error, warn, info, debug
- **Modul** - Filtrer på spesifikk komponent (Anlegg, Ordre, etc.)

#### 3. Logg-liste
Hver logg viser:
- Nivå-ikon (🔴 error, ⚠️ warn, etc.)
- Tidspunkt
- Melding
- Bruker som opplevde feilen
- Modul/komponent

#### 4. Detaljvisning
Klikk på en logg for å se:
- Full melding
- Ekstra data (JSON)
- Brukerinfo
- Side-URL
- Nettleser-info
- User Agent

#### 5. Eksport
- Eksporter alle logger til CSV
- Åpne i Excel for analyse
- Inneholder: Tidspunkt, Nivå, Modul, Melding, Bruker, Side

#### 6. Opprydding
- Slett gamle logger automatisk
- Debug: 7 dager
- Info: 30 dager
- Warn: 90 dager
- Error: 1 år

---

## 🎨 Visuelle indikatorer

### Nivå-farger
- 🔴 **Error** - Rød (kritisk feil)
- ⚠️ **Warn** - Gul (advarsel)
- 🔵 **Info** - Blå (informasjon)
- 🐛 **Debug** - Grå (debugging)

### Ikoner
- `AlertCircle` - Error
- `AlertTriangle` - Warning
- `Info` - Info
- `Bug` - Debug

---

## 📊 Eksempel: Hva du ser som admin

### Scenario: Bruker får feil ved lasting av anlegg

**I Admin Logger ser du:**
```
🔴 ERROR | Anlegg | 2025-10-12 23:05:32
Feil ved lasting av anlegg: relation "anlegg" does not exist

Bruker: erik@bsvfire.no
Side: http://localhost:5173/anlegg
Nettleser: Chrome 120.0.0 (Mac OS X)
```

**Klikk for detaljer:**
```json
{
  "level": "error",
  "message": "Feil ved lasting av anlegg",
  "namespace": "Anlegg",
  "user_email": "erik@bsvfire.no",
  "page_url": "http://localhost:5173/anlegg",
  "data": {
    "error": {
      "message": "relation \"anlegg\" does not exist",
      "code": "42P01"
    }
  },
  "browser_info": {
    "language": "nb-NO",
    "platform": "MacIntel",
    "online": true,
    "screen": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

**Du kan nå:**
1. Se at det er en database-feil
2. Vite hvilken bruker som opplevde det
3. Vite når det skjedde
4. Vite hvilken side det skjedde på
5. Se nettleser-info for debugging

---

## 🔒 Sikkerhet og tilgangskontroll

### Nåværende oppsett (midlertidig)
- ✅ Alle autentiserte brukere kan skrive logger
- ✅ Alle autentiserte brukere kan lese logger
- ⚠️ Alle autentiserte brukere kan slette logger

### Anbefalt oppsett (fremtidig)
Opprett en `admin_users` tabell og oppdater policies:

```sql
-- Opprett admin-tabell
CREATE TABLE admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legg til administratorer
INSERT INTO admin_users (user_id) 
SELECT id FROM auth.users WHERE email = 'erik@bsvfire.no';

-- Oppdater policy for lesing
DROP POLICY "Administratorer kan lese logger" ON system_logs;
CREATE POLICY "Administratorer kan lese logger"
  ON system_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- Oppdater policy for sletting
DROP POLICY "Administratorer kan slette logger" ON system_logs;
CREATE POLICY "Administratorer kan slette logger"
  ON system_logs
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );
```

---

## 🔧 Vedlikehold

### Automatisk opprydding
Kjør månedlig (kan settes opp som Supabase Edge Function):

```sql
SELECT cleanup_old_logs();
```

Dette sletter:
- Debug-logger eldre enn 7 dager
- Info-logger eldre enn 30 dager
- Warn-logger eldre enn 90 dager
- Error-logger eldre enn 1 år

### Manuell opprydding
I Admin Logger-siden:
1. Klikk "Rydd opp"
2. Bekreft
3. Gamle logger slettes automatisk

---

## 📈 Ytelse

### Database-størrelse
- Gjennomsnittlig logg: ~1-2 KB
- 1000 logger: ~1-2 MB
- 10 000 logger: ~10-20 MB

### Påvirkning på app
- ✅ Minimal - logging skjer asynkront
- ✅ Feiler stille hvis database er nede
- ✅ Blokkerer ikke brukeropplevelsen

---

## 🎯 Best practices

### DO ✅
- Bruk `log.error()` for alle feil
- Bruk `log.warn()` for advarsler
- Inkluder kontekst i meldinger
- Logg viktig brukerinfo

### DON'T ❌
- Ikke logg passord eller sensitiv data
- Ikke logg for mye (kun warn/error lagres)
- Ikke logg personlig informasjon unødvendig
- Ikke logg i loops (kan fylle databasen)

---

## 🚀 Fremtidige forbedringer

### Fase 1 (nå)
- ✅ Database-lagring
- ✅ Admin-side
- ✅ Filtrering og søk
- ✅ Eksport til CSV

### Fase 2 (senere)
- [ ] Real-time oppdatering (Supabase Realtime)
- [ ] E-post-varsling ved kritiske feil
- [ ] Slack/Teams-integrasjon
- [ ] Automatisk feilrapportering

### Fase 3 (fremtid)
- [ ] Integrasjon med Sentry
- [ ] Performance monitoring
- [ ] User session replay
- [ ] Automatisk feilanalyse med AI

---

## 📝 Oppsummering

**Som administrator kan du nå:**
1. ✅ Se alle feil og advarsler fra brukerne
2. ✅ Filtrere etter bruker, modul, tidspunkt
3. ✅ Se detaljert kontekst for hver feil
4. ✅ Eksportere logger for analyse
5. ✅ Rydde opp i gamle logger

**Tilgang:** `http://localhost:5173/admin/logger`

**Produksjon:** `https://din-app.no/admin/logger`

---

**Lykke til med debugging!** 🎉
