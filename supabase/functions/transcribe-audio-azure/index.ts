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
    const formData = await req.formData()
    const audioFile = formData.get('file')

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'Audio file is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Azure OpenAI configuration
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT') // e.g., https://your-resource.openai.azure.com
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY')
    const deploymentName = Deno.env.get('AZURE_WHISPER_DEPLOYMENT_NAME') || 'whisper' // Your deployment name

    if (!azureEndpoint || !azureApiKey) {
      throw new Error('Azure OpenAI credentials not configured')
    }

    // Create FormData for Azure OpenAI Whisper API
    const whisperFormData = new FormData()
    whisperFormData.append('file', audioFile)
    whisperFormData.append('language', 'no') // Norwegian
    whisperFormData.append('response_format', 'json')

    // Azure OpenAI Whisper endpoint
    const apiUrl = `${azureEndpoint}/openai/deployments/${deploymentName}/audio/transcriptions?api-version=2024-06-01`

    // Call Azure OpenAI Whisper API
    const whisperResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'api-key': azureApiKey,
      },
      body: whisperFormData,
    })

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text()
      console.error('Azure Whisper API error:', errorText)
      throw new Error(`Azure Whisper API error: ${whisperResponse.statusText} - ${errorText}`)
    }

    const data = await whisperResponse.json()

    return new Response(
      JSON.stringify({ text: data.text }),
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
