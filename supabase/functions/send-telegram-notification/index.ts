import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramNotificationRequest {
  type: 'ordre' | 'oppgave' | 'melding'
  tekniker_id: string
  title: string
  message: string
  link?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { type, tekniker_id, title, message, link }: TelegramNotificationRequest = await req.json()

    if (!tekniker_id || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: tekniker_id, title, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hent tekniker med telegram_chat_id
    const { data: ansatt, error: ansattError } = await supabase
      .from('ansatte')
      .select('id, navn, telegram_chat_id')
      .eq('id', tekniker_id)
      .single()

    if (ansattError || !ansatt) {
      return new Response(
        JSON.stringify({ error: 'Tekniker ikke funnet', details: ansattError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!ansatt.telegram_chat_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Tekniker ${ansatt.navn} har ikke konfigurert Telegram` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Bygg Telegram-melding med emoji basert på type
    const emoji = type === 'ordre' ? '📋' : type === 'oppgave' ? '✅' : '💬'
    const typeText = type === 'ordre' ? 'Ny Ordre' : type === 'oppgave' ? 'Ny Oppgave' : 'Ny Melding'
    
    let telegramMessage = `${emoji} *${typeText}*\n\n`
    telegramMessage += `*${title}*\n\n`
    telegramMessage += message
    
    if (link) {
      telegramMessage += `\n\n[Åpne i BSV Fire](${link})`
    }

    // Send melding via Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ansatt.telegram_chat_id,
        text: telegramMessage,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    })

    const telegramResult = await telegramResponse.json()

    if (!telegramResult.ok) {
      console.error('Telegram API error:', telegramResult)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send Telegram message',
          details: telegramResult 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Varsel sendt til ${ansatt.navn}` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
