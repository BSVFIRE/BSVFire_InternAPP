/**
 * Kontrollpriser (/priser) – årlige priser per anlegg og fag.
 * Alle aktive anlegg vises (også de uten prisrad), prisene redigeres rett i tabellen,
 * og indeksregulering kan kjøres på mange anlegg samtidig. Historikk skrives av databasetrigger.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Building2, ChevronLeft, CheckSquare, History, MoreHorizontal, Percent, Search, Trash2, X } from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn, formatDate } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'

const log = createLogger('Priser')
const SIDE = 50

const FAG = [
  { key: 'prisbrannalarm', navn: 'Brannalarm', kontrolltype: 'Brannalarm' },
  { key: 'prisnodlys', navn: 'Nødlys', kontrolltype: 'Nødlys' },
  { key: 'prisslukkeutstyr', navn: 'Slukkeutstyr', kontrolltype: 'Slukkeutstyr' },
  { key: 'prisroykluker', navn: 'Røykluker', kontrolltype: 'Røykluker' },
  { key: 'prisekstern', navn: 'Ekstern', kontrolltype: 'Ekstern' },
] as const
type FagKey = typeof FAG[number]['key']

type PrisRad = Tables<'priser_kundenummer'>
interface Rad {
  anleggId: string; anleggsnavn: string; kundeId: string | null; kunde: string; kundenummer: string | null; kontrolltyper: string[]
  pris: PrisRad | null; sum: number; manglerFag: string[]
}
type Chip = 'alle' | 'mangler' | 'uten_pris' | 'med_pris'
type SortKey = 'anlegg' | 'kunde' | 'sum' | FagKey

const kr = (n: number) => `${Math.round(n).toLocaleString('nb-NO')} kr`

export function Priser() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const [rader, setRader] = useState<Rad[]>([])
  const [loading, setLoading] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)
  const [visAntall, setVisAntall] = useState(SIDE)
  const [velgModus, setVelgModus] = useState(false)
  const [valgte, setValgte] = useState<Set<string>>(new Set())
  const [indeks, setIndeks] = useState<{ ider: string[] } | null>(null)
  const [historikk, setHistorikk] = useState<Rad | null>(null)
  const [lagrer, setLagrer] = useState<string | null>(null)
  const sokRef = useRef<HTMLInputElement>(null)

  const q = params.get('q') ?? ''
  const chip = (params.get('f') as Chip) || 'alle'
  const anleggFilter = params.get('anlegg') ?? ''
  const kundeFilter = params.get('kunde') ?? ''
  const sort = (params.get('sort') as SortKey) || 'kunde'
  const dir = params.get('dir') === 'desc' ? 'desc' : 'asc'
  const setParam = useCallback((key: string, value: string | null) => { const p = new URLSearchParams(params); if (value) p.set(key, value); else p.delete(key); setParams(p, { replace: true }); setVisAntall(SIDE) }, [params, setParams])

  // Gammel inngang fra anleggssiden: state.anleggId → ?anlegg=
  useEffect(() => {
    const s = location.state as { anleggId?: string } | null
    if (s?.anleggId) { window.history.replaceState({}, document.title); setParam('anlegg', s.anleggId) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const last = useCallback(async () => {
    try {
      setFeil(null)
      const [a, p] = await Promise.all([
        db.from('anlegg').select('id, anleggsnavn, kundenr, kontroll_type, customer:kundenr(id, navn, kunde_nummer)').or('skjult.is.null,skjult.eq.false').order('anleggsnavn'),
        db.from('priser_kundenummer').select('*'),
      ])
      if (a.error) throw a.error
      if (p.error) throw p.error
      const prisMap = new Map<string, PrisRad>()
      for (const x of p.data ?? []) if (x.anlegg_id) prisMap.set(x.anlegg_id, x)
      setRader((a.data ?? []).map(x => {
        const c = x.customer as { id: string; navn: string | null; kunde_nummer: string | null } | null
        const pris = prisMap.get(x.id) ?? null
        const typer = x.kontroll_type ?? []
        const sum = pris ? FAG.reduce((s, f) => s + (pris[f.key] ?? 0), 0) : 0
        const manglerFag = FAG.filter(f => typer.includes(f.kontrolltype) && !(pris?.[f.key])).map(f => f.navn)
        return { anleggId: x.id, anleggsnavn: x.anleggsnavn ?? '', kundeId: c?.id ?? null, kunde: c?.navn ?? 'Ukjent kunde', kundenummer: c?.kunde_nummer ?? null, kontrolltyper: typer, pris, sum, manglerFag }
      }))
    } catch (err) {
      log.error('Kunne ikke laste priser', { error: err })
      setFeil(err instanceof Error ? err.message : 'Kunne ikke laste priser')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { last() }, [last])
  useEffect(() => {
    function tast(e: KeyboardEvent) { if (e.key !== '/' || (e.target as HTMLElement).closest('input, textarea, select') || indeks || historikk) return; e.preventDefault(); sokRef.current?.focus() }
    document.addEventListener('keydown', tast); return () => document.removeEventListener('keydown', tast)
  }, [indeks, historikk])

  const grunnlag = useMemo(() => rader.filter(r => (!anleggFilter || r.anleggId === anleggFilter) && (!kundeFilter || r.kundeId === kundeFilter)), [rader, anleggFilter, kundeFilter])
  const teller = useMemo(() => ({
    alle: grunnlag.length,
    med_pris: grunnlag.filter(r => r.sum > 0).length,
    uten_pris: grunnlag.filter(r => !r.pris || r.sum === 0).length,
    mangler: grunnlag.filter(r => r.manglerFag.length > 0).length,
  }), [grunnlag])
  const filtrert = useMemo(() => {
    const s = q.trim().toLowerCase()
    const liste = grunnlag.filter(r => {
      if (chip === 'med_pris' && r.sum === 0) return false
      if (chip === 'uten_pris' && r.sum > 0) return false
      if (chip === 'mangler' && r.manglerFag.length === 0) return false
      if (!s) return true
      return [r.anleggsnavn, r.kunde, r.kundenummer].some(v => v?.toLowerCase().includes(s))
    })
    const cmp = (x: string | null, y: string | null) => (x ?? '').localeCompare(y ?? '', 'nb-NO')
    return [...liste].sort((a, b) => {
      let r = 0
      if (sort === 'anlegg') r = cmp(a.anleggsnavn, b.anleggsnavn)
      else if (sort === 'kunde') r = cmp(a.kunde, b.kunde) || cmp(a.anleggsnavn, b.anleggsnavn)
      else if (sort === 'sum') r = a.sum - b.sum
      else r = (a.pris?.[sort] ?? 0) - (b.pris?.[sort] ?? 0)
      return dir === 'desc' ? -r : r
    })
  }, [grunnlag, chip, q, sort, dir])
  const synlig = filtrert.slice(0, visAntall)
  const totaler = useMemo(() => { const t: Record<string, number> = { sum: 0 }; for (const f of FAG) t[f.key] = 0; for (const r of filtrert) { t.sum += r.sum; for (const f of FAG) t[f.key] += r.pris?.[f.key] ?? 0 } return t }, [filtrert])
  const harFilter = Boolean(q || chip !== 'alle' || anleggFilter || kundeFilter)
  const anleggNavn = anleggFilter ? rader.find(r => r.anleggId === anleggFilter)?.anleggsnavn : null
  const kundeNavn = kundeFilter ? rader.find(r => r.kundeId === kundeFilter)?.kunde : null

  function sorterPa(key: SortKey) {
    if (sort === key) setParam('dir', dir === 'asc' ? 'desc' : 'asc')
    else { const p = new URLSearchParams(params); p.set('sort', key); p.delete('dir'); setParams(p, { replace: true }) }
  }

  /** Lagrer én pris. Oppretter prisraden hvis anlegget ikke har en. */
  async function lagrePris(r: Rad, fag: FagKey, verdi: number | null) {
    if ((r.pris?.[fag] ?? null) === verdi) return
    setLagrer(`${r.anleggId}:${fag}`)
    const kundenummer = r.kundenummer && /^\d+$/.test(r.kundenummer) ? parseInt(r.kundenummer, 10) : null
    const res = r.pris
      ? await db.from('priser_kundenummer').update({ [fag]: verdi }).eq('id', r.pris.id).select('*').single()
      : await db.from('priser_kundenummer').insert({ anlegg_id: r.anleggId, kunde: r.kunde, kundenummer, [fag]: verdi }).select('*').single()
    setLagrer(null)
    if (res.error || !res.data) { toast.error('Kunne ikke lagre pris', res.error); return }
    const ny = res.data
    setRader(prev => prev.map(x => x.anleggId === r.anleggId ? { ...x, pris: ny, sum: FAG.reduce((s, f) => s + (ny[f.key] ?? 0), 0), manglerFag: FAG.filter(f => x.kontrolltyper.includes(f.kontrolltype) && !(ny[f.key])).map(f => f.navn) } : x))
  }
  async function slettPris(r: Rad) {
    if (!r.pris || !confirm(`Fjerne alle priser på ${r.anleggsnavn}?`)) return
    const { error } = await db.from('priser_kundenummer').delete().eq('id', r.pris.id)
    if (error) { toast.error('Kunne ikke slette', error); return }
    toast.success('Priser fjernet'); last()
  }
  function toggleValgt(id: string) { setValgte(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function velgAlleViste() { setValgte(prev => { const n = new Set(prev); const alle = filtrert.every(r => n.has(r.anleggId)); for (const r of filtrert) alle ? n.delete(r.anleggId) : n.add(r.anleggId); return n }) }

  if (feil) return <div className="card bg-red-900/20 border-red-800 flex items-start gap-3"><AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" /><div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste priser</h2><p className="text-sm text-red-300 mb-3">{feil}</p><Button variant="primary" onClick={last}>Prøv igjen</Button></div></div>

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        {anleggFilter ? (
          <Link to={`/anlegg/${anleggFilter}`} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ChevronLeft className="w-4 h-4" />{anleggNavn ?? 'Anlegg'}</Link>
        ) : (
          <Link to="/anlegg" className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ChevronLeft className="w-4 h-4" />Anlegg</Link>
        )}
      </div>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Kontrollpriser</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{loading ? 'Laster…' : `${teller.med_pris} av ${teller.alle} anlegg har pris · ${kr(rader.reduce((s, r) => s + r.sum, 0))} per år totalt`}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={velgModus ? 'primary' : 'outline'} icon={<CheckSquare />} onClick={() => { setVelgModus(v => !v); setValgte(new Set()) }}><span className="hidden sm:inline">{velgModus ? 'Ferdig' : 'Velg flere'}</span></Button>
          <Button variant="primary" icon={<Percent />} onClick={() => setIndeks({ ider: filtrert.map(r => r.anleggId) })} disabled={filtrert.length === 0} title="Indeksreguler alle anleggene i listen"><span className="hidden sm:inline">Indeksreguler {harFilter ? 'viste' : 'alle'}</span></Button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input ref={sokRef} type="search" value={q} onChange={e => setParam('q', e.target.value)} placeholder="Søk på anlegg, kunde eller kundenummer…" aria-label="Søk" className="input pl-9 !min-h-[38px] !h-[38px]" />
        <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono px-1.5 border border-gray-300 dark:border-gray-700 rounded text-gray-400">/</kbd>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1" role="group" aria-label="Filter">
        <Chip aktiv={chip === 'alle'} onClick={() => setParam('f', null)}>Alle <b>{teller.alle}</b></Chip>
        <Chip aktiv={chip === 'med_pris'} onClick={() => setParam('f', 'med_pris')}>Med pris <b>{teller.med_pris}</b></Chip>
        <Chip aktiv={chip === 'uten_pris'} onClick={() => setParam('f', 'uten_pris')}>Uten pris <b>{teller.uten_pris}</b></Chip>
        <Chip aktiv={chip === 'mangler'} onClick={() => setParam('f', 'mangler')}><span className="w-2 h-2 rounded-full bg-yellow-500" />Mangler pris på et fag <b>{teller.mangler}</b></Chip>
        {anleggFilter && <Chip aktiv onClick={() => setParam('anlegg', null)}><Building2 className="w-3.5 h-3.5" />{anleggNavn ?? 'Anlegg'}<X className="w-3.5 h-3.5" /></Chip>}
        {kundeFilter && <Chip aktiv onClick={() => setParam('kunde', null)}>{kundeNavn ?? 'Kunde'}<X className="w-3.5 h-3.5" /></Chip>}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{loading ? '' : <>Viser <b className="text-gray-900 dark:text-white tabular-nums">{Math.min(visAntall, filtrert.length)}</b> av {filtrert.length} · sum {kr(totaler.sum)} per år</>}</span>
        {harFilter && <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })} className="text-primary hover:underline inline-flex items-center gap-1"><X className="w-3.5 h-3.5" />Nullstill filtre</button>}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
      : filtrert.length === 0 ? <div className="card text-center py-12 text-sm text-gray-500 dark:text-gray-400">Ingen anlegg matcher.</div>
      : (
        <>
          <div className="hidden lg:block card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-dark-100 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  {velgModus && <th className="w-10 pl-3"><input type="checkbox" checked={filtrert.length > 0 && filtrert.every(r => valgte.has(r.anleggId))} onChange={velgAlleViste} aria-label="Velg alle viste" className="w-4 h-4 rounded text-primary focus:ring-primary" /></th>}
                  <Th k="anlegg" sort={sort} dir={dir} onClick={sorterPa}>Anlegg</Th>
                  <Th k="kunde" sort={sort} dir={dir} onClick={sorterPa}>Kunde</Th>
                  {FAG.map(f => <Th key={f.key} k={f.key} sort={sort} dir={dir} onClick={sorterPa} hoyre>{f.navn}</Th>)}
                  <Th k="sum" sort={sort} dir={dir} onClick={sorterPa} hoyre>Sum/år</Th>
                  <th className="w-px"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {synlig.map(r => (
                  <tr key={r.anleggId} className={cn('group hover:bg-gray-50 dark:hover:bg-dark-100/60', velgModus && valgte.has(r.anleggId) && 'bg-primary/5')}>
                    {velgModus && <td className="pl-3"><input type="checkbox" checked={valgte.has(r.anleggId)} onChange={() => toggleValgt(r.anleggId)} aria-label="Velg" className="w-4 h-4 rounded text-primary focus:ring-primary" /></td>}
                    <td className="px-3 py-1.5">
                      <Link to={`/anlegg/${r.anleggId}`} className="font-medium text-gray-900 dark:text-white hover:text-primary">{r.anleggsnavn}</Link>
                      {r.manglerFag.length > 0 && <span className="block text-[11px] text-yellow-700 dark:text-yellow-400">Mangler: {r.manglerFag.join(', ')}</span>}
                    </td>
                    <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300"><button type="button" onClick={() => r.kundeId && setParam('kunde', r.kundeId)} className="hover:text-primary text-left">{r.kunde}</button>{r.kundenummer && <span className="block text-xs text-gray-500 dark:text-gray-400 tabular-nums">{r.kundenummer}</span>}</td>
                    {FAG.map(f => (
                      <td key={f.key} className="px-1 py-1 text-right">
                        <PrisCelle verdi={r.pris?.[f.key] ?? null} aktuelt={r.kontrolltyper.includes(f.kontrolltype)} lagrer={lagrer === `${r.anleggId}:${f.key}`} onLagre={v => lagrePris(r, f.key, v)} />
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right font-semibold text-gray-900 dark:text-white tabular-nums">{r.sum ? kr(r.sum) : <span className="text-gray-400 font-normal">–</span>}</td>
                    <td className="px-1 py-1">
                      <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8 opacity-0 group-hover:opacity-100 focus:opacity-100" />}>
                        <MenuItem icon={<Percent />} onSelect={() => setIndeks({ ider: [r.anleggId] })}>Indeksreguler dette anlegget</MenuItem>
                        <MenuItem icon={<History />} onSelect={() => setHistorikk(r)}>Prishistorikk</MenuItem>
                        {r.pris && <MenuItem icon={<Trash2 />} danger onSelect={() => slettPris(r)}>Fjern alle priser…</MenuItem>}
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-dark-100 font-semibold text-gray-900 dark:text-white">
                <tr>
                  <td colSpan={velgModus ? 3 : 2} className="px-3 py-2">Sum {harFilter ? 'viste' : 'alle'} ({filtrert.length})</td>
                  {FAG.map(f => <td key={f.key} className="px-3 py-2 text-right tabular-nums">{kr(totaler[f.key])}</td>)}
                  <td className="px-3 py-2 text-right tabular-nums text-primary">{kr(totaler.sum)}</td><td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="lg:hidden space-y-2">
            {synlig.map(r => (
              <div key={r.anleggId} className="card !p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><Link to={`/anlegg/${r.anleggId}`} className="block font-semibold text-gray-900 dark:text-white truncate">{r.anleggsnavn}</Link><span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{r.kunde}{r.kundenummer ? ` · ${r.kundenummer}` : ''}</span></div>
                  <span className="font-semibold tabular-nums text-gray-900 dark:text-white whitespace-nowrap">{r.sum ? kr(r.sum) : '–'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {FAG.filter(f => r.kontrolltyper.includes(f.kontrolltype) || r.pris?.[f.key]).map(f => (
                    <label key={f.key} className="text-xs text-gray-500 dark:text-gray-400"><span className="block mb-0.5">{f.navn}</span><PrisCelle verdi={r.pris?.[f.key] ?? null} aktuelt lagrer={lagrer === `${r.anleggId}:${f.key}`} onLagre={v => lagrePris(r, f.key, v)} bred /></label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filtrert.length > visAntall && <button type="button" onClick={() => setVisAntall(n => n + SIDE)} className="block mx-auto text-sm text-gray-500 dark:text-gray-400 hover:text-primary py-2">Vis {Math.min(SIDE, filtrert.length - visAntall)} til ({visAntall} av {filtrert.length} vist)</button>}
        </>
      )}

      {velgModus && (
        <div className="fixed bottom-4 left-4 right-4 lg:left-[calc(var(--sidebar-w)+2rem)] z-20 flex justify-center pointer-events-none">
          <div className="pointer-events-auto card !py-2 !px-3 shadow-lg border-primary/40 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums px-1">{valgte.size} valgt</span>
            <Button variant="primary" icon={<Percent />} disabled={valgte.size === 0} onClick={() => setIndeks({ ider: Array.from(valgte) })}>Indeksreguler valgte</Button>
            <Button variant="ghost" icon={<X />} onClick={() => { setVelgModus(false); setValgte(new Set()) }}>Ferdig</Button>
          </div>
        </div>
      )}

      {indeks && <IndeksDialog rader={rader.filter(r => indeks.ider.includes(r.anleggId) && r.pris && r.sum > 0)} onClose={() => setIndeks(null)} onFerdig={() => { setIndeks(null); setValgte(new Set()); setVelgModus(false); last() }} />}
      {historikk && <HistorikkDialog rad={historikk} onClose={() => setHistorikk(null)} />}
    </div>
  )
}

/** Priscelle: klikk → tallfelt, lagrer på blur/Enter. Grå «–» når faget ikke er på anlegget. */
function PrisCelle({ verdi, aktuelt, lagrer, onLagre, bred }: { verdi: number | null; aktuelt: boolean; lagrer: boolean; onLagre: (v: number | null) => void; bred?: boolean }) {
  const [red, setRed] = useState(false)
  const [v, setV] = useState(verdi != null ? String(Math.round(verdi)) : '')
  useEffect(() => { if (!red) setV(verdi != null ? String(Math.round(verdi)) : '') }, [verdi, red])
  const lagre = () => { setRed(false); const n = v.trim() === '' ? null : Math.max(0, parseInt(v.replace(/\D/g, '') || '0', 10)); onLagre(n) }
  if (red) return <input value={v} onChange={e => setV(e.target.value.replace(/[^\d]/g, ''))} onBlur={lagre} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setRed(false); setV(verdi != null ? String(Math.round(verdi)) : '') } }} inputMode="numeric" autoFocus aria-label="Pris" className={cn('input !h-[34px] !min-h-[34px] !py-0 !px-2 text-sm text-right tabular-nums', bred ? 'w-full' : 'w-24')} />
  return (
    <button type="button" onClick={() => setRed(true)} title="Klikk for å endre" className={cn('h-[34px] rounded-lg text-right tabular-nums px-2 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors', bred ? 'w-full text-left' : 'w-24', verdi ? 'text-gray-900 dark:text-white' : aktuelt ? 'text-yellow-700 dark:text-yellow-400 text-xs' : 'text-gray-300 dark:text-gray-700')}>
      {lagrer ? <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-primary" /> : verdi ? kr(verdi) : aktuelt ? 'Sett pris' : '–'}
    </button>
  )
}

function IndeksDialog({ rader, onClose, onFerdig }: { rader: Rad[]; onClose: () => void; onFerdig: () => void }) {
  const [prosent, setProsent] = useState('')
  const [avrunding, setAvrunding] = useState<1 | 10 | 100>(1)
  const [jobber, setJobber] = useState(false)
  useEffect(() => { function esc(e: KeyboardEvent) { if (e.key === 'Escape' && !jobber) onClose() } document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc) }, [onClose, jobber])
  const p = parseFloat(prosent.replace(',', '.')) || 0
  const juster = (n: number) => Math.round((n * (1 + p / 100)) / avrunding) * avrunding
  const forSum = rader.reduce((s, r) => s + r.sum, 0)
  const etterSum = rader.reduce((s, r) => s + FAG.reduce((x, f) => x + (r.pris?.[f.key] ? juster(r.pris[f.key]!) : 0), 0), 0)

  async function kjor() {
    if (!p) return
    if (!confirm(`Indeksregulere ${rader.length} anlegg med ${p} %? Ny årssum blir ${kr(etterSum)} (fra ${kr(forSum)}). Endringene logges i prishistorikken.`)) return
    setJobber(true)
    let feilet = 0
    for (const r of rader) {
      if (!r.pris) continue
      const patch: Partial<PrisRad> = {}
      for (const f of FAG) if (r.pris[f.key]) patch[f.key] = juster(r.pris[f.key]!)
      const { error } = await db.from('priser_kundenummer').update(patch).eq('id', r.pris.id)
      if (error) { feilet++; log.error('Indeksregulering feilet', { error, anleggId: r.anleggId }) }
    }
    setJobber(false)
    if (feilet) toast.warning(`${rader.length - feilet} anlegg regulert, ${feilet} feilet`); else toast.success(`${rader.length} anlegg indeksregulert med ${p} %`)
    onFerdig()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => !jobber && onClose()}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="idx-tittel" className="card w-full sm:max-w-md rounded-b-none sm:rounded-lg !p-0">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div><h2 id="idx-tittel" className="text-lg font-bold text-gray-900 dark:text-white">Indeksregulering</h2><p className="text-sm text-gray-500 dark:text-gray-400">{rader.length} anlegg med pris · {kr(forSum)} per år i dag</p></div>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} disabled={jobber} />
        </div>
        <div className="px-5 pb-4 space-y-4">
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <label htmlFor="idx-p" className="block text-sm font-medium text-gray-900 dark:text-white">Prosent</label>
              <div className="relative"><input id="idx-p" value={prosent} onChange={e => setProsent(e.target.value)} inputMode="decimal" placeholder="f.eks. 3,5" autoFocus className="input pr-9" /><Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div>
            </div>
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-gray-900 dark:text-white">Avrund til</span>
              <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden h-11" role="radiogroup">
                {([1, 10, 100] as const).map(a => <button key={a} type="button" role="radio" aria-checked={avrunding === a} onClick={() => setAvrunding(a)} className={cn('px-3 text-sm', avrunding === a ? 'bg-primary text-white font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100')}>{a} kr</button>)}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">{[2.5, 3, 3.5, 4, 5].map(x => <button key={x} type="button" onClick={() => setProsent(String(x).replace('.', ','))} className="h-8 px-2.5 rounded-full border border-gray-300 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary">{String(x).replace('.', ',')} %</button>)}</div>
          {p !== 0 && (
            <div className="rounded-lg bg-gray-50 dark:bg-dark-100 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Årssum i dag</span><span className="tabular-nums">{kr(forSum)}</span></div>
              <div className="flex justify-between font-semibold text-gray-900 dark:text-white"><span>Etter regulering</span><span className="tabular-nums">{kr(etterSum)}</span></div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400"><span>Endring</span><span className="tabular-nums">{etterSum >= forSum ? '+' : ''}{kr(etterSum - forSum)}</span></div>
              {rader.length <= 3 && rader.map(r => <div key={r.anleggId} className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.anleggsnavn}: {FAG.filter(f => r.pris?.[f.key]).map(f => `${f.navn} ${kr(r.pris![f.key]!)} → ${kr(juster(r.pris![f.key]!))}`).join(' · ')}</div>)}
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">Bare fag som har pris i dag reguleres. Alle endringer logges automatisk i prishistorikken (gammel og ny verdi per fag).</p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="ghost" onClick={onClose} disabled={jobber}>Avbryt</Button>
          <Button variant="primary" icon={<Percent />} loading={jobber} disabled={!p || rader.length === 0} onClick={kjor}>Reguler {rader.length} anlegg</Button>
        </div>
      </div>
    </div>
  )
}

function HistorikkDialog({ rad, onClose }: { rad: Rad; onClose: () => void }) {
  const [liste, setListe] = useState<Tables<'prishistorikk'>[] | null>(null)
  useEffect(() => {
    db.from('prishistorikk').select('*').eq('anlegg_id', rad.anleggId).order('endret_dato', { ascending: false }).limit(100).then(({ data }) => setListe(data ?? []))
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() } document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc)
  }, [rad.anleggId, onClose])
  const fagNavn = (felt: string) => FAG.find(f => f.key === felt)?.navn ?? felt
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" className="card w-full sm:max-w-lg max-h-[85vh] rounded-b-none sm:rounded-lg !p-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div><h2 className="text-lg font-bold text-gray-900 dark:text-white">Prishistorikk</h2><p className="text-sm text-gray-500 dark:text-gray-400">{rad.anleggsnavn}</p></div>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {liste === null ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          : liste.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">Ingen endringer registrert.</p>
          : <ul className="divide-y divide-gray-100 dark:divide-gray-800">{liste.map(h => (
              <li key={h.id} className="py-2 flex items-center gap-3 text-sm">
                <span className="w-24 text-xs text-gray-500 dark:text-gray-400 tabular-nums flex-shrink-0">{formatDate(h.endret_dato)}</span>
                <span className="flex-1 min-w-0"><span className="font-medium text-gray-900 dark:text-white">{fagNavn(h.felt_navn)}</span><span className="text-gray-500 dark:text-gray-400"> · {h.gammel_verdi != null ? kr(h.gammel_verdi) : '–'} → </span><span className="font-semibold text-gray-900 dark:text-white tabular-nums">{h.ny_verdi != null ? kr(h.ny_verdi) : '–'}</span>{h.kommentar && <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{h.kommentar}</span>}</span>
                {h.endret_av && <span className="text-xs text-gray-400 truncate max-w-[110px]">{h.endret_av}</span>}
              </li>
            ))}</ul>}
        </div>
      </div>
    </div>
  )
}

function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={aktiv} className={cn('inline-flex items-center gap-2 h-[34px] px-3 rounded-full border text-sm whitespace-nowrap flex-shrink-0 transition-colors [&>b]:font-bold [&>b]:tabular-nums', aktiv ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500')}>{children}</button>
}
function Th({ k, sort, dir, onClick, children, hoyre }: { k: SortKey; sort: SortKey; dir: 'asc' | 'desc'; onClick: (k: SortKey) => void; children: React.ReactNode; hoyre?: boolean }) {
  const aktiv = sort === k
  return <th className={cn('px-3 py-2.5 font-semibold', hoyre ? 'text-right' : 'text-left')}><button type="button" onClick={() => onClick(k)} className={cn('inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white', aktiv && 'text-gray-900 dark:text-white')}>{children}{aktiv ? (dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</button></th>
}
