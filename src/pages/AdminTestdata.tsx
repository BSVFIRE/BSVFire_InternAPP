/**
 * Testdata: opprett en testkunde med fire anlegg, kjør gjennom det du vil teste,
 * og slett alt etterpå.
 *
 * Testdataene ligger i produksjonsbasen og oppfører seg som ekte data – ellers
 * kunne man ikke testet kontrollplanen, ukesplanen eller dashbordet med dem.
 * De er merket med `er_testdata` og heter «TEST – …», og slettes med ett trykk.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Building2, CheckCircle2, Copy, FlaskConical, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Testprotokoll } from '@/components/Testprotokoll'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import {
  MODULER, TESTANLEGG, TEST_DROPBOX_MAPPE, TEST_KUNDENAVN, TEST_KUNDENUMMER,
  hentTestdatastatus, opprettTestdata, slettTestdata,
  type ModulNokkel, type Slettresultat, type Testdatastatus,
} from '@/lib/testdata'

export function AdminTestdata() {
  const [status, setStatus] = useState<Testdatastatus | null>(null)
  const [laster, setLaster] = useState(true)
  const [jobber, setJobber] = useState(false)
  const [melding, setMelding] = useState('')
  const [valgte, setValgte] = useState<Set<ModulNokkel>>(new Set(MODULER.map(m => m.nokkel)))
  const [bekreftSlett, setBekreftSlett] = useState(false)
  const [sisteSletting, setSisteSletting] = useState<Slettresultat | null>(null)

  useEffect(() => { last() }, [])

  async function last() {
    setLaster(true)
    try {
      setStatus(await hentTestdatastatus())
    } catch (e) {
      toast.error('Kunne ikke hente status for testdata', e)
    } finally {
      setLaster(false)
    }
  }

  async function opprett() {
    setJobber(true)
    setSisteSletting(null)
    try {
      const res = await opprettTestdata([...valgte], setMelding)
      setStatus(res)
      toast.success(`${res.anlegg.length} testanlegg opprettet`, 'Husk å slette dem når du er ferdig.')
    } catch (e) {
      console.error('Kunne ikke opprette testdata:', e)
      toast.error('Kunne ikke opprette testdata', e)
      await last()
    } finally {
      setJobber(false)
      setMelding('')
    }
  }

  async function slett() {
    setJobber(true)
    setBekreftSlett(false)
    try {
      const res = await slettTestdata(setMelding)
      setSisteSletting(res)
      setStatus({ kundeId: null, anlegg: [] })
      toast.success('Testdataene er slettet', `${res.anlegg} anlegg, ${res.kunder} kunde og ${res.filer} filer.`)
    } catch (e) {
      console.error('Kunne ikke slette testdata:', e)
      toast.error('Kunne ikke slette testdata', e)
      await last()
    } finally {
      setJobber(false)
      setMelding('')
    }
  }

  const finnes = Boolean(status?.kundeId || status?.anlegg.length)

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/dashboard" className="hover:text-gray-900 dark:hover:text-white">Dashboard</Link>
        <span>/</span><span>Administrator</span><span>/</span>
        <span className="text-gray-900 dark:text-white">Testdata</span>
      </div>

      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white inline-flex items-center gap-2.5">
          <FlaskConical className="w-6 h-6 text-primary" />Testdata
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          En testkunde med fire anlegg som dekker alle kontrollmodulene. Slettes helt når du er ferdig.
        </p>
      </header>

      <div className="card bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-900/40">
        <p className="text-sm text-amber-900 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Testdataene ligger i den vanlige databasen og teller med i kontrollplan, ukesplan og
            dashbord mens de finnes – det er nettopp derfor de kan brukes til å teste de sidene.
            Rapporter som lagres går til Dropbox, og e-post sendes på ekte, til din egen adresse.
          </span>
        </p>
      </div>

      {laster ? (
        <div className="card py-12 text-center text-sm text-gray-500 inline-flex items-center justify-center gap-2 w-full">
          <Loader2 className="w-4 h-4 animate-spin" />Henter status …
        </div>
      ) : finnes ? (
        <div className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Testdata finnes
            </h2>
            <Button variant="danger" icon={<Trash2 />} loading={jobber} onClick={() => setBekreftSlett(true)}>
              Slett testdata
            </Button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Kunde <strong>{TEST_KUNDENAVN}</strong> (kundenr. {TEST_KUNDENUMMER}) med {status?.anlegg.length} anlegg.
          </p>
          {status?.anlegg.length === 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Settet er ufullstendig – kunden finnes, men ingen anlegg. Slett og opprett på nytt.
            </p>
          )}
          <ul className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg">
            {status?.anlegg.map(a => (
              <li key={a.id}>
                <Link to={`/anlegg/${a.id}`} className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-dark-100">
                  <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-900 dark:text-white">{a.navn}</span>
                </Link>
              </li>
            ))}
          </ul>
          {jobber && melding && (
            <p className="text-xs text-gray-500 inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />{melding}</p>
          )}
        </div>
      ) : (
        <div className="card space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Hva som opprettes</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Velg bort det du ikke trenger – det går raskere, og du får færre ting å se etter.
            </p>
          </div>

          <ul className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg">
            {MODULER.map(m => (
              <li key={m.nokkel} className="flex items-start gap-3 px-3 py-2.5">
                <input
                  id={`modul-${m.nokkel}`}
                  type="checkbox"
                  checked={valgte.has(m.nokkel)}
                  onChange={e => setValgte(f => {
                    const ny = new Set(f)
                    if (e.target.checked) ny.add(m.nokkel); else ny.delete(m.nokkel)
                    return ny
                  })}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor={`modul-${m.nokkel}`} className="flex-1 cursor-pointer">
                  <span className="block text-sm text-gray-900 dark:text-white">{m.navn}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{m.beskrivelse}</span>
                </label>
              </li>
            ))}
          </ul>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Anleggene</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {TESTANLEGG.map(a => (
                <li key={a.navn} className="border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2.5">
                  <span className="block text-sm text-gray-900 dark:text-white">{a.navn.replace('TEST – ', '')}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {a.moduler.length === 0
                      ? 'Uten data – for tomme tilstander og import'
                      : a.moduler.filter(m => m !== 'kontaktpersoner').map(m => MODULER.find(x => x.nokkel === m)?.navn).join(', ')}
                    {a.standard ? ` · ${a.standard}` : ''}
                    {a.erLeilighetsbygg ? ' · leilighetsbygg' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" icon={<FlaskConical />} loading={jobber} onClick={opprett}>
              Opprett testdata
            </Button>
            {jobber && melding && <span className="text-xs text-gray-500">{melding}</span>}
          </div>
        </div>
      )}

      {sisteSletting && (
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Slettet</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {sisteSletting.anlegg} anlegg, {sisteSletting.kunder} kunde og {sisteSletting.filer} filer i lagring.
          </p>
          {Object.keys(sisteSletting.tabeller).length > 0 && (
            <ul className="text-xs text-gray-500 dark:text-gray-400 grid gap-0.5 sm:grid-cols-2">
              {Object.entries(sisteSletting.tabeller).map(([t, n]) => <li key={t}>{t}: {n}</li>)}
            </ul>
          )}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Dropbox-mappen står igjen. Har testen lagret rapporter, slett den manuelt:
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <code className="text-xs bg-gray-100 dark:bg-dark-100 px-2 py-1 rounded flex-1 truncate">{TEST_DROPBOX_MAPPE}</code>
              <Button
                icon={<Copy />}
                onClick={() => { navigator.clipboard.writeText(TEST_DROPBOX_MAPPE); toast.success('Stien er kopiert') }}
              >
                Kopier
              </Button>
            </div>
          </div>
        </div>
      )}

      <Testprotokoll />

      {bekreftSlett && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setBekreftSlett(false)}>
          <div className={cn('card max-w-md w-full space-y-3')} onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Slette alle testdata?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {status?.anlegg.length} anlegg og kunden <strong>{TEST_KUNDENAVN}</strong> slettes, sammen med alt
              som henger under dem: kontroller, utstyr, avvik, dokumenter og bilder. Dette kan ikke angres.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Bare rader merket som testdata røres. Ekte kunder kan ikke treffes av denne knappen.
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setBekreftSlett(false)}>Avbryt</Button>
              <Button variant="danger" icon={<Trash2 />} onClick={slett}>Slett alt</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
