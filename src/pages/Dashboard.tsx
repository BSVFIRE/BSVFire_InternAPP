/**
 * Dashboard – «hva skjer i dag, hva har jeg glemt, hva brenner».
 *
 * Handlingstall (månedens kontroller, avvik, mine oppgaver, meldinger), «Neste opp»
 * (ukesplan + oppgaver gruppert på dag), «Ikke planlagt ennå» (månedens anlegg uten
 * ordre/ukesplan), «Trenger oppmerksomhet» (avvik, etterslep) og siste aktivitet.
 * Totaltallene ligger som én linje nederst.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Building2, Calendar, CheckSquare, ClipboardList, Clock, MessageSquare, Plus } from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn, formatDate, isoUke, isoUkeAar, ukeDatoer, UKEDAGER } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { ANLEGG_STATUSER, MAANEDER, OPPGAVE_STATUSER, ORDRE_STATUSER } from '@/lib/constants'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { Button } from '@/components/ui/Button'

const log = createLogger('Dashboard')

type AnleggKort = Pick<Tables<'anlegg'>, 'id' | 'anleggsnavn' | 'poststed' | 'kontroll_status' | 'kontroll_maaned' | 'kontroll_type' | 'ansvarlig_tekniker_id' | 'skjult'> & { customer: { navn: string | null } | null }
type Oppgave = Pick<Tables<'oppgaver'>, 'id' | 'tittel' | 'type' | 'status' | 'forfallsdato' | 'tekniker_id' | 'anlegg_id' | 'sist_oppdatert'> & { anlegg: { anleggsnavn: string | null } | null; tekniker: { navn: string | null } | null }
type Ordre = Pick<Tables<'ordre'>, 'id' | 'ordre_nummer' | 'type' | 'status' | 'tekniker_id' | 'anlegg_id' | 'sist_oppdatert' | 'opprettet_dato'> & { anlegg: { anleggsnavn: string | null } | null; tekniker: { navn: string | null } | null }
type PlanDag = { id: string; dag: number; estimert_oppstart: string | null; anlegg_id: string; ukesplan: { id: string; aar: number; uke_nummer: number; kunde_id: string; ukesplan_teknikere: { ansatt_id: string }[] } | null; anlegg: { anleggsnavn: string | null; poststed: string | null } | null }
type Melding = Pick<Tables<'intern_kommentar'>, 'id' | 'intern_kommentar' | 'created_at' | 'anlegg_id'>

type NesteRad =
  | { kind: 'plan'; dato: Date; id: string; anleggId: string; tittel: string; under: string }
  | { kind: 'oppgave'; dato: Date | null; id: string; oppgave: Oppgave }

const PILL: Record<string, string> = {
  [ORDRE_STATUSER.NY]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  [ORDRE_STATUSER.VENTENDE]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  [ORDRE_STATUSER.PAGAENDE]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  [OPPGAVE_STATUSER.IKKE_PABEGYNT]: 'bg-gray-100 text-gray-700 dark:bg-dark-100 dark:text-gray-400',
}

function hilsen(navn: string | null | undefined) {
  const t = new Date().getHours()
  const h = t < 10 ? 'God morgen' : t < 17 ? 'Hei' : 'God kveld'
  return navn ? `${h}, ${navn.split(' ')[0]}` : h
}
function sammeDag(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
function startAvDag(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

export function Dashboard() {
  const navigate = useNavigate()
  const { ansatt } = useCurrentAnsatt()
  const [mine, setMine] = useState(() => { try { return localStorage.getItem('dashboard_mine') !== 'alle' } catch { return true } })
  const [anlegg, setAnlegg] = useState<AnleggKort[]>([])
  const [oppgaver, setOppgaver] = useState<Oppgave[]>([])
  const [ordre, setOrdre] = useState<Ordre[]>([])
  const [planDager, setPlanDager] = useState<PlanDag[]>([])
  const [meldinger, setMeldinger] = useState<Melding[]>([])
  const [avvik, setAvvik] = useState<Map<string, number>>(new Map())
  const [anleggMedOrdreIAar, setAnleggMedOrdreIAar] = useState<Set<string>>(new Set())
  const [antallKunder, setAntallKunder] = useState(0)
  const [kunderUtenNr, setKunderUtenNr] = useState(0)
  const [antallProsjekter, setAntallProsjekter] = useState(0)
  const [loading, setLoading] = useState(true)

  const iDag = useMemo(() => startAvDag(new Date()), [])
  const aar = iDag.getFullYear()
  const mndNavn = MAANEDER[iDag.getMonth()]
  const forrigeMndNavn = MAANEDER[(iDag.getMonth() + 11) % 12]
  const ukeAar = isoUkeAar(iDag), uke = isoUke(iDag)
  const nesteUkeDato = new Date(iDag); nesteUkeDato.setDate(iDag.getDate() + 7)
  const nesteUke = isoUke(nesteUkeDato), nesteUkeAar = isoUkeAar(nesteUkeDato)

  const last = useCallback(async () => {
    try {
      const aarStart = `${aar}-01-01`
      const [a, o, ord, p, m, av, ordreIAar, k, kUten, pr] = await Promise.all([
        db.from('anlegg').select('id, anleggsnavn, poststed, kontroll_status, kontroll_maaned, kontroll_type, ansvarlig_tekniker_id, skjult, customer:kundenr(navn)').or('skjult.is.null,skjult.eq.false'),
        db.from('oppgaver').select('id, tittel, type, status, forfallsdato, tekniker_id, anlegg_id, sist_oppdatert, anlegg:anlegg_id(anleggsnavn), tekniker:tekniker_id(navn)').neq('status', OPPGAVE_STATUSER.FULLFORT).order('forfallsdato', { ascending: true, nullsFirst: false }).limit(200),
        db.from('ordre').select('id, ordre_nummer, type, status, tekniker_id, anlegg_id, sist_oppdatert, opprettet_dato, anlegg:anlegg_id(anleggsnavn), tekniker:tekniker_id(navn)').not('status', 'in', `("${ORDRE_STATUSER.FULLFORT}","${ORDRE_STATUSER.FAKTURERT}")`).order('sist_oppdatert', { ascending: false }).limit(100),
        db.from('ukesplan_dager').select('id, dag, estimert_oppstart, anlegg_id, ukesplan:ukesplan_id!inner(id, aar, uke_nummer, kunde_id, ukesplan_teknikere(ansatt_id)), anlegg:anlegg_id(anleggsnavn, poststed)')
          .or(`and(aar.eq.${ukeAar},uke_nummer.eq.${uke}),and(aar.eq.${nesteUkeAar},uke_nummer.eq.${nesteUke})`, { referencedTable: 'ukesplan' }),
        ansatt ? db.from('intern_kommentar').select('id, intern_kommentar, created_at, anlegg_id').eq('mottaker_id', ansatt.id).eq('lest', false).order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [] as Melding[], error: null }),
        db.rpc('avvik_per_anlegg'),
        db.from('ordre').select('anlegg_id').gte('opprettet_dato', aarStart),
        db.from('customer').select('id', { count: 'exact', head: true }).or('skjult.is.null,skjult.eq.false'),
        db.from('customer').select('id', { count: 'exact', head: true }).or('skjult.is.null,skjult.eq.false').is('kunde_nummer', null),
        db.from('prosjekter').select('id', { count: 'exact', head: true }).neq('status', 'Fullført'),
      ])
      setAnlegg((a.data ?? []) as AnleggKort[])
      setOppgaver((o.data ?? []) as Oppgave[])
      setOrdre((ord.data ?? []) as Ordre[])
      setPlanDager(((p.data ?? []) as unknown as PlanDag[]).filter(d => d.ukesplan))
      setMeldinger(m.data ?? [])
      setAvvik(new Map((av.data ?? []).map(r => [r.anlegg_id, Number(r.antall)])))
      setAnleggMedOrdreIAar(new Set((ordreIAar.data ?? []).map(r => r.anlegg_id).filter((x): x is string => Boolean(x))))
      setAntallKunder(k.count ?? 0); setKunderUtenNr(kUten.count ?? 0); setAntallProsjekter(pr.count ?? 0)
    } catch (err) {
      log.error('Kunne ikke laste dashboard', { error: err })
    } finally {
      setLoading(false)
    }
  }, [aar, ukeAar, uke, nesteUkeAar, nesteUke, ansatt])
  useEffect(() => { last() }, [last])

  function velgOmfang(v: boolean) { setMine(v); try { localStorage.setItem('dashboard_mine', v ? 'mine' : 'alle') } catch { /* ignorer */ } }

  // ---- Utvalg («Mine» = tildelt meg / ansvarlig = meg) ----
  const mineAnlegg = useMemo(() => mine && ansatt ? anlegg.filter(a => a.ansvarlig_tekniker_id === ansatt.id) : anlegg, [anlegg, mine, ansatt])
  const mineOppgaver = useMemo(() => mine && ansatt ? oppgaver.filter(o => o.tekniker_id === ansatt.id) : oppgaver, [oppgaver, mine, ansatt])
  const mineOrdre = useMemo(() => mine && ansatt ? ordre.filter(o => o.tekniker_id === ansatt.id) : ordre, [ordre, mine, ansatt])
  const minePlanDager = useMemo(() => mine && ansatt ? planDager.filter(d => d.ukesplan?.ukesplan_teknikere.some(t => t.ansatt_id === ansatt.id)) : planDager, [planDager, mine, ansatt])

  // ---- Handlingstall ----
  const mndAnlegg = mineAnlegg.filter(a => a.kontroll_maaned === mndNavn)
  const mndUtfort = mndAnlegg.filter(a => a.kontroll_status === ANLEGG_STATUSER.UTFORT).length
  const avvikSum = mineAnlegg.reduce((s, a) => s + (avvik.get(a.id) ?? 0), 0)
  const avvikAnlegg = mineAnlegg.filter(a => (avvik.get(a.id) ?? 0) > 0).length
  const forfalt = mineOppgaver.filter(o => o.forfallsdato && startAvDag(new Date(o.forfallsdato)) < iDag).length
  const denneUke = mineOppgaver.filter(o => { if (!o.forfallsdato) return false; const d = startAvDag(new Date(o.forfallsdato)); return d >= iDag && d <= nesteUkeDato }).length
  const virkedagerIgjen = useMemo(() => { let n = 0; const d = new Date(iDag); const sisteDag = new Date(aar, iDag.getMonth() + 1, 0); while (d <= sisteDag) { if (d.getDay() !== 0 && d.getDay() !== 6) n++; d.setDate(d.getDate() + 1) } return n }, [iDag, aar])

  // ---- Neste opp ----
  const nesteOpp = useMemo<NesteRad[]>(() => {
    const rader: NesteRad[] = []
    for (const d of minePlanDager) {
      if (!d.ukesplan) continue
      const dato = ukeDatoer(d.ukesplan.aar, d.ukesplan.uke_nummer)[d.dag - 1]
      if (!dato || startAvDag(dato) < iDag) continue
      rader.push({ kind: 'plan', dato, id: d.id, anleggId: d.anlegg_id, tittel: d.anlegg?.anleggsnavn ?? 'Anlegg', under: [`Ukesplan uke ${d.ukesplan.uke_nummer}`, d.estimert_oppstart ? `kl. ${d.estimert_oppstart.slice(0, 5)}` : null, d.anlegg?.poststed].filter(Boolean).join(' · ') })
    }
    const grense = new Date(iDag); grense.setDate(iDag.getDate() + 14)
    for (const o of mineOppgaver) {
      const dato = o.forfallsdato ? startAvDag(new Date(o.forfallsdato)) : null
      if (dato && dato > grense) continue
      if (!dato) continue
      rader.push({ kind: 'oppgave', dato, id: o.id, oppgave: o })
    }
    return rader.sort((x, y) => (x.dato?.getTime() ?? Infinity) - (y.dato?.getTime() ?? Infinity)).slice(0, 12)
  }, [minePlanDager, mineOppgaver, iDag])

  // ---- Ikke planlagt ennå: månedens anlegg uten ordre i år og uten ukesplan denne/neste uke ----
  const planlagteAnleggIder = useMemo(() => new Set(planDager.map(d => d.anlegg_id)), [planDager])
  const ikkePlanlagt = useMemo(() => mineAnlegg.filter(a => a.kontroll_maaned === mndNavn && a.kontroll_status !== ANLEGG_STATUSER.UTFORT && a.kontroll_status !== ANLEGG_STATUSER.OPPSAGT && !anleggMedOrdreIAar.has(a.id) && !planlagteAnleggIder.has(a.id)), [mineAnlegg, mndNavn, anleggMedOrdreIAar, planlagteAnleggIder])

  // ---- Trenger oppmerksomhet ----
  const verstAvvik = useMemo(() => mineAnlegg.filter(a => (avvik.get(a.id) ?? 0) > 0).sort((x, y) => (avvik.get(y.id) ?? 0) - (avvik.get(x.id) ?? 0)).slice(0, 4), [mineAnlegg, avvik])
  const etterslep = useMemo(() => mineAnlegg.filter(a => a.kontroll_maaned === forrigeMndNavn && (a.kontroll_status === ANLEGG_STATUSER.IKKE_UTFORT || !a.kontroll_status)).length, [mineAnlegg, forrigeMndNavn])

  // ---- Siste aktivitet (ordre + oppgaver etter sist_oppdatert) ----
  const aktivitet = useMemo(() => {
    const liste = [
      ...ordre.map(o => ({ id: `o${o.id}`, tid: o.sist_oppdatert ?? o.opprettet_dato ?? '', hvem: o.tekniker?.navn?.split(' ')[0] ?? 'Ukjent', hva: `${o.status === ORDRE_STATUSER.NY ? 'opprettet' : 'oppdaterte'} ordre ${o.ordre_nummer}`, hvor: o.anlegg?.anleggsnavn ?? '', til: () => navigate('/ordre', { state: { selectedOrdreId: o.id } }) })),
      ...oppgaver.map(o => ({ id: `t${o.id}`, tid: o.sist_oppdatert ?? '', hvem: o.tekniker?.navn?.split(' ')[0] ?? 'Ukjent', hva: `oppgave: ${o.tittel ?? o.type}`, hvor: o.anlegg?.anleggsnavn ?? '', til: () => navigate('/oppgaver', { state: { selectedOppgaveId: o.id } }) })),
    ].filter(x => x.tid)
    return liste.sort((x, y) => y.tid.localeCompare(x.tid)).slice(0, 6)
  }, [ordre, oppgaver, navigate])

  async function fullforOppgave(o: Oppgave) {
    const { error } = await db.from('oppgaver').update({ status: OPPGAVE_STATUSER.FULLFORT, sist_oppdatert: new Date().toISOString() }).eq('id', o.id)
    if (error) { toast.error('Kunne ikke fullføre oppgave', error); return }
    toast.success(`«${o.tittel ?? o.type}» fullført`)
    setOppgaver(prev => prev.filter(x => x.id !== o.id))
  }

  const datoTekst = iDag.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{hilsen(ansatt?.navn)}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{datoTekst.charAt(0).toUpperCase() + datoTekst.slice(1)} · uke {uke}</p>
        </div>
        <div className="inline-flex bg-gray-100 dark:bg-dark-100 rounded-lg p-0.5" role="group" aria-label="Omfang">
          {[true, false].map(v => (
            <button key={String(v)} type="button" onClick={() => velgOmfang(v)} aria-pressed={mine === v}
              className={cn('px-3.5 h-8 rounded-md text-sm font-medium transition-colors', mine === v ? 'bg-white dark:bg-dark-50 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400')}>
              {v ? 'Mine' : 'Alle'}
            </button>
          ))}
        </div>
      </header>

      {/* Handlingstall */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi tittel={mndNavn} ikon={<Calendar className="w-3.5 h-3.5" />} tone="p" onClick={() => navigate(`/anlegg?f=denne_mnd${mine ? '&mine=1' : ''}`)}>
          <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">{mndUtfort} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">av {mndAnlegg.length} kontroller</span></div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-dark-100 overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${mndAnlegg.length ? Math.round(mndUtfort / mndAnlegg.length * 100) : 0}%` }} /></div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{mndAnlegg.length - mndUtfort} igjen · {virkedagerIgjen} virkedager</div>
        </Kpi>
        <Kpi tittel="Åpne avvik" ikon={<AlertTriangle className="w-3.5 h-3.5" />} tone={avvikSum > 0 ? 'r' : 'g'} onClick={() => navigate(`/anlegg?f=avvik${mine ? '&mine=1' : ''}`)}>
          <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">{avvikSum} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">på {avvikAnlegg} anlegg</span></div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{avvikSum === 0 ? 'Ingen registrerte avvik' : 'Fra siste kontroll per type'}</div>
        </Kpi>
        <Kpi tittel={mine ? 'Mine oppgaver' : 'Åpne oppgaver'} ikon={<CheckSquare className="w-3.5 h-3.5" />} tone={forfalt > 0 ? 'r' : 'b'} onClick={() => navigate('/oppgaver')}>
          <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">{mineOppgaver.length} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">åpne</span></div>
          <div className={cn('text-xs', forfalt > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-500 dark:text-gray-400')}>{forfalt > 0 ? `${forfalt} forfalt · ` : ''}{denneUke} forfaller neste 7 dager</div>
        </Kpi>
        <Kpi tittel="Meldinger" ikon={<MessageSquare className="w-3.5 h-3.5" />} tone={meldinger.length > 0 ? 'y' : 'p'} onClick={() => navigate('/meldinger')}>
          <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">{meldinger.length} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">uleste</span></div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{meldinger[0] ? `«${meldinger[0].intern_kommentar?.slice(0, 40) ?? ''}…»` : 'Ingen uleste'}</div>
        </Kpi>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div> : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5 items-start">
          {/* Venstre */}
          <div className="space-y-4">
            <Boks tittel="Neste opp" lenke={{ til: '/kontrollplan', tekst: 'Kontrollplan' }}>
              {nesteOpp.length === 0 ? <Tom>Ingenting planlagt de neste to ukene{mine ? ' for deg' : ''}.</Tom> : (() => {
                let forrige = ''
                return nesteOpp.map(r => {
                  const key = r.dato ? (sammeDag(r.dato, iDag) ? 'I dag' : r.dato < iDag ? 'Forfalt' : `${UKEDAGER[(r.dato.getDay() + 6) % 7]} ${formatDate(r.dato)}`) : 'Uten dato'
                  const visHeader = key !== forrige; forrige = key
                  return (
                    <div key={r.id}>
                      {visHeader && <div className={cn('px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide bg-gray-50 dark:bg-dark-100', key === 'Forfalt' ? 'text-red-600 dark:text-red-400' : key === 'I dag' ? 'text-primary' : 'text-gray-500 dark:text-gray-400')}>{key}</div>}
                      {r.kind === 'plan' ? (
                        <button type="button" onClick={() => navigate(`/anlegg/${r.anleggId}`)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-dark-100 border-b border-gray-100 dark:border-gray-800/60">
                          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4" /></span>
                          <span className="flex-1 min-w-0"><span className="block font-semibold text-gray-900 dark:text-white truncate">{r.tittel}</span><span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{r.under}</span></span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800/60">
                          <input type="checkbox" checked={false} onChange={() => fullforOppgave(r.oppgave)} aria-label={`Fullfør ${r.oppgave.tittel ?? ''}`} className="w-4.5 h-4.5 w-[18px] h-[18px] rounded text-primary focus:ring-primary flex-shrink-0" />
                          <button type="button" onClick={() => navigate('/oppgaver', { state: { selectedOppgaveId: r.oppgave.id } })} className="flex-1 min-w-0 text-left">
                            <span className="block font-semibold text-gray-900 dark:text-white truncate">{r.oppgave.tittel ?? r.oppgave.type}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">Oppgave{r.oppgave.anlegg?.anleggsnavn ? ` · ${r.oppgave.anlegg.anleggsnavn}` : ''}{!mine && r.oppgave.tekniker?.navn ? ` · ${r.oppgave.tekniker.navn}` : ''}</span>
                          </button>
                          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', r.dato && r.dato < iDag ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : PILL[r.oppgave.status ?? ''] ?? 'bg-gray-100 text-gray-700 dark:bg-dark-100 dark:text-gray-400')}>{r.dato && r.dato < iDag ? 'Forfalt' : r.oppgave.status}</span>
                        </div>
                      )}
                    </div>
                  )
                })
              })()}
            </Boks>

            {mineOrdre.length > 0 && (
              <Boks tittel={`Aktive ordre · ${mineOrdre.length}`} lenke={{ til: '/ordre', tekst: 'Alle ordre' }}>
                {mineOrdre.slice(0, 6).map(o => (
                  <button key={o.id} type="button" onClick={() => navigate('/ordre', { state: { selectedOrdreId: o.id } })} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-dark-100 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                    <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0"><ClipboardList className="w-4 h-4" /></span>
                    <span className="flex-1 min-w-0"><span className="block font-semibold text-gray-900 dark:text-white truncate">{o.anlegg?.anleggsnavn ?? 'Uten anlegg'}</span><span className="block text-xs text-gray-500 dark:text-gray-400 truncate">Ordre {o.ordre_nummer} · {o.type}{!mine && o.tekniker?.navn ? ` · ${o.tekniker.navn}` : ''}</span></span>
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', PILL[o.status ?? ''] ?? 'bg-gray-100 text-gray-700 dark:bg-dark-100 dark:text-gray-400')}>{o.status}</span>
                  </button>
                ))}
              </Boks>
            )}

            <Boks tittel={`Ikke planlagt ennå · ${mndNavn.toLowerCase()}`} lenke={{ til: `/anlegg?f=denne_mnd${mine ? '&mine=1' : ''}`, tekst: `Vis alle ${mndAnlegg.length}` }}>
              {ikkePlanlagt.length === 0 ? <Tom>Alle månedens kontroller har ordre eller ukesplan.</Tom> : ikkePlanlagt.slice(0, 6).map(a => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                  <span className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4" /></span>
                  <button type="button" onClick={() => navigate(`/anlegg/${a.id}`)} className="flex-1 min-w-0 text-left">
                    <span className="block font-semibold text-gray-900 dark:text-white truncate">{a.anleggsnavn}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{[a.kontroll_type?.join(', '), a.customer?.navn, a.poststed].filter(Boolean).join(' · ')}</span>
                  </button>
                  <Button variant="outline" icon={<Plus />} onClick={() => navigate('/ordre', { state: { anleggId: a.id } })} className="!h-8 text-xs">Ordre</Button>
                </div>
              ))}
              {ikkePlanlagt.length > 6 && <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">+ {ikkePlanlagt.length - 6} til</div>}
            </Boks>
          </div>

          {/* Høyre */}
          <div className="space-y-4">
            <Boks tittel="Trenger oppmerksomhet" lenke={{ til: `/anlegg?f=avvik${mine ? '&mine=1' : ''}`, tekst: 'Avvik' }}>
              {verstAvvik.length === 0 && etterslep === 0 && kunderUtenNr === 0 && <Tom>Ingenting som haster.</Tom>}
              {verstAvvik.map(a => (
                <button key={a.id} type="button" onClick={() => navigate(`/anlegg/${a.id}?tab=avvik`)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-dark-100 border-b border-gray-100 dark:border-gray-800/60">
                  <span className="w-7 h-7 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-3.5 h-3.5" /></span>
                  <span className="flex-1 min-w-0"><span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">{a.anleggsnavn}</span><span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{a.customer?.navn ?? ''}</span></span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums whitespace-nowrap">{avvik.get(a.id)} avvik</span>
                </button>
              ))}
              {etterslep > 0 && (
                <button type="button" onClick={() => navigate(`/anlegg?f=ikke_utfort&mnd=${forrigeMndNavn}${mine ? '&mine=1' : ''}`)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-dark-100 border-b border-gray-100 dark:border-gray-800/60">
                  <span className="w-7 h-7 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 flex items-center justify-center flex-shrink-0"><Clock className="w-3.5 h-3.5" /></span>
                  <span className="flex-1 min-w-0"><span className="block text-sm font-semibold text-gray-900 dark:text-white">Etterslep fra {forrigeMndNavn.toLowerCase()}</span><span className="block text-xs text-gray-500 dark:text-gray-400">{etterslep} anlegg ikke utført</span></span>
                  <span className="text-sm text-primary">Vis</span>
                </button>
              )}
              {!mine && kunderUtenNr > 0 && (
                <button type="button" onClick={() => navigate('/kunder?f=uten_kundenr')} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-dark-100 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                  <span className="w-7 h-7 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 flex items-center justify-center flex-shrink-0"><Building2 className="w-3.5 h-3.5" /></span>
                  <span className="flex-1 min-w-0"><span className="block text-sm font-semibold text-gray-900 dark:text-white">{kunderUtenNr} kunder mangler kundenummer</span><span className="block text-xs text-gray-500 dark:text-gray-400">Dropbox-mapper opprettes ikke</span></span>
                  <span className="text-sm text-primary">Vis</span>
                </button>
              )}
            </Boks>

            {meldinger.length > 0 && (
              <Boks tittel="Uleste meldinger" lenke={{ til: '/meldinger', tekst: 'Alle' }}>
                {meldinger.map(m => (
                  <button key={m.id} type="button" onClick={() => m.anlegg_id ? navigate(`/anlegg/${m.anlegg_id}`) : navigate('/meldinger')} className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-dark-100 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                    <span className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5"><MessageSquare className="w-3.5 h-3.5" /></span>
                    <span className="flex-1 min-w-0"><span className="block text-sm text-gray-900 dark:text-white line-clamp-2">{m.intern_kommentar}</span><span className="block text-xs text-gray-500 dark:text-gray-400">{formatDate(m.created_at)}</span></span>
                  </button>
                ))}
              </Boks>
            )}

            <Boks tittel="Siste aktivitet" lenke={{ til: '/ordre', tekst: 'Ordre' }}>
              {aktivitet.length === 0 ? <Tom>Ingen aktivitet ennå.</Tom> : aktivitet.map(x => (
                <button key={x.id} type="button" onClick={x.til} className="w-full flex items-baseline gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-dark-100 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                  <span className="min-w-0 flex-1 truncate"><b className="font-semibold text-gray-900 dark:text-white">{x.hvem}</b> <span className="text-gray-700 dark:text-gray-300">{x.hva}</span>{x.hvor && <span className="text-gray-500 dark:text-gray-400"> · {x.hvor}</span>}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{relativ(x.tid)}</span>
                </button>
              ))}
            </Boks>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 dark:text-gray-400 px-0.5">
        <Link to="/anlegg" className="hover:text-primary"><b className="text-gray-900 dark:text-white tabular-nums">{anlegg.length}</b> anlegg</Link>
        <Link to="/kunder" className="hover:text-primary"><b className="text-gray-900 dark:text-white tabular-nums">{antallKunder}</b> kunder</Link>
        <Link to="/ordre" className="hover:text-primary"><b className="text-gray-900 dark:text-white tabular-nums">{ordre.length}</b> aktive ordre</Link>
        <Link to="/prosjekter" className="hover:text-primary"><b className="text-gray-900 dark:text-white tabular-nums">{antallProsjekter}</b> prosjekter</Link>
      </div>
    </div>
  )
}

function relativ(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const t = Math.floor(diff / 3_600_000)
  if (t < 1) return 'nå'
  if (t < 24) return `${t} t`
  const d = Math.floor(t / 24)
  if (d === 1) return 'i går'
  if (d < 7) return `${d} d`
  return formatDate(iso)
}

function Kpi({ tittel, ikon, tone, onClick, children }: { tittel: string; ikon: React.ReactNode; tone: 'p' | 'r' | 'g' | 'y' | 'b'; onClick: () => void; children: React.ReactNode }) {
  const t = { p: 'bg-primary/10 text-primary', r: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', g: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', y: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', b: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' }[tone]
  return (
    <button type="button" onClick={onClick} className="card !p-4 flex flex-col gap-2 text-left hover:border-primary/60 transition-colors">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{tittel}<span className={cn('w-6 h-6 rounded-md flex items-center justify-center', t)}>{ikon}</span></div>
      {children}
    </button>
  )
}

function Boks({ tittel, lenke, children }: { tittel: string; lenke?: { til: string; tekst: string }; children: React.ReactNode }) {
  return (
    <section className="card !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{tittel}</h2>
        {lenke && <Link to={lenke.til} className="text-xs text-primary hover:underline">{lenke.tekst} →</Link>}
      </div>
      {children}
    </section>
  )
}

function Tom({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">{children}</p>
}
