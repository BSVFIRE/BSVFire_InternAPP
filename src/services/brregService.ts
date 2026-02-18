// Service for å hente data fra Brønnøysundregistrene (BRREG)
// API dokumentasjon: https://data.brreg.no/enhetsregisteret/api/docs/index.html

export interface BrregEnhet {
  organisasjonsnummer: string
  navn: string
  organisasjonsform?: {
    kode: string
    beskrivelse: string
  }
  hjemmeside?: string
  epostadresse?: string
  telefon?: string
  postadresse?: {
    adresse?: string[]
    postnummer?: string
    poststed?: string
    kommunenummer?: string
    kommune?: string
    landkode?: string
    land?: string
  }
  forretningsadresse?: {
    adresse?: string[]
    postnummer?: string
    poststed?: string
    kommunenummer?: string
    kommune?: string
    landkode?: string
    land?: string
  }
  naeringskode1?: {
    kode: string
    beskrivelse: string
  }
  antallAnsatte?: number
  stiftelsesdato?: string
  registreringsdatoEnhetsregisteret?: string
  registrertIMvaregisteret?: boolean
  konkurs?: boolean
  underAvvikling?: boolean
  underTvangsavviklingEllerTvangsopplosning?: boolean
  maalform?: string
}

export interface BrregSokResultat {
  _embedded?: {
    enheter: BrregEnhet[]
  }
  _links?: {
    self: { href: string }
    first?: { href: string }
    prev?: { href: string }
    next?: { href: string }
    last?: { href: string }
  }
  page?: {
    size: number
    totalElements: number
    totalPages: number
    number: number
  }
}

export interface BrregRolle {
  type: {
    kode: string
    beskrivelse: string
  }
  person?: {
    fodselsdato?: string
    navn?: {
      fornavn?: string
      mellomnavn?: string
      etternavn?: string
    }
  }
  enhet?: {
    organisasjonsnummer?: string
    organisasjonsform?: {
      kode: string
      beskrivelse: string
    }
    navn?: string[]
  }
  fratraadt?: boolean
  rekkefolge?: number
}

export interface BrregRollerResultat {
  rollegrupper?: Array<{
    type: {
      kode: string
      beskrivelse: string
    }
    roller: BrregRolle[]
  }>
}

// Organisasjonsformer som er relevante for sameier og borettslag
export const RELEVANTE_ORGFORMER = {
  SAM: 'Tingsrettslig sameie',
  BRL: 'Borettslag',
  ESEK: 'Eierseksjonssameie',
  BBL: 'Boligbyggelag',
}

export interface BrregSokParams {
  navn?: string
  organisasjonsform?: string | string[]
  postnummer?: string | string[]
  kommunenummer?: string
  naeringskode?: string
  fraAntallAnsatte?: number
  tilAntallAnsatte?: number
  konkurs?: boolean
  size?: number
  page?: number
}

const BRREG_BASE_URL = 'https://data.brreg.no/enhetsregisteret/api'

export async function sokEnheter(params: BrregSokParams): Promise<BrregSokResultat> {
  const searchParams = new URLSearchParams()
  
  if (params.navn) {
    searchParams.append('navn', params.navn)
  }
  
  if (params.organisasjonsform) {
    const orgformer = Array.isArray(params.organisasjonsform) 
      ? params.organisasjonsform 
      : [params.organisasjonsform]
    orgformer.forEach(form => searchParams.append('organisasjonsform', form))
  }
  
  if (params.kommunenummer) {
    searchParams.append('kommunenummer', params.kommunenummer)
  }
  
  if (params.naeringskode) {
    searchParams.append('naeringskode', params.naeringskode)
  }
  
  if (params.fraAntallAnsatte !== undefined) {
    searchParams.append('fraAntallAnsatte', params.fraAntallAnsatte.toString())
  }
  
  if (params.tilAntallAnsatte !== undefined) {
    searchParams.append('tilAntallAnsatte', params.tilAntallAnsatte.toString())
  }
  
  if (params.konkurs !== undefined) {
    searchParams.append('konkurs', params.konkurs.toString())
  }
  
  // Pagination
  searchParams.append('size', (params.size || 20).toString())
  if (params.page !== undefined) {
    searchParams.append('page', params.page.toString())
  }

  const url = `${BRREG_BASE_URL}/enheter?${searchParams.toString()}`
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  })
  
  if (!response.ok) {
    throw new Error(`BRREG API feil: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

export async function hentEnhet(organisasjonsnummer: string): Promise<BrregEnhet> {
  const url = `${BRREG_BASE_URL}/enheter/${organisasjonsnummer}`
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  })
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Organisasjon med nummer ${organisasjonsnummer} ble ikke funnet`)
    }
    throw new Error(`BRREG API feil: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

export async function hentRoller(organisasjonsnummer: string): Promise<BrregRollerResultat> {
  const url = `${BRREG_BASE_URL}/enheter/${organisasjonsnummer}/roller`
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  })
  
  if (!response.ok) {
    if (response.status === 404) {
      return { rollegrupper: [] }
    }
    throw new Error(`BRREG API feil: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

// Hjelpefunksjon for å hente styreleder fra roller
export function finnStyreleder(roller: BrregRollerResultat): string | null {
  if (!roller.rollegrupper) return null
  
  for (const gruppe of roller.rollegrupper) {
    if (gruppe.type.kode === 'STYR' || gruppe.type.beskrivelse?.toLowerCase().includes('styre')) {
      for (const rolle of gruppe.roller) {
        if (rolle.type.kode === 'LEDE' || rolle.type.beskrivelse?.toLowerCase().includes('styreleder')) {
          if (rolle.person?.navn) {
            const { fornavn, mellomnavn, etternavn } = rolle.person.navn
            return [fornavn, mellomnavn, etternavn].filter(Boolean).join(' ')
          }
        }
      }
    }
  }
  
  return null
}

// Hjelpefunksjon for å hente daglig leder fra roller
export function finnDagligLeder(roller: BrregRollerResultat): string | null {
  if (!roller.rollegrupper) return null
  
  for (const gruppe of roller.rollegrupper) {
    for (const rolle of gruppe.roller) {
      if (rolle.type.kode === 'DAGL' || rolle.type.beskrivelse?.toLowerCase().includes('daglig leder')) {
        if (rolle.person?.navn) {
          const { fornavn, mellomnavn, etternavn } = rolle.person.navn
          return [fornavn, mellomnavn, etternavn].filter(Boolean).join(' ')
        }
      }
    }
  }
  
  return null
}

// Søk etter sameier og borettslag
export async function sokSameierOgBorettslag(params: {
  kommunenummer?: string
  navn?: string
  inkluderSameier?: boolean
  inkluderBorettslag?: boolean
  inkluderEierseksjonssameier?: boolean
  size?: number
  page?: number
}): Promise<BrregSokResultat> {
  const orgformer: string[] = []
  
  if (params.inkluderSameier !== false) {
    orgformer.push('SAM')
  }
  if (params.inkluderBorettslag !== false) {
    orgformer.push('BRL')
  }
  if (params.inkluderEierseksjonssameier !== false) {
    orgformer.push('ESEK')
  }
  
  return sokEnheter({
    navn: params.navn,
    organisasjonsform: orgformer,
    kommunenummer: params.kommunenummer,
    konkurs: false,
    size: params.size,
    page: params.page,
  })
}

// Konverter BRREG-enhet til format for salgs_leads tabell
export function konverterTilLead(enhet: BrregEnhet, roller?: BrregRollerResultat) {
  const adresse = enhet.forretningsadresse || enhet.postadresse
  
  return {
    organisasjonsnummer: enhet.organisasjonsnummer,
    navn: enhet.navn,
    organisasjonsform: enhet.organisasjonsform?.kode || null,
    organisasjonsform_beskrivelse: enhet.organisasjonsform?.beskrivelse || null,
    forretningsadresse_gate: adresse?.adresse?.join(', ') || null,
    forretningsadresse_postnummer: adresse?.postnummer || null,
    forretningsadresse_poststed: adresse?.poststed || null,
    forretningsadresse_kommune: adresse?.kommune || null,
    forretningsadresse_land: adresse?.land || 'Norge',
    epost: enhet.epostadresse || null,
    telefon: enhet.telefon || null,
    hjemmeside: enhet.hjemmeside || null,
    stiftelsesdato: enhet.stiftelsesdato || null,
    antall_ansatte: enhet.antallAnsatte || null,
    naeringskode_1: enhet.naeringskode1?.kode || null,
    naeringskode_1_beskrivelse: enhet.naeringskode1?.beskrivelse || null,
    daglig_leder: roller ? finnDagligLeder(roller) : null,
    styreleder: roller ? finnStyreleder(roller) : null,
    kilde: 'brreg',
  }
}

// Liste over kommuner i Norge (forenklet - de største)
export const KOMMUNER = [
  { nummer: '0301', navn: 'Oslo' },
  { nummer: '4601', navn: 'Bergen' },
  { nummer: '5001', navn: 'Trondheim' },
  { nummer: '1103', navn: 'Stavanger' },
  { nummer: '3005', navn: 'Drammen' },
  { nummer: '3024', navn: 'Bærum' },
  { nummer: '3025', navn: 'Asker' },
  { nummer: '3030', navn: 'Lillestrøm' },
  { nummer: '3004', navn: 'Fredrikstad' },
  { nummer: '3003', navn: 'Sarpsborg' },
  { nummer: '1106', navn: 'Haugesund' },
  { nummer: '1149', navn: 'Karmøy' },
  { nummer: '4204', navn: 'Kristiansand' },
  { nummer: '1507', navn: 'Ålesund' },
  { nummer: '1804', navn: 'Bodø' },
  { nummer: '5401', navn: 'Tromsø' },
  { nummer: '3007', navn: 'Ringerike' },
  { nummer: '3033', navn: 'Ullensaker' },
  { nummer: '3032', navn: 'Nes' },
  { nummer: '3034', navn: 'Eidsvoll' },
]

// Postnummerområder (forenklet)
export const POSTNUMMER_OMRADER = [
  { fra: '0001', til: '0999', navn: 'Oslo' },
  { fra: '1000', til: '1999', navn: 'Akershus/Østfold' },
  { fra: '2000', til: '2999', navn: 'Innlandet' },
  { fra: '3000', til: '3999', navn: 'Buskerud/Vestfold' },
  { fra: '4000', til: '4999', navn: 'Agder/Rogaland' },
  { fra: '5000', til: '5999', navn: 'Vestland' },
  { fra: '6000', til: '6999', navn: 'Møre og Romsdal' },
  { fra: '7000', til: '7999', navn: 'Trøndelag' },
  { fra: '8000', til: '8999', navn: 'Nordland' },
  { fra: '9000', til: '9999', navn: 'Troms og Finnmark' },
]
