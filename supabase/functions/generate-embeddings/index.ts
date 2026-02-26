import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AZURE_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_KEY = Deno.env.get('AZURE_OPENAI_KEY') || Deno.env.get('AZURE_OPENAI_API_KEY')

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    `${AZURE_ENDPOINT}/openai/deployments/text-embedding-ada-002/embeddings?api-version=2024-02-01`,
    {
      method: 'POST',
      headers: {
        'api-key': AZURE_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Azure API error: ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let customersProcessed = 0
    let anleggProcessed = 0

    // Hent kunder uten embeddings
    const { data: customers } = await supabaseClient
      .from('customer')
      .select('id, navn, organisasjonsnummer')

    const { data: customerEmbeddings } = await supabaseClient
      .from('ai_embeddings')
      .select('record_id')
      .eq('table_name', 'customer')

    const existingCustomerIds = new Set(customerEmbeddings?.map(e => e.record_id) || [])
    const newCustomers = customers?.filter(c => !existingCustomerIds.has(c.id)) || []

    // Generer embeddings for nye kunder (maks 50 per kall)
    for (const kunde of newCustomers.slice(0, 50)) {
      try {
        const content = `Kunde: ${kunde.navn}\nOrganisasjonsnummer: ${kunde.organisasjonsnummer || 'Ikke oppgitt'}`
        const embedding = await generateEmbedding(content)

        await supabaseClient.from('ai_embeddings').insert({
          content,
          embedding,
          table_name: 'customer',
          record_id: kunde.id,
          metadata: { navn: kunde.navn },
        })

        customersProcessed++
      } catch (error) {
        console.error(`Feil for kunde ${kunde.navn}:`, error)
      }
    }

    // Hent anlegg uten embeddings
    const { data: anlegg } = await supabaseClient
      .from('anlegg')
      .select('id, anleggsnavn, adresse, postnummer, poststed, kundenr, customer(navn)')

    const { data: anleggEmbeddings } = await supabaseClient
      .from('ai_embeddings')
      .select('record_id')
      .eq('table_name', 'anlegg')

    const existingAnleggIds = new Set(anleggEmbeddings?.map(e => e.record_id) || [])
    const newAnlegg = anlegg?.filter(a => !existingAnleggIds.has(a.id)) || []

    // Generer embeddings for nye anlegg (maks 50 per kall)
    for (const a of newAnlegg.slice(0, 50)) {
      try {
        const kundeNavn = (a.customer as any)?.navn || 'Ukjent kunde'
        const content = `Anlegg: ${a.anleggsnavn}\nKunde: ${kundeNavn}\nAdresse: ${a.adresse || 'Ikke oppgitt'}\nPostnummer: ${a.postnummer || 'Ikke oppgitt'}\nPoststed: ${a.poststed || 'Ikke oppgitt'}`
        const embedding = await generateEmbedding(content)

        await supabaseClient.from('ai_embeddings').insert({
          content,
          embedding,
          table_name: 'anlegg',
          record_id: a.id,
          metadata: { anleggsnavn: a.anleggsnavn, kunde: kundeNavn, poststed: a.poststed },
        })

        anleggProcessed++
      } catch (error) {
        console.error(`Feil for anlegg ${a.anleggsnavn}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        customersProcessed,
        anleggProcessed,
        message: `Prosessert ${customersProcessed} kunder og ${anleggProcessed} anlegg`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Generate embeddings error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'En ukjent feil oppstod' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
