import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Call OpenAI API to improve the note
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
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

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.statusText}`)
    }

    const data = await openAIResponse.json()
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
