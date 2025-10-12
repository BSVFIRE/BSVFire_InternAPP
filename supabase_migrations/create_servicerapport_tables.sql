-- Create servicerapporter table
CREATE TABLE IF NOT EXISTS servicerapporter (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  rapport_dato DATE NOT NULL,
  tekniker_navn TEXT NOT NULL,
  header TEXT NOT NULL,
  rapport_innhold TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_servicerapporter_anlegg_id ON servicerapporter(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_servicerapporter_rapport_dato ON servicerapporter(rapport_dato);

-- Enable Row Level Security
ALTER TABLE servicerapporter ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read all servicerapporter
CREATE POLICY "Users can view all servicerapporter"
  ON servicerapporter
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to insert servicerapporter
CREATE POLICY "Users can insert servicerapporter"
  ON servicerapporter
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for authenticated users to update servicerapporter
CREATE POLICY "Users can update servicerapporter"
  ON servicerapporter
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy for authenticated users to delete servicerapporter
CREATE POLICY "Users can delete servicerapporter"
  ON servicerapporter
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_servicerapport_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER servicerapporter_updated_at
  BEFORE UPDATE ON servicerapporter
  FOR EACH ROW
  EXECUTE FUNCTION update_servicerapport_updated_at();

-- Add comment to table
COMMENT ON TABLE servicerapporter IS 'Tekstbaserte servicerapporter for teknisk seksjon';
