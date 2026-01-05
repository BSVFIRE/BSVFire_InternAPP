import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { useAuthStore } from '@/store/authStore'

const log = createLogger('Dashboard')
import { 
  ClipboardList, 
  CheckSquare, 
  FolderKanban, 
  Building2,
  AlertCircle,
  Users,
  User,
  Calendar,
  Inbox,
  Check,
  Building
} from 'lucide-react'
import { ORDRE_STATUSER, OPPGAVE_STATUSER } from '@/lib/constants'

interface Stats {
  ordre: { total: number; aktive: number; fullfort: number; fakturert: number }
  oppgaver: { total: number; aktive: number; fullfort: number }
  prosjekter: { total: number; pagaar: number; planlagt: number }
  anlegg: number
  kunder: number
  nyeKunderSisteManed: number
  nyeAnleggSisteManed: number
}

interface Melding {
  id: string
  anlegg_id: string
  intern_kommentar: string
  created_at: string
  lest: boolean
  anleggsnavn: string | null
  kunde_navn: string | null
}

interface Aktivitet {
  id: string
  type: 'ordre' | 'oppgave'
  tittel: string
  beskrivelse: string
  tidspunkt: string
  status: string
  ikon: 'ny' | 'fullfort' | 'endret'
}

interface KommendeOppgave {
  id: string
  tittel: string
  forfallsdato: string
  prioritet: 'hoy' | 'medium' | 'lav'
  dagerIgjen: number
}

interface KommendeOrdre {
  id: string
  ordrenummer: string
  anleggsnavn: string | null
  kundenavn: string | null
  status: string
  opprettet: string
  dagerSiden: number
}

type TidsFilter = 'dag' | 'uke' | 'maned' | 'ar'

export function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [visAlle, setVisAlle] = useState(false)
  const [ansattId, setAnsattId] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({
    ordre: { total: 0, aktive: 0, fullfort: 0, fakturert: 0 },
    oppgaver: { total: 0, aktive: 0, fullfort: 0 },
    prosjekter: { total: 0, pagaar: 0, planlagt: 0 },
    anlegg: 0,
    kunder: 0,
    nyeKunderSisteManed: 0,
    nyeAnleggSisteManed: 0
  })
  const [loading, setLoading] = useState(true)
  const [tidsFilter, setTidsFilter] = useState<TidsFilter>('uke')
  const [aktiviteter, setAktiviteter] = useState<Aktivitet[]>([])
  const [kommendeOppgaver, setKommendeOppgaver] = useState<KommendeOppgave[]>([])
  const [kommendeOrdre, setKommendeOrdre] = useState<KommendeOrdre[]>([])
  const [meldinger, setMeldinger] = useState<Melding[]>([])

  useEffect(() => {
    loadAnsattId()
  }, [user])

  async function loadAnsattId() {
    if (!user?.email) {
      setAnsattId(null)
      return
    }
    
    try {
      const { data } = await supabase
        .from('ansatte')
        .select('id')
        .eq('epost', user.email)
        .single()
      
      setAnsattId(data?.id || null)
    } catch (error) {
      log.error('Feil ved henting av ansatt-ID', { error })
      setAnsattId(null)
    }
  }

  async function loadStats() {
    try {
      // Hent ordre statistikk
      let ordreQuery = supabase.from('ordre').select('status, tekniker_id')
      if (!visAlle && ansattId) {
        ordreQuery = ordreQuery.eq('tekniker_id', ansattId)
      }
      const { data: ordreData } = await ordreQuery
      
      const fullfort = ordreData?.filter(o => o.status === ORDRE_STATUSER.FULLFORT).length || 0
      const fakturert = ordreData?.filter(o => o.status === ORDRE_STATUSER.FAKTURERT).length || 0
      const aktive = ordreData?.filter(o => o.status !== ORDRE_STATUSER.FULLFORT && o.status !== ORDRE_STATUSER.FAKTURERT).length || 0
      
      const ordreStats = {
        total: ordreData?.length || 0,
        aktive: aktive,
        fullfort: fullfort,
        fakturert: fakturert
      }

      // Hent oppgaver statistikk
      let oppgaverQuery = supabase.from('oppgaver').select('status, tekniker_id')
      if (!visAlle && ansattId) {
        oppgaverQuery = oppgaverQuery.eq('tekniker_id', ansattId)
      }
      const { data: oppgaverData } = await oppgaverQuery
      
      const oppgaverStats = {
        total: oppgaverData?.length || 0,
        aktive: oppgaverData?.filter(o => o.status === 'Aktiv' || o.status === 'Pågår').length || 0,
        fullfort: oppgaverData?.filter(o => o.status === OPPGAVE_STATUSER.FULLFORT).length || 0
      }

      // Hent prosjekter statistikk
      let prosjekterQuery = supabase.from('prosjekter').select('status, prosjektleder_id')
      if (!visAlle && ansattId) {
        prosjekterQuery = prosjekterQuery.eq('prosjektleder_id', ansattId)
      }
      const { data: prosjekterData } = await prosjekterQuery
      
      const prosjekterStats = {
        total: prosjekterData?.length || 0,
        pagaar: prosjekterData?.filter(p => p.status === 'Pågår').length || 0,
        planlagt: prosjekterData?.filter(p => p.status === 'Planlagt').length || 0
      }

      // Hent anlegg count
      const { count: anleggCount } = await supabase
        .from('anlegg')
        .select('*', { count: 'exact', head: true })

      // Hent kunder count
      const { count: kunderCount } = await supabase
        .from('customer')
        .select('*', { count: 'exact', head: true })
        .or('skjult.is.null,skjult.eq.false')

      // Hent nye kunder siste måned
      const enMndSiden = new Date()
      enMndSiden.setMonth(enMndSiden.getMonth() - 1)
      const { count: nyeKunder } = await supabase
        .from('customer')
        .select('*', { count: 'exact', head: true })
        .gte('opprettet', enMndSiden.toISOString())
        .or('skjult.is.null,skjult.eq.false')

      // Hent nye anlegg siste måned
      const { count: nyeAnlegg } = await supabase
        .from('anlegg')
        .select('*', { count: 'exact', head: true })
        .gte('opprettet_dato', enMndSiden.toISOString())

      setStats({
        ordre: ordreStats,
        oppgaver: oppgaverStats,
        prosjekter: prosjekterStats,
        anlegg: anleggCount || 0,
        kunder: kunderCount || 0,
        nyeKunderSisteManed: nyeKunder || 0,
        nyeAnleggSisteManed: nyeAnlegg || 0
      })
    } catch (error) {
      log.error('Feil ved lasting av statistikk', { error })
    } finally {
      setLoading(false)
    }
  }

  async function loadMeldinger() {
    if (!ansattId) return
    
    try {
      const { data, error } = await supabase
        .from('intern_kommentar')
        .select(`
          id,
          anlegg_id,
          intern_kommentar,
          created_at,
          lest,
          anlegg:anlegg_id (
            anleggsnavn,
            customer:kundenr (
              navn
            )
          )
        `)
        .eq('mottaker_id', ansattId)
        .eq('lest', false)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        if (error.code === '42703') {
          log.info('Meldingssystem-kolonner finnes ikke ennå')
          return
        }
        throw error
      }

      const transformedData: Melding[] = (data || []).map((m: any) => ({
        id: m.id,
        anlegg_id: m.anlegg_id,
        intern_kommentar: m.intern_kommentar,
        created_at: m.created_at,
        lest: m.lest,
        anleggsnavn: m.anlegg?.anleggsnavn || null,
        kunde_navn: m.anlegg?.customer?.navn || null
      }))

      setMeldinger(transformedData)
    } catch (error) {
      log.error('Feil ved lasting av meldinger', { error })
    }
  }

  async function markerSomLest(meldingId: string) {
    try {
      const { error } = await supabase
        .from('intern_kommentar')
        .update({ lest: true, lest_dato: new Date().toISOString() })
        .eq('id', meldingId)

      if (error) throw error
      
      setMeldinger(meldinger.filter(m => m.id !== meldingId))
    } catch (error) {
      log.error('Feil ved markering som lest', { error })
    }
  }

  const getTidsFilterDato = useCallback((): string => {
    const now = new Date()
    switch (tidsFilter) {
      case 'dag':
        now.setDate(now.getDate() - 1)
        break
      case 'uke':
        now.setDate(now.getDate() - 7)
        break
      case 'maned':
        now.setMonth(now.getMonth() - 1)
        break
      case 'ar':
        now.setFullYear(now.getFullYear() - 1)
        break
    }
    return now.toISOString()
  }, [tidsFilter])

  function formaterTidSiden(dato: string): string {
    const now = new Date()
    const then = new Date(dato)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `For ${diffMins} ${diffMins === 1 ? 'minutt' : 'minutter'} siden`
    if (diffHours < 24) return `For ${diffHours} ${diffHours === 1 ? 'time' : 'timer'} siden`
    if (diffDays === 0) return 'I dag'
    if (diffDays === 1) return 'I går'
    return `For ${diffDays} dager siden`
  }

  const loadAktiviteter = useCallback(async () => {
    try {
      const filterDato = getTidsFilterDato()
      const aktivitetsListe: Aktivitet[] = []

      // Hent ordre
      let ordreQuery = supabase
        .from('ordre')
        .select('id, ordre_nummer, status, sist_oppdatert, opprettet_dato')
        .gte('sist_oppdatert', filterDato)
        .order('sist_oppdatert', { ascending: false })
        .limit(10)

      if (!visAlle && ansattId) {
        ordreQuery = ordreQuery.eq('tekniker_id', ansattId)
      }

      const { data: ordreData } = await ordreQuery

      ordreData?.forEach(ordre => {
        const erNy = new Date(ordre.opprettet_dato).getTime() === new Date(ordre.sist_oppdatert).getTime()
        aktivitetsListe.push({
          id: ordre.id,
          type: 'ordre',
          tittel: erNy ? 'Ny ordre opprettet' : 'Ordre oppdatert',
          beskrivelse: `Ordre #${ordre.ordre_nummer}`,
          tidspunkt: ordre.sist_oppdatert,
          status: ordre.status,
          ikon: erNy ? 'ny' : ordre.status === ORDRE_STATUSER.FULLFORT ? 'fullfort' : 'endret'
        })
      })

      // Hent oppgaver
      let oppgaverQuery = supabase
        .from('oppgaver')
        .select('id, tittel, status, sist_oppdatert, opprettet_dato')
        .gte('sist_oppdatert', filterDato)
        .order('sist_oppdatert', { ascending: false })
        .limit(10)

      if (!visAlle && ansattId) {
        oppgaverQuery = oppgaverQuery.eq('tekniker_id', ansattId)
      }

      const { data: oppgaverData } = await oppgaverQuery

      oppgaverData?.forEach(oppgave => {
        const erNy = new Date(oppgave.opprettet_dato).getTime() === new Date(oppgave.sist_oppdatert).getTime()
        aktivitetsListe.push({
          id: oppgave.id,
          type: 'oppgave',
          tittel: erNy ? 'Ny oppgave opprettet' : 'Oppgave oppdatert',
          beskrivelse: oppgave.tittel,
          tidspunkt: oppgave.sist_oppdatert,
          status: oppgave.status,
          ikon: erNy ? 'ny' : oppgave.status === OPPGAVE_STATUSER.FULLFORT ? 'fullfort' : 'endret'
        })
      })

      // Sorter etter tidspunkt
      aktivitetsListe.sort((a, b) => new Date(b.tidspunkt).getTime() - new Date(a.tidspunkt).getTime())
      
      setAktiviteter(aktivitetsListe.slice(0, 5))
    } catch (error) {
      log.error('Feil ved lasting av aktiviteter', { error })
    }
  }, [visAlle, ansattId, getTidsFilterDato])

  const loadKommendeOppgaver = useCallback(async () => {
    try {
      const now = new Date()
      const tredveDagerFrem = new Date()
      tredveDagerFrem.setDate(now.getDate() + 30)

      let query = supabase
        .from('oppgaver')
        .select('id, tittel, forfallsdato')
        .gte('forfallsdato', now.toISOString())
        .lte('forfallsdato', tredveDagerFrem.toISOString())
        .neq('status', OPPGAVE_STATUSER.FULLFORT)
        .order('forfallsdato', { ascending: true })
        .limit(5)

      if (!visAlle && ansattId) {
        query = query.eq('tekniker_id', ansattId)
      }

      const { data } = await query

      const oppgaver: KommendeOppgave[] = data?.map(oppgave => {
        const forfallDato = new Date(oppgave.forfallsdato)
        const dagerIgjen = Math.ceil((forfallDato.getTime() - now.getTime()) / 86400000)
        
        let prioritet: 'hoy' | 'medium' | 'lav' = 'lav'
        if (dagerIgjen <= 1) prioritet = 'hoy'
        else if (dagerIgjen <= 3) prioritet = 'medium'

        return {
          id: oppgave.id,
          tittel: oppgave.tittel,
          forfallsdato: oppgave.forfallsdato,
          prioritet,
          dagerIgjen
        }
      }) || []

      setKommendeOppgaver(oppgaver)
    } catch (error) {
      log.error('Feil ved lasting av kommende oppgaver', { error })
    }
  }, [visAlle, ansattId])

  const loadKommendeOrdre = useCallback(async () => {
    try {
      let query = supabase
        .from('ordre')
        .select(`
          id,
          ordre_nummer,
          status,
          opprettet_dato,
          anlegg:anlegg_id(anleggsnavn),
          customer:kundenr(navn)
        `)
        .neq('status', ORDRE_STATUSER.FULLFORT)
        .neq('status', ORDRE_STATUSER.FAKTURERT)
        .order('opprettet_dato', { ascending: false })
        .limit(5)

      if (!visAlle && ansattId) {
        query = query.eq('tekniker_id', ansattId)
      }

      const { data, error } = await query
      
      if (error) {
        log.error('Feil ved lasting av kommende ordre', { error })
        throw error
      }
      
      console.log('✅ Kommende ordre lastet:', data?.length || 0, 'ordre')

      const ordre: KommendeOrdre[] = data?.map((ordre: any) => {
        const opprettetDato = new Date(ordre.opprettet_dato)
        const now = new Date()
        const dagerSiden = Math.floor((now.getTime() - opprettetDato.getTime()) / 86400000)

        return {
          id: ordre.id,
          ordrenummer: ordre.ordre_nummer,
          anleggsnavn: ordre.anlegg?.anleggsnavn || null,
          kundenavn: ordre.customer?.navn || null,
          status: ordre.status,
          opprettet: ordre.opprettet_dato,
          dagerSiden
        }
      }) || []

      setKommendeOrdre(ordre)
    } catch (error) {
      log.error('Feil ved lasting av kommende ordre (catch)', { error })
    }
  }, [visAlle, ansattId])

  useEffect(() => {
    if (ansattId !== null || visAlle) {
      loadStats()
      loadAktiviteter()
      loadKommendeOppgaver()
      loadKommendeOrdre()
      loadMeldinger()
    }
  }, [visAlle, ansattId, loadAktiviteter, loadKommendeOppgaver, loadKommendeOrdre])

  const statCards = [
    {
      title: 'Kunder',
      icon: Building,
      total: stats.kunder,
      subText: stats.nyeKunderSisteManed > 0 ? `+${stats.nyeKunderSisteManed} siste mnd` : null,
      color: 'from-emerald-500 to-emerald-600',
      href: '/kunder'
    },
    {
      title: 'Anlegg',
      icon: Building2,
      total: stats.anlegg,
      subText: stats.nyeAnleggSisteManed > 0 ? `+${stats.nyeAnleggSisteManed} siste mnd` : null,
      color: 'from-orange-500 to-orange-600',
      href: '/anlegg'
    },
    {
      title: 'Aktive ordre',
      icon: ClipboardList,
      total: stats.ordre.aktive,
      fullfort: stats.ordre.fullfort,
      fakturert: stats.ordre.fakturert,
      color: 'from-blue-500 to-blue-600',
      showSubStats: true,
      href: '/ordre'
    },
    {
      title: 'Oppgaver',
      icon: CheckSquare,
      total: stats.oppgaver.total,
      active: stats.oppgaver.aktive,
      completed: stats.oppgaver.fullfort,
      color: 'from-primary to-primary-600',
      href: '/oppgaver'
    },
    {
      title: 'Prosjekter',
      icon: FolderKanban,
      total: stats.prosjekter.total,
      active: stats.prosjekter.pagaar,
      completed: stats.prosjekter.planlagt,
      color: 'from-purple-500 to-purple-600',
      href: '/prosjekter'
    },
    {
      title: 'Meldinger',
      icon: Inbox,
      total: meldinger.length,
      subText: meldinger.length > 0 ? 'uleste' : 'Ingen uleste',
      color: 'from-red-500 to-red-600',
      href: '/meldinger'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-400 dark:text-gray-400">Oversikt over aktiviteter og statistikk</p>
        </div>
        
        {/* Toggle for egne vs alle */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-200 rounded-lg p-1">
          <button
            onClick={() => setVisAlle(false)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-md transition-all min-h-[44px] text-sm ${
              !visAlle 
                ? 'bg-primary text-gray-900 dark:text-white shadow-lg' 
                : 'text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Mine</span>
          </button>
          <button
            onClick={() => setVisAlle(true)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-md transition-all min-h-[44px] text-sm ${
              visAlle 
                ? 'bg-primary text-gray-900 dark:text-white shadow-lg' 
                : 'text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Alle</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {statCards.map((card) => (
          <div 
            key={card.title} 
            onClick={() => card.href && navigate(card.href)}
            className="card hover:shadow-xl transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2 sm:mb-4">
              <div className={`p-2 sm:p-3 bg-gradient-to-br ${card.color} rounded-lg flex-shrink-0`}>
                <card.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              {card.subText && (
                <span className="text-xs text-green-500 font-medium">{card.subText}</span>
              )}
            </div>
            
            <h3 className="text-gray-400 dark:text-gray-400 text-xs sm:text-sm font-medium mb-1 truncate">{card.title}</h3>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">{card.total}</p>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm">
              {card.showSubStats ? (
                <>
                  {card.fullfort !== undefined && card.fullfort > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-400 dark:text-gray-400 truncate">
                        {card.fullfort} fullført
                      </span>
                    </div>
                  )}
                  {card.fakturert !== undefined && card.fakturert > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-400 dark:text-gray-400 truncate">
                        {card.fakturert} fakturert
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {card.active !== undefined && card.active > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                      <span className="text-gray-400 dark:text-gray-400 truncate">
                        {card.active} aktive
                      </span>
                    </div>
                  )}
                  {card.completed !== undefined && card.completed > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-400 dark:text-gray-400 truncate">
                        {card.completed} fullført
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Meldinger */}
      {meldinger.length > 0 && (
        <div className="card border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Inbox className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Uleste meldinger</h2>
                <p className="text-xs text-gray-500">{meldinger.length} ulest{meldinger.length > 1 ? 'e' : ''}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/meldinger')}
              className="text-sm text-primary hover:underline"
            >
              Se alle
            </button>
          </div>
          <div className="space-y-2">
            {meldinger.map((melding) => (
              <div
                key={melding.id}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 cursor-pointer transition-colors"
                onClick={() => navigate('/anlegg', { state: { viewAnleggId: melding.anlegg_id } })}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {melding.anleggsnavn || 'Ukjent anlegg'}
                  </p>
                  {melding.kunde_navn && (
                    <p className="text-xs text-gray-500 truncate">{melding.kunde_navn}</p>
                  )}
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {melding.intern_kommentar}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    markerSomLest(melding.id)
                  }}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0"
                  title="Marker som lest"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ordre og Oppgaver */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Kommende ordre</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {kommendeOrdre.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                Ingen aktive ordre
              </div>
            ) : (
              kommendeOrdre.map((ordre) => {
                const statusFarge = ordre.status === 'Ikke påbegynt' ? 'bg-yellow-500' : 
                                   ordre.status === 'Pågår' ? 'bg-blue-500' : 
                                   'bg-gray-500'
                
                const tidTekst = ordre.dagerSiden === 0 ? 'Opprettet i dag' :
                                ordre.dagerSiden === 1 ? 'Opprettet i går' :
                                `Opprettet for ${ordre.dagerSiden} dager siden`
                
                return (
                  <div 
                    key={ordre.id} 
                    onClick={() => navigate('/ordre', { state: { selectedOrdreId: ordre.id } })}
                    className="flex items-center gap-2 sm:gap-3 p-3 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 cursor-pointer transition-colors touch-target"
                  >
                    <div className={`w-2 h-2 ${statusFarge} rounded-full flex-shrink-0`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-200 font-medium">Ordre #{ordre.ordrenummer}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {ordre.kundenavn || ordre.anleggsnavn || 'Ingen kunde/anlegg'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{tidTekst}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Kommende oppgaver</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
          {kommendeOppgaver.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-400 dark:text-gray-500">
              Ingen kommende oppgaver
            </div>
          ) : (
            kommendeOppgaver.map((oppgave) => {
              const prikkeFarge = oppgave.prioritet === 'hoy' ? 'bg-red-500' : 
                                 oppgave.prioritet === 'medium' ? 'bg-yellow-500' : 
                                 'bg-green-500'
              
              const forfallTekst = oppgave.dagerIgjen === 0 ? 'Forfaller i dag' :
                                  oppgave.dagerIgjen === 1 ? 'Forfaller i morgen' :
                                  `Forfaller om ${oppgave.dagerIgjen} dager`
              
              return (
                <div 
                  key={oppgave.id} 
                  onClick={() => navigate('/oppgaver', { state: { selectedOppgaveId: oppgave.id } })}
                  className="flex items-center gap-2 sm:gap-3 p-3 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 cursor-pointer transition-colors touch-target"
                >
                  <div className={`w-2 h-2 ${prikkeFarge} rounded-full flex-shrink-0`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-200 truncate">{oppgave.tittel}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{forfallTekst}</p>
                  </div>
                </div>
              )
            })
          )}
          </div>
        </div>
      </div>

      {/* Siste aktivitet - full bredde */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white">Siste aktivitet</h2>
          
          {/* Tidsfilter */}
          <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 dark:bg-dark-200 rounded-lg p-1 flex-shrink-0 overflow-x-auto">
            <button
              onClick={() => setTidsFilter('dag')}
              className={`px-3 py-2 text-xs rounded-md transition-all whitespace-nowrap min-h-[36px] ${
                tidsFilter === 'dag' 
                  ? 'bg-primary text-gray-900 dark:text-white' 
                  : 'text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Dag
            </button>
            <button
              onClick={() => setTidsFilter('uke')}
              className={`px-3 py-2 text-xs rounded-md transition-all whitespace-nowrap min-h-[36px] ${
                tidsFilter === 'uke' 
                  ? 'bg-primary text-gray-900 dark:text-white' 
                  : 'text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Uke
            </button>
            <button
              onClick={() => setTidsFilter('maned')}
              className={`px-3 py-2 text-xs rounded-md transition-all whitespace-nowrap min-h-[36px] ${
                tidsFilter === 'maned' 
                  ? 'bg-primary text-gray-900 dark:text-white' 
                  : 'text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Måned
            </button>
            <button
              onClick={() => setTidsFilter('ar')}
              className={`px-3 py-2 text-xs rounded-md transition-all whitespace-nowrap min-h-[36px] ${
                tidsFilter === 'ar' 
                  ? 'bg-primary text-gray-900 dark:text-white' 
                  : 'text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              År
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {aktiviteter.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-400 dark:text-gray-500">
              Ingen aktiviteter i valgt periode
            </div>
          ) : (
            aktiviteter.map((aktivitet) => {
              const Ikon = aktivitet.ikon === 'fullfort' ? CheckSquare : 
                          aktivitet.ikon === 'ny' ? AlertCircle : 
                          Calendar
              const ikonFarge = aktivitet.ikon === 'fullfort' ? 'text-green-500' : 
                               aktivitet.ikon === 'ny' ? 'text-yellow-500' : 
                               'text-blue-500'
              
              return (
                <div 
                  key={aktivitet.id} 
                  onClick={() => {
                    if (aktivitet.type === 'ordre') {
                      navigate('/ordre', { state: { selectedOrdreId: aktivitet.id } })
                    } else {
                      navigate('/oppgaver', { state: { selectedOppgaveId: aktivitet.id } })
                    }
                  }}
                  className="flex items-center gap-2 sm:gap-3 p-3 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 cursor-pointer transition-colors touch-target"
                >
                  <Ikon className={`w-4 h-4 sm:w-5 sm:h-5 ${ikonFarge} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-200 truncate">{aktivitet.tittel}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{aktivitet.beskrivelse}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formaterTidSiden(aktivitet.tidspunkt)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
