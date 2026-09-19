export interface NodlysEnhet {
  id: string
  anlegg_id: string | null
  internnummer: string | null
  amatur_id: string | null
  fordeling: string | null
  kurs: string | null
  bygg: string | null
  etasje: string | null
  type: string | null
  produsent: string | null
  batteritype: string | null
  notat: string | null
  plassering: string | null
  status: string | null
  kundenavn: string | null
  kontrollert: boolean | null
  created_at: string
}

export const NODLYS_STATUSER = ['OK', 'Defekt', 'Mangler', 'Utskiftet', 'Batterifeil', 'Skadet armatur'] as const
export const ETASJER = ['-2.Etg', '-1.Etg', '0.Etg', '1.Etg', '2.Etg', '3.Etg', '4.Etg', '5.Etg', '6.Etg', '7.Etg', '8.Etg', '9.Etg', '10.Etg'] as const
export const BATTERITYPER = ['NiCd', 'NiMH', 'LiFePO4', 'Li-ion', 'Bly'] as const
export const NODLYS_TYPER = ['ML', 'LL', 'Strobe', 'Fluoriserende'] as const

/** Statuser som betyr at armaturen har et avvik som må følges opp (Utskiftet = løst). */
export const AVVIK_STATUSER = new Set<string>(['Defekt', 'Mangler', 'Batterifeil', 'Skadet armatur'])

export const STATUS_FARGE: Record<string, string> = {
  OK: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  Utskiftet: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
  Defekt: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  'Skadet armatur': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  Mangler: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  Batterifeil: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
}

/** Sorterer etasjer fysisk (-2, -1, 0, 1 …) og ukjente sist. */
export function etasjeSortNokkel(etasje: string | null): number {
  if (!etasje) return 999
  const m = etasje.match(/-?\d+/)
  return m ? parseInt(m[0], 10) : 998
}

/** Sorterer bygg naturlig («Bygg 2» før «Bygg 10»), tomt sist. */
export function byggSortNokkel(a: string, b: string): number {
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b, 'nb-NO', { numeric: true })
}
