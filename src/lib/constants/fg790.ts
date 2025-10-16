// Referanser for kontrollpunkter (NS 3960)
export const KONTROLLPUNKT_REFERANSER: Record<string, string> = {
  // POS.1 - Dokumentasjon
  'Projekteringsgrunnlag, Overvåket område, Spesielle områder, Begrenset alarmanlegg, Dokumentasjon på fravk fra prosjekteringsstandard': '5.1, 6.1, 8.5 - tabell 2, TEK',
  'Tegninger som bygget': '8.5 - tabell 2',
  'Type og valg av deteksjon. Tekniske spesifikasjoner, vedlikehold, godkjenninger og produsent': '5.3.1, 5.3.2, 8.5 - tabell 2, 9.1',
  'Idriftsettelsesrapport, Programmeringsdata': '8.5 - tabell 2',
  'Plan for opplæring': '9.2, 9.3.3, 8.5 - tabell 2',
  'Alarmorganisering – teknisk og organisatorisk, Alarmoverføring, Styringsmatrise': '5.3.10, 6.7, 9.5, 8.5 - tabell 2, 6.12, 4.3.7, TEK',
  'O-plan, Kontrolljournal': '3.5.1, 6.7, 8.5 - tabell 2',
  'Beregning av batterikapasitet': '6.8',
  // POS.2 - Visuell kontroll
  'Deteksjon i fellesarealer': '6.1, 7.1',
  'Deteksjon i rømningsvei': '6.1, 6.3',
  'Leilighet i boligblokker': '7',
  'Beskyttelse av hulrom': '6.4.2, 5.5.2.6',
  'Deteksjon i trappeløp': '6.4.2, 6.5.2.6, 7.1',
  'Deteksjon i heis': '6.4.2, 6.5.2.6',
  'Deteksjon i tekniske rom/tavleskap': '6.3',
  'Deteksjon over himling og under datagulv': '6.3, 6.4.2, 6.5.2.4, 6.5.2.5',
  'Deteksjon i takfelt/mellom bjelker': '6.5.2.3',
  'Deteksjon knyttet til varierende takhøyder': '6.5.2.5',
  'Deteksjon i normalt låste rom': '6.4.2',
  'Deteksjon i sanitærrom': '6.3',
  'Andre detekterte rom': '--',
  'Parallellindikator v/konvensjonelt anlegg': '6.4.2',
  'Plassering generelt -takhelling >1:5, bjelker og kanaler, Plassering ned fra taknivå ved ulike takkonstruksjoner': '6.5.1, 6.5.2.2',
  'Manuelle meldere': '5.3.3, 6.4.2, 7.1, 8.4, B4, 9.3.3',
  'Enhet for utkobling': '9.1, A.7, B.6.1',
  'Alarmorganer': '5.3.5, 6.2, 6.9, TEK',
  'Talevarsling': '5.3.7, 6.2, TEK',
  'Optisk varsling': '5.3.6, 6.10, TEK',
  'Merking': '8.4',
  'Kabling': '8.1, 8.3',
  'Trådløse anlegg - internkommunikasjon': '8.2',
  'Brannskille': '6.1, 8.1',
  // POS.3 - Funksjonstest
  'Detektorer, Konvensjonelt/ adresserbart': '9.3.3',
  'Slokkesystemer inkl. sprinklerkontrollenhet': '6.11',
  'Alarmorgan': '6.9',
  'Styringer': '5.3.8, 5.3.10, 9.3.3',
  'Nettverk': '9.3.3',
  'Alarmoverføring': '6.12, 9.3.3, 10, B.6.3',
  'Kraftforsyning': '6.8',
  'Brannalarmsentral (stikkprøver stedsangivelse)': '5.3.4, 6.7, 6.9, 9.3.3',
  'Tidsforsinkelse': '7.1',
  'Todetektor-avhengighet': 'Tillegg A',
}

// FG790 Kontrollpunkter organisert etter posisjon
export const KONTROLLPUNKTER_FG790 = {
  'POS.1 - Dokumentasjon': {
    'Dokumentasjon': [
      'Projekteringsgrunnlag, Overvåket område, Spesielle områder, Begrenset alarmanlegg, Dokumentasjon på fravk fra prosjekteringsstandard',
      'Tegninger som bygget',
      'Type og valg av deteksjon. Tekniske spesifikasjoner, vedlikehold, godkjenninger og produsent',
      'Idriftsettelsesrapport, Programmeringsdata',
      'Plan for opplæring',
      'Alarmorganisering – teknisk og organisatorisk, Alarmoverføring, Styringsmatrise',
      'O-plan, Kontrolljournal',
      'Beregning av batterikapasitet',
    ]
  },
  'POS.2 - Visuell kontroll': {
    'Visuell kontroll': [
      'Deteksjon i fellesarealer',
      'Deteksjon i rømningsvei',
      'Leilighet i boligblokker',
      'Beskyttelse av hulrom',
      'Deteksjon i trappeløp',
      'Deteksjon i heis',
      'Deteksjon i tekniske rom/tavleskap',
      'Deteksjon over himling og under datagulv',
      'Deteksjon i takfelt/mellom bjelker',
      'Deteksjon knyttet til varierende takhøyder',
      'Deteksjon i normalt låste rom',
      'Deteksjon i sanitærrom',
      'Andre detekterte rom',
      'Parallellindikator v/konvensjonelt anlegg',
      'Plassering generelt -takhelling >1:5, bjelker og kanaler, Plassering ned fra taknivå ved ulike takkonstruksjoner',
      'Manuelle meldere',
      'Enhet for utkobling',
      'Alarmorganer',
      'Talevarsling',
      'Optisk varsling',
      'Merking',
      'Kabling',
      'Trådløse anlegg - internkommunikasjon',
      'Brannskille',
    ]
  },
  'POS.3 - Funksjonstest': {
    'Funksjonstest': [
      'Detektorer, Konvensjonelt/ adresserbart',
      'Trådløse anlegg - internkommunikasjon',
      'Manuelle meldere',
      'Enhet for utkobling',
      'Slokkesystemer inkl. sprinklerkontrollenhet',
      'Alarmorgan',
      'Talevarsling',
      'Optisk varsling',
      'Styringer',
      'Nettverk',
      'Alarmoverføring',
      'Kraftforsyning',
      'Brannalarmsentral (stikkprøver stedsangivelse)',
      'Tidsforsinkelse',
      'Todetektor-avhengighet',
    ]
  }
}

export const AVVIK_TYPER = [
  'Avvik',
  'Merknad',
  'Anbefaling',
]

// Poeng trekk system for FG790 kontroller
// 0 poeng = Ingen avvik eller kun merknad
// 1-2 poeng = Mindre avvik
// 3-4 poeng = Alvorlige avvik
// 5 poeng = Kritiske avvik
export const POENG_TREKK_INFO = {
  0: 'Ingen poeng trekk',
  1: '1 poeng - Mindre avvik',
  2: '2 poeng - Mindre avvik',
  3: '3 poeng - Alvorlig avvik',
  4: '4 poeng - Alvorlig avvik',
  5: '5 poeng - Kritisk avvik',
}

// AG-verdier og deres poeng score
export const AG_VERDIER = [
  { verdi: 'AG0', poeng: 0, beskrivelse: 'Ingen forurensning' },
  { verdi: 'AG1', poeng: 0.5, beskrivelse: 'Liten forurensning' },
  { verdi: 'AG2', poeng: 0.8, beskrivelse: 'Moderat forurensning' },
  { verdi: 'AG3', poeng: 2, beskrivelse: 'Høy forurensning' },
  { verdi: 'AGIU', poeng: 0, beskrivelse: 'Ikke undersøkt' },
]

// Funksjon for å beregne poeng basert på AG-verdi
export function beregnPoengFraAG(agVerdi: string): number {
  const ag = AG_VERDIER.find(a => a.verdi === agVerdi)
  return ag ? ag.poeng : 0
}

// Feilkoder for FG790 kontroller
export const FEILKODER = [
  'Detektorfeil',
  'Kablingsfeil',
  'Strømforsyningsfeil',
  'Kommunikasjonsfeil',
  'Manglende',
  'Enhetsfeil',
  'Koblingsfeil',
  'Ingen tilkomst',
  'Feil i dokumentasjon',
  'Manglende dokumentasjon',
  'Ikke funnet',
  'Annet',
]
