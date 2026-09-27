/**
 * Bekreftelsesdialog – erstatning for confirm().
 *
 * Bruk:
 *   if (!(await bekreft({ tittel: 'Slette avviket?', fare: true }))) return
 *
 * <Bekreftelser /> er montert i App.tsx, ved siden av <Toaster />.
 *
 * confirm() virker, men ser ut som nettleseren og ikke som systemet, den kan ikke
 * forklare konsekvensen med mer enn én linje, og på iPad legger den seg midt på
 * skjermen med knapper på engelsk.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface Bekreftvalg {
  tittel: string
  /** Hva som faktisk skjer. Skriv det som er verdt å vite før man trykker. */
  tekst?: string
  bekreftTekst?: string
  avbrytTekst?: string
  /** Rød knapp og varselikon – for sletting og annet som ikke kan angres */
  fare?: boolean
}

type Lytter = (valg: Bekreftvalg, svar: (ok: boolean) => void) => void
let lytter: Lytter | null = null

/**
 * Spør brukeren. Returnerer true hvis de bekreftet.
 * Er dialogen ikke montert (tester, isolerte visninger) faller vi tilbake til confirm().
 */
export function bekreft(valg: Bekreftvalg): Promise<boolean> {
  if (!lytter) return Promise.resolve(window.confirm([valg.tittel, valg.tekst].filter(Boolean).join('\n\n')))
  return new Promise<boolean>(svar => lytter!(valg, svar))
}

export function Bekreftelser() {
  const [aktiv, setAktiv] = useState<{ valg: Bekreftvalg; svar: (ok: boolean) => void } | null>(null)
  const bekreftRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    lytter = (valg, svar) => setAktiv({ valg, svar })
    return () => { lytter = null }
  }, [])

  const lukk = useCallback((ok: boolean) => {
    setAktiv(n => { n?.svar(ok); return null })
  }, [])

  useEffect(() => {
    if (!aktiv) return
    bekreftRef.current?.focus()
    function tast(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); lukk(false) }
      if (e.key === 'Enter') { e.preventDefault(); lukk(true) }
    }
    document.addEventListener('keydown', tast)
    return () => document.removeEventListener('keydown', tast)
  }, [aktiv, lukk])

  if (!aktiv) return null
  const { valg } = aktiv

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-3 sm:p-4"
      onClick={() => lukk(false)}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="bekreft-tittel"
        aria-describedby={valg.tekst ? 'bekreft-tekst' : undefined}
        onClick={e => e.stopPropagation()}
        className="card w-full sm:max-w-md space-y-3"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-start gap-3">
          {valg.fare && (
            <span className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </span>
          )}
          <div className="min-w-0">
            <h2 id="bekreft-tittel" className="text-sm font-semibold text-gray-900 dark:text-white">{valg.tittel}</h2>
            {valg.tekst && <p id="bekreft-tekst" className="text-sm text-gray-600 dark:text-gray-400 mt-1">{valg.tekst}</p>}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <Button onClick={() => lukk(false)} className="justify-center">{valg.avbrytTekst ?? 'Avbryt'}</Button>
          <Button
            ref={bekreftRef}
            variant={valg.fare ? 'danger' : 'primary'}
            onClick={() => lukk(true)}
            className={cn('justify-center')}
          >
            {valg.bekreftTekst ?? 'Ja'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
