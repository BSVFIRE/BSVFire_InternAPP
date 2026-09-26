/**
 * Bilder som er tatt uten dekning.
 *
 * Den vanlige offline-køen i `offline.ts` ligger i localStorage og tar JSON-rader.
 * Et bilde er en binærfil på noen hundre kilobyte og hører hjemme i IndexedDB.
 *
 * Trikset som gjør resten enkelt: storage-stien lages *før* opplastingen. Avviket
 * lagrer stien med én gang, og rapporten og bildebanken forholder seg til den.
 * Om filen ligger i skyen eller i køen på enheten er da et spørsmål om når, ikke om.
 */
import { supabase } from '@/lib/supabase'
import { onConnectionChange, getOnlineStatus } from '@/lib/offline'

const DB_NAVN = 'bsv-bilder'
const LAGER = 'ventende'
/** Etter så mange mislykkede forsøk er det ikke nettet som er problemet. */
const MAKS_FORSOK = 5

export interface VentendeBilde {
  storagePath: string
  anleggId: string
  filnavn: string
  blob: Blob
  lagtTil: string
  forsok: number
}

function apneDb(): Promise<IDBDatabase> {
  return new Promise((ok, feil) => {
    const req = indexedDB.open(DB_NAVN, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(LAGER)) db.createObjectStore(LAGER, { keyPath: 'storagePath' })
    }
    req.onsuccess = () => ok(req.result)
    req.onerror = () => feil(req.error)
  })
}

async function medLager<T>(modus: IDBTransactionMode, arbeid: (lager: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await apneDb()
  try {
    return await new Promise<T>((ok, feil) => {
      const req = arbeid(db.transaction(LAGER, modus).objectStore(LAGER))
      req.onsuccess = () => ok(req.result)
      req.onerror = () => feil(req.error)
    })
  } finally {
    db.close()
  }
}

/** Legger bildet i kø for opplasting. Stien er allerede bestemt av den som kaller. */
export async function koLeggTil(bilde: Omit<VentendeBilde, 'lagtTil' | 'forsok'>): Promise<void> {
  await medLager('readwrite', l => l.put({ ...bilde, lagtTil: new Date().toISOString(), forsok: 0 }))
}

export async function koHentAlle(): Promise<VentendeBilde[]> {
  try {
    return await medLager<VentendeBilde[]>('readonly', l => l.getAll() as IDBRequest<VentendeBilde[]>)
  } catch {
    return []
  }
}

export async function koHent(storagePath: string): Promise<VentendeBilde | undefined> {
  try {
    return await medLager<VentendeBilde | undefined>('readonly', l => l.get(storagePath) as IDBRequest<VentendeBilde | undefined>)
  } catch {
    return undefined
  }
}

export async function koFjern(storagePath: string): Promise<void> {
  await medLager('readwrite', l => l.delete(storagePath) as unknown as IDBRequest<undefined>)
}

/** Antall bilder som venter – brukes til å si fra i grensesnittet. */
export async function koAntall(anleggId?: string): Promise<number> {
  const alle = await koHentAlle()
  return anleggId ? alle.filter(b => b.anleggId === anleggId).length : alle.length
}

let synkroniserer = false

/**
 * Laster opp alt som ligger i kø. Kjøres når nettet er tilbake, og ved oppstart.
 * Returnerer hvor mange som gikk gjennom.
 */
export async function koSynkroniser(): Promise<{ lastetOpp: number; gjenstar: number }> {
  if (synkroniserer || !getOnlineStatus()) return { lastetOpp: 0, gjenstar: await koAntall() }
  synkroniserer = true
  let lastetOpp = 0

  try {
    for (const bilde of await koHentAlle()) {
      try {
        const { error } = await supabase.storage
          .from('anlegg.dokumenter')
          .upload(bilde.storagePath, bilde.blob, { contentType: 'image/jpeg', upsert: true })
        if (error) throw error

        const { data: { user } } = await supabase.auth.getUser()
        const { error: regFeil } = await supabase.from('dokumenter').insert({
          anlegg_id: bilde.anleggId,
          filnavn: bilde.filnavn,
          type: 'Bilde',
          storage_path: bilde.storagePath,
          opplastet_dato: bilde.lagtTil,
          opplastet_av: user?.email ?? null,
        })
        if (regFeil) console.error('Bildet ble lastet opp, men kom ikke inn i bildebanken:', regFeil)

        // Samme kopi til 99_Foto som bilder tatt med dekning får
        const { kopierBildeTilDropbox } = await import('@/lib/bildeDropbox')
        await kopierBildeTilDropbox(bilde.anleggId, bilde.storagePath.split('/').pop() ?? bilde.filnavn, bilde.blob)

        await koFjern(bilde.storagePath)
        lastetOpp++
      } catch (e) {
        const forsok = bilde.forsok + 1
        if (forsok >= MAKS_FORSOK) {
          console.error(`Ga opp opplasting av ${bilde.storagePath} etter ${forsok} forsøk:`, e)
          await koFjern(bilde.storagePath)
        } else {
          await medLager('readwrite', l => l.put({ ...bilde, forsok }))
        }
      }
    }
  } finally {
    synkroniserer = false
  }

  return { lastetOpp, gjenstar: await koAntall() }
}

/** Kobles opp én gang ved oppstart, fra main.tsx. */
export function startBildekoe(): void {
  if (getOnlineStatus()) koSynkroniser().catch(e => console.error('Bildekøen:', e))
  onConnectionChange(online => {
    if (online) koSynkroniser().catch(e => console.error('Bildekøen:', e))
  })
}
