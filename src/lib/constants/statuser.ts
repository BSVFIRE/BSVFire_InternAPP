/**
 * Statuser for forskjellige moduler i systemet
 */

// Ordre-statuser
export const ORDRE_STATUSER = {
  VENTENDE: 'Ventende',
  PAGAENDE: 'Pågående',
  FULLFORT: 'Fullført',
  FAKTURERT: 'Fakturert'
} as const

export type OrdreStatus = typeof ORDRE_STATUSER[keyof typeof ORDRE_STATUSER]

export const ORDRE_STATUS_COLORS: Record<string, string> = {
  [ORDRE_STATUSER.VENTENDE]: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  [ORDRE_STATUSER.PAGAENDE]: 'bg-blue-900/30 text-blue-400 border-blue-800',
  [ORDRE_STATUSER.FULLFORT]: 'bg-green-900/30 text-green-400 border-green-800',
  [ORDRE_STATUSER.FAKTURERT]: 'bg-gray-900/30 text-gray-400 border-gray-800',
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
  [ANLEGG_STATUSER.IKKE_UTFORT]: 'bg-red-900/30 text-red-400 border-red-800',
  [ANLEGG_STATUSER.UTFORT]: 'bg-green-900/30 text-green-400 border-green-800',
  [ANLEGG_STATUSER.PLANLAGT]: 'bg-blue-900/30 text-blue-400 border-blue-800',
  [ANLEGG_STATUSER.UTSATT]: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  [ANLEGG_STATUSER.OPPSAGT]: 'bg-red-900/30 text-red-400 border-red-800',
}

// Oppgave-statuser
export const OPPGAVE_STATUSER = {
  IKKE_PABEGYNT: 'Ikke påbegynt',
  PAGAENDE: 'Pågående',
  FULLFORT: 'Fullført'
} as const

export type OppgaveStatus = typeof OPPGAVE_STATUSER[keyof typeof OPPGAVE_STATUSER]

export const OPPGAVE_STATUS_COLORS: Record<string, string> = {
  [OPPGAVE_STATUSER.IKKE_PABEGYNT]: 'bg-gray-900/30 text-gray-400 border-gray-800',
  [OPPGAVE_STATUSER.PAGAENDE]: 'bg-blue-900/30 text-blue-400 border-blue-800',
  [OPPGAVE_STATUSER.FULLFORT]: 'bg-green-900/30 text-green-400 border-green-800',
}

// Prioriteter
export const PRIORITETER = {
  LAV: 'Lav',
  MEDIUM: 'Medium',
  HOY: 'Høy'
} as const

export type Prioritet = typeof PRIORITETER[keyof typeof PRIORITETER]

export const PRIORITET_COLORS: Record<string, string> = {
  [PRIORITETER.LAV]: 'bg-gray-900/30 text-gray-400 border-gray-800',
  [PRIORITETER.MEDIUM]: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  [PRIORITETER.HOY]: 'bg-red-900/30 text-red-400 border-red-800',
}
