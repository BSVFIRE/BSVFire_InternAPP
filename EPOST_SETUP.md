# E-post funksjonalitet - Setup Guide

## Status
✅ Kode implementert  
❌ Edge Function ikke deployet  
⚠️ Resend API key finnes sannsynligvis allerede (fra gammelt prosjekt)

## For å aktivere e-post-sending:

### 1. Deploy Edge Function til Supabase

Du kan deploye via Supabase Dashboard:

1. Gå til [Supabase Dashboard](https://supabase.com/dashboard/project/snyzduzqyjsllzvwuahh)
2. Gå til "Edge Functions"
3. Klikk "Deploy new function"
4. Last opp filen: `/Users/eriksebastianskille/Documents/Firebase_BSVFire/supabase/functions/send_email/index.ts`
5. Navn: `send_email`

**ELLER** via CLI (hvis installert):
```bash
cd /Users/eriksebastianskille/Documents/Firebase_BSVFire
supabase functions deploy send_email --project-ref snyzduzqyjsllzvwuahh
```

### 2. Sjekk Resend API Key

API key er sannsynligvis allerede satt opp siden det gamle prosjektet bruker samme Supabase-prosjekt.

Sjekk i Supabase Dashboard:
1. Gå til "Edge Functions" → "Settings" → "Secrets"
2. Se etter `RESEND_API_KEY`

Hvis den ikke finnes, sett den opp:
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx --project-ref snyzduzqyjsllzvwuahh
```

### 3. Verifiser domene i Resend

1. Logg inn på resend.com
2. Gå til "Domains"
3. Legg til `send.bsvfire.com`
4. Følg instruksjonene for DNS-verifisering

### 4. Test funksjonen

Når alt er satt opp, test ved å:
1. Gå til "Send rapporter" i appen
2. Velg kunde og anlegg
3. Velg dokumenter og mottakere
4. Klikk "Send e-post"

## Avsender-konfigurasjon

E-postene sendes fra:
- **Avsender:** `rapport@send.bsvfire.com`
- **Navn:** Brannteknisk Service og Vedlikehold AS
- **Reply-to:** `mail@bsvfire.no`

## Feilsøking

### Edge Function feil (500)
- Sjekk at funksjonen er deployet: `supabase functions list`
- Sjekk logger: `supabase functions logs send_email`

### CORS feil
- Sjekk at CORS er konfigurert riktig i Edge Function
- Restart Edge Function hvis nødvendig

### API Key feil
- Verifiser at RESEND_API_KEY er satt: `supabase secrets list`
- Sjekk at API key er gyldig i Resend dashboard
