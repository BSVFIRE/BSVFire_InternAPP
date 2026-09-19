/**
 * «Ny oppgave» – dialog. Kan forhåndsutfylles med anlegg og ordre.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { createLogger } from '@/lib/logger'
import { notifyNewOppgave } from '@/lib/telegramService'
import { Button, IconButton } from '@/components/ui/Button'
import { OppgaveFelter, TOMT_OPPGAVESKJEMA, tilOppgaveRad, useOppgaveGrunnlag, validerOppgave, type OppgaveSkjemaVerdier } from './oppgaveSkjema'

const log = createLogger('NyOppgave')

export function NyOppgaveDialog({ anleggId, ordreId, onClose }: { anleggId?: string; ordreId?: string; onClose: () => void }) {
  const navigate = useNavigate()
  const { anlegg, ansatte, klar } = useOppgaveGrunnlag()
  const [verdier, setVerdier] = useState<OppgaveSkjemaVerdier>(TOMT_OPPGAVESKJEMA)
  const [feil, setFeil] = useState<Partial<Record<keyof OppgaveSkjemaVerdier, string>>>({})
  const [lagrer, setLagrer] = useState(false)

  useEffect(() => {
    if (!anleggId || !klar || verdier.anlegg_id) return
    const a = anlegg.find(x => x.id === anleggId)
    if (a) setVerdier(v => ({ ...v, anlegg_id: a.id, kunde_id: a.kundenr ?? '' }))
  }, [anleggId, klar, anlegg, verdier.anlegg_id])

  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape' && !lagrer) onClose() }
    document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc)
  }, [onClose, lagrer])

  function oppdater(patch: Partial<OppgaveSkjemaVerdier>) {
    setVerdier(v => ({ ...v, ...patch }))
    setFeil(f => { const n = { ...f }; for (const k of Object.keys(patch) as (keyof OppgaveSkjemaVerdier)[]) delete n[k]; return n })
  }

  async function opprett(e: React.FormEvent) {
    e.preventDefault()
    const v = validerOppgave(verdier)
    if (Object.keys(v).length) { setFeil(v); return }
    setLagrer(true)
    try {
      const rad = tilOppgaveRad(verdier)
      // oppgave_nummer settes av trigger i databasen
      const { data, error } = await db.from('oppgaver').insert({ ...rad, ordre_id: ordreId ?? null, opprettet_dato: new Date().toISOString() } as never).select('id').single()
      if (error || !data) throw error ?? new Error('Ingen id returnert')
      const a = anlegg.find(x => x.id === verdier.anlegg_id)
      if (rad.tekniker_id) notifyNewOppgave(rad.tekniker_id, rad.tittel ?? rad.type, rad.beskrivelse ?? '', verdier.forfallsdato || undefined, a?.kunde, a?.anleggsnavn ?? undefined).catch(err => log.warn('Telegram-varsel feilet', { err }))
      toast.success('Oppgave opprettet')
      onClose()
      navigate(`/oppgaver/${data.id}`)
    } catch (err) {
      log.error('Kunne ikke opprette oppgave', { error: err })
      toast.error('Kunne ikke opprette oppgave', err)
      setLagrer(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => !lagrer && onClose()}>
      <form onSubmit={opprett} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ny-oppgave-tittel" className="card w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-lg !p-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 id="ny-oppgave-tittel" className="text-lg font-bold text-gray-900 dark:text-white">Ny oppgave</h2>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} disabled={lagrer} />
        </div>
        <div className="px-5 pb-4 space-y-4">
          {klar ? <OppgaveFelter verdier={verdier} feil={feil} onChange={oppdater} anlegg={anlegg} ansatte={ansatte} /> : <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
          <Button variant="ghost" onClick={onClose} disabled={lagrer}>Avbryt</Button>
          <Button variant="primary" type="submit" loading={lagrer} disabled={!klar}>Opprett oppgave</Button>
        </div>
      </form>
    </div>
  )
}
