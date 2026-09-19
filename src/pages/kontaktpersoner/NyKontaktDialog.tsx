/**
 * «Ny kontaktperson» – kort dialog. Kan knyttes direkte til et anlegg (anleggId) ved opprettelse.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { createLogger } from '@/lib/logger'
import { Button, IconButton } from '@/components/ui/Button'
import { KontaktFelter, TOMT_KONTAKTSKJEMA, tilKontaktRad, validerKontakt, type KontaktSkjemaVerdier } from './kontaktSkjema'

const log = createLogger('NyKontakt')

export function NyKontaktDialog({ anleggId, onClose, onOpprettet }: { anleggId?: string; onClose: () => void; onOpprettet?: (id: string) => void }) {
  const navigate = useNavigate()
  const [verdier, setVerdier] = useState<KontaktSkjemaVerdier>(TOMT_KONTAKTSKJEMA)
  const [feil, setFeil] = useState<Partial<Record<keyof KontaktSkjemaVerdier, string>>>({})
  const [lagrer, setLagrer] = useState(false)

  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape' && !lagrer) onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose, lagrer])

  function oppdater(patch: Partial<KontaktSkjemaVerdier>) {
    setVerdier(v => ({ ...v, ...patch }))
    setFeil(f => { const n = { ...f }; for (const k of Object.keys(patch) as (keyof KontaktSkjemaVerdier)[]) delete n[k]; return n })
  }

  async function opprett(e: React.FormEvent) {
    e.preventDefault()
    const v = validerKontakt(verdier)
    if (Object.keys(v).length) { setFeil(v); return }
    setLagrer(true)
    try {
      const rad = tilKontaktRad(verdier)
      const { data, error } = await db.from('kontaktpersoner').insert(rad).select('id').single()
      if (error || !data) throw error ?? new Error('Ingen id returnert')
      if (anleggId) {
        const { count } = await db.from('anlegg_kontaktpersoner').select('id', { count: 'exact', head: true }).eq('anlegg_id', anleggId)
        const { error: e2 } = await db.from('anlegg_kontaktpersoner').insert({ anlegg_id: anleggId, kontaktperson_id: data.id, primar: (count ?? 0) === 0 })
        if (e2) toast.warning('Kontaktpersonen ble opprettet, men ikke koblet til anlegget', e2.message)
      }
      toast.success(`«${rad.navn}» opprettet`)
      onClose()
      if (onOpprettet) onOpprettet(data.id); else navigate(`/kontaktpersoner/${data.id}`)
    } catch (err) {
      log.error('Kunne ikke opprette kontaktperson', { error: err })
      toast.error('Kunne ikke opprette kontaktperson', err)
      setLagrer(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => !lagrer && onClose()}>
      <form onSubmit={opprett} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ny-kontakt-tittel"
        className="card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-lg !p-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 id="ny-kontakt-tittel" className="text-lg font-bold text-gray-900 dark:text-white">Ny kontaktperson</h2>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} disabled={lagrer} />
        </div>
        <div className="px-5 pb-4 space-y-4">
          <KontaktFelter verdier={verdier} feil={feil} onChange={oppdater} autoFocus />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
          <p className="text-xs text-gray-500 dark:text-gray-400 sm:max-w-[55%]">{anleggId ? 'Kobles til anlegget med en gang.' : 'Anlegg og kunder knytter du til etterpå.'}</p>
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="ghost" onClick={onClose} disabled={lagrer} className="flex-1 sm:flex-none">Avbryt</Button>
            <Button variant="primary" type="submit" loading={lagrer} className="flex-1 sm:flex-none">Opprett</Button>
          </div>
        </div>
      </form>
    </div>
  )
}
