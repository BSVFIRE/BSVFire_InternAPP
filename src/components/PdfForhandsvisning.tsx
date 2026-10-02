/**
 * Forhåndsvisning av en PDF – alle sider, på alle enheter.
 *
 * En `<iframe src={blobUrl}>` viser bare første side i Safari på iPad og iPhone.
 * WebKit tegner et stillbilde av side 1 og lar deg verken bla eller zoome. Det
 * er ikke noe som kan slås på; den eneste måten å se hele rapporten på er å
 * tegne sidene selv.
 *
 * pdf.js ligger allerede i prosjektet (kunnskapsbasen leser PDF-er med den), så
 * det koster ingen ny avhengighet.
 */
import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { AlertTriangle, Loader2 } from 'lucide-react'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export function PdfForhandsvisning({ blob, className }: { blob: Blob; className?: string }) {
  const beholder = useRef<HTMLDivElement>(null)
  const [laster, setLaster] = useState(true)
  const [antallSider, setAntallSider] = useState(0)
  const [feil, setFeil] = useState<string | null>(null)

  useEffect(() => {
    let avbrutt = false
    const canvaser: HTMLCanvasElement[] = []

    async function tegn() {
      setLaster(true)
      setFeil(null)
      try {
        const data = await blob.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data }).promise
        if (avbrutt) return
        setAntallSider(pdf.numPages)

        const mål = beholder.current
        if (!mål) return
        mål.replaceChildren()

        // Skarpt på skjermer med høy oppløsning, men ikke så stort at iPaden
        // går tom for minne på en rapport med mange sider
        const skala = Math.min(window.devicePixelRatio || 1, 2)

        for (let nr = 1; nr <= pdf.numPages; nr++) {
          if (avbrutt) return
          const side = await pdf.getPage(nr)
          const visning = side.getViewport({ scale: skala })

          const canvas = document.createElement('canvas')
          canvas.width = visning.width
          canvas.height = visning.height
          canvas.className = 'block w-full h-auto rounded-lg shadow-lg bg-white'
          canvas.setAttribute('role', 'img')
          canvas.setAttribute('aria-label', `Side ${nr} av ${pdf.numPages}`)

          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          await side.render({ canvas, canvasContext: ctx, viewport: visning }).promise
          if (avbrutt) return

          mål.appendChild(canvas)
          canvaser.push(canvas)
        }
      } catch (e) {
        if (!avbrutt) {
          console.error('Kunne ikke vise PDF-en:', e)
          setFeil(e instanceof Error ? e.message : 'Ukjent feil')
        }
      } finally {
        if (!avbrutt) setLaster(false)
      }
    }

    tegn()
    return () => {
      avbrutt = true
      // Frigjør minnet – Safari er nøye med dette på mange store canvaser
      for (const c of canvaser) { c.width = 0; c.height = 0 }
    }
  }, [blob])

  return (
    <div className={className}>
      {laster && (
        <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400 inline-flex items-center justify-center gap-2 w-full">
          <Loader2 className="w-4 h-4 animate-spin" />Tegner rapporten …
        </div>
      )}
      {feil && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Kunne ikke vise forhåndsvisningen: {feil}. Du kan fortsatt laste ned rapporten.</span>
        </div>
      )}
      <div ref={beholder} className="space-y-3" />
      {!laster && !feil && antallSider > 0 && (
        <p className="pt-2 text-center text-xs text-gray-500 dark:text-gray-400">{antallSider} {antallSider === 1 ? 'side' : 'sider'}</p>
      )}
    </div>
  )
}
