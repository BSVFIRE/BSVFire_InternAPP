import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Eye, FileText, Plus, Trash2, Search, ArrowUpDown, Calendar, User, Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ServicerapportEditor } from './ServicerapportEditor'
import { ServicerapportPreview } from './ServicerapportPreview'

interface Servicerapport {
  id: string
  anlegg_id: string
  anlegg_navn?: string
  ordre_id?: string
  rapport_dato: string
  tekniker_navn: string
  header: string
  rapport_innhold: string
  image_urls?: string[]
  opprettet_dato?: string
  sist_oppdatert?: string
}

interface ServicerapportViewProps {
  onBack: () => void
  initialAnleggId?: string
  initialOrdreId?: string
}

type SortField = 'dato' | 'tittel' | 'anlegg' | 'tekniker'
type SortDirection = 'asc' | 'desc'

export function ServicerapportView({ onBack, initialAnleggId, initialOrdreId }: ServicerapportViewProps) {
  const [rapporter, setRapporter] = useState<Servicerapport[]>([])
  const [selectedRapport, setSelectedRapport] = useState<Servicerapport | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('dato')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Filtrert og sortert liste
  const filteredAndSortedRapporter = useMemo(() => {
    let result = [...rapporter]
    
    // Søk
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(r => 
        r.header?.toLowerCase().includes(query) ||
        r.anlegg_navn?.toLowerCase().includes(query) ||
        r.tekniker_navn?.toLowerCase().includes(query)
      )
    }
    
    // Sortering
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'dato':
          comparison = new Date(a.rapport_dato).getTime() - new Date(b.rapport_dato).getTime()
          break
        case 'tittel':
          comparison = (a.header || '').localeCompare(b.header || '')
          break
        case 'anlegg':
          comparison = (a.anlegg_navn || '').localeCompare(b.anlegg_navn || '')
          break
        case 'tekniker':
          comparison = (a.tekniker_navn || '').localeCompare(b.tekniker_navn || '')
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    return result
  }, [rapporter, searchQuery, sortField, sortDirection])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  useEffect(() => {
    loadRapporter()
    
    // Hvis vi kommer fra ordre, åpne ny rapport automatisk
    if (initialAnleggId) {
      handleNewRapport(initialAnleggId, initialOrdreId)
    }
  }, [initialAnleggId, initialOrdreId])

  async function loadRapporter() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('servicerapporter')
        .select(`
          *,
          anlegg:anlegg_id (
            anleggsnavn
          )
        `)
        .order('rapport_dato', { ascending: false })

      if (error) {
        console.error('Error loading servicerapporter:', error)
        throw error
      }

      console.log('Loaded servicerapporter:', data)

      const rapporterWithAnleggNavn = data?.map((rapport: any) => ({
        ...rapport,
        anlegg_navn: rapport.anlegg?.anleggsnavn || 'Ukjent anlegg'
      })) || []

      setRapporter(rapporterWithAnleggNavn)
    } catch (error) {
      console.error('Feil ved lasting av servicerapporter:', error)
      // Vis tom liste ved feil
      setRapporter([])
    } finally {
      setLoading(false)
    }
  }

  function handleNewRapport(anleggId?: string, ordreId?: string) {
    const newRapport: Servicerapport = {
      id: '',
      anlegg_id: anleggId || '',
      ordre_id: ordreId,
      rapport_dato: new Date().toISOString().split('T')[0],
      tekniker_navn: '',
      header: '',
      rapport_innhold: ''
    }
    setSelectedRapport(newRapport)
    setIsEditing(true)
  }

  function handleEditRapport(rapport: Servicerapport) {
    setSelectedRapport(rapport)
    setIsEditing(true)
  }

  async function handleSaveRapport(rapport: Servicerapport): Promise<Servicerapport> {
    try {
      let savedRapport: Servicerapport = rapport
      
      if (rapport.id) {
        // Update existing (sist_oppdatert oppdateres automatisk av trigger)
        const { error } = await supabase
          .from('servicerapporter')
          .update({
            anlegg_id: rapport.anlegg_id,
            ordre_id: rapport.ordre_id || null,
            rapport_dato: rapport.rapport_dato,
            tekniker_navn: rapport.tekniker_navn,
            header: rapport.header,
            rapport_innhold: rapport.rapport_innhold,
            image_urls: rapport.image_urls || []
          })
          .eq('id', rapport.id)

        if (error) throw error
        
        // Hent anleggsnavn for den oppdaterte rapporten
        const { data: anleggData } = await supabase
          .from('anlegg')
          .select('anleggsnavn')
          .eq('id', rapport.anlegg_id)
          .single()
        
        savedRapport = { ...rapport, anlegg_navn: anleggData?.anleggsnavn }
      } else {
        // Create new
        const { data, error } = await supabase
          .from('servicerapporter')
          .insert({
            anlegg_id: rapport.anlegg_id,
            ordre_id: rapport.ordre_id || null,
            rapport_dato: rapport.rapport_dato,
            tekniker_navn: rapport.tekniker_navn,
            header: rapport.header,
            rapport_innhold: rapport.rapport_innhold,
            image_urls: rapport.image_urls || []
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          // Hent anleggsnavn for den nye rapporten
          const { data: anleggData } = await supabase
            .from('anlegg')
            .select('anleggsnavn')
            .eq('id', rapport.anlegg_id)
            .single()
          
          savedRapport = { 
            ...rapport, 
            id: data.id,
            anlegg_navn: anleggData?.anleggsnavn,
            image_urls: data.image_urls || []
          }
        }
      }

      await loadRapporter()
      // Note: Don't close editor here - let ServicerapportEditor handle it after dialog
      return savedRapport
    } catch (error) {
      console.error('Feil ved lagring av servicerapport:', error)
      alert('Kunne ikke lagre servicerapport')
      throw error
    }
  }

  async function handleDeleteRapport(rapport: Servicerapport) {
    if (!confirm(`Er du sikker på at du vil slette rapporten "${rapport.header}"?\n\nDenne handlingen kan ikke angres.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('servicerapporter')
        .delete()
        .eq('id', rapport.id)

      if (error) throw error

      alert('✅ Rapport slettet')
      await loadRapporter()
    } catch (error) {
      console.error('Feil ved sletting av servicerapport:', error)
      alert('Kunne ikke slette servicerapport')
    }
  }

  if (isEditing && selectedRapport) {
    return (
      <ServicerapportEditor
        rapport={selectedRapport}
        onSave={handleSaveRapport}
        onCancel={() => {
          setIsEditing(false)
          setSelectedRapport(null)
        }}
      />
    )
  }

  if (showPreview && selectedRapport) {
    return (
      <ServicerapportPreview
        rapport={selectedRapport}
        onBack={() => setShowPreview(false)}
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
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Servicerapporter</h1>
            <p className="text-gray-600 dark:text-gray-400">Opprett og administrer servicerapporter</p>
          </div>
        </div>
        <button
          onClick={() => handleNewRapport()}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Ny rapport
        </button>
      </div>

      {/* Rapporter liste */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Eksisterende rapporter
            {rapporter.length > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-2">({filteredAndSortedRapporter.length} av {rapporter.length})</span>
            )}
          </h2>
          
          {/* Søkefelt */}
          {rapporter.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Søk i rapporter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 py-2 text-sm"
              />
            </div>
          )}
        </div>

        {/* Sorteringsknapper */}
        {rapporter.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400 self-center mr-2">Sorter etter:</span>
            {[
              { field: 'dato' as SortField, label: 'Dato', icon: Calendar },
              { field: 'tittel' as SortField, label: 'Tittel', icon: FileText },
              { field: 'anlegg' as SortField, label: 'Anlegg', icon: Building2 },
              { field: 'tekniker' as SortField, label: 'Tekniker', icon: User },
            ].map(({ field, label, icon: Icon }) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  sortField === field
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {sortField === field && (
                  <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                )}
              </button>
            ))}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Laster...</div>
        ) : rapporter.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Ingen servicerapporter ennå</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Klikk "Ny rapport" for å opprette din første rapport</p>
          </div>
        ) : filteredAndSortedRapporter.length === 0 ? (
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Ingen rapporter matcher søket</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="text-primary text-sm mt-2 hover:underline"
            >
              Nullstill søk
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedRapporter.map((rapport) => (
              <div
                key={rapport.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors gap-3"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-900 dark:text-white font-medium truncate">{rapport.header || 'Uten tittel'}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {rapport.anlegg_navn || 'Ikke tilknyttet'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(rapport.rapport_dato).toLocaleDateString('nb-NO')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {rapport.tekniker_navn}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      setSelectedRapport(rapport)
                      setShowPreview(true)
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Forhåndsvisning"
                  >
                    <Eye className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleEditRapport(rapport)}
                    className="btn-secondary text-sm"
                  >
                    Rediger
                  </button>
                  <button
                    onClick={() => handleDeleteRapport(rapport)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
                    title="Slett rapport"
                  >
                    <Trash2 className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
