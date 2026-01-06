import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { useAuthStore } from '@/store/authStore'
import { Plus, Search, ClipboardList, Building2, User, Eye, Trash2, Calendar, Edit, CheckCircle, FileText, LayoutGrid, Table } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useNavigate, useLocation } from 'react-router-dom'
import { ORDRE_STATUSER, ORDRE_STATUS_COLORS } from '@/lib/constants'

const log = createLogger('Ordre')

interface Ordre {
  id: string
  ordre_nummer: string
  type: string
  kundenr: string
  anlegg_id: string
  kommentar: string | null
  status: string
  opprettet_dato: string
  sist_oppdatert: string | null
  tekniker_id: string | null
  kontrolltype: string[] | null
}

interface OrdreMedAnleggKunde extends Ordre {
  anlegg: {
    anleggsnavn: string
  }
  customer: {
    navn: string
  }
  tekniker: {
    navn: string
  } | null
}

type SortOption = 'dato_nyeste' | 'dato_eldste' | 'status' | 'kunde' | 'anlegg' | 'tekniker'

interface Tekniker {
  id: string
  navn: string
}

// Funksjon for å konvertere navn til initialer
function getInitials(navn: string): string {
  const initialMap: Record<string, string> = {
    'Erik Sebastian Skille': 'ESS',
    'Pål Gunnar Kåsa': 'PGK',
    'Kristoffer Skår': 'KS',
    'Vegard Ness': 'VN',
    'Martin Kyte': 'MK'
  }
  
  return initialMap[navn] || navn.split(' ').map(n => n[0]).join('').toUpperCase()
}

export function Ordre() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const state = location.state as { kundeId?: string; anleggId?: string; selectedOrdreId?: string } | null
  
  const [ordre, setOrdre] = useState<OrdreMedAnleggKunde[]>([])
  const [teknikere, setTeknikere] = useState<Tekniker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrdre, setSelectedOrdre] = useState<OrdreMedAnleggKunde | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'create' | 'edit'>('list')
  const [sortBy, setSortBy] = useState<SortOption>('dato_nyeste')
  const [filterStatus, setFilterStatus] = useState<string>('alle')
  const [filterTekniker, setFilterTekniker] = useState<string>('')
  const [prefilledData, setPrefilledData] = useState<{ kundeId?: string; anleggId?: string } | null>(null)
  const [inkluderFullforte, setInkluderFullforte] = useState(false)
  const [inkluderFakturerte, setInkluderFakturerte] = useState(false)
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 1024 ? 'cards' : 'table'
  })

  useEffect(() => {
    loadOrdre()
  }, [])

  // Sett tekniker-filter til innlogget bruker som default
  useEffect(() => {
    async function setDefaultTekniker() {
      if (!user?.email) return
      
      try {
        const { data: ansatt } = await supabase
          .from('ansatte')
          .select('id')
          .eq('epost', user.email)
          .single()
        
        if (ansatt) {
          setFilterTekniker(ansatt.id)
        }
      } catch (error) {
        console.log('Kunne ikke finne ansatt for bruker:', error)
        setFilterTekniker('alle')
      }
    }
    
    setDefaultTekniker()
  }, [user])

  // Håndter forhåndsutfylt data fra navigasjon
  useEffect(() => {
    if (state?.kundeId || state?.anleggId) {
      setPrefilledData({ kundeId: state.kundeId, anleggId: state.anleggId })
      setViewMode('create')
      // Nullstill state for å unngå at det trigges på nytt
      window.history.replaceState({}, document.title)
    }
  }, [state])

  // Håndter navigasjon fra Dashboard
  useEffect(() => {
    if (state?.selectedOrdreId && ordre.length > 0) {
      const selectedOrder = ordre.find(o => o.id === state.selectedOrdreId)
      if (selectedOrder) {
        openOrdre(selectedOrder)
      }
    }
  }, [state?.selectedOrdreId, ordre])

  async function loadOrdre() {
    try {
      setError(null)
      
      // Hent ordre og teknikere parallelt
      const [ordreResponse, teknikereResponse, servicerapporterResponse] = await Promise.all([
        supabase
          .from('ordre')
          .select(`
            *,
            anlegg(anleggsnavn),
            customer:kundenr(navn),
            tekniker:tekniker_id(navn)
          `)
          .order('ordre_nummer', { ascending: false }),
        supabase
          .from('ansatte')
          .select('id, navn')
          .order('navn', { ascending: true }),
        supabase
          .from('servicerapporter')
          .select('ordre_id')
      ])

      if (ordreResponse.error) throw new Error(ordreResponse.error.message)
      if (teknikereResponse.error) throw new Error(teknikereResponse.error.message)

      // Lag et Set med ordre_id som har servicerapport
      const ordreIderMedRapport = new Set(
        servicerapporterResponse.data?.map(r => r.ordre_id).filter(Boolean) || []
      )

      // Legg til har_servicerapport flag på hver ordre
      const ordreWithFlags = ordreResponse.data?.map(o => ({
        ...o,
        har_servicerapport: ordreIderMedRapport.has(o.id)
      })) || []

      setOrdre(ordreWithFlags)
      setTeknikere(teknikereResponse.data || [])
    } catch (err) {
      log.error('Feil ved lasting av ordre', { error: err })
      setError(err instanceof Error ? err.message : 'Kunne ikke laste ordre')
    } finally {
      setLoading(false)
    }
  }

  async function deleteOrdre(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne ordren?')) return

    try {
      const { error } = await supabase
        .from('ordre')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadOrdre()
    } catch (error) {
      log.error('Feil ved sletting av ordre', { error, ordreId: id })
      alert('Kunne ikke slette ordre')
    }
  }

  // Marker ordre som sett av tekniker
  async function markerOrdreSomSett(ordreId: string) {
    try {
      await supabase
        .from('ordre')
        .update({ 
          sett_av_tekniker: true, 
          sett_dato: new Date().toISOString() 
        })
        .eq('id', ordreId)
    } catch (error) {
      // Ignorer feil hvis kolonnen ikke finnes ennå
      console.log('Kunne ikke markere ordre som sett:', error)
    }
  }

  // Åpne ordre og marker som sett
  function openOrdre(ordreItem: OrdreMedAnleggKunde) {
    setSelectedOrdre(ordreItem)
    setViewMode('view')
    markerOrdreSomSett(ordreItem.id)
  }

  const [avsluttDialog, setAvsluttDialog] = useState<{ open: boolean; ordreId: string | null }>({ open: false, ordreId: null })
  const [erFakturert, setErFakturert] = useState<boolean | null>(null)
  const [fakturaAnsvarlig, setFakturaAnsvarlig] = useState('')

  async function avsluttOrdre(ordreId: string) {
    setAvsluttDialog({ open: true, ordreId })
    setErFakturert(null)
    setFakturaAnsvarlig('')
  }

  async function bekreftAvslutning() {
    if (!avsluttDialog.ordreId) return

    try {
      // Oppdater ordre til Fullført
      const { error: ordreError } = await supabase
        .from('ordre')
        .update({ 
          status: ORDRE_STATUSER.FULLFORT,
          sist_oppdatert: new Date().toISOString()
        })
        .eq('id', avsluttDialog.ordreId)

      if (ordreError) throw ordreError

      // Hvis ikke fakturert, opprett fakturaoppgave
      if (erFakturert === false && fakturaAnsvarlig) {
        // Hent ordreinformasjon
        const { data: ordreData } = await supabase
          .from('ordre')
          .select('kundenr, anlegg_id, type')
          .eq('id', avsluttDialog.ordreId)
          .single()

        if (ordreData) {
          const { error: oppgaveError } = await supabase
            .from('oppgaver')
            .insert([{
              type: 'Faktura',
              kunde_id: ordreData.kundenr,
              anlegg_id: ordreData.anlegg_id,
              tekniker_id: fakturaAnsvarlig,
              ordre_id: avsluttDialog.ordreId,
              status: 'Ikke påbegynt',
              prioritet: 'Høy',
              beskrivelse: `Faktura for ordre: ${ordreData.type}`,
              opprettet_dato: new Date().toISOString()
            }])

          if (oppgaveError) throw oppgaveError
        }
      }

      setAvsluttDialog({ open: false, ordreId: null })
      await loadOrdre()
    } catch (error) {
      log.error('Feil ved avslutning av ordre', { error, ordreId: avsluttDialog.ordreId })
      alert('Kunne ikke avslutte ordre')
    }
  }

  const filteredOrdre = ordre.filter(o => {
    const matchesSearch = 
      o.ordre_nummer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.anlegg?.anleggsnavn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer?.navn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.kommentar?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'alle' || o.status === filterStatus
    
    const matchesTekniker = 
      filterTekniker === 'alle' || 
      (filterTekniker === 'ikke_tildelt' && !o.tekniker_id) ||
      o.tekniker_id === filterTekniker

    // Skjul fullførte og fakturerte ordre som standard
    const isFullfort = o.status === 'Fullført'
    const isFakturert = o.status === 'Fakturert'
    
    const shouldShow = 
      (!isFullfort || inkluderFullforte) &&
      (!isFakturert || inkluderFakturerte)

    return matchesSearch && matchesStatus && matchesTekniker && shouldShow
  })

  // Sortering
  const sortedOrdre = [...filteredOrdre].sort((a, b) => {
    switch (sortBy) {
      case 'dato_nyeste':
        return new Date(b.opprettet_dato).getTime() - new Date(a.opprettet_dato).getTime()
      case 'dato_eldste':
        return new Date(a.opprettet_dato).getTime() - new Date(b.opprettet_dato).getTime()
      case 'status':
        return a.status.localeCompare(b.status, 'nb-NO')
      case 'kunde':
        return (a.customer?.navn || '').localeCompare(b.customer?.navn || '', 'nb-NO')
      case 'anlegg':
        return (a.anlegg?.anleggsnavn || '').localeCompare(b.anlegg?.anleggsnavn || '', 'nb-NO')
      case 'tekniker':
        const aNavn = a.tekniker?.navn || 'Ikke tildelt'
        const bNavn = b.tekniker?.navn || 'Ikke tildelt'
        return aNavn.localeCompare(bNavn, 'nb-NO')
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400 dark:text-gray-400">Laster ordre...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ordre</h1>
          <p className="text-gray-400 dark:text-gray-400">Administrer serviceordre</p>
        </div>
        <div className="card bg-red-900/20 border-red-800">
          <div className="flex items-start gap-3">
            <ClipboardList className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">Kunne ikke laste ordre</h3>
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <button onClick={loadOrdre} className="btn-primary text-sm">
                Prøv igjen
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <OrdreForm
        ordre={selectedOrdre}
        prefilledKundeId={prefilledData?.kundeId}
        prefilledAnleggId={prefilledData?.anleggId}
        onSave={async () => {
          await loadOrdre()
          setViewMode('list')
          setSelectedOrdre(null)
          setPrefilledData(null)
        }}
        onCancel={() => {
          setViewMode('list')
          setSelectedOrdre(null)
          setPrefilledData(null)
        }}
      />
    )
  }

  if (viewMode === 'view' && selectedOrdre) {
    return (
      <OrdreDetails
        ordre={selectedOrdre}
        onEdit={() => setViewMode('edit')}
        onClose={() => {
          setViewMode('list')
          setSelectedOrdre(null)
        }}
      />
    )
  }

  return (
    <>
      {/* Avslutt Ordre Dialog */}
      {avsluttDialog.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-200 border border-gray-200 dark:border-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Avslutt ordre</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-500 dark:text-gray-300 mb-3">Er ordren fakturert?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setErFakturert(true)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                      erFakturert === true
                        ? 'bg-green-600 border-green-600 text-gray-900 dark:text-white'
                        : 'bg-dark-100 border-gray-700 text-gray-500 dark:text-gray-300 hover:border-green-600'
                    }`}
                  >
                    Ja
                  </button>
                  <button
                    onClick={() => setErFakturert(false)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                      erFakturert === false
                        ? 'bg-red-600 border-red-600 text-gray-900 dark:text-white'
                        : 'bg-dark-100 border-gray-700 text-gray-500 dark:text-gray-300 hover:border-red-600'
                    }`}
                  >
                    Nei
                  </button>
                </div>
              </div>

              {erFakturert === false && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                    Fakturaansvarlig <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fakturaAnsvarlig}
                    onChange={(e) => setFakturaAnsvarlig(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Velg tekniker</option>
                    {teknikere.map((t) => (
                      <option key={t.id} value={t.id}>{t.navn}</option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-400 dark:text-gray-400 mt-2">
                    En fakturaoppgave vil bli opprettet og tildelt valgt tekniker
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={bekreftAvslutning}
                disabled={erFakturert === null || (erFakturert === false && !fakturaAnsvarlig)}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Avslutt ordre
              </button>
              <button
                onClick={() => setAvsluttDialog({ open: false, ordreId: null })}
                className="btn-secondary flex-1"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Ordre</h1>
          <p className="text-sm sm:text-base text-gray-400 dark:text-gray-400">Administrer serviceordre</p>
        </div>
        <button
          onClick={() => {
            setSelectedOrdre(null)
            setViewMode('create')
          }}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          Ny ordre
        </button>
      </div>

      {/* Search, Filter and Sort */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter ordre, kunde, anlegg..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="md:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="alle">Alle statuser</option>
              {Object.values(ORDRE_STATUSER).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="md:w-48">
            <select
              value={filterTekniker}
              onChange={(e) => setFilterTekniker(e.target.value)}
              className="input"
            >
              <option value="alle">Alle teknikere</option>
              <option value="ikke_tildelt">Ikke tildelt</option>
              {teknikere.map((tekniker) => (
                <option key={tekniker.id} value={tekniker.id}>
                  {tekniker.navn}
                </option>
              ))}
            </select>
          </div>
          <div className="md:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="input"
            >
              <option value="dato_nyeste">Nyeste først</option>
              <option value="dato_eldste">Eldste først</option>
              <option value="status">Status</option>
              <option value="kunde">Kunde</option>
              <option value="anlegg">Anlegg</option>
              <option value="tekniker">Tekniker</option>
            </select>
          </div>
        </div>

        {/* Checkbokser for å inkludere fullførte og fakturerte */}
        <div className="flex items-center gap-6 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={inkluderFullforte}
              onChange={(e) => setInkluderFullforte(e.target.checked)}
              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Inkluder fullførte</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={inkluderFakturerte}
              onChange={(e) => setInkluderFakturerte(e.target.checked)}
              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Inkluder fakturerte</span>
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-lg flex-shrink-0">
              <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 dark:text-gray-400 text-xs sm:text-sm truncate">Totalt ordre</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{ordre.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-yellow-500/10 rounded-lg flex-shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 dark:text-gray-400 text-xs sm:text-sm truncate">Ventende</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {ordre.filter(o => o.status === ORDRE_STATUSER.VENTENDE).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-blue-500/10 rounded-lg flex-shrink-0">
              <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 dark:text-gray-400 text-xs sm:text-sm truncate">Pågående</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {ordre.filter(o => o.status === ORDRE_STATUSER.PAGAENDE).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-green-500/10 rounded-lg flex-shrink-0">
              <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 dark:text-gray-400 text-xs sm:text-sm truncate">Fullført</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {ordre.filter(o => o.status === ORDRE_STATUSER.FULLFORT).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ordre Liste */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Ordreliste
            <span className="ml-2 text-xs sm:text-sm text-gray-400 dark:text-gray-400 font-normal">
              ({sortedOrdre.length} {sortedOrdre.length === 1 ? 'ordre' : 'ordre'})
            </span>
          </h2>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-100 rounded-lg p-1">
            <button
              onClick={() => setDisplayMode('table')}
              className={`p-2 rounded transition-colors ${
                displayMode === 'table'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Tabellvisning"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayMode('cards')}
              className={`p-2 rounded transition-colors ${
                displayMode === 'cards'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Kortvisning"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {sortedOrdre.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-gray-400">
              {searchTerm || filterStatus !== 'alle' ? 'Ingen ordre funnet' : 'Ingen ordre registrert ennå'}
            </p>
          </div>
        ) : displayMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedOrdre.map((ordre) => (
              <div
                key={ordre.id}
                onClick={() => {
                  setSelectedOrdre(ordre)
                  setViewMode('edit')
                }}
                className="bg-gray-50 dark:bg-dark-100 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-primary font-mono font-medium text-sm truncate">{ordre.ordre_nummer}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{ordre.type}</p>
                    </div>
                  </div>
                  <span className={`badge text-xs ${ORDRE_STATUS_COLORS[ordre.status] || 'badge-info'}`}>
                    {ordre.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{ordre.customer?.navn || 'Ukjent kunde'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                    <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{ordre.anlegg?.anleggsnavn || 'Ukjent anlegg'}</span>
                  </div>
                  {ordre.tekniker && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span title={ordre.tekniker.navn}>{getInitials(ordre.tekniker.navn)}</span>
                    </div>
                  )}
                  {ordre.kontrolltype && ordre.kontrolltype.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ordre.kontrolltype.slice(0, 2).map((type, idx) => (
                        <span key={idx} className="badge badge-info text-xs">
                          {type}
                        </span>
                      ))}
                      {ordre.kontrolltype.length > 2 && (
                        <span className="text-xs text-gray-400">+{ordre.kontrolltype.length - 2}</span>
                      )}
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{formatDate(ordre.opprettet_dato)}</span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {ordre.type.toLowerCase() !== 'årskontroll' && ordre.type.toLowerCase() !== 'kontroll' && (
                        <button
                          onClick={() => navigate('/teknisk', { 
                            state: { 
                              openServicerapport: true, 
                              anleggId: ordre.anlegg_id,
                              anleggNavn: ordre.anlegg?.anleggsnavn || '',
                              ordreId: ordre.id
                            } 
                          })}
                          className={`p-2 rounded transition-colors touch-target ${
                            (ordre as any).har_servicerapport 
                              ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10' 
                              : 'text-gray-400 hover:text-purple-400 hover:bg-purple-500/10'
                          }`}
                          title={(ordre as any).har_servicerapport ? "Servicerapport opprettet" : "Opprett servicerapport"}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openOrdre(ordre)
                        }}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-colors touch-target"
                        title="Vis detaljer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedOrdre(ordre)
                          setViewMode('edit')
                        }}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors touch-target"
                        title="Rediger"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Ordrenr</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Kunde</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Anlegg</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Tekniker</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Opprettet</th>
                  <th className="text-right py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrdre.map((ordre) => (
                  <tr
                    key={ordre.id}
                    onClick={() => {
                      setSelectedOrdre(ordre)
                      setViewMode('edit')
                    }}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <span className="text-primary font-mono font-medium text-sm">
                        {ordre.ordre_nummer}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <ClipboardList className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">{ordre.type}</p>
                          {ordre.kontrolltype && ordre.kontrolltype.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ordre.kontrolltype.slice(0, 2).map((type, idx) => (
                                <span key={idx} className="badge badge-info text-xs">
                                  {type}
                                </span>
                              ))}
                              {ordre.kontrolltype.length > 2 && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  +{ordre.kontrolltype.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300">
                      {ordre.customer?.navn || 'Ukjent kunde'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                        <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        {ordre.anlegg?.anleggsnavn || 'Ukjent anlegg'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {ordre.tekniker ? (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                          <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span title={ordre.tekniker.navn}>{getInitials(ordre.tekniker.navn)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Ikke tildelt</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${ORDRE_STATUS_COLORS[ordre.status] || 'badge-info'}`}>
                        {ordre.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300 text-sm">
                      {formatDate(ordre.opprettet_dato)}
                    </td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {ordre.type.toLowerCase() !== 'årskontroll' && ordre.type.toLowerCase() !== 'kontroll' && (
                          <button
                            onClick={() => navigate('/teknisk', { 
                              state: { 
                                openServicerapport: true, 
                                anleggId: ordre.anlegg_id,
                                anleggNavn: ordre.anlegg?.anleggsnavn || '',
                                ordreId: ordre.id
                              } 
                            })}
                            className={`p-2 rounded-lg transition-colors ${
                              (ordre as any).har_servicerapport 
                                ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10' 
                                : 'text-gray-400 dark:text-gray-400 hover:text-purple-400 hover:bg-purple-500/10'
                            }`}
                            title={(ordre as any).har_servicerapport ? "Servicerapport opprettet" : "Opprett servicerapport"}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openOrdre(ordre)}
                          className="p-2 text-gray-400 dark:text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Vis detaljer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrdre(ordre)
                            setViewMode('edit')
                          }}
                          className="p-2 text-gray-400 dark:text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Rediger"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {ordre.status !== 'Fullført' && ordre.status !== 'Fakturert' && (
                          <button
                            onClick={() => avsluttOrdre(ordre.id)}
                            className="p-2 text-gray-400 dark:text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                            title="Avslutt ordre"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteOrdre(ordre.id)}
                          className="p-2 text-gray-400 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Slett"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

// Ordre Form Component
interface OrdreFormProps {
  ordre: OrdreMedAnleggKunde | null
  prefilledKundeId?: string
  prefilledAnleggId?: string
  onSave: () => void
  onCancel: () => void
}

interface Kunde {
  id: string
  navn: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
  kontroll_type: string[] | null
}

function OrdreForm({ ordre, prefilledKundeId, prefilledAnleggId, onSave, onCancel }: OrdreFormProps) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    type: ordre?.type || '',
    kundenr: ordre?.kundenr || prefilledKundeId || '',
    anlegg_id: ordre?.anlegg_id || prefilledAnleggId || '',
    tekniker_id: ordre?.tekniker_id || '',
    kommentar: ordre?.kommentar || '',
    status: ordre?.status || 'Ventende',
    kontrolltype: ordre?.kontrolltype || [] as string[],
  })
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [teknikere, setTeknikere] = useState<Tekniker[]>([])
  const [tilgjengeligeKontrolltyper, setTilgjengeligeKontrolltyper] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [kundeSok, setKundeSok] = useState('')
  const [anleggSok, setAnleggSok] = useState('')
  const [showFakturaDialog, setShowFakturaDialog] = useState(false)
  const [erFakturert, setErFakturert] = useState<boolean | null>(null)
  const [fakturaAnsvarlig, setFakturaAnsvarlig] = useState('')
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const [kanRedigereKundeAnlegg, setKanRedigereKundeAnlegg] = useState(!ordre)

  const ordretyper = ['Service', 'Kontroll', 'Reparasjon', 'Installasjon', 'Befaring']
  const statuser = Object.values(ORDRE_STATUSER)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (formData.anlegg_id) {
      loadKontrolltyper(formData.anlegg_id)
    }
  }, [formData.anlegg_id])

  async function loadData() {
    try {
      const [kunderRes, teknikereRes] = await Promise.all([
        supabase.from('customer').select('id, navn').order('navn'),
        supabase.from('ansatte').select('id, navn').order('navn')
      ])

      if (kunderRes.data) setKunder(kunderRes.data)
      if (teknikereRes.data) setTeknikere(teknikereRes.data)

      if (formData.kundenr) {
        await loadAnlegg(formData.kundenr)
      }
    } catch (error) {
      log.error('Feil ved lasting av kunder og anlegg', { error })
    } finally {
      setLoading(false)
    }
  }

  // Finn kundenavn og anleggsnavn for visning
  const kundeNavn = kunder.find(k => k.id === formData.kundenr)?.navn || ordre?.customer?.navn || ''
  const anleggNavn = anlegg.find(a => a.id === formData.anlegg_id)?.anleggsnavn || ordre?.anlegg?.anleggsnavn || ''

  async function loadAnlegg(kundeId: string) {
    try {
      const { data } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn, kontroll_type')
        .eq('kundenr', kundeId)
        .order('anleggsnavn')

      if (data) {
        setAnlegg(data)
        // Hvis kun 1 anlegg, velg det automatisk
        if (data.length === 1) {
          setFormData(prev => ({ ...prev, anlegg_id: data[0].id }))
        }
      }
    } catch (error) {
      log.error('Feil ved lasting av anlegg for kunde', { error, kundeId })
    }
  }

  async function loadKontrolltyper(anleggId: string) {
    const selectedAnlegg = anlegg.find(a => a.id === anleggId)
    if (selectedAnlegg?.kontroll_type) {
      setTilgjengeligeKontrolltyper(selectedAnlegg.kontroll_type)
      setFormData(prev => ({ ...prev, kontrolltype: selectedAnlegg.kontroll_type || [] }))
    }
  }

  function toggleKontrolltype(type: string) {
    const current = formData.kontrolltype
    if (current.includes(type)) {
      setFormData({ ...formData, kontrolltype: current.filter(t => t !== type) })
    } else {
      setFormData({ ...formData, kontrolltype: [...current, type] })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Hvis ordre endres til Fullført og det er en eksisterende ordre, vis faktura-dialog
    if (ordre && formData.status === 'Fullført' && ordre.status !== 'Fullført') {
      setPendingSubmit(true)
      setShowFakturaDialog(true)
      return
    }
    
    await saveOrdre()
  }

  async function saveOrdre() {
    setSaving(true)

    try {
      const dataToSave = {
        type: formData.type,
        kundenr: formData.kundenr || null,
        anlegg_id: formData.anlegg_id || null,
        tekniker_id: formData.tekniker_id || null,
        kommentar: formData.kommentar || null,
        status: formData.status,
        kontrolltype: formData.kontrolltype.length > 0 ? formData.kontrolltype : null,
      }

      if (ordre) {
        const { error } = await supabase
          .from('ordre')
          .update({
            ...dataToSave,
            sist_oppdatert: new Date().toISOString(),
          })
          .eq('id', ordre.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('ordre')
          .insert([{ ...dataToSave, opprettet_dato: new Date().toISOString() }])

        if (error) throw error
      }

      // Hvis ikke fakturert, opprett fakturaoppgave
      if (pendingSubmit && erFakturert === false && fakturaAnsvarlig && ordre) {
        const { error: oppgaveError } = await supabase
          .from('oppgaver')
          .insert([{
            type: 'Faktura',
            kunde_id: formData.kundenr,
            anlegg_id: formData.anlegg_id,
            tekniker_id: fakturaAnsvarlig,
            ordre_id: ordre.id,
            status: 'Ikke påbegynt',
            prioritet: 'Høy',
            beskrivelse: `Faktura for ordre: ${formData.type}`,
            opprettet_dato: new Date().toISOString()
          }])

        if (oppgaveError) throw oppgaveError
      }

      onSave()
    } catch (error) {
      log.error('Feil ved lagring av ordre', { error, formData })
      alert('Kunne ikke lagre ordre')
    } finally {
      setSaving(false)
      setPendingSubmit(false)
      setShowFakturaDialog(false)
    }
  }

  function handleFakturaDialogConfirm() {
    saveOrdre()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      {/* Faktura Dialog */}
      {showFakturaDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-200 border border-gray-200 dark:border-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Fullføre ordre</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-500 dark:text-gray-300 mb-3">Er ordren fakturert?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setErFakturert(true)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                      erFakturert === true
                        ? 'bg-green-600 border-green-600 text-gray-900 dark:text-white'
                        : 'bg-dark-100 border-gray-700 text-gray-500 dark:text-gray-300 hover:border-green-600'
                    }`}
                  >
                    Ja
                  </button>
                  <button
                    onClick={() => setErFakturert(false)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                      erFakturert === false
                        ? 'bg-red-600 border-red-600 text-gray-900 dark:text-white'
                        : 'bg-dark-100 border-gray-700 text-gray-500 dark:text-gray-300 hover:border-red-600'
                    }`}
                  >
                    Nei
                  </button>
                </div>
              </div>

              {erFakturert === false && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                    Fakturaansvarlig <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fakturaAnsvarlig}
                    onChange={(e) => setFakturaAnsvarlig(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Velg tekniker</option>
                    {teknikere.map((t) => (
                      <option key={t.id} value={t.id}>{t.navn}</option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-400 dark:text-gray-400 mt-2">
                    En fakturaoppgave vil bli opprettet og tildelt valgt tekniker
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleFakturaDialogConfirm}
                disabled={erFakturert === null || (erFakturert === false && !fakturaAnsvarlig)}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Lagre
              </button>
              <button
                onClick={() => {
                  setShowFakturaDialog(false)
                  setPendingSubmit(false)
                  setErFakturert(null)
                  setFakturaAnsvarlig('')
                }}
                className="btn-secondary flex-1"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {ordre ? 'Rediger ordre' : 'Ny ordre'}
          </h1>
          <p className="text-gray-400 dark:text-gray-400">
            {ordre ? 'Oppdater ordreinformasjon' : 'Opprett ny serviceordre'}
          </p>
        </div>
        {prefilledAnleggId && !ordre && (
          <button
            type="button"
            onClick={() => navigate('/anlegg', { state: { viewAnleggId: prefilledAnleggId } })}
            className="btn-secondary"
          >
            Tilbake til anlegg
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ordretype */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Ordretype <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input"
              required
            >
              <option value="">Velg type</option>
              {ordretyper.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="input"
              required
            >
              {statuser.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Kunde */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-300">
                Kunde <span className="text-red-500">*</span>
              </label>
              {ordre && !kanRedigereKundeAnlegg && (
                <button
                  type="button"
                  onClick={() => setKanRedigereKundeAnlegg(true)}
                  className="text-xs text-primary hover:text-primary-400 flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  Rediger kunde/anlegg
                </button>
              )}
            </div>
            {ordre && !kanRedigereKundeAnlegg ? (
              <div className="input bg-dark-100 text-gray-900 dark:text-white">
                {kundeNavn}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Søk etter kunde..."
                  value={kundeSok}
                  onChange={(e) => setKundeSok(e.target.value)}
                  className="input"
                />
                <select
                  value={formData.kundenr}
                  onChange={(e) => {
                    setFormData({ ...formData, kundenr: e.target.value, anlegg_id: '' })
                    setAnlegg([])
                    loadAnlegg(e.target.value)
                  }}
                  className="input"
                  required
                  size={Math.min(kunder.filter(k => 
                    k.navn.toLowerCase().includes(kundeSok.toLowerCase())
                  ).length + 1, 8)}
                >
                  <option value="">Velg kunde</option>
                  {kunder
                    .filter(k => k.navn.toLowerCase().includes(kundeSok.toLowerCase()))
                    .map((kunde) => (
                      <option key={kunde.id} value={kunde.id}>{kunde.navn}</option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Anlegg */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Anlegg <span className="text-red-500">*</span>
            </label>
            {ordre && !kanRedigereKundeAnlegg ? (
              <div className="input bg-dark-100 text-gray-900 dark:text-white">
                {anleggNavn}
              </div>
            ) : !formData.kundenr ? (
              <div className="input bg-dark-100 text-gray-400 dark:text-gray-500 cursor-not-allowed">
                Velg kunde først
              </div>
            ) : anlegg.length === 0 ? (
              <div className="input bg-dark-100 text-gray-400 dark:text-gray-500">
                Ingen anlegg funnet for denne kunden
              </div>
            ) : anlegg.length === 1 ? (
              <div className="input bg-dark-100 text-gray-900 dark:text-white">
                {anlegg[0].anleggsnavn} (automatisk valgt)
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Søk etter anlegg..."
                  value={anleggSok}
                  onChange={(e) => setAnleggSok(e.target.value)}
                  className="input"
                />
                <select
                  value={formData.anlegg_id}
                  onChange={(e) => setFormData({ ...formData, anlegg_id: e.target.value })}
                  className="input"
                  required
                  size={Math.min(anlegg.filter(a => 
                    a.anleggsnavn.toLowerCase().includes(anleggSok.toLowerCase())
                  ).length + 1, 8)}
                >
                  <option value="">Velg anlegg</option>
                  {anlegg
                    .filter(a => a.anleggsnavn.toLowerCase().includes(anleggSok.toLowerCase()))
                    .map((a) => (
                      <option key={a.id} value={a.id}>{a.anleggsnavn}</option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Tekniker */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Tekniker
            </label>
            <select
              value={formData.tekniker_id}
              onChange={(e) => setFormData({ ...formData, tekniker_id: e.target.value })}
              className="input"
            >
              <option value="">Ikke tildelt</option>
              {teknikere.map((t) => (
                <option key={t.id} value={t.id}>{t.navn}</option>
              ))}
            </select>
          </div>

          {/* Kontrolltyper */}
          {tilgjengeligeKontrolltyper.length > 0 && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-3">
                Kontrolltyper
              </label>
              <div className="flex flex-wrap gap-3">
                {tilgjengeligeKontrolltyper.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleKontrolltype(type)}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      formData.kontrolltype.includes(type)
                        ? 'bg-primary border-primary text-gray-900 dark:text-white'
                        : 'bg-dark-100 border-gray-700 text-gray-500 dark:text-gray-300 hover:border-primary'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kommentar */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Kommentar
            </label>
            <textarea
              value={formData.kommentar}
              onChange={(e) => setFormData({ ...formData, kommentar: e.target.value })}
              className="input"
              rows={4}
              placeholder="Legg til kommentar..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Lagrer...' : ordre ? 'Oppdater ordre' : 'Opprett ordre'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Avbryt
          </button>
        </div>
      </form>
    </div>
    </>
  )
}

// Ordre Details Component
interface OrdreDetailsProps {
  ordre: OrdreMedAnleggKunde
  onEdit: () => void
  onClose: () => void
}

function OrdreDetails({ ordre, onEdit, onClose }: OrdreDetailsProps) {
  const [showAvsluttDialog, setShowAvsluttDialog] = useState(false)
  const [erFakturert, setErFakturert] = useState<boolean | null>(null)
  const [fakturaAnsvarlig, setFakturaAnsvarlig] = useState('')
  const [teknikere, setTeknikere] = useState<Tekniker[]>([])

  useEffect(() => {
    loadTeknikere()
  }, [])

  async function loadTeknikere() {
    const { data } = await supabase
      .from('ansatte')
      .select('id, navn')
      .order('navn')
    
    if (data) setTeknikere(data)
  }

  async function handleAvsluttOrdre() {
    try {
      // Oppdater ordre til Fullført
      const { error: ordreError } = await supabase
        .from('ordre')
        .update({ 
          status: 'Fullført',
          sist_oppdatert: new Date().toISOString()
        })
        .eq('id', ordre.id)

      if (ordreError) throw ordreError

      // Hvis ikke fakturert, opprett fakturaoppgave
      if (erFakturert === false && fakturaAnsvarlig) {
        const { error: oppgaveError } = await supabase
          .from('oppgaver')
          .insert([{
            type: 'Faktura',
            kunde_id: ordre.kundenr,
            anlegg_id: ordre.anlegg_id,
            tekniker_id: fakturaAnsvarlig,
            ordre_id: ordre.id,
            status: 'Ikke påbegynt',
            prioritet: 'Høy',
            beskrivelse: `Faktura for ordre: ${ordre.type}`,
            opprettet_dato: new Date().toISOString()
          }])

        if (oppgaveError) throw oppgaveError
      }

      setShowAvsluttDialog(false)
      onClose()
      window.location.reload()
    } catch (error) {
      console.error('Feil ved avslutning:', error)
      alert('Kunne ikke avslutte ordre')
    }
  }

  return (
    <>
      {/* Avslutt Dialog */}
      {showAvsluttDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-200 border border-gray-200 dark:border-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Avslutt ordre</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-500 dark:text-gray-300 mb-3">Er ordren fakturert?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setErFakturert(true)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                      erFakturert === true
                        ? 'bg-green-600 border-green-600 text-gray-900 dark:text-white'
                        : 'bg-dark-100 border-gray-700 text-gray-500 dark:text-gray-300 hover:border-green-600'
                    }`}
                  >
                    Ja
                  </button>
                  <button
                    onClick={() => setErFakturert(false)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                      erFakturert === false
                        ? 'bg-red-600 border-red-600 text-gray-900 dark:text-white'
                        : 'bg-dark-100 border-gray-700 text-gray-500 dark:text-gray-300 hover:border-red-600'
                    }`}
                  >
                    Nei
                  </button>
                </div>
              </div>

              {erFakturert === false && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                    Fakturaansvarlig <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fakturaAnsvarlig}
                    onChange={(e) => setFakturaAnsvarlig(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Velg tekniker</option>
                    {teknikere.map((t) => (
                      <option key={t.id} value={t.id}>{t.navn}</option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-400 dark:text-gray-400 mt-2">
                    En fakturaoppgave vil bli opprettet og tildelt valgt tekniker
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleAvsluttOrdre}
                disabled={erFakturert === null || (erFakturert === false && !fakturaAnsvarlig)}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Avslutt ordre
              </button>
              <button
                onClick={() => setShowAvsluttDialog(false)}
                className="btn-secondary flex-1"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 sm:space-y-6 pb-20">
        <div className="space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">{ordre.type}</h1>
              <span className="text-primary font-mono font-medium text-sm sm:text-base lg:text-lg">
                {ordre.ordre_nummer}
              </span>
            </div>
            <p className="text-sm sm:text-base text-gray-400 dark:text-gray-400 truncate">{ordre.customer?.navn || 'Ukjent kunde'} - {ordre.anlegg?.anleggsnavn || 'Ukjent anlegg'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ordre.status !== 'Fullført' && ordre.status !== 'Fakturert' && (
              <button 
                onClick={() => setShowAvsluttDialog(true)}
                className="btn-primary bg-green-600 hover:bg-green-700 flex items-center gap-2 text-sm sm:text-base"
              >
                <CheckCircle className="w-4 h-4" />
                <span className="hidden xs:inline">Avslutt ordre</span>
                <span className="xs:hidden">Avslutt</span>
              </button>
            )}
            <button onClick={onEdit} className="btn-primary flex items-center gap-2 text-sm sm:text-base">
              <Edit className="w-4 h-4" />
              Rediger
            </button>
            <button onClick={onClose} className="btn-secondary text-sm sm:text-base">
              Tilbake
            </button>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="card">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Ordreinformasjon</h2>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Type</p>
                <p className="text-sm sm:text-base text-gray-900 dark:text-white">{ordre.type}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Status</p>
                <span className={`badge ${ORDRE_STATUS_COLORS[ordre.status] || 'badge-info'}`}>
                  {ordre.status}
                </span>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Kunde</p>
                <p className="text-sm sm:text-base text-gray-900 dark:text-white truncate">{ordre.customer?.navn || 'Ukjent kunde'}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Anlegg</p>
                <p className="text-sm sm:text-base text-gray-900 dark:text-white truncate">{ordre.anlegg?.anleggsnavn || 'Ukjent anlegg'}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Tekniker</p>
                <p className="text-sm sm:text-base text-gray-900 dark:text-white">{ordre.tekniker?.navn || 'Ikke tildelt'}</p>
              </div>
              {ordre.kontrolltype && ordre.kontrolltype.length > 0 && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-2">Kontrolltyper</p>
                  <div className="flex flex-wrap gap-2">
                    {ordre.kontrolltype.map((type, idx) => (
                      <span key={idx} className="badge badge-info text-xs">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {ordre.kommentar && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Kommentar</p>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">{ordre.kommentar}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="card">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Metadata</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Opprettet</p>
                <p className="text-sm text-gray-900 dark:text-white">{formatDate(ordre.opprettet_dato)}</p>
              </div>
              {ordre.sist_oppdatert && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 mb-1">Sist oppdatert</p>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDate(ordre.sist_oppdatert)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
