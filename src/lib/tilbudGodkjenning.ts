import { supabase } from './supabase'
import { generateTilbudPDF } from '@/pages/tilbud/TilbudPDF'
import type { ServiceavtaleTilbud } from '@/pages/TilbudServiceavtale'
import { createKundeFolderStructure, createAnleggFolderStructure } from '@/services/dropboxFolderStructure'

interface GodkjenningResult {
  success: boolean
  kunde_id?: string
  anlegg_id?: string
  kontaktperson_id?: string
  pdf_url?: string
  dropbox_synced?: boolean
  error?: string
}

interface GodkjenningOptions {
  kundenummer: string
  eksisterendeKundeId: string | null
  opprettKunde: boolean
}

/**
 * Oppretter priser for anlegget basert på tilbudets pris_detaljer
 * @param anlegg_id - ID til anlegget
 * @param kunde_id - ID til kunden
 * @param tilbud - Tilbudsobjektet
 */
async function opprettPriserForAnlegg(anlegg_id: string, kunde_id: string, tilbud: ServiceavtaleTilbud): Promise<void> {
  if (!kunde_id) return
  try {
    console.log('🔍 Oppretter priser for anlegg:', anlegg_id)
    console.log('📊 Tilbud pris_detaljer:', tilbud.pris_detaljer)

    // Bygg pris-objektet basert på tilbudets pris_detaljer
    const prisData: any = {
      anlegg_id: anlegg_id,
      // kundenummer utelates - ikke relevant for priser fra tilbud
      prisbrannalarm: tilbud.pris_detaljer?.brannalarm?.pris || null,
      prisnodlys: tilbud.pris_detaljer?.nodlys?.pris || null,
      prisekstern: tilbud.pris_detaljer?.eksternt?.pris || null,
      prisslukkeutstyr: tilbud.pris_detaljer?.slukkeutstyr?.pris || null,
      prisroykluker: tilbud.pris_detaljer?.rokluker?.pris || null
    }

    console.log('💰 PrisData som skal lagres:', prisData)

    // Sjekk om det finnes noen priser å lagre
    const harPriser = Object.values(prisData).some(pris => 
      pris !== null && pris !== undefined && pris !== anlegg_id
    )

    console.log('✅ Har priser å lagre:', harPriser)

    if (harPriser) {
      const { error: prisError } = await supabase
        .from('priser_kundenummer')
        .insert(prisData)

      if (prisError) {
        console.error('❌ Kunne ikke opprette priser:', prisError)
        // Ikke kast feil, anlegget er allerede opprettet
      } else {
        console.log('✅ Priser opprettet!')
      }
    } else {
      console.log('⚠️ Ingen priser å lagre')
    }
  } catch (error) {
    console.error('Feil ved opprettelse av priser:', error)
    // Ikke kast feil, anlegget er allerede opprettet
  }
}

/**
 * Håndterer godkjenning av tilbud:
 * 1. Oppretter kunde hvis den ikke eksisterer, eller bruker eksisterende
 * 2. Oppretter anlegg hvis det ikke eksisterer
 * 3. Oppretter kontaktperson hvis den ikke eksisterer
 * 4. Genererer og lagrer PDF på anlegget
 * 5. Synkroniserer til Dropbox med riktig kundenummer
 */
export async function handleTilbudGodkjenning(
  tilbud: ServiceavtaleTilbud,
  options: GodkjenningOptions
): Promise<GodkjenningResult> {
  try {
    let kunde_id = tilbud.kunde_id
    let anlegg_id = tilbud.anlegg_id
    let kontaktperson_id = tilbud.kontaktperson_id
    let kundeNavn = tilbud.kunde_navn
    let dropbox_synced = false

    // 1. Håndter kunde
    if (options.eksisterendeKundeId) {
      // Bruk eksisterende kunde
      kunde_id = options.eksisterendeKundeId
      
      // Hent kundenavn fra eksisterende kunde
      const { data: eksisterendeKunde } = await supabase
        .from('customer')
        .select('navn, kunde_nummer')
        .eq('id', options.eksisterendeKundeId)
        .single()
      
      if (eksisterendeKunde) {
        kundeNavn = eksisterendeKunde.navn
        // Oppdater kundenummer hvis det ikke er satt
        if (!eksisterendeKunde.kunde_nummer && options.kundenummer) {
          await supabase
            .from('customer')
            .update({ kunde_nummer: options.kundenummer })
            .eq('id', options.eksisterendeKundeId)
        }
        
        // Opprett Dropbox kunde-mapper hvis de ikke finnes (for eksisterende kunder uten mapper)
        try {
          const kundeDropboxResult = await createKundeFolderStructure(
            options.kundenummer,
            kundeNavn
          )
          if (kundeDropboxResult.success) {
            console.log('✅ Dropbox kunde-mapper opprettet/verifisert for eksisterende kunde')
          }
        } catch (dropboxError) {
          console.warn('⚠️ Kunne ikke opprette Dropbox kunde-mapper:', dropboxError)
        }
      }
      
      console.log('✅ Bruker eksisterende kunde:', kundeNavn)
    } else if (!kunde_id) {
      // Opprett ny kunde med kundenummer
      const { data: nyKunde, error: kundeError } = await supabase
        .from('customer')
        .insert({
          navn: tilbud.kunde_navn,
          organisasjonsnummer: tilbud.kunde_organisasjonsnummer,
          kunde_nummer: options.kundenummer,
          type: 'Bedrift'
        })
        .select()
        .single()

      if (kundeError) throw new Error(`Kunne ikke opprette kunde: ${kundeError.message}`)
      kunde_id = nyKunde.id
      console.log('✅ Ny kunde opprettet:', tilbud.kunde_navn)
      
      // Opprett kunde-mapper i Dropbox
      try {
        const kundeDropboxResult = await createKundeFolderStructure(
          options.kundenummer,
          tilbud.kunde_navn
        )
        if (kundeDropboxResult.success) {
          console.log('✅ Dropbox kunde-mapper opprettet')
        }
      } catch (dropboxError) {
        console.warn('⚠️ Kunne ikke opprette Dropbox kunde-mapper:', dropboxError)
      }
    }

    // 2. Håndter anlegg
    if (!anlegg_id && tilbud.anlegg_navn) {
      // Opprett nytt anlegg
      const { data: nyttAnlegg, error: anleggError } = await supabase
        .from('anlegg')
        .insert({
          kundenr: kunde_id,
          anleggsnavn: tilbud.anlegg_navn,
          adresse: tilbud.lokasjon,
          org_nummer: tilbud.kunde_organisasjonsnummer,
          kontroll_status: 'Ikke startet'
          // opprettet_dato settes automatisk av databasen
        })
        .select()
        .single()

      if (anleggError) throw new Error(`Kunne ikke opprette anlegg: ${anleggError.message}`)
      anlegg_id = nyttAnlegg.id
      console.log('✅ Nytt anlegg opprettet:', tilbud.anlegg_navn)

      // Opprett priser for anlegget basert på tilbudet
      // kunde_id er garantert satt her (enten fra tilbud eller opprettet i steg 1)
      // @ts-expect-error - kunde_id er garantert string her (enten fra tilbud eller opprettet i steg 1)
      await opprettPriserForAnlegg(anlegg_id, kunde_id || '', tilbud)
      
      // Opprett anlegg-mapper i Dropbox
      try {
        const anleggDropboxResult = await createAnleggFolderStructure(
          options.kundenummer,
          kundeNavn,
          tilbud.anlegg_navn
        )
        if (anleggDropboxResult.success) {
          console.log('✅ Dropbox anlegg-mapper opprettet')
          dropbox_synced = true
          
          // Marker anlegget som synkronisert til Dropbox
          await supabase
            .from('anlegg')
            .update({ dropbox_synced: true })
            .eq('id', anlegg_id)
        }
      } catch (dropboxError) {
        console.warn('⚠️ Kunne ikke opprette Dropbox anlegg-mapper:', dropboxError)
      }
    }

    // 3. Håndter kontaktperson
    if (!kontaktperson_id && tilbud.kontaktperson_navn) {
      // Opprett ny kontaktperson
      const { data: nyKontaktperson, error: kontaktError } = await supabase
        .from('kontaktpersoner')
        .insert({
          navn: tilbud.kontaktperson_navn,
          epost: tilbud.kontaktperson_epost,
          telefon: tilbud.kontaktperson_telefon
          // opprettet_dato settes automatisk av databasen
        })
        .select()
        .single()

      if (kontaktError) throw new Error(`Kunne ikke opprette kontaktperson: ${kontaktError.message}`)
      kontaktperson_id = nyKontaktperson.id

      // Koble kontaktperson til anlegg hvis anlegg finnes
      if (anlegg_id) {
        const { error: koblingError } = await supabase
          .from('anlegg_kontaktpersoner')
          .insert({
            anlegg_id: anlegg_id,
            kontaktperson_id: kontaktperson_id,
            primar: true
          })

        if (koblingError) {
          console.error('Kunne ikke koble kontaktperson til anlegg:', koblingError)
          // Ikke kast feil her, fortsett med PDF-generering
        }
      }
    }

    // 4. Generer og lagre PDF
    if (!anlegg_id) {
      throw new Error('Kan ikke lagre PDF uten anlegg. Anleggsnavn må være fylt ut.')
    }

    const pdfUrl = await genererOgLagreTilbudPDF(tilbud, anlegg_id)

    // 5. Oppdater tilbudet med nye IDer
    const { error: updateError } = await supabase
      .from('serviceavtale_tilbud')
      .update({
        kunde_id: kunde_id,
        anlegg_id: anlegg_id,
        kontaktperson_id: kontaktperson_id
      })
      .eq('id', tilbud.id)

    if (updateError) {
      console.error('Kunne ikke oppdatere tilbud med nye IDer:', updateError)
      // Ikke kast feil, PDF er allerede lagret
    }

    return {
      success: true,
      kunde_id: kunde_id ?? undefined,
      anlegg_id: anlegg_id ?? undefined,
      kontaktperson_id: kontaktperson_id ?? undefined,
      pdf_url: pdfUrl,
      dropbox_synced
    }
  } catch (error) {
    console.error('Feil ved godkjenning av tilbud:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ukjent feil'
    }
  }
}

/**
 * Genererer PDF og laster den opp til Supabase Storage
 */
async function genererOgLagreTilbudPDF(tilbud: ServiceavtaleTilbud, anlegg_id: string): Promise<string> {
  // Generer PDF
  const doc = await generateTilbudPDF({
    kunde_navn: tilbud.kunde_navn,
    kunde_organisasjonsnummer: tilbud.kunde_organisasjonsnummer ?? undefined,
    lokasjon: tilbud.lokasjon ?? undefined,
    anlegg_navn: tilbud.anlegg_navn ?? undefined,
    kontaktperson_navn: tilbud.kontaktperson_navn ?? undefined,
    kontaktperson_epost: tilbud.kontaktperson_epost ?? undefined,
    kontaktperson_telefon: tilbud.kontaktperson_telefon ?? undefined,
    opprettet_av_navn: tilbud.opprettet_av_navn,
    tjeneste_brannalarm: tilbud.tjeneste_brannalarm,
    tjeneste_nodlys: tilbud.tjeneste_nodlys,
    tjeneste_slukkeutstyr: tilbud.tjeneste_slukkeutstyr,
    tjeneste_rokluker: tilbud.tjeneste_rokluker,
    tjeneste_eksternt: tilbud.tjeneste_eksternt,
    ekstern_type: tilbud.ekstern_type ?? undefined,
    ekstern_type_annet: tilbud.ekstern_type_annet ?? undefined,
    pris_detaljer: tilbud.pris_detaljer,
    total_pris: tilbud.total_pris,
    rabatt_prosent: tilbud.rabatt_prosent,
    timespris: tilbud.timespris,
    betalingsbetingelser: tilbud.betalingsbetingelser,
    opprettet: tilbud.opprettet,
    tilbudsnummer: tilbud.tilbud_nummer ?? undefined
  })

  // Konverter til Blob
  const pdfBlob = doc.output('blob')

  // Generer filnavn
  const safeKundeNavn = tilbud.kunde_navn
    .replace(/\s+/g, '_')  // Erstatt mellomrom med underscore
    .replace(/[^a-zA-ZæøåÆØÅ0-9_]/g, '')  // Fjern spesialtegn, behold norske bokstaver
    .toUpperCase()  // Stor bokstav
  const fileName = `Tilbud_Serviceavtale_${safeKundeNavn}_ikke_signert.pdf`
  const filePath = `anlegg/${anlegg_id}/tilbud/${fileName}`

  // Last opp til Supabase Storage (upsert=true for å overskrive hvis eksisterer)
  const { error: uploadError } = await supabase.storage
    .from('anlegg.dokumenter')
    .upload(filePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true
    })

  if (uploadError) {
    throw new Error(`Kunne ikke laste opp PDF: ${uploadError.message}`)
  }

  // Lagre referanse i dokumenter-tabellen (url er filePath, ikke full URL)
  // Bruk upsert for å unngå 409-feil hvis dokumentet allerede eksisterer
  const { error: docError } = await supabase
    .from('dokumenter')
    .upsert({
      anlegg_id: anlegg_id,
      filnavn: fileName,
      url: filePath,
      type: 'Tilbud Serviceavtale',
      opplastet_dato: new Date().toISOString()
    }, {
      onConflict: 'anlegg_id,filnavn'
    })

  if (docError) {
    console.error('Kunne ikke lagre dokument-referanse:', docError)
    // Ikke kast feil, PDF er allerede lastet opp
  }

  // Returner filePath (ikke full URL, da signed URL genereres ved visning)
  return filePath
}
