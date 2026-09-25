/**
 * Adresselister (Teknisk) – oversikt per anlegg med revisjoner, «Ny liste» og «Opprett fra enheter»
 * (forhåndsutfylte rader ut fra detektorer/meldere registrert på brannalarmanlegget).
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, Copy, FileText, ListChecks, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn, formatDate } from '@/lib/utils'
import { DETEKTORTYPE_TIL_ENHET } from '@/lib/detektorliste'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import { Combobox } from '@/components/ui/Combobox'
import { DetektorlisteEditor } from './DetektorlisteEditor'

interface Kunde { id: string; navn: string | null }
interface Anlegg { id: string; anleggsnavn: string | null; adresse: string | null; poststed: string | null }
interface Liste { id: string; revisjon: string; dato: string; status: string | null; service_ingeniør: string | null; antall: number; perType: Record<string, number> }
interface Props { onBack: () => void; initialAnleggId?: string; initialKundeId?: string; initialProsjektId?: string }

/** Enhetsnøkkel → detektorlistetype (motsatt av DETEKTORTYPE_TIL_ENHET) */
const ENHET_TIL_DETEKTORTYPE: Record<string, string> = { rd: 'Røykdetektor', vd: 'Varmedetektor', multi: 'Multidetektor', flame: 'Flammedetektor', mm: 'Manuell melder', sirene: 'Summer', optisk: 'Blitz' }

export function DetektorlisteView({ onBack, initialAnleggId, initialKundeId, initialProsjektId }: Props) {
  const navigate = useNavigate()
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [kundeId, setKundeId] = useState(initialKundeId ?? '')
  const [anleggId, setAnleggId] = useState(initialAnleggId ?? '')
  const [visVelger, setVisVelger] = useState(!initialAnleggId)
  const [lister, setLister] = useState<Liste[]>([])
  const [enheter, setEnheter] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(false)
  const [editor, setEditor] = useState<{ id?: string; startRader?: { type: string; antall: number }[] } | null>(null)

  useEffect(() => {
    supabase.from('customer').select('id, navn').or('skjult.is.null,skjult.eq.false').order('navn').then(({ data }) => setKunder(data ?? []))
    if (initialAnleggId && !initialKundeId) supabase.from('anlegg').select('kundenr').eq('id', initialAnleggId).single().then(({ data }) => { if (data?.kundenr) setKundeId(data.kundenr) })
  }, [initialAnleggId, initialKundeId])
  useEffect(() => {
    if (!kundeId) { setAnlegg([]); return }
    supabase.from('anlegg').select('id, anleggsnavn, adresse, poststed').eq('kundenr', kundeId).or('skjult.is.null,skjult.eq.false').order('anleggsnavn').then(({ data }) => setAnlegg(data ?? []))
  }, [kundeId])

  const last = useCallback(async () => {
    if (!anleggId) { setLister([]); setEnheter(null); return }
    setLoading(true)
    const [l, b] = await Promise.all([
      supabase.from('detektorlister').select('*').eq('anlegg_id', anleggId).order('dato', { ascending: false }),
      supabase.from('anleggsdata_brannalarm').select('rd_antall, vd_antall, multi_antall, flame_antall, mm_antall, sirene_antall, optisk_antall').eq('anlegg_id', anleggId).maybeSingle(),
    ])
    const listeRader = (l.data ?? []) as unknown as { id: string; revisjon: string; dato: string; status: string | null; service_ingeniør: string | null }[]
    const ider = listeRader.map(x => x.id)
    const perListe = new Map<string, Record<string, number>>()
    if (ider.length) {
      const { data: items } = await supabase.from('detektor_items').select('detektorliste_id, type').in('detektorliste_id', ider)
      for (const it of items ?? []) { if (!it.detektorliste_id) continue; const m = perListe.get(it.detektorliste_id) ?? {}; const t = it.type || '(uten type)'; m[t] = (m[t] ?? 0) + 1; perListe.set(it.detektorliste_id, m) }
    }
    setLister(listeRader.map(x => { const pt = perListe.get(x.id) ?? {}; return { id: x.id, revisjon: x.revisjon, dato: x.dato, status: x.status, service_ingeniør: x.service_ingeniør, perType: pt, antall: Object.values(pt).reduce((s, n) => s + n, 0) } }))
    const r = (b.data ?? null) as Record<string, number | null> | null
    setEnheter(r ? Object.fromEntries(Object.keys(ENHET_TIL_DETEKTORTYPE).map(k => [k, Number(r[`${k}_antall`] ?? 0) || 0])) : null)
    setLoading(false)
  }, [anleggId])
  useEffect(() => { last() }, [last])

  async function slett(l: Liste) {
    if (!confirm(`Slette adresseliste rev. ${l.revisjon} (${l.antall} enheter)? Dette kan ikke angres.`)) return
    const a = await supabase.from('detektor_items').delete().eq('detektorliste_id', l.id); if (a.error) { toast.error('Kunne ikke slette', a.error); return }
    const b = await supabase.from('detektorlister').delete().eq('id', l.id); if (b.error) { toast.error('Kunne ikke slette', b.error); return }
    toast.success('Adresseliste slettet'); last()
  }
  async function nyRevisjon(l: Liste) {
    const { data: hode } = await supabase.from('detektorlister').select('*').eq('id', l.id).single()
    const { data: items } = await supabase.from('detektor_items').select('*').eq('detektorliste_id', l.id)
    if (!hode) return
    const rev = String(Math.round((parseFloat(l.revisjon) || 1) * 10 + 1) / 10)
    const { id: _id, opprettet_dato: _o, oppdatert_dato: _u, ...rest } = hode as Record<string, unknown> & { id: string; opprettet_dato?: string; oppdatert_dato?: string }
    void _id; void _o; void _u
    const { data: ny, error } = await supabase.from('detektorlister').insert({ ...rest, revisjon: rev, dato: new Date().toISOString(), status: 'Utkast', opprettet_dato: new Date().toISOString() } as never).select('id').single()
    if (error || !ny) { toast.error('Kunne ikke lage ny revisjon', error); return }
    if (items?.length) await supabase.from('detektor_items').insert(items.map(({ id: _i, ...it }) => { void _i; return { ...it, detektorliste_id: ny.id } }))
    toast.success(`Revisjon ${rev} opprettet fra ${l.revisjon}`)
    setEditor({ id: ny.id })
  }

  const kundeNavn = kunder.find(k => k.id === kundeId)?.navn ?? ''
  const valgtAnlegg = anlegg.find(a => a.id === anleggId)
  const anleggNavn = valgtAnlegg?.anleggsnavn ?? ''

  if (editor && anleggId) {
    return <DetektorlisteEditor detektorlisteId={editor.id} kundeId={kundeId} anleggId={anleggId} kundeNavn={kundeNavn} anleggNavn={anleggNavn} prosjektId={editor.id ? undefined : initialProsjektId} startRader={editor.startRader} onBack={() => { setEditor(null); last() }} />
  }

  const enhetSum = enheter ? Object.values(enheter).reduce((s, n) => s + n, 0) : 0
  const nyeste = lister[0]
  const avstemming = nyeste && enheter ? Object.entries(ENHET_TIL_DETEKTORTYPE).map(([key, type]) => {
    const iListe = Object.entries(nyeste.perType).filter(([t]) => DETEKTORTYPE_TIL_ENHET[t] === key).reduce((s, [, n]) => s + n, 0)
    return { type, iListe, iEnheter: enheter[key], diff: iListe - enheter[key] }
  }).filter(x => x.iListe || x.iEnheter) : []
  const avvik = avstemming.filter(x => x.diff !== 0)
  const startFraEnheter = enheter ? Object.entries(enheter).filter(([, n]) => n > 0).map(([k, n]) => ({ type: ENHET_TIL_DETEKTORTYPE[k], antall: n })) : []

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />Teknisk</button>
        {anleggNavn && <><span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{anleggNavn}</span></>}
      </div>
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Adresselister</h1>
          {anleggId ? (
            <button type="button" onClick={() => setVisVelger(v => !v)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary mt-0.5 text-left">{kundeNavn} · <span className="font-medium text-gray-900 dark:text-white">{anleggNavn}</span> <span className="text-xs">{visVelger ? '· skjul velger' : '· bytt anlegg'}</span></button>
          ) : <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Velg kunde og anlegg.</p>}
        </div>
        {anleggId && (
          <div className="flex items-center gap-2">
            {startFraEnheter.length > 0 && <Button variant="outline" icon={<ListChecks />} onClick={() => setEditor({ startRader: startFraEnheter })} title={`Lager ${enhetSum} rader fordelt på typene fra Enheter`}><span className="hidden sm:inline">Opprett fra enheter ({enhetSum})</span><span className="sm:hidden">Fra enheter</span></Button>}
            <Button variant="primary" icon={<Plus />} onClick={() => setEditor({})}>Ny liste</Button>
          </div>
        )}
      </header>

      {(visVelger || !anleggId) && (
        <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
          <Combobox label="Kunde" options={kunder.map(k => ({ id: k.id, label: k.navn ?? '' }))} value={kundeId} onChange={v => { setKundeId(v); setAnleggId('') }} placeholder="Søk og velg kunde…" searchPlaceholder="Skriv for å søke…" emptyMessage="Ingen kunder funnet" />
          <Combobox label="Anlegg" options={anlegg.map(a => ({ id: a.id, label: a.anleggsnavn ?? '', sublabel: [a.adresse, a.poststed].filter(Boolean).join(', ') || undefined }))} value={anleggId} onChange={v => { setAnleggId(v); if (v) setVisVelger(false) }} placeholder="Søk og velg anlegg…" searchPlaceholder="Skriv for å søke…" emptyMessage="Ingen anlegg funnet" disabled={!kundeId} />
        </div>
      )}

      {anleggId && (loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div> : (
        <>
          {/* Avstemming */}
          {nyeste && enheter && avstemming.length > 0 && (
            <section className={cn('card !p-4', avvik.length ? 'border-yellow-300 dark:border-yellow-800' : '')}>
              <div className="flex items-center gap-3">
                <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', avvik.length ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400')}>{avvik.length ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" strokeWidth={3} />}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{avvik.length ? `Nyeste liste (rev. ${nyeste.revisjon}) avviker fra enhetene på ${avvik.length} ${avvik.length === 1 ? 'type' : 'typer'}` : `Nyeste liste (rev. ${nyeste.revisjon}) stemmer med enhetene på anlegget`}</div>
                  {avvik.length > 0 && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{avvik.map(x => `${x.type}: liste ${x.iListe} / enheter ${x.iEnheter}`).join(' · ')}</div>}
                </div>
                <button type="button" onClick={() => navigate('/rapporter', { state: { rapportType: 'brannalarm', anleggId, kundeId, fra: 'rapporter' } })} className="text-xs text-primary hover:underline whitespace-nowrap">Åpne enheter</button>
              </div>
            </section>
          )}

          {lister.length === 0 ? (
            <div className="card text-center py-12 space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">Ingen adresseliste på dette anlegget ennå.</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {startFraEnheter.length > 0 && <Button variant="outline" icon={<ListChecks />} onClick={() => setEditor({ startRader: startFraEnheter })}>Opprett fra enheter ({enhetSum})</Button>}
                <Button variant="primary" icon={<Plus />} onClick={() => setEditor({})}>Ny tom liste</Button>
              </div>
              {startFraEnheter.length > 0 && <p className="text-xs text-gray-400">«Fra enheter» lager én rad per detektor/melder registrert under Brannalarm → Enheter, med type ferdig satt – du fyller inn adresse og plassering.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {lister.map((l, i) => (
                <div key={l.id} className={cn('card !p-3.5 flex items-center gap-3', i === 0 && 'border-primary/40')}>
                  <button type="button" onClick={() => setEditor({ id: l.id })} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                    <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5" /></span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-gray-900 dark:text-white">Revisjon {l.revisjon}</span>{i === 0 && <span className="text-[10px] uppercase tracking-wider px-1.5 py-px rounded bg-primary/10 text-primary">Nyeste</span>}<span className={cn('text-xs px-2 py-0.5 rounded-full', l.status === 'Ferdig' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400')}>{l.status ?? 'Utkast'}</span></span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{formatDate(l.dato)}{l.service_ingeniør ? ` · ${l.service_ingeniør}` : ''} · {l.antall} enheter{Object.keys(l.perType).length ? ` · ${Object.entries(l.perType).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${t} ${n}`).join(', ')}` : ''}</span>
                    </span>
                  </button>
                  <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                    <MenuItem icon={<Copy />} onSelect={() => nyRevisjon(l)}>Ny revisjon basert på denne</MenuItem>
                    <MenuSeparator />
                    <MenuItem icon={<Trash2 />} danger onSelect={() => slett(l)}>Slett liste…</MenuItem>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </>
      ))}
    </div>
  )
}
