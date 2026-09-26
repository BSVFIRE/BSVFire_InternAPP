-- Retter to feil i slett_testdata() fra 20260927_testdata.sql.
--
-- 1) Rekkefølgen. Tabellene ble slettet i den rekkefølgen katalogen ga dem, men flere
--    av dem peker på hverandre: ns3960_kontrollpunkter → anleggsdata_kontroll,
--    logg_avvikbrannalarm → kontrollsjekkpunkter_brannalarm, leilighet_kontroller →
--    anlegg_leiligheter, dokumenter og servicerapporter → ordre. Kom foreldreraden
--    først, ville hele slettingen stoppet på en fremmednøkkelfeil.
--
--    Funksjonen prøver nå tabellene om igjen: de som feiler på fremmednøkkel legges
--    bakerst og forsøkes på nytt, til ingen flere går gjennom. Da er grafen løst uten
--    at rekkefølgen må vedlikeholdes for hånd.
--
-- 2) Kolonnen `kundenr` holder kundens id (uuid), ikke kundenummeret. Den forrige
--    versjonen sammenlignet den med '9999' og traff ingenting.
--
-- Erstatter funksjonen. Flagg og indekser fra forrige migrasjon står som de er.

CREATE OR REPLACE FUNCTION slett_testdata()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  anlegg_ider  TEXT[];
  kunde_ider   TEXT[];
  kunde_nokler TEXT[];
  slettet      JSONB := '{}'::JSONB;
  antall       BIGINT;
  spek         RECORD;
  gjenstar     TEXT[];
  neste        TEXT[];
  tabell       TEXT;
BEGIN
  SELECT array_agg(id::text) INTO anlegg_ider FROM anlegg WHERE er_testdata;
  SELECT array_agg(id::text) INTO kunde_ider  FROM customer WHERE er_testdata;

  IF anlegg_ider IS NULL AND kunde_ider IS NULL THEN
    RETURN jsonb_build_object('anlegg', 0, 'kunder', 0, 'tabeller', slettet);
  END IF;

  -- `kundenr` er kundens id i noen tabeller og kundenummeret i andre. Vi sender med
  -- begge og sammenligner som tekst, så treffer vi uansett hvilken variant tabellen har.
  SELECT coalesce(kunde_ider, '{}') || coalesce(array_agg(kunde_nummer), '{}')
    INTO kunde_nokler FROM customer WHERE er_testdata AND kunde_nummer IS NOT NULL;
  IF kunde_nokler IS NULL THEN kunde_nokler := coalesce(kunde_ider, '{}'); END IF;

  -- Røykluker henger under sentralen, ikke under anlegget
  IF anlegg_ider IS NOT NULL THEN
    DELETE FROM roykluke_luker
    WHERE sentral_id IN (SELECT id FROM roykluke_sentraler WHERE anlegg_id::text = ANY(anlegg_ider));
  END IF;

  FOR spek IN
    SELECT * FROM (VALUES
      ('anlegg_id', anlegg_ider, ARRAY['anlegg']),
      ('kunde_id',  kunde_ider,  ARRAY['customer']),
      ('kundenr',   kunde_nokler, ARRAY['customer', 'anlegg'])
    ) AS t(kolonne, verdier, unntak)
  LOOP
    CONTINUE WHEN spek.verdier IS NULL OR array_length(spek.verdier, 1) IS NULL;

    SELECT array_agg(c.table_name) INTO gjenstar
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public'
      AND c.column_name = spek.kolonne
      AND NOT (c.table_name = ANY(spek.unntak));

    -- Prøv tabellene om igjen til ingen flere feiler på fremmednøkkel
    WHILE gjenstar IS NOT NULL AND array_length(gjenstar, 1) > 0 LOOP
      neste := '{}';
      FOREACH tabell IN ARRAY gjenstar LOOP
        BEGIN
          EXECUTE format('DELETE FROM public.%I WHERE %I::text = ANY($1)', tabell, spek.kolonne)
            USING spek.verdier;
          GET DIAGNOSTICS antall = ROW_COUNT;
          IF antall > 0 THEN
            slettet := slettet || jsonb_build_object(tabell, coalesce((slettet ->> tabell)::bigint, 0) + antall);
          END IF;
        EXCEPTION WHEN foreign_key_violation THEN
          neste := neste || tabell;   -- en annen tabell peker hit ennå; prøv igjen etterpå
        END;
      END LOOP;

      IF array_length(neste, 1) IS NOT NULL AND array_length(neste, 1) = array_length(gjenstar, 1) THEN
        RAISE EXCEPTION 'Kom ikke videre med sletting av testdata. Tabeller som blokkerer hverandre: %', neste;
      END IF;
      gjenstar := neste;
    END LOOP;
  END LOOP;

  DELETE FROM anlegg WHERE er_testdata;
  GET DIAGNOSTICS antall = ROW_COUNT;
  slettet := slettet || jsonb_build_object('anlegg', antall);

  DELETE FROM customer WHERE er_testdata;
  GET DIAGNOSTICS antall = ROW_COUNT;
  slettet := slettet || jsonb_build_object('customer', antall);

  RETURN jsonb_build_object(
    'anlegg', coalesce(array_length(anlegg_ider, 1), 0),
    'kunder', coalesce(array_length(kunde_ider, 1), 0),
    'tabeller', slettet
  );
END;
$$;

REVOKE ALL ON FUNCTION slett_testdata() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION slett_testdata() TO authenticated;

-- Tørrkjøring: skal gi 0 rader før testdata er opprettet, og 1 + 4 etterpå.
--   SELECT count(*) AS kunder FROM customer WHERE er_testdata;
--   SELECT count(*) AS anlegg FROM anlegg   WHERE er_testdata;
