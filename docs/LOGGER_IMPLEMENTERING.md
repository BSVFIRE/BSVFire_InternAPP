# 🔧 Logger-implementering: Veiledning

**Mål:** Erstatte alle `console.log` statements med miljøbasert logging  
**Estimert tid:** 30-60 minutter  
**Status:** Klar for implementering

---

## ✅ Hva er gjort

### 1. Logger utility opprettet
**Fil:** `src/lib/logger.ts`

**Funksjoner:**
- `logger.log()` - Debug logging (kun dev)
- `logger.debug()` - Debug logging (kun dev)
- `logger.info()` - Info logging (kun dev)
- `logger.warn()` - Warning logging (kun dev)
- `logger.error()` - Error logging (alltid, også prod)
- `logger.group()` - Grupperte meldinger (kun dev)
- `logger.table()` - Tabell-visning (kun dev)
- `logger.time()` / `logger.timeEnd()` - Timing (kun dev)
- `createLogger(namespace)` - Navngitt logger for moduler

---

## 🔄 Hvordan erstatte console.log

### Metode 1: Manuell erstatning (anbefalt for kritiske filer)

**Før:**
```typescript
console.log('Laster data...')
console.error('Feil ved lasting:', error)
console.warn('Advarsel:', message)
```

**Etter:**
```typescript
import { logger } from '@/lib/logger'

logger.log('Laster data...')
logger.error('Feil ved lasting:', error)
logger.warn('Advarsel:', message)
```

**Eller med navngitt logger:**
```typescript
import { createLogger } from '@/lib/logger'

const log = createLogger('Anlegg')

log.log('Laster data...')
log.error('Feil ved lasting:', error)
log.warn('Advarsel:', message)
```

### Metode 2: Søk og erstatt (raskere, men krever gjennomgang)

**VS Code:**
1. Trykk `Cmd+Shift+F` (Mac) eller `Ctrl+Shift+F` (Windows)
2. Søk etter: `console\.log\(`
3. Erstatt med: `logger.log(`
4. Gjør det samme for `console.error`, `console.warn`, etc.

**Viktig:** Husk å legge til import øverst i filen!

---

## 📋 Prioriterte filer å oppdatere

### Høy prioritet (mest console.log)
1. ✅ `src/pages/rapporter/brannalarm/kontroll/NS3960KontrollView.tsx` (35 stk)
2. ✅ `src/pages/rapporter/Nodlys.tsx` (25 stk)
3. ✅ `src/pages/Anlegg.tsx` (23 stk)
4. ✅ `src/lib/offline.ts` (18 stk)
5. ✅ `src/pages/rapporter/brannalarm/KontrollOversiktView.tsx` (11 stk)
6. ✅ `src/pages/rapporter/brannalarm/kontroll/NS3960RapportView.tsx` (11 stk)

### Middels prioritet
7. `src/pages/rapporter/slukkeutstyr/BrannslangerView.tsx` (10 stk)
8. `src/pages/rapporter/slukkeutstyr/BrannslukkereView.tsx` (10 stk)
9. `src/pages/teknisk/ServicerapportEditor.tsx` (9 stk)
10. `src/pages/teknisk/ServicerapportPDF.tsx` (9 stk)

### Lav prioritet
11-31. Resten av filene (1-7 stk hver)

---

## 🎯 Eksempler per filtype

### Eksempel 1: Anlegg.tsx
**Før:**
```typescript
async function loadData() {
  try {
    console.log('Laster anlegg...')
    const { data, error } = await supabase.from('anlegg').select('*')
    console.log('Anlegg lastet:', data)
  } catch (err) {
    console.error('Feil ved lasting:', err)
  }
}
```

**Etter:**
```typescript
import { createLogger } from '@/lib/logger'

const log = createLogger('Anlegg')

async function loadData() {
  try {
    log.log('Laster anlegg...')
    const { data, error } = await supabase.from('anlegg').select('*')
    log.log('Anlegg lastet:', data)
  } catch (err) {
    log.error('Feil ved lasting:', err)
  }
}
```

### Eksempel 2: offline.ts
**Før:**
```typescript
export async function syncChanges() {
  console.log('🔄 Starter synkronisering...')
  const changes = getQueuedChanges()
  console.log('📦 Antall endringer:', changes.length)
  
  for (const change of changes) {
    console.log('⬆️ Synkroniserer:', change)
    try {
      await applyChange(change)
      console.log('✅ Synkronisert:', change.id)
    } catch (error) {
      console.error('❌ Feil ved synkronisering:', error)
    }
  }
}
```

**Etter:**
```typescript
import { createLogger } from '@/lib/logger'

const log = createLogger('Offline')

export async function syncChanges() {
  log.info('🔄 Starter synkronisering...')
  const changes = getQueuedChanges()
  log.info('📦 Antall endringer:', changes.length)
  
  for (const change of changes) {
    log.debug('⬆️ Synkroniserer:', change)
    try {
      await applyChange(change)
      log.info('✅ Synkronisert:', change.id)
    } catch (error) {
      log.error('❌ Feil ved synkronisering:', error)
    }
  }
}
```

### Eksempel 3: Med gruppering
**Før:**
```typescript
console.log('=== Laster rapport ===')
console.log('Rapport ID:', rapportId)
console.log('Anlegg ID:', anleggId)
console.log('Data:', data)
console.log('=== Ferdig ===')
```

**Etter:**
```typescript
import { createLogger } from '@/lib/logger'

const log = createLogger('Rapport')

log.group('Laster rapport', () => {
  log.log('Rapport ID:', rapportId)
  log.log('Anlegg ID:', anleggId)
  log.log('Data:', data)
})
```

---

## 🚀 Implementeringsplan

### Fase 1: Kritiske filer (30 min)
1. Start med `offline.ts` (viktigst for debugging)
2. Deretter `Anlegg.tsx`
3. Så `Nodlys.tsx`
4. Til slutt `NS3960KontrollView.tsx`

### Fase 2: Middels prioritet (20 min)
5-10. Oppdater filer med 9-11 console.log

### Fase 3: Resten (10 min)
11-31. Oppdater resterende filer

---

## ✅ Sjekkliste per fil

For hver fil:
- [ ] Legg til import: `import { createLogger } from '@/lib/logger'`
- [ ] Opprett logger: `const log = createLogger('ModulNavn')`
- [ ] Erstatt `console.log` med `log.log` eller `log.debug`
- [ ] Erstatt `console.error` med `log.error`
- [ ] Erstatt `console.warn` med `log.warn`
- [ ] Erstatt `console.info` med `log.info`
- [ ] Test at filen kompilerer uten feil
- [ ] Verifiser at logging fungerer i dev-miljø

---

## 🧪 Testing

### Test i development
```bash
npm run dev
```

**Forventet:** Alle logger-meldinger vises i konsollen.

### Test i production build
```bash
npm run build
npm run preview
```

**Forventet:** 
- Kun `logger.error()` meldinger vises
- Ingen `logger.log()`, `logger.debug()`, etc. vises

---

## 📊 Fordeler med ny løsning

### Før (console.log)
❌ Logger alltid, også i produksjon  
❌ Kan påvirke ytelse  
❌ Kan eksponere sensitiv informasjon  
❌ Vanskelig å filtrere  
❌ Ingen struktur  

### Etter (logger)
✅ Logger kun i development  
✅ Bedre ytelse i produksjon  
✅ Ingen sensitiv info i produksjon  
✅ Navngitte loggere for filtrering  
✅ Strukturert logging  
✅ Klar for ekstern logging (Sentry, etc.)  

---

## 🔮 Fremtidige forbedringer

### Fase 1 (nå)
- ✅ Miljøbasert logging
- ✅ Navngitte loggere
- ✅ Gruppering og timing

### Fase 2 (senere)
- [ ] Integrasjon med Sentry for error tracking
- [ ] Integrasjon med LogRocket for session replay
- [ ] Log-nivåer (DEBUG, INFO, WARN, ERROR)
- [ ] Logging til fil i Electron-app

### Fase 3 (fremtid)
- [ ] Strukturert JSON-logging
- [ ] Log-aggregering
- [ ] Real-time log-streaming
- [ ] Performance monitoring

---

## 📝 Eksempel: Komplett fil

**Før:**
```typescript
import { supabase } from '@/lib/supabase'

export function MyComponent() {
  async function loadData() {
    console.log('Laster data...')
    try {
      const { data } = await supabase.from('table').select('*')
      console.log('Data lastet:', data)
      return data
    } catch (error) {
      console.error('Feil:', error)
    }
  }
  
  return <div>...</div>
}
```

**Etter:**
```typescript
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'

const log = createLogger('MyComponent')

export function MyComponent() {
  async function loadData() {
    log.log('Laster data...')
    try {
      const { data } = await supabase.from('table').select('*')
      log.log('Data lastet:', data)
      return data
    } catch (error) {
      log.error('Feil:', error)
    }
  }
  
  return <div>...</div>
}
```

---

## 🎯 Suksesskriterier

- [ ] Logger utility opprettet og fungerer
- [ ] Alle kritiske filer oppdatert (top 6)
- [ ] Ingen console.log i produksjonskode
- [ ] Logging fungerer i dev-miljø
- [ ] Logging er stille i prod-miljø
- [ ] Alle filer kompilerer uten feil

---

**Start med `offline.ts` - det er den viktigste filen for debugging!** 🚀
