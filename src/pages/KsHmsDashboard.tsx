import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  XCircle, 
  GraduationCap, 
  CheckSquare,
  Plus,
  Clock,
  RefreshCw
} from 'lucide-react'

const log = createLogger('KsHmsDashboard')

interface KsHmsStats {
  risikovurderinger: { total: number; ferdig: number; underArbeid: number; utkast: number; hoyRisiko: number }
  hendelser: { total: number; lukket: number; underUtredning: number; aapen: number; kritiske: number }
  avvik: { total: number; lukket: number; underBehandling: number; aapen: number; kritiske: number }
  opplaering: { total: number; fullfort: number; pagaende: number; planlagt: number }
  tiltak: { total: number; fullfort: number; aktive: number; forsinkede: number; kritiske: number }
}

interface RecentItem {
  id: string
  type: 'risikovurdering' | 'hendelse' | 'avvik' | 'opplaering' | 'tiltak'
  tittel: string
  status: string
  dato: string
  alvorlighetsgrad?: string
}

export function KsHmsDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<KsHmsStats>({
    risikovurderinger: { total: 0, ferdig: 0, underArbeid: 0, utkast: 0, hoyRisiko: 0 },
    hendelser: { total: 0, lukket: 0, underUtredning: 0, aapen: 0, kritiske: 0 },
    avvik: { total: 0, lukket: 0, underBehandling: 0, aapen: 0, kritiske: 0 },
    opplaering: { total: 0, fullfort: 0, pagaende: 0, planlagt: 0 },
    tiltak: { total: 0, fullfort: 0, aktive: 0, forsinkede: 0, kritiske: 0 }
  })
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    loadRecentItems()
  }, [])

  async function loadStats() {
    try {
      setLoading(true)

      // Hent risikovurderinger statistikk
      const { data: risikoData } = await supabase
        .from('risikovurderinger')
        .select('status, risikoniva')
      
      const risikoStats = {
        total: risikoData?.length || 0,
        ferdig: risikoData?.filter(r => r.status === 'Ferdig').length || 0,
        underArbeid: risikoData?.filter(r => r.status === 'Under arbeid').length || 0,
        utkast: risikoData?.filter(r => r.status === 'Utkast').length || 0,
        hoyRisiko: risikoData?.filter(r => r.risikoniva === 'HØY').length || 0
      }

      // Hent hendelser statistikk
      const { data: hendelserData } = await supabase
        .from('hendelser')
        .select('status, alvorlighetsgrad')
      
      const hendelserStats = {
        total: hendelserData?.length || 0,
        lukket: hendelserData?.filter(h => h.status === 'Lukket').length || 0,
        underUtredning: hendelserData?.filter(h => h.status === 'Under utredning').length || 0,
        aapen: hendelserData?.filter(h => h.status === 'Åpen').length || 0,
        kritiske: hendelserData?.filter(h => h.alvorlighetsgrad === 'Kritisk' || h.alvorlighetsgrad === 'Høy').length || 0
      }

      // Hent avvik statistikk
      const { data: avvikData } = await supabase
        .from('avvik')
        .select('status, alvorlighetsgrad')
      
      const avvikStats = {
        total: avvikData?.length || 0,
        lukket: avvikData?.filter(a => a.status === 'Lukket').length || 0,
        underBehandling: avvikData?.filter(a => a.status === 'Under behandling').length || 0,
        aapen: avvikData?.filter(a => a.status === 'Åpen').length || 0,
        kritiske: avvikData?.filter(a => a.alvorlighetsgrad === 'Kritisk' || a.alvorlighetsgrad === 'Høy').length || 0
      }

      // Hent opplæring statistikk
      const { data: opplaeringData } = await supabase
        .from('opplaering')
        .select('status')
      
      const opplaeringStats = {
        total: opplaeringData?.length || 0,
        fullfort: opplaeringData?.filter(o => o.status === 'Fullført').length || 0,
        pagaende: opplaeringData?.filter(o => o.status === 'Pågående').length || 0,
        planlagt: opplaeringData?.filter(o => o.status === 'Planlagt').length || 0
      }

      // Hent tiltak statistikk
      const { data: tiltakData } = await supabase
        .from('ks_tiltak')
        .select('status, prioritet')
      
      const tiltakStats = {
        total: tiltakData?.length || 0,
        fullfort: tiltakData?.filter(t => t.status === 'Fullført').length || 0,
        aktive: tiltakData?.filter(t => t.status === 'Pågående' || t.status === 'Planlagt').length || 0,
        forsinkede: tiltakData?.filter(t => t.status === 'Forsinket').length || 0,
        kritiske: tiltakData?.filter(t => t.prioritet === 'Kritisk' || t.prioritet === 'Høy').length || 0
      }

      setStats({
        risikovurderinger: risikoStats,
        hendelser: hendelserStats,
        avvik: avvikStats,
        opplaering: opplaeringStats,
        tiltak: tiltakStats
      })
    } catch (error) {
      log.error('Feil ved henting av KS/HMS statistikk', { error })
    } finally {
      setLoading(false)
    }
  }

  async function loadRecentItems() {
    try {
      const items: RecentItem[] = []

      // Hent siste risikovurderinger
      const { data: risikoData } = await supabase
        .from('risikovurderinger')
        .select('id, tittel, status, dato, risikoniva')
        .order('created_at', { ascending: false })
        .limit(3)
      
      risikoData?.forEach(r => items.push({
        id: r.id,
        type: 'risikovurdering',
        tittel: r.tittel,
        status: r.status,
        dato: r.dato,
        alvorlighetsgrad: r.risikoniva
      }))

      // Hent siste hendelser
      const { data: hendelserData } = await supabase
        .from('hendelser')
        .select('id, tittel, status, dato, alvorlighetsgrad')
        .order('created_at', { ascending: false })
        .limit(3)
      
      hendelserData?.forEach(h => items.push({
        id: h.id,
        type: 'hendelse',
        tittel: h.tittel,
        status: h.status,
        dato: h.dato,
        alvorlighetsgrad: h.alvorlighetsgrad
      }))

      // Hent siste avvik
      const { data: avvikData } = await supabase
        .from('avvik')
        .select('id, tittel, status, dato, alvorlighetsgrad')
        .order('created_at', { ascending: false })
        .limit(3)
      
      avvikData?.forEach(a => items.push({
        id: a.id,
        type: 'avvik',
        tittel: a.tittel,
        status: a.status,
        dato: a.dato,
        alvorlighetsgrad: a.alvorlighetsgrad
      }))

      // Sorter etter dato
      items.sort((a, b) => new Date(b.dato).getTime() - new Date(a.dato).getTime())
      setRecentItems(items.slice(0, 10))
    } catch (error) {
      log.error('Feil ved henting av siste aktiviteter', { error })
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'risikovurdering': return <AlertTriangle className="w-4 h-4 text-blue-400" />
      case 'hendelse': return <AlertCircle className="w-4 h-4 text-red-400" />
      case 'avvik': return <XCircle className="w-4 h-4 text-orange-400" />
      case 'opplaering': return <GraduationCap className="w-4 h-4 text-green-400" />
      case 'tiltak': return <CheckSquare className="w-4 h-4 text-purple-400" />
      default: return <ShieldCheck className="w-4 h-4 text-gray-400" />
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'Ferdig':
      case 'Lukket':
      case 'Fullført':
        return 'bg-green-500/20 text-green-400'
      case 'Under arbeid':
      case 'Under utredning':
      case 'Under behandling':
      case 'Pågående':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'Åpen':
      case 'Planlagt':
      case 'Utkast':
        return 'bg-blue-500/20 text-blue-400'
      case 'Forsinket':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  function getAlvorlighetColor(alvorlighet?: string) {
    switch (alvorlighet) {
      case 'Kritisk':
      case 'HØY':
        return 'text-red-400'
      case 'Høy':
      case 'MIDDELS':
        return 'text-orange-400'
      case 'Middels':
        return 'text-yellow-400'
      case 'Lav':
      case 'LAV':
        return 'text-green-400'
      default:
        return 'text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">KS/HMS System</h1>
            <p className="text-white/80">Kvalitetssikring, Helse, Miljø og Sikkerhet</p>
          </div>
        </div>
      </div>

      {/* Statistikk-kort */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Risikovurderinger */}
        <div 
          onClick={() => navigate('/ks-hms/risikovurderinger')}
          className="bg-dark-lighter rounded-xl p-5 cursor-pointer hover:bg-dark-light transition-colors border border-dark-border"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-blue-400" />
            </div>
            {stats.risikovurderinger.hoyRisiko > 0 && (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                {stats.risikovurderinger.hoyRisiko} høy risiko
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.risikovurderinger.total}</div>
          <div className="text-sm text-gray-400">Risikovurderinger</div>
          <div className="mt-3 flex gap-2 text-xs">
            <span className="text-green-400">{stats.risikovurderinger.ferdig} ferdig</span>
            <span className="text-gray-500">•</span>
            <span className="text-yellow-400">{stats.risikovurderinger.underArbeid} pågår</span>
          </div>
        </div>

        {/* Hendelser */}
        <div 
          onClick={() => navigate('/ks-hms/hendelser')}
          className="bg-dark-lighter rounded-xl p-5 cursor-pointer hover:bg-dark-light transition-colors border border-dark-border"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            {stats.hendelser.aapen > 0 && (
              <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                {stats.hendelser.aapen} åpne
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.hendelser.total}</div>
          <div className="text-sm text-gray-400">Hendelser</div>
          <div className="mt-3 flex gap-2 text-xs">
            <span className="text-green-400">{stats.hendelser.lukket} lukket</span>
            <span className="text-gray-500">•</span>
            <span className="text-yellow-400">{stats.hendelser.underUtredning} utredes</span>
          </div>
        </div>

        {/* Avvik */}
        <div 
          onClick={() => navigate('/ks-hms/avvik')}
          className="bg-dark-lighter rounded-xl p-5 cursor-pointer hover:bg-dark-light transition-colors border border-dark-border"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <XCircle className="w-6 h-6 text-orange-400" />
            </div>
            {stats.avvik.aapen > 0 && (
              <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                {stats.avvik.aapen} åpne
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.avvik.total}</div>
          <div className="text-sm text-gray-400">Avvik</div>
          <div className="mt-3 flex gap-2 text-xs">
            <span className="text-green-400">{stats.avvik.lukket} lukket</span>
            <span className="text-gray-500">•</span>
            <span className="text-yellow-400">{stats.avvik.underBehandling} behandles</span>
          </div>
        </div>

        {/* Opplæring */}
        <div 
          onClick={() => navigate('/ks-hms/opplaering')}
          className="bg-dark-lighter rounded-xl p-5 cursor-pointer hover:bg-dark-light transition-colors border border-dark-border"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <GraduationCap className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.opplaering.total}</div>
          <div className="text-sm text-gray-400">Opplæringer</div>
          <div className="mt-3 flex gap-2 text-xs">
            <span className="text-green-400">{stats.opplaering.fullfort} fullført</span>
            <span className="text-gray-500">•</span>
            <span className="text-blue-400">{stats.opplaering.planlagt} planlagt</span>
          </div>
        </div>

        {/* Tiltak */}
        <div 
          onClick={() => navigate('/ks-hms/tiltak')}
          className="bg-dark-lighter rounded-xl p-5 cursor-pointer hover:bg-dark-light transition-colors border border-dark-border"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <CheckSquare className="w-6 h-6 text-purple-400" />
            </div>
            {stats.tiltak.forsinkede > 0 && (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                {stats.tiltak.forsinkede} forsinket
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.tiltak.total}</div>
          <div className="text-sm text-gray-400">Tiltak</div>
          <div className="mt-3 flex gap-2 text-xs">
            <span className="text-green-400">{stats.tiltak.fullfort} fullført</span>
            <span className="text-gray-500">•</span>
            <span className="text-yellow-400">{stats.tiltak.aktive} aktive</span>
          </div>
        </div>
      </div>

      {/* Hurtighandlinger og siste aktivitet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hurtighandlinger */}
        <div className="bg-dark-lighter rounded-xl p-6 border border-dark-border">
          <h2 className="text-lg font-semibold text-white mb-4">Hurtighandlinger</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/ks-hms/risikovurderinger?ny=true')}
              className="flex items-center gap-3 p-4 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors text-left"
            >
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Plus className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-white">Ny Risikovurdering</div>
                <div className="text-xs text-gray-400">Opprett risikoanalyse</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/ks-hms/hendelser?ny=true')}
              className="flex items-center gap-3 p-4 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors text-left"
            >
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Plus className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="font-medium text-white">Rapporter Hendelse</div>
                <div className="text-xs text-gray-400">Ulykke eller nestenulykke</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/ks-hms/avvik?ny=true')}
              className="flex items-center gap-3 p-4 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg transition-colors text-left"
            >
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Plus className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="font-medium text-white">Meld Avvik</div>
                <div className="text-xs text-gray-400">Avvik fra prosedyrer</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/ks-hms/opplaering?ny=true')}
              className="flex items-center gap-3 p-4 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors text-left"
            >
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Plus className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="font-medium text-white">Registrer Opplæring</div>
                <div className="text-xs text-gray-400">Kurs eller sertifisering</div>
              </div>
            </button>
          </div>
        </div>

        {/* Siste aktivitet */}
        <div className="bg-dark-lighter rounded-xl p-6 border border-dark-border">
          <h2 className="text-lg font-semibold text-white mb-4">Siste aktivitet</h2>
          {recentItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Ingen aktiviteter ennå</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center gap-3 p-3 bg-dark rounded-lg hover:bg-dark-light transition-colors cursor-pointer"
                >
                  {getTypeIcon(item.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{item.tittel}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(item.dato).toLocaleDateString('nb-NO')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.alvorlighetsgrad && (
                      <span className={`text-xs ${getAlvorlighetColor(item.alvorlighetsgrad)}`}>
                        {item.alvorlighetsgrad}
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Varsler - Kritiske elementer */}
      {(stats.avvik.kritiske > 0 || stats.hendelser.kritiske > 0 || stats.tiltak.forsinkede > 0) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Krever oppmerksomhet
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.avvik.kritiske > 0 && (
              <div className="flex items-center gap-3 p-3 bg-dark rounded-lg">
                <XCircle className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-white font-medium">{stats.avvik.kritiske} kritiske avvik</div>
                  <div className="text-xs text-gray-400">Krever umiddelbar handling</div>
                </div>
              </div>
            )}
            {stats.hendelser.kritiske > 0 && (
              <div className="flex items-center gap-3 p-3 bg-dark rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-white font-medium">{stats.hendelser.kritiske} alvorlige hendelser</div>
                  <div className="text-xs text-gray-400">Under utredning</div>
                </div>
              </div>
            )}
            {stats.tiltak.forsinkede > 0 && (
              <div className="flex items-center gap-3 p-3 bg-dark rounded-lg">
                <Clock className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-white font-medium">{stats.tiltak.forsinkede} forsinkede tiltak</div>
                  <div className="text-xs text-gray-400">Frist overskredet</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
