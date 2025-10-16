# 🔍 Nødvendige oppdateringer i prosjektet

**Analysert:** 2025-10-12  
**Status:** Identifisert forbedringer og inkonsistenser

---

## 🔴 Kritiske problemer

### 1. **Inkonsistent navngiving av tidsstempler**
**Problem:** Prosjektet bruker både `opprettet_dato` og `created_at` for samme konsept.

**Påvirkede tabeller:**
- ✅ `anlegg` → bruker `opprettet_dato` (konsistent)
- ✅ `ordre` → bruker `opprettet_dato` (konsistent)
- ❌ `oppgaver` → bruker `created_at` (inkonsistent!)
- ✅ `customer` → bruker `opprettet_dato` (konsistent)
- ✅ `kontaktpersoner` → bruker `opprettet_dato` (konsistent)
- ❌ `servicerapporter` → bruker `created_at` og `updated_at` (inkonsistent!)
- ❌ `anleggsdata_nodlys` → bruker `created_at` (inkonsistent!)
- ❌ `nettverk_nodlys` → bruker `created_at` (inkonsistent!)

**Anbefaling:**
Standardiser til norsk navngiving (`opprettet_dato` og `sist_oppdatert`) for konsistens.

**Løsning:**
```sql
-- Migrasjon for å endre oppgaver
ALTER TABLE oppgaver RENAME COLUMN created_at TO opprettet_dato;

-- Migrasjon for servicerapporter
ALTER TABLE servicerapporter RENAME COLUMN created_at TO opprettet_dato;
ALTER TABLE servicerapporter RENAME COLUMN updated_at TO sist_oppdatert;

-- Og så videre for andre tabeller...
```

---

## 🟡 Viktige forbedringer

### 2. **Manglende `sist_oppdatert` på flere tabeller**

**Tabeller som mangler `sist_oppdatert`:**
- ❌ `customer` - Har feltet i kode, men mangler trigger?
- ❌ `prosjekter` - Mangler helt
- ❌ `servicerapporter` - Har `updated_at`, bør endres til `sist_oppdatert`
- ❌ `detektorlister` - Mangler helt
- ❌ `anleggsdata_brannalarm` - Mangler helt
- ❌ `anleggsdata_nodlys` - Mangler helt
- ❌ `anleggsdata_brannslukkere` - Mangler helt
- ❌ `anleggsdata_brannslanger` - Mangler helt
- ❌ `nettverk_brannalarm` - Mangler helt
- ❌ `nettverk_nodlys` - Mangler helt

**Anbefaling:**
Legg til `sist_oppdatert` på alle tabeller som oppdateres regelmessig.

---

### 3. **Mange console.log statements i produksjonskode**

**Problem:** 
- 200+ console.log statements i kodebasen
- Kan påvirke ytelse og sikkerhet
- Gjør debugging vanskeligere

**Påvirkede filer:**
- `pages/rapporter/brannalarm/kontroll/NS3960KontrollView.tsx` (35 stk)
- `pages/rapporter/Nodlys.tsx` (25 stk)
- `pages/Anlegg.tsx` (23 stk)
- `lib/offline.ts` (18 stk)
- Og mange flere...

**Anbefaling:**
1. Implementer et logging-system (f.eks. med miljøvariabler)
2. Fjern eller betinge console.log basert på miljø
3. Bruk et logging-bibliotek som `winston` eller `pino`

**Løsning:**
```typescript
// lib/logger.ts
const isDev = import.meta.env.DEV

export const logger = {
  log: (...args: any[]) => isDev && console.log(...args),
  error: (...args: any[]) => console.error(...args), // Alltid logg errors
  warn: (...args: any[]) => isDev && console.warn(...args),
}

// Bruk:
import { logger } from '@/lib/logger'
logger.log('Debug info') // Kun i dev
```

---

### 4. **Manglende error handling**

**Problem:**
Mange steder brukes bare `console.error()` uten brukersynlig feilmelding.

**Eksempel fra Kunder.tsx:**
```typescript
} catch (err) {
  console.error('Feil ved lasting:', err)
  setError(err instanceof Error ? err.message : 'Kunne ikke laste data')
}
```

**Anbefaling:**
- Implementer et sentralt error-handling system
- Vis brukervennlige feilmeldinger
- Logg feil til et eksternt system (Sentry, LogRocket, etc.)

---

### 5. **Manglende TypeScript strict mode**

**Problem:**
Mange `any` typer og potensielle null/undefined problemer.

**Anbefaling:**
Aktiver strict mode i `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```

---

## 🟢 Mindre forbedringer

### 6. **Dokumentasjonsfiler i rot-mappen**

**Problem:**
Mange løse SQL-filer og dokumentasjonsfiler i rot-mappen:
- `FIX_KONTROLLOR_ID.sql`
- `FIX_UNIQUE_KONTROLLPUNKT.sql`
- `KJØR_DENNE_FØRST.sql`
- `KJØR_DENNE_NÅ.sql`
- Etc.

**Anbefaling:**
1. Flytt alle SQL-filer til `supabase_migrations/`
2. Opprett en `docs/` mappe for dokumentasjon
3. Rydd opp i gamle filer

**Foreslått struktur:**
```
/
├── docs/
│   ├── ANLEGG_MODULE.md
│   ├── KUNDER_MODULE.md
│   ├── RAPPORT_MODULE.md
│   └── ...
├── supabase_migrations/
│   ├── archive/  (gamle migrasjoner)
│   │   ├── FIX_KONTROLLOR_ID.sql
│   │   └── ...
│   └── active/   (aktive migrasjoner)
│       ├── add_sist_oppdatert_to_ordre.sql
│       └── ...
└── ...
```

---

### 7. **Manglende validering av input**

**Problem:**
Lite validering av brukerinput før sending til database.

**Eksempel:**
- E-postadresser valideres ikke
- Telefonnumre valideres ikke
- Organisasjonsnumre valideres ikke (selv om det finnes en funksjon i brregApi.ts)

**Anbefaling:**
Implementer et valideringslag, f.eks. med `zod`:
```typescript
import { z } from 'zod'

const kundeSchema = z.object({
  navn: z.string().min(1, 'Navn er påkrevd'),
  epost: z.string().email('Ugyldig e-postadresse').nullable(),
  telefon: z.string().regex(/^\+?[0-9\s-]+$/, 'Ugyldig telefonnummer').nullable(),
  organisasjonsnummer: z.string().length(9, 'Org.nr må være 9 siffer').nullable()
})
```

---

### 8. **Manglende loading states**

**Problem:**
Noen komponenter mangler loading states, noe som gir dårlig brukeropplevelse.

**Anbefaling:**
Sørg for at alle datahentinger har:
- Loading spinner/skeleton
- Error state
- Empty state

---

### 9. **Hardkodede verdier**

**Problem:**
Mange hardkodede verdier som bør være i konfigurasjon:
- Supabase URL og nøkkel (bør være i `.env`)
- Statuser (bør være i en konstant-fil)
- Farger (bør bruke Tailwind theme)

**Eksempel:**
```typescript
// Dårlig
const statuser = ['Ikke utført', 'Utført', 'Planlagt', 'Utsatt', 'Oppsagt']

// Bedre
// lib/constants.ts
export const ANLEGG_STATUSER = {
  IKKE_UTFORT: 'Ikke utført',
  UTFORT: 'Utført',
  PLANLAGT: 'Planlagt',
  UTSATT: 'Utsatt',
  OPPSAGT: 'Oppsagt'
} as const
```

---

### 10. **Manglende tester**

**Problem:**
Ingen tester i prosjektet (ingen test-filer funnet).

**Anbefaling:**
Implementer testing med:
- **Vitest** for unit tests
- **React Testing Library** for komponenttester
- **Playwright** for E2E-tester

**Prioriterte tester:**
1. Kritiske forretningslogikk (ordre, oppgaver, fakturering)
2. Autentisering
3. Datavalidering
4. Offline-funksjonalitet

---

## 📊 Oppsummering

### Kritisk (må fikses)
1. ✅ Standardiser tidsstempler (`created_at` → `opprettet_dato`)
2. ✅ Legg til `sist_oppdatert` på alle relevante tabeller
3. ⚠️ Fjern/betinge console.log statements

### Viktig (bør fikses snart)
4. ⚠️ Implementer bedre error handling
5. ⚠️ Aktiver TypeScript strict mode
6. ⚠️ Rydd opp i filstruktur

### Mindre viktig (nice to have)
7. 💡 Implementer input-validering
8. 💡 Forbedre loading states
9. 💡 Flytt hardkodede verdier til konstanter
10. 💡 Implementer testing

---

## 🚀 Foreslått implementeringsrekkefølge

### Fase 1: Database-konsistens (1-2 dager)
1. Kjør eksisterende `sist_oppdatert` migrasjoner
2. Opprett migrasjoner for å endre `created_at` → `opprettet_dato`
3. Legg til `sist_oppdatert` på manglende tabeller
4. Oppdater TypeScript-typer

### Fase 2: Kode-kvalitet (2-3 dager)
5. Implementer logger-system
6. Erstatt console.log med logger
7. Forbedre error handling
8. Aktiver strict mode og fikse type-feil

### Fase 3: Struktur (1 dag)
9. Rydd opp i filstruktur
10. Flytt dokumentasjon til `docs/`
11. Arkiver gamle SQL-filer

### Fase 4: Validering og testing (3-5 dager)
12. Implementer input-validering
13. Sett opp test-rammeverk
14. Skriv kritiske tester

---

## 📝 Konklusjon

Prosjektet er **funksjonelt**, men har flere **inkonsistenser** og **mangler** som bør adresseres for:
- Bedre vedlikeholdbarhet
- Høyere kodekvalitet
- Bedre brukeropplevelse
- Enklere debugging

**Prioritet 1:** Database-konsistens (tidsstempler og `sist_oppdatert`)  
**Prioritet 2:** Logging og error handling  
**Prioritet 3:** Struktur og dokumentasjon  
**Prioritet 4:** Validering og testing
