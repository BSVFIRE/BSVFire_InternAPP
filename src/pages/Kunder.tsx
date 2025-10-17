import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Building, Mail, Phone, Edit, Trash2, Eye, ExternalLink, Loader2, DollarSign } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { searchCompaniesByName, getCompanyByOrgNumber, formatOrgNumber, extractAddress, type BrregEnhet } from '@/lib/brregApi'

interface Kunde {
  id: string
  navn: string
  type: string | null
  organisasjonsnummer: string | null
  kontaktperson_id: string | null
  opprettet: string
  sist_oppdatert: string | null
  kunde_nummer: string | null
}

type SortOption = 'navn_asc' | 'navn_desc' | 'opprettet_nyeste' | 'opprettet_eldste'

export function Kunder() {
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedKunde, setSelectedKunde] = useState<Kunde | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'view'>('list')
  const [sortBy, setSortBy] = useState<SortOption>('navn_asc')

  useEffect(() => {
    loadKunder()
  }, [])

  async function loadKunder() {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('customer')
        .select('*')
        .order('navn', { ascending: true })

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message)
      }
      
      setKunder(data || [])
    } catch (err) {
      console.error('Feil ved lasting av kunder:', err)
      setError(err instanceof Error ? err.message : 'Kunne ikke laste kunder')
    } finally {
      setLoading(false)
    }
  }

  async function deleteKunde(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne kunden?')) return

    try {
      const { error } = await supabase
        .from('customer')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadKunder()
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette kunde')
    }
  }

  const filteredKunder = kunder.filter(kunde =>
    kunde.navn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kunde.organisasjonsnummer?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sortering
  const sortedKunder = [...filteredKunder].sort((a, b) => {
    switch (sortBy) {
      case 'navn_asc':
        return a.navn.localeCompare(b.navn, 'nb-NO')
      case 'navn_desc':
        return b.navn.localeCompare(a.navn, 'nb-NO')
      case 'opprettet_nyeste':
        return new Date(b.opprettet).getTime() - new Date(a.opprettet).getTime()
      case 'opprettet_eldste':
        return new Date(a.opprettet).getTime() - new Date(b.opprettet).getTime()
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Laster kunder...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Kunder</h1>
          <p className="text-gray-500 dark:text-gray-400">Administrer kunderegisteret</p>
        </div>
        <div className="card bg-red-900/20 border-red-800">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Building className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">Kunne ikke laste kunder</h3>
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <button onClick={loadKunder} className="btn-primary text-sm">
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
      <KundeForm
        kunde={selectedKunde}
        onSave={async () => {
          await loadKunder()
          setViewMode('list')
          setSelectedKunde(null)
        }}
        onCancel={() => {
          setViewMode('list')
          setSelectedKunde(null)
        }}
      />
    )
  }

  if (viewMode === 'view' && selectedKunde) {
    return (
      <KundeDetails
        kunde={selectedKunde}
        onEdit={() => setViewMode('edit')}
        onClose={() => {
          setViewMode('list')
          setSelectedKunde(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Kunder</h1>
          <p className="text-gray-500 dark:text-gray-400">Administrer kunderegisteret</p>
        </div>
        <button
          onClick={() => {
            setSelectedKunde(null)
            setViewMode('create')
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Ny kunde
        </button>
      </div>

      {/* Search and Sort */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter kunde eller org.nr..."
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
              <option value="opprettet_nyeste">Nyeste først</option>
              <option value="opprettet_eldste">Eldste først</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Building className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Totalt kunder</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{kunder.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Building className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Med kontaktperson</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {kunder.filter(k => k.kontaktperson_id).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Building className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Med org.nr</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {kunder.filter(k => k.organisasjonsnummer).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Kunde Liste */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Kundeliste
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-normal">
              ({sortedKunder.length} {sortedKunder.length === 1 ? 'kunde' : 'kunder'})
            </span>
          </h2>
        </div>
        
        {sortedKunder.length === 0 ? (
          <div className="text-center py-12">
            <Building className="w-12 h-12 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Ingen kunder funnet' : 'Ingen kunder registrert ennå'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Navn</th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Org.nr</th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Kontaktperson</th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Opprettet</th>
                  <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {sortedKunder.map((kunde) => (
                  <tr
                    key={kunde.id}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">{kunde.navn}</p>
                          {kunde.organisasjonsnummer && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Org.nr: {kunde.organisasjonsnummer}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300">
                      {kunde.organisasjonsnummer || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300">
                      {kunde.kontaktperson_id ? 'Ja' : '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-300 text-sm">
                      {formatDate(kunde.opprettet)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedKunde(kunde)
                            setViewMode('view')
                          }}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Vis detaljer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedKunde(kunde)
                            setViewMode('edit')
                          }}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Rediger"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteKunde(kunde.id)}
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

// Kunde Form Component
interface KundeFormProps {
  kunde: Kunde | null
  onSave: () => void
  onCancel: () => void
}

function KundeForm({ kunde, onSave, onCancel }: KundeFormProps) {
  const [formData, setFormData] = useState({
    navn: kunde?.navn || '',
    organisasjonsnummer: kunde?.organisasjonsnummer || '',
    kontaktperson_id: kunde?.kontaktperson_id || '',
  })
  const [kontaktpersoner, setKontaktpersoner] = useState<any[]>([])
  const [kontaktpersonSearch, setKontaktpersonSearch] = useState('')
  const [showKontaktpersonForm, setShowKontaktpersonForm] = useState(false)
  const [newKontaktperson, setNewKontaktperson] = useState({ navn: '', epost: '', telefon: '' })
  const [savingKontaktperson, setSavingKontaktperson] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BrregEnhet[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [orgNumberLookup, setOrgNumberLookup] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const resultsRef = useRef<HTMLDivElement>(null)

  // Last kontaktpersoner
  useEffect(() => {
    loadKontaktpersoner()
  }, [])

  async function loadKontaktpersoner() {
    try {
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .select('id, navn, epost, telefon')
        .order('navn', { ascending: true })

      if (error) throw error
      setKontaktpersoner(data || [])
    } catch (error) {
      console.error('Feil ved lasting av kontaktpersoner:', error)
    }
  }

  async function handleCreateKontaktperson() {
    if (!newKontaktperson.navn.trim()) {
      alert('Navn er påkrevd')
      return
    }

    setSavingKontaktperson(true)
    try {
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .insert([{
          navn: newKontaktperson.navn,
          epost: newKontaktperson.epost || null,
          telefon: newKontaktperson.telefon || null
        }])
        .select()
        .single()

      if (error) throw error

      // Oppdater listen og velg den nye kontaktpersonen
      await loadKontaktpersoner()
      setFormData({ ...formData, kontaktperson_id: data.id })
      setShowKontaktpersonForm(false)
      setNewKontaktperson({ navn: '', epost: '', telefon: '' })
    } catch (error) {
      console.error('Feil ved opprettelse av kontaktperson:', error)
      alert('Kunne ikke opprette kontaktperson')
    } finally {
      setSavingKontaktperson(false)
    }
  }

  const filteredKontaktpersoner = kontaktpersoner.filter(kp =>
    kp.navn.toLowerCase().includes(kontaktpersonSearch.toLowerCase()) ||
    kp.epost?.toLowerCase().includes(kontaktpersonSearch.toLowerCase())
  )

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search companies by name with debounce
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
      navn: company.navn,
      organisasjonsnummer: formatOrgNumber(company.organisasjonsnummer),
      kontaktperson_id: formData.kontaktperson_id, // Keep existing contact
    })
    setSearchQuery('')
    setOrgNumberLookup('')
    setShowResults(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      if (kunde) {
        // Update
        const { error } = await supabase
          .from('customer')
          .update({
            ...formData,
            sist_oppdatert: new Date().toISOString(),
          })
          .eq('id', kunde.id)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('customer')
          .insert([formData])

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre kunde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {kunde ? 'Rediger kunde' : 'Ny kunde'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {kunde ? 'Oppdater kundeinformasjon' : 'Registrer ny kunde'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Brønnøysund Register Search */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Søk i Brønnøysundregistrene</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Søk etter bedrift eller organisasjonsnummer for å automatisk fylle ut kundeinformasjon
          </p>

          {/* Search by name */}
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

            {/* Search Results Dropdown */}
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

          {/* Search by org number */}
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

        {/* Manual Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Kundenavn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.navn}
              onChange={(e) => setFormData({ ...formData, navn: e.target.value })}
              className="input"
              placeholder="Bedriftsnavn AS"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Organisasjonsnummer
            </label>
            <input
              type="text"
              value={formData.organisasjonsnummer}
              onChange={(e) => setFormData({ ...formData, organisasjonsnummer: e.target.value })}
              className="input"
              placeholder="123 456 789"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Kontaktperson
            </label>
            
            {!showKontaktpersonForm ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Søk etter kontaktperson..."
                  value={kontaktpersonSearch}
                  onChange={(e) => setKontaktpersonSearch(e.target.value)}
                  className="input"
                />
                <select
                  value={formData.kontaktperson_id}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      kontaktperson_id: e.target.value
                    })
                  }}
                  className="input"
                  size={5}
                >
                  <option value="">Ingen valgt</option>
                  {filteredKontaktpersoner.map((kp) => (
                    <option key={kp.id} value={kp.id}>
                      {kp.navn} {kp.epost ? `(${kp.epost})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowKontaktpersonForm(true)}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Opprett ny kontaktperson
                </button>
              </div>
            ) : (
              <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white">Ny kontaktperson</h3>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Navn *</label>
                  <input
                    type="text"
                    value={newKontaktperson.navn}
                    onChange={(e) => setNewKontaktperson({ ...newKontaktperson, navn: e.target.value })}
                    className="input"
                    placeholder="Navn"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">E-post</label>
                  <input
                    type="email"
                    value={newKontaktperson.epost}
                    onChange={(e) => setNewKontaktperson({ ...newKontaktperson, epost: e.target.value })}
                    className="input"
                    placeholder="epost@eksempel.no"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={newKontaktperson.telefon}
                    onChange={(e) => setNewKontaktperson({ ...newKontaktperson, telefon: e.target.value })}
                    className="input"
                    placeholder="+47 123 45 678"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateKontaktperson}
                    disabled={savingKontaktperson}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {savingKontaktperson ? 'Oppretter...' : 'Opprett'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowKontaktpersonForm(false)
                      setNewKontaktperson({ navn: '', epost: '', telefon: '' })
                    }}
                    className="btn-secondary flex-1"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Lagrer...' : kunde ? 'Oppdater kunde' : 'Opprett kunde'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Avbryt
          </button>
        </div>
      </form>
    </div>
  )
}

// Kunde Details Component
interface KundeDetailsProps {
  kunde: Kunde
  onEdit: () => void
  onClose: () => void
}

function KundeDetails({ kunde, onEdit, onClose }: KundeDetailsProps) {
  const [priser, setPriser] = useState<any[]>([])
  const [anlegg, setAnlegg] = useState<any[]>([])
  const [loadingPriser, setLoadingPriser] = useState(true)
  const [kontaktperson, setKontaktperson] = useState<any>(null)

  useEffect(() => {
    loadServiceavtaler()
    loadKontaktperson()
  }, [kunde.id])

  async function loadKontaktperson() {
    if (!kunde.kontaktperson_id) return
    
    try {
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .select('*')
        .eq('id', kunde.kontaktperson_id)
        .single()

      if (error) throw error
      setKontaktperson(data)
    } catch (error) {
      console.error('Feil ved lasting av kontaktperson:', error)
    }
  }

  async function loadServiceavtaler() {
    try {
      // Hent alle anlegg for denne kunden
      const { data: anleggData, error: anleggError } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn')
        .eq('kundenr', kunde.id)

      if (anleggError) throw anleggError

      setAnlegg(anleggData || [])

      // Hent priser for disse anleggene
      if (anleggData && anleggData.length > 0) {
        const anleggIds = anleggData.map(a => a.id)
        const { data: priserData, error: priserError } = await supabase
          .from('priser_kundenummer')
          .select('*')
          .in('anlegg_id', anleggIds)

        if (priserError) throw priserError
        setPriser(priserData || [])
      }
    } catch (error) {
      console.error('Feil ved lasting av serviceavtaler:', error)
    } finally {
      setLoadingPriser(false)
    }
  }

  // Beregn totalsummer
  const totalBrannalarm = priser.reduce((sum, p) => sum + (p.prisbrannalarm || 0), 0)
  const totalNodlys = priser.reduce((sum, p) => sum + (p.prisnodlys || 0), 0)
  const totalEkstern = priser.reduce((sum, p) => sum + (p.prisekstern || 0), 0)
  const totalSlukkeutstyr = priser.reduce((sum, p) => sum + (p.prisslukkeutstyr || 0), 0)
  const totalRoykluker = priser.reduce((sum, p) => sum + (p.prisroykluker || 0), 0)
  const totalSum = totalBrannalarm + totalNodlys + totalEkstern + totalSlukkeutstyr + totalRoykluker

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{kunde.navn}</h1>
          <p className="text-gray-500 dark:text-gray-400">Kundedetaljer</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onEdit} className="btn-primary flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Rediger
          </button>
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
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Organisasjonsnummer</p>
                <p className="text-gray-900 dark:text-white">{kunde.organisasjonsnummer || '-'}</p>
              </div>
              {kontaktperson && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Kontaktperson</p>
                  <p className="text-gray-900 dark:text-white font-medium">{kontaktperson.navn}</p>
                  {kontaktperson.telefon && (
                    <div className="flex items-center gap-2 mt-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">{kontaktperson.telefon}</p>
                    </div>
                  )}
                  {kontaktperson.epost && (
                    <div className="flex items-center gap-2 mt-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">{kontaktperson.epost}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="space-y-6">
          {/* Serviceavtaler */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Serviceavtaler</h2>
            </div>
            {loadingPriser ? (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
              </div>
            ) : anlegg.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Ingen anlegg registrert</p>
            ) : priser.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Ingen priser registrert</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {totalBrannalarm > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Brannalarm</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {totalBrannalarm.toLocaleString('nb-NO')} kr
                      </span>
                    </div>
                  )}
                  {totalNodlys > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Nødlys</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {totalNodlys.toLocaleString('nb-NO')} kr
                      </span>
                    </div>
                  )}
                  {totalEkstern > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Ekstern</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {totalEkstern.toLocaleString('nb-NO')} kr
                      </span>
                    </div>
                  )}
                  {totalSlukkeutstyr > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Slukkeutstyr</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {totalSlukkeutstyr.toLocaleString('nb-NO')} kr
                      </span>
                    </div>
                  )}
                  {totalRoykluker > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Røykluker</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {totalRoykluker.toLocaleString('nb-NO')} kr
                      </span>
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="text-lg font-bold text-primary">
                      {totalSum.toLocaleString('nb-NO')} kr
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {anlegg.length} {anlegg.length === 1 ? 'anlegg' : 'anlegg'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Metadata</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Opprettet</p>
                <p className="text-gray-900 dark:text-white text-sm">{formatDate(kunde.opprettet)}</p>
              </div>
              {kunde.sist_oppdatert && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sist oppdatert</p>
                  <p className="text-gray-900 dark:text-white text-sm">{formatDate(kunde.sist_oppdatert)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
