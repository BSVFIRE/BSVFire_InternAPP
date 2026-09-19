/**
 * «Knytt til anlegg» – søk opp anlegg og koble kontaktpersonen til det.
 * Første kobling blir primærkontakt på anlegget hvis anlegget ikke har noen fra før.
 */
import { useEffect, useMemo, useState } from 'react'
import { Building2, Check, Search, X } from 'lucide-react'
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui/Button'

interface AnleggValg { id: string; anleggsnavn: string | null; adresse: string | null; poststed: string | null; skjult: boolean | null; customer: { navn: string | null } | null }

export function KnyttAnleggDialog({ kontaktId, kontaktNavn, alleredeKoblet, onClose, onKoblet }: {
  kontaktId: string; kontaktNavn: string; alleredeKoblet: string[]; onClose: () => void; onKoblet: () => void
}) {
  const [alle, setAlle] = useState<AnleggValg[]>([])
  const [laster, setLaster] = useState(true)
  const [q, setQ] = useState('')
  const [kobler, setKobler] = useState<string | null>(null)

  useEffect(() => {
    db.from('anlegg').select('id, anleggsnavn, adresse, poststed, skjult, customer:kundenr(navn)').order('anleggsnavn')
      .then(({ data, error }) => { if (error) toast.error('Kunne ikke hente anlegg', error); setAlle((data ?? []) as AnleggValg[]); setLaster(false) })
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const treff = useMemo(() => {
    const s = q.trim().toLowerCase()
    return alle.filter(a => !a.skjult && (!s || [a.anleggsnavn, a.adresse, a.poststed, a.customer?.navn].some(v => v?.toLowerCase().includes(s)))).slice(0, 50)
  }, [alle, q])

  async function koble(a: AnleggValg) {
    setKobler(a.id)
    try {
      const { count } = await db.from('anlegg_kontaktpersoner').select('id', { count: 'exact', head: true }).eq('anlegg_id', a.id)
      const { error } = await db.from('anlegg_kontaktpersoner').insert({ anlegg_id: a.id, kontaktperson_id: kontaktId, primar: (count ?? 0) === 0 })
      if (error) throw error
      toast.success(`${kontaktNavn} er koblet til ${a.anleggsnavn}`)
      onKoblet(); onClose()
    } catch (err) { toast.error('Kunne ikke koble til anlegg', err); setKobler(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="knytt-tittel" className="card w-full sm:max-w-lg h-[85vh] sm:h-[600px] rounded-b-none sm:rounded-lg !p-0 flex flex-col">
        <div className="px-5 pt-5 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <div><h2 id="knytt-tittel" className="text-lg font-bold text-gray-900 dark:text-white">Knytt til anlegg</h2><p className="text-sm text-gray-500 dark:text-gray-400">{kontaktNavn}</p></div>
            <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Søk på anlegg, adresse eller kunde…" className="input pl-9" autoFocus aria-label="Søk etter anlegg" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {laster ? <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          : treff.length === 0 ? <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">Ingen anlegg funnet</p>
          : treff.map(a => {
            const koblet = alleredeKoblet.includes(a.id)
            return (
              <button key={a.id} type="button" disabled={koblet || kobler !== null} onClick={() => koble(a)}
                className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors', koblet ? 'opacity-60 cursor-default' : 'hover:bg-gray-100 dark:hover:bg-dark-100')}>
                <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', koblet ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-primary/10 text-primary')}>{koblet ? <Check className="w-4 h-4" strokeWidth={3} /> : <Building2 className="w-4 h-4" />}</span>
                <span className="flex-1 min-w-0"><span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">{a.anleggsnavn}</span><span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{[a.customer?.navn, [a.adresse, a.poststed].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</span></span>
                {koblet && <span className="text-xs text-green-700 dark:text-green-400 font-medium">Koblet</span>}
                {kobler === a.id && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
