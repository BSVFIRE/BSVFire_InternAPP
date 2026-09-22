/**
 * Én PowerSync-database per innlogget bruker. Aktiveres bare når VITE_POWERSYNC_URL er satt –
 * uten den kjører appen som før (direkte mot Supabase + localStorage-kø).
 */
import { PowerSyncDatabase } from '@powersync/web'
import { AppSchema } from './schema'
import { POWERSYNC_URL, SupabaseConnector } from './connector'
import { createLogger } from '@/lib/logger'

const log = createLogger('PowerSync')

export const powersyncAktiv = !!POWERSYNC_URL

// Databasen opprettes først når PowerSync faktisk er i bruk – ellers laster ikke nettleseren
// SQLite-filene (WebAssembly) og det opprettes ingen lokal lagring.
let instans: PowerSyncDatabase | null = null

export function hentPowerSync(): PowerSyncDatabase {
  if (!instans) instans = new PowerSyncDatabase({ schema: AppSchema, database: { dbFilename: 'firectrl.sqlite' } })
  return instans
}

let koblet = false

export async function startPowerSync() {
  if (!powersyncAktiv || koblet) return
  koblet = true
  try {
    const db = hentPowerSync()
    await db.init()
    await db.connect(new SupabaseConnector())
    log.info('PowerSync koblet til')
  } catch (e) {
    koblet = false
    log.error('Kunne ikke koble til PowerSync', { error: e })
  }
}

/** Ved utlogging: koble fra og tøm den lokale databasen (neste bruker skal ikke arve data) */
export async function stoppPowerSync() {
  if (!powersyncAktiv || !koblet || !instans) return
  koblet = false
  try {
    await instans.disconnectAndClear()
  } catch (e) {
    log.error('Kunne ikke koble fra PowerSync', { error: e })
  }
}
