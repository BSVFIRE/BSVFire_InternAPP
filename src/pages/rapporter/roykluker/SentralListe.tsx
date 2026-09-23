/**
 * Røykluker – oversikt over sentralene på anlegget.
 *
 * Erstatter de tre gamle skjermene («Sentraler og luker», «Sentraldata», «Kommentarer»):
 * sentralene ligger som sammenleggbare kort med lukene sine, og herfra går du inn i
 * kontrollskjemaet for én sentral. Kommentarer er en seksjon nederst.
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, Check, ChevronDown, ChevronRight, Loader2, MessageSquare, MoreHorizontal,
  Plus, Search, Settings2, Trash2, Wind, X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn, formatDateTime } from '@/lib/utils'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import { useAuthStore } from '@/store/authStore'
import {
  ANLEGGSTYPER, AVVIK_STATUSER, STATUSER, STATUS_FARGE, erKontrollert, sentralNavn,
  type Anleggstype, type Kommentar, type Luke, type Sentral,
} from './typer'

type Chip = 'alle' | 'gjenstar' | 'kontrollert' | 'avvik'

export function SentralListe({ anleggId, kundeNavn, anleggNavn, onApneSentral }: {
  anleggId: string
  kundeNavn: string
  anleggNavn: string
  onApneSentral: (sentralId: string) => void
}) {
  const { user } = useAuthStore()
  const [params, setParams] = useSearchParams()
  const chip = (params.get('f') as Chip) || 'alle'
  const sok = params.get('q') || ''

  const [sentraler, setSentraler] = useState<Sentral[]>([])
  const [luker, setLuker] = useState<Luke[]>([])
  const [kommentarer, setKommentarer] = useState<Kommentar[]>([])
  const [laster, setLaster] = useState(true)
  const [apne, setApne] = useState<Set<string>>(new Set())
  const [lagrer, setLagrer] = useState<Set<string>>(new Set())
  const [nyType, setNyType] = useState(false)
  const [nyKommentar, setNyKommentar] = useState('')
  const [visKommentarer, setVisKommentarer] = useState(false)

  function setParam(k: string, v: string | null) {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v); else p.delete(k)
    setParams(p, { replace: true })
  }

  useEffect(() => { last() }, [anleggId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function last() {
    setLaster(true)
    try {
      const { data: s, error } = await supabase.from('roykluke_sentraler').select('*').eq('anlegg_id', anleggId).order('sentral_nr', { nullsFirst: false })
      if (error) throw error
      const liste = (s ?? []) as Sentral[]
      setSentraler(liste)
      if (liste.length > 0) {
        const { data: l } = await supabase.from('roykluke_luker').select('*').in('sentral_id', liste.map(x => x.id))
        setLuker((l ?? []) as Luke[])
      } else setLuker([])
      const { data: k } = await supabase.from('kommentar_roykluker').select('*').eq('anlegg_id', anleggId).order('created_at', { ascending: false })
      setKommentarer((k ?? []) as Kommentar[])
    } catch (e) {
      console.error('Feil ved lasting av røykluker:', e)
      toast.error('Kunne ikke laste røykluker', e)
    } finally {
      setLaster(false)
    }
  }

  const lukerPer = useMemo(() => {
    const m = new Map<string, Luke[]>()
    for (const l of luker) { const a = m.get(l.sentral_id) ?? []; a.push(l); m.set(l.sentral_id, a) }
    return m
  }, [luker])

  function avvikFor(s: Sentral): number {
    const egne = AVVIK_STATUSER.has(s.status ?? '') ? 1 : 0
    return egne + (lukerPer.get(s.id) ?? []).filter(l => AVVIK_STATUSER.has(l.status ?? '')).length
  }

  const teller = useMemo(() => ({
    alle: sentraler.length,
    kontrollert: sentraler.filter(erKontrollert).length,
    gjenstar: sentraler.filter(s => !erKontrollert(s)).length,
    avvik: sentraler.filter(s => avvikFor(s) > 0).length,
    luker: luker.length,
  }), [sentraler, luker]) // eslint-disable-line react-hooks/exhaustive-deps

  const synlige = useMemo(() => {
    const s = sok.trim().toLowerCase()
    return sentraler.filter(x => {
      if (chip === 'kontrollert' && !erKontrollert(x)) return false
      if (chip === 'gjenstar' && erKontrollert(x)) return false
      if (chip === 'avvik' && avvikFor(x) === 0) return false
      if (!s) return true
      const lukeTreff = (lukerPer.get(x.id) ?? []).some(l => [l.plassering, l.luke_type, l.Koblet_til].some(v => v?.toLowerCase().includes(s)))
      return [String(x.sentral_nr ?? ''), x.plassering, x.anlegg_type, x.status].some(v => v?.toLowerCase().includes(s)) || lukeTreff
    })
  }, [sentraler, chip, sok, lukerPer]) // eslint-disable-line react-hooks/exhaustive-deps

  const pct = teller.alle ? Math.round((teller.kontrollert / teller.alle) * 100) : 0

  function toggle(id: string) {
    setApne(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function nySentral(type: Anleggstype) {
    setNyType(false)
    const neste = Math.max(0, ...sentraler.map(s => s.sentral_nr ?? 0)) + 1
    const { data, error } = await supabase.from('roykluke_sentraler')
      .insert([{ anlegg_id: anleggId, anlegg_type: type, sentral_nr: neste, plassering: '', status: 'OK' }])
      .select().single()
    if (error) { toast.error('Kunne ikke opprette sentral', error); return }
    setSentraler(prev => [...prev, data as Sentral])
    setApne(prev => new Set(prev).add((data as Sentral).id))
    toast.success(`Sentral ${neste} opprettet`)
  }

  /** Lagrer ett felt med en gang, med tilbakerulling hvis det feiler */
  async function endreSentral(id: string, patch: Partial<Sentral>) {
    const forrige = sentraler.find(s => s.id === id)
    if (!forrige) return
    setSentraler(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    setLagrer(prev => new Set(prev).add(id))
    const { error } = await supabase.from('roykluke_sentraler').update(patch).eq('id', id)
    setLagrer(prev => { const n = new Set(prev); n.delete(id); return n })
    if (error) {
      setSentraler(prev => prev.map(s => s.id === id ? forrige : s))
      toast.error('Kunne ikke lagre', error)
    }
  }

  async function slettSentral(s: Sentral) {
    const antall = (lukerPer.get(s.id) ?? []).length
    if (!confirm(`Slette ${sentralNavn(s)}${antall ? ` og ${antall} ${antall === 1 ? 'luke' : 'luker'}` : ''}? Dette kan ikke angres.`)) return
    if (antall > 0) {
      const { error } = await supabase.from('roykluke_luker').delete().eq('sentral_id', s.id)
      if (error) { toast.error('Kunne ikke slette lukene', error); return }
    }
    const { error } = await supabase.from('roykluke_sentraler').delete().eq('id', s.id)
    if (error) { toast.error('Kunne ikke slette sentralen', error); return }
    setSentraler(prev => prev.filter(x => x.id !== s.id))
    setLuker(prev => prev.filter(l => l.sentral_id !== s.id))
    toast.success('Sentralen er slettet')
  }

  async function nyLuke(s: Sentral) {
    const { data, error } = await supabase.from('roykluke_luker')
      .insert([{ sentral_id: s.id, luke_type: s.anlegg_type || 'Røykluker', plassering: '', status: 'OK', skader: '', funksjonstest: false, Koblet_til: '' }])
      .select().single()
    if (error) { toast.error('Kunne ikke opprette luke', error); return }
    setLuker(prev => [...prev, data as Luke])
  }

  async function endreLuke(id: string, patch: Partial<Luke>) {
    const forrige = luker.find(l => l.id === id)
    if (!forrige) return
    setLuker(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
    const { error } = await supabase.from('roykluke_luker').update(patch).eq('id', id)
    if (error) {
      setLuker(prev => prev.map(l => l.id === id ? forrige : l))
      toast.error('Kunne ikke lagre', error)
    }
  }

  async function slettLuke(l: Luke) {
    if (!confirm(`Slette luken${l.plassering ? ` «${l.plassering}»` : ''}?`)) return
    const { error } = await supabase.from('roykluke_luker').delete().eq('id', l.id)
    if (error) { toast.error('Kunne ikke slette luken', error); return }
    setLuker(prev => prev.filter(x => x.id !== l.id))
  }

  async function leggTilKommentar() {
    const tekst = nyKommentar.trim()
    if (!tekst) return
    const { data: ansatt } = await supabase.from('ansatte').select('navn').eq('epost', user?.email ?? '').maybeSingle()
    const { data, error } = await supabase.from('kommentar_roykluker')
      .insert([{ anlegg_id: anleggId, kommentar: tekst, opprettet_av: ansatt?.navn ?? user?.email ?? null, opprettet_dato: new Date().toISOString() }])
      .select().single()
    if (error) { toast.error('Kunne ikke lagre kommentaren', error); return }
    setKommentarer(prev => [data as Kommentar, ...prev])
    setNyKommentar('')
  }

  async function slettKommentar(id: string) {
    if (!confirm('Slette kommentaren?')) return
    const { error } = await supabase.from('kommentar_roykluker').delete().eq('id', id)
    if (error) { toast.error('Kunne ikke slette kommentaren', error); return }
    setKommentarer(prev => prev.filter(k => k.id !== id))
  }

  if (laster) return <div className="card py-12 text-center text-sm text-gray-500">Laster røykluker…</div>

  return (
    <div className="space-y-4">
      {/* Fremdrift */}
      <div className="card !py-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <b className="text-gray-900 dark:text-white tabular-nums">{teller.kontrollert} av {teller.alle}</b> sentraler kontrollert
            <span className="text-gray-400"> · {pct} %</span>
            {teller.luker > 0 && <span className="text-gray-500 dark:text-gray-400"> · {teller.luker} {teller.luker === 1 ? 'luke' : 'luker'}</span>}
          </p>
          {teller.avvik > 0 && (
            <button type="button" onClick={() => setParam('f', 'avvik')} className="text-sm font-semibold text-red-600 dark:text-red-400 inline-flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />{teller.avvik} med avvik
            </button>
          )}
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-dark-100 overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-green-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Filtre */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 flex-1" role="group" aria-label="Filter">
          <Chipknapp aktiv={chip === 'alle'} onClick={() => setParam('f', null)}>Alle <b>{teller.alle}</b></Chipknapp>
          <Chipknapp aktiv={chip === 'gjenstar'} onClick={() => setParam('f', 'gjenstar')}>Gjenstår <b>{teller.gjenstar}</b></Chipknapp>
          <Chipknapp aktiv={chip === 'kontrollert'} onClick={() => setParam('f', 'kontrollert')}><Check className="w-3.5 h-3.5" />Kontrollert <b>{teller.kontrollert}</b></Chipknapp>
          <Chipknapp aktiv={chip === 'avvik'} onClick={() => setParam('f', 'avvik')}><span className="w-2 h-2 rounded-full bg-red-500" />Avvik <b>{teller.avvik}</b></Chipknapp>
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="search" value={sok} onChange={e => setParam('q', e.target.value || null)} placeholder="Søk nr., plassering…" className="input pl-9 w-full !h-[38px]" />
        </div>
        <Button variant="primary" icon={<Plus />} className="!h-[38px] w-full sm:w-auto" onClick={() => setNyType(true)}>Ny sentral</Button>
      </div>

      {/* Sentraler */}
      {synlige.length === 0 ? (
        <div className="card py-10 text-center space-y-3">
          <Wind className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {sentraler.length === 0 ? 'Ingen sentraler registrert på anlegget ennå.' : 'Ingen sentraler passer filtrene.'}
          </p>
          {sentraler.length === 0 && <Button variant="primary" icon={<Plus />} onClick={() => setNyType(true)}>Legg til første sentral</Button>}
        </div>
      ) : (
        <div className="space-y-2">
          {synlige.map(s => {
            const apen = apne.has(s.id)
            const mine = lukerPer.get(s.id) ?? []
            const avvik = avvikFor(s)
            return (
              <section key={s.id} className="card !p-0 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button type="button" onClick={() => toggle(s.id)} aria-expanded={apen} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    {apen ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-gray-900 dark:text-white truncate">{sentralNavn(s)}</span>
                        {erKontrollert(s) && <Check className="w-4 h-4 text-green-500 flex-shrink-0" strokeWidth={3} />}
                        {avvik > 0 && <span className="text-xs font-semibold text-red-600 dark:text-red-400 inline-flex items-center gap-1 flex-shrink-0"><AlertTriangle className="w-3 h-3" />{avvik}</span>}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                        {[s.anlegg_type, `${mine.length} ${mine.length === 1 ? 'luke' : 'luker'}`, s.sentral_produsent].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </button>
                  {lagrer.has(s.id) && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                  <span className={cn('hidden sm:inline-flex items-center px-2 h-7 rounded-full border text-xs font-semibold', STATUS_FARGE[s.status ?? ''] ?? 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-dark-100 dark:text-gray-400 dark:border-gray-700')}>{s.status ?? 'Uten status'}</span>
                  <Button variant="outline" icon={<Settings2 />} onClick={() => onApneSentral(s.id)} className="!h-8">Kontroll</Button>
                  <DropdownMenu trigger={open => <IconButton variant="ghost" label="Flere valg" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                    <MenuItem icon={<Plus />} onSelect={() => { setApne(prev => new Set(prev).add(s.id)); nyLuke(s) }}>Legg til luke</MenuItem>
                    <MenuItem icon={<Settings2 />} onSelect={() => onApneSentral(s.id)}>Åpne kontrollskjema</MenuItem>
                    <MenuSeparator />
                    <MenuItem icon={<Trash2 />} danger onSelect={() => slettSentral(s)}>Slett sentral…</MenuItem>
                  </DropdownMenu>
                </div>

                {apen && (
                  <div className="border-t border-gray-200 dark:border-gray-800 px-3 py-3 space-y-3 bg-gray-50/60 dark:bg-dark-100/40">
                    {/* Sentralens egne felt */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Felt label="Nr.">
                        <input type="number" value={s.sentral_nr ?? ''} onChange={e => endreSentral(s.id, { sentral_nr: e.target.value ? Number(e.target.value) : null })} className="input !h-9" />
                      </Felt>
                      <Felt label="Type">
                        <select value={s.anlegg_type ?? ''} onChange={e => endreSentral(s.id, { anlegg_type: e.target.value })} className="input !h-9">
                          {ANLEGGSTYPER.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </Felt>
                      <Felt label="Plassering" bred>
                        <input value={s.plassering ?? ''} onChange={e => setSentraler(prev => prev.map(x => x.id === s.id ? { ...x, plassering: e.target.value } : x))} onBlur={e => endreSentral(s.id, { plassering: e.target.value })} placeholder="F.eks. Teknisk rom 2. etg" className="input !h-9" />
                      </Felt>
                      <Felt label="Status">
                        <select value={s.status ?? ''} onChange={e => endreSentral(s.id, { status: e.target.value })} className="input !h-9">
                          <option value="">Uten status</option>
                          {STATUSER.map(x => <option key={x} value={x}>{x}</option>)}
                        </select>
                      </Felt>
                    </div>

                    {/* Luker */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Luker <span className="text-gray-400 font-normal">({mine.length})</span></h3>
                        <Button variant="ghost" icon={<Plus />} onClick={() => nyLuke(s)} className="!h-8">Legg til luke</Button>
                      </div>
                      {mine.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Ingen luker registrert på denne sentralen.</p>
                      ) : (
                        <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-50">
                          {mine.map(l => (
                            <li key={l.id} className="p-2 flex flex-wrap items-center gap-2">
                              <input value={l.plassering ?? ''} onChange={e => setLuker(prev => prev.map(x => x.id === l.id ? { ...x, plassering: e.target.value } : x))} onBlur={e => endreLuke(l.id, { plassering: e.target.value })} placeholder="Plassering" className="input !h-8 flex-1 min-w-[8rem]" />
                              <input value={l.Koblet_til ?? ''} onChange={e => setLuker(prev => prev.map(x => x.id === l.id ? { ...x, Koblet_til: e.target.value } : x))} onBlur={e => endreLuke(l.id, { Koblet_til: e.target.value })} placeholder="Koblet til" className="input !h-8 w-28" />
                              <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                <input type="checkbox" checked={Boolean(l.funksjonstest)} onChange={e => endreLuke(l.id, { funksjonstest: e.target.checked })} className="w-4 h-4 rounded text-primary focus:ring-primary" />Testet
                              </label>
                              <select value={l.status ?? ''} onChange={e => endreLuke(l.id, { status: e.target.value })} className={cn('input !h-8 w-28 font-medium', AVVIK_STATUSER.has(l.status ?? '') && 'text-red-600 dark:text-red-400')}>
                                <option value="">Uten status</option>
                                {STATUSER.map(x => <option key={x} value={x}>{x}</option>)}
                              </select>
                              {AVVIK_STATUSER.has(l.status ?? '') && (
                                <input value={l.skader ?? ''} onChange={e => setLuker(prev => prev.map(x => x.id === l.id ? { ...x, skader: e.target.value } : x))} onBlur={e => endreLuke(l.id, { skader: e.target.value })} placeholder="Hva er feil?" className="input !h-8 flex-1 min-w-[10rem]" />
                              )}
                              <IconButton variant="ghost" label="Slett luke" icon={<Trash2 />} onClick={() => slettLuke(l)} className="w-8 h-8 hover:!text-red-500" />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* Kommentarer */}
      <section className="card !p-0 overflow-hidden">
        <button type="button" onClick={() => setVisKommentarer(v => !v)} aria-expanded={visKommentarer} className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
          {visKommentarer ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Kommentarer <span className="text-gray-400 font-normal">({kommentarer.length})</span></span>
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block">Gjelder hele røyklukeanlegget</span>
        </button>
        {visKommentarer && (
          <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-3">
            <div className="flex gap-2">
              <input value={nyKommentar} onChange={e => setNyKommentar(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') leggTilKommentar() }} placeholder="Skriv en kommentar…" className="input flex-1" />
              <Button variant="primary" icon={<Plus />} onClick={leggTilKommentar} disabled={!nyKommentar.trim()}>Legg til</Button>
            </div>
            {kommentarer.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Ingen kommentarer ennå.</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {kommentarer.map(k => (
                  <li key={k.id} className="py-2 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap break-words">{k.kommentar}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{[k.opprettet_av, k.opprettet_dato ? formatDateTime(k.opprettet_dato) : null].filter(Boolean).join(' · ')}</p>
                    </div>
                    <IconButton variant="ghost" label="Slett kommentar" icon={<Trash2 />} onClick={() => slettKommentar(k.id)} className="w-8 h-8 hover:!text-red-500" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Ny sentral: velg type */}
      {nyType && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setNyType(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="ny-sentral" onClick={e => e.stopPropagation()} className="card w-full sm:max-w-sm rounded-b-none sm:rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="ny-sentral" className="text-lg font-bold text-gray-900 dark:text-white">Ny sentral</h2>
              <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={() => setNyType(false)} />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Hva slags anlegg styrer sentralen?</p>
            <div className="grid gap-2">
              {ANLEGGSTYPER.map(t => (
                <button key={t} type="button" onClick={() => nySentral(t)} className="w-full px-3 py-3 rounded-lg border border-gray-200 dark:border-gray-800 text-left hover:border-primary hover:bg-primary/5 transition-colors">
                  <span className="block font-semibold text-gray-900 dark:text-white">{t}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{t === 'Røykluker' ? 'Luker som åpnes for å slippe ut røyk' : 'Gardin som skiller brannceller'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-600 text-center">{kundeNavn} · {anleggNavn}</p>
    </div>
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

function Chipknapp({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={aktiv} className={cn('inline-flex items-center gap-1.5 h-[34px] px-3 rounded-full border text-sm whitespace-nowrap flex-shrink-0 transition-colors [&>b]:font-bold [&>b]:tabular-nums', aktiv ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500')}>{children}</button>
}
