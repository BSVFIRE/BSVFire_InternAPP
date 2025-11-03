// PowerOffice API Proxy - Supabase Edge Function
// Håndterer CORS og sikker kommunikasjon med PowerOffice API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}

interface PowerOfficeConfig {
  applicationKey: string
  clientKey: string
  subscriptionKey: string
}

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

// Cache for access token (i minnet)
let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(config: PowerOfficeConfig): Promise<string> {
  // Sjekk cache
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }

  // Hent nytt token
  const credentials = btoa(`${config.applicationKey}:${config.clientKey}`)
  
  const response = await fetch('https://goapi.poweroffice.net/Demo/OAuth/Token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get access token: ${response.status} ${errorText}`)
  }

  const data: TokenResponse = await response.json()
  
  // Cache token (med 1 minutt buffer)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000
  }

  return data.access_token
}

async function callPowerOfficeAPI(
  endpoint: string,
  method: string,
  config: PowerOfficeConfig,
  body?: any
): Promise<Response> {
  const accessToken = await getAccessToken(config)
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Ocp-Apim-Subscription-Key': config.subscriptionKey
  }

  if (body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`https://goapi.poweroffice.net/demo/v2${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  return response
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Hent PowerOffice credentials fra environment
    const config: PowerOfficeConfig = {
      applicationKey: Deno.env.get('POWEROFFICE_APPLICATION_KEY') || '',
      clientKey: Deno.env.get('POWEROFFICE_CLIENT_KEY') || '',
      subscriptionKey: Deno.env.get('POWEROFFICE_SUBSCRIPTION_KEY') || ''
    }

    if (!config.applicationKey || !config.clientKey || !config.subscriptionKey) {
      throw new Error('Missing PowerOffice credentials in environment')
    }

    // Parse request
    const url = new URL(req.url)
    const endpoint = url.pathname.replace('/poweroffice-proxy', '') || '/customers'
    const method = req.method
    
    let body = null
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      body = await req.json()
    }

    // Kall PowerOffice API
    const response = await callPowerOfficeAPI(endpoint, method, config, body)
    
    // Log response for debugging
    console.log('PowerOffice API response status:', response.status)
    
    const data = await response.json()
    
    // Log error details if not successful
    if (!response.ok) {
      console.error('PowerOffice API error:', data)
    }

    // Return response
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: response.status
    })

  } catch (error) {
    console.error('PowerOffice proxy error:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
})
