/**
 * Felles regler for oppgaver.
 * Fullføres en fakturaoppgave som hører til en ordre, settes ordren til «Fakturert».
 */
import { db } from './supabase'
import { OPPGAVE_STATUSER, ORDRE_STATUSER } from './constants'
import { createLogger } from './logger'

const log = createLogger('Oppgaver')

export async function fullforOppgave(o: { id: string; type: string | null; ordre_id: string | null }): Promise<{ error: unknown | null; ordreFakturert: boolean }> {
  const { error } = await db.from('oppgaver').update({ status: OPPGAVE_STATUSER.FULLFORT, sist_oppdatert: new Date().toISOString() }).eq('id', o.id)
  if (error) return { error, ordreFakturert: false }
  if (o.type === 'Faktura' && o.ordre_id) {
    const { error: e2 } = await db.from('ordre').update({ status: ORDRE_STATUSER.FAKTURERT, sist_oppdatert: new Date().toISOString() }).eq('id', o.ordre_id)
    if (e2) { log.warn('Oppgave fullført, men ordren ble ikke satt til Fakturert', { error: e2, ordreId: o.ordre_id }); return { error: null, ordreFakturert: false } }
    return { error: null, ordreFakturert: true }
  }
  return { error: null, ordreFakturert: false }
}

/** Dager til forfall (negativt = forfalt). null uten dato. */
export function dagerTilForfall(forfallsdato: string | null): number | null {
  if (!forfallsdato) return null
  const f = new Date(forfallsdato); f.setHours(0, 0, 0, 0)
  const n = new Date(); n.setHours(0, 0, 0, 0)
  return Math.round((f.getTime() - n.getTime()) / 86400000)
}

export function forfallTekst(forfallsdato: string | null): { tekst: string; tone: 'r' | 'y' | 'g' | null } {
  const d = dagerTilForfall(forfallsdato)
  if (d === null) return { tekst: 'Ingen frist', tone: null }
  if (d < 0) return { tekst: d === -1 ? 'Forfalt i går' : `Forfalt ${-d} d`, tone: 'r' }
  if (d === 0) return { tekst: 'I dag', tone: 'r' }
  if (d === 1) return { tekst: 'I morgen', tone: 'y' }
  if (d <= 7) return { tekst: `${d} dager`, tone: 'y' }
  return { tekst: new Date(forfallsdato!).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }), tone: 'g' }
}
