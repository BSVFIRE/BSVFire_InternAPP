-- Bilder på avvik i FG-790-kontrollen.
--
-- NS 3960 trengte ingen endring: der ligger avvikene i `ns3960_kontrollpunkter.avvik_liste`
-- som JSON, og bildestiene får plass i det samme objektet. FG-790 har ett avvik per
-- sjekkpunkt, i egne kolonner, og har derfor ikke noe sted å legge dem.
--
-- Kolonnen holder en JSON-liste med storage-stier, samme format som avvik_liste:
--   ["anlegg/<id>/bilder/1727350000000_a1b2c3d4.jpg"]
--
-- Selve bildene ligger i bøtta `anlegg.dokumenter` og er registrert i `dokumenter`
-- med type = 'Bilde'. Denne kolonnen peker bare på dem.

ALTER TABLE kontrollsjekkpunkter_brannalarm
  ADD COLUMN IF NOT EXISTS bilder TEXT;

COMMENT ON COLUMN kontrollsjekkpunkter_brannalarm.bilder IS
  'JSON-liste med storage-stier til bilder av avviket, maks to per punkt.';
