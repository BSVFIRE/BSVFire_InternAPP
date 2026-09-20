/**
 * Brannalarm – kontrolloversikt for et anlegg.
 * Påbegynte utkast øverst, tidslinje over utførte kontroller per år, og avvikene fra siste
 * FG790- og NS3960-kontroll i egen kolonne (med avvikstekstene, ikke bare kommentaren).
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, ClipboardCheck, FileText, MoreHorizontal, Play, Plus, Send, Trash2, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn, formatDate } from '@/lib/utils'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'

type Type = 'FG790' | 'NS3960'
interface Kontroll { id: string; dato: string; aar: number; status: 'utkast' | 'ferdig' | 'sendt'; type: Type; har_feil: boolean; har_utkoblinger: boolean }
interface Avvik { type: Type; kategori: string | null; tittel: string; avvikType: string | null; feilkode: string | null; tekster: string[]; kommentar: string }

export function KontrollOversiktView({ anleggId, anleggsNavn, onBack, onStartNy, onOpenKontroll }: {
  anleggId: string; anleggsNavn: string; onBack: () => void; onStartNy: () => void; onOpenKontroll: (kontrollId: string, type: Type) => void
}) {
  const [kontroller, setKontroller] = useState<Kontroll[]>([])
  const [avvik, setAvvik] = useState<Avvik[]>([])
  const [sisteDato, setSisteDato] = useState<Record<Type, string | null>>({ FG790: null, NS3960: null })
  const [leverandor, setLeverandor] = useState('')
  const [sentraltype, setSentraltype] = useState('')
  const [loading, setLoading] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)
  const [aar, setAar] = useState<number | 'alle'>('alle')
  const [sletter, setSletter] = useState<string | null>(null)

  useEffect(() => { if (anleggId) last() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anleggId])

  async function last() {
    try {
      setLoading(true); setFeil(null)
      const [k, b] = await Promise.all([
        supabase.from('anleggsdata_kontroll').select('id, dato, kontroll_status, rapport_type, har_feil, har_utkoblinger').eq('anlegg_id', anleggId).order('dato', { ascending: false }),
        supabase.from('anleggsdata_brannalarm').select('leverandor, sentraltype').eq('anlegg_id', anleggId).maybeSingle(),
      ])
      if (k.error) throw k.error
      const liste: Kontroll[] = (k.data ?? []).map(x => ({
        id: x.id, dato: x.dato ?? new Date().toISOString(), aar: new Date(x.dato ?? Date.now()).getFullYear(),
        status: (x.kontroll_status as Kontroll['status']) || 'ferdig', type: x.rapport_type === 'NS3960' ? 'NS3960' : 'FG790', har_feil: Boolean(x.har_feil), har_utkoblinger: Boolean(x.har_utkoblinger),
      }))
      setKontroller(liste)
      setLeverandor(b.data?.leverandor ?? ''); setSentraltype(b.data?.sentraltype ?? '')
      await lastAvvik(liste)
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Kunne ikke laste kontroller')
    } finally { setLoading(false) }
  }

  async function lastAvvik(liste: Kontroll[]) {
    const ferdige = liste.filter(x => x.status !== 'utkast')
    const siste = (t: Type) => ferdige.filter(x => x.type === t).sort((a, b) => b.dato.localeCompare(a.dato))[0]
    const fg = siste('FG790'), ns = siste('NS3960')
    const ut: Avvik[] = []
    if (fg) {
      const { data } = await supabase.from('kontrollsjekkpunkter_brannalarm').select('kategori, tittel, avvik_type, feilkode, kommentar').eq('kontroll_id', fg.id).not('avvik_type', 'is', null)
      for (const d of data ?? []) ut.push({ type: 'FG790', kategori: d.kategori, tittel: d.tittel, avvikType: d.avvik_type, feilkode: d.feilkode, tekster: [], kommentar: d.kommentar ?? '' })
    }
    if (ns) {
      const { data } = await supabase.from('ns3960_kontrollpunkter').select('kontrollpunkt_navn, avvik_liste, kommentar').eq('kontroll_id', ns.id).eq('avvik', true)
      for (const d of data ?? []) {
        let tekster: string[] = []
        try { tekster = (JSON.parse(d.avvik_liste ?? '[]') as { beskrivelse?: string }[]).map(a => a.beskrivelse ?? '').filter(Boolean) } catch { /* tom */ }
        ut.push({ type: 'NS3960', kategori: null, tittel: d.kontrollpunkt_navn, avvikType: 'Avvik', feilkode: null, tekster, kommentar: d.kommentar ?? '' })
      }
    }
    setAvvik(ut)
    setSisteDato({ FG790: fg?.dato ?? null, NS3960: ns?.dato ?? null })
  }

  async function slettUtkast(k: Kontroll) {
    if (!confirm(`Slette ${k.type}-utkastet fra ${formatDate(k.dato)}? Dette kan ikke angres.`)) return
    setSletter(k.id)
    try {
      if (k.type === 'NS3960') { const r = await supabase.from('ns3960_kontrollpunkter').delete().eq('kontroll_id', k.id); if (r.error) throw r.error }
      else { const r = await supabase.from('kontrollsjekkpunkter_brannalarm').delete().eq('kontroll_id', k.id); if (r.error) throw r.error }
      const { error } = await supabase.from('anleggsdata_kontroll').delete().eq('id', k.id)
      if (error) throw error
      toast.success('Utkast slettet'); await last()
    } catch (e) { toast.error('Kunne ikke slette utkastet', e) } finally { setSletter(null) }
  }

  const utkast = kontroller.filter(k => k.status === 'utkast')
  const ferdige = kontroller.filter(k => k.status !== 'utkast')
  const aarene = useMemo(() => Array.from(new Set(ferdige.map(k => k.aar))).sort((a, b) => b - a), [ferdige])
  const vist = aar === 'alle' ? ferdige : ferdige.filter(k => k.aar === aar)
  const perAar = useMemo(() => { const m = new Map<number, Kontroll[]>(); for (const k of vist) m.set(k.aar, [...(m.get(k.aar) ?? []), k]); return Array.from(m.entries()).sort((a, b) => b[0] - a[0]) }, [vist])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
  if (feil) return <div className="card bg-red-900/20 border-red-800 flex items-start gap-3"><AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" /><div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste kontroller</h2><p className="text-sm text-red-300 mb-3">{feil}</p><Button variant="primary" onClick={last}>Prøv igjen</Button></div></div>

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />Brannalarm</button>
        <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{anleggsNavn}</span>
      </div>
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Kontroller</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{[anleggsNavn, [leverandor, sentraltype].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}</p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={onStartNy}>Start ny kontroll</Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div className="space-y-4">
          {/* Utkast */}
          {utkast.length > 0 && (
            <section className="space-y-2" aria-label="Påbegynte kontroller">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">Påbegynt</h2>
              {utkast.map(k => (
                <div key={k.id} className="card !p-3 flex items-center gap-3 border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
                  <span className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 flex items-center justify-center flex-shrink-0"><Play className="w-4 h-4" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2"><TypePille type={k.type} /><span className="font-semibold text-gray-900 dark:text-white">Påbegynt kontroll</span></span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">Startet {formatDate(k.dato)} · ikke ferdigstilt</span>
                  </span>
                  <Button variant="primary" icon={<Play />} onClick={() => onOpenKontroll(k.id, k.type)}>Fortsett</Button>
                  <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                    <MenuItem icon={<Trash2 />} danger onSelect={() => slettUtkast(k)}>{sletter === k.id ? 'Sletter…' : 'Slett utkast…'}</MenuItem>
                  </DropdownMenu>
                </div>
              ))}
            </section>
          )}

          {/* Utførte */}
          <section className="space-y-2" aria-label="Utførte kontroller">
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Utførte kontroller <span className="normal-case tracking-normal font-normal">({ferdige.length})</span></h2>
              {aarene.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto">
                  <Chip aktiv={aar === 'alle'} onClick={() => setAar('alle')}>Alle</Chip>
                  {aarene.map(a => <Chip key={a} aktiv={aar === a} onClick={() => setAar(a)}>{a}</Chip>)}
                </div>
              )}
            </div>
            {ferdige.length === 0 ? (
              <div className="card text-center py-10 space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Ingen utførte kontroller på anlegget ennå.</p>
                {utkast.length === 0 && <Button variant="primary" icon={<Plus />} onClick={onStartNy}>Start første kontroll</Button>}
              </div>
            ) : perAar.map(([a, liste]) => (
              <div key={a} className="card !p-0 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 dark:bg-dark-100 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">{a}<span className="text-xs text-gray-500 dark:text-gray-400 font-normal">{liste.length} {liste.length === 1 ? 'kontroll' : 'kontroller'}</span></div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {liste.map(k => (
                    <button key={k.id} type="button" onClick={() => onOpenKontroll(k.id, k.type)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-dark-100">
                      <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', k.status === 'sendt' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400')}>{k.status === 'sendt' ? <Send className="w-4 h-4" /> : <ClipboardCheck className="w-4 h-4" />}</span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2"><TypePille type={k.type} /><span className="font-medium text-gray-900 dark:text-white">{formatDate(k.dato)}</span></span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">{k.status === 'sendt' ? 'Rapport sendt kunde' : 'Ferdig'}{k.har_feil ? ' · feil i anlegget' : ''}{k.har_utkoblinger ? ' · utkoblinger' : ''}</span>
                      </span>
                      {k.har_feil && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      {k.har_utkoblinger && <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                      <span className="text-xs text-primary inline-flex items-center gap-1 flex-shrink-0"><FileText className="w-3.5 h-3.5" />Åpne</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Avvik fra siste kontroll */}
        <aside className="card !p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2"><AlertTriangle className={cn('w-4 h-4', avvik.length ? 'text-orange-500' : 'text-gray-400')} />Avvik fra siste kontroll</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{(['FG790', 'NS3960'] as Type[]).filter(t => sisteDato[t]).map(t => `${t} ${formatDate(sisteDato[t])}`).join(' · ') || 'Ingen utførte kontroller'}</p>
          </div>
          {avvik.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-green-600" strokeWidth={3} />{ferdige.length ? 'Ingen avvik ved siste kontroll.' : 'Avvik vises her etter første kontroll.'}</p>
          ) : (
            <ul className="space-y-2">
              {avvik.map((a, i) => (
                <li key={i} className="rounded-lg border border-orange-200 dark:border-orange-900/60 bg-orange-50/60 dark:bg-orange-900/10 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap"><TypePille type={a.type} />{a.avvikType && a.avvikType !== 'Avvik' && <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300">{a.avvikType}</span>}{a.feilkode && <span className="text-[11px] font-mono text-gray-500">{a.feilkode}</span>}</div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{a.tittel}</p>
                  {a.kategori && <p className="text-xs text-gray-500 dark:text-gray-400">{a.kategori}</p>}
                  {a.tekster.length > 0 && <ul className="space-y-1">{a.tekster.map((t, j) => <li key={j} className="text-sm text-gray-800 dark:text-gray-200 flex gap-2"><span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[11px] font-semibold flex items-center justify-center flex-shrink-0">{j + 1}</span>{t}</li>)}</ul>}
                  {a.kommentar && <p className="text-xs text-gray-600 dark:text-gray-400 italic">«{a.kommentar}»</p>}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}

function TypePille({ type }: { type: Type }) {
  return <span className={cn('text-[11px] font-semibold px-1.5 py-px rounded', type === 'FG790' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400')}>{type}</span>
}

function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={aktiv} className={cn('h-7 px-2.5 rounded-full border text-xs whitespace-nowrap flex-shrink-0', aktiv ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400')}>{children}</button>
}
