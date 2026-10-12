-- Retter indeksen fra 20260926_fg790_unikt_sjekkpunkt.sql.
--
-- Den ble laget delvis, med «WHERE kontroll_id IS NOT NULL». PostgreSQL kan bare
-- bruke en delvis indeks i en ON CONFLICT hvis spørringen gjentar nøyaktig samme
-- betingelse, og Supabase-klienten sender bare kolonnenavnene. Resultatet var at
-- hver lagring i FG-790-kontrollen feilet med 42P10 – «no unique or exclusion
-- constraint matching the ON CONFLICT specification».
--
-- Uten betingelsen virker inferensen. Rader uten kontroll_id påvirkes ikke:
-- NULL regnes som forskjellig fra NULL i en unik indeks, så de kan fortsatt
-- finnes i flere eksemplarer – som før.

DROP INDEX IF EXISTS kontrollsjekkpunkter_brannalarm_unikt_punkt;

CREATE UNIQUE INDEX IF NOT EXISTS kontrollsjekkpunkter_brannalarm_unikt_punkt
  ON kontrollsjekkpunkter_brannalarm (kontroll_id, posisjon, kategori, tittel);

-- Kontroll: skal gi null rader.
--   SELECT kontroll_id, posisjon, kategori, tittel, COUNT(*)
--   FROM kontrollsjekkpunkter_brannalarm
--   WHERE kontroll_id IS NOT NULL
--   GROUP BY 1, 2, 3, 4 HAVING COUNT(*) > 1;
