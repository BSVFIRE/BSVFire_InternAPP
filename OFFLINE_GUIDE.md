# Offline-støtte Guide

## Oversikt

Applikasjonen har nå full offline-støtte! Dette betyr:
- ✅ Data lagres lokalt når du er offline
- ✅ Endringer synkroniseres automatisk når tilkoblingen kommer tilbake
- ✅ Visuell indikator viser offline-status
- ✅ Automatisk gjenoppretting av tilkobling

## Hvordan det fungerer

### 1. Automatisk synkronisering
Når du mister internettforbindelsen:
- Alle endringer lagres lokalt i nettleseren
- En orange indikator viser "Offline-modus"
- Når tilkoblingen kommer tilbake, synkroniseres alle endringer automatisk

### 2. Offline-indikator
Legg til `<OfflineIndicator />` i din App.tsx:

```tsx
import { OfflineIndicator } from './components/OfflineIndicator'

function App() {
  return (
    <>
      {/* Resten av appen */}
      <OfflineIndicator />
    </>
  )
}
```

### 3. Bruk i komponenter

#### Sjekk online-status:
```tsx
import { useOfflineStatus } from './hooks/useOffline'

function MyComponent() {
  const { isOnline, isSyncing } = useOfflineStatus()
  
  return (
    <div>
      {!isOnline && <p>Du er offline - endringer lagres lokalt</p>}
      {isSyncing && <p>Synkroniserer endringer...</p>}
    </div>
  )
}
```

#### Lagre data med offline-støtte:
```tsx
import { useOfflineQueue } from './hooks/useOffline'
import { supabase } from './lib/supabase'

function CreateCustomer() {
  const { isOnline, queueInsert } = useOfflineQueue()
  
  const handleSubmit = async (data) => {
    if (isOnline) {
      // Normal lagring når online
      const { error } = await supabase
        .from('customer')
        .insert(data)
      
      if (error) throw error
    } else {
      // Legg i kø når offline
      queueInsert('customer', data)
    }
  }
}
```

#### Hent data med cache:
```tsx
import { offlineAwareOperation, getCachedData } from './lib/offline'
import { supabase } from './lib/supabase'

async function fetchCustomers() {
  return await offlineAwareOperation(
    // Operasjon å utføre
    async () => {
      const { data, error } = await supabase
        .from('customer')
        .select('*')
      
      if (error) throw error
      return data
    },
    // Fallback hvis offline og ingen cache
    [],
    // Cache-nøkkel
    'customers_list'
  )
}
```

## Eksempel: Komplett CRUD med offline-støtte

```tsx
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useOfflineQueue } from './hooks/useOffline'
import { offlineAwareOperation, cacheData } from './lib/offline'

function CustomerList() {
  const [customers, setCustomers] = useState([])
  const { isOnline, queueInsert, queueUpdate, queueDelete } = useOfflineQueue()

  // Hent kunder med offline-støtte
  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    const data = await offlineAwareOperation(
      async () => {
        const { data, error } = await supabase
          .from('customer')
          .select('*')
        if (error) throw error
        return data
      },
      [],
      'customers_list'
    )
    setCustomers(data)
  }

  // Opprett kunde
  const createCustomer = async (customerData) => {
    if (isOnline) {
      const { data, error } = await supabase
        .from('customer')
        .insert(customerData)
        .select()
      
      if (error) throw error
      
      // Oppdater lokal state og cache
      const newCustomers = [...customers, data[0]]
      setCustomers(newCustomers)
      cacheData('customers_list', newCustomers)
    } else {
      // Offline: legg i kø og oppdater lokal state
      const tempCustomer = { ...customerData, id: crypto.randomUUID() }
      queueInsert('customer', customerData)
      setCustomers([...customers, tempCustomer])
    }
  }

  // Oppdater kunde
  const updateCustomer = async (id, updates) => {
    if (isOnline) {
      const { error } = await supabase
        .from('customer')
        .update(updates)
        .eq('id', id)
      
      if (error) throw error
      
      // Oppdater lokal state og cache
      const newCustomers = customers.map(c => 
        c.id === id ? { ...c, ...updates } : c
      )
      setCustomers(newCustomers)
      cacheData('customers_list', newCustomers)
    } else {
      // Offline: legg i kø og oppdater lokal state
      queueUpdate('customer', { id, ...updates })
      const newCustomers = customers.map(c => 
        c.id === id ? { ...c, ...updates } : c
      )
      setCustomers(newCustomers)
    }
  }

  // Slett kunde
  const deleteCustomer = async (id) => {
    if (isOnline) {
      const { error } = await supabase
        .from('customer')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      // Oppdater lokal state og cache
      const newCustomers = customers.filter(c => c.id !== id)
      setCustomers(newCustomers)
      cacheData('customers_list', newCustomers)
    } else {
      // Offline: legg i kø og oppdater lokal state
      queueDelete('customer', id)
      const newCustomers = customers.filter(c => c.id !== id)
      setCustomers(newCustomers)
    }
  }

  return (
    <div>
      {/* Din UI her */}
    </div>
  )
}
```

## Viktige notater

### Konflikthåndtering
- Hvis samme data endres både offline og online, vil siste endring overskrive
- For mer avansert konflikthåndtering, vurder å legge til versjonering

### Lagringsbegrensninger
- LocalStorage har typisk 5-10MB grense
- For store datamengder, vurder IndexedDB

### Testing offline-modus
1. Åpne Chrome DevTools (F12)
2. Gå til Network-fanen
3. Velg "Offline" fra dropdown-menyen
4. Test applikasjonen

### Automatisk synkronisering
- Synkronisering skjer automatisk når tilkoblingen gjenopprettes
- Du kan også manuelt trigge synkronisering:

```tsx
const { manualSync } = useOfflineQueue()

const handleSync = async () => {
  const result = await manualSync()
  console.log(`Synkronisert: ${result.synced}, Feilet: ${result.failed}`)
}
```

## Komponenter med offline-støtte

### Nødlysrapporter (Nodlys.tsx)
Nødlysrapporter har full offline-støtte:

#### ✅ Fungerer offline:
- **Redigere eksisterende nødlysenheter**: Klikk på et felt for å redigere (inline editing)
- **Endre kontrollstatus**: Huk av/på checkboxen for kontrollert-status
- **Legge til nye nødlysenheter**: Både enkeltvis og bulk-opprettelse
- **Slette nødlysenheter**: Sletting lagres lokalt og synkroniseres senere

#### ⚠️ Krever online-tilkobling:
- **Søke etter kunder og anlegg**: Søk krever tilgang til databasen
- **Generere PDF-rapporter**: PDF-generering krever online-tilkobling
- **Første gangs lasting**: Du må ha lastet data mens online for å jobbe offline

#### Slik fungerer det:
1. **Mens online**: Last inn et anlegg og dets nødlysdata - dette caches automatisk
2. **Går offline**: Du kan fortsette å jobbe med dataen som er cachet
3. **Gjør endringer**: Alle endringer lagres lokalt i en kø
4. **Kommer online igjen**: Alle endringer synkroniseres automatisk til databasen

#### Eksempel arbeidsflyt:
```
1. Åpne nødlysrapport for et anlegg (mens online)
2. Mist internettforbindelse
3. Rediger felt, legg til nye enheter, endre status
4. Se "Offline-modus" indikator i hjørnet
5. Få tilbake internett
6. Alle endringer synkroniseres automatisk
```

## Neste steg

1. Legg til `<OfflineIndicator />` i App.tsx
2. Oppdater eksisterende komponenter til å bruke offline-støtte
3. Test grundig med offline-modus aktivert
4. Vurder å legge til mer avansert konflikthåndtering ved behov
