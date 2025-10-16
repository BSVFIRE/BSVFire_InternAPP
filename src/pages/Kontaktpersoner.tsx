import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, User, Mail, Phone, Building2, Trash2, Eye, Star } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useLocation, useNavigate } from 'react-router-dom'

interface Kontaktperson {
  id: string
  navn: string
  epost: string | null
  telefon: string | null
  rolle: string | null
  opprettet_dato: string
  sist_oppdatert: string | null
}

interface AnleggKontaktperson {
  anlegg_id: string
  kontaktperson_id: string
  primar: boolean
  anlegg: {
    anleggsnavn: string
    kundenr: string
  }
}

interface KontaktpersonMedAnlegg extends Kontaktperson {
  anlegg: AnleggKontaktperson[]
}

type SortOption = 'navn_asc' | 'navn_desc' | 'rolle' | 'antall_anlegg'

export function Kontaktpersoner() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { selectedKontaktId?: string; fromAnlegg?: boolean; anleggId?: string } | null
  
  const [kontaktpersoner, setKontaktpersoner] = useState<KontaktpersonMedAnlegg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedKontakt, setSelectedKontakt] = useState<KontaktpersonMedAnlegg | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list')
  const [sortBy, setSortBy] = useState<SortOption>('navn_asc')

  useEffect(() => {
    loadKontaktpersoner()
  }, [])

  // Åpne kontaktperson hvis sendt via state
  useEffect(() => {
    if (state?.selectedKontaktId && kontaktpersoner.length > 0) {
      const kontakt = kontaktpersoner.find(k => k.id === state.selectedKontaktId)
      if (kontakt) {
        setSelectedKontakt(kontakt)
        setViewMode('view')
      }
    }
  }, [state?.selectedKontaktId, kontaktpersoner])

  async function loadKontaktpersoner() {
    try {
      setError(null)
      
      // Hent kontaktpersoner med anlegg via junction table
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .select(`
          *,
          anlegg_kontaktpersoner(
            anlegg_id,
            kontaktperson_id,
            primar,
            anlegg(anleggsnavn, kundenr)
          )
        `)
        .order('navn', { ascending: true })

      if (error) throw new Error(error.message)

      // Transform data
      const transformed = (data || []).map(kontakt => ({
        ...kontakt,
        anlegg: kontakt.anlegg_kontaktpersoner || []
      }))

      setKontaktpersoner(transformed)
    } catch (err) {
      console.error('Feil ved lasting:', err)
      setError(err instanceof Error ? err.message : 'Kunne ikke laste kontaktpersoner')
    } finally {
      setLoading(false)
    }
  }

  async function deleteKontaktperson(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne kontaktpersonen?')) return

    try {
      // Slett junction table entries først
      await supabase
        .from('anlegg_kontaktpersoner')
        .delete()
        .eq('kontaktperson_id', id)

      // Slett kontaktperson
      const { error } = await supabase
        .from('kontaktpersoner')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadKontaktpersoner()
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette kontaktperson')
    }
  }

  const filteredKontakter = kontaktpersoner.filter(k =>
    k.navn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.epost?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.telefon?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.rolle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.anlegg.some(a => a.anlegg.anleggsnavn.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Sortering
  const sortedKontakter = [...filteredKontakter].sort((a, b) => {
    switch (sortBy) {
      case 'navn_asc':
        return a.navn.localeCompare(b.navn, 'nb-NO')
      case 'navn_desc':
        return b.navn.localeCompare(a.navn, 'nb-NO')
      case 'rolle':
        return (a.rolle || '').localeCompare(b.rolle || '', 'nb-NO')
      case 'antall_anlegg':
        return b.anlegg.length - a.anlegg.length
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400 dark:text-gray-400">Laster kontaktpersoner...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Kontaktpersoner</h1>
          <p className="text-gray-400 dark:text-gray-400">Administrer kontaktpersoner</p>
        </div>
        <div className="card bg-red-900/20 border-red-800">
          <div className="flex items-start gap-3">
            <User className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">Kunne ikke laste kontaktpersoner</h3>
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <button onClick={loadKontaktpersoner} className="btn-primary text-sm">
                Prøv igjen
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (viewMode === 'view' && selectedKontakt) {
    return (
      <KontaktpersonDetails
        kontakt={selectedKontakt}
        onClose={() => {
          // Hvis vi kom fra anlegg, naviger tilbake til anlegget i redigeringsmodus
          if (state?.fromAnlegg && state?.anleggId) {
            navigate('/anlegg', { 
              state: { 
                editAnleggId: state.anleggId 
              } 
            })
          } else {
            setViewMode('list')
            setSelectedKontakt(null)
          }
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Kontaktpersoner</h1>
          <p className="text-gray-400 dark:text-gray-400">Administrer kontaktpersoner på tvers av anlegg</p>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter navn, e-post, telefon, rolle eller anlegg..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="md:w-64">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="input"
            >
              <option value="navn_asc">Navn (A-Å)</option>
              <option value="navn_desc">Navn (Å-A)</option>
              <option value="rolle">Rolle</option>
              <option value="antall_anlegg">Antall anlegg</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Totalt kontakter</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{kontaktpersoner.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Mail className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Med e-post</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {kontaktpersoner.filter(k => k.epost).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Phone className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Med telefon</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {kontaktpersoner.filter(k => k.telefon).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Kontaktperson Liste */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Kontaktpersonliste
            <span className="ml-2 text-sm text-gray-400 dark:text-gray-400 font-normal">
              ({sortedKontakter.length} {sortedKontakter.length === 1 ? 'person' : 'personer'})
            </span>
          </h2>
        </div>
        
        {sortedKontakter.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-gray-400">
              {searchTerm ? 'Ingen kontaktpersoner funnet' : 'Ingen kontaktpersoner registrert ennå'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Navn</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Rolle</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Kontakt</th>
                  <th className="text-left py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Anlegg</th>
                  <th className="text-right py-3 px-4 text-gray-400 dark:text-gray-400 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {sortedKontakter.map((kontakt) => (
                  <tr
                    key={kontakt.id}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">{kontakt.navn}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {kontakt.rolle ? (
                        <span className="badge badge-info">{kontakt.rolle}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {kontakt.epost && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
                            <Mail className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                            {kontakt.epost}
                          </div>
                        )}
                        {kontakt.telefon && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
                            <Phone className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                            {kontakt.telefon}
                          </div>
                        )}
                        {!kontakt.epost && !kontakt.telefon && (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {kontakt.anlegg.length > 0 ? (
                        <div className="space-y-1">
                          {kontakt.anlegg.slice(0, 2).map((anlegg, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              {anlegg.primar && (
                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              )}
                              <Building2 className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                              <span className="text-gray-500 dark:text-gray-300">{anlegg.anlegg.anleggsnavn}</span>
                            </div>
                          ))}
                          {kontakt.anlegg.length > 2 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              +{kontakt.anlegg.length - 2} flere
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Ingen anlegg</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedKontakt(kontakt)
                            setViewMode('view')
                          }}
                          className="p-2 text-gray-400 dark:text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Vis detaljer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteKontaktperson(kontakt.id)}
                          className="p-2 text-gray-400 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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

// Kontaktperson Details Component
interface KontaktpersonDetailsProps {
  kontakt: KontaktpersonMedAnlegg
  onClose: () => void
}

function KontaktpersonDetails({ kontakt, onClose }: KontaktpersonDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{kontakt.navn}</h1>
          <p className="text-gray-400 dark:text-gray-400">{kontakt.rolle || 'Ingen rolle'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="btn-secondary">
            Tilbake
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Kontaktinformasjon</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">E-post</p>
                <p className="text-gray-900 dark:text-white">{kontakt.epost || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Telefon</p>
                <p className="text-gray-900 dark:text-white">{kontakt.telefon || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Rolle</p>
                {kontakt.rolle ? (
                  <span className="badge badge-info">{kontakt.rolle}</span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">Ingen rolle</span>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Tilknyttede anlegg ({kontakt.anlegg.length})
            </h2>
            {kontakt.anlegg.length > 0 ? (
              <div className="space-y-3">
                {kontakt.anlegg.map((anlegg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-dark-100 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{anlegg.anlegg.anleggsnavn}</p>
                      </div>
                    </div>
                    {anlegg.primar && (
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-yellow-500" />
                        <span className="text-sm">Primær</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 dark:text-gray-400">Ingen tilknyttede anlegg</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Metadata</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Opprettet</p>
                <p className="text-gray-900 dark:text-white text-sm">{formatDate(kontakt.opprettet_dato)}</p>
              </div>
              {kontakt.sist_oppdatert && (
                <div>
                  <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Sist oppdatert</p>
                  <p className="text-gray-900 dark:text-white text-sm">{formatDate(kontakt.sist_oppdatert)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
