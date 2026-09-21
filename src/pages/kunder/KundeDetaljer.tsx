/**
 * Kunde – detaljside (/kunder/:id)
 * Header med handlinger, statusrad (anlegg per status), anleggsliste til venstre,
 * fakta (kontakt, detaljer, serviceavtaler, ukesplaner) til høyre.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle, AlertTriangle, Building2, Calendar, ChevronDown, ChevronLeft, Check, Edit, Mail,
  MoreHorizontal, PauseCircle, Phone, PlayCircle, Plus, Share2, X,
} from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn, formatDate } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { ANLEGG_STATUSER } from '@/lib/constants'
import { Button, IconButton, IconButtonGroup } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import { NyttAnleggDialog } from '@/pages/anlegg/NyttAnleggDialog'
import { KundeStatusDialog } from './KundeStatusDialog'
import { StatusBadge, somStatus } from '@/lib/status'

const log = createLogger('KundeDetaljer')

type Kunde = Tables<'customer'> & { kontaktperson: { id: string; navn: string | null; epost: string | null; telefon: string | null; rolle: string | null } | null }
type AnleggRad = Pick<Tables<'anlegg'>, 'id' | 'anleggsnavn' | 'adresse' | 'poststed' | 'kontroll_status' | 'kontroll_maaned' | 'kontroll_type' | 'skjult' | 'status'> & { avvik: number }
type Priser = Tables<'priser_kundenummer'>
type Ukesplan = Pick<Tables<'ukesplaner'>, 'id' | 'uke_nummer' | 'aar' | 'navn' | 'status'>

const PILL: Record<string, string> = {
  [ANLEGG_STATUSER.UTFORT]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  [ANLEGG_STATUSER.PLANLAGT]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  [ANLEGG_STATUSER.UTSATT]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  [ANLEGG_STATUSER.OPPSAGT]: 'bg-gray-100 text-gray-700 dark:bg-dark-100 dark:text-gray-400',
}
const KANT: Record<string, string> = { [ANLEGG_STATUSER.UTFORT]: 'border-l-green-500', [ANLEGG_STATUSER.PLANLAGT]: 'border-l-yellow-500', [ANLEGG_STATUSER.UTSATT]: 'border-l-yellow-500', [ANLEGG_STATUSER.OPPSAGT]: 'border-l-gray-400' }

export default function KundeDetaljer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [kunde, setKunde] = useState<Kunde | null>(null)
  const [anlegg, setAnlegg] = useState<AnleggRad[]>([])
  const [priser, setPriser] = useState<Priser[]>([])
  const [ukesplaner, setUkesplaner] = useState<Ukesplan[]>([])
  const [loading, setLoading] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)
  const [visNyttAnlegg, setVisNyttAnlegg] = useState(false)
  const [visStatus, setVisStatus] = useState(false)
  const [visPriser, setVisPriser] = useState(false)

  const loadAll = useCallback(async () => {
    if (!id) return
    try {
      setFeil(null)
      const [k, a, u, avvik] = await Promise.all([
        db.from('customer').select('*, kontaktperson:kontaktpersoner!customer_kontaktperson_id_fkey(id, navn, epost, telefon, rolle)').eq('id', id).single(),
        db.from('anlegg').select('id, anleggsnavn, adresse, poststed, kontroll_status, kontroll_maaned, kontroll_type, skjult, status').eq('kundenr', id).order('anleggsnavn'),
        db.from('ukesplaner').select('id, uke_nummer, aar, navn, status').eq('kunde_id', id).order('aar', { ascending: false }).order('uke_nummer', { ascending: false }).limit(8),
        db.rpc('avvik_per_anlegg'),
      ])
      if (k.error) throw k.error
      setKunde(k.data as Kunde)
      const avvikMap = new Map((avvik.data ?? []).map(r => [r.anlegg_id, Number(r.antall)]))
      const anleggListe = (a.data ?? []).map(x => ({ ...x, avvik: avvikMap.get(x.id) ?? 0 }))
      setAnlegg(anleggListe)
      setUkesplaner(u.data ?? [])
      if (anleggListe.length) {
        const { data: p } = await db.from('priser_kundenummer').select('*').in('anlegg_id', anleggListe.map(x => x.id))
        setPriser(p ?? [])
      } else setPriser([])
    } catch (err) {
      log.error('Kunne ikke laste kunde', { error: err, kundeId: id })
      setFeil(err instanceof Error ? err.message : 'Kunne ikke laste kunde')
    } finally {
      setLoading(false)
    }
  }, [id])
  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    function tast(e: KeyboardEvent) {
      if (e.key !== 'e' || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest('input, textarea, select')) return
      if (id) navigate(`/kunder/${id}/rediger`)
    }
    document.addEventListener('keydown', tast)
    return () => document.removeEventListener('keydown', tast)
  }, [id, navigate])

  const teller = useMemo(() => ({
    utfort: anlegg.filter(a => a.kontroll_status === ANLEGG_STATUSER.UTFORT).length,
    planlagt: anlegg.filter(a => a.kontroll_status === ANLEGG_STATUSER.PLANLAGT || a.kontroll_status === ANLEGG_STATUSER.UTSATT).length,
    ikke: anlegg.filter(a => !a.kontroll_status || a.kontroll_status === ANLEGG_STATUSER.IKKE_UTFORT).length,
    avvik: anlegg.reduce((s, a) => s + a.avvik, 0),
  }), [anlegg])
  const sum = useMemo(() => priser.reduce((s, p) => s + (p.prisbrannalarm ?? 0) + (p.prisnodlys ?? 0) + (p.prisslukkeutstyr ?? 0) + (p.prisroykluker ?? 0) + (p.prisekstern ?? 0), 0), [priser])

  async function kopierLenke() { try { await navigator.clipboard.writeText(window.location.href); toast.success('Lenke kopiert') } catch { toast.error('Kunne ikke kopiere') } }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>
  if (feil || !kunde) {
    return (
      <div className="card bg-red-900/20 border-red-800 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste kunde</h2><p className="text-sm text-red-300 mb-3">{feil ?? 'Kunden finnes ikke'}</p><div className="flex gap-2"><Button variant="primary" onClick={loadAll}>Prøv igjen</Button><Link to="/kunder" className="btn-secondary text-sm">Til kundelisten</Link></div></div>
      </div>
    )
  }

  const kp = kunde.kontaktperson

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/kunder" className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ChevronLeft className="w-4 h-4 sm:hidden" />Kunder</Link>
        <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{kunde.navn}</span>
      </div>

      <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{kunde.navn}</h1>
            <StatusBadge status={kunde.status} />
          </div>
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-sm text-gray-500 dark:text-gray-400">
            {kunde.kunde_nummer && <span>Kundenr. {kunde.kunde_nummer}</span>}
            {kunde.organisasjonsnummer && <><span className="text-gray-300 dark:text-gray-700">·</span><span>Org.nr. {kunde.organisasjonsnummer}</span></>}
            {kunde.type && <><span className="text-gray-300 dark:text-gray-700">·</span><span>{kunde.type}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <IconButtonGroup>
            <IconButton variant="ghost" label="Kopier lenke" icon={<Share2 />} onClick={kopierLenke} />
            <DropdownMenu trigger={open => <IconButton variant="ghost" label="Flere valg" icon={<MoreHorizontal />} aria-expanded={open} />}>
              <MenuItem icon={<Calendar />} onSelect={() => navigate('/kontrollplan', { state: { openUkesplan: true, kundeId: kunde.id } })}>Ny ukesplan</MenuItem>
              <MenuSeparator />
              <MenuItem icon={somStatus(kunde.status) === 'aktiv' ? <PauseCircle /> : <PlayCircle />} onSelect={() => setVisStatus(true)}>Endre status… <span className="text-xs text-gray-400 ml-1">{somStatus(kunde.status) === 'aktiv' ? 'Aktiv' : somStatus(kunde.status) === 'pauset' ? 'Pauset' : 'Deaktivert'}</span></MenuItem>
            </DropdownMenu>
          </IconButtonGroup>
          <Button variant="outline" icon={<Edit />} kbd="E" onClick={() => navigate(`/kunder/${kunde.id}/rediger`)}><span className="hidden sm:inline">Rediger</span></Button>
          <Button variant="primary" icon={<Plus />} onClick={() => setVisNyttAnlegg(true)}><span className="hidden sm:inline">Nytt anlegg</span></Button>
        </div>
      </header>

      {/* Statusrad */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tall tittel="Anlegg" verdi={anlegg.length} ikon={<Building2 className="w-4 h-4" />} />
        <Tall tittel="Utført i år" verdi={teller.utfort} tone="g" ikon={<Check className="w-4 h-4" strokeWidth={3} />} />
        <Tall tittel="Ikke utført" verdi={teller.ikke} tone={teller.ikke > 0 ? 'r' : undefined} ikon={<X className="w-4 h-4" strokeWidth={3} />} />
        <Tall tittel="Åpne avvik" verdi={teller.avvik} tone={teller.avvik > 0 ? 'r' : undefined} ikon={<AlertTriangle className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-6 items-start">
        {/* Anlegg */}
        <section className="space-y-3" aria-label="Anlegg">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Anlegg <span className="text-gray-400 font-normal">({anlegg.length})</span></h2>
            <Link to={`/anlegg?q=${encodeURIComponent(kunde.navn ?? '')}`} className="text-sm text-primary hover:underline">Åpne i anleggslisten</Link>
          </div>
          {anlegg.length === 0 ? (
            <div className="card text-center py-10 space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">Ingen anlegg registrert på denne kunden.</p>
              <Button variant="primary" icon={<Plus />} onClick={() => setVisNyttAnlegg(true)}>Nytt anlegg</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {anlegg.map(a => (
                <button key={a.id} type="button" onClick={() => navigate(`/anlegg/${a.id}`)} className={cn('card !p-3.5 w-full flex items-center gap-3 text-left border-l-[3px] hover:border-primary/60 transition-colors', KANT[a.kontroll_status ?? ''] ?? 'border-l-red-500', a.skjult && 'opacity-50')}>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 min-w-0"><span className="font-semibold text-gray-900 dark:text-white truncate">{a.anleggsnavn}</span><StatusBadge status={a.status} /></span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{[a.adresse, a.poststed].filter(Boolean).join(', ')}{a.kontroll_type?.length ? ` · ${a.kontroll_type.join(', ')}` : ''}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', PILL[a.kontroll_status ?? ''] ?? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400')}>{a.kontroll_status ?? 'Ikke utført'}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{a.avvik > 0 ? <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold"><AlertTriangle className="w-3 h-3" />{a.avvik} avvik</span> : a.kontroll_maaned ?? ''}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Fakta */}
        <aside className="space-y-4">
          <section className="card !p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Detaljer</h2>
            <dl className="grid grid-cols-[108px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <dt className="text-gray-500 dark:text-gray-400">Kundenummer</dt><dd className="text-gray-900 dark:text-white tabular-nums">{kunde.kunde_nummer ?? <span className="text-gray-400">Ikke satt</span>}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Org.nr.</dt><dd className="text-gray-900 dark:text-white tabular-nums">{kunde.organisasjonsnummer ?? '–'}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Type</dt><dd className="text-gray-900 dark:text-white">{kunde.type ?? '–'}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Opprettet</dt><dd className="text-gray-900 dark:text-white">{formatDate(kunde.opprettet)}</dd>
              {kunde.sist_oppdatert && <><dt className="text-gray-500 dark:text-gray-400">Oppdatert</dt><dd className="text-gray-900 dark:text-white">{formatDate(kunde.sist_oppdatert)}</dd></>}
            </dl>
          </section>

          <section className="card !p-4 space-y-3">
            <h2 className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">Primær kontaktperson
              <Link to={`/kunder/${kunde.id}/rediger`} className="text-xs font-medium text-primary hover:underline">Endre</Link>
            </h2>
            {kp ? (
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-900 dark:text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">{(kp.navn ?? '?').split(' ').map(n => n[0]).join('').slice(0, 3).toUpperCase()}</span>
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{kp.navn}</div><div className="text-xs text-gray-500 dark:text-gray-400 truncate">{kp.rolle ?? kp.epost ?? kp.telefon ?? ''}</div></div>
                {kp.telefon && <a href={`tel:${kp.telefon}`} aria-label={`Ring ${kp.navn}`} title={kp.telefon} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 hover:text-primary flex items-center justify-center"><Phone className="w-4 h-4" /></a>}
                {kp.epost && <a href={`mailto:${kp.epost}`} aria-label={`E-post til ${kp.navn}`} title={kp.epost} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 hover:text-primary flex items-center justify-center"><Mail className="w-4 h-4" /></a>}
              </div>
            ) : <p className="text-sm text-gray-500 dark:text-gray-400">Ingen kontaktperson registrert.</p>}
          </section>

          <section className="card !p-4 space-y-3">
            <button type="button" onClick={() => setVisPriser(v => !v)} aria-expanded={visPriser} className="w-full flex items-center justify-between gap-2 text-left">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Serviceavtaler</h2>
              <span className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">{priser.length === 0 ? 'Ingen priser' : `${priser.length} anlegg`}<ChevronDown className={cn('w-4 h-4 transition-transform', visPriser && 'rotate-180')} /></span>
            </button>
            {visPriser && (priser.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">Ingen priser registrert på kundens anlegg.</p> : (
              <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 text-sm tabular-nums">
                {priser.map(p => { const an = anlegg.find(a => a.id === p.anlegg_id); const s = (p.prisbrannalarm ?? 0) + (p.prisnodlys ?? 0) + (p.prisslukkeutstyr ?? 0) + (p.prisroykluker ?? 0) + (p.prisekstern ?? 0); return <Frag key={p.id} navn={an?.anleggsnavn ?? 'Anlegg'} verdi={s} /> })}
                <dt className="text-gray-900 dark:text-white font-semibold border-t border-gray-200 dark:border-gray-800 pt-2">Sum per år</dt><dd className="text-gray-900 dark:text-white font-semibold border-t border-gray-200 dark:border-gray-800 pt-2 text-right">kr {sum.toLocaleString('nb-NO')}</dd>
              </dl>
            ))}
          </section>

          <section className="card !p-4 space-y-3">
            <h2 className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">Ukesplaner
              <button type="button" onClick={() => navigate('/kontrollplan', { state: { openUkesplan: true, kundeId: kunde.id } })} aria-label="Ny ukesplan" className="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-primary hover:border-primary flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
            </h2>
            {ukesplaner.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">Ingen ukesplaner.</p> : ukesplaner.map(u => (
              <button key={u.id} type="button" onClick={() => navigate('/kontrollplan', { state: { openUkesplan: true, kundeId: kunde.id, ukesplanId: u.id } })} className="w-full flex items-center gap-2.5 text-left group">
                <span className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0"><Calendar className="w-4 h-4" /></span>
                <span className="flex-1 min-w-0"><span className="block text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary truncate">Uke {u.uke_nummer}, {u.aar}</span><span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{u.navn ?? u.status ?? ''}</span></span>
              </button>
            ))}
          </section>
        </aside>
      </div>

      {visNyttAnlegg && <NyttAnleggDialog kundeId={kunde.id} onClose={() => { setVisNyttAnlegg(false); loadAll() }} />}
      {visStatus && <KundeStatusDialog kundeId={kunde.id} kundeNavn={kunde.navn ?? ''} status={kunde.status} onClose={() => setVisStatus(false)} onEndret={() => { setVisStatus(false); loadAll() }} />}
    </div>
  )
}

function Frag({ navn, verdi }: { navn: string; verdi: number }) {
  return <><dt className="text-gray-500 dark:text-gray-400 truncate">{navn}</dt><dd className="text-gray-900 dark:text-white text-right">kr {verdi.toLocaleString('nb-NO')}</dd></>
}

function Tall({ tittel, verdi, tone, ikon }: { tittel: string; verdi: number; tone?: 'g' | 'r'; ikon: React.ReactNode }) {
  const t = tone === 'g' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : tone === 'r' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-primary/10 text-primary'
  return (
    <div className="card !p-4 flex items-center gap-3">
      <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center', t)}>{ikon}</span>
      <div><div className="text-xs text-gray-500 dark:text-gray-400">{tittel}</div><div className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{verdi}</div></div>
    </div>
  )
}
