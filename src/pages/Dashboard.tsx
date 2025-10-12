import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { 
  ClipboardList, 
  CheckSquare, 
  FolderKanban, 
  Building2,
  TrendingUp,
  AlertCircle,
  Users,
  User
} from 'lucide-react'

interface Stats {
  ordre: { total: number; aktive: number; fullfort: number; fakturert: number }
  oppgaver: { total: number; aktive: number; fullfort: number }
  prosjekter: { total: number; pagaar: number; planlagt: number }
  anlegg: number
}

export function Dashboard() {
  const { user } = useAuthStore()
  const [visAlle, setVisAlle] = useState(false)
  const [ansattId, setAnsattId] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({
    ordre: { total: 0, aktive: 0, fullfort: 0, fakturert: 0 },
    oppgaver: { total: 0, aktive: 0, fullfort: 0 },
    prosjekter: { total: 0, pagaar: 0, planlagt: 0 },
    anlegg: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnsattId()
  }, [user])

  useEffect(() => {
    if (ansattId !== null || visAlle) {
      loadStats()
    }
  }, [visAlle, ansattId])

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
      console.error('Feil ved henting av ansatt-ID:', error)
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
      
      const fullfort = ordreData?.filter(o => o.status === 'Fullført').length || 0
      const fakturert = ordreData?.filter(o => o.status === 'Fakturert').length || 0
      const aktive = ordreData?.filter(o => o.status !== 'Fullført' && o.status !== 'Fakturert').length || 0
      
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
        fullfort: oppgaverData?.filter(o => o.status === 'Fullført').length || 0
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

      setStats({
        ordre: ordreStats,
        oppgaver: oppgaverStats,
        prosjekter: prosjekterStats,
        anlegg: anleggCount || 0
      })
    } catch (error) {
      console.error('Feil ved lasting av statistikk:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Ordre',
      icon: ClipboardList,
      total: stats.ordre.aktive,
      fullfort: stats.ordre.fullfort,
      fakturert: stats.ordre.fakturert,
      color: 'from-blue-500 to-blue-600',
      showSubStats: true
    },
    {
      title: 'Oppgaver',
      icon: CheckSquare,
      total: stats.oppgaver.total,
      active: stats.oppgaver.aktive,
      completed: stats.oppgaver.fullfort,
      color: 'from-primary to-primary-600'
    },
    {
      title: 'Prosjekter',
      icon: FolderKanban,
      total: stats.prosjekter.total,
      active: stats.prosjekter.pagaar,
      completed: stats.prosjekter.planlagt,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Anlegg',
      icon: Building2,
      total: stats.anlegg,
      active: 0,
      completed: 0,
      color: 'from-orange-500 to-orange-600'
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Oversikt over aktiviteter og statistikk</p>
        </div>
        
        {/* Toggle for egne vs alle */}
        <div className="flex items-center gap-3 bg-dark-200 rounded-lg p-1">
          <button
            onClick={() => setVisAlle(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              !visAlle 
                ? 'bg-primary text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Mine
          </button>
          <button
            onClick={() => setVisAlle(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              visAlle 
                ? 'bg-primary text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Alle
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div key={card.title} className="card hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 bg-gradient-to-br ${card.color} rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            
            <h3 className="text-gray-400 text-sm font-medium mb-1">{card.title}</h3>
            <p className="text-3xl font-bold text-white mb-4">{card.total}</p>
            
            <div className="flex items-center gap-4 text-sm">
              {card.showSubStats ? (
                <>
                  {card.fullfort !== undefined && card.fullfort > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-400">
                        {card.fullfort} fullført
                      </span>
                    </div>
                  )}
                  {card.fakturert !== undefined && card.fakturert > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-400">
                        {card.fakturert} fakturert
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {card.active !== undefined && card.active > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-gray-400">
                        {card.active} aktive
                      </span>
                    </div>
                  )}
                  {card.completed !== undefined && card.completed > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-400">
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">Siste aktivitet</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-dark-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-200">Ny ordre opprettet</p>
                <p className="text-xs text-gray-500">For 2 timer siden</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-dark-100 rounded-lg">
              <CheckSquare className="w-5 h-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-200">Oppgave fullført</p>
                <p className="text-xs text-gray-500">I dag kl. 14:30</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">Kommende oppgaver</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-dark-100 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-200">Brannalarmkontroll</p>
                <p className="text-xs text-gray-500">Forfaller i morgen</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-dark-100 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-200">Servicerapport</p>
                <p className="text-xs text-gray-500">Forfaller om 3 dager</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
