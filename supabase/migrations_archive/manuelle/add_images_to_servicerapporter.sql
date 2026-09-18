-- Add image_urls column to servicerapporter table
ALTER TABLE servicerapporter 
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Add comment
COMMENT ON COLUMN servicerapporter.image_urls IS 'Array of storage paths for uploaded images';
