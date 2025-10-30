-- Check if current user exists in ansatte table
-- Run this to see if your user ID is in the ansatte table

-- First, check what users exist in auth.users
SELECT 
    id,
    email,
    raw_user_meta_data->>'navn' as metadata_navn
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Then check what exists in ansatte table
SELECT 
    id,
    navn,
    epost
FROM ansatte
ORDER BY navn;

-- Check if there's a match between auth.users and ansatte
SELECT 
    u.id as user_id,
    u.email,
    a.id as ansatt_id,
    a.navn as ansatt_navn
FROM auth.users u
LEFT JOIN ansatte a ON u.id = a.id
ORDER BY u.created_at DESC
LIMIT 10;
