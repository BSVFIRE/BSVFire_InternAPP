import { useState, useEffect } from 'react'
import { X, Loader2, Building, Search, Check, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface EksisterendeKunde {
  id: string
  navn: string
  kunde_nummer: string | null
  organisasjonsnummer: string | null
}

interface KundenummerDialogProps {
  kundeNavn: string
  organisasjonsnummer: string | null
  anleggNavn: string
  onConfirm: (data: {
    kundenummer: string
    eksisterendeKundeId: string | null
    opprettKunde: boolean
  }) => void
  onCancel: () => void
}

export function KundenummerDialog({
  kundeNavn,
  organisasjonsnummer,
  anleggNavn,
  onConfirm,
  onCancel
}: KundenummerDialogProps) {
  const [kundenummer, setKundenummer] = useState('')
  const [loading, setLoading] = useState(true)
  const [eksisterendeKunder, setEksisterendeKunder] = useState<EksisterendeKunde[]>([])
  const [valgtKunde, setValgtKunde] = useState<EksisterendeKunde | null>(null)
  const [modus, setModus] = useState<'velg' | 'ny'>('velg')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    sjekkEksisterendeKunder()
  }, [])

  async function sjekkEksisterendeKunder() {
    try {
      setLoading(true)
      
      // Søk etter kunder med samme org.nr eller lignende navn
      let query = supabase
        .from('customer')
        .select('id, navn, kunde_nummer, organisasjonsnummer')
        .or('skjult.is.null,skjult.eq.false')
      
      // Hvis vi har org.nr, søk etter det først
      if (organisasjonsnummer) {
        const { data: orgMatch } = await supabase
          .from('customer')
          .select('id, navn, kunde_nummer, organisasjonsnummer')
          .eq('organisasjonsnummer', organisasjonsnummer)
          .or('skjult.is.null,skjult.eq.false')
        
        if (orgMatch && orgMatch.length > 0) {
          setEksisterendeKunder(orgMatch)
          // Automatisk velg kunde med samme org.nr
          setValgtKunde(orgMatch[0])
          if (orgMatch[0].kunde_nummer) {
            setKundenummer(orgMatch[0].kunde_nummer)
          }
          setLoading(false)
          return
        }
      }
      
      // Søk etter lignende kundenavn
      const { data: navnMatch } = await query
        .ilike('navn', `%${kundeNavn.split(' ')[0]}%`)
        .limit(10)
      
      if (navnMatch && navnMatch.length > 0) {
        setEksisterendeKunder(navnMatch)
      } else {
        // Ingen treff, gå direkte til ny kunde-modus
        setModus('ny')
      }
    } catch (error) {
      console.error('Feil ved søk etter eksisterende kunder:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch() {
    if (!searchTerm.trim()) return
    
    setLoading(true)
    try {
      const { data } = await supabase
        .from('customer')
        .select('id, navn, kunde_nummer, organisasjonsnummer')
        .or('skjult.is.null,skjult.eq.false')
        .ilike('navn', `%${searchTerm}%`)
        .limit(20)
      
      setEksisterendeKunder(data || [])
    } catch (error) {
      console.error('Feil ved søk:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    if (!kundenummer.trim()) {
      alert('Kundenummer er påkrevd for Dropbox-synkronisering')
      return
    }
    
    onConfirm({
      kundenummer: kundenummer.trim(),
      eksisterendeKundeId: valgtKunde?.id || null,
      opprettKunde: modus === 'ny' || !valgtKunde
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-200 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Godkjenn tilbud</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {kundeNavn} - {anleggNavn}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-gray-500 dark:text-gray-400">Sjekker eksisterende kunder...</span>
            </div>
          ) : (
            <>
              {/* Modus-valg */}
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-dark-100 rounded-lg">
                <button
                  onClick={() => setModus('velg')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    modus === 'velg'
                      ? 'bg-white dark:bg-dark-200 text-primary shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Bruk eksisterende kunde
                </button>
                <button
                  onClick={() => {
                    setModus('ny')
                    setValgtKunde(null)
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    modus === 'ny'
                      ? 'bg-white dark:bg-dark-200 text-primary shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Opprett ny kunde
                </button>
              </div>

              {modus === 'velg' ? (
                <>
                  {/* Søk etter kunde */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Søk etter eksisterende kunde
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          placeholder="Søk på kundenavn..."
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-dark-50 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                        />
                      </div>
                      <button
                        onClick={handleSearch}
                        className="btn-secondary px-4"
                      >
                        Søk
                      </button>
                    </div>
                  </div>

                  {/* Kundeliste */}
                  {eksisterendeKunder.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {eksisterendeKunder.length} kunde(r) funnet
                      </p>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {eksisterendeKunder.map((kunde) => (
                          <button
                            key={kunde.id}
                            onClick={() => {
                              setValgtKunde(kunde)
                              if (kunde.kunde_nummer) {
                                setKundenummer(kunde.kunde_nummer)
                              }
                            }}
                            className={`w-full text-left p-4 rounded-lg border transition-colors ${
                              valgtKunde?.id === kunde.id
                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-gray-200 dark:border-dark-50 hover:border-gray-300 dark:hover:border-dark-100 bg-gray-50 dark:bg-dark-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Building className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{kunde.navn}</p>
                                  <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    {kunde.kunde_nummer && (
                                      <span>Kundenr: {kunde.kunde_nummer}</span>
                                    )}
                                    {kunde.organisasjonsnummer && (
                                      <span>Org.nr: {kunde.organisasjonsnummer}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {valgtKunde?.id === kunde.id && (
                                <Check className="w-5 h-5 text-primary" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Ingen eksisterende kunder funnet</p>
                      <button
                        onClick={() => setModus('ny')}
                        className="mt-2 text-primary hover:underline"
                      >
                        Opprett ny kunde
                      </button>
                    </div>
                  )}

                  {/* Valgt kunde info */}
                  {valgtKunde && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-300">
                            Valgt kunde: {valgtKunde.navn}
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            Nytt anlegg "{anleggNavn}" vil bli opprettet under denne kunden
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Ny kunde modus */
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-300">
                        Ny kunde vil bli opprettet
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                        Kunde: {kundeNavn}<br />
                        Anlegg: {anleggNavn}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Kundenummer input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kundenummer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={kundenummer}
                  onChange={(e) => setKundenummer(e.target.value)}
                  placeholder="F.eks. 1234"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-dark-50 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary text-lg"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Kundenummeret brukes for å opprette riktig mappestruktur i Dropbox
                </p>
              </div>

              {/* Oppsummering */}
              <div className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Hva som vil skje:</h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {modus === 'ny' || !valgtKunde ? (
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Ny kunde "{kundeNavn}" opprettes
                    </li>
                  ) : (
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-blue-500" />
                      Bruker eksisterende kunde "{valgtKunde.navn}"
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Nytt anlegg "{anleggNavn}" opprettes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    PDF lagres på anlegget
                  </li>
                  {kundenummer && (
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Dropbox-mapper opprettes under "{kundenummer}_{modus === 'ny' || !valgtKunde ? kundeNavn : valgtKunde.navn}"
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-dark-100">
          <button
            onClick={onCancel}
            className="btn-secondary"
          >
            Avbryt
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !kundenummer.trim()}
            className="btn-primary flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Godkjenn tilbud
          </button>
        </div>
      </div>
    </div>
  )
}
