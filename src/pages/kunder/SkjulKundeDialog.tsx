/**
 * «Skjul kunde» – myk sletting. Viser hva som henger på kunden og lar deg velge
 * hva som skal skje med anlegg (behold / koble fra / flytt), ordre og oppgaver.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { ORDRE_STATUSER, OPPGAVE_STATUSER } from '@/lib/constants'
import { Button, IconButton } from '@/components/ui/Button'
import { Combobox } from '@/components/ui/Combobox'

const log = createLogger('SkjulKunde')

interface Relatert {
  anlegg: { id: string; anleggsnavn: string | null }[]
  ordre: { id: string; ordre_nummer: string | null; status: string | null }[]
  oppgaver: { id: string; tittel: string | null; status: string | null }[]
  tilbud: number
}

export function SkjulKundeDialog({ kundeId, kundeNavn, onClose, onSkjult }: { kundeId: string; kundeNavn: string; onClose: () => void; onSkjult: () => void }) {
  const [laster, setLaster] = useState(true)
  const [lagrer, setLagrer] = useState(false)
  const [rel, setRel] = useState<Relatert>({ anlegg: [], ordre: [], oppgaver: [], tilbud: 0 })
  const [andreKunder, setAndreKunder] = useState<{ id: string; navn: string | null }[]>([])
  const [anleggValg, setAnleggValg] = useState<'behold' | 'koble_fra' | 'flytt'>('behold')
  const [flyttTil, setFlyttTil] = useState('')
  const [ordreValg, setOrdreValg] = useState<'behold' | 'fullfor'>('behold')
  const [oppgaveValg, setOppgaveValg] = useState<'behold' | 'fullfor'>('behold')

  useEffect(() => {
    Promise.all([
      db.from('anlegg').select('id, anleggsnavn').eq('kundenr', kundeId),
      db.from('ordre').select('id, ordre_nummer, status').eq('kundenr', kundeId).not('status', 'in', `("${ORDRE_STATUSER.FULLFORT}","${ORDRE_STATUSER.FAKTURERT}")`),
      db.from('oppgaver').select('id, tittel, status').eq('kunde_id', kundeId).neq('status', OPPGAVE_STATUSER.FULLFORT),
      db.from('serviceavtale_tilbud').select('id', { count: 'exact', head: true }).eq('kunde_id', kundeId),
      db.from('customer').select('id, navn').or('skjult.is.null,skjult.eq.false').neq('id', kundeId).order('navn'),
    ]).then(([a, o, op, t, k]) => {
      setRel({ anlegg: a.data ?? [], ordre: o.data ?? [], oppgaver: op.data ?? [], tilbud: t.count ?? 0 })
      setAndreKunder(k.data ?? [])
      setLaster(false)
    })
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [kundeId, onClose])

  async function skjul() {
    if (anleggValg === 'flytt' && !flyttTil) { toast.warning('Velg hvilken kunde anleggene skal flyttes til'); return }
    if (!confirm(`Skjule «${kundeNavn}» med de valgte handlingene?`)) return
    setLagrer(true)
    try {
      if (rel.anlegg.length > 0) {
        if (anleggValg === 'koble_fra') { const { error } = await db.from('anlegg').update({ kundenr: null }).eq('kundenr', kundeId); if (error) throw error }
        if (anleggValg === 'flytt') { const { error } = await db.from('anlegg').update({ kundenr: flyttTil }).eq('kundenr', kundeId); if (error) throw error }
      }
      if (rel.ordre.length > 0 && ordreValg === 'fullfor') {
        const { error } = await db.from('ordre').update({ status: ORDRE_STATUSER.FULLFORT }).in('id', rel.ordre.map(o => o.id)); if (error) throw error
      }
      if (rel.oppgaver.length > 0 && oppgaveValg === 'fullfor') {
        const { error } = await db.from('oppgaver').update({ status: OPPGAVE_STATUSER.FULLFORT }).in('id', rel.oppgaver.map(o => o.id)); if (error) throw error
      }
      const { error } = await db.from('customer').update({ skjult: true }).eq('id', kundeId)
      if (error) throw error
      log.info('Kunde skjult', { kundeId, anleggValg, ordreValg, oppgaveValg })
      toast.success(`«${kundeNavn}» er skjult`)
      onSkjult()
    } catch (err) {
      log.error('Kunne ikke skjule kunde', { error: err, kundeId })
      toast.error('Kunne ikke skjule kunde', err)
    } finally {
      setLagrer(false)
    }
  }

  const Valg = ({ navn, verdi, valgt, onVelg, tekst }: { navn: string; verdi: string; valgt: boolean; onVelg: () => void; tekst: string }) => (
    <label className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer text-sm', valgt ? 'border-primary bg-primary/10 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300')}>
      <input type="radio" name={navn} value={verdi} checked={valgt} onChange={onVelg} className="text-primary focus:ring-primary" />{tekst}
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="skjul-kunde-tittel" onClick={e => e.stopPropagation()} className="card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-lg !p-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div><h2 id="skjul-kunde-tittel" className="text-lg font-bold text-gray-900 dark:text-white">Skjul kunde</h2><p className="text-sm text-gray-500 dark:text-gray-400">{kundeNavn}</p></div>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} />
        </div>
        <div className="px-5 pb-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Kunden skjules fra listen, men slettes ikke. Data beholdes. Velg hva som skal skje med det som er knyttet til kunden.</p>
          {laster ? <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
            <>
              {rel.anlegg.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{rel.anlegg.length} anlegg</legend>
                  <Valg navn="anlegg" verdi="behold" valgt={anleggValg === 'behold'} onVelg={() => setAnleggValg('behold')} tekst="Behold koblingen (anleggene blir liggende på den skjulte kunden)" />
                  <Valg navn="anlegg" verdi="koble_fra" valgt={anleggValg === 'koble_fra'} onVelg={() => setAnleggValg('koble_fra')} tekst="Koble fra kunden (anleggene får ingen kunde)" />
                  <Valg navn="anlegg" verdi="flytt" valgt={anleggValg === 'flytt'} onVelg={() => setAnleggValg('flytt')} tekst="Flytt til en annen kunde" />
                  {anleggValg === 'flytt' && <Combobox options={andreKunder.map(k => ({ id: k.id, label: k.navn ?? '' }))} value={flyttTil} onChange={setFlyttTil} placeholder="Velg kunde…" />}
                </fieldset>
              )}
              {rel.ordre.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{rel.ordre.length} åpne ordre</legend>
                  <Valg navn="ordre" verdi="behold" valgt={ordreValg === 'behold'} onVelg={() => setOrdreValg('behold')} tekst="Behold som de er" />
                  <Valg navn="ordre" verdi="fullfor" valgt={ordreValg === 'fullfor'} onVelg={() => setOrdreValg('fullfor')} tekst="Marker som fullført" />
                </fieldset>
              )}
              {rel.oppgaver.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{rel.oppgaver.length} åpne oppgaver</legend>
                  <Valg navn="oppgaver" verdi="behold" valgt={oppgaveValg === 'behold'} onVelg={() => setOppgaveValg('behold')} tekst="Behold som de er" />
                  <Valg navn="oppgaver" verdi="fullfor" valgt={oppgaveValg === 'fullfor'} onVelg={() => setOppgaveValg('fullfor')} tekst="Marker som fullført" />
                </fieldset>
              )}
              {rel.tilbud > 0 && (
                <div className="flex gap-2.5 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-sm text-gray-900 dark:text-gray-100">
                  <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>{rel.tilbud} tilbud er knyttet til kunden og beholdes.</span>
                </div>
              )}
              {rel.anlegg.length === 0 && rel.ordre.length === 0 && rel.oppgaver.length === 0 && rel.tilbud === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">Ingen tilknyttede data.</p>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="ghost" onClick={onClose}>Avbryt</Button>
          <Button variant="primary" onClick={skjul} loading={lagrer} disabled={laster} className="!bg-red-600 hover:!bg-red-700">Skjul kunde</Button>
        </div>
      </div>
    </div>
  )
}
