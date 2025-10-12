import { WifiOff, Wifi, RefreshCw } from 'lucide-react'
import { useOfflineStatus } from '../hooks/useOffline'

export function OfflineIndicator() {
  const { isOnline, isSyncing } = useOfflineStatus()

  if (isOnline && !isSyncing) {
    return null // Don't show anything when online and not syncing
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg
          ${isOnline 
            ? 'bg-blue-500 text-white' 
            : 'bg-orange-500 text-white'
          }
        `}
      >
        {isSyncing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Synkroniserer...</span>
          </>
        ) : !isOnline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Offline-modus</span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Tilkoblet</span>
          </>
        )}
      </div>
    </div>
  )
}
