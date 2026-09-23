/**
 * Kontroll av én røyklukesentral.
 *
 * Erstatter den lange «Sentraldata»-siden: seksjoner som kan legges sammen, fremdrift øverst,
 * og sjekkpunkter der hvert punkt får Ok / Anbefaling / Avvik med egen merknad. Merknadene er
 * det rapporten bygger avviks- og anbefalingslistene av. Lagres automatisk.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { Button, IconButton } from '@/components/ui/Button'
import {
  ANLEGGSTYPER, TILSTANDER, TILSTAND_FARGE, punkterFor, tilstandFor,
  type ByttetUtstyr, type Krets, type Sentral, type Sjekkpunkt,
} from './typer'

const SEKSJONER = ['Sentral', 'Luker', 'Batteri', 'Kretser', 'Sjekkpunkter', 'Byttet utstyr', 'Konklusjon'] as const
type Seksjon = typeof SEKSJONER[number]

export function SentralKontroll({ sentralId, anleggNavn, kundeNavn, onTilbake, onLagret }: {
  sentralId: string
  anleggNavn: string
  kundeNavn: string
  onTilbake: () => void
  onLagret?: () => void
}) {
  const [s, setS] = useState<Sentral | null>(null)
  const [laster, setLaster] = useState(true)
  const [lagrer, setLagrer] = useState(false)
  const [sistLagret, setSistLagret] = useState<Date | null>(null)
  const [lukkede, setLukkede] = useState<Set<Seksjon>>(new Set())
  const endret = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { last() }, [sentralId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function last() {
    setLaster(true)
    const { data, error } = await supabase.from('roykluke_sentraler').select('*').eq('id', sentralId).single()
    if (error) { toast.error('Kunne ikke laste sentralen', error); setLaster(false); return }
    const rad = data as Sentral
    setS({ ...rad, sjekkpunkter: rad.sjekkpunkter ?? [], kretser: rad.kretser ?? [], byttet_utstyr_liste: rad.byttet_utstyr_liste ?? [] })
    setLaster(false)
  }

  /** Endrer lokalt og lagrer 1,5 sekund etter siste tastetrykk */
  function endre(patch: Partial<Sentral>) {
    setS(prev => prev ? { ...prev, ...patch } : prev)
    endret.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => lagre(patch), 1500)
  }

  async function lagre(_patch?: Partial<Sentral>) {
    setS(prev => {
      if (!prev) return prev
      void skriv(prev)
      return prev
    })
  }

  async function skriv(rad: Sentral) {
    if (!endret.current) return
    endret.current = false
    setLagrer(true)
    const { id, created_at, ...felt } = rad // eslint-disable-line @typescript-eslint/no-unused-vars
    const { error } = await supabase.from('roykluke_sentraler').update(felt).eq('id', rad.id)
    setLagrer(false)
    if (error) { endret.current = true; toast.error('Kunne ikke lagre', error); return }
    setSistLagret(new Date())
    onLagret?.()
  }

  // Lagre det som står igjen når teknikeren forlater skjemaet
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (s && endret.current) void skriv(s) }, [s])

  const punkter = useMemo(() => s ? punkterFor(s) : [], [s])
  const vurdert = useMemo(() => punkter.filter(p => tilstandFor(s ?? { sjekkpunkter: [] }, p).tilstand).length, [punkter, s])
  const funn = useMemo(() => ({
    avvik: (s?.sjekkpunkter ?? []).filter(x => x.tilstand === 'Avvik'),
    anbefalinger: (s?.sjekkpunkter ?? []).filter(x => x.tilstand === 'Anbefaling'),
  }), [s])

  function settPunkt(punkt: string, patch: Partial<Sjekkpunkt>) {
    if (!s) return
    const liste = [...(s.sjekkpunkter ?? [])]
    const i = liste.findIndex(x => x.punkt === punkt)
    if (i >= 0) liste[i] = { ...liste[i], ...patch }
    else liste.push({ punkt, tilstand: '', merknad: '', ...patch })
    endre({ sjekkpunkter: liste })
  }

  function toggle(seksjon: Seksjon) {
    setLukkede(prev => { const n = new Set(prev); n.has(seksjon) ? n.delete(seksjon) : n.add(seksjon); return n })
  }

  if (laster || !s) return <div className="card py-12 text-center text-sm text-gray-500">Laster sentralen…</div>

  const pct = punkter.length ? Math.round((vurdert / punkter.length) * 100) : 0
  const erBranngardin = s.anlegg_type === 'Branngardin'

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={onTilbake} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0">
          <ArrowLeft className="w-4 h-4" />Alle sentraler
        </button>
      </div>

      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {s.sentral_nr != null ? `Sentral ${s.sentral_nr}` : 'Sentral'}
          {s.plassering && <span className="text-gray-400 font-normal"> · {s.plassering}</span>}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{kundeNavn} · {anleggNavn} · {s.anlegg_type ?? 'Røykluker'}</p>
      </header>

      {/* Fremdrift */}
      <div className="card !py-3 space-y-2 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <b className="text-gray-900 dark:text-white tabular-nums">{vurdert} av {punkter.length}</b> sjekkpunkter vurdert
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1.5">
            {lagrer ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Lagrer…</>
              : sistLagret ? <><Check className="w-3.5 h-3.5 text-green-500" strokeWidth={3} />Lagret {sistLagret.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</>
              : 'Lagres automatisk'}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-dark-100 overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-green-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
        </div>
        {(funn.avvik.length > 0 || funn.anbefalinger.length > 0) && (
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {funn.avvik.length > 0 && <span className="text-red-600 dark:text-red-400 font-semibold">{funn.avvik.length} avvik</span>}
            {funn.avvik.length > 0 && funn.anbefalinger.length > 0 && ' · '}
            {funn.anbefalinger.length > 0 && <span className="text-yellow-700 dark:text-yellow-400 font-semibold">{funn.anbefalinger.length} anbefalinger</span>}
          </p>
        )}
      </div>

      {/* Sentral */}
      <Seksjonskort tittel="Sentral" apen={!lukkede.has('Sentral')} onToggle={() => toggle('Sentral')}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Felt label="Nummer"><input type="number" value={s.sentral_nr ?? ''} onChange={e => endre({ sentral_nr: e.target.value ? Number(e.target.value) : null })} className="input !h-9" /></Felt>
          <Felt label="Anleggstype">
            <select value={s.anlegg_type ?? 'Røykluker'} onChange={e => endre({ anlegg_type: e.target.value })} className="input !h-9">
              {ANLEGGSTYPER.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Felt>
          <Felt label="Plassering" bred><input value={s.plassering ?? ''} onChange={e => endre({ plassering: e.target.value })} placeholder="F.eks. Turnhall" className="input !h-9" /></Felt>
          <Felt label="Sentraltype" bred><input value={s.sentral_produsent ?? ''} onChange={e => endre({ sentral_produsent: e.target.value })} placeholder="F.eks. Afg 32A" className="input !h-9" /></Felt>
          <Felt label="Signaltype" bred><input value={s.signaltype ?? ''} onChange={e => endre({ signaltype: e.target.value })} placeholder="F.eks. Br.signal, testet lokalt" className="input !h-9" /></Felt>
          <Felt label="Motortype"><input value={s.motor_type ?? ''} onChange={e => endre({ motor_type: e.target.value })} placeholder="Afg 24v" className="input !h-9" /></Felt>
          <Felt label="Antall motorer"><input type="number" value={s.motor_antall ?? ''} onChange={e => endre({ motor_antall: e.target.value ? Number(e.target.value) : null })} className="input !h-9" /></Felt>
        </div>
      </Seksjonskort>

      {/* Luker / branngardin */}
      <Seksjonskort tittel={erBranngardin ? 'Branngardin' : 'Luker'} apen={!lukkede.has('Luker')} onToggle={() => toggle('Luker')}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Felt label="Type"><input value={s.roykluke_type ?? ''} onChange={e => endre({ roykluke_type: e.target.value })} placeholder={erBranngardin ? 'Gardin' : 'Karm/Kuppel'} className="input !h-9" /></Felt>
          <Felt label="Luketype"><input value={s.roykluke_luketype ?? ''} onChange={e => endre({ roykluke_luketype: e.target.value })} placeholder="Pc-lys" className="input !h-9" /></Felt>
          <Felt label="Størrelse"><input value={s.roykluke_storrelse ?? ''} onChange={e => endre({ roykluke_storrelse: e.target.value })} placeholder="100x150cm" className="input !h-9" /></Felt>
          <Felt label="Antall"><input type="number" value={s.roykluke_antall ?? ''} onChange={e => endre({ roykluke_antall: e.target.value ? Number(e.target.value) : null })} className="input !h-9" /></Felt>
          <Felt label="Merknad" bred><input value={s.roykluke_merknad ?? ''} onChange={e => endre({ roykluke_merknad: e.target.value })} className="input !h-9" /></Felt>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">Enkeltluker med egen plassering registreres i oversikten over sentralene.</p>
      </Seksjonskort>

      {/* Batteri */}
      <Seksjonskort tittel="Batteri" apen={!lukkede.has('Batteri')} onToggle={() => toggle('Batteri')}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Felt label="Batteritype"><input value={s.batteri_type ?? ''} onChange={e => endre({ batteri_type: e.target.value })} placeholder="12v 7.2 Ah" className="input !h-9" /></Felt>
          <Felt label="Batterispenning"><input value={s.batteri_spenning ?? ''} onChange={e => endre({ batteri_spenning: e.target.value })} placeholder="25.54v" className="input !h-9" /></Felt>
          <Felt label="Ladespenning"><input value={s.ladespenning ?? ''} onChange={e => endre({ ladespenning: e.target.value })} placeholder="27.84v" className="input !h-9" /></Felt>
          <Felt label="Batteri årstall"><input type="number" value={s.batteri_alder ?? ''} onChange={e => endre({ batteri_alder: e.target.value ? Number(e.target.value) : null })} placeholder="2026" className="input !h-9" /></Felt>
        </div>
      </Seksjonskort>

      {/* Kretser */}
      <Seksjonskort tittel="Kretser" antall={s.kretser.length} apen={!lukkede.has('Kretser')} onToggle={() => toggle('Kretser')}>
        {s.kretser.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Ingen kretser registrert.</p>}
        <div className="space-y-2">
          {s.kretser.map((k, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <Felt label="Nr."><input value={k.nr} onChange={e => endreKrets(i, { nr: e.target.value })} className="input !h-9 w-14" /></Felt>
              <Felt label="Aktivering"><input value={k.aktivering} onChange={e => endreKrets(i, { aktivering: e.target.value })} placeholder="28.21v" className="input !h-9 w-28" /></Felt>
              <Felt label="Hvile"><input value={k.hvile} onChange={e => endreKrets(i, { hvile: e.target.value })} placeholder="0v" className="input !h-9 w-24" /></Felt>
              <Felt label="Motstand"><input value={k.motstand} onChange={e => endreKrets(i, { motstand: e.target.value })} className="input !h-9 w-24" /></Felt>
              <IconButton variant="ghost" label="Fjern krets" icon={<Trash2 />} onClick={() => endre({ kretser: s.kretser.filter((_, j) => j !== i) })} className="w-9 h-9 hover:!text-red-500" />
            </div>
          ))}
        </div>
        <Button variant="outline" icon={<Plus />} onClick={() => endre({ kretser: [...s.kretser, { nr: String(s.kretser.length + 1), aktivering: '', hvile: '', motstand: '' }] })}>Legg til krets</Button>
      </Seksjonskort>

      {/* Sjekkpunkter */}
      <Seksjonskort tittel="Sjekkpunkter" antall={`${vurdert}/${punkter.length}`} apen={!lukkede.has('Sjekkpunkter')} onToggle={() => toggle('Sjekkpunkter')}>
        <ul className="divide-y divide-gray-200 dark:divide-gray-800 -mx-4 sm:-mx-6">
          {punkter.map(p => {
            const sp = tilstandFor(s, p)
            const visMerknad = sp.tilstand === 'Avvik' || sp.tilstand === 'Anbefaling' || Boolean(sp.merknad)
            return (
              <li key={p} className="px-4 sm:px-6 py-2.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={cn('text-sm', sp.tilstand ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400')}>{p}</span>
                  <div className="flex gap-1">
                    {TILSTANDER.map(t => (
                      <button key={t} type="button" onClick={() => settPunkt(p, { tilstand: sp.tilstand === t ? '' : t })}
                        className={cn('h-8 px-2.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap',
                          sp.tilstand === t ? TILSTAND_FARGE[t] : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400')}>
                        {t === 'Ikke aktuell' ? 'N/A' : t}
                      </button>
                    ))}
                  </div>
                </div>
                {visMerknad && (
                  <input value={sp.merknad} onChange={e => settPunkt(p, { merknad: e.target.value })}
                    placeholder={sp.tilstand === 'Avvik' ? 'Hva er feil? (kommer i avvikslisten)' : 'Hva bør utbedres? (kommer i anbefalingslisten)'}
                    className="input !h-9 w-full" />
                )}
              </li>
            )
          })}
        </ul>
      </Seksjonskort>

      {/* Byttet utstyr */}
      <Seksjonskort tittel="Byttet utstyr" antall={s.byttet_utstyr_liste.length} apen={!lukkede.has('Byttet utstyr')} onToggle={() => toggle('Byttet utstyr')}>
        {s.byttet_utstyr_liste.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Ingenting byttet ved denne kontrollen.</p>}
        <div className="space-y-2">
          {s.byttet_utstyr_liste.map((u, i) => (
            <div key={i} className="flex items-end gap-2">
              <Felt label="Materiell" bred><input value={u.materiell} onChange={e => endreUtstyr(i, { materiell: e.target.value })} placeholder="Batteri 12V 7Ah" className="input !h-9" /></Felt>
              <Felt label="Antall"><input type="number" value={u.antall} onChange={e => endreUtstyr(i, { antall: Number(e.target.value) || 0 })} className="input !h-9 w-20" /></Felt>
              <IconButton variant="ghost" label="Fjern" icon={<Trash2 />} onClick={() => endre({ byttet_utstyr_liste: s.byttet_utstyr_liste.filter((_, j) => j !== i) })} className="w-9 h-9 hover:!text-red-500" />
            </div>
          ))}
        </div>
        <Button variant="outline" icon={<Plus />} onClick={() => endre({ byttet_utstyr_liste: [...s.byttet_utstyr_liste, { materiell: '', antall: 1 }] })}>Legg til utstyr</Button>
      </Seksjonskort>

      {/* Konklusjon */}
      <Seksjonskort tittel="Konklusjon" apen={!lukkede.has('Konklusjon')} onToggle={() => toggle('Konklusjon')}>
        <JaNei label="Funksjonstestet anlegg" verdi={s.funksjonsteste} onChange={v => endre({ funksjonsteste: v })} />
        <JaNei label="Er anlegget i forskriftsmessig stand" verdi={s.kontroll_forskriftsmessig === 'Ja' ? true : s.kontroll_forskriftsmessig === 'Nei' ? false : null}
          onChange={v => endre({ kontroll_forskriftsmessig: v === null ? null : v ? 'Ja' : 'Nei' })} />
        <Felt label="Merknad til tilstand" bred>
          <input value={s.anleggsinfo ?? ''} onChange={e => endre({ anleggsinfo: e.target.value })} placeholder="F.eks. Sentral er defekt. Må byttes for sikker drift." className="input !h-9" />
        </Felt>
        <Felt label="Anbefalte utbedringer" bred>
          <input value={s.kontroll_anbefalte_utbedringer ?? ''} onChange={e => endre({ kontroll_anbefalte_utbedringer: e.target.value })} placeholder="F.eks. Bytte defekt aktuator. Tilbud sendes." className="input !h-9" />
        </Felt>
        {funn.avvik.length > 0 && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-900/10 p-3">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400 inline-flex items-center gap-1.5 mb-1"><AlertTriangle className="w-3.5 h-3.5" />Avvik som kommer i rapporten</p>
            <ul className="text-sm text-gray-800 dark:text-gray-200 space-y-0.5">
              {funn.avvik.map(a => <li key={a.punkt}>· <b>{a.punkt}</b>{a.merknad ? ` – ${a.merknad}` : ''}</li>)}
            </ul>
          </div>
        )}
        {funn.anbefalinger.length > 0 && (
          <div className="rounded-lg border border-yellow-200 dark:border-yellow-900 bg-yellow-50/60 dark:bg-yellow-900/10 p-3">
            <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Anbefalinger som kommer i rapporten</p>
            <ul className="text-sm text-gray-800 dark:text-gray-200 space-y-0.5">
              {funn.anbefalinger.map(a => <li key={a.punkt}>· <b>{a.punkt}</b>{a.merknad ? ` – ${a.merknad}` : ''}</li>)}
            </ul>
          </div>
        )}
      </Seksjonskort>

      <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-w)] z-20 bg-white dark:bg-dark-50 border-t border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400 mr-auto tabular-nums">{vurdert}/{punkter.length} vurdert</span>
        <Button variant="ghost" onClick={onTilbake}>Tilbake</Button>
        <Button variant="primary" icon={<Check />} loading={lagrer} onClick={() => { if (s) { endret.current = true; skriv(s) } }}>Lagre</Button>
      </div>
    </div>
  )

  function endreKrets(i: number, patch: Partial<Krets>) {
    if (!s) return
    endre({ kretser: s.kretser.map((k, j) => j === i ? { ...k, ...patch } : k) })
  }
  function endreUtstyr(i: number, patch: Partial<ByttetUtstyr>) {
    if (!s) return
    endre({ byttet_utstyr_liste: s.byttet_utstyr_liste.map((u, j) => j === i ? { ...u, ...patch } : u) })
  }
}

function Seksjonskort({ tittel, antall, apen, onToggle, children }: { tittel: string; antall?: number | string; apen: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="card !p-0 overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={apen} className="w-full flex items-center gap-2 px-4 sm:px-6 py-2.5 text-left">
        {apen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{tittel}</span>
        {antall !== undefined && <span className="text-xs text-gray-400 tabular-nums">({antall})</span>}
      </button>
      {apen && <div className="border-t border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3 space-y-3">{children}</div>}
    </section>
  )
}

function Felt({ label, bred, children }: { label: string; bred?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn('space-y-1 block', bred && 'col-span-2')}>
      <span className="block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      {children}
    </label>
  )
}

function JaNei({ label, verdi, onChange }: { label: string; verdi: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-900 dark:text-white">{label}</span>
      <div className="flex gap-1">
        {[true, false].map(v => (
          <button key={String(v)} type="button" onClick={() => onChange(verdi === v ? null : v)}
            className={cn('h-8 px-3 rounded-lg border text-xs font-semibold transition-colors',
              verdi === v ? (v ? 'bg-green-500 border-green-500 text-white' : 'bg-red-500 border-red-500 text-white')
                : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400')}>
            {v ? 'Ja' : 'Nei'}
          </button>
        ))}
      </div>
    </div>
  )
}
