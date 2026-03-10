// Service for å hente data fra Proff API via Supabase Edge Function
// API dokumentasjon: https://apidocs.proff.no/

interface ProffAddress {
  addressLine?: string
  zipCode?: string
  city?: string
  municipalityCode?: string
  municipalityName?: string
  countryCode?: string
  countryName?: string
}

interface ProffPerson {
  personId?: number
  firstName?: string
  middleName?: string
  lastName?: string
  birthDate?: string
  address?: ProffAddress
}

interface ProffRole {
  roleCode?: string
  roleName?: string
  person?: ProffPerson
  unit?: {
    organisationNumber?: string
    name?: string
  }
}

interface ProffPhoneNumber {
  number?: string
  type?: string
}

interface ProffCompany {
  organisationNumber: string
  name: string
  organisationForm?: {
    code?: string
    description?: string
  }
  businessAddress?: ProffAddress
  postalAddress?: ProffAddress
  phoneNumbers?: ProffPhoneNumber[]
  emailAddress?: string
  webAddress?: string
  foundedDate?: string
  registeredDate?: string
  numberOfEmployees?: number
  industryCode1?: {
    code?: string
    description?: string
  }
  roles?: ProffRole[]
  shareCapital?: number
  revenue?: number
  profit?: number
  equity?: number
}

interface ProffSearchResult {
  companies?: ProffCompany[]
  totalHits?: number
  page?: number
  pageSize?: number
}

async function proffFetch<T>(endpoint: string, orgnr?: string, searchParams?: Record<string, string>): Promise<T> {
  const params = new URLSearchParams()
  params.append('endpoint', endpoint)
  if (orgnr) params.append('orgnr', orgnr)
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) params.append(key, value)
    })
  }

  // Bruk GET med query params via fetch direkte til Edge Function
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  const response = await fetch(`${supabaseUrl}/functions/v1/proff-proxy?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorData: any = {}
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { message: errorText }
    }
    
    console.error('Proff API feil:', response.status, errorData)
    
    // Sjekk for "Call limit exceeded" i details
    const details = errorData.details ? JSON.parse(errorData.details) : {}
    if (details.message === 'Call limit exceeded') {
      throw new Error('Proff API-kvoten er brukt opp. Prøv igjen senere.')
    }
    
    if (response.status === 401) {
      throw new Error('Ugyldig Proff API token')
    }
    if (response.status === 403) {
      throw new Error('Ingen tilgang til dette endepunktet i Proff API')
    }
    if (response.status === 404) {
      throw new Error('Ikke funnet i Proff')
    }
    throw new Error(errorData.error || errorData.message || errorData.detail || `Proff API feil: ${response.status}`)
  }

  return response.json()
}

// Hent detaljert info om en bedrift basert på org.nr
export async function hentProffBedrift(organisasjonsnummer: string): Promise<ProffCompany | null> {
  try {
    const data = await proffFetch<ProffCompany>('company', organisasjonsnummer)
    return data
  } catch (error) {
    console.error('Feil ved henting fra Proff:', error)
    return null
  }
}

// Søk etter bedrifter
export async function sokProffBedrifter(params: {
  query?: string
  municipalityCode?: string
  organisationForm?: string
  page?: number
  pageSize?: number
}): Promise<ProffSearchResult> {
  const searchParams: Record<string, string> = {}
  
  if (params.query) searchParams.q = params.query
  if (params.municipalityCode) searchParams.municipalityCode = params.municipalityCode
  if (params.organisationForm) searchParams.organisationForm = params.organisationForm
  if (params.page) searchParams.page = params.page.toString()
  if (params.pageSize) searchParams.pageSize = params.pageSize.toString()

  return proffFetch<ProffSearchResult>('search', undefined, searchParams)
}

// Hent roller for en bedrift
export async function hentProffRoller(organisasjonsnummer: string): Promise<ProffRole[]> {
  try {
    const company = await hentProffBedrift(organisasjonsnummer)
    return company?.roles || []
  } catch {
    return []
  }
}

// Hjelpefunksjon: Finn styreleder fra Proff-roller
export function finnProffStyreleder(roller: ProffRole[]): { navn: string; telefon?: string } | null {
  const styreleder = roller.find(r => 
    r.roleCode === 'LEDE' || 
    r.roleName?.toLowerCase().includes('styreleder')
  )
  
  if (styreleder?.person) {
    const { firstName, middleName, lastName } = styreleder.person
    return {
      navn: [firstName, middleName, lastName].filter(Boolean).join(' '),
    }
  }
  return null
}

// Hjelpefunksjon: Finn daglig leder fra Proff-roller
export function finnProffDagligLeder(roller: ProffRole[]): { navn: string; telefon?: string } | null {
  const dagligLeder = roller.find(r => 
    r.roleCode === 'DAGL' || 
    r.roleName?.toLowerCase().includes('daglig leder')
  )
  
  if (dagligLeder?.person) {
    const { firstName, middleName, lastName } = dagligLeder.person
    return {
      navn: [firstName, middleName, lastName].filter(Boolean).join(' '),
    }
  }
  return null
}

// Berik en lead med data fra Proff
export async function berikMedProffData(organisasjonsnummer: string): Promise<{
  telefon?: string
  epost?: string
  hjemmeside?: string
  styreleder?: string
  daglig_leder?: string
  omsetning?: number
  resultat?: number
  egenkapital?: number
  antall_ansatte?: number
} | null> {
  try {
    const proffData = await hentProffBedrift(organisasjonsnummer) as any
    if (!proffData) return null
    
    // Sjekk om vi fikk gyldig data (ikke bare en feilmelding)
    if (!proffData.organisationNumber && !proffData.name) {
      console.log('Proff returnerte ingen gyldig bedriftsdata:', proffData)
      return null
    }

    // Proff API har personRoles for styreleder/daglig leder
    // Format: { name: "Navn", titleCode: "LEDE", title: "Styrets leder" }
    const personRoles = proffData.personRoles || []
    
    // Finn styreleder (titleCode: LEDE)
    const styrelederRole = personRoles.find((r: any) => 
      r.titleCode === 'LEDE' ||
      r.title?.toLowerCase().includes('styreleder') ||
      r.title?.toLowerCase().includes('styrets leder')
    )
    const styreleder = styrelederRole?.name || null
    
    // Finn daglig leder (titleCode: DAGL)
    const dagligLederRole = personRoles.find((r: any) => 
      r.titleCode === 'DAGL' ||
      r.title?.toLowerCase().includes('daglig leder')
    )
    const dagligLeder = dagligLederRole?.name || null

    // phoneNumbers er et objekt med telephoneNumber, mobilePhone, etc.
    const phoneNumbers = proffData.phoneNumbers || {}
    const telefon = phoneNumbers.telephoneNumber || phoneNumbers.mobilePhone || null

    // Parse revenue/profit som kan være strenger
    const parseNumber = (val: any): number | undefined => {
      if (val === null || val === undefined) return undefined
      const num = typeof val === 'string' ? parseFloat(val) : val
      return isNaN(num) ? undefined : num
    }

    return {
      telefon: telefon || undefined,
      epost: proffData.email || undefined,
      hjemmeside: proffData.homePage || undefined,
      styreleder: styreleder || undefined,
      daglig_leder: dagligLeder || undefined,
      omsetning: parseNumber(proffData.revenue),
      resultat: parseNumber(proffData.profit),
      egenkapital: parseNumber(proffData.equity),
      antall_ansatte: proffData.numberOfEmployees,
    }
  } catch (error) {
    console.error('Feil ved berikelse med Proff-data:', error)
    return null
  }
}

// Sjekk om Proff API er konfigurert (via Edge Function)
export function erProffKonfigurert(): boolean {
  // Edge Function håndterer token - alltid tilgjengelig hvis Supabase er konfigurert
  return !!import.meta.env.VITE_SUPABASE_URL
}

export type { ProffCompany, ProffRole, ProffSearchResult, ProffAddress }
