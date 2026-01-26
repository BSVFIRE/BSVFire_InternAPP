import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { 
  CheckSquare, 
  Plus, 
  Search, 
  X,
  Save,
  Trash2,
  Edit,
  User,
  Calendar,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  XCircle,
  ArrowLeft
} from 'lucide-react'

const log = createLogger('KsHmsTiltak')

interface Tiltak {
  id: string
  relatert_til_type: string | null
  relatert_til_id: string | null
  tittel: string
  beskrivelse: string
  type: string | null
  ansvarlig: string | null
  frist: string | null
  status: string
  prioritet: string
  kostnad: number | null
  kommentarer: string | null
  fullfort_dato: string | null
  created_at: string
  ansatt?: { navn: string } | null
}

interface Ansatt {
  id: string
  navn: string
}

const TYPER = ['Korrigerende', 'Forebyggende', 'Forbedring']
const STATUSER = ['Planlagt', 'Pågående', 'Fullført', 'Forsinket', 'Kansellert']
const PRIORITETER = ['Lav', 'Middels', 'Høy', 'Kritisk']
const RELATERT_TIL_TYPER = ['risikovurdering', 'hendelse', 'avvik']

export function KsHmsTiltak() {
  const navigate = useNavigate()
  const [tiltak, setTiltak] = useState<Tiltak[]>([])
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Tiltak | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('alle')
  const [prioritetFilter, setPrioritetFilter] = useState<string>('alle')

  const [formData, setFormData] = useState({
    tittel: '',
    beskrivelse: '',
    type: 'Korrigerende',
    ansvarlig: '',
    frist: '',
    status: 'Planlagt',
    prioritet: 'Middels',
    kostnad: '',
    kommentarer: '',
    relatert_til_type: '',
    relatert_til_id: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      await Promise.all([
        loadTiltak(),
        loadAnsatte()
      ])
    } catch (error) {
      log.error('Feil ved lasting av data', { error })
    } finally {
      setLoading(false)
    }
  }

  async function loadTiltak() {
    const { data, error } = await supabase
      .from('ks_tiltak')
      .select(`
        *,
        ansatt:ansatte!ks_tiltak_ansvarlig_fkey(navn)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    setTiltak(data || [])
  }

  async function loadAnsatte() {
    const { data } = await supabase
      .from('ansatte')
      .select('id, navn')
      .order('navn')
    setAnsatte(data || [])
  }

  function openNewModal() {
    setEditingItem(null)
    setFormData({
      tittel: '',
      beskrivelse: '',
      type: 'Korrigerende',
      ansvarlig: '',
      frist: '',
      status: 'Planlagt',
      prioritet: 'Middels',
      kostnad: '',
      kommentarer: '',
      relatert_til_type: '',
      relatert_til_id: ''
    })
    setShowModal(true)
  }

  function openEditModal(item: Tiltak) {
    setEditingItem(item)
    setFormData({
      tittel: item.tittel,
      beskrivelse: item.beskrivelse,
      type: item.type || 'Korrigerende',
      ansvarlig: item.ansvarlig || '',
      frist: item.frist || '',
      status: item.status,
      prioritet: item.prioritet,
      kostnad: item.kostnad?.toString() || '',
      kommentarer: item.kommentarer || '',
      relatert_til_type: item.relatert_til_type || '',
      relatert_til_id: item.relatert_til_id || ''
    })
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
        type: formData.type || null,
        ansvarlig: formData.ansvarlig || null,
        frist: formData.frist || null,
        status: formData.status,
        prioritet: formData.prioritet,
        kostnad: formData.kostnad ? parseFloat(formData.kostnad) : null,
        kommentarer: formData.kommentarer || null,
        relatert_til_type: formData.relatert_til_type || null,
        relatert_til_id: formData.relatert_til_id || null,
        fullfort_dato: formData.status === 'Fullført' ? new Date().toISOString().split('T')[0] : null
      }

      if (editingItem) {
        const { error } = await supabase
          .from('ks_tiltak')
          .update(payload)
          .eq('id', editingItem.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('ks_tiltak')
          .insert(payload)
        
        if (error) throw error
      }

      setShowModal(false)
      await loadTiltak()
    } catch (error) {
      log.error('Feil ved lagring', { error })
      alert('Kunne ikke lagre tiltak')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Er du sikker på at du vil slette dette tiltaket?')) return

    try {
      const { error } = await supabase
        .from('ks_tiltak')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      await loadTiltak()
    } catch (error) {
      log.error('Feil ved sletting', { error })
      alert('Kunne ikke slette tiltak')
    }
  }

  function getTypeColor(type: string | null) {
    switch (type) {
      case 'Korrigerende': return 'bg-blue-500/20 text-blue-400'
      case 'Forebyggende': return 'bg-green-500/20 text-green-400'
      case 'Forbedring': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'Fullført': return 'bg-green-500/20 text-green-400'
      case 'Pågående': return 'bg-yellow-500/20 text-yellow-400'
      case 'Planlagt': return 'bg-blue-500/20 text-blue-400'
      case 'Forsinket': return 'bg-red-500/20 text-red-400'
      case 'Kansellert': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  function getPrioritetColor(prioritet: string) {
    switch (prioritet) {
      case 'Kritisk': return 'bg-red-500/20 text-red-400'
      case 'Høy': return 'bg-orange-500/20 text-orange-400'
      case 'Middels': return 'bg-yellow-500/20 text-yellow-400'
      case 'Lav': return 'bg-green-500/20 text-green-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  function getRelatertIcon(type: string | null) {
    switch (type) {
      case 'risikovurdering': return <AlertTriangle className="w-3 h-3" />
      case 'hendelse': return <AlertCircle className="w-3 h-3" />
      case 'avvik': return <XCircle className="w-3 h-3" />
      default: return null
    }
  }

  function isOverdue(frist: string | null, status: string) {
    if (!frist || status === 'Fullført' || status === 'Kansellert') return false
    return new Date(frist) < new Date()
  }

  const filteredItems = tiltak.filter(item => {
    const matchesSearch = item.tittel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.beskrivelse.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'alle' || item.status === statusFilter
    const matchesPrioritet = prioritetFilter === 'alle' || item.prioritet === prioritetFilter
    return matchesSearch && matchesStatus && matchesPrioritet
  })

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
              <CheckSquare className="w-7 h-7 text-purple-400" />
              Tiltak
            </h1>
          </div>
          <p className="text-gray-400 mt-1">Korrigerende og forebyggende tiltak</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nytt Tiltak
        </button>
      </div>

      {/* Filtre */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Søk i tiltak..."
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
          value={prioritetFilter}
          onChange={(e) => setPrioritetFilter(e.target.value)}
          className="px-4 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary"
        >
          <option value="alle">Alle prioriteter</option>
          {PRIORITETER.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Liste */}
      {filteredItems.length === 0 ? (
        <div className="bg-dark-lighter rounded-xl p-12 text-center border border-dark-border">
          <CheckSquare className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold text-white mb-2">Ingen tiltak registrert</h3>
          <p className="text-gray-400 mb-6">Opprett et tiltak for å komme i gang</p>
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nytt Tiltak
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-dark-lighter rounded-xl p-5 border transition-colors ${
                isOverdue(item.frist, item.status) 
                  ? 'border-red-500/50' 
                  : 'border-dark-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white truncate">{item.tittel}</h3>
                    {item.type && (
                      <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(item.type)}`}>
                        {item.type}
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getPrioritetColor(item.prioritet)}`}>
                      {item.prioritet}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">{item.beskrivelse}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    {item.relatert_til_type && (
                      <span className="flex items-center gap-1">
                        {getRelatertIcon(item.relatert_til_type)}
                        {item.relatert_til_type}
                      </span>
                    )}
                    {item.ansatt?.navn && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.ansatt.navn}
                      </span>
                    )}
                    {item.frist && (
                      <span className={`flex items-center gap-1 ${isOverdue(item.frist, item.status) ? 'text-red-400' : ''}`}>
                        <Calendar className="w-3 h-3" />
                        Frist: {new Date(item.frist).toLocaleDateString('nb-NO')}
                        {isOverdue(item.frist, item.status) && ' (Forsinket!)'}
                      </span>
                    )}
                    {item.kostnad && (
                      <span className="flex items-center gap-1">
                        kr {item.kostnad.toLocaleString('nb-NO')}
                      </span>
                    )}
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
                {editingItem ? 'Rediger Tiltak' : 'Nytt Tiltak'}
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
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Tiltaksinformasjon</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tittel *</label>
                  <input
                    type="text"
                    value={formData.tittel}
                    onChange={(e) => setFormData({ ...formData, tittel: e.target.value })}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    placeholder="Kort beskrivelse av tiltaket"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Beskrivelse *</label>
                  <textarea
                    value={formData.beskrivelse}
                    onChange={(e) => setFormData({ ...formData, beskrivelse: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                    placeholder="Detaljert beskrivelse av tiltaket"
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      {STATUSER.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Prioritet</label>
                    <select
                      value={formData.prioritet}
                      onChange={(e) => setFormData({ ...formData, prioritet: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      {PRIORITETER.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Ansvar og frist */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Ansvar og frist</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Ansvarlig</label>
                    <select
                      value={formData.ansvarlig}
                      onChange={(e) => setFormData({ ...formData, ansvarlig: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      <option value="">Velg ansvarlig</option>
                      {ansatte.map((a) => (
                        <option key={a.id} value={a.id}>{a.navn}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Frist</label>
                    <input
                      type="date"
                      value={formData.frist}
                      onChange={(e) => setFormData({ ...formData, frist: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Estimert kostnad (kr)</label>
                    <input
                      type="number"
                      value={formData.kostnad}
                      onChange={(e) => setFormData({ ...formData, kostnad: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Relatert til</label>
                    <select
                      value={formData.relatert_til_type}
                      onChange={(e) => setFormData({ ...formData, relatert_til_type: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      <option value="">Ingen tilknytning</option>
                      {RELATERT_TIL_TYPER.map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Kommentarer */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Kommentarer</h3>
                
                <div>
                  <textarea
                    value={formData.kommentarer}
                    onChange={(e) => setFormData({ ...formData, kommentarer: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                    placeholder="Tilleggskommentarer eller notater"
                  />
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
