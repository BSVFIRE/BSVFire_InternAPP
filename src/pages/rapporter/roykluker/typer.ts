/** Felles typer og valg for røykluker-modulen. */

export interface Sentral {
  id: string
  anlegg_id: string | null
  anlegg_type: string | null
  sentral_nr: number | null
  plassering: string | null
  status: string | null
  sentral_produsent: string | null
  batteri_v: string | null
  batteri_ah: string | null
  batteri_alder: number | null
  manuell_utlos: boolean | null
  funksjonsteste: boolean | null
  service_resatt: boolean | null
  kontroll_forskriftsmessig: string | null
  created_at?: string
}

export interface Luke {
  id: string
  sentral_id: string
  luke_type: string | null
  plassering: string | null
  status: string | null
  skader: string | null
  funksjonstest: boolean | null
  Koblet_til: string | null
  created_at?: string | null
}

export interface Kommentar {
  id: string
  anlegg_id: string
  kommentar: string | null
  opprettet_av: string | null
  opprettet_dato: string | null
  created_at?: string
}

export const ANLEGGSTYPER = ['Røykluker', 'Branngardin'] as const
export type Anleggstype = typeof ANLEGGSTYPER[number]

export const STATUSER = ['OK', 'Avvik', 'Defekt', 'Ikke funnet'] as const
/** Statuser som teller som avvik i fremdrift og telling */
export const AVVIK_STATUSER = new Set(['Avvik', 'Defekt', 'Ikke funnet'])

export const STATUS_FARGE: Record<string, string> = {
  OK: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  Avvik: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  Defekt: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  'Ikke funnet': 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
}

/** En sentral regnes som kontrollert når den er funksjonstestet eller har fått en vurdering */
export function erKontrollert(s: Sentral): boolean {
  return Boolean(s.funksjonsteste) || Boolean(s.kontroll_forskriftsmessig)
}

export function sentralNavn(s: Sentral): string {
  const nr = s.sentral_nr != null ? `Sentral ${s.sentral_nr}` : 'Sentral uten nummer'
  return s.plassering ? `${nr} – ${s.plassering}` : nr
}
