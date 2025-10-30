-- Check exact email match between auth.users and ansatte

-- Your auth email
SELECT 
    id,
    email,
    email_confirmed_at
FROM auth.users 
WHERE email LIKE '%erik%'
ORDER BY created_at DESC;

-- Emails in ansatte table
SELECT 
    id,
    navn,
    epost,
    LENGTH(epost) as epost_length,
    LENGTH(TRIM(epost)) as epost_trimmed_length
FROM ansatte 
WHERE LOWER(epost) LIKE '%erik%'
OR LOWER(navn) LIKE '%erik%';

-- Try to find exact match
SELECT 
    a.navn,
    a.epost as ansatte_epost,
    u.email as auth_email,
    CASE 
        WHEN a.epost = u.email THEN 'EXACT MATCH'
        WHEN LOWER(a.epost) = LOWER(u.email) THEN 'CASE INSENSITIVE MATCH'
        WHEN TRIM(a.epost) = u.email THEN 'MATCH AFTER TRIM'
        ELSE 'NO MATCH'
    END as match_status
FROM ansatte a
CROSS JOIN auth.users u
WHERE LOWER(a.epost) LIKE '%erik%' 
   OR LOWER(u.email) LIKE '%erik%';
