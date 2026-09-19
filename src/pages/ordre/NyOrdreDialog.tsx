/**
 * «Ny ordre» – dialog. Kan forhåndsutfylles med anlegg (fra anleggs- eller kundesiden).
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { createLogger } from '@/lib/logger'
import { notifyNewOrdre } from '@/lib/telegramService'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { Button, IconButton } from '@/components/ui/Button'
import { OrdreFelter, TOMT_ORDRESKJEMA, tilOrdreRad, useOrdreGrunnlag, validerOrdre, type OrdreSkjemaVerdier } from './ordreSkjema'

const log = createLogger('NyOrdre')

export function NyOrdreDialog({ anleggId, onClose }: { anleggId?: string; onClose: () => void }) {
  const navigate = useNavigate()
  const { ansatt: meg } = useCurrentAnsatt()
  const { anlegg, ansatte, klar } = useOrdreGrunnlag()
  const [verdier, setVerdier] = useState<OrdreSkjemaVerdier>(TOMT_ORDRESKJEMA)
  const [feil, setFeil] = useState<Partial<Record<keyof OrdreSkjemaVerdier, string>>>({})
  const [lagrer, setLagrer] = useState(false)

  // Forhåndsutfyll anlegg (og kunde/kontrolltyper) når grunnlaget er lastet
  useEffect(() => {
    if (!anleggId || !klar || verdier.anlegg_id) return
    const a = anlegg.find(x => x.id === anleggId)
    if (a) setVerdier(v => ({ ...v, anlegg_id: a.id, kundenr: a.kundenr ?? '', kontrolltype: a.kontroll_type ?? [] }))
  }, [anleggId, klar, anlegg, verdier.anlegg_id])

  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape' && !lagrer) onClose() }
    document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc)
  }, [onClose, lagrer])

  function oppdater(patch: Partial<OrdreSkjemaVerdier>) {
    setVerdier(v => ({ ...v, ...patch }))
    setFeil(f => { const n = { ...f }; for (const k of Object.keys(patch) as (keyof OrdreSkjemaVerdier)[]) delete n[k]; return n })
  }

  async function opprett(e: React.FormEvent) {
    e.preventDefault()
    const v = validerOrdre(verdier)
    if (Object.keys(v).length) { setFeil(v); return }
    setLagrer(true)
    try {
      const rad = tilOrdreRad(verdier)
      // ordre_nummer settes av trigger i databasen
      const { data, error } = await db.from('ordre').insert({ ...rad, opprettet_dato: new Date().toISOString(), opprettet_av: meg?.navn ?? null } as never).select('id, ordre_nummer').single()
      if (error || !data) throw error ?? new Error('Ingen id returnert')
      const a = anlegg.find(x => x.id === verdier.anlegg_id)
      if (rad.tekniker_id) notifyNewOrdre(rad.tekniker_id, data.ordre_nummer, a?.kunde ?? '', a?.anleggsnavn ?? '').catch(err => log.warn('Telegram-varsel feilet', { err }))
      toast.success(`Ordre ${data.ordre_nummer} opprettet`)
      onClose()
      navigate(`/ordre/${data.id}`)
    } catch (err) {
      log.error('Kunne ikke opprette ordre', { error: err })
      toast.error('Kunne ikke opprette ordre', err)
      setLagrer(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => !lagrer && onClose()}>
      <form onSubmit={opprett} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ny-ordre-tittel" className="card w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-lg !p-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 id="ny-ordre-tittel" className="text-lg font-bold text-gray-900 dark:text-white">Ny ordre</h2>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} disabled={lagrer} />
        </div>
        <div className="px-5 pb-4 space-y-4">
          {klar ? <OrdreFelter verdier={verdier} feil={feil} onChange={oppdater} anlegg={anlegg} ansatte={ansatte} /> : <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
          <p className="text-xs text-gray-500 dark:text-gray-400 sm:max-w-[55%]">Ordrenummer settes automatisk. Du kan legge ordren i Outlook-kalenderen etterpå.</p>
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="ghost" onClick={onClose} disabled={lagrer} className="flex-1 sm:flex-none">Avbryt</Button>
            <Button variant="primary" type="submit" loading={lagrer} disabled={!klar} className="flex-1 sm:flex-none">Opprett ordre</Button>
          </div>
        </div>
      </form>
    </div>
  )
}
