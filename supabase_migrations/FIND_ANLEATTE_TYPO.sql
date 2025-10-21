-- Finn alle policies som refererer til "anleatte" (typo)
-- Dette vil hjelpe oss å finne hvor feilen er

-- Sjekk alle policies i databasen
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE 
    qual LIKE '%anleatte%' 
    OR with_check LIKE '%anleatte%'
ORDER BY tablename, policyname;

-- Alternativ: Sjekk alle policies for tabeller som starter med "anlegg"
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename LIKE 'anlegg%'
ORDER BY tablename, policyname;
