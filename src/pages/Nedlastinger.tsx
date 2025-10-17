import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Download, Mail, FileText, Search, Filter, Calendar, Building2, ArrowLeft, Star, Clock } from 'lucide-react'

interface Dokument {
  id: string
  anlegg_id: string
  anlegg_navn: string
  filnavn: string
  storage_path: string
  type: string | null
  opplastet_dato: string
}

interface EpostLogg {
  id: string
  anlegg_id: string
  anlegg_navn: string
  dokument_navn: string
  dokument_storage_path: string
  mottaker_epost: string
  mottaker_navn: string | null
  mottaker_type: 'kunde' | 'tekniker' | 'ekstra'
  sendt_av_navn: string | null
  sendt_dato: string
  emne: string
  status: 'sendt' | 'feilet'
}

type ViewMode = 'dokumenter' | 'epost-historikk'
type FilterType = 'alle' | 'pdf' | 'rapport' | 'servicerapport'

export function Nedlastinger() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>('dokumenter')
  const [dokumenter, setDokumenter] = useState<Dokument[]>([])
  const [epostLogg, setEpostLogg] = useState<EpostLogg[]>([])
  const [filteredDokumenter, setFilteredDokumenter] = useState<Dokument[]>([])
  const [filteredEpostLogg, setFilteredEpostLogg] = useState<EpostLogg[]>([])
  
  const [sokeTekst, setSokeTekst] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('alle')
  const [datoFra, setDatoFra] = useState('')
  const [datoTil, setDatoTil] = useState('')
  const [loading, setLoading] = useState(true)
  const [favoritter, setFavoritter] = useState<Set<string>>(new Set())
  const [dokumentLimit, setDokumentLimit] = useState(25)
  const [epostLimit, setEpostLimit] = useState(25)
  const [harFlereDokumenter, setHarFlereDokumenter] = useState(false)
  const [harFlereEposter, setHarFlereEposter] = useState(false)

  useEffect(() => {
    loadFavoritter()
    loadDokumenter()
  }, [])

  useEffect(() => {
    if (viewMode === 'dokumenter') {
      loadDokumenter()
    } else {
      loadEpostLogg()
    }
  }, [viewMode])

  useEffect(() => {
    filterDokumenter()
  }, [dokumenter, sokeTekst, filterType, datoFra, datoTil, favoritter, dokumentLimit])

  useEffect(() => {
    filterEpostLogg()
  }, [epostLogg, sokeTekst, datoFra, datoTil, epostLimit])

  async function loadDokumenter() {
    setLoading(true)
    try {
      // Hent alle anlegg
      const { data: anleggData, error: anleggError } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn')

      if (anleggError) throw anleggError

      const alleDokumenter: Dokument[] = []

      // Hent dokumenter fra storage for hvert anlegg
      for (const anlegg of anleggData || []) {
        const storagePath = `anlegg/${anlegg.id}/dokumenter`
        const { data: files, error: storageError } = await supabase
          .storage
          .from('anlegg.dokumenter')
          .list(storagePath, {
            limit: 1000, // Hent alle for å kunne sortere og limitere riktig
            sortBy: { column: 'created_at', order: 'desc' }
          })

        if (!storageError && files) {
          for (const file of files) {
            alleDokumenter.push({
              id: file.id || file.name,
              anlegg_id: anlegg.id,
              anlegg_navn: anlegg.anleggsnavn,
              filnavn: file.name,
              storage_path: `anlegg/${anlegg.id}/dokumenter/${file.name}`,
              type: file.name.toLowerCase().includes('service') ? 'servicerapport' : 'rapport',
              opplastet_dato: file.created_at || new Date().toISOString()
            })
          }
        }
      }

      // Sorter etter dato (nyeste først)
      alleDokumenter.sort((a, b) => 
        new Date(b.opplastet_dato).getTime() - new Date(a.opplastet_dato).getTime()
      )

      // Sjekk om det finnes flere dokumenter enn limit
      setHarFlereDokumenter(alleDokumenter.length > dokumentLimit)
      
      setDokumenter(alleDokumenter)
    } catch (error) {
      console.error('Feil ved lasting av dokumenter:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadEpostLogg() {
    setLoading(true)
    try {
      // Hent litt flere enn limit for å sjekke om det finnes mer
      const { data, error } = await supabase
        .from('epost_logg')
        .select(`
          *,
          anlegg:anlegg_id (anleggsnavn),
          ansatte:sendt_av_ansatt_id (navn)
        `)
        .order('sendt_dato', { ascending: false })
        .limit(1000)

      if (error) throw error

      const loggMedNavn = (data || []).map(item => ({
        id: item.id,
        anlegg_id: item.anlegg_id,
        anlegg_navn: item.anlegg?.anleggsnavn || 'Ukjent anlegg',
        dokument_navn: item.dokument_navn,
        dokument_storage_path: item.dokument_storage_path,
        mottaker_epost: item.mottaker_epost,
        mottaker_navn: item.mottaker_navn,
        mottaker_type: item.mottaker_type,
        sendt_av_navn: item.ansatte?.navn || 'Ukjent',
        sendt_dato: item.sendt_dato,
        emne: item.emne,
        status: item.status
      }))

      // Sjekk om det finnes flere e-poster enn limit
      setHarFlereEposter(loggMedNavn.length > epostLimit)

      setEpostLogg(loggMedNavn)
    } catch (error) {
      console.error('Feil ved lasting av e-postlogg:', error)
    } finally {
      setLoading(false)
    }
  }

  function loadFavoritter() {
    const saved = localStorage.getItem('dokument_favoritter')
    if (saved) {
      setFavoritter(new Set(JSON.parse(saved)))
    }
  }

  function toggleFavoritt(dokumentId: string) {
    const newFavoritter = new Set(favoritter)
    if (newFavoritter.has(dokumentId)) {
      newFavoritter.delete(dokumentId)
    } else {
      newFavoritter.add(dokumentId)
    }
    setFavoritter(newFavoritter)
    localStorage.setItem('dokument_favoritter', JSON.stringify([...newFavoritter]))
  }

  function filterDokumenter() {
    let filtered = [...dokumenter]

    // Søk
    if (sokeTekst) {
      filtered = filtered.filter(dok =>
        dok.filnavn.toLowerCase().includes(sokeTekst.toLowerCase()) ||
        dok.anlegg_navn.toLowerCase().includes(sokeTekst.toLowerCase())
      )
    }

    // Type filter
    if (filterType !== 'alle') {
      filtered = filtered.filter(dok => {
        if (filterType === 'pdf') return dok.filnavn.toLowerCase().endsWith('.pdf')
        if (filterType === 'rapport') return dok.type === 'rapport'
        if (filterType === 'servicerapport') return dok.type === 'servicerapport'
        return true
      })
    }

    // Dato filter
    if (datoFra) {
      filtered = filtered.filter(dok => new Date(dok.opplastet_dato) >= new Date(datoFra))
    }
    if (datoTil) {
      filtered = filtered.filter(dok => new Date(dok.opplastet_dato) <= new Date(datoTil))
    }

    // Sorter favoritter først
    filtered.sort((a, b) => {
      const aFav = favoritter.has(a.id) ? 1 : 0
      const bFav = favoritter.has(b.id) ? 1 : 0
      if (aFav !== bFav) return bFav - aFav
      return new Date(b.opplastet_dato).getTime() - new Date(a.opplastet_dato).getTime()
    })

    // Hvis det er aktive filtre, vis alle resultater. Ellers bruk limit
    const harAktiveFiltre = sokeTekst || filterType !== 'alle' || datoFra || datoTil
    if (!harAktiveFiltre) {
      setHarFlereDokumenter(filtered.length > dokumentLimit)
      filtered = filtered.slice(0, dokumentLimit)
    } else {
      setHarFlereDokumenter(false)
    }

    setFilteredDokumenter(filtered)
  }

  function filterEpostLogg() {
    let filtered = [...epostLogg]

    // Søk
    if (sokeTekst) {
      filtered = filtered.filter(logg =>
        logg.dokument_navn.toLowerCase().includes(sokeTekst.toLowerCase()) ||
        logg.anlegg_navn.toLowerCase().includes(sokeTekst.toLowerCase()) ||
        logg.mottaker_epost.toLowerCase().includes(sokeTekst.toLowerCase()) ||
        logg.mottaker_navn?.toLowerCase().includes(sokeTekst.toLowerCase())
      )
    }

    // Dato filter
    if (datoFra) {
      filtered = filtered.filter(logg => new Date(logg.sendt_dato) >= new Date(datoFra))
    }
    if (datoTil) {
      filtered = filtered.filter(logg => new Date(logg.sendt_dato) <= new Date(datoTil))
    }

    // Hvis det er aktive filtre, vis alle resultater. Ellers bruk limit
    const harAktiveFiltre = sokeTekst || datoFra || datoTil
    if (!harAktiveFiltre) {
      setHarFlereEposter(filtered.length > epostLimit)
      filtered = filtered.slice(0, epostLimit)
    } else {
      setHarFlereEposter(false)
    }

    setFilteredEpostLogg(filtered)
  }

  async function handleDownload(storagePath: string, filnavn: string) {
    try {
      const { data, error } = await supabase
        .storage
        .from('anlegg.dokumenter')
        .download(storagePath)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = filnavn
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Feil ved nedlasting:', error)
      alert('Kunne ikke laste ned dokumentet')
    }
  }

  function getMottakerTypeColor(type: string) {
    switch (type) {
      case 'kunde': return 'text-blue-400'
      case 'tekniker': return 'text-green-400'
      case 'ekstra': return 'text-purple-400'
      default: return 'text-gray-400 dark:text-gray-400'
    }
  }

  function getMottakerTypeLabel(type: string) {
    switch (type) {
      case 'kunde': return 'Kunde'
      case 'tekniker': return 'Tekniker'
      case 'ekstra': return 'Ekstra'
      default: return type
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dokumentasjon')}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Download className="w-8 h-8 text-purple-500" />
            Nedlastinger
          </h1>
          <p className="text-gray-400 dark:text-gray-400">Dokumenter og e-posthistorikk</p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('dokumenter')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'dokumenter'
              ? 'bg-purple-500 text-gray-900 dark:text-white'
              : 'bg-dark-100 text-gray-400 dark:text-gray-400 hover:bg-dark-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Dokumenter
        </button>
        <button
          onClick={() => setViewMode('epost-historikk')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'epost-historikk'
              ? 'bg-purple-500 text-gray-900 dark:text-white'
              : 'bg-dark-100 text-gray-400 dark:text-gray-400 hover:bg-dark-50'
          }`}
        >
          <Mail className="w-4 h-4" />
          E-posthistorikk
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Søk */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              <Search className="w-4 h-4 inline mr-2" />
              Søk
            </label>
            <input
              type="text"
              placeholder="Søk etter dokument, anlegg eller mottaker..."
              value={sokeTekst}
              onChange={(e) => setSokeTekst(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Type filter (kun for dokumenter) */}
          {viewMode === 'dokumenter' && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                <Filter className="w-4 h-4 inline mr-2" />
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="input w-full"
              >
                <option value="alle">Alle</option>
                <option value="pdf">PDF</option>
                <option value="rapport">Rapporter</option>
                <option value="servicerapport">Servicerapporter</option>
              </select>
            </div>
          )}

          {/* Dato fra */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Fra dato
            </label>
            <input
              type="date"
              value={datoFra}
              onChange={(e) => setDatoFra(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Dato til */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Til dato
            </label>
            <input
              type="date"
              value={datoTil}
              onChange={(e) => setDatoTil(e.target.value)}
              className="input w-full"
            />
          </div>
        </div>

        {/* Reset filters */}
        {(sokeTekst || filterType !== 'alle' || datoFra || datoTil) && (
          <button
            onClick={() => {
              setSokeTekst('')
              setFilterType('alle')
              setDatoFra('')
              setDatoTil('')
            }}
            className="mt-4 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Nullstill filtre
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : viewMode === 'dokumenter' ? (
        /* Dokumenter liste */
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Tilgjengelige dokumenter ({filteredDokumenter.length})
            </h2>
          </div>

          {filteredDokumenter.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-400 text-center py-8">Ingen dokumenter funnet</p>
          ) : (
            <>
              <div className="space-y-2">
                {filteredDokumenter.map((dok) => (
                  <div
                    key={dok.id}
                    className="flex items-center gap-4 p-4 bg-dark-100 rounded-lg hover:bg-dark-50 transition-colors"
                  >
                    <button
                      onClick={() => toggleFavoritt(dok.id)}
                      className="flex-shrink-0"
                    >
                      <Star
                        className={`w-5 h-5 transition-colors ${
                          favoritter.has(dok.id)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-400 dark:text-gray-500 hover:text-yellow-400'
                        }`}
                      />
                    </button>

                    <FileText className="w-5 h-5 text-purple-400 flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium truncate">{dok.filnavn}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-400 dark:text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {dok.anlegg_navn}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(dok.opplastet_dato).toLocaleDateString('nb-NO')}
                        </span>
                        {dok.type && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                            {dok.type}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(dok.storage_path, dok.filnavn)}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Last ned
                    </button>
                  </div>
                ))}
              </div>

              {/* Last mer knapp */}
              {harFlereDokumenter && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setDokumentLimit(dokumentLimit + 25)}
                    className="btn-secondary"
                  >
                    Last 25 flere dokumenter
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* E-posthistorikk */
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              E-posthistorikk ({filteredEpostLogg.length})
            </h2>
          </div>

          {filteredEpostLogg.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-400 text-center py-8">Ingen e-poster funnet</p>
          ) : (
            <>
              <div className="space-y-2">
                {filteredEpostLogg.map((logg) => (
                  <div
                    key={logg.id}
                    className={`p-4 rounded-lg ${
                      logg.status === 'sendt'
                        ? 'bg-dark-100 hover:bg-dark-50'
                        : 'bg-red-900/20 border border-red-800/50'
                    } transition-colors`}
                  >
                    <div className="flex items-start gap-4">
                      <Mail className={`w-5 h-5 flex-shrink-0 mt-1 ${
                        logg.status === 'sendt' ? 'text-green-400' : 'text-red-400'
                      }`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-gray-900 dark:text-white font-medium">{logg.dokument_navn}</p>
                          <span className={`px-2 py-0.5 rounded text-xs ${getMottakerTypeColor(logg.mottaker_type)}`}>
                            {getMottakerTypeLabel(logg.mottaker_type)}
                          </span>
                          {logg.status === 'feilet' && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                              Feilet
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-400 dark:text-gray-400 mb-2">{logg.emne}</p>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400 dark:text-gray-500">Mottaker:</p>
                            <p className="text-gray-500 dark:text-gray-300">
                              {logg.mottaker_navn || logg.mottaker_epost}
                            </p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs">{logg.mottaker_epost}</p>
                          </div>

                          <div>
                            <p className="text-gray-400 dark:text-gray-500">Anlegg:</p>
                            <p className="text-gray-500 dark:text-gray-300">{logg.anlegg_navn}</p>
                          </div>

                          <div>
                            <p className="text-gray-400 dark:text-gray-500">Sendt av:</p>
                            <p className="text-gray-500 dark:text-gray-300">{logg.sendt_av_navn}</p>
                          </div>

                          <div>
                            <p className="text-gray-400 dark:text-gray-500">Dato:</p>
                            <p className="text-gray-500 dark:text-gray-300">
                              {new Date(logg.sendt_dato).toLocaleString('nb-NO')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownload(logg.dokument_storage_path, logg.dokument_navn)}
                        className="btn-secondary flex items-center gap-2 flex-shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        Last ned
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Last mer knapp */}
              {harFlereEposter && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setEpostLimit(epostLimit + 25)}
                    className="btn-secondary"
                  >
                    Last 25 flere e-poster
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
