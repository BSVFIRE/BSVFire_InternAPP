import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { 
  AlertCircle, 
  Plus, 
  Search, 
  X,
  Save,
  Trash2,
  Edit,
  Building2,
  User,
  Calendar,
  MapPin,
  RefreshCw,
  ArrowLeft
} from 'lucide-react'

const log = createLogger('KsHmsHendelser')

interface Hendelse {
  id: string
  kunde_id: string | null
  anlegg_id: string | null
  tittel: string
  beskrivelse: string
  type: string
  alvorlighetsgrad: string
  status: string
  dato: string
  registrert_av: string | null
  sted: string | null
  involverte_personer: string | null
  vitner: string | null
  aarsak_analyse: string | null
  forebyggende_tiltak: string | null
  created_at: string
  kunde?: { navn: string } | null
  anlegg?: { navn: string } | null
  ansatt?: { navn: string } | null
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

const TYPER = ['Ulykke', 'Nestenulykke', 'Miljøhendelse', 'Annet']
const ALVORLIGHETSGRADER = ['Lav', 'Middels', 'Høy', 'Kritisk']
const STATUSER = ['Åpen', 'Under utredning', 'Lukket']

export function KsHmsHendelser() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [hendelser, setHendelser] = useState<Hendelse[]>([])
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Hendelse | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('alle')
  const [typeFilter, setTypeFilter] = useState<string>('alle')
  
  // Søkbar kunde/anlegg dropdown state
  const [kundeSearch, setKundeSearch] = useState('')
  const [showKundeDropdown, setShowKundeDropdown] = useState(false)
  const [anleggSearch, setAnleggSearch] = useState('')
  const [showAnleggDropdown, setShowAnleggDropdown] = useState(false)

  const [formData, setFormData] = useState({
    tittel: '',
    beskrivelse: '',
    type: 'Nestenulykke',
    alvorlighetsgrad: 'Lav',
    status: 'Åpen',
    dato: new Date().toISOString().split('T')[0],
    registrert_av: '',
    sted: '',
    involverte_personer: '',
    vitner: '',
    aarsak_analyse: '',
    forebyggende_tiltak: '',
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
        loadHendelser(),
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

  async function loadHendelser() {
    const { data, error } = await supabase
      .from('hendelser')
      .select(`
        *,
        kunde:customer(navn),
        anlegg:anlegg(navn),
        ansatt:ansatte!hendelser_registrert_av_fkey(navn)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    setHendelser(data || [])
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
      type: 'Nestenulykke',
      alvorlighetsgrad: 'Lav',
      status: 'Åpen',
      dato: new Date().toISOString().split('T')[0],
      registrert_av: '',
      sted: '',
      involverte_personer: '',
      vitner: '',
      aarsak_analyse: '',
      forebyggende_tiltak: '',
      kunde_id: '',
      anlegg_id: ''
    })
    setKundeSearch('')
    setAnleggSearch('')
    setShowKundeDropdown(false)
    setShowAnleggDropdown(false)
    setShowModal(true)
  }

  function openEditModal(item: Hendelse) {
    setEditingItem(item)
    setFormData({
      tittel: item.tittel,
      beskrivelse: item.beskrivelse,
      type: item.type,
      alvorlighetsgrad: item.alvorlighetsgrad,
      status: item.status,
      dato: item.dato,
      registrert_av: item.registrert_av || '',
      sted: item.sted || '',
      involverte_personer: item.involverte_personer || '',
      vitner: item.vitner || '',
      aarsak_analyse: item.aarsak_analyse || '',
      forebyggende_tiltak: item.forebyggende_tiltak || '',
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
        type: formData.type,
        alvorlighetsgrad: formData.alvorlighetsgrad,
        status: formData.status,
        dato: formData.dato,
        registrert_av: formData.registrert_av || null,
        sted: formData.sted || null,
        involverte_personer: formData.involverte_personer || null,
        vitner: formData.vitner || null,
        aarsak_analyse: formData.aarsak_analyse || null,
        forebyggende_tiltak: formData.forebyggende_tiltak || null,
        kunde_id: formData.kunde_id || null,
        anlegg_id: formData.anlegg_id || null
      }

      if (editingItem) {
        const { error } = await supabase
          .from('hendelser')
          .update(payload)
          .eq('id', editingItem.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('hendelser')
          .insert(payload)
        
        if (error) throw error
      }

      setShowModal(false)
      await loadHendelser()
    } catch (error) {
      log.error('Feil ved lagring', { error })
      alert('Kunne ikke lagre hendelse')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne hendelsen?')) return

    try {
      const { error } = await supabase
        .from('hendelser')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      await loadHendelser()
    } catch (error) {
      log.error('Feil ved sletting', { error })
      alert('Kunne ikke slette hendelse')
    }
  }

  function getTypeColor(type: string) {
    switch (type) {
      case 'Ulykke': return 'bg-red-500/20 text-red-400'
      case 'Nestenulykke': return 'bg-orange-500/20 text-orange-400'
      case 'Miljøhendelse': return 'bg-green-500/20 text-green-400'
      case 'Annet': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  function getAlvorlighetColor(grad: string) {
    switch (grad) {
      case 'Kritisk': return 'bg-red-500/20 text-red-400'
      case 'Høy': return 'bg-orange-500/20 text-orange-400'
      case 'Middels': return 'bg-yellow-500/20 text-yellow-400'
      case 'Lav': return 'bg-green-500/20 text-green-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'Lukket': return 'bg-green-500/20 text-green-400'
      case 'Under utredning': return 'bg-yellow-500/20 text-yellow-400'
      case 'Åpen': return 'bg-blue-500/20 text-blue-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const filteredItems = hendelser.filter(item => {
    const matchesSearch = item.tittel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.beskrivelse.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'alle' || item.status === statusFilter
    const matchesType = typeFilter === 'alle' || item.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
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
              <AlertCircle className="w-7 h-7 text-red-400" />
              Hendelser
            </h1>
          </div>
          <p className="text-gray-400 mt-1">Registrer ulykker, nestenulykker og miljøhendelser</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white transition-colors"
        >
          <Plus className="w-5 h-5" />
          Rapporter Hendelse
        </button>
      </div>

      {/* Filtre */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Søk i hendelser..."
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
          {STATUSER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary"
        >
          <option value="alle">Alle typer</option>
          {TYPER.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Liste */}
      {filteredItems.length === 0 ? (
        <div className="bg-dark-lighter rounded-xl p-12 text-center border border-dark-border">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold text-white mb-2">Ingen hendelser registrert</h3>
          <p className="text-gray-400 mb-6">Rapporter en hendelse for å komme i gang</p>
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white transition-colors"
          >
            <Plus className="w-5 h-5" />
            Rapporter Hendelse
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
                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(item.type)}`}>
                      {item.type}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getAlvorlighetColor(item.alvorlighetsgrad)}`}>
                      {item.alvorlighetsgrad}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">{item.beskrivelse}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    {item.sted && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {item.sted}
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
                {editingItem ? 'Rediger Hendelse' : 'Rapporter Hendelse'}
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
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Hendelsesinformasjon</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tittel *</label>
                  <input
                    type="text"
                    value={formData.tittel}
                    onChange={(e) => setFormData({ ...formData, tittel: e.target.value })}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    placeholder="Kort beskrivelse av hendelsen"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Beskrivelse *</label>
                  <textarea
                    value={formData.beskrivelse}
                    onChange={(e) => setFormData({ ...formData, beskrivelse: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                    placeholder="Detaljert beskrivelse av hva som skjedde"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      {TYPER.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Alvorlighetsgrad</label>
                    <select
                      value={formData.alvorlighetsgrad}
                      onChange={(e) => setFormData({ ...formData, alvorlighetsgrad: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      {ALVORLIGHETSGRADER.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      {STATUSER.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Sted</label>
                  <input
                    type="text"
                    value={formData.sted}
                    onChange={(e) => setFormData({ ...formData, sted: e.target.value })}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    placeholder="Hvor skjedde hendelsen?"
                  />
                </div>
              </div>

              {/* Involverte */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Involverte personer</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Involverte personer</label>
                  <textarea
                    value={formData.involverte_personer}
                    onChange={(e) => setFormData({ ...formData, involverte_personer: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                    placeholder="Hvem var involvert i hendelsen?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Vitner</label>
                  <textarea
                    value={formData.vitner}
                    onChange={(e) => setFormData({ ...formData, vitner: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                    placeholder="Eventuelle vitner til hendelsen"
                  />
                </div>
              </div>

              {/* Analyse og tiltak */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Analyse og tiltak</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Årsaksanalyse</label>
                  <textarea
                    value={formData.aarsak_analyse}
                    onChange={(e) => setFormData({ ...formData, aarsak_analyse: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                    placeholder="Hva var årsaken til hendelsen?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Forebyggende tiltak</label>
                  <textarea
                    value={formData.forebyggende_tiltak}
                    onChange={(e) => setFormData({ ...formData, forebyggende_tiltak: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                    placeholder="Tiltak for å forhindre gjentagelse"
                  />
                </div>
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
