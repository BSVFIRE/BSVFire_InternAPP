/**
 * «Vis flere»-liste som laster automatisk når bunnen kommer til syne.
 *
 *   const { synlig, merRef, harMer, visAntall } = useUendeligListe(filtrert, 25)
 *   …
 *   {harMer && <div ref={merRef}>Laster flere …</div>}
 *
 * Antallet nullstilles når listen endrer seg (nytt filter eller søk).
 */
import { useEffect, useMemo, useRef, useState } from 'react'

export function useUendeligListe<T>(rader: T[], side = 25) {
  const [visAntall, setVisAntall] = useState(side)
  const merRef = useRef<HTMLDivElement>(null)
  const antall = rader.length

  // Nytt filter/søk: start på første side igjen
  useEffect(() => { setVisAntall(side) }, [antall, side])

  const harMer = antall > visAntall
  useEffect(() => {
    const el = merRef.current
    if (!el || !harMer) return
    const obs = new IntersectionObserver(([x]) => { if (x.isIntersecting) setVisAntall(n => n + side) }, { rootMargin: '400px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [harMer, visAntall, side])

  const synlig = useMemo(() => rader.slice(0, visAntall), [rader, visAntall])
  return { synlig, merRef, harMer, visAntall: Math.min(visAntall, antall), visFlere: () => setVisAntall(n => n + side) }
}
