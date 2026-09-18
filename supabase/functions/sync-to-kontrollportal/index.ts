// Synker én QR-kode (med anleggsinfo) til Kontrollportal.
// Kalles fra klienten når en kode kobles/frikobles. Holder KONTROLLPORTAL_API_KEY som secret.
//
// Secrets: KONTROLLPORTAL_URL (default https://www.kontrollportal.no), KONTROLLPORTAL_API_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireUser, corsHeaders } from '../_shared/auth.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const auth = await requireUser(req)
  if (auth instanceof Response) return auth

  try {
    const { kode } = await req.json()
    if (typeof kode !== 'string' || !/^[A-Z0-9]{8}$/.test(kode)) return json({ error: 'Ugyldig kode' }, 400)

    const portalUrl = (Deno.env.get('KONTROLLPORTAL_URL') ?? 'https://www.kontrollportal.no').replace(/\/$/, '')
    const apiKey = Deno.env.get('KONTROLLPORTAL_API_KEY')
    if (!apiKey) return json({ error: 'KONTROLLPORTAL_API_KEY er ikke satt' }, 500)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: rad, error } = await admin
      .from('anlegg_qr_koder')
      .select('kode, merkelapp, anlegg_id, anlegg:anlegg_id(id, anleggsnavn, adresse, postnummer, poststed, kontroll_type, customer:kundenr(navn))')
      .eq('kode', kode)
      .maybeSingle()
    if (error) throw error
    if (!rad) return json({ error: 'Koden finnes ikke' }, 404)

    const anlegg = rad.anlegg as {
      id: string; anleggsnavn: string | null; adresse: string | null; postnummer: string | null; poststed: string | null
      kontroll_type: string[] | null; customer: { navn: string | null } | null
    } | null

    const payload = {
      kode: rad.kode,
      merkelapp: rad.merkelapp,
      // null = koden er frikoblet / blank igjen
      anlegg: anlegg ? {
        firebase_anlegg_id: anlegg.id,
        navn: anlegg.anleggsnavn,
        adresse: [anlegg.adresse, [anlegg.postnummer, anlegg.poststed].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null,
        kunde: anlegg.customer?.navn ?? null,
        kontroll_type: anlegg.kontroll_type ?? [],
      } : null,
    }

    const res = await fetch(`${portalUrl}/api/koder/koble`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(payload),
    })
    const svar = await res.json().catch(() => ({}))
    if (!res.ok) return json({ error: svar?.error ?? `Kontrollportal svarte ${res.status}` }, 502)

    return json({ success: true, portal: svar })
  } catch (err) {
    console.error('sync-to-kontrollportal:', err)
    return json({ error: err instanceof Error ? err.message : 'Ukjent feil' }, 500)
  }
})
