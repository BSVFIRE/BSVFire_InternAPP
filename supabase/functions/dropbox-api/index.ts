// Dropbox API Proxy - Supabase Edge Function
// Håndterer sikker kommunikasjon med Dropbox API med delt token

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireUser } from '../_shared/auth.ts'

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
  connected_by?: string
  connected_at?: string
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

  console.log(`Calling Dropbox API: ${endpoint}`)
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: fetchBody,
  })

  if (!response.ok) {
    console.error(`Dropbox API error: ${response.status} ${response.statusText} for ${endpoint}`)
  }

  return response
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Krev innlogget ansatt (gatewayen godtar anon-nøkkelen som gyldig JWT)
  const auth = await requireUser(req)
  if (auth instanceof Response) return auth

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
        // Opprett én mappe. Dropbox lager overordnede mapper automatisk, så ett kall holder.
        const config = await getDropboxConfig(supabase)
        if (!config) {
          throw new Error('Dropbox ikke konfigurert')
        }
        const accessToken = await refreshAccessToken(supabase, config)
        const response = await callDropboxAPI('/files/create_folder_v2', accessToken, config.root_namespace_id, { path: params.path, autorename: false })
        const data = await response.json()
        if (!response.ok && !data.error_summary?.includes('path/conflict/folder')) {
          console.error(`Feil ved opprettelse av mappe ${params.path}:`, data.error_summary)
          throw new Error(data.error_summary || `Kunne ikke opprette mappe: ${params.path}`)
        }
        return new Response(JSON.stringify({ success: true, path: params.path }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'create_folders': {
        // Opprett mange mapper i ett kall (files/create_folder_batch). Ett token, ett kall, Dropbox lager
        // overordnede mapper selv. Mapper som finnes fra før regnes som opprettet.
        const config = await getDropboxConfig(supabase)
        if (!config) {
          throw new Error('Dropbox ikke konfigurert')
        }
        const paths: string[] = Array.from(new Set((params.paths ?? []) as string[])).filter(Boolean)
        if (paths.length === 0) {
          return new Response(JSON.stringify({ success: true, created: [], failed: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const accessToken = await refreshAccessToken(supabase, config)
        const created: string[] = []
        const failed: { path: string; error: string }[] = []

        // Dropbox tar inntil 1000 stier per batch
        for (let i = 0; i < paths.length; i += 500) {
          const del = paths.slice(i, i + 500)
          const start = await callDropboxAPI('/files/create_folder_batch', accessToken, config.root_namespace_id, { paths: del, autorename: false, force_async: false })
          let result = await start.json()
          if (!start.ok) throw new Error(result.error_summary || 'create_folder_batch feilet')
          // Ved store batcher svarer Dropbox med en jobb-id vi må polle
          let forsok = 0
          while (result['.tag'] === 'async_job_id' && forsok < 30) {
            await new Promise(r => setTimeout(r, 1000))
            const check = await callDropboxAPI('/files/create_folder_batch/check', accessToken, config.root_namespace_id, { async_job_id: result.async_job_id })
            result = await check.json()
            forsok++
          }
          if (result['.tag'] !== 'complete') throw new Error(`Batch ble ikke ferdig: ${result['.tag'] ?? 'ukjent'}`)
          result.entries.forEach((e: any, j: number) => {
            const path = del[j]
            if (e['.tag'] === 'success' || e.failure?.['.tag'] === 'path' && JSON.stringify(e.failure).includes('conflict')) created.push(path)
            else failed.push({ path, error: JSON.stringify(e.failure ?? e) })
          })
        }
        return new Response(JSON.stringify({ success: failed.length === 0, created, failed }), {
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

        const responseText = await response.text()
        let data: any
        try {
          data = JSON.parse(responseText)
        } catch {
          console.error('Dropbox upload - kunne ikke parse respons:', responseText)
          throw new Error(`Dropbox API feil (${response.status}): ${responseText.substring(0, 200)}`)
        }
        
        if (!response.ok) {
          console.error('Dropbox upload error:', response.status, responseText)
          const errorMsg = data.error_summary || 
                          data.error?.reason?.['.tag'] || 
                          (typeof data.error === 'object' ? JSON.stringify(data.error) : data.error) ||
                          `HTTP ${response.status}`
          throw new Error(`Dropbox feil: ${errorMsg}`)
        }
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

      case 'list_folder': {
        // List filer i mappe
        const config = await getDropboxConfig(supabase)
        if (!config) {
          throw new Error('Dropbox ikke konfigurert')
        }

        const accessToken = await refreshAccessToken(supabase, config)
        
        const response = await callDropboxAPI(
          '/files/list_folder',
          accessToken,
          config.root_namespace_id,
          { 
            path: params.path,
            recursive: params.recursive || false,
            include_deleted: false,
            include_has_explicit_shared_members: false,
            include_mounted_folders: true,
            include_non_downloadable_files: true
          }
        )

        let data = await response.json()
        
        if (!response.ok) {
          // Hvis mappen ikke finnes, returner tom liste
          if (data.error_summary?.includes('path/not_found')) {
            return new Response(JSON.stringify({ 
              success: true, 
              entries: [],
              has_more: false
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
          throw new Error(data.error_summary || 'Kunne ikke liste mappe')
        }

        // Samle alle entries, håndter paginering
        let allEntries = data.entries || []
        
        // Fortsett å hente hvis det er flere resultater
        while (data.has_more && data.cursor) {
          console.log('Henter flere resultater fra Dropbox...')
          const continueResponse = await callDropboxAPI(
            '/files/list_folder/continue',
            accessToken,
            config.root_namespace_id,
            { cursor: data.cursor }
          )
          
          data = await continueResponse.json()
          
          if (!continueResponse.ok) {
            console.error('Feil ved fortsettelse av listing:', data.error_summary)
            break
          }
          
          allEntries = allEntries.concat(data.entries || [])
        }

        return new Response(JSON.stringify({ 
          success: true, 
          entries: allEntries,
          has_more: false
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_temporary_link': {
        // Hent midlertidig nedlastingslenke for fil
        const config = await getDropboxConfig(supabase)
        if (!config) {
          throw new Error('Dropbox ikke konfigurert')
        }

        const accessToken = await refreshAccessToken(supabase, config)
        
        const response = await callDropboxAPI(
          '/files/get_temporary_link',
          accessToken,
          config.root_namespace_id,
          { path: params.path }
        )

        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error_summary || 'Kunne ikke hente nedlastingslenke')
        }

        return new Response(JSON.stringify({ 
          success: true, 
          link: data.link,
          metadata: data.metadata
        }), {
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
