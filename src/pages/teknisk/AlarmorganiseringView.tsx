import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Search, Pencil, Trash2, Bell, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { AlarmorganiseringEditor } from './AlarmorganiseringEditor'

interface AlarmorganiseringViewProps {
  onBack: () => void
  initialAnleggId?: string
  initialKundeId?: string
}

interface Alarmorganisering {
  id: string
  kunde_id?: string
  anlegg_id?: string
  dato: string
  revisjon: string
  service_ingeniør?: string
  status: 'Utkast' | 'Ferdig' | 'Arkivert'
  opprettet_dato: string
  customer?: { navn: string }
  anlegg?: { anleggsnavn: string; adresse: string }
}

export function AlarmorganiseringView({ onBack, initialAnleggId, initialKundeId }: AlarmorganiseringViewProps) {
  const [alarmorganiseringer, setAlarmorganiseringer] = useState<Alarmorganisering[]>([])
  const [filteredData, setFilteredData] = useState<Alarmorganisering[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('Alle')
  const [showEditor, setShowEditor] = useState(false)
  const [editingItem, setEditingItem] = useState<Alarmorganisering | null>(null)

  useEffect(() => {
    loadAlarmorganiseringer()
  }, [])

  useEffect(() => {
    filterData()
  }, [searchQuery, selectedStatus, alarmorganiseringer])

  const loadAlarmorganiseringer = async () => {
    try {
      setLoading(true)
      
      // First get all alarmorganiseringer
      const { data: alarmData, error: alarmError } = await supabase
        .from('alarmorganisering')
        .select('*')
        .order('opprettet_dato', { ascending: false })

      if (alarmError) throw alarmError

      // Enrich with customer and anlegg data
      const enrichedData = await Promise.all(
        (alarmData || []).map(async (item) => {
          const enrichedItem = { ...item }

          // Get customer data
          if (item.kunde_id) {
            const { data: customerData } = await supabase
              .from('customer')
              .select('navn')
              .eq('id', item.kunde_id)
              .single()
            
            if (customerData) {
              enrichedItem.customer = customerData
            }
          }

          // Get anlegg data
          if (item.anlegg_id) {
            const { data: anleggData } = await supabase
              .from('anlegg')
              .select('anleggsnavn, adresse')
              .eq('id', item.anlegg_id)
              .single()
            
            if (anleggData) {
              enrichedItem.anlegg = anleggData
            }
          }

          return enrichedItem
        })
      )

      setAlarmorganiseringer(enrichedData)
    } catch (error) {
      console.error('Error loading alarmorganiseringer:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterData = () => {
    let filtered = [...alarmorganiseringer]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => 
        item.customer?.navn?.toLowerCase().includes(query) ||
        item.anlegg?.anleggsnavn?.toLowerCase().includes(query) ||
        item.service_ingeniør?.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (selectedStatus !== 'Alle') {
      filtered = filtered.filter(item => item.status === selectedStatus)
    }

    setFilteredData(filtered)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne alarmorganiseringen?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('alarmorganisering')
        .delete()
        .eq('id', id)

      if (error) throw error

      loadAlarmorganiseringer()
    } catch (error) {
      console.error('Error deleting alarmorganisering:', error)
      alert('Feil ved sletting av alarmorganisering')
    }
  }

  const handleEdit = (item: Alarmorganisering) => {
    setEditingItem(item)
    setShowEditor(true)
  }

  const handleNew = () => {
    setEditingItem(null)
    setShowEditor(true)
  }

  const handleEditorClose = (saved: boolean) => {
    setShowEditor(false)
    setEditingItem(null)
    if (saved) {
      loadAlarmorganiseringer()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ferdig':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'Utkast':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'Arkivert':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Ferdig':
        return '✓'
      case 'Utkast':
        return '✎'
      case 'Arkivert':
        return '📦'
      default:
        return '•'
    }
  }

  if (showEditor) {
    return (
      <AlarmorganiseringEditor
        existingData={editingItem}
        onClose={handleEditorClose}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Alarmorganisering</h1>
            <p className="text-gray-400 dark:text-gray-400">Organisering av alarmer</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAlarmorganiseringer}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Oppdater
          </button>
          <button
            onClick={handleNew}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ny alarmorganisering
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter kunde, anlegg eller tekniker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input w-48"
          >
            <option value="Alle">Alle statuser</option>
            <option value="Utkast">Utkast</option>
            <option value="Ferdig">Ferdig</option>
            <option value="Arkivert">Arkivert</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="card text-center py-12">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Ingen alarmorganiseringer funnet</p>
          <button
            onClick={handleNew}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Opprett ny
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredData.map((item) => (
            <div
              key={item.id}
              className="card hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => handleEdit(item)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bell className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {item.customer?.navn || item.anlegg?.anleggsnavn || 'Ukjent'}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)} {item.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-400">
                      {item.anlegg?.anleggsnavn && item.customer?.navn && (
                        <p>🏢 {item.anlegg.anleggsnavn}</p>
                      )}
                      {item.service_ingeniør && (
                        <p>👤 {item.service_ingeniør}</p>
                      )}
                      <p>📅 {new Date(item.dato).toLocaleDateString('nb-NO')}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    title="Rediger"
                  >
                    <Pencil className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Slett"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
