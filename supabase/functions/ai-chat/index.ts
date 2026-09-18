import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireUser } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AZURE_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_KEY = Deno.env.get('AZURE_OPENAI_KEY') || Deno.env.get('AZURE_OPENAI_API_KEY')
const AZURE_GPT_DEPLOYMENT = Deno.env.get('AZURE_GPT_DEPLOYMENT_NAME') || 'gpt-4o'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Krev innlogget ansatt (gatewayen godtar anon-nøkkelen som gyldig JWT)
  const auth = await requireUser(req)
  if (auth instanceof Response) return auth

  try {
    const { query } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('Processing query:', query)

    // 1. Generer embedding for kunnskapsbase-søk
    const embeddingResponse = await fetch(
      `${AZURE_ENDPOINT}/openai/deployments/text-embedding-ada-002/embeddings?api-version=2024-02-01`,
      {
        method: 'POST',
        headers: {
          'api-key': AZURE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: query,
        }),
      }
    )

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding

    // 2. Søk i kunnskapsbase (embeddings)
    const { data: matches } = await supabaseClient.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 3,
    })

    let context = ''

    // 3. Søk også i kunde/anlegg-tabeller
    const queryLower = query.toLowerCase()
    
    // Søk etter kunder
    if (queryLower.includes('kunde')) {
      // Hvis spørsmålet er om antall eller "hvor mange"
      if (queryLower.includes('hvor mange') || queryLower.includes('antall') || queryLower.includes('totalt')) {
        // Hent alle kunder (eller filtrer på poststed hvis spesifisert)
        let customerQuery = supabaseClient.from('customer').select('*', { count: 'exact' })
        
        // Sjekk om det er spesifisert en by
        if (queryLower.includes('oslo')) {
          customerQuery = customerQuery.ilike('poststed', '%Oslo%')
        } else if (queryLower.includes('bergen')) {
          customerQuery = customerQuery.ilike('poststed', '%Bergen%')
        } else if (queryLower.includes('trondheim')) {
          customerQuery = customerQuery.ilike('poststed', '%Trondheim%')
        } else if (queryLower.includes('stavanger')) {
          customerQuery = customerQuery.ilike('poststed', '%Stavanger%')
        }
        
        const { data: customers, count } = await customerQuery
        
        if (count !== null) {
          context += `\n\n=== ANTALL KUNDER ===\nTotalt antall kunder: ${count}\n`
          
          // Vis også noen eksempler
          if (customers && customers.length > 0) {
            context += '\nEksempler på kunder:\n'
            context += customers.slice(0, 5).map(c => 
              `- ${c.navn} (${c.poststed || 'Ukjent sted'})`
            ).join('\n')
          }
        }
      } else {
        // Vanlig søk etter spesifikke kunder
        const { data: customers } = await supabaseClient
          .from('customer')
          .select('*')
          .or(`navn.ilike.%${query}%,poststed.ilike.%${query}%,adresse.ilike.%${query}%`)
          .limit(10)
        
        if (customers && customers.length > 0) {
          context += '\n\n=== KUNDER ===\n'
          context += customers.map(c => 
            `Kunde: ${c.navn}\nAdresse: ${c.adresse || 'Ikke oppgitt'}, ${c.postnummer || ''} ${c.poststed || ''}\nTelefon: ${c.telefon || 'Ikke oppgitt'}\nE-post: ${c.epost || 'Ikke oppgitt'}`
          ).join('\n\n')
        }
      }
    }

    // Søk etter anlegg
    if (queryLower.includes('anlegg') || queryLower.includes('kontroll') || 
        queryLower.includes('borettslag') || queryLower.includes('barnehage') || 
        queryLower.includes('senter') || queryLower.includes('kommune')) {
      
      // Sjekk om det er spørsmål om kontrollpåminnelser
      if (queryLower.includes('påminn') || queryLower.includes('må kontroll') || queryLower.includes('forfalt') || 
          queryLower.includes('snart') || queryLower.includes('denne måned') || queryLower.includes('neste måned')) {
        
        // Hent nåværende måned (oktober = 10)
        const now = new Date()
        const currentMonthNum = now.getMonth() + 1 // 1-12
        const currentMonth = now.toLocaleString('no-NO', { month: 'long' })
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        const nextMonth = nextMonthDate.toLocaleString('no-NO', { month: 'long' })
        
        console.log(`Current month: ${currentMonth} (${currentMonthNum})`)
        console.log(`Next month: ${nextMonth}`)
        
        // Sjekk om spørsmålet er om en spesifikk måned
        const monthNames = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember']
        let targetMonth = currentMonth
        
        for (const month of monthNames) {
          if (queryLower.includes(month)) {
            targetMonth = month
            console.log(`Detected specific month: ${month}`)
            break
          }
        }
        
        // Finn anlegg for spesifikk måned (hvis angitt) eller nåværende måned
        const { data: anleggThisMonth } = await supabaseClient
          .from('anlegg')
          .select('*')
          .ilike('kontroll_maaned', `%${targetMonth}%`)
          .limit(50)
        
        const { data: anleggNextMonth } = await supabaseClient
          .from('anlegg')
          .select('*')
          .ilike('kontroll_maaned', `%${nextMonth}%`)
          .limit(20)
        
        // Finn anlegg med forfalt kontroll (status ikke "Utført" eller "Godkjent")
        const { data: anleggOverdue } = await supabaseClient
          .from('anlegg')
          .select('*')
          .not('kontroll_status', 'in', '(Utført,Godkjent)')
          .limit(20)
        
        context += '\n\n=== KONTROLLPÅMINNELSER ===\n'
        
        if (anleggThisMonth && anleggThisMonth.length > 0) {
          const monthLabel = targetMonth === currentMonth ? `DENNE MÅNEDEN (${targetMonth})` : targetMonth.toUpperCase()
          context += `\n📅 ${monthLabel}: ${anleggThisMonth.length} anlegg funnet\n`
          
          // Filtrer på status hvis spørsmålet er om "ikke utført"
          let filteredAnlegg = anleggThisMonth
          if (queryLower.includes('ikke utført') || queryLower.includes('ikke kontrollert')) {
            filteredAnlegg = anleggThisMonth.filter(a => 
              !a.kontroll_status || 
              a.kontroll_status.toLowerCase() !== 'utført' && 
              a.kontroll_status.toLowerCase() !== 'godkjent'
            )
            context += `\nDette er de ${filteredAnlegg.length} anleggene som IKKE er utført:\n`
          }
          
          context += filteredAnlegg.slice(0, 15).map(a => 
            `- ${a.anleggsnavn} (${a.poststed || 'Ukjent'})\n  Status: ${a.kontroll_status || 'Ikke utført'}\n  Type: ${a.kontroll_type?.join(', ') || 'Ikke spesifisert'}`
          ).join('\n')
          
          if (filteredAnlegg.length === 0 && anleggThisMonth.length > 0) {
            context += `\nAlle ${anleggThisMonth.length} anlegg for ${targetMonth} er allerede utført! ✅\n`
          }
        } else {
          context += `\n📅 ${targetMonth.toUpperCase()}: Ingen anlegg funnet i databasen for denne måneden\n`
        }
        
        if (anleggNextMonth && anleggNextMonth.length > 0) {
          context += `\n\n📆 NESTE MÅNED (${nextMonth}): ${anleggNextMonth.length} anlegg\n`
          context += anleggNextMonth.slice(0, 5).map(a => 
            `- ${a.anleggsnavn} (${a.poststed || 'Ukjent'})`
          ).join('\n')
        }
        
        if (anleggOverdue && anleggOverdue.length > 0) {
          context += `\n\n⚠️ FORFALT/IKKE UTFØRT: ${anleggOverdue.length} anlegg\n`
          context += anleggOverdue.slice(0, 10).map(a => 
            `- ${a.anleggsnavn} (${a.poststed || 'Ukjent'})\n  Planlagt: ${a.kontroll_maaned || 'Ikke planlagt'}\n  Status: ${a.kontroll_status || 'Ikke utført'}`
          ).join('\n')
        }
        
      } else {
        // Vanlig søk etter anlegg - søk i navn, poststed og adresse
        const searchTerms = query.split(' ').filter(term => term.length > 2)
        let anleggQuery = supabaseClient.from('anlegg').select('*')
        
        // Bygg søk basert på søkeord
        if (searchTerms.length > 0) {
          const searchConditions = searchTerms.map(term => 
            `anleggsnavn.ilike.%${term}%,poststed.ilike.%${term}%,adresse.ilike.%${term}%`
          ).join(',')
          anleggQuery = anleggQuery.or(searchConditions)
        }
        
        const { data: anlegg } = await anleggQuery.limit(10)
        
        if (anlegg && anlegg.length > 0) {
          context += '\n\n=== ANLEGG ===\n'
          context += anlegg.map(a => 
            `Anlegg: ${a.anleggsnavn}\nKunde: ${a.kundenr || 'Ukjent'}\nAdresse: ${a.adresse || 'Ikke oppgitt'}, ${a.postnummer || ''} ${a.poststed || ''}\nKontrolltype: ${a.kontroll_type?.join(', ') || 'Ikke oppgitt'}\nKontrollstatus: ${a.kontroll_status || 'Ikke utført'}\nKontrollmåned: ${a.kontroll_maaned || 'Ikke planlagt'}`
          ).join('\n\n')
        } else {
          context += '\n\n=== ANLEGG ===\nIngen anlegg funnet som matcher søket.\n'
        }
      }
    }

    // Legg til kunnskapsbase-resultater
    if (matches && matches.length > 0) {
      context += '\n\n=== KUNNSKAPSBASE ===\n'
      context += matches.map((m: any) => m.content).join('\n\n')
    }

    if (!context.trim()) {
      context = 'Ingen relevante data funnet i databasen.'
    }

    // 3. Send til Azure OpenAI (gpt-4o - nyeste modell!)
    const completion = await fetch(
      `${AZURE_ENDPOINT}/openai/deployments/${AZURE_GPT_DEPLOYMENT}/chat/completions?api-version=2024-02-01`,
      {
        method: 'POST',
        headers: {
          'api-key': AZURE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Du er en AI-assistent for FireCtrl, en brannvernplattform.

Du hjelper ansatte med å finne informasjon om:
- Kunder (navn, adresser, kontaktinfo)
- Anlegg (navn, adresser, kontrolltyper, kontrollstatus, kontrollmåneder)
- Kontroller og brannsikkerhet
- Standarder og regelverk (f.eks. NS3960)

VIKTIG:
- Svar alltid på norsk
- Vær presis og profesjonell
- Hvis du får spørsmål om antall (f.eks. "hvor mange kunder i Oslo"), tell opp basert på dataen du får
- Hvis du ikke finner relevant informasjon, si det tydelig
- Når du svarer om kunder eller anlegg, inkluder relevante detaljer som adresse, kontaktinfo, kontrollstatus osv.

Relevant informasjon fra databasen:
${context}`,
            },
            {
              role: 'user',
              content: query,
            },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      }
    )

    const completionData = await completion.json()
    const answer = completionData.choices[0].message.content

    return new Response(
      JSON.stringify({
        answer,
        sources: matches?.map((m: any) => ({
          table: m.table_name,
          id: m.record_id,
          similarity: m.similarity,
        })) || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('AI Chat error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'En ukjent feil oppstod',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
