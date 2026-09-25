/**
 * Førstehjelp – listen over utstyret på et anlegg.
 *
 * Gruppert på etasje, med fremdrift, chips og søk. Hver enhet redigeres i raden, og
 * sjekkpunktene for typen ligger under når raden foldes ut. Utløpsdato er markert,
 * for det er den som avgjør om innholdet må byttes.
 */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, Check, CheckSquare, ChevronDown, ChevronRight, Clock, Loader2,
  MoreHorizontal, Plus, Search, Trash2, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import {
  AVVIK_STATUSER, ETASJER, STATUSER, TILLEGG, TYPER,
  enhetNavn, punkterFor, utlopsinfo, type ForstehjelpEnhet,
} from './typer'

type Chip = 'alle' | 'gjenstar' | 'kontrollert' | 'avvik' | 'utlop'

export function ForstehjelpListe({ enheter, lagrer, onEndre, onEndreFlere, onSlett, onSlettFlere, onNy }: {
  enheter: ForstehjelpEnhet[]
  lagrer: Set<string>
  onEndre: (id: string, patch: Partial<ForstehjelpEnhet>) => void
  onEndreFlere: (ids: string[], patch: Partial<ForstehjelpEnhet>) => Promise<void>
  onSlett: (e: ForstehjelpEnhet) => void
  onSlettFlere: (ids: string[]) => Promise<void>
  onNy: () => void
}) {
  const [params, setParams] = useSearchParams()
  const chip = (params.get('f') as Chip) || 'alle'
  const sok = params.get('q') || ''
  const [apne, setApne] = useState<Set<string>>(new Set())
  const [velgModus, setVelgModus] = useState(false)
  const [valgte, setValgte] = useState<Set<string>>(new Set())
  const [bekreftSlett, setBekreftSlett] = useState(false)
  const [sletter, setSletter] = useState(false)

  function setParam(k: string, v: string | null) {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v); else p.delete(k)
    setParams(p, { replace: true })
  }

  const teller = useMemo(() => ({
    alle: enheter.length,
    kontrollert: enheter.filter(e => e.kontrollert).length,
    gjenstar: enheter.filter(e => !e.kontrollert).length,
    avvik: enheter.filter(e => AVVIK_STATUSER.has(e.status ?? '')).length,
    utlop: enheter.filter(e => { const u = utlopsinfo(e.utlopsdato); return u && u.tilstand !== 'ok' }).length,
  }), [enheter])

  const synlige = useMemo(() => {
    const s = sok.trim().toLowerCase()
    return enheter.filter(e => {
      if (chip === 'kontrollert' && !e.kontrollert) return false
      if (chip === 'gjenstar' && e.kontrollert) return false
      if (chip === 'avvik' && !AVVIK_STATUSER.has(e.status ?? '')) return false
      if (chip === 'utlop') { const u = utlopsinfo(e.utlopsdato); if (!u || u.tilstand === 'ok') return false }
      if (!s) return true
      return [e.internnummer, e.type, e.plassering, e.etasje, e.produsent, e.kommentar].some(v => v?.toLowerCase().includes(s))
    })
  }, [enheter, chip, sok])

  const grupper = useMemo(() => {
    const m = new Map<string, ForstehjelpEnhet[]>()
    for (const e of synlige) {
      const k = e.etasje || 'Uten etasje'
      const a = m.get(k) ?? []; a.push(e); m.set(k, a)
    }
    const rekke = (k: string) => { const i = (ETASJER as readonly string[]).indexOf(k); return i < 0 ? 99 : i }
    return [...m.entries()].sort((a, b) => rekke(a[0]) - rekke(b[0]))
  }, [synlige])

  const pct = teller.alle ? Math.round((teller.kontrollert / teller.alle) * 100) : 0

  function toggle(id: string) { setApne(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleValgt(id: string) { setValgte(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function avsluttValg() { setVelgModus(false); setValgte(new Set()) }
  async function settPaaValgte(patch: Partial<ForstehjelpEnhet>) { await onEndreFlere(Array.from(valgte), patch); setValgte(new Set()) }
  async function slettValgte() {
    setSletter(true)
    try { await onSlettFlere(Array.from(valgte)); setValgte(new Set()); setBekreftSlett(false) } finally { setSletter(false) }
  }

  function settPunkt(e: ForstehjelpEnhet, punkt: string, verdi: boolean) {
    onEndre(e.id, { sjekkpunkter: { ...(e.sjekkpunkter ?? {}), [punkt]: verdi } })
  }
  function toggleTillegg(e: ForstehjelpEnhet, t: string) {
    const na = e.tillegg ?? []
    onEndre(e.id, { tillegg: na.includes(t) ? na.filter(x => x !== t) : [...na, t] })
  }

  return (
    <div className="space-y-4">
      {/* Fremdrift */}
      <div className="card !py-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <b className="text-gray-900 dark:text-white tabular-nums">{teller.kontrollert} av {teller.alle}</b> kontrollert
            <span className="text-gray-400"> · {pct} %</span>
          </p>
          <div className="flex items-center gap-3 text-sm">
            {teller.utlop > 0 && (
              <button type="button" onClick={() => setParam('f', 'utlop')} className="font-semibold text-orange-600 dark:text-orange-400 inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4" />{teller.utlop} utløper
              </button>
            )}
            {teller.avvik > 0 && (
              <button type="button" onClick={() => setParam('f', 'avvik')} className="font-semibold text-red-600 dark:text-red-400 inline-flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />{teller.avvik} avvik
              </button>
            )}
          </div>
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
          <Chipknapp aktiv={chip === 'utlop'} onClick={() => setParam('f', 'utlop')}><Clock className="w-3.5 h-3.5" />Utløper <b>{teller.utlop}</b></Chipknapp>
        </div>
        <div className="relative sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="search" value={sok} onChange={e => setParam('q', e.target.value || null)} placeholder="Søk nr., type, plassering…" className="input pl-9 w-full !h-[38px]" />
        </div>
        <Button variant={velgModus ? 'primary' : 'outline'} icon={<CheckSquare />} onClick={() => velgModus ? avsluttValg() : setVelgModus(true)} className="!h-[38px]">
          <span className="hidden sm:inline">{velgModus ? 'Ferdig' : 'Velg flere'}</span>
        </Button>
        <Button variant="primary" icon={<Plus />} onClick={onNy} className="!h-[38px]">Ny enhet</Button>
      </div>

      {/* Liste */}
      {synlige.length === 0 ? (
        <div className="card py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          {enheter.length === 0 ? 'Ingen førstehjelpsutstyr registrert på anlegget ennå.' : 'Ingen enheter passer filtrene.'}
        </div>
      ) : grupper.map(([etasje, liste]) => (
        <section key={etasje} className="card !p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-dark-100">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{etasje}</h2>
            <span className="text-xs text-gray-400 tabular-nums">{liste.filter(e => e.kontrollert).length} av {liste.length}</span>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {liste.map(e => {
              const u = utlopsinfo(e.utlopsdato)
              const apen = apne.has(e.id)
              const punkter = punkterFor(e.type)
              const huket = punkter.filter(p => e.sjekkpunkter?.[p]).length
              return (
                <li key={e.id} className={cn(!e.kontrollert && 'bg-yellow-50/40 dark:bg-yellow-900/5', velgModus && valgte.has(e.id) && 'bg-primary/10')}>
                  <div className="flex items-center gap-2 px-3 py-2">
                    {velgModus ? (
                      <input type="checkbox" checked={valgte.has(e.id)} onChange={() => toggleValgt(e.id)} aria-label="Velg" className="w-[18px] h-[18px] rounded text-primary focus:ring-primary flex-shrink-0" />
                    ) : (
                      <button type="button" onClick={() => onEndre(e.id, { kontrollert: !e.kontrollert })} aria-pressed={Boolean(e.kontrollert)} title="Kontrollert"
                        className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          e.kontrollert ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600 text-transparent hover:border-green-500')}>
                        {lagrer.has(e.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" /> : <Check className="w-4 h-4" strokeWidth={3} />}
                      </button>
                    )}
                    <button type="button" onClick={() => toggle(e.id)} aria-expanded={apen} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                      {apen ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{enhetNavn(e)}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                          {[e.produsent, punkter.length ? `${huket}/${punkter.length} sjekkpunkter` : null, e.tillegg?.length ? e.tillegg.join(', ') : null].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </button>
                    {u && u.tilstand !== 'ok' && (
                      <span className={cn('hidden sm:inline-flex items-center gap-1 px-2 h-7 rounded-full border text-xs font-semibold whitespace-nowrap',
                        u.tilstand === 'utgatt' ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                          : 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800')}>
                        <Clock className="w-3 h-3" />{u.tekst}
                      </span>
                    )}
                    <select value={e.status ?? ''} onChange={ev => onEndre(e.id, { status: ev.target.value })} aria-label="Status"
                      className={cn('input !h-8 w-28 text-sm font-medium flex-shrink-0', AVVIK_STATUSER.has(e.status ?? '') && 'text-red-600 dark:text-red-400')}>
                      <option value="">Uten status</option>
                      {STATUSER.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {!velgModus && (
                      <DropdownMenu trigger={open => <IconButton variant="ghost" label="Flere valg" icon={<MoreHorizontal />} aria-expanded={open} className="w-8 h-8" />}>
                        <MenuItem icon={<Check />} onSelect={() => punkter.forEach(p => settPunkt(e, p, true))}>Huk av alle sjekkpunkter</MenuItem>
                        <MenuSeparator />
                        <MenuItem icon={<Trash2 />} danger onSelect={() => onSlett(e)}>Slett enhet…</MenuItem>
                      </DropdownMenu>
                    )}
                  </div>

                  {apen && (
                    <div className="px-3 pb-3 pt-1 space-y-3 bg-gray-50/60 dark:bg-dark-100/40 border-t border-gray-100 dark:border-gray-800">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                        <Felt label="Internnr."><input value={e.internnummer ?? ''} onChange={ev => onEndre(e.id, { internnummer: ev.target.value })} className="input !h-9" /></Felt>
                        <Felt label="Type">
                          <select value={e.type ?? ''} onChange={ev => onEndre(e.id, { type: ev.target.value })} className="input !h-9">
                            <option value="">Velg…</option>
                            {TYPER.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </Felt>
                        <Felt label="Plassering" bred><input value={e.plassering ?? ''} onChange={ev => onEndre(e.id, { plassering: ev.target.value })} className="input !h-9" /></Felt>
                        <Felt label="Etasje">
                          <select value={e.etasje ?? ''} onChange={ev => onEndre(e.id, { etasje: ev.target.value })} className="input !h-9">
                            <option value="">Uten etasje</option>
                            {ETASJER.map(x => <option key={x} value={x}>{x}</option>)}
                          </select>
                        </Felt>
                        <Felt label="Produsent"><input value={e.produsent ?? ''} onChange={ev => onEndre(e.id, { produsent: ev.target.value })} className="input !h-9" /></Felt>
                        <Felt label="Utløpsdato"><input type="date" value={e.utlopsdato ?? ''} onChange={ev => onEndre(e.id, { utlopsdato: ev.target.value || null })} className="input !h-9" /></Felt>
                        <Felt label="Kommentar" bred><input value={e.kommentar ?? ''} onChange={ev => onEndre(e.id, { kommentar: ev.target.value })} placeholder="Merknad til denne enheten" className="input !h-9" /></Felt>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Sjekkpunkter for {e.type || 'enheten'}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {punkter.map(p => {
                            const av = Boolean(e.sjekkpunkter?.[p])
                            return (
                              <button key={p} type="button" onClick={() => settPunkt(e, p, !av)}
                                className={cn('h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors',
                                  av ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-green-500')}>
                                {av && <Check className="w-3 h-3" strokeWidth={3} />}{p}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Tillegg</p>
                        <div className="flex flex-wrap gap-1.5">
                          {TILLEGG.map(t => {
                            const av = (e.tillegg ?? []).includes(t)
                            return (
                              <button key={t} type="button" onClick={() => toggleTillegg(e, t)}
                                className={cn('h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors',
                                  av ? 'bg-primary border-primary text-white' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary')}>
                                {t}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {/* Velg flere */}
      {velgModus && (
        <div className="fixed bottom-4 left-4 right-4 lg:left-[calc(var(--sidebar-w)+2rem)] z-20 flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 bg-white dark:bg-dark-50 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl px-3 py-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums px-1">{valgte.size} valgt</span>
            <select aria-label="Sett etasje" defaultValue="" disabled={valgte.size === 0} onChange={ev => { if (ev.target.value) { settPaaValgte({ etasje: ev.target.value }); ev.target.value = '' } }} className="input !h-[34px] !min-h-[34px] !py-0 text-sm w-auto">
              <option value="" disabled>Sett etasje…</option>
              {ETASJER.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <select aria-label="Sett status" defaultValue="" disabled={valgte.size === 0} onChange={ev => { if (ev.target.value) { settPaaValgte({ status: ev.target.value }); ev.target.value = '' } }} className="input !h-[34px] !min-h-[34px] !py-0 text-sm w-auto">
              <option value="" disabled>Sett status…</option>
              {STATUSER.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <Button variant="outline" icon={<Check />} disabled={valgte.size === 0} onClick={() => settPaaValgte({ kontrollert: true })} className="!h-[34px]">Kontrollert</Button>
            <Button variant="outline" icon={<Trash2 />} disabled={valgte.size === 0} onClick={() => setBekreftSlett(true)} className="!h-[34px] text-red-600 dark:text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20">Slett</Button>
            <Button variant="ghost" icon={<X />} onClick={avsluttValg} className="!h-[34px]">Ferdig</Button>
          </div>
        </div>
      )}

      {/* Bekreft sletting */}
      {bekreftSlett && (() => {
        const liste = enheter.filter(e => valgte.has(e.id))
        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => !sletter && setBekreftSlett(false)}>
            <div role="alertdialog" className="bg-white dark:bg-dark-50 w-full sm:max-w-md rounded-t-xl sm:rounded-xl shadow-xl p-5 space-y-4" onClick={ev => ev.stopPropagation()}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Slette {liste.length} {liste.length === 1 ? 'enhet' : 'enheter'}?</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Utstyret fjernes fra anlegget. Dette kan ikke angres.</p>
                </div>
              </div>
              <ul className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                {liste.slice(0, 50).map(e => <li key={e.id} className="px-3 py-1.5 truncate">{enhetNavn(e)}</li>)}
              </ul>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setBekreftSlett(false)} disabled={sletter}>Avbryt</Button>
                <Button variant="danger" icon={<Trash2 />} onClick={slettValgte} loading={sletter} className="!bg-red-600 !text-white hover:!bg-red-700">Slett {liste.length}</Button>
              </div>
            </div>
          </div>
        )
      })()}
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
