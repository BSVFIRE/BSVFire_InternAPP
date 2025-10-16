-- Opprett tabell for system-logger
-- Dette lar administratorer se alle feil og hendelser i appen

CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tidspunkt
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Log-nivå
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  
  -- Melding
  message TEXT NOT NULL,
  
  -- Ekstra data (JSON)
  data JSONB,
  
  -- Brukerinfo
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  
  -- Context (hvilken side/komponent)
  namespace TEXT,
  page_url TEXT,
  
  -- Teknisk info
  user_agent TEXT,
  browser_info JSONB,
  
  -- Indekser for rask søking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indekser for rask søking
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_namespace ON system_logs(namespace);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);

-- Composite index for vanlige søk
CREATE INDEX IF NOT EXISTS idx_system_logs_level_timestamp ON system_logs(level, timestamp DESC);

-- Row Level Security (RLS)
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Alle kan skrive logger (insert)
CREATE POLICY "Alle kan skrive logger"
  ON system_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Kun administratorer kan lese logger
-- TODO: Oppdater denne når du har en admin-rolle
CREATE POLICY "Administratorer kan lese logger"
  ON system_logs
  FOR SELECT
  TO authenticated
  USING (
    -- Midlertidig: Alle autentiserte brukere kan lese
    -- Endre til: auth.uid() IN (SELECT id FROM admin_users)
    true
  );

-- Policy: Kun administratorer kan slette gamle logger
CREATE POLICY "Administratorer kan slette logger"
  ON system_logs
  FOR DELETE
  TO authenticated
  USING (
    -- Midlertidig: Alle autentiserte brukere kan slette
    -- Endre til: auth.uid() IN (SELECT id FROM admin_users)
    true
  );

-- Funksjon for å rydde opp i gamle logger (kjør månedlig)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  -- Slett debug-logger eldre enn 7 dager
  DELETE FROM system_logs 
  WHERE level = 'debug' 
  AND timestamp < NOW() - INTERVAL '7 days';
  
  -- Slett info-logger eldre enn 30 dager
  DELETE FROM system_logs 
  WHERE level = 'info' 
  AND timestamp < NOW() - INTERVAL '30 days';
  
  -- Slett warn-logger eldre enn 90 dager
  DELETE FROM system_logs 
  WHERE level = 'warn' 
  AND timestamp < NOW() - INTERVAL '90 days';
  
  -- Behold error-logger i 1 år
  DELETE FROM system_logs 
  WHERE level = 'error' 
  AND timestamp < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Verifiser at tabellen er opprettet
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'system_logs'
ORDER BY ordinal_position;
