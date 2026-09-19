/**
 * Rediger oppgave (/oppgaver/:id/rediger)
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { OPPGAVE_STATUSER, PRIORITETER } from '@/lib/constants'
import { notifyNewOppgave } from '@/lib/telegramService'
import { fullforOppgave } from '@/lib/oppgaver'
import { Button } from '@/components/ui/Button'
import { OppgaveFelter, TOMT_OPPGAVESKJEMA, tilOppgaveRad, useOppgaveGrunnlag, validerOppgave, type OppgaveSkjemaVerdier } from './oppgaveSkjema'

const log = createLogger('OppgaveRediger')

function fraRad(o: Tables<'oppgaver'>): OppgaveSkjemaVerdier {
  return { type: o.type ?? '', tittel: o.tittel ?? '', anlegg_id: o.anlegg_id ?? '', kunde_id: o.kunde_id ?? '', tekniker_id: o.tekniker_id ?? '', kontaktperson: o.kontaktperson ?? '', prioritet: o.prioritet ?? PRIORITETER.MEDIUM, status: o.status ?? OPPGAVE_STATUSER.IKKE_PABEGYNT, forfallsdato: o.forfallsdato ? o.forfallsdato.slice(0, 10) : '', beskrivelse: o.beskrivelse ?? '' }
}

export default function OppgaveRediger() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { anlegg, ansatte, klar } = useOppgaveGrunnlag()
  const [original, setOriginal] = useState<Tables<'oppgaver'> | null>(null)
  const [verdier, setVerdier] = useState<OppgaveSkjemaVerdier>(TOMT_OPPGAVESKJEMA)
  const [feil, setFeil] = useState<Partial<Record<keyof OppgaveSkjemaVerdier, string>>>({})
  const [lasteFeil, setLasteFeil] = useState<string | null>(null)
  const [lagrer, setLagrer] = useState(false)

  useEffect(() => {
    if (!id) return
    db.from('oppgaver').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { setLasteFeil(error?.message ?? 'Oppgaven finnes ikke'); return }
      setOriginal(data); setVerdier(fraRad(data))
    })
  }, [id])

  const endret = useMemo(() => original ? JSON.stringify(fraRad(original)) !== JSON.stringify(verdier) : false, [original, verdier])

  useEffect(() => {
    if (!endret) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h)
  }, [endret])

  useEffect(() => {
    function tast(e: KeyboardEvent) { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (endret && !lagrer) lagre() } }
    document.addEventListener('keydown', tast); return () => document.removeEventListener('keydown', tast)
  })

  const oppdater = useCallback((patch: Partial<OppgaveSkjemaVerdier>) => {
    setVerdier(v => ({ ...v, ...patch }))
    setFeil(f => { const n = { ...f }; for (const k of Object.keys(patch) as (keyof OppgaveSkjemaVerdier)[]) delete n[k]; return n })
  }, [])

  function avbryt() {
    if (endret && !confirm('Du har ulagrede endringer. Forkaste dem?')) return
    navigate(`/oppgaver/${id}`)
  }

  async function lagre() {
    if (!id || !original) return
    const v = validerOppgave(verdier)
    if (Object.keys(v).length) { setFeil(v); toast.warning('Sjekk feltene som er merket'); return }
    setLagrer(true)
    try {
      const rad = tilOppgaveRad(verdier)
      const { error } = await db.from('oppgaver').update({ ...rad, sist_oppdatert: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      // Fullført via skjemaet → samme regel som «Fullfør»-knappen (fakturaoppgave → ordre Fakturert)
      if (rad.status === OPPGAVE_STATUSER.FULLFORT && original.status !== OPPGAVE_STATUSER.FULLFORT) {
        const res = await fullforOppgave({ id, type: rad.type, ordre_id: original.ordre_id })
        if (res.ordreFakturert) toast.info('Ordren er satt til Fakturert')
      }
      if (rad.tekniker_id && rad.tekniker_id !== original.tekniker_id) {
        const a = anlegg.find(x => x.id === rad.anlegg_id)
        notifyNewOppgave(rad.tekniker_id, rad.tittel ?? rad.type, rad.beskrivelse ?? '', verdier.forfallsdato || undefined, a?.kunde, a?.anleggsnavn ?? undefined).catch(err => log.warn('Telegram-varsel feilet', { err }))
      }
      toast.success('Oppgave lagret')
      navigate(`/oppgaver/${id}`, { replace: true })
    } catch (err) {
      log.error('Kunne ikke lagre oppgave', { error: err, oppgaveId: id })
      toast.error('Kunne ikke lagre oppgave', err)
      setLagrer(false)
    }
  }

  if (lasteFeil) {
    return (
      <div className="card bg-red-900/20 border-red-800 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste oppgave</h2><p className="text-sm text-red-300">{lasteFeil}</p><Link to="/oppgaver" className="btn-secondary text-sm mt-3 inline-flex">Til oppgavelisten</Link></div>
      </div>
    )
  }
  if (!original || !klar) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>

  return (
    <form onSubmit={e => { e.preventDefault(); lagre() }} className="pb-24">
      <div className="space-y-5 max-w-2xl">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/oppgaver" className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ChevronLeft className="w-4 h-4 sm:hidden" />Oppgaver</Link>
          <span className="hidden sm:inline">/</span>
          <Link to={`/oppgaver/${id}`} className="hidden sm:inline hover:text-gray-900 dark:hover:text-white truncate">{original.tittel ?? original.type}</Link>
          <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white">Rediger</span>
        </div>
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Rediger oppgave</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{original.tittel ?? original.type}</p>
        </header>
        <section className="card space-y-4">
          <OppgaveFelter verdier={verdier} feil={feil} onChange={oppdater} anlegg={anlegg} ansatte={ansatte} />
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-w)] z-20 bg-white dark:bg-dark-50 border-t border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <span className={cn('text-sm inline-flex items-center gap-2 mr-auto', endret ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600')}>
          <span className={cn('w-2 h-2 rounded-full', endret ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-gray-700')} />
          <span className="hidden sm:inline">{endret ? 'Ulagrede endringer' : 'Ingen endringer'}</span>
        </span>
        <Button variant="ghost" onClick={avbryt}>Avbryt</Button>
        <Button variant="primary" type="submit" loading={lagrer} disabled={!endret} kbd="⌘S">Lagre</Button>
      </div>
    </form>
  )
}
