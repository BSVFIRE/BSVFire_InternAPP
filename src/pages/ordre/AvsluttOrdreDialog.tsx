/**
 * «Avslutt ordre»: er den fakturert? Ja → status Fakturert. Nei → status Fullført + fakturaoppgave til valgt ansvarlig.
 * Brukes fra detaljsiden og fra Rediger når status settes til Fullført.
 */
import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { ORDRE_STATUSER } from '@/lib/constants'
import { Button, IconButton } from '@/components/ui/Button'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'

export function AvsluttOrdreDialog({ ordre, onClose, onAvsluttet }: {
  ordre: { id: string; type: string | null; kundenr: string | null; anlegg_id: string | null; ordre_nummer: string }
  onClose: () => void
  onAvsluttet: () => void
}) {
  const { ansatt: meg } = useCurrentAnsatt()
  const [ansatte, setAnsatte] = useState<{ id: string; navn: string | null }[]>([])
  const [fakturert, setFakturert] = useState<boolean | null>(null)
  const [ansvarlig, setAnsvarlig] = useState('')
  const [lagrer, setLagrer] = useState(false)

  useEffect(() => {
    db.from('ansatte').select('id, navn').order('navn').then(({ data }) => setAnsatte(data ?? []))
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  useEffect(() => { if (meg && !ansvarlig) setAnsvarlig(meg.id) }, [meg, ansvarlig])

  async function bekreft() {
    if (fakturert === null || (fakturert === false && !ansvarlig)) return
    setLagrer(true)
    try {
      const { error } = await db.from('ordre').update({ status: fakturert ? ORDRE_STATUSER.FAKTURERT : ORDRE_STATUSER.FULLFORT, sist_oppdatert: new Date().toISOString() }).eq('id', ordre.id)
      if (error) throw error
      if (!fakturert) {
        // oppgave_nummer settes av trigger i databasen (som ordre_nummer)
        const { error: e2 } = await db.from('oppgaver').insert({
          type: 'Faktura', kunde_id: ordre.kundenr, anlegg_id: ordre.anlegg_id, tekniker_id: ansvarlig, ordre_id: ordre.id,
          status: 'Ikke påbegynt', prioritet: 'Høy', tittel: `Fakturere ordre ${ordre.ordre_nummer}`, beskrivelse: `Faktura for ordre: ${ordre.type ?? ''}`, opprettet_dato: new Date().toISOString(),
        } as never)
        if (e2) throw e2
      }
      toast.success(fakturert ? 'Ordre avsluttet og merket fakturert' : 'Ordre fullført – fakturaoppgave opprettet')
      onAvsluttet(); onClose()
    } catch (err) { toast.error('Kunne ikke avslutte ordre', err); setLagrer(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => !lagrer && onClose()}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="avslutt-tittel" className="card w-full sm:max-w-md rounded-b-none sm:rounded-lg !p-0">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div><h2 id="avslutt-tittel" className="text-lg font-bold text-gray-900 dark:text-white">Avslutt ordre</h2><p className="text-sm text-gray-500 dark:text-gray-400">{ordre.ordre_nummer} · {ordre.type}</p></div>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} disabled={lagrer} />
        </div>
        <div className="px-5 pb-4 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Er ordren fakturert?</p>
            <div className="grid grid-cols-2 gap-2">
              {[[true, 'Ja, fakturert'], [false, 'Nei, ikke ennå']].map(([v, t]) => (
                <button key={String(v)} type="button" aria-pressed={fakturert === v} onClick={() => setFakturert(v as boolean)} className={cn('h-11 rounded-lg border text-sm font-medium transition-colors', fakturert === v ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400')}>{t as string}</button>
              ))}
            </div>
          </div>
          {fakturert === false && (
            <div className="space-y-1.5">
              <label htmlFor="faktura-ansvarlig" className="block text-sm font-medium text-gray-900 dark:text-white">Hvem skal fakturere?</label>
              <select id="faktura-ansvarlig" value={ansvarlig} onChange={e => setAnsvarlig(e.target.value)} className="input">
                <option value="">Velg…</option>
                {ansatte.map(a => <option key={a.id} value={a.id}>{a.navn}</option>)}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400">Det opprettes en fakturaoppgave med høy prioritet. Når den fullføres, settes ordren automatisk til «Fakturert».</p>
            </div>
          )}
          {fakturert === true && <p className="text-xs text-gray-500 dark:text-gray-400">Ordren får status «Fakturert» og forsvinner fra den aktive listen.</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="ghost" onClick={onClose} disabled={lagrer}>Avbryt</Button>
          <Button variant="primary" icon={<Check />} loading={lagrer} disabled={fakturert === null || (fakturert === false && !ansvarlig)} onClick={bekreft}>Avslutt ordre</Button>
        </div>
      </div>
    </div>
  )
}
