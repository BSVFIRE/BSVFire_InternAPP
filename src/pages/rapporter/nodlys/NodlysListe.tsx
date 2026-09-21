/**
 * Nødlysliste for kontroll i felt.
 * Fremdrift øverst, chips (Gjenstår / Kontrollert / Avvik / Alle), gruppert på bygg → etasje,
 * statusknapper rett i raden (OK = ett trykk, resten i meny). Hver endring lagres med en gang.
 * Feltene redigeres i raden på PC (klikk), på mobil via «Rediger»-skjemaet.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, CheckSquare, ChevronDown, ChevronRight, Edit, Loader2, MoreHorizontal, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import { AVVIK_STATUSER, BATTERITYPER, ETASJER, NODLYS_STATUSER, NODLYS_TYPER, STATUS_FARGE, byggSortNokkel, etasjeSortNokkel, type NodlysEnhet } from './typer'

type Chip = 'gjenstar' | 'kontrollert' | 'avvik' | 'alle'
type Felt = 'internnummer' | 'amatur_id' | 'fordeling' | 'kurs' | 'bygg' | 'etasje' | 'plassering' | 'produsent' | 'type' | 'batteritype' | 'notat'
const FELTER: { key: Felt; navn: string; bredde: string }[] = [
  { key: 'internnummer', navn: 'Nr.', bredde: 'w-16' },
  { key: 'amatur_id', navn: 'Armatur', bredde: 'w-24' },
  { key: 'plassering', navn: 'Plassering', bredde: '' },
  { key: 'fordeling', navn: 'Fordeling', bredde: 'w-24' },
  { key: 'kurs', navn: 'Kurs', bredde: 'w-20' },
  { key: 'bygg', navn: 'Bygg', bredde: 'w-24' },
  { key: 'etasje', navn: 'Etasje', bredde: 'w-20' },
  { key: 'type', navn: 'Type', bredde: 'w-24' },
  { key: 'produsent', navn: 'Produsent', bredde: 'w-28' },
  { key: 'batteritype', navn: 'Batteri', bredde: 'w-24' },
  { key: 'notat', navn: 'Notat', bredde: 'w-40' },
]

export function NodlysListe({ enheter, lagrer, onEndre, onEndreFlere, onSlett, onSlettFlere, onRediger }: {
  enheter: NodlysEnhet[]
  /** id-er som lagres akkurat nå */
  lagrer: Set<string>
  onEndre: (id: string, patch: Partial<NodlysEnhet>) => void
  onEndreFlere: (ids: string[], patch: Partial<NodlysEnhet>) => Promise<void>
  onSlett: (enhet: NodlysEnhet) => void
  onSlettFlere: (ids: string[]) => Promise<void>
  onRediger: (enhet: NodlysEnhet) => void
}) {
  const [chip, setChip] = useState<Chip>('gjenstar')
  const [q, setQ] = useState('')
  const [lukkede, setLukkede] = useState<Set<string>>(new Set())
  const [redigerer, setRedigerer] = useState<{ id: string; felt: Felt } | null>(null)
  const [velgModus, setVelgModus] = useState(false)
  const [valgte, setValgte] = useState<Set<string>>(new Set())
  const [bekreftSlett, setBekreftSlett] = useState(false)
  const [sletter, setSletter] = useState(false)

  const teller = useMemo(() => ({
    gjenstar: enheter.filter(e => !e.kontrollert).length,
    kontrollert: enheter.filter(e => e.kontrollert).length,
    avvik: enheter.filter(e => AVVIK_STATUSER.has(e.status ?? '')).length,
    alle: enheter.length,
  }), [enheter])

  // Startvisning: «Gjenstår» når kontrollen er i gang, «Alle» når den er (nesten) ferdig – velges én gang når listen er lastet
  const [startValgt, setStartValgt] = useState(false)
  useEffect(() => {
    if (startValgt || teller.alle === 0) return
    setStartValgt(true)
    if (teller.gjenstar === 0 || teller.gjenstar <= teller.alle * 0.1) setChip('alle')
  }, [startValgt, teller])

  interface EtasjeGruppe { etasje: string; rader: NodlysEnhet[]; totalt: number; kontrollert: number }
  interface ByggGruppe { bygg: string; etasjer: EtasjeGruppe[]; totalt: number; kontrollert: number }

  const harBygg = useMemo(() => enheter.some(e => e.bygg?.trim()), [enheter])

  const grupper = useMemo<ByggGruppe[]>(() => {
    const s = q.trim().toLowerCase()
    const liste = enheter.filter(e => {
      if (chip === 'gjenstar' && e.kontrollert) return false
      if (chip === 'kontrollert' && !e.kontrollert) return false
      if (chip === 'avvik' && !AVVIK_STATUSER.has(e.status ?? '')) return false
      if (!s) return true
      return [e.internnummer, e.amatur_id, e.plassering, e.fordeling, e.kurs, e.bygg, e.etasje, e.type, e.produsent, e.status, e.batteritype, e.notat].some(v => v?.toLowerCase().includes(s))
    })
    const byggAv = (e: NodlysEnhet) => harBygg ? (e.bygg?.trim() || '') : ''
    const etasjeAv = (e: NodlysEnhet) => e.etasje?.trim() || ''
    const tre = new Map<string, Map<string, NodlysEnhet[]>>()
    for (const e of liste) {
      const b = byggAv(e), et = etasjeAv(e)
      if (!tre.has(b)) tre.set(b, new Map())
      const m = tre.get(b)!; m.set(et, [...(m.get(et) ?? []), e])
    }
    const sorter = (r: NodlysEnhet[]) => r.sort((a, b) => (a.internnummer ?? '').localeCompare(b.internnummer ?? '', 'nb-NO', { numeric: true }) || (a.amatur_id ?? '').localeCompare(b.amatur_id ?? '', 'nb-NO', { numeric: true }))
    return Array.from(tre.entries()).sort((a, b) => byggSortNokkel(a[0], b[0])).map(([bygg, etasjer]) => {
      const iBygg = enheter.filter(e => byggAv(e) === bygg)
      return {
        bygg,
        totalt: iBygg.length,
        kontrollert: iBygg.filter(e => e.kontrollert).length,
        etasjer: Array.from(etasjer.entries()).sort((a, b) => etasjeSortNokkel(a[0] || null) - etasjeSortNokkel(b[0] || null)).map(([etasje, rader]) => ({
          etasje,
          rader: sorter(rader),
          totalt: iBygg.filter(e => etasjeAv(e) === etasje).length,
          kontrollert: iBygg.filter(e => etasjeAv(e) === etasje && e.kontrollert).length,
        })),
      }
    })
  }, [enheter, chip, q, harBygg])

  const forslag = useMemo(() => ({
    fordeling: unike(enheter.map(e => e.fordeling)),
    kurs: unike(enheter.map(e => e.kurs)),
    produsent: unike(enheter.map(e => e.produsent)),
    bygg: unike(enheter.map(e => e.bygg)),
    batteritype: unike([...BATTERITYPER, ...enheter.map(e => e.batteritype)]),
  }), [enheter])

  function settStatus(e: NodlysEnhet, status: string) {
    onEndre(e.id, { status, kontrollert: true })
  }
  function toggleKontrollert(e: NodlysEnhet) {
    onEndre(e.id, { kontrollert: !e.kontrollert })
  }
  function toggleGruppe(k: string) { setLukkede(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n }) }
  function toggleValgt(id: string) { setValgte(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleValgteIds(ids: string[]) { setValgte(prev => { const n = new Set(prev); const alle = ids.every(i => n.has(i)); for (const i of ids) alle ? n.delete(i) : n.add(i); return n }) }
  function avsluttValg() { setVelgModus(false); setValgte(new Set()) }
  async function settPaaValgte(patch: Partial<NodlysEnhet>) { await onEndreFlere(Array.from(valgte), patch); setValgte(new Set()) }
  async function slettValgte() {
    setSletter(true)
    try { await onSlettFlere(Array.from(valgte)); setValgte(new Set()); setBekreftSlett(false) } finally { setSletter(false) }
  }

  /** Enter → samme felt i neste rad, Tab → neste felt (håndteres av nettleseren via rekkefølge) */
  function nesteRad(id: string, felt: Felt) {
    const flat = grupper.flatMap(b => b.etasjer.flatMap(g => g.rader))
    const i = flat.findIndex(r => r.id === id)
    if (i >= 0 && i < flat.length - 1) setRedigerer({ id: flat[i + 1].id, felt }); else setRedigerer(null)
  }

  const pct = teller.alle ? Math.round((teller.kontrollert / teller.alle) * 100) : 0

  return (
    <div className="space-y-3">
      {/* Fremdrift */}
      <div className="card !p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{teller.kontrollert} av {teller.alle} kontrollert <span className="text-gray-400 font-normal">· {pct} %</span></div>
          {teller.avvik > 0 && <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400"><AlertTriangle className="w-4 h-4" />{teller.avvik} avvik</span>}
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
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Søk nr., plassering, kurs…" aria-label="Søk" className="input pl-9 !min-h-[38px] !h-[38px]" />
          </div>
          <Button variant={velgModus ? 'primary' : 'outline'} icon={<CheckSquare />} onClick={() => velgModus ? avsluttValg() : setVelgModus(true)} className="!h-[38px]"><span className="hidden sm:inline">{velgModus ? 'Ferdig' : 'Velg flere'}</span></Button>
        </div>
      </div>

      {grupper.length === 0 ? (
        <div className="card text-center py-10 text-sm text-gray-500 dark:text-gray-400">
          {q ? 'Ingen armaturer matcher søket.' : chip === 'gjenstar' ? 'Alle armaturer er kontrollert 🎉' : chip === 'avvik' ? 'Ingen avvik registrert.' : 'Ingen armaturer registrert ennå. Bruk «Ny armatur» eller «Legg til flere».'}
        </div>
      ) : grupper.map(bg => {
        const byggKey = `b:${bg.bygg || '(uten)'}`
        const byggApen = !lukkede.has(byggKey)
        return (
          <div key={byggKey} className="space-y-2">
            {harBygg && (
              <button type="button" onClick={() => toggleGruppe(byggKey)} aria-expanded={byggApen} className="w-full flex items-center gap-2 px-1 py-1 text-left">
                <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', byggApen && 'rotate-90')} />
                <span className="text-base font-bold text-gray-900 dark:text-white">{bg.bygg || 'Uten bygg'}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{bg.kontrollert} av {bg.totalt}</span>
                {bg.kontrollert === bg.totalt && <Check className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={3} />}
              </button>
            )}
            {byggApen && bg.etasjer.map(g => {
              const key = `e:${bg.bygg}|${g.etasje || '(uten)'}`
              const apen = !lukkede.has(key)
              return (
                <section key={key} className={cn('card !p-0 overflow-hidden', harBygg && 'ml-3 sm:ml-5')} aria-label={[bg.bygg, g.etasje || 'Uten etasje'].filter(Boolean).join(' – ')}>
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
                      {/* PC: tabell med redigerbare celler */}
                      <table className="hidden lg:table w-full text-sm">
                        <thead className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          <tr className="border-b border-gray-200 dark:border-gray-800">
                            <th className="w-8"></th>
                            {FELTER.map(f => <th key={f.key} className={cn('px-2 py-1.5 text-left font-semibold', f.bredde)}>{f.navn}</th>)}
                            <th className="px-2 py-1.5 text-left font-semibold w-[300px]">Status</th>
                            <th className="w-px"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {g.rader.map(e => (
                            <tr key={e.id} className={cn('group', e.kontrollert ? 'bg-white dark:bg-transparent' : 'bg-yellow-50/40 dark:bg-yellow-900/5')}>
                              <td className="pl-3">{velgModus ? <input type="checkbox" checked={valgte.has(e.id)} onChange={() => toggleValgt(e.id)} aria-label="Velg" className="w-[18px] h-[18px] rounded text-primary focus:ring-primary" /> : <Kontrollert e={e} lagrer={lagrer.has(e.id)} onClick={() => toggleKontrollert(e)} />}</td>
                              {FELTER.map(f => (
                                <td key={f.key} className="px-1 py-1">
                                  <Celle e={e} felt={f.key} aktiv={redigerer?.id === e.id && redigerer.felt === f.key} forslag={forslag[f.key as keyof typeof forslag]}
                                    onStart={() => setRedigerer({ id: e.id, felt: f.key })} onLagre={(v, videre) => { if ((e[f.key] ?? '') !== v) onEndre(e.id, { [f.key]: v || null }); videre ? nesteRad(e.id, f.key) : setRedigerer(null) }} onAvbryt={() => setRedigerer(null)} />
                                </td>
                              ))}
                              <td className="px-2 py-1"><StatusKnapper e={e} onVelg={s => settStatus(e, s)} /></td>
                              <td className="px-1 py-1">
                                <div className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                                  <IconButton variant="ghost" label="Rediger i skjema" icon={<Edit />} onClick={() => onRediger(e)} className="w-8 h-8" />
                                  <IconButton variant="ghost" label="Slett" icon={<Trash2 />} onClick={() => onSlett(e)} className="w-8 h-8 hover:!text-red-500" />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Mobil/nettbrett: én kompakt rad per armatur med statusknapper */}
                      <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-800">
                        {g.rader.map(e => (
                          <div key={e.id} onClick={velgModus ? () => toggleValgt(e.id) : undefined} className={cn('flex items-center gap-2.5 px-3 py-2.5', !e.kontrollert && 'bg-yellow-50/40 dark:bg-yellow-900/5', velgModus && valgte.has(e.id) && 'bg-primary/10')}>
                            {velgModus ? <input type="checkbox" checked={valgte.has(e.id)} onChange={() => toggleValgt(e.id)} onClick={ev => ev.stopPropagation()} aria-label="Velg" className="w-[18px] h-[18px] rounded text-primary focus:ring-primary flex-shrink-0" /> : <Kontrollert e={e} lagrer={lagrer.has(e.id)} onClick={() => toggleKontrollert(e)} />}
                            <button type="button" onClick={velgModus ? undefined : () => onRediger(e)} className="flex-1 min-w-0 text-left">
                              <span className="block font-semibold text-gray-900 dark:text-white truncate"><span className="text-gray-400 font-mono text-xs mr-1.5">{e.internnummer ?? '–'}</span>{e.plassering || <span className="text-gray-400 font-normal">Uten plassering</span>}</span>
                              <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{[e.amatur_id ? `Armatur ${e.amatur_id}` : null, e.type, e.kurs ? `Kurs ${e.kurs}` : null, e.fordeling, e.batteritype].filter(Boolean).join(' · ') || 'Trykk for å fylle ut'}</span>
                              {e.notat && <span className="block text-xs text-amber-700 dark:text-amber-400 truncate">{e.notat}</span>}
                            </button>
                            {!velgModus && <StatusKnapper e={e} kompakt onVelg={s => settStatus(e, s)} onSlett={() => onSlett(e)} />}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              )
            })}
          </div>
        )
      })}

      {chip !== 'alle' && teller.alle > 0 && (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">Viser {chip === 'gjenstar' ? teller.gjenstar : chip === 'kontrollert' ? teller.kontrollert : teller.avvik} av {teller.alle} · <button type="button" onClick={() => setChip('alle')} className="text-primary hover:underline">Vis alle</button></p>
      )}

      {velgModus && (
        <div className="fixed bottom-4 left-4 right-4 lg:left-[calc(var(--sidebar-w)+2rem)] z-20 flex justify-center pointer-events-none">
          <div className="pointer-events-auto card !py-2 !px-3 shadow-lg border-primary/40 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums px-1">{valgte.size} valgt</span>
            <ByggVelger verdi="" eksisterende={forslag.bygg} disabled={valgte.size === 0} placeholder="Sett bygg…" onChange={v => settPaaValgte({ bygg: v || null })} className="!h-[34px] !min-h-[34px] !py-0 text-sm w-auto" />
            <select aria-label="Sett etasje" defaultValue="" disabled={valgte.size === 0} onChange={ev => { if (ev.target.value) { settPaaValgte({ etasje: ev.target.value }); ev.target.value = '' } }} className="input !h-[34px] !min-h-[34px] !py-0 text-sm w-auto">
              <option value="" disabled>Sett etasje…</option>
              {ETASJER.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <select aria-label="Sett batteritype" defaultValue="" disabled={valgte.size === 0} onChange={ev => { if (ev.target.value) { settPaaValgte({ batteritype: ev.target.value }); ev.target.value = '' } }} className="input !h-[34px] !min-h-[34px] !py-0 text-sm w-auto">
              <option value="" disabled>Sett batteri…</option>
              {forslag.batteritype.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <Button variant="outline" icon={<Check />} disabled={valgte.size === 0} onClick={() => settPaaValgte({ kontrollert: true })} className="!h-[34px]">Kontrollert</Button>
            <Button variant="outline" icon={<Trash2 />} disabled={valgte.size === 0} onClick={() => setBekreftSlett(true)} className="!h-[34px] text-red-600 dark:text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20">Slett</Button>
            <Button variant="ghost" icon={<X />} onClick={avsluttValg} className="!h-[34px]">Ferdig</Button>
          </div>
        </div>
      )}

      {/* Bekreft sletting av flere */}
      {bekreftSlett && (() => {
        const liste = enheter.filter(e => valgte.has(e.id))
        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => !sletter && setBekreftSlett(false)}>
            <div role="alertdialog" aria-labelledby="slett-tittel" className="bg-white dark:bg-dark-50 w-full sm:max-w-md rounded-t-xl sm:rounded-xl shadow-xl p-5 space-y-4" onClick={ev => ev.stopPropagation()}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                <div className="min-w-0">
                  <h2 id="slett-tittel" className="text-base font-semibold text-gray-900 dark:text-white">Slette {liste.length} {liste.length === 1 ? 'armatur' : 'armaturer'}?</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Armaturene fjernes fra nødlyslisten for anlegget. Dette kan ikke angres.</p>
                </div>
              </div>
              <ul className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                {liste.slice(0, 50).map(e => (
                  <li key={e.id} className="px-3 py-1.5 flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-500 w-10 flex-shrink-0">{e.internnummer || '–'}</span>
                    <span className="truncate text-gray-900 dark:text-white">{e.plassering || e.type || 'Uten plassering'}</span>
                    <span className="ml-auto text-xs text-gray-500 flex-shrink-0">{[e.bygg, e.etasje].filter(Boolean).join(' · ')}</span>
                  </li>
                ))}
                {liste.length > 50 && <li className="px-3 py-1.5 text-xs text-gray-500">+ {liste.length - 50} til</li>}
              </ul>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setBekreftSlett(false)} disabled={sletter}>Avbryt</Button>
                <Button variant="danger" icon={<Trash2 />} onClick={slettValgte} loading={sletter} className="!bg-red-600 !text-white hover:!bg-red-700">Slett {liste.length} {liste.length === 1 ? 'armatur' : 'armaturer'}</Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

/** Nedtrekk med byggene som finnes på anlegget + «Nytt bygg…» som gir et tekstfelt. */
function ByggVelger({ verdi, eksisterende, onChange, onAvbryt, placeholder, disabled, className, autoFocus, inputRef, onKeyDown, onBlur }: {
  verdi: string; eksisterende: string[]; onChange: (v: string) => void; onAvbryt?: () => void; placeholder?: string; disabled?: boolean; className?: string; autoFocus?: boolean
  inputRef?: React.RefObject<HTMLInputElement | HTMLSelectElement>; onKeyDown?: (ev: React.KeyboardEvent) => void; onBlur?: () => void
}) {
  const [nytt, setNytt] = useState(false)
  const [tekst, setTekst] = useState('')
  // Når vi bytter fra nedtrekk til tekstfelt skal ikke nedtrekkets blur lukke cellen
  const bytter = useRef(false)
  const valg = eksisterende.includes(verdi) || !verdi ? eksisterende : [verdi, ...eksisterende]
  if (nytt) {
    return (
      <input ref={inputRef as React.RefObject<HTMLInputElement>} value={tekst} onChange={ev => setTekst(ev.target.value)} placeholder="Navn på bygg" autoFocus aria-label="Nytt bygg"
        onKeyDown={ev => { if (ev.key === 'Enter') { ev.preventDefault(); if (tekst.trim()) onChange(tekst.trim()); setNytt(false); setTekst('') } if (ev.key === 'Escape') { setNytt(false); onAvbryt?.() } }}
        onBlur={() => { if (tekst.trim()) onChange(tekst.trim()); else onAvbryt?.(); setNytt(false); setTekst('') }}
        className={cn('input', className)} />
    )
  }
  return (
    <select ref={inputRef as React.RefObject<HTMLSelectElement>} value={verdi} disabled={disabled} autoFocus={autoFocus} aria-label={placeholder ?? 'Bygg'} onKeyDown={onKeyDown} onBlur={() => { if (!bytter.current) onBlur?.() }}
      onChange={ev => { if (ev.target.value === '__nytt') { bytter.current = true; setNytt(true); return } onChange(ev.target.value) }} className={cn('input', className)}>
      <option value="">{placeholder ?? '–'}</option>
      {valg.map(x => <option key={x} value={x}>{x}</option>)}
      <option value="__nytt">＋ Nytt bygg…</option>
    </select>
  )
}

function Kontrollert({ e, lagrer, onClick }: { e: NodlysEnhet; lagrer: boolean; onClick: () => void }) {
  if (lagrer) return <span className="w-6 h-6 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary" /></span>
  return (
    <button type="button" onClick={onClick} aria-pressed={Boolean(e.kontrollert)} aria-label={e.kontrollert ? 'Kontrollert – trykk for å angre' : 'Merk som kontrollert'} title={e.kontrollert ? 'Kontrollert' : 'Ikke kontrollert'}
      className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors', e.kontrollert ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600 hover:border-green-500')}>
      {e.kontrollert && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
    </button>
  )
}

/** OK som stor knapp, valgt status som pille, øvrige statuser i meny. */
function StatusKnapper({ e, kompakt, onVelg, onSlett }: { e: NodlysEnhet; kompakt?: boolean; onVelg: (s: string) => void; onSlett?: () => void }) {
  const harStatus = Boolean(e.status)
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {harStatus && e.status !== 'OK' ? (
        <span className={cn('inline-flex items-center px-2 h-8 rounded-full text-xs font-semibold border whitespace-nowrap', STATUS_FARGE[e.status!] ?? 'bg-gray-100 text-gray-700 border-gray-300')}>{e.status}</span>
      ) : (
        <button type="button" onClick={() => onVelg('OK')} aria-pressed={e.status === 'OK'} className={cn('h-8 px-3 rounded-lg text-sm font-semibold border transition-colors inline-flex items-center gap-1', e.status === 'OK' ? 'bg-green-500 border-green-500 text-white' : 'border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20')}><Check className="w-3.5 h-3.5" strokeWidth={3} />OK</button>
      )}
      {!kompakt && !harStatus && NODLYS_STATUSER.filter(s => s !== 'OK' && s !== 'Utskiftet').map(s => (
        <button key={s} type="button" onClick={() => onVelg(s)} className="h-8 px-2 rounded-lg text-xs border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 whitespace-nowrap">{s}</button>
      ))}
      <DropdownMenu trigger={open => <IconButton variant="ghost" label="Flere statuser" icon={kompakt ? <MoreHorizontal /> : <ChevronDown />} aria-expanded={open} className="w-8 h-8" />}>
        {NODLYS_STATUSER.map(s => <MenuItem key={s} icon={s === e.status ? <Check /> : undefined} onSelect={() => onVelg(s)}>{s}</MenuItem>)}
        {e.status && <><MenuSeparator /><MenuItem icon={<X />} onSelect={() => onVelg('')}>Fjern status</MenuItem></>}
        {onSlett && <><MenuSeparator /><MenuItem icon={<Trash2 />} danger onSelect={onSlett}>Slett armatur…</MenuItem></>}
      </DropdownMenu>
    </div>
  )
}

/** Redigerbar celle: klikk → input (med forslag for fordeling/kurs/produsent, nedtrekk for etasje/type). Enter = lagre og gå til neste rad. */
function Celle({ e, felt, aktiv, forslag, onStart, onLagre, onAvbryt }: {
  e: NodlysEnhet; felt: Felt; aktiv: boolean; forslag?: string[]
  onStart: () => void; onLagre: (verdi: string, videre: boolean) => void; onAvbryt: () => void
}) {
  const [v, setV] = useState(e[felt] ?? '')
  const ref = useRef<HTMLInputElement | HTMLSelectElement>(null)
  // Enter/Tab og blur kan begge fyre – lagre bare én gang per redigering
  const ferdig = useRef(false)
  useEffect(() => { if (aktiv) { ferdig.current = false; setV(e[felt] ?? ''); setTimeout(() => ref.current?.focus({ preventScroll: true }), 0) } }, [aktiv, e, felt])
  const lagre = (verdi: string, videre: boolean) => { if (ferdig.current) return; ferdig.current = true; onLagre(verdi, videre) }
  const avbryt = () => { ferdig.current = true; onAvbryt() }

  if (!aktiv) {
    return <button type="button" onClick={onStart} className={cn('w-full text-left px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-dark-100 truncate', e[felt] ? (felt === 'notat' ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-white') : 'text-gray-300 dark:text-gray-600')} title={e[felt] || 'Klikk for å redigere'}>{e[felt] || '–'}</button>
  }
  if (felt === 'bygg') {
    return <ByggVelger verdi={v} eksisterende={forslag ?? []} inputRef={ref} className="!min-h-[30px] !h-[30px] !py-0 !px-1.5 text-sm w-full"
      onChange={val => { setV(val); lagre(val, false) }} onAvbryt={avbryt}
      onKeyDown={ev => { if (ev.key === 'Escape') avbryt(); if (ev.key === 'Tab') lagre(v, false) }} onBlur={() => setTimeout(() => lagre(v, false), 120)} />
  }
  const valg = felt === 'etasje' ? ETASJER : felt === 'type' ? NODLYS_TYPER : null
  const felles = {
    onKeyDown: (ev: React.KeyboardEvent) => { if (ev.key === 'Enter') { ev.preventDefault(); lagre(v, true) } if (ev.key === 'Escape') avbryt(); if (ev.key === 'Tab') lagre(v, false) },
    onBlur: () => setTimeout(() => lagre(v, false), 120),
    className: 'input !min-h-[30px] !h-[30px] !py-0 !px-1.5 text-sm w-full',
  }
  if (valg) {
    return (
      <select ref={ref as React.RefObject<HTMLSelectElement>} value={v} onChange={ev => { setV(ev.target.value); lagre(ev.target.value, false) }} {...felles}>
        <option value="">–</option>
        {valg.map(x => <option key={x} value={x}>{x}</option>)}
      </select>
    )
  }
  const listeId = forslag?.length ? `forslag-${felt}` : undefined
  return (
    <>
      <input ref={ref as React.RefObject<HTMLInputElement>} value={v} onChange={ev => setV(ev.target.value)} list={listeId} {...felles} />
      {listeId && <datalist id={listeId}>{forslag!.map(x => <option key={x} value={x} />)}</datalist>}
    </>
  )
}

function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={aktiv} className={cn('inline-flex items-center gap-2 h-[34px] px-3 rounded-full border text-sm whitespace-nowrap flex-shrink-0 transition-colors [&>b]:font-bold [&>b]:tabular-nums', aktiv ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500')}>{children}</button>
}

function unike(v: (string | null)[]): string[] { return Array.from(new Set(v.filter((x): x is string => Boolean(x && x.trim())))).sort((a, b) => a.localeCompare(b, 'nb-NO', { numeric: true })) }
