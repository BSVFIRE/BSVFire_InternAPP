/**
 * Feltredigering forstørret – det som kommer opp når du trykker på en celle i en
 * utstyrsliste med fingeren.
 *
 * Tabellen beholdes på nettbrett fordi oversikten er verdt mye, men en celle på
 * 30 piksler lar seg verken treffe eller skrive i. Dialogen gir feltet navn,
 * forteller hvilken enhet det gjelder, og tilbyr verdiene som allerede finnes i
 * listen som knapper – det er som regel raskere enn å taste.
 *
 * Skriftstørrelsen er 16 px med vilje: er feltet mindre, zoomer iOS inn på siden
 * av seg selv når det får fokus, og da sitter du igjen med en forskjøvet tabell.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function FeltDialog({ tittel, undertittel, verdi, valg, forslag, onLagre, onAvbryt }: {
  tittel: string
  /** Hvilken enhet raden gjelder, så du ser at du traff riktig */
  undertittel: string
  verdi: string
  /** Faste valg vises som rutenett i stedet for nedtrekk */
  valg?: readonly string[]
  /** Verdier som allerede finnes i listen, vist som knapper */
  forslag?: string[]
  onLagre: (verdi: string, videre: boolean) => void
  onAvbryt: () => void
}) {
  const [v, setV] = useState(verdi)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => ref.current?.focus(), 50) }, [])
  useEffect(() => {
    function tast(e: KeyboardEvent) { if (e.key === 'Escape') onAvbryt() }
    document.addEventListener('keydown', tast)
    return () => document.removeEventListener('keydown', tast)
  }, [onAvbryt])

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-3 sm:p-4" onClick={onAvbryt} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${tittel} for ${undertittel}`}
        onClick={e => e.stopPropagation()}
        className="card w-full sm:max-w-md space-y-3"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{tittel}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{undertittel}</p>
        </div>

        {valg ? (
          <div className="grid grid-cols-3 gap-2">
            {['', ...valg].map(x => (
              <button
                key={x || '–'}
                type="button"
                onClick={() => onLagre(x, false)}
                className={cn('h-12 rounded-lg border text-sm', x === v
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300')}
              >
                {x || '–'}
              </button>
            ))}
          </div>
        ) : (
          <>
            <input
              ref={ref}
              value={v}
              onChange={e => setV(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onLagre(v, true) } }}
              className="input !h-12 !min-h-12 text-base"
            />
            {forslag && forslag.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {forslag.slice(0, 12).map(x => (
                  <button
                    key={x}
                    type="button"
                    onClick={() => onLagre(x, false)}
                    className="h-9 px-3 rounded-full border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300"
                  >
                    {x}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button onClick={onAvbryt} className="justify-center">Avbryt</Button>
          <Button variant="primary" onClick={() => onLagre(v, false)} className="flex-1 justify-center">Lagre</Button>
          <Button onClick={() => onLagre(v, true)} className="justify-center whitespace-nowrap">Neste rad</Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
