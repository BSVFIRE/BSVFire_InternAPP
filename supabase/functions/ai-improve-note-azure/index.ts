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
    const { note, context } = await req.json()

    if (!note) {
      return new Response(
        JSON.stringify({ error: 'Note text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Azure OpenAI configuration
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT') // e.g., https://your-resource.openai.azure.com
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY')
    const deploymentName = Deno.env.get('AZURE_GPT_DEPLOYMENT_NAME') || 'gpt-4' // Your deployment name

    if (!azureEndpoint || !azureApiKey) {
      throw new Error('Azure OpenAI credentials not configured')
    }

    // Azure OpenAI Chat Completions endpoint
    const apiUrl = `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-06-01`

    // Call Azure OpenAI API to improve the note
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
            content: `Du er en assistent som hjelper brannvernkontrollører med å forbedre og strukturere notater fra brannalarmkontroller. 
            Formater notater på en profesjonell måte, korriger grammatikk, og strukturer informasjonen logisk.
            Behold all viktig teknisk informasjon. Skriv på norsk.`
          },
          {
            role: 'user',
            content: `Forbedre følgende notat fra en ${context || 'brannalarm kontroll'}:\n\n${note}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!azureResponse.ok) {
      const errorText = await azureResponse.text()
      console.error('Azure OpenAI API error:', errorText)
      throw new Error(`Azure OpenAI API error: ${azureResponse.statusText}`)
    }

    const data = await azureResponse.json()
    const suggestion = data.choices[0]?.message?.content || note

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
