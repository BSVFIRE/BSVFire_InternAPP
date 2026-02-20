import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import {
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  User,
  Plus,
  X,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Send,
  Star,
  Trash2,
  Edit,
  Save,
  Users,
  AlertCircle,
} from 'lucide-react'
import {
  sokSameierOgBorettslag,
  hentRoller,
  konverterTilLead,
  RELEVANTE_ORGFORMER,
  KOMMUNER,
  type BrregEnhet,
} from '@/services/brregService'

interface SalgsLead {
  id: string
  organisasjonsnummer: string
  navn: string
  organisasjonsform: string | null
  organisasjonsform_beskrivelse: string | null
  forretningsadresse_gate: string | null
  forretningsadresse_postnummer: string | null
  forretningsadresse_poststed: string | null
  forretningsadresse_kommune: string | null
  epost: string | null
  telefon: string | null
  hjemmeside: string | null
  daglig_leder: string | null
  styreleder: string | null
  kontaktperson_navn: string | null
  kontaktperson_epost: string | null
  kontaktperson_telefon: string | null
  status: 'ny' | 'kontaktet' | 'interessert' | 'ikke_interessert' | 'kunde' | 'avvist'
  epost_sendt: boolean
  epost_sendt_dato: string | null
  notater: string | null
  neste_oppfolging: string | null
  prioritet: 'lav' | 'normal' | 'høy'
  opprettet_dato: string
  oppdatert_dato: string
}

const STATUS_OPTIONS = [
  { value: 'ny', label: 'Ny', color: 'bg-blue-500' },
  { value: 'kontaktet', label: 'Kontaktet', color: 'bg-yellow-500' },
  { value: 'interessert', label: 'Interessert', color: 'bg-green-500' },
  { value: 'ikke_interessert', label: 'Ikke interessert', color: 'bg-gray-500' },
  { value: 'kunde', label: 'Kunde', color: 'bg-primary' },
  { value: 'avvist', label: 'Avvist', color: 'bg-red-500' },
]

const PRIORITET_OPTIONS = [
  { value: 'lav', label: 'Lav', icon: '○' },
  { value: 'normal', label: 'Normal', icon: '●' },
  { value: 'høy', label: 'Høy', icon: '★' },
]

export function AdminSalg() {
  const { user } = useAuthStore()
  
  // Søk-state
  const [searchMode, setSearchMode] = useState<'brreg' | 'leads'>('brreg')
  const [searchTerm, setSearchTerm] = useState('')
    const [kommuneFilter, setKommuneFilter] = useState('')
  const [orgformFilter, setOrgformFilter] = useState<string[]>(['SAM', 'BRL', 'ESEK'])
  const [statusFilter, setStatusFilter] = useState<string>('alle')
  
  // Resultater
  const [brregResultater, setBrregResultater] = useState<BrregEnhet[]>([])
  const [leads, setLeads] = useState<SalgsLead[]>([])
  const [totalResultater, setTotalResultater] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedEnhet, setExpandedEnhet] = useState<string | null>(null)
  const [_selectedLeads, _setSelectedLeads] = useState<Set<string>>(new Set())
  const [editingLead, setEditingLead] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<SalgsLead>>({})
  const [showFilters, setShowFilters] = useState(true)
  const [expandedLead, setExpandedLead] = useState<string | null>(null)
  
  // E-post generator state
  const [emailModalLead, setEmailModalLead] = useState<SalgsLead | null>(null)
  const [referanseKunder, setReferanseKunder] = useState<{navn: string, poststed: string}[]>([])
  const [generertEpost, setGenerertEpost] = useState<{emne: string, innhold: string} | null>(null)
  const [kopiert, setKopiert] = useState(false)
  
  // Last lagrede leads ved oppstart
  useEffect(() => {
    loadLeads()
  }, [statusFilter])

  async function loadLeads() {
    try {
      let query = supabase
        .from('salgs_leads')
        .select('*')
        .order('opprettet_dato', { ascending: false })
      
      if (statusFilter !== 'alle') {
        query = query.eq('status', statusFilter)
      }
      
      const { data, error } = await query.limit(100)
      
      if (error) throw error
      setLeads(data || [])
    } catch (err) {
      console.error('Feil ved lasting av leads:', err)
    }
  }

  async function sokBrreg() {
    if (!kommuneFilter && !searchTerm) {
      setError('Du må fylle inn minst ett søkekriterium (kommune eller navn)')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const resultat = await sokSameierOgBorettslag({
        navn: searchTerm || undefined,
        kommunenummer: kommuneFilter || undefined,
        inkluderSameier: orgformFilter.includes('SAMEI'),
        inkluderBorettslag: orgformFilter.includes('BRL'),
        inkluderEierseksjonssameier: orgformFilter.includes('ESEK'),
        size: 50,
        page: currentPage,
      })
      
      setBrregResultater(resultat._embedded?.enheter || [])
      setTotalResultater(resultat.page?.totalElements || 0)
    } catch (err: any) {
      setError(err.message || 'Feil ved søk i Brønnøysundregistrene')
      setBrregResultater([])
    } finally {
      setLoading(false)
    }
  }

  async function leggTilLead(enhet: BrregEnhet) {
    setLoading(true)
    try {
      // Sjekk om lead allerede finnes
      const { data: existing } = await supabase
        .from('salgs_leads')
        .select('id')
        .eq('organisasjonsnummer', enhet.organisasjonsnummer)
        .single()
      
      if (existing) {
        setError(`${enhet.navn} er allerede lagt til i listen`)
        return
      }
      
      // Hent roller for å få styreleder/daglig leder
      const roller = await hentRoller(enhet.organisasjonsnummer)
      const leadData = konverterTilLead(enhet, roller)
      
      const { error } = await supabase
        .from('salgs_leads')
        .insert({
          ...leadData,
          opprettet_av: user?.id,
        })
      
      if (error) throw error
      
      await loadLeads()
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Feil ved lagring av lead')
    } finally {
      setLoading(false)
    }
  }

  async function leggTilFlereLeads() {
    if (brregResultater.length === 0) return
    
    setLoading(true)
    let antallLagtTil = 0
    let antallDuplikater = 0
    
    try {
      for (const enhet of brregResultater) {
        // Sjekk om lead allerede finnes
        const { data: existing } = await supabase
          .from('salgs_leads')
          .select('id')
          .eq('organisasjonsnummer', enhet.organisasjonsnummer)
          .single()
        
        if (existing) {
          antallDuplikater++
          continue
        }
        
        const roller = await hentRoller(enhet.organisasjonsnummer)
        const leadData = konverterTilLead(enhet, roller)
        
        await supabase
          .from('salgs_leads')
          .insert({
            ...leadData,
            opprettet_av: user?.id,
          })
        
        antallLagtTil++
      }
      
      await loadLeads()
      setError(antallDuplikater > 0 
        ? `${antallLagtTil} leads lagt til. ${antallDuplikater} var allerede i listen.`
        : null
      )
    } catch (err: any) {
      setError(err.message || 'Feil ved lagring av leads')
    } finally {
      setLoading(false)
    }
  }

  async function oppdaterLead(id: string, updates: Partial<SalgsLead>) {
    try {
      const { error } = await supabase
        .from('salgs_leads')
        .update(updates)
        .eq('id', id)
      
      if (error) throw error
      
      await loadLeads()
      setEditingLead(null)
      setEditForm({})
    } catch (err: any) {
      setError(err.message || 'Feil ved oppdatering av lead')
    }
  }

  async function slettLead(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne leaden?')) return
    
    try {
      const { error } = await supabase
        .from('salgs_leads')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await loadLeads()
    } catch (err: any) {
      setError(err.message || 'Feil ved sletting av lead')
    }
  }

  async function markerEpostSendt(id: string) {
    await oppdaterLead(id, {
      epost_sendt: true,
      epost_sendt_dato: new Date().toISOString(),
      status: 'kontaktet',
    })
  }

  function toggleOrgform(form: string) {
    setOrgformFilter(prev => 
      prev.includes(form) 
        ? prev.filter(f => f !== form)
        : [...prev, form]
    )
  }

  function erAlleredeLead(orgnr: string): boolean {
    return leads.some(l => l.organisasjonsnummer === orgnr)
  }

  // E-post generator funksjon
  async function genererSalgsEpost(lead: SalgsLead) {
    setEmailModalLead(lead)
    setKopiert(false)
    
    // Hent eksisterende kunder i samme område (postnummer eller kommune)
    try {
      const { data: kunder } = await supabase
        .from('customer')
        .select('name, city')
        .or(`postal_code.eq.${lead.forretningsadresse_postnummer},city.ilike.%${lead.forretningsadresse_poststed}%`)
        .limit(5)
      
      setReferanseKunder(kunder?.map(k => ({ navn: k.name, poststed: k.city })) || [])
    } catch (err) {
      console.error('Kunne ikke hente referansekunder:', err)
      setReferanseKunder([])
    }
    
    // Generer e-post
    const kontaktNavn = lead.kontaktperson_navn || lead.styreleder || 'Styret'
    const orgType = lead.organisasjonsform_beskrivelse?.toLowerCase() || 'boligselskap'
    const kundeReferanser = referanseKunder.length > 0 
      ? `\n\nVi har allerede gleden av å betjene flere ${orgType}er i deres område, blant annet ${referanseKunder.slice(0, 3).map(k => k.navn).join(', ')}.`
      : ''
    
    const emne = `Har dere full kontroll på lovpålagt brannvern?`
    
    const innhold = `Hei ${kontaktNavn},

Jeg tar kontakt på vegne av Brannteknisk Service og Vedlikehold AS (BSV Fire) – en lokal totalleverandør innen brannvern og sikkerhet i Bergen.

Som styre i et ${orgType} har dere et betydelig ansvar for at lovpålagte kontroller gjennomføres og dokumenteres korrekt. Vi hjelper boligselskaper med å samle alt brannvern hos én leverandør – enkelt, oversiktlig og trygt.

Hva må ${orgType}et følge opp årlig?

• Brannslukkeapparater
• Brannslanger
• Nødlysanlegg
• Brannalarmanlegg

Mulige ekstra tjenester:
• Førstehjelpsutstyr
• Alarmoverføring via Alarm 24/7 – en av markedets beste priser, og en trygghet for styret

Vi har også samarbeidspartnere innen sprinkler og elektro, slik at vi kan koordinere flere fag ved behov.

Fordelen med å samle alt hos BSV Fire:

✓ Én fast kontaktperson
✓ Koordinerte kontroller – mindre belastning for beboere
✓ Samlet dokumentasjon (klar ved tilsyn)
✓ Varsling før frister utløper
✓ Mulighet for bedre pris ved samlet avtale

Alle våre serviceingeniører er FG-godkjente og leverandørsertifiserte. Vi har stort fokus på å holde oss oppdatert på nye produkter og forskrifter, og på hvordan vi kan ta i bruk ny teknologi som bidrar til enklere, sikrere og mer fremtidsrettede løsninger innen brannsikkerhet.

Vi opplever at mange styrer ønsker færre leverandører og bedre oversikt – særlig med tanke på dokumentasjonskrav ved tilsyn.${kundeReferanser}

Jeg tar gjerne en kort og uforpliktende prat for å se om dette kan være aktuelt for ${lead.navn}.

Passer det med en 10 minutters samtale denne uken?

Med vennlig hilsen,

[Ditt navn]
Brannteknisk Service og Vedlikehold AS (BSV Fire)
Telefon: [nummer]
www.bsvfire.no`

    setGenerertEpost({ emne, innhold })
  }

  async function kopierEpost() {
    if (!generertEpost) return
    
    const fullTekst = `Emne: ${generertEpost.emne}\n\n${generertEpost.innhold}`
    await navigator.clipboard.writeText(fullTekst)
    setKopiert(true)
    setTimeout(() => setKopiert(false), 2000)
  }

  function lukkEmailModal() {
    setEmailModalLead(null)
    setGenerertEpost(null)
    setReferanseKunder([])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Salg - Prospektering
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Finn potensielle kunder fra Brønnøysundregistrene
          </p>
        </div>
        
        {/* Mode toggle */}
        <div className="flex bg-gray-100 dark:bg-dark-100 rounded-lg p-1">
          <button
            onClick={() => setSearchMode('brreg')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              searchMode === 'brreg'
                ? 'bg-white dark:bg-dark-50 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Search className="w-4 h-4 inline mr-2" />
            Søk BRREG
          </button>
          <button
            onClick={() => setSearchMode('leads')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              searchMode === 'leads'
                ? 'bg-white dark:bg-dark-50 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Mine Leads ({leads.length})
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {searchMode === 'brreg' ? (
        <>
          {/* Søkefiltre */}
          <div className="bg-white dark:bg-dark-50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Søkefiltre
              </h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showFilters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {showFilters && (
              <div className="space-y-4">
                {/* Organisasjonsform */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Organisasjonsform
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(RELEVANTE_ORGFORMER).slice(0, 3).map(([kode, beskrivelse]) => (
                      <button
                        key={kode}
                        onClick={() => toggleOrgform(kode)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          orgformFilter.includes(kode)
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-200'
                        }`}
                      >
                        {beskrivelse}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Navn */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Navn (valgfritt)
                    </label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Søk på navn..."
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Kommune */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Kommune
                    </label>
                    <select
                      value={kommuneFilter}
                      onChange={(e) => setKommuneFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                    >
                      <option value="">Alle kommuner</option>
                      {KOMMUNER.map(k => (
                        <option key={k.nummer} value={k.nummer}>{k.navn}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Søkeknapp */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={sokBrreg}
                    disabled={loading}
                    className="px-6 py-2.5 bg-primary hover:bg-primary-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Søk i Brønnøysund
                  </button>
                  
                  {brregResultater.length > 0 && (
                    <button
                      onClick={leggTilFlereLeads}
                      disabled={loading}
                      className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Legg til alle ({brregResultater.length})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Søkeresultater */}
          {brregResultater.length > 0 && (
            <div className="bg-white dark:bg-dark-50 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Søkeresultater ({totalResultater} treff)
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {brregResultater.map((enhet) => {
                  const erLead = erAlleredeLead(enhet.organisasjonsnummer)
                  const isExpanded = expandedEnhet === enhet.organisasjonsnummer
                  const adresse = enhet.forretningsadresse || enhet.postadresse
                  
                  return (
                    <div key={enhet.organisasjonsnummer} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {enhet.navn}
                            </h3>
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-400 rounded">
                              {enhet.organisasjonsform?.beskrivelse}
                            </span>
                            {erLead && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                                I listen
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {enhet.organisasjonsnummer}
                            </span>
                            {adresse && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {adresse.postnummer} {adresse.poststed}
                              </span>
                            )}
                            {enhet.telefon && (
                              <a
                                href={`tel:${enhet.telefon}`}
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                {enhet.telefon}
                              </a>
                            )}
                            {enhet.epostadresse && (
                              <a
                                href={`mailto:${enhet.epostadresse}`}
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                {enhet.epostadresse}
                              </a>
                            )}
                            {enhet.hjemmeside && (
                              <a
                                href={enhet.hjemmeside.startsWith('http') ? enhet.hjemmeside : `https://${enhet.hjemmeside}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <Globe className="w-3.5 h-3.5" />
                                Hjemmeside
                              </a>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedEnhet(isExpanded ? null : enhet.organisasjonsnummer)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg"
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                          
                          {!erLead && (
                            <button
                              onClick={() => leggTilLead(enhet)}
                              disabled={loading}
                              className="px-3 py-1.5 bg-primary hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              Legg til
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Adresse</p>
                            <p className="text-gray-900 dark:text-white">
                              {adresse?.adresse?.join(', ')}<br />
                              {adresse?.postnummer} {adresse?.poststed}
                            </p>
                          </div>
                          {enhet.stiftelsesdato && (
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Stiftet</p>
                              <p className="text-gray-900 dark:text-white">{enhet.stiftelsesdato}</p>
                            </div>
                          )}
                          {enhet.naeringskode1 && (
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Næringskode</p>
                              <p className="text-gray-900 dark:text-white">{enhet.naeringskode1.beskrivelse}</p>
                            </div>
                          )}
                          <div className="md:col-span-2">
                            <p className="text-gray-500 dark:text-gray-400 mb-2">Finn kontaktinfo</p>
                            <div className="flex flex-wrap gap-3">
                              <a
                                href={`https://www.proff.no/bransjes%C3%B8k?q=${enhet.organisasjonsnummer}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 text-sm"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Proff.no
                              </a>
                              <a
                                href={`https://vibbo.no/${enhet.organisasjonsnummer}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 text-sm"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Vibbo
                              </a>
                              <a
                                href={`https://www.1881.no/?query=${encodeURIComponent(enhet.navn)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 text-sm"
                              >
                                <ExternalLink className="w-4 h-4" />
                                1881.no
                              </a>
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(enhet.navn + ' styret epost')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 text-sm"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Google
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* Pagination */}
              {totalResultater > 50 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setCurrentPage(p => Math.max(0, p - 1))
                      sokBrreg()
                    }}
                    disabled={currentPage === 0 || loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg disabled:opacity-50"
                  >
                    Forrige
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Side {currentPage + 1} av {Math.ceil(totalResultater / 50)}
                  </span>
                  <button
                    onClick={() => {
                      setCurrentPage(p => p + 1)
                      sokBrreg()
                    }}
                    disabled={currentPage >= Math.ceil(totalResultater / 50) - 1 || loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg disabled:opacity-50"
                  >
                    Neste
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Leads-visning */}
          <div className="bg-white dark:bg-dark-50 rounded-xl border border-gray-200 dark:border-gray-800">
            {/* Filter bar */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter('alle')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === 'alle'
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-200'
                  }`}
                >
                  Alle
                </button>
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      statusFilter === opt.value
                        ? `${opt.color} text-white`
                        : 'bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Leads liste */}
            {leads.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Ingen leads ennå
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Søk i Brønnøysundregistrene for å finne potensielle kunder
                </p>
                <button
                  onClick={() => setSearchMode('brreg')}
                  className="px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                >
                  Gå til søk
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {leads.map((lead) => {
                  const isEditing = editingLead === lead.id
                  const isExpanded = expandedLead === lead.id
                  const statusOption = STATUS_OPTIONS.find(s => s.value === lead.status)
                  
                  return (
                    <div key={lead.id} className="p-4">
                      {/* Klikkbar hovedrad */}
                      <div 
                        className="flex items-start justify-between gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-100 -mx-4 px-4 py-2 rounded-lg transition-colors"
                        onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {lead.navn}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs font-medium text-white rounded ${statusOption?.color}`}>
                              {statusOption?.label}
                            </span>
                            {lead.prioritet === 'høy' && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            )}
                            {lead.epost_sendt && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                E-post sendt
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400 ml-6">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {lead.organisasjonsnummer}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {lead.forretningsadresse_postnummer} {lead.forretningsadresse_poststed}
                            </span>
                            {lead.styreleder && (
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5" />
                                {lead.styreleder}
                              </span>
                            )}
                          </div>
                          
                          {/* Kontaktinfo - alltid synlig */}
                          {(lead.epost || lead.telefon || lead.kontaktperson_epost) && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm ml-6">
                              {(lead.kontaktperson_epost || lead.epost) && (
                                <span
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1"
                                >
                                  <a
                                    href={`mailto:${lead.kontaktperson_epost || lead.epost}`}
                                    className="flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                    {lead.kontaktperson_epost || lead.epost}
                                  </a>
                                </span>
                              )}
                              {(lead.kontaktperson_telefon || lead.telefon) && (
                                <span
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1"
                                >
                                  <a
                                    href={`tel:${lead.kontaktperson_telefon || lead.telefon}`}
                                    className="flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    {lead.kontaktperson_telefon || lead.telefon}
                                  </a>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* Generer e-post knapp */}
                          <button
                            onClick={() => genererSalgsEpost(lead)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg"
                            title="Generer salgs-epost"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          {!lead.epost_sendt && (
                            <button
                              onClick={() => markerEpostSendt(lead.id)}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                              title="Marker e-post sendt"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingLead(lead.id)
                              setEditForm(lead)
                            }}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg"
                            title="Rediger"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => slettLead(lead.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title="Slett"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Utvidet informasjon */}
                      {isExpanded && !isEditing && (
                        <div className="mt-4 ml-6 p-4 bg-gray-50 dark:bg-dark-100 rounded-lg space-y-4 animate-in slide-in-from-top-2 duration-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Organisasjonsinfo */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                Organisasjon
                              </h4>
                              <div className="space-y-1 text-sm">
                                <p className="text-gray-900 dark:text-white font-medium">{lead.navn}</p>
                                <p className="text-gray-600 dark:text-gray-400">Org.nr: {lead.organisasjonsnummer}</p>
                                {lead.organisasjonsform_beskrivelse && (
                                  <p className="text-gray-600 dark:text-gray-400">{lead.organisasjonsform_beskrivelse}</p>
                                )}
                              </div>
                            </div>
                            
                            {/* Adresse */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                Adresse
                              </h4>
                              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                {lead.forretningsadresse_gate && <p>{lead.forretningsadresse_gate}</p>}
                                <p>{lead.forretningsadresse_postnummer} {lead.forretningsadresse_poststed}</p>
                                {lead.forretningsadresse_kommune && <p>{lead.forretningsadresse_kommune}</p>}
                              </div>
                            </div>
                            
                            {/* Kontaktpersoner */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                Kontaktpersoner
                              </h4>
                              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                {lead.styreleder && <p><span className="text-gray-500">Styreleder:</span> {lead.styreleder}</p>}
                                {lead.daglig_leder && <p><span className="text-gray-500">Daglig leder:</span> {lead.daglig_leder}</p>}
                                {lead.kontaktperson_navn && <p><span className="text-gray-500">Kontakt:</span> {lead.kontaktperson_navn}</p>}
                              </div>
                            </div>
                            
                            {/* Status og oppfølging */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                Status
                              </h4>
                              <div className="space-y-1 text-sm">
                                <p className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${statusOption?.color}`}></span>
                                  <span className="text-gray-900 dark:text-white">{statusOption?.label}</span>
                                </p>
                                {lead.neste_oppfolging && (
                                  <p className="text-gray-600 dark:text-gray-400">
                                    Neste oppfølging: {new Date(lead.neste_oppfolging).toLocaleDateString('nb-NO')}
                                  </p>
                                )}
                                {lead.epost_sendt_dato && (
                                  <p className="text-gray-600 dark:text-gray-400">
                                    E-post sendt: {new Date(lead.epost_sendt_dato).toLocaleDateString('nb-NO')}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Datoer */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                Historikk
                              </h4>
                              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                <p>Opprettet: {new Date(lead.opprettet_dato).toLocaleDateString('nb-NO')}</p>
                                <p>Oppdatert: {new Date(lead.oppdatert_dato).toLocaleDateString('nb-NO')}</p>
                              </div>
                            </div>
                            
                            {/* Lenker */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                Eksterne lenker
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                <a
                                  href={`https://www.proff.no/bransjes%C3%B8k?q=${lead.organisasjonsnummer}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-2 py-1 bg-white dark:bg-dark-200 border border-gray-200 dark:border-gray-700 rounded hover:border-primary text-primary"
                                >
                                  Proff.no
                                </a>
                                <a
                                  href={`https://www.1881.no/?query=${encodeURIComponent(lead.navn)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-2 py-1 bg-white dark:bg-dark-200 border border-gray-200 dark:border-gray-700 rounded hover:border-primary text-primary"
                                >
                                  1881.no
                                </a>
                                <a
                                  href={`https://www.google.com/search?q=${encodeURIComponent(lead.navn + ' styret epost')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-2 py-1 bg-white dark:bg-dark-200 border border-gray-200 dark:border-gray-700 rounded hover:border-primary text-primary"
                                >
                                  Google
                                </a>
                              </div>
                            </div>
                          </div>
                          
                          {/* Notater */}
                          {lead.notater && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                Notater
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-dark-200 rounded p-3">
                                {lead.notater}
                              </p>
                            </div>
                          )}
                          
                          {/* Handlingsknapper */}
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => genererSalgsEpost(lead)}
                              className="px-3 py-1.5 bg-primary hover:bg-primary-600 text-white text-sm rounded-lg flex items-center gap-2"
                            >
                              <Mail className="w-4 h-4" />
                              Generer e-post
                            </button>
                            <button
                              onClick={() => {
                                setEditingLead(lead.id)
                                setEditForm(lead)
                                setExpandedLead(null)
                              }}
                              className="px-3 py-1.5 bg-gray-100 dark:bg-dark-200 hover:bg-gray-200 dark:hover:bg-dark-300 text-gray-700 dark:text-gray-300 text-sm rounded-lg flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Rediger
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Redigeringsform */}
                      {isEditing && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Kontaktperson
                              </label>
                              <input
                                type="text"
                                value={editForm.kontaktperson_navn || ''}
                                onChange={(e) => setEditForm({ ...editForm, kontaktperson_navn: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                                placeholder="Navn på kontaktperson"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                E-post
                              </label>
                              <input
                                type="email"
                                value={editForm.kontaktperson_epost || editForm.epost || ''}
                                onChange={(e) => setEditForm({ ...editForm, kontaktperson_epost: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                                placeholder="E-postadresse"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Telefon
                              </label>
                              <input
                                type="tel"
                                value={editForm.kontaktperson_telefon || editForm.telefon || ''}
                                onChange={(e) => setEditForm({ ...editForm, kontaktperson_telefon: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                                placeholder="Telefonnummer"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Status
                              </label>
                              <select
                                value={editForm.status || 'ny'}
                                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as SalgsLead['status'] })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                              >
                                {STATUS_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Prioritet
                              </label>
                              <select
                                value={editForm.prioritet || 'normal'}
                                onChange={(e) => setEditForm({ ...editForm, prioritet: e.target.value as SalgsLead['prioritet'] })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                              >
                                {PRIORITET_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Neste oppfølging
                              </label>
                              <input
                                type="date"
                                value={editForm.neste_oppfolging || ''}
                                onChange={(e) => setEditForm({ ...editForm, neste_oppfolging: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Notater
                            </label>
                            <textarea
                              value={editForm.notater || ''}
                              onChange={(e) => setEditForm({ ...editForm, notater: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                              placeholder="Legg til notater..."
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => oppdaterLead(lead.id, editForm)}
                              className="px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" />
                              Lagre
                            </button>
                            <button
                              onClick={() => {
                                setEditingLead(null)
                                setEditForm({})
                              }}
                              className="px-4 py-2 bg-gray-100 dark:bg-dark-100 hover:bg-gray-200 dark:hover:bg-dark-200 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                            >
                              Avbryt
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* E-post Generator Modal */}
      {emailModalLead && generertEpost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6" />
                <div>
                  <h2 className="font-semibold">Generer salgs-epost</h2>
                  <p className="text-sm text-white/80">{emailModalLead.navn}</p>
                </div>
              </div>
              <button
                onClick={lukkEmailModal}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Referansekunder */}
            {referanseKunder.length > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Eksisterende kunder i området:
                </p>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  {referanseKunder.map(k => k.navn).join(', ')}
                </p>
              </div>
            )}

            {/* E-post innhold */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[50vh]">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Emne
                </label>
                <input
                  type="text"
                  value={generertEpost.emne}
                  onChange={(e) => setGenerertEpost({ ...generertEpost, emne: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Innhold
                </label>
                <textarea
                  value={generertEpost.innhold}
                  onChange={(e) => setGenerertEpost({ ...generertEpost, innhold: e.target.value })}
                  rows={15}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-mono text-sm"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Kopier og lim inn i Outlook eller annen e-postklient
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={lukkEmailModal}
                  className="px-4 py-2 bg-gray-100 dark:bg-dark-100 hover:bg-gray-200 dark:hover:bg-dark-200 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Lukk
                </button>
                <button
                  onClick={kopierEpost}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    kopiert 
                      ? 'bg-green-500 text-white' 
                      : 'bg-primary hover:bg-primary-600 text-white'
                  }`}
                >
                  {kopiert ? (
                    <>
                      <Send className="w-4 h-4" />
                      Kopiert!
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Kopier e-post
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
