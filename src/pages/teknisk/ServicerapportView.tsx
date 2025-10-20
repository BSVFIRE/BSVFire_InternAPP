import { useState, useEffect } from 'react'
import { ArrowLeft, Eye, FileText, Plus } from 'lucide-react'
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
  created_at: string
  updated_at: string
}

interface ServicerapportViewProps {
  onBack: () => void
  initialAnleggId?: string
  initialOrdreId?: string
}

export function ServicerapportView({ onBack, initialAnleggId, initialOrdreId }: ServicerapportViewProps) {
  const [rapporter, setRapporter] = useState<Servicerapport[]>([])
  const [selectedRapport, setSelectedRapport] = useState<Servicerapport | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(true)

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
      rapport_innhold: '',
      created_at: '',
      updated_at: ''
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
        // Update existing
        const { error } = await supabase
          .from('servicerapporter')
          .update({
            anlegg_id: rapport.anlegg_id,
            ordre_id: rapport.ordre_id || null,
            rapport_dato: rapport.rapport_dato,
            tekniker_navn: rapport.tekniker_navn,
            header: rapport.header,
            rapport_innhold: rapport.rapport_innhold,
            updated_at: new Date().toISOString()
          })
          .eq('id', rapport.id)

        if (error) throw error
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
            rapport_innhold: rapport.rapport_innhold
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          savedRapport = { ...rapport, id: data.id }
        }
      }

      await loadRapporter()
      setIsEditing(false)
      setSelectedRapport(null)
      return savedRapport
    } catch (error) {
      console.error('Feil ved lagring av servicerapport:', error)
      alert('Kunne ikke lagre servicerapport')
      throw error
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Eksisterende rapporter</h2>
        
        {loading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Laster...</div>
        ) : rapporter.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Ingen servicerapporter ennå</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Klikk "Ny rapport" for å opprette din første rapport</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rapporter.map((rapport) => (
              <div
                key={rapport.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="text-gray-900 dark:text-white font-medium">{rapport.header || 'Uten tittel'}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <span>{rapport.anlegg_navn || 'Ikke tilknyttet anlegg'}</span>
                    <span>•</span>
                    <span>{new Date(rapport.rapport_dato).toLocaleDateString('nb-NO')}</span>
                    <span>•</span>
                    <span>{rapport.tekniker_navn}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedRapport(rapport)
                      setShowPreview(true)
                    }}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
