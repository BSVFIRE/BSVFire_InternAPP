import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Building, Mail, Phone, MapPin, Edit, Trash2, Eye, ExternalLink, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { searchCompaniesByName, getCompanyByOrgNumber, formatOrgNumber, extractAddress, type BrregEnhet } from '@/lib/brregApi'

interface Kunde {
  id: string
  navn: string
  organisasjonsnummer: string | null
  adresse: string | null
  postnummer: string | null
  poststed: string | null
  telefon: string | null
  epost: string | null
  opprettet_dato: string
  sist_oppdatert: string | null
}

type SortOption = 'navn_asc' | 'navn_desc' | 'opprettet_nyeste' | 'opprettet_eldste' | 'poststed'

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
    kunde.organisasjonsnummer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kunde.poststed?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sortering
  const sortedKunder = [...filteredKunder].sort((a, b) => {
    switch (sortBy) {
      case 'navn_asc':
        return a.navn.localeCompare(b.navn, 'nb-NO')
      case 'navn_desc':
        return b.navn.localeCompare(a.navn, 'nb-NO')
      case 'opprettet_nyeste':
        return new Date(b.opprettet_dato).getTime() - new Date(a.opprettet_dato).getTime()
      case 'opprettet_eldste':
        return new Date(a.opprettet_dato).getTime() - new Date(b.opprettet_dato).getTime()
      case 'poststed':
        return (a.poststed || '').localeCompare(b.poststed || '', 'nb-NO')
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Laster kunder...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Kunder</h1>
          <p className="text-gray-400">Administrer kunderegisteret</p>
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
          <h1 className="text-3xl font-bold text-white mb-2">Kunder</h1>
          <p className="text-gray-400">Administrer kunderegisteret</p>
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter kunde, org.nr eller poststed..."
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
              <option value="poststed">Poststed</option>
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
              <p className="text-gray-400 text-sm">Totalt kunder</p>
              <p className="text-2xl font-bold text-white">{kunder.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Mail className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Med e-post</p>
              <p className="text-2xl font-bold text-white">
                {kunder.filter(k => k.epost).length}
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
              <p className="text-gray-400 text-sm">Med telefon</p>
              <p className="text-2xl font-bold text-white">
                {kunder.filter(k => k.telefon).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Kunde Liste */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">
            Kundeliste
            <span className="ml-2 text-sm text-gray-400 font-normal">
              ({sortedKunder.length} {sortedKunder.length === 1 ? 'kunde' : 'kunder'})
            </span>
          </h2>
        </div>
        
        {sortedKunder.length === 0 ? (
          <div className="text-center py-12">
            <Building className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchTerm ? 'Ingen kunder funnet' : 'Ingen kunder registrert ennå'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Navn</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Org.nr</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Sted</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Kontakt</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Opprettet</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {sortedKunder.map((kunde) => (
                  <tr
                    key={kunde.id}
                    className="border-b border-gray-800 hover:bg-dark-100 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{kunde.navn}</p>
                          {kunde.adresse && (
                            <p className="text-sm text-gray-400">{kunde.adresse}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {kunde.organisasjonsnummer || '-'}
                    </td>
                    <td className="py-3 px-4">
                      {kunde.poststed ? (
                        <div className="flex items-center gap-2 text-gray-300">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          {kunde.postnummer} {kunde.poststed}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {kunde.telefon && (
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <Phone className="w-3 h-3 text-gray-500" />
                            {kunde.telefon}
                          </div>
                        )}
                        {kunde.epost && (
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <Mail className="w-3 h-3 text-gray-500" />
                            {kunde.epost}
                          </div>
                        )}
                        {!kunde.telefon && !kunde.epost && (
                          <span className="text-gray-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-sm">
                      {formatDate(kunde.opprettet_dato)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedKunde(kunde)
                            setViewMode('view')
                          }}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Vis detaljer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedKunde(kunde)
                            setViewMode('edit')
                          }}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Rediger"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteKunde(kunde.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
    adresse: kunde?.adresse || '',
    postnummer: kunde?.postnummer || '',
    poststed: kunde?.poststed || '',
    telefon: kunde?.telefon || '',
    epost: kunde?.epost || '',
  })
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BrregEnhet[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [orgNumberLookup, setOrgNumberLookup] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const resultsRef = useRef<HTMLDivElement>(null)

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
    const address = extractAddress(company)
    setFormData({
      navn: company.navn,
      organisasjonsnummer: formatOrgNumber(company.organisasjonsnummer),
      adresse: address.adresse,
      postnummer: address.postnummer,
      poststed: address.poststed,
      telefon: formData.telefon, // Keep existing phone
      epost: formData.epost, // Keep existing email
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
          <h1 className="text-3xl font-bold text-white mb-2">
            {kunde ? 'Rediger kunde' : 'Ny kunde'}
          </h1>
          <p className="text-gray-400">
            {kunde ? 'Oppdater kundeinformasjon' : 'Registrer ny kunde'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Brønnøysund Register Search */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-white">Søk i Brønnøysundregistrene</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Søk etter bedrift eller organisasjonsnummer for å automatisk fylle ut kundeinformasjon
          </p>

          {/* Search by name */}
          <div className="relative" ref={resultsRef}>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Søk etter bedriftsnavn
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                      className="w-full text-left px-4 py-3 hover:bg-primary/10 border-b border-gray-800 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{company.navn}</p>
                          <p className="text-sm text-gray-400 mt-1">
                            Org.nr: {formatOrgNumber(company.organisasjonsnummer)}
                          </p>
                          {address.poststed && (
                            <p className="text-sm text-gray-500 mt-1">
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
                <p className="text-gray-400 text-sm text-center">Ingen bedrifter funnet</p>
              </div>
            )}
          </div>

          {/* Search by org number */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
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

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Telefon
            </label>
            <input
              type="tel"
              value={formData.telefon}
              onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
              className="input"
              placeholder="+47 123 45 678"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              E-post
            </label>
            <input
              type="email"
              value={formData.epost}
              onChange={(e) => setFormData({ ...formData, epost: e.target.value })}
              className="input"
              placeholder="post@bedrift.no"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Adresse
            </label>
            <input
              type="text"
              value={formData.adresse}
              onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
              className="input"
              placeholder="Gateadresse 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Postnummer
            </label>
            <input
              type="text"
              value={formData.postnummer}
              onChange={(e) => setFormData({ ...formData, postnummer: e.target.value })}
              className="input"
              placeholder="0123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Poststed
            </label>
            <input
              type="text"
              value={formData.poststed}
              onChange={(e) => setFormData({ ...formData, poststed: e.target.value })}
              className="input"
              placeholder="Oslo"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{kunde.navn}</h1>
          <p className="text-gray-400">Kundedetaljer</p>
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
            <h2 className="text-xl font-bold text-white mb-4">Kontaktinformasjon</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Organisasjonsnummer</p>
                <p className="text-white">{kunde.organisasjonsnummer || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Telefon</p>
                <p className="text-white">{kunde.telefon || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">E-post</p>
                <p className="text-white">{kunde.epost || '-'}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Adresse</h2>
            <div className="space-y-2">
              <p className="text-white">{kunde.adresse || '-'}</p>
              {kunde.postnummer && kunde.poststed && (
                <p className="text-white">{kunde.postnummer} {kunde.poststed}</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Metadata</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400 mb-1">Opprettet</p>
                <p className="text-white text-sm">{formatDate(kunde.opprettet_dato)}</p>
              </div>
              {kunde.sist_oppdatert && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Sist oppdatert</p>
                  <p className="text-white text-sm">{formatDate(kunde.sist_oppdatert)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
