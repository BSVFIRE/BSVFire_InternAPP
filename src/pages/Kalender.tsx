/**
 * Kalender (/kalender) – uke- og månedsvisning med Outlook-avtaler, ukesplan og oppgaver.
 * Outlook-avtaler krever at brukeren har koblet til i profilen (valgte kalendere vises).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, CalendarDays, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { cn, isoUke, isoUkeAar, ukeDatoer, UKEDAGER } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { MAANEDER, OPPGAVE_STATUSER } from '@/lib/constants'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { erKobletTilOutlook, hentAvtaler, outlookMaaFornyes, type Avtale } from '@/lib/microsoft'
import { Button, IconButton } from '@/components/ui/Button'

const log = createLogger('Kalender')

type Visning = 'uke' | 'maaned'
type Hendelse =
  | { kind: 'avtale'; id: string; start: Date; slutt: Date; heleDagen: boolean; tittel: string; sted: string | null; lenke: string | null }
  | { kind: 'plan'; id: string; start: Date; tittel: string; under: string | null; anleggId: string; heleDagen: true }
  | { kind: 'oppgave'; id: string; start: Date; tittel: string; under: string | null; forfalt: boolean; heleDagen: true }

type PlanDag = { id: string; dag: number; estimert_oppstart: string | null; anlegg_id: string; ukesplan: { aar: number; uke_nummer: number; ukesplan_teknikere: { ansatt_id: string }[] } | null; anlegg: { anleggsnavn: string | null; poststed: string | null } | null }
type Oppgave = Pick<Tables<'oppgaver'>, 'id' | 'tittel' | 'type' | 'forfallsdato' | 'tekniker_id'> & { anlegg: { anleggsnavn: string | null } | null }

const TIMER_FRA = 7, TIMER_TIL = 18
const start0 = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const sammeDag = (a: Date, b: Date) => a.toDateString() === b.toDateString()
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const kl = (d: Date) => d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })

export function Kalender() {
  const navigate = useNavigate()
  const { ansatt } = useCurrentAnsatt()
  const [params, setParams] = useSearchParams()
  const visning: Visning = params.get('v') === 'maaned' ? 'maaned' : 'uke'
  const anker = useMemo(() => { const p = params.get('d'); const d = p ? new Date(p) : new Date(); return isNaN(d.getTime()) ? start0(new Date()) : start0(d) }, [params])
  const mine = params.get('alle') !== '1'
  const iDag = useMemo(() => start0(new Date()), [])

  // Synlig periode
  const periode = useMemo(() => {
    if (visning === 'uke') {
      const dager = ukeDatoer(isoUkeAar(anker), isoUke(anker)).map(start0)
      return { fra: dager[0], til: new Date(dager[6].getTime() + 86_400_000), dager }
    }
    const forste = new Date(anker.getFullYear(), anker.getMonth(), 1)
    const siste = new Date(anker.getFullYear(), anker.getMonth() + 1, 0)
    const fra = ukeDatoer(isoUkeAar(forste), isoUke(forste)).map(start0)[0]
    const tilUke = ukeDatoer(isoUkeAar(siste), isoUke(siste)).map(start0)
    const til = new Date(tilUke[6].getTime() + 86_400_000)
    const dager: Date[] = []; for (let d = new Date(fra); d < til; d.setDate(d.getDate() + 1)) dager.push(new Date(d))
    return { fra, til, dager }
  }, [visning, anker])

  const [avtaler, setAvtaler] = useState<Avtale[]>([])
  const [planDager, setPlanDager] = useState<PlanDag[]>([])
  const [oppgaver, setOppgaver] = useState<Oppgave[]>([])
  const [outlook, setOutlook] = useState<'ukjent' | 'ikke_koblet' | 'koblet' | 'ma_fornyes'>('ukjent')
  const [loading, setLoading] = useState(true)

  const last = useCallback(async () => {
    setLoading(true)
    try {
      // Ukesplaner som dekker perioden: alle (aar, uke)-par
      const uker = new Map<string, { aar: number; uke: number }>()
      for (const d of periode.dager) { const a = isoUkeAar(d), u = isoUke(d); uker.set(`${a}-${u}`, { aar: a, uke: u }) }
      const ukeFilter = Array.from(uker.values()).map(x => `and(aar.eq.${x.aar},uke_nummer.eq.${x.uke})`).join(',')
      const [p, o, koblet] = await Promise.all([
        db.from('ukesplan_dager').select('id, dag, estimert_oppstart, anlegg_id, ukesplan:ukesplan_id!inner(aar, uke_nummer, ukesplan_teknikere(ansatt_id)), anlegg:anlegg_id(anleggsnavn, poststed)').or(ukeFilter, { referencedTable: 'ukesplan' }),
        db.from('oppgaver').select('id, tittel, type, forfallsdato, tekniker_id, anlegg:anlegg_id(anleggsnavn)').neq('status', OPPGAVE_STATUSER.FULLFORT).gte('forfallsdato', ymd(periode.fra)).lt('forfallsdato', ymd(periode.til)),
        erKobletTilOutlook(),
      ])
      setPlanDager(((p.data ?? []) as unknown as PlanDag[]).filter(d => d.ukesplan))
      setOppgaver((o.data ?? []) as Oppgave[])
      if (koblet) {
        setOutlook('koblet')
        try {
          setAvtaler(await hentAvtaler(periode.fra, periode.til))
          if (outlookMaaFornyes()) setOutlook('ma_fornyes')
        } catch (err) {
          log.warn('Outlook-avtaler feilet', { err })
          setAvtaler([])
          if (outlookMaaFornyes()) setOutlook('ma_fornyes')
        }
      } else { setOutlook('ikke_koblet'); setAvtaler([]) }
    } catch (err) {
      log.error('Kunne ikke laste kalender', { error: err })
    } finally { setLoading(false) }
  }, [periode])
  useEffect(() => { last() }, [last])

  const hendelser = useMemo<Hendelse[]>(() => {
    const h: Hendelse[] = []
    // Egne Outlook-avtaler vises i begge visninger (kollegers kalendere kommer når de er delt)
    for (const a of avtaler) h.push({ kind: 'avtale', id: a.id, start: a.start, slutt: a.slutt, heleDagen: a.heleDagen, tittel: a.tittel, sted: a.sted, lenke: a.lenke })
    for (const d of planDager) {
      if (!d.ukesplan) continue
      if (mine && ansatt && !d.ukesplan.ukesplan_teknikere.some(t => t.ansatt_id === ansatt.id)) continue
      const dato = ukeDatoer(d.ukesplan.aar, d.ukesplan.uke_nummer)[d.dag - 1]
      if (!dato) continue
      h.push({ kind: 'plan', id: d.id, start: start0(dato), tittel: d.anlegg?.anleggsnavn ?? 'Anlegg', under: [d.estimert_oppstart ? `kl. ${d.estimert_oppstart.slice(0, 5)}` : null, d.anlegg?.poststed].filter(Boolean).join(' · ') || null, anleggId: d.anlegg_id, heleDagen: true })
    }
    for (const o of oppgaver) {
      if (mine && ansatt && o.tekniker_id !== ansatt.id) continue
      if (!o.forfallsdato) continue
      const dato = start0(new Date(o.forfallsdato))
      h.push({ kind: 'oppgave', id: o.id, start: dato, tittel: o.tittel ?? o.type ?? 'Oppgave', under: o.anlegg?.anleggsnavn ?? null, forfalt: dato < iDag, heleDagen: true })
    }
    return h.sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [avtaler, planDager, oppgaver, mine, ansatt, iDag])

  function gaaTil(d: Date) { const p = new URLSearchParams(params); p.set('d', ymd(d)); setParams(p, { replace: true }) }
  function settVisning(v: Visning) { const p = new URLSearchParams(params); p.set('v', v); setParams(p, { replace: true }) }
  function flytt(retning: -1 | 1) {
    const d = new Date(anker)
    if (visning === 'uke') d.setDate(d.getDate() + 7 * retning); else d.setMonth(d.getMonth() + retning)
    gaaTil(d)
  }
  function settMine(v: boolean) { const p = new URLSearchParams(params); if (v) p.delete('alle'); else p.set('alle', '1'); setParams(p, { replace: true }) }

  const tittel = visning === 'uke'
    ? `Uke ${isoUke(anker)} · ${periode.dager[0].getDate()}.–${periode.dager[6].getDate()}. ${MAANEDER[periode.dager[6].getMonth()].toLowerCase()} ${periode.dager[6].getFullYear()}`
    : `${MAANEDER[anker.getMonth()]} ${anker.getFullYear()}`

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Kalender</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{tittel}</p>
        </div>
        <div className="inline-flex bg-gray-100 dark:bg-dark-100 rounded-lg p-0.5" role="group" aria-label="Omfang">
          {[true, false].map(v => <button key={String(v)} type="button" onClick={() => settMine(v)} aria-pressed={mine === v} className={cn('px-3 h-8 rounded-md text-sm font-medium', mine === v ? 'bg-white dark:bg-dark-50 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400')}>{v ? 'Mine' : 'Alle'}</button>)}
        </div>
        <div className="inline-flex bg-gray-100 dark:bg-dark-100 rounded-lg p-0.5" role="group" aria-label="Visning">
          {(['uke', 'maaned'] as const).map(v => <button key={v} type="button" onClick={() => settVisning(v)} aria-pressed={visning === v} className={cn('px-3 h-8 rounded-md text-sm font-medium', visning === v ? 'bg-white dark:bg-dark-50 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400')}>{v === 'uke' ? 'Uke' : 'Måned'}</button>)}
        </div>
        <div className="inline-flex items-center gap-1">
          <IconButton variant="outline" label={visning === 'uke' ? 'Forrige uke' : 'Forrige måned'} icon={<ChevronLeft />} onClick={() => flytt(-1)} />
          <Button variant="outline" onClick={() => gaaTil(iDag)}>I dag</Button>
          <IconButton variant="outline" label={visning === 'uke' ? 'Neste uke' : 'Neste måned'} icon={<ChevronRight />} onClick={() => flytt(1)} />
        </div>
      </header>

      {outlook === 'ma_fornyes' && mine && (
        <Link to="/admin/bedrift" className="block card !py-2.5 text-sm text-yellow-700 dark:text-yellow-400 hover:underline"><CalendarDays className="inline w-4 h-4 mr-1.5 -mt-0.5" />Outlook-tilgangen har utløpt. Koble til på nytt i profilen for å se avtalene dine →</Link>
      )}
      {outlook === 'ikke_koblet' && mine && (
        <Link to="/admin/bedrift" className="block card !py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-primary"><CalendarDays className="inline w-4 h-4 mr-1.5 -mt-0.5" />Koble til Outlook i profilen for å se kalenderavtalene dine her →</Link>
      )}

      <div className={cn('transition-opacity', loading && 'opacity-60')}>
        {visning === 'uke'
          ? <UkeVisning dager={periode.dager} hendelser={hendelser} iDag={iDag} onApneAnlegg={id => navigate(`/anlegg/${id}`)} onApneOppgave={id => navigate('/oppgaver', { state: { selectedOppgaveId: id } })} />
          : <MaanedVisning dager={periode.dager} maaned={anker.getMonth()} hendelser={hendelser} iDag={iDag} onVelgDag={d => { gaaTil(d); settVisning('uke') }} />}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />Outlook</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary" />Ukesplan</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-400" />Oppgave (forfallsdato)</span>
      </div>
    </div>
  )
}

// ---------- Uke ----------

function UkeVisning({ dager, hendelser, iDag, onApneAnlegg, onApneOppgave }: { dager: Date[]; hendelser: Hendelse[]; iDag: Date; onApneAnlegg: (id: string) => void; onApneOppgave: (id: string) => void }) {
  const timer = Array.from({ length: TIMER_TIL - TIMER_FRA }, (_, i) => TIMER_FRA + i)
  const radH = 44 // px per time
  const perDag = dager.map(d => ({
    dag: d,
    heleDagen: hendelser.filter(h => sammeDag(h.start, d) && h.heleDagen),
    tidsatte: hendelser.filter((h): h is Extract<Hendelse, { kind: 'avtale' }> => h.kind === 'avtale' && !h.heleDagen && sammeDag(h.start, d)),
  }))

  return (
    <div className="card !p-0 overflow-x-auto">
      <div className="min-w-[760px]">
        {/* Dag-hoder + heldags */}
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-gray-200 dark:border-gray-800">
          <div />
          {perDag.map(({ dag }) => {
            const erIDag = sammeDag(dag, iDag)
            return (
              <div key={dag.toISOString()} className={cn('px-2 py-2 text-center border-l border-gray-200 dark:border-gray-800', erIDag && 'bg-primary/5')}>
                <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{UKEDAGER[(dag.getDay() + 6) % 7].slice(0, 3)}</div>
                <div className={cn('text-lg font-semibold leading-tight', erIDag ? 'text-primary' : 'text-gray-900 dark:text-white')}>{dag.getDate()}</div>
              </div>
            )
          })}
          <div className="text-[10px] text-gray-400 px-1 pt-1">Hele<br />dagen</div>
          {perDag.map(({ dag, heleDagen }) => (
            <div key={dag.toISOString()} className="p-1 space-y-1 border-l border-t border-gray-200 dark:border-gray-800 min-h-[28px]">
              {heleDagen.map(h => <Brikke key={h.kind + h.id} h={h} onApneAnlegg={onApneAnlegg} onApneOppgave={onApneOppgave} />)}
            </div>
          ))}
        </div>
        {/* Tidsgrid */}
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
          <div className="relative" style={{ height: timer.length * radH }}>
            {timer.map((t, i) => <div key={t} className="absolute right-2 -translate-y-1/2 text-[11px] text-gray-400 tabular-nums" style={{ top: i * radH }}>{String(t).padStart(2, '0')}:00</div>)}
          </div>
          {perDag.map(({ dag, tidsatte }) => (
            <div key={dag.toISOString()} className={cn('relative border-l border-gray-200 dark:border-gray-800', sammeDag(dag, iDag) && 'bg-primary/5')} style={{ height: timer.length * radH }}>
              {timer.map((t, i) => <div key={t} className="absolute inset-x-0 border-t border-gray-100 dark:border-gray-800/60" style={{ top: i * radH }} />)}
              {tidsatte.map(a => {
                const fra = Math.max(TIMER_FRA, a.start.getHours() + a.start.getMinutes() / 60)
                const til = Math.min(TIMER_TIL, Math.max(fra + 0.5, a.slutt.getHours() + a.slutt.getMinutes() / 60 + (sammeDag(a.start, a.slutt) ? 0 : 24)))
                if (til <= TIMER_FRA || fra >= TIMER_TIL) return null
                return (
                  <a key={a.id} href={a.lenke ?? '#'} target="_blank" rel="noopener noreferrer" title={`${kl(a.start)}–${kl(a.slutt)} ${a.tittel}${a.sted ? ` · ${a.sted}` : ''}`}
                    className="absolute inset-x-1 rounded-md bg-blue-100 dark:bg-blue-900/40 border-l-2 border-blue-500 px-1.5 py-1 text-[11px] leading-tight overflow-hidden hover:bg-blue-200 dark:hover:bg-blue-900/60"
                    style={{ top: (fra - TIMER_FRA) * radH + 1, height: (til - fra) * radH - 2 }}>
                    <span className="block font-semibold text-blue-900 dark:text-blue-100 truncate">{a.tittel}</span>
                    <span className="block text-blue-800/80 dark:text-blue-200/80 truncate">{kl(a.start)}{a.sted ? ` · ${a.sted}` : ''}</span>
                  </a>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------- Måned ----------

function MaanedVisning({ dager, maaned, hendelser, iDag, onVelgDag }: { dager: Date[]; maaned: number; hendelser: Hendelse[]; iDag: Date; onVelgDag: (d: Date) => void }) {
  const uker: Date[][] = []
  for (let i = 0; i < dager.length; i += 7) uker.push(dager.slice(i, i + 7))
  return (
    <div className="card !p-0 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {UKEDAGER.map(d => <div key={d} className="px-2 py-1.5 text-center">{d.slice(0, 3)}</div>)}
      </div>
      {uker.map((uke, i) => (
        <div key={i} className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 last:border-0">
          {uke.map(d => {
            const dagens = hendelser.filter(h => sammeDag(h.start, d))
            const erIDag = sammeDag(d, iDag), iMnd = d.getMonth() === maaned
            return (
              <button key={d.toISOString()} type="button" onClick={() => onVelgDag(d)} className={cn('min-h-[92px] p-1.5 text-left border-l border-gray-200 dark:border-gray-800 first:border-l-0 hover:bg-gray-50 dark:hover:bg-dark-100 align-top', !iMnd && 'opacity-40', erIDag && 'bg-primary/5')}>
                <div className={cn('text-xs font-semibold mb-1', erIDag ? 'text-primary' : 'text-gray-700 dark:text-gray-300')}>{d.getDate()}</div>
                <div className="space-y-0.5">
                  {dagens.slice(0, 3).map(h => (
                    <div key={h.kind + h.id} className={cn('truncate rounded px-1 text-[11px] leading-5 border-l-2', h.kind === 'avtale' ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-500 text-blue-900 dark:text-blue-100' : h.kind === 'plan' ? 'bg-primary/10 border-primary text-gray-900 dark:text-white' : h.forfalt ? 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-900 dark:text-red-200' : 'bg-gray-100 dark:bg-dark-100 border-gray-400 text-gray-800 dark:text-gray-200')}>
                      {h.kind === 'avtale' && !h.heleDagen ? `${kl(h.start)} ` : ''}{h.tittel}
                    </div>
                  ))}
                  {dagens.length > 3 && <div className="text-[11px] text-gray-500 dark:text-gray-400 px-1">+ {dagens.length - 3} til</div>}
                </div>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function Brikke({ h, onApneAnlegg, onApneOppgave }: { h: Hendelse; onApneAnlegg: (id: string) => void; onApneOppgave: (id: string) => void }) {
  if (h.kind === 'avtale') return <a href={h.lenke ?? '#'} target="_blank" rel="noopener noreferrer" className="block truncate rounded px-1.5 text-[11px] leading-5 bg-blue-100 dark:bg-blue-900/40 border-l-2 border-blue-500 text-blue-900 dark:text-blue-100" title={h.tittel}>{h.tittel}</a>
  if (h.kind === 'plan') return <button type="button" onClick={() => onApneAnlegg(h.anleggId)} className="w-full text-left truncate rounded px-1.5 text-[11px] leading-5 bg-primary/10 border-l-2 border-primary text-gray-900 dark:text-white" title={`${h.tittel}${h.under ? ` · ${h.under}` : ''}`}><Building2 className="inline w-3 h-3 -mt-0.5 mr-1" />{h.tittel}</button>
  return <button type="button" onClick={() => onApneOppgave(h.id)} className={cn('w-full text-left truncate rounded px-1.5 text-[11px] leading-5 border-l-2', h.forfalt ? 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-900 dark:text-red-200' : 'bg-gray-100 dark:bg-dark-100 border-gray-400 text-gray-800 dark:text-gray-200')} title={`${h.tittel}${h.under ? ` · ${h.under}` : ''}`}><CheckSquare className="inline w-3 h-3 -mt-0.5 mr-1" />{h.tittel}</button>
}

