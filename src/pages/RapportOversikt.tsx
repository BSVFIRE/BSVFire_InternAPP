import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { FileText, Building2, Download, Mail, ArrowLeft, Loader2, Search, Filter, Calendar, Trash2 } from 'lucide-react'

interface Kunde {
  id: string
  navn: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
  kundenr: string
  adresse?: string | null
  postnummer?: string | null
  poststed?: string | null
}

interface Dokument {
  id: string
  anlegg_id: string
  filnavn: string
  url: string | null
  storage_path: string
  type: string | null
  opplastet_dato: string
  opprettet_av: string | null
}

export function RapportOversikt() {
  const navigate = useNavigate()
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [dokumenter, setDokumenter] = useState<Dokument[]>([])
  
  const [selectedKunde, setSelectedKunde] = useState('')
  const [selectedAnlegg, setSelectedAnlegg] = useState('')
  
  const [kundeSok, setKundeSok] = useState('')
  const [anleggSok, setAnleggSok] = useState('')
  const [dokumentSok, setDokumentSok] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('alle')
  
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    loadKunder()
  }, [])

  useEffect(() => {
    if (selectedKunde) {
      loadAnlegg(selectedKunde)
    } else {
      setAnlegg([])
      setSelectedAnlegg('')
    }
  }, [selectedKunde])

  useEffect(() => {
    if (selectedAnlegg) {
      loadDokumenter(selectedAnlegg)
    } else {
      setDokumenter([])
    }
  }, [selectedAnlegg])

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

  async function loadAnlegg(kundeId: string) {
    try {
      setLoadingData(true)
      const { data, error } = await supabase
        .from('anlegg')
        .select('*')
        .eq('kundenr', kundeId)
        .order('anleggsnavn')

      if (error) throw error
      setAnlegg(data || [])
    } catch (error) {
      console.error('Feil ved lasting av anlegg:', error)
    } finally {
      setLoadingData(false)
    }
  }

  async function loadDokumenter(anleggId: string) {
    try {
      setLoading(true)
      console.log('🔍 Laster dokumenter for anlegg:', anleggId)
      
      // Hent fra dokumenter-tabellen
      const { data: dbDocs, error: dbError } = await supabase
        .from('dokumenter')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('opplastet_dato', { ascending: false })

      if (dbError) {
        console.error('❌ Feil ved henting fra dokumenter-tabell:', dbError)
      }

      // Hent fra Storage som fallback
      const storagePath = `anlegg/${anleggId}/dokumenter`
      const { data: storageDocs, error: storageError } = await supabase
        .storage
        .from('anlegg.dokumenter')
        .list(storagePath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (storageError) {
        console.error('❌ Feil ved henting fra storage:', storageError)
      }

      // Kombiner dokumenter fra tabell og storage
      const docs: Dokument[] = []

      // Legg til dokumenter fra tabell
      if (dbDocs) {
        docs.push(...dbDocs)
      }

      // Legg til dokumenter fra storage som ikke finnes i tabellen
      if (storageDocs) {
        for (const file of storageDocs) {
          const existsInDb = dbDocs?.some(doc => doc.filnavn === file.name)
          
          if (!existsInDb) {
            const filePath = `anlegg/${anleggId}/dokumenter/${file.name}`
            
            // Generate signed URL
            const { data: urlData } = await supabase.storage
              .from('anlegg.dokumenter')
              .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 dager

            docs.push({
              id: file.id || file.name,
              anlegg_id: anleggId,
              filnavn: file.name,
              url: urlData?.signedUrl || null,
              storage_path: filePath,
              type: null,
              opplastet_dato: file.created_at || new Date().toISOString(),
              opprettet_av: null
            })
          }
        }
      }

      console.log('📊 Totalt dokumenter:', docs.length, docs)
      setDokumenter(docs)
    } catch (error) {
      console.error('💥 Feil ved lasting av dokumenter:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload(dokument: Dokument) {
    try {
      if (dokument.url) {
        // Åpne signed URL
        window.open(dokument.url, '_blank')
      } else {
        // Last ned fra storage
        const { data, error } = await supabase.storage
          .from('anlegg.dokumenter')
          .download(dokument.storage_path)

        if (error) throw error

        const url = URL.createObjectURL(data)
        const link = document.createElement('a')
        link.href = url
        link.download = dokument.filnavn
        link.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Feil ved nedlasting:', error)
      alert('Kunne ikke laste ned dokument')
    }
  }

  async function handleDelete(dokument: Dokument) {
    if (!confirm(`Er du sikker på at du vil slette "${dokument.filnavn}"? Dette kan ikke angres.`)) {
      return
    }

    try {
      // Slett fra storage
      const { error: storageError } = await supabase.storage
        .from('anlegg.dokumenter')
        .remove([dokument.storage_path])

      if (storageError) {
        console.error('Feil ved sletting fra storage:', storageError)
        // Fortsett likevel for å slette fra database
      }

      // Slett fra dokumenter-tabellen
      const { error: dbError } = await supabase
        .from('dokumenter')
        .delete()
        .eq('id', dokument.id)

      if (dbError) {
        console.error('Feil ved sletting fra database:', dbError)
        throw dbError
      }

      // Oppdater lokal state
      setDokumenter(dokumenter.filter(d => d.id !== dokument.id))
      alert('✅ Dokument slettet')
    } catch (error) {
      console.error('Feil ved sletting av dokument:', error)
      alert('❌ Kunne ikke slette dokument')
    }
  }

  function handleSendEmail() {
    navigate('/send-rapporter', {
      state: {
        kundeId: selectedKunde,
        anleggId: selectedAnlegg
      }
    })
  }

  const filteredKunder = kunder.filter(k =>
    k.navn.toLowerCase().includes(kundeSok.toLowerCase())
  )

  const filteredAnlegg = anlegg.filter(a =>
    a.anleggsnavn.toLowerCase().includes(anleggSok.toLowerCase())
  )

  // Hent unike dokumenttyper
  const dokumentTyper = ['alle', ...new Set(dokumenter.map(d => d.type).filter(Boolean) as string[])]

  const filteredDokumenter = dokumenter.filter(dok => {
    const matchesSok = dok.filnavn.toLowerCase().includes(dokumentSok.toLowerCase())
    const matchesType = typeFilter === 'alle' || dok.type === typeFilter
    return matchesSok && matchesType
  })

  const selectedAnleggObj = anlegg.find(a => a.id === selectedAnlegg)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dokumentasjon')}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-500" />
              Rapporter
            </h1>
            <p className="text-gray-400 dark:text-gray-400">Se alle rapporter og dokumenter for et anlegg</p>
          </div>
        </div>
        {selectedAnlegg && dokumenter.length > 0 && (
          <button
            onClick={handleSendEmail}
            className="btn-primary flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Send på e-post
          </button>
        )}
      </div>

      {/* Velg kunde og anlegg */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kunde selector */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Velg kunde</h3>
              <p className="text-sm text-gray-400">Søk og velg kunde</p>
            </div>
          </div>

          <input
            type="text"
            placeholder="Søk etter kunde..."
            value={kundeSok}
            onChange={(e) => setKundeSok(e.target.value)}
            className="input mb-3"
          />

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredKunder.map((kunde) => (
              <button
                key={kunde.id}
                onClick={() => setSelectedKunde(kunde.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedKunde === kunde.id
                    ? 'bg-primary/20 border-2 border-primary'
                    : 'bg-gray-800/50 border-2 border-transparent hover:border-gray-700'
                }`}
              >
                <div className="font-medium text-white">{kunde.navn}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Anlegg selector */}
        {selectedKunde && (
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Velg anlegg</h3>
                <p className="text-sm text-gray-400">Søk og velg anlegg</p>
              </div>
            </div>

            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Søk etter anlegg..."
                  value={anleggSok}
                  onChange={(e) => setAnleggSok(e.target.value)}
                  className="input mb-3"
                />

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredAnlegg.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setSelectedAnlegg(a.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        selectedAnlegg === a.id
                          ? 'bg-primary/20 border-2 border-primary'
                          : 'bg-gray-800/50 border-2 border-transparent hover:border-gray-700'
                      }`}
                    >
                      <div className="font-medium text-white">{a.anleggsnavn}</div>
                      {a.adresse && (
                        <div className="text-sm text-gray-400 mt-1">{a.adresse}</div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Anleggsinformasjon */}
      {selectedAnleggObj && (
        <div className="card bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Building2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{selectedAnleggObj.anleggsnavn}</h3>
              {selectedAnleggObj.adresse && (
                <p className="text-sm text-gray-400">
                  {selectedAnleggObj.adresse}
                  {selectedAnleggObj.postnummer && selectedAnleggObj.poststed &&
                    `, ${selectedAnleggObj.postnummer} ${selectedAnleggObj.poststed}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dokumenter */}
      {selectedAnlegg && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : dokumenter.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="w-16 h-16 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ingen dokumenter funnet</h3>
              <p className="text-gray-400 dark:text-gray-400">Dette anlegget har ingen dokumenter ennå</p>
            </div>
          ) : (
            <>
              {/* Søk og filter */}
              <div className="card">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Søk i dokumenter..."
                      value={dokumentSok}
                      onChange={(e) => setDokumentSok(e.target.value)}
                      className="input pl-10"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="input pl-10"
                    >
                      {dokumentTyper.map(type => (
                        <option key={type} value={type}>
                          {type === 'alle' ? 'Alle typer' : type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dokumentliste */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Dokumenter ({filteredDokumenter.length})
                </h3>
                <div className="space-y-2">
                  {filteredDokumenter.map(dok => (
                    <div
                      key={dok.id}
                      className="flex items-center justify-between p-4 bg-dark-100 rounded-lg hover:bg-dark-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900 dark:text-white font-medium truncate">{dok.filnavn}</p>
                            {dok.type && (
                              <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs flex-shrink-0">
                                {dok.type}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(dok.opplastet_dato).toLocaleDateString('nb-NO')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(dok)}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0"
                          title="Last ned"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(dok)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                          title="Slett dokument"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {!selectedAnlegg && (
        <div className="card text-center py-12">
          <Building2 className="w-16 h-16 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Velg kunde og anlegg for å starte</h3>
          <p className="text-gray-400 dark:text-gray-400">Velg en kunde og et anlegg fra valgene over for å se dokumenter</p>
        </div>
      )}
    </div>
  )
}
