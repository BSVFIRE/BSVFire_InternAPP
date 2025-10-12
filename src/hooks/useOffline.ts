import { useState, useEffect } from 'react'
import { 
  getOnlineStatus, 
  onConnectionChange, 
  syncPendingChanges,
  queueChange 
} from '../lib/offline'

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(getOnlineStatus())
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const unsubscribe = onConnectionChange((online) => {
      setIsOnline(online)
      
      // Auto-sync when coming back online
      if (online) {
        setIsSyncing(true)
        syncPendingChanges()
          .then((result) => {
            if (result.synced > 0) {
              console.log(`✅ ${result.synced} endringer synkronisert`)
            }
          })
          .finally(() => {
            setIsSyncing(false)
          })
      }
    })

    return unsubscribe
  }, [])

  return { isOnline, isSyncing }
}

export function useOfflineQueue() {
  const { isOnline } = useOfflineStatus()

  const queueInsert = (table: string, data: any) => {
    queueChange({ table, operation: 'insert', data })
  }

  const queueUpdate = (table: string, data: any) => {
    queueChange({ table, operation: 'update', data })
  }

  const queueDelete = (table: string, id: string) => {
    queueChange({ table, operation: 'delete', data: { id } })
  }

  const manualSync = async () => {
    return await syncPendingChanges()
  }

  return {
    isOnline,
    queueInsert,
    queueUpdate,
    queueDelete,
    manualSync,
  }
}
