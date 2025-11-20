import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { Calendar, ChevronLeft, ChevronRight, CheckCircle, Clock, XCircle, Building2, Search, Eye, Ban } from 'lucide-react'
import { MAANEDER, KONTROLLTYPER, ANLEGG_STATUSER } from '@/lib/constants'
import { useNavigate, useLocation } from 'react-router-dom'

const log = createLogger('Kontrollplan')

interface Anlegg {
  id: string
  kundenr: string
  anleggsnavn: string
  adresse: string | null
  poststed: string | null
  kontroll_maaned: string | null
  kontroll_status: string | null
  kontroll_type: string[] | null
  brannalarm_fullfort: boolean | null
  nodlys_fullfort: boolean | null
  roykluker_fullfort: boolean | null
  slukkeutstyr_fullfort: boolean | null
  ekstern_fullfort: boolean | null
}

interface Kunde {
  id: string
  navn: string
}

interface KontrollStats {
  total: number
  utfort: number
  planlagt: number
  ikkeUtfort: number
  utsatt: number
}

export function Kontrollplan() {
  const navigate = useNavigate()
  const location = useLocation()
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth())
  const [selectedKontrolltype, setSelectedKontrolltype] = useState<string>('Alle')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  // Gjenopprett state hvis vi kommer tilbake fra Anlegg
  useEffect(() => {
    const state = location.state as any
    if (state?.fromAnlegg && state?.kontrollplanState) {
      const { selectedMonth: savedMonth, selectedKontrolltype: savedType, searchTerm: savedSearch, scrollPosition } = state.kontrollplanState
      setSelectedMonth(savedMonth)
      setSelectedKontrolltype(savedType)
      setSearchTerm(savedSearch)
      
      // Gjenopprett scroll-posisjon etter at komponenten har rendret
      setTimeout(() => {
        window.scrollTo(0, scrollPosition || 0)
      }, 100)
      
      // Rens state for å unngå at det trigges på nytt
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  function getCurrentMonth(): string {
    const now = new Date()
    return MAANEDER[now.getMonth()]
  }

  async function loadData() {
    try {
      setLoading(true)
      
      const [anleggResponse, kunderResponse] = await Promise.all([
        supabase.from('anlegg').select('*').order('anleggsnavn', { ascending: true }),
        supabase.from('customer').select('id, navn')
      ])

      if (anleggResponse.error) throw anleggResponse.error
      if (kunderResponse.error) throw kunderResponse.error

      setAnlegg(anleggResponse.data || [])
      setKunder(kunderResponse.data || [])
    } catch (err) {
      log.error('Feil ved lasting av data', { error: err })
    } finally {
      setLoading(false)
    }
  }

  function getKundeNavn(kundenr: string): string {
    const kunde = kunder.find(k => k.id === kundenr)
    return kunde?.navn || 'Ukjent kunde'
  }

  function changeMonth(direction: 'prev' | 'next') {
    const currentIndex = MAANEDER.indexOf(selectedMonth as any)
    if (direction === 'prev') {
      setSelectedMonth(MAANEDER[currentIndex === 0 ? 11 : currentIndex - 1])
    } else {
      setSelectedMonth(MAANEDER[currentIndex === 11 ? 0 : currentIndex + 1])
    }
  }

  function getAnleggKontrollStatus(anlegg: Anlegg): 'utfort' | 'planlagt' | 'ikke_utfort' | 'utsatt' | 'oppsagt' {
    // Bruk den faktiske statusen fra anlegget
    const status = anlegg.kontroll_status

    if (status === ANLEGG_STATUSER.UTFORT) {
      return 'utfort'
    }

    if (status === ANLEGG_STATUSER.PLANLAGT) {
      return 'planlagt'
    }

    if (status === ANLEGG_STATUSER.UTSATT) {
      return 'utsatt'
    }

    if (status === ANLEGG_STATUSER.OPPSAGT) {
      return 'oppsagt'
    }

    // Standard til "ikke utført"
    return 'ikke_utfort'
  }

  // Filtrer anlegg basert på valgt måned og kontrolltype
  const filteredAnlegg = anlegg.filter(a => {
    // Filtrer på måned
    if (a.kontroll_maaned !== selectedMonth) return false

    // Filtrer på kontrolltype
    if (selectedKontrolltype !== 'Alle') {
      if (!a.kontroll_type?.includes(selectedKontrolltype)) return false
    }

    // Filtrer på søketerm
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        a.anleggsnavn.toLowerCase().includes(searchLower) ||
        a.adresse?.toLowerCase().includes(searchLower) ||
        a.poststed?.toLowerCase().includes(searchLower) ||
        getKundeNavn(a.kundenr).toLowerCase().includes(searchLower)
      )
    }

    return true
  })

  // Grupper anlegg etter status
  const groupedAnlegg = {
    utfort: filteredAnlegg.filter(a => getAnleggKontrollStatus(a) === 'utfort'),
    planlagt: filteredAnlegg.filter(a => getAnleggKontrollStatus(a) === 'planlagt'),
    ikkeUtfort: filteredAnlegg.filter(a => getAnleggKontrollStatus(a) === 'ikke_utfort'),
    utsatt: filteredAnlegg.filter(a => getAnleggKontrollStatus(a) === 'utsatt'),
    oppsagt: filteredAnlegg.filter(a => getAnleggKontrollStatus(a) === 'oppsagt'),
  }

  // Beregn statistikk
  const stats: KontrollStats = {
    total: filteredAnlegg.length,
    utfort: groupedAnlegg.utfort.length,
    planlagt: groupedAnlegg.planlagt.length,
    ikkeUtfort: groupedAnlegg.ikkeUtfort.length,
    utsatt: groupedAnlegg.utsatt.length,
  }

  function handleViewAnlegg(anleggId: string) {
    navigate('/anlegg', { 
      state: { 
        viewAnleggId: anleggId,
        returnTo: 'kontrollplan',
        kontrollplanState: {
          selectedMonth,
          selectedKontrolltype,
          searchTerm,
          scrollPosition: window.scrollY
        }
      } 
    })
  }

  async function handleStatusChange(anleggId: string, newStatus: string) {
    try {
      // Optimistisk UI-oppdatering
      setAnlegg(prevAnlegg => 
        prevAnlegg.map(a => 
          a.id === anleggId ? { ...a, kontroll_status: newStatus } : a
        )
      )

      // Oppdater database
      const { error } = await supabase
        .from('anlegg')
        .update({ kontroll_status: newStatus })
        .eq('id', anleggId)

      if (error) throw error

      log.info('Status oppdatert', { anleggId, newStatus })
    } catch (err) {
      log.error('Feil ved oppdatering av status', { error: err, anleggId, newStatus })
      // Reverter optimistisk oppdatering ved feil
      await loadData()
      alert('Kunne ikke oppdatere status. Prøv igjen.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Laster kontrollplan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            Kontrollplan
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Planlegg og følg opp kontroller måned for måned
          </p>
        </div>
      </div>

      {/* Månedsvelger */}
      <div className="bg-white dark:bg-dark-50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeMonth('prev')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors touch-target"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
          </button>
          
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {selectedMonth}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              {stats.total} anlegg totalt
            </p>
          </div>

          <button
            onClick={() => changeMonth('next')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors touch-target"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Statistikk */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 sm:p-6 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400 truncate">Utført</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-300 mt-1 sm:mt-2">
                {stats.utfort}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 sm:w-12 sm:h-12 text-green-500 dark:text-green-400 opacity-50 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 sm:p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Planlagt</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1 sm:mt-2">
                {stats.planlagt}
              </p>
            </div>
            <Clock className="w-8 h-8 sm:w-12 sm:h-12 text-blue-500 dark:text-blue-400 opacity-50 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 sm:p-6 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 truncate">Ikke utført</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-700 dark:text-red-300 mt-1 sm:mt-2">
                {stats.ikkeUtfort}
              </p>
            </div>
            <XCircle className="w-8 h-8 sm:w-12 sm:h-12 text-red-500 dark:text-red-400 opacity-50 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 sm:p-6 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-yellow-600 dark:text-yellow-400 truncate">Utsatt</p>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-700 dark:text-yellow-300 mt-1 sm:mt-2">
                {stats.utsatt}
              </p>
            </div>
            <Clock className="w-8 h-8 sm:w-12 sm:h-12 text-yellow-500 dark:text-yellow-400 opacity-50 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Filtre */}
      <div className="bg-white dark:bg-dark-50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Søk */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Søk etter anlegg, kunde, adresse..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Kontrolltype filter */}
          <div className="sm:w-64">
            <select
              value={selectedKontrolltype}
              onChange={(e) => setSelectedKontrolltype(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
            >
              <option value="Alle">Alle kontrolltyper</option>
              {KONTROLLTYPER.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Anleggsliste gruppert etter status */}
      <div className="space-y-6">
        {/* Ikke utført */}
        {groupedAnlegg.ikkeUtfort.length > 0 && (
          <AnleggGroup
            title="Ikke utført"
            icon={XCircle}
            iconColor="text-red-500"
            bgColor="bg-red-50 dark:bg-red-900/20"
            borderColor="border-red-200 dark:border-red-800"
            anlegg={groupedAnlegg.ikkeUtfort}
            kunder={kunder}
            onViewAnlegg={handleViewAnlegg}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* Utsatt */}
        {groupedAnlegg.utsatt.length > 0 && (
          <AnleggGroup
            title="Utsatt"
            icon={Clock}
            iconColor="text-yellow-500"
            bgColor="bg-yellow-50 dark:bg-yellow-900/20"
            borderColor="border-yellow-200 dark:border-yellow-800"
            anlegg={groupedAnlegg.utsatt}
            kunder={kunder}
            onViewAnlegg={handleViewAnlegg}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* Planlagt */}
        {groupedAnlegg.planlagt.length > 0 && (
          <AnleggGroup
            title="Planlagt"
            icon={Clock}
            iconColor="text-blue-500"
            bgColor="bg-blue-50 dark:bg-blue-900/20"
            borderColor="border-blue-200 dark:border-blue-800"
            anlegg={groupedAnlegg.planlagt}
            kunder={kunder}
            onViewAnlegg={handleViewAnlegg}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* Utført */}
        {groupedAnlegg.utfort.length > 0 && (
          <AnleggGroup
            title="Utført"
            icon={CheckCircle}
            iconColor="text-green-500"
            bgColor="bg-green-50 dark:bg-green-900/20"
            borderColor="border-green-200 dark:border-green-800"
            anlegg={groupedAnlegg.utfort}
            kunder={kunder}
            onViewAnlegg={handleViewAnlegg}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* Oppsagt */}
        {groupedAnlegg.oppsagt.length > 0 && (
          <AnleggGroup
            title="Oppsagt"
            icon={Ban}
            iconColor="text-gray-500"
            bgColor="bg-gray-50 dark:bg-gray-900/20"
            borderColor="border-gray-200 dark:border-gray-800"
            anlegg={groupedAnlegg.oppsagt}
            kunder={kunder}
            onViewAnlegg={handleViewAnlegg}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* Ingen anlegg */}
        {filteredAnlegg.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-dark-50 rounded-xl border border-gray-200 dark:border-gray-800">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Ingen anlegg funnet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Det er ingen anlegg med kontrollmåned i {selectedMonth}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface AnleggGroupProps {
  title: string
  icon: any
  iconColor: string
  bgColor: string
  borderColor: string
  anlegg: Anlegg[]
  kunder: Kunde[]
  onViewAnlegg: (id: string) => void
  onStatusChange: (anleggId: string, newStatus: string) => void
}

function AnleggGroup({ title, icon: Icon, iconColor, bgColor, borderColor, anlegg, kunder, onViewAnlegg, onStatusChange }: AnleggGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  function getKundeNavn(kundenr: string): string {
    const kunde = kunder.find(k => k.id === kundenr)
    return kunde?.navn || 'Ukjent kunde'
  }

  return (
    <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full ${bgColor} px-6 py-4 flex items-center justify-between hover:opacity-80 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${iconColor}`} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            ({anlegg.length})
          </span>
        </div>
        <ChevronRight className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      {isExpanded && (
        <div className="bg-white dark:bg-dark-50 divide-y divide-gray-200 dark:divide-gray-800">
          {anlegg.map(a => (
            <div
              key={a.id}
              className="px-4 sm:px-6 py-4 hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                    <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
                      {a.anleggsnavn}
                    </h4>
                  </div>
                  
                  <div className="ml-0 sm:ml-8 space-y-1">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Kunde:</span> {getKundeNavn(a.kundenr)}
                    </p>
                    {a.adresse && (
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Adresse:</span> {a.adresse}
                        {a.poststed && `, ${a.poststed}`}
                      </p>
                    )}
                    {a.kontroll_type && a.kontroll_type.length > 0 && (
                      <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                        {a.kontroll_type.map(type => (
                          <span
                            key={type}
                            className="px-2 py-0.5 sm:py-1 text-xs font-medium bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 rounded"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start">
                  <select
                    value={a.kontroll_status || ''}
                    onChange={(e) => {
                      e.stopPropagation()
                      onStatusChange(a.id, e.target.value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white cursor-pointer hover:border-primary transition-colors touch-target"
                  >
                    <option value={ANLEGG_STATUSER.IKKE_UTFORT}>{ANLEGG_STATUSER.IKKE_UTFORT}</option>
                    <option value={ANLEGG_STATUSER.PLANLAGT}>{ANLEGG_STATUSER.PLANLAGT}</option>
                    <option value={ANLEGG_STATUSER.UTFORT}>{ANLEGG_STATUSER.UTFORT}</option>
                    <option value={ANLEGG_STATUSER.UTSATT}>{ANLEGG_STATUSER.UTSATT}</option>
                    <option value={ANLEGG_STATUSER.OPPSAGT}>{ANLEGG_STATUSER.OPPSAGT}</option>
                  </select>
                  <button
                    onClick={() => onViewAnlegg(a.id)}
                    className="flex-shrink-0 p-2 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors touch-target"
                    title="Vis anlegg"
                  >
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
