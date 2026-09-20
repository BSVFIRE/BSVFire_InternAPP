import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireUser } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Krev innlogget ansatt (gatewayen godtar anon-nøkkelen som gyldig JWT)
  const auth = await requireUser(req)
  if (auth instanceof Response) return auth

  try {
    const { keywords, anleggType, tekniker, mode = 'sprak' } = await req.json()

    console.log('Received request:', { keywords: keywords?.substring(0, 100), anleggType, tekniker })

    if (!keywords) {
      return new Response(
        JSON.stringify({ error: 'Keywords are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Azure OpenAI configuration
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY')
    const deploymentName = Deno.env.get('AZURE_GPT_DEPLOYMENT_NAME') || 'gpt-4'

    console.log('Azure config:', { 
      hasEndpoint: !!azureEndpoint, 
      hasApiKey: !!azureApiKey, 
      deploymentName 
    })

    if (!azureEndpoint || !azureApiKey) {
      console.error('Missing Azure credentials')
      return new Response(
        JSON.stringify({ error: 'Azure OpenAI credentials not configured. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY in Supabase secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Azure OpenAI Chat Completions endpoint
    const apiUrl = `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-06-01`

    // To modus:
    //  'sprak'    (standard) – lett språkvask: rett skrivefeil, bedre setningsbygning, profesjonell tone. Samme innhold og lengde.
    //  'stikkord'           – skriv ut en full rapport fra stikkord (den gamle oppførselen).
    const systemPrompt = mode === 'stikkord'
      ? `Du er en erfaren servicetekniker på brannalarm og sikkerhetsanlegg som skriver servicerapporter til kunder.
Du får stikkord og skriver dem ut til en ryddig rapport med avsnittene Utført arbeid, Funn og Konklusjon.
Hold deg strengt til det stikkordene sier – ikke finn på målinger, komponenter eller anbefalinger som ikke er nevnt.
Skriv kort og konkret på norsk bokmål. Ingen innledning om dato og formål med mindre det står i stikkordene.`
      : `Du er språkvasker for servicerapporter fra en brannteknisk servicebedrift.
Du får teknikerens egen tekst. Oppgaven din er BARE å gjøre teksten lettere å lese for kunden:
- rett skrivefeil og grammatikk
- del opp lange setninger, rydd i setningsbygning
- gjør tonen profesjonell og nøytral (fjern muntlige uttrykk)
- behold avsnittene, rekkefølgen og teknikerens formuleringer der de er gode
Du skal IKKE: legge til nye avsnitt eller overskrifter, legge til innhold, målinger eller anbefalinger som ikke står der,
gjøre teksten vesentlig lengre, eller endre fakta, tall, komponentnavn og adresser.
Svar kun med den ferdige teksten, uten forklaring, uten anførselstegn og uten overskrifter du selv har laget.`

    const userPrompt = mode === 'stikkord'
      ? `Skriv ut en servicerapport fra disse stikkordene:\n\n${keywords}\n\n${anleggType ? `Anlegg: ${anleggType}\n` : ''}${tekniker ? `Tekniker: ${tekniker}` : ''}`
      : `Språkvask denne teksten. Behold innhold og lengde:\n\n${keywords}`

    // Call Azure OpenAI API
    const azureResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'api-key': azureApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: mode === 'stikkord' ? 0.5 : 0.2,
        max_tokens: 2000,
      }),
    })

    if (!azureResponse.ok) {
      const errorText = await azureResponse.text()
      console.error('Azure OpenAI API error:', {
        status: azureResponse.status,
        statusText: azureResponse.statusText,
        error: errorText
      })
      return new Response(
        JSON.stringify({ 
          error: `Azure OpenAI API error: ${azureResponse.statusText}`,
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await azureResponse.json()
    console.log('Azure response received, generating report...')
    const improvedReport = data.choices[0]?.message?.content || keywords

    return new Response(
      JSON.stringify({ improvedReport }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in ai-improve-servicerapport:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        type: error.name || 'Error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
