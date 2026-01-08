import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramMessage {
  message_id: number
  from: {
    id: number
    first_name: string
    last_name?: string
    username?: string
  }
  chat: {
    id: number
    type: string
  }
  text?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  })
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

    const update: TelegramUpdate = await req.json()
    const message = update.message

    if (!message || !message.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const chatId = message.chat.id
    const text = message.text.trim()
    const firstName = message.from.first_name

    // Håndter /start kommando
    if (text === '/start') {
      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        `👋 Hei ${firstName}!\n\nVelkommen til BSV Fire Varsler.\n\nFor å motta varsler, registrer deg med din jobb-epost:\n\n\`/registrer din@epost.no\`\n\nDu vil da få varsler når du tildeles nye ordre, oppgaver eller meldinger.`
      )
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Håndter /registrer kommando
    if (text.startsWith('/registrer ')) {
      const email = text.replace('/registrer ', '').trim().toLowerCase()
      
      // Valider e-post format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          `❌ Ugyldig e-postadresse.\n\nPrøv igjen:\n\`/registrer din@epost.no\``
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Sjekk om e-posten finnes i ansatte-tabellen
      const { data: ansatt, error: ansattError } = await supabase
        .from('ansatte')
        .select('id, navn, telegram_chat_id')
        .eq('epost', email)
        .single()

      if (ansattError || !ansatt) {
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          `❌ E-postadressen \`${email}\` er ikke registrert i BSV Fire.\n\nKontakt administrator hvis du mener dette er feil.`
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Sjekk om allerede registrert
      if (ansatt.telegram_chat_id) {
        if (ansatt.telegram_chat_id === chatId.toString()) {
          await sendTelegramMessage(
            TELEGRAM_BOT_TOKEN,
            chatId,
            `✅ Du er allerede registrert, ${ansatt.navn}!\n\nDu vil motta varsler her.`
          )
        } else {
          // Oppdater til ny chat_id (bruker har kanskje ny Telegram-konto)
          await supabase
            .from('ansatte')
            .update({ telegram_chat_id: chatId.toString() })
            .eq('id', ansatt.id)

          await sendTelegramMessage(
            TELEGRAM_BOT_TOKEN,
            chatId,
            `✅ Oppdatert! Hei ${ansatt.navn}!\n\nVarsler vil nå sendes til denne chatten.`
          )
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Registrer chat_id
      const { error: updateError } = await supabase
        .from('ansatte')
        .update({ telegram_chat_id: chatId.toString() })
        .eq('id', ansatt.id)

      if (updateError) {
        console.error('Feil ved oppdatering:', updateError)
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          `❌ Noe gikk galt. Prøv igjen senere.`
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        `🎉 Registrering fullført!\n\nHei ${ansatt.navn}!\n\nDu vil nå motta varsler når du:\n• Tildeles nye ordre\n• Tildeles nye oppgaver\n• Mottar meldinger\n\nGod jobbing! 🔥`
      )

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Håndter /avregistrer kommando
    if (text === '/avregistrer') {
      // Finn ansatt basert på chat_id
      const { data: ansatt } = await supabase
        .from('ansatte')
        .select('id, navn')
        .eq('telegram_chat_id', chatId.toString())
        .single()

      if (!ansatt) {
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          `Du er ikke registrert for varsler.`
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Fjern chat_id
      await supabase
        .from('ansatte')
        .update({ telegram_chat_id: null })
        .eq('id', ansatt.id)

      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        `👋 Du er nå avregistrert, ${ansatt.navn}.\n\nDu vil ikke lenger motta varsler her.\n\nFor å registrere deg igjen:\n\`/registrer din@epost.no\``
      )

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Håndter /hjelp kommando
    if (text === '/hjelp' || text === '/help') {
      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        `📖 *BSV Fire Varsler - Hjelp*\n\n*Kommandoer:*\n\`/start\` - Start boten\n\`/registrer din@epost.no\` - Registrer for varsler\n\`/avregistrer\` - Stopp varsler\n\`/hjelp\` - Vis denne hjelpen\n\n*Varsler:*\nDu får varsler når du:\n• Tildeles nye ordre\n• Tildeles nye oppgaver\n• Mottar meldinger`
      )
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Ukjent kommando
    await sendTelegramMessage(
      TELEGRAM_BOT_TOKEN,
      chatId,
      `Ukjent kommando. Skriv \`/hjelp\` for å se tilgjengelige kommandoer.`
    )

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
