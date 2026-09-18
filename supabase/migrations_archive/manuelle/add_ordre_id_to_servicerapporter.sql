-- Add ordre_id column to servicerapporter table
ALTER TABLE servicerapporter 
ADD COLUMN ordre_id UUID REFERENCES ordre(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_servicerapporter_ordre_id ON servicerapporter(ordre_id);

-- Add comment
COMMENT ON COLUMN servicerapporter.ordre_id IS 'Kobling til ordre som servicerapporten er opprettet fra';
