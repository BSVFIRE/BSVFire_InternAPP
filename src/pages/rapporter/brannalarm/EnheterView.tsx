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
import { AlertTriangle, ArrowLeft, ArrowUpDown, BatteryCharging, BellRing, Blinds, Camera, Check, ChevronDown, CircleDot, Cpu, DoorOpen, Droplets, Eye, Fan, FileText, Flame, Hand, KeyRound, LayoutPanelTop, Link2, ListChecks, Lock, Minus, MoreHorizontal, Music, Plug, Plus, Radio, Ruler, ScanSearch, Search, StickyNote, Thermometer, Timer, Trash2, Volume2, Wind, X, Zap, type LucideIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useOfflineQueue } from '@/hooks/useOffline'
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

interface Styring { aktiv: boolean; antall: number; status: string; note: string; avvik: string[] }

function lesStyringer(rad: BrannalarmStyring | null): Record<string, Styring> {
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
function styringTilKolonner(key: string, s: Styring): Record<string, unknown> {
  return { [`${key}_aktiv`]: s.aktiv, [`${key}_antall`]: s.antall, [`${key}_status`]: s.status, [`${key}_note`]: s.note, [`${key}_har_avvik`]: s.avvik.length > 0, [`${key}_avvik`]: JSON.stringify(s.avvik) }
}

const LUKKET_KEY = 'brannalarm_enheter_lukkede'

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
  const [radId, setRadId] = useState<string | undefined>(enheter?.id)
  const [lukkede, setLukkede] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem(LUKKET_KEY) ?? '[]')) } catch { return new Set() } })
  function toggleSeksjon(k: string) { setLukkede(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); try { localStorage.setItem(LUKKET_KEY, JSON.stringify(Array.from(n))) } catch { /* ignorer */ } return n }) }
  const [lagrer, setLagrer] = useState<Set<string>>(new Set())
  const [visDialog, setVisDialog] = useState<{ key?: EnhetKey; kategori?: string } | null>(null)
  const [notatApen, setNotatApen] = useState<Set<string>>(new Set())
  const [redigerer, setRedigerer] = useState<{ key: string; idx: number } | null>(null)

  // Ta inn ny rad-id etter første insert; ellers er lokal state sannheten mens vi er på siden
  useEffect(() => { if (enheter?.id && enheter.id !== radId) { setRadId(enheter.id); setData(lesEnheter(enheter)); setStyr(lesStyringer(enheter)) } }, [enheter, radId])

  const aktive = ENHETSTYPER.filter(e => data[e.key]?.aktiv)
  const totalt = aktive.reduce((s, e) => s + data[e.key].typer.reduce((x, t) => x + (t.antall || 0), 0), 0)
  const aktiveStyringer = STYRINGER.filter(x => styr[x.key]?.aktiv)
  const styringAvvik = aktiveStyringer.filter(x => styr[x.key].avvik.length > 0).length

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
  function fjernStyring(key: string, navn: string) {
    if (!confirm(`Fjerne ${navn} fra anlegget?`)) return
    lagreStyring(key, { aktiv: false, antall: 0, status: '', note: '', avvik: [] })
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
          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold tabular-nums">{totalt} enheter</span>
          {KATEGORIER.map(kat => {
            const sum = aktive.filter(e => e.kategori === kat).reduce((s, e) => s + data[e.key].typer.reduce((x, t) => x + (t.antall || 0), 0), 0)
            return sum > 0 ? <span key={kat} className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 tabular-nums">{kat} <b>{sum}</b></span> : null
          })}
          {aktiveStyringer.length > 0 && <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 tabular-nums">Styringer <b>{aktiveStyringer.length}</b></span>}
          {styringAvvik > 0 && <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 tabular-nums">{styringAvvik} styringer med avvik</span>}
        </div>
      )}

      {aktive.length === 0 && aktiveStyringer.length === 0 ? (
        <div className="card text-center py-12 space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Registrer hva som finnes på anlegget: sentral, detektorer, meldere, varsling og styringer.</p>
          <Button variant="primary" icon={<Plus />} onClick={() => setVisDialog({})}>Legg til</Button>
        </div>
      ) : KATEGORIER.map(kat => {
        const iKat = aktive.filter(e => e.kategori === kat)
        if (iKat.length === 0) return null
        const katSum = iKat.reduce((s, e) => s + data[e.key].typer.reduce((x, t) => x + (t.antall || 0), 0), 0)
        return (
          <section key={kat} className="card !p-0 overflow-hidden" aria-label={kat}>
            <SeksjonHode tittel={kat} info={`${katSum} stk · ${iKat.length} ${iKat.length === 1 ? 'type' : 'typer'}`} apen={!lukkede.has(kat)} onToggle={() => toggleSeksjon(kat)} onLeggTil={() => setVisDialog({ kategori: kat })} />
            {!lukkede.has(kat) && <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {iKat.map(e => {
                const d = data[e.key]
                const sum = d.typer.reduce((s, t) => s + (t.antall || 0), 0)
                const Ikon = e.icon
                return (
                  <div key={e.key} className="px-4 py-2.5">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5"><Ikon className="w-4 h-4" /></span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{e.navn}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">{sum}</span>
                          {lagrer.has(e.key) && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
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
                      <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8 -mr-1" />}>
                        <MenuItem icon={<Plus />} onSelect={() => setVisDialog({ key: e.key })}>Legg til type/modell</MenuItem>
                        <MenuItem icon={<StickyNote />} onSelect={() => setNotatApen(prev => { const n = new Set(prev); n.add(e.key); return n })}>{d.note ? 'Rediger notat' : 'Legg til notat'}</MenuItem>
                        <MenuSeparator />
                        <MenuItem icon={<Trash2 />} danger onSelect={() => fjernEnhet(e.key, e.navn)}>Fjern {e.navn.toLowerCase()} fra anlegget…</MenuItem>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>}
          </section>
        )
      })}

      {aktiveStyringer.length > 0 && (
        <section className="card !p-0 overflow-hidden" aria-label="Styringer">
          <SeksjonHode tittel="Styringer" info={`${aktiveStyringer.length} aktive${styringAvvik ? ` · ${styringAvvik} med avvik` : ''}`} apen={!lukkede.has(STYRING_KAT)} onToggle={() => toggleSeksjon(STYRING_KAT)} onLeggTil={() => setVisDialog({ kategori: STYRING_KAT })} />
          {!lukkede.has(STYRING_KAT) && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {aktiveStyringer.map(x => {
                const st = styr[x.key]; const Ikon = x.icon
                return (
                  <div key={x.key} className="px-4 py-2.5">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5"><Ikon className="w-4 h-4" /></span>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{x.navn}</span>
                          {lagrer.has(`s:${x.key}`) && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />}
                          <Antall verdi={st.antall} onChange={v => lagreStyring(x.key, { ...st, antall: v })} />
                          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden h-9" role="radiogroup" aria-label="Status">
                            {STYRING_STATUSER.map(o => <button key={o} type="button" role="radio" aria-checked={st.status === o} onClick={() => lagreStyring(x.key, { ...st, status: st.status === o ? '' : o })} className={cn('px-2.5 text-xs whitespace-nowrap', st.status === o ? (o === 'Kontrollert' ? 'bg-green-600 text-white' : 'bg-gray-500 text-white') : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100')}>{o}</button>)}
                          </div>
                          <button type="button" onClick={() => lagreStyring(x.key, { ...st, avvik: [...st.avvik, ''] })} className={cn('inline-flex items-center gap-1 h-9 px-2.5 rounded-lg border text-xs', st.avvik.length ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-red-400 hover:text-red-600')}><AlertTriangle className="w-3.5 h-3.5" />{st.avvik.length ? `${st.avvik.length} avvik · legg til` : 'Avvik'}</button>
                        </div>
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
                      <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8 -mr-1" />}>
                        <MenuItem icon={<StickyNote />} onSelect={() => setNotatApen(prev => { const n = new Set(prev); n.add(`s:${x.key}`); return n })}>{st.note ? 'Rediger notat' : 'Legg til notat'}</MenuItem>
                        <MenuSeparator />
                        <MenuItem icon={<Trash2 />} danger onSelect={() => fjernStyring(x.key, x.navn)}>Fjern {x.navn.toLowerCase()} fra anlegget…</MenuItem>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {visDialog && <LeggTilDialog forhaandsvalgt={visDialog.key} kategori={visDialog.kategori} data={data} styr={styr} onClose={() => setVisDialog(null)} onLeggTil={leggTil} />}
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

/** Dialog: enhetstype → type/modell (forslag fra alle anlegg) → antall */
function LeggTilDialog({ forhaandsvalgt, kategori, data, styr, onClose, onLeggTil }: { forhaandsvalgt?: EnhetKey; kategori?: string; data: Record<string, Enhet>; styr: Record<string, Styring>; onClose: () => void; onLeggTil: (key: string, type: string, antall: number, note: string) => void }) {
  const [key, setKey] = useState<EnhetKey | null>(forhaandsvalgt ?? null)
  const [sok, setSok] = useState(kategori ?? '')
  const [type, setType] = useState('')
  const [antall, setAntall] = useState(1)
  const [note, setNote] = useState('')
  const [forslag, setForslag] = useState<Record<string, string[]>>({})

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

  const alleValg = [...ENHETSTYPER, ...STYRINGER.map(x => ({ key: `s:${x.key}`, navn: x.navn, icon: x.icon, kategori: STYRING_KAT }))]
  const valgt = key ? alleValg.find(e => e.key === key) : null
  const erStyring = Boolean(key?.startsWith('s:'))
  const s = sok.trim().toLowerCase()
  const treff = alleValg.filter(e => !s || e.navn.toLowerCase().includes(s) || e.kategori.toLowerCase().includes(s))
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <form onSubmit={bekreft} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="le-tittel" className="card w-full sm:max-w-lg max-h-[92vh] rounded-b-none sm:rounded-lg !p-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 id="le-tittel" className="text-lg font-bold text-gray-900 dark:text-white">{valgt ? <span className="inline-flex items-center gap-2"><valgt.icon className="w-5 h-5 text-primary" />{valgt.navn}</span> : 'Legg til enhet'}</h2>
            {valgt && !forhaandsvalgt && <button type="button" onClick={() => setKey(null)} className="text-xs text-primary hover:underline">Velg en annen enhetstype</button>}
          </div>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} />
        </div>

        {!valgt ? (
          <div className="px-5 pb-5 space-y-3 overflow-y-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={sok} onChange={e => setSok(e.target.value)} placeholder="Søk enhetstype…" autoFocus aria-label="Søk enhetstype" className="input pl-9" />
            </div>
            {[...KATEGORIER, STYRING_KAT].map(kat => {
              const iKat = treff.filter(e => e.kategori === kat)
              if (!iKat.length) return null
              return (
                <div key={kat} className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{kat}</p>
                  <div className="flex flex-wrap gap-2">
                    {iKat.map(e => {
                      const finnes = e.key.startsWith('s:') ? styr[e.key.slice(2)]?.aktiv : data[e.key]?.aktiv
                      return <button key={e.key} type="button" onClick={() => setKey(e.key)} className={cn('h-9 px-3 rounded-full border text-sm inline-flex items-center gap-1.5 transition-colors', finnes ? 'border-primary/60 bg-primary/5 text-gray-900 dark:text-white' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary')}><e.icon className="w-4 h-4 text-gray-400" />{e.navn}{finnes && <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />}</button>
                    })}
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-gray-500 dark:text-gray-400">Hake = finnes allerede på anlegget; da legger du til en ny modell (enheter) eller øker antallet (styringer).</p>
          </div>
        ) : (
          <>
            <div className="px-5 pb-4 space-y-4 overflow-y-auto">
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
                  <input id="le-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Plassering, spesielle forhold …" className="input" />
                </div>
              </div>
              {!erStyring && data[key!]?.typer.length ? <p className="text-xs text-gray-500 dark:text-gray-400">Finnes fra før: {data[key!].typer.map(t => `${t.type || 'uten type'} × ${t.antall}`).join(', ')}. Samme type slås sammen.</p> : null}
              {erStyring && styr[key!.slice(2)]?.aktiv ? <p className="text-xs text-gray-500 dark:text-gray-400">Finnes fra før med {styr[key!.slice(2)].antall} stk – antallet legges til.</p> : null}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
              <Button variant="ghost" onClick={onClose}>Avbryt</Button>
              <Button variant="primary" type="submit" icon={<Plus />}>Legg til</Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
