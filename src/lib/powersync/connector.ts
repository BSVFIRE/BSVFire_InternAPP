/**
 * Kobler PowerSync til Supabase:
 *  - fetchCredentials: PowerSync-tjenesten godtar Supabase sitt innloggingstoken direkte
 *  - uploadData: lokale endringer spilles av mot Supabase med vanlig supabase-js, så RLS,
 *    triggere (statusregler, nummerering) og logging virker som før
 */
import { AbstractPowerSyncDatabase, UpdateType, type PowerSyncBackendConnector } from '@powersync/web'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'

const log = createLogger('PowerSync')

export const POWERSYNC_URL: string | undefined = import.meta.env.VITE_POWERSYNC_URL

/** Postgres-feil som aldri blir bedre av å prøve igjen – endringen forkastes lokalt (samme liste som offline-køen) */
const PERMANENTE_FEIL = /^(22...|23...|42501|42703|42P01|PGRST204)$/

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !POWERSYNC_URL) return null
    return { endpoint: POWERSYNC_URL, token: session.access_token }
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const tx = await database.getNextCrudTransaction()
    if (!tx) return
    let siste: { op: string; table: string; id: string } | null = null
    try {
      for (const op of tx.crud) {
        siste = { op: op.op, table: op.table, id: op.id }
        const tabell = supabase.from(op.table)
        let feil: { code?: string; message: string } | null = null
        if (op.op === UpdateType.PUT) {
          const rad = { ...(op.opData ?? {}), id: op.id }
          feil = (await tabell.upsert(rad)).error
        } else if (op.op === UpdateType.PATCH) {
          feil = (await tabell.update(op.opData ?? {}).eq('id', op.id)).error
        } else if (op.op === UpdateType.DELETE) {
          feil = (await tabell.delete().eq('id', op.id)).error
        }
        if (feil) throw feil
      }
      await tx.complete()
    } catch (e) {
      const kode = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : ''
      if (kode && PERMANENTE_FEIL.test(kode)) {
        // Duplikat, RLS, ugyldig verdi osv.: hopp over transaksjonen så køen ikke stopper for alltid
        log.warn(`Forkastet lokal endring (${kode})`, { ...siste, feil: e })
        await tx.complete()
        return
      }
      log.error('Kunne ikke laste opp lokale endringer – prøver igjen', { ...siste, feil: e })
      throw e
    }
  }
}
