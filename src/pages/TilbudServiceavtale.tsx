import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, Search, Building, Edit, Trash2, Eye, 
  FileText, AlertCircle
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { TilbudForm } from './tilbud/TilbudForm'
import { TilbudDetails } from './tilbud/TilbudDetails'
import { StatusBadge } from './tilbud/StatusBadge'

export interface ServiceavtaleTilbud {
  id: string
  kunde_id: string | null
  kunde_navn: string
  kunde_organisasjonsnummer: string | null
  lokasjon: string | null
  anlegg_id: string | null
  anlegg_navn: string | null
  kontaktperson_id: string | null
  kontaktperson_navn: string | null
  kontaktperson_epost: string | null
  kontaktperson_telefon: string | null
  tjeneste_brannalarm: boolean
  tjeneste_nodlys: boolean
  tjeneste_slukkeutstyr: boolean
  tjeneste_rokluker: boolean
  tjeneste_eksternt: boolean
  tilbud_nummer: string | null
  beskrivelse: string | null
  notater: string | null
  status: 'utkast' | 'sendt' | 'godkjent' | 'avvist'
  pris_detaljer: any
  total_pris: number
  rabatt_prosent?: number
  timespris?: number
  betalingsbetingelser?: number
  opprettet_av_navn?: string
  opprettet: string
  sist_oppdatert: string | null
  sendt_dato: string | null
}

type ViewMode = 'list' | 'create' | 'edit' | 'view'

export function TilbudServiceavtale() {
  const [tilbud, setTilbud] = useState<ServiceavtaleTilbud[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTilbud, setSelectedTilbud] = useState<ServiceavtaleTilbud | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  useEffect(() => {
    loadTilbud()
  }, [])

  async function loadTilbud() {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('serviceavtale_tilbud')
        .select('*')
        .order('opprettet', { ascending: false })

      if (error) throw error
      setTilbud(data || [])
    } catch (err) {
      console.error('Feil ved lasting av tilbud:', err)
      setError(err instanceof Error ? err.message : 'Kunne ikke laste tilbud')
    } finally {
      setLoading(false)
    }
  }

  async function deleteTilbud(id: string) {
    if (!confirm('Er du sikker på at du vil slette dette tilbudet?')) return

    try {
      const { error } = await supabase
        .from('serviceavtale_tilbud')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadTilbud()
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette tilbud')
    }
  }

  const filteredTilbud = tilbud.filter(t =>
    t.kunde_navn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.anlegg_navn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.tilbud_nummer?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Laster tilbud...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tilbud Serviceavtale</h1>
          <p className="text-gray-500 dark:text-gray-400">Administrer serviceavtaletilbud</p>
        </div>
        <div className="card bg-red-900/20 border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">Kunne ikke laste tilbud</h3>
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <button onClick={loadTilbud} className="btn-primary text-sm">
                Prøv igjen
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <TilbudForm
        tilbud={selectedTilbud}
        onSave={async () => {
          await loadTilbud()
          setViewMode('list')
          setSelectedTilbud(null)
        }}
        onCancel={() => {
          setViewMode('list')
          setSelectedTilbud(null)
        }}
      />
    )
  }

  if (viewMode === 'view' && selectedTilbud) {
    return (
      <TilbudDetails
        tilbud={selectedTilbud}
        onEdit={() => setViewMode('edit')}
        onClose={() => {
          setViewMode('list')
          setSelectedTilbud(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tilbud Serviceavtale</h1>
          <p className="text-gray-500 dark:text-gray-400">Opprett og administrer serviceavtaletilbud</p>
        </div>
        <button
          onClick={() => {
            setSelectedTilbud(null)
            setViewMode('create')
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nytt tilbud
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Søk etter kunde, anlegg eller tilbudsnummer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Totalt tilbud</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tilbud.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Utkast</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {tilbud.filter(t => t.status === 'utkast').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Sendt</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {tilbud.filter(t => t.status === 'sendt').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Godkjent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {tilbud.filter(t => t.status === 'godkjent').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tilbud Liste */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tilbudsliste
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-normal">
              ({filteredTilbud.length} {filteredTilbud.length === 1 ? 'tilbud' : 'tilbud'})
            </span>
          </h2>
        </div>
        
        {filteredTilbud.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Ingen tilbud funnet' : 'Ingen tilbud opprettet ennå'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Kunde/Anlegg</th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Tjenester</th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Pris</th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Opprettet</th>
                  <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {filteredTilbud.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => {
                      setSelectedTilbud(t)
                      setViewMode('view')
                    }}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">{t.kunde_navn}</p>
                          {t.anlegg_navn && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t.anlegg_navn}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {t.tjeneste_brannalarm && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 rounded-full">
                            Brannalarm
                          </span>
                        )}
                        {t.tjeneste_nodlys && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-full">
                            Nødlys
                          </span>
                        )}
                        {t.tjeneste_slukkeutstyr && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">
                            Slukkeuttsyr
                          </span>
                        )}
                        {t.tjeneste_rokluker && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full">
                            Røkluker
                          </span>
                        )}
                        {t.tjeneste_eksternt && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                            Eksternt
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {t.total_pris > 0 ? (
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {t.total_pris.toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300 text-sm">
                      {formatDate(t.opprettet)}
                    </td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedTilbud(t)
                            setViewMode('view')
                          }}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Vis detaljer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTilbud(t)
                            setViewMode('edit')
                          }}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Rediger"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTilbud(t.id)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Slett"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
