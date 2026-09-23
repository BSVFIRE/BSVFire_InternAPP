/**
 * Anleggslisten (/anlegg)
 *
 * Tallene er filtre: status-chips viser antall og filtrerer. Planleggingsfiltre
 * (måned, type, mine anlegg) og søk ligger i URL-en så lister kan deles.
 * 25 rader om gangen; raden er klikkbar, Rediger/··· ved hover.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle, AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Calendar, Edit, Loader2,
  MoreHorizontal, PauseCircle, Plus, Search, Trash2, Upload, X,
} from 'lucide-react'
import { AnleggStatusDialog } from './AnleggStatusDialog'
import { StatusBadge } from '@/lib/status'
import { powersyncAktiv } from '@/lib/powersync/db'
import { hentAnleggLokalt } from '@/lib/powersync/anlegg'
import { db, type Tables } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { IKKE_KONTRAKT, IKKE_KONTRAKT_TEKST, erIkkeKontrakt, ANLEGG_STATUSER, KONTROLLTYPER, MAANEDER, MAANED_ORDER } from '@/lib/constants'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import { AnleggImport } from '@/components/AnleggImport'
import { NyttAnleggDialog } from './NyttAnleggDialog'

const log = createLogger('AnleggListe')
const SIDE = 25

type Rad = Pick<Tables<'anlegg'>,
  'id' | 'anleggsnavn' | 'adresse' | 'postnummer' | 'poststed' | 'kontroll_maaned' | 'kontroll_status' | 'kontroll_type' | 'skjult' | 'status'
  | 'ansvarlig_tekniker_id' | 'kundenr' | 'unik_kode'
  | 'brannalarm_fullfort' | 'nodlys_fullfort' | 'slukkeutstyr_fullfort' | 'roykluker_fullfort' | 'forstehjelp_fullfort' | 'ekstern_fullfort'
> & {
  customer: { navn: string | null; kunde_nummer: string | null; status: string | null } | null
  ansvarlig_tekniker: { navn: string | null } | null
  avvik: number
}

type Chip = 'alle' | 'ikke_utfort' | 'planlagt' | 'utfort' | 'avvik' | 'denne_mnd'
type SortKey = 'navn' | 'kunde' | 'sted' | 'maaned' | 'status' | 'ansvarlig'

const FULLFORT_KEY: Record<string, keyof Rad> = {
  Brannalarm: 'brannalarm_fullfort', Nødlys: 'nodlys_fullfort', Slukkeutstyr: 'slukkeutstyr_fullfort',
  Røykluker: 'roykluker_fullfort', Førstehjelp: 'forstehjelp_fullfort', Ekstern: 'ekstern_fullfort',
}
const KORT: Record<string, string> = { Brannalarm: 'BA', Nødlys: 'NL', Slukkeutstyr: 'SU', Røykluker: 'RL', Førstehjelp: 'FH', Ekstern: 'EK' }

function typeTone(a: Rad, type: string): 'g' | 'y' | 'r' {
  if (a[FULLFORT_KEY[type]]) return 'g'
  if (a.kontroll_status === ANLEGG_STATUSER.PLANLAGT || a.kontroll_status === ANLEGG_STATUSER.UTSATT) return 'y'
  return 'r'
}
/** 'n' = ikke kontraktskunde: ingen avtalt kontroll, skal ikke telles som ikke utført */
function statusTone(s: string | null, kontrollMaaned?: string | null): 'g' | 'y' | 'r' | 'm' | 'n' {
  if (erIkkeKontrakt(kontrollMaaned) && s !== ANLEGG_STATUSER.UTFORT) return 'n'
  if (s === ANLEGG_STATUSER.UTFORT) return 'g'
  if (s === ANLEGG_STATUSER.PLANLAGT || s === ANLEGG_STATUSER.UTSATT) return 'y'
  if (s === ANLEGG_STATUSER.OPPSAGT) return 'm'
  return 'r'
}
const DOT = { g: 'bg-green-500', y: 'bg-yellow-500', r: 'bg-red-500', m: 'bg-gray-400', n: 'bg-blue-400' }
const PILL = {
  g: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  y: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  r: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  m: 'bg-gray-100 text-gray-700 dark:bg-dark-100 dark:text-gray-400',
  n: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
}
function initialer(navn: string | null | undefined) {
  return (navn ?? '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 3).toUpperCase()
}

export default function AnleggListe() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const { ansatt } = useCurrentAnsatt()

  const [rader, setRader] = useState<Rad[]>([])
  const [loading, setLoading] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)
  const [visAntall, setVisAntall] = useState(SIDE)
  const [visImport, setVisImport] = useState(false)
  const [statusFor, setStatusFor] = useState<Rad | null>(null)
  const [kunderForImport, setKunderForImport] = useState<{ id: string; navn: string; kunde_nummer: string | null; organisasjonsnummer: string | null }[] | null>(null)
  const [nyttAnlegg, setNyttAnlegg] = useState<{ kundeId: string | null } | null>(null)
  const sokRef = useRef<HTMLInputElement>(null)

  // URL-tilstand
  const q = params.get('q') ?? ''
  const chip = (params.get('f') as Chip) || 'alle'
  const mnd = params.get('mnd') ?? ''
  const type = params.get('type') ?? ''
  const mine = params.get('mine') === '1'
  const skjulte = params.get('skjulte') === '1'
  const sort = (params.get('sort') as SortKey) || 'navn'
  const dir = params.get('dir') === 'desc' ? 'desc' : 'asc'
  const setParam = useCallback((key: string, value: string | null) => {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value); else p.delete(key)
    setParams(p, { replace: true })
    setVisAntall(SIDE)
  }, [params, setParams])

  // Innkommende navigasjon fra andre sider (gamle mønstre) → nye ruter
  useEffect(() => {
    const s = location.state as { viewAnleggId?: string; editAnleggId?: string; createForKundeId?: string } | null
    const view = params.get('view')
    if (view) { navigate(`/anlegg/${view}`, { replace: true }); return }
    if (s?.viewAnleggId) { navigate(`/anlegg/${s.viewAnleggId}`, { replace: true }); return }
    if (s?.editAnleggId) { navigate(`/anlegg/${s.editAnleggId}/rediger`, { replace: true }); return }
    if (s?.createForKundeId) { setNyttAnlegg({ kundeId: s.createForKundeId }); window.history.replaceState({}, document.title) }
  }, [location.state, params, navigate])

  const last = useCallback(async () => {
    try {
      setFeil(null)
      const [res, avvikRes] = await Promise.all([
        db.from('anlegg')
          .select('id, anleggsnavn, adresse, postnummer, poststed, kontroll_maaned, kontroll_status, kontroll_type, skjult, status, ansvarlig_tekniker_id, kundenr, unik_kode, brannalarm_fullfort, nodlys_fullfort, slukkeutstyr_fullfort, roykluker_fullfort, forstehjelp_fullfort, ekstern_fullfort, customer:kundenr(navn, kunde_nummer, status), ansvarlig_tekniker:ansatte!anlegg_ansvarlig_tekniker_id_fkey(navn)')
          .order('anleggsnavn'),
        db.rpc('avvik_per_anlegg'),
      ])
      if (res.error) throw res.error
      const avvik = new Map((avvikRes.data ?? []).map(r => [r.anlegg_id, Number(r.antall)]))
      if (avvikRes.error) log.warn('avvik_per_anlegg feilet – kjør migrasjonen', { error: avvikRes.error })
      setRader((res.data ?? []).map(a => ({ ...a, avvik: avvik.get(a.id) ?? 0 })) as Rad[])
    } catch (err) {
      // Uten dekning: les det som allerede er synkronisert til enheten
      if (powersyncAktiv) {
        try {
          const lokale = await hentAnleggLokalt()
          setRader(lokale.map(a => ({ ...a, avvik: 0 })) as unknown as Rad[])
          setFeil(null)
          return
        } catch (lokalFeil) {
          log.warn('Kunne ikke lese anlegg lokalt', { error: lokalFeil })
        }
      }
      log.error('Kunne ikke laste anlegg', { error: err })
      setFeil(err instanceof Error ? err.message : 'Kunne ikke laste anlegg')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { last() }, [last])

  // «/» fokuserer søk
  useEffect(() => {
    function tast(e: KeyboardEvent) {
      if (e.key !== '/' || (e.target as HTMLElement).closest('input, textarea, select')) return
      e.preventDefault(); sokRef.current?.focus()
    }
    document.addEventListener('keydown', tast)
    return () => document.removeEventListener('keydown', tast)
  }, [])

  const denneMnd = MAANEDER[new Date().getMonth()]

  // Grunnlag for chips: alt utenom skjulte (med mindre «Vis skjulte»)
  const grunnlag = useMemo(() => rader.filter(a => skjulte || !a.skjult), [rader, skjulte])
  const teller = useMemo(() => ({
    alle: grunnlag.length,
    ikke_utfort: grunnlag.filter(a => statusTone(a.kontroll_status, a.kontroll_maaned) === 'r').length,
    planlagt: grunnlag.filter(a => statusTone(a.kontroll_status, a.kontroll_maaned) === 'y').length,
    utfort: grunnlag.filter(a => a.kontroll_status === ANLEGG_STATUSER.UTFORT).length,
    avvik: grunnlag.filter(a => a.avvik > 0).length,
    denne_mnd: grunnlag.filter(a => a.kontroll_maaned === denneMnd).length,
  }), [grunnlag, denneMnd])

  const filtrert = useMemo(() => {
    const s = q.trim().toLowerCase()
    let liste = grunnlag.filter(a => {
      if (chip === 'ikke_utfort' && statusTone(a.kontroll_status, a.kontroll_maaned) !== 'r') return false
      if (chip === 'planlagt' && statusTone(a.kontroll_status, a.kontroll_maaned) !== 'y') return false
      if (chip === 'utfort' && a.kontroll_status !== ANLEGG_STATUSER.UTFORT) return false
      if (chip === 'avvik' && a.avvik === 0) return false
      if (chip === 'denne_mnd' && a.kontroll_maaned !== denneMnd) return false
      if (mnd && a.kontroll_maaned !== mnd) return false
      if (type && !a.kontroll_type?.includes(type)) return false
      if (mine && a.ansvarlig_tekniker_id !== ansatt?.id) return false
      if (!s) return true
      return [a.anleggsnavn, a.adresse, a.poststed, a.customer?.navn, a.customer?.kunde_nummer, a.unik_kode]
        .some(v => v?.toLowerCase().includes(s))
    })
    const cmp = (x: string | null | undefined, y: string | null | undefined) => (x ?? '').localeCompare(y ?? '', 'nb-NO')
    liste = [...liste].sort((a, b) => {
      let r = 0
      switch (sort) {
        case 'navn': r = cmp(a.anleggsnavn, b.anleggsnavn); break
        case 'kunde': r = cmp(a.customer?.navn, b.customer?.navn); break
        case 'sted': r = cmp(a.poststed, b.poststed); break
        case 'maaned': r = (MAANED_ORDER[a.kontroll_maaned ?? 'NA'] ?? 99) - (MAANED_ORDER[b.kontroll_maaned ?? 'NA'] ?? 99); break
        case 'status': r = cmp(a.kontroll_status, b.kontroll_status); break
        case 'ansvarlig': r = cmp(a.ansvarlig_tekniker?.navn, b.ansvarlig_tekniker?.navn); break
      }
      return dir === 'desc' ? -r : r
    })
    return liste
  }, [grunnlag, q, chip, mnd, type, mine, ansatt?.id, sort, dir, denneMnd])

  const synlig = filtrert.slice(0, visAntall)

  // Laster flere rader automatisk når bunnen av listen kommer til syne
  const merRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = merRef.current
    if (!el || filtrert.length <= visAntall) return
    const obs = new IntersectionObserver(([x]) => { if (x.isIntersecting) setVisAntall(n => n + SIDE) }, { rootMargin: '400px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [filtrert.length, visAntall])
  const harFilter = Boolean(q || chip !== 'alle' || mnd || type || mine || skjulte)
  const antallKunder = useMemo(() => new Set(rader.map(a => a.kundenr).filter(Boolean)).size, [rader])

  function sorterPa(key: SortKey) {
    if (sort === key) setParam('dir', dir === 'asc' ? 'desc' : 'asc')
    else { const p = new URLSearchParams(params); p.set('sort', key); p.delete('dir'); setParams(p, { replace: true }) }
  }

  async function apneImport() {
    if (!kunderForImport) {
      const { data } = await db.from('customer').select('id, navn, kunde_nummer, organisasjonsnummer').or('skjult.is.null,skjult.eq.false').order('navn')
      setKunderForImport((data ?? []).map(k => ({ ...k, navn: k.navn ?? '' })))
    }
    setVisImport(true)
  }

  async function slett(a: Rad) {
    if (!confirm(`Slette «${a.anleggsnavn}»? Kontrolldata, notater og dokumentkoblinger slettes. Dette kan ikke angres.`)) return
    const { error } = await db.from('anlegg').delete().eq('id', a.id)
    if (error) { toast.error(error.code === '23503' ? 'Kan ikke slette: anlegget har tilknyttede data' : 'Kunne ikke slette', error); return }
    toast.success(`«${a.anleggsnavn}» slettet`)
    last()
  }

  if (feil) {
    return (
      <div className="card bg-red-900/20 border-red-800 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste anlegg</h2><p className="text-sm text-red-300 mb-3">{feil}</p><Button variant="primary" onClick={last}>Prøv igjen</Button></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Anlegg</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{loading ? 'Laster…' : `${rader.length} anlegg hos ${antallKunder} kunder`}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Upload />} onClick={apneImport}><span className="hidden sm:inline">Importer</span></Button>
          <Button variant="primary" icon={<Plus />} onClick={() => setNyttAnlegg({ kundeId: null })}><span className="hidden sm:inline">Nytt anlegg</span></Button>
        </div>
      </header>

      {/* Søk + filtre */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <label htmlFor="anlegg-sok" className="sr-only">Søk</label>
          <input id="anlegg-sok" ref={sokRef} type="search" value={q} onChange={e => setParam('q', e.target.value)} placeholder="Søk på anlegg, kunde, adresse, kundenr. eller QR-kode…" className="input pl-9 !min-h-[38px] !h-[38px]" />
          <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono px-1.5 border border-gray-300 dark:border-gray-700 rounded text-gray-400">/</kbd>
        </div>
        <label className="sr-only" htmlFor="f-mnd">Kontrollmåned</label>
        <select id="f-mnd" value={mnd} onChange={e => setParam('mnd', e.target.value)} className="input !w-auto !min-h-[38px] !h-[38px] !py-0">
          <option value="">Alle måneder</option>{MAANEDER.map(m => <option key={m} value={m}>{m}</option>)}<option value={IKKE_KONTRAKT}>{IKKE_KONTRAKT_TEKST}</option>
        </select>
        <label className="sr-only" htmlFor="f-type">Kontrolltype</label>
        <select id="f-type" value={type} onChange={e => setParam('type', e.target.value)} className="input !w-auto !min-h-[38px] !h-[38px] !py-0">
          <option value="">Alle typer</option>{KONTROLLTYPER.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <Toggle checked={mine} onChange={v => setParam('mine', v ? '1' : null)}>Mine anlegg</Toggle>
        <Toggle checked={skjulte} onChange={v => setParam('skjulte', v ? '1' : null)}>Vis pausede og deaktiverte</Toggle>
      </div>

      {/* Tallene er filtre */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1" role="group" aria-label="Status">
        <ChipKnapp aktiv={chip === 'alle'} onClick={() => setParam('f', null)}>Alle <b>{teller.alle}</b></ChipKnapp>
        <ChipKnapp aktiv={chip === 'ikke_utfort'} dot="r" onClick={() => setParam('f', 'ikke_utfort')}>Ikke utført <b>{teller.ikke_utfort}</b></ChipKnapp>
        <ChipKnapp aktiv={chip === 'planlagt'} dot="y" onClick={() => setParam('f', 'planlagt')}>Planlagt <b>{teller.planlagt}</b></ChipKnapp>
        <ChipKnapp aktiv={chip === 'utfort'} dot="g" onClick={() => setParam('f', 'utfort')}>Utført <b>{teller.utfort}</b></ChipKnapp>
        <span className="hidden sm:inline self-center text-gray-300 dark:text-gray-700">|</span>
        <ChipKnapp aktiv={chip === 'avvik'} ikon={<AlertTriangle className="w-3.5 h-3.5 text-red-500" />} onClick={() => setParam('f', 'avvik')}>Med avvik <b>{teller.avvik}</b></ChipKnapp>
        <ChipKnapp aktiv={chip === 'denne_mnd'} ikon={<Calendar className="w-3.5 h-3.5" />} onClick={() => setParam('f', 'denne_mnd')}>Denne måneden <b>{teller.denne_mnd}</b></ChipKnapp>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{loading ? '' : <>Viser <b className="text-gray-900 dark:text-white tabular-nums">{Math.min(visAntall, filtrert.length)}</b> av {filtrert.length}{harFilter && filtrert.length !== grunnlag.length ? ` (${grunnlag.length} totalt)` : ''}</>}</span>
        {harFilter && <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })} className="text-primary hover:underline inline-flex items-center gap-1"><X className="w-3.5 h-3.5" />Nullstill filtre</button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
      ) : filtrert.length === 0 ? (
        <div className="card text-center py-12 text-sm text-gray-500 dark:text-gray-400">{harFilter ? 'Ingen anlegg matcher filtrene.' : 'Ingen anlegg registrert ennå.'}</div>
      ) : (
        <>
          {/* Desktop-tabell */}
          <div className="hidden lg:block card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-dark-100 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <Th k="navn" sort={sort} dir={dir} onClick={sorterPa}>Anlegg</Th>
                  <Th k="kunde" sort={sort} dir={dir} onClick={sorterPa}>Kunde</Th>
                  <Th k="sted" sort={sort} dir={dir} onClick={sorterPa}>Sted</Th>
                  <th className="px-3.5 py-2.5 text-left font-semibold">Kontrolltyper</th>
                  <Th k="maaned" sort={sort} dir={dir} onClick={sorterPa}>Måned</Th>
                  <Th k="ansvarlig" sort={sort} dir={dir} onClick={sorterPa}>Ansvarlig</Th>
                  <Th k="status" sort={sort} dir={dir} onClick={sorterPa}>Status</Th>
                  <th className="w-px"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {synlig.map(a => (
                  <tr key={a.id} onClick={() => navigate(`/anlegg/${a.id}`)} className={cn('group cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors', a.skjult && 'opacity-50')}>
                    <td className="px-3.5 py-2.5"><div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">{a.anleggsnavn}<StatusBadge status={a.status} /></div><div className="text-xs text-gray-500 dark:text-gray-400">{a.adresse}</div></td>
                    <td className="px-3.5 py-2.5 text-gray-700 dark:text-gray-300">{a.customer?.navn ?? <span className="text-gray-400">–</span>}</td>
                    <td className="px-3.5 py-2.5 text-gray-700 dark:text-gray-300">{a.poststed ?? ''}</td>
                    <td className="px-3.5 py-2.5"><TypeChips a={a} /></td>
                    <td className="px-3.5 py-2.5 text-gray-700 dark:text-gray-300">{a.kontroll_maaned ?? <span className="text-gray-400">–</span>}</td>
                    <td className="px-3.5 py-2.5 text-gray-700 dark:text-gray-300" title={a.ansvarlig_tekniker?.navn ?? undefined}>{a.ansvarlig_tekniker?.navn ? initialer(a.ansvarlig_tekniker.navn) : <span className="text-gray-400">–</span>}</td>
                    <td className="px-3.5 py-2.5"><StatusCelle a={a} /></td>
                    <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                        <IconButton variant="ghost" label="Rediger" icon={<Edit />} onClick={() => navigate(`/anlegg/${a.id}/rediger`)} className="w-8 h-8" />
                        <RadMeny onStatus={() => setStatusFor(a)} onSlett={() => slett(a)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobil-kort */}
          <div className="lg:hidden space-y-2">
            {synlig.map(a => {
              const t = statusTone(a.kontroll_status, a.kontroll_maaned)
              return (
                <button key={a.id} type="button" onClick={() => navigate(`/anlegg/${a.id}`)} className={cn('card !p-3 w-full flex gap-3 items-center text-left', a.skjult && 'opacity-50')}>
                  <span className={cn('w-1 self-stretch rounded-full', DOT[t])} />
                  <span className="flex-1 min-w-0 space-y-1">
                    <span className="flex items-center gap-2 min-w-0"><span className="font-semibold text-gray-900 dark:text-white truncate">{a.anleggsnavn}</span><StatusBadge status={a.status} /></span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{[a.customer?.navn, a.poststed].filter(Boolean).join(' · ')}</span>
                    <TypeChips a={a} kort />
                  </span>
                  <span className="flex flex-col items-end gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', PILL[t])}>{t === 'n' ? IKKE_KONTRAKT_TEKST : a.kontroll_status ?? 'Ikke utført'}</span>
                    {a.avvik > 0 ? <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold"><AlertTriangle className="w-3 h-3" />{a.avvik} avvik</span> : <span>{[a.kontroll_maaned?.slice(0, 3), initialer(a.ansvarlig_tekniker?.navn)].filter(Boolean).join(' · ')}</span>}
                  </span>
                </button>
              )
            })}
          </div>

          {filtrert.length > visAntall && (
            <div ref={merRef} className="py-3 text-center">
              <button type="button" onClick={() => setVisAntall(n => n + SIDE)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary inline-flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Laster flere … ({visAntall} av {filtrert.length})
              </button>
            </div>
          )}
          {filtrert.length > SIDE && filtrert.length <= visAntall && (
            <p className="py-3 text-center text-sm text-gray-400 dark:text-gray-500">Alle {filtrert.length} anlegg vist</p>
          )}
        </>
      )}

      {visImport && kunderForImport && <AnleggImport kunder={kunderForImport} onClose={() => setVisImport(false)} onImportComplete={last} />}
      {nyttAnlegg && <NyttAnleggDialog kundeId={nyttAnlegg.kundeId} onClose={() => setNyttAnlegg(null)} />}
      {statusFor && <AnleggStatusDialog anleggId={statusFor.id} anleggsnavn={statusFor.anleggsnavn ?? ''} status={statusFor.status} kundeStatus={statusFor.customer?.status} onClose={() => setStatusFor(null)} onEndret={() => { setStatusFor(null); last() }} />}
    </div>
  )
}

// ---------- Små deler ----------

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className={cn('inline-flex items-center gap-2 h-[38px] px-3 rounded-lg border text-sm cursor-pointer select-none', checked ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300')}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-3.5 h-3.5 rounded text-primary focus:ring-primary" />{children}
    </label>
  )
}

function ChipKnapp({ aktiv, dot, ikon, onClick, children }: { aktiv: boolean; dot?: 'g' | 'y' | 'r'; ikon?: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={aktiv}
      className={cn('inline-flex items-center gap-2 h-[34px] px-3 rounded-full border text-sm whitespace-nowrap flex-shrink-0 transition-colors [&>b]:font-bold [&>b]:tabular-nums',
        aktiv ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500')}>
      {dot && <span className={cn('w-2 h-2 rounded-full', DOT[dot])} />}{ikon}{children}
    </button>
  )
}

function Th({ k, sort, dir, onClick, children }: { k: SortKey; sort: SortKey; dir: 'asc' | 'desc'; onClick: (k: SortKey) => void; children: React.ReactNode }) {
  const aktiv = sort === k
  return (
    <th className="px-3.5 py-2.5 text-left font-semibold">
      <button type="button" onClick={() => onClick(k)} className={cn('inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white', aktiv && 'text-gray-900 dark:text-white')}>
        {children}{aktiv ? (dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </button>
    </th>
  )
}

function TypeChips({ a, kort }: { a: Rad; kort?: boolean }) {
  const typer = (a.kontroll_type ?? []).filter(t => t in FULLFORT_KEY)
  if (typer.length === 0) return <span className="text-xs text-gray-400">–</span>
  return (
    <span className="flex flex-wrap gap-1">
      {typer.map(t => (
        <span key={t} title={t} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-dark-100 text-gray-800 dark:text-gray-200">
          <span className={cn('w-1.5 h-1.5 rounded-full', DOT[typeTone(a, t)])} />{kort ? KORT[t] : t}
        </span>
      ))}
    </span>
  )
}

function StatusCelle({ a }: { a: Rad }) {
  const t = statusTone(a.kontroll_status, a.kontroll_maaned)
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', PILL[t])}>{t === 'n' ? IKKE_KONTRAKT_TEKST : a.kontroll_status ?? 'Ikke utført'}</span>
      {a.avvik > 0 && <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400" title={`${a.avvik} avvik`}><AlertTriangle className="w-3 h-3" />{a.avvik}</span>}
    </span>
  )
}

function RadMeny({ onStatus, onSlett }: { onStatus: () => void; onSlett: () => void }) {
  return (
    <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
      <MenuItem icon={<PauseCircle />} onSelect={onStatus}>Endre status…</MenuItem>
      <MenuSeparator />
      <MenuItem icon={<Trash2 />} danger onSelect={onSlett}>Slett anlegg</MenuItem>
    </DropdownMenu>
  )
}
