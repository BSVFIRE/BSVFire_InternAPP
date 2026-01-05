/**
 * Dropbox mappestruktur-mal for kunder og anlegg
 */

// Kunde-nivå mapper (inne i {kundenr}_{kundenavn}/)
export const KUNDE_FOLDERS = [
  '01_Avtaler',
  '01_Avtaler/01_Serviceavtale',
  '01_Avtaler/02_Alarmoverføring',
  '02_Bygg',
  '03_FDV',
  '04_Faktura',
  '99_Korrespondanse',
]

// Anlegg-nivå mapper (inne i 02_Bygg/{anleggsnavn}/)
export const ANLEGG_FOLDERS = [
  '01_Tegninger',
  '01_Tegninger/01_Pågående',
  '01_Tegninger/01_Pågående/DWG',
  '01_Tegninger/01_Pågående/RVT',
  '01_Tegninger/01_Pågående/PDF',
  '01_Tegninger/02_Fullført',
  '01_Tegninger/02_Fullført/DWG',
  '01_Tegninger/02_Fullført/RVT',
  '01_Tegninger/02_Fullført/PDF',
  '01_Tegninger/99_Arkiv',
  '02_Brannalarm',
  '02_Brannalarm/01_Konfig',
  '02_Brannalarm/01_Konfig/01_Siste konfigurasjon',
  '02_Brannalarm/01_Konfig/99_Arkiv',
  '02_Brannalarm/02_Detektorliste',
  '02_Brannalarm/03_Prosjekteringsunderlag',
  '02_Brannalarm/04_Brannkonsept',
  '02_Brannalarm/05_Alarmorganisering',
  '03_Nødlys',
  '04_Brannslukkeutstyr',
  '05_Røykluker',
  '06_Ekstern',
  '07_Rapporter',
  '07_Rapporter/01_Servicerapport',
  '07_Rapporter/02_Kontrollrapport',
  '99_Foto',
]

import { createLogger } from '@/lib/logger'

const log = createLogger('DropboxFolderStructure')

// Import Dropbox functions
import { Dropbox } from 'dropbox'

const DROPBOX_ACCESS_TOKEN_KEY = 'dropbox_access_token'

async function getDropboxClientForFolders(): Promise<Dropbox | null> {
  const accessToken = localStorage.getItem(DROPBOX_ACCESS_TOKEN_KEY)
  if (!accessToken) return null
  
  const client = new Dropbox({ accessToken })
  
  // Hent root namespace for team space
  try {
    const account = await client.usersGetCurrentAccount()
    const rootNamespaceId = account.result.root_info.root_namespace_id
    
    return new Dropbox({
      accessToken,
      pathRoot: JSON.stringify({ ".tag": "namespace_id", "namespace_id": rootNamespaceId })
    })
  } catch (error) {
    log.warn('Kunne ikke hente team namespace', { error })
    return client
  }
}

/**
 * Oppretter en mappe i Dropbox (ignorerer feil hvis den allerede eksisterer)
 */
async function createFolderIfNotExists(client: Dropbox, path: string): Promise<boolean> {
  try {
    await client.filesCreateFolderV2({ path, autorename: false })
    return true
  } catch (error: any) {
    // Ignorer feil hvis mappen allerede eksisterer
    if (error?.error?.error_summary?.includes('path/conflict/folder')) {
      return true
    }
    log.warn('Kunne ikke opprette mappe', { path, error: error?.message })
    return false
  }
}

/**
 * Oppretter mappestruktur for en kunde
 */
export async function createKundeFolderStructure(
  kundeNummer: string,
  kundeNavn: string,
  onProgress?: (message: string, current: number, total: number) => void
): Promise<{ success: boolean; created: number; errors: string[] }> {
  const client = await getDropboxClientForFolders()
  if (!client) {
    return { success: false, created: 0, errors: ['Ikke koblet til Dropbox'] }
  }
  
  const safeKundeNavn = kundeNavn
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
  
  const basePath = `/NY MAPPESTRUKTUR 2026/01_KUNDER/${kundeNummer}_${safeKundeNavn}`
  const errors: string[] = []
  let created = 0
  const total = KUNDE_FOLDERS.length
  
  log.info('Oppretter kunde-mappestruktur', { kundeNummer, kundeNavn, basePath })
  
  for (let i = 0; i < KUNDE_FOLDERS.length; i++) {
    const folder = KUNDE_FOLDERS[i]
    const fullPath = `${basePath}/${folder}`
    
    onProgress?.(`Oppretter ${folder}...`, i + 1, total)
    
    const success = await createFolderIfNotExists(client, fullPath)
    if (success) {
      created++
    } else {
      errors.push(folder)
    }
  }
  
  log.info('Kunde-mappestruktur opprettet', { created, errors: errors.length })
  
  return {
    success: errors.length === 0,
    created,
    errors
  }
}

/**
 * Oppretter mappestruktur for et anlegg
 */
export async function createAnleggFolderStructure(
  kundeNummer: string,
  kundeNavn: string,
  anleggNavn: string,
  onProgress?: (message: string, current: number, total: number) => void
): Promise<{ success: boolean; created: number; errors: string[] }> {
  const client = await getDropboxClientForFolders()
  if (!client) {
    return { success: false, created: 0, errors: ['Ikke koblet til Dropbox'] }
  }
  
  const safeKundeNavn = kundeNavn
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
  
  const safeAnleggNavn = anleggNavn
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
  
  const basePath = `/NY MAPPESTRUKTUR 2026/01_KUNDER/${kundeNummer}_${safeKundeNavn}/02_Bygg/${safeAnleggNavn}`
  const errors: string[] = []
  let created = 0
  const total = ANLEGG_FOLDERS.length
  
  log.info('Oppretter anlegg-mappestruktur', { kundeNummer, anleggNavn, basePath })
  
  for (let i = 0; i < ANLEGG_FOLDERS.length; i++) {
    const folder = ANLEGG_FOLDERS[i]
    const fullPath = `${basePath}/${folder}`
    
    onProgress?.(`Oppretter ${folder}...`, i + 1, total)
    
    const success = await createFolderIfNotExists(client, fullPath)
    if (success) {
      created++
    } else {
      errors.push(folder)
    }
  }
  
  log.info('Anlegg-mappestruktur opprettet', { created, errors: errors.length })
  
  return {
    success: errors.length === 0,
    created,
    errors
  }
}

/**
 * Oppretter full mappestruktur for en kunde med alle anlegg
 */
export async function createFullKundeStructure(
  kundeNummer: string,
  kundeNavn: string,
  anleggListe: string[],
  onProgress?: (message: string, current: number, total: number) => void
): Promise<{ success: boolean; kundeCreated: number; anleggCreated: number; errors: string[] }> {
  const allErrors: string[] = []
  let kundeCreated = 0
  let anleggCreated = 0
  
  const totalSteps = KUNDE_FOLDERS.length + (anleggListe.length * ANLEGG_FOLDERS.length)
  let currentStep = 0
  
  // Opprett kunde-mapper
  const kundeResult = await createKundeFolderStructure(
    kundeNummer,
    kundeNavn,
    (message, current, _total) => {
      currentStep = current
      onProgress?.(message, currentStep, totalSteps)
    }
  )
  kundeCreated = kundeResult.created
  allErrors.push(...kundeResult.errors.map(e => `Kunde: ${e}`))
  
  // Opprett anlegg-mapper
  for (const anleggNavn of anleggListe) {
    const anleggResult = await createAnleggFolderStructure(
      kundeNummer,
      kundeNavn,
      anleggNavn,
      (msg, current, _total) => {
        currentStep = KUNDE_FOLDERS.length + (anleggListe.indexOf(anleggNavn) * ANLEGG_FOLDERS.length) + current
        onProgress?.(`${anleggNavn}: ${msg}`, currentStep, totalSteps)
      }
    )
    anleggCreated += anleggResult.created
    allErrors.push(...anleggResult.errors.map(e => `${anleggNavn}: ${e}`))
  }
  
  return {
    success: allErrors.length === 0,
    kundeCreated,
    anleggCreated,
    errors: allErrors
  }
}
