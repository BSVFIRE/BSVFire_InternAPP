/**
 * Nødlys mot den lokale PowerSync-databasen (pilotmodul).
 * Lesing er reaktiv (endringer fra kolleger dukker opp uten refresh), skriving går til SQLite
 * og lastes opp til Supabase av connectoren – også når enheten er offline.
 */
import { useQuery } from '@powersync/react'
import { powersync } from './db'
import type { NodlysEnhet } from '@/pages/rapporter/nodlys/typer'

type Rad = Omit<NodlysEnhet, 'kontrollert' | 'created_at'> & { kontrollert: number | null; opprettet_dato: string | null }

function tilEnhet(r: Rad): NodlysEnhet {
  const { kontrollert, opprettet_dato, ...rest } = r
  return { ...rest, kontrollert: kontrollert == null ? null : kontrollert === 1, created_at: opprettet_dato ?? '' }
}

/** Alle armaturer for et anlegg, sortert som listen fra Supabase (plassering, tomme sist) */
export function useNodlysLokal(anleggId: string | null) {
  const q = useQuery<Rad>(
    'select * from anleggsdata_nodlys where anlegg_id = ? order by plassering is null, plassering collate nocase',
    [anleggId ?? ''],
  )
  return { data: q.data.map(tilEnhet), laster: q.isLoading, feil: q.error }
}

const KOLONNER = ['anlegg_id', 'internnummer', 'amatur_id', 'fordeling', 'kurs', 'bygg', 'etasje', 'type', 'produsent', 'plassering', 'status', 'kontrollert', 'batteritype', 'notat', 'kundenavn'] as const
type Patch = Partial<Pick<NodlysEnhet, typeof KOLONNER[number]>>

function verdi(k: string, v: unknown): string | number | null {
  if (v === undefined || v === null) return null
  if (k === 'kontrollert') return v ? 1 : 0
  return String(v)
}

export async function oppdaterNodlysLokalt(ids: string[], patch: Patch) {
  const felt = (Object.keys(patch) as (keyof Patch)[]).filter(k => (KOLONNER as readonly string[]).includes(k))
  if (ids.length === 0 || felt.length === 0) return
  const sett = [...felt.map(k => `${k} = ?`), 'sist_oppdatert = ?'].join(', ')
  const params = [...felt.map(k => verdi(k, patch[k])), new Date().toISOString(), ...ids]
  await powersync.execute(`update anleggsdata_nodlys set ${sett} where id in (${ids.map(() => '?').join(',')})`, params)
}

export async function slettNodlysLokalt(ids: string[]) {
  if (ids.length === 0) return
  await powersync.execute(`delete from anleggsdata_nodlys where id in (${ids.map(() => '?').join(',')})`, ids)
}

/** Oppretter rader med klientgenerert id (PowerSync krever id lokalt). Returnerer id-ene. */
export async function leggTilNodlysLokalt(rader: Patch[]): Promise<string[]> {
  if (rader.length === 0) return []
  const naa = new Date().toISOString()
  const ids: string[] = []
  await powersync.writeTransaction(async tx => {
    for (const r of rader) {
      const id = crypto.randomUUID()
      ids.push(id)
      const kol = ['id', ...KOLONNER, 'opprettet_dato', 'sist_oppdatert']
      const params = [id, ...KOLONNER.map(k => verdi(k, r[k])), naa, naa]
      await tx.execute(`insert into anleggsdata_nodlys (${kol.join(',')}) values (${kol.map(() => '?').join(',')})`, params)
    }
  })
  return ids
}
