/**
 * Rediger kunde (/kunder/:id/rediger)
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { opprettDropboxMapperForKunde } from '@/lib/anleggDropbox'
import { Button } from '@/components/ui/Button'
import { KundeFelter, TOMT_KUNDESKJEMA, tilKundeRad, useKontaktpersoner, validerKunde, type KundeSkjemaVerdier } from './kundeSkjema'

const log = createLogger('KundeRediger')

function fraRad(k: Tables<'customer'>): KundeSkjemaVerdier {
  return { navn: k.navn ?? '', organisasjonsnummer: k.organisasjonsnummer ?? '', kunde_nummer: k.kunde_nummer ?? '', kontaktperson_id: k.kontaktperson_id ?? '' }
}

export default function KundeRediger() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { kontakter, last: lastKontakter } = useKontaktpersoner()
  const [original, setOriginal] = useState<Tables<'customer'> | null>(null)
  const [verdier, setVerdier] = useState<KundeSkjemaVerdier>(TOMT_KUNDESKJEMA)
  const [feil, setFeil] = useState<Partial<Record<keyof KundeSkjemaVerdier, string>>>({})
  const [lasteFeil, setLasteFeil] = useState<string | null>(null)
  const [lagrer, setLagrer] = useState(false)

  useEffect(() => {
    if (!id) return
    db.from('customer').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { setLasteFeil(error?.message ?? 'Kunden finnes ikke'); return }
      setOriginal(data); setVerdier(fraRad(data))
    })
  }, [id])

  const endret = useMemo(() => original ? JSON.stringify(fraRad(original)) !== JSON.stringify(verdier) : false, [original, verdier])

  useEffect(() => {
    if (!endret) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [endret])

  useEffect(() => {
    function tast(e: KeyboardEvent) { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (endret && !lagrer) lagre() } }
    document.addEventListener('keydown', tast)
    return () => document.removeEventListener('keydown', tast)
  })

  const oppdater = useCallback((patch: Partial<KundeSkjemaVerdier>) => {
    setVerdier(v => ({ ...v, ...patch }))
    setFeil(f => { const n = { ...f }; for (const k of Object.keys(patch) as (keyof KundeSkjemaVerdier)[]) delete n[k]; return n })
  }, [])

  function avbryt() {
    if (endret && !confirm('Du har ulagrede endringer. Forkaste dem?')) return
    navigate(`/kunder/${id}`)
  }

  async function lagre() {
    if (!id || !original) return
    const v = validerKunde(verdier)
    if (Object.keys(v).length) { setFeil(v); toast.warning('Sjekk feltene som er merket'); return }
    setLagrer(true)
    try {
      const rad = tilKundeRad(verdier)
      const { error } = await db.from('customer').update({ ...rad, sist_oppdatert: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      // Fikk kunden kundenummer nå? Opprett mapper.
      if (!original.kunde_nummer && rad.kunde_nummer) {
        opprettDropboxMapperForKunde({ kundeNummer: rad.kunde_nummer, kundeNavn: rad.navn }).then(r => {
          if (r.status === 'opprettet') toast.info('Dropbox-kundemapper opprettet')
        })
      }
      toast.success('Kunde lagret')
      navigate(`/kunder/${id}`, { replace: true })
    } catch (err) {
      log.error('Kunne ikke lagre kunde', { error: err, kundeId: id })
      toast.error('Kunne ikke lagre kunde', err)
    } finally {
      setLagrer(false)
    }
  }

  if (lasteFeil) {
    return (
      <div className="card bg-red-900/20 border-red-800 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste kunde</h2><p className="text-sm text-red-300">{lasteFeil}</p><Link to="/kunder" className="btn-secondary text-sm mt-3 inline-flex">Til kundelisten</Link></div>
      </div>
    )
  }
  if (!original) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>

  return (
    <form onSubmit={e => { e.preventDefault(); lagre() }} className="pb-24">
      <div className="space-y-5 max-w-2xl">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/kunder" className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ChevronLeft className="w-4 h-4 sm:hidden" />Kunder</Link>
          <span className="hidden sm:inline">/</span>
          <Link to={`/kunder/${id}`} className="hidden sm:inline hover:text-gray-900 dark:hover:text-white truncate">{original.navn}</Link>
          <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white">Rediger</span>
        </div>
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Rediger kunde</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{original.navn}</p>
        </header>
        <section className="card space-y-4">
          <KundeFelter verdier={verdier} feil={feil} onChange={oppdater} opprinneligKundenummer={original.kunde_nummer} kontakter={kontakter} onKontaktOpprettet={lastKontakter} />
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-20 bg-white dark:bg-dark-50 border-t border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
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
