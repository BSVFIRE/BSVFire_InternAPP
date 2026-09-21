/**
 * «Endre status» på anlegg: aktiv → pauset → deaktivert.
 * Et anlegg kan ikke aktiveres når kunden er pauset/deaktivert – databasen nekter, og meldingen vises her.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { STATUSER, STATUS_BESKRIVELSE, STATUS_IKON, STATUS_TEKST, somStatus, statusFeil, type Status } from '@/lib/status'
import { Button, IconButton } from '@/components/ui/Button'

export function AnleggStatusDialog({ anleggId, anleggsnavn, status, kundeStatus, onClose, onEndret }: {
  anleggId: string
  anleggsnavn: string
  status: string | null | undefined
  /** Kundens status hvis kjent – brukes til å forklare hvorfor «aktiv» ikke går */
  kundeStatus?: string | null
  onClose: () => void
  onEndret: () => void
}) {
  const naa = somStatus(status)
  const [ny, setNy] = useState<Status>(naa)
  const [lagrer, setLagrer] = useState(false)
  const kundeInaktiv = kundeStatus ? somStatus(kundeStatus) !== 'aktiv' : false

  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  async function lagre() {
    if (ny === naa) { onClose(); return }
    setLagrer(true)
    try {
      const { error } = await db.from('anlegg').update({ status: ny }).eq('id', anleggId)
      if (error) throw error
      toast.success(`«${anleggsnavn}» er nå ${STATUS_TEKST[ny].toLowerCase()}`)
      onEndret()
    } catch (err) {
      toast.error('Kunne ikke endre status', statusFeil(err))
    } finally {
      setLagrer(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="anlegg-status-tittel" onClick={e => e.stopPropagation()} className="card w-full sm:max-w-md rounded-b-none sm:rounded-lg !p-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div><h2 id="anlegg-status-tittel" className="text-lg font-bold text-gray-900 dark:text-white">Endre status</h2><p className="text-sm text-gray-500 dark:text-gray-400">{anleggsnavn}</p></div>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} />
        </div>
        <div className="px-5 pb-4 space-y-3">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Status">
            {STATUSER.map(s => {
              const Ikon = STATUS_IKON[s]
              return (
                <button key={s} type="button" role="radio" aria-checked={ny === s} onClick={() => setNy(s)} className={cn('flex flex-col items-center gap-1 px-2 py-3 rounded-lg border text-sm transition-colors', ny === s ? 'border-primary bg-primary/10 text-gray-900 dark:text-white font-semibold' : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400')}>
                  <Ikon className={cn('w-5 h-5', s === 'aktiv' ? 'text-green-500' : s === 'pauset' ? 'text-yellow-500' : 'text-gray-400')} />{STATUS_TEKST[s]}{s === naa && <span className="text-[10px] font-normal text-gray-400">nå</span>}
                </button>
              )
            })}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{STATUS_BESKRIVELSE[ny].anlegg}</p>
          {ny === 'aktiv' && kundeInaktiv && (
            <div className="flex gap-2.5 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-sm text-gray-900 dark:text-gray-100">
              <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <span>Kunden er {STATUS_TEKST[somStatus(kundeStatus)].toLowerCase()}. Anlegget kan ikke aktiveres før kunden er aktiv igjen.</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="ghost" onClick={onClose}>Avbryt</Button>
          <Button variant="primary" onClick={lagre} loading={lagrer} disabled={ny === naa || (ny === 'aktiv' && kundeInaktiv)} className={cn(ny === 'deaktivert' && '!bg-red-600 hover:!bg-red-700')}>
            {ny === 'aktiv' ? 'Aktiver anlegg' : ny === 'pauset' ? 'Sett på pause' : 'Deaktiver anlegg'}
          </Button>
        </div>
      </div>
    </div>
  )
}
