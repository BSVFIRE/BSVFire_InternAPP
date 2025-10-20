import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Building, ExternalLink, Loader2 } from 'lucide-react'
import { 
  searchCompaniesByName, 
  getCompanyByOrgNumber, 
  formatOrgNumber, 
  extractAddress, 
  type BrregEnhet 
} from '@/lib/brregApi'

interface Kunde {
  id: string
  navn: string
  organisasjonsnummer: string | null
}

interface Anlegg {
  id: string
  navn: string
  kundenr: string
}

interface CustomerSectionProps {
  formData: any
  setFormData: (data: any) => void
}

export function CustomerSection({ formData, setFormData }: CustomerSectionProps) {
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  
  // Customer search
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [showCustomerResults, setShowCustomerResults] = useState(false)
  const customerResultsRef = useRef<HTMLDivElement>(null)
  
  // Brønnøysund search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BrregEnhet[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [orgNumberLookup, setOrgNumberLookup] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadKunder()
  }, [])

  useEffect(() => {
    if (formData.kunde_id) {
      loadAnlegg(formData.kunde_id)
    } else {
      setAnlegg([])
    }
  }, [formData.kunde_id])

  async function loadKunder() {
    try {
      const { data, error } = await supabase
        .from('customer')
        .select('id, navn, organisasjonsnummer')
        .order('navn', { ascending: true })

      if (error) throw error
      setKunder(data || [])
    } catch (error) {
      console.error('Feil ved lasting av kunder:', error)
    }
  }

  async function loadAnlegg(kundeId: string) {
    try {
      const { data, error } = await supabase
        .from('anlegg')
        .select('id, navn, kundenr')
        .eq('kundenr', kundeId)
        .order('navn', { ascending: true })

      if (error) throw error
      setAnlegg(data || [])
    } catch (error) {
      console.error('Feil ved lasting av anlegg:', error)
    }
  }

  // Brønnøysund search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchCompaniesByName(searchQuery, 10)
        setSearchResults(results)
        setShowResults(true)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
      if (customerResultsRef.current && !customerResultsRef.current.contains(event.target as Node)) {
        setShowCustomerResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleOrgNumberLookup() {
    if (!orgNumberLookup.trim()) return

    setLookingUp(true)
    try {
      const company = await getCompanyByOrgNumber(orgNumberLookup)
      if (company) {
        fillFormFromCompany(company)
      } else {
        alert('Fant ikke bedrift med dette organisasjonsnummeret')
      }
    } catch (error) {
      console.error('Lookup error:', error)
      alert('Kunne ikke hente bedriftsinformasjon')
    } finally {
      setLookingUp(false)
    }
  }

  function fillFormFromCompany(company: BrregEnhet) {
    setFormData({
      ...formData,
      kunde_navn: company.navn,
      kunde_organisasjonsnummer: formatOrgNumber(company.organisasjonsnummer),
    })
    setSearchQuery('')
    setOrgNumberLookup('')
    setShowResults(false)
  }

  function selectCustomer(kunde: Kunde) {
    setFormData({
      ...formData,
      kunde_id: kunde.id,
      kunde_navn: kunde.navn,
      kunde_organisasjonsnummer: kunde.organisasjonsnummer || '',
      anlegg_id: '',
      anlegg_navn: ''
    })
    setCustomerSearchQuery(kunde.navn)
    setShowCustomerResults(false)
  }

  const filteredKunder = kunder.filter(k => 
    k.navn.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    (k.organisasjonsnummer && k.organisasjonsnummer.includes(customerSearchQuery))
  )

  return (
    <>
      {/* Existing customer selection with search */}
      <div className="relative" ref={customerResultsRef}>
        <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
          Velg eksisterende kunde
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            value={customerSearchQuery}
            onChange={(e) => {
              setCustomerSearchQuery(e.target.value)
              setShowCustomerResults(true)
            }}
            onFocus={() => setShowCustomerResults(true)}
            className="input pl-10"
            placeholder="Søk etter kunde..."
          />
        </div>

        {showCustomerResults && filteredKunder.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-white dark:bg-dark-200 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
            {filteredKunder.slice(0, 50).map((kunde) => (
              <button
                key={kunde.id}
                type="button"
                onClick={() => selectCustomer(kunde)}
                className="w-full text-left px-4 py-3 hover:bg-primary/10 border-b border-gray-200 dark:border-gray-800 last:border-b-0 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{kunde.navn}</p>
                    {kunde.organisasjonsnummer && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Org.nr: {kunde.organisasjonsnummer}
                      </p>
                    )}
                  </div>
                  <Building className="w-5 h-5 text-primary flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}

        {showCustomerResults && filteredKunder.length === 0 && customerSearchQuery.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-white dark:bg-dark-200 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center">Ingen kunder funnet</p>
          </div>
        )}
      </div>

      {/* Brønnøysund Search */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Søk i Brønnøysundregistrene</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Søk etter bedrift eller organisasjonsnummer for å legge til ny kunde
        </p>

        <div className="relative" ref={resultsRef}>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
            Søk etter bedriftsnavn
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 pr-10"
              placeholder="Skriv inn bedriftsnavn..."
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
            )}
          </div>

          {showResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-dark-200 border border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
              {searchResults.map((company) => {
                const address = extractAddress(company)
                return (
                  <button
                    key={company.organisasjonsnummer}
                    type="button"
                    onClick={() => fillFormFromCompany(company)}
                    className="w-full text-left px-4 py-3 hover:bg-primary/10 border-b border-gray-200 dark:border-gray-800 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{company.navn}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Org.nr: {formatOrgNumber(company.organisasjonsnummer)}
                        </p>
                        {address.poststed && (
                          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                            {address.postnummer} {address.poststed}
                          </p>
                        )}
                      </div>
                      <Building className="w-5 h-5 text-primary flex-shrink-0" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {showResults && searchResults.length === 0 && !searching && searchQuery.length >= 2 && (
            <div className="absolute z-10 w-full mt-2 bg-dark-200 border border-gray-700 rounded-lg shadow-xl p-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center">Ingen bedrifter funnet</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Eller søk med organisasjonsnummer
            </label>
            <input
              type="text"
              value={orgNumberLookup}
              onChange={(e) => setOrgNumberLookup(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleOrgNumberLookup())}
              className="input"
              placeholder="123 456 789"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleOrgNumberLookup}
              disabled={lookingUp || !orgNumberLookup.trim()}
              className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {lookingUp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Søker...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Søk
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Manual customer input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
            Kundenavn <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.kunde_navn}
            onChange={(e) => setFormData({ ...formData, kunde_navn: e.target.value })}
            className="input"
            placeholder="Bedriftsnavn AS"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
            Organisasjonsnummer
          </label>
          <input
            type="text"
            value={formData.kunde_organisasjonsnummer}
            onChange={(e) => setFormData({ ...formData, kunde_organisasjonsnummer: e.target.value })}
            className="input"
            placeholder="123 456 789"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
            Lokasjon
          </label>
          <input
            type="text"
            value={formData.lokasjon || ''}
            onChange={(e) => setFormData({ ...formData, lokasjon: e.target.value })}
            className="input"
            placeholder="F.eks. Oslo, Avdeling Nord, etc."
          />
        </div>
      </div>

      {/* Anlegg selection */}
      {formData.kunde_id && anlegg.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
            Velg anlegg (valgfritt)
          </label>
          <select
            value={formData.anlegg_id}
            onChange={(e) => {
              const selectedAnlegg = anlegg.find(a => a.id === e.target.value)
              setFormData({
                ...formData,
                anlegg_id: e.target.value,
                anlegg_navn: selectedAnlegg?.navn || ''
              })
            }}
            className="input"
          >
            <option value="">Ingen anlegg valgt</option>
            {anlegg.map((a) => (
              <option key={a.id} value={a.id}>
                {a.navn}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  )
}
