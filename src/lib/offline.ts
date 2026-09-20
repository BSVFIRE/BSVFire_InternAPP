import { supabase } from './supabase'
import { createLogger } from './logger'

const log = createLogger('Offline')

// Track online/offline status
let isOnline = navigator.onLine
const onlineListeners: Array<(online: boolean) => void> = []

// Listen for online/offline events
window.addEventListener('online', () => {
  isOnline = true
  log.info('🟢 Tilkobling gjenopprettet - synkroniserer data...')
  notifyListeners(true)
})

window.addEventListener('offline', () => {
  isOnline = false
  log.info('🔴 Offline-modus aktivert - endringer lagres lokalt')
  notifyListeners(false)
})

function notifyListeners(online: boolean) {
  onlineListeners.forEach(listener => listener(online))
}

export function onConnectionChange(callback: (online: boolean) => void) {
  onlineListeners.push(callback)
  return () => {
    const index = onlineListeners.indexOf(callback)
    if (index > -1) onlineListeners.splice(index, 1)
  }
}

export function getOnlineStatus() {
  return isOnline
}

// Local storage cache for offline data
const CACHE_PREFIX = 'bsv_offline_'
const PENDING_CHANGES_KEY = 'bsv_pending_changes'

interface PendingChange {
  id: string
  table: string
  operation: 'insert' | 'update' | 'delete'
  data: any
  timestamp: number
}

// Save data to local cache
export function cacheData(key: string, data: any) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data))
  } catch (error) {
    log.error('Feil ved lagring til cache:', error)
  }
}

// Get data from local cache
export function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key)
    return cached ? JSON.parse(cached) : null
  } catch (error) {
    log.error('Feil ved henting fra cache:', error)
    return null
  }
}

// Queue changes for later sync
// Postgres-feil som aldri blir bedre av å prøve igjen – endringen kastes ut av køen i stedet for å feile for evig
const PERMANENTE_FEIL = new Set(['23505', '23503', '23502', '22P02', '42501', '42703', '42P01', 'PGRST204'])

export function queueChange(change: Omit<PendingChange, 'id' | 'timestamp'>) {
  if (change.operation !== 'insert' && !change.data?.id) {
    // En update/delete uten id ville feilet med 22P02 («undefined» er ikke en uuid) ved hver synkronisering
    log.error(`Nektet å legge ${change.operation} på ${change.table} i offline-kø uten id`, { data: change.data })
    return
  }
  const pendingChanges = getPendingChanges()
  const newChange: PendingChange = {
    ...change,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  }
  pendingChanges.push(newChange)
  savePendingChanges(pendingChanges)
  log.debug('📝 Endring lagt i kø for synkronisering:', change.operation, change.table)
}

function getPendingChanges(): PendingChange[] {
  try {
    const changes = localStorage.getItem(PENDING_CHANGES_KEY)
    return changes ? JSON.parse(changes) : []
  } catch (error) {
    log.error('Feil ved henting av ventende endringer:', error)
    return []
  }
}

function savePendingChanges(changes: PendingChange[]) {
  try {
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes))
  } catch (error) {
    log.error('Feil ved lagring av ventende endringer:', error)
  }
}

// Sync pending changes when back online
export async function syncPendingChanges() {
  if (!isOnline) {
    log.debug('⏸️ Kan ikke synkronisere - fortsatt offline')
    return { success: false, synced: 0, failed: 0 }
  }

  const pendingChanges = getPendingChanges()
  if (pendingChanges.length === 0) {
    log.debug('✅ Ingen ventende endringer å synkronisere')
    return { success: true, synced: 0, failed: 0 }
  }

  log.info(`🔄 Synkroniserer ${pendingChanges.length} ventende endringer...`)
  
  const results = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [] as string[],
  }

  const remainingChanges: PendingChange[] = []

  for (const change of pendingChanges) {
    try {
      let result
      
      switch (change.operation) {
        case 'insert':
          result = await supabase.from(change.table).insert(change.data)
          break
        case 'update':
          result = await supabase
            .from(change.table)
            .update(change.data)
            .eq('id', change.data.id)
          break
        case 'delete':
          result = await supabase
            .from(change.table)
            .delete()
            .eq('id', change.data.id)
          break
      }

      if (result?.error) {
        results.failed++
        results.errors.push(result.error.message)
        if (PERMANENTE_FEIL.has(result.error.code)) {
          // Duplikat, manglende rad, ugyldig id osv.: forkast endringen så køen ikke feiler ved hvert sidebytte
          log.warn(`Forkastet ${change.operation} på ${change.table} fra offline-kø (${result.error.code}): ${result.error.message}`, { data: change.data })
        } else {
          log.error(`❌ Feil ved synkronisering av ${change.operation} på ${change.table}:`, result.error)
          remainingChanges.push(change) // Keep for retry
        }
      } else {
        log.debug(`✅ Synkronisert ${change.operation} på ${change.table}`)
        results.synced++
      }
    } catch (error) {
      log.error(`❌ Feil ved synkronisering:`, error)
      results.failed++
      results.errors.push(error instanceof Error ? error.message : 'Ukjent feil')
      remainingChanges.push(change) // Keep for retry
    }
  }

  // Save remaining changes that failed
  savePendingChanges(remainingChanges)

  if (results.failed > 0) {
    results.success = false
    log.warn(`⚠️ Synkronisering fullført med feil: ${results.synced} vellykket, ${results.failed} feilet`)
  } else {
    log.info(`✅ Alle endringer synkronisert vellykket (${results.synced})`)
  }

  return results
}

// Auto-sync when connection is restored
onConnectionChange((online) => {
  if (online) {
    setTimeout(() => syncPendingChanges(), 1000) // Wait 1 second before syncing
  }
})

// Helper to perform operations with offline support
export async function offlineAwareOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  cacheKey?: string
): Promise<T> {
  try {
    if (!isOnline) {
      // Return cached data if available
      if (cacheKey) {
        const cached = getCachedData<T>(cacheKey)
        if (cached) {
          log.debug('📦 Bruker cached data (offline)')
          return cached
        }
      }
      return fallback
    }

    const result = await operation()
    
    // Cache successful results
    if (cacheKey && result) {
      cacheData(cacheKey, result)
    }
    
    return result
  } catch (error) {
    log.error('Feil ved operasjon:', error)
    
    // Try to return cached data on error
    if (cacheKey) {
      const cached = getCachedData<T>(cacheKey)
      if (cached) {
        log.debug('📦 Bruker cached data (feil ved henting)')
        return cached
      }
    }
    
    throw error
  }
}
