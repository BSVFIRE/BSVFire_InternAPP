/**
 * Kontaktpersoner (/kontaktpersoner) – samme oppsett som kunde- og anleggslisten.
 * Chips som teller og filtrerer, søk i URL, klikkbare rader, 25 om gangen.
 */
import { useUendeligListe } from '@/hooks/useUendeligListe'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Building2, Edit, Loader2, Mail, Merge, MoreHorizontal, Phone, Plus, Search, Star, Trash2, X } from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { NyKontaktDialog } from './NyKontaktDialog'
import { initialer } from './kontaktSkjema'
import { slettKontaktperson } from './slettKontakt'
import { SlaSammenDialog, type SammenslaingRad } from './SlaSammenDialog'

const log = createLogger('KontaktListe')
const SIDE = 25

type Rad = Pick<Tables<'kontaktpersoner'>, 'id' | 'navn' | 'epost' | 'telefon' | 'rolle' | 'created_at' | 'anlegg_id'> & {
  anlegg: { id: string; navn: string; primar: boolean }[]
  kunder: string[]
  duplikat: boolean
  /** Nøkkel som samler kort som trolig er samme person */
  gruppe: string | null
}
type Chip = 'alle' | 'uten_anlegg' | 'kundekontakt' | 'mangler' | 'duplikater'
type SortKey = 'navn' | 'rolle' | 'anlegg'

export default function KontaktListe() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const [rader, setRader] = useState<Rad[]>([])
  const [loading, setLoading] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)
  const [visNy, setVisNy] = useState(false)
  const [slaSammen, setSlaSammen] = useState<Rad[] | null>(null)
  const sokRef = useRef<HTMLInputElement>(null)

  const q = params.get('q') ?? ''
  const chip = (params.get('f') as Chip) || 'alle'
  const sort = (params.get('sort') as SortKey) || 'navn'
  const dir = params.get('dir') === 'desc' ? 'desc' : 'asc'
  const setParam = useCallback((key: string, value: string | null) => {
    const p = new URLSearchParams(params); if (value) p.set(key, value); else p.delete(key)
    setParams(p, { replace: true })
  }, [params, setParams])

  // Gamle innganger: ?view=, ?search=, state.selectedKontaktId
  useEffect(() => {
    const s = location.state as { selectedKontaktId?: string } | null
    const view = params.get('view') ?? s?.selectedKontaktId
    if (view) { navigate(`/kontaktpersoner/${view}`, { replace: true }); return }
    const gammeltSok = params.get('search')
    if (gammeltSok !== null) { const p = new URLSearchParams(params); p.delete('search'); if (gammeltSok) p.set('q', gammeltSok); setParams(p, { replace: true }) }
  }, [location.state, params, navigate, setParams])

  const last = useCallback(async () => {
    try {
      setFeil(null)
      const [k, kob, ku] = await Promise.all([
        db.from('kontaktpersoner').select('id, navn, epost, telefon, rolle, created_at, anlegg_id').order('navn'),
        db.from('anlegg_kontaktpersoner').select('kontaktperson_id, primar, anlegg:anlegg_id(id, anleggsnavn, skjult)'),
        db.from('customer').select('navn, kontaktperson_id').not('kontaktperson_id', 'is', null),
      ])
      if (k.error) throw k.error
      if (kob.error) throw kob.error
      const anleggMap = new Map<string, Rad['anlegg']>()
      for (const x of kob.data ?? []) {
        const a = x.anlegg as { id: string; anleggsnavn: string | null; skjult: boolean | null } | null
        if (!x.kontaktperson_id || !a || a.skjult) continue
        const l = anleggMap.get(x.kontaktperson_id) ?? []; l.push({ id: a.id, navn: a.anleggsnavn ?? 'Anlegg', primar: Boolean(x.primar) }); anleggMap.set(x.kontaktperson_id, l)
      }
      const kundeMap = new Map<string, string[]>()
      for (const x of ku.data ?? []) if (x.kontaktperson_id) kundeMap.set(x.kontaktperson_id, [...(kundeMap.get(x.kontaktperson_id) ?? []), x.navn ?? 'Kunde'])
      // Mulige duplikater: samme navn (normalisert) eller samme e-post
      const nokler = new Map<string, number>()
      const nokkel = (r: { navn: string | null; epost: string | null }) => [r.navn?.trim().toLowerCase().replace(/\s+/g, ' ') || null, r.epost?.trim().toLowerCase() || null]
      for (const r of k.data ?? []) for (const n of nokkel(r)) if (n) nokler.set(n, (nokler.get(n) ?? 0) + 1)
      setRader((k.data ?? []).map(r => ({
        ...r,
        anlegg: (anleggMap.get(r.id) ?? []).sort((a, b) => Number(b.primar) - Number(a.primar) || a.navn.localeCompare(b.navn, 'nb-NO')),
        kunder: kundeMap.get(r.id) ?? [],
        duplikat: nokkel(r).some(n => n && (nokler.get(n) ?? 0) > 1),
        gruppe: nokkel(r).find(n => n && (nokler.get(n) ?? 0) > 1) ?? null,
      })))
    } catch (err) {
      log.error('Kunne ikke laste kontaktpersoner', { error: err })
      setFeil(err instanceof Error ? err.message : 'Kunne ikke laste kontaktpersoner')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { last() }, [last])

  useEffect(() => {
    function tast(e: KeyboardEvent) { if (e.key !== '/' || (e.target as HTMLElement).closest('input, textarea, select')) return; e.preventDefault(); sokRef.current?.focus() }
    document.addEventListener('keydown', tast); return () => document.removeEventListener('keydown', tast)
  }, [])

  const teller = useMemo(() => ({
    alle: rader.length,
    uten_anlegg: rader.filter(r => r.anlegg.length === 0 && r.kunder.length === 0).length,
    kundekontakt: rader.filter(r => r.kunder.length > 0).length,
    mangler: rader.filter(r => !r.epost || !r.telefon).length,
    duplikater: rader.filter(r => r.duplikat).length,
  }), [rader])

  const filtrert = useMemo(() => {
    const s = q.trim().toLowerCase()
    const liste = rader.filter(r => {
      if (chip === 'uten_anlegg' && (r.anlegg.length > 0 || r.kunder.length > 0)) return false
      if (chip === 'kundekontakt' && r.kunder.length === 0) return false
      if (chip === 'mangler' && r.epost && r.telefon) return false
      if (chip === 'duplikater' && !r.duplikat) return false
      if (!s) return true
      return [r.navn, r.epost, r.telefon?.replace(/\s/g, ''), r.rolle, ...r.anlegg.map(a => a.navn), ...r.kunder].some(v => v?.toLowerCase().includes(s.replace(/\s/g, '')) || v?.toLowerCase().includes(s))
    })
    const cmp = (x: string | null | undefined, y: string | null | undefined) => (x ?? '').localeCompare(y ?? '', 'nb-NO')
    return [...liste].sort((a, b) => {
      let r = 0
      switch (sort) {
        case 'navn': r = cmp(a.navn, b.navn); break
        case 'rolle': r = cmp(a.rolle, b.rolle) || cmp(a.navn, b.navn); break
        case 'anlegg': r = a.anlegg.length - b.anlegg.length || cmp(a.navn, b.navn); break
      }
      return dir === 'desc' ? -r : r
    })
  }, [rader, q, chip, sort, dir])

  const { synlig, merRef, harMer, visAntall, visFlere } = useUendeligListe(filtrert, SIDE)
  const harFilter = Boolean(q || chip !== 'alle')

  function sorterPa(key: SortKey) {
    if (sort === key) setParam('dir', dir === 'asc' ? 'desc' : 'asc')
    else { const p = new URLSearchParams(params); p.set('sort', key); p.delete('dir'); setParams(p, { replace: true }) }
  }
  async function slett(r: Rad) {
    if (await slettKontaktperson(r.id, r.navn ?? '', { anlegg: r.anlegg.length, kunder: r.kunder.length })) last()
  }

  if (feil) {
    return <div className="card bg-red-900/20 border-red-800 flex items-start gap-3"><AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" /><div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste kontaktpersoner</h2><p className="text-sm text-red-300 mb-3">{feil}</p><Button variant="primary" onClick={last}>Prøv igjen</Button></div></div>
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Kontaktpersoner</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{loading ? 'Laster…' : `${rader.length} personer · ${rader.length - teller.uten_anlegg} knyttet til anlegg eller kunde`}</p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => setVisNy(true)}><span className="hidden sm:inline">Ny kontaktperson</span></Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <label htmlFor="kontakt-sok" className="sr-only">Søk</label>
        <input id="kontakt-sok" ref={sokRef} type="search" value={q} onChange={e => setParam('q', e.target.value)} placeholder="Søk på navn, telefon, e-post, rolle, anlegg eller kunde…" className="input pl-9 !min-h-[38px] !h-[38px]" />
        <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono px-1.5 border border-gray-300 dark:border-gray-700 rounded text-gray-400">/</kbd>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1" role="group" aria-label="Filter">
        <Chip aktiv={chip === 'alle'} onClick={() => setParam('f', null)}>Alle <b>{teller.alle}</b></Chip>
        <Chip aktiv={chip === 'kundekontakt'} onClick={() => setParam('f', 'kundekontakt')}>Kundekontakt <b>{teller.kundekontakt}</b></Chip>
        <Chip aktiv={chip === 'uten_anlegg'} onClick={() => setParam('f', 'uten_anlegg')}>Ikke knyttet til noe <b>{teller.uten_anlegg}</b></Chip>
        <Chip aktiv={chip === 'mangler'} onClick={() => setParam('f', 'mangler')}>Mangler telefon/e-post <b>{teller.mangler}</b></Chip>
        {teller.duplikater > 0 && <Chip aktiv={chip === 'duplikater'} onClick={() => setParam('f', 'duplikater')}>Samme person, flere kort <b>{teller.duplikater}</b></Chip>}
      </div>

      {chip === 'duplikater' && <p className="text-sm text-gray-600 dark:text-gray-400 -mt-1">Kort med samme navn eller e-post. En person skal ha <b>ett</b> kort som er knyttet til alle sine anlegg – trykk på «n kort» for å slå dem sammen.</p>}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{loading ? '' : <>Viser <b className="text-gray-900 dark:text-white tabular-nums">{Math.min(visAntall, filtrert.length)}</b> av {filtrert.length}</>}</span>
        {harFilter && <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })} className="text-primary hover:underline inline-flex items-center gap-1"><X className="w-3.5 h-3.5" />Nullstill filtre</button>}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
      : filtrert.length === 0 ? <div className="card text-center py-12 text-sm text-gray-500 dark:text-gray-400">{harFilter ? 'Ingen kontaktpersoner matcher filtrene.' : 'Ingen kontaktpersoner registrert ennå.'}</div>
      : (
        <>
          <div className="hidden lg:block card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-dark-100 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <Th k="navn" sort={sort} dir={dir} onClick={sorterPa}>Person</Th>
                  <Th k="rolle" sort={sort} dir={dir} onClick={sorterPa}>Rolle</Th>
                  <th className="px-3.5 py-2.5 text-left font-semibold">Telefon</th>
                  <th className="px-3.5 py-2.5 text-left font-semibold">E-post</th>
                  <Th k="anlegg" sort={sort} dir={dir} onClick={sorterPa}>Anlegg / kunde</Th>
                  <th className="w-px"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {synlig.map(r => (
                  <tr key={r.id} onClick={() => navigate(`/kontaktpersoner/${r.id}`)} className="group cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-900 dark:text-white text-[11px] font-semibold flex items-center justify-center flex-shrink-0">{initialer(r.navn)}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{r.navn}{r.duplikat && <button type="button" onClick={e => { e.stopPropagation(); setSlaSammen(rader.filter(x => x.gruppe && x.gruppe === r.gruppe)) }} title="Flere kort for samme person – slå sammen" className="ml-2 text-[11px] font-medium px-1.5 py-px rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-200 inline-flex items-center gap-1"><Merge className="w-3 h-3" />{rader.filter(x => x.gruppe && x.gruppe === r.gruppe).length} kort</button>}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-gray-700 dark:text-gray-300">{r.rolle ?? <span className="text-gray-400">–</span>}</td>
                    <td className="px-3.5 py-2.5 tabular-nums" onClick={e => e.stopPropagation()}>{r.telefon ? <a href={`tel:${r.telefon}`} className="text-gray-700 dark:text-gray-300 hover:text-primary">{r.telefon}</a> : <span className="text-gray-400">–</span>}</td>
                    <td className="px-3.5 py-2.5" onClick={e => e.stopPropagation()}>{r.epost ? <a href={`mailto:${r.epost}`} className="text-gray-700 dark:text-gray-300 hover:text-primary truncate block max-w-[240px]">{r.epost}</a> : <span className="text-gray-400">–</span>}</td>
                    <td className="px-3.5 py-2.5 text-gray-700 dark:text-gray-300"><Tilknytning r={r} /></td>
                    <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                        <IconButton variant="ghost" label="Rediger" icon={<Edit />} onClick={() => navigate(`/kontaktpersoner/${r.id}/rediger`)} className="w-8 h-8" />
                        <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                          {r.duplikat && <MenuItem icon={<Merge />} onSelect={() => setSlaSammen(rader.filter(x => x.gruppe && x.gruppe === r.gruppe))}>Slå sammen kortene…</MenuItem>}
                          <MenuItem icon={<Trash2 />} danger onSelect={() => slett(r)}>Slett kontaktperson…</MenuItem>
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
              <div key={r.id} className="card !p-3 flex gap-3 items-center">
                <button type="button" onClick={() => navigate(`/kontaktpersoner/${r.id}`)} className="flex-1 min-w-0 flex gap-3 items-center text-left">
                  <span className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-900 dark:text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">{initialer(r.navn)}</span>
                  <span className="flex-1 min-w-0"><span className="block font-semibold text-gray-900 dark:text-white truncate">{r.navn}</span><span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{[r.rolle, r.anlegg[0]?.navn ?? r.kunder[0]].filter(Boolean).join(' · ') || 'Ikke knyttet til noe'}{r.anlegg.length > 1 ? ` +${r.anlegg.length - 1}` : ''}</span></span>
                </button>
                {r.telefon && <a href={`tel:${r.telefon}`} aria-label={`Ring ${r.navn}`} className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 hover:text-primary flex items-center justify-center flex-shrink-0"><Phone className="w-4 h-4" /></a>}
                {r.epost && <a href={`mailto:${r.epost}`} aria-label={`E-post til ${r.navn}`} className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 hover:text-primary flex items-center justify-center flex-shrink-0"><Mail className="w-4 h-4" /></a>}
              </div>
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

      {visNy && <NyKontaktDialog onClose={() => setVisNy(false)} />}
      {slaSammen && <SlaSammenDialog rader={slaSammen as SammenslaingRad[]} onClose={() => setSlaSammen(null)} onFerdig={last} />}
    </div>
  )
}

/** «Anleggsnavn ★ +2 · Kunde AS» */
function Tilknytning({ r }: { r: Rad }) {
  if (r.anlegg.length === 0 && r.kunder.length === 0) return <span className="text-gray-400">Ikke knyttet</span>
  const a = r.anlegg[0]
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {a && <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-gray-400" />{a.navn}{a.primar && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" aria-label="Primærkontakt" />}</span>}
      {r.anlegg.length > 1 && <span className="text-xs text-gray-500 dark:text-gray-400">+{r.anlegg.length - 1}</span>}
      {r.kunder.length > 0 && <span className="text-xs px-1.5 py-px rounded bg-primary/10 text-primary font-medium">{r.kunder.length === 1 ? r.kunder[0] : `${r.kunder.length} kunder`}</span>}
    </span>
  )
}

function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={aktiv} className={cn('inline-flex items-center gap-2 h-[34px] px-3 rounded-full border text-sm whitespace-nowrap flex-shrink-0 transition-colors [&>b]:font-bold [&>b]:tabular-nums', aktiv ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500')}>{children}</button>
}

function Th({ k, sort, dir, onClick, children }: { k: SortKey; sort: SortKey; dir: 'asc' | 'desc'; onClick: (k: SortKey) => void; children: React.ReactNode }) {
  const aktiv = sort === k
  return <th className="px-3.5 py-2.5 text-left font-semibold"><button type="button" onClick={() => onClick(k)} className={cn('inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white', aktiv && 'text-gray-900 dark:text-white')}>{children}{aktiv ? (dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</button></th>
}
