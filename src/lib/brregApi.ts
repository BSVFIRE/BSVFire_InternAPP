/**
 * Brønnøysund Register API Integration
 * 
 * This service provides access to the Norwegian Business Register (Brønnøysundregistrene)
 * for searching companies by name or organization number.
 * 
 * API Documentation: https://data.brreg.no/enhetsregisteret/api/docs/index.html
 */

export interface BrregEnhet {
  organisasjonsnummer: string
  navn: string
  organisasjonsform?: {
    kode: string
    beskrivelse: string
  }
  forretningsadresse?: {
    adresse?: string[]
    postnummer?: string
    poststed?: string
    kommune?: string
    land?: string
  }
  postadresse?: {
    adresse?: string[]
    postnummer?: string
    poststed?: string
    kommune?: string
    land?: string
  }
  registreringsdatoEnhetsregisteret?: string
  naeringskode1?: {
    kode: string
    beskrivelse: string
  }
  antallAnsatte?: number
  hjemmeside?: string
}

export interface BrregSearchResponse {
  _embedded?: {
    enheter: BrregEnhet[]
  }
  page: {
    size: number
    totalElements: number
    totalPages: number
    number: number
  }
}

const BRREG_API_BASE = 'https://data.brreg.no/enhetsregisteret/api'

/**
 * Search for companies by name
 * @param query - Company name to search for
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of matching companies
 */
export async function searchCompaniesByName(
  query: string,
  limit: number = 10
): Promise<BrregEnhet[]> {
  if (!query || query.trim().length < 2) {
    return []
  }

  try {
    const url = new URL(`${BRREG_API_BASE}/enheter`)
    url.searchParams.append('navn', query.trim())
    url.searchParams.append('size', limit.toString())
    url.searchParams.append('sort', 'navn,asc')

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data: BrregSearchResponse = await response.json()
    return data._embedded?.enheter || []
  } catch (error) {
    console.error('Error searching companies by name:', error)
    throw error
  }
}

/**
 * Search for a company by organization number
 * @param orgNumber - Organization number (with or without spaces)
 * @returns Company details or null if not found
 */
export async function getCompanyByOrgNumber(
  orgNumber: string
): Promise<BrregEnhet | null> {
  if (!orgNumber) {
    return null
  }

  try {
    // Remove spaces and non-numeric characters
    const cleanOrgNumber = orgNumber.replace(/\D/g, '')
    
    if (cleanOrgNumber.length !== 9) {
      throw new Error('Organization number must be 9 digits')
    }

    const url = `${BRREG_API_BASE}/enheter/${cleanOrgNumber}`
    const response = await fetch(url)
    
    if (response.status === 404) {
      return null
    }
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data: BrregEnhet = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching company by org number:', error)
    throw error
  }
}

/**
 * Format organization number with spaces (XXX XXX XXX)
 */
export function formatOrgNumber(orgNumber: string): string {
  const cleaned = orgNumber.replace(/\D/g, '')
  if (cleaned.length !== 9) return orgNumber
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`
}

/**
 * Extract address from Brreg entity
 * Prefers forretningsadresse (business address) over postadresse (postal address)
 */
export function extractAddress(enhet: BrregEnhet): {
  adresse: string
  postnummer: string
  poststed: string
} {
  const addr = enhet.forretningsadresse || enhet.postadresse
  
  return {
    adresse: addr?.adresse?.join(', ') || '',
    postnummer: addr?.postnummer || '',
    poststed: addr?.poststed || '',
  }
}
