import { useState, useEffect } from 'react'
import { ArrowLeft, Search, Plus, Edit, FileText, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DetektorlisteEditor } from './DetektorlisteEditor'

interface DetektorlisteViewProps {
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

interface Detektorliste {
  id: string
  kunde_id: string
  anlegg_id: string
  revisjon: string
  dato: string
  service_ingeniør: string
  kundeadresse?: string
  kontakt_person?: string
  mobil?: string
  epost?: string
  annet?: string
  status: string
  opprettet_dato: string
}

export function DetektorlisteView({ onBack }: DetektorlisteViewProps) {
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [detektorlister, setDetektorlister] = useState<Detektorliste[]>([])
  const [selectedKunde, setSelectedKunde] = useState<string>('')
  const [selectedAnlegg, setSelectedAnlegg] = useState<string>('')
  const [searchKunde, setSearchKunde] = useState('')
  const [searchAnlegg, setSearchAnlegg] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingListeId, setEditingListeId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [deletingListeId, setDeletingListeId] = useState<string | null>(null)

  useEffect(() => {
    loadKunder()
  }, [])

  useEffect(() => {
    if (selectedKunde) {
      loadAnlegg(selectedKunde)
    } else {
      setAnlegg([])
      setSelectedAnlegg('')
      setDetektorlister([])
    }
  }, [selectedKunde])

  useEffect(() => {
    if (selectedAnlegg) {
      loadDetektorlister(selectedAnlegg)
    } else {
      setDetektorlister([])
    }
  }, [selectedAnlegg])

  async function loadKunder() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('customer')
        .select('id, navn')
        .order('navn')

      if (error) throw error
      setKunder(data || [])
    } catch (error) {
      console.error('Feil ved lasting av kunder:', error)
      alert('Kunne ikke laste kunder')
    } finally {
      setLoading(false)
    }
  }

  async function loadAnlegg(kundeId: string) {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn, adresse, postnummer, poststed')
        .eq('kundenr', kundeId)
        .order('anleggsnavn')

      if (error) throw error
      setAnlegg(data || [])
    } catch (error) {
      console.error('Feil ved lasting av anlegg:', error)
      alert('Kunne ikke laste anlegg')
    } finally {
      setLoading(false)
    }
  }

  async function loadDetektorlister(anleggId: string) {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('detektorlister')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('opprettet_dato', { ascending: false })

      if (error) throw error
      setDetektorlister(data || [])
    } catch (error) {
      console.error('Feil ved lasting av detektorlister:', error)
      alert('Kunne ikke laste detektorlister')
    } finally {
      setLoading(false)
    }
  }

  const filteredKunder = kunder.filter(k =>
    k.navn.toLowerCase().includes(searchKunde.toLowerCase())
  )

  const filteredAnlegg = anlegg.filter(a =>
    a.anleggsnavn.toLowerCase().includes(searchAnlegg.toLowerCase())
  )

  function handleCloseEditor() {
    setEditingListeId(null)
    setIsCreatingNew(false)
    if (selectedAnlegg) {
      loadDetektorlister(selectedAnlegg)
    }
  }

  async function handleDeleteListe(listeId: string) {
    if (!confirm('Er du sikker på at du vil slette denne detektorlisten? Dette kan ikke angres.')) {
      return
    }

    try {
      setDeletingListeId(listeId)

      // Slett detektor_items først (foreign key constraint)
      const { error: itemsError } = await supabase
        .from('detektor_items')
        .delete()
        .eq('detektorliste_id', listeId)

      if (itemsError) throw itemsError

      // Slett selve detektorlisten
      const { error: listeError } = await supabase
        .from('detektorlister')
        .delete()
        .eq('id', listeId)

      if (listeError) throw listeError

      // Oppdater listen
      setDetektorlister(prev => prev.filter(l => l.id !== listeId))
    } catch (error: any) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette detektorliste: ' + (error?.message || 'Ukjent feil'))
    } finally {
      setDeletingListeId(null)
    }
  }

  // Hvis vi redigerer eller oppretter ny, vis editoren
  if (editingListeId || isCreatingNew) {
    const selectedKundeData = kunder.find(k => k.id === selectedKunde)
    const selectedAnleggData = anlegg.find(a => a.id === selectedAnlegg)
    
    return (
      <DetektorlisteEditor
        detektorlisteId={editingListeId || undefined}
        kundeId={selectedKunde}
        anleggId={selectedAnlegg}
        kundeNavn={selectedKundeData?.navn || ''}
        anleggNavn={selectedAnleggData?.anleggsnavn || ''}
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Detektorlister</h1>
            <p className="text-gray-600 dark:text-gray-400">Velg kunde og anlegg for å administrere detektorlister</p>
          </div>
        </div>
      </div>

      {/* Kunde og Anlegg valg */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kunde */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Velg kunde</h2>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter kunde..."
              value={searchKunde}
              onChange={(e) => setSearchKunde(e.target.value)}
              className="input w-full pl-10"
            />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading && !selectedKunde ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredKunder.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Ingen kunder funnet</p>
            ) : (
              filteredKunder.map((kunde) => (
                <button
                  key={kunde.id}
                  onClick={() => setSelectedKunde(kunde.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedKunde === kunde.id
                      ? 'bg-primary text-white dark:text-white'
                      : 'bg-gray-50 dark:bg-dark-100 text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200'
                  }`}
                >
                  {kunde.navn}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Anlegg */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Velg anlegg</h2>
          {!selectedKunde ? (
            <p className="text-gray-500 text-center py-8">Velg en kunde først</p>
          ) : (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
                <input
                  type="text"
                  placeholder="Søk etter anlegg..."
                  value={searchAnlegg}
                  onChange={(e) => setSearchAnlegg(e.target.value)}
                  className="input w-full pl-10"
                />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : filteredAnlegg.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Ingen anlegg funnet</p>
                ) : (
                  filteredAnlegg.map((anlegg) => (
                    <button
                      key={anlegg.id}
                      onClick={() => setSelectedAnlegg(anlegg.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        selectedAnlegg === anlegg.id
                          ? 'bg-primary text-white dark:text-white'
                          : 'bg-gray-50 dark:bg-dark-100 text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200'
                      }`}
                    >
                      <div className="font-medium">{anlegg.anleggsnavn}</div>
                      {anlegg.adresse && (
                        <div className="text-sm opacity-75 mt-1">
                          {anlegg.adresse}, {anlegg.postnummer} {anlegg.poststed}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detektorlister for valgt anlegg */}
      {selectedAnlegg && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Detektorlister
              {detektorlister.length > 0 && (
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 font-normal">
                  ({detektorlister.length} {detektorlister.length === 1 ? 'liste' : 'lister'})
                </span>
              )}
            </h2>
            <button
              onClick={() => setIsCreatingNew(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ny detektorliste
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Laster detektorlister...</p>
            </div>
          ) : detektorlister.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">Ingen detektorlister funnet</p>
              <p className="text-sm text-gray-500">Klikk "Ny detektorliste" for å opprette en ny liste</p>
            </div>
          ) : (
            <div className="space-y-3">
              {detektorlister.map((liste) => (
                <div
                  key={liste.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-gray-900 dark:text-white font-medium">
                        Revisjon {liste.revisjon}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        liste.status === 'Ferdig'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {liste.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Dato:</span>
                        <span className="text-gray-700 dark:text-gray-300 ml-2">
                          {new Date(liste.dato).toLocaleDateString('nb-NO')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Servicetekniker:</span>
                        <span className="text-gray-700 dark:text-gray-300 ml-2">{liste.service_ingeniør}</span>
                      </div>
                      {liste.kontakt_person && (
                        <div>
                          <span className="text-gray-500">Kontakt:</span>
                          <span className="text-gray-700 dark:text-gray-300 ml-2">{liste.kontakt_person}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Opprettet:</span>
                        <span className="text-gray-700 dark:text-gray-300 ml-2">
                          {new Date(liste.opprettet_dato).toLocaleDateString('nb-NO')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setEditingListeId(liste.id)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Rediger"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteListe(liste.id)}
                      disabled={deletingListeId === liste.id}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Slett"
                    >
                      {deletingListeId === liste.id ? (
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
      )}
    </div>
  )
}
