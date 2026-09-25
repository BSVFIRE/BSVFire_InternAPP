import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Search, Pencil, Trash2, Bell, RefreshCw } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { supabase } from '../../lib/supabase'
import { AlarmorganiseringEditor } from './AlarmorganiseringEditor'

interface AlarmorganiseringViewProps {
  onBack: () => void
  initialAnleggId?: string
  initialKundeId?: string
  initialProsjektId?: string
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

export function AlarmorganiseringView({ onBack, initialAnleggId, initialKundeId, initialProsjektId }: AlarmorganiseringViewProps) {
  const [alarmorganiseringer, setAlarmorganiseringer] = useState<Alarmorganisering[]>([])
  const [filteredData, setFilteredData] = useState<Alarmorganisering[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('Alle')
  const [showEditor, setShowEditor] = useState(false)
  const [editingItem, setEditingItem] = useState<Alarmorganisering | null>(null)
  const [preselectedAnleggId] = useState<string | undefined>(initialAnleggId)
  const [preselectedKundeId] = useState<string | undefined>(initialKundeId)
  const [preselectedProsjektId] = useState<string | undefined>(initialProsjektId)

  useEffect(() => {
    loadAlarmorganiseringer()
    // Hvis vi kommer fra prosjekt, åpne editor direkte
    if (initialAnleggId && initialProsjektId) {
      setShowEditor(true)
    }
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
      toast.error('Kunne ikke slette alarmorganiseringen', error)
    }
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


  if (showEditor) {
    return (
      <AlarmorganiseringEditor
        existingData={editingItem}
        onClose={handleEditorClose}
        initialAnleggId={preselectedAnleggId}
        initialKundeId={preselectedKundeId}
        initialProsjektId={preselectedProsjektId}
      />
    )
  }

  const teller = {
    alle: alarmorganiseringer.length,
    Utkast: alarmorganiseringer.filter(x => x.status === 'Utkast').length,
    Ferdig: alarmorganiseringer.filter(x => x.status === 'Ferdig').length,
    Arkivert: alarmorganiseringer.filter(x => x.status === 'Arkivert').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0">
          <ArrowLeft className="w-4 h-4" />Teknisk
        </button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white inline-flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-primary" />Alarmorganisering
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {loading ? 'Laster…' : `${teller.alle} ${teller.alle === 1 ? 'organisering' : 'organiseringer'} · ${teller.Utkast} utkast`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Oppdater" icon={<RefreshCw className={cn(loading && 'animate-spin')} />} onClick={loadAlarmorganiseringer} />
          <Button variant="primary" icon={<Plus />} onClick={() => { setEditingItem(null); setShowEditor(true) }}>Ny alarmorganisering</Button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 flex-1" role="group" aria-label="Filter">
          {(['Alle', 'Utkast', 'Ferdig', 'Arkivert'] as const).map(s => (
            <button key={s} type="button" onClick={() => setSelectedStatus(s)} aria-pressed={selectedStatus === s}
              className={cn('inline-flex items-center gap-2 h-[34px] px-3 rounded-full border text-sm whitespace-nowrap flex-shrink-0 transition-colors [&>b]:font-bold [&>b]:tabular-nums',
                selectedStatus === s ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400')}>
              {s} <b>{s === 'Alle' ? teller.alle : teller[s]}</b>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Søk kunde, anlegg, ingeniør…" className="input pl-9 w-full !h-[38px]" />
        </div>
      </div>

      {loading ? (
        <div className="card py-12 text-center text-sm text-gray-500">Laster…</div>
      ) : filteredData.length === 0 ? (
        <div className="card py-10 text-center space-y-3">
          <Bell className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {alarmorganiseringer.length === 0 ? 'Ingen alarmorganiseringer laget ennå.' : 'Ingen treff på filtrene.'}
          </p>
          {alarmorganiseringer.length === 0 && <Button variant="primary" icon={<Plus />} onClick={() => { setEditingItem(null); setShowEditor(true) }}>Lag den første</Button>}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredData.map(item => (
              <li key={item.id}>
                <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors">
                  <button type="button" onClick={() => { setEditingItem(item); setShowEditor(true) }} className="flex-1 min-w-0 text-left">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">{item.anlegg?.anleggsnavn ?? 'Uten anlegg'}</span>
                      <span className={cn('px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap', getStatusColor(item.status))}>{item.status}</span>
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                      {[item.customer?.navn, item.anlegg?.adresse, item.service_ingeniør, `Rev. ${item.revisjon}`].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                  <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap hidden sm:block">{item.dato ? new Date(item.dato).toLocaleDateString('nb-NO') : ''}</span>
                  <IconButton variant="ghost" label="Rediger" icon={<Pencil />} onClick={() => { setEditingItem(item); setShowEditor(true) }} className="w-8 h-8" />
                  <IconButton variant="ghost" label="Slett" icon={<Trash2 />} onClick={() => handleDelete(item.id)} className="w-8 h-8 hover:!text-red-500" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
