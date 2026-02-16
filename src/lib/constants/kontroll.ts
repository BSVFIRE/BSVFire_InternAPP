/**
 * Kontrolltyper og relaterte konstanter
 */

// Kontrolltyper
export const KONTROLLTYPER = [
  'Brannalarm',
  'Nødlys',
  'Slukkeutstyr',
  'Røykluker',
  'Førstehjelp',
  'Ekstern'
] as const

export type Kontrolltype = typeof KONTROLLTYPER[number]

// Måneder
export const MAANEDER = [
  'Januar', 
  'Februar', 
  'Mars', 
  'April', 
  'Mai', 
  'Juni',
  'Juli', 
  'August', 
  'September', 
  'Oktober', 
  'November', 
  'Desember'
] as const

export type Maaned = typeof MAANEDER[number]

// Måned-mapping for sortering
export const MAANED_ORDER: Record<string, number> = {
  'Januar': 1,
  'Februar': 2,
  'Mars': 3,
  'April': 4,
  'Mai': 5,
  'Juni': 6,
  'Juli': 7,
  'August': 8,
  'September': 9,
  'Oktober': 10,
  'November': 11,
  'Desember': 12,
  'NA': 99
}
