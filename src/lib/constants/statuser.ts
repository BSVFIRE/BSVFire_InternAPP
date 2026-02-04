/**
 * Statuser for forskjellige moduler i systemet
 */

// Ordre-statuser
export const ORDRE_STATUSER = {
  NY: 'Ny',
  VENTENDE: 'Ventende',
  PAGAENDE: 'Pågående',
  FULLFORT: 'Fullført',
  FAKTURERT: 'Fakturert'
} as const

export type OrdreStatus = typeof ORDRE_STATUSER[keyof typeof ORDRE_STATUSER]

export const ORDRE_STATUS_COLORS: Record<string, string> = {
  [ORDRE_STATUSER.NY]: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  [ORDRE_STATUSER.VENTENDE]: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  [ORDRE_STATUSER.PAGAENDE]: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  [ORDRE_STATUSER.FULLFORT]: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  [ORDRE_STATUSER.FAKTURERT]: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
}

// Sjekk om en ordre er "ny/ulest" (status Ny eller Ventende)
export function isOrdreNy(status: string): boolean {
  return status === ORDRE_STATUSER.NY || status === ORDRE_STATUSER.VENTENDE
}

// Anlegg-statuser
export const ANLEGG_STATUSER = {
  IKKE_UTFORT: 'Ikke utført',
  UTFORT: 'Utført',
  PLANLAGT: 'Planlagt',
  UTSATT: 'Utsatt',
  OPPSAGT: 'Oppsagt'
} as const

export type AnleggStatus = typeof ANLEGG_STATUSER[keyof typeof ANLEGG_STATUSER]

export const ANLEGG_STATUS_COLORS: Record<string, string> = {
  [ANLEGG_STATUSER.IKKE_UTFORT]: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  [ANLEGG_STATUSER.UTFORT]: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  [ANLEGG_STATUSER.PLANLAGT]: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  [ANLEGG_STATUSER.UTSATT]: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  [ANLEGG_STATUSER.OPPSAGT]: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
}

// Oppgave-statuser
export const OPPGAVE_STATUSER = {
  NY: 'Ny',
  IKKE_PABEGYNT: 'Ikke påbegynt',
  PAGAENDE: 'Pågående',
  FULLFORT: 'Fullført'
} as const

export type OppgaveStatus = typeof OPPGAVE_STATUSER[keyof typeof OPPGAVE_STATUSER]

export const OPPGAVE_STATUS_COLORS: Record<string, string> = {
  [OPPGAVE_STATUSER.NY]: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  [OPPGAVE_STATUSER.IKKE_PABEGYNT]: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
  [OPPGAVE_STATUSER.PAGAENDE]: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  [OPPGAVE_STATUSER.FULLFORT]: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
}

// Sjekk om en oppgave er "ny/ulest" (status Ny eller Ikke påbegynt)
export function isOppgaveNy(status: string): boolean {
  return status === OPPGAVE_STATUSER.NY || status === OPPGAVE_STATUSER.IKKE_PABEGYNT
}

// Prioriteter
export const PRIORITETER = {
  LAV: 'Lav',
  MEDIUM: 'Medium',
  HOY: 'Høy'
} as const

export type Prioritet = typeof PRIORITETER[keyof typeof PRIORITETER]

export const PRIORITET_COLORS: Record<string, string> = {
  [PRIORITETER.LAV]: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
  [PRIORITETER.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  [PRIORITETER.HOY]: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
}
