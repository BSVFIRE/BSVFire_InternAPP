-- Legg til telegram_chat_id kolonne for ansatte
-- Dette brukes for å sende push-varsler til teknikere via Telegram

ALTER TABLE ansatte
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

COMMENT ON COLUMN ansatte.telegram_chat_id IS 'Telegram chat ID for push-varsler til denne ansatte';

-- Indeks for raskere oppslag
CREATE INDEX IF NOT EXISTS idx_ansatte_telegram_chat_id 
ON ansatte(telegram_chat_id) 
WHERE telegram_chat_id IS NOT NULL;
