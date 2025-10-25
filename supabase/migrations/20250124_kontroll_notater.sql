-- Create table for inspection notes
CREATE TABLE IF NOT EXISTS kontroll_notater (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kontroll_id UUID NOT NULL REFERENCES anleggsdata_kontroll(id) ON DELETE CASCADE,
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_voice BOOLEAN DEFAULT FALSE,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_kontroll_notater_kontroll_id ON kontroll_notater(kontroll_id);
CREATE INDEX IF NOT EXISTS idx_kontroll_notater_anlegg_id ON kontroll_notater(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_kontroll_notater_created_at ON kontroll_notater(created_at);

-- Enable Row Level Security
ALTER TABLE kontroll_notater ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read their own notes
CREATE POLICY "Users can view their own inspection notes"
  ON kontroll_notater
  FOR SELECT
  TO authenticated
  USING (
    anlegg_id IN (
      SELECT a.id FROM anlegg a
      INNER JOIN customer c ON a.kundenr = c.id
      WHERE true -- Add your own access control logic here
    )
  );

-- Create policy for authenticated users to insert notes
CREATE POLICY "Users can create inspection notes"
  ON kontroll_notater
  FOR INSERT
  TO authenticated
  WITH CHECK (
    anlegg_id IN (
      SELECT a.id FROM anlegg a
      INNER JOIN customer c ON a.kundenr = c.id
      WHERE true -- Add your own access control logic here
    )
  );

-- Create policy for authenticated users to update their notes
CREATE POLICY "Users can update inspection notes"
  ON kontroll_notater
  FOR UPDATE
  TO authenticated
  USING (
    anlegg_id IN (
      SELECT a.id FROM anlegg a
      INNER JOIN customer c ON a.kundenr = c.id
      WHERE true -- Add your own access control logic here
    )
  );

-- Create policy for authenticated users to delete their notes
CREATE POLICY "Users can delete inspection notes"
  ON kontroll_notater
  FOR DELETE
  TO authenticated
  USING (
    anlegg_id IN (
      SELECT a.id FROM anlegg a
      INNER JOIN customer c ON a.kundenr = c.id
      WHERE true -- Add your own access control logic here
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_kontroll_notater_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kontroll_notater_updated_at
  BEFORE UPDATE ON kontroll_notater
  FOR EACH ROW
  EXECUTE FUNCTION update_kontroll_notater_updated_at();

-- Add comment to table
COMMENT ON TABLE kontroll_notater IS 'Stores notes taken during fire alarm inspections with voice recording support';
COMMENT ON COLUMN kontroll_notater.is_voice IS 'Indicates if the note was created using voice input';
COMMENT ON COLUMN kontroll_notater.audio_url IS 'URL to the audio recording if available';
