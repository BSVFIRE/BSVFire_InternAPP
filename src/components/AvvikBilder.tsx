/**
 * Bilder på et avvik. Stien lagres sammen med avviket med én gang, og bildet følger
 * avviket inn i kontrollrapporten.
 *
 * Uten dekning legges bildet i kø på enheten (se `bildekoe.ts`) og lastes opp når
 * nettet er tilbake. Teknikeren merker ingen forskjell utover en liten sky-markør.
 */
import { useEffect, useRef, useState } from 'react'
import { Camera, CloudOff, ImagePlus, Loader2, X } from 'lucide-react'
import { MAKS_BILDER_PER_AVVIK, bildeUrler, lastOppAnleggsbilde } from '@/lib/bilder'
import { koHent } from '@/lib/bildekoe'
import { toast } from '@/lib/toast'

export function AvvikBilder({ anleggId, bilder, onEndre, merkelapp, maks = MAKS_BILDER_PER_AVVIK }: {
  anleggId: string
  bilder: string[]
  onEndre: (bilder: string[]) => void
  /** Navnet på kontrollpunktet – blir en del av filnavnet, så bildet er til å kjenne igjen */
  merkelapp?: string
  maks?: number
}) {
  const [urler, setUrler] = useState<Record<string, string>>({})
  const [venter, setVenter] = useState<Set<string>>(new Set())
  const [laster, setLaster] = useState(false)
  const velgRef = useRef<HTMLInputElement>(null)
  const kameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const mangler = bilder.filter(b => !urler[b])
    if (mangler.length === 0) return
    let aktiv = true
    bildeUrler(mangler).then(nye => { if (aktiv) setUrler(f => ({ ...f, ...nye })) })
    Promise.all(bilder.map(async b => [b, Boolean(await koHent(b))] as const))
      .then(par => { if (aktiv) setVenter(new Set(par.filter(([, v]) => v).map(([b]) => b))) })
    return () => { aktiv = false }
  }, [bilder]) // eslint-disable-line react-hooks/exhaustive-deps

  async function leggTil(filer: FileList | null) {
    const valgte = Array.from(filer ?? []).filter(f => f.type.startsWith('image/'))
    if (valgte.length === 0) return

    const plass = maks - bilder.length
    if (valgte.length > plass) {
      toast.warning(`Maks ${maks} bilder per avvik`, `Tar med de ${plass} første.`)
    }

    setLaster(true)
    const nye: string[] = []
    try {
      for (const fil of valgte.slice(0, plass)) {
        nye.push(await lastOppAnleggsbilde(anleggId, fil, merkelapp))
      }
      onEndre([...bilder, ...nye])
    } catch (e) {
      console.error('Kunne ikke laste opp bildet:', e)
      toast.error('Kunne ikke laste opp bildet', e)
      if (nye.length > 0) onEndre([...bilder, ...nye])
    } finally {
      setLaster(false)
    }
  }

  const fullt = bilder.length >= maks

  return (
    <div className="flex flex-wrap items-center gap-2">
      {bilder.map(sti => (
        <div key={sti} className="relative group">
          <a href={urler[sti]} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-dark-100">
            {urler[sti]
              ? <img src={urler[sti]} alt="Bilde av avviket" className="w-full h-full object-cover" />
              : <span className="w-full h-full flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></span>}
          </a>
          {venter.has(sti) && (
            <span title="Lastes opp når nettet er tilbake" className="absolute bottom-0.5 left-0.5 w-5 h-5 inline-flex items-center justify-center bg-black/60 text-white rounded-full">
              <CloudOff className="w-3 h-3" />
            </span>
          )}
          <button
            type="button"
            onClick={() => onEndre(bilder.filter(b => b !== sti))}
            aria-label="Fjern bildet fra avviket"
            className="absolute -top-1.5 -right-1.5 w-6 h-6 inline-flex items-center justify-center bg-black/70 hover:bg-red-600 text-white rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {!fullt && (
        <>
          <input ref={kameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { leggTil(e.target.files); e.target.value = '' }} />
          <input ref={velgRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { leggTil(e.target.files); e.target.value = '' }} />
          <button
            type="button"
            disabled={laster}
            onClick={() => kameraRef.current?.click()}
            title="Ta bilde av avviket"
            className="w-16 h-16 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-orange-400 hover:text-orange-600 disabled:opacity-40 disabled:hover:border-gray-300 inline-flex flex-col items-center justify-center gap-0.5"
          >
            {laster ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            <span className="text-[10px] leading-none">Ta bilde</span>
          </button>
          <button
            type="button"
            disabled={laster}
            onClick={() => velgRef.current?.click()}
            title="Velg bilde fra enheten"
            className="w-16 h-16 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-orange-400 hover:text-orange-600 disabled:opacity-40 disabled:hover:border-gray-300 inline-flex flex-col items-center justify-center gap-0.5"
          >
            <ImagePlus className="w-4 h-4" />
            <span className="text-[10px] leading-none">Velg</span>
          </button>
        </>
      )}
    </div>
  )
}
