/**
 * Testprotokollen: hva som skal sjekkes, gruppert per modul.
 *
 * Listen bor her og ikke i et dokument, fordi den leses mens man står i appen med
 * testdataene oppe. `docs/testprotokoll.md` peker hit.
 *
 * `hvorfor` er ikke pynt. Et punkt uten begrunnelse blir hoppet over; et punkt som
 * sier hva som gikk galt sist, blir sjekket.
 */

export interface Testpunkt {
  tekst: string
  /** Hva som faktisk har gått galt før, eller hva man skal se etter */
  hvorfor?: string
}

export interface Testgruppe {
  id: string
  navn: string
  /** Hvilket testanlegg punktene gjelder */
  anlegg?: string
  innledning?: string
  punkter: Testpunkt[]
}

export const TESTPROTOKOLL: Testgruppe[] = [
  {
    id: 'alltid',
    navn: 'Alltid',
    innledning: 'Feil som har oppstått før, og som ikke merkes uten at noen ser etter.',
    punkter: [
      {
        tekst: 'Rapporten kom til Dropbox, ikke bare til anlegget',
        hvorfor: 'Etter lagring skal det komme to bekreftelser. Kommer bare «lagret på anlegget», er Dropbox-delen feilet. Den har vært stille før.',
      },
      {
        tekst: 'Forhåndsvisning av PDF åpner uten feil',
        hvorfor: 'En nettverksrad uten id veltet hele genereringen. Prøv på et anlegg med ufullstendige data.',
      },
      {
        tekst: 'Forsiden er komplett',
        hvorfor: 'Forskriftslinjen under anleggsnavnet, «Neste kontroll» i gult, kontrollørens navn, sertifikat, telefon og e-post.',
      },
      {
        tekst: 'Ingenting kolliderer i PDF-en',
        hvorfor: 'Se særlig på forsiden når kontaktpersonen har både telefon og e-post, og på liggende sider.',
      },
      {
        tekst: 'Offline: registrer noe uten nett, koble til, last siden på nytt',
        hvorfor: 'Det du registrerte skal fortsatt være der. Punkter lagret offline har blitt forkastet i stillhet.',
      },
      {
        tekst: 'Pauset anlegg forsvinner fra kontrollplan, ukesplan og tellinger',
      },
    ],
  },
  {
    id: 'ns3960',
    navn: 'Brannalarm – NS 3960',
    anlegg: 'TEST – Kontorbygg Nord',
    punkter: [
      { tekst: 'Sett noen punkter til Kontrollert, ett til Avvik med beskrivelse' },
      { tekst: 'Legg to bilder på avviket', hvorfor: 'De skal også dukke opp under Bilder på anlegget, og i Dropbox-mappen 99_Foto.' },
      { tekst: 'Lagre, gå ut, gå inn igjen – samme utkast fortsetter', hvorfor: 'Det skal ikke opprettes en ny kontroll ved hver lagring.' },
      { tekst: 'Ta et bilde med nettet av', hvorfor: 'Skal vises med skyikon og lastes opp når nettet er tilbake.' },
      { tekst: 'Rapport: enhetstabellen har antall kun på typelinjene', hvorfor: 'Gruppelinjen skal stå uten sum når den har typer under seg.' },
      { tekst: 'Rapport: bildene kommer under «Bilder til avvikene» med riktig avviksnummer' },
      { tekst: 'Ferdigstill kontrollen – anlegget får status fullført' },
    ],
  },
  {
    id: 'fg790',
    navn: 'Brannalarm – FG-790',
    anlegg: 'TEST – Lagerhall Sør',
    punkter: [
      { tekst: 'Samme løp som NS 3960, med bilder på avvik' },
      { tekst: 'Poengtrekk og AG-verdi regnes riktig i summen nederst' },
      { tekst: 'Antall avvik over 1 multipliserer poengtrekket' },
      { tekst: 'Lagre samme kontroll to ganger – punktene dupliseres ikke', hvorfor: 'Lagringen gikk fra slett-og-sett-inn til oppdatering på plass.' },
    ],
  },
  {
    id: 'nodlys',
    navn: 'Nødlys',
    anlegg: 'TEST – Kontorbygg Nord (24 armaturer, 4 med avvik)',
    punkter: [
      { tekst: 'Filtrer listen og scroll – flere armaturer lastes etter hvert' },
      { tekst: 'Merk flere og slett – dialogen sier hvor mange' },
      { tekst: 'Importer fra Excel og fra Apple Numbers', hvorfor: 'Bruk det tomme anlegget, så blander du ikke inn eksisterende rader.' },
      { tekst: 'Rapport: den liggende listesiden har sidefot og ingen kuttede kolonner' },
    ],
  },
  {
    id: 'slukkeutstyr',
    navn: 'Slukkeutstyr',
    anlegg: 'TEST – Kontorbygg Nord',
    punkter: [
      { tekst: 'Brannslangen fra 2010 vises som avvik', hvorfor: 'Trykktesten er fra 2018 og forfalt.' },
      { tekst: 'Statistikken for trykktest stemmer med listen' },
      { tekst: 'Rapport for både slukkere og slanger' },
    ],
  },
  {
    id: 'roykluker',
    navn: 'Røykluker',
    anlegg: 'TEST – Lagerhall Sør (2 sentraler)',
    punkter: [
      { tekst: 'Kontroller én sentral: sjekkpunkter, kretser, byttet utstyr, konklusjon' },
      { tekst: 'Autolagring: gå ut midt i utfyllingen og inn igjen' },
      { tekst: 'Rapport: omfanget teller sentral-, motor- og luketyper automatisk' },
      { tekst: 'Rapport: tabell per plassering, avvik og anbefalinger' },
    ],
  },
  {
    id: 'forstehjelp',
    navn: 'Førstehjelp',
    anlegg: 'TEST – Leilighetsbygg Vest (6 enheter)',
    punkter: [
      { tekst: 'To enheter har passert utløpsdato og vises under «Utløper»' },
      { tekst: 'Merk flere og rediger i bulk' },
      { tekst: 'Rapport' },
    ],
  },
  {
    id: 'kundeanlegg',
    navn: 'Kunde og anlegg',
    punkter: [
      { tekst: 'Sett testkunden til Pauset mens et anlegg er aktivt', hvorfor: 'Det skal komme en advarsel om at anleggene må flyttes eller pauses først.' },
      { tekst: 'Pause anleggene først, så kunden – nå skal det gå' },
      { tekst: 'Bildebanken: last opp, åpne i full størrelse, slett' },
      { tekst: 'Dokumentfanen viser ikke bildene' },
    ],
  },
  {
    id: 'planlegging',
    navn: 'Planlegging',
    punkter: [
      { tekst: 'Legg testanleggene i en ukesplan, endre rekkefølge, flytt mellom dager' },
      { tekst: 'Klokkeslett vises som 24-timers' },
      { tekst: 'Lagre flere ganger – det blir ikke nye versjoner' },
      { tekst: 'Slett ukesplanen' },
    ],
  },
  {
    id: 'epost',
    navn: 'E-post',
    innledning: 'Kontaktpersonen på testanleggene har din egen adresse.',
    punkter: [
      { tekst: 'Send en rapport til deg selv' },
      { tekst: 'Send til flere mottakere samtidig', hvorfor: 'Det er den som har feilet før.' },
      { tekst: 'Nedlastinger: sendingen er logget med status' },
    ],
  },
]

export const ANTALL_TESTPUNKTER = TESTPROTOKOLL.reduce((n, g) => n + g.punkter.length, 0)
