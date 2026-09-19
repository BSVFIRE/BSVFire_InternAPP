/**
 * Landingsside for Microsoft-innlogging (/ms-callback, redirect-flyt).
 * handleRedirectPromise() leser svaret og sender brukeren videre til siden innloggingen
 * startet fra. Ingen innloggingsvakt her – siden skal fungere før FireCtrl-sesjonen er sjekket.
 */
import { useEffect, useState } from 'react'
import { fullforMicrosoftRedirect } from '@/lib/microsoft'

export function MsCallback() {
  const [feil, setFeil] = useState<string | null>(null)
  useEffect(() => {
    fullforMicrosoftRedirect().catch(err => setFeil(err instanceof Error ? err.message : 'Ukjent feil'))
  }, [])
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6 text-center">
      <p className="text-sm text-gray-400">{feil ? `Innlogging feilet: ${feil}` : 'Fullfører innlogging…'}</p>
    </div>
  )
}
