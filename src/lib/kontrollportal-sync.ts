/**
 * Synkroniserer anlegg til Kontrollportal
 */

// Bruk produksjons-URL som standard, eller lokal URL hvis satt
const KONTROLLPORTAL_API_URL = import.meta.env.VITE_KONTROLLPORTAL_API_URL || 'https://kontrollportal.vercel.app'
const KONTROLLPORTAL_API_KEY = import.meta.env.VITE_KONTROLLPORTAL_API_KEY

export async function syncAnleggToKontrollportal(anleggsnavn: string, adresse: string | null) {
  if (!KONTROLLPORTAL_API_KEY) {
    console.warn('⚠️ KONTROLLPORTAL_API_KEY ikke satt - hopper over synkronisering')
    return { success: false, error: 'API key mangler' }
  }

  console.log('🔄 Synkroniserer til Kontrollportal:', KONTROLLPORTAL_API_URL)

  try {
    const response = await fetch(`${KONTROLLPORTAL_API_URL}/api/anlegg/opprett-fra-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KONTROLLPORTAL_API_KEY
      },
      body: JSON.stringify({
        navn: anleggsnavn,
        adresse: adresse
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Feil ved synkronisering')
    }

    return { success: true, data }
  } catch (error) {
    console.error('Feil ved synkronisering til Kontrollportal:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Ukjent feil' 
    }
  }
}
