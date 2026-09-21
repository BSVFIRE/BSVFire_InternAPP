/**
 * «Endre status» på kunde: aktiv → pauset → deaktivert.
 *
 * En kunde kan ikke settes til pauset/deaktivert med aktive anlegg (databasen nekter), så dialogen
 * viser de aktive anleggene og krever at de enten får samme status eller flyttes til en annen kunde.
 * Ved deaktivering kan åpne ordre og oppgaver markeres som fullført. Ved aktivering kan anleggene
 * som fulgte kunden ned aktiveres igjen.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { ORDRE_STATUSER, OPPGAVE_STATUSER } from '@/lib/constants'
import { STATUSER, STATUS_BESKRIVELSE, STATUS_IKON, STATUS_TEKST, somStatus, statusFeil, type Status } from '@/lib/status'
import { Button, IconButton } from '@/components/ui/Button'
import { Combobox } from '@/components/ui/Combobox'

const log = createLogger('KundeStatus')

interface Relatert {
  anlegg: { id: string; anleggsnavn: string | null; status: string }[]
  ordre: { id: string; ordre_nummer: string | null; status: string | null }[]
  oppgaver: { id: string; tittel: string | null; status: string | null }[]
}

export function KundeStatusDialog({ kundeId, kundeNavn, status, onClose, onEndret }: { kundeId: string; kundeNavn: string; status: string | null | undefined; onClose: () => void; onEndret: () => void }) {
  const naa = somStatus(status)
  const [ny, setNy] = useState<Status>(naa)
  const [laster, setLaster] = useState(true)
  const [lagrer, setLagrer] = useState(false)
  const [rel, setRel] = useState<Relatert>({ anlegg: [], ordre: [], oppgaver: [] })
  const [andreKunder, setAndreKunder] = useState<{ id: string; navn: string | null }[]>([])
  const [anleggValg, setAnleggValg] = useState<'samme' | 'flytt'>('samme')
  const [flyttTil, setFlyttTil] = useState('')
  const [aktiverAnlegg, setAktiverAnlegg] = useState(true)
  const [ordreValg, setOrdreValg] = useState<'behold' | 'fullfor'>('behold')
  const [oppgaveValg, setOppgaveValg] = useState<'behold' | 'fullfor'>('behold')

  useEffect(() => {
    Promise.all([
      db.from('anlegg').select('id, anleggsnavn, status').eq('kundenr', kundeId).order('anleggsnavn'),
      db.from('ordre').select('id, ordre_nummer, status').eq('kundenr', kundeId).not('status', 'in', `("${ORDRE_STATUSER.FULLFORT}","${ORDRE_STATUSER.FAKTURERT}")`),
      db.from('oppgaver').select('id, tittel, status').eq('kunde_id', kundeId).neq('status', OPPGAVE_STATUSER.FULLFORT),
      db.from('customer').select('id, navn').eq('status', 'aktiv').neq('id', kundeId).order('navn'),
    ]).then(([a, o, op, k]) => {
      setRel({ anlegg: (a.data ?? []) as Relatert['anlegg'], ordre: o.data ?? [], oppgaver: op.data ?? [] })
      setAndreKunder(k.data ?? [])
      setLaster(false)
    })
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [kundeId, onClose])

  const aktiveAnlegg = useMemo(() => rel.anlegg.filter(a => somStatus(a.status) === 'aktiv'), [rel])
  const inaktiveAnlegg = useMemo(() => rel.anlegg.filter(a => somStatus(a.status) !== 'aktiv'), [rel])
  const nedgradering = ny !== 'aktiv' && aktiveAnlegg.length > 0
  const endret = ny !== naa

  async function lagre() {
    if (!endret) { onClose(); return }
    if (nedgradering && anleggValg === 'flytt' && !flyttTil) { toast.warning('Velg hvilken kunde anleggene skal flyttes til'); return }
    setLagrer(true)
    try {
      if (nedgradering) {
        const ids = aktiveAnlegg.map(a => a.id)
        const patch = anleggValg === 'flytt' ? { kundenr: flyttTil } : { status: ny }
        const { error } = await db.from('anlegg').update(patch).in('id', ids)
        if (error) throw error
      }
      if (ny === 'deaktivert') {
        if (rel.ordre.length > 0 && ordreValg === 'fullfor') {
          const { error } = await db.from('ordre').update({ status: ORDRE_STATUSER.FULLFORT }).in('id', rel.ordre.map(o => o.id)); if (error) throw error
        }
        if (rel.oppgaver.length > 0 && oppgaveValg === 'fullfor') {
          const { error } = await db.from('oppgaver').update({ status: OPPGAVE_STATUSER.FULLFORT }).in('id', rel.oppgaver.map(o => o.id)); if (error) throw error
        }
      }
      const { error } = await db.from('customer').update({ status: ny }).eq('id', kundeId)
      if (error) throw error
      if (ny === 'aktiv' && aktiverAnlegg && inaktiveAnlegg.length > 0) {
        // Kunden må være aktiv før anleggene kan aktiveres (trigger)
        const { error: aFeil } = await db.from('anlegg').update({ status: 'aktiv' }).in('id', inaktiveAnlegg.map(a => a.id))
        if (aFeil) throw aFeil
      }
      log.info('Kundestatus endret', { kundeId, fra: naa, til: ny, anleggValg, ordreValg, oppgaveValg })
      toast.success(`«${kundeNavn}» er nå ${STATUS_TEKST[ny].toLowerCase()}`)
      onEndret()
    } catch (err) {
      log.error('Kunne ikke endre kundestatus', { error: err, kundeId })
      toast.error('Kunne ikke endre status', statusFeil(err))
    } finally {
      setLagrer(false)
    }
  }

  const Valg = ({ navn, valgt, onVelg, tekst }: { navn: string; valgt: boolean; onVelg: () => void; tekst: string }) => (
    <label className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer text-sm', valgt ? 'border-primary bg-primary/10 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300')}>
      <input type="radio" name={navn} checked={valgt} onChange={onVelg} className="text-primary focus:ring-primary" />{tekst}
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="kunde-status-tittel" onClick={e => e.stopPropagation()} className="card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-lg !p-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div><h2 id="kunde-status-tittel" className="text-lg font-bold text-gray-900 dark:text-white">Endre status</h2><p className="text-sm text-gray-500 dark:text-gray-400">{kundeNavn}</p></div>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} />
        </div>
        <div className="px-5 pb-4 space-y-4">
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
          <p className="text-sm text-gray-600 dark:text-gray-400">{STATUS_BESKRIVELSE[ny].kunde}</p>

          {laster ? <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : endret && (
            <>
              {nedgradering && (
                <fieldset className="space-y-2">
                  <div className="flex gap-2.5 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-sm text-gray-900 dark:text-gray-100">
                    <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <span>Kunden har <b>{aktiveAnlegg.length} aktive anlegg</b> og kan ikke settes til {STATUS_TEKST[ny].toLowerCase()} før de er håndtert.</span>
                  </div>
                  <ul className="max-h-28 overflow-y-auto text-xs text-gray-600 dark:text-gray-400 px-1">
                    {aktiveAnlegg.map(a => <li key={a.id} className="truncate">· {a.anleggsnavn || '(uten navn)'}</li>)}
                  </ul>
                  <Valg navn="anlegg" valgt={anleggValg === 'samme'} onVelg={() => setAnleggValg('samme')} tekst={`Sett anleggene til ${STATUS_TEKST[ny].toLowerCase()} også`} />
                  <Valg navn="anlegg" valgt={anleggValg === 'flytt'} onVelg={() => setAnleggValg('flytt')} tekst="Flytt anleggene til en annen kunde" />
                  {anleggValg === 'flytt' && <Combobox options={andreKunder.map(k => ({ id: k.id, label: k.navn ?? '' }))} value={flyttTil} onChange={setFlyttTil} placeholder="Velg kunde…" searchPlaceholder="Søk kunde…" />}
                </fieldset>
              )}
              {ny === 'aktiv' && inaktiveAnlegg.length > 0 && (
                <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={aktiverAnlegg} onChange={e => setAktiverAnlegg(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                  Aktiver også de {inaktiveAnlegg.length} anleggene som er pauset/deaktivert
                </label>
              )}
              {ny === 'deaktivert' && rel.ordre.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{rel.ordre.length} åpne ordre</legend>
                  <Valg navn="ordre" valgt={ordreValg === 'behold'} onVelg={() => setOrdreValg('behold')} tekst="Behold som de er" />
                  <Valg navn="ordre" valgt={ordreValg === 'fullfor'} onVelg={() => setOrdreValg('fullfor')} tekst="Marker som fullført" />
                </fieldset>
              )}
              {ny === 'deaktivert' && rel.oppgaver.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{rel.oppgaver.length} åpne oppgaver</legend>
                  <Valg navn="oppgaver" valgt={oppgaveValg === 'behold'} onVelg={() => setOppgaveValg('behold')} tekst="Behold som de er" />
                  <Valg navn="oppgaver" valgt={oppgaveValg === 'fullfor'} onVelg={() => setOppgaveValg('fullfor')} tekst="Marker som fullført" />
                </fieldset>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="ghost" onClick={onClose}>Avbryt</Button>
          <Button variant="primary" onClick={lagre} loading={lagrer} disabled={laster || !endret} className={cn(ny === 'deaktivert' && '!bg-red-600 hover:!bg-red-700')}>
            {ny === 'aktiv' ? 'Aktiver kunde' : ny === 'pauset' ? 'Sett på pause' : 'Deaktiver kunde'}
          </Button>
        </div>
      </div>
    </div>
  )
}
