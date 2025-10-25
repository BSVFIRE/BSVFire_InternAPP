import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { keywords, anleggType, tekniker } = await req.json()

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

    const systemPrompt = `Du er en profesjonell tekniker som skriver servicerapporter for brannalarmanlegg og sikkerhetssystemer.
Din oppgave er å ta imot stikkord og lage en strukturert, profesjonell servicerapport.

Rapporten skal følge denne strukturen:

1. INNLEDNING
   - Kort beskrivelse av formålet med servicebesøket
   - Dato og tidspunkt for utførelse

2. UTFØRT ARBEID
   - Detaljert beskrivelse av utførte arbeider
   - Komponenter og systemer som er kontrollert
   - Målinger og tester som er gjennomført

3. FUNN OG OBSERVASJONER
   - Eventuelle avvik eller feil som er funnet
   - Tilstand på utstyr og komponenter
   - Anbefalinger for utbedringer

4. KONKLUSJON
   - Oppsummering av servicebesøket
   - Status på anlegget
   - Anbefaling for neste service

Skriv på profesjonelt norsk, vær presis og teknisk korrekt. Bruk fagterminologi der det er relevant.`

    const userPrompt = `Lag en servicerapport basert på følgende stikkord:

${keywords}

${anleggType ? `Type anlegg: ${anleggType}` : ''}
${tekniker ? `Tekniker: ${tekniker}` : ''}

Skriv en komplett, profesjonell servicerapport basert på informasjonen over.`

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
        temperature: 0.7,
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
