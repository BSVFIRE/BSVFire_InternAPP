/** Felles typer og valg for førstehjelp. */

export interface ForstehjelpEnhet {
  id: string
  anlegg_id: string
  internnummer: string | null
  type: string | null
  plassering: string | null
  etasje: string | null
  produsent: string | null
  utlopsdato: string | null
  status: string | null
  kontrollert: boolean | null
  kommentar: string | null
  kundenavn: string | null
  sjekkpunkter: Record<string, boolean> | null
  tillegg: string[] | null
  created_at: string
}

export const STATUSER = ['OK', 'Defekt', 'Mangler', 'Utskiftet', 'Utgått'] as const
/** Statuser som teller som avvik */
export const AVVIK_STATUSER = new Set(['Defekt', 'Mangler', 'Utgått'])

export const ETASJER = ['-2.Etg', '-1.Etg', '0.Etg', '1.Etg', '2.Etg', '3.Etg', '4.Etg', '5.Etg', '6.Etg', '7.Etg', '8.Etg', '9.Etg', '10.Etg'] as const
export const TYPER = ['Førstehjelpskoffert', 'Øyeskylling', 'Hjertestarter (AED)', 'Førstehjelpsstasjon', 'Båre', 'Annet'] as const
export const TILLEGG = ['Plasterstasjon', 'Brannskade'] as const

export const STATUS_FARGE: Record<string, string> = {
  OK: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  Defekt: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  Mangler: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  Utgått: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  Utskiftet: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
}

/** Sjekkpunktene som gjelder hver type utstyr */
export const SJEKKPUNKTER: Record<string, string[]> = {
  'Førstehjelpskoffert': ['Innhold komplett', 'Utløpsdato OK', 'Plassering synlig', 'Skilt på plass'],
  'Øyeskylling': ['Væske ikke utgått', 'Tilgjengelig', 'Skilt på plass'],
  'Hjertestarter (AED)': ['Batteri OK', 'Elektroder OK', 'Tilgjengelig', 'Skilt på plass'],
  'Førstehjelpsstasjon': ['Innhold komplett', 'Utløpsdato OK', 'Plassering synlig', 'Skilt på plass'],
  'Plasterstasjon': ['Innhold komplett', 'Utløpsdato OK', 'Tilgjengelig'],
  'Båre': ['Tilstand OK', 'Tilgjengelig'],
  'Annet': ['Tilstand OK'],
}

export function punkterFor(type: string | null): string[] {
  return SJEKKPUNKTER[type ?? ''] ?? SJEKKPUNKTER['Annet']
}

/**
 * Utløpsdato er det viktigste i denne modulen: innhold i en koffert, øyeskyllevæske og
 * elektroder til hjertestarter har alle en holdbarhet. Vi varsler i god tid før den går ut.
 */
export type Utlop = { tilstand: 'utgatt' | 'snart' | 'ok'; tekst: string; dager: number } | null

export function utlopsinfo(dato: string | null | undefined, varselDager = 90): Utlop {
  if (!dato) return null
  const d = new Date(dato)
  if (isNaN(d.getTime())) return null
  const dager = Math.round((d.getTime() - Date.now()) / 86400000)
  const vist = d.toLocaleDateString('nb-NO', { month: '2-digit', year: 'numeric' })
  if (dager < 0) return { tilstand: 'utgatt', tekst: `Utgikk ${vist}`, dager }
  if (dager <= varselDager) return { tilstand: 'snart', tekst: `Utgår ${vist}`, dager }
  return { tilstand: 'ok', tekst: vist, dager }
}

export function enhetNavn(e: ForstehjelpEnhet): string {
  return [e.internnummer, e.type, e.plassering].filter(Boolean).join(' · ') || 'Uten navn'
}
