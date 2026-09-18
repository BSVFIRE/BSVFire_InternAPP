import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = 'https://snyzduzqyjsllzvwuahh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNueXpkdXpxeWpzbGx6dnd1YWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3ODk0NzEsImV4cCI6MjA2MDM2NTQ3MX0.WLOcnCSiNHTsFIf0S_2hM-y3QyEnM6lzGn4vcIXMLuc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  // Realtime subscriptions will automatically reconnect when connection is restored
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

/**
 * Headers for direkte fetch-kall mot Edge Functions.
 * Edge Functions krever nå innlogget bruker (sesjonstoken), ikke anon-nøkkelen.
 * supabase.functions.invoke() gjør dette automatisk; bruk denne for rå fetch.
 */
export async function getFunctionAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Ikke innlogget')
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'apikey': supabaseAnonKey,
  }
}

/**
 * Typet variant av samme klient (samme instans, samme sesjon).
 *
 * `database.types.ts` er generert fra prod-skjemaet med
 *   supabase gen types typescript --linked --schema public > src/lib/database.types.ts
 * og gjør at tabell-/kolonnenavn og nullability sjekkes av kompilatoren.
 *
 * Bruk `db` i ny kode og når du rydder i en fil. `supabase` (utypet) beholdes
 * inntil eksisterende filer er migrert – ~290 steder antar i dag at kolonner
 * ikke kan være null, og det må rettes fil for fil.
 */
export const db = supabase as unknown as SupabaseClient<Database>

export type { Database }
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
