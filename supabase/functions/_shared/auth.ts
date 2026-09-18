// Delt autentisering for Edge Functions
//
// Supabase-gatewayen verifiserer bare at Authorization-headeren inneholder en gyldig JWT –
// og anon-nøkkelen (som ligger i klient-bundelen) er en gyldig JWT. Derfor må hver funksjon
// selv sjekke at kallet kommer fra en innlogget bruker som er registrert som ansatt.
//
// Bruk:
//   const auth = await requireUser(req)
//   if (auth instanceof Response) return auth
//   // auth.user  = Supabase auth-bruker
//   // auth.ansatt = rad fra ansatte-tabellen

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export interface Ansatt {
  id: string
  navn: string
  epost: string
  rolle: string | null
}

export interface AuthContext {
  user: { id: string; email?: string }
  ansatt: Ansatt
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Verifiserer at kallet kommer fra en innlogget bruker som finnes i ansatte-tabellen.
 * Returnerer en ferdig 401/403-Response hvis ikke, ellers bruker + ansatt.
 */
export async function requireUser(req: Request): Promise<AuthContext | Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonError(500, 'Supabase-miljøvariabler mangler')
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) {
    return jsonError(401, 'Mangler Authorization-header')
  }

  // getUser() validerer signatur og utløp mot Auth-serveren.
  // Anon-nøkkelen har ingen bruker (sub) og avvises her.
  const authClient = createClient(supabaseUrl, anonKey)
  const { data: { user }, error } = await authClient.auth.getUser(jwt)
  if (error || !user) {
    return jsonError(401, 'Ugyldig eller utløpt sesjon')
  }

  // Krev at brukeren er registrert som ansatt (auth_user_id ble lagt til i ansatte 2026-09-18)
  const adminClient = createClient(supabaseUrl, serviceKey)
  const { data: ansatt } = await adminClient
    .from('ansatte')
    .select('id, navn, epost, rolle')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!ansatt) {
    return jsonError(403, 'Brukeren er ikke registrert som ansatt')
  }

  return { user: { id: user.id, email: user.email }, ansatt }
}

/**
 * Som requireUser, men krever i tillegg admin-rolle.
 */
export async function requireAdmin(req: Request): Promise<AuthContext | Response> {
  const auth = await requireUser(req)
  if (auth instanceof Response) return auth
  if (auth.ansatt.rolle !== 'admin' && auth.ansatt.rolle !== 'administrator') {
    return jsonError(403, 'Krever administrator-rolle')
  }
  return auth
}
