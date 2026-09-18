/**
 * Kamera-basert QR-leser (jsqr). Kaller onResult med råteksten i koden.
 * Fungerer i Safari (iOS) og Chrome (Android) uten app-installasjon.
 */
import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff } from 'lucide-react'
import jsQR from 'jsqr'

export function QrSkanner({ onResult, aktiv = true }: { onResult: (tekst: string) => void; aktiv?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [feil, setFeil] = useState<string | null>(null)
  const [klar, setKlar] = useState(false)

  useEffect(() => {
    if (!aktiv) return
    let stream: MediaStream | null = null
    let raf = 0
    let stoppet = false

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        const video = videoRef.current
        if (!video || stoppet) return
        video.srcObject = stream
        video.setAttribute('playsinline', 'true') // iOS: ikke fullskjerm
        await video.play()
        setKlar(true)
        loop()
      } catch (err) {
        setFeil(err instanceof Error && err.name === 'NotAllowedError'
          ? 'Kameratilgang ble avvist. Tillat kamera i nettleseren, eller tast koden manuelt.'
          : 'Kunne ikke starte kameraet. Tast koden manuelt.')
      }
    }

    function loop() {
      if (stoppet) return
      const video = videoRef.current, canvas = canvasRef.current
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const w = Math.min(video.videoWidth, 640)
        const h = Math.round(video.videoHeight * (w / video.videoWidth))
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h)
          const bilde = ctx.getImageData(0, 0, w, h)
          const treff = jsQR(bilde.data, w, h, { inversionAttempts: 'dontInvert' })
          if (treff?.data) { onResult(treff.data); return }
        }
      }
      raf = requestAnimationFrame(loop)
    }

    start()
    return () => {
      stoppet = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [aktiv, onResult])

  if (feil) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-sm text-gray-900 dark:text-gray-100">
        <CameraOff className="w-5 h-5 text-yellow-700 dark:text-yellow-400 flex-shrink-0" />{feil}
      </div>
    )
  }

  return (
    <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
      <video ref={videoRef} muted className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      {/* Sikteramme */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-3/5 aspect-square border-2 border-white/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      </div>
      {!klar && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-white text-sm"><Camera className="w-5 h-5" />Starter kamera…</div>
      )}
    </div>
  )
}
