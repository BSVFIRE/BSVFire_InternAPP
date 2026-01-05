import { Dropbox, DropboxAuth } from 'dropbox'
import { createLogger } from '@/lib/logger'

const log = createLogger('DropboxService')

// Storage keys
const DROPBOX_ACCESS_TOKEN_KEY = 'dropbox_access_token'
const DROPBOX_REFRESH_TOKEN_KEY = 'dropbox_refresh_token'
const DROPBOX_TOKEN_EXPIRY_KEY = 'dropbox_token_expiry'

// Dropbox client singleton
let dropboxClient: Dropbox | null = null
let dropboxAuth: DropboxAuth | null = null

function getDropboxAuth(): DropboxAuth {
  if (!dropboxAuth) {
    const clientId = import.meta.env.VITE_DROPBOX_APP_KEY
    const clientSecret = import.meta.env.VITE_DROPBOX_APP_SECRET
    
    if (!clientId) {
      throw new Error('VITE_DROPBOX_APP_KEY er ikke konfigurert')
    }
    
    dropboxAuth = new DropboxAuth({
      clientId,
      clientSecret,
    })
  }
  return dropboxAuth
}

/**
 * Sjekker om vi har en gyldig Dropbox-token lagret
 */
export function hasValidDropboxToken(): boolean {
  const accessToken = localStorage.getItem(DROPBOX_ACCESS_TOKEN_KEY)
  const expiry = localStorage.getItem(DROPBOX_TOKEN_EXPIRY_KEY)
  
  if (!accessToken) return false
  
  // Sjekk om token er utløpt (med 5 min buffer)
  if (expiry) {
    const expiryTime = parseInt(expiry, 10)
    if (Date.now() > expiryTime - 5 * 60 * 1000) {
      return false
    }
  }
  
  return true
}

/**
 * Starter OAuth2-flyten - åpner Dropbox login
 * Bruker authorization code flow
 */
export async function startDropboxAuth(): Promise<void> {
  const clientId = import.meta.env.VITE_DROPBOX_APP_KEY
  const redirectUri = `${window.location.origin}/dropbox-callback`
  
  // Bruk code flow
  const authUrl = `https://www.dropbox.com/oauth2/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `token_access_type=offline`
  
  window.location.href = authUrl
}

/**
 * Håndterer callback fra Dropbox OAuth (code flow)
 * Code kommer i URL query params (?code=...)
 */
export async function handleDropboxCallback(code: string): Promise<boolean> {
  try {
    const clientId = import.meta.env.VITE_DROPBOX_APP_KEY
    const clientSecret = import.meta.env.VITE_DROPBOX_APP_SECRET
    const redirectUri = `${window.location.origin}/dropbox-callback`
    
    // Bytt code mot access token
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      log.error('Feil ved token-utveksling', { status: response.status, error: errorText })
      return false
    }
    
    const data = await response.json()
    
    // Lagre tokens
    localStorage.setItem(DROPBOX_ACCESS_TOKEN_KEY, data.access_token)
    
    if (data.refresh_token) {
      localStorage.setItem(DROPBOX_REFRESH_TOKEN_KEY, data.refresh_token)
    }
    
    if (data.expires_in) {
      const expiryTime = Date.now() + data.expires_in * 1000
      localStorage.setItem(DROPBOX_TOKEN_EXPIRY_KEY, expiryTime.toString())
    }
    
    // Reset client så den bruker ny token
    dropboxClient = null
    
    log.info('Dropbox autentisering vellykket')
    return true
  } catch (error) {
    log.error('Feil ved Dropbox callback', { error })
    return false
  }
}

/**
 * Fornyer access token med refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem(DROPBOX_REFRESH_TOKEN_KEY)
  if (!refreshToken) {
    log.warn('Ingen refresh token tilgjengelig')
    return false
  }
  
  try {
    const auth = getDropboxAuth()
    auth.setRefreshToken(refreshToken)
    
    await auth.refreshAccessToken()
    
    const accessToken = auth.getAccessToken()
    if (accessToken) {
      localStorage.setItem(DROPBOX_ACCESS_TOKEN_KEY, accessToken)
      
      // Sett ny expiry (4 timer)
      const expiryTime = Date.now() + 4 * 60 * 60 * 1000
      localStorage.setItem(DROPBOX_TOKEN_EXPIRY_KEY, expiryTime.toString())
      
      // Reset client
      dropboxClient = null
      
      log.info('Dropbox token fornyet')
      return true
    }
  } catch (error) {
    log.error('Feil ved fornyelse av Dropbox token', { error })
  }
  
  return false
}

/**
 * Logger ut fra Dropbox
 */
export function logoutDropbox(): void {
  localStorage.removeItem(DROPBOX_ACCESS_TOKEN_KEY)
  localStorage.removeItem(DROPBOX_REFRESH_TOKEN_KEY)
  localStorage.removeItem(DROPBOX_TOKEN_EXPIRY_KEY)
  dropboxClient = null
  log.info('Logget ut fra Dropbox')
}

/**
 * Resetter Dropbox-klienten (for å tvinge ny namespace-henting)
 */
export function resetDropboxClient(): void {
  dropboxClient = null
}

async function getDropboxClient(): Promise<Dropbox> {
  // Sjekk først om vi har en static token (for bakoverkompatibilitet)
  const staticToken = import.meta.env.VITE_DROPBOX_ACCESS_TOKEN
  if (staticToken) {
    if (!dropboxClient) {
      dropboxClient = new Dropbox({ accessToken: staticToken })
    }
    return dropboxClient
  }
  
  // Bruk OAuth tokens
  let accessToken = localStorage.getItem(DROPBOX_ACCESS_TOKEN_KEY)
  
  if (!accessToken) {
    throw new Error('Ikke logget inn i Dropbox. Klikk "Koble til Dropbox" først.')
  }
  
  // Sjekk om token trenger fornyelse
  if (!hasValidDropboxToken()) {
    const refreshed = await refreshAccessToken()
    if (!refreshed) {
      throw new Error('Dropbox-token utløpt. Vennligst logg inn på nytt.')
    }
    accessToken = localStorage.getItem(DROPBOX_ACCESS_TOKEN_KEY)
  }
  
  if (!dropboxClient && accessToken) {
    dropboxClient = new Dropbox({ accessToken })
    
    // Hent root namespace for team space
    try {
      const account = await dropboxClient.usersGetCurrentAccount()
      const rootNamespaceId = account.result.root_info.root_namespace_id
      
      // Opprett ny klient med riktig path root for team space
      dropboxClient = new Dropbox({
        accessToken,
        pathRoot: JSON.stringify({ ".tag": "namespace_id", "namespace_id": rootNamespaceId })
      })
      
      log.info('Dropbox klient opprettet med team namespace', { rootNamespaceId })
    } catch (error) {
      log.warn('Kunne ikke hente team namespace, bruker standard', { error })
      // Fortsett med standard klient
    }
  }
  
  return dropboxClient!
}

/**
 * Bygger Dropbox-mappesti basert på kunde og anlegg
 * Format: /NY MAPPESTRUKTUR 2026/01_KUNDER/{kunde_nummer}_{kunde_navn}/02_Bygg/{anlegg_navn}/07_Rapporter/01_Servicerapport
 */
export function buildDropboxPath(
  kundeNummer: string, 
  kundeNavn: string,
  anleggNavn: string, 
  fileName: string
): string {
  // Sanitize navn for filsystem (fjern ugyldige tegn)
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
  const fullPath = `${basePath}/${kundePath}/02_Bygg/${safeAnleggNavn}/07_Rapporter/01_Servicerapport/${fileName}`
  
  return fullPath
}

/**
 * Laster opp en fil til Dropbox
 */
export async function uploadToDropbox(
  filePath: string,
  fileContent: Blob | ArrayBuffer
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const client = await getDropboxClient()
    
    log.info('Laster opp til Dropbox', { path: filePath })
    
    // Konverter Blob til ArrayBuffer hvis nødvendig
    let content: ArrayBuffer
    if (fileContent instanceof Blob) {
      content = await fileContent.arrayBuffer()
    } else {
      content = fileContent
    }
    
    const response = await client.filesUpload({
      path: filePath,
      contents: content,
      mode: { '.tag': 'overwrite' }, // Overskriv hvis filen eksisterer
      autorename: false,
    })
    
    log.info('Fil lastet opp til Dropbox', { 
      path: response.result.path_display,
      size: response.result.size 
    })
    
    return { 
      success: true, 
      path: response.result.path_display || filePath 
    }
  } catch (error: any) {
    log.error('Feil ved opplasting til Dropbox', { error, path: filePath })
    
    // Håndter spesifikke feil
    if (error?.error?.error_summary?.includes('path/not_found')) {
      return { 
        success: false, 
        error: `Mappen finnes ikke i Dropbox. Sjekk at mappestien er korrekt: ${filePath}` 
      }
    }
    
    return { 
      success: false, 
      error: error?.message || 'Ukjent feil ved opplasting til Dropbox' 
    }
  }
}

/**
 * Sjekker om en mappe eksisterer i Dropbox, og oppretter den hvis ikke
 */
export async function ensureDropboxFolderExists(folderPath: string): Promise<boolean> {
  try {
    const client = await getDropboxClient()
    
    // Prøv å hente metadata for mappen
    try {
      await client.filesGetMetadata({ path: folderPath })
      return true // Mappen eksisterer
    } catch (error: any) {
      // Mappen eksisterer ikke, opprett den
      if (error?.error?.error_summary?.includes('path/not_found')) {
        log.info('Oppretter mappe i Dropbox', { path: folderPath })
        
        await client.filesCreateFolderV2({ 
          path: folderPath,
          autorename: false 
        })
        
        return true
      }
      throw error
    }
  } catch (error) {
    log.error('Feil ved sjekk/opprettelse av Dropbox-mappe', { error, path: folderPath })
    return false
  }
}

/**
 * Laster opp en rapport-PDF til riktig kundemappe i Dropbox
 */
export async function uploadRapportToDropbox(
  kundeNummer: string,
  kundeNavn: string,
  anleggNavn: string,
  fileName: string,
  pdfBlob: Blob
): Promise<{ success: boolean; path?: string; error?: string }> {
  if (!kundeNummer) {
    return { success: false, error: 'Kundenummer mangler - kan ikke laste opp til Dropbox' }
  }
  
  if (!kundeNavn) {
    return { success: false, error: 'Kundenavn mangler - kan ikke laste opp til Dropbox' }
  }
  
  if (!anleggNavn) {
    return { success: false, error: 'Anleggsnavn mangler - kan ikke laste opp til Dropbox' }
  }
  
  const filePath = buildDropboxPath(kundeNummer, kundeNavn, anleggNavn, fileName)
  
  // Sørg for at mappen eksisterer
  const folderPath = filePath.substring(0, filePath.lastIndexOf('/'))
  const folderExists = await ensureDropboxFolderExists(folderPath)
  
  if (!folderExists) {
    log.warn('Kunne ikke opprette mappe, prøver opplasting likevel', { folderPath })
  }
  
  return uploadToDropbox(filePath, pdfBlob)
}

/**
 * Sjekker om Dropbox er konfigurert (enten med static token eller OAuth)
 */
export function isDropboxConfigured(): boolean {
  // Sjekk static token først
  if (import.meta.env.VITE_DROPBOX_ACCESS_TOKEN) {
    return true
  }
  
  // Sjekk om OAuth er konfigurert
  if (import.meta.env.VITE_DROPBOX_APP_KEY) {
    // Sjekk om vi har en gyldig token lagret
    return hasValidDropboxToken()
  }
  
  return false
}

/**
 * Sjekker om Dropbox OAuth er tilgjengelig (app key konfigurert)
 */
export function isDropboxOAuthAvailable(): boolean {
  return !!import.meta.env.VITE_DROPBOX_APP_KEY
}
