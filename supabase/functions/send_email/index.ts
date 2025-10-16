import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, body, attachment, attachments, reply_to } = await req.json();

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
  if (attachments && Array.isArray(attachments)) {
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

  console.log('emailData:', JSON.stringify(emailData, null, 2));
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
    return new Response(JSON.stringify({ message: 'E-post sendt!' }), { 
      status: 200,
      headers: corsHeaders 
    });
  } else {
    return new Response(JSON.stringify({ error: result }), { 
      status: 500,
      headers: corsHeaders 
    });
  }
  } catch (error) {
    console.error('Error in send_email2:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
