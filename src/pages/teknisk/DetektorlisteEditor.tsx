/**
 * Detektorliste – redigering. Laget for rask innlegging fra tegning på PC:
 * Enter går til samme kolonne i neste rad, «Legg til» lager N rader med valgt type og fortløpende adresser,
 * alt lagres 2,5 s etter siste endring. Kontaktinfo og adresse fylles fra anlegget på nye lister.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Check, ChevronRight, Eye, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { Button, IconButton } from '@/components/ui/Button'
import { DetektorlistePreview } from './DetektorlistePreview'

interface DetektorlisteEditorProps {
  detektorlisteId?: string
  kundeId: string
  anleggId: string
  kundeNavn: string
  anleggNavn: string
  prosjektId?: string
  /** Forhåndsutfylte rader (f.eks. fra enheter registrert på anlegget) for en ny liste */
  startRader?: { type: string; antall: number }[]
  onBack: () => void
}
export interface DetektorItem { id?: string; adresse: string; type: string; plassering: string; kart: string; akse: string; etasje: string; kommentar: string }

export const DETEKTORTYPER = ['Røykdetektor', 'Varmedetektor', 'Multidetektor', 'Multisensor', 'Flammedetektor', 'Gassdetekt', 'Manuell melder', 'Summer', 'Blitz', 'Base', 'Annen'] as const
const KOLONNER: { key: keyof DetektorItem; navn: string; bredde: string; placeholder?: string }[] = [
  { key: 'adresse', navn: 'Adresse', bredde: 'w-24', placeholder: '001' },
  { key: 'type', navn: 'Type', bredde: 'w-40' },
  { key: 'plassering', navn: 'Plassering', bredde: 'min-w-[200px]', placeholder: 'Gang 2. etg' },
  { key: 'etasje', navn: 'Etasje', bredde: 'w-20', placeholder: '2' },
  { key: 'kart', navn: 'Kart', bredde: 'w-20' },
  { key: 'akse', navn: 'Akse', bredde: 'w-20' },
  { key: 'kommentar', navn: 'Kommentar', bredde: 'min-w-[160px]' },
]
const tom = (): DetektorItem => ({ adresse: '', type: '', plassering: '', kart: '', akse: '', etasje: '', kommentar: '' })

/** Neste adresse etter den høyeste numeriske, med samme nullpadding («007» → «008») */
function nesteAdresse(rader: DetektorItem[], offset = 1): string {
  const num = rader.map(r => r.adresse.trim()).filter(a => /^\d+$/.test(a))
  if (num.length === 0) return String(offset).padStart(3, '0')
  const bredde = Math.max(...num.map(a => a.length))
  const maks = Math.max(...num.map(a => parseInt(a, 10)))
  return String(maks + offset).padStart(bredde, '0')
}

export function DetektorlisteEditor({ detektorlisteId, kundeId, anleggId, kundeNavn, anleggNavn, prosjektId, startRader, onBack }: DetektorlisteEditorProps) {
  const { ansatt: meg } = useCurrentAnsatt()
  const [loading, setLoading] = useState(Boolean(detektorlisteId))
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [dirty, setDirty] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [listeId, setListeId] = useState<string | undefined>(detektorlisteId)
  const [visOm, setVisOm] = useState(!detektorlisteId)
  const [status, setStatus] = useState<'Utkast' | 'Ferdig'>('Utkast')

  const [revisjon, setRevisjon] = useState('1.0')
  const [dato, setDato] = useState(new Date().toISOString().slice(0, 10))
  const [servicetekniker, setServicetekniker] = useState('')
  const [kundeadresse, setKundeadresse] = useState('')
  const [kontaktperson, setKontaktperson] = useState('')
  const [mobil, setMobil] = useState('')
  const [epost, setEpost] = useState('')
  const [annet, setAnnet] = useState('')
  const [rader, setRader] = useState<DetektorItem[]>([])

  const [sort, setSort] = useState<{ key: keyof DetektorItem; dir: 'asc' | 'desc' } | null>(null)
  const [fokus, setFokus] = useState<{ rad: number; kol: keyof DetektorItem } | null>(null)
  const [leggTilAntall, setLeggTilAntall] = useState(5)
  const [leggTilType, setLeggTilType] = useState('')
  const lagrerRef = useRef(false)

  // Last eksisterende eller forhåndsutfyll ny
  useEffect(() => {
    if (detektorlisteId) { last(detektorlisteId); return }
    // Ny liste: tekniker = deg, adresse/kontakt fra anlegget
    Promise.all([
      supabase.from('anlegg').select('adresse, postnummer, poststed').eq('id', anleggId).single(),
      supabase.from('anlegg_kontaktpersoner').select('primar, kontaktpersoner(navn, telefon, epost)').eq('anlegg_id', anleggId),
    ]).then(([a, k]) => {
      if (a.data) setKundeadresse([a.data.adresse, [a.data.postnummer, a.data.poststed].filter(Boolean).join(' ')].filter(Boolean).join(', '))
      const kontakter = (k.data ?? []).map(x => ({ primar: x.primar, k: x.kontaktpersoner as unknown as { navn: string | null; telefon: string | null; epost: string | null } | null })).filter(x => x.k)
      const p = kontakter.find(x => x.primar) ?? kontakter[0]
      if (p?.k) { setKontaktperson(p.k.navn ?? ''); setMobil(p.k.telefon ?? ''); setEpost(p.k.epost ?? '') }
    })
    if (startRader?.length) {
      const nye: DetektorItem[] = []
      for (const s of startRader) for (let i = 0; i < s.antall; i++) nye.push({ ...tom(), type: s.type, adresse: String(nye.length + 1).padStart(3, '0') })
      setRader(nye)
    } else setRader([tom(), tom(), tom()])
    setDirty(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detektorlisteId, anleggId])
  useEffect(() => { if (!detektorlisteId && meg?.navn && !servicetekniker) setServicetekniker(meg.navn) }, [meg, detektorlisteId, servicetekniker])

  async function last(id: string) {
    try {
      setLoading(true)
      const [l, i] = await Promise.all([
        supabase.from('detektorlister').select('*').eq('id', id).single(),
        supabase.from('detektor_items').select('*').eq('detektorliste_id', id),
      ])
      if (l.error) throw l.error
      const liste = l.data
      setRevisjon(liste.revisjon || '1.0'); setDato(liste.dato?.slice(0, 10) || new Date().toISOString().slice(0, 10))
      setServicetekniker(liste.service_ingeniør || ''); setKundeadresse(liste.kundeadresse || ''); setKontaktperson(liste.kontakt_person || '')
      setMobil(liste.mobil || ''); setEpost(liste.epost || ''); setAnnet(liste.annet || ''); setStatus(liste.status === 'Ferdig' ? 'Ferdig' : 'Utkast')
      const items = ((i.data ?? []) as DetektorItem[]).map(x => ({ id: x.id, adresse: x.adresse ?? '', type: x.type ?? '', plassering: x.plassering ?? '', kart: x.kart ?? '', akse: x.akse ?? '', etasje: x.etasje ?? '', kommentar: x.kommentar ?? '' }))
        .sort((a, b) => a.adresse.localeCompare(b.adresse, 'nb-NO', { numeric: true }))
      setRader(items.length ? items : [tom(), tom(), tom()])
      setDirty(false)
    } catch (err) { toast.error('Kunne ikke laste detektorlisten', err) } finally { setLoading(false) }
  }

  const lagre = useCallback(async (stille = true) => {
    if (lagrerRef.current) return
    lagrerRef.current = true; setSaving(true)
    try {
      const hode = { kunde_id: kundeId, anlegg_id: anleggId, prosjekt_id: prosjektId || null, revisjon, dato, service_ingeniør: servicetekniker, kundeadresse, kontakt_person: kontaktperson, mobil, epost, annet, status, oppdatert_dato: new Date().toISOString() }
      let id = listeId
      if (id) { const { error } = await supabase.from('detektorlister').update(hode).eq('id', id); if (error) throw error }
      else { const { data, error } = await supabase.from('detektorlister').insert({ ...hode, opprettet_dato: new Date().toISOString() }).select('id').single(); if (error) throw error; id = data.id; setListeId(id) }
      const { error: e1 } = await supabase.from('detektor_items').delete().eq('detektorliste_id', id)
      if (e1) throw e1
      const items = rader.filter(r => r.adresse.trim() || r.type || r.plassering.trim()).map((r, i) => ({ detektorliste_id: id, adresse: r.adresse.trim() || String(i + 1).padStart(3, '0'), type: r.type || null, plassering: r.plassering || null, kart: r.kart || null, akse: r.akse || null, etasje: r.etasje || null, kommentar: r.kommentar || null, rekkefølge: i }))
      if (items.length) { const { error: e2 } = await supabase.from('detektor_items').insert(items); if (e2) throw e2 }
      setLastSaved(new Date()); setDirty(false)
      if (!stille) toast.success('Detektorliste lagret')
    } catch (err) { toast.error('Kunne ikke lagre detektorlisten', err) } finally { lagrerRef.current = false; setSaving(false) }
  }, [kundeId, anleggId, prosjektId, revisjon, dato, servicetekniker, kundeadresse, kontaktperson, mobil, epost, annet, status, listeId, rader])

  // Autolagring
  useEffect(() => {
    if (!dirty || loading) return
    const t = setTimeout(() => lagre(true), 2500)
    return () => clearTimeout(t)
  }, [dirty, loading, lagre])

  const endre = <K extends keyof DetektorItem>(i: number, key: K, verdi: DetektorItem[K]) => { setRader(prev => prev.map((r, j) => j === i ? { ...r, [key]: verdi } : r)); setDirty(true) }
  const hode = (fn: () => void) => { fn(); setDirty(true) }

  function leggTil(antall: number, type: string) {
    setRader(prev => { const nye = [...prev]; for (let i = 0; i < antall; i++) nye.push({ ...tom(), type, adresse: nesteAdresse(nye) }); return nye })
    setDirty(true)
    setTimeout(() => setFokus({ rad: rader.length, kol: 'plassering' }), 0)
  }
  function slettRad(i: number) { setRader(prev => prev.filter((_, j) => j !== i)); setDirty(true) }
  function sorter(key: keyof DetektorItem) {
    const dir = sort?.key === key && sort.dir === 'asc' ? 'desc' : 'asc'
    setSort({ key, dir })
    setRader(prev => [...prev].sort((a, b) => { const r = (a[key] ?? '').localeCompare(b[key] ?? '', 'nb-NO', { numeric: true }); return dir === 'asc' ? r : -r }))
  }
  async function tilbake() { if (dirty) await lagre(true); onBack() }

  const perType = useMemo(() => { const m = new Map<string, number>(); for (const r of rader) if (r.type) m.set(r.type, (m.get(r.type) ?? 0) + 1); return Array.from(m.entries()).sort((a, b) => b[1] - a[1]) }, [rader])
  const antall = rader.filter(r => r.adresse.trim() || r.type).length

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
  if (showPreview) {
    return <DetektorlistePreview kundeId={kundeId} anleggId={anleggId} kundeNavn={kundeNavn} anleggNavn={anleggNavn} anleggAdresse={kundeadresse} revisjon={revisjon} dato={dato} servicetekniker={servicetekniker} kontaktperson={kontaktperson} mobil={mobil} epost={epost} annet={annet} detektorer={rader.filter(r => r.adresse.trim() || r.type)} onBack={() => setShowPreview(false)} />
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={tilbake} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />Detektorlister</button>
        <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{anleggNavn}</span>
      </div>
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{detektorlisteId ? `Detektorliste rev. ${revisjon}` : 'Ny detektorliste'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{kundeNavn} · {anleggNavn} · {antall} {antall === 1 ? 'enhet' : 'enheter'}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 whitespace-nowrap">{saving ? 'Lagrer…' : dirty ? 'Ulagrede endringer' : lastSaved ? `Lagret ${lastSaved.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}` : 'Lagres automatisk'}</span>
          <Button variant="outline" icon={<Eye />} onClick={async () => { if (dirty) await lagre(true); setShowPreview(true) }}>Forhåndsvis / PDF</Button>
        </div>
      </header>

      {/* Om listen */}
      <section className="card !p-0 overflow-hidden">
        <button type="button" onClick={() => setVisOm(v => !v)} aria-expanded={visOm} className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-dark-100 text-left">
          <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', visOm && 'rotate-90')} />
          <span className="font-semibold text-gray-900 dark:text-white">Om listen</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{[`Rev. ${revisjon}`, dato, servicetekniker, kontaktperson].filter(Boolean).join(' · ')}</span>
          <span className={cn('ml-auto text-xs px-2 py-0.5 rounded-full', status === 'Ferdig' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400')}>{status}</span>
        </button>
        {visOm && (
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Felt id="dl-rev" label="Revisjon" verdi={revisjon} onChange={v => hode(() => setRevisjon(v))} placeholder="1.0" />
            <Felt id="dl-dato" label="Dato" verdi={dato} type="date" onChange={v => hode(() => setDato(v))} />
            <Felt id="dl-tek" label="Servicetekniker" verdi={servicetekniker} onChange={v => hode(() => setServicetekniker(v))} placeholder="Navn" />
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-gray-900 dark:text-white">Status</span>
              <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden h-10" role="radiogroup">
                {(['Utkast', 'Ferdig'] as const).map(s => <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => hode(() => setStatus(s))} className={cn('px-4 text-sm', status === s ? (s === 'Ferdig' ? 'bg-green-600 text-white' : 'bg-yellow-500 text-white') : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100')}>{s}</button>)}
              </div>
            </div>
            <Felt id="dl-adr" label="Anleggsadresse" verdi={kundeadresse} onChange={v => hode(() => setKundeadresse(v))} klasse="sm:col-span-2" />
            <Felt id="dl-kp" label="Kontaktperson" verdi={kontaktperson} onChange={v => hode(() => setKontaktperson(v))} />
            <Felt id="dl-mob" label="Mobil" verdi={mobil} onChange={v => hode(() => setMobil(v))} />
            <Felt id="dl-ep" label="E-post" verdi={epost} onChange={v => hode(() => setEpost(v))} klasse="sm:col-span-2" />
            <Felt id="dl-annet" label="Annet" verdi={annet} onChange={v => hode(() => setAnnet(v))} klasse="sm:col-span-2" placeholder="Merknader som skal med på listen" />
          </div>
        )}
      </section>

      {/* Oppsummering per type */}
      {perType.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold tabular-nums">{antall} enheter</span>
          {perType.map(([t, n]) => <span key={t} className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 tabular-nums">{t} <b>{n}</b></span>)}
        </div>
      )}

      {/* Tabell */}
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-gray-50 dark:bg-dark-100 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <tr>
              <th className="w-8 px-2 py-2 text-right font-normal">#</th>
              {KOLONNER.map(k => (
                <th key={k.key} className={cn('px-1.5 py-2 text-left font-semibold', k.bredde)}>
                  <button type="button" onClick={() => sorter(k.key)} className={cn('inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white', sort?.key === k.key && 'text-gray-900 dark:text-white')}>{k.navn}{sort?.key === k.key ? (sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</button>
                </th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rader.map((r, i) => (
              <tr key={r.id ?? `ny-${i}`} className="hover:bg-gray-50 dark:hover:bg-dark-100/60">
                <td className="px-2 py-1 text-right text-xs text-gray-400 tabular-nums">{i + 1}</td>
                {KOLONNER.map(k => (
                  <td key={k.key} className="px-1 py-1">
                    {k.key === 'type' ? (
                      <select value={r.type} onChange={e => endre(i, 'type', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setFokus({ rad: i + 1, kol: 'type' }) } }} ref={el => { if (el && fokus?.rad === i && fokus.kol === 'type') { el.focus(); setFokus(null) } }} className={cn('input !h-[34px] !min-h-[34px] !py-0 !px-1.5 text-sm w-full', !r.type && 'text-gray-400')}>
                        <option value="">Type…</option>
                        {DETEKTORTYPER.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <input value={r[k.key] as string} onChange={e => endre(i, k.key, e.target.value)} placeholder={k.placeholder} list={k.key === 'plassering' || k.key === 'etasje' ? `dl-forslag-${k.key}` : undefined}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (i === rader.length - 1) leggTil(1, r.type); else setFokus({ rad: i + 1, kol: k.key }) } }}
                        ref={el => { if (el && fokus?.rad === i && fokus.kol === k.key) { el.focus(); el.select(); setFokus(null) } }}
                        className={cn('input !h-[34px] !min-h-[34px] !py-0 !px-1.5 text-sm w-full', k.key === 'adresse' && 'font-mono')} />
                    )}
                  </td>
                ))}
                <td className="px-1 py-1"><IconButton variant="ghost" label="Slett rad" icon={<Trash2 />} onClick={() => slettRad(i)} className="w-8 h-8 hover:!text-red-500" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id="dl-forslag-plassering">{Array.from(new Set(rader.map(r => r.plassering.trim()).filter(Boolean))).map(p => <option key={p} value={p} />)}</datalist>
        <datalist id="dl-forslag-etasje">{Array.from(new Set(rader.map(r => r.etasje.trim()).filter(Boolean))).map(p => <option key={p} value={p} />)}</datalist>

        {/* Legg til */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-dark-100/40">
          <span className="text-sm text-gray-700 dark:text-gray-300">Legg til</span>
          <input type="number" min={1} max={200} value={leggTilAntall} onChange={e => setLeggTilAntall(Math.max(1, Math.min(200, Number(e.target.value) || 1)))} aria-label="Antall" className="input !h-[36px] !min-h-[36px] !py-0 w-20 text-center" />
          <select value={leggTilType} onChange={e => setLeggTilType(e.target.value)} aria-label="Type for nye rader" className="input !h-[36px] !min-h-[36px] !py-0 w-auto text-sm">
            <option value="">uten type</option>
            {DETEKTORTYPER.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button variant="primary" icon={<Plus />} onClick={() => leggTil(leggTilAntall, leggTilType)}>rader</Button>
          <span className="text-xs text-gray-500 dark:text-gray-400">Adresser fortsetter fra {nesteAdresse(rader)}. Enter i siste rad lager en ny med samme type.</span>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-w)] z-20 bg-white dark:bg-dark-50 border-t border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400 mr-auto tabular-nums">{antall} enheter · {perType.length} typer</span>
        <Button variant="ghost" onClick={tilbake}>Lukk</Button>
        <Button variant="primary" icon={<Check />} loading={saving} onClick={() => lagre(false)}>Lagre nå</Button>
      </div>
    </div>
  )
}

function Felt({ id, label, verdi, onChange, placeholder, type, klasse }: { id: string; label: string; verdi: string; onChange: (v: string) => void; placeholder?: string; type?: string; klasse?: string }) {
  return (
    <div className={cn('space-y-1.5', klasse)}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900 dark:text-white">{label}</label>
      <input id={id} type={type ?? 'text'} value={verdi} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input" />
    </div>
  )
}
