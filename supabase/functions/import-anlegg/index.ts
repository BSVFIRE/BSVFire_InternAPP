// Import Anlegg - Supabase Edge Function
// Håndterer import av anlegg fra Excel-data på server-side
// Kjører uavhengig av klient (dvale, nettverksproblemer, etc.)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireUser } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ImportRow {
  anleggsnavn: string
  adresse: string | null
  postnummer: string | null
  poststed: string | null
  kundenavn: string
  kontroll_maaned: string | null
  brannalarm: boolean
  nodlys: boolean
  slukkeutstyr: boolean
  roykluker: boolean
  forstehjelp: boolean
  ekstern: boolean
  pris_brannalarm: number | null
  pris_nodlys: number | null
  pris_slukkeutstyr: number | null
  pris_roykluker: number | null
  pris_forstehjelp: number | null
  pris_ekstern: number | null
}

interface Kunde {
  id: string
  navn: string
  kunde_nummer: string | null
  organisasjonsnummer: string | null
}

interface ImportResult {
  row: number
  anleggsnavn: string
  status: 'success' | 'error' | 'skipped'
  message?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Krev innlogget ansatt (gatewayen godtar anon-nøkkelen som gyldig JWT)
  const auth = await requireUser(req)
  if (auth instanceof Response) return auth

  try {
    // Opprett Supabase-klient med service role for full tilgang
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { rows, kunder } = await req.json() as { rows: ImportRow[], kunder: Kunde[] }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Ingen data å importere' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Starter import av ${rows.length} anlegg...`)

    const results: ImportResult[] = []

    // Hjelpefunksjon for å finne kunde
    const findKunde = (kundenavn: string): Kunde | undefined => {
      const searchName = kundenavn?.toLowerCase().trim()
      return kunder.find(k => k.navn.toLowerCase().trim() === searchName)
    }

    // Prosesser hver rad
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const kunde = findKunde(row.kundenavn)

      if (!kunde) {
        results.push({
          row: i + 1,
          anleggsnavn: row.anleggsnavn || 'Ukjent',
          status: 'error',
          message: `Kunde "${row.kundenavn}" ikke funnet`
        })
        continue
      }

      try {
        // Sjekk om anlegg med samme navn allerede finnes for denne kunden
        const { data: existingAnlegg } = await supabase
          .from('anlegg')
          .select('id')
          .eq('kundenr', kunde.id)
          .ilike('anleggsnavn', row.anleggsnavn?.trim() || '')
          .limit(1)

        if (existingAnlegg && existingAnlegg.length > 0) {
          results.push({
            row: i + 1,
            anleggsnavn: row.anleggsnavn,
            status: 'skipped',
            message: `Anlegg finnes allerede for denne kunden`
          })
          continue
        }

        // Bygg kontroll_type array
        const kontrollTyper: string[] = []
        if (row.brannalarm) kontrollTyper.push('Brannalarm')
        if (row.nodlys) kontrollTyper.push('Nødlys')
        if (row.slukkeutstyr) kontrollTyper.push('Slukkeutstyr')
        if (row.roykluker) kontrollTyper.push('Røykluker')
        if (row.forstehjelp) kontrollTyper.push('Førstehjelp')
        if (row.ekstern) kontrollTyper.push('Ekstern')

        // Opprett anlegget
        const { data: anleggData, error: anleggError } = await supabase
          .from('anlegg')
          .insert({
            anleggsnavn: row.anleggsnavn?.trim() || '',
            adresse: row.adresse?.trim() || null,
            postnummer: row.postnummer?.trim() || null,
            poststed: row.poststed?.trim() || null,
            kundenr: kunde.id,
            kunde_nummer: kunde.kunde_nummer,
            org_nummer: kunde.organisasjonsnummer,
            kontroll_maaned: row.kontroll_maaned?.trim() || null,
            kontroll_status: 'Ikke utført',
            kontroll_type: kontrollTyper.length > 0 ? kontrollTyper : null
          })
          .select('id')
          .single()

        if (anleggError) {
          throw anleggError
        }

        // Opprett priser hvis angitt
        const priserToInsert: any[] = []

        if (row.pris_brannalarm && anleggData) {
          priserToInsert.push({
            anlegg_id: anleggData.id,
            kunde_id: kunde.id,
            tjeneste: 'brannalarm',
            pris: row.pris_brannalarm
          })
        }
        if (row.pris_nodlys && anleggData) {
          priserToInsert.push({
            anlegg_id: anleggData.id,
            kunde_id: kunde.id,
            tjeneste: 'nodlys',
            pris: row.pris_nodlys
          })
        }
        if (row.pris_slukkeutstyr && anleggData) {
          priserToInsert.push({
            anlegg_id: anleggData.id,
            kunde_id: kunde.id,
            tjeneste: 'slukkeutstyr',
            pris: row.pris_slukkeutstyr
          })
        }
        if (row.pris_roykluker && anleggData) {
          priserToInsert.push({
            anlegg_id: anleggData.id,
            kunde_id: kunde.id,
            tjeneste: 'roykluker',
            pris: row.pris_roykluker
          })
        }
        if (row.pris_forstehjelp && anleggData) {
          priserToInsert.push({
            anlegg_id: anleggData.id,
            kunde_id: kunde.id,
            tjeneste: 'forstehjelp',
            pris: row.pris_forstehjelp
          })
        }
        if (row.pris_ekstern && anleggData) {
          priserToInsert.push({
            anlegg_id: anleggData.id,
            kunde_id: kunde.id,
            tjeneste: 'ekstern',
            pris: row.pris_ekstern
          })
        }

        // Sett inn priser
        if (priserToInsert.length > 0) {
          await supabase
            .from('kontroll_priser')
            .insert(priserToInsert)
        }

        results.push({
          row: i + 1,
          anleggsnavn: row.anleggsnavn,
          status: 'success',
          message: 'Importert'
        })

        console.log(`[${i + 1}/${rows.length}] Importert: ${row.anleggsnavn}`)

      } catch (err: any) {
        console.error(`Feil ved import av rad ${i + 1}:`, err)
        results.push({
          row: i + 1,
          anleggsnavn: row.anleggsnavn || 'Ukjent',
          status: 'error',
          message: err.message || 'Ukjent feil'
        })
      }
    }

    // Oppsummering
    const summary = {
      total: rows.length,
      success: results.filter(r => r.status === 'success').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length
    }

    console.log(`Import fullført: ${summary.success} importert, ${summary.skipped} hoppet over, ${summary.errors} feil`)

    return new Response(
      JSON.stringify({ results, summary }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (err: any) {
    console.error('Import feilet:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Ukjent feil' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
