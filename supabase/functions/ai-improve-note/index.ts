import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireUser } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AZURE_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_KEY = Deno.env.get('AZURE_OPENAI_KEY') || Deno.env.get('AZURE_OPENAI_API_KEY')
const AZURE_GPT_DEPLOYMENT = Deno.env.get('AZURE_GPT_DEPLOYMENT_NAME') || 'gpt-4o'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Krev innlogget ansatt (gatewayen godtar anon-nøkkelen som gyldig JWT)
  const auth = await requireUser(req)
  if (auth instanceof Response) return auth

  try {
    const { note, context } = await req.json()

    if (!note) {
      return new Response(
        JSON.stringify({ error: 'Note text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call Azure OpenAI API to improve the note
    const response = await fetch(
      `${AZURE_ENDPOINT}/openai/deployments/${AZURE_GPT_DEPLOYMENT}/chat/completions?api-version=2024-02-01`,
      {
        method: 'POST',
        headers: {
          'api-key': AZURE_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Du rydder opp i notater fra brannvernkontrollører. 
Regler:
- Rett skrivefeil og grammatikk
- Gjør setninger lesbare
- Behold ALL informasjon fra originalen
- IKKE legg til overskrifter, maler, datoer, signaturer eller annen struktur
- IKKE legg til informasjon som ikke var i originalen
- Returner KUN den oppryddede teksten, kort og konsist
- Skriv på norsk`
            },
            {
              role: 'user',
              content: note
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Azure API error:', errorText)
      throw new Error(`Azure API error: ${response.statusText}`)
    }

    const data = await response.json()
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
