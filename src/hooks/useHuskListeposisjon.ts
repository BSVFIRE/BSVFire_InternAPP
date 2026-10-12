/**
 * Husker hvor i en lang liste du var, og hvor mange rader som var lastet.
 *
 * Lister som laster flere rader etter hvert som du ruller, starter på nytt når du
 * går inn på en rad og tilbake igjen: både rulleposisjonen og de ekstra radene er
 * borte. På en liste med flere hundre anlegg betyr det at du må finne fram på nytt
 * hver gang du har sett på ett av dem.
 *
 * Nøkkelen bør inneholde filtrene (gjerne URL-ens søkestreng), slik at posisjonen
 * fra ett filter ikke gjenopprettes i et annet.
 *
 * sessionStorage og ikke localStorage: dette gjelder økten du er i nå. Kommer du
 * tilbake i morgen, skal listen starte på toppen.
 */
import { useEffect, useRef } from 'react'

interface Posisjon { y: number; visAntall: number }

/** Eldre enn dette regnes som en ny økt, ikke «tilbake fra et anlegg». */
const MAKS_ALDER_MS = 30 * 60 * 1000

export function useHuskListeposisjon(
  nokkel: string,
  visAntall: number,
  setVisAntall: (n: number) => void,
  /** Settes når radene faktisk er tegnet – ellers er det ingenting å rulle til */
  klar: boolean,
) {
  const lagret = useRef<Posisjon | null>(null)
  // 'venter' → 'rader' (antallet er bedt om) → 'ferdig' (rullet, eller ingenting å gjøre)
  const steg = useRef<'venter' | 'rader' | 'ferdig'>('venter')

  useEffect(() => { if (nokkel) lagret.current = les(nokkel) }, [nokkel])

  /*
   * Gjenopprettingen må skje i to trinn, og først når dataene er på plass.
   * Listene nullstiller antallet synlige rader idet dataene kommer inn – skrev vi
   * antallet før det, ville det blitt overskrevet med én gang.
   */
  useEffect(() => {
    if (!nokkel || !klar || steg.current === 'ferdig') return
    const p = lagret.current
    if (!p?.y) { steg.current = 'ferdig'; return }

    if (steg.current === 'venter') {
      steg.current = 'rader'
      if (p.visAntall > visAntall) { setVisAntall(p.visAntall); return }
    }
    // Radene er bedt om. Vent to bilder, så de har fått høyde, før vi ruller.
    steg.current = 'ferdig'
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: p.y })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nokkel, klar, visAntall])

  /*
   * Posisjonen føres med underveis, ikke leses ved opprydding.
   *
   * Når React fjerner listen fra siden blir dokumentet kort, og nettleseren
   * klemmer window.scrollY til 0. Leste vi den i opprydningen, lagret vi null –
   * og listen hoppet til toppen selv om alt annet virket.
   */
  const sisteY = useRef(0)
  /*
   * Har brukeren faktisk rullet i denne monteringen? I utviklingsmodus monterer
   * React alt to ganger, og opprydningen etter den første ville ellers skrevet
   * y = 0 over posisjonen vi nettopp skulle hente fram.
   */
  const harRullet = useRef(false)
  useEffect(() => {
    if (!nokkel) return
    sisteY.current = window.scrollY
    let timer: number | undefined
    function lagre() {
      const y = window.scrollY
      /*
       * Når listen fjernes fra siden kollapser dokumentet, og nettleseren utløser
       * en scroll-hendelse med y = 0. Den ser ut som om du rullet til toppen, og
       * ødela posisjonen vi nettopp hadde. Er siden blitt for kort til å romme
       * posisjonen vi sto i, er det en kollaps og ikke en bevegelse.
       */
      if (y === 0 && sisteY.current > 0 && document.documentElement.scrollHeight < sisteY.current) return
      sisteY.current = y
      harRullet.current = true
      window.clearTimeout(timer)
      timer = window.setTimeout(() => skriv(nokkel, { y: sisteY.current, visAntall }), 150)
    }
    window.addEventListener('scroll', lagre, { passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', lagre)
      if (!harRullet.current) return
      skriv(nokkel, { y: sisteY.current, visAntall })
    }
  }, [nokkel, visAntall])
}

function nokkelFor(nokkel: string) { return `listeposisjon_${nokkel}` }

function les(nokkel: string): Posisjon | null {
  try {
    const rå = sessionStorage.getItem(nokkelFor(nokkel))
    if (!rå) return null
    const x = JSON.parse(rå) as Posisjon & { tid?: number }
    if (!x.tid || Date.now() - x.tid > MAKS_ALDER_MS) return null
    return { y: Number(x.y) || 0, visAntall: Number(x.visAntall) || 0 }
  } catch {
    return null
  }
}

function skriv(nokkel: string, p: Posisjon) {
  try {
    sessionStorage.setItem(nokkelFor(nokkel), JSON.stringify({ ...p, tid: Date.now() }))
  } catch {
    // Full lagring skal ikke stoppe navigeringen
  }
}
