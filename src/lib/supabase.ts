import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snyzduzqyjsllzvwuahh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNueXpkdXpxeWpzbGx6dnd1YWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3ODk0NzEsImV4cCI6MjA2MDM2NTQ3MX0.WLOcnCSiNHTsFIf0S_2hM-y3QyEnM6lzGn4vcIXMLuc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'bsv-fire-app',
    },
  },
  // Realtime subscriptions will automatically reconnect when connection is restored
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Database types
export type Database = {
  public: {
    Tables: {
      customer: {
        Row: {
          id: string
          navn: string
          organisasjonsnummer: string | null
          adresse: string | null
          postnummer: string | null
          poststed: string | null
          telefon: string | null
          epost: string | null
          opprettet_dato: string
          sist_oppdatert: string | null
        }
      }
      anlegg: {
        Row: {
          id: string
          kundenr: string
          anleggsnavn: string
          org_nummer: string | null
          kunde_nummer: string | null
          adresse: string | null
          postnummer: string | null
          poststed: string | null
          kontroll_maaned: string | null
          kontroll_status: string | null
          kontroll_type: string[] | null
          unik_kode: string | null
          kontrollportal_url: string | null
          opprettet_dato: string
          sist_oppdatert: string | null
        }
      }
      ordre: {
        Row: {
          id: string
          ordre_nummer: string
          type: string
          kundenr: string
          anlegg_id: string
          kommentar: string | null
          status: string
          opprettet_dato: string
          sist_oppdatert: string | null
          tekniker_id: string | null
          kontrolltype: string[] | null
        }
      }
      oppgaver: {
        Row: {
          id: string
          oppgave_nummer: string
          ordre_id: string | null
          prosjekt_id: string | null
          tittel: string
          status: string
          prioritet: string | null
          tildelt_til: string | null
          forfallsdato: string | null
          opprettet_dato: string
          sist_oppdatert: string | null
        }
      }
      prosjekter: {
        Row: {
          id: string
          navn: string
          beskrivelse: string | null
          type_prosjekt: string
          kunde_id: string | null
          prosjektleder_id: string | null
          status: string
          oppstart_dato: string | null
          planlagt_fullfort: string | null
          faktisk_fullfort: string | null
          opprettet_dato: string
          sist_oppdatert: string | null
        }
      }
      kontaktpersoner: {
        Row: {
          id: string
          navn: string
          epost: string | null
          telefon: string | null
          rolle: string | null
          opprettet_dato: string
          sist_oppdatert: string | null
        }
      }
      anlegg_kontaktpersoner: {
        Row: {
          id: string
          anlegg_id: string
          kontaktperson_id: string
          primar: boolean
          opprettet_dato: string
        }
      }
      dokumenter: {
        Row: {
          id: string
          anlegg_id: string
          filnavn: string
          url: string
          type: string | null
          opprettet_dato: string
          opprettet_av: string | null
        }
      }
    }
  }
}
