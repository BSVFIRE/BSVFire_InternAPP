/**
 * Felles liste for utstyrskontroll i felt (brannslukkere, brannslanger).
 * Samme oppsett som nødlyslisten: fremdrift, chips, gruppert på etasje, statusknapper i raden,
 * autolagring per endring, «Velg flere» for masseendring. Status er flervalg (en enhet kan ha flere avvik).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, CheckSquare, ChevronDown, ChevronRight, Loader2, MoreHorizontal, Search, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'

export interface UtstyrRad { id: string; etasje?: string | null }

export interface FeltDef<T> {
  key: keyof T & string
  navn: string
  /** Tailwind-bredde for kolonnen på PC */
  bredde?: string
  type?: 'text' | 'select' | 'aar'
  valg?: readonly string[]
  /** Foreslå verdier som allerede finnes i listen */
  forslag?: boolean
  placeholder?: string
  /** Vises i underteksten på mobil */
  mobil?: boolean
}

export interface StatusDef {
  alle: readonly string[]
  /** Grønne statuser (i orden) */
  ok: ReadonlySet<string>
  /** Grå statuser – verken OK eller avvik (Ikke funnet, Ikke tilkomst, Fjernet) */
  noytral: ReadonlySet<string>
}

export interface Merke { tekst: string; tone: 'r' | 'y' | 'g' }

export function UtstyrListe<T extends UtstyrRad>({ rader, nummerKey, felter, status, statusKey, lagrer, onEndre, onEndreFlere, onSlett, onLeggTil, merke, ekstra, enhetsnavn }: {
  rader: T[]
  nummerKey: keyof T & string
  felter: FeltDef<T>[]
  status: StatusDef
  statusKey: keyof T & string
  lagrer: Set<string>
  onEndre: (id: string, patch: Partial<T>) => void
  onEndreFlere: (ids: string[], patch: Partial<T>) => Promise<void>
  onSlett: (rad: T) => void
  onLeggTil: (antall: number) => Promise<void>
  /** Utgått / byttes neste kontroll osv. */
  merke?: (rad: T) => Merke | null
  /** Ekstra knapp per rad (f.eks. CO2-kalkulator) */
  ekstra?: (rad: T) => React.ReactNode
  enhetsnavn: { entall: string; flertall: string }
}) {
  type Chip = 'gjenstar' | 'kontrollert' | 'avvik' | 'alle'
  const [chip, setChip] = useState<Chip>('gjenstar')
  const [q, setQ] = useState('')
  const [lukkede, setLukkede] = useState<Set<string>>(new Set())
  const [redigerer, setRedigerer] = useState<{ id: string; felt: string } | null>(null)
  const [velgModus, setVelgModus] = useState(false)
  const [valgte, setValgte] = useState<Set<string>>(new Set())
  const [antallNye, setAntallNye] = useState(1)
  const [leggerTil, setLeggerTil] = useState(false)

  const statuser = (r: T): string[] => (r[statusKey] as unknown as string[] | null) ?? []
  const kontrollert = (r: T) => statuser(r).length > 0
  const harAvvik = (r: T) => statuser(r).some(s => !status.ok.has(s) && !status.noytral.has(s))

  const teller = useMemo(() => ({
    gjenstar: rader.filter(r => !kontrollert(r)).length,
    kontrollert: rader.filter(kontrollert).length,
    avvik: rader.filter(harAvvik).length,
    alle: rader.length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rader])
  // Startvisning: «Gjenstår» når kontrollen er i gang, «Alle» når den er (nesten) ferdig – velges én gang når listen er lastet
  const [startValgt, setStartValgt] = useState(false)
  useEffect(() => {
    if (startValgt || teller.alle === 0) return
    setStartValgt(true)
    if (teller.gjenstar === 0 || teller.gjenstar <= teller.alle * 0.1) setChip('alle')
  }, [startValgt, teller])

  const grupper = useMemo(() => {
    const s = q.trim().toLowerCase()
    const liste = rader.filter(r => {
      if (chip === 'gjenstar' && kontrollert(r)) return false
      if (chip === 'kontrollert' && !kontrollert(r)) return false
      if (chip === 'avvik' && !harAvvik(r)) return false
      if (!s) return true
      return [String(r[nummerKey] ?? ''), ...felter.map(f => String(r[f.key] ?? '')), ...statuser(r)].some(v => v.toLowerCase().includes(s))
    })
    const m = new Map<string, T[]>()
    for (const r of liste) { const k = (r.etasje ?? '').trim(); m.set(k, [...(m.get(k) ?? []), r]) }
    const nokkel = (e: string) => { if (!e) return 999; const x = e.match(/-?\d+/); return x ? parseInt(x[0], 10) : 998 }
    return Array.from(m.entries()).sort((a, b) => nokkel(a[0]) - nokkel(b[0])).map(([etasje, liste]) => ({
      etasje,
      rader: liste.sort((a, b) => String(a[nummerKey] ?? '').localeCompare(String(b[nummerKey] ?? ''), 'nb-NO', { numeric: true })),
      totalt: rader.filter(r => (r.etasje ?? '').trim() === etasje).length,
      kontrollert: rader.filter(r => (r.etasje ?? '').trim() === etasje && kontrollert(r)).length,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rader, chip, q])

  const forslag = useMemo(() => {
    const m: Record<string, string[]> = {}
    for (const f of felter) if (f.forslag) m[f.key] = Array.from(new Set(rader.map(r => String(r[f.key] ?? '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'nb-NO', { numeric: true }))
    return m
  }, [rader, felter])

  function settStatus(r: T, s: string) {
    const naa = statuser(r)
    let ny: string[]
    if (status.ok.has(s)) ny = naa.includes(s) ? naa.filter(x => x !== s) : [s]                         // OK-status erstatter avvik
    else ny = naa.includes(s) ? naa.filter(x => x !== s) : [...naa.filter(x => !status.ok.has(x)), s]  // avvik fjerner OK
    onEndre(r.id, { [statusKey]: ny } as Partial<T>)
  }
  function toggleGruppe(k: string) { setLukkede(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n }) }
  function toggleValgt(id: string) { setValgte(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleValgteIds(ids: string[]) { setValgte(prev => { const n = new Set(prev); const alle = ids.every(i => n.has(i)); for (const i of ids) alle ? n.delete(i) : n.add(i); return n }) }
  function avsluttValg() { setVelgModus(false); setValgte(new Set()) }
  async function settPaaValgte(patch: Partial<T>) { await onEndreFlere(Array.from(valgte), patch); setValgte(new Set()) }
  function nesteRad(id: string, felt: string) {
    const flat = grupper.flatMap(g => g.rader)
    const i = flat.findIndex(r => r.id === id)
    if (i >= 0 && i < flat.length - 1) setRedigerer({ id: flat[i + 1].id, felt }); else setRedigerer(null)
  }
  async function leggTil() { setLeggerTil(true); try { await onLeggTil(antallNye); setAntallNye(1) } finally { setLeggerTil(false) } }

  const pct = teller.alle ? Math.round((teller.kontrollert / teller.alle) * 100) : 0
  const etasjeFelt = felter.find(f => f.key === 'etasje')
  const mobilFelter = felter.filter(f => f.mobil)

  return (
    <div className="space-y-3">
      <div className="card !p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{teller.kontrollert} av {teller.alle} kontrollert <span className="text-gray-400 font-normal">· {pct} %</span></div>
          {teller.avvik > 0 && <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400"><AlertTriangle className="w-4 h-4" />{teller.avvik} med avvik</span>}
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-dark-100 overflow-hidden"><div className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-green-500' : 'bg-primary')} style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 flex-1" role="group" aria-label="Filter">
          <Chip aktiv={chip === 'gjenstar'} onClick={() => setChip('gjenstar')}>Gjenstår <b>{teller.gjenstar}</b></Chip>
          <Chip aktiv={chip === 'kontrollert'} onClick={() => setChip('kontrollert')}><Check className="w-3.5 h-3.5" strokeWidth={3} />Kontrollert <b>{teller.kontrollert}</b></Chip>
          <Chip aktiv={chip === 'avvik'} onClick={() => setChip('avvik')}><span className="w-2 h-2 rounded-full bg-red-500" />Avvik <b>{teller.avvik}</b></Chip>
          <Chip aktiv={chip === 'alle'} onClick={() => setChip('alle')}>Alle <b>{teller.alle}</b></Chip>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Søk nr., plassering…" aria-label="Søk" className="input pl-9 !min-h-[38px] !h-[38px]" />
          </div>
          <Button variant={velgModus ? 'primary' : 'outline'} icon={<CheckSquare />} onClick={() => velgModus ? avsluttValg() : setVelgModus(true)} className="!h-[38px]"><span className="hidden sm:inline">{velgModus ? 'Ferdig' : 'Velg flere'}</span></Button>
        </div>
      </div>

      {grupper.length === 0 ? (
        <div className="card text-center py-10 text-sm text-gray-500 dark:text-gray-400">
          {q ? `Ingen ${enhetsnavn.flertall} matcher søket.` : chip === 'gjenstar' ? `Alle ${enhetsnavn.flertall} er kontrollert 🎉` : chip === 'avvik' ? 'Ingen avvik registrert.' : `Ingen ${enhetsnavn.flertall} registrert ennå. Legg til nedenfor.`}
        </div>
      ) : grupper.map(g => {
        const key = g.etasje || '(uten)'
        const apen = !lukkede.has(key)
        return (
          <section key={key} className="card !p-0 overflow-hidden" aria-label={g.etasje || 'Uten etasje'}>
            <button type="button" onClick={() => toggleGruppe(key)} aria-expanded={apen} className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-dark-100 text-left">
              {velgModus && <input type="checkbox" checked={g.rader.every(r => valgte.has(r.id))} onChange={() => toggleValgteIds(g.rader.map(r => r.id))} onClick={ev => ev.stopPropagation()} aria-label="Velg alle i etasjen" className="w-4 h-4 rounded text-primary focus:ring-primary" />}
              <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', apen && 'rotate-90')} />
              <span className="font-semibold text-gray-900 dark:text-white">{g.etasje || 'Uten etasje'}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{g.kontrollert} av {g.totalt}</span>
              {g.kontrollert === g.totalt && <Check className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={3} />}
              <span className="ml-auto text-xs text-gray-400 tabular-nums">{g.rader.length} vist</span>
            </button>
            {apen && (
              <>
                <table className="hidden lg:table w-full text-sm">
                  <thead className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="w-8"></th>
                      <th className="px-2 py-1.5 text-left font-semibold w-16">Nr.</th>
                      {felter.map(f => <th key={f.key} className={cn('px-2 py-1.5 text-left font-semibold', f.bredde)}>{f.navn}</th>)}
                      <th className="px-2 py-1.5 text-left font-semibold w-[320px]">Status</th>
                      <th className="w-px"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {g.rader.map(r => {
                      const m = merke?.(r)
                      return (
                        <tr key={r.id} className={cn('group', kontrollert(r) ? '' : 'bg-yellow-50/40 dark:bg-yellow-900/5')}>
                          <td className="pl-3">{velgModus ? <input type="checkbox" checked={valgte.has(r.id)} onChange={() => toggleValgt(r.id)} aria-label="Velg" className="w-[18px] h-[18px] rounded text-primary focus:ring-primary" /> : <Kontrollert ok={kontrollert(r)} avvik={harAvvik(r)} lagrer={lagrer.has(r.id)} />}</td>
                          <td className="px-1 py-1"><Celle rad={r} felt={{ key: nummerKey, navn: 'Nr.' }} aktiv={redigerer?.id === r.id && redigerer.felt === nummerKey} onStart={() => setRedigerer({ id: r.id, felt: nummerKey })} onLagre={(v, videre) => { if (String(r[nummerKey] ?? '') !== v) onEndre(r.id, { [nummerKey]: v || null } as Partial<T>); videre ? nesteRad(r.id, nummerKey) : setRedigerer(null) }} onAvbryt={() => setRedigerer(null)} klasse="font-mono" /></td>
                          {felter.map(f => (
                            <td key={f.key} className="px-1 py-1">
                              <Celle rad={r} felt={f} forslag={forslag[f.key]} aktiv={redigerer?.id === r.id && redigerer.felt === f.key} onStart={() => setRedigerer({ id: r.id, felt: f.key })} onLagre={(v, videre) => { if (String(r[f.key] ?? '') !== v) onEndre(r.id, { [f.key]: v || null } as Partial<T>); videre ? nesteRad(r.id, f.key) : setRedigerer(null) }} onAvbryt={() => setRedigerer(null)} />
                            </td>
                          ))}
                          <td className="px-2 py-1"><div className="flex items-center gap-1.5 flex-wrap"><StatusKnapper valgt={statuser(r)} def={status} onVelg={s => settStatus(r, s)} onNullstill={() => onEndre(r.id, { [statusKey]: [] } as Partial<T>)} />{m && <MerkePille m={m} />}</div></td>
                          <td className="px-1 py-1">
                            <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                              {ekstra?.(r)}
                              <IconButton variant="ghost" label="Slett" icon={<Trash2 />} onClick={() => onSlett(r)} className="w-8 h-8 hover:!text-red-500" />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-800">
                  {g.rader.map(r => {
                    const m = merke?.(r)
                    const plassering = String((r as Record<string, unknown>).plassering ?? '')
                    return (
                      <div key={r.id} onClick={velgModus ? () => toggleValgt(r.id) : undefined} className={cn('px-3 py-2.5 space-y-2', !kontrollert(r) && 'bg-yellow-50/40 dark:bg-yellow-900/5', velgModus && valgte.has(r.id) && 'bg-primary/10')}>
                        <div className="flex items-center gap-2.5">
                          {velgModus ? <input type="checkbox" checked={valgte.has(r.id)} onChange={() => toggleValgt(r.id)} onClick={ev => ev.stopPropagation()} aria-label="Velg" className="w-[18px] h-[18px] rounded text-primary focus:ring-primary flex-shrink-0" /> : <Kontrollert ok={kontrollert(r)} avvik={harAvvik(r)} lagrer={lagrer.has(r.id)} />}
                          <button type="button" onClick={velgModus ? undefined : () => setRedigerer({ id: r.id, felt: '__mobil' })} className="flex-1 min-w-0 text-left">
                            <span className="block font-semibold text-gray-900 dark:text-white truncate"><span className="text-gray-400 font-mono text-xs mr-1.5">{String(r[nummerKey] ?? '–')}</span>{plassering || <span className="text-gray-400 font-normal">Uten plassering</span>}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{mobilFelter.map(f => r[f.key]).filter(Boolean).join(' · ') || 'Trykk for å fylle ut'}</span>
                          </button>
                          {m && <MerkePille m={m} />}
                          {!velgModus && (
                            <DropdownMenu trigger={open => <IconButton variant="ghost" label="Mer" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                              {ekstra && <><div className="px-2.5 py-1">{ekstra(r)}</div><MenuSeparator /></>}
                              <MenuItem icon={<Trash2 />} danger onSelect={() => onSlett(r)}>Slett {enhetsnavn.entall}…</MenuItem>
                            </DropdownMenu>
                          )}
                        </div>
                        {!velgModus && <StatusKnapper valgt={statuser(r)} def={status} kompakt onVelg={s => settStatus(r, s)} onNullstill={() => onEndre(r.id, { [statusKey]: [] } as Partial<T>)} />}
                        {redigerer?.id === r.id && redigerer.felt === '__mobil' && (
                          <div className="grid grid-cols-2 gap-2 pt-1" onClick={ev => ev.stopPropagation()}>
                            <MobilFelt navn="Nr." verdi={String(r[nummerKey] ?? '')} onLagre={v => onEndre(r.id, { [nummerKey]: v || null } as Partial<T>)} />
                            {felter.map(f => <MobilFelt key={f.key} navn={f.navn} verdi={String(r[f.key] ?? '')} valg={f.type === 'select' ? f.valg : undefined} forslag={forslag[f.key]} onLagre={v => onEndre(r.id, { [f.key]: v || null } as Partial<T>)} />)}
                            <button type="button" onClick={() => setRedigerer(null)} className="col-span-2 text-sm text-primary py-1">Lukk</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </section>
        )
      })}

      {chip !== 'alle' && teller.alle > 0 && (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">Viser {chip === 'gjenstar' ? teller.gjenstar : chip === 'kontrollert' ? teller.kontrollert : teller.avvik} av {teller.alle} · <button type="button" onClick={() => setChip('alle')} className="text-primary hover:underline">Vis alle</button></p>
      )}

      {/* Legg til */}
      <div className="card !p-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-700 dark:text-gray-300">Legg til</span>
        <input type="number" min={1} max={50} value={antallNye} onChange={e => setAntallNye(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} aria-label="Antall" className="input !h-[36px] !min-h-[36px] !py-0 w-20 text-center" />
        <Button variant="primary" loading={leggerTil} onClick={leggTil}>{antallNye === 1 ? `ny ${enhetsnavn.entall}` : `nye ${enhetsnavn.flertall}`}</Button>
        <span className="text-xs text-gray-500 dark:text-gray-400">Nummereres automatisk etter siste.</span>
      </div>

      {velgModus && (
        <div className="fixed bottom-4 left-4 right-4 lg:left-[calc(var(--sidebar-w)+2rem)] z-20 flex justify-center pointer-events-none">
          <div className="pointer-events-auto card !py-2 !px-3 shadow-lg border-primary/40 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums px-1">{valgte.size} valgt</span>
            {etasjeFelt?.valg && (
              <select aria-label="Sett etasje" defaultValue="" disabled={valgte.size === 0} onChange={ev => { if (ev.target.value) { settPaaValgte({ etasje: ev.target.value } as Partial<T>); ev.target.value = '' } }} className="input !h-[34px] !min-h-[34px] !py-0 text-sm w-auto">
                <option value="" disabled>Sett etasje…</option>
                {etasjeFelt.valg.filter(Boolean).map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            )}
            <select aria-label="Sett status" defaultValue="" disabled={valgte.size === 0} onChange={ev => { if (ev.target.value) { settPaaValgte({ [statusKey]: [ev.target.value] } as Partial<T>); ev.target.value = '' } }} className="input !h-[34px] !min-h-[34px] !py-0 text-sm w-auto">
              <option value="" disabled>Sett status…</option>
              {status.alle.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <Button variant="ghost" icon={<X />} onClick={avsluttValg} className="!h-[34px]">Ferdig</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Kontrollert({ ok, avvik, lagrer }: { ok: boolean; avvik: boolean; lagrer: boolean }) {
  if (lagrer) return <span className="w-6 h-6 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary" /></span>
  return (
    <span title={ok ? (avvik ? 'Kontrollert – med avvik' : 'Kontrollert') : 'Ikke kontrollert'} className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0', ok ? (avvik ? 'bg-red-500 border-red-500 text-white' : 'bg-green-500 border-green-500 text-white') : 'border-gray-300 dark:border-gray-600')}>
      {ok && (avvik ? <AlertTriangle className="w-3 h-3" /> : <Check className="w-3.5 h-3.5" strokeWidth={3} />)}
    </span>
  )
}

/** OK-knapp, valgte statuser som piller (klikk fjerner), meny med alle. */
function StatusKnapper({ valgt, def, kompakt, onVelg, onNullstill }: { valgt: string[]; def: StatusDef; kompakt?: boolean; onVelg: (s: string) => void; onNullstill: () => void }) {
  const okValgt = valgt.some(s => def.ok.has(s))
  const primaerOk = def.alle.find(s => def.ok.has(s)) ?? 'OK'
  const farge = (s: string) => def.ok.has(s) ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : def.noytral.has(s) ? 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-dark-100 dark:text-gray-300 dark:border-gray-700' : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {!okValgt && <button type="button" onClick={() => onVelg(primaerOk)} className="h-8 px-3 rounded-lg text-sm font-semibold border border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" strokeWidth={3} />OK</button>}
      {valgt.map(s => (
        <button key={s} type="button" onClick={() => onVelg(s)} title="Klikk for å fjerne" className={cn('inline-flex items-center gap-1 px-2 h-8 rounded-full text-xs font-semibold border whitespace-nowrap', farge(s))}>{s}<X className="w-3 h-3 opacity-60" /></button>
      ))}
      <DropdownMenu trigger={open => <IconButton variant="ghost" label="Velg status" icon={kompakt ? <MoreHorizontal /> : <ChevronDown />} aria-expanded={open} className="w-8 h-8" />}>
        {def.alle.map(s => <MenuItem key={s} icon={valgt.includes(s) ? <Check /> : undefined} onSelect={() => onVelg(s)}>{s}</MenuItem>)}
        {valgt.length > 0 && <><MenuSeparator /><MenuItem icon={<X />} onSelect={onNullstill}>Fjern alle statuser</MenuItem></>}
      </DropdownMenu>
    </div>
  )
}

function MerkePille({ m }: { m: Merke }) {
  const t = m.tone === 'r' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : m.tone === 'y' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  return <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', t)}>{m.tekst}</span>
}

function Celle<T>({ rad, felt, aktiv, forslag, onStart, onLagre, onAvbryt, klasse }: {
  rad: T; felt: FeltDef<T>; aktiv: boolean; forslag?: string[]; onStart: () => void; onLagre: (verdi: string, videre: boolean) => void; onAvbryt: () => void; klasse?: string
}) {
  const verdi = String(rad[felt.key] ?? '')
  const [v, setV] = useState(verdi)
  const ref = useRef<HTMLInputElement | HTMLSelectElement>(null)
  const ferdig = useRef(false)
  useEffect(() => { if (aktiv) { ferdig.current = false; setV(verdi); setTimeout(() => ref.current?.focus({ preventScroll: true }), 0) } }, [aktiv, verdi])
  const lagre = (val: string, videre: boolean) => { if (ferdig.current) return; ferdig.current = true; onLagre(val, videre) }
  const avbryt = () => { ferdig.current = true; onAvbryt() }
  const naa = new Date().getFullYear()

  if (!aktiv) {
    const utdatert = felt.type === 'aar' && verdi && Number(verdi) < naa
    return (
      <span className="flex items-center gap-1">
        <button type="button" onClick={onStart} className={cn('flex-1 text-left px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-dark-100 truncate', klasse, verdi ? (utdatert ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-900 dark:text-white') : 'text-gray-300 dark:text-gray-600')} title={verdi || 'Klikk for å redigere'}>{verdi || '–'}</button>
        {felt.type === 'aar' && verdi !== String(naa) && <button type="button" onClick={() => onLagre(String(naa), false)} title={`Sett ${naa}`} className="w-6 h-6 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center justify-center flex-shrink-0"><Check className="w-3.5 h-3.5" /></button>}
      </span>
    )
  }
  const felles = {
    onKeyDown: (ev: React.KeyboardEvent) => { if (ev.key === 'Enter') { ev.preventDefault(); lagre(v, true) } if (ev.key === 'Escape') avbryt(); if (ev.key === 'Tab') lagre(v, false) },
    onBlur: () => setTimeout(() => lagre(v, false), 120),
    className: 'input !min-h-[30px] !h-[30px] !py-0 !px-1.5 text-sm w-full',
  }
  if (felt.type === 'select' && felt.valg) {
    return (
      <select ref={ref as React.RefObject<HTMLSelectElement>} value={v} onChange={ev => { setV(ev.target.value); lagre(ev.target.value, false) }} {...felles}>
        {!felt.valg.includes('') && <option value="">–</option>}
        {felt.valg.map(x => <option key={x} value={x}>{x || '–'}</option>)}
      </select>
    )
  }
  const listeId = forslag?.length ? `forslag-${felt.key}` : undefined
  return (
    <>
      <input ref={ref as React.RefObject<HTMLInputElement>} value={v} onChange={ev => setV(ev.target.value)} list={listeId} placeholder={felt.placeholder} inputMode={felt.type === 'aar' ? 'numeric' : undefined} {...felles} />
      {listeId && <datalist id={listeId}>{forslag!.map(x => <option key={x} value={x} />)}</datalist>}
    </>
  )
}

function MobilFelt({ navn, verdi, valg, forslag, onLagre }: { navn: string; verdi: string; valg?: readonly string[]; forslag?: string[]; onLagre: (v: string) => void }) {
  const [v, setV] = useState(verdi)
  useEffect(() => setV(verdi), [verdi])
  const id = `mf-${navn}-${Math.random().toString(36).slice(2, 7)}`
  return (
    <label className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
      <span>{navn}</span>
      {valg ? (
        <select value={v} onChange={e => { setV(e.target.value); onLagre(e.target.value) }} className="input !h-[36px] !min-h-[36px] !py-0 text-sm">{!valg.includes('') && <option value="">–</option>}{valg.map(x => <option key={x} value={x}>{x || '–'}</option>)}</select>
      ) : (
        <><input value={v} onChange={e => setV(e.target.value)} onBlur={() => { if (v !== verdi) onLagre(v) }} list={forslag?.length ? id : undefined} className="input !h-[36px] !min-h-[36px] !py-0 text-sm" />{forslag?.length ? <datalist id={id}>{forslag.map(x => <option key={x} value={x} />)}</datalist> : null}</>
      )}
    </label>
  )
}

function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={aktiv} className={cn('inline-flex items-center gap-2 h-[34px] px-3 rounded-full border text-sm whitespace-nowrap flex-shrink-0 transition-colors [&>b]:font-bold [&>b]:tabular-nums', aktiv ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500')}>{children}</button>
}
