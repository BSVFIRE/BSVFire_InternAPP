import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  X,
  Save,
  Trash2,
  Edit,
  Building2,
  User,
  Calendar,
  RefreshCw,
  ArrowLeft
} from 'lucide-react'

const log = createLogger('KsHmsRisikovurderinger')

interface Risikovurdering {
  id: string
  kunde_id: string | null
  anlegg_id: string | null
  tittel: string
  beskrivelse: string
  risikokategori: string | null
  sannsynlighet: number | null
  konsekvens: number | null
  risikoscore: number | null
  risikoniva: string | null
  status: string
  dato: string
  registrert_av: string | null
  created_at: string
  updated_at: string
  kunde?: { navn: string } | null
  anlegg?: { navn: string } | null
  ansatt?: { navn: string } | null
}

interface Risikokategori {
  navn: string
  beskrivelse: string
  ikon: string
  farge: string
}

interface Ansatt {
  id: string
  navn: string
}

interface Kunde {
  id: string
  navn: string
}

interface Anlegg {
  id: string
  navn: string
  kunde_id: string
}

const SANNSYNLIGHET_LABELS = ['', 'Svært lav', 'Lav', 'Middels', 'Høy', 'Svært høy']
const KONSEKVENS_LABELS = ['', 'Ubetydelig', 'Mindre', 'Moderat', 'Alvorlig', 'Katastrofal']

export function KsHmsRisikovurderinger() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [risikovurderinger, setRisikovurderinger] = useState<Risikovurdering[]>([])
  const [kategorier, setKategorier] = useState<Risikokategori[]>([])
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Risikovurdering | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('alle')
  const [risikoFilter, setRisikoFilter] = useState<string>('alle')
  
  // Søkbar kunde/anlegg dropdown state
  const [kundeSearch, setKundeSearch] = useState('')
  const [showKundeDropdown, setShowKundeDropdown] = useState(false)
  const [anleggSearch, setAnleggSearch] = useState('')
  const [showAnleggDropdown, setShowAnleggDropdown] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    tittel: '',
    beskrivelse: '',
    risikokategori: '',
    sannsynlighet: 0,
    konsekvens: 0,
    status: 'Utkast',
    dato: new Date().toISOString().split('T')[0],
    registrert_av: '',
    kunde_id: '',
    anlegg_id: ''
  })

  useEffect(() => {
    loadData()
    if (searchParams.get('ny') === 'true') {
      setShowModal(true)
      setSearchParams({})
    }
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      await Promise.all([
        loadRisikovurderinger(),
        loadKategorier(),
        loadAnsatte(),
        loadKunder(),
        loadAnlegg()
      ])
    } catch (error) {
      log.error('Feil ved lasting av data', { error })
    } finally {
      setLoading(false)
    }
  }

  async function loadRisikovurderinger() {
    const { data, error } = await supabase
      .from('risikovurderinger')
      .select(`
        *,
        kunde:customer(navn),
        anlegg:anlegg(navn),
        ansatt:ansatte!risikovurderinger_registrert_av_fkey(navn)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    setRisikovurderinger(data || [])
  }

  async function loadKategorier() {
    const { data, error } = await supabase
      .from('risikokategorier')
      .select('navn, beskrivelse, ikon, farge')
      .eq('aktiv', true)
      .order('navn')
    
    if (error) {
      log.warn('Kunne ikke laste risikokategorier, bruker fallback', { error })
      setKategorier(getFallbackKategorier())
    } else {
      setKategorier(data || getFallbackKategorier())
    }
  }

  function getFallbackKategorier(): Risikokategori[] {
    return [
      { navn: 'Brann og eksplosjon', beskrivelse: 'Risiko for brann, eksplosjon og røykutvikling', ikon: 'Flame', farge: '#f44336' },
      { navn: 'Fall og høyder', beskrivelse: 'Risiko for fall fra høyde eller på samme nivå', ikon: 'ArrowDown', farge: '#ff9800' },
      { navn: 'Elektrisk sikkerhet', beskrivelse: 'Risiko knyttet til elektriske installasjoner', ikon: 'Zap', farge: '#2196f3' },
      { navn: 'Kjemikalier og helse', beskrivelse: 'Eksponering for farlige kjemikalier og stoffer', ikon: 'FlaskConical', farge: '#9c27b0' },
      { navn: 'Maskiner og utstyr', beskrivelse: 'Risiko ved bruk av maskiner og teknisk utstyr', ikon: 'Cog', farge: '#607d8b' },
      { navn: 'Ergonomi og belastning', beskrivelse: 'Fysisk belastning og ergonomiske forhold', ikon: 'User', farge: '#4caf50' },
      { navn: 'Trafikk og transport', beskrivelse: 'Risiko knyttet til kjøretøy og transport', ikon: 'Truck', farge: '#795548' },
      { navn: 'Miljø og forurensning', beskrivelse: 'Miljørisiko og forurensning', ikon: 'Leaf', farge: '#8bc34a' },
      { navn: 'Sikkerhet og innbrudd', beskrivelse: 'Tyveri, innbrudd og sikkerhetstrusler', ikon: 'Shield', farge: '#424242' },
      { navn: 'Arbeidsorganisering', beskrivelse: 'Stress, arbeidspress og organisatoriske forhold', ikon: 'Users', farge: '#ff5722' }
    ]
  }

  async function loadAnsatte() {
    const { data } = await supabase
      .from('ansatte')
      .select('id, navn')
      .order('navn')
    setAnsatte(data || [])
  }

  async function loadKunder() {
    const { data } = await supabase
      .from('customer')
      .select('id, navn')
      .order('navn')
    setKunder(data || [])
  }

  async function loadAnlegg() {
    const { data } = await supabase
      .from('anlegg')
      .select('id, navn, kunde_id')
      .order('navn')
    setAnlegg(data || [])
  }

  function openNewModal() {
    setEditingItem(null)
    setFormData({
      tittel: '',
      beskrivelse: '',
      risikokategori: '',
      sannsynlighet: 0,
      konsekvens: 0,
      status: 'Utkast',
      dato: new Date().toISOString().split('T')[0],
      registrert_av: '',
      kunde_id: '',
      anlegg_id: ''
    })
    setKundeSearch('')
    setAnleggSearch('')
    setShowKundeDropdown(false)
    setShowAnleggDropdown(false)
    setShowModal(true)
  }

  function openEditModal(item: Risikovurdering) {
    setEditingItem(item)
    setFormData({
      tittel: item.tittel,
      beskrivelse: item.beskrivelse,
      risikokategori: item.risikokategori || '',
      sannsynlighet: item.sannsynlighet || 0,
      konsekvens: item.konsekvens || 0,
      status: item.status,
      dato: item.dato,
      registrert_av: item.registrert_av || '',
      kunde_id: item.kunde_id || '',
      anlegg_id: item.anlegg_id || ''
    })
    setKundeSearch(item.kunde?.navn || '')
    setAnleggSearch(item.anlegg?.navn || '')
    setShowKundeDropdown(false)
    setShowAnleggDropdown(false)
    setShowModal(true)
  }

  async function handleSave() {
    if (!formData.tittel.trim() || !formData.beskrivelse.trim()) {
      alert('Tittel og beskrivelse er påkrevd')
      return
    }

    setSaving(true)
    try {
      const payload = {
        tittel: formData.tittel.trim(),
        beskrivelse: formData.beskrivelse.trim(),
        risikokategori: formData.risikokategori || null,
        sannsynlighet: formData.sannsynlighet || null,
        konsekvens: formData.konsekvens || null,
        status: formData.status,
        dato: formData.dato,
        registrert_av: formData.registrert_av || null,
        kunde_id: formData.kunde_id || null,
        anlegg_id: formData.anlegg_id || null
      }

      if (editingItem) {
        const { error } = await supabase
          .from('risikovurderinger')
          .update(payload)
          .eq('id', editingItem.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('risikovurderinger')
          .insert(payload)
        
        if (error) throw error
      }

      setShowModal(false)
      await loadRisikovurderinger()
    } catch (error) {
      log.error('Feil ved lagring', { error })
      alert('Kunne ikke lagre risikovurdering')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne risikovurderingen?')) return

    try {
      const { error } = await supabase
        .from('risikovurderinger')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      await loadRisikovurderinger()
    } catch (error) {
      log.error('Feil ved sletting', { error })
      alert('Kunne ikke slette risikovurdering')
    }
  }

  function getRisikoColor(score: number | null) {
    if (!score) return 'bg-gray-500/20 text-gray-400'
    if (score <= 5) return 'bg-green-500/20 text-green-400'
    if (score <= 15) return 'bg-yellow-500/20 text-yellow-400'
    return 'bg-red-500/20 text-red-400'
  }

  function getRisikoNivaColor(niva: string | null) {
    switch (niva) {
      case 'LAV': return 'bg-green-500/20 text-green-400'
      case 'MIDDELS': return 'bg-yellow-500/20 text-yellow-400'
      case 'HØY': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'Ferdig': return 'bg-green-500/20 text-green-400'
      case 'Under arbeid': return 'bg-yellow-500/20 text-yellow-400'
      case 'Utkast': return 'bg-blue-500/20 text-blue-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const filteredItems = risikovurderinger.filter(item => {
    const matchesSearch = item.tittel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.beskrivelse.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'alle' || item.status === statusFilter
    const matchesRisiko = risikoFilter === 'alle' || item.risikoniva === risikoFilter
    return matchesSearch && matchesStatus && matchesRisiko
  })

  const filteredAnlegg = formData.kunde_id 
    ? anlegg.filter(a => a.kunde_id === formData.kunde_id)
    : anlegg

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/ks-hms')}
              className="p-2 hover:bg-dark-lighter rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <AlertTriangle className="w-7 h-7 text-blue-400" />
              Risikovurderinger
            </h1>
          </div>
          <p className="text-gray-400 mt-1">Opprett og administrer risikovurderinger</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white transition-colors"
        >
          <Plus className="w-5 h-5" />
          Ny Risikovurdering
        </button>
      </div>

      {/* Filtre */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Søk i risikovurderinger..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary"
        >
          <option value="alle">Alle statuser</option>
          <option value="Utkast">Utkast</option>
          <option value="Under arbeid">Under arbeid</option>
          <option value="Ferdig">Ferdig</option>
        </select>
        <select
          value={risikoFilter}
          onChange={(e) => setRisikoFilter(e.target.value)}
          className="px-4 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary"
        >
          <option value="alle">Alle risikonivåer</option>
          <option value="LAV">Lav risiko</option>
          <option value="MIDDELS">Middels risiko</option>
          <option value="HØY">Høy risiko</option>
        </select>
      </div>

      {/* Liste */}
      {filteredItems.length === 0 ? (
        <div className="bg-dark-lighter rounded-xl p-12 text-center border border-dark-border">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold text-white mb-2">Ingen risikovurderinger</h3>
          <p className="text-gray-400 mb-6">Opprett din første risikovurdering for å komme i gang</p>
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white transition-colors"
          >
            <Plus className="w-5 h-5" />
            Ny Risikovurdering
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-dark-lighter rounded-xl p-5 border border-dark-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white truncate">{item.tittel}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    {item.risikoniva && (
                      <span className={`px-2 py-1 text-xs rounded-full ${getRisikoNivaColor(item.risikoniva)}`}>
                        {item.risikoniva} ({item.risikoscore})
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">{item.beskrivelse}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    {item.risikokategori && (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {item.risikokategori}
                      </span>
                    )}
                    {item.kunde?.navn && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {item.kunde.navn}
                      </span>
                    )}
                    {item.ansatt?.navn && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.ansatt.navn}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.dato).toLocaleDateString('nb-NO')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 hover:bg-dark rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 hover:bg-dark rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1a1a2e] border-b border-dark-border p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingItem ? 'Rediger Risikovurdering' : 'Ny Risikovurdering'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-dark rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Grunnleggende info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Grunnleggende informasjon</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tittel *</label>
                  <input
                    type="text"
                    value={formData.tittel}
                    onChange={(e) => setFormData({ ...formData, tittel: e.target.value })}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    placeholder="Gi risikovurderingen en beskrivende tittel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Beskrivelse *</label>
                  <textarea
                    value={formData.beskrivelse}
                    onChange={(e) => setFormData({ ...formData, beskrivelse: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                    placeholder="Beskriv risikoen og situasjonen"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Risikokategori</label>
                    <select
                      value={formData.risikokategori}
                      onChange={(e) => setFormData({ ...formData, risikokategori: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      <option value="">Velg kategori</option>
                      {kategorier.map((k) => (
                        <option key={k.navn} value={k.navn}>{k.navn}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      <option value="Utkast">Utkast</option>
                      <option value="Under arbeid">Under arbeid</option>
                      <option value="Ferdig">Ferdig</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Risikoscoring */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Risikoscoring</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Sannsynlighet (1-5)</label>
                    <select
                      value={formData.sannsynlighet}
                      onChange={(e) => setFormData({ ...formData, sannsynlighet: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      <option value={0}>Ikke vurdert</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n} - {SANNSYNLIGHET_LABELS[n]}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Konsekvens (1-5)</label>
                    <select
                      value={formData.konsekvens}
                      onChange={(e) => setFormData({ ...formData, konsekvens: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      <option value={0}>Ikke vurdert</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n} - {KONSEKVENS_LABELS[n]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.sannsynlighet > 0 && formData.konsekvens > 0 && (
                  <div className={`p-4 rounded-lg ${getRisikoColor(formData.sannsynlighet * formData.konsekvens)}`}>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        Risikoscore: {formData.sannsynlighet * formData.konsekvens}
                      </div>
                      <div className="text-sm mt-1">
                        Risikonivå: {formData.sannsynlighet * formData.konsekvens <= 5 ? 'LAV' : formData.sannsynlighet * formData.konsekvens <= 15 ? 'MIDDELS' : 'HØY'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tilknytning */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Tilknytning</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Kunde</label>
                    <input
                      type="text"
                      value={kundeSearch}
                      onChange={(e) => {
                        setKundeSearch(e.target.value)
                        setShowKundeDropdown(true)
                      }}
                      onFocus={() => setShowKundeDropdown(true)}
                      placeholder={formData.kunde_id ? kunder.find(k => k.id === formData.kunde_id)?.navn : 'Søk etter kunde...'}
                      className="w-full px-4 py-2 bg-[#0d0d1a] border border-dark-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary"
                    />
                    {formData.kunde_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, kunde_id: '', anlegg_id: '' })
                          setKundeSearch('')
                        }}
                        className="absolute right-2 top-8 text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {showKundeDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-[#1a1a2e] border border-dark-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {kunder
                          .filter(k => k.navn.toLowerCase().includes(kundeSearch.toLowerCase()))
                          .slice(0, 20)
                          .map((k) => (
                            <button
                              key={k.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, kunde_id: k.id, anlegg_id: '' })
                                setKundeSearch(k.navn)
                                setShowKundeDropdown(false)
                              }}
                              className="w-full px-4 py-2 text-left text-white hover:bg-primary/20 transition-colors bg-transparent"
                            >
                              {k.navn}
                            </button>
                          ))}
                        {kunder.filter(k => k.navn.toLowerCase().includes(kundeSearch.toLowerCase())).length === 0 && (
                          <div className="px-4 py-2 text-gray-400">Ingen kunder funnet</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Anlegg</label>
                    <input
                      type="text"
                      value={anleggSearch}
                      onChange={(e) => {
                        setAnleggSearch(e.target.value)
                        setShowAnleggDropdown(true)
                      }}
                      onFocus={() => setShowAnleggDropdown(true)}
                      placeholder={formData.anlegg_id ? filteredAnlegg.find(a => a.id === formData.anlegg_id)?.navn : 'Søk etter anlegg...'}
                      className="w-full px-4 py-2 bg-[#0d0d1a] border border-dark-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary"
                    />
                    {formData.anlegg_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, anlegg_id: '' })
                          setAnleggSearch('')
                        }}
                        className="absolute right-2 top-8 text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {showAnleggDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-[#1a1a2e] border border-dark-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredAnlegg
                          .filter(a => a.navn.toLowerCase().includes(anleggSearch.toLowerCase()))
                          .slice(0, 20)
                          .map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, anlegg_id: a.id })
                                setAnleggSearch(a.navn)
                                setShowAnleggDropdown(false)
                              }}
                              className="w-full px-4 py-2 text-left text-white hover:bg-primary/20 transition-colors bg-transparent"
                            >
                              {a.navn}
                            </button>
                          ))}
                        {filteredAnlegg.filter(a => a.navn.toLowerCase().includes(anleggSearch.toLowerCase())).length === 0 && (
                          <div className="px-4 py-2 text-gray-400">Ingen anlegg funnet</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Registrert av</label>
                    <select
                      value={formData.registrert_av}
                      onChange={(e) => setFormData({ ...formData, registrert_av: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      <option value="">Velg ansatt</option>
                      {ansatte.map((a) => (
                        <option key={a.id} value={a.id}>{a.navn}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Dato</label>
                    <input
                      type="date"
                      value={formData.dato}
                      onChange={(e) => setFormData({ ...formData, dato: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#1a1a2e] border-t border-dark-border p-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white transition-colors disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Lagrer...' : 'Lagre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
