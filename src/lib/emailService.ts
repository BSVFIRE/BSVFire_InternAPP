import { supabase } from './supabase'

export interface EmailAttachment {
  content: string // base64 encoded
  filename: string
  contentType: string
}

export interface SendEmailParams {
  to: string
  subject: string
  body: string
  attachments?: EmailAttachment[]
  replyTo?: string
  cc?: string
  bcc?: string
}

// BSV Fire e-post konfigurasjon
const SENDER_EMAIL = 'rapport@send.bsvfire.com'
const SENDER_NAME = 'Brannteknisk Service og Vedlikehold AS'

/**
 * Sender e-post via Supabase Edge Function
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  try {
    const response = await supabase.functions.invoke('send_email2', {
      body: {
        to: params.to,
        cc: params.cc,
        bcc: params.bcc,
        subject: params.subject,
        body: params.body,
        from: SENDER_EMAIL,
        fromName: SENDER_NAME,
        reply_to: params.replyTo || 'mail@bsvfire.no',
        attachments: params.attachments,
      },
    })

    if (response.error) {
      throw new Error(response.error.message || 'Kunne ikke sende e-post')
    }

    if (response.data?.error) {
      throw new Error(JSON.stringify(response.data.error))
    }
  } catch (error) {
    console.error('Feil ved sending av e-post:', error)
    throw error
  }
}

/**
 * Konverterer en fil til base64
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      // Fjern data:*/*;base64, prefix
      const base64Data = base64.split(',')[1]
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Konverterer en Blob til base64
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      // Fjern data:*/*;base64, prefix
      const base64Data = base64.split(',')[1]
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Henter dokument fra Supabase Storage og konverterer til base64
 */
export async function getDocumentAsBase64(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('anlegg.dokumenter')
    .download(storagePath)

  if (error) {
    throw new Error(`Kunne ikke laste ned dokument: ${error.message}`)
  }

  return blobToBase64(data)
}

/**
 * Template for kunde e-post
 */
export function getKundeEmailTemplate(params: {
  anleggsnavn: string
  rapportType: string
  teknikerNavn: string
  teknikerTelefon: string
  teknikerEpost: string
}): string {
  return `
<html>
<body>
<p>Hei,</p>
<p>Vedlagt finner du ${params.rapportType}-rapport for ${params.anleggsnavn}.</p>
<p>Rapporten inneholder resultatet av den årlige kontrollen av ${params.rapportType}-anlegget.</p>
<p>Med vennlig hilsen<br>
${params.teknikerNavn}<br>
${params.teknikerTelefon}<br>
${params.teknikerEpost}</p>
</body>
</html>
`
}

/**
 * Template for tekniker e-post
 */
export function getTeknikerEmailTemplate(params: {
  anleggsnavn: string
  rapportType: string
  teknikerNavn: string
  teknikerTelefon: string
  teknikerEpost: string
}): string {
  return `
<html>
<body>
<p>Hei,</p>
<p>Vedlagt finner du intern kopi av ${params.rapportType}-rapport for ${params.anleggsnavn}.</p>
<p>Rapporten inneholder resultatet av den årlige kontrollen av ${params.rapportType}-anlegget.</p>
<p>Med vennlig hilsen<br>
${params.teknikerNavn}<br>
${params.teknikerTelefon}<br>
${params.teknikerEpost}</p>
</body>
</html>
`
}

/**
 * Genererer e-post emne
 */
export function generateEmailSubject(params: {
  anleggsnavn: string
  rapportType: string
  type: 'kunde' | 'intern' | 'ekstra'
  date: Date
}): string {
  const dateStr = params.date.toISOString().split('T')[0]
  return `${params.rapportType}-rapport${params.type === 'intern' ? ' (intern)' : ''} - ${params.anleggsnavn} - ${dateStr}`
}
