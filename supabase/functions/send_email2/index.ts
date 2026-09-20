import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { requireUser } from '../_shared/auth.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Resend godtar maks 40 MB per e-post (vedlegg + innhold). Vi stopper litt under.
const MAKS_VEDLEGG_BYTES = 35 * 1024 * 1024

function tilBase64(bytes: Uint8Array): string {
  // btoa(String.fromCharCode(...bytes)) sprenger stacken på store PDF-er – gå i biter
  let bin = ''
  const del = 0x8000
  for (let i = 0; i < bytes.length; i += del) bin += String.fromCharCode(...bytes.subarray(i, i + del))
  return btoa(bin)
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Krev innlogget ansatt (gatewayen godtar anon-nøkkelen som gyldig JWT)
  const auth = await requireUser(req)
  if (auth instanceof Response) return auth

  try {
    const { to, subject, body, attachment, attachments, attachment_paths, reply_to } = await req.json();

  // Valider mottakere – funksjonen skal ikke kunne brukes som åpen e-postrelé
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const recipients: string[] = Array.isArray(to) ? to : [to]
  if (recipients.length === 0 || recipients.some((r) => typeof r !== 'string' || !emailRegex.test(r))) {
    return new Response(JSON.stringify({ error: 'Ugyldig mottakeradresse' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (!subject || typeof subject !== 'string') {
    return new Response(JSON.stringify({ error: 'Emne mangler' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = Deno.env.get('RESEND2_API_KEY');
  const currentYear = new Date().getFullYear();

  const standardText = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
      <p>Hei,</p>
      <p>Vedlagt ligger servicerapport etter utført årskontroll ${currentYear}.</p>
      <p>Kontroll utført iht. gjeldende forskrifter.</p>
      <p>Skulle noe være uklart så ta kontakt:<br>
      <a href="mailto:mail@bsvfire.no" style="color: #0066cc; text-decoration: none;">mail@bsvfire.no</a><br>
      <a href="tel:90046600" style="color: #0066cc; text-decoration: none;">900 46 600</a></p>
    </div>
  `;

  const plainText = `
Hei,

Vedlagt ligger servicerapport etter utført årskontroll ${currentYear}.
Kontroll utført iht. gjeldende forskrifter.

Skulle noe være uklart så ta kontakt:
mail@bsvfire.no
telefon 900 46 600

${body ? body.replace(/<[^>]+>/g, '') + '\n' : ''}

Brannteknisk Service og Vedlikehold AS
Org.nr: 921 044 879
Telefon: 900 46 600
E-post: mail@bsvfire.no
Web: www.bsvfire.no
`;

  const htmlSignature = `
<p style="margin-top:2em;">
  Med vennlig hilsen<br>
  <strong>Brannteknisk Service og Vedlikehold AS</strong><br>
  Org.nr: 921 044 879<br>
  Telefon: 900 46 600<br>
  E-post: mail@bsvfire.no<br>
  Web: www.bsvfire.no
</p>
`;

  const textSignature = `
Med vennlig hilsen
Brannteknisk Service og Vedlikehold AS
Org.nr: 921 044 879
Telefon: 900 46 600
E-post: mail@bsvfire.no
Web: www.bsvfire.no
`;

  const replyToAddress = reply_to || 'mail@bsvfire.no';

  // Bygg attachments-array hvis det finnes
  let allAttachments = [];
  if (Array.isArray(attachment_paths) && attachment_paths.length > 0) {
    // Vedlegg hentes fra Storage her, i stedet for at klienten laster opp base64 (flere MB fra mobil = timeout).
    const storage = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!).storage
    let totalt = 0
    for (const v of attachment_paths as { path: string; filename?: string; bucket?: string }[]) {
      if (!v?.path || typeof v.path !== 'string') continue
      const bucket = v.bucket || 'anlegg.dokumenter'
      const { data, error } = await storage.from(bucket).download(v.path)
      if (error || !data) {
        return new Response(JSON.stringify({ error: `Fant ikke vedlegget «${v.filename || v.path}» i Storage${error ? `: ${error.message}` : ''}` }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const bytes = new Uint8Array(await data.arrayBuffer())
      totalt += bytes.length
      if (totalt > MAKS_VEDLEGG_BYTES) {
        return new Response(JSON.stringify({ error: `Vedleggene er for store til å sendes som e-post (over ${Math.round(MAKS_VEDLEGG_BYTES / 1024 / 1024)} MB). Send færre dokumenter om gangen.` }), {
          status: 413,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      allAttachments.push({ filename: v.filename || v.path.split('/').pop(), content: tilBase64(bytes), contentType: 'application/pdf' })
    }
  } else if (attachments && Array.isArray(attachments)) {
    allAttachments = attachments.map((att) => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
    }));
  } else if (attachment) {
    allAttachments = [{
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
    }];
  }

  const emailData = {
    from: 'Brannteknisk Service og Vedlikehold AS <rapport@send.bsvfire.com>',
    to,
    subject,
    html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">${body}</div>${htmlSignature}`,
    text: `${body}\n${textSignature}`,
    attachments: allAttachments.length > 0 ? allAttachments : undefined,
    reply_to: replyToAddress,
  };

  console.log('Sender e-post', { to, subject, vedlegg: allAttachments.map((a) => a.filename) });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData),
  });

  const result = await response.json();

  if (response.ok) {
    return new Response(JSON.stringify({ message: 'E-post sendt!', id: result?.id }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } else {
    // Resend svarer { statusCode, name, message } – send meldingen som tekst så klienten kan vise den
    console.error('Resend avviste e-posten', response.status, JSON.stringify(result));
    const melding = typeof result?.message === 'string' ? result.message : JSON.stringify(result)
    return new Response(JSON.stringify({ error: `Resend: ${melding}` }), { 
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
  } catch (error) {
    console.error('Error in send_email2:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
