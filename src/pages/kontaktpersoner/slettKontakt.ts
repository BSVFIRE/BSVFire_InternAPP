/**
 * Sletter en kontaktperson: løsner den fra kunder og anlegg først.
 * Returnerer true hvis slettet.
 */
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'

export async function slettKontaktperson(id: string, navn: string, bruk: { anlegg: number; kunder: number }): Promise<boolean> {
  const deler = [bruk.anlegg > 0 ? `${bruk.anlegg} anlegg` : null, bruk.kunder > 0 ? `${bruk.kunder} kunde${bruk.kunder === 1 ? '' : 'r'}` : null].filter(Boolean)
  const msg = deler.length ? `Slette «${navn}»? Personen fjernes samtidig fra ${deler.join(' og ')}.` : `Slette «${navn}»?`
  if (!confirm(msg)) return false
  try {
    const k = await db.from('customer').update({ kontaktperson_id: null }).eq('kontaktperson_id', id)
    if (k.error) throw k.error
    const a = await db.from('anlegg_kontaktpersoner').delete().eq('kontaktperson_id', id)
    if (a.error) throw a.error
    const { error } = await db.from('kontaktpersoner').delete().eq('id', id)
    if (error) throw error
    toast.success(`«${navn}» er slettet`)
    return true
  } catch (err) {
    toast.error('Kunne ikke slette kontaktperson', err)
    return false
  }
}
