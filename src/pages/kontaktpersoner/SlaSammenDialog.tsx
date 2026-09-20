/**
 * Slår sammen flere kontaktperson-kort som er samme person til ett kort.
 * Anleggsknytninger, kunde-referanser og legacy anlegg_id flyttes til kortet som beholdes; tomme felt fylles fra de andre.
 */
import { useEffect, useMemo, useState } from 'react'
import { Building2, Check, Merge, X } from 'lucide-react'
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { Button, IconButton } from '@/components/ui/Button'

const log = createLogger('SlaSammenKontakt')

export interface SammenslaingRad { id: string; navn: string | null; epost: string | null; telefon: string | null; rolle: string | null; created_at: string; anlegg: { id: string; navn: string; primar: boolean }[]; kunder: string[]; anlegg_id?: string | null }

export function SlaSammenDialog({ rader, onClose, onFerdig }: { rader: SammenslaingRad[]; onClose: () => void; onFerdig: () => void }) {
  // Forslag: kortet med flest utfylte felt og flest anlegg
  const forslag = useMemo(() => [...rader].sort((a, b) => score(b) - score(a))[0]?.id, [rader])
  const [behold, setBehold] = useState<string>(forslag)
  const [valgte, setValgte] = useState<Set<string>>(new Set(rader.map(r => r.id)))
  const [jobber, setJobber] = useState(false)

  useEffect(() => { function esc(e: KeyboardEvent) { if (e.key === 'Escape' && !jobber) onClose() } document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc) }, [onClose, jobber])

  const kilder = rader.filter(r => valgte.has(r.id) && r.id !== behold)
  const resultat = useMemo(() => {
    const b = rader.find(r => r.id === behold)
    if (!b) return null
    const forste = (k: 'epost' | 'telefon' | 'rolle') => b[k] || kilder.map(r => r[k]).find(Boolean) || null
    const anlegg = new Map<string, string>()
    for (const r of [b, ...kilder]) for (const a of r.anlegg) anlegg.set(a.id, a.navn)
    return { epost: forste('epost'), telefon: forste('telefon'), rolle: forste('rolle'), anlegg: Array.from(anlegg.values()), kunder: Array.from(new Set([b, ...kilder].flatMap(r => r.kunder))) }
  }, [rader, behold, kilder])

  async function slaSammen() {
    if (!resultat || kilder.length === 0) return
    setJobber(true)
    try {
      const kildeIder = kilder.map(r => r.id)
      // 1) Anleggsknytninger: hent alle for kildene og for den som beholdes
      const { data: kob, error: e1 } = await db.from('anlegg_kontaktpersoner').select('id, anlegg_id, kontaktperson_id, primar').in('kontaktperson_id', [behold, ...kildeIder])
      if (e1) throw e1
      const harBehold = new Set((kob ?? []).filter(x => x.kontaktperson_id === behold).map(x => x.anlegg_id))
      for (const x of kob ?? []) {
        if (x.kontaktperson_id === behold) continue
        if (x.anlegg_id && !harBehold.has(x.anlegg_id)) {
          const { error } = await db.from('anlegg_kontaktpersoner').update({ kontaktperson_id: behold }).eq('id', x.id)
          if (error) throw error
          harBehold.add(x.anlegg_id)
        } else {
          const { error } = await db.from('anlegg_kontaktpersoner').delete().eq('id', x.id)
          if (error) throw error
        }
      }
      // 2) Legacy: kontaktpersoner.anlegg_id på kildene → koblingsrad hvis den mangler
      for (const r of kilder) {
        if (r.anlegg_id && !harBehold.has(r.anlegg_id)) {
          const { error } = await db.from('anlegg_kontaktpersoner').insert({ anlegg_id: r.anlegg_id, kontaktperson_id: behold, primar: false })
          if (error) throw error
          harBehold.add(r.anlegg_id)
        }
      }
      // 3) Kunder som peker på kildene
      const { error: e3 } = await db.from('customer').update({ kontaktperson_id: behold }).in('kontaktperson_id', kildeIder)
      if (e3) throw e3
      // 4) Fyll tomme felt på kortet som beholdes
      const { error: e4 } = await db.from('kontaktpersoner').update({ epost: resultat.epost, telefon: resultat.telefon, rolle: resultat.rolle, sist_oppdatert: new Date().toISOString() }).eq('id', behold)
      if (e4) throw e4
      // 5) Slett kildene
      const { error: e5 } = await db.from('kontaktpersoner').delete().in('id', kildeIder)
      if (e5) throw e5
      toast.success(`${kilder.length + 1} kort slått sammen til ett – ${resultat.anlegg.length} anlegg beholdt`)
      onFerdig(); onClose()
    } catch (err) {
      log.error('Sammenslåing feilet', { error: err, behold, kilder: kilder.map(r => r.id) })
      toast.error('Kunne ikke slå sammen', err)
      setJobber(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => !jobber && onClose()}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ss-tittel" className="card w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-lg !p-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div><h2 id="ss-tittel" className="text-lg font-bold text-gray-900 dark:text-white">Slå sammen til ett kort</h2><p className="text-sm text-gray-500 dark:text-gray-400">Velg kortet som skal beholdes. Anlegg og kunder fra de andre flyttes over.</p></div>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} disabled={jobber} />
        </div>
        <div className="px-5 pb-4 space-y-2">
          {rader.map(r => {
            const erBehold = r.id === behold
            const med = valgte.has(r.id)
            return (
              <div key={r.id} className={cn('rounded-lg border p-3 flex items-start gap-3', erBehold ? 'border-primary bg-primary/5' : med ? 'border-gray-200 dark:border-gray-800' : 'border-gray-200 dark:border-gray-800 opacity-50')}>
                <input type="checkbox" checked={med} disabled={erBehold} onChange={e => setValgte(prev => { const n = new Set(prev); e.target.checked ? n.add(r.id) : n.delete(r.id); return n })} aria-label="Ta med i sammenslåingen" className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary" />
                <div className="flex-1 min-w-0 text-sm">
                  <div className="font-semibold text-gray-900 dark:text-white">{r.navn}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{[r.rolle, r.telefon, r.epost].filter(Boolean).join(' · ') || 'Ingen kontaktinfo'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 inline-flex items-center gap-1 flex-wrap"><Building2 className="w-3 h-3" />{r.anlegg.length ? r.anlegg.map(a => a.navn).join(', ') : 'ingen anlegg'}{r.kunder.length ? ` · kunde: ${r.kunder.join(', ')}` : ''}</div>
                </div>
                <button type="button" onClick={() => { setBehold(r.id); setValgte(prev => new Set(prev).add(r.id)) }} className={cn('text-xs px-2.5 h-8 rounded-lg border flex-shrink-0', erBehold ? 'border-primary bg-primary text-white font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary')}>{erBehold ? 'Beholdes' : 'Behold denne'}</button>
              </div>
            )
          })}
          {resultat && kilder.length > 0 && (
            <div className="rounded-lg bg-gray-50 dark:bg-dark-100 p-3 text-sm space-y-1">
              <div className="font-medium text-gray-900 dark:text-white inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-green-600" strokeWidth={3} />Resultat</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{[resultat.rolle, resultat.telefon, resultat.epost].filter(Boolean).join(' · ') || 'Ingen kontaktinfo'}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{resultat.anlegg.length} anlegg: {resultat.anlegg.join(', ') || '–'}{resultat.kunder.length ? ` · kunde: ${resultat.kunder.join(', ')}` : ''}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{kilder.length} kort slettes etter sammenslåingen.</div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
          <Button variant="ghost" onClick={onClose} disabled={jobber}>Avbryt</Button>
          <Button variant="primary" icon={<Merge />} loading={jobber} disabled={kilder.length === 0} onClick={slaSammen}>Slå sammen {kilder.length + 1} kort</Button>
        </div>
      </div>
    </div>
  )
}

function score(r: SammenslaingRad): number {
  return (r.epost ? 2 : 0) + (r.telefon ? 2 : 0) + (r.rolle ? 1 : 0) + r.anlegg.length * 3 + r.kunder.length * 3
}
