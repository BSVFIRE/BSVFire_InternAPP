import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { 
  GraduationCap, 
  Plus, 
  Search, 
  X,
  Save,
  Trash2,
  Edit,
  User,
  Calendar,
  Clock,
  Users,
  RefreshCw,
  ArrowLeft
} from 'lucide-react'

const log = createLogger('KsHmsOpplaering')

interface Opplaering {
  id: string
  tittel: string
  beskrivelse: string | null
  type: string
  varighet: string | null
  status: string
  dato: string
  sluttdato: string | null
  registrert_av: string | null
  instruktor: string | null
  deltakere: any[] | null
  sertifikat_utloper: string | null
  created_at: string
  ansatt?: { navn: string } | null
}

interface Ansatt {
  id: string
  navn: string
}

const TYPER = ['Kurs', 'Sertifisering', 'Workshop', 'E-læring', 'Intern opplæring']
const STATUSER = ['Planlagt', 'Pågående', 'Fullført', 'Kansellert']

export function KsHmsOpplaering() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [opplaeringer, setOpplaeringer] = useState<Opplaering[]>([])
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Opplaering | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('alle')
  const [typeFilter, setTypeFilter] = useState<string>('alle')

  const [formData, setFormData] = useState({
    tittel: '',
    beskrivelse: '',
    type: 'Kurs',
    varighet: '',
    status: 'Planlagt',
    dato: new Date().toISOString().split('T')[0],
    sluttdato: '',
    registrert_av: '',
    instruktor: '',
    deltakere: [] as string[],
    sertifikat_utloper: ''
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
        loadOpplaeringer(),
        loadAnsatte()
      ])
    } catch (error) {
      log.error('Feil ved lasting av data', { error })
    } finally {
      setLoading(false)
    }
  }

  async function loadOpplaeringer() {
    const { data, error } = await supabase
      .from('opplaering')
      .select(`
        *,
        ansatt:ansatte!opplaering_registrert_av_fkey(navn)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    setOpplaeringer(data || [])
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
      type: 'Kurs',
      varighet: '',
      status: 'Planlagt',
      dato: new Date().toISOString().split('T')[0],
      sluttdato: '',
      registrert_av: '',
      instruktor: '',
      deltakere: [],
      sertifikat_utloper: ''
    })
    setShowModal(true)
  }

  function openEditModal(item: Opplaering) {
    setEditingItem(item)
    const deltakereIds = item.deltakere?.map((d: any) => d.id || d) || []
    setFormData({
      tittel: item.tittel,
      beskrivelse: item.beskrivelse || '',
      type: item.type,
      varighet: item.varighet || '',
      status: item.status,
      dato: item.dato,
      sluttdato: item.sluttdato || '',
      registrert_av: item.registrert_av || '',
      instruktor: item.instruktor || '',
      deltakere: deltakereIds,
      sertifikat_utloper: item.sertifikat_utloper || ''
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!formData.tittel.trim()) {
      alert('Tittel er påkrevd')
      return
    }

    setSaving(true)
    try {
      const deltakereData = formData.deltakere.map(id => {
        const ansatt = ansatte.find(a => a.id === id)
        return { id, navn: ansatt?.navn || 'Ukjent' }
      })

      const payload = {
        tittel: formData.tittel.trim(),
        beskrivelse: formData.beskrivelse || null,
        type: formData.type,
        varighet: formData.varighet || null,
        status: formData.status,
        dato: formData.dato,
        sluttdato: formData.sluttdato || null,
        registrert_av: formData.registrert_av || null,
        instruktor: formData.instruktor || null,
        deltakere: deltakereData.length > 0 ? deltakereData : null,
        sertifikat_utloper: formData.sertifikat_utloper || null
      }

      if (editingItem) {
        const { error } = await supabase
          .from('opplaering')
          .update(payload)
          .eq('id', editingItem.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('opplaering')
          .insert(payload)
        
        if (error) throw error
      }

      setShowModal(false)
      await loadOpplaeringer()
    } catch (error) {
      log.error('Feil ved lagring', { error })
      alert('Kunne ikke lagre opplæring')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne opplæringen?')) return

    try {
      const { error } = await supabase
        .from('opplaering')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      await loadOpplaeringer()
    } catch (error) {
      log.error('Feil ved sletting', { error })
      alert('Kunne ikke slette opplæring')
    }
  }

  function toggleDeltaker(id: string) {
    setFormData(prev => ({
      ...prev,
      deltakere: prev.deltakere.includes(id)
        ? prev.deltakere.filter(d => d !== id)
        : [...prev.deltakere, id]
    }))
  }

  function getTypeColor(type: string) {
    switch (type) {
      case 'Kurs': return 'bg-blue-500/20 text-blue-400'
      case 'Sertifisering': return 'bg-purple-500/20 text-purple-400'
      case 'Workshop': return 'bg-orange-500/20 text-orange-400'
      case 'E-læring': return 'bg-cyan-500/20 text-cyan-400'
      case 'Intern opplæring': return 'bg-green-500/20 text-green-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'Fullført': return 'bg-green-500/20 text-green-400'
      case 'Pågående': return 'bg-yellow-500/20 text-yellow-400'
      case 'Planlagt': return 'bg-blue-500/20 text-blue-400'
      case 'Kansellert': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const filteredItems = opplaeringer.filter(item => {
    const matchesSearch = item.tittel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.beskrivelse?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
    const matchesStatus = statusFilter === 'alle' || item.status === statusFilter
    const matchesType = typeFilter === 'alle' || item.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
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
              <GraduationCap className="w-7 h-7 text-green-400" />
              Opplæring
            </h1>
          </div>
          <p className="text-gray-400 mt-1">Kurs, sertifiseringer og kompetanseoversikt</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white transition-colors"
        >
          <Plus className="w-5 h-5" />
          Registrer Opplæring
        </button>
      </div>

      {/* Filtre */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Søk i opplæringer..."
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
          <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold text-white mb-2">Ingen opplæringer registrert</h3>
          <p className="text-gray-400 mb-6">Registrer en opplæring for å komme i gang</p>
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white transition-colors"
          >
            <Plus className="w-5 h-5" />
            Registrer Opplæring
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
                  </div>
                  {item.beskrivelse && (
                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">{item.beskrivelse}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    {item.instruktor && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.instruktor}
                      </span>
                    )}
                    {item.varighet && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.varighet}
                      </span>
                    )}
                    {item.deltakere && item.deltakere.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {item.deltakere.length} deltaker{item.deltakere.length !== 1 ? 'e' : ''}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.dato).toLocaleDateString('nb-NO')}
                    </span>
                    {item.sertifikat_utloper && (
                      <span className="flex items-center gap-1 text-orange-400">
                        <Calendar className="w-3 h-3" />
                        Utløper: {new Date(item.sertifikat_utloper).toLocaleDateString('nb-NO')}
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
                {editingItem ? 'Rediger Opplæring' : 'Registrer Opplæring'}
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
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Opplæringsinformasjon</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tittel *</label>
                  <input
                    type="text"
                    value={formData.tittel}
                    onChange={(e) => setFormData({ ...formData, tittel: e.target.value })}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    placeholder="Navn på kurs eller opplæring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Beskrivelse</label>
                  <textarea
                    value={formData.beskrivelse}
                    onChange={(e) => setFormData({ ...formData, beskrivelse: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                    placeholder="Beskrivelse av opplæringen"
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">Varighet</label>
                    <input
                      type="text"
                      value={formData.varighet}
                      onChange={(e) => setFormData({ ...formData, varighet: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                      placeholder="F.eks. 4 timer, 2 dager"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Startdato</label>
                    <input
                      type="date"
                      value={formData.dato}
                      onChange={(e) => setFormData({ ...formData, dato: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Sluttdato</label>
                    <input
                      type="date"
                      value={formData.sluttdato}
                      onChange={(e) => setFormData({ ...formData, sluttdato: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Instruktør</label>
                  <input
                    type="text"
                    value={formData.instruktor}
                    onChange={(e) => setFormData({ ...formData, instruktor: e.target.value })}
                    className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    placeholder="Hvem holder opplæringen?"
                  />
                </div>
              </div>

              {/* Sertifisering */}
              {(formData.type === 'Sertifisering' || formData.type === 'Kurs') && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Sertifisering</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Sertifikat utløper</label>
                    <input
                      type="date"
                      value={formData.sertifikat_utloper}
                      onChange={(e) => setFormData({ ...formData, sertifikat_utloper: e.target.value })}
                      className="w-full px-4 py-2 bg-dark border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}

              {/* Deltakere */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Deltakere ({formData.deltakere.length} valgt)
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-dark rounded-lg">
                  {ansatte.map((ansatt) => (
                    <label
                      key={ansatt.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        formData.deltakere.includes(ansatt.id)
                          ? 'bg-primary/20 text-primary'
                          : 'hover:bg-dark-lighter text-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.deltakere.includes(ansatt.id)}
                        onChange={() => toggleDeltaker(ansatt.id)}
                        className="rounded border-dark-border"
                      />
                      <span className="text-sm truncate">{ansatt.navn}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Registrert av */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Registrering</h3>
                
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
