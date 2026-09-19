/**
 * «Koble til Outlook» – vises i Brukerprofil. Innlogging i popup, status, koble fra.
 */
import { useEffect, useState } from 'react'
import { Calendar, Check, Unlink } from 'lucide-react'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { erKobletTilOutlook, hentKalendere, kobleFraOutlook, kobleTilOutlook, lagreValgteKalendere, outlookKonto, valgteKalendere, type Kalender } from '@/lib/microsoft'
import { Button } from '@/components/ui/Button'

export function OutlookKobling() {
  const [koblet, setKoblet] = useState<boolean | null>(null)
  const [jobber, setJobber] = useState(false)
  const konto = outlookKonto()

  const [kalendere, setKalendere] = useState<Kalender[]>([])
  const [valgte, setValgte] = useState<string[]>(valgteKalendere())

  useEffect(() => {
    erKobletTilOutlook().then(async k => {
      setKoblet(k)
      if (k) {
        try {
          const liste = await hentKalendere()
          setKalendere(liste)
          // Første gang: velg standardkalenderen
          if (valgteKalendere().length === 0) { const std = liste.filter(x => x.standard).map(x => x.id); setValgte(std); lagreValgteKalendere(std) }
        } catch { /* vises uten kalenderliste */ }
      }
    })
  }, [])

  function toggleKalender(id: string) {
    const n = valgte.includes(id) ? valgte.filter(x => x !== id) : [...valgte, id]
    setValgte(n); lagreValgteKalendere(n)
  }

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
          {kalendere.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Kalendere som vises på dashboardet</p>
              <div className="flex flex-wrap gap-2">
                {kalendere.map(k => (
                  <label key={k.id} className={cn('inline-flex items-center gap-2 px-3 h-9 rounded-full border text-sm cursor-pointer select-none', valgte.includes(k.id) ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300')}>
                    <input type="checkbox" checked={valgte.includes(k.id)} onChange={() => toggleKalender(k.id)} className="w-3.5 h-3.5 rounded text-primary focus:ring-primary" />
                    {k.farge && <span className="w-2.5 h-2.5 rounded-full" style={{ background: k.farge }} />}
                    {k.navn}{k.eier && !k.standard ? <span className="text-xs text-gray-500 dark:text-gray-400">· {k.eier}</span> : null}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Private kalendere som er synket inn i Outlook kan du bare la være å huke av.</p>
            </div>
          )}
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
