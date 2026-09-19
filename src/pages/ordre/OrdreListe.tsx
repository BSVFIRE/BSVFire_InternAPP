/**
 * Ordrelisten (/ordre) – samme oppsett som de andre listene.
 * Mine/Alle, statuschips som teller, søk (/), 25 om gangen. Fullførte og fakturerte vises bare via chip.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Building2, Edit, FileText, MoreHorizontal, Plus, Search, Trash2, X } from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn, formatDate, getDaysAgo } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { ORDRE_STATUSER, ORDRE_STATUS_COLORS } from '@/lib/constants'
import { initialer } from '@/lib/personer'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { NyOrdreDialog } from './NyOrdreDialog'

const log = createLogger('OrdreListe')
const SIDE = 25
const MINE_KEY = 'ordre_mine'

type Rad = Pick<Tables<'ordre'>, 'id' | 'ordre_nummer' | 'type' | 'status' | 'kundenr' | 'anlegg_id' | 'tekniker_id' | 'kontrolltype' | 'kommentar' | 'opprettet_dato' | 'sist_oppdatert' | 'sett_av_tekniker' | 'planlagt_start'> & {
  anlegg: { anleggsnavn: string | null } | null
  customer: { navn: string | null } | null
  tekniker: { navn: string | null } | null
  harRapport: boolean
}
type Chip = 'aktive' | 'nye' | 'ventende' | 'pagaende' | 'fullforte' | 'fakturerte'
type SortKey = 'nummer' | 'kunde' | 'tekniker' | 'status' | 'alder'

const AKTIV = new Set<string | null>([ORDRE_STATUSER.NY, ORDRE_STATUSER.VENTENDE, ORDRE_STATUSER.PAGAENDE])

export default function OrdreListe() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const { ansatt: meg } = useCurrentAnsatt()
  const [rader, setRader] = useState<Rad[]>([])
  const [loading, setLoading] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)
  const [visAntall, setVisAntall] = useState(SIDE)
  const [ny, setNy] = useState<{ anleggId?: string } | null>(null)
  const [mine, setMine] = useState(() => { try { return localStorage.getItem(MINE_KEY) !== '0' } catch { return true } })
  const sokRef = useRef<HTMLInputElement>(null)

  const q = params.get('q') ?? ''
  const chip = (params.get('f') as Chip) || 'aktive'
  const tek = params.get('tek') ?? ''
  const anleggFilter = params.get('anlegg') ?? ''
  const sort = (params.get('sort') as SortKey) || 'nummer'
  const dir = params.get('dir') === 'desc' || (!params.get('dir') && sort === 'nummer') ? 'desc' : 'asc'
  const setParam = useCallback((key: string, value: string | null) => {
    const p = new URLSearchParams(params); if (value) p.set(key, value); else p.delete(key)
    setParams(p, { replace: true }); setVisAntall(SIDE)
  }, [params, setParams])

  // Gamle innganger: state.selectedOrdreId → detaljside, state.anleggId/kundeId → ny ordre
  useEffect(() => {
    const s = location.state as { selectedOrdreId?: string; anleggId?: string; kundeId?: string } | null
    if (!s) return
    window.history.replaceState({}, document.title)
    if (s.selectedOrdreId) navigate(`/ordre/${s.selectedOrdreId}`, { replace: true })
    else if (s.anleggId || s.kundeId) setNy({ anleggId: s.anleggId })
  }, [location.state, navigate])

  const last = useCallback(async () => {
    try {
      setFeil(null)
      const [o, r] = await Promise.all([
        db.from('ordre').select('id, ordre_nummer, type, status, kundenr, anlegg_id, tekniker_id, kontrolltype, kommentar, opprettet_dato, sist_oppdatert, sett_av_tekniker, planlagt_start, anlegg:anlegg_id(anleggsnavn), customer:kundenr(navn), tekniker:ansatte!ordre_tekniker_id_fkey(navn)').order('ordre_nummer', { ascending: false }),
        db.from('servicerapporter').select('ordre_id').not('ordre_id', 'is', null),
      ])
      if (o.error) throw o.error
      const medRapport = new Set((r.data ?? []).map(x => x.ordre_id))
      setRader((o.data ?? []).map(x => ({ ...x, harRapport: medRapport.has(x.id) })) as Rad[])
    } catch (err) {
      log.error('Kunne ikke laste ordre', { error: err })
      setFeil(err instanceof Error ? err.message : 'Kunne ikke laste ordre')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { last() }, [last])

  useEffect(() => {
    function tast(e: KeyboardEvent) { if (e.key !== '/' || (e.target as HTMLElement).closest('input, textarea, select') || ny) return; e.preventDefault(); sokRef.current?.focus() }
    document.addEventListener('keydown', tast); return () => document.removeEventListener('keydown', tast)
  }, [ny])

  function settMine(v: boolean) { setMine(v); try { localStorage.setItem(MINE_KEY, v ? '1' : '0') } catch { /* ignorer */ } }

  // Grunnlag: tekniker-/anleggsfilter først, så teller chips på det
  const grunnlag = useMemo(() => rader.filter(r => {
    if (anleggFilter && r.anlegg_id !== anleggFilter) return false
    if (tek) return tek === 'ingen' ? !r.tekniker_id : r.tekniker_id === tek
    if (mine && meg) return r.tekniker_id === meg.id || !r.tekniker_id
    return true
  }), [rader, tek, mine, meg, anleggFilter])

  const teller = useMemo(() => ({
    aktive: grunnlag.filter(r => AKTIV.has(r.status)).length,
    nye: grunnlag.filter(r => AKTIV.has(r.status) && r.sett_av_tekniker === false).length,
    ventende: grunnlag.filter(r => r.status === ORDRE_STATUSER.VENTENDE || r.status === ORDRE_STATUSER.NY).length,
    pagaende: grunnlag.filter(r => r.status === ORDRE_STATUSER.PAGAENDE).length,
    fullforte: grunnlag.filter(r => r.status === ORDRE_STATUSER.FULLFORT).length,
    fakturerte: grunnlag.filter(r => r.status === ORDRE_STATUSER.FAKTURERT).length,
  }), [grunnlag])

  const filtrert = useMemo(() => {
    const s = q.trim().toLowerCase()
    const liste = grunnlag.filter(r => {
      switch (chip) {
        case 'aktive': if (!AKTIV.has(r.status)) return false; break
        case 'nye': if (!AKTIV.has(r.status) || r.sett_av_tekniker !== false) return false; break
        case 'ventende': if (r.status !== ORDRE_STATUSER.VENTENDE && r.status !== ORDRE_STATUSER.NY) return false; break
        case 'pagaende': if (r.status !== ORDRE_STATUSER.PAGAENDE) return false; break
        case 'fullforte': if (r.status !== ORDRE_STATUSER.FULLFORT) return false; break
        case 'fakturerte': if (r.status !== ORDRE_STATUSER.FAKTURERT) return false; break
      }
      if (!s) return true
      return [r.ordre_nummer, r.type, r.anlegg?.anleggsnavn, r.customer?.navn, r.kommentar, r.tekniker?.navn].some(v => v?.toLowerCase().includes(s))
    })
    const cmp = (x: string | null | undefined, y: string | null | undefined) => (x ?? '').localeCompare(y ?? '', 'nb-NO')
    return [...liste].sort((a, b) => {
      let r = 0
      switch (sort) {
        case 'nummer': r = cmp(a.ordre_nummer, b.ordre_nummer); break
        case 'kunde': r = cmp(a.customer?.navn, b.customer?.navn) || cmp(a.anlegg?.anleggsnavn, b.anlegg?.anleggsnavn); break
        case 'tekniker': r = cmp(a.tekniker?.navn ?? 'Å', b.tekniker?.navn ?? 'Å'); break
        case 'status': r = cmp(a.status, b.status); break
        case 'alder': r = cmp(a.opprettet_dato, b.opprettet_dato); break
      }
      return dir === 'desc' ? -r : r
    })
  }, [grunnlag, chip, q, sort, dir])

  const synlig = filtrert.slice(0, visAntall)
  const anleggNavn = anleggFilter ? rader.find(r => r.anlegg_id === anleggFilter)?.anlegg?.anleggsnavn : null
  const harFilter = Boolean(q || chip !== 'aktive' || tek || anleggFilter)

  function sorterPa(key: SortKey) {
    if (sort === key) setParam('dir', dir === 'asc' ? 'desc' : 'asc')
    else { const p = new URLSearchParams(params); p.set('sort', key); p.delete('dir'); setParams(p, { replace: true }) }
  }
  async function slett(r: Rad) {
    if (!confirm(`Slette ordre ${r.ordre_nummer}? Dette kan ikke angres.`)) return
    const { error } = await db.from('ordre').delete().eq('id', r.id)
    if (error) { toast.error('Kunne ikke slette ordre', error); return }
    toast.success(`Ordre ${r.ordre_nummer} slettet`); last()
  }
  function servicerapport(r: Rad) {
    navigate('/teknisk', { state: { openServicerapport: true, anleggId: r.anlegg_id, anleggNavn: r.anlegg?.anleggsnavn ?? '', ordreId: r.id } })
  }

  if (feil) {
    return <div className="card bg-red-900/20 border-red-800 flex items-start gap-3"><AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" /><div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste ordre</h2><p className="text-sm text-red-300 mb-3">{feil}</p><Button variant="primary" onClick={last}>Prøv igjen</Button></div></div>
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Ordre</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{loading ? 'Laster…' : `${teller.aktive} aktive${teller.nye ? ` · ${teller.nye} nye` : ''}${mine && !tek ? ' · dine og ikke tildelte' : ''}`}</p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => setNy({})}><span className="hidden sm:inline">Ny ordre</span></Button>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <label htmlFor="ordre-sok" className="sr-only">Søk</label>
          <input id="ordre-sok" ref={sokRef} type="search" value={q} onChange={e => setParam('q', e.target.value)} placeholder="Søk på ordrenr., anlegg, kunde, type eller kommentar…" className="input pl-9 !min-h-[38px] !h-[38px]" />
          <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono px-1.5 border border-gray-300 dark:border-gray-700 rounded text-gray-400">/</kbd>
        </div>
        {!tek && meg && (
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden h-[38px]" role="group" aria-label="Hvem">
            {[[true, 'Mine'], [false, 'Alle']].map(([v, t]) => <button key={String(v)} type="button" aria-pressed={mine === v} onClick={() => settMine(v as boolean)} className={cn('px-3 text-sm', mine === v ? 'bg-primary text-white font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100')}>{t as string}</button>)}
          </div>
        )}
        <TeknikerVelger verdi={tek} onChange={v => setParam('tek', v)} />
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1" role="group" aria-label="Filter">
        <Chip aktiv={chip === 'aktive'} onClick={() => setParam('f', null)}>Aktive <b>{teller.aktive}</b></Chip>
        <Chip aktiv={chip === 'nye'} onClick={() => setParam('f', 'nye')}><span className="w-2 h-2 rounded-full bg-emerald-500" />Nye <b>{teller.nye}</b></Chip>
        <Chip aktiv={chip === 'ventende'} onClick={() => setParam('f', 'ventende')}>Ventende <b>{teller.ventende}</b></Chip>
        <Chip aktiv={chip === 'pagaende'} onClick={() => setParam('f', 'pagaende')}>Pågående <b>{teller.pagaende}</b></Chip>
        <span className="w-px h-6 bg-gray-200 dark:bg-gray-800 self-center flex-shrink-0" />
        <Chip aktiv={chip === 'fullforte'} onClick={() => setParam('f', 'fullforte')}>Fullførte <b>{teller.fullforte}</b></Chip>
        <Chip aktiv={chip === 'fakturerte'} onClick={() => setParam('f', 'fakturerte')}>Fakturerte <b>{teller.fakturerte}</b></Chip>
        {anleggFilter && <Chip aktiv onClick={() => setParam('anlegg', null)}><Building2 className="w-3.5 h-3.5" />{anleggNavn ?? 'Anlegg'}<X className="w-3.5 h-3.5" /></Chip>}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{loading ? '' : <>Viser <b className="text-gray-900 dark:text-white tabular-nums">{Math.min(visAntall, filtrert.length)}</b> av {filtrert.length}</>}</span>
        {harFilter && <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })} className="text-primary hover:underline inline-flex items-center gap-1"><X className="w-3.5 h-3.5" />Nullstill filtre</button>}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
      : filtrert.length === 0 ? <div className="card text-center py-12 text-sm text-gray-500 dark:text-gray-400">{harFilter ? 'Ingen ordre matcher filtrene.' : mine ? 'Ingen aktive ordre til deg. Bytt til «Alle» for å se andres.' : 'Ingen aktive ordre.'}</div>
      : (
        <>
          <div className="hidden lg:block card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-dark-100 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <Th k="nummer" sort={sort} dir={dir} onClick={sorterPa}>Ordre</Th>
                  <Th k="kunde" sort={sort} dir={dir} onClick={sorterPa}>Anlegg / kunde</Th>
                  <Th k="tekniker" sort={sort} dir={dir} onClick={sorterPa}>Tekniker</Th>
                  <Th k="status" sort={sort} dir={dir} onClick={sorterPa}>Status</Th>
                  <Th k="alder" sort={sort} dir={dir} onClick={sorterPa}>Alder</Th>
                  <th className="w-px"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {synlig.map(r => {
                  const erNy = r.sett_av_tekniker === false && AKTIV.has(r.status)
                  return (
                    <tr key={r.id} onClick={() => navigate(`/ordre/${r.id}`)} className={cn('group cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors', erNy && 'bg-emerald-50/60 dark:bg-emerald-900/10')}>
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2"><span className="font-mono text-xs text-gray-500 dark:text-gray-400 tabular-nums">{r.ordre_nummer}</span>{erNy && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ikke sett av tekniker" />}</div>
                        <div className="font-semibold text-gray-900 dark:text-white">{r.type}{r.kontrolltype?.length ? <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">{r.kontrolltype.join(', ')}</span> : null}</div>
                      </td>
                      <td className="px-3.5 py-2.5"><div className="text-gray-900 dark:text-white">{r.anlegg?.anleggsnavn ?? <span className="text-gray-400">Uten anlegg</span>}</div><div className="text-xs text-gray-500 dark:text-gray-400">{r.customer?.navn}</div></td>
                      <td className="px-3.5 py-2.5">{r.tekniker ? <span className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300"><span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-dark-100 text-[11px] font-semibold flex items-center justify-center text-gray-900 dark:text-white">{initialer(r.tekniker.navn)}</span>{r.tekniker.navn?.split(' ')[0]}</span> : <span className="text-yellow-700 dark:text-yellow-400 text-xs font-medium">Ikke tildelt</span>}</td>
                      <td className="px-3.5 py-2.5"><StatusPille status={r.status} /></td>
                      <td className="px-3.5 py-2.5"><Alder dato={r.opprettet_dato} aktiv={AKTIV.has(r.status)} /></td>
                      <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                          <IconButton variant="ghost" label="Rediger" icon={<Edit />} onClick={() => navigate(`/ordre/${r.id}/rediger`)} className="w-8 h-8" />
                          <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                            {r.anlegg_id && <MenuItem icon={<FileText />} onSelect={() => servicerapport(r)}>{r.harRapport ? 'Servicerapport (finnes)' : 'Opprett servicerapport'}</MenuItem>}
                            <MenuItem icon={<Trash2 />} danger onSelect={() => slett(r)}>Slett ordre…</MenuItem>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-2">
            {synlig.map(r => {
              const erNy = r.sett_av_tekniker === false && AKTIV.has(r.status)
              return (
                <button key={r.id} type="button" onClick={() => navigate(`/ordre/${r.id}`)} className={cn('card !p-3 w-full text-left space-y-1.5', erNy && 'border-emerald-300 dark:border-emerald-800')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{r.ordre_nummer}{erNy && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-emerald-500" />}</span>
                    <StatusPille status={r.status} />
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">{r.type} · {r.anlegg?.anleggsnavn ?? 'Uten anlegg'}</div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"><span className="truncate">{r.customer?.navn}</span><span className="flex-shrink-0">{r.tekniker ? initialer(r.tekniker.navn) : 'Ikke tildelt'} · {formatDate(r.opprettet_dato)}</span></div>
                </button>
              )
            })}
          </div>

          {filtrert.length > visAntall && <button type="button" onClick={() => setVisAntall(n => n + SIDE)} className="block mx-auto text-sm text-gray-500 dark:text-gray-400 hover:text-primary py-2">Vis {Math.min(SIDE, filtrert.length - visAntall)} til ({visAntall} av {filtrert.length} vist)</button>}
        </>
      )}

      {ny && <NyOrdreDialog anleggId={ny.anleggId} onClose={() => setNy(null)} />}
    </div>
  )
}

export function StatusPille({ status }: { status: string | null }) {
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap', ORDRE_STATUS_COLORS[status ?? ''] ?? 'bg-gray-100 text-gray-700 border-gray-200')}>{status ?? '–'}</span>
}

function Alder({ dato, aktiv }: { dato: string | null; aktiv: boolean }) {
  const d = getDaysAgo(dato)
  if (!aktiv) return <span className="text-gray-500 dark:text-gray-400 tabular-nums">{formatDate(dato)}</span>
  return <span className={cn('tabular-nums', d > 30 ? 'text-red-600 dark:text-red-400 font-semibold' : d > 14 ? 'text-yellow-700 dark:text-yellow-400 font-medium' : 'text-gray-500 dark:text-gray-400')} title={formatDate(dato)}>{d === 0 ? 'I dag' : `${d} d`}</span>
}

function TeknikerVelger({ verdi, onChange }: { verdi: string; onChange: (v: string | null) => void }) {
  const [ansatte, setAnsatte] = useState<{ id: string; navn: string | null }[]>([])
  useEffect(() => { db.from('ansatte').select('id, navn').order('navn').then(({ data }) => setAnsatte(data ?? [])) }, [])
  return (
    <select aria-label="Tekniker" value={verdi} onChange={e => onChange(e.target.value || null)} className="input !min-h-[38px] !h-[38px] w-auto">
      <option value="">Tekniker: alle</option>
      <option value="ingen">Ikke tildelt</option>
      {ansatte.map(a => <option key={a.id} value={a.id}>{a.navn}</option>)}
    </select>
  )
}

function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={aktiv} className={cn('inline-flex items-center gap-2 h-[34px] px-3 rounded-full border text-sm whitespace-nowrap flex-shrink-0 transition-colors [&>b]:font-bold [&>b]:tabular-nums', aktiv ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500')}>{children}</button>
}

function Th({ k, sort, dir, onClick, children }: { k: SortKey; sort: SortKey; dir: 'asc' | 'desc'; onClick: (k: SortKey) => void; children: React.ReactNode }) {
  const aktiv = sort === k
  return <th className="px-3.5 py-2.5 text-left font-semibold"><button type="button" onClick={() => onClick(k)} className={cn('inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white', aktiv && 'text-gray-900 dark:text-white')}>{children}{aktiv ? (dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</button></th>
}
