export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      addressering: {
        Row: {
          anlegg_id: string
          base_nr: number
          enhet_merket: string | null
          enhets_adresse: number
          etasje: string | null
          id: string
          kart: string | null
          kunde_id: string
          leverandor: string
          oppdatert_dato: string | null
          opprettet_dato: string | null
          plassering: string | null
          switch1: number
          switch2: number
          switch3: number
          switch4: number
          switch5: number
          switch6: number
          switch7: number
          switch8: number
          teknisk_adresse: number
          type: string | null
        }
        Insert: {
          anlegg_id: string
          base_nr: number
          enhet_merket?: string | null
          enhets_adresse: number
          etasje?: string | null
          id?: string
          kart?: string | null
          kunde_id: string
          leverandor?: string
          oppdatert_dato?: string | null
          opprettet_dato?: string | null
          plassering?: string | null
          switch1?: number
          switch2?: number
          switch3?: number
          switch4?: number
          switch5?: number
          switch6?: number
          switch7?: number
          switch8?: number
          teknisk_adresse: number
          type?: string | null
        }
        Update: {
          anlegg_id?: string
          base_nr?: number
          enhet_merket?: string | null
          enhets_adresse?: number
          etasje?: string | null
          id?: string
          kart?: string | null
          kunde_id?: string
          leverandor?: string
          oppdatert_dato?: string | null
          opprettet_dato?: string | null
          plassering?: string | null
          switch1?: number
          switch2?: number
          switch3?: number
          switch4?: number
          switch5?: number
          switch6?: number
          switch7?: number
          switch8?: number
          teknisk_adresse?: number
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addressering_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addressering_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "alarmoverforing_med_info"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "addressering_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chunks: {
        Row: {
          embedding: string | null
          id: string
          metadata: Json | null
          tekst: string | null
        }
        Insert: {
          embedding?: string | null
          id?: string
          metadata?: Json | null
          tekst?: string | null
        }
        Update: {
          embedding?: string | null
          id?: string
          metadata?: Json | null
          tekst?: string | null
        }
        Relationships: []
      }
      ai_embeddings: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          record_id: string
          table_name: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          record_id: string
          table_name: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          record_id?: string
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_logg: {
        Row: {
          id: string
          kilder: Json | null
          sporsmal: string | null
          svar: string | null
          tekniker_id: string | null
          tidspunkt: string | null
        }
        Insert: {
          id?: string
          kilder?: Json | null
          sporsmal?: string | null
          svar?: string | null
          tekniker_id?: string | null
          tidspunkt?: string | null
        }
        Update: {
          id?: string
          kilder?: Json | null
          sporsmal?: string | null
          svar?: string | null
          tekniker_id?: string | null
          tidspunkt?: string | null
        }
        Relationships: []
      }
      alarmorganisering: {
        Row: {
          alarm_aktivering: string | null
          alarmnivaa_forvarsel: string | null
          alarmnivaa_stille: string | null
          alarmnivaa_stor: string | null
          anlegg_id: string | null
          annet: string | null
          ansvarlige_personer: string | null
          antall_styringer: string | null
          automatiske_funksjoner: string | null
          beredskapsplaner: string | null
          brannklokker_aktivering: string | null
          dato: string
          detektorplassering: string | null
          detektortyper: string | null
          e_post: string | null
          evakueringsprosedyrer: string | null
          forriglinger: string | null
          gjeldende_teknisk_forskrift: string | null
          hvem_faar_melding: string | null
          hvordan_melding_mottas: string | null
          id: string
          innstallasjon: string | null
          integrasjon_andre_systemer: string | null
          kommunikasjonskanaler: string | null
          kontakt_person: string | null
          kunde_id: string | null
          kundeadresse: string | null
          meldingsrutiner: string | null
          mobil: string | null
          oppdatert_dato: string | null
          opplaering_rutiner: string | null
          opprettet_av: string | null
          opprettet_dato: string | null
          organisatoriske_prosesser: string | null
          overvakingstid: string | null
          prosjekt_id: string | null
          revisjon: string | null
          samspill_teknisk_organisatorisk: string | null
          seksjoneringsoppsett: string | null
          service_ingeniør: string | null
          status: string | null
          styringer_data: Json | null
          styringsmatrise: string | null
          tekniske_tiltak_unodige_alarmer: string | null
          type_overforing: string | null
          verifikasjonsmetoder: string | null
          visuell_varsling_aktivering: string | null
        }
        Insert: {
          alarm_aktivering?: string | null
          alarmnivaa_forvarsel?: string | null
          alarmnivaa_stille?: string | null
          alarmnivaa_stor?: string | null
          anlegg_id?: string | null
          annet?: string | null
          ansvarlige_personer?: string | null
          antall_styringer?: string | null
          automatiske_funksjoner?: string | null
          beredskapsplaner?: string | null
          brannklokker_aktivering?: string | null
          dato?: string
          detektorplassering?: string | null
          detektortyper?: string | null
          e_post?: string | null
          evakueringsprosedyrer?: string | null
          forriglinger?: string | null
          gjeldende_teknisk_forskrift?: string | null
          hvem_faar_melding?: string | null
          hvordan_melding_mottas?: string | null
          id?: string
          innstallasjon?: string | null
          integrasjon_andre_systemer?: string | null
          kommunikasjonskanaler?: string | null
          kontakt_person?: string | null
          kunde_id?: string | null
          kundeadresse?: string | null
          meldingsrutiner?: string | null
          mobil?: string | null
          oppdatert_dato?: string | null
          opplaering_rutiner?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          organisatoriske_prosesser?: string | null
          overvakingstid?: string | null
          prosjekt_id?: string | null
          revisjon?: string | null
          samspill_teknisk_organisatorisk?: string | null
          seksjoneringsoppsett?: string | null
          service_ingeniør?: string | null
          status?: string | null
          styringer_data?: Json | null
          styringsmatrise?: string | null
          tekniske_tiltak_unodige_alarmer?: string | null
          type_overforing?: string | null
          verifikasjonsmetoder?: string | null
          visuell_varsling_aktivering?: string | null
        }
        Update: {
          alarm_aktivering?: string | null
          alarmnivaa_forvarsel?: string | null
          alarmnivaa_stille?: string | null
          alarmnivaa_stor?: string | null
          anlegg_id?: string | null
          annet?: string | null
          ansvarlige_personer?: string | null
          antall_styringer?: string | null
          automatiske_funksjoner?: string | null
          beredskapsplaner?: string | null
          brannklokker_aktivering?: string | null
          dato?: string
          detektorplassering?: string | null
          detektortyper?: string | null
          e_post?: string | null
          evakueringsprosedyrer?: string | null
          forriglinger?: string | null
          gjeldende_teknisk_forskrift?: string | null
          hvem_faar_melding?: string | null
          hvordan_melding_mottas?: string | null
          id?: string
          innstallasjon?: string | null
          integrasjon_andre_systemer?: string | null
          kommunikasjonskanaler?: string | null
          kontakt_person?: string | null
          kunde_id?: string | null
          kundeadresse?: string | null
          meldingsrutiner?: string | null
          mobil?: string | null
          oppdatert_dato?: string | null
          opplaering_rutiner?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          organisatoriske_prosesser?: string | null
          overvakingstid?: string | null
          prosjekt_id?: string | null
          revisjon?: string | null
          samspill_teknisk_organisatorisk?: string | null
          seksjoneringsoppsett?: string | null
          service_ingeniør?: string | null
          status?: string | null
          styringer_data?: Json | null
          styringsmatrise?: string | null
          tekniske_tiltak_unodige_alarmer?: string | null
          type_overforing?: string | null
          verifikasjonsmetoder?: string | null
          visuell_varsling_aktivering?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alarmorganisering_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alarmorganisering_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "alarmoverforing_med_info"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "alarmorganisering_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alarmorganisering_prosjekt_id_fkey"
            columns: ["prosjekt_id"]
            isOneToOne: false
            referencedRelation: "prosjekter"
            referencedColumns: ["id"]
          },
        ]
      }
      alarmoverforing: {
        Row: {
          alarm_type: string
          anlegg_id: string
          beskrivelse: string | null
          brutto_fortjeneste_aar: number
          brutto_fortjeneste_maaned: number
          bsv_kostnad_per_maaned: number | null
          created_at: string | null
          created_by: string | null
          fakturering: string | null
          fast_pris: number
          id: string
          inkluderer_simkort: boolean | null
          kommentar: string | null
          mottakere: Json | null
          mva_belop: number
          pris_eks_mva: number
          pris_ink_mva: number
          rabatt_belop: number | null
          rabatt_prosent: number | null
          simkort_bsv_kostnad: number | null
          simkort_pris: number | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          alarm_type: string
          anlegg_id: string
          beskrivelse?: string | null
          brutto_fortjeneste_aar: number
          brutto_fortjeneste_maaned: number
          bsv_kostnad_per_maaned?: number | null
          created_at?: string | null
          created_by?: string | null
          fakturering?: string | null
          fast_pris?: number
          id?: string
          inkluderer_simkort?: boolean | null
          kommentar?: string | null
          mottakere?: Json | null
          mva_belop: number
          pris_eks_mva: number
          pris_ink_mva: number
          rabatt_belop?: number | null
          rabatt_prosent?: number | null
          simkort_bsv_kostnad?: number | null
          simkort_pris?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          alarm_type?: string
          anlegg_id?: string
          beskrivelse?: string | null
          brutto_fortjeneste_aar?: number
          brutto_fortjeneste_maaned?: number
          bsv_kostnad_per_maaned?: number | null
          created_at?: string | null
          created_by?: string | null
          fakturering?: string | null
          fast_pris?: number
          id?: string
          inkluderer_simkort?: boolean | null
          kommentar?: string | null
          mottakere?: Json | null
          mva_belop?: number
          pris_eks_mva?: number
          pris_ink_mva?: number
          rabatt_belop?: number | null
          rabatt_prosent?: number | null
          simkort_bsv_kostnad?: number | null
          simkort_pris?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alarmoverforing_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      anlegg: {
        Row: {
          adresse: string | null
          anleggsnavn: string | null
          ansvarlig_tekniker_id: string | null
          antall_etasjer: number | null
          brannalarm_fullfort: boolean | null
          created_at: string
          dropbox_synced: boolean | null
          ekstern_epost: string | null
          ekstern_firma: string | null
          ekstern_fullfort: boolean | null
          ekstern_kontaktperson: string | null
          ekstern_kontaktperson_id: string | null
          ekstern_telefon: string | null
          ekstern_type: string | null
          er_leilighetsbygg: boolean | null
          fg_database_registrert: boolean | null
          fg_register: boolean | null
          forstehjelp_fullfort: boolean | null
          id: string
          kontroll_maaned: string | null
          kontroll_status: string | null
          kontroll_type: string[] | null
          kontrollor_id: string | null
          kontrollportal_url: string | null
          kunde_nummer: number | null
          kundenr: string | null
          nodlys_fullfort: boolean | null
          opprettet_dato: string | null
          org_nummer: string | null
          postnummer: string | null
          poststed: string | null
          roykluker_fullfort: boolean | null
          sist_oppdatert: string | null
          skjult: boolean | null
          slukkeutstyr_fullfort: boolean | null
          status_oppdatert_av: string | null
          status_oppdatert_av_navn: string | null
          unik_kode: string | null
        }
        Insert: {
          adresse?: string | null
          anleggsnavn?: string | null
          ansvarlig_tekniker_id?: string | null
          antall_etasjer?: number | null
          brannalarm_fullfort?: boolean | null
          created_at?: string
          dropbox_synced?: boolean | null
          ekstern_epost?: string | null
          ekstern_firma?: string | null
          ekstern_fullfort?: boolean | null
          ekstern_kontaktperson?: string | null
          ekstern_kontaktperson_id?: string | null
          ekstern_telefon?: string | null
          ekstern_type?: string | null
          er_leilighetsbygg?: boolean | null
          fg_database_registrert?: boolean | null
          fg_register?: boolean | null
          forstehjelp_fullfort?: boolean | null
          id?: string
          kontroll_maaned?: string | null
          kontroll_status?: string | null
          kontroll_type?: string[] | null
          kontrollor_id?: string | null
          kontrollportal_url?: string | null
          kunde_nummer?: number | null
          kundenr?: string | null
          nodlys_fullfort?: boolean | null
          opprettet_dato?: string | null
          org_nummer?: string | null
          postnummer?: string | null
          poststed?: string | null
          roykluker_fullfort?: boolean | null
          sist_oppdatert?: string | null
          skjult?: boolean | null
          slukkeutstyr_fullfort?: boolean | null
          status_oppdatert_av?: string | null
          status_oppdatert_av_navn?: string | null
          unik_kode?: string | null
        }
        Update: {
          adresse?: string | null
          anleggsnavn?: string | null
          ansvarlig_tekniker_id?: string | null
          antall_etasjer?: number | null
          brannalarm_fullfort?: boolean | null
          created_at?: string
          dropbox_synced?: boolean | null
          ekstern_epost?: string | null
          ekstern_firma?: string | null
          ekstern_fullfort?: boolean | null
          ekstern_kontaktperson?: string | null
          ekstern_kontaktperson_id?: string | null
          ekstern_telefon?: string | null
          ekstern_type?: string | null
          er_leilighetsbygg?: boolean | null
          fg_database_registrert?: boolean | null
          fg_register?: boolean | null
          forstehjelp_fullfort?: boolean | null
          id?: string
          kontroll_maaned?: string | null
          kontroll_status?: string | null
          kontroll_type?: string[] | null
          kontrollor_id?: string | null
          kontrollportal_url?: string | null
          kunde_nummer?: number | null
          kundenr?: string | null
          nodlys_fullfort?: boolean | null
          opprettet_dato?: string | null
          org_nummer?: string | null
          postnummer?: string | null
          poststed?: string | null
          roykluker_fullfort?: boolean | null
          sist_oppdatert?: string | null
          skjult?: boolean | null
          slukkeutstyr_fullfort?: boolean | null
          status_oppdatert_av?: string | null
          status_oppdatert_av_navn?: string | null
          unik_kode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anlegg_ansvarlig_tekniker_id_fkey"
            columns: ["ansvarlig_tekniker_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlegg_ekstern_kontaktperson_id_fkey"
            columns: ["ekstern_kontaktperson_id"]
            isOneToOne: false
            referencedRelation: "kontaktperson_ekstern"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlegg_kundenr_fkey"
            columns: ["kundenr"]
            isOneToOne: false
            referencedRelation: "alarmoverforing_med_info"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "anlegg_kundenr_fkey"
            columns: ["kundenr"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlegg_status_oppdatert_av_fkey"
            columns: ["status_oppdatert_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      anlegg_kontaktpersoner: {
        Row: {
          anlegg_id: string | null
          created_at: string
          id: string
          kontaktperson_id: string | null
          primar: boolean | null
        }
        Insert: {
          anlegg_id?: string | null
          created_at?: string
          id?: string
          kontaktperson_id?: string | null
          primar?: boolean | null
        }
        Update: {
          anlegg_id?: string | null
          created_at?: string
          id?: string
          kontaktperson_id?: string | null
          primar?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "anlegg_kontaktpersoner_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlegg_kontaktpersoner_kontaktperson_id_fkey"
            columns: ["kontaktperson_id"]
            isOneToOne: false
            referencedRelation: "kontaktpersoner"
            referencedColumns: ["id"]
          },
        ]
      }
      anlegg_leiligheter: {
        Row: {
          anlegg_id: string
          beskrivelse: string | null
          created_at: string | null
          etasje: number
          id: string
          leilighet_nummer: string
        }
        Insert: {
          anlegg_id: string
          beskrivelse?: string | null
          created_at?: string | null
          etasje: number
          id?: string
          leilighet_nummer: string
        }
        Update: {
          anlegg_id?: string
          beskrivelse?: string | null
          created_at?: string | null
          etasje?: number
          id?: string
          leilighet_nummer?: string
        }
        Relationships: [
          {
            foreignKeyName: "anlegg_leiligheter_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      anlegg_qr_koder: {
        Row: {
          anlegg_id: string | null
          koblet: string | null
          koblet_av: string | null
          kode: string
          merkelapp: string | null
          opprettet: string
          opprettet_av: string | null
        }
        Insert: {
          anlegg_id?: string | null
          koblet?: string | null
          koblet_av?: string | null
          kode: string
          merkelapp?: string | null
          opprettet?: string
          opprettet_av?: string | null
        }
        Update: {
          anlegg_id?: string | null
          koblet?: string | null
          koblet_av?: string | null
          kode?: string
          merkelapp?: string | null
          opprettet?: string
          opprettet_av?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anlegg_qr_koder_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlegg_qr_koder_koblet_av_fkey"
            columns: ["koblet_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlegg_qr_koder_opprettet_av_fkey"
            columns: ["opprettet_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      anlegg_todos: {
        Row: {
          anlegg_id: string
          beskrivelse: string | null
          created_at: string | null
          forfallsdato: string | null
          fullfort: boolean | null
          id: string
          opprettet_av: string | null
          prioritet: string | null
          tildelt_til: string | null
          tittel: string
          updated_at: string | null
        }
        Insert: {
          anlegg_id: string
          beskrivelse?: string | null
          created_at?: string | null
          forfallsdato?: string | null
          fullfort?: boolean | null
          id?: string
          opprettet_av?: string | null
          prioritet?: string | null
          tildelt_til?: string | null
          tittel: string
          updated_at?: string | null
        }
        Update: {
          anlegg_id?: string
          beskrivelse?: string | null
          created_at?: string | null
          forfallsdato?: string | null
          fullfort?: boolean | null
          id?: string
          opprettet_av?: string | null
          prioritet?: string | null
          tildelt_til?: string | null
          tittel?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anlegg_todos_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlegg_todos_tildelt_til_fkey"
            columns: ["tildelt_til"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      anleggsdata_brannalarm: {
        Row: {
          adgang_aktiv: boolean | null
          adgang_antall: number | null
          adgang_avvik: string | null
          adgang_har_avvik: boolean | null
          adgang_note: string | null
          adgang_status: string | null
          alarmsender_i_anlegg: boolean | null
          anlegg_id: string | null
          annet_aktiv: boolean | null
          annet_antall: number | null
          annet_note: string | null
          annet_type: string | null
          asp_aktiv: boolean | null
          asp_antall: number | null
          asp_note: string | null
          asp_type: string | null
          avstiller_aktiv: boolean | null
          avstiller_antall: number | null
          avstiller_note: string | null
          avstiller_type: string | null
          batteri_aktiv: boolean | null
          batteri_antall: number | null
          batteri_note: string | null
          batteri_type: string | null
          batterialder: string | null
          batteritype: string | null
          brannklokke_aktiv: boolean | null
          brannklokke_antall: number | null
          brannklokke_note: string | null
          brannklokke_type: string | null
          brannsentral_aktiv: boolean | null
          brannsentral_antall: number | null
          brannsentral_note: string | null
          brannsentral_type: string | null
          dorstyring_aktiv: boolean | null
          dorstyring_antall: number | null
          dorstyring_avvik: string | null
          dorstyring_har_avvik: boolean | null
          dorstyring_note: string | null
          dorstyring_status: string | null
          ekstern_mottaker: string[] | null
          ekstern_mottaker_aktiv: boolean | null
          ekstern_mottaker_info: string | null
          flame_aktiv: boolean | null
          flame_antall: number | null
          flame_note: string | null
          flame_type: string | null
          flash_blitz_aktiv: boolean | null
          flash_blitz_antall: number | null
          flash_blitz_avvik: string | null
          flash_blitz_har_avvik: boolean | null
          flash_blitz_note: string | null
          flash_blitz_status: string | null
          forsynet_fra_brannsentral: boolean | null
          gardin_aktiv: boolean | null
          gardin_antall: number | null
          gardin_avvik: string | null
          gardin_har_avvik: boolean | null
          gardin_note: string | null
          gardin_status: string | null
          gsm_nummer: string | null
          heis_aktiv: boolean | null
          heis_antall: number | null
          heis_avvik: string | null
          heis_har_avvik: boolean | null
          heis_note: string | null
          heis_status: string | null
          id: string
          io_aktiv: boolean | null
          io_antall: number | null
          io_note: string | null
          io_type: string | null
          klokke_aktiv: boolean | null
          klokke_antall: number | null
          klokke_avvik: string | null
          klokke_har_avvik: boolean | null
          klokke_note: string | null
          klokke_status: string | null
          kraftforsyning_aktiv: boolean | null
          kraftforsyning_antall: number | null
          kraftforsyning_note: string | null
          kraftforsyning_type: string | null
          kunde: string | null
          leverandor: string | null
          linje_aktiv: boolean | null
          linje_antall: number | null
          linje_note: string | null
          linje_type: string | null
          mm_aktiv: boolean | null
          mm_antall: number | null
          mm_note: string | null
          mm_type: string | null
          mottaker: string[] | null
          mottaker_kommentar: string | null
          multi_aktiv: boolean | null
          multi_antall: number | null
          multi_note: string | null
          multi_type: string | null
          musikk_aktiv: boolean | null
          musikk_antall: number | null
          musikk_avvik: string | null
          musikk_har_avvik: boolean | null
          musikk_note: string | null
          musikk_status: string | null
          nokkelsafe: boolean | null
          nokkelsafe_innhold: string | null
          nokkelsafe_kommentar: string | null
          nokkelsafe_plassering: string | null
          nokkelsafe_type: string | null
          opprettet_dato: string
          optisk_aktiv: boolean | null
          optisk_antall: number | null
          optisk_note: string | null
          optisk_type: string | null
          overvaking_aktiv: boolean | null
          overvaking_antall: number | null
          overvaking_avvik: string | null
          overvaking_har_avvik: boolean | null
          overvaking_note: string | null
          overvaking_status: string | null
          ovrige_aktiv: boolean | null
          ovrige_antall: number | null
          ovrige_avvik: string | null
          ovrige_har_avvik: boolean | null
          ovrige_note: string | null
          ovrige_status: string | null
          panel_aktiv: boolean | null
          panel_antall: number | null
          panel_note: string | null
          panel_type: string | null
          plassering: string | null
          port_aktiv: boolean | null
          port_antall: number | null
          port_avvik: string | null
          port_har_avvik: boolean | null
          port_note: string | null
          port_status: string | null
          rd_aktiv: boolean | null
          rd_antall: number | null
          rd_note: string | null
          rd_type: string | null
          royklukker_aktiv: boolean | null
          royklukker_antall: number | null
          royklukker_avvik: string | null
          royklukker_har_avvik: boolean | null
          royklukker_note: string | null
          royklukker_status: string | null
          safe_aktiv: boolean | null
          safe_antall: number | null
          safe_avvik: string | null
          safe_har_avvik: boolean | null
          safe_note: string | null
          safe_status: string | null
          sd_aktiv: boolean | null
          sd_antall: number | null
          sd_avvik: string | null
          sd_har_avvik: boolean | null
          sd_note: string | null
          sd_status: string | null
          sender_2G_4G: string | null
          sentraltype: string | null
          sirene_aktiv: boolean | null
          sirene_antall: number | null
          sirene_note: string | null
          sirene_type: string | null
          sist_oppdatert: string | null
          sloyfer_aktiv: boolean | null
          sloyfer_antall: number | null
          sloyfer_note: string | null
          sloyfer_type: string | null
          slukke_aktiv: boolean | null
          slukke_antall: number | null
          slukke_avvik: string | null
          slukke_har_avvik: boolean | null
          slukke_note: string | null
          slukke_status: string | null
          spjaeld_aktiv: boolean | null
          spjaeld_antall: number | null
          spjaeld_avvik: string | null
          spjaeld_har_avvik: boolean | null
          spjaeld_note: string | null
          spjaeld_status: string | null
          sprinkler_aktiv: boolean | null
          sprinkler_antall: number | null
          sprinkler_note: string | null
          sprinkler_type: string | null
          sprinklerstyring_antall: number | null
          sprinklerstyring_note: string | null
          sprinklerstyring_type: string | null
          talevarsling: boolean | null
          talevarsling_batteri_alder: string | null
          talevarsling_batteri_type: string | null
          talevarsling_kommentar: string | null
          talevarsling_leverandor: string | null
          talevarsling_plassering: string | null
          traadlos_aktiv: boolean | null
          traadlos_antall: number | null
          traadlos_note: string | null
          traadlos_type: string | null
          vd_aktiv: boolean | null
          vd_antall: number | null
          vd_note: string | null
          vd_type: string | null
          vent_aktiv: boolean | null
          vent_antall: number | null
          vent_avvik: string | null
          vent_har_avvik: boolean | null
          vent_note: string | null
          vent_status: string | null
        }
        Insert: {
          adgang_aktiv?: boolean | null
          adgang_antall?: number | null
          adgang_avvik?: string | null
          adgang_har_avvik?: boolean | null
          adgang_note?: string | null
          adgang_status?: string | null
          alarmsender_i_anlegg?: boolean | null
          anlegg_id?: string | null
          annet_aktiv?: boolean | null
          annet_antall?: number | null
          annet_note?: string | null
          annet_type?: string | null
          asp_aktiv?: boolean | null
          asp_antall?: number | null
          asp_note?: string | null
          asp_type?: string | null
          avstiller_aktiv?: boolean | null
          avstiller_antall?: number | null
          avstiller_note?: string | null
          avstiller_type?: string | null
          batteri_aktiv?: boolean | null
          batteri_antall?: number | null
          batteri_note?: string | null
          batteri_type?: string | null
          batterialder?: string | null
          batteritype?: string | null
          brannklokke_aktiv?: boolean | null
          brannklokke_antall?: number | null
          brannklokke_note?: string | null
          brannklokke_type?: string | null
          brannsentral_aktiv?: boolean | null
          brannsentral_antall?: number | null
          brannsentral_note?: string | null
          brannsentral_type?: string | null
          dorstyring_aktiv?: boolean | null
          dorstyring_antall?: number | null
          dorstyring_avvik?: string | null
          dorstyring_har_avvik?: boolean | null
          dorstyring_note?: string | null
          dorstyring_status?: string | null
          ekstern_mottaker?: string[] | null
          ekstern_mottaker_aktiv?: boolean | null
          ekstern_mottaker_info?: string | null
          flame_aktiv?: boolean | null
          flame_antall?: number | null
          flame_note?: string | null
          flame_type?: string | null
          flash_blitz_aktiv?: boolean | null
          flash_blitz_antall?: number | null
          flash_blitz_avvik?: string | null
          flash_blitz_har_avvik?: boolean | null
          flash_blitz_note?: string | null
          flash_blitz_status?: string | null
          forsynet_fra_brannsentral?: boolean | null
          gardin_aktiv?: boolean | null
          gardin_antall?: number | null
          gardin_avvik?: string | null
          gardin_har_avvik?: boolean | null
          gardin_note?: string | null
          gardin_status?: string | null
          gsm_nummer?: string | null
          heis_aktiv?: boolean | null
          heis_antall?: number | null
          heis_avvik?: string | null
          heis_har_avvik?: boolean | null
          heis_note?: string | null
          heis_status?: string | null
          id?: string
          io_aktiv?: boolean | null
          io_antall?: number | null
          io_note?: string | null
          io_type?: string | null
          klokke_aktiv?: boolean | null
          klokke_antall?: number | null
          klokke_avvik?: string | null
          klokke_har_avvik?: boolean | null
          klokke_note?: string | null
          klokke_status?: string | null
          kraftforsyning_aktiv?: boolean | null
          kraftforsyning_antall?: number | null
          kraftforsyning_note?: string | null
          kraftforsyning_type?: string | null
          kunde?: string | null
          leverandor?: string | null
          linje_aktiv?: boolean | null
          linje_antall?: number | null
          linje_note?: string | null
          linje_type?: string | null
          mm_aktiv?: boolean | null
          mm_antall?: number | null
          mm_note?: string | null
          mm_type?: string | null
          mottaker?: string[] | null
          mottaker_kommentar?: string | null
          multi_aktiv?: boolean | null
          multi_antall?: number | null
          multi_note?: string | null
          multi_type?: string | null
          musikk_aktiv?: boolean | null
          musikk_antall?: number | null
          musikk_avvik?: string | null
          musikk_har_avvik?: boolean | null
          musikk_note?: string | null
          musikk_status?: string | null
          nokkelsafe?: boolean | null
          nokkelsafe_innhold?: string | null
          nokkelsafe_kommentar?: string | null
          nokkelsafe_plassering?: string | null
          nokkelsafe_type?: string | null
          opprettet_dato?: string
          optisk_aktiv?: boolean | null
          optisk_antall?: number | null
          optisk_note?: string | null
          optisk_type?: string | null
          overvaking_aktiv?: boolean | null
          overvaking_antall?: number | null
          overvaking_avvik?: string | null
          overvaking_har_avvik?: boolean | null
          overvaking_note?: string | null
          overvaking_status?: string | null
          ovrige_aktiv?: boolean | null
          ovrige_antall?: number | null
          ovrige_avvik?: string | null
          ovrige_har_avvik?: boolean | null
          ovrige_note?: string | null
          ovrige_status?: string | null
          panel_aktiv?: boolean | null
          panel_antall?: number | null
          panel_note?: string | null
          panel_type?: string | null
          plassering?: string | null
          port_aktiv?: boolean | null
          port_antall?: number | null
          port_avvik?: string | null
          port_har_avvik?: boolean | null
          port_note?: string | null
          port_status?: string | null
          rd_aktiv?: boolean | null
          rd_antall?: number | null
          rd_note?: string | null
          rd_type?: string | null
          royklukker_aktiv?: boolean | null
          royklukker_antall?: number | null
          royklukker_avvik?: string | null
          royklukker_har_avvik?: boolean | null
          royklukker_note?: string | null
          royklukker_status?: string | null
          safe_aktiv?: boolean | null
          safe_antall?: number | null
          safe_avvik?: string | null
          safe_har_avvik?: boolean | null
          safe_note?: string | null
          safe_status?: string | null
          sd_aktiv?: boolean | null
          sd_antall?: number | null
          sd_avvik?: string | null
          sd_har_avvik?: boolean | null
          sd_note?: string | null
          sd_status?: string | null
          sender_2G_4G?: string | null
          sentraltype?: string | null
          sirene_aktiv?: boolean | null
          sirene_antall?: number | null
          sirene_note?: string | null
          sirene_type?: string | null
          sist_oppdatert?: string | null
          sloyfer_aktiv?: boolean | null
          sloyfer_antall?: number | null
          sloyfer_note?: string | null
          sloyfer_type?: string | null
          slukke_aktiv?: boolean | null
          slukke_antall?: number | null
          slukke_avvik?: string | null
          slukke_har_avvik?: boolean | null
          slukke_note?: string | null
          slukke_status?: string | null
          spjaeld_aktiv?: boolean | null
          spjaeld_antall?: number | null
          spjaeld_avvik?: string | null
          spjaeld_har_avvik?: boolean | null
          spjaeld_note?: string | null
          spjaeld_status?: string | null
          sprinkler_aktiv?: boolean | null
          sprinkler_antall?: number | null
          sprinkler_note?: string | null
          sprinkler_type?: string | null
          sprinklerstyring_antall?: number | null
          sprinklerstyring_note?: string | null
          sprinklerstyring_type?: string | null
          talevarsling?: boolean | null
          talevarsling_batteri_alder?: string | null
          talevarsling_batteri_type?: string | null
          talevarsling_kommentar?: string | null
          talevarsling_leverandor?: string | null
          talevarsling_plassering?: string | null
          traadlos_aktiv?: boolean | null
          traadlos_antall?: number | null
          traadlos_note?: string | null
          traadlos_type?: string | null
          vd_aktiv?: boolean | null
          vd_antall?: number | null
          vd_note?: string | null
          vd_type?: string | null
          vent_aktiv?: boolean | null
          vent_antall?: number | null
          vent_avvik?: string | null
          vent_har_avvik?: boolean | null
          vent_note?: string | null
          vent_status?: string | null
        }
        Update: {
          adgang_aktiv?: boolean | null
          adgang_antall?: number | null
          adgang_avvik?: string | null
          adgang_har_avvik?: boolean | null
          adgang_note?: string | null
          adgang_status?: string | null
          alarmsender_i_anlegg?: boolean | null
          anlegg_id?: string | null
          annet_aktiv?: boolean | null
          annet_antall?: number | null
          annet_note?: string | null
          annet_type?: string | null
          asp_aktiv?: boolean | null
          asp_antall?: number | null
          asp_note?: string | null
          asp_type?: string | null
          avstiller_aktiv?: boolean | null
          avstiller_antall?: number | null
          avstiller_note?: string | null
          avstiller_type?: string | null
          batteri_aktiv?: boolean | null
          batteri_antall?: number | null
          batteri_note?: string | null
          batteri_type?: string | null
          batterialder?: string | null
          batteritype?: string | null
          brannklokke_aktiv?: boolean | null
          brannklokke_antall?: number | null
          brannklokke_note?: string | null
          brannklokke_type?: string | null
          brannsentral_aktiv?: boolean | null
          brannsentral_antall?: number | null
          brannsentral_note?: string | null
          brannsentral_type?: string | null
          dorstyring_aktiv?: boolean | null
          dorstyring_antall?: number | null
          dorstyring_avvik?: string | null
          dorstyring_har_avvik?: boolean | null
          dorstyring_note?: string | null
          dorstyring_status?: string | null
          ekstern_mottaker?: string[] | null
          ekstern_mottaker_aktiv?: boolean | null
          ekstern_mottaker_info?: string | null
          flame_aktiv?: boolean | null
          flame_antall?: number | null
          flame_note?: string | null
          flame_type?: string | null
          flash_blitz_aktiv?: boolean | null
          flash_blitz_antall?: number | null
          flash_blitz_avvik?: string | null
          flash_blitz_har_avvik?: boolean | null
          flash_blitz_note?: string | null
          flash_blitz_status?: string | null
          forsynet_fra_brannsentral?: boolean | null
          gardin_aktiv?: boolean | null
          gardin_antall?: number | null
          gardin_avvik?: string | null
          gardin_har_avvik?: boolean | null
          gardin_note?: string | null
          gardin_status?: string | null
          gsm_nummer?: string | null
          heis_aktiv?: boolean | null
          heis_antall?: number | null
          heis_avvik?: string | null
          heis_har_avvik?: boolean | null
          heis_note?: string | null
          heis_status?: string | null
          id?: string
          io_aktiv?: boolean | null
          io_antall?: number | null
          io_note?: string | null
          io_type?: string | null
          klokke_aktiv?: boolean | null
          klokke_antall?: number | null
          klokke_avvik?: string | null
          klokke_har_avvik?: boolean | null
          klokke_note?: string | null
          klokke_status?: string | null
          kraftforsyning_aktiv?: boolean | null
          kraftforsyning_antall?: number | null
          kraftforsyning_note?: string | null
          kraftforsyning_type?: string | null
          kunde?: string | null
          leverandor?: string | null
          linje_aktiv?: boolean | null
          linje_antall?: number | null
          linje_note?: string | null
          linje_type?: string | null
          mm_aktiv?: boolean | null
          mm_antall?: number | null
          mm_note?: string | null
          mm_type?: string | null
          mottaker?: string[] | null
          mottaker_kommentar?: string | null
          multi_aktiv?: boolean | null
          multi_antall?: number | null
          multi_note?: string | null
          multi_type?: string | null
          musikk_aktiv?: boolean | null
          musikk_antall?: number | null
          musikk_avvik?: string | null
          musikk_har_avvik?: boolean | null
          musikk_note?: string | null
          musikk_status?: string | null
          nokkelsafe?: boolean | null
          nokkelsafe_innhold?: string | null
          nokkelsafe_kommentar?: string | null
          nokkelsafe_plassering?: string | null
          nokkelsafe_type?: string | null
          opprettet_dato?: string
          optisk_aktiv?: boolean | null
          optisk_antall?: number | null
          optisk_note?: string | null
          optisk_type?: string | null
          overvaking_aktiv?: boolean | null
          overvaking_antall?: number | null
          overvaking_avvik?: string | null
          overvaking_har_avvik?: boolean | null
          overvaking_note?: string | null
          overvaking_status?: string | null
          ovrige_aktiv?: boolean | null
          ovrige_antall?: number | null
          ovrige_avvik?: string | null
          ovrige_har_avvik?: boolean | null
          ovrige_note?: string | null
          ovrige_status?: string | null
          panel_aktiv?: boolean | null
          panel_antall?: number | null
          panel_note?: string | null
          panel_type?: string | null
          plassering?: string | null
          port_aktiv?: boolean | null
          port_antall?: number | null
          port_avvik?: string | null
          port_har_avvik?: boolean | null
          port_note?: string | null
          port_status?: string | null
          rd_aktiv?: boolean | null
          rd_antall?: number | null
          rd_note?: string | null
          rd_type?: string | null
          royklukker_aktiv?: boolean | null
          royklukker_antall?: number | null
          royklukker_avvik?: string | null
          royklukker_har_avvik?: boolean | null
          royklukker_note?: string | null
          royklukker_status?: string | null
          safe_aktiv?: boolean | null
          safe_antall?: number | null
          safe_avvik?: string | null
          safe_har_avvik?: boolean | null
          safe_note?: string | null
          safe_status?: string | null
          sd_aktiv?: boolean | null
          sd_antall?: number | null
          sd_avvik?: string | null
          sd_har_avvik?: boolean | null
          sd_note?: string | null
          sd_status?: string | null
          sender_2G_4G?: string | null
          sentraltype?: string | null
          sirene_aktiv?: boolean | null
          sirene_antall?: number | null
          sirene_note?: string | null
          sirene_type?: string | null
          sist_oppdatert?: string | null
          sloyfer_aktiv?: boolean | null
          sloyfer_antall?: number | null
          sloyfer_note?: string | null
          sloyfer_type?: string | null
          slukke_aktiv?: boolean | null
          slukke_antall?: number | null
          slukke_avvik?: string | null
          slukke_har_avvik?: boolean | null
          slukke_note?: string | null
          slukke_status?: string | null
          spjaeld_aktiv?: boolean | null
          spjaeld_antall?: number | null
          spjaeld_avvik?: string | null
          spjaeld_har_avvik?: boolean | null
          spjaeld_note?: string | null
          spjaeld_status?: string | null
          sprinkler_aktiv?: boolean | null
          sprinkler_antall?: number | null
          sprinkler_note?: string | null
          sprinkler_type?: string | null
          sprinklerstyring_antall?: number | null
          sprinklerstyring_note?: string | null
          sprinklerstyring_type?: string | null
          talevarsling?: boolean | null
          talevarsling_batteri_alder?: string | null
          talevarsling_batteri_type?: string | null
          talevarsling_kommentar?: string | null
          talevarsling_leverandor?: string | null
          talevarsling_plassering?: string | null
          traadlos_aktiv?: boolean | null
          traadlos_antall?: number | null
          traadlos_note?: string | null
          traadlos_type?: string | null
          vd_aktiv?: boolean | null
          vd_antall?: number | null
          vd_note?: string | null
          vd_type?: string | null
          vent_aktiv?: boolean | null
          vent_antall?: number | null
          vent_avvik?: string | null
          vent_har_avvik?: boolean | null
          vent_note?: string | null
          vent_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anleggsdata_brannalarm_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: true
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      anleggsdata_brannslanger: {
        Row: {
          anlegg_id: string | null
          brannklasse: string | null
          created_at: string
          etasje: string | null
          id: string
          kunde: string | null
          modell: string | null
          plassering: string | null
          produksjonsaar: string | null
          produsent: string | null
          sist_oppdatert: string | null
          sistekontroll: string | null
          slangenummer: number | null
          status: string | null
          trykktest: string | null
          type_avvik: string[] | null
        }
        Insert: {
          anlegg_id?: string | null
          brannklasse?: string | null
          created_at?: string
          etasje?: string | null
          id?: string
          kunde?: string | null
          modell?: string | null
          plassering?: string | null
          produksjonsaar?: string | null
          produsent?: string | null
          sist_oppdatert?: string | null
          sistekontroll?: string | null
          slangenummer?: number | null
          status?: string | null
          trykktest?: string | null
          type_avvik?: string[] | null
        }
        Update: {
          anlegg_id?: string | null
          brannklasse?: string | null
          created_at?: string
          etasje?: string | null
          id?: string
          kunde?: string | null
          modell?: string | null
          plassering?: string | null
          produksjonsaar?: string | null
          produsent?: string | null
          sist_oppdatert?: string | null
          sistekontroll?: string | null
          slangenummer?: number | null
          status?: string | null
          trykktest?: string | null
          type_avvik?: string[] | null
        }
        Relationships: []
      }
      anleggsdata_brannslanger_status: {
        Row: {
          anlegg_id: string | null
          created_at: string
          evakueringsplan: string | null
          id: string
          maa_trykktest: number | null
          oppdatert: string | null
          totalt: number | null
          trykktest: number | null
        }
        Insert: {
          anlegg_id?: string | null
          created_at?: string
          evakueringsplan?: string | null
          id?: string
          maa_trykktest?: number | null
          oppdatert?: string | null
          totalt?: number | null
          trykktest?: number | null
        }
        Update: {
          anlegg_id?: string | null
          created_at?: string
          evakueringsplan?: string | null
          id?: string
          maa_trykktest?: number | null
          oppdatert?: string | null
          totalt?: number | null
          trykktest?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "anleggsdata_brannslanger_status_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      anleggsdata_brannslukkere: {
        Row: {
          anlegg_id: string | null
          apparat_nr: string | null
          brannklasse: string | null
          created_at: string
          etasje: string | null
          id: string
          kontroll_id: string | null
          modell: string | null
          plassering: string | null
          produksjonsaar: string | null
          produsent: string | null
          service: string | null
          sist_oppdatert: string | null
          siste_kontroll: string | null
          status: string[] | null
        }
        Insert: {
          anlegg_id?: string | null
          apparat_nr?: string | null
          brannklasse?: string | null
          created_at?: string
          etasje?: string | null
          id?: string
          kontroll_id?: string | null
          modell?: string | null
          plassering?: string | null
          produksjonsaar?: string | null
          produsent?: string | null
          service?: string | null
          sist_oppdatert?: string | null
          siste_kontroll?: string | null
          status?: string[] | null
        }
        Update: {
          anlegg_id?: string | null
          apparat_nr?: string | null
          brannklasse?: string | null
          created_at?: string
          etasje?: string | null
          id?: string
          kontroll_id?: string | null
          modell?: string | null
          plassering?: string | null
          produksjonsaar?: string | null
          produsent?: string | null
          service?: string | null
          sist_oppdatert?: string | null
          siste_kontroll?: string | null
          status?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "anleggsdata_brannslukkere_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anleggsdata_brannslukkere_kontroll_id_fkey"
            columns: ["kontroll_id"]
            isOneToOne: false
            referencedRelation: "kontroll_brannslukkere"
            referencedColumns: ["id"]
          },
        ]
      }
      anleggsdata_brannslukkere_status: {
        Row: {
          anlegg_id: string | null
          byttet_naa: number | null
          created_at: string
          evakueringsplan: string | null
          id: string
          må_byttes: number | null
          oppdatert: string | null
          totalt: number | null
          utgaatt: number | null
        }
        Insert: {
          anlegg_id?: string | null
          byttet_naa?: number | null
          created_at?: string
          evakueringsplan?: string | null
          id?: string
          må_byttes?: number | null
          oppdatert?: string | null
          totalt?: number | null
          utgaatt?: number | null
        }
        Update: {
          anlegg_id?: string | null
          byttet_naa?: number | null
          created_at?: string
          evakueringsplan?: string | null
          id?: string
          må_byttes?: number | null
          oppdatert?: string | null
          totalt?: number | null
          utgaatt?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "anleggsdata_brannslukkere_status_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      anleggsdata_forstehjelp: {
        Row: {
          anlegg_id: string
          created_at: string | null
          etasje: string | null
          id: string
          internnummer: string | null
          kommentar: string | null
          kontrollert: boolean | null
          kundenavn: string | null
          plassering: string | null
          produsent: string | null
          sjekkpunkter: Json | null
          status: string | null
          tillegg: string[] | null
          type: string | null
          utlopsdato: string | null
        }
        Insert: {
          anlegg_id: string
          created_at?: string | null
          etasje?: string | null
          id?: string
          internnummer?: string | null
          kommentar?: string | null
          kontrollert?: boolean | null
          kundenavn?: string | null
          plassering?: string | null
          produsent?: string | null
          sjekkpunkter?: Json | null
          status?: string | null
          tillegg?: string[] | null
          type?: string | null
          utlopsdato?: string | null
        }
        Update: {
          anlegg_id?: string
          created_at?: string | null
          etasje?: string | null
          id?: string
          internnummer?: string | null
          kommentar?: string | null
          kontrollert?: boolean | null
          kundenavn?: string | null
          plassering?: string | null
          produsent?: string | null
          sjekkpunkter?: Json | null
          status?: string | null
          tillegg?: string[] | null
          type?: string | null
          utlopsdato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anleggsdata_forstehjelp_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      anleggsdata_kontroll: {
        Row: {
          adgang_aktiv: boolean | null
          alarmsender_i_anlegg: boolean | null
          anlegg_forsinket: boolean | null
          anlegg_forsinket_minutter: string | null
          anlegg_id: string | null
          batterialder: string | null
          batteritype: string | null
          created_at: string | null
          dato: string | null
          ekstern_mottaker: string[] | null
          ekstern_mottaker_aktiv: boolean | null
          ekstern_mottaker_info: string | null
          feil_kommentar: string | null
          fg_anlegg: boolean | null
          forsynet_fra_brannsentral: boolean | null
          forsynt_fra_brannsentral: boolean | null
          gsm_nummer: string | null
          har_feil: boolean | null
          har_utkoblinger: boolean | null
          id: string
          idriftsatt: string | null
          ingen_anleggsvurdering: boolean | null
          ingen_anleggsvurdering_kommentar: string | null
          kontroll_status: string | null
          kontrollor_id: string | null
          kontrollor_vurdering_kommentar: string | null
          kontrollor_vurdering_sum: number | null
          kritisk_feil: boolean | null
          kritisk_feil_kommentar: string | null
          merknader: string | null
          mottaker: string[] | null
          mottaker_kommentar: string | null
          neste_kontroll: string | null
          nokkelsafe: boolean | null
          nokkelsafe_innhold: string | null
          nokkelsafe_kommentar: string | null
          nokkelsafe_plassering: string | null
          nokkelsafe_type: string | null
          plassering: string | null
          rapport_type: string | null
          sender_2G_4G: string | null
          sentraltype: string | null
          status: string | null
          talevarsling: boolean | null
          talevarsling_batteri_alder: string | null
          talevarsling_batteri_type: string | null
          talevarsling_kommentar: string | null
          talevarsling_leverandor: string | null
          talevarsling_plassering: string | null
          updated_at: string | null
          utkobling_kommentar: string | null
        }
        Insert: {
          adgang_aktiv?: boolean | null
          alarmsender_i_anlegg?: boolean | null
          anlegg_forsinket?: boolean | null
          anlegg_forsinket_minutter?: string | null
          anlegg_id?: string | null
          batterialder?: string | null
          batteritype?: string | null
          created_at?: string | null
          dato?: string | null
          ekstern_mottaker?: string[] | null
          ekstern_mottaker_aktiv?: boolean | null
          ekstern_mottaker_info?: string | null
          feil_kommentar?: string | null
          fg_anlegg?: boolean | null
          forsynet_fra_brannsentral?: boolean | null
          forsynt_fra_brannsentral?: boolean | null
          gsm_nummer?: string | null
          har_feil?: boolean | null
          har_utkoblinger?: boolean | null
          id?: string
          idriftsatt?: string | null
          ingen_anleggsvurdering?: boolean | null
          ingen_anleggsvurdering_kommentar?: string | null
          kontroll_status?: string | null
          kontrollor_id?: string | null
          kontrollor_vurdering_kommentar?: string | null
          kontrollor_vurdering_sum?: number | null
          kritisk_feil?: boolean | null
          kritisk_feil_kommentar?: string | null
          merknader?: string | null
          mottaker?: string[] | null
          mottaker_kommentar?: string | null
          neste_kontroll?: string | null
          nokkelsafe?: boolean | null
          nokkelsafe_innhold?: string | null
          nokkelsafe_kommentar?: string | null
          nokkelsafe_plassering?: string | null
          nokkelsafe_type?: string | null
          plassering?: string | null
          rapport_type?: string | null
          sender_2G_4G?: string | null
          sentraltype?: string | null
          status?: string | null
          talevarsling?: boolean | null
          talevarsling_batteri_alder?: string | null
          talevarsling_batteri_type?: string | null
          talevarsling_kommentar?: string | null
          talevarsling_leverandor?: string | null
          talevarsling_plassering?: string | null
          updated_at?: string | null
          utkobling_kommentar?: string | null
        }
        Update: {
          adgang_aktiv?: boolean | null
          alarmsender_i_anlegg?: boolean | null
          anlegg_forsinket?: boolean | null
          anlegg_forsinket_minutter?: string | null
          anlegg_id?: string | null
          batterialder?: string | null
          batteritype?: string | null
          created_at?: string | null
          dato?: string | null
          ekstern_mottaker?: string[] | null
          ekstern_mottaker_aktiv?: boolean | null
          ekstern_mottaker_info?: string | null
          feil_kommentar?: string | null
          fg_anlegg?: boolean | null
          forsynet_fra_brannsentral?: boolean | null
          forsynt_fra_brannsentral?: boolean | null
          gsm_nummer?: string | null
          har_feil?: boolean | null
          har_utkoblinger?: boolean | null
          id?: string
          idriftsatt?: string | null
          ingen_anleggsvurdering?: boolean | null
          ingen_anleggsvurdering_kommentar?: string | null
          kontroll_status?: string | null
          kontrollor_id?: string | null
          kontrollor_vurdering_kommentar?: string | null
          kontrollor_vurdering_sum?: number | null
          kritisk_feil?: boolean | null
          kritisk_feil_kommentar?: string | null
          merknader?: string | null
          mottaker?: string[] | null
          mottaker_kommentar?: string | null
          neste_kontroll?: string | null
          nokkelsafe?: boolean | null
          nokkelsafe_innhold?: string | null
          nokkelsafe_kommentar?: string | null
          nokkelsafe_plassering?: string | null
          nokkelsafe_type?: string | null
          plassering?: string | null
          rapport_type?: string | null
          sender_2G_4G?: string | null
          sentraltype?: string | null
          status?: string | null
          talevarsling?: boolean | null
          talevarsling_batteri_alder?: string | null
          talevarsling_batteri_type?: string | null
          talevarsling_kommentar?: string | null
          talevarsling_leverandor?: string | null
          talevarsling_plassering?: string | null
          updated_at?: string | null
          utkobling_kommentar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anleggsdata_kontroll_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      anleggsdata_nodlys: {
        Row: {
          amatur_id: string | null
          anlegg_id: string | null
          etasje: string | null
          fordeling: string | null
          id: string
          internnummer: string | null
          kontrollert: boolean | null
          kundenavn: string | null
          kurs: string | null
          opprettet_dato: string
          plassering: string | null
          produsent: string | null
          sist_oppdatert: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          amatur_id?: string | null
          anlegg_id?: string | null
          etasje?: string | null
          fordeling?: string | null
          id?: string
          internnummer?: string | null
          kontrollert?: boolean | null
          kundenavn?: string | null
          kurs?: string | null
          opprettet_dato?: string
          plassering?: string | null
          produsent?: string | null
          sist_oppdatert?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          amatur_id?: string | null
          anlegg_id?: string | null
          etasje?: string | null
          fordeling?: string | null
          id?: string
          internnummer?: string | null
          kontrollert?: boolean | null
          kundenavn?: string | null
          kurs?: string | null
          opprettet_dato?: string
          plassering?: string | null
          produsent?: string | null
          sist_oppdatert?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: []
      }
      ansatte: {
        Row: {
          auth_id: string | null
          auth_user_id: string | null
          created_at: string
          epost: string | null
          fg_sertifikat_nr: string | null
          gronn_sertifikat_nummer: string | null
          id: string
          navn: string | null
          onesignal_id: string | null
          passord: string | null
          rolle: string | null
          telefon: string | null
          telegram_chat_id: string | null
        }
        Insert: {
          auth_id?: string | null
          auth_user_id?: string | null
          created_at?: string
          epost?: string | null
          fg_sertifikat_nr?: string | null
          gronn_sertifikat_nummer?: string | null
          id?: string
          navn?: string | null
          onesignal_id?: string | null
          passord?: string | null
          rolle?: string | null
          telefon?: string | null
          telegram_chat_id?: string | null
        }
        Update: {
          auth_id?: string | null
          auth_user_id?: string | null
          created_at?: string
          epost?: string | null
          fg_sertifikat_nr?: string | null
          gronn_sertifikat_nummer?: string | null
          id?: string
          navn?: string | null
          onesignal_id?: string | null
          passord?: string | null
          rolle?: string | null
          telefon?: string | null
          telegram_chat_id?: string | null
        }
        Relationships: []
      }
      app_versions: {
        Row: {
          created_at: string
          id: string
          installer_file: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          installer_file: string
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          installer_file?: string
          version?: string
        }
        Relationships: []
      }
      avvik: {
        Row: {
          alvorlighetsgrad: string | null
          anlegg_id: string | null
          ansvarlig_for_lukking: string | null
          beskrivelse: string
          created_at: string | null
          dato: string | null
          forebyggende_tiltak: string | null
          id: string
          kategori: string
          korrigerende_tiltak: string | null
          kunde_id: string | null
          lukket_dato: string | null
          oppdaget_av: string | null
          opprettet_av: string | null
          registrert_av: string | null
          status: string | null
          tittel: string
          updated_at: string | null
        }
        Insert: {
          alvorlighetsgrad?: string | null
          anlegg_id?: string | null
          ansvarlig_for_lukking?: string | null
          beskrivelse: string
          created_at?: string | null
          dato?: string | null
          forebyggende_tiltak?: string | null
          id?: string
          kategori: string
          korrigerende_tiltak?: string | null
          kunde_id?: string | null
          lukket_dato?: string | null
          oppdaget_av?: string | null
          opprettet_av?: string | null
          registrert_av?: string | null
          status?: string | null
          tittel: string
          updated_at?: string | null
        }
        Update: {
          alvorlighetsgrad?: string | null
          anlegg_id?: string | null
          ansvarlig_for_lukking?: string | null
          beskrivelse?: string
          created_at?: string | null
          dato?: string | null
          forebyggende_tiltak?: string | null
          id?: string
          kategori?: string
          korrigerende_tiltak?: string | null
          kunde_id?: string | null
          lukket_dato?: string | null
          oppdaget_av?: string | null
          opprettet_av?: string | null
          registrert_av?: string | null
          status?: string | null
          tittel?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avvik_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avvik_ansvarlig_for_lukking_fkey"
            columns: ["ansvarlig_for_lukking"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avvik_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "alarmoverforing_med_info"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "avvik_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avvik_registrert_av_fkey"
            columns: ["registrert_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      bildebank: {
        Row: {
          anlegg_id: string | null
          created_at: string
          id: string
          url: string | null
        }
        Insert: {
          anlegg_id?: string | null
          created_at?: string
          id?: string
          url?: string | null
        }
        Update: {
          anlegg_id?: string | null
          created_at?: string
          id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bildebank_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      brannslange_logg: {
        Row: {
          anlegg_id: string
          avvik: string | null
          endret_av: string | null
          endret_tid: string
          id: string
          kommentar: string | null
          slange_nr: number
          status: string
          type_avvik: string[] | null
        }
        Insert: {
          anlegg_id: string
          avvik?: string | null
          endret_av?: string | null
          endret_tid?: string
          id?: string
          kommentar?: string | null
          slange_nr: number
          status: string
          type_avvik?: string[] | null
        }
        Update: {
          anlegg_id?: string
          avvik?: string | null
          endret_av?: string | null
          endret_tid?: string
          id?: string
          kommentar?: string | null
          slange_nr?: number
          status?: string
          type_avvik?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "brannslange_logg_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      brannslukker_logg: {
        Row: {
          anlegg_id: string
          apparat_nr: string | null
          endret_av: string | null
          endret_tid: string | null
          id: string
          kommentar: string | null
          status: string[] | null
        }
        Insert: {
          anlegg_id: string
          apparat_nr?: string | null
          endret_av?: string | null
          endret_tid?: string | null
          id?: string
          kommentar?: string | null
          status?: string[] | null
        }
        Update: {
          anlegg_id?: string
          apparat_nr?: string | null
          endret_av?: string | null
          endret_tid?: string | null
          id?: string
          kommentar?: string | null
          status?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "brannslukker_logg_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      customer: {
        Row: {
          id: string
          kontaktperson_id: string | null
          kunde_nummer: string | null
          navn: string | null
          opprettet: string
          organisasjonsnummer: string | null
          primaer_kontaktperson_id: string | null
          sist_oppdatert: string | null
          skjult: boolean | null
          type: string | null
        }
        Insert: {
          id?: string
          kontaktperson_id?: string | null
          kunde_nummer?: string | null
          navn?: string | null
          opprettet?: string
          organisasjonsnummer?: string | null
          primaer_kontaktperson_id?: string | null
          sist_oppdatert?: string | null
          skjult?: boolean | null
          type?: string | null
        }
        Update: {
          id?: string
          kontaktperson_id?: string | null
          kunde_nummer?: string | null
          navn?: string | null
          opprettet?: string
          organisasjonsnummer?: string | null
          primaer_kontaktperson_id?: string | null
          sist_oppdatert?: string | null
          skjult?: boolean | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_kontaktperson_id_fkey"
            columns: ["kontaktperson_id"]
            isOneToOne: false
            referencedRelation: "kontaktpersoner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_primaer_kontaktperson_id_fkey"
            columns: ["primaer_kontaktperson_id"]
            isOneToOne: false
            referencedRelation: "kontaktpersoner"
            referencedColumns: ["id"]
          },
        ]
      }
      detektor_items: {
        Row: {
          adresse: string
          akse: string | null
          detektorliste_id: string | null
          etasje: string | null
          id: string
          kart: string | null
          kommentar: string | null
          opprettet_dato: string | null
          plassering: string | null
          rekkefølge: number | null
          type: string | null
        }
        Insert: {
          adresse: string
          akse?: string | null
          detektorliste_id?: string | null
          etasje?: string | null
          id?: string
          kart?: string | null
          kommentar?: string | null
          opprettet_dato?: string | null
          plassering?: string | null
          rekkefølge?: number | null
          type?: string | null
        }
        Update: {
          adresse?: string
          akse?: string | null
          detektorliste_id?: string | null
          etasje?: string | null
          id?: string
          kart?: string | null
          kommentar?: string | null
          opprettet_dato?: string | null
          plassering?: string | null
          rekkefølge?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detektor_items_detektorliste_id_fkey"
            columns: ["detektorliste_id"]
            isOneToOne: false
            referencedRelation: "detektorlister"
            referencedColumns: ["id"]
          },
        ]
      }
      detektorlister: {
        Row: {
          anlegg_id: string | null
          annet: string | null
          dato: string
          epost: string | null
          id: string
          kontakt_person: string | null
          kunde_id: string | null
          kundeadresse: string | null
          mobil: string | null
          oppdatert_dato: string | null
          opprettet_av: string | null
          opprettet_dato: string | null
          prosjekt_id: string | null
          revisjon: string
          service_ingeniør: string | null
          sist_oppdatert: string | null
          status: string | null
        }
        Insert: {
          anlegg_id?: string | null
          annet?: string | null
          dato?: string
          epost?: string | null
          id?: string
          kontakt_person?: string | null
          kunde_id?: string | null
          kundeadresse?: string | null
          mobil?: string | null
          oppdatert_dato?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          prosjekt_id?: string | null
          revisjon?: string
          service_ingeniør?: string | null
          sist_oppdatert?: string | null
          status?: string | null
        }
        Update: {
          anlegg_id?: string | null
          annet?: string | null
          dato?: string
          epost?: string | null
          id?: string
          kontakt_person?: string | null
          kunde_id?: string | null
          kundeadresse?: string | null
          mobil?: string | null
          oppdatert_dato?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          prosjekt_id?: string | null
          revisjon?: string
          service_ingeniør?: string | null
          sist_oppdatert?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detektorlister_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detektorlister_prosjekt_id_fkey"
            columns: ["prosjekt_id"]
            isOneToOne: false
            referencedRelation: "prosjekter"
            referencedColumns: ["id"]
          },
        ]
      }
      dokumenter: {
        Row: {
          anlegg_id: string | null
          created_at: string
          filnavn: string | null
          id: string
          opplastet_av: string | null
          opplastet_dato: string | null
          ordre_id: string | null
          storage_path: string | null
          type: string | null
          url: string | null
        }
        Insert: {
          anlegg_id?: string | null
          created_at?: string
          filnavn?: string | null
          id?: string
          opplastet_av?: string | null
          opplastet_dato?: string | null
          ordre_id?: string | null
          storage_path?: string | null
          type?: string | null
          url?: string | null
        }
        Update: {
          anlegg_id?: string | null
          created_at?: string
          filnavn?: string | null
          id?: string
          opplastet_av?: string | null
          opplastet_dato?: string | null
          ordre_id?: string | null
          storage_path?: string | null
          type?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dokumenter_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dokumenter_ordre_id_fkey"
            columns: ["ordre_id"]
            isOneToOne: false
            referencedRelation: "ordre"
            referencedColumns: ["id"]
          },
        ]
      }
      dropbox_config: {
        Row: {
          access_token: string
          connected_at: string | null
          connected_by: string | null
          id: string
          refresh_token: string
          root_namespace_id: string | null
          token_expiry: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          connected_at?: string | null
          connected_by?: string | null
          id?: string
          refresh_token: string
          root_namespace_id?: string | null
          token_expiry?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          connected_by?: string | null
          id?: string
          refresh_token?: string
          root_namespace_id?: string | null
          token_expiry?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          attachment_content: string | null
          attachment_content_type: string | null
          attachment_filename: string | null
          attachments_json: Json | null
          bcc_email: string | null
          body: string
          cc_email: string | null
          created_at: string | null
          email_data: Json | null
          error_message: string | null
          from_email: string
          from_name: string
          id: string
          is_html: boolean | null
          processed_at: string | null
          reply_to: string | null
          status: string
          subject: string
          to_email: string
          user_id: string | null
        }
        Insert: {
          attachment_content?: string | null
          attachment_content_type?: string | null
          attachment_filename?: string | null
          attachments_json?: Json | null
          bcc_email?: string | null
          body: string
          cc_email?: string | null
          created_at?: string | null
          email_data?: Json | null
          error_message?: string | null
          from_email?: string
          from_name?: string
          id?: string
          is_html?: boolean | null
          processed_at?: string | null
          reply_to?: string | null
          status?: string
          subject: string
          to_email: string
          user_id?: string | null
        }
        Update: {
          attachment_content?: string | null
          attachment_content_type?: string | null
          attachment_filename?: string | null
          attachments_json?: Json | null
          bcc_email?: string | null
          body?: string
          cc_email?: string | null
          created_at?: string | null
          email_data?: Json | null
          error_message?: string | null
          from_email?: string
          from_name?: string
          id?: string
          is_html?: boolean | null
          processed_at?: string | null
          reply_to?: string | null
          status?: string
          subject?: string
          to_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      epost_logg: {
        Row: {
          anlegg_id: string | null
          created_at: string | null
          dokument_navn: string
          dokument_storage_path: string
          emne: string | null
          feilmelding: string | null
          id: string
          mottaker_epost: string
          mottaker_navn: string | null
          mottaker_type: string | null
          sendt_av_ansatt_id: string | null
          sendt_dato: string | null
          status: string | null
        }
        Insert: {
          anlegg_id?: string | null
          created_at?: string | null
          dokument_navn: string
          dokument_storage_path: string
          emne?: string | null
          feilmelding?: string | null
          id?: string
          mottaker_epost: string
          mottaker_navn?: string | null
          mottaker_type?: string | null
          sendt_av_ansatt_id?: string | null
          sendt_dato?: string | null
          status?: string | null
        }
        Update: {
          anlegg_id?: string | null
          created_at?: string | null
          dokument_navn?: string
          dokument_storage_path?: string
          emne?: string | null
          feilmelding?: string | null
          id?: string
          mottaker_epost?: string
          mottaker_navn?: string | null
          mottaker_type?: string | null
          sendt_av_ansatt_id?: string | null
          sendt_dato?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epost_logg_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epost_logg_sendt_av_ansatt_id_fkey"
            columns: ["sendt_av_ansatt_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      evakueringsplan_status: {
        Row: {
          anlegg_id: string
          created_at: string | null
          id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          anlegg_id: string
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          anlegg_id?: string
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evakueringsplan_status_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: true
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      fdv_anlegg_datablader: {
        Row: {
          anlegg_id: string
          antall: number | null
          datablad_id: string
          id: string
          notater: string | null
          opprettet_dato: string | null
          plassering: string | null
        }
        Insert: {
          anlegg_id: string
          antall?: number | null
          datablad_id: string
          id?: string
          notater?: string | null
          opprettet_dato?: string | null
          plassering?: string | null
        }
        Update: {
          anlegg_id?: string
          antall?: number | null
          datablad_id?: string
          id?: string
          notater?: string | null
          opprettet_dato?: string | null
          plassering?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fdv_anlegg_datablader_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fdv_anlegg_datablader_datablad_id_fkey"
            columns: ["datablad_id"]
            isOneToOne: false
            referencedRelation: "fdv_datablader"
            referencedColumns: ["id"]
          },
        ]
      }
      fdv_datablader: {
        Row: {
          artikkelnummer: string | null
          beskrivelse: string | null
          fil_storrelse: number | null
          fil_url: string
          filnavn: string
          id: string
          leverandor_id: string | null
          opprettet_av: string | null
          opprettet_dato: string | null
          produktnavn: string | null
          produkttype_id: string | null
          revisjon: string | null
          revisjon_dato: string | null
          sist_oppdatert: string | null
          tittel: string
        }
        Insert: {
          artikkelnummer?: string | null
          beskrivelse?: string | null
          fil_storrelse?: number | null
          fil_url: string
          filnavn: string
          id?: string
          leverandor_id?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          produktnavn?: string | null
          produkttype_id?: string | null
          revisjon?: string | null
          revisjon_dato?: string | null
          sist_oppdatert?: string | null
          tittel: string
        }
        Update: {
          artikkelnummer?: string | null
          beskrivelse?: string | null
          fil_storrelse?: number | null
          fil_url?: string
          filnavn?: string
          id?: string
          leverandor_id?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          produktnavn?: string | null
          produkttype_id?: string | null
          revisjon?: string | null
          revisjon_dato?: string | null
          sist_oppdatert?: string | null
          tittel?: string
        }
        Relationships: [
          {
            foreignKeyName: "fdv_datablader_leverandor_id_fkey"
            columns: ["leverandor_id"]
            isOneToOne: false
            referencedRelation: "fdv_leverandorer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fdv_datablader_produkttype_id_fkey"
            columns: ["produkttype_id"]
            isOneToOne: false
            referencedRelation: "fdv_produkttyper"
            referencedColumns: ["id"]
          },
        ]
      }
      fdv_genererte_dokumenter: {
        Row: {
          anlegg_id: string
          beskrivelse: string | null
          fil_url: string | null
          generert_av: string | null
          generert_dato: string | null
          id: string
          inkluderte_datablader: string[] | null
          tittel: string
        }
        Insert: {
          anlegg_id: string
          beskrivelse?: string | null
          fil_url?: string | null
          generert_av?: string | null
          generert_dato?: string | null
          id?: string
          inkluderte_datablader?: string[] | null
          tittel: string
        }
        Update: {
          anlegg_id?: string
          beskrivelse?: string | null
          fil_url?: string | null
          generert_av?: string | null
          generert_dato?: string | null
          id?: string
          inkluderte_datablader?: string[] | null
          tittel?: string
        }
        Relationships: [
          {
            foreignKeyName: "fdv_genererte_dokumenter_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      fdv_leverandorer: {
        Row: {
          beskrivelse: string | null
          id: string
          navn: string
          nettside: string | null
          opprettet_dato: string | null
          sist_oppdatert: string | null
        }
        Insert: {
          beskrivelse?: string | null
          id?: string
          navn: string
          nettside?: string | null
          opprettet_dato?: string | null
          sist_oppdatert?: string | null
        }
        Update: {
          beskrivelse?: string | null
          id?: string
          navn?: string
          nettside?: string | null
          opprettet_dato?: string | null
          sist_oppdatert?: string | null
        }
        Relationships: []
      }
      fdv_produkttyper: {
        Row: {
          beskrivelse: string | null
          id: string
          navn: string
          opprettet_dato: string | null
          sist_oppdatert: string | null
        }
        Insert: {
          beskrivelse?: string | null
          id?: string
          navn: string
          opprettet_dato?: string | null
          sist_oppdatert?: string | null
        }
        Update: {
          beskrivelse?: string | null
          id?: string
          navn?: string
          opprettet_dato?: string | null
          sist_oppdatert?: string | null
        }
        Relationships: []
      }
      hendelser: {
        Row: {
          aarsak_analyse: string | null
          alvorlighetsgrad: string | null
          anlegg_id: string | null
          årsak_analyse: string | null
          beskrivelse: string
          created_at: string | null
          dato: string | null
          forebyggende_tiltak: string | null
          id: string
          involverte_personer: string | null
          kunde_id: string | null
          opprettet_av: string | null
          registrert_av: string | null
          status: string | null
          sted: string | null
          tittel: string
          type: string
          updated_at: string | null
          vitner: string | null
        }
        Insert: {
          aarsak_analyse?: string | null
          alvorlighetsgrad?: string | null
          anlegg_id?: string | null
          årsak_analyse?: string | null
          beskrivelse: string
          created_at?: string | null
          dato?: string | null
          forebyggende_tiltak?: string | null
          id?: string
          involverte_personer?: string | null
          kunde_id?: string | null
          opprettet_av?: string | null
          registrert_av?: string | null
          status?: string | null
          sted?: string | null
          tittel: string
          type: string
          updated_at?: string | null
          vitner?: string | null
        }
        Update: {
          aarsak_analyse?: string | null
          alvorlighetsgrad?: string | null
          anlegg_id?: string | null
          årsak_analyse?: string | null
          beskrivelse?: string
          created_at?: string | null
          dato?: string | null
          forebyggende_tiltak?: string | null
          id?: string
          involverte_personer?: string | null
          kunde_id?: string | null
          opprettet_av?: string | null
          registrert_av?: string | null
          status?: string | null
          sted?: string | null
          tittel?: string
          type?: string
          updated_at?: string | null
          vitner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hendelser_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hendelser_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "alarmoverforing_med_info"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "hendelser_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hendelser_registrert_av_fkey"
            columns: ["registrert_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      intern_kommentar: {
        Row: {
          anlegg_id: string | null
          created_at: string
          id: string
          intern_kommentar: string | null
          kunde: string | null
          lest: boolean | null
          lest_dato: string | null
          mottaker_id: string | null
          oppdatert_dat: string | null
          oppdatert_dato: string | null
          opplastet_data: string | null
        }
        Insert: {
          anlegg_id?: string | null
          created_at?: string
          id?: string
          intern_kommentar?: string | null
          kunde?: string | null
          lest?: boolean | null
          lest_dato?: string | null
          mottaker_id?: string | null
          oppdatert_dat?: string | null
          oppdatert_dato?: string | null
          opplastet_data?: string | null
        }
        Update: {
          anlegg_id?: string | null
          created_at?: string
          id?: string
          intern_kommentar?: string | null
          kunde?: string | null
          lest?: boolean | null
          lest_dato?: string | null
          mottaker_id?: string | null
          oppdatert_dat?: string | null
          oppdatert_dato?: string | null
          opplastet_data?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intern_kommentar_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_kommentar_mottaker_id_fkey"
            columns: ["mottaker_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          source: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      kommentar_brannslanger: {
        Row: {
          anlegg_id: string | null
          created_at: string
          evakueringsplan_status: string | null
          id: string
          kommentar: string | null
          opprettet_av: string | null
          opprettet_dato: string | null
        }
        Insert: {
          anlegg_id?: string | null
          created_at?: string
          evakueringsplan_status?: string | null
          id?: string
          kommentar?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
        }
        Update: {
          anlegg_id?: string | null
          created_at?: string
          evakueringsplan_status?: string | null
          id?: string
          kommentar?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kommentar_brannslanger_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      kommentar_brannslukkere: {
        Row: {
          anlegg_id: string | null
          created_at: string
          evakueringsplan_kommentar: string | null
          evakueringsplan_status: string | null
          id: string
          kommentar: string | null
          opprettet_av: string | null
          opprettet_dato: string | null
        }
        Insert: {
          anlegg_id?: string | null
          created_at?: string
          evakueringsplan_kommentar?: string | null
          evakueringsplan_status?: string | null
          id?: string
          kommentar?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
        }
        Update: {
          anlegg_id?: string | null
          created_at?: string
          evakueringsplan_kommentar?: string | null
          evakueringsplan_status?: string | null
          id?: string
          kommentar?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kommentar_brannslukkere_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      kommentar_nodlys: {
        Row: {
          anlegg_id: string | null
          created_at: string
          evakueringsplan_status: string | null
          id: string
          kommentar: string | null
          opprettet_av: string | null
          opprettet_dato: string | null
        }
        Insert: {
          anlegg_id?: string | null
          created_at?: string
          evakueringsplan_status?: string | null
          id?: string
          kommentar?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
        }
        Update: {
          anlegg_id?: string | null
          created_at?: string
          evakueringsplan_status?: string | null
          id?: string
          kommentar?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kommentar_nodlys_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kommentar_nodlys_anlegg_id_fkey1"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      kommentar_roykluker: {
        Row: {
          anlegg_id: string | null
          created_at: string
          id: string
          kommentar: string | null
          opprettet_av: string | null
          opprettet_dato: string | null
        }
        Insert: {
          anlegg_id?: string | null
          created_at?: string
          id?: string
          kommentar?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
        }
        Update: {
          anlegg_id?: string | null
          created_at?: string
          id?: string
          kommentar?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kommentar_roykluker_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      kontaktperson_ekstern: {
        Row: {
          created_at: string | null
          ekstern_type: string | null
          epost: string | null
          firma: string | null
          id: string
          navn: string
          notater: string | null
          telefon: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          ekstern_type?: string | null
          epost?: string | null
          firma?: string | null
          id?: string
          navn: string
          notater?: string | null
          telefon?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          ekstern_type?: string | null
          epost?: string | null
          firma?: string | null
          id?: string
          navn?: string
          notater?: string | null
          telefon?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kontaktpersoner: {
        Row: {
          anlegg_id: string | null
          created_at: string
          epost: string | null
          id: string
          navn: string | null
          primar: boolean | null
          rolle: string | null
          sist_oppdatert: string | null
          telefon: string | null
        }
        Insert: {
          anlegg_id?: string | null
          created_at?: string
          epost?: string | null
          id?: string
          navn?: string | null
          primar?: boolean | null
          rolle?: string | null
          sist_oppdatert?: string | null
          telefon?: string | null
        }
        Update: {
          anlegg_id?: string | null
          created_at?: string
          epost?: string | null
          id?: string
          navn?: string | null
          primar?: boolean | null
          rolle?: string | null
          sist_oppdatert?: string | null
          telefon?: string | null
        }
        Relationships: []
      }
      kontroll_brannslukkere: {
        Row: {
          anlegg_id: string
          created_at: string | null
          id: string
          kommentar: string | null
          kontroll_dato: string
          kontrollaar: number | null
          kontrolldato: string | null
          kontrollor_id: string
          opprettet_av: string | null
          opprettet_tid: string | null
          status: string | null
        }
        Insert: {
          anlegg_id: string
          created_at?: string | null
          id?: string
          kommentar?: string | null
          kontroll_dato: string
          kontrollaar?: number | null
          kontrolldato?: string | null
          kontrollor_id: string
          opprettet_av?: string | null
          opprettet_tid?: string | null
          status?: string | null
        }
        Update: {
          anlegg_id?: string
          created_at?: string | null
          id?: string
          kommentar?: string | null
          kontroll_dato?: string
          kontrollaar?: number | null
          kontrolldato?: string | null
          kontrollor_id?: string
          opprettet_av?: string | null
          opprettet_tid?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kontroll_brannslukkere_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontroll_brannslukkere_kontrollor_id_fkey"
            columns: ["kontrollor_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontroll_brannslukkere_opprettet_av_fkey"
            columns: ["opprettet_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      kontroll_notater: {
        Row: {
          anlegg_id: string
          audio_url: string | null
          content: string
          created_at: string | null
          id: string
          is_voice: boolean | null
          kontroll_id: string
          updated_at: string | null
        }
        Insert: {
          anlegg_id: string
          audio_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_voice?: boolean | null
          kontroll_id: string
          updated_at?: string | null
        }
        Update: {
          anlegg_id?: string
          audio_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_voice?: boolean | null
          kontroll_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kontroll_notater_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontroll_notater_kontroll_id_fkey"
            columns: ["kontroll_id"]
            isOneToOne: false
            referencedRelation: "anleggsdata_kontroll"
            referencedColumns: ["id"]
          },
        ]
      }
      kontrollsjekkpunkter_brannalarm: {
        Row: {
          ag_verdi: string | null
          anlegg_id: string | null
          antall_avvik: number | null
          avvik_status: string | null
          avvik_type: string | null
          created_at: string | null
          feilkode: string | null
          id: string
          kategori: string
          kode: string | null
          kommentar: string | null
          kontroll_id: string | null
          kontrollaar: number
          poeng_trekk: number | null
          posisjon: string | null
          status: string | null
          tittel: string
          updated_at: string | null
        }
        Insert: {
          ag_verdi?: string | null
          anlegg_id?: string | null
          antall_avvik?: number | null
          avvik_status?: string | null
          avvik_type?: string | null
          created_at?: string | null
          feilkode?: string | null
          id?: string
          kategori: string
          kode?: string | null
          kommentar?: string | null
          kontroll_id?: string | null
          kontrollaar: number
          poeng_trekk?: number | null
          posisjon?: string | null
          status?: string | null
          tittel: string
          updated_at?: string | null
        }
        Update: {
          ag_verdi?: string | null
          anlegg_id?: string | null
          antall_avvik?: number | null
          avvik_status?: string | null
          avvik_type?: string | null
          created_at?: string | null
          feilkode?: string | null
          id?: string
          kategori?: string
          kode?: string | null
          kommentar?: string | null
          kontroll_id?: string | null
          kontrollaar?: number
          poeng_trekk?: number | null
          posisjon?: string | null
          status?: string | null
          tittel?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kontrollsjekkpunkter_brannalarm_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontrollsjekkpunkter_brannalarm_kontroll_id_fkey"
            columns: ["kontroll_id"]
            isOneToOne: false
            referencedRelation: "anleggsdata_kontroll"
            referencedColumns: ["id"]
          },
        ]
      }
      ks_hms_dokumenter: {
        Row: {
          anlegg_id: string | null
          created_at: string | null
          filnavn: string
          id: string
          kunde_id: string | null
          opprettet_av: string | null
          relatert_til_id: string | null
          relatert_til_type: string | null
          storage_path: string
          tittel: string
          type: string
        }
        Insert: {
          anlegg_id?: string | null
          created_at?: string | null
          filnavn: string
          id?: string
          kunde_id?: string | null
          opprettet_av?: string | null
          relatert_til_id?: string | null
          relatert_til_type?: string | null
          storage_path: string
          tittel: string
          type: string
        }
        Update: {
          anlegg_id?: string | null
          created_at?: string | null
          filnavn?: string
          id?: string
          kunde_id?: string | null
          opprettet_av?: string | null
          relatert_til_id?: string | null
          relatert_til_type?: string | null
          storage_path?: string
          tittel?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ks_hms_dokumenter_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ks_hms_dokumenter_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "alarmoverforing_med_info"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "ks_hms_dokumenter_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
      ks_tiltak: {
        Row: {
          ansvarlig: string | null
          beskrivelse: string
          created_at: string | null
          frist: string | null
          fullfort_dato: string | null
          id: string
          kommentarer: string | null
          kostnad: number | null
          opprettet_av: string | null
          prioritet: string | null
          relatert_til_id: string | null
          relatert_til_type: string | null
          status: string | null
          tittel: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          ansvarlig?: string | null
          beskrivelse: string
          created_at?: string | null
          frist?: string | null
          fullfort_dato?: string | null
          id?: string
          kommentarer?: string | null
          kostnad?: number | null
          opprettet_av?: string | null
          prioritet?: string | null
          relatert_til_id?: string | null
          relatert_til_type?: string | null
          status?: string | null
          tittel: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          ansvarlig?: string | null
          beskrivelse?: string
          created_at?: string | null
          frist?: string | null
          fullfort_dato?: string | null
          id?: string
          kommentarer?: string | null
          kostnad?: number | null
          opprettet_av?: string | null
          prioritet?: string | null
          relatert_til_id?: string | null
          relatert_til_type?: string | null
          status?: string | null
          tittel?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ks_tiltak_ansvarlig_fkey"
            columns: ["ansvarlig"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      kundekort: {
        Row: {
          addsecure_safenet: boolean | null
          ajax: boolean | null
          alarmoverforing_id: string | null
          anlegg_id: string | null
          annen_type: boolean | null
          annen_type_beskrivelse: string | null
          annet_checkbox: boolean | null
          antall_tags: string | null
          automatisk_av_paslag_lordag: boolean | null
          automatisk_av_paslag_man_fre: boolean | null
          automatisk_av_paslag_sondag: boolean | null
          av_velg_velg: string | null
          bakkegatens_nr: string | null
          brukerkode_1: string | null
          brukerkode_2: string | null
          brukerkode_3: string | null
          brukerkode_4: string | null
          created_at: string | null
          detektorer: Json | null
          epost: string | null
          fggrad_1: boolean | null
          fggrad_2: boolean | null
          fggrad_3: boolean | null
          gsm_nr_sim: string | null
          id: string
          installatorkode: string | null
          intervall_antall_timer: string | null
          ip_contact_id: boolean | null
          ip_sia_dc09: boolean | null
          kontaktpersoner: Json | null
          koordinater_e: string | null
          koordinater_n: string | null
          kunde_adresse: string
          kunde_navn: string
          masterkode: string | null
          mobil_1: string | null
          mobil_2: string | null
          naering: boolean | null
          nokkel_nr: string | null
          offentlig: boolean | null
          opprettet_av: string | null
          pa_fra_fredag: boolean | null
          pa_fra_lordag: boolean | null
          pa_velg_velg: string | null
          panel_dmac: string | null
          passord_kunde: string | null
          periodisk_testalarm: boolean | null
          plassering_sentral: string | null
          postnr: string | null
          poststed: string | null
          privat: boolean | null
          soneoversikt: string | null
          status: string | null
          type_modell: string | null
          updated_at: string | null
          veibeskrivelse: string | null
          vektorkode: string | null
        }
        Insert: {
          addsecure_safenet?: boolean | null
          ajax?: boolean | null
          alarmoverforing_id?: string | null
          anlegg_id?: string | null
          annen_type?: boolean | null
          annen_type_beskrivelse?: string | null
          annet_checkbox?: boolean | null
          antall_tags?: string | null
          automatisk_av_paslag_lordag?: boolean | null
          automatisk_av_paslag_man_fre?: boolean | null
          automatisk_av_paslag_sondag?: boolean | null
          av_velg_velg?: string | null
          bakkegatens_nr?: string | null
          brukerkode_1?: string | null
          brukerkode_2?: string | null
          brukerkode_3?: string | null
          brukerkode_4?: string | null
          created_at?: string | null
          detektorer?: Json | null
          epost?: string | null
          fggrad_1?: boolean | null
          fggrad_2?: boolean | null
          fggrad_3?: boolean | null
          gsm_nr_sim?: string | null
          id?: string
          installatorkode?: string | null
          intervall_antall_timer?: string | null
          ip_contact_id?: boolean | null
          ip_sia_dc09?: boolean | null
          kontaktpersoner?: Json | null
          koordinater_e?: string | null
          koordinater_n?: string | null
          kunde_adresse: string
          kunde_navn: string
          masterkode?: string | null
          mobil_1?: string | null
          mobil_2?: string | null
          naering?: boolean | null
          nokkel_nr?: string | null
          offentlig?: boolean | null
          opprettet_av?: string | null
          pa_fra_fredag?: boolean | null
          pa_fra_lordag?: boolean | null
          pa_velg_velg?: string | null
          panel_dmac?: string | null
          passord_kunde?: string | null
          periodisk_testalarm?: boolean | null
          plassering_sentral?: string | null
          postnr?: string | null
          poststed?: string | null
          privat?: boolean | null
          soneoversikt?: string | null
          status?: string | null
          type_modell?: string | null
          updated_at?: string | null
          veibeskrivelse?: string | null
          vektorkode?: string | null
        }
        Update: {
          addsecure_safenet?: boolean | null
          ajax?: boolean | null
          alarmoverforing_id?: string | null
          anlegg_id?: string | null
          annen_type?: boolean | null
          annen_type_beskrivelse?: string | null
          annet_checkbox?: boolean | null
          antall_tags?: string | null
          automatisk_av_paslag_lordag?: boolean | null
          automatisk_av_paslag_man_fre?: boolean | null
          automatisk_av_paslag_sondag?: boolean | null
          av_velg_velg?: string | null
          bakkegatens_nr?: string | null
          brukerkode_1?: string | null
          brukerkode_2?: string | null
          brukerkode_3?: string | null
          brukerkode_4?: string | null
          created_at?: string | null
          detektorer?: Json | null
          epost?: string | null
          fggrad_1?: boolean | null
          fggrad_2?: boolean | null
          fggrad_3?: boolean | null
          gsm_nr_sim?: string | null
          id?: string
          installatorkode?: string | null
          intervall_antall_timer?: string | null
          ip_contact_id?: boolean | null
          ip_sia_dc09?: boolean | null
          kontaktpersoner?: Json | null
          koordinater_e?: string | null
          koordinater_n?: string | null
          kunde_adresse?: string
          kunde_navn?: string
          masterkode?: string | null
          mobil_1?: string | null
          mobil_2?: string | null
          naering?: boolean | null
          nokkel_nr?: string | null
          offentlig?: boolean | null
          opprettet_av?: string | null
          pa_fra_fredag?: boolean | null
          pa_fra_lordag?: boolean | null
          pa_velg_velg?: string | null
          panel_dmac?: string | null
          passord_kunde?: string | null
          periodisk_testalarm?: boolean | null
          plassering_sentral?: string | null
          postnr?: string | null
          poststed?: string | null
          privat?: boolean | null
          soneoversikt?: string | null
          status?: string | null
          type_modell?: string | null
          updated_at?: string | null
          veibeskrivelse?: string | null
          vektorkode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kundekort_alarmoverforing_id_fkey"
            columns: ["alarmoverforing_id"]
            isOneToOne: false
            referencedRelation: "alarmoverforing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kundekort_alarmoverforing_id_fkey"
            columns: ["alarmoverforing_id"]
            isOneToOne: false
            referencedRelation: "alarmoverforing_med_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kundekort_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      leilighet_kontroller: {
        Row: {
          anlegg_id: string
          avvik_beskrivelse: string | null
          created_at: string | null
          id: string
          kommentar: string | null
          kontroll_aar: number
          kontroll_dato: string
          leilighet_id: string
          status: string
          utfort_av: string | null
        }
        Insert: {
          anlegg_id: string
          avvik_beskrivelse?: string | null
          created_at?: string | null
          id?: string
          kommentar?: string | null
          kontroll_aar: number
          kontroll_dato: string
          leilighet_id: string
          status: string
          utfort_av?: string | null
        }
        Update: {
          anlegg_id?: string
          avvik_beskrivelse?: string | null
          created_at?: string | null
          id?: string
          kommentar?: string | null
          kontroll_aar?: number
          kontroll_dato?: string
          leilighet_id?: string
          status?: string
          utfort_av?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leilighet_kontroller_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leilighet_kontroller_leilighet_id_fkey"
            columns: ["leilighet_id"]
            isOneToOne: false
            referencedRelation: "anlegg_leiligheter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leilighet_kontroller_utfort_av_fkey"
            columns: ["utfort_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      logg_avvikbrannalarm: {
        Row: {
          ag_verdi: string[] | null
          anlegg_id: string | null
          avvik_type: string | null
          created_at: string
          dato_avsluttet: string | null
          dato_opprettet: string | null
          dato_redigert: string | null
          er_master: boolean | null
          feilkode: string | null
          id: string
          kode: string | null
          kommentar: string | null
          kommentar_endring: string | null
          kontroll_id: string | null
          status: string | null
          tekniker_avsluttet: string | null
          tekniker_oppretter: string | null
          tekniker_redigert: string | null
          tittel: string | null
        }
        Insert: {
          ag_verdi?: string[] | null
          anlegg_id?: string | null
          avvik_type?: string | null
          created_at?: string
          dato_avsluttet?: string | null
          dato_opprettet?: string | null
          dato_redigert?: string | null
          er_master?: boolean | null
          feilkode?: string | null
          id?: string
          kode?: string | null
          kommentar?: string | null
          kommentar_endring?: string | null
          kontroll_id?: string | null
          status?: string | null
          tekniker_avsluttet?: string | null
          tekniker_oppretter?: string | null
          tekniker_redigert?: string | null
          tittel?: string | null
        }
        Update: {
          ag_verdi?: string[] | null
          anlegg_id?: string | null
          avvik_type?: string | null
          created_at?: string
          dato_avsluttet?: string | null
          dato_opprettet?: string | null
          dato_redigert?: string | null
          er_master?: boolean | null
          feilkode?: string | null
          id?: string
          kode?: string | null
          kommentar?: string | null
          kommentar_endring?: string | null
          kontroll_id?: string | null
          status?: string | null
          tekniker_avsluttet?: string | null
          tekniker_oppretter?: string | null
          tekniker_redigert?: string | null
          tittel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logg_avvikbrannalarm_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logg_avvikbrannalarm_kontroll_id_fkey"
            columns: ["kontroll_id"]
            isOneToOne: false
            referencedRelation: "kontrollsjekkpunkter_brannalarm"
            referencedColumns: ["id"]
          },
        ]
      }
      modul_tilganger: {
        Row: {
          ansatt_id: string
          id: string
          kan_redigere: boolean | null
          kan_se: boolean | null
          modul_id: string
          opprettet_av: string | null
          opprettet_dato: string | null
          sist_oppdatert: string | null
        }
        Insert: {
          ansatt_id: string
          id?: string
          kan_redigere?: boolean | null
          kan_se?: boolean | null
          modul_id: string
          opprettet_av?: string | null
          opprettet_dato?: string | null
          sist_oppdatert?: string | null
        }
        Update: {
          ansatt_id?: string
          id?: string
          kan_redigere?: boolean | null
          kan_se?: boolean | null
          modul_id?: string
          opprettet_av?: string | null
          opprettet_dato?: string | null
          sist_oppdatert?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modul_tilganger_ansatt_id_fkey"
            columns: ["ansatt_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modul_tilganger_modul_id_fkey"
            columns: ["modul_id"]
            isOneToOne: false
            referencedRelation: "moduler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modul_tilganger_opprettet_av_fkey"
            columns: ["opprettet_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      moduler: {
        Row: {
          aktiv: boolean | null
          beskrivelse: string | null
          id: string
          ikon: string | null
          kategori: string | null
          modul_key: string
          navn: string
          opprettet_dato: string | null
          sortering: number | null
        }
        Insert: {
          aktiv?: boolean | null
          beskrivelse?: string | null
          id?: string
          ikon?: string | null
          kategori?: string | null
          modul_key: string
          navn: string
          opprettet_dato?: string | null
          sortering?: number | null
        }
        Update: {
          aktiv?: boolean | null
          beskrivelse?: string | null
          id?: string
          ikon?: string | null
          kategori?: string | null
          modul_key?: string
          navn?: string
          opprettet_dato?: string | null
          sortering?: number | null
        }
        Relationships: []
      }
      mote_agendapunkter: {
        Row: {
          ansvarlig_id: string | null
          beskrivelse: string | null
          estimert_tid_minutter: number | null
          id: string
          mote_id: string
          opprettet_av: string | null
          opprettet_dato: string | null
          rekkefolgje: number
          sist_oppdatert: string | null
          status: string | null
          tittel: string
        }
        Insert: {
          ansvarlig_id?: string | null
          beskrivelse?: string | null
          estimert_tid_minutter?: number | null
          id?: string
          mote_id: string
          opprettet_av?: string | null
          opprettet_dato?: string | null
          rekkefolgje: number
          sist_oppdatert?: string | null
          status?: string | null
          tittel: string
        }
        Update: {
          ansvarlig_id?: string | null
          beskrivelse?: string | null
          estimert_tid_minutter?: number | null
          id?: string
          mote_id?: string
          opprettet_av?: string | null
          opprettet_dato?: string | null
          rekkefolgje?: number
          sist_oppdatert?: string | null
          status?: string | null
          tittel?: string
        }
        Relationships: [
          {
            foreignKeyName: "mote_agendapunkter_ansvarlig_id_fkey"
            columns: ["ansvarlig_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mote_agendapunkter_mote_id_fkey"
            columns: ["mote_id"]
            isOneToOne: false
            referencedRelation: "moter"
            referencedColumns: ["id"]
          },
        ]
      }
      mote_deltakere: {
        Row: {
          ansatt_id: string
          id: string
          mote_id: string
          opprettet_dato: string | null
          rolle: string | null
          status: string | null
        }
        Insert: {
          ansatt_id: string
          id?: string
          mote_id: string
          opprettet_dato?: string | null
          rolle?: string | null
          status?: string | null
        }
        Update: {
          ansatt_id?: string
          id?: string
          mote_id?: string
          opprettet_dato?: string | null
          rolle?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mote_deltakere_ansatt_id_fkey"
            columns: ["ansatt_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mote_deltakere_mote_id_fkey"
            columns: ["mote_id"]
            isOneToOne: false
            referencedRelation: "moter"
            referencedColumns: ["id"]
          },
        ]
      }
      mote_oppgaver: {
        Row: {
          agendapunkt_id: string | null
          ansvarlig_id: string | null
          beskrivelse: string | null
          forfallsdato: string | null
          id: string
          mote_id: string
          opprettet_av: string | null
          opprettet_dato: string | null
          prioritet: string | null
          sist_oppdatert: string | null
          status: string | null
          tittel: string
        }
        Insert: {
          agendapunkt_id?: string | null
          ansvarlig_id?: string | null
          beskrivelse?: string | null
          forfallsdato?: string | null
          id?: string
          mote_id: string
          opprettet_av?: string | null
          opprettet_dato?: string | null
          prioritet?: string | null
          sist_oppdatert?: string | null
          status?: string | null
          tittel: string
        }
        Update: {
          agendapunkt_id?: string | null
          ansvarlig_id?: string | null
          beskrivelse?: string | null
          forfallsdato?: string | null
          id?: string
          mote_id?: string
          opprettet_av?: string | null
          opprettet_dato?: string | null
          prioritet?: string | null
          sist_oppdatert?: string | null
          status?: string | null
          tittel?: string
        }
        Relationships: [
          {
            foreignKeyName: "mote_oppgaver_agendapunkt_id_fkey"
            columns: ["agendapunkt_id"]
            isOneToOne: false
            referencedRelation: "mote_agendapunkter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mote_oppgaver_ansvarlig_id_fkey"
            columns: ["ansvarlig_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mote_oppgaver_mote_id_fkey"
            columns: ["mote_id"]
            isOneToOne: false
            referencedRelation: "moter"
            referencedColumns: ["id"]
          },
        ]
      }
      mote_referater: {
        Row: {
          agendapunkt_id: string | null
          id: string
          innhold: string
          mote_id: string
          opprettet_dato: string | null
          sist_oppdatert: string | null
          skrevet_av: string | null
          type: string | null
        }
        Insert: {
          agendapunkt_id?: string | null
          id?: string
          innhold: string
          mote_id: string
          opprettet_dato?: string | null
          sist_oppdatert?: string | null
          skrevet_av?: string | null
          type?: string | null
        }
        Update: {
          agendapunkt_id?: string | null
          id?: string
          innhold?: string
          mote_id?: string
          opprettet_dato?: string | null
          sist_oppdatert?: string | null
          skrevet_av?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mote_referater_agendapunkt_id_fkey"
            columns: ["agendapunkt_id"]
            isOneToOne: false
            referencedRelation: "mote_agendapunkter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mote_referater_mote_id_fkey"
            columns: ["mote_id"]
            isOneToOne: false
            referencedRelation: "moter"
            referencedColumns: ["id"]
          },
        ]
      }
      moter: {
        Row: {
          beskrivelse: string | null
          id: string
          lokasjon: string | null
          mote_dato: string
          opprettet_av: string | null
          opprettet_dato: string | null
          sist_oppdatert: string | null
          status: string | null
          tittel: string
          varighet_minutter: number | null
        }
        Insert: {
          beskrivelse?: string | null
          id?: string
          lokasjon?: string | null
          mote_dato: string
          opprettet_av?: string | null
          opprettet_dato?: string | null
          sist_oppdatert?: string | null
          status?: string | null
          tittel: string
          varighet_minutter?: number | null
        }
        Update: {
          beskrivelse?: string | null
          id?: string
          lokasjon?: string | null
          mote_dato?: string
          opprettet_av?: string | null
          opprettet_dato?: string | null
          sist_oppdatert?: string | null
          status?: string | null
          tittel?: string
          varighet_minutter?: number | null
        }
        Relationships: []
      }
      motereferat: {
        Row: {
          bullet_points: string[] | null
          deltakere: string[] | null
          forslag_til_neste_mote: string[] | null
          id: string
          mote_dato: string
          oppdatert_dato: string | null
          opprettet_av: string | null
          opprettet_dato: string | null
          referat: string
          referent_id: string | null
          tema: string
        }
        Insert: {
          bullet_points?: string[] | null
          deltakere?: string[] | null
          forslag_til_neste_mote?: string[] | null
          id?: string
          mote_dato: string
          oppdatert_dato?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          referat: string
          referent_id?: string | null
          tema: string
        }
        Update: {
          bullet_points?: string[] | null
          deltakere?: string[] | null
          forslag_til_neste_mote?: string[] | null
          id?: string
          mote_dato?: string
          oppdatert_dato?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          referat?: string
          referent_id?: string | null
          tema?: string
        }
        Relationships: [
          {
            foreignKeyName: "motereferat_referent_id_fkey"
            columns: ["referent_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      nettverk_brannalarm: {
        Row: {
          ah: string | null
          anlegg_id: string | null
          batteri_ikke_aktuelt: boolean | null
          batterialder: number | null
          id: string
          kunde: string | null
          nettverk_id: number | null
          opprettet_dato: string
          plassering: string | null
          sist_oppdatert: string | null
          spenning: string | null
          sw_id: string | null
          type: string | null
        }
        Insert: {
          ah?: string | null
          anlegg_id?: string | null
          batteri_ikke_aktuelt?: boolean | null
          batterialder?: number | null
          id?: string
          kunde?: string | null
          nettverk_id?: number | null
          opprettet_dato?: string
          plassering?: string | null
          sist_oppdatert?: string | null
          spenning?: string | null
          sw_id?: string | null
          type?: string | null
        }
        Update: {
          ah?: string | null
          anlegg_id?: string | null
          batteri_ikke_aktuelt?: boolean | null
          batterialder?: number | null
          id?: string
          kunde?: string | null
          nettverk_id?: number | null
          opprettet_dato?: string
          plassering?: string | null
          sist_oppdatert?: string | null
          spenning?: string | null
          sw_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nettverk_brannalarm_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      nettverk_nodlys: {
        Row: {
          ah: string | null
          anlegg_id: string | null
          batterialder: number | null
          id: string
          kunde: string | null
          nettverk_id: string | null
          opprettet_dato: string
          plassering: string | null
          sist_oppdatert: string | null
          spenning: string | null
          type: string | null
        }
        Insert: {
          ah?: string | null
          anlegg_id?: string | null
          batterialder?: number | null
          id?: string
          kunde?: string | null
          nettverk_id?: string | null
          opprettet_dato?: string
          plassering?: string | null
          sist_oppdatert?: string | null
          spenning?: string | null
          type?: string | null
        }
        Update: {
          ah?: string | null
          anlegg_id?: string | null
          batterialder?: number | null
          id?: string
          kunde?: string | null
          nettverk_id?: string | null
          opprettet_dato?: string
          plassering?: string | null
          sist_oppdatert?: string | null
          spenning?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nettverk_nodlys_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      ns3960_kontrollpunkter: {
        Row: {
          anlegg_id: string | null
          avvik: boolean | null
          avvik_liste: string | null
          id: string
          kommentar: string | null
          kontroll_id: string | null
          kontrollpunkt_navn: string
          opprettet: string | null
          status: string | null
        }
        Insert: {
          anlegg_id?: string | null
          avvik?: boolean | null
          avvik_liste?: string | null
          id?: string
          kommentar?: string | null
          kontroll_id?: string | null
          kontrollpunkt_navn: string
          opprettet?: string | null
          status?: string | null
        }
        Update: {
          anlegg_id?: string | null
          avvik?: boolean | null
          avvik_liste?: string | null
          id?: string
          kommentar?: string | null
          kontroll_id?: string | null
          kontrollpunkt_navn?: string
          opprettet?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ns3960_kontrollpunkter_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ns3960_kontrollpunkter_kontroll_id_fkey"
            columns: ["kontroll_id"]
            isOneToOne: false
            referencedRelation: "anleggsdata_kontroll"
            referencedColumns: ["id"]
          },
        ]
      }
      oppgaver: {
        Row: {
          anlegg_id: string | null
          bekreftet: boolean | null
          beskrivelse: string | null
          forfallsdato: string | null
          id: string
          intern: string | null
          kontaktperson: string | null
          kunde_id: string | null
          mote_id: string | null
          oppgave_nummer: string
          opprettet_dato: string
          ordre_id: string | null
          pdf_url: string | null
          prioritet: string | null
          prosjekt_id: string | null
          sett_av_tekniker: boolean | null
          sett_dato: string | null
          sist_oppdatert: string | null
          status: string | null
          tekniker_id: string | null
          tittel: string | null
          type: string | null
        }
        Insert: {
          anlegg_id?: string | null
          bekreftet?: boolean | null
          beskrivelse?: string | null
          forfallsdato?: string | null
          id?: string
          intern?: string | null
          kontaktperson?: string | null
          kunde_id?: string | null
          mote_id?: string | null
          oppgave_nummer: string
          opprettet_dato?: string
          ordre_id?: string | null
          pdf_url?: string | null
          prioritet?: string | null
          prosjekt_id?: string | null
          sett_av_tekniker?: boolean | null
          sett_dato?: string | null
          sist_oppdatert?: string | null
          status?: string | null
          tekniker_id?: string | null
          tittel?: string | null
          type?: string | null
        }
        Update: {
          anlegg_id?: string | null
          bekreftet?: boolean | null
          beskrivelse?: string | null
          forfallsdato?: string | null
          id?: string
          intern?: string | null
          kontaktperson?: string | null
          kunde_id?: string | null
          mote_id?: string | null
          oppgave_nummer?: string
          opprettet_dato?: string
          ordre_id?: string | null
          pdf_url?: string | null
          prioritet?: string | null
          prosjekt_id?: string | null
          sett_av_tekniker?: boolean | null
          sett_dato?: string | null
          sist_oppdatert?: string | null
          status?: string | null
          tekniker_id?: string | null
          tittel?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oppgaver_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oppgaver_kontaktperson_fkey"
            columns: ["kontaktperson"]
            isOneToOne: false
            referencedRelation: "kontaktpersoner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oppgaver_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "alarmoverforing_med_info"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "oppgaver_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oppgaver_mote_id_fkey"
            columns: ["mote_id"]
            isOneToOne: false
            referencedRelation: "moter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oppgaver_ordre_id_fkey"
            columns: ["ordre_id"]
            isOneToOne: false
            referencedRelation: "ordre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oppgaver_tekniker_id_fkey"
            columns: ["tekniker_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      opplaering: {
        Row: {
          beskrivelse: string
          created_at: string | null
          dato: string | null
          deltakere: Json | null
          id: string
          instruktor: string | null
          instruktør: string | null
          opprettet_av: string | null
          registrert_av: string | null
          sertifikat_utloper: string | null
          sertifikat_utløper: string | null
          sluttdato: string | null
          status: string | null
          tittel: string
          type: string
          updated_at: string | null
          varighet: string
        }
        Insert: {
          beskrivelse: string
          created_at?: string | null
          dato?: string | null
          deltakere?: Json | null
          id?: string
          instruktor?: string | null
          instruktør?: string | null
          opprettet_av?: string | null
          registrert_av?: string | null
          sertifikat_utloper?: string | null
          sertifikat_utløper?: string | null
          sluttdato?: string | null
          status?: string | null
          tittel: string
          type: string
          updated_at?: string | null
          varighet: string
        }
        Update: {
          beskrivelse?: string
          created_at?: string | null
          dato?: string | null
          deltakere?: Json | null
          id?: string
          instruktor?: string | null
          instruktør?: string | null
          opprettet_av?: string | null
          registrert_av?: string | null
          sertifikat_utloper?: string | null
          sertifikat_utløper?: string | null
          sluttdato?: string | null
          status?: string | null
          tittel?: string
          type?: string
          updated_at?: string | null
          varighet?: string
        }
        Relationships: [
          {
            foreignKeyName: "opplaering_registrert_av_fkey"
            columns: ["registrert_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      ordre: {
        Row: {
          anlegg_id: string | null
          bekreftet: boolean | null
          bilde_url: string[] | null
          chat_merknad: boolean | null
          created_at: string
          dokumentasjon_url: string[] | null
          id: string
          kilometer: number | null
          kommentar: string | null
          kontrolltype: string[] | null
          kundenr: string | null
          opprettet_av: string | null
          opprettet_dato: string | null
          ordre_nummer: string
          outlook_event_id: string | null
          planlagt_start: string | null
          sett_av_tekniker: boolean | null
          sett_dato: string | null
          sist_oppdatert: string | null
          status: string | null
          tekniker_id: string | null
          timer_brukt: number | null
          type: string | null
        }
        Insert: {
          anlegg_id?: string | null
          bekreftet?: boolean | null
          bilde_url?: string[] | null
          chat_merknad?: boolean | null
          created_at?: string
          dokumentasjon_url?: string[] | null
          id?: string
          kilometer?: number | null
          kommentar?: string | null
          kontrolltype?: string[] | null
          kundenr?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          ordre_nummer: string
          outlook_event_id?: string | null
          planlagt_start?: string | null
          sett_av_tekniker?: boolean | null
          sett_dato?: string | null
          sist_oppdatert?: string | null
          status?: string | null
          tekniker_id?: string | null
          timer_brukt?: number | null
          type?: string | null
        }
        Update: {
          anlegg_id?: string | null
          bekreftet?: boolean | null
          bilde_url?: string[] | null
          chat_merknad?: boolean | null
          created_at?: string
          dokumentasjon_url?: string[] | null
          id?: string
          kilometer?: number | null
          kommentar?: string | null
          kontrolltype?: string[] | null
          kundenr?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          ordre_nummer?: string
          outlook_event_id?: string | null
          planlagt_start?: string | null
          sett_av_tekniker?: boolean | null
          sett_dato?: string | null
          sist_oppdatert?: string | null
          status?: string | null
          tekniker_id?: string | null
          timer_brukt?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordre_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordre_kundenr_fkey"
            columns: ["kundenr"]
            isOneToOne: false
            referencedRelation: "alarmoverforing_med_info"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "ordre_kundenr_fkey"
            columns: ["kundenr"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordre_tekniker_id_fkey"
            columns: ["tekniker_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      priser_kundenummer: {
        Row: {
          anlegg_id: string | null
          created_at: string
          id: string
          kunde: string | null
          kundenummer: number | null
          prisbrannalarm: number | null
          prisekstern: number | null
          prisnodlys: number | null
          prisroykluker: number | null
          prisslukkeutstyr: number | null
        }
        Insert: {
          anlegg_id?: string | null
          created_at?: string
          id?: string
          kunde?: string | null
          kundenummer?: number | null
          prisbrannalarm?: number | null
          prisekstern?: number | null
          prisnodlys?: number | null
          prisroykluker?: number | null
          prisslukkeutstyr?: number | null
        }
        Update: {
          anlegg_id?: string | null
          created_at?: string
          id?: string
          kunde?: string | null
          kundenummer?: number | null
          prisbrannalarm?: number | null
          prisekstern?: number | null
          prisnodlys?: number | null
          prisroykluker?: number | null
          prisslukkeutstyr?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "priser_kundenummer_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: true
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      prishistorikk: {
        Row: {
          anlegg_id: string
          created_at: string | null
          endret_av: string | null
          endret_dato: string | null
          endrings_type: string | null
          felt_navn: string
          gammel_verdi: number | null
          id: string
          kommentar: string | null
          ny_verdi: number | null
        }
        Insert: {
          anlegg_id: string
          created_at?: string | null
          endret_av?: string | null
          endret_dato?: string | null
          endrings_type?: string | null
          felt_navn: string
          gammel_verdi?: number | null
          id?: string
          kommentar?: string | null
          ny_verdi?: number | null
        }
        Update: {
          anlegg_id?: string
          created_at?: string | null
          endret_av?: string | null
          endret_dato?: string | null
          endrings_type?: string | null
          felt_navn?: string
          gammel_verdi?: number | null
          id?: string
          kommentar?: string | null
          ny_verdi?: number | null
        }
        Relationships: []
      }
      prosjekt_anlegg: {
        Row: {
          anlegg_id: string | null
          id: string
          opprettet_dato: string | null
          prosjekt_id: string | null
        }
        Insert: {
          anlegg_id?: string | null
          id?: string
          opprettet_dato?: string | null
          prosjekt_id?: string | null
        }
        Update: {
          anlegg_id?: string | null
          id?: string
          opprettet_dato?: string | null
          prosjekt_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prosjekt_anlegg_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      prosjekt_dokumenter: {
        Row: {
          created_at: string | null
          dokument_type: string
          fil_url: string | null
          id: string
          notater: string | null
          prosjekt_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dokument_type: string
          fil_url?: string | null
          id?: string
          notater?: string | null
          prosjekt_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dokument_type?: string
          fil_url?: string | null
          id?: string
          notater?: string | null
          prosjekt_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prosjekt_dokumenter_prosjekt_id_fkey"
            columns: ["prosjekt_id"]
            isOneToOne: false
            referencedRelation: "prosjekter"
            referencedColumns: ["id"]
          },
        ]
      }
      prosjekt_logg: {
        Row: {
          beskrivelse: string | null
          bruker_id: string | null
          created_at: string | null
          handling: string
          id: string
          prosjekt_id: string
        }
        Insert: {
          beskrivelse?: string | null
          bruker_id?: string | null
          created_at?: string | null
          handling: string
          id?: string
          prosjekt_id: string
        }
        Update: {
          beskrivelse?: string | null
          bruker_id?: string | null
          created_at?: string | null
          handling?: string
          id?: string
          prosjekt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prosjekt_logg_prosjekt_id_fkey"
            columns: ["prosjekt_id"]
            isOneToOne: false
            referencedRelation: "prosjekter"
            referencedColumns: ["id"]
          },
        ]
      }
      prosjekt_medlemmer: {
        Row: {
          ansatt_id: string
          created_at: string | null
          id: string
          prosjekt_id: string
          rolle: string | null
        }
        Insert: {
          ansatt_id: string
          created_at?: string | null
          id?: string
          prosjekt_id: string
          rolle?: string | null
        }
        Update: {
          ansatt_id?: string
          created_at?: string | null
          id?: string
          prosjekt_id?: string
          rolle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prosjekt_medlemmer_ansatt_id_fkey"
            columns: ["ansatt_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prosjekt_medlemmer_prosjekt_id_fkey"
            columns: ["prosjekt_id"]
            isOneToOne: false
            referencedRelation: "prosjekter"
            referencedColumns: ["id"]
          },
        ]
      }
      prosjekt_meldinger: {
        Row: {
          forfatter: string
          id: string
          melding: string
          opprettet_dato: string | null
          prosjekt_id: string | null
        }
        Insert: {
          forfatter: string
          id?: string
          melding: string
          opprettet_dato?: string | null
          prosjekt_id?: string | null
        }
        Update: {
          forfatter?: string
          id?: string
          melding?: string
          opprettet_dato?: string | null
          prosjekt_id?: string | null
        }
        Relationships: []
      }
      prosjekt_milepel_dokumenter: {
        Row: {
          created_at: string | null
          fil_storrelse: number | null
          fil_type: string | null
          fil_url: string
          filnavn: string
          id: string
          milepel_id: string
        }
        Insert: {
          created_at?: string | null
          fil_storrelse?: number | null
          fil_type?: string | null
          fil_url: string
          filnavn: string
          id?: string
          milepel_id: string
        }
        Update: {
          created_at?: string | null
          fil_storrelse?: number | null
          fil_type?: string | null
          fil_url?: string
          filnavn?: string
          id?: string
          milepel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prosjekt_milepel_dokumenter_milepel_id_fkey"
            columns: ["milepel_id"]
            isOneToOne: false
            referencedRelation: "prosjekt_milepeler"
            referencedColumns: ["id"]
          },
        ]
      }
      prosjekt_milepel_oppgaver: {
        Row: {
          created_at: string | null
          fullfort: boolean | null
          fullfort_av: string | null
          fullfort_dato: string | null
          id: string
          milepel_id: string
          rekkefølge: number | null
          tittel: string
        }
        Insert: {
          created_at?: string | null
          fullfort?: boolean | null
          fullfort_av?: string | null
          fullfort_dato?: string | null
          id?: string
          milepel_id: string
          rekkefølge?: number | null
          tittel: string
        }
        Update: {
          created_at?: string | null
          fullfort?: boolean | null
          fullfort_av?: string | null
          fullfort_dato?: string | null
          id?: string
          milepel_id?: string
          rekkefølge?: number | null
          tittel?: string
        }
        Relationships: [
          {
            foreignKeyName: "prosjekt_milepel_oppgaver_fullfort_av_fkey"
            columns: ["fullfort_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prosjekt_milepel_oppgaver_milepel_id_fkey"
            columns: ["milepel_id"]
            isOneToOne: false
            referencedRelation: "prosjekt_milepeler"
            referencedColumns: ["id"]
          },
        ]
      }
      prosjekt_milepeler: {
        Row: {
          ansvarlig_id: string | null
          beskrivelse: string | null
          created_at: string | null
          ekstern_epost: string | null
          ekstern_firma: string | null
          ekstern_kontakt: string | null
          ekstern_telefon: string | null
          er_ekstern: boolean | null
          estimert_ferdig: string | null
          id: string
          planlagt_dato: string | null
          prosjekt_id: string
          rekkefølge: number | null
          status: string
          tittel: string
          updated_at: string | null
          utfort_dato: string | null
        }
        Insert: {
          ansvarlig_id?: string | null
          beskrivelse?: string | null
          created_at?: string | null
          ekstern_epost?: string | null
          ekstern_firma?: string | null
          ekstern_kontakt?: string | null
          ekstern_telefon?: string | null
          er_ekstern?: boolean | null
          estimert_ferdig?: string | null
          id?: string
          planlagt_dato?: string | null
          prosjekt_id: string
          rekkefølge?: number | null
          status?: string
          tittel: string
          updated_at?: string | null
          utfort_dato?: string | null
        }
        Update: {
          ansvarlig_id?: string | null
          beskrivelse?: string | null
          created_at?: string | null
          ekstern_epost?: string | null
          ekstern_firma?: string | null
          ekstern_kontakt?: string | null
          ekstern_telefon?: string | null
          er_ekstern?: boolean | null
          estimert_ferdig?: string | null
          id?: string
          planlagt_dato?: string | null
          prosjekt_id?: string
          rekkefølge?: number | null
          status?: string
          tittel?: string
          updated_at?: string | null
          utfort_dato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prosjekt_milepeler_ansvarlig_id_fkey"
            columns: ["ansvarlig_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prosjekt_milepeler_prosjekt_id_fkey"
            columns: ["prosjekt_id"]
            isOneToOne: false
            referencedRelation: "prosjekter"
            referencedColumns: ["id"]
          },
        ]
      }
      prosjekter: {
        Row: {
          anlegg_id: string | null
          beskrivelse: string | null
          created_at: string | null
          dokumentasjonskrav: Json | null
          faktisk_sluttdato: string | null
          forventet_sluttdato: string | null
          id: string
          kunde_id: string | null
          navn: string
          notater: string | null
          opprettet_av: string | null
          prioritet: string | null
          prosjekt_type: string
          prosjektleder_id: string | null
          prosjektnummer: string | null
          startdato: string | null
          status: string
          tegninger_kilde: string | null
          tegninger_status: string | null
          tegninger_typer: string[] | null
          tjeneste: string
          updated_at: string | null
        }
        Insert: {
          anlegg_id?: string | null
          beskrivelse?: string | null
          created_at?: string | null
          dokumentasjonskrav?: Json | null
          faktisk_sluttdato?: string | null
          forventet_sluttdato?: string | null
          id?: string
          kunde_id?: string | null
          navn: string
          notater?: string | null
          opprettet_av?: string | null
          prioritet?: string | null
          prosjekt_type: string
          prosjektleder_id?: string | null
          prosjektnummer?: string | null
          startdato?: string | null
          status?: string
          tegninger_kilde?: string | null
          tegninger_status?: string | null
          tegninger_typer?: string[] | null
          tjeneste: string
          updated_at?: string | null
        }
        Update: {
          anlegg_id?: string | null
          beskrivelse?: string | null
          created_at?: string | null
          dokumentasjonskrav?: Json | null
          faktisk_sluttdato?: string | null
          forventet_sluttdato?: string | null
          id?: string
          kunde_id?: string | null
          navn?: string
          notater?: string | null
          opprettet_av?: string | null
          prioritet?: string | null
          prosjekt_type?: string
          prosjektleder_id?: string | null
          prosjektnummer?: string | null
          startdato?: string | null
          status?: string
          tegninger_kilde?: string | null
          tegninger_status?: string | null
          tegninger_typer?: string[] | null
          tjeneste?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prosjekter_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prosjekter_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "alarmoverforing_med_info"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "prosjekter_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prosjekter_prosjektleder_id_fkey"
            columns: ["prosjektleder_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      prosjektering_dokumenter: {
        Row: {
          beskrivelse: string | null
          dokument_type: string
          fil_storrelse: number | null
          fil_url: string | null
          filnavn: string | null
          id: string
          opprettet_av: string | null
          opprettet_dato: string | null
          prosjektering_id: string
          sist_oppdatert: string | null
          status: string | null
          tittel: string
          versjon: string | null
        }
        Insert: {
          beskrivelse?: string | null
          dokument_type: string
          fil_storrelse?: number | null
          fil_url?: string | null
          filnavn?: string | null
          id?: string
          opprettet_av?: string | null
          opprettet_dato?: string | null
          prosjektering_id: string
          sist_oppdatert?: string | null
          status?: string | null
          tittel: string
          versjon?: string | null
        }
        Update: {
          beskrivelse?: string | null
          dokument_type?: string
          fil_storrelse?: number | null
          fil_url?: string | null
          filnavn?: string | null
          id?: string
          opprettet_av?: string | null
          opprettet_dato?: string | null
          prosjektering_id?: string
          sist_oppdatert?: string | null
          status?: string | null
          tittel?: string
          versjon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prosjektering_dokumenter_prosjektering_id_fkey"
            columns: ["prosjektering_id"]
            isOneToOne: false
            referencedRelation: "prosjekteringer"
            referencedColumns: ["id"]
          },
        ]
      }
      prosjektering_integrasjoner: {
        Row: {
          beskrivelse: string | null
          id: string
          integrasjonstype: string | null
          krav: string | null
          opprettet_dato: string | null
          produsent: string | null
          prosjektering_id: string
          protokoll: string | null
          sist_oppdatert: string | null
          system_navn: string | null
          system_type: string
        }
        Insert: {
          beskrivelse?: string | null
          id?: string
          integrasjonstype?: string | null
          krav?: string | null
          opprettet_dato?: string | null
          produsent?: string | null
          prosjektering_id: string
          protokoll?: string | null
          sist_oppdatert?: string | null
          system_navn?: string | null
          system_type: string
        }
        Update: {
          beskrivelse?: string | null
          id?: string
          integrasjonstype?: string | null
          krav?: string | null
          opprettet_dato?: string | null
          produsent?: string | null
          prosjektering_id?: string
          protokoll?: string | null
          sist_oppdatert?: string | null
          system_navn?: string | null
          system_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "prosjektering_integrasjoner_prosjektering_id_fkey"
            columns: ["prosjektering_id"]
            isOneToOne: false
            referencedRelation: "prosjekteringer"
            referencedColumns: ["id"]
          },
        ]
      }
      prosjektering_risikoanalyse: {
        Row: {
          anbefalt_system: string | null
          antall_etasjer: number | null
          begrunnelse: string | null
          brannbelastning: string | null
          bruksklasse: string | null
          bruttoareal: number | null
          bygningstype: string | null
          deteksjonsbehov: string | null
          evakueringsbehov: string | null
          id: string
          kategori: string | null
          opprettet_dato: string | null
          personbelastning: string | null
          prosjektering_id: string
          risikoklasse: string | null
          sist_oppdatert: string | null
          slukkebehov: string | null
          spesielle_risikoer: string | null
          varslingsbehov: string | null
        }
        Insert: {
          anbefalt_system?: string | null
          antall_etasjer?: number | null
          begrunnelse?: string | null
          brannbelastning?: string | null
          bruksklasse?: string | null
          bruttoareal?: number | null
          bygningstype?: string | null
          deteksjonsbehov?: string | null
          evakueringsbehov?: string | null
          id?: string
          kategori?: string | null
          opprettet_dato?: string | null
          personbelastning?: string | null
          prosjektering_id: string
          risikoklasse?: string | null
          sist_oppdatert?: string | null
          slukkebehov?: string | null
          spesielle_risikoer?: string | null
          varslingsbehov?: string | null
        }
        Update: {
          anbefalt_system?: string | null
          antall_etasjer?: number | null
          begrunnelse?: string | null
          brannbelastning?: string | null
          bruksklasse?: string | null
          bruttoareal?: number | null
          bygningstype?: string | null
          deteksjonsbehov?: string | null
          evakueringsbehov?: string | null
          id?: string
          kategori?: string | null
          opprettet_dato?: string | null
          personbelastning?: string | null
          prosjektering_id?: string
          risikoklasse?: string | null
          sist_oppdatert?: string | null
          slukkebehov?: string | null
          spesielle_risikoer?: string | null
          varslingsbehov?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prosjektering_risikoanalyse_prosjektering_id_fkey"
            columns: ["prosjektering_id"]
            isOneToOne: false
            referencedRelation: "prosjekteringer"
            referencedColumns: ["id"]
          },
        ]
      }
      prosjektering_sjekkliste: {
        Row: {
          beskrivelse: string | null
          id: string
          kategori: string
          kommentar: string | null
          opprettet_dato: string | null
          prosjektering_id: string
          punkt: string
          rekkefølge: number | null
          sist_oppdatert: string | null
          status: string | null
        }
        Insert: {
          beskrivelse?: string | null
          id?: string
          kategori: string
          kommentar?: string | null
          opprettet_dato?: string | null
          prosjektering_id: string
          punkt: string
          rekkefølge?: number | null
          sist_oppdatert?: string | null
          status?: string | null
        }
        Update: {
          beskrivelse?: string | null
          id?: string
          kategori?: string
          kommentar?: string | null
          opprettet_dato?: string | null
          prosjektering_id?: string
          punkt?: string
          rekkefølge?: number | null
          sist_oppdatert?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prosjektering_sjekkliste_prosjektering_id_fkey"
            columns: ["prosjektering_id"]
            isOneToOne: false
            referencedRelation: "prosjekteringer"
            referencedColumns: ["id"]
          },
        ]
      }
      prosjektering_systemplan: {
        Row: {
          alarmstasjon: string | null
          antall_aspirerende: number | null
          antall_blitzlys: number | null
          antall_brannmeldere: number | null
          antall_flammedetektorer: number | null
          antall_klokker: number | null
          antall_linjedetektorer: number | null
          antall_multidetektorer: number | null
          antall_roykdetektorer: number | null
          antall_sirener: number | null
          antall_sloyfekort: number | null
          antall_sloyfer: number | null
          antall_talevarslere: number | null
          antall_varmedetektorer: number | null
          batterireserve_timer: number | null
          id: string
          notater: string | null
          opprettet_dato: string | null
          overforingstype: string | null
          prosjektering_id: string
          sentral_modell: string | null
          sentral_produsent: string | null
          sentral_type: string | null
          sist_oppdatert: string | null
          stromforsyning_type: string | null
          talevarsling_aktiv: boolean | null
          talevarsling_meldinger: string | null
          talevarsling_soner: string | null
        }
        Insert: {
          alarmstasjon?: string | null
          antall_aspirerende?: number | null
          antall_blitzlys?: number | null
          antall_brannmeldere?: number | null
          antall_flammedetektorer?: number | null
          antall_klokker?: number | null
          antall_linjedetektorer?: number | null
          antall_multidetektorer?: number | null
          antall_roykdetektorer?: number | null
          antall_sirener?: number | null
          antall_sloyfekort?: number | null
          antall_sloyfer?: number | null
          antall_talevarslere?: number | null
          antall_varmedetektorer?: number | null
          batterireserve_timer?: number | null
          id?: string
          notater?: string | null
          opprettet_dato?: string | null
          overforingstype?: string | null
          prosjektering_id: string
          sentral_modell?: string | null
          sentral_produsent?: string | null
          sentral_type?: string | null
          sist_oppdatert?: string | null
          stromforsyning_type?: string | null
          talevarsling_aktiv?: boolean | null
          talevarsling_meldinger?: string | null
          talevarsling_soner?: string | null
        }
        Update: {
          alarmstasjon?: string | null
          antall_aspirerende?: number | null
          antall_blitzlys?: number | null
          antall_brannmeldere?: number | null
          antall_flammedetektorer?: number | null
          antall_klokker?: number | null
          antall_linjedetektorer?: number | null
          antall_multidetektorer?: number | null
          antall_roykdetektorer?: number | null
          antall_sirener?: number | null
          antall_sloyfekort?: number | null
          antall_sloyfer?: number | null
          antall_talevarslere?: number | null
          antall_varmedetektorer?: number | null
          batterireserve_timer?: number | null
          id?: string
          notater?: string | null
          opprettet_dato?: string | null
          overforingstype?: string | null
          prosjektering_id?: string
          sentral_modell?: string | null
          sentral_produsent?: string | null
          sentral_type?: string | null
          sist_oppdatert?: string | null
          stromforsyning_type?: string | null
          talevarsling_aktiv?: boolean | null
          talevarsling_meldinger?: string | null
          talevarsling_soner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prosjektering_systemplan_prosjektering_id_fkey"
            columns: ["prosjektering_id"]
            isOneToOne: false
            referencedRelation: "prosjekteringer"
            referencedColumns: ["id"]
          },
        ]
      }
      prosjekteringer: {
        Row: {
          andre_standarder: string | null
          anlegg_id: string | null
          ansvarlig_prosjekterende: string | null
          beskrivelse: string | null
          faktisk_ferdig: string | null
          id: string
          kunde_id: string | null
          ns3960_referanse: string | null
          ns3961_referanse: string | null
          ny_kunde_adresse: string | null
          ny_kunde_epost: string | null
          ny_kunde_kontakt: string | null
          ny_kunde_navn: string | null
          ny_kunde_postnummer: string | null
          ny_kunde_poststed: string | null
          ny_kunde_telefon: string | null
          opprettet_av: string | null
          opprettet_dato: string | null
          planlagt_ferdig: string | null
          prosjekt_navn: string
          prosjekt_nummer: string | null
          prosjektleder: string | null
          sist_oppdatert: string | null
          status: string | null
          tek17_referanse: string | null
        }
        Insert: {
          andre_standarder?: string | null
          anlegg_id?: string | null
          ansvarlig_prosjekterende?: string | null
          beskrivelse?: string | null
          faktisk_ferdig?: string | null
          id?: string
          kunde_id?: string | null
          ns3960_referanse?: string | null
          ns3961_referanse?: string | null
          ny_kunde_adresse?: string | null
          ny_kunde_epost?: string | null
          ny_kunde_kontakt?: string | null
          ny_kunde_navn?: string | null
          ny_kunde_postnummer?: string | null
          ny_kunde_poststed?: string | null
          ny_kunde_telefon?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          planlagt_ferdig?: string | null
          prosjekt_navn: string
          prosjekt_nummer?: string | null
          prosjektleder?: string | null
          sist_oppdatert?: string | null
          status?: string | null
          tek17_referanse?: string | null
        }
        Update: {
          andre_standarder?: string | null
          anlegg_id?: string | null
          ansvarlig_prosjekterende?: string | null
          beskrivelse?: string | null
          faktisk_ferdig?: string | null
          id?: string
          kunde_id?: string | null
          ns3960_referanse?: string | null
          ns3961_referanse?: string | null
          ny_kunde_adresse?: string | null
          ny_kunde_epost?: string | null
          ny_kunde_kontakt?: string | null
          ny_kunde_navn?: string | null
          ny_kunde_postnummer?: string | null
          ny_kunde_poststed?: string | null
          ny_kunde_telefon?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          planlagt_ferdig?: string | null
          prosjekt_navn?: string
          prosjekt_nummer?: string | null
          prosjektleder?: string | null
          sist_oppdatert?: string | null
          status?: string | null
          tek17_referanse?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prosjekteringer_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prosjekteringer_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "alarmoverforing_med_info"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "prosjekteringer_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
      risikokategorier: {
        Row: {
          aktiv: boolean | null
          beskrivelse: string | null
          created_at: string | null
          farge: string | null
          id: number
          ikon: string | null
          navn: string
        }
        Insert: {
          aktiv?: boolean | null
          beskrivelse?: string | null
          created_at?: string | null
          farge?: string | null
          id?: number
          ikon?: string | null
          navn: string
        }
        Update: {
          aktiv?: boolean | null
          beskrivelse?: string | null
          created_at?: string | null
          farge?: string | null
          id?: number
          ikon?: string | null
          navn?: string
        }
        Relationships: []
      }
      risikovurdering_vedlegg: {
        Row: {
          beskrivelse: string | null
          filnavn: string
          filstorrelse: number
          filtype: string
          id: string
          mime_type: string
          opprettet_av: string
          opprettet_dato: string | null
          original_filnavn: string
          risikovurdering_id: string
          storage_bucket: string
          storage_path: string
          tiltak_id: string | null
        }
        Insert: {
          beskrivelse?: string | null
          filnavn: string
          filstorrelse: number
          filtype: string
          id?: string
          mime_type: string
          opprettet_av: string
          opprettet_dato?: string | null
          original_filnavn: string
          risikovurdering_id: string
          storage_bucket?: string
          storage_path: string
          tiltak_id?: string | null
        }
        Update: {
          beskrivelse?: string | null
          filnavn?: string
          filstorrelse?: number
          filtype?: string
          id?: string
          mime_type?: string
          opprettet_av?: string
          opprettet_dato?: string | null
          original_filnavn?: string
          risikovurdering_id?: string
          storage_bucket?: string
          storage_path?: string
          tiltak_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risikovurdering_vedlegg_risikovurdering_id_fkey"
            columns: ["risikovurdering_id"]
            isOneToOne: false
            referencedRelation: "risikovurderinger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risikovurdering_vedlegg_tiltak_id_fkey"
            columns: ["tiltak_id"]
            isOneToOne: false
            referencedRelation: "tiltak"
            referencedColumns: ["id"]
          },
        ]
      }
      risikovurderinger: {
        Row: {
          anlegg_id: string | null
          beskrivelse: string
          created_at: string | null
          dato: string | null
          id: string
          konsekvens: number | null
          kunde_id: string | null
          opprettet_av: string | null
          registrert_av: string | null
          risiko_matrise: Json | null
          risikokategori: string | null
          risikoniva: string | null
          risikoscore: number | null
          sannsynlighet: number | null
          status: string | null
          tiltak: Json | null
          tittel: string
          updated_at: string | null
        }
        Insert: {
          anlegg_id?: string | null
          beskrivelse: string
          created_at?: string | null
          dato?: string | null
          id?: string
          konsekvens?: number | null
          kunde_id?: string | null
          opprettet_av?: string | null
          registrert_av?: string | null
          risiko_matrise?: Json | null
          risikokategori?: string | null
          risikoniva?: string | null
          risikoscore?: number | null
          sannsynlighet?: number | null
          status?: string | null
          tiltak?: Json | null
          tittel: string
          updated_at?: string | null
        }
        Update: {
          anlegg_id?: string | null
          beskrivelse?: string
          created_at?: string | null
          dato?: string | null
          id?: string
          konsekvens?: number | null
          kunde_id?: string | null
          opprettet_av?: string | null
          registrert_av?: string | null
          risiko_matrise?: Json | null
          risikokategori?: string | null
          risikoniva?: string | null
          risikoscore?: number | null
          sannsynlighet?: number | null
          status?: string | null
          tiltak?: Json | null
          tittel?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risikovurderinger_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risikovurderinger_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "alarmoverforing_med_info"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "risikovurderinger_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risikovurderinger_registrert_av_fkey"
            columns: ["registrert_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risikovurderinger_risikokategori_fkey"
            columns: ["risikokategori"]
            isOneToOne: false
            referencedRelation: "risikokategorier"
            referencedColumns: ["navn"]
          },
        ]
      }
      roykluke_data: {
        Row: {
          anlegg_id: string | null
          created_at: string
          id: string
          ladespenning: string | null
          leverandor: string | null
          nettspenning: boolean | null
          sentraltype: string | null
        }
        Insert: {
          anlegg_id?: string | null
          created_at?: string
          id?: string
          ladespenning?: string | null
          leverandor?: string | null
          nettspenning?: boolean | null
          sentraltype?: string | null
        }
        Update: {
          anlegg_id?: string | null
          created_at?: string
          id?: string
          ladespenning?: string | null
          leverandor?: string | null
          nettspenning?: boolean | null
          sentraltype?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roykluke_data_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: true
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      roykluke_luker: {
        Row: {
          created_at: string | null
          funksjonstest: boolean | null
          id: string
          Koblet_til: string | null
          luke_type: string | null
          plassering: string | null
          sentral_id: string
          skader: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          funksjonstest?: boolean | null
          id?: string
          Koblet_til?: string | null
          luke_type?: string | null
          plassering?: string | null
          sentral_id: string
          skader?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          funksjonstest?: boolean | null
          id?: string
          Koblet_til?: string | null
          luke_type?: string | null
          plassering?: string | null
          sentral_id?: string
          skader?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roykluke_luker_sentral_id_fkey1"
            columns: ["sentral_id"]
            isOneToOne: false
            referencedRelation: "roykluke_sentraler"
            referencedColumns: ["id"]
          },
        ]
      }
      roykluke_sentraler: {
        Row: {
          aktiveringspenning: string | null
          anlegg_id: string | null
          anlegg_type: string | null
          anleggsinfo: string | null
          batteri_ah: string | null
          batteri_alder: number | null
          batteri_spenning: string | null
          batteri_type: string | null
          batteri_v: string | null
          branngardin_antall: number | null
          branngardin_klassifisering: string | null
          branngardin_merknad: string | null
          branngardin_produsent: string | null
          branngardin_type: string | null
          byttet_utstyr: string | null
          byttet_utstyr_antall: number | null
          created_at: string
          funksjonsteste: boolean | null
          funksjonstestet: boolean | null
          hvilespenning: string | null
          id: string
          kontroll_anbefalte_utbedringer: string | null
          kontroll_forskriftsmessig: string | null
          kontroll_funksjonstest: string | null
          krets_aktiveringspenning: string | null
          krets_hvilespenning: string | null
          krets_motstand: string | null
          krets_nr: string | null
          ladespenning: string | null
          ladespenning_status: string | null
          manuell_utlos: boolean | null
          manuell_utloser: boolean | null
          motor_antall: number | null
          motor_type: string | null
          plassering: string | null
          roykluke_antall: number | null
          roykluke_luketype: string | null
          roykluke_merknad: string | null
          roykluke_storrelse: string | null
          roykluke_type: string | null
          sentral_nr: number | null
          sentral_produsent: string | null
          service_resatt: boolean | null
          signaltype: string | null
          sjekk_beslag: string | null
          sjekk_beslag_roykluke: string | null
          sjekk_gardin_status: string | null
          sjekk_karm: string | null
          sjekk_krets: string | null
          sjekk_ledeskinner: string | null
          sjekk_manuell_utloser: string | null
          sjekk_motor: string | null
          sjekk_overlys: string | null
          status: string | null
          tilstand_aktiveringslampe: string | null
          tilstand_bryter: string | null
          tilstand_feillampe: string | null
          tilstand_ladespenning: string | null
          tilstand_nettlampe: string | null
          tilstand_nettspenning: string | null
          tilstand_sentral: string | null
          tilstand_signal: string | null
        }
        Insert: {
          aktiveringspenning?: string | null
          anlegg_id?: string | null
          anlegg_type?: string | null
          anleggsinfo?: string | null
          batteri_ah?: string | null
          batteri_alder?: number | null
          batteri_spenning?: string | null
          batteri_type?: string | null
          batteri_v?: string | null
          branngardin_antall?: number | null
          branngardin_klassifisering?: string | null
          branngardin_merknad?: string | null
          branngardin_produsent?: string | null
          branngardin_type?: string | null
          byttet_utstyr?: string | null
          byttet_utstyr_antall?: number | null
          created_at?: string
          funksjonsteste?: boolean | null
          funksjonstestet?: boolean | null
          hvilespenning?: string | null
          id?: string
          kontroll_anbefalte_utbedringer?: string | null
          kontroll_forskriftsmessig?: string | null
          kontroll_funksjonstest?: string | null
          krets_aktiveringspenning?: string | null
          krets_hvilespenning?: string | null
          krets_motstand?: string | null
          krets_nr?: string | null
          ladespenning?: string | null
          ladespenning_status?: string | null
          manuell_utlos?: boolean | null
          manuell_utloser?: boolean | null
          motor_antall?: number | null
          motor_type?: string | null
          plassering?: string | null
          roykluke_antall?: number | null
          roykluke_luketype?: string | null
          roykluke_merknad?: string | null
          roykluke_storrelse?: string | null
          roykluke_type?: string | null
          sentral_nr?: number | null
          sentral_produsent?: string | null
          service_resatt?: boolean | null
          signaltype?: string | null
          sjekk_beslag?: string | null
          sjekk_beslag_roykluke?: string | null
          sjekk_gardin_status?: string | null
          sjekk_karm?: string | null
          sjekk_krets?: string | null
          sjekk_ledeskinner?: string | null
          sjekk_manuell_utloser?: string | null
          sjekk_motor?: string | null
          sjekk_overlys?: string | null
          status?: string | null
          tilstand_aktiveringslampe?: string | null
          tilstand_bryter?: string | null
          tilstand_feillampe?: string | null
          tilstand_ladespenning?: string | null
          tilstand_nettlampe?: string | null
          tilstand_nettspenning?: string | null
          tilstand_sentral?: string | null
          tilstand_signal?: string | null
        }
        Update: {
          aktiveringspenning?: string | null
          anlegg_id?: string | null
          anlegg_type?: string | null
          anleggsinfo?: string | null
          batteri_ah?: string | null
          batteri_alder?: number | null
          batteri_spenning?: string | null
          batteri_type?: string | null
          batteri_v?: string | null
          branngardin_antall?: number | null
          branngardin_klassifisering?: string | null
          branngardin_merknad?: string | null
          branngardin_produsent?: string | null
          branngardin_type?: string | null
          byttet_utstyr?: string | null
          byttet_utstyr_antall?: number | null
          created_at?: string
          funksjonsteste?: boolean | null
          funksjonstestet?: boolean | null
          hvilespenning?: string | null
          id?: string
          kontroll_anbefalte_utbedringer?: string | null
          kontroll_forskriftsmessig?: string | null
          kontroll_funksjonstest?: string | null
          krets_aktiveringspenning?: string | null
          krets_hvilespenning?: string | null
          krets_motstand?: string | null
          krets_nr?: string | null
          ladespenning?: string | null
          ladespenning_status?: string | null
          manuell_utlos?: boolean | null
          manuell_utloser?: boolean | null
          motor_antall?: number | null
          motor_type?: string | null
          plassering?: string | null
          roykluke_antall?: number | null
          roykluke_luketype?: string | null
          roykluke_merknad?: string | null
          roykluke_storrelse?: string | null
          roykluke_type?: string | null
          sentral_nr?: number | null
          sentral_produsent?: string | null
          service_resatt?: boolean | null
          signaltype?: string | null
          sjekk_beslag?: string | null
          sjekk_beslag_roykluke?: string | null
          sjekk_gardin_status?: string | null
          sjekk_karm?: string | null
          sjekk_krets?: string | null
          sjekk_ledeskinner?: string | null
          sjekk_manuell_utloser?: string | null
          sjekk_motor?: string | null
          sjekk_overlys?: string | null
          status?: string | null
          tilstand_aktiveringslampe?: string | null
          tilstand_bryter?: string | null
          tilstand_feillampe?: string | null
          tilstand_ladespenning?: string | null
          tilstand_nettlampe?: string | null
          tilstand_nettspenning?: string | null
          tilstand_sentral?: string | null
          tilstand_signal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roykluke_sentraler_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      S: {
        Row: {
          created_at: string
          funksjonstest: boolean | null
          id: string
          plassering: string | null
          sentral_id: string | null
          skader: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          funksjonstest?: boolean | null
          id?: string
          plassering?: string | null
          sentral_id?: string | null
          skader?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          funksjonstest?: boolean | null
          id?: string
          plassering?: string | null
          sentral_id?: string | null
          skader?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roykluke_luker_sentral_id_fkey"
            columns: ["sentral_id"]
            isOneToOne: false
            referencedRelation: "roykluke_sentraler"
            referencedColumns: ["id"]
          },
        ]
      }
      salgs_leads: {
        Row: {
          antall_ansatte: number | null
          daglig_leder: string | null
          epost: string | null
          epost_sendt: boolean | null
          epost_sendt_av: string | null
          epost_sendt_dato: string | null
          forretningsadresse_gate: string | null
          forretningsadresse_kommune: string | null
          forretningsadresse_land: string | null
          forretningsadresse_postnummer: string | null
          forretningsadresse_poststed: string | null
          hjemmeside: string | null
          id: string
          interesse_rating: number | null
          kilde: string | null
          kontaktperson_epost: string | null
          kontaktperson_navn: string | null
          kontaktperson_telefon: string | null
          kunde_id: string | null
          naeringskode_1: string | null
          naeringskode_1_beskrivelse: string | null
          navn: string
          neste_oppfolging: string | null
          notater: string | null
          oppdatert_dato: string | null
          opprettet_av: string | null
          opprettet_dato: string | null
          organisasjonsform: string | null
          organisasjonsform_beskrivelse: string | null
          organisasjonsnummer: string
          prioritet: string | null
          status: string | null
          stiftelsesdato: string | null
          styreleder: string | null
          telefon: string | null
          tjeneste_annet: boolean | null
          tjeneste_annet_beskrivelse: string | null
          tjeneste_brannalarm: boolean | null
          tjeneste_ekstern: boolean | null
          tjeneste_ekstern_beskrivelse: string | null
          tjeneste_elektro: boolean | null
          tjeneste_forstehjelp: boolean | null
          tjeneste_nodlys: boolean | null
          tjeneste_roykluker: boolean | null
          tjeneste_slukkeutstyr: boolean | null
          tjeneste_sprinkler: boolean | null
        }
        Insert: {
          antall_ansatte?: number | null
          daglig_leder?: string | null
          epost?: string | null
          epost_sendt?: boolean | null
          epost_sendt_av?: string | null
          epost_sendt_dato?: string | null
          forretningsadresse_gate?: string | null
          forretningsadresse_kommune?: string | null
          forretningsadresse_land?: string | null
          forretningsadresse_postnummer?: string | null
          forretningsadresse_poststed?: string | null
          hjemmeside?: string | null
          id?: string
          interesse_rating?: number | null
          kilde?: string | null
          kontaktperson_epost?: string | null
          kontaktperson_navn?: string | null
          kontaktperson_telefon?: string | null
          kunde_id?: string | null
          naeringskode_1?: string | null
          naeringskode_1_beskrivelse?: string | null
          navn: string
          neste_oppfolging?: string | null
          notater?: string | null
          oppdatert_dato?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          organisasjonsform?: string | null
          organisasjonsform_beskrivelse?: string | null
          organisasjonsnummer: string
          prioritet?: string | null
          status?: string | null
          stiftelsesdato?: string | null
          styreleder?: string | null
          telefon?: string | null
          tjeneste_annet?: boolean | null
          tjeneste_annet_beskrivelse?: string | null
          tjeneste_brannalarm?: boolean | null
          tjeneste_ekstern?: boolean | null
          tjeneste_ekstern_beskrivelse?: string | null
          tjeneste_elektro?: boolean | null
          tjeneste_forstehjelp?: boolean | null
          tjeneste_nodlys?: boolean | null
          tjeneste_roykluker?: boolean | null
          tjeneste_slukkeutstyr?: boolean | null
          tjeneste_sprinkler?: boolean | null
        }
        Update: {
          antall_ansatte?: number | null
          daglig_leder?: string | null
          epost?: string | null
          epost_sendt?: boolean | null
          epost_sendt_av?: string | null
          epost_sendt_dato?: string | null
          forretningsadresse_gate?: string | null
          forretningsadresse_kommune?: string | null
          forretningsadresse_land?: string | null
          forretningsadresse_postnummer?: string | null
          forretningsadresse_poststed?: string | null
          hjemmeside?: string | null
          id?: string
          interesse_rating?: number | null
          kilde?: string | null
          kontaktperson_epost?: string | null
          kontaktperson_navn?: string | null
          kontaktperson_telefon?: string | null
          kunde_id?: string | null
          naeringskode_1?: string | null
          naeringskode_1_beskrivelse?: string | null
          navn?: string
          neste_oppfolging?: string | null
          notater?: string | null
          oppdatert_dato?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          organisasjonsform?: string | null
          organisasjonsform_beskrivelse?: string | null
          organisasjonsnummer?: string
          prioritet?: string | null
          status?: string | null
          stiftelsesdato?: string | null
          styreleder?: string | null
          telefon?: string | null
          tjeneste_annet?: boolean | null
          tjeneste_annet_beskrivelse?: string | null
          tjeneste_brannalarm?: boolean | null
          tjeneste_ekstern?: boolean | null
          tjeneste_ekstern_beskrivelse?: string | null
          tjeneste_elektro?: boolean | null
          tjeneste_forstehjelp?: boolean | null
          tjeneste_nodlys?: boolean | null
          tjeneste_roykluker?: boolean | null
          tjeneste_slukkeutstyr?: boolean | null
          tjeneste_sprinkler?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "salgs_leads_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "alarmoverforing_med_info"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "salgs_leads_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
      salgs_leads_epost_logg: {
        Row: {
          emne: string
          epost_adresse: string
          id: string
          innhold: string | null
          lead_id: string | null
          sendt_av: string | null
          sendt_dato: string | null
          status: string | null
        }
        Insert: {
          emne: string
          epost_adresse: string
          id?: string
          innhold?: string | null
          lead_id?: string | null
          sendt_av?: string | null
          sendt_dato?: string | null
          status?: string | null
        }
        Update: {
          emne?: string
          epost_adresse?: string
          id?: string
          innhold?: string | null
          lead_id?: string | null
          sendt_av?: string | null
          sendt_dato?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salgs_leads_epost_logg_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "salgs_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      salgs_leads_kommentarer: {
        Row: {
          id: string
          kommentar: string
          lead_id: string
          opprettet_av: string | null
          opprettet_av_navn: string | null
          opprettet_dato: string | null
        }
        Insert: {
          id?: string
          kommentar: string
          lead_id: string
          opprettet_av?: string | null
          opprettet_av_navn?: string | null
          opprettet_dato?: string | null
        }
        Update: {
          id?: string
          kommentar?: string
          lead_id?: string
          opprettet_av?: string | null
          opprettet_av_navn?: string | null
          opprettet_dato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salgs_leads_kommentarer_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "salgs_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      serviceavtale_priser: {
        Row: {
          brannslange_pris: number | null
          brannslukker_pris: number | null
          enhetspriser: Json | null
          id: string
          minstepris: number | null
          opprettet: string | null
          paslag_prosent: number | null
          rapport_pris: number | null
          sentralenhet_ekstra: number | null
          sentralenhet_forste: number | null
          sist_oppdatert: string | null
          tjeneste_type: string
        }
        Insert: {
          brannslange_pris?: number | null
          brannslukker_pris?: number | null
          enhetspriser?: Json | null
          id?: string
          minstepris?: number | null
          opprettet?: string | null
          paslag_prosent?: number | null
          rapport_pris?: number | null
          sentralenhet_ekstra?: number | null
          sentralenhet_forste?: number | null
          sist_oppdatert?: string | null
          tjeneste_type: string
        }
        Update: {
          brannslange_pris?: number | null
          brannslukker_pris?: number | null
          enhetspriser?: Json | null
          id?: string
          minstepris?: number | null
          opprettet?: string | null
          paslag_prosent?: number | null
          rapport_pris?: number | null
          sentralenhet_ekstra?: number | null
          sentralenhet_forste?: number | null
          sist_oppdatert?: string | null
          tjeneste_type?: string
        }
        Relationships: []
      }
      serviceavtale_tilbud: {
        Row: {
          anlegg_id: string | null
          anlegg_navn: string | null
          beskrivelse: string | null
          betalingsbetingelser: number | null
          ekstern_type: string | null
          ekstern_type_annet: string | null
          id: string
          kontaktperson_epost: string | null
          kontaktperson_id: string | null
          kontaktperson_navn: string | null
          kontaktperson_telefon: string | null
          kunde_id: string | null
          kunde_navn: string
          kunde_organisasjonsnummer: string | null
          lokasjon: string | null
          notater: string | null
          opprettet: string | null
          opprettet_av: string | null
          opprettet_av_navn: string | null
          pris_detaljer: Json | null
          rabatt_prosent: number | null
          sendt_dato: string | null
          sist_oppdatert: string | null
          status: string | null
          tilbud_nummer: string | null
          timespris: number | null
          tjeneste_brannalarm: boolean | null
          tjeneste_eksternt: boolean | null
          tjeneste_nodlys: boolean | null
          tjeneste_rokluker: boolean | null
          tjeneste_slukkeutstyr: boolean | null
          total_pris: number | null
        }
        Insert: {
          anlegg_id?: string | null
          anlegg_navn?: string | null
          beskrivelse?: string | null
          betalingsbetingelser?: number | null
          ekstern_type?: string | null
          ekstern_type_annet?: string | null
          id?: string
          kontaktperson_epost?: string | null
          kontaktperson_id?: string | null
          kontaktperson_navn?: string | null
          kontaktperson_telefon?: string | null
          kunde_id?: string | null
          kunde_navn: string
          kunde_organisasjonsnummer?: string | null
          lokasjon?: string | null
          notater?: string | null
          opprettet?: string | null
          opprettet_av?: string | null
          opprettet_av_navn?: string | null
          pris_detaljer?: Json | null
          rabatt_prosent?: number | null
          sendt_dato?: string | null
          sist_oppdatert?: string | null
          status?: string | null
          tilbud_nummer?: string | null
          timespris?: number | null
          tjeneste_brannalarm?: boolean | null
          tjeneste_eksternt?: boolean | null
          tjeneste_nodlys?: boolean | null
          tjeneste_rokluker?: boolean | null
          tjeneste_slukkeutstyr?: boolean | null
          total_pris?: number | null
        }
        Update: {
          anlegg_id?: string | null
          anlegg_navn?: string | null
          beskrivelse?: string | null
          betalingsbetingelser?: number | null
          ekstern_type?: string | null
          ekstern_type_annet?: string | null
          id?: string
          kontaktperson_epost?: string | null
          kontaktperson_id?: string | null
          kontaktperson_navn?: string | null
          kontaktperson_telefon?: string | null
          kunde_id?: string | null
          kunde_navn?: string
          kunde_organisasjonsnummer?: string | null
          lokasjon?: string | null
          notater?: string | null
          opprettet?: string | null
          opprettet_av?: string | null
          opprettet_av_navn?: string | null
          pris_detaljer?: Json | null
          rabatt_prosent?: number | null
          sendt_dato?: string | null
          sist_oppdatert?: string | null
          status?: string | null
          tilbud_nummer?: string | null
          timespris?: number | null
          tjeneste_brannalarm?: boolean | null
          tjeneste_eksternt?: boolean | null
          tjeneste_nodlys?: boolean | null
          tjeneste_rokluker?: boolean | null
          tjeneste_slukkeutstyr?: boolean | null
          total_pris?: number | null
        }
        Relationships: []
      }
      serviceoppdrag: {
        Row: {
          anlegg_id: string | null
          anleggsnavn: string | null
          beskrivelse: string | null
          created_at: string
          dato: string | null
          id: string
          tekniker_id: string | null
          type_oppdrag: string | null
        }
        Insert: {
          anlegg_id?: string | null
          anleggsnavn?: string | null
          beskrivelse?: string | null
          created_at?: string
          dato?: string | null
          id?: string
          tekniker_id?: string | null
          type_oppdrag?: string | null
        }
        Update: {
          anlegg_id?: string | null
          anleggsnavn?: string | null
          beskrivelse?: string | null
          created_at?: string
          dato?: string | null
          id?: string
          tekniker_id?: string | null
          type_oppdrag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serviceoppdrag_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serviceoppdrag_tekniker_id_fkey"
            columns: ["tekniker_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      servicerapporter: {
        Row: {
          anlegg_id: string
          header: string
          id: string
          image_urls: string[] | null
          opprettet_dato: string | null
          ordre_id: string | null
          rapport_dato: string
          rapport_innhold: string
          sist_oppdatert: string | null
          tekniker_navn: string
        }
        Insert: {
          anlegg_id: string
          header: string
          id?: string
          image_urls?: string[] | null
          opprettet_dato?: string | null
          ordre_id?: string | null
          rapport_dato: string
          rapport_innhold: string
          sist_oppdatert?: string | null
          tekniker_navn: string
        }
        Update: {
          anlegg_id?: string
          header?: string
          id?: string
          image_urls?: string[] | null
          opprettet_dato?: string | null
          ordre_id?: string | null
          rapport_dato?: string
          rapport_innhold?: string
          sist_oppdatert?: string | null
          tekniker_navn?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicerapporter_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicerapporter_ordre_id_fkey"
            columns: ["ordre_id"]
            isOneToOne: false
            referencedRelation: "ordre"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          browser_info: Json | null
          created_at: string
          data: Json | null
          id: string
          level: string
          message: string
          namespace: string | null
          page_url: string | null
          timestamp: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          browser_info?: Json | null
          created_at?: string
          data?: Json | null
          id?: string
          level: string
          message: string
          namespace?: string | null
          page_url?: string | null
          timestamp?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          browser_info?: Json | null
          created_at?: string
          data?: Json | null
          id?: string
          level?: string
          message?: string
          namespace?: string | null
          page_url?: string | null
          timestamp?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tiltak: {
        Row: {
          ansvarlig_id: string | null
          beskrivelse: string
          frist: string | null
          id: string
          kommentar: string | null
          opprettet_dato: string | null
          prioritet: string | null
          risikovurdering_id: string | null
          status: string | null
        }
        Insert: {
          ansvarlig_id?: string | null
          beskrivelse: string
          frist?: string | null
          id?: string
          kommentar?: string | null
          opprettet_dato?: string | null
          prioritet?: string | null
          risikovurdering_id?: string | null
          status?: string | null
        }
        Update: {
          ansvarlig_id?: string | null
          beskrivelse?: string
          frist?: string | null
          id?: string
          kommentar?: string | null
          opprettet_dato?: string | null
          prioritet?: string | null
          risikovurdering_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiltak_ansvarlig_id_fkey"
            columns: ["ansvarlig_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiltak_risikovurdering_id_fkey"
            columns: ["risikovurdering_id"]
            isOneToOne: false
            referencedRelation: "risikovurderinger"
            referencedColumns: ["id"]
          },
        ]
      }
      ukesplan_dager: {
        Row: {
          alarmprove_tid: string | null
          anlegg_id: string
          dag: number
          estimert_oppstart: string | null
          id: string
          notater: string | null
          rekkefolge: number | null
          ukesplan_id: string
        }
        Insert: {
          alarmprove_tid?: string | null
          anlegg_id: string
          dag: number
          estimert_oppstart?: string | null
          id?: string
          notater?: string | null
          rekkefolge?: number | null
          ukesplan_id: string
        }
        Update: {
          alarmprove_tid?: string | null
          anlegg_id?: string
          dag?: number
          estimert_oppstart?: string | null
          id?: string
          notater?: string | null
          rekkefolge?: number | null
          ukesplan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ukesplan_dager_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ukesplan_dager_ukesplan_id_fkey"
            columns: ["ukesplan_id"]
            isOneToOne: false
            referencedRelation: "ukesplaner"
            referencedColumns: ["id"]
          },
        ]
      }
      ukesplan_teknikere: {
        Row: {
          ansatt_id: string
          id: string
          ukesplan_id: string
        }
        Insert: {
          ansatt_id: string
          id?: string
          ukesplan_id: string
        }
        Update: {
          ansatt_id?: string
          id?: string
          ukesplan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ukesplan_teknikere_ansatt_id_fkey"
            columns: ["ansatt_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ukesplan_teknikere_ukesplan_id_fkey"
            columns: ["ukesplan_id"]
            isOneToOne: false
            referencedRelation: "ukesplaner"
            referencedColumns: ["id"]
          },
        ]
      }
      ukesplaner: {
        Row: {
          aar: number
          dropbox_path: string | null
          id: string
          kunde_id: string
          navn: string | null
          notater: string | null
          oppdatert_dato: string | null
          opprettet_av: string | null
          opprettet_dato: string | null
          status: string | null
          uke_nummer: number
        }
        Insert: {
          aar: number
          dropbox_path?: string | null
          id?: string
          kunde_id: string
          navn?: string | null
          notater?: string | null
          oppdatert_dato?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          status?: string | null
          uke_nummer: number
        }
        Update: {
          aar?: number
          dropbox_path?: string | null
          id?: string
          kunde_id?: string
          navn?: string | null
          notater?: string | null
          oppdatert_dato?: string | null
          opprettet_av?: string | null
          opprettet_dato?: string | null
          status?: string | null
          uke_nummer?: number
        }
        Relationships: [
          {
            foreignKeyName: "ukesplaner_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "alarmoverforing_med_info"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "ukesplaner_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      alarmoverforing_med_info: {
        Row: {
          adresse: string | null
          alarm_type: string | null
          anlegg_id: string | null
          anleggsnavn: string | null
          beskrivelse: string | null
          brutto_fortjeneste_aar: number | null
          brutto_fortjeneste_maaned: number | null
          bsv_kostnad_per_maaned: number | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          fast_pris: number | null
          id: string | null
          kommentar: string | null
          kunde_nummer: string | null
          kunde_type: string | null
          kundenavn: string | null
          mottakere: Json | null
          mva_belop: number | null
          organisasjonsnummer: string | null
          pris_eks_mva: number | null
          pris_ink_mva: number | null
          rabatt_belop: number | null
          rabatt_prosent: number | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alarmoverforing_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
        ]
      }
      ks_hms_dashboard: {
        Row: {
          ferdig: number | null
          hoy_risiko: number | null
          total: number | null
          type: string | null
          under_arbeid: number | null
          utkast: number | null
        }
        Relationships: []
      }
      prishistorikk_view: {
        Row: {
          anlegg_id: string | null
          endret_av: string | null
          endret_dato: string | null
          endring: number | null
          endring_type: string | null
          endrings_type: string | null
          felt_navn: string | null
          felt_navn_formatert: string | null
          gammel_verdi: number | null
          id: string | null
          kommentar: string | null
          ny_verdi: number | null
        }
        Insert: {
          anlegg_id?: string | null
          endret_av?: string | null
          endret_dato?: string | null
          endring?: never
          endring_type?: never
          endrings_type?: string | null
          felt_navn?: string | null
          felt_navn_formatert?: never
          gammel_verdi?: number | null
          id?: string | null
          kommentar?: string | null
          ny_verdi?: number | null
        }
        Update: {
          anlegg_id?: string | null
          endret_av?: string | null
          endret_dato?: string | null
          endring?: never
          endring_type?: never
          endrings_type?: string | null
          felt_navn?: string | null
          felt_navn_formatert?: never
          gammel_verdi?: number | null
          id?: string | null
          kommentar?: string | null
          ny_verdi?: number | null
        }
        Relationships: []
      }
      uleste_meldinger: {
        Row: {
          anlegg_id: string | null
          anleggsnavn: string | null
          created_at: string | null
          id: string | null
          intern_kommentar: string | null
          kunde: string | null
          kunde_navn: string | null
          mottaker_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intern_kommentar_anlegg_id_fkey"
            columns: ["anlegg_id"]
            isOneToOne: false
            referencedRelation: "anlegg"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_kommentar_mottaker_id_fkey"
            columns: ["mottaker_id"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      avvik_per_anlegg: {
        Args: never
        Returns: {
          anlegg_id: string
          antall: number
        }[]
      }
      cleanup_old_logs: { Args: never; Returns: undefined }
      cleanup_orphaned_attachments: { Args: never; Returns: undefined }
      create_detektorliste_with_items: {
        Args: {
          p_anlegg_id: string
          p_items: Json
          p_kunde_id: string
          p_opprettet_av: string
          p_service_ingenior: string
        }
        Returns: string
      }
      current_ansatt_id: { Args: never; Returns: string }
      generate_oppgave_nummer: { Args: never; Returns: string }
      generate_ordre_nummer: { Args: never; Returns: string }
      har_modul_tilgang: {
        Args: {
          p_modul_key: string
          p_tilgang_type?: string
          p_user_email: string
        }
        Returns: boolean
      }
      insert_detektor_item: {
        Args: {
          p_adresse: string
          p_detektorliste_id: string
          p_etasje: string
          p_kart: string
          p_plassering: string
          p_type: string
        }
        Returns: undefined
      }
      insert_detektor_items_batch: {
        Args: { p_items: Json }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      match_ai_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          distance: number
          embedding: string
          id: string
          metadata: Json
          tekst: string
        }[]
      }
      match_embeddings: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          record_id: string
          similarity: number
          table_name: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
