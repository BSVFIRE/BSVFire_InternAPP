import { supabase } from './supabase'

interface TelegramNotificationParams {
  type: 'ordre' | 'oppgave' | 'melding'
  tekniker_id: string
  title: string
  message: string
  link?: string
}

/**
 * Send Telegram-varsel til en tekniker
 */
export async function sendTelegramNotification(params: TelegramNotificationParams): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-telegram-notification', {
      body: params
    })

    if (error) {
      console.error('Feil ved sending av Telegram-varsel:', error)
      return { success: false, error: error.message }
    }

    return data
  } catch (err) {
    console.error('Uventet feil ved Telegram-varsel:', err)
    return { success: false, error: 'Kunne ikke sende varsel' }
  }
}

/**
 * Send varsel om ny ordre til tekniker
 */
export async function notifyNewOrdre(tekniker_id: string, ordreNummer: string, kundeNavn: string, anleggsNavn: string, baseUrl: string = window.location.origin) {
  return sendTelegramNotification({
    type: 'ordre',
    tekniker_id,
    title: `Ordre ${ordreNummer}`,
    message: `Du er tildelt en ny ordre.\n\nKunde: ${kundeNavn}\nAnlegg: ${anleggsNavn}`,
    link: `${baseUrl}/ordre/${ordreNummer}`
  })
}

/**
 * Send varsel om ny oppgave til tekniker
 */
export async function notifyNewOppgave(
  tekniker_id: string, 
  oppgaveTittel: string, 
  beskrivelse: string, 
  forfallsdato?: string,
  kundeNavn?: string,
  anleggsNavn?: string
) {
  let message = `Du har fått en ny oppgave.`
  
  if (kundeNavn || anleggsNavn) {
    message += '\n'
    if (kundeNavn) message += `\nKunde: ${kundeNavn}`
    if (anleggsNavn) message += `\nAnlegg: ${anleggsNavn}`
  }
  
  if (beskrivelse) {
    message += `\n\n${beskrivelse}`
  }
  
  if (forfallsdato) {
    message += `\n\nForfallsdato: ${new Date(forfallsdato).toLocaleDateString('nb-NO')}`
  }

  return sendTelegramNotification({
    type: 'oppgave',
    tekniker_id,
    title: oppgaveTittel,
    message
  })
}

/**
 * Send varsel om ny melding til tekniker
 */
export async function notifyNewMelding(
  tekniker_id: string, 
  avsender: string, 
  meldingTekst: string,
  kundeNavn?: string,
  anleggsNavn?: string
) {
  let message = ''
  
  if (kundeNavn || anleggsNavn) {
    if (kundeNavn) message += `Kunde: ${kundeNavn}\n`
    if (anleggsNavn) message += `Anlegg: ${anleggsNavn}\n`
    message += '\n'
  }
  
  message += meldingTekst.substring(0, 400) // Begrens lengde
  
  return sendTelegramNotification({
    type: 'melding',
    tekniker_id,
    title: `Melding fra ${avsender}`,
    message
  })
}
