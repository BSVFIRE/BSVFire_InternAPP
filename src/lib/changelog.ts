export interface ChangelogEntry {
  version: string
  date: string
  title: string
  changes: {
    type: 'feature' | 'improvement' | 'fix' | 'info'
    description: string
  }[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: '2.5.0',
    date: '2026-02-09',
    title: 'Rask statusendring på anlegg',
    changes: [
      {
        type: 'feature',
        description: 'Endre status direkte fra anleggsvisningen uten å gå inn i redigeringsmodus - klikk på status-badgen'
      },
      {
        type: 'feature',
        description: 'Viser nå hvem som sist endret status på anlegget under Kontrollinfo'
      },
      {
        type: 'improvement',
        description: 'Status-dropdown med fargeindikator for hver status'
      }
    ]
  },
  {
    version: '2.4.0',
    date: '2026-02-04',
    title: 'Forbedret brukeropplevelse',
    changes: [
      {
        type: 'feature',
        description: 'Nye ordre og oppgaver markeres nå tydelig med pulserende grønn prikk og lysere bakgrunn'
      },
      {
        type: 'feature',
        description: 'Dager-indikator viser hvor lenge siden ordre/oppgaver ble opprettet (grå < 14d, gul 14-30d, rød > 30d)'
      },
      {
        type: 'improvement',
        description: 'Tilleggsinformasjon i brannslanger/brannslukkere lagres nå sammen med hoveddata - ingen separat lagre-knapp'
      },
      {
        type: 'improvement',
        description: 'Rapport-knapper deaktiveres når det er ulagrede endringer for å unngå feil'
      },
      {
        type: 'feature',
        description: 'Ny "Nytt anlegg"-knapp på kundedetaljer for raskere opprettelse'
      },
      {
        type: 'fix',
        description: 'Navigering tilbake fra anlegg åpnet fra kunde går nå tilbake til riktig kunde'
      }
    ]
  }
]

export const CURRENT_VERSION = changelog[0].version

export function getLatestChangelog(): ChangelogEntry {
  return changelog[0]
}

export function getChangesSinceVersion(lastSeenVersion: string): ChangelogEntry[] {
  const lastSeenIndex = changelog.findIndex(entry => entry.version === lastSeenVersion)
  if (lastSeenIndex === -1) {
    return changelog
  }
  return changelog.slice(0, lastSeenIndex)
}
