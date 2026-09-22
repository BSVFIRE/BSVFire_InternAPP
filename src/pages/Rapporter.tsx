/**
 * Rapporter (/rapporter) – startpunkt for kontroller.
 * Søk opp et anlegg og start riktig rapport, se dine anlegg for måneden med status per kontrolltype,
 * eller åpne en rapporttype uten anlegg (velges inne i rapporten).
 */
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Building2, Check, Flame, HeartPulse, Lightbulb, Search, Shield, Wind, X } from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { MAANEDER, ANLEGG_STATUSER } from '@/lib/constants'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { powersyncAktiv } from '@/lib/powersync/db'
import { hentAnleggLokalt } from '@/lib/powersync/anlegg'
import { Nodlys } from './rapporter/Nodlys'
import { Brannalarm } from './rapporter/Brannalarm'
import { Slukkeutstyr } from './rapporter/Slukkeutstyr'
import { Roykluker } from './rapporter/Roykluker'
import { Forstehjelp } from './rapporter/Forstehjelp'

type RapportType = 'oversikt' | 'nodlys' | 'brannalarm' | 'slukkeutstyr' | 'roykluker' | 'forstehjelp'

type FullfortKey = 'brannalarm_fullfort' | 'nodlys_fullfort' | 'slukkeutstyr_fullfort' | 'roykluker_fullfort' | 'forstehjelp_fullfort'
const RAPPORTER: { id: RapportType; navn: string; kontrolltype: string; fullfortKey: FullfortKey; icon: typeof Lightbulb; farge: string }[] = [
  { id: 'brannalarm', navn: 'Brannalarm', kontrolltype: 'Brannalarm', fullfortKey: 'brannalarm_fullfort', icon: Flame, farge: 'bg-red-500/10 text-red-500' },
  { id: 'nodlys', navn: 'Nødlys', kontrolltype: 'Nødlys', fullfortKey: 'nodlys_fullfort', icon: Lightbulb, farge: 'bg-yellow-500/10 text-yellow-500' },
  { id: 'slukkeutstyr', navn: 'Slukkeutstyr', kontrolltype: 'Slukkeutstyr', fullfortKey: 'slukkeutstyr_fullfort', icon: Shield, farge: 'bg-blue-500/10 text-blue-500' },
  { id: 'roykluker', navn: 'Røykluker', kontrolltype: 'Røykluker', fullfortKey: 'roykluker_fullfort', icon: Wind, farge: 'bg-gray-500/10 text-gray-500 dark:text-gray-400' },
  { id: 'forstehjelp', navn: 'Førstehjelp', kontrolltype: 'Førstehjelp', fullfortKey: 'forstehjelp_fullfort', icon: HeartPulse, farge: 'bg-green-500/10 text-green-500' },
]

type AnleggRad = Pick<Tables<'anlegg'>, 'id' | 'anleggsnavn' | 'adresse' | 'poststed' | 'kundenr' | 'kontroll_type' | 'kontroll_maaned' | 'kontroll_status' | 'ansvarlig_tekniker_id' | 'brannalarm_fullfort' | 'nodlys_fullfort' | 'slukkeutstyr_fullfort' | 'roykluker_fullfort' | 'forstehjelp_fullfort'> & { kunde: string }

export function Rapporter() {
  const location = useLocation()
  const navigate = useNavigate()
  const { ansatt: meg } = useCurrentAnsatt()
  const state = location.state as { rapportType?: string; kundeId?: string; anleggId?: string; fra?: string } | null
  const [activeRapport, setActiveRapport] = useState<RapportType>('oversikt')
  const [anlegg, setAnlegg] = useState<AnleggRad[]>([])
  const [q, setQ] = useState('')
  const [valgt, setValgt] = useState<AnleggRad | null>(null)
  const [visAlle, setVisAlle] = useState(false)

  // Hvis vi kommer fra anlegg (eller herfra) med forhåndsvalgt rapporttype
  useEffect(() => {
    setActiveRapport(state?.rapportType ? (state.rapportType as RapportType) : 'oversikt')
  }, [state])

  useEffect(() => {
    let avbrutt = false
    async function last() {
      const { data, error } = await db.from('anlegg')
        .select('id, anleggsnavn, adresse, poststed, kundenr, kontroll_type, kontroll_maaned, kontroll_status, ansvarlig_tekniker_id, brannalarm_fullfort, nodlys_fullfort, slukkeutstyr_fullfort, roykluker_fullfort, forstehjelp_fullfort, customer:kundenr(navn)')
        .or('skjult.is.null,skjult.eq.false').order('anleggsnavn')
      if (avbrutt) return
      if (!error && data) {
        setAnlegg(data.map(a => ({ ...a, kunde: (a.customer as { navn: string | null } | null)?.navn ?? 'Ukjent kunde' })))
        return
      }
      // Uten dekning: bruk det som er synkronisert til enheten
      if (!powersyncAktiv) return
      try {
        const lokale = await hentAnleggLokalt()
        if (!avbrutt) setAnlegg(lokale.filter(a => !a.skjult).map(a => ({ ...a, kunde: a.customer?.navn ?? 'Ukjent kunde' })) as unknown as AnleggRad[])
      } catch { /* ingen lokale data ennå */ }
    }
    last()
    return () => { avbrutt = true }
  }, [])

  const denneMnd = MAANEDER[new Date().getMonth()]
  const treff = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return anlegg.filter(a => [a.anleggsnavn, a.kunde, a.adresse, a.poststed].some(v => v?.toLowerCase().includes(s))).slice(0, 8)
  }, [anlegg, q])
  const mineMnd = useMemo(() => {
    const liste = anlegg.filter(a => a.kontroll_maaned === denneMnd && a.kontroll_status !== ANLEGG_STATUSER.UTFORT && a.kontroll_status !== ANLEGG_STATUSER.OPPSAGT)
    const mine = meg ? liste.filter(a => a.ansvarlig_tekniker_id === meg.id) : []
    return visAlle || mine.length === 0 ? { liste, erMine: false } : { liste: mine, erMine: true }
  }, [anlegg, denneMnd, meg, visAlle])

  function start(rapport: RapportType, a?: AnleggRad | null) {
    navigate('/rapporter', { state: a ? { rapportType: rapport, kundeId: a.kundenr, anleggId: a.id, fra: 'rapporter' } : { rapportType: rapport } })
  }

  // Tilbake-knappen i rapporten går til anlegget bare når vi faktisk kom derfra
  const fromAnlegg = !!(state?.kundeId && state?.anleggId && state?.fra !== 'rapporter')
  const tilbake = () => navigate('/rapporter', { replace: true })
  if (activeRapport === 'nodlys') return <Nodlys onBack={tilbake} fromAnlegg={fromAnlegg} />
  if (activeRapport === 'brannalarm') return <Brannalarm onBack={tilbake} fromAnlegg={fromAnlegg} />
  if (activeRapport === 'slukkeutstyr') return <Slukkeutstyr onBack={tilbake} fromAnlegg={fromAnlegg} />
  if (activeRapport === 'roykluker') return <Roykluker onBack={tilbake} fromAnlegg={fromAnlegg} />
  if (activeRapport === 'forstehjelp') return <Forstehjelp onBack={tilbake} fromAnlegg={fromAnlegg} />

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Rapporter</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Finn anlegget og start kontrollen – rapporten lages når du er ferdig.</p>
      </header>

      {/* Finn anlegg */}
      <section className="card space-y-3" aria-label="Start kontroll">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Start kontroll på et anlegg</h2>
        {valgt ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5" /></span>
              <div className="flex-1 min-w-0"><div className="font-semibold text-gray-900 dark:text-white truncate">{valgt.anleggsnavn}</div><div className="text-xs text-gray-500 dark:text-gray-400 truncate">{[valgt.kunde, [valgt.adresse, valgt.poststed].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</div></div>
              <button type="button" onClick={() => { setValgt(null); setQ('') }} aria-label="Velg et annet anlegg" className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <KontrollKnapper a={valgt} onStart={r => start(r, valgt)} />
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Søk på anlegg, kunde eller adresse…" aria-label="Søk anlegg" autoFocus className="input pl-9" />
            {treff.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 mt-1 rounded-lg bg-white dark:bg-dark-50 border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
                {treff.map(a => (
                  <li key={a.id}>
                    <button type="button" onClick={() => setValgt(a)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-100">
                      <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="flex-1 min-w-0"><span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{a.anleggsnavn}</span><span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{a.kunde}{a.poststed ? ` · ${a.poststed}` : ''}</span></span>
                      <span className="text-xs text-gray-400">{a.kontroll_type?.length ?? 0} typer</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Denne måneden */}
      <section className="space-y-3" aria-label="Denne måneden">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{mineMnd.erMine ? 'Dine anlegg' : 'Anlegg'} i {denneMnd.toLowerCase()} <span className="text-gray-400 font-normal">({mineMnd.liste.length})</span></h2>
          {meg && <button type="button" onClick={() => setVisAlle(v => !v)} className="text-sm text-primary hover:underline">{mineMnd.erMine ? 'Vis alle' : 'Vis bare mine'}</button>}
        </div>
        {mineMnd.liste.length === 0 ? <p className="card text-sm text-gray-500 dark:text-gray-400 text-center py-8">Ingenting igjen å kontrollere i {denneMnd.toLowerCase()}.</p> : (
          <div className="space-y-2">
            {mineMnd.liste.map(a => (
              <div key={a.id} className="card !p-3.5 flex flex-col md:flex-row md:items-center gap-3">
                <button type="button" onClick={() => navigate(`/anlegg/${a.id}`)} className="flex-1 min-w-0 text-left">
                  <span className="block font-semibold text-gray-900 dark:text-white truncate hover:text-primary">{a.anleggsnavn}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{[a.kunde, a.poststed, a.kontroll_status].filter(Boolean).join(' · ')}</span>
                </button>
                <KontrollKnapper a={a} onStart={r => start(r, a)} kompakt />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Rapporttyper uten anlegg */}
      <section className="space-y-3" aria-label="Rapporttyper">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Åpne rapporttype <span className="text-gray-400 font-normal text-sm">– velg anlegg inne i rapporten</span></h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {RAPPORTER.map(r => (
            <button key={r.id} type="button" onClick={() => start(r.id)} className="card !p-4 text-left hover:border-primary transition-colors flex items-center gap-3 lg:flex-col lg:items-start">
              <span className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', r.farge)}><r.icon className="w-5 h-5" /></span>
              <span className="font-semibold text-gray-900 dark:text-white">{r.navn}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

/** Én knapp per kontrolltype anlegget har; grønn hake når den er fullført i år. */
function KontrollKnapper({ a, onStart, kompakt }: { a: AnleggRad; onStart: (r: RapportType) => void; kompakt?: boolean }) {
  const typer = RAPPORTER.filter(r => a.kontroll_type?.includes(r.kontrolltype))
  if (typer.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400">Anlegget har ingen kontrolltyper registrert. <button type="button" onClick={() => onStart('nodlys')} className="text-primary hover:underline">Start likevel</button></p>
  return (
    <div className="flex flex-wrap gap-2">
      {typer.map(r => {
        const ferdig = Boolean(a[r.fullfortKey])
        return (
          <button key={r.id} type="button" onClick={() => onStart(r.id)} title={ferdig ? `${r.navn} er fullført i år – åpne likevel` : `Start ${r.navn.toLowerCase()}`}
            className={cn('inline-flex items-center gap-2 rounded-lg border text-sm font-medium transition-colors', kompakt ? 'h-9 px-3' : 'h-11 px-4', ferdig ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:border-primary hover:text-primary')}>
            {ferdig ? <Check className="w-4 h-4" strokeWidth={3} /> : <r.icon className={cn('w-4 h-4', r.farge.split(' ').filter(c => c.startsWith('text-')).join(' '))} />}
            {r.navn}
          </button>
        )
      })}
    </div>
  )
}
