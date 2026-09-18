/**
 * Varsler til bruker – erstatning for alert().
 *
 * Bruk:
 *   toast.success('Ordre lagret')
 *   toast.error('Kunne ikke lagre ordre', error)   // error logges, melding vises
 *   toast.info('Ingen endringer å synkronisere')
 *
 * <Toaster /> er montert i App.tsx. alert() og confirm() blokkerer UI og kan ikke
 * styles; toasts forsvinner av seg selv og stopper ikke arbeidsflyten.
 */
import { toast as sonner } from 'sonner'

function feilmelding(error: unknown): string | undefined {
  if (!error) return undefined
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

export const toast = {
  success: (melding: string, beskrivelse?: string) =>
    sonner.success(melding, { description: beskrivelse }),

  info: (melding: string, beskrivelse?: string) =>
    sonner.info(melding, { description: beskrivelse }),

  warning: (melding: string, beskrivelse?: string) =>
    sonner.warning(melding, { description: beskrivelse }),

  /** Viser feilmelding. Detaljer fra error-objektet vises som undertekst. */
  error: (melding: string, error?: unknown) =>
    sonner.error(melding, { description: feilmelding(error), duration: 6000 }),

  /** Viser en «arbeider…»-toast som oppdateres når promise er ferdig. */
  promise: <T,>(
    promise: Promise<T>,
    meldinger: { loading: string; success: string; error: string }
  ) => sonner.promise(promise, meldinger),

  dismiss: sonner.dismiss,
}
