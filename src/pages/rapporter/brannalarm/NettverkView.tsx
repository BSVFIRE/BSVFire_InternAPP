/**
 * Brannalarm – nettverk: hver sentral/panel/aspirasjon/kraftforsyning som fysisk node
 * med nettverksnummer, plassering, SW-versjon og batteri.
 * Dekningsstripen øverst viser hvor mange av hver type (fra Enheter) som er lagt inn i nettverket.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, BatteryCharging, Check, Edit, MoreHorizontal, Network, Plus, Search, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useOfflineQueue } from '@/hooks/useOffline'
import { batteriInfo } from '@/lib/batteri'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import type { NettverkEnhet } from '../Brannalarm'

interface EnhetTypeInfo { type: string; antall: number }
interface EnheterData {
  brannsentral?: number; brannsentral_typer?: EnhetTypeInfo[]
  panel?: number; panel_typer?: EnhetTypeInfo[]
  asp?: number; asp_typer?: EnhetTypeInfo[]
  kraftforsyning?: number; kraftforsyning_typer?: EnhetTypeInfo[]
}
interface NettverkViewProps {
  anleggId: string
  anleggsNavn: string
  nettverkListe: NettverkEnhet[]
  enheterData?: EnheterData
  onBack: () => void
  onRefresh: () => void
}

type Node = NettverkEnhet & { batteri_ikke_aktuelt?: boolean | null }
interface Skjema { nettverk_id: string; plassering: string; type: string; sw_id: string; spenning: string; ah: string; batterialder: string; batteri_ikke_aktuelt: boolean }
const TOMT: Skjema = { nettverk_id: '', plassering: '', type: '', sw_id: '', spenning: '24', ah: '', batterialder: '', batteri_ikke_aktuelt: false }


export function NettverkView({ anleggId, anleggsNavn, nettverkListe, enheterData, onBack, onRefresh }: NettverkViewProps) {
  const { isOnline, queueInsert, queueUpdate, queueDelete } = useOfflineQueue()
  const [dialog, setDialog] = useState<{ node?: Node; forvalgtType?: string } | null>(null)
  const [q, setQ] = useState('')

  const noder = useMemo(() => [...(nettverkListe as Node[])].sort((a, b) => (Number(a.nettverk_id) || 0) - (Number(b.nettverk_id) || 0) || (a.plassering ?? '').localeCompare(b.plassering ?? '', 'nb-NO')), [nettverkListe])

  // Dekning: typer registrert under Enheter vs. antall noder med samme type
  const dekning = useMemo(() => {
    const grupper: { navn: string; typer: EnhetTypeInfo[] }[] = [
      { navn: 'Brannsentral', typer: enheterData?.brannsentral_typer ?? [] },
      { navn: 'Brannpanel', typer: enheterData?.panel_typer ?? [] },
      { navn: 'Aspirasjon', typer: enheterData?.asp_typer ?? [] },
      { navn: 'Kraftforsyning', typer: enheterData?.kraftforsyning_typer ?? [] },
    ]
    return grupper.flatMap(g => g.typer.filter(t => t.type).map(t => ({ gruppe: g.navn, type: t.type, forventet: t.antall, registrert: noder.filter(n => n.type === t.type).length })))
  }, [enheterData, noder])
  const mangler = dekning.reduce((s, d) => s + Math.max(0, d.forventet - d.registrert), 0)
  const batteriVarsler = noder.filter(n => !n.batteri_ikke_aktuelt && batteriInfo(n.batterialder).tone === 'r').length

  const treff = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? noder.filter(n => [String(n.nettverk_id ?? ''), n.plassering, n.type, n.sw_id].some(v => v?.toLowerCase().includes(s))) : noder
  }, [noder, q])

  async function slett(n: Node) {
    if (!confirm(`Slette node ${n.nettverk_id ?? ''} (${n.type ?? 'uten type'}${n.plassering ? `, ${n.plassering}` : ''})?`)) return
    if (!isOnline) { queueDelete('nettverk_brannalarm', n.id); toast.info('Sletting lagt i kø'); return }
    const { error } = await supabase.from('nettverk_brannalarm').delete().eq('id', n.id)
    if (error) { toast.error('Kunne ikke slette', error); return }
    toast.success('Node slettet'); onRefresh()
  }

  async function lagre(skjema: Skjema, node?: Node) {
    const data = {
      anlegg_id: anleggId,
      nettverk_id: skjema.nettverk_id ? parseInt(skjema.nettverk_id, 10) : null,
      plassering: skjema.plassering.trim() || null,
      type: skjema.type.trim() || null,
      sw_id: skjema.sw_id.trim() || null,
      batteri_ikke_aktuelt: skjema.batteri_ikke_aktuelt,
      spenning: skjema.batteri_ikke_aktuelt ? null : (skjema.spenning.trim() || null),
      ah: skjema.batteri_ikke_aktuelt ? null : (skjema.ah.trim() || null),
      batterialder: skjema.batteri_ikke_aktuelt ? null : (skjema.batterialder ? parseInt(skjema.batterialder, 10) : null),
    }
    if (!isOnline) {
      if (node) queueUpdate('nettverk_brannalarm', { id: node.id, ...data }); else queueInsert('nettverk_brannalarm', data)
      toast.info('Offline – lagres når du er på nett igjen'); return true
    }
    const res = node ? await supabase.from('nettverk_brannalarm').update(data).eq('id', node.id) : await supabase.from('nettverk_brannalarm').insert(data)
    if (res.error) { toast.error('Kunne ikke lagre', res.error); return false }
    toast.success(node ? 'Node oppdatert' : `Node ${data.nettverk_id ?? ''} lagt til`)
    onRefresh()
    return true
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />Brannalarm</button>
        <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{anleggsNavn}</span>
      </div>
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Network className="w-6 h-6 text-blue-500" />Nettverk</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{noder.length ? `${noder.length} ${noder.length === 1 ? 'node' : 'noder'}` : 'Ingen noder registrert'}{mangler ? ` · ${mangler} gjenstår fra Enheter` : ''}{batteriVarsler ? ` · ${batteriVarsler} batteri bør byttes` : ''}{!isOnline ? ' · offline' : ''}</p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => setDialog({})}>Legg til node</Button>
      </header>

      {/* Dekning fra Enheter */}
      {dekning.length > 0 && (
        <section className="card !p-4 space-y-2" aria-label="Dekning">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Sentraler og paneler fra Enheter</h2>
            <span className={cn('text-xs font-medium', mangler ? 'text-yellow-700 dark:text-yellow-400' : 'text-green-700 dark:text-green-400')}>{mangler ? `${mangler} ikke lagt inn i nettverket ennå` : 'Alle er lagt inn'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {dekning.map(d => {
              const ferdig = d.registrert >= d.forventet
              return (
                <button key={`${d.gruppe}-${d.type}`} type="button" disabled={ferdig} onClick={() => setDialog({ forvalgtType: d.type })} title={ferdig ? 'Alle er registrert' : `Legg til ${d.type} i nettverket`}
                  className={cn('inline-flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-lg border text-sm', ferdig ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 cursor-default' : 'border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-gray-900 dark:text-white hover:border-primary')}>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{d.gruppe}</span>
                  <span className="font-medium">{d.type}</span>
                  <span className="tabular-nums font-semibold">{d.registrert}/{d.forventet}</span>
                  {ferdig ? <Check className="w-4 h-4" strokeWidth={3} /> : <Plus className="w-4 h-4 text-primary" />}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {noder.length > 5 && (
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Søk node, plassering, type…" aria-label="Søk" className="input pl-9 !min-h-[38px] !h-[38px]" />
        </div>
      )}

      {noder.length === 0 ? (
        <div className="card text-center py-12 space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Legg inn sentraler, paneler og kraftforsyninger som noder med nettverksnummer, plassering og batteri.</p>
          <Button variant="primary" icon={<Plus />} onClick={() => setDialog({})}>Legg til første node</Button>
          {dekning.length === 0 && <p className="text-xs text-gray-400">Tips: registrer sentraler under Enheter først, så får du typene som forslag her.</p>}
        </div>
      ) : (
        <>
          <div className="hidden lg:block card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-dark-100 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr><th className="px-3 py-2 text-left font-semibold w-16">Node</th><th className="px-3 py-2 text-left font-semibold">Type</th><th className="px-3 py-2 text-left font-semibold">Plassering</th><th className="px-3 py-2 text-left font-semibold w-28">SW</th><th className="px-3 py-2 text-left font-semibold w-56">Batteri</th><th className="w-px"></th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {treff.map(n => (
                  <tr key={n.id} onClick={() => setDialog({ node: n })} className="group cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-100">
                    <td className="px-3 py-2.5 font-mono font-semibold text-gray-900 dark:text-white tabular-nums">{n.nettverk_id ?? '–'}</td>
                    <td className="px-3 py-2.5 text-gray-900 dark:text-white">{n.type || <span className="text-gray-400">–</span>}</td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{n.plassering || <span className="text-gray-400">–</span>}</td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 font-mono text-xs">{n.sw_id || '–'}</td>
                    <td className="px-3 py-2.5"><Batteri n={n} /></td>
                    <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                        <IconButton variant="ghost" label="Rediger" icon={<Edit />} onClick={() => setDialog({ node: n })} className="w-8 h-8" />
                        <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                          <MenuItem icon={<Trash2 />} danger onSelect={() => slett(n)}>Slett node…</MenuItem>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="lg:hidden space-y-2">
            {treff.map(n => (
              <button key={n.id} type="button" onClick={() => setDialog({ node: n })} className="card !p-3 w-full text-left flex gap-3 items-start">
                <span className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold flex items-center justify-center flex-shrink-0 tabular-nums">{n.nettverk_id ?? '–'}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-gray-900 dark:text-white truncate">{n.type || 'Uten type'}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{[n.plassering, n.sw_id ? `SW ${n.sw_id}` : null].filter(Boolean).join(' · ') || 'Trykk for å fylle ut'}</span>
                  <span className="block mt-1"><Batteri n={n} /></span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {dialog && <NodeDialog node={dialog.node} forvalgtType={dialog.forvalgtType} dekning={dekning} nesteNummer={(noder.reduce((m, n) => Math.max(m, Number(n.nettverk_id) || 0), 0) + 1)} eksisterendePlasseringer={Array.from(new Set(noder.map(n => n.plassering).filter((x): x is string => Boolean(x))))} onClose={() => setDialog(null)} onLagre={lagre} onSlett={dialog.node ? () => { slett(dialog.node!); setDialog(null) } : undefined} />}
    </div>
  )
}

function Batteri({ n }: { n: Node }) {
  if (n.batteri_ikke_aktuelt) return <span className="text-xs text-gray-400">Ikke aktuelt</span>
  const b = batteriInfo(n.batterialder)
  const deler = [n.spenning ? `${n.spenning} V` : null, n.ah ? `${n.ah} Ah` : null].filter(Boolean).join(' · ')
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <BatteryCharging className="w-3.5 h-3.5 text-gray-400" />
      <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap">{deler || <span className="text-gray-400">–</span>}</span>
      {b.montertAar != null && <span className={cn('px-1.5 py-px rounded font-semibold tabular-nums whitespace-nowrap', b.tone === 'r' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : b.tone === 'y' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-400')}>{b.tekst}</span>}
    </span>
  )
}

function NodeDialog({ node, forvalgtType, dekning, nesteNummer, eksisterendePlasseringer, onClose, onLagre, onSlett }: {
  node?: Node; forvalgtType?: string; dekning: { gruppe: string; type: string; forventet: number; registrert: number }[]; nesteNummer: number; eksisterendePlasseringer: string[]
  onClose: () => void; onLagre: (s: Skjema, node?: Node) => Promise<boolean>; onSlett?: () => void
}) {
  const [s, setS] = useState<Skjema>(() => node ? {
    nettverk_id: node.nettverk_id != null ? String(node.nettverk_id) : '', plassering: node.plassering ?? '', type: node.type ?? '', sw_id: node.sw_id ?? '',
    spenning: node.spenning != null ? String(node.spenning) : '', ah: node.ah != null ? String(node.ah) : '', batterialder: node.batterialder != null ? String(node.batterialder) : '', batteri_ikke_aktuelt: Boolean(node.batteri_ikke_aktuelt),
  } : { ...TOMT, nettverk_id: String(nesteNummer), type: forvalgtType ?? '' })
  const [egenType, setEgenType] = useState(Boolean(node?.type && !dekning.some(d => d.type === node.type)) || (dekning.length === 0))
  const [lagrer, setLagrer] = useState(false)
  useEffect(() => { function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() } document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc) }, [onClose])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setLagrer(true)
    const ok = await onLagre(s, node)
    setLagrer(false)
    if (ok) onClose()
  }
  const grupper = Array.from(new Set(dekning.map(d => d.gruppe)))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <form onSubmit={send} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="node-tittel" className="card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-lg !p-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 id="node-tittel" className="text-lg font-bold text-gray-900 dark:text-white">{node ? `Node ${node.nettverk_id ?? ''}` : 'Ny node'}</h2>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} />
        </div>
        <div className="px-5 pb-4 space-y-4">
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <div className="space-y-1.5">
              <label htmlFor="n-id" className="block text-sm font-medium text-gray-900 dark:text-white">Nettverk nr.</label>
              <input id="n-id" value={s.nettverk_id} onChange={e => setS({ ...s, nettverk_id: e.target.value.replace(/\D/g, '') })} inputMode="numeric" className="input font-mono" placeholder="1" autoFocus={!node} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="n-pl" className="block text-sm font-medium text-gray-900 dark:text-white">Plassering</label>
              <input id="n-pl" value={s.plassering} onChange={e => setS({ ...s, plassering: e.target.value })} list="n-pl-forslag" className="input" placeholder="F.eks. Teknisk rom, resepsjon" />
              <datalist id="n-pl-forslag">{eksisterendePlasseringer.map(p => <option key={p} value={p} />)}</datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-900 dark:text-white">Type</span>
            {!egenType && dekning.length > 0 ? (
              <div className="space-y-2">
                {grupper.map(g => (
                  <div key={g} className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-24">{g}</span>
                    {dekning.filter(d => d.gruppe === g).map(d => {
                      const rest = d.forventet - d.registrert + (node?.type === d.type ? 1 : 0)
                      return <button key={d.type} type="button" onClick={() => setS({ ...s, type: d.type })} className={cn('h-8 px-2.5 rounded-full border text-xs inline-flex items-center gap-1.5', s.type === d.type ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary', rest <= 0 && s.type !== d.type && 'opacity-50')}>{d.type}<span className="tabular-nums text-gray-400">{rest > 0 ? `${rest} igjen` : 'alle lagt inn'}</span></button>
                    })}
                  </div>
                ))}
                <button type="button" onClick={() => { setEgenType(true); setS({ ...s, type: '' }) }} className="text-xs text-primary hover:underline">Annen type – skriv inn</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={s.type} onChange={e => setS({ ...s, type: e.target.value })} className="input flex-1" placeholder="F.eks. BS-420, BX-420" aria-label="Type" />
                {dekning.length > 0 && <Button variant="ghost" onClick={() => setEgenType(false)}>Velg fra Enheter</Button>}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="n-sw" className="block text-sm font-medium text-gray-900 dark:text-white">SW-versjon <span className="text-gray-400 font-normal">(valgfritt)</span></label>
            <input id="n-sw" value={s.sw_id} onChange={e => setS({ ...s, sw_id: e.target.value })} className="input font-mono" placeholder="F.eks. 2.1.0" />
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-gray-900 dark:text-white inline-flex items-center gap-2"><BatteryCharging className="w-4 h-4 text-gray-400" />Batteri</span>
              <span className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"><input type="checkbox" checked={s.batteri_ikke_aktuelt} onChange={e => setS({ ...s, batteri_ikke_aktuelt: e.target.checked })} className="w-4 h-4 rounded text-primary focus:ring-primary" />Ikke aktuelt for denne noden</span>
            </label>
            {!s.batteri_ikke_aktuelt && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><label htmlFor="n-v" className="block text-xs text-gray-500 dark:text-gray-400">Spenning (V)</label><input id="n-v" value={s.spenning} onChange={e => setS({ ...s, spenning: e.target.value })} inputMode="decimal" className="input" placeholder="24" /></div>
                <div className="space-y-1"><label htmlFor="n-ah" className="block text-xs text-gray-500 dark:text-gray-400">Kapasitet (Ah)</label><input id="n-ah" value={s.ah} onChange={e => setS({ ...s, ah: e.target.value })} inputMode="decimal" className="input" placeholder="7" /></div>
                <div className="space-y-1"><label htmlFor="n-alder" className="block text-xs text-gray-500 dark:text-gray-400">Montert (år)</label><input id="n-alder" value={s.batterialder} onChange={e => setS({ ...s, batterialder: e.target.value.replace(/\D/g, '').slice(0, 4) })} inputMode="numeric" className="input" placeholder={String(new Date().getFullYear())} /></div>
              </div>
            )}
            {!s.batteri_ikke_aktuelt && batteriInfo(s.batterialder).montertAar != null && <p className={cn('text-xs inline-flex items-center gap-1', batteriInfo(s.batterialder).tone ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400')}>{batteriInfo(s.batterialder).tone && <AlertTriangle className="w-3.5 h-3.5" />}{batteriInfo(s.batterialder).alder} år gammelt{batteriInfo(s.batterialder).tone === 'r' ? ' – bør byttes' : batteriInfo(s.batterialder).tone === 'y' ? ' – nærmer seg bytte' : ''}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          {onSlett && <Button variant="ghost" icon={<Trash2 />} onClick={onSlett} className="text-red-600 hover:!bg-red-50 dark:hover:!bg-red-900/20 mr-auto"><span className="hidden sm:inline">Slett</span></Button>}
          <Button variant="ghost" onClick={onClose} className={onSlett ? '' : 'ml-auto'}>Avbryt</Button>
          <Button variant="primary" type="submit" loading={lagrer} icon={node ? <Check /> : <Plus />}>{node ? 'Lagre' : 'Legg til'}</Button>
        </div>
      </form>
    </div>
  )
}
