/**
 * Batterifelt: brukerne skriver årstallet batteriet ble montert (2025), men eldre data
 * kan være lagret som alder i år (3). Begge tolkes: >= 1990 = årstall, ellers = alder.
 */
export interface BatteriInfo { montertAar: number | null; alder: number | null; tone: 'r' | 'y' | null; tekst: string }

export function batteriInfo(verdi: string | number | null | undefined, naa = new Date().getFullYear()): BatteriInfo {
  const n = typeof verdi === 'number' ? verdi : parseInt(String(verdi ?? '').trim(), 10)
  if (!n || isNaN(n)) return { montertAar: null, alder: null, tone: null, tekst: '' }
  const montertAar = n >= 1990 ? n : naa - n
  const alder = Math.max(0, naa - montertAar)
  const tone = alder >= 5 ? 'r' : alder >= 4 ? 'y' : null
  return { montertAar, alder, tone, tekst: `${montertAar} · ${alder} år${tone === 'r' ? ' · bytt' : ''}` }
}

export function batteriAdvarsel(verdi: string | number | null | undefined): string | undefined {
  const b = batteriInfo(verdi)
  if (b.tone === 'r') return `Montert ${b.montertAar} – ${b.alder} år, bør byttes`
  if (b.tone === 'y') return `Montert ${b.montertAar} – ${b.alder} år, nærmer seg bytte`
  return undefined
}
