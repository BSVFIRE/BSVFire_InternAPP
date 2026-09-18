/**
 * Anlegg – detaljside (/anlegg/:id)
 *
 * Erstatter den gamle fanebaserte visningen i Anlegg.tsx. Oppbygning:
 *   1. Kompakt header med status
 *   2. Statusrad: ett kort per kontrolltype
 *   3. Oversikt = aktivitetsstrøm (notater, ordre, oppgaver, todo, dokumenter) + faktapanel
 *      Dokumenter = egen fane
 *
 * Alle data hentes i én runde (Promise.all) i loadAll().
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertCircle, Building2, Check, CheckSquare, ChevronLeft, ClipboardList, Clock, Cloud,
  DollarSign, Edit, ExternalLink, EyeOff, Eye, FileText, Link2, Loader2, Mail, MapPin,
  MessageSquare, Mic, MicOff, MoreHorizontal, Navigation, Phone, Plus, Search,
  Send, Sparkles, Star, Upload, X, Home, Layers, AlertTriangle, ChevronDown, Share2,
} from 'lucide-react'
import { supabase, db, type Tables } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { formatDate, cn } from '@/lib/utils'
import { ANLEGG_STATUSER } from '@/lib/constants'
import { createLogger } from '@/lib/logger'
import { notifyNewMelding } from '@/lib/telegramService'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { AnleggTodoList } from '@/components/AnleggTodoList'
import { LeilighetsOversikt } from '@/components/LeilighetsOversikt'
import { DropboxFileBrowser } from '@/components/DropboxFileBrowser'
import { QrEtikettPanel } from '@/components/QrEtikettPanel'
import { Button, IconButton, IconButtonGroup } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuLabel, MenuSeparator } from '@/components/ui/DropdownMenu'
import { hentAvvikForAnlegg, AVVIK_REKKEFOLGE, type Avvik, type AvvikKontrolltype } from '@/lib/anleggAvvik'

const log = createLogger('AnleggDetaljer')

// ---------- Typer ----------

type AnleggRow = Tables<'anlegg'> & {
  customer: { navn: string | null; kunde_nummer: string | null; organisasjonsnummer: string | null } | null
  ansvarlig_tekniker: { navn: string | null } | null
}

interface Kontakt {
  id: string
  navn: string | null
  epost: string | null
  telefon: string | null
  rolle: string | null
  primar: boolean
}

interface Dokument {
  id: string
  filnavn: string
  storagePath: string
  dato: string | null
  kilde: 'tabell' | 'storage'
}

type Todo = Tables<'anlegg_todos'>
type Notat = Tables<'intern_kommentar'>
type Ordre = Pick<Tables<'ordre'>, 'id' | 'ordre_nummer' | 'type' | 'status' | 'opprettet_dato'> & { tekniker: { navn: string | null } | null }
type Oppgave = Pick<Tables<'oppgaver'>, 'id' | 'tittel' | 'type' | 'status' | 'forfallsdato' | 'opprettet_dato'> & { tekniker: { navn: string | null } | null }
type Priser = Tables<'priser_kundenummer'>

type Aktivitet =
  | { kind: 'notat'; id: string; dato: string; notat: Notat }
  | { kind: 'ordre'; id: string; dato: string; ordre: Ordre }
  | { kind: 'oppgave'; id: string; dato: string; oppgave: Oppgave }
  | { kind: 'dokument'; id: string; dato: string; dokument: Dokument }

type Filter = 'alle' | 'notat' | 'ordre' | 'oppgave' | 'dokument'
type Tab = 'oversikt' | 'avvik' | 'dokumenter'

// ---------- Kontrolltyper ----------

const KONTROLLTYPER: { navn: string; fullfortKey: keyof Tables<'anlegg'>; rapportType: string | null }[] = [
  { navn: 'Brannalarm', fullfortKey: 'brannalarm_fullfort', rapportType: 'brannalarm' },
  { navn: 'Nødlys', fullfortKey: 'nodlys_fullfort', rapportType: 'nodlys' },
  { navn: 'Slukkeutstyr', fullfortKey: 'slukkeutstyr_fullfort', rapportType: 'slukkeutstyr' },
  { navn: 'Røykluker', fullfortKey: 'roykluker_fullfort', rapportType: 'roykluker' },
  { navn: 'Førstehjelp', fullfortKey: 'forstehjelp_fullfort', rapportType: 'forstehjelp' },
  { navn: 'Ekstern', fullfortKey: 'ekstern_fullfort', rapportType: null },
]

type Tone = 'ok' | 'warn' | 'bad' | 'muted'

const TONE: Record<Tone, { kant: string; ikonBg: string; ikonFg: string }> = {
  ok: { kant: 'border-l-green-500', ikonBg: 'bg-green-100 dark:bg-green-900/30', ikonFg: 'text-green-700 dark:text-green-400' },
  warn: { kant: 'border-l-yellow-500', ikonBg: 'bg-yellow-100 dark:bg-yellow-900/30', ikonFg: 'text-yellow-700 dark:text-yellow-400' },
  bad: { kant: 'border-l-red-500', ikonBg: 'bg-red-100 dark:bg-red-900/30', ikonFg: 'text-red-700 dark:text-red-400' },
  muted: { kant: 'border-l-gray-400', ikonBg: 'bg-gray-100 dark:bg-dark-100', ikonFg: 'text-gray-500 dark:text-gray-400' },
}

const STATUS_PILL: Record<string, string> = {
  [ANLEGG_STATUSER.UTFORT]: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  [ANLEGG_STATUSER.PLANLAGT]: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  [ANLEGG_STATUSER.UTSATT]: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  [ANLEGG_STATUSER.IKKE_UTFORT]: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  [ANLEGG_STATUSER.OPPSAGT]: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700',
}

function statusFor(anlegg: AnleggRow, fullfortKey: keyof Tables<'anlegg'>): { tone: Tone; tekst: string } {
  if (anlegg[fullfortKey]) return { tone: 'ok', tekst: 'Utført' }
  const s = anlegg.kontroll_status
  if (s === ANLEGG_STATUSER.PLANLAGT || s === ANLEGG_STATUSER.UTSATT) return { tone: 'warn', tekst: s }
  if (s === ANLEGG_STATUSER.OPPSAGT) return { tone: 'muted', tekst: s }
  return { tone: 'bad', tekst: 'Ikke utført' }
}

function initialer(navn: string | null | undefined): string {
  return (navn ?? '?').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 3).toUpperCase()
}

function relativTid(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const dager = Math.floor(diff / 86_400_000)
  if (dager <= 0) return 'i dag'
  if (dager === 1) return 'i går'
  if (dager < 7) return `${dager} dager siden`
  return formatDate(iso)
}

// ---------- Hovedkomponent ----------

export default function AnleggDetaljer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: Tab = tabParam === 'dokumenter' ? 'dokumenter' : tabParam === 'avvik' ? 'avvik' : 'oversikt'

  const [anlegg, setAnlegg] = useState<AnleggRow | null>(null)
  const [kontakter, setKontakter] = useState<Kontakt[]>([])
  const [notater, setNotater] = useState<Notat[]>([])
  const [ordre, setOrdre] = useState<Ordre[]>([])
  const [oppgaver, setOppgaver] = useState<Oppgave[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [dokumenter, setDokumenter] = useState<Dokument[]>([])
  const [priser, setPriser] = useState<Priser | null>(null)
  const [avvik, setAvvik] = useState<Avvik[]>([])
  const [leiligheter, setLeiligheter] = useState<{ totalt: number; kontrollert: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)

  const [visLeiligheter, setVisLeiligheter] = useState(false)
  const [visDropbox, setVisDropbox] = useState(false)
  const [visTodoAdmin, setVisTodoAdmin] = useState(false)
  const [visKontaktModal, setVisKontaktModal] = useState(false)

  const notatRef = useRef<HTMLTextAreaElement>(null)

  const loadAll = useCallback(async () => {
    if (!id) return
    try {
      setFeil(null)
      const [anleggRes, kontRes, notRes, ordreRes, oppgRes, todoRes, dokRes, prisRes] = await Promise.all([
        db.from('anlegg')
          .select('*, customer:kundenr(navn, kunde_nummer, organisasjonsnummer), ansvarlig_tekniker:ansatte!anlegg_ansvarlig_tekniker_id_fkey(navn)')
          .eq('id', id).single(),
        db.from('kontaktpersoner')
          .select('id, navn, epost, telefon, rolle, anlegg_kontaktpersoner!inner(primar, anlegg_id)')
          .eq('anlegg_kontaktpersoner.anlegg_id', id),
        db.from('intern_kommentar').select('*').eq('anlegg_id', id).order('created_at', { ascending: false }).limit(50),
        db.from('ordre').select('id, ordre_nummer, type, status, opprettet_dato, tekniker:tekniker_id(navn)')
          .eq('anlegg_id', id).order('opprettet_dato', { ascending: false }).limit(25),
        db.from('oppgaver').select('id, tittel, type, status, forfallsdato, opprettet_dato, tekniker:tekniker_id(navn)')
          .eq('anlegg_id', id).order('opprettet_dato', { ascending: false }).limit(25),
        db.from('anlegg_todos').select('*').eq('anlegg_id', id).order('created_at', { ascending: false }),
        db.from('dokumenter').select('id, filnavn, storage_path, url, opplastet_dato, created_at').eq('anlegg_id', id),
        db.from('priser_kundenummer').select('*').eq('anlegg_id', id).limit(1).maybeSingle(),
      ])

      if (anleggRes.error) throw anleggRes.error
      const a = anleggRes.data as AnleggRow
      setAnlegg(a)

      // Avvik på tvers av kontrolltypene (egen runde – feil her skal ikke velte siden)
      hentAvvikForAnlegg(id).then(setAvvik).catch(err => log.error('Kunne ikke hente avvik', { error: err, anleggId: id }))

      setKontakter((kontRes.data ?? []).map(k => ({
        id: k.id, navn: k.navn, epost: k.epost, telefon: k.telefon, rolle: k.rolle,
        primar: k.anlegg_kontaktpersoner?.[0]?.primar ?? false,
      })).sort((x, y) => Number(y.primar) - Number(x.primar)))
      setNotater(notRes.data ?? [])
      setOrdre((ordreRes.data ?? []) as Ordre[])
      setOppgaver((oppgRes.data ?? []) as Oppgave[])
      setTodos(todoRes.data ?? [])
      setPriser(prisRes.data ?? null)

      // Dokumenter: tabell + filer i storage som ikke er registrert i tabellen
      const storagePrefix = `anlegg/${id}/dokumenter`
      const { data: filer } = await supabase.storage.from('anlegg.dokumenter').list(storagePrefix, { limit: 200 })
      const fraTabell: Dokument[] = (dokRes.data ?? [])
        .filter(d => d.filnavn)
        .map(d => ({
          id: d.id,
          filnavn: d.filnavn!,
          storagePath: d.storage_path ?? `${storagePrefix}/${d.filnavn}`,
          dato: d.opplastet_dato ?? d.created_at,
          kilde: 'tabell' as const,
        }))
      const kjente = new Set(fraTabell.map(d => d.filnavn))
      const fraStorage: Dokument[] = (filer ?? [])
        .filter(f => f.name && !kjente.has(f.name) && !f.name.startsWith('.'))
        .map(f => ({ id: f.id ?? f.name, filnavn: f.name, storagePath: `${storagePrefix}/${f.name}`, dato: f.created_at ?? null, kilde: 'storage' as const }))
      setDokumenter([...fraTabell, ...fraStorage].sort((x, y) => (y.dato ?? '').localeCompare(x.dato ?? '')))

      // Leiligheter (kun leilighetsbygg)
      if (a.er_leilighetsbygg) {
        const aar = new Date().getFullYear()
        const [tot, kontr] = await Promise.all([
          db.from('anlegg_leiligheter').select('id', { count: 'exact', head: true }).eq('anlegg_id', id),
          db.from('leilighet_kontroller').select('leilighet_id').eq('anlegg_id', id).eq('kontroll_aar', aar),
        ])
        setLeiligheter({ totalt: tot.count ?? 0, kontrollert: new Set((kontr.data ?? []).map(k => k.leilighet_id)).size })
      } else {
        setLeiligheter(null)
      }
    } catch (err) {
      log.error('Kunne ikke laste anlegg', { error: err, anleggId: id })
      setFeil(err instanceof Error ? err.message : 'Kunne ikke laste anlegg')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  const aktivitet = useMemo<Aktivitet[]>(() => {
    const liste: Aktivitet[] = [
      ...notater.map(n => ({ kind: 'notat' as const, id: n.id, dato: n.created_at, notat: n })),
      ...ordre.map(o => ({ kind: 'ordre' as const, id: o.id, dato: o.opprettet_dato ?? '', ordre: o })),
      ...oppgaver.map(o => ({ kind: 'oppgave' as const, id: o.id, dato: o.opprettet_dato ?? '', oppgave: o })),
      ...dokumenter.map(d => ({ kind: 'dokument' as const, id: d.id, dato: d.dato ?? '', dokument: d })),
    ]
    return liste.sort((a, b) => b.dato.localeCompare(a.dato))
  }, [notater, ordre, oppgaver, dokumenter])

  const avvikPerType = useMemo(() => {
    const m = new Map<AvvikKontrolltype, number>()
    for (const a of avvik) m.set(a.kontrolltype, (m.get(a.kontrolltype) ?? 0) + 1)
    return m
  }, [avvik])
  const apneTodos = todos.filter(t => !t.fullfort)
  const aktiveOrdre = ordre.filter(o => o.status !== 'Fullført' && o.status !== 'Fakturert')
  const apneOppgaver = oppgaver.filter(o => o.status !== 'Fullført')
  const primaerKontakt = kontakter.find(k => k.primar) ?? kontakter[0]

  function setTab(t: Tab) {
    const p = new URLSearchParams(searchParams)
    if (t === 'oversikt') p.delete('tab'); else p.set('tab', t)
    setSearchParams(p, { replace: true })
  }

  async function kopierLenke() {
    try { await navigator.clipboard.writeText(window.location.href); toast.success('Lenke kopiert') } catch { toast.error('Kunne ikke kopiere lenken') }
  }

  // Tastatursnarvei: E = rediger (ikke når man skriver i et felt)
  useEffect(() => {
    function tast(e: KeyboardEvent) {
      if (e.key !== 'e' || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return
      if (id) navigate(`/anlegg/${id}/rediger`)
    }
    document.addEventListener('keydown', tast)
    return () => document.removeEventListener('keydown', tast)
  }, [id, navigate])

  // ---------- Rendering ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (feil || !anlegg) {
    return (
      <div className="card bg-red-900/20 border-red-800 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste anlegg</h2>
          <p className="text-sm text-red-300 mb-3">{feil ?? 'Anlegget finnes ikke'}</p>
          <div className="flex gap-2">
            <Button variant="primary" onClick={loadAll}>Prøv igjen</Button>
            <Link to="/anlegg" className="btn-secondary text-sm">Til anleggslisten</Link>
          </div>
        </div>
      </div>
    )
  }

  const adresse = [anlegg.adresse, [anlegg.postnummer, anlegg.poststed].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const kundeNavn = anlegg.customer?.navn ?? 'Ukjent kunde'
  const kundeNummer = anlegg.customer?.kunde_nummer ?? (anlegg.kunde_nummer != null ? String(anlegg.kunde_nummer) : null)
  const kontrolltyper = KONTROLLTYPER.filter(k => anlegg.kontroll_type?.includes(k.navn))

  return (
    <div className="space-y-5">
      {/* Brødsmule */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/anlegg" className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0">
          <ChevronLeft className="w-4 h-4 sm:hidden" />Anlegg
        </Link>
        <span className="hidden sm:inline">/</span>
        <span className="hidden sm:inline text-gray-900 dark:text-white truncate">{anlegg.anleggsnavn}</span>
      </div>

      {/* 1. Header */}
      <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{anlegg.anleggsnavn}</h1>
            <StatusVelger anlegg={anlegg} onChanged={loadAll} />
          </div>
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-sm text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5"><Building2 className="w-4 h-4" />{kundeNavn}</span>
            {adresse && <><span className="text-gray-300 dark:text-gray-700">·</span><span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" />{adresse}</span></>}
            {kundeNummer && <><span className="text-gray-300 dark:text-gray-700">·</span><span>Kundenr. {kundeNummer}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <IconButtonGroup>
            {kundeNummer && <IconButton variant="ghost" label="Dropbox-filer" icon={<Cloud />} onClick={() => setVisDropbox(true)} />}
            <IconButton variant="ghost" label="Kopier lenke til anlegget" icon={<Share2 />} onClick={kopierLenke} />
            <MerMeny anlegg={anlegg} onChanged={loadAll} />
          </IconButtonGroup>
          <Button variant="outline" icon={<Edit />} kbd="E" onClick={() => navigate(`/anlegg/${anlegg.id}/rediger`)}>
            <span className="hidden sm:inline">Rediger</span>
          </Button>
          <div className="inline-flex">
            <Button variant="primary" icon={<Plus />} className="rounded-r-none" onClick={() => navigate('/ordre', { state: { kundeId: anlegg.kundenr, anleggId: anlegg.id } })}>
              <span className="hidden sm:inline">Ny ordre</span>
            </Button>
            <DropdownMenu trigger={open => (
              <Button variant="primary" aria-label="Flere valg for ny" aria-expanded={open} className="rounded-l-none w-8 px-0 border-l border-white/25"><ChevronDown /></Button>
            )}>
              <MenuLabel>Opprett</MenuLabel>
              <MenuItem icon={<ClipboardList />} onSelect={() => navigate('/ordre', { state: { kundeId: anlegg.kundenr, anleggId: anlegg.id } })}>Ny ordre</MenuItem>
              <MenuItem icon={<CheckSquare />} onSelect={() => navigate('/oppgaver', { state: { kundeId: anlegg.kundenr, anleggId: anlegg.id, opprettNy: true } })}>Ny oppgave</MenuItem>
              <MenuItem icon={<MessageSquare />} onSelect={() => { setTab('oversikt'); setTimeout(() => notatRef.current?.focus(), 50) }}>Nytt notat</MenuItem>
              <MenuSeparator />
              <MenuItem icon={<FileText />} onSelect={() => navigate('/rapporter', { state: { kundeId: anlegg.kundenr, anleggId: anlegg.id } })}>Registrer kontroll…</MenuItem>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* 2. Statusrad */}
      <section aria-label="Kontrollstatus" className="space-y-2.5">
        {kontrolltyper.length === 0 && !leiligheter ? (
          <div className="card text-sm text-gray-500 dark:text-gray-400">Ingen kontrolltyper registrert. <button onClick={() => navigate(`/anlegg/${anlegg.id}/rediger`)} className="text-primary hover:underline">Legg til i redigering</button></div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 xl:grid-cols-4 snap-x">
            {kontrolltyper.map(k => {
              const st = statusFor(anlegg, k.fullfortKey)
              return (
                <StatusKort
                  key={k.navn}
                  tittel={k.navn}
                  tone={st.tone}
                  verdi={st.tekst}
                  avvik={avvikPerType.get(k.navn as AvvikKontrolltype) ?? 0}
                  onAvvikClick={() => setTab('avvik')}
                  under={st.tone === 'ok'
                    ? [anlegg.sist_oppdatert ? formatDate(anlegg.sist_oppdatert) : null, anlegg.status_oppdatert_av_navn ? initialer(anlegg.status_oppdatert_av_navn) : null].filter(Boolean).join(' · ') || 'Kontroll fullført'
                    : anlegg.kontroll_maaned ? `Kontrollmåned ${anlegg.kontroll_maaned}` : 'Kontrollmåned ikke satt'}
                  onClick={k.rapportType
                    ? () => navigate('/rapporter', { state: { kundeId: anlegg.kundenr, anleggId: anlegg.id, rapportType: k.rapportType } })
                    : undefined}
                />
              )
            })}
            {leiligheter && (
              <StatusKort
                tittel="Leiligheter"
                tone={leiligheter.totalt > 0 && leiligheter.kontrollert >= leiligheter.totalt ? 'ok' : leiligheter.kontrollert > 0 ? 'warn' : 'bad'}
                verdi={`${leiligheter.kontrollert} av ${leiligheter.totalt}`}
                under={`kontrollert ${new Date().getFullYear()}`}
                ikon={<Home className="w-3.5 h-3.5" />}
                onClick={() => setVisLeiligheter(true)}
              />
            )}
          </div>
        )}
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-sm text-gray-500 dark:text-gray-400 px-0.5">
          <span><b className="font-semibold text-gray-900 dark:text-white">Kontrollmåned:</b> {anlegg.kontroll_maaned ?? '–'}</span>
          <span><b className="font-semibold text-gray-900 dark:text-white">Ansvarlig:</b> {anlegg.ansvarlig_tekniker?.navn ?? 'Ikke satt'}</span>
          <button onClick={() => setTab('avvik')} className="hover:text-gray-900 dark:hover:text-white"><span className={cn('font-semibold', avvik.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-primary')}>{avvik.length}</span> avvik</button>
          <button onClick={() => { setTab('oversikt'); setVisTodoAdmin(true) }} className="hover:text-gray-900 dark:hover:text-white"><span className="text-primary font-semibold">{apneTodos.length}</span> åpne todo</button>
          <button onClick={() => navigate('/ordre', { state: { anleggId: anlegg.id } })} className="hover:text-gray-900 dark:hover:text-white"><span className="text-primary font-semibold">{aktiveOrdre.length}</span> {aktiveOrdre.length === 1 ? 'aktiv ordre' : 'aktive ordre'}</button>
          <button onClick={() => navigate('/oppgaver', { state: { anleggId: anlegg.id } })} className="hover:text-gray-900 dark:hover:text-white"><span className="text-primary font-semibold">{apneOppgaver.length}</span> {apneOppgaver.length === 1 ? 'åpen oppgave' : 'åpne oppgaver'}</button>
          {anlegg.sist_oppdatert && <span className="hidden md:inline ml-auto">Sist oppdatert {formatDate(anlegg.sist_oppdatert)}{anlegg.status_oppdatert_av_navn ? ` av ${anlegg.status_oppdatert_av_navn}` : ''}</span>}
        </div>
      </section>

      {/* Hurtighandlinger – kun mobil */}
      <div className="grid grid-cols-4 gap-2 lg:hidden">
        <HurtigKnapp ikon={<Phone />} tekst="Ring" href={primaerKontakt?.telefon ? `tel:${primaerKontakt.telefon}` : undefined} />
        <HurtigKnapp ikon={<Navigation />} tekst="Veibeskrivelse" href={adresse ? `https://maps.google.com/?q=${encodeURIComponent(adresse)}` : undefined} ekstern />
        <HurtigKnapp ikon={<Mic />} tekst="Talenotat" onClick={() => { setTab('oversikt'); setTimeout(() => notatRef.current?.focus(), 50) }} />
        <HurtigKnapp ikon={<FileText />} tekst="Dokumenter" onClick={() => setTab('dokumenter')} />
      </div>

      {/* Faner */}
      <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-800" aria-label="Faner">
        <FaneKnapp aktiv={tab === 'oversikt'} onClick={() => setTab('oversikt')}>Oversikt</FaneKnapp>
        <FaneKnapp aktiv={tab === 'avvik'} onClick={() => setTab('avvik')}>
          Avvik <span className={cn('px-1.5 py-0.5 rounded-full text-xs', avvik.length > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 dark:bg-dark-100')}>{avvik.length}</span>
        </FaneKnapp>
        <FaneKnapp aktiv={tab === 'dokumenter'} onClick={() => setTab('dokumenter')}>
          Dokumenter <span className="px-1.5 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-dark-100">{dokumenter.length}</span>
        </FaneKnapp>
      </nav>

      {tab === 'oversikt' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-6 items-start">
          <Aktivitetsstrom
            anlegg={anlegg}
            kundeNavn={kundeNavn}
            aktivitet={aktivitet}
            todos={apneTodos}
            visTodoAdmin={visTodoAdmin}
            onToggleTodoAdmin={() => setVisTodoAdmin(v => !v)}
            notatRef={notatRef}
            onNotatOpprettet={loadAll}
            onTodoChange={loadAll}
            onApneDokument={apneDokument}
          />
          <aside className="space-y-4">
            <DetaljerPanel anlegg={anlegg} kundeNummer={kundeNummer} adresse={adresse} />
            <KontaktPanel anleggId={anlegg.id} kontakter={kontakter} onChanged={loadAll} onLeggTil={() => setVisKontaktModal(true)} />
            <QrEtikettPanel anleggId={anlegg.id} anleggsnavn={anlegg.anleggsnavn ?? ''} />
            <PriserPanel priser={priser} onRediger={() => navigate('/priser', { state: { anleggId: anlegg.id, kundeId: anlegg.kundenr } })} />
          </aside>
        </div>
      ) : tab === 'avvik' ? (
        <AvvikFane anlegg={anlegg} avvik={avvik} />
      ) : (
        <DokumenterFane
          anlegg={anlegg}
          dokumenter={dokumenter}
          onApne={apneDokument}
          onSend={d => navigate('/send-rapporter', { state: { anleggId: anlegg.id, kundeId: anlegg.kundenr, dokumentId: d.id, dokumentNavn: d.filnavn } })}
          onLastOpp={() => navigate('/last-opp', { state: { anleggId: anlegg.id, kundeId: anlegg.kundenr } })}
          onDropbox={kundeNummer ? () => setVisDropbox(true) : undefined}
        />
      )}

      {/* Modaler */}
      {visLeiligheter && (
        <LeilighetsOversikt
          anleggId={anlegg.id}
          anleggNavn={anlegg.anleggsnavn ?? ''}
          antallEtasjer={anlegg.antall_etasjer}
          onClose={() => setVisLeiligheter(false)}
          onUpdate={loadAll}
        />
      )}
      {kundeNummer && (
        <DropboxFileBrowser
          isOpen={visDropbox}
          onClose={() => setVisDropbox(false)}
          kundeNummer={kundeNummer}
          kundeNavn={kundeNavn}
          anleggNavn={anlegg.anleggsnavn ?? ''}
        />
      )}
      {visKontaktModal && (
        <KontaktModal
          anleggId={anlegg.id}
          eksisterendeIder={kontakter.map(k => k.id)}
          onClose={() => setVisKontaktModal(false)}
          onLagtTil={() => { setVisKontaktModal(false); loadAll() }}
        />
      )}
    </div>
  )

  async function apneDokument(d: Dokument) {
    const { data, error } = await supabase.storage.from('anlegg.dokumenter').createSignedUrl(d.storagePath, 60 * 60)
    if (error || !data?.signedUrl) {
      toast.error('Kunne ikke åpne dokumentet', error)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }
}

// ---------- Små byggeklosser ----------

function StatusKort({ tittel, tone, verdi, under, ikon, onClick, avvik = 0, onAvvikClick }: { tittel: string; tone: Tone; verdi: string; under: string; ikon?: React.ReactNode; onClick?: () => void; avvik?: number; onAvvikClick?: () => void }) {
  const t = TONE[tone]
  const Ikon = ikon ?? (tone === 'ok' ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : tone === 'warn' ? <Clock className="w-3.5 h-3.5" /> : tone === 'bad' ? <X className="w-3.5 h-3.5" strokeWidth={3} /> : <EyeOff className="w-3.5 h-3.5" />)
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{tittel}</span>
        <span className={cn('w-6 h-6 rounded-full flex items-center justify-center', t.ikonBg, t.ikonFg)}>{Ikon}</span>
      </div>
      <div className="text-lg font-semibold text-gray-900 dark:text-white">{verdi}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{under}</div>
      {avvik > 0 && (
        <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); onAvvikClick?.() }} onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onAvvikClick?.() } }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline w-fit">
          <AlertTriangle className="w-3 h-3" />{avvik} avvik
        </span>
      )}
    </>
  )
  const klasser = cn('flex-shrink-0 w-44 sm:w-auto snap-start flex flex-col gap-2 p-4 rounded-xl bg-white dark:bg-dark-50 border border-gray-200 dark:border-gray-800 border-l-[3px] text-left', t.kant, onClick && 'hover:border-primary/60 dark:hover:border-primary/60 transition-colors')
  return onClick ? <button type="button" onClick={onClick} className={klasser}>{inner}</button> : <div className={klasser}>{inner}</div>
}

function HurtigKnapp({ ikon, tekst, href, onClick, ekstern }: { ikon: React.ReactNode; tekst: string; href?: string; onClick?: () => void; ekstern?: boolean }) {
  const klasser = cn('flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-lg bg-white dark:bg-dark-50 border border-gray-200 dark:border-gray-800 text-[11px] font-medium text-gray-900 dark:text-white [&>svg]:w-5 [&>svg]:h-5 [&>svg]:text-primary', !href && !onClick && 'opacity-40 pointer-events-none')
  if (href) return <a href={href} target={ekstern ? '_blank' : undefined} rel={ekstern ? 'noopener noreferrer' : undefined} className={klasser}>{ikon}{tekst}</a>
  return <button type="button" onClick={onClick} className={klasser}>{ikon}{tekst}</button>
}

function FaneKnapp({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-current={aktiv ? 'page' : undefined}
      className={cn('inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors',
        aktiv ? 'text-gray-900 dark:text-white border-primary font-semibold' : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white')}>
      {children}
    </button>
  )
}

function Pill({ tone, children }: { tone: 'ok' | 'warn' | 'info' | 'muted'; children: React.ReactNode }) {
  const k = {
    ok: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warn: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    muted: 'bg-gray-100 text-gray-700 dark:bg-dark-100 dark:text-gray-400',
  }[tone]
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', k)}>{children}</span>
}

function toneForStatus(status: string | null): 'ok' | 'warn' | 'info' | 'muted' {
  if (status === 'Fullført' || status === 'Fakturert') return 'ok'
  if (status === 'Pågående') return 'info'
  if (status === 'Ny' || status === 'Ventende' || status === 'Ikke påbegynt') return 'warn'
  return 'muted'
}

// ---------- Status-velger i header ----------

function StatusVelger({ anlegg, onChanged }: { anlegg: AnleggRow; onChanged: () => void }) {
  const { ansatt } = useCurrentAnsatt()
  const [lagrer, setLagrer] = useState(false)
  const status = anlegg.kontroll_status ?? ANLEGG_STATUSER.IKKE_UTFORT

  async function endre(ny: string) {
    if (ny === status) return
    setLagrer(true)
    const { error } = await db.from('anlegg').update({
      kontroll_status: ny,
      sist_oppdatert: new Date().toISOString(),
      status_oppdatert_av: ansatt?.id ?? null,
      status_oppdatert_av_navn: ansatt?.navn ?? null,
    }).eq('id', anlegg.id)
    setLagrer(false)
    if (error) { toast.error('Kunne ikke oppdatere status', error); return }
    toast.success(`Status satt til «${ny}»`)
    onChanged()
  }

  return (
    <label className={cn('relative inline-flex items-center gap-1.5 pl-2.5 pr-7 py-1 rounded-full border text-xs font-semibold cursor-pointer', STATUS_PILL[status] ?? STATUS_PILL[ANLEGG_STATUSER.IKKE_UTFORT])}>
      {lagrer ? <Loader2 className="w-3 h-3 animate-spin" /> : status === ANLEGG_STATUSER.UTFORT ? <Check className="w-3 h-3" strokeWidth={3} /> : <Clock className="w-3 h-3" />}
      {status}{anlegg.kontroll_maaned && status !== ANLEGG_STATUSER.UTFORT ? ` – ${anlegg.kontroll_maaned.toLowerCase()}` : ''}
      <span className="sr-only">Endre kontrollstatus</span>
      <select value={status} onChange={e => endre(e.target.value)} disabled={lagrer}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
        {Object.values(ANLEGG_STATUSER).map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <svg className="absolute right-2 w-3 h-3 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
    </label>
  )
}

// ---------- «···»-meny ----------

function MerMeny({ anlegg, onChanged }: { anlegg: AnleggRow; onChanged: () => void }) {
  const navigate = useNavigate()

  async function toggleSkjult() {
    const { error } = await db.from('anlegg').update({ skjult: !anlegg.skjult }).eq('id', anlegg.id)
    if (error) { toast.error('Kunne ikke endre synlighet', error); return }
    toast.success(anlegg.skjult ? 'Anlegget vises igjen i listen' : 'Anlegget er skjult fra listen')
    onChanged()
  }

  return (
    <DropdownMenu trigger={open => <IconButton variant="ghost" label="Flere valg" icon={<MoreHorizontal />} aria-haspopup="menu" aria-expanded={open} />}>
      <MenuItem icon={<DollarSign />} onSelect={() => navigate('/priser', { state: { anleggId: anlegg.id, kundeId: anlegg.kundenr } })}>Kontrollpriser</MenuItem>
      {anlegg.kontrollportal_url && <MenuItem icon={<ExternalLink />} href={anlegg.kontrollportal_url}>Åpne kontrollportal</MenuItem>}
      <MenuItem icon={<Layers />} onSelect={() => navigate('/teknisk', { state: { anleggId: anlegg.id, kundeId: anlegg.kundenr } })}>Teknisk dokumentasjon</MenuItem>
      <MenuSeparator />
      <MenuItem icon={anlegg.skjult ? <Eye /> : <EyeOff />} onSelect={toggleSkjult}>{anlegg.skjult ? 'Vis anlegget i listen' : 'Skjul anlegget fra listen'}</MenuItem>
      <MenuItem icon={<Link2 />} onSelect={() => navigate('/anlegg', { state: { viewAnleggId: anlegg.id, legacyView: true } })}>Gammel visning</MenuItem>
    </DropdownMenu>
  )
}

// ---------- Aktivitet ----------

function Aktivitetsstrom({ anlegg, kundeNavn, aktivitet, todos, visTodoAdmin, onToggleTodoAdmin, notatRef, onNotatOpprettet, onTodoChange, onApneDokument }: {
  anlegg: AnleggRow; kundeNavn: string; aktivitet: Aktivitet[]; todos: Todo[]; visTodoAdmin: boolean; onToggleTodoAdmin: () => void
  notatRef: React.RefObject<HTMLTextAreaElement>; onNotatOpprettet: () => void; onTodoChange: () => void; onApneDokument: (d: Dokument) => void
}) {
  const [filter, setFilter] = useState<Filter>('alle')
  const [visAntall, setVisAntall] = useState(12)

  const filtrert = aktivitet.filter(a => filter === 'alle' || a.kind === filter)
  const synlig = filtrert.slice(0, visAntall)

  async function toggleTodo(t: Todo) {
    const { error } = await db.from('anlegg_todos').update({ fullfort: !t.fullfort, updated_at: new Date().toISOString() }).eq('id', t.id)
    if (error) { toast.error('Kunne ikke oppdatere todo', error); return }
    onTodoChange()
  }

  const chips: { id: Filter; tekst: string }[] = [
    { id: 'alle', tekst: 'Alle' }, { id: 'notat', tekst: 'Notater' }, { id: 'ordre', tekst: 'Ordre' }, { id: 'oppgave', tekst: 'Oppgaver' }, { id: 'dokument', tekst: 'Dokumenter' },
  ]

  return (
    <section aria-label="Aktivitet" className="space-y-3 min-w-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="hidden lg:block text-base font-semibold text-gray-900 dark:text-white">Aktivitet</h2>
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filter">
          {chips.map(c => (
            <button key={c.id} type="button" onClick={() => setFilter(c.id)} aria-pressed={filter === c.id}
              className={cn('px-3 py-1 rounded-full border text-xs font-medium transition-colors min-h-[32px]',
                filter === c.id ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white')}>
              {c.tekst}
            </button>
          ))}
        </div>
      </div>

      <NotatSkjema anlegg={anlegg} kundeNavn={kundeNavn} textareaRef={notatRef} onOpprettet={onNotatOpprettet} />

      {/* Todo – fast blokk øverst */}
      {(filter === 'alle') && (
        <article className="card !p-4 flex gap-3">
          <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0"><CheckSquare className="w-4 h-4" /></span>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span><b className="font-semibold text-gray-900 dark:text-white">Todo</b> · {todos.length === 0 ? 'ingen åpne' : `${todos.length} åpne`}</span>
              <button type="button" onClick={onToggleTodoAdmin} className="text-primary hover:underline text-xs font-medium">{visTodoAdmin ? 'Lukk' : 'Administrer'}</button>
            </div>
            {visTodoAdmin ? (
              <AnleggTodoList anleggId={anlegg.id} onTodoChange={onTodoChange} />
            ) : (
              todos.slice(0, 5).map(t => (
                <label key={t.id} className="flex items-start gap-2.5 min-h-[28px] text-sm text-gray-900 dark:text-white cursor-pointer">
                  <input type="checkbox" checked={false} onChange={() => toggleTodo(t)} className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary" />
                  <span className="flex-1">{t.tittel}{t.forfallsdato && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">forfaller {formatDate(t.forfallsdato)}</span>}</span>
                  {t.prioritet === 'Høy' && <Pill tone="warn">Høy</Pill>}
                </label>
              ))
            )}
            {!visTodoAdmin && todos.length > 5 && <button type="button" onClick={onToggleTodoAdmin} className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary">+ {todos.length - 5} til</button>}
          </div>
        </article>
      )}

      {synlig.length === 0 && (
        <div className="card text-sm text-gray-500 dark:text-gray-400 text-center py-8">Ingen aktivitet{filter !== 'alle' ? ' i dette filteret' : ' ennå'}.</div>
      )}

      {synlig.map(a => <AktivitetsRad key={`${a.kind}-${a.id}`} a={a} onApneDokument={onApneDokument} />)}

      {filtrert.length > visAntall && (
        <button type="button" onClick={() => setVisAntall(n => n + 12)} className="block mx-auto text-sm text-gray-500 dark:text-gray-400 hover:text-primary py-2">
          Vis eldre aktivitet ({filtrert.length - visAntall} til)
        </button>
      )}
    </section>
  )
}

function AktivitetsRad({ a, onApneDokument }: { a: Aktivitet; onApneDokument: (d: Dokument) => void }) {
  const navigate = useNavigate()
  const ikonKl = 'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0'
  switch (a.kind) {
    case 'notat':
      return (
        <article className="card !p-4 flex gap-3">
          <span className={cn(ikonKl, 'bg-primary/10 text-primary')}><MessageSquare className="w-4 h-4" /></span>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-sm text-gray-500 dark:text-gray-400">Notat · {relativTid(a.dato)}</div>
            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">{a.notat.intern_kommentar}</p>
          </div>
        </article>
      )
    case 'ordre':
      return (
        <button type="button" onClick={() => navigate('/ordre', { state: { selectedOrdreId: a.ordre.id } })} className="card !p-4 flex gap-3 w-full text-left hover:border-primary/60 transition-colors">
          <span className={cn(ikonKl, toneForStatus(a.ordre.status) === 'ok' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400')}><ClipboardList className="w-4 h-4" /></span>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-sm text-gray-500 dark:text-gray-400"><b className="font-semibold text-gray-900 dark:text-white">Ordre {a.ordre.ordre_nummer}</b> · {a.ordre.type}{a.dato ? ` · ${formatDate(a.dato)}` : ''}</div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm text-gray-900 dark:text-white">{a.ordre.tekniker?.navn ?? 'Ikke tildelt'}</span>
              <Pill tone={toneForStatus(a.ordre.status)}>{a.ordre.status ?? 'Ukjent'}</Pill>
            </div>
          </div>
        </button>
      )
    case 'oppgave':
      return (
        <button type="button" onClick={() => navigate('/oppgaver', { state: { selectedOppgaveId: a.oppgave.id } })} className="card !p-4 flex gap-3 w-full text-left hover:border-primary/60 transition-colors">
          <span className={cn(ikonKl, 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400')}><CheckSquare className="w-4 h-4" /></span>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-sm text-gray-500 dark:text-gray-400"><b className="font-semibold text-gray-900 dark:text-white">Oppgave</b> · {a.oppgave.tekniker?.navn ?? 'Ikke tildelt'}{a.oppgave.forfallsdato ? ` · forfaller ${formatDate(a.oppgave.forfallsdato)}` : ''}</div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm text-gray-900 dark:text-white">{a.oppgave.tittel ?? a.oppgave.type}</span>
              <Pill tone={toneForStatus(a.oppgave.status)}>{a.oppgave.status}</Pill>
            </div>
          </div>
        </button>
      )
    case 'dokument':
      return (
        <button type="button" onClick={() => onApneDokument(a.dokument)} className="card !p-4 flex gap-3 w-full text-left hover:border-primary/60 transition-colors">
          <span className={cn(ikonKl, 'bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400')}><FileText className="w-4 h-4" /></span>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-sm text-gray-500 dark:text-gray-400"><b className="font-semibold text-gray-900 dark:text-white">Dokument</b>{a.dato ? ` · ${formatDate(a.dato)}` : ''}</div>
            <div className="text-sm text-primary truncate">{a.dokument.filnavn}</div>
          </div>
        </button>
      )
  }
}

// ---------- Notat-skjema med tale og AI ----------

function NotatSkjema({ anlegg, kundeNavn, textareaRef, onOpprettet }: { anlegg: AnleggRow; kundeNavn: string; textareaRef: React.RefObject<HTMLTextAreaElement>; onOpprettet: () => void }) {
  const { ansatt } = useCurrentAnsatt()
  const [tekst, setTekst] = useState('')
  const [mottakerId, setMottakerId] = useState('')
  const [ansatte, setAnsatte] = useState<{ id: string; navn: string | null }[]>([])
  const [lagrer, setLagrer] = useState(false)
  const [opptak, setOpptak] = useState(false)
  const [forbedrer, setForbedrer] = useState(false)
  const recRef = useRef<any>(null)
  const harTale = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)

  useEffect(() => {
    db.from('ansatte').select('id, navn').order('navn').then(({ data }) => setAnsatte(data ?? []))
  }, [])

  function toggleOpptak() {
    if (!harTale) { toast.info('Tale-til-tekst støttes ikke i denne nettleseren'); return }
    if (opptak) { recRef.current?.stop(); setOpptak(false); return }
    if (!recRef.current) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const rec = new SR()
      rec.lang = 'nb-NO'; rec.continuous = true; rec.interimResults = true
      rec.onresult = (e: any) => {
        let ferdig = ''
        for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) ferdig += e.results[i][0].transcript + ' '
        if (ferdig) setTekst(prev => prev + ferdig)
      }
      rec.onerror = () => setOpptak(false)
      rec.onend = () => setOpptak(false)
      recRef.current = rec
    }
    try { recRef.current.start(); setOpptak(true) } catch { setOpptak(false) }
  }

  async function forbedre() {
    if (!tekst.trim()) return
    setForbedrer(true)
    try {
      const { data, error } = await supabase.functions.invoke('ai-improve-note', { body: { note: tekst, context: 'anleggsnotat' } })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      if (data?.suggestion) setTekst(data.suggestion)
    } catch (err) {
      toast.error('AI-forbedring feilet', err)
    } finally {
      setForbedrer(false)
    }
  }

  async function lagre() {
    const notat = tekst.trim()
    if (!notat) return
    setLagrer(true)
    const { error } = await db.from('intern_kommentar').insert({ anlegg_id: anlegg.id, kunde: kundeNavn, intern_kommentar: notat, mottaker_id: mottakerId || null })
    setLagrer(false)
    if (error) { toast.error('Kunne ikke lagre notat', error); return }
    if (mottakerId) {
      notifyNewMelding(mottakerId, ansatt?.navn ?? 'Ukjent', notat, kundeNavn, anlegg.anleggsnavn ?? '').catch(() => {})
    }
    setTekst(''); setMottakerId('')
    toast.success('Notat lagret')
    onOpprettet()
  }

  return (
    <form onSubmit={e => { e.preventDefault(); lagre() }} className="card !p-3 space-y-2">
      <div className="flex gap-3">
        <div className="hidden sm:flex w-8 h-8 rounded-full bg-primary text-white text-xs font-semibold items-center justify-center flex-shrink-0">{initialer(ansatt?.navn)}</div>
        <label htmlFor="nytt-notat" className="sr-only">Nytt notat</label>
        <textarea id="nytt-notat" ref={textareaRef} value={tekst} onChange={e => setTekst(e.target.value)} rows={tekst ? 3 : 1}
          placeholder={opptak ? 'Lytter… snakk nå' : 'Skriv et notat, eller trykk mikrofonen for tale-til-tekst'}
          className="flex-1 min-w-0 bg-transparent border-0 focus:ring-0 p-1 text-base sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none" />
        <button type="button" onClick={toggleOpptak} aria-label={opptak ? 'Stopp opptak' : 'Tale-til-tekst'} aria-pressed={opptak}
          className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors', opptak ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-100')}>
          {opptak ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
      </div>
      {tekst && (
        <div className="flex items-center gap-2 flex-wrap sm:pl-11">
          <Button variant="outline" icon={<Sparkles />} loading={forbedrer} onClick={forbedre}>Forbedre med AI</Button>
          <label className="sr-only" htmlFor="notat-mottaker">Varsle kollega</label>
          <select id="notat-mottaker" value={mottakerId} onChange={e => setMottakerId(e.target.value)} className="input !w-auto !min-h-[36px] !h-9 !py-1 text-sm">
            <option value="">Ikke varsle noen</option>
            {ansatte.map(a => <option key={a.id} value={a.id}>Varsle {a.navn}</option>)}
          </select>
          <Button variant="primary" type="submit" icon={<Send />} loading={lagrer} className="ml-auto">Lagre notat</Button>
        </div>
      )}
    </form>
  )
}

// ---------- Faktapanel ----------

function KontaktPanel({ anleggId, kontakter, onChanged, onLeggTil }: { anleggId: string; kontakter: Kontakt[]; onChanged: () => void; onLeggTil: () => void }) {
  async function settPrimaer(k: Kontakt) {
    if (k.primar) return
    const { error: e1 } = await db.from('anlegg_kontaktpersoner').update({ primar: false }).eq('anlegg_id', anleggId)
    const { error: e2 } = await db.from('anlegg_kontaktpersoner').update({ primar: true }).eq('anlegg_id', anleggId).eq('kontaktperson_id', k.id)
    if (e1 || e2) { toast.error('Kunne ikke sette primærkontakt', e1 ?? e2); return }
    toast.success(`${k.navn} er nå primærkontakt`)
    onChanged()
  }
  async function fjern(k: Kontakt) {
    if (!confirm(`Fjerne ${k.navn} fra dette anlegget? Kontaktpersonen slettes ikke.`)) return
    const { error } = await db.from('anlegg_kontaktpersoner').delete().eq('anlegg_id', anleggId).eq('kontaktperson_id', k.id)
    if (error) { toast.error('Kunne ikke fjerne kontakt', error); return }
    onChanged()
  }
  return (
    <section className="card !p-4 space-y-3">
      <h2 className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
        Kontaktpersoner
        <button type="button" onClick={onLeggTil} aria-label="Legg til kontaktperson" className="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-primary hover:border-primary flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
      </h2>
      {kontakter.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Ingen kontaktpersoner registrert.</p>}
      {kontakter.map(k => (
        <div key={k.id} className="flex items-center gap-2.5 group">
          <button type="button" onClick={() => settPrimaer(k)} title={k.primar ? 'Primærkontakt' : 'Sett som primærkontakt'} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-900 dark:text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 relative">
            {initialer(k.navn)}
            {k.primar && <Star className="absolute -top-1 -right-1 w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{k.navn}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{k.rolle ?? k.epost ?? k.telefon ?? ''}</div>
          </div>
          {k.telefon && <a href={`tel:${k.telefon}`} aria-label={`Ring ${k.navn}`} title={k.telefon} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 hover:text-primary flex items-center justify-center"><Phone className="w-4 h-4" /></a>}
          {k.epost && <a href={`mailto:${k.epost}`} aria-label={`Send e-post til ${k.navn}`} title={k.epost} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 hover:text-primary flex items-center justify-center"><Mail className="w-4 h-4" /></a>}
          <button type="button" onClick={() => fjern(k)} aria-label={`Fjern ${k.navn}`} className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      ))}
    </section>
  )
}

function DetaljerPanel({ anlegg, kundeNummer, adresse }: { anlegg: AnleggRow; kundeNummer: string | null; adresse: string }) {
  const Rad = ({ navn, children }: { navn: string; children: React.ReactNode }) => (
    <><dt className="text-gray-500 dark:text-gray-400">{navn}</dt><dd className="text-gray-900 dark:text-white min-w-0 break-words">{children}</dd></>
  )
  const Ok = ({ ja, tekstJa, tekstNei }: { ja: boolean | null; tekstJa: string; tekstNei: string }) => ja
    ? <span className="inline-flex items-center gap-1.5 text-green-700 dark:text-green-400"><Check className="w-3.5 h-3.5" strokeWidth={3} />{tekstJa}</span>
    : <span className="text-gray-500 dark:text-gray-400">{tekstNei}</span>
  return (
    <section className="card !p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Detaljer</h2>
      <dl className="grid grid-cols-[108px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        <Rad navn="Adresse">{adresse || '–'}{adresse && <a href={`https://maps.google.com/?q=${encodeURIComponent(adresse)}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-primary hover:underline">Kart</a>}</Rad>
        <Rad navn="Org.nr."><span className="tabular-nums">{anlegg.org_nummer ?? anlegg.customer?.organisasjonsnummer ?? '–'}</span></Rad>
        <Rad navn="Kundenummer"><span className="tabular-nums">{kundeNummer ?? '–'}</span></Rad>
        <Rad navn="Kundeportal">{anlegg.kontrollportal_url ? <a href={anlegg.kontrollportal_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Åpne loggbok <ExternalLink className="w-3 h-3" /></a> : <span className="text-gray-500 dark:text-gray-400">Ingen etikett koblet</span>}</Rad>
        <Rad navn="Dropbox"><Ok ja={anlegg.dropbox_synced} tekstJa="Synkronisert" tekstNei="Ikke synkronisert" /></Rad>
        <Rad navn="FG-database"><Ok ja={anlegg.fg_database_registrert} tekstJa="Registrert" tekstNei="Ikke registrert" /></Rad>
        {anlegg.ekstern_type && <Rad navn="Ekstern">{anlegg.ekstern_type}{anlegg.ekstern_firma ? ` · ${anlegg.ekstern_firma}` : ''}</Rad>}
        {anlegg.er_leilighetsbygg && <Rad navn="Bygg">Leilighetsbygg{anlegg.antall_etasjer ? ` · ${anlegg.antall_etasjer} etasjer` : ''}</Rad>}
        <Rad navn="Opprettet">{formatDate(anlegg.opprettet_dato ?? anlegg.created_at)}</Rad>
      </dl>
    </section>
  )
}

function PriserPanel({ priser, onRediger }: { priser: Priser | null; onRediger: () => void }) {
  // Lukket som standard – summen vises i overskriften, detaljene ved klikk
  const [apen, setApen] = useState(false)
  const rader = priser ? [
    ['Brannalarm', priser.prisbrannalarm], ['Nødlys', priser.prisnodlys], ['Slukkeutstyr', priser.prisslukkeutstyr], ['Røykluker', priser.prisroykluker], ['Ekstern', priser.prisekstern],
  ].filter(([, v]) => v != null && v !== 0) as [string, number][] : []
  const sum = rader.reduce((s, [, v]) => s + v, 0)
  return (
    <section className="card !p-4 space-y-3">
      <button type="button" onClick={() => setApen(v => !v)} aria-expanded={apen} className="w-full flex items-center justify-between gap-2 text-left">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Serviceavtale</h2>
        <span className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 tabular-nums">
          {rader.length > 0 ? `kr ${sum.toLocaleString('nb-NO')}/år` : 'Ingen priser'}
          <ChevronDown className={cn('w-4 h-4 transition-transform', apen && 'rotate-180')} />
        </span>
      </button>
      {!apen ? null : rader.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Ingen priser registrert.</p>
      ) : (
        <dl className="grid grid-cols-[108px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm tabular-nums">
          {rader.map(([n, v]) => <Fragment key={n}><dt className="text-gray-500 dark:text-gray-400">{n}</dt><dd className="text-gray-900 dark:text-white">kr {v.toLocaleString('nb-NO')}</dd></Fragment>)}
          <dt className="text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-2">Sum</dt><dd className="text-gray-900 dark:text-white font-semibold border-t border-gray-200 dark:border-gray-800 pt-2">kr {sum.toLocaleString('nb-NO')}</dd>
        </dl>
      )}
      {apen && <button type="button" onClick={onRediger} className="text-sm text-primary hover:underline">Rediger priser</button>}
    </section>
  )
}

// ---------- Avvik-fane ----------

function AvvikFane({ anlegg, avvik }: { anlegg: AnleggRow; avvik: Avvik[] }) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<AvvikKontrolltype | 'alle'>('alle')
  const typerMedAvvik = AVVIK_REKKEFOLGE.filter(t => avvik.some(a => a.kontrolltype === t))
  const grupper = (filter === 'alle' ? typerMedAvvik : typerMedAvvik.filter(t => t === filter))
    .map(t => ({ type: t, rader: avvik.filter(a => a.kontrolltype === t) }))

  function tilRapport(a: Avvik) {
    navigate('/rapporter', { state: { kundeId: anlegg.kundenr, anleggId: anlegg.id, rapportType: a.rapportType } })
  }

  if (avvik.length === 0) {
    return (
      <div className="card text-center py-10">
        <span className="inline-flex w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 items-center justify-center mb-3"><Check className="w-6 h-6" strokeWidth={3} /></span>
        <p className="text-gray-900 dark:text-white font-semibold">Ingen registrerte avvik</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Avvik hentes fra siste kontroll for hver kontrolltype.</p>
      </div>
    )
  }

  return (
    <section className="space-y-3" aria-label="Avvik">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500 dark:text-gray-400">{avvik.length} avvik fra siste kontroll per type. Klikk på et avvik for å åpne rapporten.</p>
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filtrer på kontrolltype">
          {(['alle', ...typerMedAvvik] as const).map(t => (
            <button key={t} type="button" onClick={() => setFilter(t)} aria-pressed={filter === t}
              className={cn('px-3 py-1 rounded-full border text-xs font-medium min-h-[32px] transition-colors',
                filter === t ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white')}>
              {t === 'alle' ? `Alle (${avvik.length})` : `${t} (${avvik.filter(a => a.kontrolltype === t).length})`}
            </button>
          ))}
        </div>
      </div>

      {grupper.map(g => (
        <div key={g.type} className="card !p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-dark-100 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">{g.type} · {g.rader.length}</h3>
            <button type="button" onClick={() => tilRapport(g.rader[0])} className="text-xs text-primary hover:underline">Åpne rapport</button>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {g.rader.map(a => (
              <li key={a.key}>
                <button type="button" onClick={() => tilRapport(a)} className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="flex-1 min-w-0 grid sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 items-baseline">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{a.avvik}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{a.hvor ?? <span className="text-gray-400">Sted ikke angitt</span>}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{a.detalj}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 sm:text-right tabular-nums">{a.dato ? formatDate(a.dato) : ''}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

// ---------- Dokumenter-fane ----------

function DokumenterFane({ anlegg, dokumenter, onApne, onSend, onLastOpp, onDropbox }: {
  anlegg: AnleggRow; dokumenter: Dokument[]; onApne: (d: Dokument) => void; onSend: (d: Dokument) => void; onLastOpp: () => void; onDropbox?: () => void
}) {
  const [sok, setSok] = useState('')
  const liste = dokumenter.filter(d => d.filnavn.toLowerCase().includes(sok.toLowerCase()))
  return (
    <section className="space-y-3" aria-label="Dokumenter">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <label htmlFor="dok-sok" className="sr-only">Søk i dokumenter</label>
          <input id="dok-sok" type="search" value={sok} onChange={e => setSok(e.target.value)} placeholder="Søk i dokumenter…" className="input pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Upload />} onClick={onLastOpp}>Last opp</Button>
          {onDropbox && <Button variant="outline" icon={<Cloud />} onClick={onDropbox}>Dropbox</Button>}
        </div>
      </div>
      {liste.length === 0 ? (
        <div className="card text-sm text-gray-500 dark:text-gray-400 text-center py-8">{sok ? 'Ingen dokumenter matcher søket.' : `Ingen dokumenter på ${anlegg.anleggsnavn} ennå.`}</div>
      ) : (
        <div className="card !p-0 divide-y divide-gray-200 dark:divide-gray-800">
          {liste.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
              <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <button type="button" onClick={() => onApne(d)} className="flex-1 min-w-0 text-left">
                <div className="text-sm text-gray-900 dark:text-white truncate hover:text-primary">{d.filnavn}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{d.dato ? formatDate(d.dato) : 'Ukjent dato'}{d.kilde === 'storage' ? ' · kun i lagring' : ''}</div>
              </button>
              <Button variant="ghost" icon={<Send />} onClick={() => onSend(d)} title="Send på e-post"><span className="hidden sm:inline">Send</span></Button>
              <Button variant="ghost" icon={<ExternalLink />} onClick={() => onApne(d)} title="Åpne"><span className="hidden sm:inline">Åpne</span></Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ---------- Kontakt-modal ----------

function KontaktModal({ anleggId, eksisterendeIder, onClose, onLagtTil }: { anleggId: string; eksisterendeIder: string[]; onClose: () => void; onLagtTil: () => void }) {
  const [modus, setModus] = useState<'velg' | 'ny'>('velg')
  const [alle, setAlle] = useState<{ id: string; navn: string | null; epost: string | null; telefon: string | null }[]>([])
  const [sok, setSok] = useState('')
  const [ny, setNy] = useState({ navn: '', epost: '', telefon: '', rolle: '' })
  const [lagrer, setLagrer] = useState(false)

  useEffect(() => {
    db.from('kontaktpersoner').select('id, navn, epost, telefon').order('navn').then(({ data }) => setAlle(data ?? []))
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const kandidater = alle.filter(k => !eksisterendeIder.includes(k.id) && (k.navn ?? '').toLowerCase().includes(sok.toLowerCase())).slice(0, 30)

  async function koble(kontaktId: string) {
    setLagrer(true)
    const { error } = await db.from('anlegg_kontaktpersoner').insert({ anlegg_id: anleggId, kontaktperson_id: kontaktId, primar: eksisterendeIder.length === 0 })
    setLagrer(false)
    if (error) { toast.error('Kunne ikke koble kontaktperson', error); return }
    toast.success('Kontaktperson lagt til')
    onLagtTil()
  }

  async function opprett(e: React.FormEvent) {
    e.preventDefault()
    if (!ny.navn.trim()) { toast.warning('Navn er påkrevd'); return }
    setLagrer(true)
    const { data, error } = await db.from('kontaktpersoner').insert({ navn: ny.navn.trim(), epost: ny.epost || null, telefon: ny.telefon || null, rolle: ny.rolle || null }).select('id').single()
    if (error || !data) { setLagrer(false); toast.error('Kunne ikke opprette kontaktperson', error); return }
    await koble(data.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="kontakt-modal-tittel" onClick={e => e.stopPropagation()} className="card w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="kontakt-modal-tittel" className="text-lg font-semibold text-gray-900 dark:text-white">Legg til kontaktperson</h2>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} />
        </div>
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
          <FaneKnapp aktiv={modus === 'velg'} onClick={() => setModus('velg')}>Velg eksisterende</FaneKnapp>
          <FaneKnapp aktiv={modus === 'ny'} onClick={() => setModus('ny')}>Opprett ny</FaneKnapp>
        </div>
        {modus === 'velg' ? (
          <div className="space-y-2">
            <label htmlFor="kontakt-sok" className="sr-only">Søk etter kontaktperson</label>
            <input id="kontakt-sok" type="search" value={sok} onChange={e => setSok(e.target.value)} placeholder="Søk på navn…" className="input" autoFocus />
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg">
              {kandidater.length === 0 && <div className="p-3 text-sm text-gray-500 dark:text-gray-400">Ingen treff.</div>}
              {kandidater.map(k => (
                <button key={k.id} type="button" disabled={lagrer} onClick={() => koble(k.id)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-dark-100">
                  <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-100 text-xs font-semibold flex items-center justify-center text-gray-900 dark:text-white">{initialer(k.navn)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-gray-900 dark:text-white truncate">{k.navn}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{[k.epost, k.telefon].filter(Boolean).join(' · ')}</span>
                  </span>
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={opprett} className="space-y-3">
            <div><label htmlFor="ny-navn" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Navn *</label><input id="ny-navn" value={ny.navn} onChange={e => setNy({ ...ny, navn: e.target.value })} className="input" required autoFocus /></div>
            <div><label htmlFor="ny-rolle" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Rolle</label><input id="ny-rolle" value={ny.rolle} onChange={e => setNy({ ...ny, rolle: e.target.value })} className="input" placeholder="Driftsleder, vaktmester…" /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label htmlFor="ny-tlf" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Telefon</label><input id="ny-tlf" type="tel" value={ny.telefon} onChange={e => setNy({ ...ny, telefon: e.target.value })} className="input" /></div>
              <div><label htmlFor="ny-epost" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">E-post</label><input id="ny-epost" type="email" value={ny.epost} onChange={e => setNy({ ...ny, epost: e.target.value })} className="input" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={onClose}>Avbryt</Button>
              <Button variant="primary" type="submit" loading={lagrer}>Opprett og legg til</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
