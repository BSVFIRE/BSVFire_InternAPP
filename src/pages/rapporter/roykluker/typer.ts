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
  kontroll_anbefalte_utbedringer: string | null
  kontroll_funksjonstest: string | null
  anleggsinfo: string | null
  signaltype: string | null
  motor_type: string | null
  motor_antall: number | null
  roykluke_type: string | null
  roykluke_luketype: string | null
  roykluke_storrelse: string | null
  roykluke_antall: number | null
  roykluke_merknad: string | null
  batteri_type: string | null
  batteri_spenning: string | null
  ladespenning: string | null
  sjekkpunkter: Sjekkpunkt[]
  kretser: Krets[]
  byttet_utstyr_liste: ByttetUtstyr[]
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

/** Sjekkpunkt på en sentral. Tilstand «Anbefaling» = bør utbedres, «Avvik» = må utbedres. */
export interface Sjekkpunkt {
  punkt: string
  tilstand: Tilstand | ''
  merknad: string
}

export interface Krets { nr: string; aktivering: string; hvile: string; motstand: string }
export interface ByttetUtstyr { materiell: string; antall: number }

export const TILSTANDER = ['Ok', 'Anbefaling', 'Avvik', 'Ikke aktuell'] as const
export type Tilstand = typeof TILSTANDER[number]

export const TILSTAND_FARGE: Record<string, string> = {
  Ok: 'bg-green-500 border-green-500 text-white',
  Anbefaling: 'bg-yellow-500 border-yellow-500 text-white',
  Avvik: 'bg-red-500 border-red-500 text-white',
  'Ikke aktuell': 'bg-gray-400 border-gray-400 text-white',
}

/** Punktene som gjelder for hver anleggstype. «Krets» kommer i tillegg, én per registrert krets. */
export const SJEKKPUNKTER: Record<string, string[]> = {
  Røykluker: ['Sentral', 'Ladespenning', 'Nettspenning', 'Nettlampe', 'Feillampe', 'Aktiveringslampe', 'Motor', 'Lufte bryter', 'Manuell utløser', 'Karm', 'Overlys', 'Beslag'],
  Branngardin: ['Sentral', 'Ladespenning', 'Nettspenning', 'Nettlampe', 'Feillampe', 'Aktiveringslampe', 'Motor', 'Gardin', 'Ledeskinner', 'Manuell utløser', 'Beslag'],
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

/** Punktene som skal vises for en sentral: faste for typen + én rad per krets */
export function punkterFor(s: Pick<Sentral, 'anlegg_type' | 'kretser'>): string[] {
  const faste = SJEKKPUNKTER[s.anlegg_type ?? 'Røykluker'] ?? SJEKKPUNKTER.Røykluker
  const kretser = (s.kretser ?? []).map((k, i) => `Krets ${k.nr || i + 1}`)
  return [...faste, 'Signal', ...kretser]
}

export function tilstandFor(s: Pick<Sentral, 'sjekkpunkter'>, punkt: string): Sjekkpunkt {
  return (s.sjekkpunkter ?? []).find(x => x.punkt === punkt) ?? { punkt, tilstand: '', merknad: '' }
}

/** Avvik og anbefalinger fra sjekkpunktene – grunnlaget for listene i rapporten */
export function funnFor(s: Sentral): { avvik: Sjekkpunkt[]; anbefalinger: Sjekkpunkt[] } {
  const liste = s.sjekkpunkter ?? []
  return {
    avvik: liste.filter(x => x.tilstand === 'Avvik'),
    anbefalinger: liste.filter(x => x.tilstand === 'Anbefaling'),
  }
}

export function sentralNavn(s: Sentral): string {
  const nr = s.sentral_nr != null ? `Sentral ${s.sentral_nr}` : 'Sentral uten nummer'
  return s.plassering ? `${nr} – ${s.plassering}` : nr
}
