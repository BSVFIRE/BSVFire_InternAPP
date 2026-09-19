/** Initialer for avatarer. Kjente ansatte har faste forkortelser slik de brukes internt. */
const FASTE: Record<string, string> = {
  'Erik Sebastian Skille': 'ESS',
  'Pål Gunnar Kåsa': 'PGK',
  'Kristoffer Skår': 'KS',
  'Vegard Ness': 'VN',
  'Martin Kyte': 'MK',
}

export function initialer(navn: string | null | undefined): string {
  if (!navn) return '?'
  return FASTE[navn] ?? (navn.split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 3).toUpperCase() || '?')
}

/** «Ola Nordmann» → «Ola» */
export function fornavn(navn: string | null | undefined): string {
  return navn?.split(' ')[0] ?? ''
}
