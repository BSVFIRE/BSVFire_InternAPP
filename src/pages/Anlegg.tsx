import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { Plus, Search, Building2, MapPin, Edit, Trash2, Eye, Calendar, AlertCircle, User, Mail, Phone, Star, FileText, ExternalLink, QrCode, Link2, ClipboardList, DollarSign, Download, Loader2, CheckCircle } from 'lucide-react'
import { GoogleMapsAddressAutocomplete } from '@/components/GoogleMapsAddressAutocomplete'
import { formatDate } from '@/lib/utils'
import { useNavigate, useLocation } from 'react-router-dom'
import { ANLEGG_STATUSER, ANLEGG_STATUS_COLORS, KONTROLLTYPER, MAANEDER } from '@/lib/constants'
import { syncAnleggToKontrollportal } from '@/lib/kontrollportal-sync'
import { searchCompaniesByName, formatOrgNumber, extractAddress, type BrregEnhet } from '@/lib/brregApi'

const log = createLogger('Anlegg')

interface Anlegg {
  id: string
  kundenr: string
  anleggsnavn: string
  org_nummer: string | null
  kunde_nummer: string | null
  adresse: string | null
  postnummer: string | null
  poststed: string | null
  kontroll_maaned: string | null
  kontroll_status: string | null
  kontroll_type: string[] | null
  unik_kode: string | null
  kontrollportal_url: string | null
  opprettet_dato: string
  sist_oppdatert: string | null
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

interface Kontaktperson {
  id: string
  navn: string
  epost: string | null
  telefon: string | null
  rolle: string | null
  primar: boolean
}

interface Dokument {
  id: string
  anlegg_id: string
  filnavn: string
  url: string
  type: string | null
  opplastet_dato: string
  opprettet_av: string | null
}

type SortOption = 'navn_asc' | 'navn_desc' | 'kunde' | 'poststed' | 'status' | 'kontroll_maaned'

export function Anlegg() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { editAnleggId?: string; viewAnleggId?: string } | null
  
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAnlegg, setSelectedAnlegg] = useState<Anlegg | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'view'>('list')
  const [sortBy, setSortBy] = useState<SortOption>('navn_asc')

  useEffect(() => {
    loadData()
  }, [])

  // Åpne anlegg i redigeringsmodus hvis sendt via state
  useEffect(() => {
    if (state?.editAnleggId && anlegg.length > 0) {
      const anleggToEdit = anlegg.find(a => a.id === state.editAnleggId)
      if (anleggToEdit) {
        setSelectedAnlegg(anleggToEdit)
        setViewMode('edit')
      }
    }
  }, [state?.editAnleggId, anlegg])

  // Åpne anlegg i visningsmodus hvis sendt via state (fra ordre)
  useEffect(() => {
    if (state?.viewAnleggId && anlegg.length > 0) {
      const anleggToView = anlegg.find(a => a.id === state.viewAnleggId)
      if (anleggToView) {
        setSelectedAnlegg(anleggToView)
        setViewMode('view')
        // Nullstill state for å unngå at det trigges på nytt
        window.history.replaceState({}, document.title)
      }
    }
  }, [state?.viewAnleggId, anlegg])

  async function loadData() {
    try {
      setError(null)
      
      // Hent anlegg og kunder parallelt
      const [anleggResponse, kunderResponse] = await Promise.all([
        supabase.from('anlegg').select('*').order('anleggsnavn', { ascending: true }),
        supabase.from('customer').select('id, navn')
      ])

      if (anleggResponse.error) throw new Error(anleggResponse.error.message)
      if (kunderResponse.error) throw new Error(kunderResponse.error.message)

      setAnlegg(anleggResponse.data || [])
      setKunder(kunderResponse.data || [])
    } catch (err) {
      log.error('Feil ved lasting av anlegg og kunder', { error: err })
      setError(err instanceof Error ? err.message : 'Kunne ikke laste data')
    } finally {
      setLoading(false)
    }
  }

  async function deleteAnlegg(id: string) {
    if (!confirm('Er du sikker på at du vil slette dette anlegget?')) return

    try {
      const { error } = await supabase.from('anlegg').delete().eq('id', id)
      if (error) throw error
      await loadData()
    } catch (error) {
      log.error('Feil ved sletting av anlegg', { error, anleggId: id })
      alert('Kunne ikke slette anlegg')
    }
  }

  function getKundeNavn(kundenr: string): string {
    const kunde = kunder.find(k => k.id === kundenr)
    return kunde?.navn || 'Ukjent kunde'
  }

  const filteredAnlegg = anlegg.filter(a =>
    a.anleggsnavn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.adresse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.poststed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getKundeNavn(a.kundenr).toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sortering
  const sortedAnlegg = [...filteredAnlegg].sort((a, b) => {
    switch (sortBy) {
      case 'navn_asc':
        return a.anleggsnavn.localeCompare(b.anleggsnavn, 'nb-NO')
      case 'navn_desc':
        return b.anleggsnavn.localeCompare(a.anleggsnavn, 'nb-NO')
      case 'kunde':
        return getKundeNavn(a.kundenr).localeCompare(getKundeNavn(b.kundenr), 'nb-NO')
      case 'poststed':
        return (a.poststed || '').localeCompare(b.poststed || '', 'nb-NO')
      case 'status':
        return (a.kontroll_status || '').localeCompare(b.kontroll_status || '', 'nb-NO')
      case 'kontroll_maaned':
        // Sorter etter måned (Januar = 1, Desember = 12, NA sist)
        const maanedOrder: Record<string, number> = {
          'Januar': 1, 'Februar': 2, 'Mars': 3, 'April': 4,
          'Mai': 5, 'Juni': 6, 'Juli': 7, 'August': 8,
          'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12,
          'NA': 99
        }
        const aOrder = maanedOrder[a.kontroll_maaned || 'NA'] || 99
        const bOrder = maanedOrder[b.kontroll_maaned || 'NA'] || 99
        return aOrder - bOrder
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400 dark:text-gray-400">Laster anlegg...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Anlegg</h1>
          <p className="text-gray-400 dark:text-gray-400">Administrer anlegg</p>
        </div>
        <div className="card bg-red-900/20 border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">Kunne ikke laste anlegg</h3>
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <button onClick={loadData} className="btn-primary text-sm">
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
      <AnleggForm
        anlegg={selectedAnlegg}
        kunder={kunder}
        onSave={async (createdAnleggNavn) => {
          await loadData()
          setViewMode('list')
          setSelectedAnlegg(null)
          // Hvis et nytt anlegg ble opprettet, sett søkefeltet til anleggsnavnet
          if (createdAnleggNavn) {
            setSearchTerm(createdAnleggNavn)
          }
        }}
        onCancel={() => {
          setViewMode('list')
          setSelectedAnlegg(null)
        }}
      />
    )
  }

  if (viewMode === 'view' && selectedAnlegg) {
    return (
      <AnleggDetailsWrapper
        anlegg={selectedAnlegg}
        kundeNavn={getKundeNavn(selectedAnlegg.kundenr)}
        onEdit={() => setViewMode('edit')}
        onClose={() => {
          setViewMode('list')
          setSelectedAnlegg(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Anlegg</h1>
          <p className="text-gray-400 dark:text-gray-400">Administrer anlegg og installasjoner</p>
        </div>
        <button
          onClick={() => {
            setSelectedAnlegg(null)
            setViewMode('create')
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nytt anlegg
        </button>
      </div>

      {/* Search and Sort */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter anlegg, kunde, adresse..."
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
              <option value="kunde">Kunde</option>
              <option value="kontroll_maaned">Kontrollmåned</option>
              <option value="poststed">Poststed</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Totalt anlegg</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{anlegg.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Calendar className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Utført</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {anlegg.filter(a => a.kontroll_status === ANLEGG_STATUSER.UTFORT).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Ikke utført</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {anlegg.filter(a => a.kontroll_status === ANLEGG_STATUSER.IKKE_UTFORT).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Planlagt</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {anlegg.filter(a => a.kontroll_status === ANLEGG_STATUSER.PLANLAGT).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Anlegg Liste */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Anleggsliste
            <span className="ml-2 text-sm text-gray-400 dark:text-gray-400 font-normal">
              ({sortedAnlegg.length} {sortedAnlegg.length === 1 ? 'anlegg' : 'anlegg'})
            </span>
          </h2>
        </div>
        
        {sortedAnlegg.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-gray-400">
              {searchTerm ? 'Ingen anlegg funnet' : 'Ingen anlegg registrert ennå'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Anlegg</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Kunde</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Adresse</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Kontrolltype</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {sortedAnlegg.map((anlegg) => (
                  <tr
                    key={anlegg.id}
                    onClick={() => {
                      setSelectedAnlegg(anlegg)
                      setViewMode('view')
                    }}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">{anlegg.anleggsnavn}</p>
                          {anlegg.kontroll_maaned && anlegg.kontroll_maaned !== 'NA' && (
                            <p className="text-sm text-gray-400 dark:text-gray-400">Kontroll: {anlegg.kontroll_maaned}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300">
                      {getKundeNavn(anlegg.kundenr)}
                    </td>
                    <td className="py-3 px-4">
                      {anlegg.adresse ? (
                        <div className="text-gray-500 dark:text-gray-300">
                          <p>{anlegg.adresse}</p>
                          {anlegg.postnummer && anlegg.poststed && (
                            <p className="text-sm text-gray-400 dark:text-gray-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {anlegg.postnummer} {anlegg.poststed}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {anlegg.kontroll_type && anlegg.kontroll_type.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {anlegg.kontroll_type.map((type, idx) => (
                            <span
                              key={idx}
                              className="badge badge-info text-xs"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {anlegg.kontroll_status ? (
                        <span className={`badge ${ANLEGG_STATUS_COLORS[anlegg.kontroll_status] || 'badge-info'}`}>
                          {anlegg.kontroll_status}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {anlegg.kontrollportal_url && (
                          <a
                            href={anlegg.kontrollportal_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-gray-400 dark:text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                            title="Åpne Kontrollportal"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate('/priser', { state: { anleggId: anlegg.id, kundeId: anlegg.kundenr } })
                          }}
                          className="p-2 text-gray-400 dark:text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                          title="Kontrollpriser"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedAnlegg(anlegg)
                            setViewMode('view')
                          }}
                          className="p-2 text-gray-400 dark:text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Vis detaljer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedAnlegg(anlegg)
                            setViewMode('edit')
                          }}
                          className="p-2 text-gray-400 dark:text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Rediger"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteAnlegg(anlegg.id)
                          }}
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
  )
}

// Anlegg Form Component
interface AnleggFormProps {
  anlegg: Anlegg | null
  kunder: Kunde[]
  onSave: (createdAnleggNavn?: string) => void
  onCancel: () => void
}

function AnleggForm({ anlegg, kunder, onSave, onCancel }: AnleggFormProps) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    kundenr: anlegg?.kundenr || '',
    anleggsnavn: anlegg?.anleggsnavn || '',
    org_nummer: anlegg?.org_nummer || '',
    kunde_nummer: anlegg?.kunde_nummer || '',
    adresse: anlegg?.adresse || '',
    postnummer: anlegg?.postnummer || '',
    poststed: anlegg?.poststed || '',
    kontroll_maaned: anlegg?.kontroll_maaned || '',
    kontroll_status: anlegg?.kontroll_status || '',
    kontroll_type: anlegg?.kontroll_type || [],
    unik_kode: anlegg?.unik_kode || '',
    kontrollportal_url: anlegg?.kontrollportal_url || '',
    brannalarm_fullfort: anlegg?.brannalarm_fullfort || false,
    nodlys_fullfort: anlegg?.nodlys_fullfort || false,
    roykluker_fullfort: anlegg?.roykluker_fullfort || false,
    slukkeutstyr_fullfort: anlegg?.slukkeutstyr_fullfort || false,
    ekstern_fullfort: anlegg?.ekstern_fullfort || false,
  })
  const [saving, setSaving] = useState(false)
  const [alleKontaktpersoner, setAlleKontaktpersoner] = useState<Kontaktperson[]>([])
  const [valgteKontakter, setValgteKontakter] = useState<string[]>([])
  const [primaerKontakt, setPrimaerKontakt] = useState<string>('')
  const [visNyKontakt, setVisNyKontakt] = useState(false)
  const [kontaktSok, setKontaktSok] = useState('')
  const [nyKontakt, setNyKontakt] = useState({
    navn: '',
    epost: '',
    telefon: '',
    rolle: ''
  })
  const [kundeSok, setKundeSok] = useState('')
  const [visKundeListe, setVisKundeListe] = useState(false)
  const kundeDropdownRef = useRef<HTMLDivElement>(null)
  const [visSlettKundeDialog, setVisSlettKundeDialog] = useState(false)
  const [gammelKundeId, setGammelKundeId] = useState<string | null>(null)
  const [gammelKundeNavn, setGammelKundeNavn] = useState<string>('')
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const [brregSearchQuery, setBrregSearchQuery] = useState('')
  const [brregSearchResults, setBrregSearchResults] = useState<BrregEnhet[]>([])
  const [showBrregResults, setShowBrregResults] = useState(false)
  const [brregSearching, setBrregSearching] = useState(false)
  const brregSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const brregResultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadKontaktpersoner()
    if (anlegg) {
      loadAnleggsKontakter()
    }
  }, [anlegg])

  // Initialiser kundesøk med valgt kunde
  useEffect(() => {
    if (formData.kundenr && kunder.length > 0) {
      const kunde = kunder.find(k => k.id === formData.kundenr)
      if (kunde) {
        setKundeSok(kunde.navn)
      }
    }
  }, [formData.kundenr, kunder])

  // Lukk dropdown ved klikk utenfor
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (kundeDropdownRef.current && !kundeDropdownRef.current.contains(event.target as Node)) {
        setVisKundeListe(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  async function loadKontaktpersoner() {
    try {
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .select('*')
        .order('navn')

      if (error) throw error
      setAlleKontaktpersoner(data || [])
    } catch (error) {
      log.error('Feil ved lasting av kontaktpersoner', { error })
    }
  }

  async function loadAnleggsKontakter() {
    if (!anlegg) return
    
    try {
      const { data, error } = await supabase
        .from('anlegg_kontaktpersoner')
        .select('kontaktperson_id, primar')
        .eq('anlegg_id', anlegg.id)

      if (error) throw error
      
      const kontaktIds = data?.map(k => k.kontaktperson_id) || []
      const primaer = data?.find(k => k.primar)?.kontaktperson_id || ''
      
      setValgteKontakter(kontaktIds)
      setPrimaerKontakt(primaer)
    } catch (error) {
      log.error('Feil ved lasting av anleggskontakter', { error, anleggId: anlegg?.id })
    }
  }

  async function opprettNyKontakt() {
    try {
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .insert([{
          navn: nyKontakt.navn,
          epost: nyKontakt.epost || null,
          telefon: nyKontakt.telefon || null,
          rolle: nyKontakt.rolle || null
        }])
        .select()
        .single()

      if (error) throw error
      
      // Legg til i listen
      setAlleKontaktpersoner([...alleKontaktpersoner, data])
      setValgteKontakter([...valgteKontakter, data.id])
      
      // Sett som primær hvis det er første kontakt
      if (valgteKontakter.length === 0) {
        setPrimaerKontakt(data.id)
      }
      
      // Reset skjema
      setNyKontakt({ navn: '', epost: '', telefon: '', rolle: '' })
      setVisNyKontakt(false)
      
      alert('Kontaktperson opprettet!')
    } catch (error) {
      log.error('Feil ved opprettelse av kontaktperson', { error, kontaktperson: nyKontakt })
      alert('Kunne ikke opprette kontaktperson')
    }
  }

  function toggleKontakt(kontaktId: string) {
    if (valgteKontakter.includes(kontaktId)) {
      setValgteKontakter(valgteKontakter.filter(id => id !== kontaktId))
      // Hvis vi fjerner primær kontakt, nullstill
      if (primaerKontakt === kontaktId) {
        setPrimaerKontakt('')
      }
    } else {
      setValgteKontakter([...valgteKontakter, kontaktId])
      // Sett som primær hvis det er første kontakt
      if (valgteKontakter.length === 0) {
        setPrimaerKontakt(kontaktId)
      }
    }
  }

  const maaneder = [...MAANEDER]
  const statuser = Object.values(ANLEGG_STATUSER)
  const kontrolltyper = [...KONTROLLTYPER]

  // Hent org.nummer og kundenummer fra valgt kunde
  async function hentDataFraKunde() {
    if (!formData.kundenr) {
      alert('Velg en kunde først')
      return
    }

    try {
      const { data, error } = await supabase
        .from('customer')
        .select('organisasjonsnummer, kunde_nummer')
        .eq('id', formData.kundenr)
        .single()

      if (error) throw error

      if (data) {
        setFormData({
          ...formData,
          org_nummer: data.organisasjonsnummer || '',
          kunde_nummer: data.kunde_nummer || ''
        })
      }
    } catch (error) {
      log.error('Feil ved henting av kundedata', { error, kundeId: formData.kundenr })
      alert('Kunne ikke hente data fra kunde')
    }
  }

  // Brønnøysund-søk
  useEffect(() => {
    if (brregSearchQuery.length >= 3) {
      if (brregSearchTimeoutRef.current) {
        clearTimeout(brregSearchTimeoutRef.current)
      }

      setBrregSearching(true)
      brregSearchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchCompaniesByName(brregSearchQuery, 10)
          setBrregSearchResults(results)
          setShowBrregResults(true)
        } catch (error) {
          log.error('Feil ved Brreg-søk', { error, searchTerm: brregSearchQuery })
        } finally {
          setBrregSearching(false)
        }
      }, 500)
    } else {
      setBrregSearchResults([])
      setShowBrregResults(false)
    }

    return () => {
      if (brregSearchTimeoutRef.current) {
        clearTimeout(brregSearchTimeoutRef.current)
      }
    }
  }, [brregSearchQuery])

  // Lukk Brønnøysund-resultater ved klikk utenfor
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (brregResultsRef.current && !brregResultsRef.current.contains(event.target as Node)) {
        setShowBrregResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  function selectBrregCompany(company: BrregEnhet) {
    const address = extractAddress(company)
    setFormData({
      ...formData,
      org_nummer: formatOrgNumber(company.organisasjonsnummer),
      adresse: address.adresse || formData.adresse,
      postnummer: address.postnummer || formData.postnummer,
      poststed: address.poststed || formData.poststed
    })
    setBrregSearchQuery('')
    setShowBrregResults(false)
  }

  function toggleKontrolltype(type: string) {
    const current = formData.kontroll_type || []
    if (current.includes(type)) {
      setFormData({ ...formData, kontroll_type: current.filter(t => t !== type) })
    } else {
      setFormData({ ...formData, kontroll_type: [...current, type] })
    }
  }

  async function sjekkOmKundeHarFlereAnlegg(kundeId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('anlegg')
        .select('id', { count: 'exact' })
        .eq('kundenr', kundeId)
      
      if (error) {
        console.error('Feil ved sjekk av anlegg:', error)
        return -1 // Returner -1 for å indikere feil
      }
      
      return data?.length || 0
    } catch (error) {
      console.error('Feil ved sjekk av anlegg:', error)
      return -1
    }
  }

  async function sjekkOmKundeHarAndreRelasjoner(kundeId: string): Promise<boolean> {
    try {
      // Sjekk om kunden har ordre som IKKE er fullført
      const { data: ordre } = await supabase
        .from('ordre')
        .select('id, status')
        .eq('kundenr', kundeId)
        .neq('status', 'Fullført')
        .limit(1)
      
      if (ordre && ordre.length > 0) return true

      // Sjekk om kunden har oppgaver som IKKE er fullført
      const { data: oppgaver } = await supabase
        .from('oppgaver')
        .select('id, status')
        .eq('kunde_id', kundeId)
        .neq('status', 'Fullført')
        .limit(1)
      
      if (oppgaver && oppgaver.length > 0) return true

      return false
    } catch (error) {
      console.error('Feil ved sjekk av relasjoner:', error)
      return true // Anta at det finnes relasjoner hvis vi får feil
    }
  }

  async function slettKunde(kundeId: string): Promise<boolean> {
    try {
      // Sjekk om kunden har andre relasjoner
      const harRelasjoner = await sjekkOmKundeHarAndreRelasjoner(kundeId)
      
      if (harRelasjoner) {
        alert('Kunne ikke slette kunde. Kunden har ordre eller oppgaver tilknyttet.')
        return false
      }

      const { error } = await supabase
        .from('customer')
        .delete()
        .eq('id', kundeId)
      
      if (error) {
        console.error('Feil ved sletting av kunde:', error)
        alert('Kunne ikke slette kunde: ' + error.message)
        return false
      }
      
      console.log('✅ Kunde slettet')
      return true
    } catch (error) {
      console.error('Feil ved sletting av kunde:', error)
      alert('Kunne ikke slette kunde')
      return false
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Sjekk om kunden har endret seg (kun ved redigering)
    if (anlegg && anlegg.kundenr && formData.kundenr && anlegg.kundenr !== formData.kundenr) {
      // Sjekk om den gamle kunden har flere anlegg
      const antallAnlegg = await sjekkOmKundeHarFlereAnlegg(anlegg.kundenr)
      
      // Hvis sjekken feilet, fortsett uten å vise dialog
      if (antallAnlegg === -1) {
        console.warn('Kunne ikke sjekke antall anlegg, fortsetter uten sletting')
        await saveAnlegg()
        return
      }
      
      // Hvis den gamle kunden kun har dette anlegget, vis dialog
      if (antallAnlegg === 1) {
        const gammelKunde = kunder.find(k => k.id === anlegg.kundenr)
        if (gammelKunde) {
          setGammelKundeId(anlegg.kundenr)
          setGammelKundeNavn(gammelKunde.navn)
          setPendingSubmit(true)
          setVisSlettKundeDialog(true)
          return
        }
      }
    }
    
    await saveAnlegg()
  }

  async function saveAnlegg() {
    setSaving(true)

    try {
      // Check authentication status
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Auth session:', session ? 'Authenticated' : 'Not authenticated', session?.user?.email)
      
      const dataToSave = {
        ...formData,
        kundenr: formData.kundenr || null,
        org_nummer: formData.org_nummer || null,
        kunde_nummer: formData.kunde_nummer || null,
        adresse: formData.adresse || null,
        postnummer: formData.postnummer || null,
        poststed: formData.poststed || null,
        kontroll_maaned: formData.kontroll_maaned || null,
        kontroll_status: formData.kontroll_status || null,
        kontroll_type: formData.kontroll_type.length > 0 ? formData.kontroll_type : null,
        unik_kode: formData.unik_kode || null,
        kontrollportal_url: formData.kontrollportal_url || null,
        brannalarm_fullfort: formData.brannalarm_fullfort,
        nodlys_fullfort: formData.nodlys_fullfort,
        roykluker_fullfort: formData.roykluker_fullfort,
        slukkeutstyr_fullfort: formData.slukkeutstyr_fullfort,
        ekstern_fullfort: formData.ekstern_fullfort,
      }

      let anleggId: string
      let isNewAnlegg = false

      if (anlegg) {
        // Update
        const { error } = await supabase
          .from('anlegg')
          .update({
            ...dataToSave,
            sist_oppdatert: new Date().toISOString(),
          })
          .eq('id', anlegg.id)

        if (error) {
          console.error('Supabase update error:', error)
          throw error
        }
        anleggId = anlegg.id
      } else {
        // Create
        const { data, error } = await supabase
          .from('anlegg')
          .insert([dataToSave])
          .select()
          .single()

        if (error) {
          console.error('Supabase insert error:', error)
          throw error
        }
        anleggId = data.id
        isNewAnlegg = true

        // Synkroniser til Kontrollportal (kun ved opprettelse)
        try {
          await syncAnleggToKontrollportal(formData.anleggsnavn, formData.adresse || null)
          console.log('✅ Anlegg synkronisert til Kontrollportal')
        } catch (syncError) {
          console.warn('⚠️ Kunne ikke synkronisere til Kontrollportal:', syncError)
          // Ikke stopp prosessen hvis synkronisering feiler
        }
      }

      // Lagre kontaktperson-koblinger
      if (valgteKontakter.length > 0) {
        // Slett eksisterende koblinger
        await supabase
          .from('anlegg_kontaktpersoner')
          .delete()
          .eq('anlegg_id', anleggId)

        // Opprett nye koblinger
        const koblinger = valgteKontakter.map(kontaktId => ({
          anlegg_id: anleggId,
          kontaktperson_id: kontaktId,
          primar: kontaktId === primaerKontakt
        }))

        const { error: koblingError } = await supabase
          .from('anlegg_kontaktpersoner')
          .insert(koblinger)

        if (koblingError) throw koblingError
      }

      // Hvis vi skal slette den gamle kunden
      if (pendingSubmit && gammelKundeId) {
        const slettet = await slettKunde(gammelKundeId)
        if (slettet) {
          console.log('✅ Kunde slettet og anlegg oppdatert')
        }
        setPendingSubmit(false)
        setGammelKundeId(null)
        setGammelKundeNavn('')
        setVisSlettKundeDialog(false)
      }

      // Send anleggsnavnet til onSave hvis det er et nytt anlegg
      onSave(isNewAnlegg ? formData.anleggsnavn : undefined)
    } catch (error) {
      log.error('Feil ved lagring av anlegg', { error, formData })
      alert('Kunne ikke lagre anlegg')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {anlegg ? 'Rediger anlegg' : 'Nytt anlegg'}
          </h1>
          <p className="text-gray-400 dark:text-gray-400">
            {anlegg ? 'Oppdater anleggsinformasjon' : 'Registrer nytt anlegg'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kunde */}
          <div className="md:col-span-2 relative" ref={kundeDropdownRef}>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Kunde <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400" />
              <input
                type="text"
                value={kundeSok}
                onChange={(e) => {
                  setKundeSok(e.target.value)
                  setVisKundeListe(true)
                  // Nullstill valgt kunde hvis bruker endrer søket
                  if (formData.kundenr) {
                    const kunde = kunder.find(k => k.id === formData.kundenr)
                    if (kunde && kunde.navn !== e.target.value) {
                      setFormData({ ...formData, kundenr: '' })
                    }
                  }
                }}
                onFocus={() => setVisKundeListe(true)}
                className="input pl-10"
                placeholder="Søk etter kunde..."
                required={!formData.kundenr}
              />
              {formData.kundenr && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, kundenr: '' })
                    setKundeSok('')
                    setVisKundeListe(true)
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Dropdown med søkeresultater */}
            {visKundeListe && kundeSok && !formData.kundenr && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-200 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {kunder
                  .filter(kunde => 
                    kunde.navn.toLowerCase().includes(kundeSok.toLowerCase())
                  )
                  .map((kunde) => (
                    <button
                      key={kunde.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, kundenr: kunde.id })
                        setKundeSok(kunde.navn)
                        setVisKundeListe(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-dark-100 text-gray-900 dark:text-white transition-colors"
                    >
                      {kunde.navn}
                    </button>
                  ))}
                {kunder.filter(kunde => 
                  kunde.navn.toLowerCase().includes(kundeSok.toLowerCase())
                ).length === 0 && (
                  <div className="px-4 py-3 text-gray-400 dark:text-gray-500 text-sm">
                    Ingen kunder funnet
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Anleggsnavn */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Anleggsnavn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.anleggsnavn}
              onChange={(e) => setFormData({ ...formData, anleggsnavn: e.target.value })}
              className="input"
              placeholder="Bygningsnavn eller adresse"
              required
            />
          </div>

          {/* Adresse med Google Maps Autocomplete */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Adresse
            </label>
            <GoogleMapsAddressAutocomplete
              value={formData.adresse}
              onChange={(value) => setFormData({ ...formData, adresse: value })}
              onAddressSelect={(components) => {
                setFormData({
                  ...formData,
                  adresse: components.adresse,
                  postnummer: components.postnummer,
                  poststed: components.poststed
                })
              }}
              placeholder="Søk adresse med Google Maps..."
            />
          </div>

          {/* Postnummer */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Postnummer
            </label>
            <input
              type="text"
              value={formData.postnummer}
              onChange={(e) => setFormData({ ...formData, postnummer: e.target.value })}
              className="input"
              placeholder="0123"
            />
          </div>

          {/* Poststed */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Poststed
            </label>
            <input
              type="text"
              value={formData.poststed}
              onChange={(e) => setFormData({ ...formData, poststed: e.target.value })}
              className="input"
              placeholder="Oslo"
            />
          </div>

          {/* Brønnøysund Register Search */}
          <div className="md:col-span-2 bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Søk i Brønnøysundregistrene</h3>
              </div>
              {formData.kundenr && (
                <button
                  type="button"
                  onClick={hentDataFraKunde}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Hent fra kunde
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Søk etter bedrift eller organisasjonsnummer for å automatisk fylle ut informasjon
            </p>

            {/* Search by name */}
            <div className="relative" ref={brregResultsRef}>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                Søk etter bedrift
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400" />
                <input
                  type="text"
                  value={brregSearchQuery}
                  onChange={(e) => setBrregSearchQuery(e.target.value)}
                  className="input pl-10"
                  placeholder="Søk etter bedriftsnavn..."
                />
                {brregSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
                )}
              </div>

              {/* Search Results Dropdown */}
              {showBrregResults && brregSearchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-200 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {brregSearchResults.map((company) => (
                    <button
                      key={company.organisasjonsnummer}
                      type="button"
                      onClick={() => selectBrregCompany(company)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-100 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
                    >
                      <p className="font-medium text-gray-900 dark:text-white">{company.navn}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Org.nr: {formatOrgNumber(company.organisasjonsnummer)}
                      </p>
                      {company.forretningsadresse && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {extractAddress(company).adresse}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Org.nummer */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Organisasjonsnummer
            </label>
            <input
              type="text"
              value={formData.org_nummer}
              onChange={(e) => setFormData({ ...formData, org_nummer: e.target.value })}
              className="input"
              placeholder="123 456 789"
            />
          </div>

          {/* Kundenummer */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Kundenummer
            </label>
            <input
              type="text"
              value={formData.kunde_nummer}
              onChange={(e) => setFormData({ ...formData, kunde_nummer: e.target.value })}
              className="input"
              placeholder="K-12345"
            />
          </div>

          {/* Unik kode (Kontrollportal) */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Unik kode (Kontrollportal)
            </label>
            <input
              type="text"
              value={formData.unik_kode}
              className="input bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
              placeholder="ABC123"
              readOnly
              disabled
            />
          </div>

          {/* Kontrollportal URL */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Kontrollportal URL
            </label>
            <input
              type="url"
              value={formData.kontrollportal_url}
              className="input bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
              placeholder="https://kontrollportal.no/logg?kode=ABC123"
              readOnly
              disabled
            />
          </div>

          {/* Kontrollmåned */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Kontrollmåned
            </label>
            <select
              value={formData.kontroll_maaned}
              onChange={(e) => setFormData({ ...formData, kontroll_maaned: e.target.value })}
              className="input"
            >
              <option value="">Velg måned</option>
              <option value="NA">Ikke kontaktskunde</option>
              {maaneder.map((maaned) => (
                <option key={maaned} value={maaned}>
                  {maaned}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.kontroll_status}
              onChange={(e) => setFormData({ ...formData, kontroll_status: e.target.value })}
              className="input"
            >
              <option value="">Velg status</option>
              {statuser.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Kontrolltyper */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-3">
              Kontrolltyper
            </label>
            <div className="flex flex-wrap gap-3">
              {kontrolltyper.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleKontrolltype(type)}
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    formData.kontroll_type.includes(type)
                      ? 'bg-primary border-primary text-gray-900 dark:text-white'
                      : 'bg-dark-100 border-gray-700 text-gray-500 dark:text-gray-300 hover:border-primary'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Tjenestestatus */}
          {anlegg && formData.kontroll_type.length > 0 && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-3">
                Tjenestestatus 
                <span className="text-xs text-gray-400 dark:text-gray-400 ml-2">
                  ({formData.kontroll_type.filter(t => {
                    if (t === 'Brannalarm') return formData.brannalarm_fullfort
                    if (t === 'Nødlys') return formData.nodlys_fullfort
                    if (t === 'Røykluker') return formData.roykluker_fullfort
                    if (t === 'Slukkeutstyr') return formData.slukkeutstyr_fullfort
                    if (t === 'Ekstern') return formData.ekstern_fullfort
                    return false
                  }).length} av {formData.kontroll_type.length} fullført)
                </span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formData.kontroll_type.map((type) => {
                  const statusKey = type === 'Brannalarm' ? 'brannalarm_fullfort' :
                                   type === 'Nødlys' ? 'nodlys_fullfort' :
                                   type === 'Røykluker' ? 'roykluker_fullfort' :
                                   type === 'Slukkeutstyr' ? 'slukkeutstyr_fullfort' :
                                   type === 'Ekstern' ? 'ekstern_fullfort' : null
                  
                  if (!statusKey) return null
                  
                  const isFullfort = formData[statusKey as keyof typeof formData] as boolean
                  
                  return (
                    <div
                      key={type}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        isFullfort
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-dark-100 border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isFullfort ? 'bg-green-500/20' : 'bg-gray-700'
                        }`}>
                          {isFullfort ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className={`font-medium ${
                            isFullfort ? 'text-green-400' : 'text-gray-300'
                          }`}>
                            {type}
                          </p>
                          <p className="text-xs text-gray-400">
                            {isFullfort ? 'Fullført' : 'Ikke fullført'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          [statusKey]: !isFullfort
                        })}
                        className={`p-2 rounded-lg transition-colors ${
                          isFullfort
                            ? 'hover:bg-red-500/10 text-red-400'
                            : 'hover:bg-green-500/10 text-green-400'
                        }`}
                        title={isFullfort ? 'Marker som ikke fullført' : 'Marker som fullført'}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Kontaktpersoner */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-300">
                Kontaktpersoner {valgteKontakter.length > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-400 ml-2">
                    ({valgteKontakter.length} valgt)
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={() => setVisNyKontakt(!visNyKontakt)}
                className="btn-secondary text-xs flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {visNyKontakt ? 'Avbryt' : 'Ny kontaktperson'}
              </button>
            </div>

            {/* Vis valgte kontaktpersoner først (hvis redigering) */}
            {anlegg && valgteKontakter.length > 0 && (
              <div className="mb-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="text-xs font-medium text-primary mb-2">
                  Tilknyttede kontaktpersoner for dette anlegget:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {alleKontaktpersoner
                    .filter(k => valgteKontakter.includes(k.id))
                    .map(k => (
                      <div key={k.id} className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded group">
                        <button
                          type="button"
                          onClick={() => navigate('/kontaktpersoner', { 
                            state: { 
                              selectedKontaktId: k.id,
                              fromAnlegg: true,
                              anleggId: anlegg?.id
                            } 
                          })}
                          className="text-gray-900 dark:text-white hover:text-primary transition-colors text-xs"
                          title="Gå til kontaktperson"
                        >
                          {k.navn}
                        </button>
                        {primaerKontakt === k.id && (
                          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        )}
                        <button
                          type="button"
                          onClick={() => toggleKontakt(k.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-red-400 hover:text-red-300"
                          title="Fjern fra anlegg"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Søkefelt */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-400" />
              <input
                type="text"
                placeholder="Søk etter kontaktperson..."
                value={kontaktSok}
                onChange={(e) => setKontaktSok(e.target.value)}
                className="input pl-10 text-sm"
              />
            </div>

            {/* Ny kontaktperson skjema */}
            {visNyKontakt && (
              <div className="card p-4 mb-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Opprett ny kontaktperson</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Navn *"
                    value={nyKontakt.navn}
                    onChange={(e) => setNyKontakt({ ...nyKontakt, navn: e.target.value })}
                    className="input text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Rolle"
                    value={nyKontakt.rolle}
                    onChange={(e) => setNyKontakt({ ...nyKontakt, rolle: e.target.value })}
                    className="input text-sm"
                  />
                  <input
                    type="email"
                    placeholder="E-post"
                    value={nyKontakt.epost}
                    onChange={(e) => setNyKontakt({ ...nyKontakt, epost: e.target.value })}
                    className="input text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Telefon"
                    value={nyKontakt.telefon}
                    onChange={(e) => setNyKontakt({ ...nyKontakt, telefon: e.target.value })}
                    className="input text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={opprettNyKontakt}
                  disabled={!nyKontakt.navn}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  Opprett og legg til
                </button>
              </div>
            )}

            {/* Liste over kontaktpersoner */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alleKontaktpersoner
                .filter(k => 
                  k.navn.toLowerCase().includes(kontaktSok.toLowerCase()) ||
                  k.epost?.toLowerCase().includes(kontaktSok.toLowerCase()) ||
                  k.telefon?.toLowerCase().includes(kontaktSok.toLowerCase()) ||
                  k.rolle?.toLowerCase().includes(kontaktSok.toLowerCase())
                )
                .map((kontakt) => (
                <div
                  key={kontakt.id}
                  className={`p-3 rounded-lg border transition-all ${
                    valgteKontakter.includes(kontakt.id)
                      ? 'bg-primary/10 border-primary'
                      : 'bg-gray-50 dark:bg-dark-100 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={valgteKontakter.includes(kontakt.id)}
                      onChange={() => toggleKontakt(kontakt.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900 dark:text-white font-medium text-sm">{kontakt.navn}</p>
                        {kontakt.rolle && (
                          <span className="badge badge-info text-xs">{kontakt.rolle}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-400 mt-1 space-y-0.5">
                        {kontakt.epost && <div>{kontakt.epost}</div>}
                        {kontakt.telefon && <div>{kontakt.telefon}</div>}
                      </div>
                    </div>
                    {valgteKontakter.includes(kontakt.id) && (
                      <button
                        type="button"
                        onClick={() => setPrimaerKontakt(kontakt.id)}
                        className={`text-xs flex items-center gap-1 px-2 py-1 rounded ${
                          primaerKontakt === kontakt.id
                            ? 'text-yellow-500'
                            : 'text-gray-400 dark:text-gray-400 hover:text-yellow-500'
                        }`}
                      >
                        <Star className={`w-3 h-3 ${primaerKontakt === kontakt.id ? 'fill-yellow-500' : ''}`} />
                        {primaerKontakt === kontakt.id ? 'Primær' : 'Sett primær'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Lagrer...' : anlegg ? 'Oppdater anlegg' : 'Opprett anlegg'}
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

      {/* Dialog for sletting av kunde */}
      {visSlettKundeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-200 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Kunde har ingen anlegg
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Kunden <span className="font-semibold">{gammelKundeNavn}</span> har ikke flere anlegg tilknyttet. 
                  Ønsker du å slette kunden?
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setPendingSubmit(false)
                  setGammelKundeId(null)
                  setGammelKundeNavn('')
                  setVisSlettKundeDialog(false)
                  saveAnlegg()
                }}
                className="btn-secondary"
              >
                Nei, behold kunde
              </button>
              <button
                type="button"
                onClick={() => {
                  saveAnlegg()
                }}
                className="btn-primary bg-red-600 hover:bg-red-700"
              >
                Ja, slett kunde
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Anlegg Details Wrapper - Henter kontaktpersoner
interface AnleggDetailsProps {
  anlegg: Anlegg
  kundeNavn: string
  onEdit: () => void
  onClose: () => void
}

function AnleggDetailsWrapper({ anlegg, kundeNavn, onEdit, onClose }: AnleggDetailsProps) {
  const [kontaktpersoner, setKontaktpersoner] = useState<Kontaktperson[]>([])
  const [dokumenter, setDokumenter] = useState<Dokument[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDokumenter, setLoadingDokumenter] = useState(true)

  useEffect(() => {
    loadKontaktpersoner()
    loadDokumenter()
  }, [anlegg.id])

  async function settPrimaerKontakt(kontaktpersonId: string) {
    try {
      // Først, fjern primær status fra alle kontaktpersoner for dette anlegget
      const { error: removeError } = await supabase
        .from('anlegg_kontaktpersoner')
        .update({ primar: false })
        .eq('anlegg_id', anlegg.id)

      if (removeError) throw removeError

      // Deretter, sett ny primær kontaktperson
      const { error: setError } = await supabase
        .from('anlegg_kontaktpersoner')
        .update({ primar: true })
        .eq('anlegg_id', anlegg.id)
        .eq('kontaktperson_id', kontaktpersonId)

      if (setError) throw setError

      // Last inn kontaktpersoner på nytt
      await loadKontaktpersoner()
      
      alert('Primær kontaktperson oppdatert!')
    } catch (error) {
      console.error('Feil ved oppdatering av primær kontaktperson:', error)
      alert('Kunne ikke oppdatere primær kontaktperson')
    }
  }

  async function loadKontaktpersoner() {
    try {
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .select(`
          *,
          anlegg_kontaktpersoner!inner(
            primar
          )
        `)
        .eq('anlegg_kontaktpersoner.anlegg_id', anlegg.id)

      if (error) throw error

      // Transform data
      const transformed = (data || []).map(k => ({
        id: k.id,
        navn: k.navn,
        epost: k.epost,
        telefon: k.telefon,
        rolle: k.rolle,
        primar: k.anlegg_kontaktpersoner?.[0]?.primar || false
      }))

      setKontaktpersoner(transformed)
    } catch (error) {
      console.error('Feil ved lasting av kontaktpersoner:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadDokumenter() {
    try {
      console.log('🔍 Laster dokumenter for anlegg:', anlegg.id)
      
      // Først prøv å hente fra dokumenter-tabellen
      const { data: dbDocs, error: dbError } = await supabase
        .from('dokumenter')
        .select('*')
        .eq('anlegg_id', anlegg.id)
        .order('opplastet_dato', { ascending: false })

      console.log('📄 Dokumenter fra tabell:', dbDocs?.length || 0, dbDocs)
      if (dbError) {
        console.error('❌ Feil ved henting fra dokumenter-tabell:', dbError)
      }

      // Deretter hent fra Storage
      const storagePath = `anlegg/${anlegg.id}/dokumenter`
      console.log('📦 Henter fra storage bucket: anlegg.dokumenter, path:', storagePath)
      const { data: storageDocs, error: storageError } = await supabase
        .storage
        .from('anlegg.dokumenter')
        .list(storagePath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      console.log('📦 Filer fra storage:', storageDocs?.length || 0, storageDocs)
      if (storageError) {
        console.error('❌ Feil ved henting fra storage:', storageError)
      }

      // Kombiner dokumenter fra tabell og storage
      const combinedDocs: Dokument[] = []

      // Legg til dokumenter fra tabell
      if (dbDocs) {
        console.log('✅ Legger til', dbDocs.length, 'dokumenter fra tabell')
        combinedDocs.push(...dbDocs)
      }

      // Legg til dokumenter fra storage som ikke finnes i tabellen
      if (storageDocs) {
        console.log('🔄 Prosesserer', storageDocs.length, 'filer fra storage')
        for (const file of storageDocs) {
          console.log('📁 Fil:', file.name, 'ID:', file.id)
          
          // Sjekk om filen allerede er i tabellen
          const existsInDb = dbDocs?.some(doc => doc.filnavn === file.name)
          
          if (!existsInDb) {
            console.log('➕ Legger til fil fra storage:', file.name)
            // Generer signed URL for filen
            const filePath = `anlegg/${anlegg.id}/dokumenter/${file.name}`
            const { data: urlData, error: urlError } = await supabase
              .storage
              .from('anlegg.dokumenter')
              .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 dager

            if (urlError) {
              console.error('❌ Feil ved generering av URL for', file.name, ':', urlError)
            }

            if (urlData) {
              console.log('✅ URL generert for', file.name)
              combinedDocs.push({
                id: file.id || file.name,
                anlegg_id: anlegg.id,
                filnavn: file.name,
                url: urlData.signedUrl,
                type: null,
                opplastet_dato: file.created_at || new Date().toISOString(),
                opprettet_av: null
              })
            }
          } else {
            console.log('⏭️  Hopper over (finnes i tabell):', file.name)
          }
        }
      }

      console.log('📊 Totalt dokumenter:', combinedDocs.length, combinedDocs)
      setDokumenter(combinedDocs)
    } catch (error) {
      console.error('💥 Feil ved lasting av dokumenter:', error)
    } finally {
      setLoadingDokumenter(false)
    }
  }

  return (
    <AnleggDetails
      anlegg={anlegg}
      kundeNavn={kundeNavn}
      kontaktpersoner={kontaktpersoner}
      dokumenter={dokumenter}
      loadingKontakter={loading}
      loadingDokumenter={loadingDokumenter}
      onEdit={onEdit}
      onClose={onClose}
      onSettPrimaer={settPrimaerKontakt}
    />
  )
}

// Anlegg Details Component
interface AnleggDetailsComponentProps {
  anlegg: Anlegg
  kundeNavn: string
  kontaktpersoner: Kontaktperson[]
  dokumenter: Dokument[]
  loadingKontakter: boolean
  loadingDokumenter: boolean
  onEdit: () => void
  onClose: () => void
  onSettPrimaer: (kontaktpersonId: string) => void
}

function AnleggDetails({ anlegg, kundeNavn, kontaktpersoner, dokumenter, loadingKontakter, loadingDokumenter, onEdit, onClose, onSettPrimaer }: AnleggDetailsComponentProps) {
  const navigate = useNavigate()

  function handleKontrolltypeClick(type: string) {
    // Mapping fra kontrolltype til rapporttype
    const rapportTypeMap: Record<string, string> = {
      'Nødlys': 'nodlys',
      'Brannalarm': 'brannalarm',
      'Slukkeutstyr': 'slukkeutstyr',
      'Røykluker': 'roykluker'
    }
    
    const rapportType = rapportTypeMap[type]
    if (rapportType) {
      // Naviger til rapporter med forhåndsvalgt kunde og anlegg
      navigate('/rapporter', { 
        state: { 
          kundeId: anlegg.kundenr, 
          anleggId: anlegg.id, 
          rapportType 
        } 
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{anlegg.anleggsnavn}</h1>
          <p className="text-gray-400 dark:text-gray-400">{kundeNavn}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/priser', { state: { anleggId: anlegg.id, kundeId: anlegg.kundenr } })}
            className="btn-secondary flex items-center gap-2"
            title="Kontrollpriser"
          >
            <DollarSign className="w-4 h-4" />
            Priser
          </button>
          <button 
            onClick={() => navigate('/ordre', { state: { kundeId: anlegg.kundenr, anleggId: anlegg.id } })}
            className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <ClipboardList className="w-4 h-4" />
            Opprett ordre
          </button>
          <button onClick={onEdit} className="btn-primary flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Rediger
          </button>
          <button onClick={onClose} className="btn-secondary">
            Tilbake
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Anleggsinformasjon</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Adresse</p>
                <p className="text-gray-900 dark:text-white">{anlegg.adresse || '-'}</p>
                {anlegg.postnummer && anlegg.poststed && (
                  <p className="text-gray-900 dark:text-white">{anlegg.postnummer} {anlegg.poststed}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Organisasjonsnummer</p>
                <p className="text-gray-900 dark:text-white">{anlegg.org_nummer || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Kundenummer</p>
                <p className="text-gray-900 dark:text-white">{anlegg.kunde_nummer || '-'}</p>
              </div>
              {anlegg.unik_kode && (
                <div>
                  <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Unik kode (Kontrollportal)</p>
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-primary" />
                    <p className="text-gray-900 dark:text-white font-mono">{anlegg.unik_kode}</p>
                  </div>
                </div>
              )}
              {anlegg.kontrollportal_url && (
                <div>
                  <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Digital loggbok</p>
                  <a
                    href={anlegg.kontrollportal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                    Åpne loggbok i Kontrollportal
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Kontrollinfo</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Kontrollmåned</p>
                <p className="text-gray-900 dark:text-white">
                  {anlegg.kontroll_maaned && anlegg.kontroll_maaned !== 'NA' 
                    ? anlegg.kontroll_maaned 
                    : 'Ikke kontaktskunde'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Status</p>
                {anlegg.kontroll_status ? (
                  <span className={`badge ${ANLEGG_STATUS_COLORS[anlegg.kontroll_status] || 'badge-info'}`}>
                    {anlegg.kontroll_status}
                  </span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">-</span>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-400 mb-2">Kontrolltyper</p>
                {anlegg.kontroll_type && anlegg.kontroll_type.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {anlegg.kontroll_type.map((type, idx) => {
                      // Alle hovedkontrolltyper er nå klikkbare
                      const isClickable = ['Nødlys', 'Brannalarm', 'Slukkeutstyr', 'Røykluker'].includes(type)
                      return (
                        <button
                          key={idx}
                          onClick={() => isClickable && handleKontrolltypeClick(type)}
                          disabled={!isClickable}
                          className={`badge badge-info ${
                            isClickable 
                              ? 'cursor-pointer hover:bg-primary hover:border-primary transition-all' 
                              : 'opacity-60 cursor-not-allowed'
                          }`}
                          title={isClickable ? `Åpne ${type}-rapport` : `${type} (kommer snart)`}
                        >
                          {type}
                          {isClickable && <ExternalLink className="w-3 h-3 ml-1 inline" />}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">Ingen kontrolltyper</span>
                )}
              </div>
            </div>
          </div>

          {/* Kontaktpersoner */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Kontaktpersoner ({kontaktpersoner.length})
            </h2>
            {loadingKontakter ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : kontaktpersoner.length > 0 ? (
              <div className="space-y-3">
                {kontaktpersoner.map((kontakt) => (
                  <div
                    key={kontakt.id}
                    className="flex items-start justify-between p-4 bg-gray-50 dark:bg-dark-100 rounded-lg"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-gray-900 dark:text-white font-medium">{kontakt.navn}</p>
                          {kontakt.primar && (
                            <div className="flex items-center gap-1 text-yellow-500">
                              <Star className="w-4 h-4 fill-yellow-500" />
                              <span className="text-xs">Primær</span>
                            </div>
                          )}
                        </div>
                        {kontakt.rolle && (
                          <span className="badge badge-info text-xs mb-2">{kontakt.rolle}</span>
                        )}
                        <div className="space-y-1">
                          {kontakt.epost && (
                            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-400">
                              <Mail className="w-3 h-3" />
                              {kontakt.epost}
                            </div>
                          )}
                          {kontakt.telefon && (
                            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-400">
                              <Phone className="w-3 h-3" />
                              {kontakt.telefon}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {!kontakt.primar && (
                      <button
                        onClick={() => onSettPrimaer(kontakt.id)}
                        className="btn-secondary text-xs flex items-center gap-1 ml-3"
                        title="Sett som primær kontaktperson"
                      >
                        <Star className="w-3 h-3" />
                        Sett som primær
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 dark:text-gray-400 text-center py-8">Ingen kontaktpersoner registrert</p>
            )}
          </div>

          {/* Dokumenter */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Dokumenter ({dokumenter.length})
            </h2>
            {loadingDokumenter ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : dokumenter.length > 0 ? (
              <div className="space-y-2">
                {dokumenter.map((dok) => (
                  <div
                    key={dok.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white font-medium truncate">{dok.filnavn}</p>
                        {dok.type && (
                          <span className="badge badge-info text-xs">{dok.type}</span>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                          {formatDate(dok.opplastet_dato)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={dok.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 dark:text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0"
                      title="Åpne dokument"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 dark:text-gray-400 text-center py-8">Ingen dokumenter lastet opp</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Metadata</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Opprettet</p>
                <p className="text-gray-900 dark:text-white text-sm">{formatDate(anlegg.opprettet_dato)}</p>
              </div>
              {anlegg.sist_oppdatert && (
                <div>
                  <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Sist oppdatert</p>
                  <p className="text-gray-900 dark:text-white text-sm">{formatDate(anlegg.sist_oppdatert)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
