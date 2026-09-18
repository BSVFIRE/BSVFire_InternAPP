/**
 * Kobler en blank QR-etikett til et anlegg: skann med kamera eller tast 8-tegns koden,
 * gi den en merkelapp («Sentral 2, kjeller»), koble.
 */
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Keyboard, Camera, X } from 'lucide-react'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { kobleKode, tolkSkannetKode } from '@/lib/qrKoder'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { Button, IconButton } from '@/components/ui/Button'
import { QrSkanner } from '@/components/QrSkanner'

export function KobleQrModal({ anleggId, anleggsnavn, forhandsvalgtKode, onClose, onKoblet }: {
  anleggId: string
  anleggsnavn: string
  /** Kode som allerede er kjent (f.eks. fra /qr/:kode) – hopper over skanning */
  forhandsvalgtKode?: string
  onClose: () => void
  onKoblet: () => void
}) {
  const navigate = useNavigate()
  const { ansatt } = useCurrentAnsatt()
  const [modus, setModus] = useState<'skann' | 'tast'>(forhandsvalgtKode ? 'tast' : 'skann')
  const [kode, setKode] = useState(forhandsvalgtKode ?? '')
  const [merkelapp, setMerkelapp] = useState('')
  const [lagrer, setLagrer] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)

  const paSkann = useCallback((tekst: string) => {
    const k = tolkSkannetKode(tekst)
    if (!k) { setFeil('QR-koden er ikke en FireCtrl-etikett'); return }
    setKode(k); setFeil(null); setModus('tast')
    if (navigator.vibrate) navigator.vibrate(60)
  }, [])

  async function koble(e: React.FormEvent) {
    e.preventDefault()
    const k = tolkSkannetKode(kode)
    if (!k) { setFeil('Koden må være 8 tegn (bokstaver og tall)'); return }
    setLagrer(true); setFeil(null)
    try {
      const r = await kobleKode(k, anleggId, merkelapp.trim() || null, ansatt?.id ?? null)
      if (r.status === 'finnes_ikke') { setFeil(`Koden ${k} finnes ikke. Er etiketten fra en gammel bunke? Generer nye under Admin → QR-koder.`); return }
      if (r.status === 'allerede_koblet') {
        setFeil(`Koden ${k} er allerede koblet til «${r.anleggsnavn ?? 'et annet anlegg'}».`)
        return
      }
      toast.success(`Etikett ${k} koblet til ${anleggsnavn}`)
      onKoblet()
    } catch (err) {
      toast.error('Kunne ikke koble etiketten', err)
    } finally {
      setLagrer(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <form onSubmit={koble} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="koble-qr-tittel"
        className="card w-full sm:max-w-md rounded-b-none sm:rounded-lg !p-0 flex flex-col max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 id="koble-qr-tittel" className="text-lg font-bold text-gray-900 dark:text-white">Koble QR-etikett</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">til {anleggsnavn}</p>
          </div>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={onClose} />
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-dark-100">
            {(['skann', 'tast'] as const).map(m => (
              <button key={m} type="button" onClick={() => setModus(m)} aria-pressed={modus === m}
                className={cn('flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-md text-sm font-medium transition-colors',
                  modus === m ? 'bg-white dark:bg-dark-50 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400')}>
                {m === 'skann' ? <><Camera className="w-4 h-4" />Skann</> : <><Keyboard className="w-4 h-4" />Tast kode</>}
              </button>
            ))}
          </div>

          {modus === 'skann' ? (
            <>
              <QrSkanner onResult={paSkann} aktiv={modus === 'skann'} />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Hold kameraet mot QR-koden på etiketten</p>
            </>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="qr-kode" className="block text-sm font-medium text-gray-900 dark:text-white">Kode på etiketten</label>
              <input id="qr-kode" value={kode} onChange={e => setKode(e.target.value.toUpperCase())} maxLength={8} autoCapitalize="characters" autoComplete="off" spellCheck={false}
                placeholder="F.eks. 7F3KQ2ZX" className="input font-mono text-lg tracking-[0.2em] text-center uppercase" autoFocus={!forhandsvalgtKode} />
            </div>
          )}

          {kode.length === 8 && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400"><Check className="w-4 h-4" strokeWidth={3} />Kode <span className="font-mono font-semibold">{kode}</span> lest</div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="qr-merkelapp" className="block text-sm font-medium text-gray-900 dark:text-white">Hvor henger den? <span className="font-normal text-gray-500">(valgfritt)</span></label>
            <input id="qr-merkelapp" value={merkelapp} onChange={e => setMerkelapp(e.target.value)} placeholder="Sentral 2, kjeller" className="input" autoFocus={Boolean(forhandsvalgtKode)} />
          </div>

          {feil && <p className="text-sm text-red-600 dark:text-red-400">{feil}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} className="flex-1">Avbryt</Button>
            <Button variant="primary" type="submit" loading={lagrer} disabled={kode.length !== 8} className="flex-1">Koble etikett</Button>
          </div>
          <button type="button" onClick={() => navigate('/admin/qr-koder')} className="block mx-auto text-xs text-gray-500 dark:text-gray-400 hover:text-primary">Tom for etiketter? Generer nye</button>
        </div>
      </form>
    </div>
  )
}
