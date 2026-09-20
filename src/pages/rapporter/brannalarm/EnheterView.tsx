/**
 * Brannalarm – enheter på anlegget.
 * Viser bare enhetstypene som finnes på anlegget, gruppert. «Legg til enhet» åpner en dialog
 * med enhetstype → type/modell (forslag fra andre anlegg) → antall. Alt lagres fortløpende.
 *
 * Datamodell (én rad i anleggsdata_brannalarm per anlegg): {key}_aktiv, {key}_antall (sum),
 * {key}_type (JSON-array av {type, antall}), {key}_note.
 */
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Minus, MoreHorizontal, Plus, Search, StickyNote, Trash2, X } from 'lucide-react'
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

export const ENHETSTYPER = [
  { key: 'brannsentral', navn: 'Brannsentral', icon: '🏢', kategori: 'Sentral og styring' },
  { key: 'panel', navn: 'Brannpanel', icon: '🎛️', kategori: 'Sentral og styring' },
  { key: 'kraftforsyning', navn: 'Kraftforsyning', icon: '⚡', kategori: 'Sentral og styring' },
  { key: 'batteri', navn: 'Batteri', icon: '🔋', kategori: 'Sentral og styring' },
  { key: 'sloyfer', navn: 'Sløyfer', icon: '🔗', kategori: 'Sentral og styring' },
  { key: 'io', navn: 'IO-styring', icon: '🔌', kategori: 'Sentral og styring' },
  { key: 'rd', navn: 'Røykdetektor', icon: '🔍', kategori: 'Detektorer' },
  { key: 'vd', navn: 'Varmedetektor', icon: '🌡️', kategori: 'Detektorer' },
  { key: 'multi', navn: 'Multikriteriedetektor', icon: '🔍', kategori: 'Detektorer' },
  { key: 'flame', navn: 'Flammedetektor', icon: '🔥', kategori: 'Detektorer' },
  { key: 'linje', navn: 'Linjedetektor', icon: '📏', kategori: 'Detektorer' },
  { key: 'asp', navn: 'Aspirasjon', icon: '💨', kategori: 'Detektorer' },
  { key: 'mm', navn: 'Manuell melder', icon: '🔔', kategori: 'Detektorer' },
  { key: 'traadlos', navn: 'Trådløse enheter', icon: '📡', kategori: 'Detektorer' },
  { key: 'sprinkler', navn: 'Sprinklerkontroll', icon: '💦', kategori: 'Styring og slokning' },
  { key: 'avstiller', navn: 'Avstillingsbryter', icon: '🔘', kategori: 'Styring og slokning' },
  { key: 'brannklokke', navn: 'Brannklokke', icon: '🔔', kategori: 'Varsling' },
  { key: 'sirene', navn: 'Sirene', icon: '🔊', kategori: 'Varsling' },
  { key: 'optisk', navn: 'Optisk varsling', icon: '👁️', kategori: 'Varsling' },
  { key: 'annet', navn: 'Annet', icon: '📝', kategori: 'Annet' },
] as const
type EnhetKey = typeof ENHETSTYPER[number]['key']
const KATEGORIER = Array.from(new Set(ENHETSTYPER.map(e => e.kategori)))

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
  const [radId, setRadId] = useState<string | undefined>(enheter?.id)
  const [lagrer, setLagrer] = useState<Set<string>>(new Set())
  const [visDialog, setVisDialog] = useState<{ key?: EnhetKey } | null>(null)
  const [notatApen, setNotatApen] = useState<Set<string>>(new Set())

  // Ta inn ny rad-id etter første insert; ellers er lokal state sannheten mens vi er på siden
  useEffect(() => { if (enheter?.id && enheter.id !== radId) { setRadId(enheter.id); setData(lesEnheter(enheter)) } }, [enheter, radId])

  const aktive = ENHETSTYPER.filter(e => data[e.key]?.aktiv)
  const totalt = aktive.reduce((s, e) => s + data[e.key].typer.reduce((x, t) => x + (t.antall || 0), 0), 0)

  /** Lagrer én enhetstype (alle fire kolonner). Oppretter raden hvis anlegget ikke har en. */
  async function lagre(key: string, ny: Enhet) {
    const forrige = data[key]
    setData(prev => ({ ...prev, [key]: ny }))
    const kolonner = tilKolonner(key, ny)
    if (!isOnline) { if (radId) queueUpdate('anleggsdata_brannalarm', { id: radId, ...kolonner }); else toast.warning('Offline – kunne ikke opprette anleggsdata. Prøv igjen på nett.'); return }
    setLagrer(prev => new Set(prev).add(key))
    const res = radId
      ? await supabase.from('anleggsdata_brannalarm').update(kolonner).eq('id', radId)
      : await supabase.from('anleggsdata_brannalarm').insert({ anlegg_id: anleggId, ...kolonner }).select('id').single()
    setLagrer(prev => { const n = new Set(prev); n.delete(key); return n })
    if (res.error) { setData(prev => ({ ...prev, [key]: forrige })); toast.error('Kunne ikke lagre', res.error); return }
    if (!radId && 'data' in res && res.data) setRadId((res.data as { id: string }).id)
    // Brannsentral/panel: navneendring på type følger med til nettverkslisten
    if ((key === 'brannsentral' || key === 'panel') && forrige) {
      for (let i = 0; i < Math.min(forrige.typer.length, ny.typer.length); i++) {
        const a = forrige.typer[i].type, b = ny.typer[i].type
        if (a && b && a !== b) await supabase.from('nettverk_brannalarm').update({ type: b }).eq('anlegg_id', anleggId).eq('type', a)
      }
    }
    onSave(anleggId)
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Enheter</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{aktive.length ? `${aktive.length} enhetstyper · ${totalt} enheter totalt` : 'Ingen enheter registrert ennå'}{!isOnline ? ' · offline' : ''}</p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => setVisDialog({})}>Legg til enhet</Button>
      </header>

      {aktive.length === 0 ? (
        <div className="card text-center py-12 space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Registrer hva som finnes på anlegget: sentral, detektorer, meldere, varsling …</p>
          <Button variant="primary" icon={<Plus />} onClick={() => setVisDialog({})}>Legg til første enhet</Button>
        </div>
      ) : KATEGORIER.map(kat => {
        const iKat = aktive.filter(e => e.kategori === kat)
        if (iKat.length === 0) return null
        return (
          <section key={kat} className="space-y-2" aria-label={kat}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">{kat}</h2>
            {iKat.map(e => {
              const d = data[e.key]
              const sum = d.typer.reduce((s, t) => s + (t.antall || 0), 0)
              return (
                <div key={e.key} className="card !p-0 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-dark-100">
                    <span className="text-lg leading-none" aria-hidden>{e.icon}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{e.navn}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">{sum} stk</span>
                    {lagrer.has(e.key) && <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary" />}
                    <span className="ml-auto flex items-center gap-1">
                      <IconButton variant="ghost" label="Legg til type/modell" icon={<Plus />} onClick={() => setVisDialog({ key: e.key })} className="w-8 h-8" />
                      <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                        <MenuItem icon={<StickyNote />} onSelect={() => setNotatApen(prev => { const n = new Set(prev); n.add(e.key); return n })}>{d.note ? 'Rediger notat' : 'Legg til notat'}</MenuItem>
                        <MenuSeparator />
                        <MenuItem icon={<Trash2 />} danger onSelect={() => fjernEnhet(e.key, e.navn)}>Fjern fra anlegget…</MenuItem>
                      </DropdownMenu>
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {d.typer.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-4 py-2">
                        <TypeFelt verdi={t.type} onLagre={v => oppdaterType(e.key, idx, { type: v })} />
                        <Antall verdi={t.antall} onChange={v => oppdaterType(e.key, idx, { antall: v })} />
                        <IconButton variant="ghost" label="Fjern" icon={<X />} onClick={() => fjernType(e.key, idx)} className="w-8 h-8 hover:!text-red-500" />
                      </div>
                    ))}
                    {d.typer.length === 0 && <p className="px-4 py-2 text-sm text-gray-400">Ingen type/modell registrert – <button type="button" onClick={() => setVisDialog({ key: e.key })} className="text-primary hover:underline">legg til</button></p>}
                    {(notatApen.has(e.key) || d.note) && (
                      <div className="px-4 py-2 flex items-center gap-2">
                        <StickyNote className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <TypeFelt verdi={d.note} placeholder="Notat (plassering, spesielle forhold …)" onLagre={v => lagre(e.key, { ...d, note: v })} autoFocus={notatApen.has(e.key) && !d.note} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}

      {visDialog && <LeggTilDialog forhaandsvalgt={visDialog.key} data={data} onClose={() => setVisDialog(null)} onLeggTil={leggTil} />}
    </div>
  )
}

/** Tekstfelt som lagrer på blur/Enter */
function TypeFelt({ verdi, onLagre, placeholder, autoFocus }: { verdi: string; onLagre: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  const [v, setV] = useState(verdi)
  useEffect(() => setV(verdi), [verdi])
  const lagre = () => { if (v.trim() !== verdi) onLagre(v.trim()) }
  return <input value={v} onChange={e => setV(e.target.value)} onBlur={lagre} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setV(verdi) }} placeholder={placeholder ?? 'Type/modell'} autoFocus={autoFocus} aria-label={placeholder ?? 'Type/modell'} className="input !h-[36px] !min-h-[36px] !py-0 text-sm flex-1 min-w-0" />
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
function LeggTilDialog({ forhaandsvalgt, data, onClose, onLeggTil }: { forhaandsvalgt?: EnhetKey; data: Record<string, Enhet>; onClose: () => void; onLeggTil: (key: string, type: string, antall: number, note: string) => void }) {
  const [key, setKey] = useState<EnhetKey | null>(forhaandsvalgt ?? null)
  const [sok, setSok] = useState('')
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

  const valgt = key ? ENHETSTYPER.find(e => e.key === key) : null
  const s = sok.trim().toLowerCase()
  const treff = ENHETSTYPER.filter(e => !s || e.navn.toLowerCase().includes(s) || e.kategori.toLowerCase().includes(s))
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
            <h2 id="le-tittel" className="text-lg font-bold text-gray-900 dark:text-white">{valgt ? <span className="inline-flex items-center gap-2"><span aria-hidden>{valgt.icon}</span>{valgt.navn}</span> : 'Legg til enhet'}</h2>
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
            {KATEGORIER.map(kat => {
              const iKat = treff.filter(e => e.kategori === kat)
              if (!iKat.length) return null
              return (
                <div key={kat} className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{kat}</p>
                  <div className="flex flex-wrap gap-2">
                    {iKat.map(e => {
                      const finnes = data[e.key]?.aktiv
                      return <button key={e.key} type="button" onClick={() => setKey(e.key)} className={cn('h-9 px-3 rounded-full border text-sm inline-flex items-center gap-1.5 transition-colors', finnes ? 'border-primary/60 bg-primary/5 text-gray-900 dark:text-white' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary')}><span aria-hidden>{e.icon}</span>{e.navn}{finnes && <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />}</button>
                    })}
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-gray-500 dark:text-gray-400">Enhetstyper med hake finnes allerede på anlegget – du legger da til en ny type/modell under den.</p>
          </div>
        ) : (
          <>
            <div className="px-5 pb-4 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <label htmlFor="le-type" className="block text-sm font-medium text-gray-900 dark:text-white">Type / modell</label>
                <input id="le-type" value={type} onChange={e => setType(e.target.value)} placeholder={key === 'brannsentral' ? 'F.eks. Autrosafe BS-420' : 'F.eks. produsent og modell'} autoFocus className="input" autoComplete="off" />
                {typeForslag.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {typeForslag.map(t => <button key={t} type="button" onClick={() => setType(t)} className={cn('h-8 px-2.5 rounded-full border text-xs', type === t ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary')}>{t}</button>)}
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">{typeForslag.length ? 'Forslag fra andre anlegg. Skriv inn selv hvis modellen ikke finnes.' : 'Kan stå tomt hvis type ikke er kjent.'}</p>
              </div>
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
              {data[key!]?.typer.length ? <p className="text-xs text-gray-500 dark:text-gray-400">Finnes fra før: {data[key!].typer.map(t => `${t.type || 'uten type'} × ${t.antall}`).join(', ')}. Samme type slås sammen.</p> : null}
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
