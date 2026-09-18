import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { 
  Plus, Search, Building, Edit,
  FolderKanban, Users, Calendar, Clock, CheckCircle2,
  AlertCircle, ArrowLeft,
  User, FileText, Loader2, ChevronRight, ExternalLink
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Combobox } from '@/components/ui/Combobox'
import { buildAnleggDropboxPath, listDropboxFolder, type DropboxEntry } from '@/services/dropboxServiceV2'
import { ProsjektFramdrift } from '@/components/ProsjektFramdrift'

// Types
interface Prosjekt {
  id: string
  prosjektnummer: string | null
  navn: string
  beskrivelse: string | null
  prosjekt_type: 'utbedring' | 'oppgradering' | 'ny_installasjon'
  tjeneste: 'brannalarm' | 'nodlys' | 'slukkeutstyr' | 'roykluker' | 'dokumentasjon'
  status: 'ventende' | 'pagaende' | 'fullfort' | 'kansellert'
  prioritet: 'lav' | 'normal' | 'hoy' | 'kritisk'
  dokumentasjonskrav: string[]
  // Tegninger
  tegninger_status: 'oppdatere_gamle' | 'opprette_nye' | null
  tegninger_kilde: '3d_scanning' | 'kladd_for_hand' | 'underlag_fra_kunde' | null
  tegninger_typer: string[] // o_planer, romningsplaner
  startdato: string | null
  forventet_sluttdato: string | null
  faktisk_sluttdato: string | null
  notater: string | null
  created_at: string
  updated_at: string
  kunde_id: string | null
  anlegg_id: string | null
  prosjektleder_id: string | null
  // Joined data
  kunde?: { id: string; navn: string } | null
  anlegg?: { id: string; anleggsnavn: string; adresse: string | null } | null
  prosjektleder?: { id: string; navn: string } | null
  prosjekt_medlemmer?: { ansatt: { id: string; navn: string } }[]
}

interface Ansatt {
  id: string
  navn: string
  epost: string | null
  rolle: string | null
}

interface Kunde {
  id: string
  navn: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
  adresse: string | null
  kundenr: string
}

type ViewMode = 'dashboard' | 'list' | 'create' | 'edit' | 'view'
type StatusFilter = 'alle' | 'ventende' | 'pagaende' | 'fullfort'

// Konstanter
const PROSJEKT_TYPER = [
  { value: 'utbedring', label: 'Utbedring' },
  { value: 'oppgradering', label: 'Oppgradering' },
  { value: 'ny_installasjon', label: 'Ny installasjon' },
]

const TJENESTER = [
  { value: 'brannalarm', label: 'Brannalarm' },
  { value: 'nodlys', label: 'Nødlys' },
  { value: 'slukkeutstyr', label: 'Slukkeutstyr' },
  { value: 'roykluker', label: 'Røykluker' },
  { value: 'dokumentasjon', label: 'Dokumentasjon' },
]

const DOKUMENTASJONSKRAV = [
  { value: 'detektorliste', label: 'Detektorliste', dropboxFolder: '02_Brannalarm/02_Detektorliste', modulePath: '/teknisk/detektorliste', moduleName: 'Detektorliste' },
  { value: 'alarmorganisering', label: 'Alarmorganisering', dropboxFolder: '02_Brannalarm/03_Alarmorganisering', modulePath: '/teknisk/alarmorganisering', moduleName: 'Alarmorganisering' },
  { value: 'prosjektering', label: 'Prosjektering', dropboxFolder: '02_Brannalarm/04_Prosjektering', modulePath: null, moduleName: null },
  { value: 'fdv_datablader', label: 'FDV / Datablader', dropboxFolder: '06_FDV', modulePath: null, moduleName: null },
]

const DOKUMENT_STATUS = [
  { value: 'ikke_startet', label: 'Ikke startet', color: 'bg-gray-500/20 text-gray-400', icon: Clock },
  { value: 'pagaende', label: 'Pågår', color: 'bg-blue-500/20 text-blue-400', icon: Loader2 },
  { value: 'fullfort', label: 'Fullført', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
]

interface ProsjektDokument {
  id: string
  prosjekt_id: string
  dokument_type: string
  status: 'ikke_startet' | 'pagaende' | 'fullfort'
  fil_url: string | null
  notater: string | null
  created_at: string
  updated_at: string
}

const PRIORITETER = [
  { value: 'lav', label: 'Lav', color: 'text-gray-500' },
  { value: 'normal', label: 'Normal', color: 'text-blue-500' },
  { value: 'hoy', label: 'Høy', color: 'text-orange-500' },
  { value: 'kritisk', label: 'Kritisk', color: 'text-red-500' },
]

const TEGNINGER_STATUS = [
  { value: 'oppdatere_gamle', label: 'Oppdatere gamle tegninger' },
  { value: 'opprette_nye', label: 'Opprette nye tegninger' },
]

const TEGNINGER_KILDE = [
  { value: '3d_scanning', label: '3D-scanning' },
  { value: 'kladd_for_hand', label: 'Kladdes for hånd' },
  { value: 'underlag_fra_kunde', label: 'Underlag fra kunde' },
]

const TEGNINGER_TYPER = [
  { value: 'o_planer', label: 'O-Planer' },
  { value: 'romningsplaner', label: 'Rømningsplaner' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  ventende: { label: 'Ventende', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  pagaende: { label: 'Pågående', color: 'bg-blue-500/20 text-blue-400', icon: Loader2 },
  fullfort: { label: 'Fullført', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
  kansellert: { label: 'Kansellert', color: 'bg-red-500/20 text-red-400', icon: AlertCircle },
}

export default function Prosjekter() {
  useAuthStore()
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [prosjekter, setProsjekter] = useState<Prosjekt[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProsjekt, setSelectedProsjekt] = useState<Prosjekt | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadProsjekter()
  }, [])

  async function loadProsjekter() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('prosjekter')
        .select(`
          *,
          kunde:kunde_id (id, navn),
          anlegg:anlegg_id (id, anleggsnavn, adresse),
          prosjektleder:prosjektleder_id (id, navn),
          prosjekt_medlemmer (
            ansatt:ansatt_id (id, navn)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setProsjekter(data || [])
    } catch (error) {
      console.error('Feil ved lasting av prosjekter:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrer prosjekter
  const filteredProsjekter = prosjekter.filter(p => {
    if (statusFilter !== 'alle' && p.status !== statusFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        p.navn.toLowerCase().includes(query) ||
        p.kunde?.navn?.toLowerCase().includes(query) ||
        p.anlegg?.anleggsnavn?.toLowerCase().includes(query)
      )
    }
    return true
  })

  // Statistikk
  const stats = {
    ventende: prosjekter.filter(p => p.status === 'ventende').length,
    pagaende: prosjekter.filter(p => p.status === 'pagaende').length,
    fullfort: prosjekter.filter(p => p.status === 'fullfort').length,
    totalt: prosjekter.length,
  }

  function handleViewProsjekt(prosjekt: Prosjekt) {
    setSelectedProsjekt(prosjekt)
    setViewMode('view')
  }

  function handleEditProsjekt(prosjekt: Prosjekt) {
    setSelectedProsjekt(prosjekt)
    setViewMode('edit')
  }

  function handleCreateNew() {
    setSelectedProsjekt(null)
    setViewMode('create')
  }

  function handleBack() {
    setSelectedProsjekt(null)
    setViewMode('dashboard')
    loadProsjekter()
  }

  if (loading && viewMode === 'dashboard') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Create/Edit form
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <ProsjektForm 
        prosjekt={selectedProsjekt} 
        onSave={handleBack}
        onCancel={handleBack}
      />
    )
  }

  // View details
  if (viewMode === 'view' && selectedProsjekt) {
    return (
      <ProsjektDetails 
        prosjekt={selectedProsjekt}
        onEdit={() => setViewMode('edit')}
        onBack={handleBack}
        onRefresh={loadProsjekter}
      />
    )
  }

  // Dashboard view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FolderKanban className="w-8 h-8 text-primary" />
            Prosjekter
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Oversikt over alle prosjekter
          </p>
        </div>
        <button onClick={handleCreateNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nytt prosjekt
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('alle')}
          className={`card p-4 text-left transition-all ${statusFilter === 'alle' ? 'ring-2 ring-primary' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-500/20 rounded-lg">
              <FolderKanban className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalt}</p>
              <p className="text-sm text-gray-400">Totalt</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('ventende')}
          className={`card p-4 text-left transition-all ${statusFilter === 'ventende' ? 'ring-2 ring-yellow-500' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.ventende}</p>
              <p className="text-sm text-gray-400">Ventende</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('pagaende')}
          className={`card p-4 text-left transition-all ${statusFilter === 'pagaende' ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Loader2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.pagaende}</p>
              <p className="text-sm text-gray-400">Pågående</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('fullfort')}
          className={`card p-4 text-left transition-all ${statusFilter === 'fullfort' ? 'ring-2 ring-green-500' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.fullfort}</p>
              <p className="text-sm text-gray-400">Fullført</p>
            </div>
          </div>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Søk etter prosjekt, kunde eller anlegg..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Project List */}
      <div className="space-y-3">
        {filteredProsjekter.length === 0 ? (
          <div className="card p-8 text-center">
            <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchQuery || statusFilter !== 'alle' 
                ? 'Ingen prosjekter funnet med valgte filter'
                : 'Ingen prosjekter ennå. Opprett ditt første prosjekt!'}
            </p>
          </div>
        ) : (
          filteredProsjekter.map(prosjekt => (
            <ProsjektCard 
              key={prosjekt.id}
              prosjekt={prosjekt}
              onView={() => handleViewProsjekt(prosjekt)}
              onEdit={() => handleEditProsjekt(prosjekt)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// Prosjekt Card Component
function ProsjektCard({ 
  prosjekt, 
  onView, 
  onEdit 
}: { 
  prosjekt: Prosjekt
  onView: () => void
  onEdit: () => void
}) {
  const statusConfig = STATUS_CONFIG[prosjekt.status] || { label: prosjekt.status || 'Ukjent', color: 'bg-gray-500/20 text-gray-400', icon: Clock }
  const StatusIcon = statusConfig.icon
  const tjeneste = TJENESTER.find(t => t.value === prosjekt.tjeneste)
  const prosjektType = PROSJEKT_TYPER.find(t => t.value === prosjekt.prosjekt_type)

  return (
    <div 
      className="card p-4 hover:bg-dark-100/50 transition-colors cursor-pointer"
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {prosjekt.prosjektnummer && (
            <p className="text-xs text-primary font-mono mb-1">{prosjekt.prosjektnummer}</p>
          )}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-white truncate">{prosjekt.navn}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.color}`}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
            {prosjekt.kunde && (
              <span className="flex items-center gap-1">
                <Building className="w-4 h-4" />
                {prosjekt.kunde.navn}
              </span>
            )}
            {prosjekt.anlegg && (
              <span className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                {prosjekt.anlegg.anleggsnavn}
              </span>
            )}
            {prosjekt.prosjektleder && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {prosjekt.prosjektleder.navn}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs">
              {tjeneste?.label}
            </span>
            <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded text-xs">
              {prosjektType?.label}
            </span>
            {prosjekt.prosjekt_medlemmer && prosjekt.prosjekt_medlemmer.length > 0 && (
              <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded text-xs flex items-center gap-1">
                <Users className="w-3 h-3" />
                {prosjekt.prosjekt_medlemmer.length} medlemmer
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Rediger"
          >
            <Edit className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Prosjekt Form Component
function ProsjektForm({ 
  prosjekt, 
  onSave, 
  onCancel 
}: { 
  prosjekt: Prosjekt | null
  onSave: () => void
  onCancel: () => void
}) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anleggList, setAnleggList] = useState<Anlegg[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [formData, setFormData] = useState({
    navn: prosjekt?.navn || '',
    beskrivelse: prosjekt?.beskrivelse || '',
    prosjekt_type: prosjekt?.prosjekt_type || 'ny_installasjon',
    tjeneste: prosjekt?.tjeneste || 'brannalarm',
    status: prosjekt?.status || 'ventende',
    prioritet: prosjekt?.prioritet || 'normal',
    kunde_id: prosjekt?.kunde_id || '',
    anlegg_id: prosjekt?.anlegg_id || '',
    prosjektleder_id: prosjekt?.prosjektleder_id || '',
    dokumentasjonskrav: prosjekt?.dokumentasjonskrav || [],
    tegninger_status: prosjekt?.tegninger_status || null,
    tegninger_kilde: prosjekt?.tegninger_kilde || null,
    tegninger_typer: prosjekt?.tegninger_typer || [],
    startdato: prosjekt?.startdato || '',
    forventet_sluttdato: prosjekt?.forventet_sluttdato || '',
    notater: prosjekt?.notater || '',
    medlemmer: prosjekt?.prosjekt_medlemmer?.map(m => m.ansatt.id) || [],
  })

  useEffect(() => {
    loadFormData()
  }, [])

  useEffect(() => {
    if (formData.kunde_id) {
      loadAnlegg(formData.kunde_id)
    }
  }, [formData.kunde_id])

  async function loadFormData() {
    try {
      setLoadingData(true)
      
      // Last ansatte
      const { data: ansatteData } = await supabase
        .from('ansatte')
        .select('id, navn, epost, rolle')
        .order('navn')
      
      setAnsatte(ansatteData || [])

      // Last kunder
      const { data: kundeData, error: kundeError } = await supabase
        .from('customer')
        .select('id, navn')
        .order('navn')
      
      if (kundeError) {
        console.error('Feil ved lasting av kunder:', kundeError)
      }
      console.log('Lastet kunder:', kundeData?.length || 0)
      setKunder(kundeData || [])

      // Last anlegg hvis kunde er valgt
      if (formData.kunde_id) {
        await loadAnlegg(formData.kunde_id)
      }
    } catch (error) {
      console.error('Feil ved lasting av data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  async function loadAnlegg(kundeId: string) {
    const { data } = await supabase
      .from('anlegg')
      .select('id, anleggsnavn, adresse, kundenr')
      .eq('kundenr', kundeId)
      .order('anleggsnavn')
    
    setAnleggList(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.navn.trim()) {
      alert('Prosjektnavn er påkrevd')
      return
    }

    setSaving(true)
    try {
      const prosjektData = {
        navn: formData.navn,
        beskrivelse: formData.beskrivelse || null,
        prosjekt_type: formData.prosjekt_type,
        tjeneste: formData.tjeneste,
        status: formData.status,
        prioritet: formData.prioritet,
        kunde_id: formData.kunde_id || null,
        anlegg_id: formData.anlegg_id || null,
        prosjektleder_id: formData.prosjektleder_id || null,
        dokumentasjonskrav: formData.dokumentasjonskrav,
        tegninger_status: formData.tegninger_status,
        tegninger_kilde: formData.tegninger_kilde,
        tegninger_typer: formData.tegninger_typer,
        startdato: formData.startdato || null,
        forventet_sluttdato: formData.forventet_sluttdato || null,
        notater: formData.notater || null,
      }

      let prosjektId = prosjekt?.id

      if (prosjekt) {
        // Update
        const { error } = await supabase
          .from('prosjekter')
          .update(prosjektData)
          .eq('id', prosjekt.id)
        
        if (error) throw error
      } else {
        // Insert
        const { data, error } = await supabase
          .from('prosjekter')
          .insert({ ...prosjektData, opprettet_av: user?.id })
          .select()
          .single()
        
        if (error) throw error
        prosjektId = data.id
      }

      // Oppdater medlemmer
      if (prosjektId) {
        // Slett eksisterende medlemmer
        await supabase
          .from('prosjekt_medlemmer')
          .delete()
          .eq('prosjekt_id', prosjektId)

        // Legg til nye medlemmer
        if (formData.medlemmer.length > 0) {
          const medlemmerData = formData.medlemmer.map((ansattId: string) => ({
            prosjekt_id: prosjektId,
            ansatt_id: ansattId,
          }))

          await supabase
            .from('prosjekt_medlemmer')
            .insert(medlemmerData)
        }
      }

      onSave()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre prosjekt')
    } finally {
      setSaving(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {prosjekt ? 'Rediger prosjekt' : 'Nytt prosjekt'}
          </h1>
        </div>
        <button onClick={onCancel} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Tilbake
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grunnleggende info */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Prosjektinformasjon
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Prosjektnavn *
              </label>
              <input
                type="text"
                value={formData.navn}
                onChange={(e) => setFormData(prev => ({ ...prev, navn: e.target.value }))}
                className="input"
                placeholder="F.eks. Oppgradering brannalarm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Prosjekttype
              </label>
              <select
                value={formData.prosjekt_type}
                onChange={(e) => setFormData(prev => ({ ...prev, prosjekt_type: e.target.value as any }))}
                className="input"
              >
                {PROSJEKT_TYPER.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tjeneste
              </label>
              <select
                value={formData.tjeneste}
                onChange={(e) => setFormData(prev => ({ ...prev, tjeneste: e.target.value as any }))}
                className="input"
              >
                {TJENESTER.map(tjeneste => (
                  <option key={tjeneste.value} value={tjeneste.value}>{tjeneste.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="input"
              >
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Beskrivelse
              </label>
              <textarea
                value={formData.beskrivelse}
                onChange={(e) => setFormData(prev => ({ ...prev, beskrivelse: e.target.value }))}
                className="input"
                rows={3}
                placeholder="Kort beskrivelse av prosjektet..."
              />
            </div>
          </div>
        </div>

        {/* Kunde og Anlegg */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            Kunde og Anlegg
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kunde */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Velg kunde
              </label>
              {kunder.length === 0 ? (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
                  Laster kunder... ({kunder.length} lastet)
                </div>
              ) : (
                <Combobox
                  options={kunder.map(k => ({ id: k.id, label: k.navn }))}
                  value={formData.kunde_id}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, kunde_id: val, anlegg_id: '' }))
                    setAnleggList([])
                    if (val) loadAnlegg(val)
                  }}
                  placeholder="Søk og velg kunde..."
                  searchPlaceholder="Skriv for å søke..."
                  emptyMessage="Ingen kunder funnet"
                />
              )}
            </div>

            {/* Anlegg */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Velg anlegg
              </label>
              <Combobox
                options={anleggList.map(a => ({ id: a.id, value: a.id, label: a.anleggsnavn }))}
                value={formData.anlegg_id}
                onChange={(val) => setFormData(prev => ({ ...prev, anlegg_id: val }))}
                placeholder="Søk og velg anlegg..."
                searchPlaceholder="Skriv for å søke..."
                emptyMessage="Ingen anlegg funnet"
                disabled={!formData.kunde_id}
              />
            </div>
          </div>
        </div>

        {/* Prosjektleder og Medlemmer */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Team
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Prosjektleder
              </label>
              <select
                value={formData.prosjektleder_id}
                onChange={(e) => setFormData(prev => ({ ...prev, prosjektleder_id: e.target.value }))}
                className="input"
              >
                <option value="">Velg prosjektleder...</option>
                {ansatte.map(ansatt => (
                  <option key={ansatt.id} value={ansatt.id}>{ansatt.navn}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Prosjektmedlemmer
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-700 rounded-lg p-2">
                {ansatte.map(ansatt => (
                  <label key={ansatt.id} className="flex items-center gap-2 cursor-pointer hover:bg-dark-100 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={formData.medlemmer.includes(ansatt.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, medlemmer: [...prev.medlemmer, ansatt.id] }))
                        } else {
                          setFormData(prev => ({ ...prev, medlemmer: prev.medlemmer.filter((id: string) => id !== ansatt.id) }))
                        }
                      }}
                      className="rounded border-gray-600"
                    />
                    <span className="text-sm text-gray-300">{ansatt.navn}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Prioritet */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-white">Prioritet</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PRIORITETER.map(p => (
              <label 
                key={p.value}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.prioritet === p.value
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="prioritet"
                  value={p.value}
                  checked={formData.prioritet === p.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, prioritet: e.target.value as 'lav' | 'normal' | 'hoy' | 'kritisk' }))}
                  className="hidden"
                />
                <span className={`text-sm font-medium ${p.color}`}>{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Dokumentasjonskrav */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Dokumentasjonskrav
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DOKUMENTASJONSKRAV.map(dok => (
              <label 
                key={dok.value}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.dokumentasjonskrav.includes(dok.value)
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.dokumentasjonskrav.includes(dok.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({ 
                        ...prev, 
                        dokumentasjonskrav: [...prev.dokumentasjonskrav, dok.value] 
                      }))
                    } else {
                      setFormData(prev => ({ 
                        ...prev, 
                        dokumentasjonskrav: prev.dokumentasjonskrav.filter((d: string) => d !== dok.value) 
                      }))
                    }
                  }}
                  className="rounded border-gray-600"
                />
                <span className="text-sm text-gray-300">{dok.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Tegninger */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Tegninger
          </h2>

          {/* Tegninger status - Oppdatere eller Opprette */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Hva skal gjøres med tegninger?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TEGNINGER_STATUS.map(ts => (
                <label 
                  key={ts.value}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.tegninger_status === ts.value
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="tegninger_status"
                    value={ts.value}
                    checked={formData.tegninger_status === ts.value}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      tegninger_status: e.target.value as 'oppdatere_gamle' | 'opprette_nye',
                      tegninger_kilde: e.target.value === 'oppdatere_gamle' ? null : prev.tegninger_kilde
                    }))}
                    className="hidden"
                  />
                  <span className="text-sm text-gray-300">{ts.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tegninger kilde - Kun hvis "Opprette nye" er valgt */}
          {formData.tegninger_status === 'opprette_nye' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Hvordan skal tegningene lages?
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {TEGNINGER_KILDE.map(tk => (
                  <label 
                    key={tk.value}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.tegninger_kilde === tk.value
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tegninger_kilde"
                      value={tk.value}
                      checked={formData.tegninger_kilde === tk.value}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        tegninger_kilde: e.target.value as '3d_scanning' | 'kladd_for_hand' | 'underlag_fra_kunde'
                      }))}
                      className="hidden"
                    />
                    <span className="text-sm text-gray-300">{tk.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Tegninger typer */}
          {formData.tegninger_status && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type tegninger
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TEGNINGER_TYPER.map(tt => (
                  <label 
                    key={tt.value}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.tegninger_typer.includes(tt.value)
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.tegninger_typer.includes(tt.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ 
                            ...prev, 
                            tegninger_typer: [...prev.tegninger_typer, tt.value] 
                          }))
                        } else {
                          setFormData(prev => ({ 
                            ...prev, 
                            tegninger_typer: prev.tegninger_typer.filter((t: string) => t !== tt.value) 
                          }))
                        }
                      }}
                      className="rounded border-gray-600"
                    />
                    <span className="text-sm text-gray-300">{tt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Datoer */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Tidsplan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Startdato
              </label>
              <input
                type="date"
                value={formData.startdato}
                onChange={(e) => setFormData(prev => ({ ...prev, startdato: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Forventet sluttdato
              </label>
              <input
                type="date"
                value={formData.forventet_sluttdato}
                onChange={(e) => setFormData(prev => ({ ...prev, forventet_sluttdato: e.target.value }))}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Notater */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-white">Notater</h2>
          <textarea
            value={formData.notater}
            onChange={(e) => setFormData(prev => ({ ...prev, notater: e.target.value }))}
            className="input"
            rows={4}
            placeholder="Interne notater om prosjektet..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Avbryt
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Lagrer...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {prosjekt ? 'Lagre endringer' : 'Opprett prosjekt'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// Prosjekt Dokumenter Component - Håndterer dokumentasjonskrav med status og Dropbox-kobling
function ProsjektDokumenter({ 
  prosjekt,
  onRefresh
}: { 
  prosjekt: Prosjekt
  onRefresh: () => void
}) {
  const navigate = useNavigate()
  const [dokumenter, setDokumenter] = useState<ProsjektDokument[]>([])
  const [dropboxFiles, setDropboxFiles] = useState<Record<string, DropboxEntry[]>>({})
  const [loading, setLoading] = useState(true)
  const [savingStatus, setSavingStatus] = useState<string | null>(null)

  useEffect(() => {
    loadDokumenter()
    if (prosjekt.kunde && prosjekt.anlegg) {
      loadDropboxFiles()
    }
  }, [prosjekt.id])

  async function loadDokumenter() {
    try {
      const { data, error } = await supabase
        .from('prosjekt_dokumenter')
        .select('*')
        .eq('prosjekt_id', prosjekt.id)
        .order('created_at')

      if (error) throw error
      setDokumenter(data || [])
    } catch (error) {
      console.error('Feil ved lasting av dokumenter:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadDropboxFiles() {
    if (!prosjekt.kunde || !prosjekt.anlegg) return
    
    // Hent kundenummer fra kunde-tabellen
    const { data: kundeData } = await supabase
      .from('customer')
      .select('kunde_nummer')
      .eq('id', prosjekt.kunde_id)
      .single()

    if (!kundeData?.kunde_nummer) return

    const anleggPath = buildAnleggDropboxPath(
      kundeData.kunde_nummer,
      prosjekt.kunde.navn,
      prosjekt.anlegg.anleggsnavn
    )

    // Last inn filer for hver dokumenttype
    const filesMap: Record<string, DropboxEntry[]> = {}
    
    for (const dok of DOKUMENTASJONSKRAV) {
      if (prosjekt.dokumentasjonskrav?.includes(dok.value)) {
        const folderPath = `${anleggPath}/${dok.dropboxFolder}`
        const result = await listDropboxFolder(folderPath)
        if (result.success && result.entries) {
          filesMap[dok.value] = result.entries.filter(e => e['.tag'] === 'file')
        }
      }
    }
    
    setDropboxFiles(filesMap)
  }

  async function updateDokumentStatus(dokumentType: string, newStatus: 'ikke_startet' | 'pagaende' | 'fullfort') {
    setSavingStatus(dokumentType)
    try {
      // Finn eksisterende dokument eller opprett nytt
      const existing = dokumenter.find(d => d.dokument_type === dokumentType)
      
      if (existing) {
        const { error } = await supabase
          .from('prosjekt_dokumenter')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('prosjekt_dokumenter')
          .insert({
            prosjekt_id: prosjekt.id,
            dokument_type: dokumentType,
            status: newStatus
          })
        
        if (error) throw error
      }
      
      await loadDokumenter()
      onRefresh()
    } catch (error) {
      console.error('Feil ved oppdatering av dokumentstatus:', error)
    } finally {
      setSavingStatus(null)
    }
  }

  function getDokumentStatus(dokumentType: string): 'ikke_startet' | 'pagaende' | 'fullfort' {
    const dok = dokumenter.find(d => d.dokument_type === dokumentType)
    return dok?.status || 'ikke_startet'
  }

  if (!prosjekt.dokumentasjonskrav || prosjekt.dokumentasjonskrav.length === 0) {
    return null
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        Dokumentasjonskrav
      </h3>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {prosjekt.dokumentasjonskrav.map(krav => {
            const dokKrav = DOKUMENTASJONSKRAV.find(d => d.value === krav)
            const currentStatus = getDokumentStatus(krav)
            const statusConfig = DOKUMENT_STATUS.find(s => s.value === currentStatus)
            const files = dropboxFiles[krav] || []
            // Finn siste fil (sortert etter server_modified)
            const latestFile = files.length > 0 
              ? files.sort((a, b) => (b.server_modified || '').localeCompare(a.server_modified || ''))[0]
              : null

            return (
              <div key={krav} className="border border-gray-700 rounded-lg p-4">
                {/* Header med tittel og status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-white font-medium">{dokKrav?.label || krav}</span>
                  </div>
                  
                  {/* Status dropdown */}
                  <div className="flex items-center gap-2">
                    {savingStatus === krav ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <select
                        value={currentStatus}
                        onChange={(e) => updateDokumentStatus(krav, e.target.value as any)}
                        className={`text-sm px-3 py-1 rounded-full border-0 cursor-pointer ${statusConfig?.color}`}
                      >
                        {DOKUMENT_STATUS.map(s => (
                          <option key={s.value} value={s.value} className="bg-dark-200 text-white">
                            {s.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Siste versjon fra Dropbox */}
                {latestFile && (
                  <div className="bg-dark-100 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1">Siste versjon på anlegget:</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300 truncate max-w-[200px]">{latestFile.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {latestFile.server_modified ? formatDate(latestFile.server_modified) : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* Ingen filer funnet */}
                {files.length === 0 && prosjekt.kunde && prosjekt.anlegg && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
                    <p className="text-sm text-yellow-400">
                      Ingen {dokKrav?.label?.toLowerCase()} funnet for dette anlegget
                    </p>
                  </div>
                )}

                {/* Lenke til modul */}
                {dokKrav?.modulePath && prosjekt.anlegg_id && (
                  <button
                    onClick={() => {
                      // Map modulePath til riktig tab-navn
                      const tabMap: Record<string, string> = {
                        '/teknisk/detektorliste': 'detektorliste',
                        '/teknisk/alarmorganisering': 'alarmorganisering',
                      }
                      const tab = tabMap[dokKrav.modulePath || ''] || 'detektorliste'
                      navigate('/teknisk', { 
                        state: { 
                          tab,
                          anleggId: prosjekt.anlegg_id,
                          kundeId: prosjekt.kunde_id,
                          prosjektId: prosjekt.id
                        } 
                      })
                    }}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {files.length > 0 ? `Oppdater ${dokKrav.moduleName}` : `Opprett ${dokKrav.moduleName}`}
                  </button>
                )}

                {/* Vis antall filer hvis flere enn 1 */}
                {files.length > 1 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Totalt {files.length} filer i Dropbox-mappen
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Prosjekt Details Component
function ProsjektDetails({ 
  prosjekt, 
  onEdit, 
  onBack,
  onRefresh
}: { 
  prosjekt: Prosjekt
  onEdit: () => void
  onBack: () => void
  onRefresh: () => void
}) {
  const statusConfig = STATUS_CONFIG[prosjekt.status] || { label: prosjekt.status || 'Ukjent', color: 'bg-gray-500/20 text-gray-400', icon: Clock }
  const StatusIcon = statusConfig.icon
  const tjeneste = TJENESTER.find(t => t.value === prosjekt.tjeneste)
  const prosjektType = PROSJEKT_TYPER.find(t => t.value === prosjekt.prosjekt_type)
  const prioritet = PRIORITETER.find(p => p.value === prosjekt.prioritet)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {prosjekt.prosjektnummer && (
            <p className="text-sm text-primary font-mono mb-1">{prosjekt.prosjektnummer}</p>
          )}
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{prosjekt.navn}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${statusConfig.color}`}>
              <StatusIcon className="w-4 h-4" />
              {statusConfig.label}
            </span>
          </div>
          {prosjekt.kunde && (
            <p className="text-gray-400 flex items-center gap-2">
              <Building className="w-4 h-4" />
              {prosjekt.kunde.navn}
              {prosjekt.anlegg && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  {prosjekt.anlegg.anleggsnavn}
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="btn-secondary flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Rediger
          </button>
          <button onClick={onBack} className="btn-secondary flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Tilbake
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Beskrivelse */}
          {prosjekt.beskrivelse && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-2">Beskrivelse</h3>
              <p className="text-gray-400">{prosjekt.beskrivelse}</p>
            </div>
          )}

          {/* Dokumentasjonskrav med status og Dropbox-filer */}
          <ProsjektDokumenter prosjekt={prosjekt} onRefresh={onRefresh} />

          {/* Framdriftsplan */}
          <ProsjektFramdrift 
            prosjektId={prosjekt.id}
            teamMedlemmer={[
              ...(prosjekt.prosjektleder ? [{ id: prosjekt.prosjektleder.id, navn: prosjekt.prosjektleder.navn }] : []),
              ...(prosjekt.prosjekt_medlemmer?.map(m => ({ id: m.ansatt.id, navn: m.ansatt.navn })) || [])
            ]}
            onUpdate={onRefresh}
          />

          {/* Team */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Team</h3>
            <div className="space-y-3">
              {prosjekt.prosjektleder && (
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <User className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-white font-medium">{prosjekt.prosjektleder.navn}</p>
                    <p className="text-sm text-gray-400">Prosjektleder</p>
                  </div>
                </div>
              )}
              {prosjekt.prosjekt_medlemmer && prosjekt.prosjekt_medlemmer.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {prosjekt.prosjekt_medlemmer.map(medlem => (
                    <div key={medlem.ansatt.id} className="flex items-center gap-2 p-2 bg-dark-100 rounded-lg">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 text-sm">{medlem.ansatt.navn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Detaljer</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="text-gray-300">{prosjektType?.label}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Tjeneste</dt>
                <dd className="text-gray-300">{tjeneste?.label}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Prioritet</dt>
                <dd className={prioritet?.color}>{prioritet?.label || 'Normal'}</dd>
              </div>
              {prosjekt.startdato && (
                <div>
                  <dt className="text-sm text-gray-500">Startdato</dt>
                  <dd className="text-gray-300">{formatDate(prosjekt.startdato)}</dd>
                </div>
              )}
              {prosjekt.forventet_sluttdato && (
                <div>
                  <dt className="text-sm text-gray-500">Forventet sluttdato</dt>
                  <dd className="text-gray-300">{formatDate(prosjekt.forventet_sluttdato)}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500">Opprettet</dt>
                <dd className="text-gray-300">{formatDate(prosjekt.created_at)}</dd>
              </div>
            </dl>
          </div>

          {prosjekt.notater && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-2">Notater</h3>
              <p className="text-gray-400 text-sm whitespace-pre-wrap">{prosjekt.notater}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
