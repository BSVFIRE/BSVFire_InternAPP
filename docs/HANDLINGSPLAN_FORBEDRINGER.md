# 🎯 Handlingsplan: Kritiske forbedringer

**Mål:** Fikse de mest kritiske inkonsistensene i prosjektet  
**Estimert tid:** 3-5 dager  
**Prioritet:** Høy

---

## 📋 Fase 1: Database-konsistens (Dag 1-2)

### Task 1.1: Standardiser tidsstempler
**Problem:** Blanding av `created_at` og `opprettet_dato`

**SQL-migrasjoner som må lages:**

#### 1. `rename_oppgaver_timestamps.sql`
```sql
-- Endre oppgaver fra created_at til opprettet_dato
ALTER TABLE oppgaver 
RENAME COLUMN created_at TO opprettet_dato;

-- Oppdater alle referanser i koden
```

**Filer som må oppdateres:**
- `src/lib/supabase.ts` - Endre type-definisjon
- `src/pages/Oppgaver.tsx` - Endre alle referanser (18 steder)
- `src/pages/Ordre.tsx` - Endre referanser til oppgaver (3 steder)

#### 2. `rename_servicerapporter_timestamps.sql`
```sql
-- Endre servicerapporter
ALTER TABLE servicerapporter 
RENAME COLUMN created_at TO opprettet_dato;

ALTER TABLE servicerapporter 
RENAME COLUMN updated_at TO sist_oppdatert;
```

**Filer som må oppdateres:**
- `src/pages/teknisk/ServicerapportView.tsx`
- `src/pages/teknisk/ServicerapportEditor.tsx`
- `src/pages/teknisk/ServicerapportPDF.tsx`
- `src/pages/teknisk/ServicerapportPreview.tsx`

#### 3. `rename_nodlys_timestamps.sql`
```sql
-- Endre anleggsdata_nodlys
ALTER TABLE anleggsdata_nodlys 
RENAME COLUMN created_at TO opprettet_dato;

-- Endre nettverk_nodlys
ALTER TABLE nettverk_nodlys 
RENAME COLUMN created_at TO opprettet_dato;
```

**Filer som må oppdateres:**
- `src/pages/rapporter/Nodlys.tsx`

#### 4. `rename_brannalarm_timestamps.sql`
```sql
-- Hvis brannalarm-tabeller har created_at
ALTER TABLE anleggsdata_brannalarm 
RENAME COLUMN created_at TO opprettet_dato;
```

**Filer som må oppdateres:**
- `src/pages/rapporter/Brannalarm.tsx`

---

### Task 1.2: Legg til sist_oppdatert på manglende tabeller

**Tabeller som trenger sist_oppdatert:**

#### 1. `add_sist_oppdatert_to_prosjekter.sql`
```sql
ALTER TABLE prosjekter 
ADD COLUMN IF NOT EXISTS sist_oppdatert TIMESTAMPTZ;

UPDATE prosjekter 
SET sist_oppdatert = NOW() 
WHERE sist_oppdatert IS NULL;

CREATE OR REPLACE FUNCTION update_prosjekter_sist_oppdatert_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sist_oppdatert = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_prosjekter_sist_oppdatert ON prosjekter;

CREATE TRIGGER update_prosjekter_sist_oppdatert
    BEFORE UPDATE ON prosjekter
    FOR EACH ROW
    EXECUTE FUNCTION update_prosjekter_sist_oppdatert_column();
```

#### 2. `add_sist_oppdatert_to_detektorlister.sql`
```sql
-- Samme pattern som over for detektorlister
```

#### 3. `add_sist_oppdatert_to_anleggsdata.sql`
```sql
-- For anleggsdata_brannalarm, anleggsdata_nodlys, etc.
```

---

### Task 1.3: Oppdater TypeScript-typer

**Fil:** `src/lib/supabase.ts`

Legg til `sist_oppdatert` og endre `created_at` → `opprettet_dato` for:
- `oppgaver`
- `prosjekter`
- `servicerapporter`
- Alle anleggsdata-tabeller

---

## 📋 Fase 2: Logging-system (Dag 3)

### Task 2.1: Opprett logger-utility

**Fil:** `src/lib/logger.ts`
```typescript
const isDev = import.meta.env.DEV
const isTest = import.meta.env.MODE === 'test'

export const logger = {
  log: (...args: any[]) => {
    if (isDev && !isTest) {
      console.log(...args)
    }
  },
  
  error: (...args: any[]) => {
    // Alltid logg errors
    console.error(...args)
    // TODO: Send til Sentry eller lignende
  },
  
  warn: (...args: any[]) => {
    if (isDev && !isTest) {
      console.warn(...args)
    }
  },
  
  debug: (...args: any[]) => {
    if (isDev && !isTest) {
      console.debug(...args)
    }
  },
  
  info: (...args: any[]) => {
    if (isDev && !isTest) {
      console.info(...args)
    }
  }
}
```

### Task 2.2: Erstatt console.log

**Prioriterte filer (mest console.log):**
1. `src/pages/rapporter/brannalarm/kontroll/NS3960KontrollView.tsx` (35 stk)
2. `src/pages/rapporter/Nodlys.tsx` (25 stk)
3. `src/pages/Anlegg.tsx` (23 stk)
4. `src/lib/offline.ts` (18 stk)

**Søk og erstatt:**
```bash
# Finn alle console.log
grep -r "console.log" src/

# Erstatt med logger.log
# (gjøres manuelt eller med script)
```

---

## 📋 Fase 3: Error Handling (Dag 4)

### Task 3.1: Opprett error-handling utility

**Fil:** `src/lib/errorHandler.ts`
```typescript
import { logger } from './logger'

export class AppError extends Error {
  constructor(
    message: string,
    public userMessage: string,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleError(error: unknown, context?: string): string {
  logger.error(`Error in ${context}:`, error)
  
  if (error instanceof AppError) {
    return error.userMessage
  }
  
  if (error instanceof Error) {
    return `En feil oppstod: ${error.message}`
  }
  
  return 'En ukjent feil oppstod. Vennligst prøv igjen.'
}
```

### Task 3.2: Implementer i komponenter

**Eksempel:**
```typescript
// Før
try {
  // ... kode
} catch (error) {
  console.error('Feil:', error)
  alert('Kunne ikke lagre')
}

// Etter
try {
  // ... kode
} catch (error) {
  const errorMessage = handleError(error, 'saveKunde')
  setError(errorMessage)
}
```

---

## 📋 Fase 4: Filstruktur (Dag 5)

### Task 4.1: Opprett mappestruktur

```bash
mkdir -p docs
mkdir -p supabase_migrations/archive
mkdir -p supabase_migrations/active
mkdir -p src/lib/constants
```

### Task 4.2: Flytt filer

**Dokumentasjon til docs/:**
```bash
mv ANLEGG_MODULE.md docs/
mv KUNDER_MODULE.md docs/
mv KONTAKTPERSONER_MODULE.md docs/
mv RAPPORT_MODULE.md docs/
mv SLUKKEUTSTYR_MODULE.md docs/
mv SLUKKEUTSTYR_IMPLEMENTASJON.md docs/
mv SLUKKEUTSTYR_STATUS.md docs/
mv OFFLINE_GUIDE.md docs/
mv TESTING.md docs/
```

**Gamle SQL-filer til archive/:**
```bash
mv FIX_*.sql supabase_migrations/archive/
mv KJØR_*.sql supabase_migrations/archive/
mv FJERN_*.sql supabase_migrations/archive/
```

**Nye migrasjoner til active/:**
```bash
mv supabase_migrations/add_*.sql supabase_migrations/active/
```

### Task 4.3: Opprett konstant-filer

**Fil:** `src/lib/constants/statuser.ts`
```typescript
export const ORDRE_STATUSER = {
  VENTENDE: 'Ventende',
  PAGAENDE: 'Pågående',
  FULLFORT: 'Fullført',
  FAKTURERT: 'Fakturert'
} as const

export const ANLEGG_STATUSER = {
  IKKE_UTFORT: 'Ikke utført',
  UTFORT: 'Utført',
  PLANLAGT: 'Planlagt',
  UTSATT: 'Utsatt',
  OPPSAGT: 'Oppsagt'
} as const

export const OPPGAVE_STATUSER = {
  IKKE_PABEGYNT: 'Ikke påbegynt',
  PAGAENDE: 'Pågående',
  FULLFORT: 'Fullført'
} as const

export const PRIORITETER = {
  LAV: 'Lav',
  MEDIUM: 'Medium',
  HOY: 'Høy'
} as const
```

**Fil:** `src/lib/constants/kontrolltyper.ts`
```typescript
export const KONTROLLTYPER = [
  'Brannalarm',
  'Nødlys',
  'Slukkeutstyr',
  'Røykluker',
  'Ekstern'
] as const

export const MAANEDER = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
] as const
```

---

## ✅ Sjekkliste

### Fase 1: Database
- [ ] Opprett SQL-migrasjoner for tidsstempler
- [ ] Kjør migrasjoner i Supabase
- [ ] Oppdater TypeScript-typer
- [ ] Oppdater alle komponenter
- [ ] Test at alt fungerer

### Fase 2: Logging
- [ ] Opprett logger.ts
- [ ] Erstatt console.log i kritiske filer
- [ ] Test logging i dev og prod

### Fase 3: Error Handling
- [ ] Opprett errorHandler.ts
- [ ] Implementer i kritiske komponenter
- [ ] Test error-scenarios

### Fase 4: Struktur
- [ ] Opprett mappestruktur
- [ ] Flytt dokumentasjon
- [ ] Flytt SQL-filer
- [ ] Opprett konstant-filer
- [ ] Oppdater imports

---

## 🎯 Suksesskriterier

1. ✅ Alle tidsstempler bruker norsk navngiving
2. ✅ Alle relevante tabeller har `sist_oppdatert`
3. ✅ Ingen console.log i produksjonskode
4. ✅ Konsistent error handling
5. ✅ Ryddig filstruktur
6. ✅ Alle tester passerer

---

## 📊 Estimert tidsbruk

| Fase | Oppgaver | Estimat |
|------|----------|---------|
| 1 | Database-konsistens | 12-16 timer |
| 2 | Logging-system | 4-6 timer |
| 3 | Error handling | 4-6 timer |
| 4 | Filstruktur | 2-4 timer |
| **Total** | | **22-32 timer** |

---

## 🚀 Start her

1. Les gjennom hele planen
2. Start med Fase 1, Task 1.1
3. Commit ofte med beskrivende meldinger
4. Test etter hver større endring
5. Dokumenter endringer underveis

**Lykke til!** 🎉
