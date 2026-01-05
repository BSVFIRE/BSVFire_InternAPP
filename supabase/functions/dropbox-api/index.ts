// Dropbox API Proxy - Supabase Edge Function
// Håndterer sikker kommunikasjon med Dropbox API med delt token

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface DropboxConfig {
  access_token: string
  refresh_token: string
  token_expiry: string | null
  root_namespace_id: string | null
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
}

// Hent Dropbox config fra database
async function getDropboxConfig(supabase: any): Promise<DropboxConfig | null> {
  const { data, error } = await supabase
    .from('dropbox_config')
    .select('*')
    .single()

  if (error || !data) {
    console.error('Ingen Dropbox-konfigurasjon funnet:', error)
    return null
  }

  return data
}

// Oppdater tokens i database
async function updateTokens(
  supabase: any, 
  accessToken: string, 
  refreshToken: string | null,
  expiresIn: number
): Promise<void> {
  const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString()
  
  const updateData: any = {
    access_token: accessToken,
    token_expiry: tokenExpiry,
    updated_at: new Date().toISOString()
  }
  
  if (refreshToken) {
    updateData.refresh_token = refreshToken
  }

  const { error } = await supabase
    .from('dropbox_config')
    .update(updateData)
    .eq('id', (await supabase.from('dropbox_config').select('id').single()).data.id)

  if (error) {
    console.error('Feil ved oppdatering av tokens:', error)
  }
}

// Refresh access token hvis utløpt
async function refreshAccessToken(supabase: any, config: DropboxConfig): Promise<string> {
  const appKey = Deno.env.get('DROPBOX_APP_KEY')
  const appSecret = Deno.env.get('DROPBOX_APP_SECRET')

  if (!appKey || !appSecret) {
    throw new Error('Dropbox credentials ikke konfigurert')
  }

  // Sjekk om token er utløpt
  if (config.token_expiry) {
    const expiry = new Date(config.token_expiry)
    const now = new Date()
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)
    
    if (expiry > fiveMinutesFromNow) {
      // Token er fortsatt gyldig
      return config.access_token
    }
  }

  console.log('Refreshing Dropbox access token...')

  // Refresh token
  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refresh_token,
      client_id: appKey,
      client_secret: appSecret,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Kunne ikke fornye Dropbox token: ${response.status} ${errorText}`)
  }

  const data: TokenResponse = await response.json()
  
  // Oppdater tokens i database
  await updateTokens(supabase, data.access_token, data.refresh_token || null, data.expires_in)

  return data.access_token
}

// Hent root namespace ID for team space
async function getRootNamespaceId(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(null),
    })

    if (!response.ok) {
      console.error('Kunne ikke hente account info')
      return null
    }

    const data = await response.json()
    return data.root_info?.root_namespace_id || null
  } catch (error) {
    console.error('Feil ved henting av namespace:', error)
    return null
  }
}

// Kall Dropbox API
async function callDropboxAPI(
  endpoint: string,
  accessToken: string,
  rootNamespaceId: string | null,
  body?: any,
  isContentUpload: boolean = false
): Promise<Response> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
  }

  // Legg til path root for team space
  if (rootNamespaceId) {
    headers['Dropbox-API-Path-Root'] = JSON.stringify({
      '.tag': 'namespace_id',
      'namespace_id': rootNamespaceId
    })
  }

  let url: string
  let fetchBody: any

  if (isContentUpload) {
    // Content upload endpoint
    url = `https://content.dropboxapi.com/2${endpoint}`
    headers['Content-Type'] = 'application/octet-stream'
    headers['Dropbox-API-Arg'] = JSON.stringify(body.apiArg)
    fetchBody = body.content // Binary content
  } else {
    // Regular API endpoint
    url = `https://api.dropboxapi.com/2${endpoint}`
    headers['Content-Type'] = 'application/json'
    fetchBody = body ? JSON.stringify(body) : JSON.stringify(null)
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: fetchBody,
  })

  return response
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Opprett Supabase client med service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    const { action, ...params } = await req.json()

    // Handle different actions
    switch (action) {
      case 'check_status': {
        // Sjekk om Dropbox er konfigurert
        const config = await getDropboxConfig(supabase)
        return new Response(JSON.stringify({
          connected: !!config,
          connected_by: config?.connected_by || null,
          connected_at: config?.connected_at || null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'oauth_callback': {
        // Håndter OAuth callback - lagre tokens
        const { code, redirect_uri } = params
        const appKey = Deno.env.get('DROPBOX_APP_KEY')
        const appSecret = Deno.env.get('DROPBOX_APP_SECRET')

        if (!appKey || !appSecret) {
          throw new Error('Dropbox credentials ikke konfigurert')
        }

        // Bytt code mot tokens
        const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            client_id: appKey,
            client_secret: appSecret,
            redirect_uri,
          }),
        })

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text()
          throw new Error(`Token exchange failed: ${errorText}`)
        }

        const tokenData: TokenResponse = await tokenResponse.json()

        // Hent root namespace
        const rootNamespaceId = await getRootNamespaceId(tokenData.access_token)

        // Lagre i database (upsert - oppdater hvis finnes, opprett hvis ikke)
        const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        
        // Slett eksisterende config først
        await supabase.from('dropbox_config').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        
        // Opprett ny config
        const { error: insertError } = await supabase.from('dropbox_config').insert({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || '',
          token_expiry: tokenExpiry,
          root_namespace_id: rootNamespaceId,
          connected_by: params.user_email || 'unknown',
        })

        if (insertError) {
          throw new Error(`Kunne ikke lagre tokens: ${insertError.message}`)
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'disconnect': {
        // Fjern Dropbox-tilkobling
        await supabase.from('dropbox_config').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'create_folder': {
        // Opprett mappe
        const config = await getDropboxConfig(supabase)
        if (!config) {
          throw new Error('Dropbox ikke konfigurert')
        }

        const accessToken = await refreshAccessToken(supabase, config)
        
        const response = await callDropboxAPI(
          '/files/create_folder_v2',
          accessToken,
          config.root_namespace_id,
          { path: params.path, autorename: false }
        )

        const data = await response.json()
        
        // Ignorer feil hvis mappen allerede eksisterer
        if (!response.ok && !data.error_summary?.includes('path/conflict/folder')) {
          throw new Error(data.error_summary || 'Kunne ikke opprette mappe')
        }

        return new Response(JSON.stringify({ success: true, path: params.path }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'upload_file': {
        // Last opp fil
        const config = await getDropboxConfig(supabase)
        if (!config) {
          throw new Error('Dropbox ikke konfigurert')
        }

        const accessToken = await refreshAccessToken(supabase, config)
        
        // Decode base64 content
        const binaryContent = Uint8Array.from(atob(params.content), c => c.charCodeAt(0))

        const response = await callDropboxAPI(
          '/files/upload',
          accessToken,
          config.root_namespace_id,
          {
            apiArg: {
              path: params.path,
              mode: 'overwrite',
              autorename: false,
              mute: false,
            },
            content: binaryContent
          },
          true // isContentUpload
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error_summary || 'Kunne ikke laste opp fil')
        }

        const data = await response.json()
        return new Response(JSON.stringify({ 
          success: true, 
          path: data.path_display,
          size: data.size 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_auth_url': {
        // Generer OAuth URL
        const appKey = Deno.env.get('DROPBOX_APP_KEY')
        if (!appKey) {
          throw new Error('Dropbox App Key ikke konfigurert')
        }

        const authUrl = `https://www.dropbox.com/oauth2/authorize?` +
          `client_id=${appKey}&` +
          `redirect_uri=${encodeURIComponent(params.redirect_uri)}&` +
          `response_type=code&` +
          `token_access_type=offline`

        return new Response(JSON.stringify({ auth_url: authUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'rename_folder': {
        // Endre navn på mappe (flytt fra gammel til ny sti)
        const config = await getDropboxConfig(supabase)
        if (!config) {
          throw new Error('Dropbox ikke konfigurert')
        }

        const accessToken = await refreshAccessToken(supabase, config)
        
        const response = await callDropboxAPI(
          '/files/move_v2',
          accessToken,
          config.root_namespace_id,
          { 
            from_path: params.from_path, 
            to_path: params.to_path,
            autorename: false,
            allow_ownership_transfer: false
          }
        )

        const data = await response.json()
        
        // Håndter feil
        if (!response.ok) {
          // Hvis mappen ikke finnes, returner suksess (ingenting å flytte)
          if (data.error_summary?.includes('path/not_found')) {
            return new Response(JSON.stringify({ 
              success: true, 
              skipped: true,
              message: 'Mappen eksisterer ikke i Dropbox' 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
          throw new Error(data.error_summary || 'Kunne ikke endre mappenavn')
        }

        return new Response(JSON.stringify({ 
          success: true, 
          from_path: params.from_path,
          to_path: data.metadata?.path_display || params.to_path 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        throw new Error(`Ukjent action: ${action}`)
    }

  } catch (error) {
    console.error('Dropbox API error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
