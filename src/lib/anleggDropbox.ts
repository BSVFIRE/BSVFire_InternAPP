/**
 * Dropbox-mapper for anlegg – bakgrunnsjobber ved opprettelse og navnebytte.
 * Flyttet ut av Anlegg.tsx så både «Nytt anlegg»-dialogen og redigeringssiden kan bruke dem.
 */
import { db } from './supabase'
import { createLogger } from './logger'
import { checkDropboxStatus, createDropboxFolder, renameDropboxFolder } from '@/services/dropboxServiceV2'
import { KUNDE_FOLDERS, ANLEGG_FOLDERS } from '@/services/dropboxFolderStructure'

const log = createLogger('AnleggDropbox')

const ROT = '/NY MAPPESTRUKTUR 2026/01_KUNDER'

function trygtNavn(navn: string): string {
  return navn.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim()
}

function kundeSti(kundeNummer: string, kundeNavn: string): string {
  return `${ROT}/${kundeNummer}_${trygtNavn(kundeNavn)}`
}

export type DropboxResultat =
  | { status: 'opprettet' }
  | { status: 'omdopt' }
  | { status: 'ingen_endring' }
  | { status: 'ikke_tilkoblet' }
  | { status: 'mangler_kundenummer' }
  | { status: 'feil'; melding: string }

/** Oppretter kunde- og anleggsmapper. Markerer anlegget som dropbox_synced ved suksess. */
export async function opprettDropboxMapperForAnlegg(params: {
  anleggId: string
  kundeNummer: string | null | undefined
  kundeNavn: string
  anleggNavn: string
}): Promise<DropboxResultat> {
  const { anleggId, kundeNummer, kundeNavn, anleggNavn } = params
  if (!kundeNummer) return { status: 'mangler_kundenummer' }
  try {
    const status = await checkDropboxStatus()
    if (!status.connected) return { status: 'ikke_tilkoblet' }

    const kunde = kundeSti(kundeNummer, kundeNavn)
    const anlegg = `${kunde}/02_Bygg/${trygtNavn(anleggNavn)}`

    for (const mappe of KUNDE_FOLDERS) await createDropboxFolder(`${kunde}/${mappe}`)
    for (const mappe of ANLEGG_FOLDERS) await createDropboxFolder(`${anlegg}/${mappe}`)

    await db.from('anlegg').update({ dropbox_synced: true }).eq('id', anleggId)
    log.info('Dropbox-mapper opprettet', { anleggNavn })
    return { status: 'opprettet' }
  } catch (error) {
    log.error('Feil ved opprettelse av Dropbox-mapper', { error, anleggNavn })
    return { status: 'feil', melding: error instanceof Error ? error.message : 'Ukjent feil' }
  }
}

/** Døper om anleggets mappe når anleggsnavnet endres. */
export async function omdopDropboxAnleggMappe(params: {
  kundeNummer: string | null | undefined
  kundeNavn: string
  gammeltNavn: string
  nyttNavn: string
}): Promise<DropboxResultat> {
  const { kundeNummer, kundeNavn, gammeltNavn, nyttNavn } = params
  if (!kundeNummer) return { status: 'mangler_kundenummer' }
  if (trygtNavn(gammeltNavn) === trygtNavn(nyttNavn)) return { status: 'ingen_endring' }
  try {
    const status = await checkDropboxStatus()
    if (!status.connected) return { status: 'ikke_tilkoblet' }

    const kunde = kundeSti(kundeNummer, kundeNavn)
    const resultat = await renameDropboxFolder(`${kunde}/02_Bygg/${trygtNavn(gammeltNavn)}`, `${kunde}/02_Bygg/${trygtNavn(nyttNavn)}`)
    if (!resultat.success) return { status: 'feil', melding: resultat.error ?? 'Kunne ikke døpe om mappe' }
    return resultat.skipped ? { status: 'ingen_endring' } : { status: 'omdopt' }
  } catch (error) {
    log.error('Feil ved omdøping av Dropbox-mappe', { error, gammeltNavn, nyttNavn })
    return { status: 'feil', melding: error instanceof Error ? error.message : 'Ukjent feil' }
  }
}

/** Oppretter kundemappene (uten anleggsmapper). Brukes når en ny kunde får kundenummer. */
export async function opprettDropboxMapperForKunde(params: { kundeNummer: string | null | undefined; kundeNavn: string }): Promise<DropboxResultat> {
  const { kundeNummer, kundeNavn } = params
  if (!kundeNummer) return { status: 'mangler_kundenummer' }
  try {
    const status = await checkDropboxStatus()
    if (!status.connected) return { status: 'ikke_tilkoblet' }
    const kunde = kundeSti(kundeNummer, kundeNavn)
    for (const mappe of KUNDE_FOLDERS) await createDropboxFolder(`${kunde}/${mappe}`)
    log.info('Dropbox kundemapper opprettet', { kundeNummer })
    return { status: 'opprettet' }
  } catch (error) {
    log.error('Feil ved opprettelse av Dropbox kundemapper', { error, kundeNummer })
    return { status: 'feil', melding: error instanceof Error ? error.message : 'Ukjent feil' }
  }
}
