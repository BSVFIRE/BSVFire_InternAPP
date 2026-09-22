/**
 * Kontrollplan (/kontrollplan) – planleggingsverktøyet.
 * Årsstripe med fremdrift per måned, valgt måned som liste gruppert på status / kunde / tekniker,
 * inline-endring av tekniker og status (også for flere om gangen), og ukesplaner for kommende uker.
 * Alle valg ligger i URL-en (m, f, type, tek, g, q) så tilbake-knappen virker.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { AlertCircle, Ban, Building2, CalendarDays, Check, ChevronRight, Clock, Plus, Search, Trash2, User, Users, X } from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn, isoUke, isoUkeAar, ukeDatoer } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { ANLEGG_STATUSER, IKKE_KONTRAKT_TEKST, KONTROLLTYPER, MAANEDER, erIkkeKontrakt } from '@/lib/constants'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { Button } from '@/components/ui/Button'
import { UkesplanEditor } from '@/components/Ukesplan'

const log = createLogger('Kontrollplan')

type Anlegg = Pick<Tables<'anlegg'>, 'id' | 'kundenr' | 'anleggsnavn' | 'adresse' | 'poststed' | 'kontroll_maaned' | 'kontroll_status' | 'kontroll_type' | 'ansvarlig_tekniker_id'> & { kunde: string }
type Ansatt = Pick<Tables<'ansatte'>, 'id' | 'navn'>
interface Ukesplan { id: string; uke_nummer: number; aar: number; navn: string | null; status: string | null; kunde_id: string; kunde: string; antallAnlegg: number; teknikere: string[] }

type StatusKey = 'ikke_utfort' | 'utsatt' | 'planlagt' | 'utfort' | 'oppsagt' | 'ikke_kontrakt'
type Gruppering = 'status' | 'kunde' | 'tekniker'

const STATUS: Record<StatusKey, { tittel: string; verdi: string; ikon: React.ReactNode; pill: string; tone: string }> = {
  ikke_utfort: { tittel: 'Ikke utført', verdi: ANLEGG_STATUSER.IKKE_UTFORT, ikon: <X className="w-4 h-4" strokeWidth={3} />, pill: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900', tone: 'bg-red-500' },
  utsatt: { tittel: 'Utsatt', verdi: ANLEGG_STATUSER.UTSATT, ikon: <Clock className="w-4 h-4" />, pill: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900', tone: 'bg-yellow-500' },
  planlagt: { tittel: 'Planlagt', verdi: ANLEGG_STATUSER.PLANLAGT, ikon: <CalendarDays className="w-4 h-4" />, pill: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900', tone: 'bg-blue-500' },
  ikke_kontrakt: { tittel: IKKE_KONTRAKT_TEKST, verdi: ANLEGG_STATUSER.IKKE_UTFORT, ikon: <Ban className="w-4 h-4" />, pill: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900', tone: 'bg-blue-400' },
  utfort: { tittel: 'Utført', verdi: ANLEGG_STATUSER.UTFORT, ikon: <Check className="w-4 h-4" strokeWidth={3} />, pill: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-900', tone: 'bg-green-500' },
  oppsagt: { tittel: 'Oppsagt', verdi: ANLEGG_STATUSER.OPPSAGT, ikon: <Ban className="w-4 h-4" />, pill: 'bg-gray-100 text-gray-700 dark:bg-dark-100 dark:text-gray-400 border-gray-200 dark:border-gray-800', tone: 'bg-gray-400' },
}
const STATUS_REKKEFOLGE: StatusKey[] = ['ikke_utfort', 'utsatt', 'planlagt', 'utfort', 'ikke_kontrakt', 'oppsagt']

function statusKey(s: string | null, kontrollMaaned?: string | null): StatusKey {
  if (erIkkeKontrakt(kontrollMaaned) && s !== ANLEGG_STATUSER.UTFORT) return 'ikke_kontrakt'
  switch (s) {
    case ANLEGG_STATUSER.UTFORT: return 'utfort'
    case ANLEGG_STATUSER.PLANLAGT: return 'planlagt'
    case ANLEGG_STATUSER.UTSATT: return 'utsatt'
    case ANLEGG_STATUSER.OPPSAGT: return 'oppsagt'
    default: return 'ikke_utfort'
  }
}

export function Kontrollplan() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const { ansatt: meg } = useCurrentAnsatt()
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [ukesplaner, setUkesplaner] = useState<Ukesplan[]>([])
  const [loading, setLoading] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)
  const [valgte, setValgte] = useState<Set<string>>(new Set())
  const [lukkede, setLukkede] = useState<Set<string>>(new Set())
  const [visEldrePlaner, setVisEldrePlaner] = useState(false)
  const [editor, setEditor] = useState<{ kundeId?: string; planId?: string } | null>(null)
  const sokRef = useRef<HTMLInputElement>(null)

  const naa = new Date()
  const denneMnd = MAANEDER[naa.getMonth()]
  const mnd = MAANEDER.includes(params.get('m') as typeof MAANEDER[number]) ? (params.get('m') as string) : denneMnd
  const chip = (params.get('f') as StatusKey | 'alle') || 'alle'
  const type = params.get('type') ?? ''
  const tek = params.get('tek') ?? ''
  const gruppering = (params.get('g') as Gruppering) || 'status'
  const q = params.get('q') ?? ''
  const setParam = useCallback((key: string, value: string | null) => {
    const p = new URLSearchParams(params); if (value) p.set(key, value); else p.delete(key)
    setParams(p, { replace: true })
  }, [params, setParams])

  // Åpne ukesplan-editor fra kundesiden (state) – ryddes så det ikke trigges igjen
  useEffect(() => {
    const s = location.state as { openUkesplan?: boolean; kundeId?: string; ukesplanId?: string; editPlanId?: string } | null
    if (s?.openUkesplan) { setEditor({ kundeId: s.kundeId, planId: s.ukesplanId ?? s.editPlanId }); window.history.replaceState({}, document.title) }
  }, [location.state])

  const last = useCallback(async () => {
    try {
      setFeil(null)
      const [a, an, u] = await Promise.all([
        db.from('anlegg').select('id, kundenr, anleggsnavn, adresse, poststed, kontroll_maaned, kontroll_status, kontroll_type, ansvarlig_tekniker_id, customer:kundenr(navn)').or('skjult.is.null,skjult.eq.false').order('anleggsnavn'),
        db.from('ansatte').select('id, navn').order('navn'),
        db.from('ukesplaner').select('id, uke_nummer, aar, navn, status, kunde_id, kunde:kunde_id(navn), ukesplan_dager(id), ukesplan_teknikere(ansatt:ansatt_id(navn))').order('aar', { ascending: false }).order('uke_nummer', { ascending: false }).limit(60),
      ])
      if (a.error) throw a.error
      if (an.error) throw an.error
      if (u.error) throw u.error
      setAnlegg((a.data ?? []).map(x => ({ ...x, kunde: (x.customer as { navn: string | null } | null)?.navn ?? 'Ukjent kunde' })))
      setAnsatte(an.data ?? [])
      setUkesplaner((u.data ?? []).map(p => ({
        id: p.id, uke_nummer: p.uke_nummer, aar: p.aar, navn: p.navn, status: p.status, kunde_id: p.kunde_id,
        kunde: (p.kunde as { navn: string | null } | null)?.navn ?? 'Ukjent kunde',
        antallAnlegg: (p.ukesplan_dager as { id: string }[] | null)?.length ?? 0,
        teknikere: ((p.ukesplan_teknikere as { ansatt: { navn: string | null } | null }[] | null) ?? []).map(t => t.ansatt?.navn ?? '').filter(Boolean),
      })))
    } catch (err) {
      log.error('Kunne ikke laste kontrollplan', { error: err })
      setFeil(err instanceof Error ? err.message : 'Kunne ikke laste kontrollplan')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { last() }, [last])

  async function slettUkesplan(p: Ukesplan) {
    if (!confirm(`Slette ukesplanen for ${p.kunde}, uke ${p.uke_nummer} ${p.aar}${p.antallAnlegg ? ` (${p.antallAnlegg} anlegg)` : ''}? Dette kan ikke angres.`)) return
    try {
      // Dager og teknikere peker på planen og må bort først
      const d = await db.from('ukesplan_dager').delete().eq('ukesplan_id', p.id)
      if (d.error) throw d.error
      const t = await db.from('ukesplan_teknikere').delete().eq('ukesplan_id', p.id)
      if (t.error) throw t.error
      const u = await db.from('ukesplaner').delete().eq('id', p.id)
      if (u.error) throw u.error
      setUkesplaner(prev => prev.filter(x => x.id !== p.id))
      toast.success('Ukesplanen er slettet')
    } catch (err) {
      log.error('Kunne ikke slette ukesplan', { error: err })
      toast.error('Kunne ikke slette ukesplanen', err)
    }
  }

  useEffect(() => {
    function tast(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey || editor) return
      if (e.key === '/') { e.preventDefault(); sokRef.current?.focus() }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const i = MAANEDER.indexOf(mnd as typeof MAANEDER[number]); setParam('m', MAANEDER[(i + (e.key === 'ArrowLeft' ? 11 : 1)) % 12]) }
    }
    document.addEventListener('keydown', tast); return () => document.removeEventListener('keydown', tast)
  }, [mnd, setParam, editor])

  // Nullstill valg når filtrene endres
  useEffect(() => { setValgte(new Set()) }, [mnd, chip, type, tek, q, gruppering])

  const perMaaned = useMemo(() => MAANEDER.map(m => {
    const liste = anlegg.filter(a => a.kontroll_maaned === m && statusKey(a.kontroll_status, a.kontroll_maaned) !== 'oppsagt')
    return { m, total: liste.length, utfort: liste.filter(a => statusKey(a.kontroll_status, a.kontroll_maaned) === 'utfort').length }
  }), [anlegg])

  const iMnd = useMemo(() => anlegg.filter(a => a.kontroll_maaned === mnd), [anlegg, mnd])
  const teller = useMemo(() => {
    const t: Record<StatusKey, number> = { ikke_utfort: 0, utsatt: 0, planlagt: 0, utfort: 0, oppsagt: 0, ikke_kontrakt: 0 }
    for (const a of iMnd) t[statusKey(a.kontroll_status, a.kontroll_maaned)]++
    return t
  }, [iMnd])
  const aktive = iMnd.length - teller.oppsagt

  const filtrert = useMemo(() => {
    const s = q.trim().toLowerCase()
    return iMnd.filter(a => {
      if (chip !== 'alle' && statusKey(a.kontroll_status, a.kontroll_maaned) !== chip) return false
      if (type && !a.kontroll_type?.includes(type)) return false
      if (tek === 'ingen' ? a.ansvarlig_tekniker_id : tek && a.ansvarlig_tekniker_id !== tek) return false
      if (!s) return true
      return [a.anleggsnavn, a.kunde, a.adresse, a.poststed].some(v => v?.toLowerCase().includes(s))
    })
  }, [iMnd, chip, type, tek, q])

  const grupper = useMemo(() => {
    const navnPaa = (id: string | null) => ansatte.find(x => x.id === id)?.navn ?? 'Ikke tildelt'
    const m = new Map<string, { id: string; tittel: string; ikon?: React.ReactNode; kundeId?: string; anlegg: Anlegg[] }>()
    for (const a of filtrert) {
      const key = gruppering === 'status' ? statusKey(a.kontroll_status) : gruppering === 'kunde' ? a.kundenr ?? 'ukjent' : a.ansvarlig_tekniker_id ?? 'ingen'
      if (!m.has(key)) m.set(key, {
        id: key,
        tittel: gruppering === 'status' ? STATUS[statusKey(a.kontroll_status)].tittel : gruppering === 'kunde' ? a.kunde : navnPaa(a.ansvarlig_tekniker_id),
        ikon: gruppering === 'status' ? STATUS[statusKey(a.kontroll_status)].ikon : gruppering === 'kunde' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />,
        kundeId: gruppering === 'kunde' ? a.kundenr ?? undefined : undefined,
        anlegg: [],
      })
      m.get(key)!.anlegg.push(a)
    }
    const liste = Array.from(m.values())
    if (gruppering === 'status') liste.sort((x, y) => STATUS_REKKEFOLGE.indexOf(x.id as StatusKey) - STATUS_REKKEFOLGE.indexOf(y.id as StatusKey))
    else liste.sort((x, y) => (x.id === 'ingen' ? -1 : y.id === 'ingen' ? 1 : x.tittel.localeCompare(y.tittel, 'nb-NO')))
    return liste
  }, [filtrert, gruppering, ansatte])

  const harFilter = Boolean(q || chip !== 'alle' || type || tek)

  // Ukesplaner: kommende (fra og med denne uken) og eldre
  const { kommende, eldre } = useMemo(() => {
    const naaAar = isoUkeAar(naa), naaUke = isoUke(naa)
    const nokkel = (p: { aar: number; uke_nummer: number }) => p.aar * 100 + p.uke_nummer
    const sortert = [...ukesplaner].sort((x, y) => nokkel(x) - nokkel(y) || x.kunde.localeCompare(y.kunde, 'nb-NO'))
    return { kommende: sortert.filter(p => nokkel(p) >= naaAar * 100 + naaUke), eldre: sortert.filter(p => nokkel(p) < naaAar * 100 + naaUke).reverse() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ukesplaner])

  async function oppdater(ids: string[], patch: { kontroll_status?: string; ansvarlig_tekniker_id?: string | null }) {
    const forrige = anlegg
    setAnlegg(prev => prev.map(a => ids.includes(a.id) ? { ...a, ...patch } : a))
    const { error } = await db.from('anlegg').update(patch).in('id', ids)
    if (error) { setAnlegg(forrige); toast.error('Kunne ikke oppdatere', error); return }
    if (ids.length > 1) { toast.success(`${ids.length} anlegg oppdatert`); setValgte(new Set()) }
  }
  function toggleValgt(id: string) { setValgte(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleGruppeValgt(ids: string[]) {
    setValgte(prev => { const n = new Set(prev); const alle = ids.every(i => n.has(i)); for (const i of ids) alle ? n.delete(i) : n.add(i); return n })
  }
  function toggleGruppe(id: string) { setLukkede(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  if (feil) {
    return <div className="card bg-red-900/20 border-red-800 flex items-start gap-3"><AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" /><div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste kontrollplan</h2><p className="text-sm text-red-300 mb-3">{feil}</p><Button variant="primary" onClick={last}>Prøv igjen</Button></div></div>
  }

  return (
    <div className="space-y-5 pb-20">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Kontrollplan</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{loading ? 'Laster…' : `${naa.getFullYear()} · ${perMaaned.reduce((s, x) => s + x.utfort, 0)} av ${perMaaned.reduce((s, x) => s + x.total, 0)} kontroller utført`}</p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => setEditor({})}><span className="hidden sm:inline">Ny ukesplan</span></Button>
      </header>

      {/* Årsstripe */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5" role="tablist" aria-label="Måned">
        {perMaaned.map(x => {
          const aktiv = x.m === mnd
          const pct = x.total ? Math.round((x.utfort / x.total) * 100) : 0
          return (
            <button key={x.m} type="button" role="tab" aria-selected={aktiv} onClick={() => setParam('m', x.m)}
              className={cn('rounded-lg border px-2 py-2 text-left transition-colors', aktiv ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600', x.m === denneMnd && !aktiv && 'border-dashed')}>
              <div className="flex items-baseline justify-between gap-1">
                <span className={cn('text-xs font-semibold', aktiv ? 'text-primary' : 'text-gray-700 dark:text-gray-300')}>{x.m.slice(0, 3)}</span>
                <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">{x.total ? `${x.utfort}/${x.total}` : '–'}</span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-gray-200 dark:bg-dark-100 overflow-hidden"><div className={cn('h-full rounded-full', pct === 100 ? 'bg-green-500' : 'bg-primary')} style={{ width: `${pct}%` }} /></div>
            </button>
          )
        })}
      </div>

      {/* Ukesplaner */}
      <section className="card !p-4 space-y-3" aria-label="Ukesplaner">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Ukesplaner <span className="text-gray-400 font-normal">· uke {isoUke(naa)} og fremover</span></h2>
          {eldre.length > 0 && <button type="button" onClick={() => setVisEldrePlaner(v => !v)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary">{visEldrePlaner ? 'Skjul tidligere' : `Tidligere (${eldre.length})`}</button>}
        </div>
        {kommende.length === 0 && !visEldrePlaner ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Ingen ukesplaner fremover. Grupper på kunde nedenfor og trykk «Lag ukesplan» på en rammeavtalekunde.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
            {(visEldrePlaner ? [...kommende, ...eldre] : kommende).map(p => <UkesplanKort key={p.id} plan={p} naa={naa} onClick={() => setEditor({ kundeId: p.kunde_id, planId: p.id })} onSlett={() => slettUkesplan(p)} />)}
          </div>
        )}
      </section>

      {/* Måned */}
      <section className="space-y-3" aria-label={mnd}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{mnd} <span className="text-gray-400 font-normal text-base">· {aktive} anlegg</span></h2>
            {aktive > 0 && (
              <div className="mt-2 flex h-2 w-64 max-w-full rounded-full overflow-hidden bg-gray-200 dark:bg-dark-100" title={`${teller.utfort} utført · ${teller.planlagt} planlagt · ${teller.utsatt} utsatt · ${teller.ikke_utfort} ikke utført`}>
                {(['utfort', 'planlagt', 'utsatt'] as StatusKey[]).map(k => teller[k] > 0 && <div key={k} className={STATUS[k].tone} style={{ width: `${(teller[k] / aktive) * 100}%` }} />)}
              </div>
            )}
          </div>
          <Link to={`/anlegg?mnd=${encodeURIComponent(mnd)}`} className="text-sm text-primary hover:underline">Åpne i anleggslisten</Link>
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1" role="group" aria-label="Status">
          <Chip aktiv={chip === 'alle'} onClick={() => setParam('f', null)}>Alle <b>{iMnd.length}</b></Chip>
          {STATUS_REKKEFOLGE.map(k => (k !== 'oppsagt' || teller[k] > 0) && (
            <Chip key={k} aktiv={chip === k} onClick={() => setParam('f', chip === k ? null : k)}><span className={cn('w-2 h-2 rounded-full', STATUS[k].tone)} />{STATUS[k].tittel} <b>{teller[k]}</b></Chip>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <label htmlFor="kp-sok" className="sr-only">Søk</label>
            <input id="kp-sok" ref={sokRef} type="search" value={q} onChange={e => setParam('q', e.target.value)} placeholder="Søk på anlegg, kunde eller adresse…" className="input pl-9 !min-h-[38px] !h-[38px]" />
            <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono px-1.5 border border-gray-300 dark:border-gray-700 rounded text-gray-400">/</kbd>
          </div>
          <select aria-label="Kontrolltype" value={type} onChange={e => setParam('type', e.target.value || null)} className="input !min-h-[38px] !h-[38px] w-auto">
            <option value="">Alle kontrolltyper</option>
            {KONTROLLTYPER.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select aria-label="Tekniker" value={tek} onChange={e => setParam('tek', e.target.value || null)} className="input !min-h-[38px] !h-[38px] w-auto">
            <option value="">Alle teknikere</option>
            {meg && <option value={meg.id}>Mine anlegg</option>}
            <option value="ingen">Ikke tildelt</option>
            {ansatte.filter(a => a.id !== meg?.id).map(a => <option key={a.id} value={a.id}>{a.navn}</option>)}
          </select>
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden h-[38px]" role="group" aria-label="Grupper etter">
            {([['status', 'Status'], ['kunde', 'Kunde'], ['tekniker', 'Tekniker']] as [Gruppering, string][]).map(([g, navn]) => (
              <button key={g} type="button" aria-pressed={gruppering === g} onClick={() => setParam('g', g === 'status' ? null : g)} className={cn('px-3 text-sm', gruppering === g ? 'bg-primary text-white font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100')}>{navn}</button>
            ))}
          </div>
          {harFilter && <button type="button" onClick={() => setParams(new URLSearchParams({ m: mnd }), { replace: true })} className="text-sm text-primary hover:underline inline-flex items-center gap-1"><X className="w-3.5 h-3.5" />Nullstill</button>}
        </div>

        {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        : filtrert.length === 0 ? <div className="card text-center py-12 text-sm text-gray-500 dark:text-gray-400">{harFilter ? 'Ingen anlegg matcher filtrene.' : `Ingen anlegg har kontrollmåned ${mnd}.`}</div>
        : grupper.map(g => {
          const ids = g.anlegg.map(a => a.id)
          const alleValgt = ids.every(i => valgte.has(i))
          const apen = !lukkede.has(g.id)
          return (
            <div key={g.id} className="card !p-0 overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-dark-100">
                <input type="checkbox" checked={alleValgt} onChange={() => toggleGruppeValgt(ids)} aria-label={`Velg alle i ${g.tittel}`} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                <button type="button" onClick={() => toggleGruppe(g.id)} aria-expanded={apen} className="flex-1 flex items-center gap-2 text-left min-w-0">
                  <span className={cn('w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0', gruppering === 'status' ? STATUS[g.id as StatusKey].pill : 'bg-primary/10 text-primary')}>{g.ikon}</span>
                  <span className="font-semibold text-gray-900 dark:text-white truncate">{g.tittel}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">{g.anlegg.length}</span>
                  <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', apen && 'rotate-90')} />
                </button>
                {g.kundeId && <Button variant="outline" icon={<CalendarDays />} onClick={() => setEditor({ kundeId: g.kundeId })}><span className="hidden sm:inline">Lag ukesplan</span></Button>}
              </div>
              {apen && (
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {g.anlegg.map(a => (
                    <div key={a.id} className={cn('flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-dark-100/60', valgte.has(a.id) && 'bg-primary/5')}>
                      <input type="checkbox" checked={valgte.has(a.id)} onChange={() => toggleValgt(a.id)} aria-label={`Velg ${a.anleggsnavn}`} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                      <Link to={`/anlegg/${a.id}`} className="flex-1 min-w-0 group">
                        <span className="block font-medium text-gray-900 dark:text-white truncate group-hover:text-primary">{a.anleggsnavn}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{[gruppering !== 'kunde' ? a.kunde : null, [a.adresse, a.poststed].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</span>
                      </Link>
                      <div className="hidden md:flex flex-wrap gap-1 max-w-[220px] justify-end">{(a.kontroll_type ?? []).map(t => <span key={t} className="px-1.5 py-px rounded text-[11px] bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-400">{t}</span>)}</div>
                      <select aria-label="Tekniker" value={a.ansvarlig_tekniker_id ?? ''} onChange={e => oppdater([a.id], { ansvarlig_tekniker_id: e.target.value || null })} className={cn('input !min-h-[32px] !h-[32px] !py-0 text-xs w-[120px] sm:w-[150px]', !a.ansvarlig_tekniker_id && 'text-gray-400')}>
                        <option value="">Ikke tildelt</option>
                        {ansatte.map(x => <option key={x.id} value={x.id}>{x.navn}</option>)}
                      </select>
                      <StatusVelger verdi={a.kontroll_status} onChange={v => oppdater([a.id], { kontroll_status: v })} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* Massehandling */}
      {valgte.size > 0 && (
        <div className="fixed bottom-4 left-4 right-4 lg:left-[calc(var(--sidebar-w)+2rem)] z-20 flex justify-center pointer-events-none">
          <div className="pointer-events-auto card !py-2 !px-3 shadow-lg flex flex-wrap items-center gap-2 border-primary/40">
            <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums px-1">{valgte.size} valgt</span>
            <select aria-label="Sett tekniker" defaultValue="" onChange={e => { if (e.target.value) { oppdater(Array.from(valgte), { ansvarlig_tekniker_id: e.target.value === 'ingen' ? null : e.target.value }); e.target.value = '' } }} className="input !min-h-[34px] !h-[34px] !py-0 text-sm w-auto">
              <option value="" disabled>Sett tekniker…</option>
              <option value="ingen">Ikke tildelt</option>
              {ansatte.map(x => <option key={x.id} value={x.id}>{x.navn}</option>)}
            </select>
            <select aria-label="Sett status" defaultValue="" onChange={e => { if (e.target.value) { oppdater(Array.from(valgte), { kontroll_status: e.target.value }); e.target.value = '' } }} className="input !min-h-[34px] !h-[34px] !py-0 text-sm w-auto">
              <option value="" disabled>Sett status…</option>
              {STATUS_REKKEFOLGE.map(k => <option key={k} value={STATUS[k].verdi}>{STATUS[k].tittel}</option>)}
            </select>
            <Button variant="ghost" icon={<X />} onClick={() => setValgte(new Set())}>Avbryt</Button>
          </div>
        </div>
      )}

      {editor && <UkesplanEditor kundeId={editor.kundeId} editPlanId={editor.planId} onClose={() => setEditor(null)} onSave={() => { setEditor(null); last() }} />}
    </div>
  )
}

function StatusVelger({ verdi, onChange }: { verdi: string | null; onChange: (v: string) => void }) {
  const k = statusKey(verdi)
  return (
    <select aria-label="Status" value={STATUS[k].verdi} onChange={e => onChange(e.target.value)} className={cn('h-[32px] pl-2.5 pr-7 rounded-full border text-xs font-semibold appearance-none cursor-pointer bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px] w-[112px]', STATUS[k].pill)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")" }}>
      {STATUS_REKKEFOLGE.map(x => <option key={x} value={STATUS[x].verdi} className="bg-white text-gray-900 dark:bg-dark-50 dark:text-white">{STATUS[x].tittel}</option>)}
    </select>
  )
}

function UkesplanKort({ plan, naa, onClick, onSlett }: { plan: Ukesplan; naa: Date; onClick: () => void; onSlett: () => void }) {
  const erDenneUken = plan.aar === isoUkeAar(naa) && plan.uke_nummer === isoUke(naa)
  const d = ukeDatoer(plan.aar, plan.uke_nummer)
  const periode = `${d[0].getDate()}.–${d[4].getDate()}. ${d[4].toLocaleDateString('nb-NO', { month: 'short' }).replace('.', '')}`
  return (
    <div className={cn('relative group flex-shrink-0 w-[220px] rounded-lg border transition-colors hover:border-primary/60', erDenneUken ? 'border-primary/60 bg-primary/5' : 'border-gray-200 dark:border-gray-800')}>
      <button type="button" onClick={onClick} className="w-full text-left p-3">
        <div className="flex items-center justify-between gap-2 pr-6">
          <span className={cn('text-xs font-semibold', erDenneUken ? 'text-primary' : 'text-gray-500 dark:text-gray-400')}>Uke {plan.uke_nummer}{plan.aar !== naa.getFullYear() ? ` · ${plan.aar}` : ''}</span>
          <span className="text-[11px] text-gray-400 tabular-nums">{periode}</span>
        </div>
        <div className="mt-1 font-semibold text-gray-900 dark:text-white truncate">{plan.kunde}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{[plan.navn, `${plan.antallAnlegg} anlegg`].filter(Boolean).join(' · ')}</div>
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate"><Users className="w-3.5 h-3.5 flex-shrink-0" />{plan.teknikere.length ? plan.teknikere.map(n => n.split(' ')[0]).join(', ') : 'Ingen teknikere'}</div>
      </button>
      <button type="button" onClick={onSlett} aria-label="Slett ukesplan" title="Slett ukesplan" className="absolute top-2 right-2 w-7 h-7 rounded-md inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={aktiv} className={cn('inline-flex items-center gap-2 h-[34px] px-3 rounded-full border text-sm whitespace-nowrap flex-shrink-0 transition-colors [&>b]:font-bold [&>b]:tabular-nums', aktiv ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500')}>{children}</button>
}
