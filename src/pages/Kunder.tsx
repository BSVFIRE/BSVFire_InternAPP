import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { Plus, Search, Building, Mail, Phone, Edit, Trash2, Eye, ExternalLink, Loader2, DollarSign, Building2, MapPin, ChevronRight, AlertTriangle, X, Package, ClipboardList, FileText } from 'lucide-react'
import { checkDropboxStatus, createDropboxFolder } from '@/services/dropboxServiceV2'
import { KUNDE_FOLDERS } from '@/services/dropboxFolderStructure'
import { formatDate } from '@/lib/utils'
import { searchCompaniesByName, getCompanyByOrgNumber, formatOrgNumber, extractAddress, type BrregEnhet } from '@/lib/brregApi'
import { useNavigate, useLocation } from 'react-router-dom'

const log = createLogger('Kunder')

interface Kunde {
  id: string
  navn: string
  type: string | null
  organisasjonsnummer: string | null
  kontaktperson_id: string | null
  opprettet: string
  sist_oppdatert: string | null
  kunde_nummer: string | null
  anlegg_count?: number
  skjult?: boolean
}

type SortOption = 'navn_asc' | 'navn_desc' | 'opprettet_nyeste' | 'opprettet_eldste' | 'uten_anlegg'

// Interfaces for related data
interface RelatedAnlegg {
  id: string
  anleggsnavn: string
}

interface RelatedOrdre {
  id: string
  ordre_nummer: string
  type: string
  status: string
}

interface RelatedOppgave {
  id: string
  tittel: string
  status: string
}

interface RelatedTilbud {
  id: string
  tilbudsnummer: string
  status: string
}

interface RelatedData {
  anlegg: RelatedAnlegg[]
  ordre: RelatedOrdre[]
  oppgaver: RelatedOppgave[]
  tilbud: RelatedTilbud[]
}

export function Kunder() {
  const location = useLocation()
  const state = location.state as { viewKundeId?: string } | null
  
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedKunde, setSelectedKunde] = useState<Kunde | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'view'>('list')
  const [sortBy, setSortBy] = useState<SortOption>('navn_asc')
  const scrollPositionRef = useRef<number>(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [kundeToDelete, setKundeToDelete] = useState<Kunde | null>(null)
  const [showSkjulteKunder, setShowSkjulteKunder] = useState(false)

  useEffect(() => {
    loadKunder()
  }, [showSkjulteKunder])

  // Åpne kunde i visningsmodus hvis sendt via state (fra anlegg)
  useEffect(() => {
    if (state?.viewKundeId && kunder.length > 0) {
      const kundeToView = kunder.find(k => k.id === state.viewKundeId)
      if (kundeToView) {
        setSelectedKunde(kundeToView)
        setViewMode('view')
        // Nullstill state for å unngå at det trigges på nytt
        window.history.replaceState({}, document.title)
      }
    }
  }, [state?.viewKundeId, kunder])

  // Restore scroll position when returning to list view
  useEffect(() => {
    if (viewMode === 'list' && scrollPositionRef.current > 0) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        window.scrollTo(0, scrollPositionRef.current)
      }, 0)
    }
  }, [viewMode])

  async function loadKunder() {
    try {
      setError(null)
      let query = supabase
        .from('customer')
        .select('*')
      
      // Filtrer ut skjulte kunder hvis ikke showSkjulteKunder er aktivert
      if (!showSkjulteKunder) {
        query = query.or('skjult.is.null,skjult.eq.false')
      }
      
      const { data, error } = await query.order('navn', { ascending: true })

      if (error) {
        log.error('Supabase error ved lasting av kunder', { error })
        throw new Error(error.message)
      }
      
      // Hent antall anlegg for hver kunde
      const kunderMedAnleggCount = await Promise.all(
        (data || []).map(async (kunde) => {
          const { data: anlegg } = await supabase
            .from('anlegg')
            .select('id', { count: 'exact' })
            .eq('kundenr', kunde.id)
          
          return {
            ...kunde,
            anlegg_count: anlegg?.length || 0
          }
        })
      )
      
      setKunder(kunderMedAnleggCount)
    } catch (err) {
      log.error('Feil ved lasting av kunder', { error: err })
      setError(err instanceof Error ? err.message : 'Kunne ikke laste kunder')
    } finally {
      setLoading(false)
    }
  }

  function openDeleteModal(kunde: Kunde) {
    setKundeToDelete(kunde)
    setShowDeleteModal(true)
  }

  async function handleDeleteComplete() {
    setShowDeleteModal(false)
    setKundeToDelete(null)
    await loadKunder()
  }

  const filteredKunder = kunder.filter(kunde =>
    kunde.navn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kunde.organisasjonsnummer?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sortering
  const sortedKunder = [...filteredKunder].sort((a, b) => {
    switch (sortBy) {
      case 'navn_asc':
        return a.navn.localeCompare(b.navn, 'nb-NO')
      case 'navn_desc':
        return b.navn.localeCompare(a.navn, 'nb-NO')
      case 'opprettet_nyeste':
        return new Date(b.opprettet).getTime() - new Date(a.opprettet).getTime()
      case 'opprettet_eldste':
        return new Date(a.opprettet).getTime() - new Date(b.opprettet).getTime()
      case 'uten_anlegg':
        // Sorter kunder uten anlegg først, deretter alfabetisk
        const aCount = a.anlegg_count || 0
        const bCount = b.anlegg_count || 0
        if (aCount === bCount) {
          return a.navn.localeCompare(b.navn, 'nb-NO')
        }
        return aCount - bCount
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Laster kunder...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Kunder</h1>
          <p className="text-gray-500 dark:text-gray-400">Administrer kunderegisteret</p>
        </div>
        <div className="card bg-red-900/20 border-red-800">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Building className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">Kunne ikke laste kunder</h3>
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <button onClick={loadKunder} className="btn-primary text-sm">
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
      <KundeForm
        kunde={selectedKunde}
        onSave={async (createdKundeNavn) => {
          await loadKunder()
          setViewMode('list')
          setSelectedKunde(null)
          // Hvis en ny kunde ble opprettet, sett søkefeltet til kundenavnet
          if (createdKundeNavn) {
            setSearchTerm(createdKundeNavn)
            scrollPositionRef.current = 0 // Reset scroll for new customer
          }
        }}
        onCancel={() => {
          setViewMode('list')
          setSelectedKunde(null)
        }}
      />
    )
  }

  if (viewMode === 'view' && selectedKunde) {
    return (
      <KundeDetails
        kunde={selectedKunde}
        onEdit={() => setViewMode('edit')}
        onClose={() => {
          setViewMode('list')
          setSelectedKunde(null)
        }}
      />
    )
  }

  // Function to save scroll position before changing view
  const handleViewChange = (mode: 'create' | 'edit' | 'view', kunde?: Kunde | null) => {
    scrollPositionRef.current = window.scrollY
    setViewMode(mode)
    if (kunde !== undefined) {
      setSelectedKunde(kunde)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Kunder</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Administrer kunderegisteret</p>
        </div>
        <button
          onClick={() => {
            scrollPositionRef.current = 0 // Reset scroll for new customer
            setSelectedKunde(null)
            setViewMode('create')
          }}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden xs:inline">Ny kunde</span>
          <span className="xs:hidden">Ny</span>
        </button>
      </div>

      {/* Search and Sort */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter kunde eller org.nr..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="md:w-64">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="input"
            >
              <option value="navn_asc">Navn (A-Å)</option>
              <option value="navn_desc">Navn (Å-A)</option>
              <option value="opprettet_nyeste">Nyeste først</option>
              <option value="opprettet_eldste">Eldste først</option>
              <option value="uten_anlegg">Uten anlegg først</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vis skjulte kunder checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showSkjulteKunder"
          checked={showSkjulteKunder}
          onChange={(e) => setShowSkjulteKunder(e.target.checked)}
          className="w-4 h-4 text-primary rounded border-gray-300 dark:border-gray-600 focus:ring-primary"
        />
        <label htmlFor="showSkjulteKunder" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          Vis skjulte kunder
        </label>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="card">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-lg flex-shrink-0">
              <Building className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm truncate">Totalt kunder</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{kunder.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-green-500/10 rounded-lg flex-shrink-0">
              <Building className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm truncate">Med kontaktperson</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {kunder.filter(k => k.kontaktperson_id).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-yellow-500/10 rounded-lg flex-shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm truncate">Uten anlegg</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {kunder.filter(k => (k.anlegg_count || 0) === 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Kunde Liste */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Kundeliste
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-normal">
              ({sortedKunder.length} {sortedKunder.length === 1 ? 'kunde' : 'kunder'})
            </span>
          </h2>
        </div>
        
        {sortedKunder.length === 0 ? (
          <div className="text-center py-12">
            <Building className="w-12 h-12 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Ingen kunder funnet' : 'Ingen kunder registrert ennå'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile kortvisning */}
            <div className="block lg:hidden space-y-3">
              {sortedKunder.map((kunde) => (
                <div
                  key={kunde.id}
                  onClick={() => handleViewChange('view', kunde)}
                  className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-gray-900 dark:text-white font-medium">{kunde.navn}</p>
                        {kunde.skjult && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-500/10 text-gray-600 dark:text-gray-400 rounded-full flex-shrink-0">
                            Skjult
                          </span>
                        )}
                        {kunde.anlegg_count === 0 && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-full flex-shrink-0">
                            Ingen anlegg
                          </span>
                        )}
                      </div>
                      {kunde.organisasjonsnummer && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Org.nr: {kunde.organisasjonsnummer}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <Building2 className="w-4 h-4" />
                        {kunde.anlegg_count || 0} anlegg
                      </span>
                      {kunde.kunde_nummer && (
                        <span className="text-gray-500 dark:text-gray-400">
                          #{kunde.kunde_nummer}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop tabellvisning */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Navn</th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Antall anlegg</th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Kundenummer</th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Opprettet</th>
                    <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Handlinger</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedKunder.map((kunde) => (
                  <tr
                    key={kunde.id}
                    onClick={() => handleViewChange('view', kunde)}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900 dark:text-white font-medium">{kunde.navn}</p>
                            {kunde.skjult && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-gray-500/10 text-gray-600 dark:text-gray-400 rounded-full">
                                Skjult
                              </span>
                            )}
                            {kunde.anlegg_count === 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-full">
                                Ingen anlegg
                              </span>
                            )}
                          </div>
                          {kunde.organisasjonsnummer && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Org.nr: {kunde.organisasjonsnummer}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {kunde.anlegg_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300">
                      {kunde.kunde_nummer || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300 text-sm">
                      {formatDate(kunde.opprettet)}
                    </td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewChange('view', kunde)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Vis detaljer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewChange('edit', kunde)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Rediger"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(kunde)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
          </>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && kundeToDelete && (
        <DeleteKundeModal
          kunde={kundeToDelete}
          onClose={() => {
            setShowDeleteModal(false)
            setKundeToDelete(null)
          }}
          onDeleted={handleDeleteComplete}
        />
      )}
    </div>
  )
}

// Delete Kunde Modal Component
interface DeleteKundeModalProps {
  kunde: Kunde
  onClose: () => void
  onDeleted: () => void
}

function DeleteKundeModal({ kunde, onClose, onDeleted }: DeleteKundeModalProps) {
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [relatedData, setRelatedData] = useState<RelatedData>({
    anlegg: [],
    ordre: [],
    oppgaver: [],
    tilbud: []
  })
  const [alleKunder, setAlleKunder] = useState<{ id: string; navn: string }[]>([])
  
  // Valg for hva som skal gjøres med tilknyttede data
  const [anleggAction, setAnleggAction] = useState<'keep' | 'unlink' | 'move'>('keep')
  const [moveToKundeId, setMoveToKundeId] = useState<string>('')
  const [ordreAction, setOrdreAction] = useState<'keep' | 'complete'>('keep')
  const [oppgaverAction, setOppgaverAction] = useState<'keep' | 'complete'>('keep')

  useEffect(() => {
    loadRelatedData()
    loadAlleKunder()
  }, [kunde.id])

  async function loadAlleKunder() {
    const { data } = await supabase
      .from('customer')
      .select('id, navn')
      .or('skjult.is.null,skjult.eq.false')
      .neq('id', kunde.id)
      .order('navn')
    setAlleKunder(data || [])
  }

  async function loadRelatedData() {
    setLoading(true)
    try {
      // Hent anlegg
      const { data: anlegg } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn')
        .eq('kundenr', kunde.id)

      // Hent ordre (via kundenr)
      const { data: ordreData } = await supabase
        .from('ordre')
        .select('id, ordre_nummer, type, status')
        .eq('kundenr', kunde.id)
        .neq('status', 'Fullført')
        .neq('status', 'Fakturert')

      // Hent oppgaver knyttet til kunde (ikke fullførte)
      const { data: oppgaver } = await supabase
        .from('oppgaver')
        .select('id, tittel, status')
        .eq('kunde_id', kunde.id)
        .neq('status', 'fullfort')

      // Hent tilbud knyttet til kunde
      const { data: tilbud } = await supabase
        .from('serviceavtale_tilbud')
        .select('id, tilbudsnummer, status')
        .eq('kunde_id', kunde.id)

      setRelatedData({
        anlegg: anlegg || [],
        ordre: ordreData || [],
        oppgaver: oppgaver || [],
        tilbud: tilbud || []
      })
    } catch (error) {
      log.error('Feil ved lasting av relaterte data', { error, kundeId: kunde.id })
    } finally {
      setLoading(false)
    }
  }

  async function handleHideKunde() {
    if (!confirm('Er du sikker på at du vil skjule denne kunden med de valgte handlingene?')) return

    setDeleting(true)
    try {
      // 1. Håndter anlegg
      if (relatedData.anlegg.length > 0) {
        if (anleggAction === 'unlink') {
          // Fjern kundekobling fra anlegg
          await supabase
            .from('anlegg')
            .update({ kundenr: null })
            .eq('kundenr', kunde.id)
        } else if (anleggAction === 'move' && moveToKundeId) {
          // Flytt anlegg til annen kunde
          await supabase
            .from('anlegg')
            .update({ kundenr: moveToKundeId })
            .eq('kundenr', kunde.id)
        }
      }

      // 2. Håndter ordre
      if (relatedData.ordre.length > 0 && ordreAction === 'complete') {
        await supabase
          .from('ordre')
          .update({ status: 'Fullført' })
          .eq('kundenr', kunde.id)
          .neq('status', 'Fullført')
          .neq('status', 'Fakturert')
      }

      // 3. Håndter oppgaver
      if (relatedData.oppgaver.length > 0 && oppgaverAction === 'complete') {
        await supabase
          .from('oppgaver')
          .update({ status: 'fullfort' })
          .eq('kunde_id', kunde.id)
          .neq('status', 'fullfort')
      }

      // 4. Soft delete - sett skjult til true
      const { error } = await supabase
        .from('customer')
        .update({ skjult: true })
        .eq('id', kunde.id)

      if (error) {
        log.error('Feil ved skjuling av kunde', { error })
        throw error
      }

      log.info('Kunde skjult', { 
        kundeId: kunde.id, 
        kundeNavn: kunde.navn,
        anleggAction,
        ordreAction,
        oppgaverAction
      })
      onDeleted()
    } catch (error: any) {
      log.error('Feil ved skjuling av kunde', { error, kundeId: kunde.id })
      alert('Kunne ikke skjule kunde. Prøv igjen.')
    } finally {
      setDeleting(false)
    }
  }

  const hasRelatedData = relatedData.anlegg.length > 0 || 
                         relatedData.ordre.length > 0 || 
                         relatedData.oppgaver.length > 0 || 
                         relatedData.tilbud.length > 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Eye className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Skjul kunde</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{kunde.navn}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Kunden vil bli skjult fra kundelisten. Velg hva som skal skje med tilknyttede data.
                </p>
              </div>

              {/* Anlegg */}
              {relatedData.anlegg.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {relatedData.anlegg.length} anlegg
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 ml-7">
                    {relatedData.anlegg.map(a => a.anleggsnavn).join(', ')}
                  </div>
                  <div className="space-y-2 ml-7">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="anleggAction"
                        checked={anleggAction === 'keep'}
                        onChange={() => setAnleggAction('keep')}
                        className="text-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Behold tilknytning (anlegg blir skjult med kunden)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="anleggAction"
                        checked={anleggAction === 'unlink'}
                        onChange={() => setAnleggAction('unlink')}
                        className="text-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Fjern kundekobling (anlegg blir uten kunde)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="anleggAction"
                        checked={anleggAction === 'move'}
                        onChange={() => setAnleggAction('move')}
                        className="text-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Flytt til annen kunde</span>
                    </label>
                    {anleggAction === 'move' && (
                      <select
                        value={moveToKundeId}
                        onChange={(e) => setMoveToKundeId(e.target.value)}
                        className="input ml-6 mt-2"
                      >
                        <option value="">Velg kunde...</option>
                        {alleKunder.map(k => (
                          <option key={k.id} value={k.id}>{k.navn}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* Ordre */}
              {relatedData.ordre.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-500" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {relatedData.ordre.length} aktive ordre
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 ml-7">
                    {relatedData.ordre.map(o => o.ordre_nummer).join(', ')}
                  </div>
                  <div className="space-y-2 ml-7">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="ordreAction"
                        checked={ordreAction === 'keep'}
                        onChange={() => setOrdreAction('keep')}
                        className="text-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Behold status</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="ordreAction"
                        checked={ordreAction === 'complete'}
                        onChange={() => setOrdreAction('complete')}
                        className="text-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Sett alle til Fullført</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Oppgaver */}
              {relatedData.oppgaver.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-500" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {relatedData.oppgaver.length} aktive oppgaver
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 ml-7">
                    {relatedData.oppgaver.map(o => o.tittel).join(', ')}
                  </div>
                  <div className="space-y-2 ml-7">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="oppgaverAction"
                        checked={oppgaverAction === 'keep'}
                        onChange={() => setOppgaverAction('keep')}
                        className="text-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Behold status</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="oppgaverAction"
                        checked={oppgaverAction === 'complete'}
                        onChange={() => setOppgaverAction('complete')}
                        className="text-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Sett alle til Fullført</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Tilbud */}
              {relatedData.tilbud.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {relatedData.tilbud.length} tilbud
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">(bevares)</span>
                  </div>
                </div>
              )}

              {!hasRelatedData && (
                <div className="text-center py-4">
                  <p className="text-gray-600 dark:text-gray-300">Ingen tilknyttede data funnet.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={handleHideKunde}
            disabled={deleting || loading || (anleggAction === 'move' && !moveToKundeId)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Skjuler...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Skjul kunde
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Kunde Form Component
interface KundeFormProps {
  kunde: Kunde | null
  onSave: (createdKundeNavn?: string) => void
  onCancel: () => void
}

function KundeForm({ kunde, onSave, onCancel }: KundeFormProps) {
  const [formData, setFormData] = useState({
    navn: kunde?.navn || '',
    organisasjonsnummer: kunde?.organisasjonsnummer || '',
    kontaktperson_id: kunde?.kontaktperson_id || '',
    kunde_nummer: kunde?.kunde_nummer || '',
  })
  const [kontaktpersoner, setKontaktpersoner] = useState<any[]>([])
  const [kontaktpersonSearch, setKontaktpersonSearch] = useState('')
  const [showKontaktpersonForm, setShowKontaktpersonForm] = useState(false)
  const [newKontaktperson, setNewKontaktperson] = useState({ navn: '', epost: '', telefon: '' })
  const [savingKontaktperson, setSavingKontaktperson] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BrregEnhet[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [orgNumberLookup, setOrgNumberLookup] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const resultsRef = useRef<HTMLDivElement>(null)

  // Last kontaktpersoner
  useEffect(() => {
    loadKontaktpersoner()
  }, [])

  async function loadKontaktpersoner() {
    try {
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .select('id, navn, epost, telefon')
        .order('navn', { ascending: true })

      if (error) throw error
      setKontaktpersoner(data || [])
    } catch (error) {
      log.error('Feil ved lasting av kontaktpersoner', { error })
    }
  }

  async function handleCreateKontaktperson() {
    if (!newKontaktperson.navn.trim()) {
      alert('Navn er påkrevd')
      return
    }

    setSavingKontaktperson(true)
    try {
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .insert([{
          navn: newKontaktperson.navn,
          epost: newKontaktperson.epost || null,
          telefon: newKontaktperson.telefon || null
        }])
        .select()
        .single()

      if (error) throw error

      // Oppdater listen og velg den nye kontaktpersonen
      await loadKontaktpersoner()
      setFormData({ ...formData, kontaktperson_id: data.id })
      setShowKontaktpersonForm(false)
      setNewKontaktperson({ navn: '', epost: '', telefon: '' })
    } catch (error) {
      log.error('Feil ved opprettelse av kontaktperson', { error, kontaktperson: newKontaktperson })
      alert('Kunne ikke opprette kontaktperson')
    } finally {
      setSavingKontaktperson(false)
    }
  }

  const filteredKontaktpersoner = kontaktpersoner.filter(kp =>
    kp.navn.toLowerCase().includes(kontaktpersonSearch.toLowerCase()) ||
    kp.epost?.toLowerCase().includes(kontaktpersonSearch.toLowerCase())
  )

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search companies by name with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchCompaniesByName(searchQuery, 10)
        setSearchResults(results)
        setShowResults(true)
      } catch (error) {
        log.error('Feil ved søk i Brreg', { error, searchTerm: searchQuery })
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  async function handleOrgNumberLookup() {
    if (!orgNumberLookup.trim()) return

    setLookingUp(true)
    try {
      const company = await getCompanyByOrgNumber(orgNumberLookup)
      if (company) {
        fillFormFromCompany(company)
      } else {
        alert('Fant ikke bedrift med dette organisasjonsnummeret')
      }
    } catch (error) {
      log.error('Feil ved oppslag i Brreg', { error, orgNumber: formData.organisasjonsnummer })
      alert('Kunne ikke hente bedriftsinformasjon')
    } finally {
      setLookingUp(false)
    }
  }

  function fillFormFromCompany(company: BrregEnhet) {
    setFormData({
      navn: company.navn,
      organisasjonsnummer: formatOrgNumber(company.organisasjonsnummer),
      kontaktperson_id: formData.kontaktperson_id, // Keep existing contact
      kunde_nummer: formData.kunde_nummer, // Keep existing customer number
    })
    setSearchQuery('')
    setOrgNumberLookup('')
    setShowResults(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      let isNewKunde = false
      
      // Prepare data - convert empty strings to null
      const dataToSave = {
        navn: formData.navn,
        organisasjonsnummer: formData.organisasjonsnummer || null,
        kontaktperson_id: formData.kontaktperson_id || null,
        kunde_nummer: formData.kunde_nummer || null,
      }
      
      if (kunde) {
        // Update
        const { error } = await supabase
          .from('customer')
          .update({
            ...dataToSave,
            sist_oppdatert: new Date().toISOString(),
          })
          .eq('id', kunde.id)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('customer')
          .insert([dataToSave])

        if (error) throw error
        isNewKunde = true
      }

      // Opprett Dropbox-mapper for ny kunde (i bakgrunnen)
      if (isNewKunde && formData.kunde_nummer) {
        createDropboxFoldersForKunde(formData.kunde_nummer, formData.navn)
      }

      // Vis advarsel hvis ny kunde uten kundenummer
      if (isNewKunde && !formData.kunde_nummer) {
        const status = await checkDropboxStatus()
        if (status.connected) {
          alert('⚠️ Kunde opprettet uten kundenummer\n\nDropbox-mapper ble ikke opprettet. For å synkronisere til Dropbox må du:\n\n1. Legg til kundenummer på kunden\n2. Gå til Admin → Dropbox Mapper\n3. Velg kunden og opprett mapper manuelt')
        }
      }

      // Send kundenavnet til onSave hvis det er en ny kunde
      onSave(isNewKunde ? formData.navn : undefined)
    } catch (error) {
      log.error('Feil ved lagring av kunde', { error, formData })
      alert('Kunne ikke lagre kunde')
    } finally {
      setSaving(false)
    }
  }

  // Opprett Dropbox-mapper i bakgrunnen
  async function createDropboxFoldersForKunde(kundeNummer: string, kundeNavn: string) {
    try {
      const status = await checkDropboxStatus()
      if (!status.connected) {
        log.warn('Dropbox ikke tilkoblet - hopper over mappeopprettelse')
        return
      }

      const safeKundeNavn = kundeNavn.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim()
      const basePath = `/NY MAPPESTRUKTUR 2026/01_KUNDER/${kundeNummer}_${safeKundeNavn}`

      log.info('Oppretter Dropbox-mapper for ny kunde', { kundeNummer, kundeNavn })

      for (const folder of KUNDE_FOLDERS) {
        await createDropboxFolder(`${basePath}/${folder}`)
      }

      log.info('Dropbox-mapper opprettet for kunde', { kundeNummer })
    } catch (error) {
      log.error('Feil ved opprettelse av Dropbox-mapper', { error, kundeNummer })
      // Ikke vis feil til bruker - dette er en bakgrunnsjobb
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {kunde ? 'Rediger kunde' : 'Ny kunde'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {kunde ? 'Oppdater kundeinformasjon' : 'Registrer ny kunde'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Brønnøysund Register Search */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Søk i Brønnøysundregistrene</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Søk etter bedrift eller organisasjonsnummer for å automatisk fylle ut kundeinformasjon
          </p>

          {/* Search by name */}
          <div className="relative" ref={resultsRef}>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Søk etter bedriftsnavn
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 pr-10"
                placeholder="Skriv inn bedriftsnavn..."
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-dark-200 border border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                {searchResults.map((company) => {
                  const address = extractAddress(company)
                  return (
                    <button
                      key={company.organisasjonsnummer}
                      type="button"
                      onClick={() => fillFormFromCompany(company)}
                      className="w-full text-left px-4 py-3 hover:bg-primary/10 border-b border-gray-200 dark:border-gray-800 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{company.navn}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Org.nr: {formatOrgNumber(company.organisasjonsnummer)}
                          </p>
                          {address.poststed && (
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                              {address.postnummer} {address.poststed}
                            </p>
                          )}
                        </div>
                        <Building className="w-5 h-5 text-primary flex-shrink-0" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {showResults && searchResults.length === 0 && !searching && searchQuery.length >= 2 && (
              <div className="absolute z-10 w-full mt-2 bg-dark-200 border border-gray-700 rounded-lg shadow-xl p-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center">Ingen bedrifter funnet</p>
              </div>
            )}
          </div>

          {/* Search by org number */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                Eller søk med organisasjonsnummer
              </label>
              <input
                type="text"
                value={orgNumberLookup}
                onChange={(e) => setOrgNumberLookup(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleOrgNumberLookup())}
                className="input"
                placeholder="123 456 789"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleOrgNumberLookup}
                disabled={lookingUp || !orgNumberLookup.trim()}
                className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {lookingUp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Søker...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Søk
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Manual Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Kundenavn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.navn}
              onChange={(e) => setFormData({ ...formData, navn: e.target.value })}
              className="input"
              placeholder="Bedriftsnavn AS"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Organisasjonsnummer
            </label>
            <input
              type="text"
              value={formData.organisasjonsnummer}
              onChange={(e) => setFormData({ ...formData, organisasjonsnummer: e.target.value })}
              className="input"
              placeholder="123 456 789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Kundenummer
            </label>
            <input
              type="text"
              value={formData.kunde_nummer}
              onChange={(e) => setFormData({ ...formData, kunde_nummer: e.target.value })}
              className="input"
              placeholder="10549"
            />
            {/* Advarsel ved endring av kundenummer på eksisterende kunde */}
            {kunde && kunde.kunde_nummer && formData.kunde_nummer !== kunde.kunde_nummer && (
              <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-500">OBS! Kundenummer endres</p>
                    <p className="text-yellow-400/80 mt-1">
                      Hvis denne kunden har mapper i Dropbox, må du også endre mappenavnet manuelt fra 
                      <span className="font-mono mx-1">{kunde.kunde_nummer}_{kunde.navn}</span>
                      til
                      <span className="font-mono mx-1">{formData.kunde_nummer}_{formData.navn || kunde.navn}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Kontaktperson
            </label>
            
            {!showKontaktpersonForm ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Søk etter kontaktperson..."
                  value={kontaktpersonSearch}
                  onChange={(e) => setKontaktpersonSearch(e.target.value)}
                  className="input"
                />
                <select
                  value={formData.kontaktperson_id}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      kontaktperson_id: e.target.value
                    })
                  }}
                  className="input"
                  size={5}
                >
                  <option value="">Ingen valgt</option>
                  {filteredKontaktpersoner.map((kp) => (
                    <option key={kp.id} value={kp.id}>
                      {kp.navn} {kp.epost ? `(${kp.epost})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowKontaktpersonForm(true)}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Opprett ny kontaktperson
                </button>
              </div>
            ) : (
              <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white">Ny kontaktperson</h3>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Navn *</label>
                  <input
                    type="text"
                    value={newKontaktperson.navn}
                    onChange={(e) => setNewKontaktperson({ ...newKontaktperson, navn: e.target.value })}
                    className="input"
                    placeholder="Navn"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">E-post</label>
                  <input
                    type="email"
                    value={newKontaktperson.epost}
                    onChange={(e) => setNewKontaktperson({ ...newKontaktperson, epost: e.target.value })}
                    className="input"
                    placeholder="epost@eksempel.no"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={newKontaktperson.telefon}
                    onChange={(e) => setNewKontaktperson({ ...newKontaktperson, telefon: e.target.value })}
                    className="input"
                    placeholder="+47 123 45 678"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateKontaktperson}
                    disabled={savingKontaktperson}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {savingKontaktperson ? 'Oppretter...' : 'Opprett'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowKontaktpersonForm(false)
                      setNewKontaktperson({ navn: '', epost: '', telefon: '' })
                    }}
                    className="btn-secondary flex-1"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Lagrer...' : kunde ? 'Oppdater kunde' : 'Opprett kunde'}
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
  )
}

// Kunde Details Component
interface KundeDetailsProps {
  kunde: Kunde
  onEdit: () => void
  onClose: () => void
}

function KundeDetails({ kunde, onEdit, onClose }: KundeDetailsProps) {
  const navigate = useNavigate()
  const [priser, setPriser] = useState<any[]>([])
  const [anlegg, setAnlegg] = useState<any[]>([])
  const [loadingPriser, setLoadingPriser] = useState(true)
  const [kontaktperson, setKontaktperson] = useState<any>(null)

  useEffect(() => {
    loadServiceavtaler()
    loadKontaktperson()
  }, [kunde.id])

  async function loadKontaktperson() {
    if (!kunde.kontaktperson_id) return
    
    try {
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .select('*')
        .eq('id', kunde.kontaktperson_id)
        .single()

      if (error) throw error
      setKontaktperson(data)
    } catch (error) {
      log.error('Feil ved lasting av kontaktperson', { error, kontaktpersonId: kunde.kontaktperson_id })
    }
  }

  async function loadServiceavtaler() {
    try {
      // Hent alle anlegg for denne kunden
      const { data: anleggData, error: anleggError } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn, adresse, postnummer, poststed, kontroll_status, kontroll_maaned')
        .eq('kundenr', kunde.id)
        .order('anleggsnavn', { ascending: true })

      if (anleggError) throw anleggError

      setAnlegg(anleggData || [])

      // Hent priser for disse anleggene
      if (anleggData && anleggData.length > 0) {
        const anleggIds = anleggData.map(a => a.id)
        const { data: priserData, error: priserError } = await supabase
          .from('priser_kundenummer')
          .select('*')
          .in('anlegg_id', anleggIds)

        if (priserError) throw priserError
        setPriser(priserData || [])
      }
    } catch (error) {
      log.error('Feil ved lasting av serviceavtaler', { error, kundeId: kunde.id })
    } finally {
      setLoadingPriser(false)
    }
  }

  // Beregn totalsummer
  const totalBrannalarm = priser.reduce((sum, p) => sum + (p.prisbrannalarm || 0), 0)
  const totalNodlys = priser.reduce((sum, p) => sum + (p.prisnodlys || 0), 0)
  const totalEkstern = priser.reduce((sum, p) => sum + (p.prisekstern || 0), 0)
  const totalSlukkeutstyr = priser.reduce((sum, p) => sum + (p.prisslukkeutstyr || 0), 0)
  const totalRoykluker = priser.reduce((sum, p) => sum + (p.prisroykluker || 0), 0)
  const totalSum = totalBrannalarm + totalNodlys + totalEkstern + totalSlukkeutstyr + totalRoykluker

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">{kunde.navn}</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Kundedetaljer</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onEdit} className="btn-primary flex items-center gap-2 text-sm sm:text-base">
            <Edit className="w-4 h-4" />
            <span className="hidden xs:inline">Rediger</span>
          </button>
          <button onClick={onClose} className="btn-secondary text-sm sm:text-base">
            Tilbake
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">Kontaktinformasjon</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Kundenummer</p>
                <p className="text-gray-900 dark:text-white">{kunde.kunde_nummer || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Organisasjonsnummer</p>
                <p className="text-gray-900 dark:text-white">{kunde.organisasjonsnummer || '-'}</p>
              </div>
              {kontaktperson && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Kontaktperson</p>
                  <p className="text-gray-900 dark:text-white font-medium">{kontaktperson.navn}</p>
                  {kontaktperson.telefon && (
                    <div className="flex items-center gap-2 mt-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">{kontaktperson.telefon}</p>
                    </div>
                  )}
                  {kontaktperson.epost && (
                    <div className="flex items-center gap-2 mt-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">{kontaktperson.epost}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Anlegg */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Anlegg</h2>
              </div>
              <button
                onClick={() => navigate('/anlegg', { state: { createForKundeId: kunde.id, createForKundeNavn: kunde.navn } })}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nytt anlegg</span>
              </button>
            </div>
            {loadingPriser ? (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
              </div>
            ) : anlegg.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Ingen anlegg registrert</p>
            ) : (
              <div className="space-y-3">
                {anlegg.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigate('/anlegg', { state: { viewAnleggId: a.id, returnTo: 'kunde', returnKundeId: kunde.id } })}
                    className="w-full text-left p-4 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                          {a.anleggsnavn}
                        </h3>
                        {(a.adresse || a.poststed) && (
                          <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                              {a.adresse && <p>{a.adresse}</p>}
                              {a.poststed && (
                                <p>{a.postnummer} {a.poststed}</p>
                              )}
                            </div>
                          </div>
                        )}
                        {a.kontroll_maaned && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Kontrollmåned: {a.kontroll_maaned}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {a.kontroll_status && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            a.kontroll_status === 'Godkjent' ? 'bg-green-500/20 text-green-400' :
                            a.kontroll_status === 'Avvik' ? 'bg-red-500/20 text-red-400' :
                            a.kontroll_status === 'Venter' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {a.kontroll_status}
                          </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="space-y-6">
          {/* Serviceavtaler */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Serviceavtaler</h2>
            </div>
            {loadingPriser ? (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
              </div>
            ) : anlegg.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Ingen anlegg registrert</p>
            ) : priser.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Ingen priser registrert</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {totalBrannalarm > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Brannalarm</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {totalBrannalarm.toLocaleString('nb-NO')} kr
                      </span>
                    </div>
                  )}
                  {totalNodlys > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Nødlys</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {totalNodlys.toLocaleString('nb-NO')} kr
                      </span>
                    </div>
                  )}
                  {totalEkstern > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Ekstern</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {totalEkstern.toLocaleString('nb-NO')} kr
                      </span>
                    </div>
                  )}
                  {totalSlukkeutstyr > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Slukkeutstyr</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {totalSlukkeutstyr.toLocaleString('nb-NO')} kr
                      </span>
                    </div>
                  )}
                  {totalRoykluker > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Røykluker</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {totalRoykluker.toLocaleString('nb-NO')} kr
                      </span>
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="text-lg font-bold text-primary">
                      {totalSum.toLocaleString('nb-NO')} kr
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {anlegg.length} {anlegg.length === 1 ? 'anlegg' : 'anlegg'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Metadata</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Opprettet</p>
                <p className="text-gray-900 dark:text-white text-sm">{formatDate(kunde.opprettet)}</p>
              </div>
              {kunde.sist_oppdatert && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sist oppdatert</p>
                  <p className="text-gray-900 dark:text-white text-sm">{formatDate(kunde.sist_oppdatert)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
