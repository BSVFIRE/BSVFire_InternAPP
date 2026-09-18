-- Sjekk hvilke kolonner som finnes i anlegg-tabellen

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'anlegg'
ORDER BY ordinal_position;
