/**
 * Bilder knyttet til et anlegg: komprimering, opplasting og henting.
 *
 * Alt som lastes opp havner i `anlegg.dokumenter` under `anlegg/<id>/bilder/…` og
 * registreres i `dokumenter` med type «Bilde». Bildebanken på anlegget er dermed
 * bare en visning av de radene – ingen egen tabell.
 *
 * Komprimering er ikke valgfritt: et mobilbilde er 3–5 MB, og fem av dem gjør
 * rapporten for tung til å sendes på e-post og for treg å laste opp fra bilen.
 */
import { supabase } from '@/lib/supabase'

/** Et avvik skal dokumenteres, ikke illustreres. To bilder holder, og rapporten forblir lett. */
export const MAKS_BILDER_PER_AVVIK = 2

/** Lengste kant etter skalering. 1600 px er nok til å se en skadet detektor i en PDF. */
const MAKS_KANT = 1600
const JPEG_KVALITET = 0.72

export interface Anleggsbilde {
  id: string
  storagePath: string
  filnavn: string
  opplastetDato: string | null
  opplastetAv: string | null
}

/**
 * Skalerer ned og komprimerer til JPEG. Et 4 MB mobilbilde ender typisk på 200–400 KB.
 * Bilder som allerede er små slipper unna med samme behandling – det koster lite.
 */
export async function komprimerBilde(fil: File): Promise<Blob> {
  const bitmap = await lastBitmap(fil)
  const skala = Math.min(1, MAKS_KANT / Math.max(bitmap.width, bitmap.height))
  const bredde = Math.round(bitmap.width * skala)
  const hoyde = Math.round(bitmap.height * skala)

  const canvas = document.createElement('canvas')
  canvas.width = bredde
  canvas.height = hoyde
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Nettleseren klarte ikke å behandle bildet')
  ctx.drawImage(bitmap, 0, 0, bredde, hoyde)
  if ('close' in bitmap) bitmap.close()

  const blob = await new Promise<Blob | null>(ok => canvas.toBlob(ok, 'image/jpeg', JPEG_KVALITET))
  if (!blob) throw new Error('Kunne ikke komprimere bildet')
  return blob
}

async function lastBitmap(fil: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap retter opp EXIF-rotasjon, som ellers legger mobilbilder på siden
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(fil, { imageOrientation: 'from-image' })
    } catch {
      // Faller gjennom til <img> under
    }
  }
  const url = URL.createObjectURL(fil)
  try {
    const img = new Image()
    img.src = url
    await new Promise((ok, feil) => { img.onload = ok; img.onerror = feil })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Komprimerer og laster opp ett bilde. Returnerer storage-stien, som er det vi lagrer
 * videre – signerte URL-er går ut på tid og skal aldri havne i basen.
 */
export async function lastOppAnleggsbilde(anleggId: string, fil: File, beskrivelse?: string): Promise<string> {
  const blob = await komprimerBilde(fil)
  const navn = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.jpg`
  const storagePath = `anlegg/${anleggId}/bilder/${navn}`

  const { error } = await supabase.storage
    .from('anlegg.dokumenter')
    .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error

  // Registreres som dokument, slik at bildebanken finner det uten å liste storage.
  // Går registreringen galt er bildet likevel lastet opp og brukbart på avviket –
  // det skal ikke velte kontrollen, men det skal ikke skje i stillhet heller.
  const { data: { user } } = await supabase.auth.getUser()
  const { error: regFeil } = await supabase.from('dokumenter').insert({
    anlegg_id: anleggId,
    filnavn: beskrivelse?.trim() || navn,
    type: 'Bilde',
    storage_path: storagePath,
    opplastet_dato: new Date().toISOString(),
    opplastet_av: user?.email ?? null,
  })
  if (regFeil) console.error('Bildet ble lastet opp, men kom ikke inn i bildebanken:', regFeil)

  return storagePath
}

/** Signert URL for visning i nettleseren. Gyldig en time – nok til en økt. */
export async function bildeUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage.from('anlegg.dokumenter').createSignedUrl(storagePath, 60 * 60)
  return data?.signedUrl ?? null
}

/** Flere signerte URL-er i én runde. Bilder som ikke finnes gir null i stedet for å velte visningen. */
export async function bildeUrler(stier: string[]): Promise<Record<string, string>> {
  const par = await Promise.all(stier.map(async sti => [sti, await bildeUrl(sti)] as const))
  return Object.fromEntries(par.filter((p): p is [string, string] => Boolean(p[1])))
}

/** Bildet som data-URL, slik jsPDF trenger det for addImage(). */
export async function bildeSomDataUrl(storagePath: string): Promise<{ data: string; bredde: number; hoyde: number } | null> {
  try {
    const { data, error } = await supabase.storage.from('anlegg.dokumenter').download(storagePath)
    if (error || !data) return null
    const dataUrl = await new Promise<string>((ok, feil) => {
      const leser = new FileReader()
      leser.onload = () => ok(leser.result as string)
      leser.onerror = feil
      leser.readAsDataURL(data)
    })
    const mal = new Image()
    mal.src = dataUrl
    await new Promise((ok, feil) => { mal.onload = ok; mal.onerror = feil })
    return { data: dataUrl, bredde: mal.naturalWidth, hoyde: mal.naturalHeight }
  } catch {
    return null
  }
}

/** Alle bilder som er registrert på anlegget, nyeste først. */
export async function hentAnleggsbilder(anleggId: string): Promise<Anleggsbilde[]> {
  const { data, error } = await supabase
    .from('dokumenter')
    .select('id, filnavn, storage_path, opplastet_dato, opplastet_av')
    .eq('anlegg_id', anleggId)
    .eq('type', 'Bilde')
    .order('opplastet_dato', { ascending: false })
  if (error) throw error
  return (data ?? [])
    .filter(d => d.storage_path)
    .map(d => ({
      id: d.id,
      storagePath: d.storage_path as string,
      filnavn: d.filnavn ?? 'Bilde',
      opplastetDato: d.opplastet_dato,
      opplastetAv: d.opplastet_av,
    }))
}

/** Sletter bildet både fra storage og dokumentlisten. */
export async function slettAnleggsbilde(bilde: Anleggsbilde): Promise<void> {
  await supabase.storage.from('anlegg.dokumenter').remove([bilde.storagePath])
  const { error } = await supabase.from('dokumenter').delete().eq('id', bilde.id)
  if (error) throw error
}
