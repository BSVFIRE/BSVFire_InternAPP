/**
 * Avstemming mellom adresseliste (teknisk) og enheter registrert på brannalarmanlegget.
 * Detektorlistens typer mappes til enhetsnøklene i anleggsdata_brannalarm.
 */
import { db } from './supabase'

/** detektor_items.type → enhetsnøkkel. Base/Annen/Gass teller ikke. */
export const DETEKTORTYPE_TIL_ENHET: Record<string, string> = {
  'Røykdetektor': 'rd',
  'Varmedetektor': 'vd',
  'Multidetektor': 'multi',
  'Multisensor': 'multi',
  'Flammedetektor': 'flame',
  'Manuell melder': 'mm',
  'Summer': 'sirene',
  'Blitz': 'optisk',
}

export interface DetektorlisteTelling { antallLister: number; sisteDato: string | null; perEnhet: Record<string, number>; ukjenteTyper: Record<string, number>; totalt: number }

export async function tellDetektorliste(anleggId: string): Promise<DetektorlisteTelling | null> {
  const { data: lister } = await db.from('detektorlister').select('id, dato, revisjon').eq('anlegg_id', anleggId).order('dato', { ascending: false })
  if (!lister || lister.length === 0) return null
  // Teller den nyeste listen (siste revisjon)
  const { data: items } = await db.from('detektor_items').select('type').eq('detektorliste_id', lister[0].id)
  const perEnhet: Record<string, number> = {}
  const ukjenteTyper: Record<string, number> = {}
  for (const it of items ?? []) {
    const t = (it.type ?? '').trim()
    if (!t || t === 'Base' || t === 'Annen') continue
    const key = DETEKTORTYPE_TIL_ENHET[t]
    if (key) perEnhet[key] = (perEnhet[key] ?? 0) + 1
    else ukjenteTyper[t] = (ukjenteTyper[t] ?? 0) + 1
  }
  return { antallLister: lister.length, sisteDato: lister[0].dato, perEnhet, ukjenteTyper, totalt: Object.values(perEnhet).reduce((s, n) => s + n, 0) }
}
