/**
 * «Nytt anlegg» – kort dialog med det som trengs for å komme i gang.
 * Kontaktpersoner, priser og dokumenter legges til på anleggets side etterpå.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { ANLEGG_STATUSER } from '@/lib/constants'
import { opprettDropboxMapperForAnlegg } from '@/lib/anleggDropbox'
import { syncAnleggToKontrollportal } from '@/lib/kontrollportal-sync'
import {
  AdresseFelter, Felt, KontrollFelter, KundeVelger, TOMT_SKJEMA,
  tilAnleggRad, useSkjemaValg, validerAnlegg, type AnleggSkjemaVerdier,
} from './anleggSkjema'

const log = createLogger('NyttAnlegg')

interface Props {
  /** Forhåndsvalgt kunde (f.eks. fra kundekortet) */
  kundeId?: string | null
  onClose: () => void
}

export function NyttAnleggDialog({ kundeId, onClose }: Props) {
  const navigate = useNavigate()
  const { kunder, ansatte, loading } = useSkjemaValg()
  const [verdier, setVerdier] = useState<AnleggSkjemaVerdier>({ ...TOMT_SKJEMA, kundenr: kundeId ?? '' })
  const [feil, setFeil] = useState<Partial<Record<keyof AnleggSkjemaVerdier, string>>>({})
  const [lagrer, setLagrer] = useState(false)

  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape' && !lagrer) onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose, lagrer])

  function oppdater(patch: Partial<AnleggSkjemaVerdier>) {
    setVerdier(v => ({ ...v, ...patch }))
    setFeil(f => { const n = { ...f }; for (const k of Object.keys(patch) as (keyof AnleggSkjemaVerdier)[]) delete n[k]; return n })
  }

  const kunde = kunder.find(k => k.id === verdier.kundenr)

  async function opprett(e: React.FormEvent) {
    e.preventDefault()
    const v = validerAnlegg(verdier)
    if (Object.keys(v).length) { setFeil(v); return }
    setLagrer(true)
    try {
      const rad = { ...tilAnleggRad(verdier), kontroll_status: ANLEGG_STATUSER.IKKE_UTFORT }
      const { data, error } = await db.from('anlegg').insert(rad).select('id').single()
      if (error || !data) throw error ?? new Error('Ingen id returnert')

      toast.success(`«${rad.anleggsnavn}» opprettet`)
      navigate(`/anlegg/${data.id}`)
      onClose()

      // Bakgrunnsjobber – resultatet meldes som toast, uten å blokkere
      opprettDropboxMapperForAnlegg({ anleggId: data.id, kundeNummer: kunde?.kunde_nummer, kundeNavn: kunde?.navn ?? '', anleggNavn: rad.anleggsnavn })
        .then(r => {
          if (r.status === 'opprettet') toast.info('Dropbox-mapper opprettet')
          else if (r.status === 'feil') toast.warning('Dropbox-mapper ble ikke opprettet', r.melding)
        })
      syncAnleggToKontrollportal(rad.anleggsnavn, rad.adresse).catch(err => log.warn('Kontrollportal-sync feilet', { err }))
    } catch (err) {
      log.error('Kunne ikke opprette anlegg', { error: err })
      toast.error('Kunne ikke opprette anlegg', err)
      setLagrer(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => !lagrer && onClose()}>
      <form onSubmit={opprett} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="nytt-anlegg-tittel"
        className="card w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-lg !p-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 id="nytt-anlegg-tittel" className="text-lg font-bold text-gray-900 dark:text-white">Nytt anlegg</h2>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} disabled={lagrer} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="px-5 pb-4 space-y-4">
            <KundeVelger verdi={verdier.kundenr} kunder={kunder} onChange={kundenr => oppdater({ kundenr })} feil={feil.kundenr} />
            <Felt id="nytt-navn" label="Anleggsnavn" pakrevd feil={feil.anleggsnavn}>
              <input id="nytt-navn" value={verdier.anleggsnavn} onChange={e => oppdater({ anleggsnavn: e.target.value })} placeholder="F.eks. Sentrum Storsenter" className={cn('input', feil.anleggsnavn && 'border-red-500')} />
            </Felt>
            <AdresseFelter verdier={verdier} feil={feil} onChange={oppdater} />
            <KontrollFelter verdier={verdier} ansatte={ansatte} onChange={oppdater} />
            {kunde && !kunde.kunde_nummer && (
              <div className="flex gap-2.5 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-sm text-gray-900 dark:text-gray-100">
                <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <span>Kunden mangler kundenummer, så Dropbox-mapper opprettes ikke nå. Du kan gjøre det senere fra Admin → Dropbox Mapper.</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
          <p className="text-xs text-gray-500 dark:text-gray-400 sm:max-w-[55%]">Kontaktpersoner, priser og dokumenter legger du til på anleggets side etterpå.</p>
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="ghost" onClick={onClose} disabled={lagrer} className="flex-1 sm:flex-none">Avbryt</Button>
            <Button variant="primary" type="submit" loading={lagrer} disabled={loading} className="flex-1 sm:flex-none">Opprett anlegg</Button>
          </div>
        </div>
      </form>
    </div>
  )
}
