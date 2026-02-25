import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { 
  XCircle, 
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

const log = createLogger('KsHmsAvvik')

interface Avvik {
  id: string
  kunde_id: string | null
  anlegg_id: string | null
  tittel: string
  beskrivelse: string
  kategori: string
  alvorlighetsgrad: string
  status: string
  dato: string
  registrert_av: string | null
  oppdaget_av: string | null
  ansvarlig_for_lukking: string | null
  korrigerende_tiltak: string | null
  forebyggende_tiltak: string | null
  lukket_dato: string | null
  created_at: string
  kunde?: { navn: string } | null
  anlegg?: { anleggsnavn: string } | null
  ansatt?: { navn: string } | null
  ansvarlig?: { navn: string } | null
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
  anleggsnavn: string
  kundenr: string
}

const KATEGORIER = ['Sikkerhet', 'Kvalitet', 'Miljø', 'Prosedyre']
const ALVORLIGHETSGRADER = ['Lav', 'Middels', 'Høy', 'Kritisk']
const STATUSER = ['Åpen', 'Under behandling', 'Lukket']

export function KsHmsAvvik() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [avvik, setAvvik] = useState<Avvik[]>([])
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Avvik | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('alle')
  const [kategoriFilter, setKategoriFilter] = useState<string>('alle')
  
  // Søkbar kunde/anlegg dropdown state
  const [kundeSearch, setKundeSearch] = useState('')
  const [showKundeDropdown, setShowKundeDropdown] = useState(false)
  const [anleggSearch, setAnleggSearch] = useState('')
  const [showAnleggDropdown, setShowAnleggDropdown] = useState(false)

  const [formData, setFormData] = useState({
    tittel: '',
    beskrivelse: '',
    kategori: 'Sikkerhet',
    alvorlighetsgrad: 'Lav',
    status: 'Åpen',
    dato: new Date().toISOString().split('T')[0],
    registrert_av: '',
    oppdaget_av: '',
    ansvarlig_for_lukking: '',
    korrigerende_tiltak: '',
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
        loadAvvik(),
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

  async function loadAvvik() {
    const { data, error } = await supabase
      .from('avvik')
      .select(`
        *,
        kunde:customer(navn),
        anlegg:anlegg(anleggsnavn),
        ansatt:ansatte!avvik_registrert_av_fkey(navn),
        ansvarlig:ansatte!avvik_ansvarlig_for_lukking_fkey(navn)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    setAvvik(data || [])
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
      .select('id, anleggsnavn, kundenr')
      .order('anleggsnavn')
    setAnlegg(data || [])
  }

  function openNewModal() {
    setEditingItem(null)
    setFormData({
      tittel: '',
      beskrivelse: '',
      kategori: 'Sikkerhet',
      alvorlighetsgrad: 'Lav',
      status: 'Åpen',
      dato: new Date().toISOString().split('T')[0],
      registrert_av: '',
      oppdaget_av: '',
      ansvarlig_for_lukking: '',
      korrigerende_tiltak: '',
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

  function openEditModal(item: Avvik) {
    setEditingItem(item)
    setFormData({
      tittel: item.tittel,
      beskrivelse: item.beskrivelse,
      kategori: item.kategori,
      alvorlighetsgrad: item.alvorlighetsgrad,
      status: item.status,
      dato: item.dato,
      registrert_av: item.registrert_av || '',
      oppdaget_av: item.oppdaget_av || '',
      ansvarlig_for_lukking: item.ansvarlig_for_lukking || '',
      korrigerende_tiltak: item.korrigerende_tiltak || '',
      forebyggende_tiltak: item.forebyggende_tiltak || '',
      kunde_id: item.kunde_id || '',
      anlegg_id: item.anlegg_id || ''
    })
    setKundeSearch(item.kunde?.navn || '')
    setAnleggSearch(item.anlegg?.anleggsnavn || '')
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
        kategori: formData.kategori,
        alvorlighetsgrad: formData.alvorlighetsgrad,
        status: formData.status,
        dato: formData.dato,
        registrert_av: formData.registrert_av || null,
        oppdaget_av: formData.oppdaget_av || null,
        ansvarlig_for_lukking: formData.ansvarlig_for_lukking || null,
        korrigerende_tiltak: formData.korrigerende_tiltak || null,
        forebyggende_tiltak: formData.forebyggende_tiltak || null,
        kunde_id: formData.kunde_id || null,
        anlegg_id: formData.anlegg_id || null,
        lukket_dato: formData.status === 'Lukket' ? new Date().toISOString().split('T')[0] : null
      }

      if (editingItem) {
        const { error } = await supabase
          .from('avvik')
          .update(payload)
          .eq('id', editingItem.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('avvik')
          .insert(payload)
        
        if (error) throw error
      }

      setShowModal(false)
      await loadAvvik()
    } catch (error) {
      log.error('Feil ved lagring', { error })
      alert('Kunne ikke lagre avvik')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Er du sikker på at du vil slette dette avviket?')) return

    try {
      const { error } = await supabase
        .from('avvik')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      await loadAvvik()
    } catch (error) {
      log.error('Feil ved sletting', { error })
      alert('Kunne ikke slette avvik')
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
      case 'Under behandling': return 'bg-yellow-500/20 text-yellow-400'
      case 'Åpen': return 'bg-blue-500/20 text-blue-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  function getKategoriColor(kategori: string) {
    switch (kategori) {
      case 'Sikkerhet': return 'text-red-400'
      case 'Kvalitet': return 'text-blue-400'
      case 'Miljø': return 'text-green-400'
      case 'Prosedyre': return 'text-purple-400'
      default: return 'text-gray-400'
    }
  }

  const filteredItems = avvik.filter(item => {
    const matchesSearch = item.tittel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.beskrivelse.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'alle' || item.status === statusFilter
    const matchesKategori = kategoriFilter === 'alle' || item.kategori === kategoriFilter
    return matchesSearch && matchesStatus && matchesKategori
  })

  const filteredAnlegg = formData.kunde_id 
    ? anlegg.filter(a => a.kundenr === formData.kunde_id)
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
              <XCircle className="w-7 h-7 text-orange-400" />
              Avvik
            </h1>
          </div>
          <p className="text-gray-400 mt-1">Avvikshåndtering og oppfølging</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white transition-colors"
        >
          <Plus className="w-5 h-5" />
          Meld Avvik
        </button>
      </div>

      {/* Filtre */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Søk i avvik..."
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
          value={kategoriFilter}
          onChange={(e) => setKategoriFilter(e.target.value)}
          className="px-4 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary"
        >
          <option value="alle">Alle kategorier</option>
          {KATEGORIER.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      {/* Liste */}
      {filteredItems.length === 0 ? (
        <div className="bg-dark-lighter rounded-xl p-12 text-center border border-dark-border">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold text-white mb-2">Ingen avvik registrert</h3>
          <p className="text-gray-400 mb-6">Meld et avvik for å komme i gang</p>
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white transition-colors"
          >
            <Plus className="w-5 h-5" />
            Meld Avvik
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
                    <span className={`px-2 py-1 text-xs rounded-full ${getAlvorlighetColor(item.alvorlighetsgrad)}`}>
                      {item.alvorlighetsgrad}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">{item.beskrivelse}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span className={`flex items-center gap-1 ${getKategoriColor(item.kategori)}`}>
                      {item.kategori}
                    </span>
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
                {editingItem ? 'Rediger Avvik' : 'Meld Avvik'}
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
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Avviksinformasjon</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tittel *</label>
                  <input
                    type="text"
                    value={formData.tittel}
                    onChange={(e) => setFormData({ ...formData, tittel: e.target.value })}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    placeholder="Kort beskrivelse av avviket"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Beskrivelse *</label>
                  <textarea
                    value={formData.beskrivelse}
                    onChange={(e) => setFormData({ ...formData, beskrivelse: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                    placeholder="Detaljert beskrivelse av avviket"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Kategori</label>
                    <select
                      value={formData.kategori}
                      onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      {KATEGORIER.map(k => <option key={k} value={k}>{k}</option>)}
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
              </div>

              {/* Tiltak */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Tiltak</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Korrigerende tiltak</label>
                  <textarea
                    value={formData.korrigerende_tiltak}
                    onChange={(e) => setFormData({ ...formData, korrigerende_tiltak: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                    placeholder="Tiltak for å rette avviket"
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
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Tilknytning og ansvar</h3>
                
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
                      placeholder={formData.anlegg_id ? filteredAnlegg.find(a => a.id === formData.anlegg_id)?.anleggsnavn : 'Søk etter anlegg...'}
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
                          .filter(a => a.anleggsnavn.toLowerCase().includes(anleggSearch.toLowerCase()))
                          .slice(0, 20)
                          .map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, anlegg_id: a.id })
                                setAnleggSearch(a.anleggsnavn)
                                setShowAnleggDropdown(false)
                              }}
                              className="w-full px-4 py-2 text-left text-white hover:bg-primary/20 transition-colors bg-transparent"
                            >
                              {a.anleggsnavn}
                            </button>
                          ))}
                        {filteredAnlegg.filter(a => a.anleggsnavn.toLowerCase().includes(anleggSearch.toLowerCase())).length === 0 && (
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">Ansvarlig for lukking</label>
                    <select
                      value={formData.ansvarlig_for_lukking}
                      onChange={(e) => setFormData({ ...formData, ansvarlig_for_lukking: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      <option value="">Velg ansvarlig</option>
                      {ansatte.map((a) => (
                        <option key={a.id} value={a.id}>{a.navn}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Oppdaget av</label>
                    <input
                      type="text"
                      value={formData.oppdaget_av}
                      onChange={(e) => setFormData({ ...formData, oppdaget_av: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                      placeholder="Navn på person som oppdaget avviket"
                    />
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
