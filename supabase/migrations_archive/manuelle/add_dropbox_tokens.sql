-- Tabell for å lagre Dropbox OAuth tokens (delt for alle brukere)
-- Kun én rad skal eksistere - systemets Dropbox-tilkobling

CREATE TABLE IF NOT EXISTS dropbox_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ,
  root_namespace_id TEXT, -- For team space tilgang
  connected_by TEXT, -- Email til admin som koblet til
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kun én konfigurasjon tillatt
CREATE UNIQUE INDEX IF NOT EXISTS dropbox_config_singleton ON dropbox_config ((true));

-- RLS policies
ALTER TABLE dropbox_config ENABLE ROW LEVEL SECURITY;

-- Kun autentiserte brukere kan lese (for å sjekke om Dropbox er konfigurert)
CREATE POLICY "Authenticated users can check dropbox status"
  ON dropbox_config FOR SELECT
  TO authenticated
  USING (true);

-- Kun admin kan oppdatere (via Edge Function med service role)
-- Edge Functions bruker service_role key som bypasser RLS

-- Funksjon for å oppdatere updated_at automatisk
CREATE OR REPLACE FUNCTION update_dropbox_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dropbox_config_updated_at
  BEFORE UPDATE ON dropbox_config
  FOR EACH ROW
  EXECUTE FUNCTION update_dropbox_config_updated_at();

-- Kommentar
COMMENT ON TABLE dropbox_config IS 'Lagrer Dropbox OAuth tokens for systemet. Kun én rad skal eksistere.';
