# System Logging

Appen har nå et komplett logging-system som fanger opp alle feil brukere opplever.

## Hva logges automatisk?

### 1. React-feil (Error Boundary)
Alle ukjente React-feil fanges opp av `ErrorBoundary` og logges automatisk til databasen.

### 2. Globale JavaScript-feil
- `window.error` events (ukjente feil)
- `unhandledrejection` events (promise-feil som ikke håndteres)

### 3. console.error() kall
Alle `console.error()` kall i appen logges automatisk til databasen.

### 4. Auth-feil
- Innloggingsfeil
- Utloggingsfeil
- Session-feil

## Hvordan bruke logger i koden

```typescript
import { logger } from '@/lib/logger'

// Logg en feil (lagres til database)
logger.error('Kunne ikke laste data', { error, userId: user.id })

// Logg en advarsel (lagres til database)
logger.warn('Deprecated funksjon brukt', { functionName: 'oldFunction' })

// Logg info (kun i development, lagres IKKE til database)
logger.info('Data lastet', { count: data.length })

// Logg debug (kun i development, lagres IKKE til database)
logger.debug('Debug info', { someData })
```

## Namespaced logger

For bedre organisering kan du lage en namespaced logger:

```typescript
import { createLogger } from '@/lib/logger'

const log = createLogger('Anlegg')

log.error('Kunne ikke lagre anlegg', { error })
// Dette vil vises som: [Anlegg] Kunne ikke lagre anlegg
```

## Hva lagres i databasen?

Kun `warn` og `error` nivåer lagres til databasen. For hver logg lagres:

- **Tidspunkt**: Når feilen skjedde
- **Nivå**: warn eller error
- **Melding**: Feilmeldingen
- **Data**: Ekstra data (JSON)
- **Bruker**: Hvem som opplevde feilen
- **Side**: Hvilken side feilen skjedde på
- **Namespace**: Hvilken modul (hvis brukt)
- **Nettleser-info**: Browser, språk, skjermstørrelse osv.

## Teste logging

1. Gå til **Admin → System Logger**
2. Klikk på **Test Logger** knappen
3. Vent noen sekunder
4. Klikk på **Oppdater**
5. Du skal nå se test-logger i listen

## Se logger

Gå til **Admin → System Logger** for å se alle logger.

Du kan:
- Filtrere på nivå (error, warn, info, debug)
- Filtrere på modul/namespace
- Søke i logger
- Eksportere til CSV
- Se detaljer for hver logg

## Best practices

1. **Logg alle feil**: Bruk `logger.error()` i alle catch-blokker
2. **Inkluder kontekst**: Send med relevant data som hjelper med debugging
3. **Bruk namespace**: Lag namespaced loggers for hver modul
4. **Ikke logg sensitiv data**: Unngå å logge passord, tokens, etc.
5. **Bruk riktig nivå**:
   - `error`: Noe gikk galt og må fikses
   - `warn`: Noe er ikke optimalt, men fungerer
   - `info`: Viktig informasjon (kun development)
   - `debug`: Detaljert debug-info (kun development)

## Eksempel: Legge til logging i en komponent

```typescript
import { createLogger } from '@/lib/logger'

const log = createLogger('Kunder')

async function loadCustomers() {
  try {
    const { data, error } = await supabase
      .from('customer')
      .select('*')
    
    if (error) throw error
    
    setCustomers(data)
  } catch (error) {
    log.error('Kunne ikke laste kunder', { error })
    alert('Kunne ikke laste kunder')
  }
}
```

## Database-tabell

Logger lagres i `system_logs` tabellen i Supabase.

Gamle logger kan ryddes opp ved å klikke **Rydd opp** i System Logger-siden.
