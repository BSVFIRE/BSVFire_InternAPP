/**
 * Liten statusvisning for PowerSync i sidemenyen: er vi synkronisert, laster vi opp,
 * eller ligger det endringer og venter fordi enheten er offline.
 * Vises bare når PowerSync er i bruk (VITE_POWERSYNC_URL satt).
 */
import { useEffect, useState } from 'react'
import { useStatus } from '@powersync/react'
import { Check, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { hentPowerSync, powersyncAktiv } from '@/lib/powersync/db'

function Visning() {
  const status = useStatus()
  const [venter, setVenter] = useState(0)

  useEffect(() => {
    let stoppet = false
    async function tell() {
      try {
        const stats = await hentPowerSync().getUploadQueueStats()
        if (!stoppet) setVenter(stats.count)
      } catch { /* databasen er ikke åpen ennå */ }
    }
    tell()
    const timer = setInterval(tell, 5000)
    return () => { stoppet = true; clearInterval(timer) }
  }, [status.dataFlowStatus.uploading, status.connected])

  const laster = status.dataFlowStatus.uploading || status.dataFlowStatus.downloading
  const sistSynk = status.lastSyncedAt
    ? status.lastSyncedAt.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
    : null

  const { Ikon, tekst, detalj, farge } = !status.connected
    ? {
        Ikon: CloudOff,
        tekst: 'Offline',
        detalj: venter > 0 ? `${venter} ${venter === 1 ? 'endring' : 'endringer'} venter` : sistSynk ? `Sist synk ${sistSynk}` : 'Jobber lokalt',
        farge: 'text-yellow-600 dark:text-yellow-400',
      }
    : laster || venter > 0
      ? {
          Ikon: RefreshCw,
          tekst: 'Synkroniserer',
          detalj: venter > 0 ? `${venter} ${venter === 1 ? 'endring' : 'endringer'} igjen` : 'Henter data',
          farge: 'text-blue-600 dark:text-blue-400',
        }
      : status.hasSynced
        ? { Ikon: Check, tekst: 'Synkronisert', detalj: sistSynk ? `Oppdatert ${sistSynk}` : 'Alt er lagret', farge: 'text-green-600 dark:text-green-400' }
        : { Ikon: Cloud, tekst: 'Kobler til…', detalj: 'Henter data første gang', farge: 'text-gray-500 dark:text-gray-400' }

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs" title={`${tekst} – ${detalj}`}>
      <Ikon className={cn('w-3.5 h-3.5 flex-shrink-0', farge, laster && 'animate-spin')} />
      <span className="min-w-0 truncate">
        <span className={cn('font-medium', farge)}>{tekst}</span>
        <span className="text-gray-500 dark:text-gray-500"> · {detalj}</span>
      </span>
    </div>
  )
}

export function SyncStatus() {
  if (!powersyncAktiv) return null
  return <Visning />
}
