/**
 * Kundelisten (/kunder) – samme oppsett som anleggslisten.
 * Chips som teller og filtrerer, søk i URL, klikkbare rader, 25 om gangen.
 */
import { useUendeligListe } from '@/hooks/useUendeligListe'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Building2, Edit, Loader2, MoreHorizontal, PauseCircle, Plus, Search, X } from 'lucide-react'
import { KundeStatusDialog } from './KundeStatusDialog'
import { StatusBadge } from '@/lib/status'
import { db, type Tables } from '@/lib/supabase'
import { cn, formatDate } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { NyKundeDialog } from './NyKundeDialog'

const log = createLogger('KundeListe')
const SIDE = 25

type Rad = Pick<Tables<'customer'>, 'id' | 'navn' | 'kunde_nummer' | 'organisasjonsnummer' | 'type' | 'opprettet' | 'skjult' | 'status'> & {
  kontaktperson: { navn: string | null } | null
  antallAnlegg: number
}
type Chip = 'alle' | 'uten_anlegg' | 'uten_kundenr' | 'nye'
type SortKey = 'navn' | 'kundenr' | 'anlegg' | 'opprettet'

export default function KundeListe() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const [rader, setRader] = useState<Rad[]>([])
  const [statusFor, setStatusFor] = useState<Rad | null>(null)
  const [loading, setLoading] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)
  const [visNy, setVisNy] = useState(false)
  const sokRef = useRef<HTMLInputElement>(null)

  const q = params.get('q') ?? ''
  const chip = (params.get('f') as Chip) || 'alle'
  const skjulte = params.get('skjulte') === '1'
  const sort = (params.get('sort') as SortKey) || 'navn'
  const dir = params.get('dir') === 'desc' ? 'desc' : 'asc'
  const setParam = useCallback((key: string, value: string | null) => {
    const p = new URLSearchParams(params); if (value) p.set(key, value); else p.delete(key)
    setParams(p, { replace: true })
  }, [params, setParams])

  // Gamle innganger: ?new=true, ?view=, state.viewKundeId
  useEffect(() => {
    const s = location.state as { viewKundeId?: string } | null
    const view = params.get('view')
    if (view) { navigate(`/kunder/${view}`, { replace: true }); return }
    if (s?.viewKundeId) { navigate(`/kunder/${s.viewKundeId}`, { replace: true }); return }
    if (params.get('new') === 'true') { setVisNy(true); const p = new URLSearchParams(params); p.delete('new'); setParams(p, { replace: true }) }
  }, [location.state, params, navigate, setParams])

  const last = useCallback(async () => {
    try {
      setFeil(null)
      const [k, a] = await Promise.all([
        db.from('customer').select('id, navn, kunde_nummer, organisasjonsnummer, type, opprettet, skjult, status, kontaktperson:kontaktpersoner!customer_kontaktperson_id_fkey(navn)').order('navn'),
        db.from('anlegg').select('kundenr').or('skjult.is.null,skjult.eq.false'),
      ])
      if (k.error) throw k.error
      const antall = new Map<string, number>()
      for (const x of a.data ?? []) if (x.kundenr) antall.set(x.kundenr, (antall.get(x.kundenr) ?? 0) + 1)
      setRader((k.data ?? []).map(r => ({ ...r, antallAnlegg: antall.get(r.id) ?? 0 })) as Rad[])
    } catch (err) {
      log.error('Kunne ikke laste kunder', { error: err })
      setFeil(err instanceof Error ? err.message : 'Kunne ikke laste kunder')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { last() }, [last])

  useEffect(() => {
    function tast(e: KeyboardEvent) { if (e.key !== '/' || (e.target as HTMLElement).closest('input, textarea, select')) return; e.preventDefault(); sokRef.current?.focus() }
    document.addEventListener('keydown', tast); return () => document.removeEventListener('keydown', tast)
  }, [])

  const enMndSiden = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString() }, [])
  const grunnlag = useMemo(() => rader.filter(r => skjulte || !r.skjult), [rader, skjulte])
  const teller = useMemo(() => ({
    alle: grunnlag.length,
    uten_anlegg: grunnlag.filter(r => r.antallAnlegg === 0).length,
    uten_kundenr: grunnlag.filter(r => !r.kunde_nummer).length,
    nye: grunnlag.filter(r => r.opprettet >= enMndSiden).length,
  }), [grunnlag, enMndSiden])

  const filtrert = useMemo(() => {
    const s = q.trim().toLowerCase()
    const liste = grunnlag.filter(r => {
      if (chip === 'uten_anlegg' && r.antallAnlegg !== 0) return false
      if (chip === 'uten_kundenr' && r.kunde_nummer) return false
      if (chip === 'nye' && r.opprettet < enMndSiden) return false
      if (!s) return true
      return [r.navn, r.kunde_nummer, r.organisasjonsnummer, r.kontaktperson?.navn].some(v => v?.toLowerCase().includes(s))
    })
    const cmp = (x: string | null | undefined, y: string | null | undefined) => (x ?? '').localeCompare(y ?? '', 'nb-NO')
    return [...liste].sort((a, b) => {
      let r = 0
      switch (sort) {
        case 'navn': r = cmp(a.navn, b.navn); break
        case 'kundenr': r = cmp(a.kunde_nummer, b.kunde_nummer); break
        case 'anlegg': r = a.antallAnlegg - b.antallAnlegg; break
        case 'opprettet': r = cmp(a.opprettet, b.opprettet); break
      }
      return dir === 'desc' ? -r : r
    })
  }, [grunnlag, q, chip, enMndSiden, sort, dir])

  const { synlig, merRef, harMer, visAntall, visFlere } = useUendeligListe(filtrert, SIDE)
  const harFilter = Boolean(q || chip !== 'alle' || skjulte)

  function sorterPa(key: SortKey) {
    if (sort === key) setParam('dir', dir === 'asc' ? 'desc' : 'asc')
    else { const p = new URLSearchParams(params); p.set('sort', key); p.delete('dir'); setParams(p, { replace: true }) }
  }

  if (feil) {
    return <div className="card bg-red-900/20 border-red-800 flex items-start gap-3"><AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" /><div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste kunder</h2><p className="text-sm text-red-300 mb-3">{feil}</p><Button variant="primary" onClick={last}>Prøv igjen</Button></div></div>
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Kunder</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{loading ? 'Laster…' : `${grunnlag.length} kunder · ${grunnlag.reduce((s, r) => s + r.antallAnlegg, 0)} anlegg`}</p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => setVisNy(true)}><span className="hidden sm:inline">Ny kunde</span></Button>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <label htmlFor="kunde-sok" className="sr-only">Søk</label>
          <input id="kunde-sok" ref={sokRef} type="search" value={q} onChange={e => setParam('q', e.target.value)} placeholder="Søk på navn, kundenr., org.nr. eller kontaktperson…" className="input pl-9 !min-h-[38px] !h-[38px]" />
          <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono px-1.5 border border-gray-300 dark:border-gray-700 rounded text-gray-400">/</kbd>
        </div>
        <label className={cn('inline-flex items-center gap-2 h-[38px] px-3 rounded-lg border text-sm cursor-pointer select-none', skjulte ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300')}>
          <input type="checkbox" checked={skjulte} onChange={e => setParam('skjulte', e.target.checked ? '1' : null)} className="w-3.5 h-3.5 rounded text-primary focus:ring-primary" />Vis pausede og deaktiverte
        </label>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1" role="group" aria-label="Filter">
        <Chip aktiv={chip === 'alle'} onClick={() => setParam('f', null)}>Alle <b>{teller.alle}</b></Chip>
        <Chip aktiv={chip === 'uten_anlegg'} onClick={() => setParam('f', 'uten_anlegg')}>Uten anlegg <b>{teller.uten_anlegg}</b></Chip>
        <Chip aktiv={chip === 'uten_kundenr'} onClick={() => setParam('f', 'uten_kundenr')}>Mangler kundenummer <b>{teller.uten_kundenr}</b></Chip>
        <Chip aktiv={chip === 'nye'} onClick={() => setParam('f', 'nye')}>Nye siste måned <b>{teller.nye}</b></Chip>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{loading ? '' : <>Viser <b className="text-gray-900 dark:text-white tabular-nums">{Math.min(visAntall, filtrert.length)}</b> av {filtrert.length}</>}</span>
        {harFilter && <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })} className="text-primary hover:underline inline-flex items-center gap-1"><X className="w-3.5 h-3.5" />Nullstill filtre</button>}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
      : filtrert.length === 0 ? <div className="card text-center py-12 text-sm text-gray-500 dark:text-gray-400">{harFilter ? 'Ingen kunder matcher filtrene.' : 'Ingen kunder registrert ennå.'}</div>
      : (
        <>
          <div className="hidden lg:block card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-dark-100 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <Th k="navn" sort={sort} dir={dir} onClick={sorterPa}>Kunde</Th>
                  <Th k="kundenr" sort={sort} dir={dir} onClick={sorterPa}>Kundenr.</Th>
                  <th className="px-3.5 py-2.5 text-left font-semibold">Kontaktperson</th>
                  <Th k="anlegg" sort={sort} dir={dir} onClick={sorterPa}>Anlegg</Th>
                  <Th k="opprettet" sort={sort} dir={dir} onClick={sorterPa}>Opprettet</Th>
                  <th className="w-px"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {synlig.map(r => (
                  <tr key={r.id} onClick={() => navigate(`/kunder/${r.id}`)} className={cn('group cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors', r.skjult && 'opacity-50')}>
                    <td className="px-3.5 py-2.5"><div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">{r.navn}<StatusBadge status={r.status} /></div><div className="text-xs text-gray-500 dark:text-gray-400">{[r.organisasjonsnummer ? `Org.nr. ${r.organisasjonsnummer}` : null, r.type].filter(Boolean).join(' · ')}</div></td>
                    <td className="px-3.5 py-2.5 tabular-nums text-gray-700 dark:text-gray-300">{r.kunde_nummer ?? <span className="text-yellow-700 dark:text-yellow-400 text-xs font-medium">Mangler</span>}</td>
                    <td className="px-3.5 py-2.5 text-gray-700 dark:text-gray-300">{r.kontaktperson?.navn ?? <span className="text-gray-400">–</span>}</td>
                    <td className="px-3.5 py-2.5"><span className={cn('inline-flex items-center gap-1.5 tabular-nums', r.antallAnlegg === 0 ? 'text-gray-400' : 'text-gray-900 dark:text-white')}><Building2 className="w-3.5 h-3.5 text-gray-400" />{r.antallAnlegg}</span></td>
                    <td className="px-3.5 py-2.5 text-gray-500 dark:text-gray-400 tabular-nums">{formatDate(r.opprettet)}</td>
                    <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                        <IconButton variant="ghost" label="Rediger" icon={<Edit />} onClick={() => navigate(`/kunder/${r.id}/rediger`)} className="w-8 h-8" />
                        <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                          <MenuItem icon={<PauseCircle />} onSelect={() => setStatusFor(r)}>Endre status…</MenuItem>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-2">
            {synlig.map(r => (
              <button key={r.id} type="button" onClick={() => navigate(`/kunder/${r.id}`)} className={cn('card !p-3 w-full flex gap-3 items-center text-left', r.skjult && 'opacity-50')}>
                <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4" /></span>
                <span className="flex-1 min-w-0"><span className="flex items-center gap-2 min-w-0"><span className="font-semibold text-gray-900 dark:text-white truncate">{r.navn}</span><StatusBadge status={r.status} /></span><span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{[r.kunde_nummer ? `Kundenr. ${r.kunde_nummer}` : 'Mangler kundenummer', r.kontaktperson?.navn].filter(Boolean).join(' · ')}</span></span>
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">{r.antallAnlegg} anlegg</span>
              </button>
            ))}
          </div>

          {harMer && (
            <div ref={merRef} className="py-3 text-center">
              <button type="button" onClick={visFlere} className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary inline-flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />Laster flere … ({visAntall} av {filtrert.length})
              </button>
            </div>
          )}
        </>
      )}

      {visNy && <NyKundeDialog onClose={() => setVisNy(false)} />}
      {statusFor && <KundeStatusDialog kundeId={statusFor.id} kundeNavn={statusFor.navn ?? ''} status={statusFor.status} onClose={() => setStatusFor(null)} onEndret={() => { setStatusFor(null); last() }} />}
    </div>
  )
}

function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={aktiv} className={cn('inline-flex items-center gap-2 h-[34px] px-3 rounded-full border text-sm whitespace-nowrap flex-shrink-0 transition-colors [&>b]:font-bold [&>b]:tabular-nums', aktiv ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500')}>{children}</button>
}

function Th({ k, sort, dir, onClick, children }: { k: SortKey; sort: SortKey; dir: 'asc' | 'desc'; onClick: (k: SortKey) => void; children: React.ReactNode }) {
  const aktiv = sort === k
  return <th className="px-3.5 py-2.5 text-left font-semibold"><button type="button" onClick={() => onClick(k)} className={cn('inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white', aktiv && 'text-gray-900 dark:text-white')}>{children}{aktiv ? (dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</button></th>
}
