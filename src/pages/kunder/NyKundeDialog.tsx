/**
 * «Ny kunde» – kort dialog. Brønnøysund-søk fyller navn og org.nr.
 * Dropbox-kundemapper opprettes i bakgrunnen hvis kundenummer er satt.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { createLogger } from '@/lib/logger'
import { opprettDropboxMapperForKunde } from '@/lib/anleggDropbox'
import { Button, IconButton } from '@/components/ui/Button'
import { KundeFelter, TOMT_KUNDESKJEMA, tilKundeRad, useKontaktpersoner, validerKunde, type KundeSkjemaVerdier } from './kundeSkjema'

const log = createLogger('NyKunde')

export function NyKundeDialog({ onClose, onOpprettet }: { onClose: () => void; onOpprettet?: (id: string) => void }) {
  const navigate = useNavigate()
  const { kontakter, last: lastKontakter } = useKontaktpersoner()
  const [verdier, setVerdier] = useState<KundeSkjemaVerdier>(TOMT_KUNDESKJEMA)
  const [feil, setFeil] = useState<Partial<Record<keyof KundeSkjemaVerdier, string>>>({})
  const [lagrer, setLagrer] = useState(false)

  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape' && !lagrer) onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose, lagrer])

  function oppdater(patch: Partial<KundeSkjemaVerdier>) {
    setVerdier(v => ({ ...v, ...patch }))
    setFeil(f => { const n = { ...f }; for (const k of Object.keys(patch) as (keyof KundeSkjemaVerdier)[]) delete n[k]; return n })
  }

  async function opprett(e: React.FormEvent) {
    e.preventDefault()
    const v = validerKunde(verdier)
    if (Object.keys(v).length) { setFeil(v); return }
    setLagrer(true)
    try {
      const rad = tilKundeRad(verdier)
      const { data, error } = await db.from('customer').insert({ ...rad, type: 'Bedrift' }).select('id').single()
      if (error || !data) throw error ?? new Error('Ingen id returnert')
      toast.success(`«${rad.navn}» opprettet`)
      onClose()
      if (onOpprettet) onOpprettet(data.id); else navigate(`/kunder/${data.id}`)
      opprettDropboxMapperForKunde({ kundeNummer: rad.kunde_nummer, kundeNavn: rad.navn }).then(r => {
        if (r.status === 'opprettet') toast.info('Dropbox-kundemapper opprettet')
        else if (r.status === 'feil') toast.warning('Dropbox-mapper ble ikke opprettet', r.melding)
      })
    } catch (err) {
      log.error('Kunne ikke opprette kunde', { error: err })
      toast.error('Kunne ikke opprette kunde', err)
      setLagrer(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => !lagrer && onClose()}>
      <form onSubmit={opprett} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ny-kunde-tittel"
        className="card w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-lg !p-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 id="ny-kunde-tittel" className="text-lg font-bold text-gray-900 dark:text-white">Ny kunde</h2>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} disabled={lagrer} />
        </div>
        <div className="px-5 pb-4 space-y-4">
          <KundeFelter verdier={verdier} feil={feil} onChange={oppdater} kontakter={kontakter} onKontaktOpprettet={lastKontakter} />
          {!verdier.kunde_nummer.trim() && (
            <div className="flex gap-2.5 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-sm text-gray-900 dark:text-gray-100">
              <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <span>Uten kundenummer opprettes ikke Dropbox-mapper. Du kan legge det til senere.</span>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
          <p className="text-xs text-gray-500 dark:text-gray-400 sm:max-w-[55%]">Anlegg legger du til på kundens side etterpå.</p>
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="ghost" onClick={onClose} disabled={lagrer} className="flex-1 sm:flex-none">Avbryt</Button>
            <Button variant="primary" type="submit" loading={lagrer} className="flex-1 sm:flex-none">Opprett kunde</Button>
          </div>
        </div>
      </form>
    </div>
  )
}
