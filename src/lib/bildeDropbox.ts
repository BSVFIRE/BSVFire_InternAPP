/**
 * Kopi av anleggsbilder til Dropbox-mappen 99_Foto.
 *
 * Supabase er originalen – det er derfra rapporten og bildebanken henter. Dropbox
 * er kopien som gjør at bildene ligger sammen med resten av anleggets papirer.
 * Feiler kopien er bildet like fullt trygt, så den skal ikke velte noe; den logges
 * i stedet, så mønstre dukker opp i systemloggen.
 */
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { checkDropboxStatus, uploadFotoToDropbox } from '@/services/dropboxServiceV2'

const log = createLogger('Bildekopi')

interface Anleggsinfo {
  kundeNummer: string | null
  kundeNavn: string | null
  anleggNavn: string | null
}

// Samme anlegg får mange bilder i samme økt – slå det opp én gang
const infoCache = new Map<string, Anleggsinfo>()

async function hentAnleggsinfo(anleggId: string): Promise<Anleggsinfo | null> {
  const lagret = infoCache.get(anleggId)
  if (lagret) return lagret

  const { data } = await supabase
    .from('anlegg')
    .select('anleggsnavn, customer:kundenr(navn, kunde_nummer)')
    .eq('id', anleggId)
    .single()
  if (!data) return null

  const kunde = (data as unknown as { customer: { navn: string | null; kunde_nummer: string | null } | null }).customer
  const info: Anleggsinfo = {
    kundeNummer: kunde?.kunde_nummer ?? null,
    kundeNavn: kunde?.navn ?? null,
    anleggNavn: data.anleggsnavn ?? null,
  }
  infoCache.set(anleggId, info)
  return info
}

/**
 * Legger bildet i anleggets 99_Foto-mappe. Kalles etter at bildet er lagret i
 * Supabase, og venter ikke på svar fra den som kaller.
 */
export async function kopierBildeTilDropbox(anleggId: string, filnavn: string, bilde: Blob): Promise<void> {
  try {
    if (!(await checkDropboxStatus()).connected) return

    const info = await hentAnleggsinfo(anleggId)
    if (!info?.kundeNummer || !info.kundeNavn || !info.anleggNavn) {
      log.warn('Bildet ble ikke kopiert til Dropbox', { anleggId, grunn: 'Kunden mangler kundenummer eller navn' })
      return
    }

    const res = await uploadFotoToDropbox(info.kundeNummer, info.kundeNavn, info.anleggNavn, filnavn, bilde)
    if (!res.success) log.warn('Bildet ble ikke kopiert til Dropbox', { anleggId, filnavn, error: res.error })
  } catch (error) {
    log.warn('Bildet ble ikke kopiert til Dropbox', { anleggId, filnavn, error })
  }
}
