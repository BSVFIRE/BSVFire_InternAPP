/**
 * Dropbox Service V2 - Bruker Supabase Edge Function for sikker token-håndtering
 * Alle brukere deler samme Dropbox-tilkobling via backend
 */

import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'

const log = createLogger('DropboxServiceV2')

// Edge function URL
const DROPBOX_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-api`

interface DropboxStatus {
  connected: boolean
  connected_by: string | null
  connected_at: string | null
}

interface DropboxResponse {
  success?: boolean
  error?: string
  path?: string
  size?: number
  auth_url?: string
}

/**
 * Kaller Dropbox Edge Function
 */
async function callDropboxFunction(action: string, params: Record<string, any> = {}): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('Ikke innlogget')
  }

  try {
    const response = await fetch(DROPBOX_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...params }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error: any) {
    // Håndter nettverksfeil
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Nettverksfeil - kunne ikke nå Dropbox-tjenesten')
    }
    throw error
  }
}

/**
 * Sjekker om Dropbox er konfigurert (delt tilkobling)
 */
export async function checkDropboxStatus(): Promise<DropboxStatus> {
  try {
    const data = await callDropboxFunction('check_status')
    return {
      connected: data.connected,
      connected_by: data.connected_by,
      connected_at: data.connected_at,
    }
  } catch (error) {
    log.error('Feil ved sjekk av Dropbox-status', { error })
    return { connected: false, connected_by: null, connected_at: null }
  }
}

/**
 * Sjekker om Dropbox er konfigurert (synkron versjon for UI)
 * Bruker cached status fra database
 */
export async function isDropboxConfigured(): Promise<boolean> {
  const status = await checkDropboxStatus()
  return status.connected
}

/**
 * Henter OAuth URL for å starte tilkobling
 */
export async function getDropboxAuthUrl(): Promise<string> {
  const redirectUri = `${window.location.origin}/dropbox-callback`
  const data = await callDropboxFunction('get_auth_url', { redirect_uri: redirectUri })
  return data.auth_url
}

/**
 * Starter Dropbox OAuth-flyt
 */
export async function startDropboxAuth(): Promise<void> {
  const authUrl = await getDropboxAuthUrl()
  window.location.href = authUrl
}

/**
 * Håndterer OAuth callback - lagrer tokens via Edge Function
 */
export async function handleDropboxCallback(code: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const redirectUri = `${window.location.origin}/dropbox-callback`
    
    await callDropboxFunction('oauth_callback', {
      code,
      redirect_uri: redirectUri,
      user_email: user?.email || 'unknown',
    })
    
    log.info('Dropbox tilkobling vellykket')
    return true
  } catch (error) {
    log.error('Feil ved Dropbox callback', { error })
    return false
  }
}

/**
 * Kobler fra Dropbox
 */
export async function disconnectDropbox(): Promise<boolean> {
  try {
    await callDropboxFunction('disconnect')
    log.info('Dropbox frakoblet')
    return true
  } catch (error) {
    log.error('Feil ved frakobling av Dropbox', { error })
    return false
  }
}

/**
 * Oppretter mappe i Dropbox
 */
export async function createDropboxFolder(path: string): Promise<boolean> {
  try {
    log.debug('Oppretter Dropbox-mappe', { path })
    await callDropboxFunction('create_folder', { path })
    log.debug('Dropbox-mappe opprettet', { path })
    return true
  } catch (error: any) {
    // Ignorer hvis mappen allerede eksisterer
    if (error.message?.includes('path/conflict')) {
      log.debug('Dropbox-mappe eksisterer allerede', { path })
      return true
    }
    log.error('Feil ved opprettelse av mappe', { error: error.message, path })
    return false
  }
}

/**
 * Laster opp fil til Dropbox
 */
export async function uploadToDropbox(
  filePath: string,
  fileContent: Blob | ArrayBuffer
): Promise<DropboxResponse> {
  try {
    // Konverter til base64
    let base64Content: string
    if (fileContent instanceof Blob) {
      const arrayBuffer = await fileContent.arrayBuffer()
      base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    } else {
      base64Content = btoa(String.fromCharCode(...new Uint8Array(fileContent)))
    }

    const data = await callDropboxFunction('upload_file', {
      path: filePath,
      content: base64Content,
    })

    log.info('Fil lastet opp til Dropbox', { path: data.path, size: data.size })
    
    return {
      success: true,
      path: data.path,
      size: data.size,
    }
  } catch (error: any) {
    log.error('Feil ved opplasting til Dropbox', { error, path: filePath })
    return {
      success: false,
      error: error.message || 'Ukjent feil ved opplasting',
    }
  }
}

/**
 * Bygger Dropbox-mappesti basert på kunde og anlegg
 * @param rapportType - '01_Servicerapport' eller '02_Kontrollrapport'
 */
export function buildDropboxPath(
  kundeNummer: string,
  kundeNavn: string,
  anleggNavn: string,
  fileName: string,
  rapportType: '01_Servicerapport' | '02_Kontrollrapport' = '01_Servicerapport'
): string {
  const safeKundeNavn = kundeNavn
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()

  const safeAnleggNavn = anleggNavn
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()

  const basePath = '/NY MAPPESTRUKTUR 2026/01_KUNDER'
  const kundePath = `${kundeNummer}_${safeKundeNavn}`
  const fullPath = `${basePath}/${kundePath}/02_Bygg/${safeAnleggNavn}/07_Rapporter/${rapportType}/${fileName}`

  return fullPath
}

/**
 * Sørger for at mappe eksisterer
 */
export async function ensureDropboxFolderExists(folderPath: string): Promise<boolean> {
  return createDropboxFolder(folderPath)
}

/**
 * Endrer navn på mappe i Dropbox (flytter fra gammel til ny sti)
 */
export async function renameDropboxFolder(
  fromPath: string,
  toPath: string
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  try {
    const data = await callDropboxFunction('rename_folder', { 
      from_path: fromPath, 
      to_path: toPath 
    })
    
    if (data.skipped) {
      log.info('Dropbox-mappe eksisterte ikke, hopper over', { fromPath })
      return { success: true, skipped: true }
    }
    
    log.info('Dropbox-mappe omdøpt', { from: fromPath, to: data.to_path })
    return { success: true }
  } catch (error: any) {
    log.error('Feil ved omdøping av Dropbox-mappe', { error, fromPath, toPath })
    return { success: false, error: error.message || 'Ukjent feil' }
  }
}

/**
 * Laster opp servicerapport-PDF til riktig kundemappe (01_Servicerapport)
 */
export async function uploadRapportToDropbox(
  kundeNummer: string,
  kundeNavn: string,
  anleggNavn: string,
  fileName: string,
  pdfBlob: Blob
): Promise<DropboxResponse> {
  if (!kundeNummer) {
    return { success: false, error: 'Kundenummer mangler' }
  }
  if (!kundeNavn) {
    return { success: false, error: 'Kundenavn mangler' }
  }
  if (!anleggNavn) {
    return { success: false, error: 'Anleggsnavn mangler' }
  }

  const filePath = buildDropboxPath(kundeNummer, kundeNavn, anleggNavn, fileName, '01_Servicerapport')
  
  // Sørg for at mappen eksisterer
  const folderPath = filePath.substring(0, filePath.lastIndexOf('/'))
  await ensureDropboxFolderExists(folderPath)

  return uploadToDropbox(filePath, pdfBlob)
}

/**
 * Laster opp kontrollrapport-PDF til riktig kundemappe (02_Kontrollrapport)
 */
export async function uploadKontrollrapportToDropbox(
  kundeNummer: string,
  kundeNavn: string,
  anleggNavn: string,
  fileName: string,
  pdfBlob: Blob
): Promise<DropboxResponse> {
  if (!kundeNummer) {
    return { success: false, error: 'Kundenummer mangler' }
  }
  if (!kundeNavn) {
    return { success: false, error: 'Kundenavn mangler' }
  }
  if (!anleggNavn) {
    return { success: false, error: 'Anleggsnavn mangler' }
  }

  const filePath = buildDropboxPath(kundeNummer, kundeNavn, anleggNavn, fileName, '02_Kontrollrapport')
  
  // Sørg for at mappen eksisterer
  const folderPath = filePath.substring(0, filePath.lastIndexOf('/'))
  await ensureDropboxFolderExists(folderPath)

  return uploadToDropbox(filePath, pdfBlob)
}

/**
 * Bygger Dropbox-mappesti for detektorlister
 * Format: /NY MAPPESTRUKTUR 2026/01_KUNDER/{kundenummer}_{kundenavn}/02_Bygg/{anleggsnavn}/02_Brannalarm/02_Detektorliste/{filnavn}
 */
export function buildDetektorlisteDropboxPath(
  kundeNummer: string,
  kundeNavn: string,
  anleggNavn: string,
  fileName: string
): string {
  const safeKundeNavn = kundeNavn
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()

  const safeAnleggNavn = anleggNavn
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()

  const basePath = '/NY MAPPESTRUKTUR 2026/01_KUNDER'
  const kundePath = `${kundeNummer}_${safeKundeNavn}`
  const fullPath = `${basePath}/${kundePath}/02_Bygg/${safeAnleggNavn}/02_Brannalarm/02_Detektorliste/${fileName}`

  return fullPath
}

/**
 * Laster opp detektorliste-PDF til riktig kundemappe (02_Brannalarm/02_Detektorliste)
 */
export async function uploadDetektorlisteToDropbox(
  kundeNummer: string,
  kundeNavn: string,
  anleggNavn: string,
  fileName: string,
  pdfBlob: Blob
): Promise<DropboxResponse> {
  if (!kundeNummer) {
    return { success: false, error: 'Kundenummer mangler' }
  }
  if (!kundeNavn) {
    return { success: false, error: 'Kundenavn mangler' }
  }
  if (!anleggNavn) {
    return { success: false, error: 'Anleggsnavn mangler' }
  }

  const filePath = buildDetektorlisteDropboxPath(kundeNummer, kundeNavn, anleggNavn, fileName)
  
  log.info('Laster opp detektorliste til Dropbox', { filePath, kundeNummer, kundeNavn, anleggNavn })
  
  // Sørg for at mappen eksisterer
  const folderPath = filePath.substring(0, filePath.lastIndexOf('/'))
  await ensureDropboxFolderExists(folderPath)

  return uploadToDropbox(filePath, pdfBlob)
}

/**
 * Interface for Dropbox fil/mappe entry
 */
export interface DropboxEntry {
  '.tag': 'file' | 'folder'
  name: string
  path_lower: string
  path_display: string
  id: string
  client_modified?: string
  server_modified?: string
  size?: number
}

/**
 * Bygger Dropbox-mappesti for et anlegg (hele 02_Bygg-mappen)
 */
export function buildAnleggDropboxPath(
  kundeNummer: string,
  kundeNavn: string,
  anleggNavn: string
): string {
  const safeKundeNavn = kundeNavn
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()

  const safeAnleggNavn = anleggNavn
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()

  const basePath = '/NY MAPPESTRUKTUR 2026/01_KUNDER'
  const kundePath = `${kundeNummer}_${safeKundeNavn}`
  const fullPath = `${basePath}/${kundePath}/02_Bygg/${safeAnleggNavn}`

  return fullPath
}

/**
 * Lister filer og mapper i en Dropbox-mappe
 */
export async function listDropboxFolder(
  path: string,
  recursive: boolean = false
): Promise<{ success: boolean; entries?: DropboxEntry[]; error?: string }> {
  try {
    const data = await callDropboxFunction('list_folder', { path, recursive })
    return {
      success: true,
      entries: data.entries || []
    }
  } catch (error: any) {
    log.error('Feil ved listing av Dropbox-mappe', { error, path })
    return {
      success: false,
      error: error.message || 'Ukjent feil'
    }
  }
}

/**
 * Henter midlertidig nedlastingslenke for en fil
 */
export async function getDropboxDownloadLink(
  path: string
): Promise<{ success: boolean; link?: string; error?: string }> {
  try {
    const data = await callDropboxFunction('get_temporary_link', { path })
    return {
      success: true,
      link: data.link
    }
  } catch (error: any) {
    log.error('Feil ved henting av nedlastingslenke', { error, path })
    return {
      success: false,
      error: error.message || 'Ukjent feil'
    }
  }
}

/**
 * Lister alle filer for et anlegg fra Dropbox (rekursivt)
 */
export async function listAnleggDropboxFiles(
  kundeNummer: string,
  kundeNavn: string,
  anleggNavn: string
): Promise<{ success: boolean; entries?: DropboxEntry[]; error?: string }> {
  const anleggPath = buildAnleggDropboxPath(kundeNummer, kundeNavn, anleggNavn)
  log.info('Lister Dropbox-filer for anlegg', { anleggPath })
  return listDropboxFolder(anleggPath, true)
}

// Re-export for bakoverkompatibilitet
export { checkDropboxStatus as getDropboxStatus }
