import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireUser } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Krev innlogget ansatt (gatewayen godtar anon-nøkkelen som gyldig JWT)
  const auth = await requireUser(req)
  if (auth instanceof Response) return auth

  try {
    console.log('=== PDF Parse Request Received ===')
    console.log('Method:', req.method)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))
    
    const body = await req.json()
    console.log('Body keys:', Object.keys(body))
    console.log('FileName:', body.fileName)
    console.log('PDF Base64 length:', body.pdfBase64?.length || 0)

    // Sjekk miljøvariabler
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')
    const azureKey = Deno.env.get('AZURE_OPENAI_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('Environment check:')
    console.log('- AZURE_OPENAI_ENDPOINT:', azureEndpoint ? 'SET' : 'MISSING')
    console.log('- AZURE_OPENAI_KEY:', azureKey ? 'SET' : 'MISSING')
    console.log('- SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING')
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'SET' : 'MISSING')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test successful - Edge Function is reachable',
        received: {
          fileName: body.fileName,
          pdfSize: body.pdfBase64?.length || 0,
        },
        environment: {
          azureEndpoint: azureEndpoint ? 'SET' : 'MISSING',
          azureKey: azureKey ? 'SET' : 'MISSING',
          supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
          supabaseKey: supabaseKey ? 'SET' : 'MISSING',
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        details: error.toString(),
        stack: error.stack,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
