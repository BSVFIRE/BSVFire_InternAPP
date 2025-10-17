-- Create dokumenter table
CREATE TABLE IF NOT EXISTS dokumenter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  filnavn TEXT NOT NULL,
  url TEXT,
  type TEXT,
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  opprettet_av TEXT,
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dokumenter_anlegg_id ON dokumenter(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_dokumenter_opprettet_dato ON dokumenter(opprettet_dato DESC);

-- Enable RLS
ALTER TABLE dokumenter ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON dokumenter
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add trigger to update sist_oppdatert
CREATE OR REPLACE FUNCTION update_dokumenter_sist_oppdatert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sist_oppdatert = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dokumenter_sist_oppdatert
  BEFORE UPDATE ON dokumenter
  FOR EACH ROW
  EXECUTE FUNCTION update_dokumenter_sist_oppdatert();

-- Comment
COMMENT ON TABLE dokumenter IS 'Lagrer metadata for dokumenter knyttet til anlegg';
