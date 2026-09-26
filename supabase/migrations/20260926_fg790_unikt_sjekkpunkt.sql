-- Ett sjekkpunkt per kontroll i FG-790.
--
-- Bakgrunn: NS 3960 lagrer punktene med upsert mot en unik nøkkel
-- (kontroll_id, kontrollpunkt_navn). FG-790 har ingen slik nøkkel, og lagrer i stedet
-- ved å slette alle punktene på kontrollen og sette dem inn på nytt.
--
-- Det holder så lenge man er på nett. Uten dekning legges punktene i offline-køen,
-- og køen kan bare sette inn – den kan ikke slette først. Når nettet kommer tilbake
-- får kontrollen punktene sine to ganger.
--
-- Med nøkkelen på plass kan både nett- og offline-lagringen bruke upsert, og punktet
-- blir oppdatert i stedet for duplisert.

-- 1) Rydd bort duplikater som allerede finnes. Nyeste rad per punkt beholdes.
DELETE FROM kontrollsjekkpunkter_brannalarm a
USING kontrollsjekkpunkter_brannalarm b
WHERE a.kontroll_id IS NOT NULL
  AND a.kontroll_id = b.kontroll_id
  AND a.posisjon IS NOT DISTINCT FROM b.posisjon
  AND a.kategori = b.kategori
  AND a.tittel = b.tittel
  AND (
    COALESCE(a.updated_at, a.created_at) < COALESCE(b.updated_at, b.created_at)
    OR (COALESCE(a.updated_at, a.created_at) = COALESCE(b.updated_at, b.created_at) AND a.id < b.id)
  );

-- 2) Nøkkelen selv
CREATE UNIQUE INDEX IF NOT EXISTS kontrollsjekkpunkter_brannalarm_unikt_punkt
  ON kontrollsjekkpunkter_brannalarm (kontroll_id, posisjon, kategori, tittel)
  WHERE kontroll_id IS NOT NULL;

-- Kontroller resultatet:
--   SELECT kontroll_id, posisjon, kategori, tittel, COUNT(*)
--   FROM kontrollsjekkpunkter_brannalarm
--   WHERE kontroll_id IS NOT NULL
--   GROUP BY 1, 2, 3, 4 HAVING COUNT(*) > 1;
-- Skal gi null rader.
