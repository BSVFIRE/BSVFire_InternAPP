import { useState, useMemo } from 'react'
import { 
  Shield, 
  Users, 
  Eye, 
  Edit, 
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  UserCheck,
  UserX
} from 'lucide-react'
import { useModulTilgangAdmin, Modul, AnsattMedTilganger } from '@/hooks/useModulTilgang'

export function AdminModulOversikt() {
  const { 
    moduler, 
    ansatte, 
    loading, 
    error, 
    oppdaterTilgang,
    giFullTilgang,
    fjernAlleTilganger,
    refresh 
  } = useModulTilgangAdmin()

  const [searchTerm, setSearchTerm] = useState('')
  const [expandedAnsatt, setExpandedAnsatt] = useState<string | null>(null)
  const [selectedKategori, setSelectedKategori] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  // Grupper moduler etter kategori
  const modulerByKategori = useMemo(() => {
    const grouped: Record<string, Modul[]> = {}
    moduler.forEach(m => {
      if (!grouped[m.kategori]) grouped[m.kategori] = []
      grouped[m.kategori].push(m)
    })
    return grouped
  }, [moduler])

  const kategorier = useMemo(() => {
    return [
      { key: 'all', navn: 'Alle' },
      { key: 'admin', navn: 'Administrator' },
      { key: 'priser', navn: 'Priser' },
      { key: 'general', navn: 'Generelt' }
    ]
  }, [])

  // Filtrer ansatte basert på søk
  const filtrerteAnsatte = useMemo(() => {
    if (!searchTerm) return ansatte
    const term = searchTerm.toLowerCase()
    return ansatte.filter(a => 
      a.navn?.toLowerCase().includes(term) || 
      a.epost?.toLowerCase().includes(term)
    )
  }, [ansatte, searchTerm])


  const handleTilgangToggle = async (
    ansattId: string, 
    modulId: string, 
    type: 'se' | 'rediger',
    currentValue: boolean
  ) => {
    const key = `${ansattId}-${modulId}-${type}`
    setUpdating(key)

    const ansatt = ansatte.find(a => a.id === ansattId)
    const tilgang = ansatt?.tilganger.find(t => t.modul_id === modulId)
    
    const kanSe = type === 'se' ? !currentValue : (tilgang?.kan_se || false)
    const kanRediger = type === 'rediger' ? !currentValue : (tilgang?.kan_redigere || false)

    await oppdaterTilgang(ansattId, modulId, kanSe, kanRediger)
    setUpdating(null)
  }

  const handleGiFullTilgang = async (ansattId: string) => {
    setUpdating(`full-${ansattId}`)
    await giFullTilgang(ansattId)
    setUpdating(null)
  }

  const handleFjernAlleTilganger = async (ansattId: string) => {
    if (!confirm('Er du sikker på at du vil fjerne alle tilganger for denne brukeren?')) return
    setUpdating(`remove-${ansattId}`)
    await fjernAlleTilganger(ansattId)
    setUpdating(null)
  }

  const getTilgangForModul = (ansatt: AnsattMedTilganger, modulId: string) => {
    return ansatt.tilganger.find(t => t.modul_id === modulId)
  }

  const getAntallTilganger = (ansatt: AnsattMedTilganger) => {
    return ansatt.tilganger.filter(t => t.kan_se || t.kan_redigere).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
          Kunne ikke laste modul-tilganger
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
          Har du kjørt SQL-migrasjonen? Se <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">supabase_migrations/create_modul_tilganger.sql</code>
        </p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Prøv igjen
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Modul Oversikt
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Administrer hvem som har tilgang til hvilke moduler
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Users className="w-4 h-4" />
          {ansatte.length} ansatte • {moduler.length} moduler
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Søk etter ansatt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          {kategorier.map(kat => (
            <button
              key={kat.key}
              onClick={() => setSelectedKategori(kat.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedKategori === kat.key
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-dark-50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-100 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {kat.navn}
            </button>
          ))}
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-700 dark:text-blue-300 font-medium">
              Super-administratorer (erik.skille@bsvfire.no) har alltid full tilgang til alle moduler.
            </p>
            <p className="text-blue-600 dark:text-blue-400 mt-1">
              <Eye className="w-4 h-4 inline mr-1" /> = Kan se modulen | 
              <Edit className="w-4 h-4 inline mx-1" /> = Kan redigere i modulen
            </p>
          </div>
        </div>
      </div>

      {/* Ansatte liste */}
      <div className="space-y-3">
        {filtrerteAnsatte.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Ingen ansatte funnet' : 'Ingen ansatte i systemet'}
          </div>
        ) : (
          filtrerteAnsatte.map(ansatt => {
            const isExpanded = expandedAnsatt === ansatt.id
            const antallTilganger = getAntallTilganger(ansatt)
            
            return (
              <div
                key={ansatt.id}
                className="bg-white dark:bg-dark-50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Ansatt header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
                  onClick={() => setExpandedAnsatt(isExpanded ? null : ansatt.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {ansatt.navn?.charAt(0) || ansatt.epost?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {ansatt.navn || 'Ukjent navn'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {ansatt.epost}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      antallTilganger > 0
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                    }`}>
                      {antallTilganger} tilganger
                    </span>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    {/* Quick actions */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleGiFullTilgang(ansatt.id)
                        }}
                        disabled={updating?.startsWith('full-')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-500/20 transition-colors text-sm"
                      >
                        {updating === `full-${ansatt.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                        Gi full tilgang
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFjernAlleTilganger(ansatt.id)
                        }}
                        disabled={updating?.startsWith('remove-')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm"
                      >
                        {updating === `remove-${ansatt.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserX className="w-4 h-4" />
                        )}
                        Fjern alle tilganger
                      </button>
                    </div>

                    {/* Moduler grid */}
                    <div className="space-y-4">
                      {Object.entries(modulerByKategori).map(([kategori, kategoriModuler]) => {
                        // Filter basert på valgt kategori
                        if (selectedKategori !== 'all' && kategori !== selectedKategori) return null
                        
                        const kategoriNavn = kategorier.find(k => k.key === kategori)?.navn || kategori

                        return (
                          <div key={kategori}>
                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                              {kategoriNavn}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {kategoriModuler.map(modul => {
                                const tilgang = getTilgangForModul(ansatt, modul.id)
                                const kanSe = tilgang?.kan_se || false
                                const kanRediger = tilgang?.kan_redigere || false
                                const seKey = `${ansatt.id}-${modul.id}-se`
                                const redigerKey = `${ansatt.id}-${modul.id}-rediger`

                                return (
                                  <div
                                    key={modul.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-100 rounded-lg"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                        {modul.navn}
                                      </p>
                                      {modul.beskrivelse && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                          {modul.beskrivelse}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                      {/* Kan se toggle */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleTilgangToggle(ansatt.id, modul.id, 'se', kanSe)
                                        }}
                                        disabled={updating === seKey}
                                        className={`p-1.5 rounded transition-colors ${
                                          kanSe
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                        }`}
                                        title={kanSe ? 'Kan se (klikk for å fjerne)' : 'Kan ikke se (klikk for å gi tilgang)'}
                                      >
                                        {updating === seKey ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Eye className="w-4 h-4" />
                                        )}
                                      </button>
                                      {/* Kan redigere toggle */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleTilgangToggle(ansatt.id, modul.id, 'rediger', kanRediger)
                                        }}
                                        disabled={updating === redigerKey}
                                        className={`p-1.5 rounded transition-colors ${
                                          kanRediger
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                        }`}
                                        title={kanRediger ? 'Kan redigere (klikk for å fjerne)' : 'Kan ikke redigere (klikk for å gi tilgang)'}
                                      >
                                        {updating === redigerKey ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Edit className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
