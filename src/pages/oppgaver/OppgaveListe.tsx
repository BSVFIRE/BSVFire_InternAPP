/**
 * Oppgavelisten (/oppgaver). Sortert på frist, avkryssing fullfører direkte.
 * Mine/Alle, chips (Åpne, Forfalt, Denne uken, Nye, Fullførte), søk (/), 25 om gangen.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Building2, Edit, MoreHorizontal, Plus, Search, Trash2, X } from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn, formatDate } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { OPPGAVE_STATUSER, OPPGAVE_STATUS_COLORS, PRIORITETER, PRIORITET_COLORS } from '@/lib/constants'
import { initialer } from '@/lib/personer'
import { dagerTilForfall, forfallTekst, fullforOppgave } from '@/lib/oppgaver'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { NyOppgaveDialog } from './NyOppgaveDialog'
import { OPPGAVETYPER } from './oppgaveSkjema'

const log = createLogger('OppgaveListe')
const SIDE = 25
const MINE_KEY = 'oppgaver_mine'

type Rad = Pick<Tables<'oppgaver'>, 'id' | 'oppgave_nummer' | 'type' | 'tittel' | 'status' | 'prioritet' | 'forfallsdato' | 'kunde_id' | 'anlegg_id' | 'tekniker_id' | 'ordre_id' | 'beskrivelse' | 'opprettet_dato' | 'sett_av_tekniker'> & {
  anlegg: { anleggsnavn: string | null } | null
  customer: { navn: string | null } | null
  tekniker: { navn: string | null } | null
}
type Chip = 'apne' | 'forfalt' | 'uke' | 'nye' | 'fullforte'
type SortKey = 'frist' | 'prioritet' | 'tittel' | 'tekniker' | 'opprettet'

const PRI_REKKE: Record<string, number> = { [PRIORITETER.HOY]: 0, [PRIORITETER.MEDIUM]: 1, [PRIORITETER.LAV]: 2 }

export default function OppgaveListe() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const { ansatt: meg } = useCurrentAnsatt()
  const [rader, setRader] = useState<Rad[]>([])
  const [loading, setLoading] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)
  const [visAntall, setVisAntall] = useState(SIDE)
  const [ny, setNy] = useState<{ anleggId?: string; ordreId?: string } | null>(null)
  const [mine, setMine] = useState(() => { try { return localStorage.getItem(MINE_KEY) !== '0' } catch { return true } })
  const sokRef = useRef<HTMLInputElement>(null)

  const q = params.get('q') ?? ''
  const chip = (params.get('f') as Chip) || 'apne'
  const tek = params.get('tek') ?? ''
  const type = params.get('type') ?? ''
  const pri = params.get('pri') ?? ''
  const anleggFilter = params.get('anlegg') ?? ''
  const sort = (params.get('sort') as SortKey) || 'frist'
  const dir = params.get('dir') === 'desc' ? 'desc' : 'asc'
  const setParam = useCallback((key: string, value: string | null) => {
    const p = new URLSearchParams(params); if (value) p.set(key, value); else p.delete(key)
    setParams(p, { replace: true }); setVisAntall(SIDE)
  }, [params, setParams])

  // Gamle innganger: state.selectedOppgaveId → detaljside, state.opprettNy → dialog
  useEffect(() => {
    const s = location.state as { selectedOppgaveId?: string; opprettNy?: boolean; anleggId?: string; ordreId?: string } | null
    if (!s) return
    window.history.replaceState({}, document.title)
    if (s.selectedOppgaveId) navigate(`/oppgaver/${s.selectedOppgaveId}`, { replace: true })
    else if (s.opprettNy) setNy({ anleggId: s.anleggId, ordreId: s.ordreId })
  }, [location.state, navigate])

  const last = useCallback(async () => {
    try {
      setFeil(null)
      const { data, error } = await db.from('oppgaver').select('id, oppgave_nummer, type, tittel, status, prioritet, forfallsdato, kunde_id, anlegg_id, tekniker_id, ordre_id, beskrivelse, opprettet_dato, sett_av_tekniker, anlegg:anlegg_id(anleggsnavn), customer:kunde_id(navn), tekniker:ansatte!oppgaver_tekniker_id_fkey(navn)').order('forfallsdato', { ascending: true, nullsFirst: false })
      if (error) throw error
      setRader((data ?? []) as unknown as Rad[])
    } catch (err) {
      log.error('Kunne ikke laste oppgaver', { error: err })
      setFeil(err instanceof Error ? err.message : 'Kunne ikke laste oppgaver')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { last() }, [last])

  useEffect(() => {
    function tast(e: KeyboardEvent) { if (e.key !== '/' || (e.target as HTMLElement).closest('input, textarea, select') || ny) return; e.preventDefault(); sokRef.current?.focus() }
    document.addEventListener('keydown', tast); return () => document.removeEventListener('keydown', tast)
  }, [ny])

  function settMine(v: boolean) { setMine(v); try { localStorage.setItem(MINE_KEY, v ? '1' : '0') } catch { /* ignorer */ } }

  const erApen = (r: Rad) => r.status !== OPPGAVE_STATUSER.FULLFORT
  const grunnlag = useMemo(() => rader.filter(r => {
    if (anleggFilter && r.anlegg_id !== anleggFilter) return false
    if (type && r.type !== type) return false
    if (pri && r.prioritet !== pri) return false
    if (tek) return tek === 'ingen' ? !r.tekniker_id : r.tekniker_id === tek
    if (mine && meg) return r.tekniker_id === meg.id || !r.tekniker_id
    return true
  }), [rader, tek, mine, meg, anleggFilter, type, pri])

  const teller = useMemo(() => ({
    apne: grunnlag.filter(erApen).length,
    forfalt: grunnlag.filter(r => erApen(r) && (dagerTilForfall(r.forfallsdato) ?? 1) < 0).length,
    uke: grunnlag.filter(r => { const d = dagerTilForfall(r.forfallsdato); return erApen(r) && d !== null && d >= 0 && d <= 7 }).length,
    nye: grunnlag.filter(r => erApen(r) && r.sett_av_tekniker === false).length,
    fullforte: grunnlag.filter(r => !erApen(r)).length,
  }), [grunnlag])

  const filtrert = useMemo(() => {
    const s = q.trim().toLowerCase()
    const liste = grunnlag.filter(r => {
      const d = dagerTilForfall(r.forfallsdato)
      switch (chip) {
        case 'apne': if (!erApen(r)) return false; break
        case 'forfalt': if (!erApen(r) || (d ?? 1) >= 0) return false; break
        case 'uke': if (!erApen(r) || d === null || d < 0 || d > 7) return false; break
        case 'nye': if (!erApen(r) || r.sett_av_tekniker !== false) return false; break
        case 'fullforte': if (erApen(r)) return false; break
      }
      if (!s) return true
      return [r.oppgave_nummer, r.tittel, r.type, r.beskrivelse, r.anlegg?.anleggsnavn, r.customer?.navn, r.tekniker?.navn].some(v => v?.toLowerCase().includes(s))
    })
    const cmp = (x: string | null | undefined, y: string | null | undefined) => (x ?? '').localeCompare(y ?? '', 'nb-NO')
    return [...liste].sort((a, b) => {
      let r = 0
      switch (sort) {
        case 'frist': r = (a.forfallsdato ?? '9').localeCompare(b.forfallsdato ?? '9') || (PRI_REKKE[a.prioritet ?? ''] ?? 3) - (PRI_REKKE[b.prioritet ?? ''] ?? 3); break
        case 'prioritet': r = (PRI_REKKE[a.prioritet ?? ''] ?? 3) - (PRI_REKKE[b.prioritet ?? ''] ?? 3) || (a.forfallsdato ?? '9').localeCompare(b.forfallsdato ?? '9'); break
        case 'tittel': r = cmp(a.tittel ?? a.type, b.tittel ?? b.type); break
        case 'tekniker': r = cmp(a.tekniker?.navn ?? 'Å', b.tekniker?.navn ?? 'Å'); break
        case 'opprettet': r = cmp(a.opprettet_dato, b.opprettet_dato); break
      }
      return dir === 'desc' ? -r : r
    })
  }, [grunnlag, chip, q, sort, dir])

  const synlig = filtrert.slice(0, visAntall)
  const anleggNavn = anleggFilter ? rader.find(r => r.anlegg_id === anleggFilter)?.anlegg?.anleggsnavn : null
  const harFilter = Boolean(q || chip !== 'apne' || tek || anleggFilter || type || pri)

  function sorterPa(key: SortKey) {
    if (sort === key) setParam('dir', dir === 'asc' ? 'desc' : 'asc')
    else { const p = new URLSearchParams(params); p.set('sort', key); p.delete('dir'); setParams(p, { replace: true }) }
  }
  async function fullfor(r: Rad) {
    const res = await fullforOppgave(r)
    if (res.error) { toast.error('Kunne ikke fullføre oppgave', res.error); return }
    toast.success(res.ordreFakturert ? `«${r.tittel ?? r.type}» fullført – ordren er satt til Fakturert` : `«${r.tittel ?? r.type}» fullført`)
    setRader(prev => prev.map(x => x.id === r.id ? { ...x, status: OPPGAVE_STATUSER.FULLFORT } : x))
  }
  async function gjenapne(r: Rad) {
    const { error } = await db.from('oppgaver').update({ status: OPPGAVE_STATUSER.PAGAENDE, sist_oppdatert: new Date().toISOString() }).eq('id', r.id)
    if (error) { toast.error('Kunne ikke gjenåpne', error); return }
    setRader(prev => prev.map(x => x.id === r.id ? { ...x, status: OPPGAVE_STATUSER.PAGAENDE } : x))
  }
  async function slett(r: Rad) {
    if (!confirm(`Slette oppgaven «${r.tittel ?? r.type}»?`)) return
    const { error } = await db.from('oppgaver').delete().eq('id', r.id)
    if (error) { toast.error('Kunne ikke slette oppgave', error); return }
    toast.success('Oppgave slettet'); last()
  }

  if (feil) {
    return <div className="card bg-red-900/20 border-red-800 flex items-start gap-3"><AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" /><div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste oppgaver</h2><p className="text-sm text-red-300 mb-3">{feil}</p><Button variant="primary" onClick={last}>Prøv igjen</Button></div></div>
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Oppgaver</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{loading ? 'Laster…' : `${teller.apne} åpne${teller.forfalt ? ` · ${teller.forfalt} forfalt` : ''}${mine && !tek ? ' · dine og ikke tildelte' : ''}`}</p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => setNy({})}><span className="hidden sm:inline">Ny oppgave</span></Button>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <label htmlFor="oppg-sok" className="sr-only">Søk</label>
          <input id="oppg-sok" ref={sokRef} type="search" value={q} onChange={e => setParam('q', e.target.value)} placeholder="Søk på tittel, type, anlegg, kunde eller beskrivelse…" className="input pl-9 !min-h-[38px] !h-[38px]" />
          <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono px-1.5 border border-gray-300 dark:border-gray-700 rounded text-gray-400">/</kbd>
        </div>
        {!tek && meg && (
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden h-[38px]" role="group" aria-label="Hvem">
            {[[true, 'Mine'], [false, 'Alle']].map(([v, t]) => <button key={String(v)} type="button" aria-pressed={mine === v} onClick={() => settMine(v as boolean)} className={cn('px-3 text-sm', mine === v ? 'bg-primary text-white font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100')}>{t as string}</button>)}
          </div>
        )}
        <TeknikerVelger verdi={tek} onChange={v => setParam('tek', v)} />
        <select aria-label="Type" value={type} onChange={e => setParam('type', e.target.value || null)} className="input !min-h-[38px] !h-[38px] w-auto">
          <option value="">Alle typer</option>
          {OPPGAVETYPER.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select aria-label="Prioritet" value={pri} onChange={e => setParam('pri', e.target.value || null)} className="input !min-h-[38px] !h-[38px] w-auto">
          <option value="">Alle prioriteter</option>
          {[PRIORITETER.HOY, PRIORITETER.MEDIUM, PRIORITETER.LAV].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1" role="group" aria-label="Filter">
        <Chip aktiv={chip === 'apne'} onClick={() => setParam('f', null)}>Åpne <b>{teller.apne}</b></Chip>
        <Chip aktiv={chip === 'forfalt'} onClick={() => setParam('f', 'forfalt')}><span className="w-2 h-2 rounded-full bg-red-500" />Forfalt <b>{teller.forfalt}</b></Chip>
        <Chip aktiv={chip === 'uke'} onClick={() => setParam('f', 'uke')}>Neste 7 dager <b>{teller.uke}</b></Chip>
        <Chip aktiv={chip === 'nye'} onClick={() => setParam('f', 'nye')}><span className="w-2 h-2 rounded-full bg-emerald-500" />Nye <b>{teller.nye}</b></Chip>
        <span className="w-px h-6 bg-gray-200 dark:bg-gray-800 self-center flex-shrink-0" />
        <Chip aktiv={chip === 'fullforte'} onClick={() => setParam('f', 'fullforte')}>Fullførte <b>{teller.fullforte}</b></Chip>
        {anleggFilter && <Chip aktiv onClick={() => setParam('anlegg', null)}><Building2 className="w-3.5 h-3.5" />{anleggNavn ?? 'Anlegg'}<X className="w-3.5 h-3.5" /></Chip>}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{loading ? '' : <>Viser <b className="text-gray-900 dark:text-white tabular-nums">{Math.min(visAntall, filtrert.length)}</b> av {filtrert.length}</>}</span>
        {harFilter && <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })} className="text-primary hover:underline inline-flex items-center gap-1"><X className="w-3.5 h-3.5" />Nullstill filtre</button>}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
      : filtrert.length === 0 ? <div className="card text-center py-12 text-sm text-gray-500 dark:text-gray-400">{harFilter ? 'Ingen oppgaver matcher filtrene.' : mine ? 'Ingen åpne oppgaver til deg. Bytt til «Alle» for å se andres.' : 'Ingen åpne oppgaver.'}</div>
      : (
        <>
          <div className="hidden lg:block card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-dark-100 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="w-10"></th>
                  <Th k="tittel" sort={sort} dir={dir} onClick={sorterPa}>Oppgave</Th>
                  <th className="px-3.5 py-2.5 text-left font-semibold">Anlegg / kunde</th>
                  <Th k="tekniker" sort={sort} dir={dir} onClick={sorterPa}>Ansvarlig</Th>
                  <Th k="prioritet" sort={sort} dir={dir} onClick={sorterPa}>Prioritet</Th>
                  <Th k="frist" sort={sort} dir={dir} onClick={sorterPa}>Frist</Th>
                  <th className="w-px"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {synlig.map(r => {
                  const apen = erApen(r)
                  const erNy = apen && r.sett_av_tekniker === false
                  return (
                    <tr key={r.id} onClick={() => navigate(`/oppgaver/${r.id}`)} className={cn('group cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors', !apen && 'opacity-60', erNy && 'bg-emerald-50/60 dark:bg-emerald-900/10')}>
                      <td className="pl-3.5 py-2.5" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={!apen} onChange={() => apen ? fullfor(r) : gjenapne(r)} aria-label={apen ? `Fullfør ${r.tittel ?? r.type}` : `Gjenåpne ${r.tittel ?? r.type}`} className="w-[18px] h-[18px] rounded text-primary focus:ring-primary" />
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className={cn('font-semibold text-gray-900 dark:text-white', !apen && 'line-through')}>{r.tittel ?? r.type}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><span className="px-1.5 py-px rounded bg-gray-100 dark:bg-dark-100">{r.type}</span>{r.ordre_id && <span>· fra ordre</span>}{!apen && <span className={cn('px-1.5 py-px rounded border', OPPGAVE_STATUS_COLORS[r.status ?? ''])}>{r.status}</span>}{apen && r.status === OPPGAVE_STATUSER.PAGAENDE && <span className="text-blue-600 dark:text-blue-400">· Pågående</span>}</div>
                      </td>
                      <td className="px-3.5 py-2.5">{r.anlegg || r.customer ? <><div className="text-gray-900 dark:text-white">{r.anlegg?.anleggsnavn ?? r.customer?.navn}</div>{r.anlegg && <div className="text-xs text-gray-500 dark:text-gray-400">{r.customer?.navn}</div>}</> : <span className="text-gray-400">Intern</span>}</td>
                      <td className="px-3.5 py-2.5">{r.tekniker ? <span className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300"><span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-dark-100 text-[11px] font-semibold flex items-center justify-center text-gray-900 dark:text-white">{initialer(r.tekniker.navn)}</span>{r.tekniker.navn?.split(' ')[0]}</span> : <span className="text-yellow-700 dark:text-yellow-400 text-xs font-medium">Ikke tildelt</span>}</td>
                      <td className="px-3.5 py-2.5"><Prioritet p={r.prioritet} /></td>
                      <td className="px-3.5 py-2.5"><Frist dato={r.forfallsdato} apen={apen} /></td>
                      <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                          <IconButton variant="ghost" label="Rediger" icon={<Edit />} onClick={() => navigate(`/oppgaver/${r.id}/rediger`)} className="w-8 h-8" />
                          <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                            <MenuItem icon={<Trash2 />} danger onSelect={() => slett(r)}>Slett oppgave…</MenuItem>
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
              const apen = erApen(r)
              return (
                <div key={r.id} className={cn('card !p-3 flex gap-3 items-start', !apen && 'opacity-60')}>
                  <input type="checkbox" checked={!apen} onChange={() => apen ? fullfor(r) : gjenapne(r)} aria-label={apen ? 'Fullfør' : 'Gjenåpne'} className="mt-1 w-[18px] h-[18px] rounded text-primary focus:ring-primary flex-shrink-0" />
                  <button type="button" onClick={() => navigate(`/oppgaver/${r.id}`)} className="flex-1 min-w-0 text-left space-y-1">
                    <div className="flex items-center justify-between gap-2"><span className={cn('font-semibold text-gray-900 dark:text-white truncate', !apen && 'line-through')}>{r.tittel ?? r.type}</span><Frist dato={r.forfallsdato} apen={apen} /></div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{[r.type, r.anlegg?.anleggsnavn ?? r.customer?.navn ?? 'Intern', r.tekniker ? initialer(r.tekniker.navn) : 'Ikke tildelt'].join(' · ')}</div>
                  </button>
                </div>
              )
            })}
          </div>

          {filtrert.length > visAntall && <button type="button" onClick={() => setVisAntall(n => n + SIDE)} className="block mx-auto text-sm text-gray-500 dark:text-gray-400 hover:text-primary py-2">Vis {Math.min(SIDE, filtrert.length - visAntall)} til ({visAntall} av {filtrert.length} vist)</button>}
        </>
      )}

      {ny && <NyOppgaveDialog anleggId={ny.anleggId} ordreId={ny.ordreId} onClose={() => setNy(null)} />}
    </div>
  )
}

export function Prioritet({ p }: { p: string | null }) {
  if (!p) return <span className="text-gray-400">–</span>
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap', PRIORITET_COLORS[p] ?? 'bg-gray-100 text-gray-700 border-gray-200')}>{p}</span>
}

export function Frist({ dato, apen }: { dato: string | null; apen: boolean }) {
  if (!apen) return <span className="text-gray-500 dark:text-gray-400 tabular-nums text-xs">{dato ? formatDate(dato) : ''}</span>
  const f = forfallTekst(dato)
  return <span className={cn('tabular-nums whitespace-nowrap', f.tone === 'r' ? 'text-red-600 dark:text-red-400 font-semibold' : f.tone === 'y' ? 'text-yellow-700 dark:text-yellow-400 font-medium' : 'text-gray-500 dark:text-gray-400')} title={dato ? formatDate(dato) : undefined}>{f.tekst}</span>
}

function TeknikerVelger({ verdi, onChange }: { verdi: string; onChange: (v: string | null) => void }) {
  const [ansatte, setAnsatte] = useState<{ id: string; navn: string | null }[]>([])
  useEffect(() => { db.from('ansatte').select('id, navn').order('navn').then(({ data }) => setAnsatte(data ?? [])) }, [])
  return (
    <select aria-label="Ansvarlig" value={verdi} onChange={e => onChange(e.target.value || null)} className="input !min-h-[38px] !h-[38px] w-auto">
      <option value="">Ansvarlig: alle</option>
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
