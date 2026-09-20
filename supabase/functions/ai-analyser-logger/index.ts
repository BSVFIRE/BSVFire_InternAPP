// Analyserer grupperte feil fra system_logs med Azure OpenAI.
// Klienten (Systemlogg-siden) sender inn de mest hyppige feilgruppene i valgt periode;
// vi ber modellen om sannsynlig årsak, alvorlighet og konkret forslag til retting per gruppe.
// Kun administratorer (samme som RLS på system_logs).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAdmin, corsHeaders } from '../_shared/auth.ts'

interface Gruppe {
  id: string
  melding: string
  antall: number
  nivaa: 'error' | 'warn'
  modul?: string | null
  sider?: string[]
  brukere?: number
  eksempelData?: string | null
  forst?: string
  sist?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const { grupper, periode } = (await req.json()) as { grupper: Gruppe[]; periode?: string }
    if (!Array.isArray(grupper) || grupper.length === 0) return json({ error: 'Ingen feilgrupper å analysere' }, 400)

    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY')
    const deploymentName = Deno.env.get('AZURE_GPT_DEPLOYMENT_NAME') || 'gpt-4'
    if (!azureEndpoint || !azureApiKey) return json({ error: 'Azure OpenAI er ikke konfigurert' }, 500)

    // Begrens mengden vi sender: maks 25 grupper, kort eksempeldata per gruppe
    const utvalg = grupper.slice(0, 25).map(g => ({
      id: g.id,
      nivaa: g.nivaa,
      antall: g.antall,
      modul: g.modul || null,
      brukere: g.brukere ?? null,
      forst: g.forst ?? null,
      sist: g.sist ?? null,
      sider: (g.sider || []).slice(0, 5),
      melding: g.melding.slice(0, 600),
      eksempelData: g.eksempelData ? g.eksempelData.slice(0, 800) : null,
    }))

    const systemPrompt = `Du er en senior frontend-utvikler som feilsøker en React 18 + TypeScript + Vite-app («FireCtrl») som bruker Supabase (Postgres med RLS, Auth, Edge Functions i Deno), Tailwind, react-router, MSAL for Microsoft-innlogging, Dropbox-API og jsPDF.
Du får feilgrupper fra appens egen systemlogg (nettleserfeil som er fanget av window.onerror, unhandledrejection og console.error, pluss logger.warn/error fra koden).
For hver gruppe skal du gi:
- "tittel": kort, menneskelig navn på problemet (maks 8 ord)
- "alvorlighet": "kritisk" (brukere mister data/kan ikke jobbe), "hoy" (funksjon virker ikke), "middels" (irriterende/ustabilt), "lav" (støy/ufarlig)
- "arsak": mest sannsynlig årsak, 1–3 setninger. Vær konkret: nevn Supabase-feilkoder (PGRST…, 42501 = RLS avvist, 23505 = unik-konflikt, 23503 = fremmednøkkel), nettverk/offline, null-verdier, feil i datatyper osv.
- "forslag": konkret forslag til retting i koden eller databasen, 1–4 setninger. Hvis det er RLS: si hvilken policy som trolig mangler. Hvis det er null-sjekk: si hvor. Hvis det er støy som bør filtreres bort fra loggen: si det.
- "stoy": true hvis dette trolig ikke er en reell feil i appen (nettleserutvidelser, ResizeObserver, avbrutte fetch ved navigasjon, offline) og bør ignoreres/filtreres.
Til slutt "oppsummering": 2–4 setninger om helhetsbildet og hva som bør prioriteres først.
Svar KUN med gyldig JSON på formen {"oppsummering": string, "grupper": [{"id": string, "tittel": string, "alvorlighet": string, "arsak": string, "forslag": string, "stoy": boolean}]}. Skriv på norsk bokmål.`

    const userPrompt = `Periode: ${periode || 'ukjent'}\n\nFeilgrupper (sortert etter antall):\n${JSON.stringify(utvalg, null, 1)}`

    const res = await fetch(`${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-06-01`, {
      method: 'POST',
      headers: { 'api-key': azureApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.2,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Azure OpenAI-feil', res.status, text.slice(0, 300))
      return json({ error: `Azure OpenAI svarte ${res.status}` }, 502)
    }

    const data = await res.json()
    const content: string = data.choices?.[0]?.message?.content || '{}'
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      // Modellen kan pakke JSON i ```-blokk selv med response_format
      const m = content.match(/\{[\s\S]*\}/)
      parsed = m ? JSON.parse(m[0]) : { oppsummering: content, grupper: [] }
    }
    return json(parsed)
  } catch (e) {
    console.error('ai-analyser-logger', e)
    return json({ error: e instanceof Error ? e.message : 'Ukjent feil' }, 500)
  }
})
