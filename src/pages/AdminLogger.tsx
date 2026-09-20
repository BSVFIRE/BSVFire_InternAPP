import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { toast } from '@/lib/toast'
import { cn, formatDateTime } from '@/lib/utils'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import {
  Search, AlertCircle, AlertTriangle, Download, Trash2, RefreshCw, TestTube, MoreHorizontal, Sparkles,
  ChevronDown, ChevronRight, X, Users, Layers, List, Clock, ExternalLink, VolumeX,
} from 'lucide-react'

interface SystemLog {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data: unknown
  user_id: string | null
  user_email: string | null
  namespace: string | null
  page_url: string | null
  user_agent: string | null
  browser_info: unknown
  created_at: string
}

interface Gruppe {
  id: string
  melding: string
  nivaa: 'error' | 'warn'
  modul: string | null
  antall: number
  brukere: string[]
  sider: string[]
  forst: string
  sist: string
  logger: SystemLog[]
}

interface AiGruppe { id: string; tittel: string; alvorlighet: string; arsak: string; forslag: string; stoy?: boolean }
interface AiAnalyse { oppsummering: string; grupper: AiGruppe[] }

type Nivaa = 'alle' | 'error' | 'warn'
type Periode = 'dag' | 'uke' | 'maned' | 'alt'
type Visning = 'gruppert' | 'tidslinje'

const PERIODER: { key: Periode; label: string; timer: number | null }[] = [
  { key: 'dag', label: 'I dag', timer: 24 },
  { key: 'uke', label: '7 dager', timer: 24 * 7 },
  { key: 'maned', label: '30 dager', timer: 24 * 30 },
  { key: 'alt', label: 'Alt', timer: null },
]

const ALVOR: Record<string, string> = {
  kritisk: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  hoy: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  middels: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  lav: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30',
}
const ALVOR_TEKST: Record<string, string> = { kritisk: 'Kritisk', hoy: 'Høy', middels: 'Middels', lav: 'Lav' }
const ALVOR_REKKE: Record<string, number> = { kritisk: 0, hoy: 1, middels: 2, lav: 3 }

/** Gjør meldinger sammenlignbare: fjern id-er, tall, url-er og tidspunkt slik at samme feil havner i samme gruppe. */
function normaliser(melding: string): string {
  return melding
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}[^\s"]*/g, '<tid>')
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .slice(0, 300)
}

function side(url: string | null): string {
  if (!url) return ''
  try { return new URL(url).pathname } catch { return url }
}

function relativ(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'nå'
  if (min < 60) return `${min} min siden`
  const t = Math.round(min / 60)
  if (t < 24) return `${t} t siden`
  const d = Math.round(t / 24)
  if (d < 14) return `${d} d siden`
  return formatDateTime(iso)
}

export function AdminLogger() {
  const [params, setParams] = useSearchParams()
  const nivaa = (params.get('n') as Nivaa) || 'alle'
  const periode = (params.get('p') as Periode) || 'uke'
  const visning = (params.get('v') as Visning) || 'gruppert'
  const modul = params.get('m') || ''
  const bruker = params.get('b') || ''
  const sok = params.get('q') || ''

  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [valgt, setValgt] = useState<SystemLog | null>(null)
  const [apne, setApne] = useState<Set<string>>(new Set())
  const [aiLoading, setAiLoading] = useState(false)
  const [analyse, setAnalyse] = useState<AiAnalyse | null>(null)

  function setParam(k: string, v: string | null) {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v); else p.delete(k)
    setParams(p, { replace: true })
  }

  useEffect(() => { last() }, [periode]) // eslint-disable-line react-hooks/exhaustive-deps

  async function last() {
    setLoading(true)
    try {
      const timer = PERIODER.find(p => p.key === periode)?.timer
      let q = supabase.from('system_logs').select('*').in('level', ['error', 'warn']).order('timestamp', { ascending: false }).limit(2000)
      if (timer) q = q.gte('timestamp', new Date(Date.now() - timer * 3600 * 1000).toISOString())
      const { data, error } = await q
      if (error) throw error
      setLogs((data || []) as SystemLog[])
    } catch (e) {
      console.error('Feil ved lasting av logger:', e)
      toast.error('Kunne ikke laste loggen')
    } finally {
      setLoading(false)
    }
  }

  const moduler = useMemo(() => Array.from(new Set(logs.map(l => l.namespace).filter((n): n is string => !!n && n !== 'unknown'))).sort(), [logs])
  const brukere = useMemo(() => Array.from(new Set(logs.map(l => l.user_email).filter((e): e is string => !!e))).sort(), [logs])

  const filtrert = useMemo(() => {
    const s = sok.trim().toLowerCase()
    return logs.filter(l =>
      (nivaa === 'alle' || l.level === nivaa) &&
      (!modul || l.namespace === modul) &&
      (!bruker || l.user_email === bruker) &&
      (!s || l.message.toLowerCase().includes(s) || (l.page_url || '').toLowerCase().includes(s) || (l.user_email || '').toLowerCase().includes(s))
    )
  }, [logs, nivaa, modul, bruker, sok])

  const grupper = useMemo<Gruppe[]>(() => {
    const map = new Map<string, Gruppe>()
    for (const l of filtrert) {
      const key = `${l.level}|${normaliser(l.message)}`
      let g = map.get(key)
      if (!g) {
        g = { id: key, melding: l.message, nivaa: l.level as 'error' | 'warn', modul: l.namespace && l.namespace !== 'unknown' ? l.namespace : null, antall: 0, brukere: [], sider: [], forst: l.timestamp, sist: l.timestamp, logger: [] }
        map.set(key, g)
      }
      g.antall++
      g.logger.push(l)
      if (l.user_email && !g.brukere.includes(l.user_email)) g.brukere.push(l.user_email)
      const p = side(l.page_url)
      if (p && !g.sider.includes(p)) g.sider.push(p)
      if (l.timestamp < g.forst) g.forst = l.timestamp
      if (l.timestamp > g.sist) g.sist = l.timestamp
    }
    return Array.from(map.values()).sort((a, b) => b.antall - a.antall || b.sist.localeCompare(a.sist))
  }, [filtrert])

  const teller = useMemo(() => ({
    alle: logs.length,
    error: logs.filter(l => l.level === 'error').length,
    warn: logs.filter(l => l.level === 'warn').length,
    brukere: new Set(logs.map(l => l.user_email).filter(Boolean)).size,
  }), [logs])

  const aiPerGruppe = useMemo(() => new Map((analyse?.grupper || []).map(g => [g.id, g])), [analyse])

  function toggle(id: string) {
    setApne(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  async function analyser() {
    if (grupper.length === 0) { toast.info('Ingen feil å analysere i valgt periode'); return }
    setAiLoading(true)
    try {
      const payload = grupper.slice(0, 25).map(g => ({
        id: g.id, melding: g.melding, antall: g.antall, nivaa: g.nivaa, modul: g.modul, sider: g.sider, brukere: g.brukere.length,
        forst: g.forst, sist: g.sist,
        eksempelData: g.logger[0]?.data ? (typeof g.logger[0].data === 'string' ? g.logger[0].data : JSON.stringify(g.logger[0].data)) : null,
      }))
      const { data, error } = await supabase.functions.invoke('ai-analyser-logger', { body: { grupper: payload, periode: PERIODER.find(p => p.key === periode)?.label } })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setAnalyse(data as AiAnalyse)
      toast.success('Analysen er klar')
    } catch (e) {
      console.error('AI-analyse feilet', e)
      toast.error('Kunne ikke analysere loggen', e instanceof Error ? e.message : undefined)
    } finally {
      setAiLoading(false)
    }
  }

  async function ryddOpp() {
    if (!confirm('Slette gamle logger? Dette kan ikke angres.')) return
    const { error } = await supabase.rpc('cleanup_old_logs')
    if (error) { toast.error('Kunne ikke slette logger', error.message); return }
    toast.success('Gamle logger er slettet')
    last()
  }

  function testLogg() {
    logger.error('Test error fra Systemlogg', { testData: 'Dette er en test' })
    logger.warn('Test warning fra Systemlogg')
    toast.info('Testlogger sendt', 'Trykk Oppdater om noen sekunder.')
  }

  function eksporter() {
    const rader = filtrert.map(l => [l.timestamp, l.level, l.namespace || '', `"${l.message.replace(/"/g, '""')}"`, l.user_email || '', l.page_url || ''].join(','))
    const csv = [['Tidspunkt', 'Nivå', 'Modul', 'Melding', 'Bruker', 'Side'].join(','), ...rader].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = `systemlogg-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const harFilter = !!(sok || modul || bruker || nivaa !== 'alle')

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Systemlogg</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {loading ? 'Laster…' : <>{teller.error} feil og {teller.warn} advarsler fra {teller.brukere} {teller.brukere === 1 ? 'bruker' : 'brukere'} – gruppert etter hva som skjer oftest.</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={analyser} loading={aiLoading} disabled={loading || grupper.length === 0} icon={<Sparkles />}>
            <span className="hidden sm:inline">Analyser med AI</span><span className="sm:hidden">Analyser</span>
          </Button>
          <IconButton label="Oppdater" icon={<RefreshCw className={cn(loading && 'animate-spin')} />} onClick={last} />
          <DropdownMenu trigger={() => <IconButton label="Flere valg" icon={<MoreHorizontal />} />}>
            <MenuItem icon={<Download className="w-4 h-4" />} onSelect={eksporter}>Eksporter CSV ({filtrert.length})</MenuItem>
            <MenuItem icon={<TestTube className="w-4 h-4" />} onSelect={testLogg}>Send testlogg</MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Trash2 className="w-4 h-4" />} onSelect={ryddOpp} danger>Rydd opp gamle logger</MenuItem>
          </DropdownMenu>
        </div>
      </header>

      {/* Filtre */}
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          <Chip aktiv={nivaa === 'alle'} onClick={() => setParam('n', null)}>Alle <b>{teller.alle}</b></Chip>
          <Chip aktiv={nivaa === 'error'} onClick={() => setParam('n', 'error')}><AlertCircle className="w-3.5 h-3.5 text-red-500" />Feil <b>{teller.error}</b></Chip>
          <Chip aktiv={nivaa === 'warn'} onClick={() => setParam('n', 'warn')}><AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />Advarsler <b>{teller.warn}</b></Chip>
          <span className="w-px bg-gray-200 dark:bg-gray-800 mx-1 self-stretch flex-shrink-0" />
          {PERIODER.map(p => <Chip key={p.key} aktiv={periode === p.key} onClick={() => setParam('p', p.key === 'uke' ? null : p.key)}>{p.label}</Chip>)}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="search" value={sok} onChange={e => setParam('q', e.target.value || null)} placeholder="Søk i melding, side eller bruker…" className="input pl-9 w-full" />
          </div>
          <select value={modul} onChange={e => setParam('m', e.target.value || null)} className="input sm:w-44" aria-label="Modul">
            <option value="">Alle moduler</option>
            {moduler.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={bruker} onChange={e => setParam('b', e.target.value || null)} className="input sm:w-56" aria-label="Bruker">
            <option value="">Alle brukere</option>
            {brukere.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden self-start sm:self-auto">
            <button type="button" onClick={() => setParam('v', null)} aria-pressed={visning === 'gruppert'} className={cn('h-11 sm:h-9 px-3 text-sm inline-flex items-center gap-1.5', visning === 'gruppert' ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-100')}><Layers className="w-4 h-4" />Gruppert</button>
            <button type="button" onClick={() => setParam('v', 'tidslinje')} aria-pressed={visning === 'tidslinje'} className={cn('h-11 sm:h-9 px-3 text-sm inline-flex items-center gap-1.5 border-l border-gray-300 dark:border-gray-700', visning === 'tidslinje' ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-100')}><List className="w-4 h-4" />Tidslinje</button>
          </div>
        </div>
      </div>

      {/* AI-analyse */}
      {analyse && (
        <section className="card border-purple-300 dark:border-purple-800 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500" />AI-analyse av {analyse.grupper.length} feilgrupper</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 max-w-3xl">{analyse.oppsummering}</p>
            </div>
            <IconButton label="Lukk analysen" variant="ghost" icon={<X />} onClick={() => setAnalyse(null)} />
          </div>
          <ol className="divide-y divide-gray-200 dark:divide-gray-800 -mx-4 sm:-mx-6">
            {[...analyse.grupper].sort((a, b) => (a.stoy ? 1 : 0) - (b.stoy ? 1 : 0) || (ALVOR_REKKE[a.alvorlighet] ?? 9) - (ALVOR_REKKE[b.alvorlighet] ?? 9)).map(g => {
              const gruppe = grupper.find(x => x.id === g.id)
              return (
                <li key={g.id} className={cn('px-4 sm:px-6 py-3 space-y-1.5', g.stoy && 'opacity-60')}>
                  <div className="flex flex-wrap items-center gap-2">
                    {g.stoy
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium bg-gray-500/10 text-gray-500 border-gray-500/30"><VolumeX className="w-3 h-3" />Støy</span>
                      : <span className={cn('px-2 py-0.5 rounded-full border text-xs font-medium', ALVOR[g.alvorlighet] || ALVOR.lav)}>{ALVOR_TEKST[g.alvorlighet] || g.alvorlighet}</span>}
                    <span className="font-medium text-gray-900 dark:text-white">{g.tittel}</span>
                    {gruppe && <span className="text-xs text-gray-500 tabular-nums">{gruppe.antall} × · {gruppe.brukere.length} brukere</span>}
                    {gruppe && <button type="button" onClick={() => { setParam('v', null); setApne(prev => new Set(prev).add(g.id)); document.getElementById(`gruppe-${cssId(g.id)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }} className="text-xs text-primary hover:underline">Vis i loggen</button>}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300"><span className="text-gray-500">Årsak:</span> {g.arsak}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300"><span className="text-gray-500">Forslag:</span> {g.forslag}</p>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {/* Innhold */}
      {loading ? (
        <div className="card py-12 text-center text-sm text-gray-500">Laster loggen…</div>
      ) : filtrert.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{harFilter ? 'Ingen logger passer filtrene.' : 'Ingen feil eller advarsler i perioden.'}</p>
          {harFilter && <Button variant="ghost" className="mt-2" onClick={() => setParams(new URLSearchParams(periode !== 'uke' ? { p: periode } : {}), { replace: true })}>Nullstill filtre</Button>}
        </div>
      ) : visning === 'gruppert' ? (
        <div className="card p-0 overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_9rem_5rem_5rem_9rem] gap-3 px-4 py-2 text-xs font-semibold text-gray-500 border-b border-gray-200 dark:border-gray-800">
            <span>Melding</span><span>Modul</span><span className="text-right">Antall</span><span className="text-right">Brukere</span><span className="text-right">Sist</span>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {grupper.map(g => {
              const apen = apne.has(g.id)
              const ai = aiPerGruppe.get(g.id)
              return (
                <li key={g.id} id={`gruppe-${cssId(g.id)}`}>
                  <button type="button" onClick={() => toggle(g.id)} className="w-full text-left px-4 py-3 md:grid md:grid-cols-[1fr_9rem_5rem_5rem_9rem] md:gap-3 md:items-center hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors">
                    <div className="flex items-start gap-2 min-w-0">
                      {apen ? <ChevronDown className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />}
                      {g.nivaa === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-500 flex-shrink-0" />}
                      <div className="min-w-0">
                        {ai && <span className={cn('inline-block mb-0.5 mr-2 px-1.5 py-px rounded border text-[11px] font-medium', ai.stoy ? 'bg-gray-500/10 text-gray-500 border-gray-500/30' : (ALVOR[ai.alvorlighet] || ALVOR.lav))}>{ai.stoy ? 'Støy' : ai.tittel}</span>}
                        <p className={cn('text-sm text-gray-900 dark:text-white break-words', !apen && 'line-clamp-2')}>{g.melding}</p>
                        <p className="md:hidden text-xs text-gray-500 mt-1 tabular-nums">{g.antall} × · {g.brukere.length} {g.brukere.length === 1 ? 'bruker' : 'brukere'} · {relativ(g.sist)}{g.modul && ` · ${g.modul}`}</p>
                      </div>
                    </div>
                    <span className="hidden md:block text-sm text-gray-600 dark:text-gray-400 truncate">{g.modul || '–'}</span>
                    <span className="hidden md:block text-sm font-semibold text-right tabular-nums text-gray-900 dark:text-white">{g.antall}</span>
                    <span className="hidden md:inline-flex items-center justify-end gap-1 text-sm text-gray-600 dark:text-gray-400 tabular-nums"><Users className="w-3.5 h-3.5" />{g.brukere.length}</span>
                    <span className="hidden md:block text-sm text-gray-600 dark:text-gray-400 text-right whitespace-nowrap">{relativ(g.sist)}</span>
                  </button>
                  {apen && (
                    <div className="px-4 pb-4 pt-1 bg-gray-50/60 dark:bg-dark-100/40 space-y-3 border-t border-gray-100 dark:border-gray-800">
                      {ai && (
                        <div className="rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-900/10 p-3 text-sm space-y-1">
                          <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-500">Årsak:</span> {ai.arsak}</p>
                          <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-500">Forslag:</span> {ai.forslag}</p>
                        </div>
                      )}
                      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                        <div><dt className="text-xs text-gray-500">Første gang</dt><dd className="text-gray-900 dark:text-white">{formatDateTime(g.forst)}</dd></div>
                        <div><dt className="text-xs text-gray-500">Sist</dt><dd className="text-gray-900 dark:text-white">{formatDateTime(g.sist)}</dd></div>
                        <div><dt className="text-xs text-gray-500">Brukere</dt><dd className="text-gray-900 dark:text-white truncate" title={g.brukere.join(', ')}>{g.brukere.length ? g.brukere.map(b => b.split('@')[0]).join(', ') : '–'}</dd></div>
                        <div><dt className="text-xs text-gray-500">Sider</dt><dd className="text-gray-900 dark:text-white truncate" title={g.sider.join(', ')}>{g.sider.slice(0, 3).join(', ') || '–'}{g.sider.length > 3 && ` +${g.sider.length - 3}`}</dd></div>
                      </dl>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Siste forekomster</p>
                        <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-50">
                          {g.logger.slice(0, 8).map(l => (
                            <li key={l.id}>
                              <button type="button" onClick={() => setValgt(l)} className="w-full text-left px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs hover:bg-gray-50 dark:hover:bg-dark-100">
                                <span className="inline-flex items-center gap-1 text-gray-500 tabular-nums"><Clock className="w-3 h-3" />{formatDateTime(l.timestamp)}</span>
                                <span className="text-gray-700 dark:text-gray-300">{l.user_email?.split('@')[0] || 'ukjent'}</span>
                                <span className="text-gray-500 truncate max-w-[16rem]">{side(l.page_url)}</span>
                                <span className="ml-auto text-primary">Detaljer</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                        {g.logger.length > 8 && <p className="text-xs text-gray-500 mt-1">+ {g.logger.length - 8} til</p>}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {filtrert.slice(0, 500).map(l => (
              <li key={l.id}>
                <button type="button" onClick={() => setValgt(l)} className="w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors">
                  {l.level === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-500 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 dark:text-white line-clamp-2 break-words">{l.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5 tabular-nums">{formatDateTime(l.timestamp)} · {l.user_email?.split('@')[0] || 'ukjent'}{l.namespace && l.namespace !== 'unknown' && ` · ${l.namespace}`}{l.page_url && ` · ${side(l.page_url)}`}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {filtrert.length > 500 && <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-800">Viser 500 av {filtrert.length}. Bruk filtrene for å se resten.</p>}
        </div>
      )}

      {/* Detaljer */}
      {valgt && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setValgt(null)}>
          <div className="bg-white dark:bg-dark-50 w-full sm:max-w-3xl sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-dark-50 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {valgt.level === 'error' ? <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />}
                <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">{valgt.level === 'error' ? 'Feil' : 'Advarsel'} · {formatDateTime(valgt.timestamp)}</h2>
              </div>
              <IconButton label="Lukk" variant="ghost" icon={<X />} onClick={() => setValgt(null)} />
            </div>
            <div className="px-4 sm:px-6 py-4 space-y-4">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-dark-100 rounded-lg p-3">{valgt.message}</pre>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><dt className="text-xs text-gray-500">Bruker</dt><dd className="text-gray-900 dark:text-white">{valgt.user_email || '–'}</dd></div>
                <div><dt className="text-xs text-gray-500">Modul</dt><dd className="text-gray-900 dark:text-white">{valgt.namespace && valgt.namespace !== 'unknown' ? valgt.namespace : '–'}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-gray-500">Side</dt><dd className="text-gray-900 dark:text-white break-all">{valgt.page_url ? <a href={valgt.page_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">{valgt.page_url}<ExternalLink className="w-3 h-3" /></a> : '–'}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-gray-500">Nettleser</dt><dd className="text-gray-700 dark:text-gray-300 text-xs break-all">{valgt.user_agent || '–'}</dd></div>
              </dl>
              {!!valgt.data && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Ekstra data</p>
                  <pre className="bg-gray-50 dark:bg-dark-100 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto max-h-80">{pen(valgt.data)}</pre>
                </div>
              )}
              {!!valgt.browser_info && (
                <details>
                  <summary className="text-xs font-semibold text-gray-500 cursor-pointer">Nettleserinfo</summary>
                  <pre className="mt-1 bg-gray-50 dark:bg-dark-100 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">{pen(valgt.browser_info)}</pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function pen(v: unknown): string {
  if (typeof v === 'string') {
    try { return JSON.stringify(JSON.parse(v), null, 2) } catch { return v }
  }
  return JSON.stringify(v, null, 2)
}

function cssId(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={aktiv} className={cn('inline-flex items-center gap-1.5 h-[34px] px-3 rounded-full border text-sm whitespace-nowrap flex-shrink-0 transition-colors [&>b]:font-bold [&>b]:tabular-nums', aktiv ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500')}>{children}</button>
}
