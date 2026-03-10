import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const PROFF_API_URL = 'https://api.proff.no/api'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Les token på nytt for hver request (i tilfelle det ble satt etter deploy)
    const token = Deno.env.get('PROFF_API_TOKEN')
    
    if (!token) {
      console.error('PROFF_API_TOKEN mangler i secrets')
      return new Response(
        JSON.stringify({ error: 'PROFF_API_TOKEN er ikke konfigurert i Supabase secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Token loaded, length: ${token.length}, starts with: ${token.substring(0, 5)}...`)

    const url = new URL(req.url)
    const endpoint = url.searchParams.get('endpoint')
    const orgnr = url.searchParams.get('orgnr')

    if (!endpoint) {
      throw new Error('Mangler endpoint parameter')
    }

    let proffUrl: string

    switch (endpoint) {
      case 'company':
        if (!orgnr) throw new Error('Mangler orgnr parameter')
        proffUrl = `${PROFF_API_URL}/companies/register/NO/${orgnr}`
        break
      case 'search':
        const query = url.searchParams.get('q')
        const location = url.searchParams.get('location')
        const companyType = url.searchParams.get('companyType')
        const page = url.searchParams.get('page') || '1'
        const pageSize = url.searchParams.get('pageSize') || '50'
        
        const searchParams = new URLSearchParams()
        
        // Proff API bruker 'query' for fritekst-søk
        if (query) searchParams.append('query', query)
        if (location) searchParams.append('location', location)
        if (companyType) searchParams.append('companyType', companyType)
        searchParams.append('pageNumber', page)
        searchParams.append('pageSize', pageSize)
        
        proffUrl = `${PROFF_API_URL}/companies/register/NO?${searchParams.toString()}`
        break
      default:
        throw new Error(`Ukjent endpoint: ${endpoint}`)
    }

    console.log(`Proff API request: ${proffUrl}`)

    const proffResponse = await fetch(proffUrl, {
      headers: {
        'Authorization': `Token ${token}`,
        'Accept': 'application/json',
      },
    })

    if (!proffResponse.ok) {
      const errorText = await proffResponse.text()
      console.error(`Proff API error: ${proffResponse.status} - ${errorText}`)
      
      return new Response(
        JSON.stringify({ 
          error: `Proff API feil: ${proffResponse.status}`,
          details: errorText 
        }),
        { 
          status: proffResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await proffResponse.json()

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Proff proxy error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Ukjent feil i Proff proxy',
        stack: error?.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
