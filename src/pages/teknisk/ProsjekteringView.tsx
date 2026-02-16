import { useState, useEffect } from 'react'
import { ArrowLeft, Search, Plus, Edit, FileText, Trash2, Building2, Calendar, User, Filter, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ProsjekteringEditor } from './ProsjekteringEditor'

interface ProsjekteringViewProps {
  onBack: () => void
}

interface Kunde {
  id: string
  navn: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
  adresse?: string
  postnummer?: string
  poststed?: string
}

interface Prosjektering {
  id: string
  kunde_id: string | null
  anlegg_id: string | null
  prosjekt_navn: string
  prosjekt_nummer: string | null
  beskrivelse: string | null
  ny_kunde_navn: string | null
  status: string
  prosjektleder: string | null
  ansvarlig_prosjekterende: string | null
  opprettet_dato: string
  sist_oppdatert: string | null
  planlagt_ferdig: string | null
  // Joined data
  kunde?: { navn: string } | null
  anlegg?: { anleggsnavn: string; adresse: string } | null
}

type ViewMode = 'liste' | 'opprett' | 'rediger'

export function ProsjekteringView({ onBack }: ProsjekteringViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('liste')
  const [prosjekteringer, setProsjekteringer] = useState<Prosjektering[]>([])
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('alle')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  // For ny prosjektering
  const [showNyDialog, setShowNyDialog] = useState(false)
  const [nyProsjektType, setNyProsjektType] = useState<'eksisterende' | 'ny' | null>(null)
  const [selectedKundeId, setSelectedKundeId] = useState<string>('')
  const [selectedAnleggId, setSelectedAnleggId] = useState<string>('')
  const [anleggForKunde, setAnleggForKunde] = useState<Anlegg[]>([])
  const [searchKunde, setSearchKunde] = useState('')

  useEffect(() => {
    loadProsjekteringer()
    loadKunder()
  }, [])

  useEffect(() => {
    if (selectedKundeId) {
      loadAnleggForKunde(selectedKundeId)
    } else {
      setAnleggForKunde([])
      setSelectedAnleggId('')
    }
  }, [selectedKundeId])

  async function loadProsjekteringer() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('prosjekteringer')
        .select(`
          *,
          kunde:customer(navn),
          anlegg:anlegg(anleggsnavn, adresse)
        `)
        .order('opprettet_dato', { ascending: false })

      if (error) throw error
      setProsjekteringer(data || [])
    } catch (error) {
      console.error('Feil ved lasting av prosjekteringer:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadKunder() {
    try {
      const { data, error } = await supabase
        .from('customer')
        .select('id, navn')
        .order('navn')

      if (error) throw error
      setKunder(data || [])
    } catch (error) {
      console.error('Feil ved lasting av kunder:', error)
    }
  }

  async function loadAnleggForKunde(kundeId: string) {
    try {
      const { data, error } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn, adresse, postnummer, poststed')
        .eq('kundenr', kundeId)
        .order('anleggsnavn')

      if (error) throw error
      setAnleggForKunde(data || [])
    } catch (error) {
      console.error('Feil ved lasting av anlegg:', error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne prosjekteringen? Dette kan ikke angres.')) {
      return
    }

    try {
      setDeletingId(id)
      const { error } = await supabase
        .from('prosjekteringer')
        .delete()
        .eq('id', id)

      if (error) throw error
      setProsjekteringer(prev => prev.filter(p => p.id !== id))
    } catch (error: any) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette prosjektering: ' + (error?.message || 'Ukjent feil'))
    } finally {
      setDeletingId(null)
    }
  }

  function handleStartNyProsjektering() {
    setShowNyDialog(true)
    setNyProsjektType(null)
    setSelectedKundeId('')
    setSelectedAnleggId('')
    setSearchKunde('')
  }

  function handleOpprettPåEksisterende() {
    if (!selectedKundeId) {
      alert('Velg en kunde først')
      return
    }
    setShowNyDialog(false)
    setViewMode('opprett')
  }

  function handleOpprettPåNy() {
    setShowNyDialog(false)
    setSelectedKundeId('')
    setSelectedAnleggId('')
    setViewMode('opprett')
  }

  function handleCloseEditor() {
    setViewMode('liste')
    setEditingId(null)
    setSelectedKundeId('')
    setSelectedAnleggId('')
    loadProsjekteringer()
  }

  const filteredKunder = kunder.filter(k =>
    k.navn.toLowerCase().includes(searchKunde.toLowerCase())
  )

  const filteredProsjekteringer = prosjekteringer.filter(p => {
    const matchesSearch = 
      p.prosjekt_navn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.prosjekt_nummer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kunde?.navn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.anlegg?.anleggsnavn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ny_kunde_navn?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'alle' || p.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const statusOptions = ['alle', 'Utkast', 'Under arbeid', 'Til godkjenning', 'Godkjent', 'Ferdig', 'Arkivert']

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Utkast': return 'bg-gray-500/20 text-gray-400'
      case 'Under arbeid': return 'bg-blue-500/20 text-blue-400'
      case 'Til godkjenning': return 'bg-yellow-500/20 text-yellow-400'
      case 'Godkjent': return 'bg-green-500/20 text-green-400'
      case 'Ferdig': return 'bg-emerald-500/20 text-emerald-400'
      case 'Arkivert': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  // Vis editor
  if (viewMode === 'opprett' || viewMode === 'rediger') {
    return (
      <ProsjekteringEditor
        prosjekteringId={editingId || undefined}
        kundeId={selectedKundeId || undefined}
        anleggId={selectedAnleggId || undefined}
        onBack={handleCloseEditor}
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
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Prosjektering</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Prosjektering av brannalarmanlegg iht. TEK 17, NS 3960, NS 3961
            </p>
          </div>
        </div>
        <button
          onClick={handleStartNyProsjektering}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Ny prosjektering
        </button>
      </div>

      {/* Søk og filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Søk etter prosjekt, kunde eller anlegg..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="input flex items-center gap-2 min-w-[180px] justify-between"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span>{statusFilter === 'alle' ? 'Alle statuser' : statusFilter}</span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-100 border border-gray-200 dark:border-dark-200 rounded-lg shadow-lg z-10">
              {statusOptions.map(status => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status)
                    setShowStatusDropdown(false)
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-dark-200 first:rounded-t-lg last:rounded-b-lg ${
                    statusFilter === status ? 'bg-primary/10 text-primary' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {status === 'alle' ? 'Alle statuser' : status}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prosjekteringsliste */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Prosjekteringer
            {filteredProsjekteringer.length > 0 && (
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 font-normal">
                ({filteredProsjekteringer.length} {filteredProsjekteringer.length === 1 ? 'prosjekt' : 'prosjekter'})
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Laster prosjekteringer...</p>
          </div>
        ) : filteredProsjekteringer.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {searchQuery || statusFilter !== 'alle' 
                ? 'Ingen prosjekteringer matcher søket' 
                : 'Ingen prosjekteringer funnet'}
            </p>
            <p className="text-sm text-gray-500">Klikk "Ny prosjektering" for å opprette en ny</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProsjekteringer.map((prosjekt) => (
              <div
                key={prosjekt.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-gray-900 dark:text-white font-medium truncate">
                      {prosjekt.prosjekt_navn}
                    </h3>
                    {prosjekt.prosjekt_nummer && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        #{prosjekt.prosjekt_nummer}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(prosjekt.status)}`}>
                      {prosjekt.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300 truncate">
                        {prosjekt.kunde?.navn || prosjekt.ny_kunde_navn || 'Ikke angitt'}
                      </span>
                    </div>
                    {prosjekt.anlegg && (
                      <div className="text-gray-500 dark:text-gray-400 truncate">
                        {prosjekt.anlegg.anleggsnavn}
                      </div>
                    )}
                    {prosjekt.ansvarlig_prosjekterende && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {prosjekt.ansvarlig_prosjekterende}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {new Date(prosjekt.opprettet_dato).toLocaleDateString('nb-NO')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => {
                      setEditingId(prosjekt.id)
                      setSelectedKundeId(prosjekt.kunde_id || '')
                      setSelectedAnleggId(prosjekt.anlegg_id || '')
                      setViewMode('rediger')
                    }}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Rediger"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(prosjekt.id)}
                    disabled={deletingId === prosjekt.id}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Slett"
                  >
                    {deletingId === prosjekt.id ? (
                      <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ny prosjektering dialog */}
      {showNyDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-dark-200">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Ny prosjektering
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Velg om du vil opprette prosjektering på eksisterende kunde/anlegg eller ny kunde
              </p>
            </div>

            <div className="p-6">
              {!nyProsjektType ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setNyProsjektType('eksisterende')}
                    className="p-6 border-2 border-gray-200 dark:border-dark-200 rounded-xl hover:border-primary transition-colors text-left"
                  >
                    <Building2 className="w-8 h-8 text-primary mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Eksisterende kunde
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Velg fra eksisterende kunder og anlegg i systemet
                    </p>
                  </button>
                  <button
                    onClick={() => setNyProsjektType('ny')}
                    className="p-6 border-2 border-gray-200 dark:border-dark-200 rounded-xl hover:border-primary transition-colors text-left"
                  >
                    <Plus className="w-8 h-8 text-green-500 mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Ny kunde
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Opprett prosjektering for en kunde som ikke finnes i systemet
                    </p>
                  </button>
                </div>
              ) : nyProsjektType === 'eksisterende' ? (
                <div className="space-y-6">
                  {/* Kundevalg */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Velg kunde
                    </label>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Søk etter kunde..."
                        value={searchKunde}
                        onChange={(e) => setSearchKunde(e.target.value)}
                        className="input w-full pl-10"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-dark-200 rounded-lg">
                      {filteredKunder.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Ingen kunder funnet</p>
                      ) : (
                        filteredKunder.map(kunde => (
                          <button
                            key={kunde.id}
                            onClick={() => setSelectedKundeId(kunde.id)}
                            className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-dark-200 last:border-b-0 transition-colors ${
                              selectedKundeId === kunde.id
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-gray-50 dark:hover:bg-dark-200 text-gray-900 dark:text-gray-300'
                            }`}
                          >
                            {kunde.navn}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Anleggsvalg */}
                  {selectedKundeId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Velg anlegg (valgfritt)
                      </label>
                      <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-dark-200 rounded-lg">
                        {anleggForKunde.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">Ingen anlegg funnet for denne kunden</p>
                        ) : (
                          <>
                            <button
                              onClick={() => setSelectedAnleggId('')}
                              className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-dark-200 transition-colors ${
                                !selectedAnleggId
                                  ? 'bg-primary/10 text-primary'
                                  : 'hover:bg-gray-50 dark:hover:bg-dark-200 text-gray-900 dark:text-gray-300'
                              }`}
                            >
                              <em>Ikke velg anlegg (nytt anlegg)</em>
                            </button>
                            {anleggForKunde.map(anlegg => (
                              <button
                                key={anlegg.id}
                                onClick={() => setSelectedAnleggId(anlegg.id)}
                                className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-dark-200 last:border-b-0 transition-colors ${
                                  selectedAnleggId === anlegg.id
                                    ? 'bg-primary/10 text-primary'
                                    : 'hover:bg-gray-50 dark:hover:bg-dark-200 text-gray-900 dark:text-gray-300'
                                }`}
                              >
                                <div className="font-medium">{anlegg.anleggsnavn}</div>
                                {anlegg.adresse && (
                                  <div className="text-sm opacity-75">
                                    {anlegg.adresse}, {anlegg.postnummer} {anlegg.poststed}
                                  </div>
                                )}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Plus className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Du vil kunne fylle inn kundeinformasjon i prosjekteringsskjemaet
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-dark-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNyDialog(false)
                  setNyProsjektType(null)
                }}
                className="btn-secondary"
              >
                Avbryt
              </button>
              {nyProsjektType === 'eksisterende' ? (
                <button
                  onClick={handleOpprettPåEksisterende}
                  disabled={!selectedKundeId}
                  className="btn-primary disabled:opacity-50"
                >
                  Fortsett
                </button>
              ) : nyProsjektType === 'ny' ? (
                <button
                  onClick={handleOpprettPåNy}
                  className="btn-primary"
                >
                  Fortsett
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
