/**
 * Skiller finger fra mus.
 *
 * Brukes der oppførselen – ikke bare utseendet – skal være forskjellig. En iPad i
 * landskap er bredere enn de fleste bruddpunkter, så skjermbredde sier ingenting
 * om hva brukeren peker med. Til ren styling finnes skjermnavnet «mus» i
 * tailwind.config.js, som er det samme spørsmålet motsatt vei.
 */
import { useEffect, useState } from 'react'

const SPØRRING = '(pointer: coarse)'

export function useGrovPeker(): boolean {
  const [grov, setGrov] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(SPØRRING).matches
  })

  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia(SPØRRING)
    const endret = (e: MediaQueryListEvent) => setGrov(e.matches)
    // Et nettbrett med tastaturdeksel kan bytte underveis
    mq.addEventListener('change', endret)
    return () => mq.removeEventListener('change', endret)
  }, [])

  return grov
}
