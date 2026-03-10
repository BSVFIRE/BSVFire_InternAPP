import { useState } from 'react'
import {
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronDown,
  Filter,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  User,
  Briefcase,
  DollarSign,
  FileText,
  ExternalLink,
  Plus,
} from 'lucide-react'

interface ProffCompanyData {
  organisationNumber: string
  name: string
  companyType: string
  companyTypeName: string
  registrationDate: string
  foundationDate?: string
  numberOfEmployees?: number
  email?: string
  homePage?: string
  phoneNumbers?: {
    telephoneNumber?: string
    mobilePhone?: string
    faxNumber?: string
  }
  visitorAddress?: {
    addressLine?: string
    zipCode?: string
    postPlace?: string
  }
  postalAddress?: {
    addressLine?: string
    zipCode?: string
    postPlace?: string
  }
  location?: {
    municipality?: string
    county?: string
    countryPart?: string
  }
  personRoles?: Array<{
    name: string
    title: string
    titleCode: string
    birthDate?: string
    postalAddress?: {
      addressLine?: string
      zipCode?: string
      postPlace?: string
    }
  }>
  companyAccounts?: Array<{
    year: string
    period: string
    accounts: Array<{
      code: string
      amount: string
    }>
  }>
  announcements?: Array<{
    id: string
    date: string
    text: string
    type: string
  }>
}


type SortField = 'name' | 'municipality' | 'employees' | 'revenue' | 'result'
type SortDirection = 'asc' | 'desc'

interface ProffSokProps {
  onAddLead?: (company: ProffCompanyData) => void
}

export function ProffSok({ onAddLead }: ProffSokProps = {}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [municipalityFilter, setMunicipalityFilter] = useState('')
  const [companyTypeFilter, setCompanyTypeFilter] = useState<string[]>(['ESEK', 'BRL', 'SAM'])
  const [results, setResults] = useState<ProffCompanyData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [activeSection, setActiveSection] = useState<string>('info')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  async function searchProff() {
    if (!searchQuery && !municipalityFilter) {
      setError('Fyll inn søkeord eller velg kommune')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('endpoint', 'search')
      if (searchQuery) params.append('q', searchQuery)
      if (municipalityFilter) params.append('location', municipalityFilter)
      if (companyTypeFilter.length > 0) params.append('companyType', companyTypeFilter.join(','))
      params.append('pageSize', '50')

      const response = await fetch(`${supabaseUrl}/functions/v1/proff-proxy?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Søk feilet')
      }

      const data = await response.json()
      setResults(data.companies || [])
    } catch (err: any) {
      setError(err.message || 'Feil ved søk')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchCompanyDetails(orgnr: string) {
    try {
      const params = new URLSearchParams()
      params.append('endpoint', 'company')
      params.append('orgnr', orgnr)

      const response = await fetch(`${supabaseUrl}/functions/v1/proff-proxy?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Kunne ikke hente detaljer')
      }

      const data = await response.json()
      
      // Oppdater resultatet med full data
      setResults(prev => prev.map(c => 
        c.organisationNumber === orgnr ? { ...c, ...data } : c
      ))
    } catch (err) {
      console.error('Feil ved henting av detaljer:', err)
    }
  }

  function toggleExpand(orgnr: string) {
    if (expandedCompany === orgnr) {
      setExpandedCompany(null)
    } else {
      setExpandedCompany(orgnr)
      // Hent full data hvis ikke allerede hentet
      const company = results.find(c => c.organisationNumber === orgnr)
      if (company && !company.personRoles) {
        fetchCompanyDetails(orgnr)
      }
    }
  }

  function getAccountValue(accounts: Array<{code: string, amount: string}> | undefined, code: string): number | null {
    if (!accounts) return null
    const account = accounts.find(a => a.code === code)
    return account ? parseInt(account.amount) : null
  }

  function formatAmount(amount: number | null): string {
    if (amount === null) return '-'
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)} mill`
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)} k`
    return amount.toString()
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  function toggleCompanyType(type: string) {
    setCompanyTypeFilter(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const sortedResults = [...results].sort((a, b) => {
    let aVal: any, bVal: any

    switch (sortField) {
      case 'name':
        aVal = a.name || ''
        bVal = b.name || ''
        break
      case 'municipality':
        aVal = a.location?.municipality || ''
        bVal = b.location?.municipality || ''
        break
      case 'employees':
        aVal = a.numberOfEmployees || 0
        bVal = b.numberOfEmployees || 0
        break
      case 'revenue':
        aVal = getAccountValue(a.companyAccounts?.[0]?.accounts, 'SDI') || 0
        bVal = getAccountValue(b.companyAccounts?.[0]?.accounts, 'SDI') || 0
        break
      case 'result':
        aVal = getAccountValue(a.companyAccounts?.[0]?.accounts, 'OR') || 0
        bVal = getAccountValue(b.companyAccounts?.[0]?.accounts, 'OR') || 0
        break
      default:
        return 0
    }

    if (typeof aVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal)
    }
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Proff Bedriftssøk
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Søk i Proff.no sin database med bedriftsinformasjon
        </p>
      </div>

      {/* Søkefelt */}
      <div className="bg-white dark:bg-dark-50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Søkefiltre</h2>
        </div>

        {/* Organisasjonsform */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Organisasjonsform
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { code: 'ESEK', label: 'Eierseksjonssameie' },
              { code: 'BRL', label: 'Borettslag' },
              { code: 'SAM', label: 'Sameie' },
              { code: 'AS', label: 'Aksjeselskap' },
            ].map(type => (
              <button
                key={type.code}
                onClick={() => toggleCompanyType(type.code)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  companyTypeFilter.includes(type.code)
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Søkeord (navn, org.nr)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchProff()}
                placeholder="Søk etter bedrift..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kommune
            </label>
            <select
              value={municipalityFilter}
              onChange={(e) => setMunicipalityFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
            >
              <option value="">Alle kommuner</option>
              <option value="Bergen">Bergen</option>
              <option value="Oslo">Oslo</option>
              <option value="Trondheim">Trondheim</option>
              <option value="Stavanger">Stavanger</option>
              <option value="Kristiansand">Kristiansand</option>
              <option value="Tromsø">Tromsø</option>
              <option value="Drammen">Drammen</option>
              <option value="Fredrikstad">Fredrikstad</option>
              <option value="Sandnes">Sandnes</option>
              <option value="Ålesund">Ålesund</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={searchProff}
            disabled={loading}
            className="px-6 py-2.5 bg-primary hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Søk i Proff
          </button>
        </div>
      </div>

      {/* Feilmelding */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Resultater */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-dark-50 rounded-xl border border-gray-200 dark:border-gray-800">
          {/* Sortering header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {results.length} resultater
            </h2>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sorter:</span>
              {[
                { field: 'name' as SortField, label: 'Navn' },
                { field: 'municipality' as SortField, label: 'Kommune' },
                { field: 'employees' as SortField, label: 'Ansatte' },
              ].map(sort => (
                <button
                  key={sort.field}
                  onClick={() => toggleSort(sort.field)}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                    sortField === sort.field
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {sort.label}
                  {sortField === sort.field && (
                    <ArrowUpDown className="w-3 h-3" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Liste */}
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {sortedResults.map((company, index) => {
              const isExpanded = expandedCompany === company.organisationNumber
              const latestAccounts = company.companyAccounts?.[0]?.accounts
              const revenue = getAccountValue(latestAccounts, 'SDI')
              const result = getAccountValue(latestAccounts, 'OR')

              return (
                <div key={`${company.organisationNumber}-${index}`} className="p-4">
                  {/* Hovedrad */}
                  <div
                    className="flex items-start justify-between gap-4 cursor-pointer"
                    onClick={() => toggleExpand(company.organisationNumber)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {company.name}
                        </h3>
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-400 rounded">
                          {company.companyTypeName || company.companyType}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400 ml-6">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {company.organisationNumber}
                        </span>
                        {company.location?.municipality && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {company.location.municipality}
                          </span>
                        )}
                        {company.numberOfEmployees !== undefined && company.numberOfEmployees > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {company.numberOfEmployees} ansatte
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nøkkeltall preview og handlinger */}
                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex items-center gap-6 text-sm">
                        {revenue !== null && (
                          <div className="text-right">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">Inntekter</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatAmount(revenue * 1000)}
                            </p>
                          </div>
                        )}
                        {result !== null && (
                          <div className="text-right">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">Resultat</p>
                            <p className={`font-medium flex items-center gap-1 ${
                              result >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {result >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {formatAmount(result * 1000)}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Legg til som lead-knapp */}
                      {onAddLead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onAddLead(company)
                          }}
                          className="px-3 py-1.5 bg-primary hover:bg-primary-600 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Legg til
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Utvidet visning */}
                  {isExpanded && (
                    <div className="mt-4 ml-6">
                      {/* Seksjon-tabs */}
                      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
                        {[
                          { id: 'info', label: 'Generelt', icon: Building2 },
                          { id: 'roles', label: 'Roller', icon: Users },
                          { id: 'accounts', label: 'Regnskap', icon: DollarSign },
                          { id: 'announcements', label: 'Kunngjøringer', icon: FileText },
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={(e) => { e.stopPropagation(); setActiveSection(tab.id) }}
                            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                              activeSection === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Seksjon: Generelt */}
                      {activeSection === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                              Kontaktinfo
                            </h4>
                            <div className="space-y-2 text-sm">
                              {company.phoneNumbers?.telephoneNumber && (
                                <a href={`tel:${company.phoneNumbers.telephoneNumber}`} className="flex items-center gap-2 text-primary hover:underline">
                                  <Phone className="w-4 h-4" />
                                  {company.phoneNumbers.telephoneNumber}
                                </a>
                              )}
                              {company.email && (
                                <a href={`mailto:${company.email}`} className="flex items-center gap-2 text-primary hover:underline">
                                  <Mail className="w-4 h-4" />
                                  {company.email}
                                </a>
                              )}
                              {company.homePage && (
                                <a href={company.homePage.startsWith('http') ? company.homePage : `https://${company.homePage}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                  <Globe className="w-4 h-4" />
                                  {company.homePage}
                                </a>
                              )}
                              {!company.phoneNumbers?.telephoneNumber && !company.email && !company.homePage && (
                                <p className="text-gray-400 italic">Ingen kontaktinfo registrert</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                              Adresse
                            </h4>
                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              {company.visitorAddress && (
                                <>
                                  <p>{company.visitorAddress.addressLine}</p>
                                  <p>{company.visitorAddress.zipCode} {company.visitorAddress.postPlace}</p>
                                </>
                              )}
                              {company.location && (
                                <p className="text-gray-500">{company.location.municipality}, {company.location.county}</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                              Registrering
                            </h4>
                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              <p className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Registrert: {company.registrationDate}
                              </p>
                              {company.foundationDate && (
                                <p className="flex items-center gap-2">
                                  <Briefcase className="w-4 h-4" />
                                  Stiftet: {company.foundationDate}
                                </p>
                              )}
                            </div>
                            
                            <div className="mt-4">
                              <a
                                href={`https://www.proff.no/bransjes%C3%B8k?q=${company.organisationNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Se på Proff.no
                              </a>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Seksjon: Roller */}
                      {activeSection === 'roles' && (
                        <div className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
                          {company.personRoles && company.personRoles.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {company.personRoles.map((role, idx) => (
                                <div key={idx} className="bg-white dark:bg-dark-200 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                  <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                      <User className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900 dark:text-white">{role.name}</p>
                                      <p className="text-sm text-primary">{role.title}</p>
                                      {role.postalAddress && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {role.postalAddress.zipCode} {role.postalAddress.postPlace}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">Laster roller...</p>
                          )}
                        </div>
                      )}

                      {/* Seksjon: Regnskap */}
                      {activeSection === 'accounts' && (
                        <div className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
                          {company.companyAccounts && company.companyAccounts.length > 0 ? (
                            <div className="space-y-6">
                              {company.companyAccounts.slice(0, 3).map((acc, idx) => (
                                <div key={idx} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                                    Regnskap {acc.year}
                                  </h5>
                                  
                                  {/* Resultatregnskap */}
                                  <div className="mb-4">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Resultatregnskap</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                      {[
                                        { code: 'SDI', label: 'Driftsinntekter' },
                                        { code: 'ADK', label: 'Driftskostnader' },
                                        { code: 'LTP', label: 'Lønnskostnader' },
                                        { code: 'DR', label: 'Driftsresultat (EBIT)' },
                                        { code: 'ORS', label: 'Resultat før skatt' },
                                        { code: 'OR', label: 'Ordinært resultat' },
                                      ].map(item => {
                                        const value = getAccountValue(acc.accounts, item.code)
                                        return (
                                          <div key={item.code} className="bg-white dark:bg-dark-200 rounded p-2">
                                            <p className="text-xs text-gray-500 truncate" title={item.label}>{item.label}</p>
                                            <p className={`font-semibold text-sm ${
                                              value !== null && value < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'
                                            }`}>
                                              {value !== null ? `${formatAmount(value * 1000)}` : '-'}
                                            </p>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>

                                  {/* Balanse */}
                                  <div className="mb-4">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Balanse</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                      {[
                                        { code: 'SED', label: 'Sum eiendeler' },
                                        { code: 'SEK', label: 'Sum egenkapital' },
                                        { code: 'SLG', label: 'Langsiktig gjeld' },
                                        { code: 'SKG', label: 'Kortsiktig gjeld' },
                                        { code: 'KBP', label: 'Kasse/Bank' },
                                        { code: 'SF', label: 'Sum fordringer' },
                                      ].map(item => {
                                        const value = getAccountValue(acc.accounts, item.code)
                                        return (
                                          <div key={item.code} className="bg-white dark:bg-dark-200 rounded p-2">
                                            <p className="text-xs text-gray-500 truncate" title={item.label}>{item.label}</p>
                                            <p className={`font-semibold text-sm ${
                                              value !== null && value < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'
                                            }`}>
                                              {value !== null ? `${formatAmount(value * 1000)}` : '-'}
                                            </p>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>

                                  {/* Nøkkeltall */}
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Nøkkeltall</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      {[
                                        { code: 'TR', label: 'Totalrentabilitet (%)' },
                                        { code: 'RG', label: 'Resultatgrad (%)' },
                                        { code: 'EKA', label: 'Egenkapitalandel (%)' },
                                        { code: 'LGR', label: 'Likviditetsgrad' },
                                      ].map(item => {
                                        const value = getAccountValue(acc.accounts, item.code)
                                        return (
                                          <div key={item.code} className="bg-white dark:bg-dark-200 rounded p-2">
                                            <p className="text-xs text-gray-500 truncate" title={item.label}>{item.label}</p>
                                            <p className={`font-semibold text-sm ${
                                              value !== null && value < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'
                                            }`}>
                                              {value !== null ? `${value}%` : '-'}
                                            </p>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">Ingen regnskapsdata tilgjengelig</p>
                          )}
                        </div>
                      )}

                      {/* Seksjon: Kunngjøringer */}
                      {activeSection === 'announcements' && (
                        <div className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
                          {company.announcements && company.announcements.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {company.announcements.slice(0, 10).map((ann) => (
                                <div key={ann.id} className="flex items-center gap-3 text-sm bg-white dark:bg-dark-200 rounded p-2">
                                  <span className="text-gray-500 whitespace-nowrap">{ann.date}</span>
                                  <span className="text-gray-900 dark:text-white">{ann.text}</span>
                                  <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-dark-100 rounded">{ann.type}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">Ingen kunngjøringer</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
