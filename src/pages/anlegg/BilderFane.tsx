/**
 * Bildebanken til et anlegg: alle bilder som er tatt på anlegget, uansett om de kom
 * fra et avvik under kontroll eller ble lastet opp her.
 *
 * Det er ikke et eget lager – bildene ligger i `anlegg.dokumenter` og er registrert
 * i `dokumenter` med type «Bilde». Denne fanen er visningen av dem.
 */
import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/lib/toast'
import { useOfflineStatus } from '@/hooks/useOffline'
import { bildeUrler, hentAnleggsbilder, lastOppAnleggsbilde, slettAnleggsbilde, type Anleggsbilde } from '@/lib/bilder'

export function BilderFane({ anleggId, onAntall }: { anleggId: string; onAntall?: (n: number) => void }) {
  const { isOnline } = useOfflineStatus()
  const [bilder, setBilder] = useState<Anleggsbilde[]>([])
  const [urler, setUrler] = useState<Record<string, string>>({})
  const [laster, setLaster] = useState(true)
  const [lasterOpp, setLasterOpp] = useState(false)
  const [apent, setApent] = useState<Anleggsbilde | null>(null)
  const [sletter, setSletter] = useState<Anleggsbilde | null>(null)
  const velgRef = useRef<HTMLInputElement>(null)
  const kameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => { last() }, [anleggId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function last() {
    setLaster(true)
    try {
      const liste = await hentAnleggsbilder(anleggId)
      setBilder(liste)
      onAntall?.(liste.length)
      setUrler(await bildeUrler(liste.map(b => b.storagePath)))
    } catch (e) {
      console.error('Kunne ikke hente bildene:', e)
      toast.error('Kunne ikke hente bildene', e)
    } finally {
      setLaster(false)
    }
  }

  async function leggTil(filer: FileList | null) {
    const valgte = Array.from(filer ?? []).filter(f => f.type.startsWith('image/'))
    if (valgte.length === 0) return
    setLasterOpp(true)
    try {
      for (const fil of valgte) await lastOppAnleggsbilde(anleggId, fil)
      toast.success(valgte.length === 1 ? 'Bildet er lagret på anlegget' : `${valgte.length} bilder er lagret på anlegget`)
      await last()
    } catch (e) {
      console.error('Kunne ikke laste opp bildet:', e)
      toast.error('Kunne ikke laste opp bildet', e)
    } finally {
      setLasterOpp(false)
    }
  }

  async function slett(bilde: Anleggsbilde) {
    try {
      await slettAnleggsbilde(bilde)
      toast.success('Bildet er slettet')
      setSletter(null)
      setApent(null)
      await last()
    } catch (e) {
      console.error('Kunne ikke slette bildet:', e)
      toast.error('Kunne ikke slette bildet', e)
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Bilder</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Bilder tatt på avvik under kontroll havner her automatisk.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={kameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { leggTil(e.target.files); e.target.value = '' }} />
          <input ref={velgRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { leggTil(e.target.files); e.target.value = '' }} />
          <Button icon={<Camera />} disabled={!isOnline || lasterOpp} onClick={() => kameraRef.current?.click()}>Ta bilde</Button>
          <Button variant="primary" icon={<ImagePlus />} loading={lasterOpp} disabled={!isOnline} onClick={() => velgRef.current?.click()}>Last opp</Button>
        </div>
      </div>

      {!isOnline && (
        <p className="text-xs text-amber-700 dark:text-amber-400">Uten nett kan du se bildene som allerede er lastet, men ikke legge til nye.</p>
      )}

      {laster ? (
        <div className="py-12 text-center text-sm text-gray-500 inline-flex items-center justify-center gap-2 w-full">
          <Loader2 className="w-4 h-4 animate-spin" />Henter bildene …
        </div>
      ) : bilder.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">Ingen bilder på anlegget ennå.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {bilder.map(b => (
            <li key={b.id} className="relative group">
              <button
                type="button"
                onClick={() => setApent(b)}
                className="block w-full aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-dark-100"
              >
                {urler[b.storagePath]
                  ? <img src={urler[b.storagePath]} alt={b.filnavn} className="w-full h-full object-cover" loading="lazy" />
                  : <span className="w-full h-full flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></span>}
              </button>
              <button
                type="button"
                onClick={() => setSletter(b)}
                aria-label={`Slett ${b.filnavn}`}
                className="absolute top-1.5 right-1.5 w-8 h-8 inline-flex items-center justify-center bg-black/60 hover:bg-red-600 text-white rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {b.opplastetDato ? new Date(b.opplastetDato).toLocaleDateString('nb-NO') : ''}
                {b.opplastetAv ? ` · ${b.opplastetAv}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      {apent && urler[apent.storagePath] && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setApent(null)}>
          <img src={urler[apent.storagePath]} alt={apent.filnavn} className="max-w-full max-h-full object-contain" />
          <button type="button" aria-label="Lukk" onClick={() => setApent(null)} className="absolute top-4 right-4 w-10 h-10 inline-flex items-center justify-center bg-black/60 hover:bg-black text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {sletter && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSletter(null)}>
          <div className="card max-w-sm w-full space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Slette bildet?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Bildet fjernes fra anlegget. Er det brukt på et avvik i en rapport som allerede er sendt, står det fortsatt i den PDF-en.
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setSletter(null)}>Avbryt</Button>
              <Button variant="danger" icon={<Trash2 />} onClick={() => slett(sletter)}>Slett</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
