/**
 * Landingsside for Microsoft-innlogging i popup (/ms-callback).
 * MSAL v5 krever at landingssiden selv kjører MSAL: handleRedirectPromise() leser svaret
 * og sender det til hovedvinduet (BroadcastChannel), som deretter lukker popupen.
 * Ingen innloggingsvakt her – siden skal fungere før FireCtrl-sesjonen er sjekket.
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
      <p className="text-sm text-gray-400">{feil ? `Innlogging feilet: ${feil}` : 'Logger inn… dette vinduet lukkes automatisk.'}</p>
    </div>
  )
}
