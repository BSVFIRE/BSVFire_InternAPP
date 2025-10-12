import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Search, Edit, Trash2, X } from 'lucide-react'
import { NettverkEnhet } from '../Brannalarm'

interface NettverkViewProps {
  anleggId: string
  anleggsNavn: string
  nettverkListe: NettverkEnhet[]
  onBack: () => void
  onRefresh: () => void
}

export function NettverkView({ anleggId, anleggsNavn, nettverkListe, onBack, onRefresh }: NettverkViewProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [editingSystem, setEditingSystem] = useState<NettverkEnhet | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nettverk_id: '',
    plassering: '',
    type: '',
    sw_id: '',
    spenning: 0,
    ah: 0,
    batterialder: 0,
  })
  const [saving, setSaving] = useState(false)

  const filteredNettverk = (nettverkListe || []).filter(n =>
    String(n.nettverk_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(n.plassering || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(n.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(n.sw_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  function openDialog(system?: NettverkEnhet) {
    if (system) {
      setEditingSystem(system)
      setFormData({
        nettverk_id: String(system.nettverk_id || ''),
        plassering: system.plassering || '',
        type: system.type || '',
        sw_id: system.sw_id || '',
        spenning: system.spenning || 0,
        ah: system.ah || 0,
        batterialder: system.batterialder || 0,
      })
    } else {
      setEditingSystem(null)
      setFormData({
        nettverk_id: '',
        plassering: '',
        type: '',
        sw_id: '',
        spenning: 0,
        ah: 0,
        batterialder: 0,
      })
    }
    setShowDialog(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const data = {
        anlegg_id: anleggId,
        ...formData
      }

      if (editingSystem) {
        await supabase
          .from('nettverk_brannalarm')
          .update(data)
          .eq('id', editingSystem.id)
      } else {
        await supabase
          .from('nettverk_brannalarm')
          .insert(data)
      }

      setShowDialog(false)
      onRefresh()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Feil ved lagring av system')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Er du sikker på at du vil slette dette systemet?')) return

    try {
      await supabase
        .from('nettverk_brannalarm')
        .delete()
        .eq('id', id)
      
      onRefresh()
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Feil ved sletting av system')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Brannalarm nettverk</h1>
            <p className="text-gray-400 mt-1">{anleggsNavn}</p>
          </div>
        </div>
        <button onClick={() => openDialog()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nytt system
        </button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Søk i nettverk, plassering, type eller SW-versjon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="text-sm text-gray-400">
            {searchTerm ? `Viser: ${filteredNettverk.length} av ${nettverkListe.length}` : `Totalt: ${nettverkListe.length}`} systemer
          </div>
        </div>

        {filteredNettverk.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-2">
              {searchTerm ? 'Ingen systemer funnet' : 'Ingen systemer i nettverk'}
            </div>
            {!searchTerm && (
              <button onClick={() => openDialog()} className="btn-primary mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Legg til system
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNettverk.map((system) => (
              <div key={system.id} className="card bg-gray-800/50 hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <span className="text-blue-500 font-bold">{system.nettverk_id}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Nettverk {system.nettverk_id}</h3>
                      <p className="text-xs text-gray-400">{system.plassering}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openDialog(system)}
                      className="p-1.5 hover:bg-white/5 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(system.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                {system.type && (
                  <div className="mb-3">
                    <span className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                      {system.type}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-900/50 p-2 rounded">
                    <div className="text-gray-400 mb-1">SW-versjon</div>
                    <div className="text-white font-medium">{system.sw_id || 'N/A'}</div>
                  </div>
                  <div className="bg-gray-900/50 p-2 rounded">
                    <div className="text-gray-400 mb-1">Spenning</div>
                    <div className="text-white font-medium">{system.spenning || 0}V</div>
                  </div>
                  <div className="bg-gray-900/50 p-2 rounded">
                    <div className="text-gray-400 mb-1">Kapasitet</div>
                    <div className="text-white font-medium">{system.ah || 0}Ah</div>
                  </div>
                  <div className="bg-gray-900/50 p-2 rounded">
                    <div className="text-gray-400 mb-1">Batterialder</div>
                    <div className="text-white font-medium">{system.batterialder || 0} år</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingSystem ? 'Rediger system' : 'Legg til system'}
                </h2>
                <button onClick={() => setShowDialog(false)} className="p-2 hover:bg-white/5 rounded transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nettverk</label>
                  <input
                    type="text"
                    value={formData.nettverk_id}
                    onChange={(e) => setFormData({ ...formData, nettverk_id: e.target.value })}
                    className="input"
                    placeholder="F.eks. 1, 2, 3..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Plassering</label>
                  <input
                    type="text"
                    value={formData.plassering}
                    onChange={(e) => setFormData({ ...formData, plassering: e.target.value })}
                    className="input"
                    placeholder="F.eks. Teknisk rom"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input"
                  placeholder="F.eks. Sentral, Repeater, Detektorløkke"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SW-versjon</label>
                <input
                  type="text"
                  value={formData.sw_id}
                  onChange={(e) => setFormData({ ...formData, sw_id: e.target.value })}
                  className="input"
                  placeholder="F.eks. v2.1.0"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Spenning (V)</label>
                  <input
                    type="number"
                    value={formData.spenning}
                    onChange={(e) => setFormData({ ...formData, spenning: parseFloat(e.target.value) || 0 })}
                    className="input"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Ah</label>
                  <input
                    type="number"
                    value={formData.ah}
                    onChange={(e) => setFormData({ ...formData, ah: parseFloat(e.target.value) || 0 })}
                    className="input"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Batterialder (år)</label>
                  <input
                    type="number"
                    value={formData.batterialder}
                    onChange={(e) => setFormData({ ...formData, batterialder: parseInt(e.target.value) || 0 })}
                    className="input"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end gap-3">
              <button onClick={() => setShowDialog(false)} className="btn-secondary">
                Avbryt
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Lagrer...' : 'Lagre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
