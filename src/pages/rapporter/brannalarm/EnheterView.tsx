/**
 * Brannalarm – enheter og styringer på anlegget.
 * Viser bare det som finnes på anlegget, i sammenleggbare seksjoner. «Legg til» åpner en dialog
 * med enhetstype/styring → type/modell (forslag fra andre anlegg) → antall. Alt lagres fortløpende.
 *
 * Datamodell (én rad i anleggsdata_brannalarm per anlegg):
 *   enheter:   {key}_aktiv, {key}_antall (sum), {key}_type (JSON-array av {type, antall}), {key}_note
 *   styringer: {key}_aktiv, {key}_antall, {key}_status (Kontrollert/Ikke aktuelt/Ikke tilkomst), {key}_note,
 *              {key}_har_avvik, {key}_avvik (JSON-array av tekster)
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRightLeft, ListChecks as ListIkon, ArrowUpDown, BatteryCharging, BellRing, Blinds, Camera, Check, ChevronDown, CircleDot, Cpu, DoorOpen, Droplets, Eye, Fan, FileText, Flame, Hand, KeyRound, LayoutPanelTop, Link2, ListChecks, Lock, Minus, MoreHorizontal, Music, Plug, Plus, Radio, Ruler, ScanSearch, Search, StickyNote, Thermometer, Timer, Trash2, Volume2, Wind, X, Zap, type LucideIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useOfflineQueue } from '@/hooks/useOffline'
import { useNavigate } from 'react-router-dom'
import { tellDetektorliste, type DetektorlisteTelling } from '@/lib/detektorliste'
import { formatDate } from '@/lib/utils'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import type { BrannalarmStyring } from '../Brannalarm'

interface EnheterViewProps {
  anleggId: string
  anleggsNavn: string
  enheter: BrannalarmStyring | null
  onBack: () => void
  onSave: (anleggId: string) => void
}

export const ENHETSTYPER: { key: string; navn: string; icon: LucideIcon; kategori: string }[] = [
  { key: 'brannsentral', navn: 'Brannsentral', icon: Cpu, kategori: 'Sentral og styring' },
  { key: 'panel', navn: 'Brannpanel', icon: LayoutPanelTop, kategori: 'Sentral og styring' },
  { key: 'kraftforsyning', navn: 'Kraftforsyning', icon: Zap, kategori: 'Sentral og styring' },
  { key: 'batteri', navn: 'Batteri', icon: BatteryCharging, kategori: 'Sentral og styring' },
  { key: 'sloyfer', navn: 'Sløyfer', icon: Link2, kategori: 'Sentral og styring' },
  { key: 'io', navn: 'IO-styring', icon: Plug, kategori: 'Sentral og styring' },
  { key: 'rd', navn: 'Røykdetektor', icon: ScanSearch, kategori: 'Detektorer' },
  { key: 'vd', navn: 'Varmedetektor', icon: Thermometer, kategori: 'Detektorer' },
  { key: 'multi', navn: 'Multikriteriedetektor', icon: ScanSearch, kategori: 'Detektorer' },
  { key: 'flame', navn: 'Flammedetektor', icon: Flame, kategori: 'Detektorer' },
  { key: 'linje', navn: 'Linjedetektor', icon: Ruler, kategori: 'Detektorer' },
  { key: 'asp', navn: 'Aspirasjon', icon: Wind, kategori: 'Detektorer' },
  { key: 'mm', navn: 'Manuell melder', icon: Hand, kategori: 'Detektorer' },
  { key: 'traadlos', navn: 'Trådløse enheter', icon: Radio, kategori: 'Detektorer' },
  { key: 'sprinkler', navn: 'Sprinklerkontroll', icon: Droplets, kategori: 'Styring og slokning' },
  { key: 'avstiller', navn: 'Avstillingsbryter', icon: CircleDot, kategori: 'Styring og slokning' },
  { key: 'brannklokke', navn: 'Brannklokke', icon: BellRing, kategori: 'Varsling' },
  { key: 'sirene', navn: 'Sirene', icon: Volume2, kategori: 'Varsling' },
  { key: 'optisk', navn: 'Optisk varsling', icon: Eye, kategori: 'Varsling' },
  { key: 'annet', navn: 'Annet', icon: FileText, kategori: 'Annet' },
]
type EnhetKey = string
const KATEGORIER = Array.from(new Set(ENHETSTYPER.map(e => e.kategori)))

export const STYRINGER: { key: string; navn: string; icon: LucideIcon }[] = [
  { key: 'ovrige', navn: 'Øvrige styringer', icon: ListChecks },
  { key: 'adgang', navn: 'Adgangskontroll', icon: KeyRound },
  { key: 'slukke', navn: 'Slukkeanlegg', icon: Droplets },
  { key: 'klokke', navn: 'Klokkekurser', icon: Timer },
  { key: 'flash_blitz', navn: 'Flash/Blitz', icon: Zap },
  { key: 'port', navn: 'Port', icon: DoorOpen },
  { key: 'spjaeld', navn: 'Brannspjeld', icon: Fan },
  { key: 'overvaking', navn: 'Overvåking', icon: Camera },
  { key: 'musikk', navn: 'Musikkmuting', icon: Music },
  { key: 'gardin', navn: 'Branngardin', icon: Blinds },
  { key: 'dorstyring', navn: 'Dørstyring', icon: DoorOpen },
  { key: 'royklukker', navn: 'Røykluker', icon: Wind },
  { key: 'vent', navn: 'Ventilasjonsanlegg', icon: Fan },
  { key: 'sd', navn: 'SD-anlegg', icon: Plug },
  { key: 'heis', navn: 'Heisstyringer', icon: ArrowUpDown },
  { key: 'safe', navn: 'Nøkkelsafe', icon: Lock },
]
const STYRING_STATUSER = ['Kontrollert', 'Ikke aktuelt', 'Ikke tilkomst'] as const
const STYRING_KAT = 'Styringer'

export interface Styring { aktiv: boolean; antall: number; status: string; note: string; avvik: string[] }

export function lesStyringer(rad: BrannalarmStyring | null): Record<string, Styring> {
  const r = (rad ?? {}) as Record<string, unknown>
  const ut: Record<string, Styring> = {}
  for (const { key } of STYRINGER) {
    let avvik: string[] = []
    const raw = r[`${key}_avvik`]
    if (typeof raw === 'string' && raw) { try { avvik = JSON.parse(raw) } catch { avvik = [raw] } }
    ut[key] = { aktiv: Boolean(r[`${key}_aktiv`]), antall: Number(r[`${key}_antall`] ?? 0) || 0, status: String(r[`${key}_status`] ?? ''), note: String(r[`${key}_note`] ?? ''), avvik }
  }
  return ut
}
export function styringTilKolonner(key: string, s: Styring): Record<string, unknown> {
  return { [`${key}_aktiv`]: s.aktiv, [`${key}_antall`]: s.antall, [`${key}_status`]: s.status, [`${key}_note`]: s.note, [`${key}_har_avvik`]: s.avvik.length > 0, [`${key}_avvik`]: JSON.stringify(s.avvik) }
}

const LUKKET_KEY = 'brannalarm_enheter_lukkede'

/** Egendefinert enhetstype eller styring – lagres i anleggsdata_brannalarm.egendefinerte (jsonb) */
export interface Egendefinert { id: string; navn: string; slag: 'enhet' | 'styring'; kategori: string; typer: TypeRad[]; antall: number; status: string; note: string; avvik: string[] }
export function lesEgendefinerte(rad: BrannalarmStyring | null): Egendefinert[] {
  const raw = (rad as unknown as { egendefinerte?: unknown } | null)?.egendefinerte
  if (!Array.isArray(raw)) return []
  return raw.map(x => ({ id: String(x.id), navn: String(x.navn ?? ''), slag: x.slag === 'styring' ? 'styring' : 'enhet', kategori: String(x.kategori ?? 'Annet'), typer: Array.isArray(x.typer) ? x.typer : [], antall: Number(x.antall ?? 0) || 0, status: String(x.status ?? ''), note: String(x.note ?? ''), avvik: Array.isArray(x.avvik) ? x.avvik : [] }))
}
const nyId = () => Math.random().toString(36).slice(2, 10)

interface TypeRad { type: string; antall: number }
interface Enhet { aktiv: boolean; typer: TypeRad[]; note: string }

/** {key}_type kan være gammelt format (ren tekst) eller JSON-array */
export function parseTyper(raw: unknown, antall: number): TypeRad[] {
  if (typeof raw !== 'string' || !raw) return []
  if (raw.startsWith('[')) { try { return (JSON.parse(raw) as TypeRad[]).map(t => ({ type: t.type ?? '', antall: Number(t.antall) || 0 })) } catch { /* faller gjennom */ } }
  return [{ type: raw, antall: antall || 1 }]
}

function lesEnheter(rad: BrannalarmStyring | null): Record<string, Enhet> {
  const r = (rad ?? {}) as Record<string, unknown>
  const ut: Record<string, Enhet> = {}
  for (const { key } of ENHETSTYPER) {
    const antall = Number(r[`${key}_antall`] ?? 0) || 0
    ut[key] = { aktiv: Boolean(r[`${key}_aktiv`]), typer: parseTyper(r[`${key}_type`], antall), note: String(r[`${key}_note`] ?? '') }
  }
  return ut
}

function tilKolonner(key: string, e: Enhet): Record<string, unknown> {
  return {
    [`${key}_aktiv`]: e.aktiv,
    [`${key}_antall`]: e.typer.reduce((s, t) => s + (t.antall || 0), 0),
    [`${key}_type`]: e.typer.length ? JSON.stringify(e.typer) : '',
    [`${key}_note`]: e.note || '',
  }
}

export function EnheterView({ anleggId, anleggsNavn, enheter, onBack, onSave }: EnheterViewProps) {
  const { isOnline, queueUpdate } = useOfflineQueue()
  const [data, setData] = useState<Record<string, Enhet>>(() => lesEnheter(enheter))
  const [styr, setStyr] = useState<Record<string, Styring>>(() => lesStyringer(enheter))
  const [egne, setEgne] = useState<Egendefinert[]>(() => lesEgendefinerte(enheter))
  const [radId, setRadId] = useState<string | undefined>(enheter?.id)
  const [lukkede, setLukkede] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem(LUKKET_KEY) ?? '[]')) } catch { return new Set() } })
  function toggleSeksjon(k: string) { setLukkede(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); try { localStorage.setItem(LUKKET_KEY, JSON.stringify(Array.from(n))) } catch { /* ignorer */ } return n }) }
  const [lagrer, setLagrer] = useState<Set<string>>(new Set())
  const [visDialog, setVisDialog] = useState<{ key?: EnhetKey; kategori?: string } | null>(null)
  const [notatApen, setNotatApen] = useState<Set<string>>(new Set())
  const [redigerer, setRedigerer] = useState<{ key: string; idx: number } | null>(null)
  const navigate = useNavigate()
  const [detektorliste, setDetektorliste] = useState<DetektorlisteTelling | null | undefined>(undefined)
  const [visAvstemming, setVisAvstemming] = useState(false)
  useEffect(() => { tellDetektorliste(anleggId).then(setDetektorliste) }, [anleggId])

  // Ta inn ny rad-id etter første insert; ellers er lokal state sannheten mens vi er på siden
  useEffect(() => { if (enheter?.id && enheter.id !== radId) { setRadId(enheter.id); setData(lesEnheter(enheter)); setStyr(lesStyringer(enheter)); setEgne(lesEgendefinerte(enheter)) } }, [enheter, radId])

  const aktive = ENHETSTYPER.filter(e => data[e.key]?.aktiv)
  const totalt = aktive.reduce((s, e) => s + data[e.key].typer.reduce((x, t) => x + (t.antall || 0), 0), 0)
  const aktiveStyringer = STYRINGER.filter(x => styr[x.key]?.aktiv)
  const egneEnheter = egne.filter(x => x.slag === 'enhet')
  const egneStyringer = egne.filter(x => x.slag === 'styring')
  const styringAvvik = aktiveStyringer.filter(x => styr[x.key].avvik.length > 0).length + egneStyringer.filter(x => x.avvik.length > 0).length
  const egneSum = egneEnheter.reduce((s, x) => s + x.typer.reduce((y, t) => y + (t.antall || 0), 0), 0)

  /** Skriver kolonner til anleggets rad (oppretter raden hvis den mangler). Returnerer om det gikk bra. */
  async function skriv(merke: string, kolonner: Record<string, unknown>): Promise<boolean> {
    if (!isOnline) { if (radId) { queueUpdate('anleggsdata_brannalarm', { id: radId, ...kolonner }); return true } toast.warning('Offline – kunne ikke opprette anleggsdata. Prøv igjen på nett.'); return false }
    setLagrer(prev => new Set(prev).add(merke))
    const res = radId
      ? await supabase.from('anleggsdata_brannalarm').update(kolonner).eq('id', radId)
      : await supabase.from('anleggsdata_brannalarm').insert({ anlegg_id: anleggId, ...kolonner }).select('id').single()
    setLagrer(prev => { const n = new Set(prev); n.delete(merke); return n })
    if (res.error) { toast.error('Kunne ikke lagre', res.error); return false }
    if (!radId && 'data' in res && res.data) setRadId((res.data as { id: string }).id)
    onSave(anleggId)
    return true
  }

  /** Lagrer én enhetstype (alle fire kolonner). */
  async function lagre(key: string, ny: Enhet) {
    const forrige = data[key]
    setData(prev => ({ ...prev, [key]: ny }))
    const ok = await skriv(key, tilKolonner(key, ny))
    if (!ok) { setData(prev => ({ ...prev, [key]: forrige })); return }
    // Brannsentral/panel: navneendring på type følger med til nettverkslisten
    if ((key === 'brannsentral' || key === 'panel') && forrige && isOnline) {
      for (let i = 0; i < Math.min(forrige.typer.length, ny.typer.length); i++) {
        const a = forrige.typer[i].type, b = ny.typer[i].type
        if (a && b && a !== b) await supabase.from('nettverk_brannalarm').update({ type: b }).eq('anlegg_id', anleggId).eq('type', a)
      }
    }
  }

  async function lagreStyring(key: string, ny: Styring) {
    const forrige = styr[key]
    setStyr(prev => ({ ...prev, [key]: ny }))
    const ok = await skriv(`s:${key}`, styringTilKolonner(key, ny))
    if (!ok) setStyr(prev => ({ ...prev, [key]: forrige }))
  }
  async function lagreEgne(ny: Egendefinert[]) {
    const forrige = egne
    setEgne(ny)
    const ok = await skriv('egne', { egendefinerte: ny })
    if (!ok) setEgne(forrige)
  }
  function oppdaterEgen(id: string, patch: Partial<Egendefinert>) { lagreEgne(egne.map(x => x.id === id ? { ...x, ...patch } : x)) }
  function fjernEgen(x: Egendefinert) { if (!confirm(`Fjerne «${x.navn}» fra anlegget?`)) return; lagreEgne(egne.filter(y => y.id !== x.id)) }
  function nyEgen(navn: string, slag: 'enhet' | 'styring', kategori: string): string {
    const id = nyId()
    lagreEgne([...egne, { id, navn, slag, kategori: slag === 'styring' ? STYRING_KAT : kategori, typer: [], antall: 0, status: '', note: '', avvik: [] }])
    return id
  }

  function fjernStyring(key: string, navn: string) {
    if (!confirm(`Fjerne ${navn} fra anlegget?`)) return
    lagreStyring(key, { aktiv: false, antall: 0, status: '', note: '', avvik: [] })
  }

  /** Setter totalt antall for en enhetstype ved å justere modellradene (én rad: sett; ingen: opprett; flere: juster den største). */
  function settTotalt(key: string, totalt: number) {
    const e = data[key] ?? { aktiv: false, typer: [], note: '' }
    let typer: TypeRad[]
    if (e.typer.length === 0) typer = totalt > 0 ? [{ type: '', antall: totalt }] : []
    else if (e.typer.length === 1) typer = [{ ...e.typer[0], antall: totalt }]
    else {
      const sum = e.typer.reduce((s, t) => s + (t.antall || 0), 0)
      const i = e.typer.reduce((best, t, j) => (t.antall > e.typer[best].antall ? j : best), 0)
      typer = e.typer.map((t, j) => j === i ? { ...t, antall: Math.max(0, t.antall + (totalt - sum)) } : t)
    }
    lagre(key, { ...e, typer, aktiv: typer.length > 0 })
  }

  function oppdaterType(key: string, idx: number, patch: Partial<TypeRad>) {
    const e = data[key]; const typer = e.typer.map((t, i) => i === idx ? { ...t, ...patch } : t)
    lagre(key, { ...e, typer })
  }
  function fjernType(key: string, idx: number) {
    const e = data[key]; const typer = e.typer.filter((_, i) => i !== idx)
    lagre(key, { ...e, typer, aktiv: typer.length > 0 })
  }
  function fjernEnhet(key: string, navn: string) {
    if (!confirm(`Fjerne ${navn} fra anlegget? Registrerte typer og antall slettes.`)) return
    lagre(key, { aktiv: false, typer: [], note: '' })
  }
  function leggTil(key: string, type: string, antall: number, note: string) {
    if (key.startsWith('e:')) {
      const id = key.slice(2); const x = egne.find(y => y.id === id); if (!x) return
      if (x.slag === 'styring') { oppdaterEgen(id, { antall: x.antall + antall, note: note || x.note }); toast.success(`${x.navn}: ${antall} lagt til`); return }
      const i = x.typer.findIndex(t => t.type.trim().toLowerCase() === type.trim().toLowerCase())
      const typer = i >= 0 ? x.typer.map((t, j) => j === i ? { ...t, antall: t.antall + antall } : t) : [...x.typer, { type: type.trim(), antall }]
      oppdaterEgen(id, { typer, antall: typer.reduce((s, t) => s + t.antall, 0), note: note || x.note })
      toast.success(`${x.navn}: ${type || 'uten type'} × ${antall} lagt til`)
      return
    }
    if (key.startsWith('s:')) {
      const sk = key.slice(2); const st = styr[sk] ?? { aktiv: false, antall: 0, status: '', note: '', avvik: [] }
      lagreStyring(sk, { ...st, aktiv: true, antall: st.antall + antall, note: note || st.note })
      toast.success(`${STYRINGER.find(x => x.key === sk)?.navn ?? sk}: ${antall} lagt til`)
      return
    }
    const e = data[key] ?? { aktiv: false, typer: [], note: '' }
    const eksisterende = e.typer.findIndex(t => t.type.trim().toLowerCase() === type.trim().toLowerCase())
    const typer = eksisterende >= 0 ? e.typer.map((t, i) => i === eksisterende ? { ...t, antall: t.antall + antall } : t) : [...e.typer, { type: type.trim(), antall }]
    lagre(key, { aktiv: true, typer, note: note || e.note })
    const navn = ENHETSTYPER.find(x => x.key === key)?.navn ?? key
    toast.success(eksisterende >= 0 ? `${antall} lagt til på ${type}` : `${navn}: ${type || 'uten type'} × ${antall} lagt til`)
  }

  const avstemming = detektorliste ? ENHETSTYPER.filter(e => ['rd', 'vd', 'multi', 'flame', 'mm', 'sirene', 'optisk'].includes(e.key)).map(e => {
    const iListe = detektorliste.perEnhet[e.key] ?? 0
    const iEnheter = (data[e.key]?.typer ?? []).reduce((s, t) => s + (t.antall || 0), 0)
    return { key: e.key, navn: e.navn, iListe, iEnheter, diff: iListe - iEnheter }
  }).filter(x => x.iListe > 0 || x.iEnheter > 0) : []
  const avvikTeller = avstemming.filter(x => x.diff !== 0).length

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />Brannalarm</button>
        <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{anleggsNavn}</span>
      </div>
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Enheter og styringer</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{anleggsNavn}{!isOnline ? ' · offline' : ''}</p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => setVisDialog({})}>Legg til</Button>
      </header>

      {(aktive.length > 0 || aktiveStyringer.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold tabular-nums">{totalt + egneSum} enheter</span>
          {KATEGORIER.map(kat => {
            const sum = aktive.filter(e => e.kategori === kat).reduce((s, e) => s + data[e.key].typer.reduce((x, t) => x + (t.antall || 0), 0), 0)
            return sum > 0 ? <span key={kat} className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 tabular-nums">{kat} <b>{sum}</b></span> : null
          })}
          {aktiveStyringer.length > 0 && <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 tabular-nums">Styringer <b>{aktiveStyringer.length}</b></span>}
          {styringAvvik > 0 && <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 tabular-nums">{styringAvvik} styringer med avvik</span>}
        </div>
      )}

      {/* Avstemming mot detektorliste */}
      {detektorliste !== undefined && (
        <section className={cn('card !p-0 overflow-hidden', detektorliste && avvikTeller > 0 && 'border-yellow-300 dark:border-yellow-800')} aria-label="Detektorliste">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', !detektorliste ? 'bg-gray-100 dark:bg-dark-100 text-gray-400' : avvikTeller ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400')}><ListIkon className="w-4 h-4" /></span>
            <button type="button" onClick={() => detektorliste && setVisAvstemming(v => !v)} className="flex-1 min-w-0 text-left" aria-expanded={visAvstemming}>
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">Detektorliste</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                {!detektorliste ? 'Ingen detektorliste registrert på anlegget' : avvikTeller === 0 ? `Stemmer med enhetene · ${detektorliste.totalt} enheter i listen (${formatDate(detektorliste.sisteDato)})` : `${avvikTeller} ${avvikTeller === 1 ? 'type' : 'typer'} avviker fra detektorlisten (${formatDate(detektorliste.sisteDato)}) – trykk for å avstemme`}
              </span>
            </button>
            <button type="button" onClick={() => navigate('/teknisk', { state: { tab: 'detektorliste', anleggId } })} className="text-xs text-primary hover:underline whitespace-nowrap">{detektorliste ? 'Åpne listen' : 'Opprett liste'}</button>
          </div>
          {detektorliste && visAvstemming && (
            <div className="border-t border-gray-100 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400"><tr><th className="px-3 py-1.5 text-left font-semibold">Type</th><th className="px-3 py-1.5 text-right font-semibold">Detektorliste</th><th className="px-3 py-1.5 text-right font-semibold">Enheter</th><th className="px-3 py-1.5 text-right font-semibold">Diff</th><th className="w-px"></th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {avstemming.map(x => (
                    <tr key={x.key} className={x.diff !== 0 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{x.navn}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">{x.iListe}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">{x.iEnheter}</td>
                      <td className={cn('px-3 py-2 text-right tabular-nums font-semibold', x.diff === 0 ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400')}>{x.diff === 0 ? <Check className="w-4 h-4 inline" strokeWidth={3} /> : (x.diff > 0 ? `+${x.diff}` : x.diff)}</td>
                      <td className="px-2 py-1.5 text-right">{x.diff !== 0 && <button type="button" onClick={() => settTotalt(x.key, x.iListe)} title={`Sett ${x.navn} til ${x.iListe}`} className="text-xs text-primary hover:underline whitespace-nowrap inline-flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" />Bruk {x.iListe}</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <span>{Object.keys(detektorliste.ukjenteTyper).length ? `Ikke telt: ${Object.entries(detektorliste.ukjenteTyper).map(([t, n]) => `${t} (${n})`).join(', ')}. ` : ''}Diff = detektorliste − enheter. Tallene i Enheter settes på modellraden; har typen flere modeller justeres den største.</span>
                {avvikTeller > 0 && <button type="button" onClick={() => { if (confirm(`Sette ${avvikTeller} ${avvikTeller === 1 ? 'type' : 'typer'} til tallene fra detektorlisten?`)) avstemming.filter(x => x.diff !== 0).forEach(x => settTotalt(x.key, x.iListe)) }} className="text-primary font-medium hover:underline">Bruk alle tall fra detektorlisten</button>}
              </div>
            </div>
          )}
        </section>
      )}

      {aktive.length === 0 && aktiveStyringer.length === 0 && egne.length === 0 ? (
        <div className="card text-center py-12 space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Registrer hva som finnes på anlegget: sentral, detektorer, meldere, varsling og styringer.</p>
          <Button variant="primary" icon={<Plus />} onClick={() => setVisDialog({})}>Legg til</Button>
        </div>
      ) : KATEGORIER.map(kat => {
        const iKat = aktive.filter(e => e.kategori === kat)
        const egneIKat = egneEnheter.filter(x => x.kategori === kat)
        if (iKat.length === 0 && egneIKat.length === 0) return null
        const katSum = iKat.reduce((s, e) => s + data[e.key].typer.reduce((x, t) => x + (t.antall || 0), 0), 0) + egneIKat.reduce((s, x) => s + x.typer.reduce((y, t) => y + (t.antall || 0), 0), 0)
        const antallTyper = iKat.length + egneIKat.length
        return (
          <section key={kat} className="card !p-0 overflow-hidden" aria-label={kat}>
            <SeksjonHode tittel={kat} info={`${katSum} stk · ${antallTyper} ${antallTyper === 1 ? 'type' : 'typer'}`} apen={!lukkede.has(kat)} onToggle={() => toggleSeksjon(kat)} onLeggTil={() => setVisDialog({ kategori: kat })} />
            {!lukkede.has(kat) && <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {egneIKat.map(x => <EgenEnhetRad key={x.id} x={x} redigerer={redigerer} setRedigerer={setRedigerer} onOppdater={p => oppdaterEgen(x.id, p)} onFjern={() => fjernEgen(x)} onLeggTil={() => setVisDialog({ key: `e:${x.id}` })} />)}
              {iKat.map(e => {
                const d = data[e.key]
                const sum = d.typer.reduce((s, t) => s + (t.antall || 0), 0)
                const Ikon = e.icon
                return (
                  <div key={e.key} className="px-4 py-2.5">
                    <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] lg:grid-cols-[2rem_minmax(160px,220px)_minmax(0,1fr)_3rem_2rem] items-start gap-x-3 gap-y-2">
                      <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-300 flex items-center justify-center"><Ikon className="w-4 h-4" /></span>
                      <span className="min-w-0 flex items-center gap-2 h-8">
                        <span className="font-semibold text-gray-900 dark:text-white truncate">{e.navn}</span>
                        {lagrer.has(e.key) && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary flex-shrink-0" />}
                      </span>
                      <span className="lg:hidden justify-self-end"><DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                        <MenuItem icon={<Plus />} onSelect={() => setVisDialog({ key: e.key })}>Legg til type/modell</MenuItem>
                        <MenuItem icon={<StickyNote />} onSelect={() => setNotatApen(prev => { const n = new Set(prev); n.add(e.key); return n })}>{d.note ? 'Rediger notat' : 'Legg til notat'}</MenuItem>
                        <MenuSeparator />
                        <MenuItem icon={<Trash2 />} danger onSelect={() => fjernEnhet(e.key, e.navn)}>Fjern {e.navn.toLowerCase()} fra anlegget…</MenuItem>
                      </DropdownMenu></span>
                      <div className="col-start-2 col-span-2 lg:col-start-auto lg:col-span-1 min-w-0">
                        <div className="flex flex-wrap gap-1.5">
                          {d.typer.map((t, idx) => {
                            const aktivRed = redigerer?.key === e.key && redigerer.idx === idx
                            return (
                              <button key={idx} type="button" onClick={() => setRedigerer(aktivRed ? null : { key: e.key, idx })} aria-expanded={aktivRed}
                                className={cn('inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-lg border text-sm transition-colors', aktivRed ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-primary')}>
                                <span className="truncate max-w-[220px]">{t.type || <span className="text-gray-400 italic">uten type</span>}</span>
                                <span className="font-semibold tabular-nums text-gray-900 dark:text-white">×{t.antall}</span>
                              </button>
                            )
                          })}
                          <button type="button" onClick={() => setVisDialog({ key: e.key })} title="Legg til type/modell" className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:border-primary hover:text-primary"><Plus className="w-4 h-4" /></button>
                        </div>
                        {redigerer?.key === e.key && d.typer[redigerer.idx] && (
                          <div className="mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-dark-100 flex flex-wrap items-center gap-2">
                            <TypeFelt verdi={d.typer[redigerer.idx].type} onLagre={v => oppdaterType(e.key, redigerer.idx, { type: v })} autoFocus />
                            <Antall verdi={d.typer[redigerer.idx].antall} onChange={v => oppdaterType(e.key, redigerer.idx, { antall: v })} />
                            <IconButton variant="ghost" label="Fjern denne modellen" icon={<Trash2 />} onClick={() => { fjernType(e.key, redigerer.idx); setRedigerer(null) }} className="w-8 h-8 hover:!text-red-500" />
                            <Button variant="outline" icon={<Check />} onClick={() => setRedigerer(null)}>Ferdig</Button>
                          </div>
                        )}
                        {(notatApen.has(e.key) || d.note) && (
                          <div className="mt-2 flex items-center gap-2">
                            <StickyNote className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <TypeFelt verdi={d.note} placeholder="Notat (plassering, spesielle forhold …)" onLagre={v => lagre(e.key, { ...d, note: v })} autoFocus={notatApen.has(e.key) && !d.note} liten />
                          </div>
                        )}
                      </div>
                      <span className="hidden lg:flex h-8 items-center justify-end font-semibold text-gray-900 dark:text-white tabular-nums">{sum}</span>
                      <span className="hidden lg:block justify-self-end"><DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                        <MenuItem icon={<Plus />} onSelect={() => setVisDialog({ key: e.key })}>Legg til type/modell</MenuItem>
                        <MenuItem icon={<StickyNote />} onSelect={() => setNotatApen(prev => { const n = new Set(prev); n.add(e.key); return n })}>{d.note ? 'Rediger notat' : 'Legg til notat'}</MenuItem>
                        <MenuSeparator />
                        <MenuItem icon={<Trash2 />} danger onSelect={() => fjernEnhet(e.key, e.navn)}>Fjern {e.navn.toLowerCase()} fra anlegget…</MenuItem>
                      </DropdownMenu></span>
                    </div>
                  </div>
                )
              })}
            </div>}
          </section>
        )
      })}

      {(aktiveStyringer.length > 0 || egneStyringer.length > 0) && (
        <section className="card !p-0 overflow-hidden" aria-label="Styringer">
          <SeksjonHode tittel="Styringer" info={`${aktiveStyringer.length + egneStyringer.length} aktive${styringAvvik ? ` · ${styringAvvik} med avvik` : ''}`} apen={!lukkede.has(STYRING_KAT)} onToggle={() => toggleSeksjon(STYRING_KAT)} onLeggTil={() => setVisDialog({ kategori: STYRING_KAT })} />
          {!lukkede.has(STYRING_KAT) && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {egneStyringer.map(x => <StyringRad key={x.id} navn={x.navn} Ikon={FileText} egen st={{ aktiv: true, antall: x.antall, status: x.status, note: x.note, avvik: x.avvik }} lagrer={lagrer.has('egne')} notatApen={notatApen.has(`e:${x.id}`)} onNotat={() => setNotatApen(prev => { const n = new Set(prev); n.add(`e:${x.id}`); return n })} onLagre={ny => oppdaterEgen(x.id, { antall: ny.antall, status: ny.status, note: ny.note, avvik: ny.avvik })} onFjern={() => fjernEgen(x)} onGiNyttNavn={() => { const n = prompt('Nytt navn', x.navn); if (n?.trim()) oppdaterEgen(x.id, { navn: n.trim() }) }} />)}
              {aktiveStyringer.map(x => {
                const st = styr[x.key]; const Ikon = x.icon
                const harAvvik = st.avvik.length > 0
                return (
                  <div key={x.key} className="px-4 py-2">
                    {/* Faste kolonner: ikon · navn · antall · status · avvik · meny */}
                    <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] lg:grid-cols-[2rem_minmax(160px,1fr)_auto_auto_auto_2rem] items-center gap-x-3 gap-y-2">
                      <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-300 flex items-center justify-center"><Ikon className="w-4 h-4" /></span>
                      <span className="min-w-0 flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white truncate">{x.navn}</span>
                        {lagrer.has(`s:${x.key}`) && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary flex-shrink-0" />}
                      </span>
                      <span className="lg:hidden justify-self-end"><DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                        <MenuItem icon={<StickyNote />} onSelect={() => setNotatApen(prev => { const n = new Set(prev); n.add(`s:${x.key}`); return n })}>{st.note ? 'Rediger notat' : 'Legg til notat'}</MenuItem>
                        <MenuSeparator />
                        <MenuItem icon={<Trash2 />} danger onSelect={() => fjernStyring(x.key, x.navn)}>Fjern {x.navn.toLowerCase()} fra anlegget…</MenuItem>
                      </DropdownMenu></span>
                      <span className="col-start-2 lg:col-start-auto"><Antall verdi={st.antall} onChange={v => lagreStyring(x.key, { ...st, antall: v })} /></span>
                      <span className="col-start-2 lg:col-start-auto inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden h-9 w-fit" role="radiogroup" aria-label="Status">
                        {STYRING_STATUSER.map(o => <button key={o} type="button" role="radio" aria-checked={st.status === o} onClick={() => lagreStyring(x.key, { ...st, status: st.status === o ? '' : o })} className={cn('px-2.5 text-xs whitespace-nowrap', st.status === o ? (o === 'Kontrollert' ? 'bg-green-600 text-white' : 'bg-gray-500 text-white') : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100')}>{o}</button>)}
                      </span>
                      <span className="col-start-2 lg:col-start-auto">
                        <button type="button" onClick={() => lagreStyring(x.key, { ...st, avvik: [...st.avvik, ''] })} title="Registrer avvik" className={cn('inline-flex items-center gap-1 h-9 px-2.5 rounded-lg border text-xs whitespace-nowrap', harAvvik ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-400 hover:text-red-600')}><AlertTriangle className="w-3.5 h-3.5" />{harAvvik ? st.avvik.length : ''}<span className={harAvvik ? 'sr-only' : ''}>Avvik</span></button>
                      </span>
                      <span className="hidden lg:block justify-self-end"><DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                        <MenuItem icon={<StickyNote />} onSelect={() => setNotatApen(prev => { const n = new Set(prev); n.add(`s:${x.key}`); return n })}>{st.note ? 'Rediger notat' : 'Legg til notat'}</MenuItem>
                        <MenuSeparator />
                        <MenuItem icon={<Trash2 />} danger onSelect={() => fjernStyring(x.key, x.navn)}>Fjern {x.navn.toLowerCase()} fra anlegget…</MenuItem>
                      </DropdownMenu></span>
                    </div>
                    {(st.avvik.length > 0 || notatApen.has(`s:${x.key}`) || st.note) && (
                      <div className="mt-2 ml-11 space-y-1.5">
                        {st.avvik.map((a, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[11px] font-semibold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                            <TypeFelt verdi={a} placeholder={`Avvik ${i + 1} – hva er feil?`} autoFocus={!a} liten onLagre={v => lagreStyring(x.key, { ...st, avvik: st.avvik.map((y, j) => j === i ? v : y) })} />
                            <IconButton variant="ghost" label="Fjern avvik" icon={<X />} onClick={() => lagreStyring(x.key, { ...st, avvik: st.avvik.filter((_, j) => j !== i) })} className="w-7 h-7 hover:!text-red-500" />
                          </div>
                        ))}
                        {(notatApen.has(`s:${x.key}`) || st.note) && (
                          <div className="flex items-center gap-2">
                            <StickyNote className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <TypeFelt verdi={st.note} placeholder="Notat" onLagre={v => lagreStyring(x.key, { ...st, note: v })} autoFocus={notatApen.has(`s:${x.key}`) && !st.note} liten />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {visDialog && <LeggTilDialog forhaandsvalgt={visDialog.key} kategori={visDialog.kategori} data={data} styr={styr} egne={egne} onClose={() => setVisDialog(null)} onLeggTil={leggTil} onNyEgen={nyEgen} />}
    </div>
  )
}

/** Én styringsrad: antall · status · avvik · meny, med avvikslinjer og notat under. */
export function StyringRad({ navn, Ikon, egen, st, lagrer, notatApen, onNotat, onLagre, onFjern, onGiNyttNavn }: {
  navn: string; Ikon: LucideIcon; egen?: boolean; st: Styring; lagrer: boolean; notatApen: boolean; onNotat: () => void; onLagre: (ny: Styring) => void; onFjern?: () => void; onGiNyttNavn?: () => void
}) {
  const harAvvik = st.avvik.length > 0
  const meny = (
    <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
      <MenuItem icon={<StickyNote />} onSelect={onNotat}>{st.note ? 'Rediger notat' : 'Legg til notat'}</MenuItem>
      {onGiNyttNavn && <MenuItem icon={<FileText />} onSelect={onGiNyttNavn}>Gi nytt navn</MenuItem>}
      {onFjern && <><MenuSeparator /><MenuItem icon={<Trash2 />} danger onSelect={onFjern}>Fjern {navn.toLowerCase()} fra anlegget…</MenuItem></>}
    </DropdownMenu>
  )
  return (
    <div className="px-4 py-2">
      <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] lg:grid-cols-[2rem_minmax(160px,1fr)_auto_auto_auto_2rem] items-center gap-x-3 gap-y-2">
        <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-300 flex items-center justify-center"><Ikon className="w-4 h-4" /></span>
        <span className="min-w-0 flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white truncate">{navn}</span>
          {egen && <span className="text-[10px] uppercase tracking-wider px-1.5 py-px rounded bg-gray-100 dark:bg-dark-100 text-gray-500">Egen</span>}
          {lagrer && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary flex-shrink-0" />}
        </span>
        <span className="lg:hidden justify-self-end">{meny}</span>
        <span className="col-start-2 lg:col-start-auto"><Antall verdi={st.antall} onChange={v => onLagre({ ...st, antall: v })} /></span>
        <span className="col-start-2 lg:col-start-auto inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden h-9 w-fit" role="radiogroup" aria-label="Status">
          {STYRING_STATUSER.map(o => <button key={o} type="button" role="radio" aria-checked={st.status === o} onClick={() => onLagre({ ...st, status: st.status === o ? '' : o })} className={cn('px-2.5 text-xs whitespace-nowrap', st.status === o ? (o === 'Kontrollert' ? 'bg-green-600 text-white' : 'bg-gray-500 text-white') : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100')}>{o}</button>)}
        </span>
        <span className="col-start-2 lg:col-start-auto">
          <button type="button" onClick={() => onLagre({ ...st, avvik: [...st.avvik, ''] })} title="Registrer avvik" className={cn('inline-flex items-center gap-1 h-9 px-2.5 rounded-lg border text-xs whitespace-nowrap', harAvvik ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-400 hover:text-red-600')}><AlertTriangle className="w-3.5 h-3.5" />{harAvvik ? st.avvik.length : ''}<span className={harAvvik ? 'sr-only' : ''}>Avvik</span></button>
        </span>
        <span className="hidden lg:block justify-self-end">{meny}</span>
      </div>
      {(st.avvik.length > 0 || notatApen || st.note) && (
        <div className="mt-2 ml-11 space-y-1.5">
          {st.avvik.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[11px] font-semibold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <TypeFelt verdi={a} placeholder={`Avvik ${i + 1} – hva er feil?`} autoFocus={!a} liten onLagre={v => onLagre({ ...st, avvik: st.avvik.map((y, j) => j === i ? v : y) })} />
              <IconButton variant="ghost" label="Fjern avvik" icon={<X />} onClick={() => onLagre({ ...st, avvik: st.avvik.filter((_, j) => j !== i) })} className="w-7 h-7 hover:!text-red-500" />
            </div>
          ))}
          {(notatApen || st.note) && (
            <div className="flex items-center gap-2">
              <StickyNote className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <TypeFelt verdi={st.note} placeholder="Notat" onLagre={v => onLagre({ ...st, note: v })} autoFocus={notatApen && !st.note} liten />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Egendefinert enhetstype: navn, modell-brikker, sum – samme oppsett som de faste. */
function EgenEnhetRad({ x, redigerer, setRedigerer, onOppdater, onFjern, onLeggTil }: {
  x: Egendefinert; redigerer: { key: string; idx: number } | null; setRedigerer: (r: { key: string; idx: number } | null) => void
  onOppdater: (p: Partial<Egendefinert>) => void; onFjern: () => void; onLeggTil: () => void
}) {
  const key = `e:${x.id}`
  const sum = x.typer.reduce((s, t) => s + (t.antall || 0), 0)
  const settTyper = (typer: TypeRad[]) => onOppdater({ typer, antall: typer.reduce((s, t) => s + (t.antall || 0), 0) })
  const meny = (
    <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
      <MenuItem icon={<Plus />} onSelect={onLeggTil}>Legg til type/modell</MenuItem>
      <MenuItem icon={<FileText />} onSelect={() => { const n = prompt('Nytt navn', x.navn); if (n?.trim()) onOppdater({ navn: n.trim() }) }}>Gi nytt navn</MenuItem>
      <MenuSeparator />
      <MenuItem icon={<Trash2 />} danger onSelect={onFjern}>Fjern {x.navn.toLowerCase()} fra anlegget…</MenuItem>
    </DropdownMenu>
  )
  return (
    <div className="px-4 py-2.5">
      <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] lg:grid-cols-[2rem_minmax(160px,220px)_minmax(0,1fr)_3rem_2rem] items-start gap-x-3 gap-y-2">
        <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-300 flex items-center justify-center"><FileText className="w-4 h-4" /></span>
        <span className="min-w-0 flex items-center gap-2 h-8"><span className="font-semibold text-gray-900 dark:text-white truncate">{x.navn}</span><span className="text-[10px] uppercase tracking-wider px-1.5 py-px rounded bg-gray-100 dark:bg-dark-100 text-gray-500">Egen</span></span>
        <span className="lg:hidden justify-self-end">{meny}</span>
        <div className="col-start-2 col-span-2 lg:col-start-auto lg:col-span-1 min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {x.typer.map((t, idx) => {
              const aktivRed = redigerer?.key === key && redigerer.idx === idx
              return <button key={idx} type="button" onClick={() => setRedigerer(aktivRed ? null : { key, idx })} className={cn('inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-lg border text-sm', aktivRed ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-primary')}><span className="truncate max-w-[220px]">{t.type || <span className="text-gray-400 italic">uten type</span>}</span><span className="font-semibold tabular-nums text-gray-900 dark:text-white">×{t.antall}</span></button>
            })}
            <button type="button" onClick={onLeggTil} title="Legg til type/modell" className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:border-primary hover:text-primary"><Plus className="w-4 h-4" /></button>
          </div>
          {redigerer?.key === key && x.typer[redigerer.idx] && (
            <div className="mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-dark-100 flex flex-wrap items-center gap-2">
              <TypeFelt verdi={x.typer[redigerer.idx].type} onLagre={v => settTyper(x.typer.map((t, i) => i === redigerer.idx ? { ...t, type: v } : t))} autoFocus />
              <Antall verdi={x.typer[redigerer.idx].antall} onChange={v => settTyper(x.typer.map((t, i) => i === redigerer.idx ? { ...t, antall: v } : t))} />
              <IconButton variant="ghost" label="Fjern denne modellen" icon={<Trash2 />} onClick={() => { settTyper(x.typer.filter((_, i) => i !== redigerer.idx)); setRedigerer(null) }} className="w-8 h-8 hover:!text-red-500" />
              <Button variant="outline" icon={<Check />} onClick={() => setRedigerer(null)}>Ferdig</Button>
            </div>
          )}
        </div>
        <span className="hidden lg:flex h-8 items-center justify-end font-semibold text-gray-900 dark:text-white tabular-nums">{sum}</span>
        <span className="hidden lg:block justify-self-end">{meny}</span>
      </div>
    </div>
  )
}

function SeksjonHode({ tittel, info, apen, onToggle, onLeggTil }: { tittel: string; info: string; apen: boolean; onToggle: () => void; onLeggTil: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-dark-100">
      <button type="button" onClick={onToggle} aria-expanded={apen} className="flex items-center gap-2 flex-1 min-w-0 text-left">
        <span className="w-5 h-5 rounded border border-gray-300 dark:border-gray-700 text-gray-500 flex items-center justify-center flex-shrink-0">{apen ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}</span>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">{tittel}</h2>
        <span className="text-xs text-gray-400 tabular-nums truncate">{info}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', !apen && '-rotate-90')} />
      </button>
      <button type="button" onClick={onLeggTil} className="text-xs text-primary hover:underline inline-flex items-center gap-0.5 flex-shrink-0"><Plus className="w-3.5 h-3.5" />Legg til</button>
    </div>
  )
}

/** Tekstfelt som lagrer på blur/Enter */
function TypeFelt({ verdi, onLagre, placeholder, autoFocus, liten }: { verdi: string; onLagre: (v: string) => void; placeholder?: string; autoFocus?: boolean; liten?: boolean }) {
  const [v, setV] = useState(verdi)
  useEffect(() => setV(verdi), [verdi])
  const lagre = () => { if (v.trim() !== verdi) onLagre(v.trim()) }
  return <input value={v} onChange={e => setV(e.target.value)} onBlur={lagre} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setV(verdi) }} placeholder={placeholder ?? 'Type/modell'} autoFocus={autoFocus} aria-label={placeholder ?? 'Type/modell'} className={cn('input !py-0 flex-1 min-w-[160px]', liten ? '!h-[32px] !min-h-[32px] text-xs' : '!h-[36px] !min-h-[36px] text-sm')} />
}

function Antall({ verdi, onChange }: { verdi: number; onChange: (v: number) => void }) {
  const [v, setV] = useState(String(verdi))
  useEffect(() => setV(String(verdi)), [verdi])
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden flex-shrink-0">
      <button type="button" onClick={() => onChange(Math.max(0, verdi - 1))} aria-label="Én færre" className="w-9 h-9 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-100 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
      <input value={v} inputMode="numeric" onChange={e => setV(e.target.value.replace(/\D/g, ''))} onBlur={() => { const n = parseInt(v || '0', 10); if (n !== verdi) onChange(n) }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} aria-label="Antall" className="w-14 h-9 text-center text-sm font-semibold bg-transparent text-gray-900 dark:text-white tabular-nums focus:outline-none" />
      <button type="button" onClick={() => onChange(verdi + 1)} aria-label="Én til" className="w-9 h-9 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-100 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
    </div>
  )
}

/** Dialog: enhetstype/styring (faner per kategori, søk, egendefinert) → type/modell (forslag fra alle anlegg) → antall */
function LeggTilDialog({ forhaandsvalgt, kategori, data, styr, egne, onClose, onLeggTil, onNyEgen }: {
  forhaandsvalgt?: EnhetKey; kategori?: string; data: Record<string, Enhet>; styr: Record<string, Styring>; egne: Egendefinert[]
  onClose: () => void; onLeggTil: (key: string, type: string, antall: number, note: string) => void; onNyEgen: (navn: string, slag: 'enhet' | 'styring', kategori: string) => string
}) {
  const [key, setKey] = useState<EnhetKey | null>(forhaandsvalgt ?? null)
  const [fane, setFane] = useState<string>(kategori ?? 'alle')
  const [sok, setSok] = useState('')
  const [type, setType] = useState('')
  const [antall, setAntall] = useState(1)
  const [note, setNote] = useState('')
  const [forslag, setForslag] = useState<Record<string, string[]>>({})
  const [egenSkjema, setEgenSkjema] = useState<{ navn: string; slag: 'enhet' | 'styring'; kategori: string } | null>(null)

  // Typer/modeller registrert på alle anlegg – ett kall, gruppert per enhetstype
  useEffect(() => {
    const kolonner = ENHETSTYPER.map(e => `${e.key}_type`).join(', ')
    supabase.from('anleggsdata_brannalarm').select(kolonner).then(({ data: rader }) => {
      const m: Record<string, Map<string, number>> = {}
      for (const rad of (rader ?? []) as unknown as Record<string, unknown>[]) {
        for (const e of ENHETSTYPER) {
          for (const t of parseTyper(rad[`${e.key}_type`], 0)) {
            const navn = t.type.trim(); if (!navn) continue
            m[e.key] ??= new Map(); m[e.key].set(navn, (m[e.key].get(navn) ?? 0) + 1)
          }
        }
      }
      const ut: Record<string, string[]> = {}
      for (const k of Object.keys(m)) ut[k] = Array.from(m[k].entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'nb-NO')).map(x => x[0])
      setForslag(ut)
    })
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  interface Valg { key: string; navn: string; icon: LucideIcon; kategori: string; finnes: boolean; info: string; egen?: boolean }
  const alleValg: Valg[] = [
    ...ENHETSTYPER.map(e => { const d = data[e.key]; const sum = d?.typer.reduce((s, t) => s + (t.antall || 0), 0) ?? 0; return { key: e.key, navn: e.navn, icon: e.icon, kategori: e.kategori, finnes: Boolean(d?.aktiv), info: d?.aktiv ? `${sum} stk · ${d.typer.length} ${d.typer.length === 1 ? 'modell' : 'modeller'}` : '' } }),
    ...egne.filter(x => x.slag === 'enhet').map(x => ({ key: `e:${x.id}`, navn: x.navn, icon: FileText, kategori: x.kategori, finnes: true, info: `${x.typer.reduce((s, t) => s + (t.antall || 0), 0)} stk`, egen: true })),
    ...STYRINGER.map(x => { const st = styr[x.key]; return { key: `s:${x.key}`, navn: x.navn, icon: x.icon, kategori: STYRING_KAT, finnes: Boolean(st?.aktiv), info: st?.aktiv ? `${st.antall} stk${st.status ? ` · ${st.status}` : ''}` : '' } }),
    ...egne.filter(x => x.slag === 'styring').map(x => ({ key: `e:${x.id}`, navn: x.navn, icon: FileText, kategori: STYRING_KAT, finnes: true, info: `${x.antall} stk`, egen: true })),
  ]
  const valgt = key ? alleValg.find(e => e.key === key) : null
  const erStyring = valgt?.kategori === STYRING_KAT
  const s = sok.trim().toLowerCase()
  const treff = alleValg.filter(e => (fane === 'alle' || e.kategori === fane) && (!s || e.navn.toLowerCase().includes(s)))
  const faner = ['alle', ...KATEGORIER, STYRING_KAT]
  const typeForslag = useMemo(() => {
    const liste = key ? (forslag[key] ?? []) : []
    const t = type.trim().toLowerCase()
    return liste.filter(x => !t || x.toLowerCase().includes(t)).slice(0, 8)
  }, [forslag, key, type])

  function bekreft(e: React.FormEvent) {
    e.preventDefault()
    if (!key) return
    onLeggTil(key, type, Math.max(1, antall), note)
    onClose()
  }
  function opprettEgen(e: React.FormEvent) {
    e.preventDefault()
    if (!egenSkjema?.navn.trim()) return
    const id = onNyEgen(egenSkjema.navn.trim(), egenSkjema.slag, egenSkjema.kategori)
    setEgenSkjema(null)
    setKey(`e:${id}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <form onSubmit={egenSkjema ? opprettEgen : bekreft} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="le-tittel" className="card w-full sm:max-w-lg h-[92vh] sm:h-[640px] rounded-b-none sm:rounded-lg !p-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 id="le-tittel" className="text-lg font-bold text-gray-900 dark:text-white">{valgt && !egenSkjema ? <span className="inline-flex items-center gap-2"><valgt.icon className="w-5 h-5 text-primary" />{valgt.navn}</span> : egenSkjema ? 'Ny egendefinert' : 'Legg til'}</h2>
            {(valgt || egenSkjema) && !forhaandsvalgt && <button type="button" onClick={() => { setKey(null); setEgenSkjema(null) }} className="text-xs text-primary hover:underline">‹ Tilbake til listen</button>}
          </div>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} />
        </div>

        {egenSkjema ? (
          <div className="px-5 pb-5 space-y-4 flex-1 overflow-y-auto">
            <p className="text-sm text-gray-600 dark:text-gray-400">For utstyr som ikke finnes i listen. Egendefinerte vises på dette anlegget med merket «Egen».</p>
            <div className="space-y-1.5">
              <label htmlFor="egen-navn" className="block text-sm font-medium text-gray-900 dark:text-white">Navn</label>
              <input id="egen-navn" value={egenSkjema.navn} onChange={e => setEgenSkjema({ ...egenSkjema, navn: e.target.value })} placeholder="F.eks. Gassdetektor, Talevarslingspanel" autoFocus className="input" />
            </div>
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-gray-900 dark:text-white">Hva er det?</span>
              <div className="grid grid-cols-2 gap-2">
                {([['enhet', 'Enhet', 'Har modell og antall (som detektorer)'], ['styring', 'Styring', 'Har antall, status og avvik']] as const).map(([v, t, u]) => (
                  <button key={v} type="button" onClick={() => setEgenSkjema({ ...egenSkjema, slag: v })} className={cn('p-3 rounded-lg border text-left', egenSkjema.slag === v ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400')}><span className="block text-sm font-semibold text-gray-900 dark:text-white">{t}</span><span className="block text-xs text-gray-500 dark:text-gray-400">{u}</span></button>
                ))}
              </div>
            </div>
            {egenSkjema.slag === 'enhet' && (
              <div className="space-y-1.5">
                <label htmlFor="egen-kat" className="block text-sm font-medium text-gray-900 dark:text-white">Vises under</label>
                <select id="egen-kat" value={egenSkjema.kategori} onChange={e => setEgenSkjema({ ...egenSkjema, kategori: e.target.value })} className="input">{KATEGORIER.map(k => <option key={k} value={k}>{k}</option>)}</select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEgenSkjema(null)}>Avbryt</Button>
              <Button variant="primary" type="submit" icon={<Plus />} disabled={!egenSkjema.navn.trim()}>Opprett og legg til</Button>
            </div>
          </div>
        ) : !valgt ? (
          <>
            <div className="px-5 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={sok} onChange={e => setSok(e.target.value)} placeholder="Søk…" autoFocus aria-label="Søk" className="input pl-9" />
              </div>
              <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 pb-1" role="tablist">
                {faner.map(f => <button key={f} type="button" role="tab" aria-selected={fane === f} onClick={() => setFane(f)} className={cn('h-8 px-3 rounded-full border text-xs whitespace-nowrap flex-shrink-0', fane === f ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400')}>{f === 'alle' ? 'Alle' : f}</button>)}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {(fane === 'alle' ? [...KATEGORIER, STYRING_KAT] : [fane]).map(kat => {
                const iKat = treff.filter(e => e.kategori === kat)
                if (!iKat.length) return null
                return (
                  <div key={kat} className="mb-2">
                    {fane === 'alle' && <p className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{kat}</p>}
                    {iKat.map(e => (
                      <button key={e.key} type="button" onClick={() => setKey(e.key)} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-dark-100">
                        <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', e.finnes ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-dark-100 text-gray-500')}><e.icon className="w-4 h-4" /></span>
                        <span className="flex-1 min-w-0"><span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{e.navn}{e.egen && <span className="ml-1.5 text-[10px] uppercase tracking-wider px-1.5 py-px rounded bg-gray-100 dark:bg-dark-100 text-gray-500">Egen</span>}</span>{e.info && <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">På anlegget: {e.info}</span>}</span>
                        {e.finnes ? <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={3} /> : <Plus className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )
              })}
              {treff.length === 0 && <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">Ingen treff på «{sok}».</p>}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800">
              <button type="button" onClick={() => setEgenSkjema({ navn: sok.trim(), slag: fane === STYRING_KAT ? 'styring' : 'enhet', kategori: KATEGORIER.includes(fane) ? fane : 'Annet' })} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-dark-100">
                <span className="w-8 h-8 rounded-lg border border-dashed border-gray-400 text-gray-500 flex items-center justify-center"><Plus className="w-4 h-4" /></span>
                <span className="flex-1"><span className="block text-sm font-medium text-gray-900 dark:text-white">Egendefinert enhet eller styring…</span><span className="block text-xs text-gray-500 dark:text-gray-400">Finnes ikke i listen? Lag din egen{sok.trim() ? ` («${sok.trim()}»)` : ''}.</span></span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 pb-4 space-y-4 flex-1 overflow-y-auto">
              {!erStyring && <div className="space-y-1.5">
                <label htmlFor="le-type" className="block text-sm font-medium text-gray-900 dark:text-white">Type / modell</label>
                <input id="le-type" value={type} onChange={e => setType(e.target.value)} placeholder={key === 'brannsentral' ? 'F.eks. Autrosafe BS-420' : 'F.eks. produsent og modell'} autoFocus className="input" autoComplete="off" />
                {typeForslag.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {typeForslag.map(t => <button key={t} type="button" onClick={() => setType(t)} className={cn('h-8 px-2.5 rounded-full border text-xs', type === t ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary')}>{t}</button>)}
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">{typeForslag.length ? 'Forslag fra andre anlegg. Skriv inn selv hvis modellen ikke finnes.' : 'Kan stå tomt hvis type ikke er kjent.'}</p>
              </div>}
              <div className="grid grid-cols-[auto_1fr] gap-4 items-end">
                <div className="space-y-1.5">
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">Antall</span>
                  <Antall verdi={antall} onChange={v => setAntall(Math.max(1, v))} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="le-note" className="block text-sm font-medium text-gray-900 dark:text-white">Notat <span className="text-gray-400 font-normal">(valgfritt)</span></label>
                  <input id="le-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Plassering, spesielle forhold …" autoFocus={Boolean(erStyring)} className="input" />
                </div>
              </div>
              {valgt.finnes && valgt.info && <p className="text-xs text-gray-500 dark:text-gray-400">Finnes fra før: {valgt.info}. {erStyring ? 'Antallet legges til.' : 'Samme modell slås sammen.'}</p>}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
              <Button variant="ghost" onClick={onClose}>Avbryt</Button>
              <Button variant="primary" type="submit" icon={<Plus />}>Legg til</Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
