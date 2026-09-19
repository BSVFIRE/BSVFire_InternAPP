/**
 * «Koble til Outlook» – vises i Brukerprofil. Innlogging i popup, status, koble fra.
 */
import { useEffect, useState } from 'react'
import { Calendar, Check, Unlink } from 'lucide-react'
import { toast } from '@/lib/toast'
import { erKobletTilOutlook, kobleFraOutlook, kobleTilOutlook, outlookKonto } from '@/lib/microsoft'
import { Button } from '@/components/ui/Button'

export function OutlookKobling() {
  const [koblet, setKoblet] = useState<boolean | null>(null)
  const [jobber, setJobber] = useState(false)
  const konto = outlookKonto()

  useEffect(() => { erKobletTilOutlook().then(setKoblet) }, [])

  async function koble() {
    setJobber(true)
    try { await kobleTilOutlook() /* navigerer bort – siden lastes på nytt etter innlogging */ }
    catch (err) { toast.error('Kunne ikke starte Microsoft-innlogging', err); setJobber(false) }
  }
  async function kobleFra() {
    setJobber(true)
    try { await kobleFraOutlook() }
    catch (err) { toast.error('Kunne ikke koble fra', err); setJobber(false) }
  }

  return (
    <section className="card space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Outlook-kalender</h3>
      {koblet ? (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 inline-flex items-center gap-2"><Check className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={3} />Koblet til <span className="font-medium text-gray-900 dark:text-white">{konto?.username}</span>. Avtalene dine vises i «Neste opp» på dashboardet, og ordre kan legges i kalenderen.</p>
          <Button variant="outline" icon={<Unlink />} loading={jobber} onClick={kobleFra}>Koble fra</Button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400">Koble til Microsoft 365-kontoen din for å se kalenderavtaler på dashboardet og legge ordre rett i kalenderen. Du logger inn hos Microsoft – FireCtrl lagrer ikke passordet ditt.</p>
          <Button variant="primary" icon={<Calendar />} loading={jobber} disabled={koblet === null} onClick={koble}>Koble til Outlook</Button>
        </>
      )}
    </section>
  )
}
