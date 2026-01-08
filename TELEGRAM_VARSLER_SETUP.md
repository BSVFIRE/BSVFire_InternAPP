# Telegram Push-varsler - Oppsett

## Oversikt
Systemet sender push-varsler til teknikere via Telegram når de får:
- Ny ordre tildelt
- Ny oppgave tildelt  
- Ny melding

## Steg 1: Kjør database-migrering

Kjør denne SQL i Supabase SQL Editor:

```sql
-- Legg til telegram_chat_id kolonne for ansatte
ALTER TABLE ansatte
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

COMMENT ON COLUMN ansatte.telegram_chat_id IS 'Telegram chat ID for push-varsler til denne ansatte';

CREATE INDEX IF NOT EXISTS idx_ansatte_telegram_chat_id 
ON ansatte(telegram_chat_id) 
WHERE telegram_chat_id IS NOT NULL;
```

## Steg 2: Sett opp Telegram Bot Token som secret

```bash
# I terminalen, kjør:
supabase secrets set TELEGRAM_BOT_TOKEN=<DITT_BOT_TOKEN>
```

Hent bot token fra @BotFather i Telegram.

## Steg 3: Deploy edge function

```bash
supabase functions deploy send-telegram-notification
```

## Steg 4: Registrer teknikeres chat_id

Hver tekniker må:
1. Søke etter `@bsvfire_varsler_bot` i Telegram
2. Trykke "Start"
3. Sende en melding til boten

For å finne chat_id, åpne:
```
https://api.telegram.org/bot<TOKEN>/getUpdates
```

Legg deretter inn `chat_id` i `ansatte`-tabellen for den aktuelle teknikeren.

## Bruk i kode

```typescript
import { notifyNewOrdre, notifyNewOppgave, notifyNewMelding } from '@/lib/telegramService'

// Ved ny ordre
await notifyNewOrdre(tekniker_id, ordreNummer, kundeNavn, anleggsNavn)

// Ved ny oppgave
await notifyNewOppgave(tekniker_id, oppgaveTittel, beskrivelse, forfallsdato)

// Ved ny melding
await notifyNewMelding(tekniker_id, avsenderNavn, meldingTekst)
```

## Feilsøking

### "Tekniker har ikke konfigurert Telegram"
Teknikeren mangler `telegram_chat_id` i `ansatte`-tabellen.

### "Chat not found"
Teknikeren har ikke startet en chat med boten. De må trykke "Start" i Telegram.

### Meldinger sendes ikke
Sjekk at:
1. `TELEGRAM_BOT_TOKEN` er satt som secret
2. Edge function er deployet
3. Teknikeren har gyldig `telegram_chat_id`
