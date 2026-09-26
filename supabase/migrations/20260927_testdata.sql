-- Testdata: en kunde med testanlegg som kan opprettes, brukes og slettes helt.
--
-- Testdataene oppfører seg som ekte data med vilje – ellers kan man ikke teste
-- kontrollplanen, ukesplanen eller dashbordet med dem. Det som skiller dem er
-- flagget under, navnet («TEST – …») og at de kan fjernes med ett kall.
--
-- Slettingen er det kritiske. Et anlegg har over femti underliggende tabeller, og
-- en liste vedlikeholdt for hånd i appen ville blitt utdatert første gang noen la
-- til en tabell. Funksjonen finner dem derfor selv, i katalogen.

-- 1) Flagget
ALTER TABLE customer ADD COLUMN IF NOT EXISTS er_testdata BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE anlegg   ADD COLUMN IF NOT EXISTS er_testdata BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN customer.er_testdata IS 'Kunde opprettet av testdatageneratoren. Kan slettes med slett_testdata().';
COMMENT ON COLUMN anlegg.er_testdata   IS 'Anlegg opprettet av testdatageneratoren. Kan slettes med slett_testdata().';

CREATE INDEX IF NOT EXISTS customer_er_testdata_idx ON customer (er_testdata) WHERE er_testdata;
CREATE INDEX IF NOT EXISTS anlegg_er_testdata_idx   ON anlegg (er_testdata)   WHERE er_testdata;

-- 2) Slettingen
--
-- Sikkerheten ligger i at funksjonen aldri tar imot hva som skal slettes. Den
-- finner selv radene som er merket som testdata, og rører ikke noe annet. Selv
-- kalt med vilje fra feil sted kan den ikke slette ekte kundedata.
CREATE OR REPLACE FUNCTION slett_testdata()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  anlegg_ider UUID[];
  kunde_ider  UUID[];
  kundenummer TEXT[];
  tabell      TEXT;
  slettet     JSONB := '{}'::JSONB;
  antall      BIGINT;
BEGIN
  SELECT array_agg(id) INTO anlegg_ider FROM anlegg WHERE er_testdata;
  SELECT array_agg(id), array_agg(kunde_nummer) INTO kunde_ider, kundenummer FROM customer WHERE er_testdata;

  IF anlegg_ider IS NULL AND kunde_ider IS NULL THEN
    RETURN jsonb_build_object('anlegg', 0, 'kunder', 0, 'tabeller', slettet);
  END IF;

  -- Røykluker henger under sentralen, ikke under anlegget
  IF anlegg_ider IS NOT NULL THEN
    DELETE FROM roykluke_luker
    WHERE sentral_id IN (SELECT id FROM roykluke_sentraler WHERE anlegg_id = ANY(anlegg_ider));

    -- Alle tabeller med anlegg_id, funnet i katalogen så nye tabeller kommer med av seg selv
    FOR tabell IN
      SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public' AND c.column_name = 'anlegg_id' AND c.table_name <> 'anlegg'
    LOOP
      EXECUTE format('DELETE FROM public.%I WHERE anlegg_id = ANY($1)', tabell) USING anlegg_ider;
      GET DIAGNOSTICS antall = ROW_COUNT;
      IF antall > 0 THEN slettet := slettet || jsonb_build_object(tabell, antall); END IF;
    END LOOP;
  END IF;

  -- Så tabellene som henger på kunden
  IF kunde_ider IS NOT NULL THEN
    FOR tabell IN
      SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public' AND c.column_name = 'kunde_id' AND c.table_name <> 'customer'
    LOOP
      EXECUTE format('DELETE FROM public.%I WHERE kunde_id = ANY($1)', tabell) USING kunde_ider;
      GET DIAGNOSTICS antall = ROW_COUNT;
      IF antall > 0 THEN slettet := slettet || jsonb_build_object(tabell || ' (kunde)', antall); END IF;
    END LOOP;

    FOR tabell IN
      SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public' AND c.column_name = 'kundenr' AND c.table_name NOT IN ('customer', 'anlegg')
    LOOP
      EXECUTE format('DELETE FROM public.%I WHERE kundenr = ANY($1)', tabell) USING kundenummer;
      GET DIAGNOSTICS antall = ROW_COUNT;
      IF antall > 0 THEN slettet := slettet || jsonb_build_object(tabell || ' (kundenr)', antall); END IF;
    END LOOP;
  END IF;

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

COMMENT ON FUNCTION slett_testdata() IS
  'Sletter alt som er merket er_testdata, i alle tabeller som peker på anlegget eller kunden. Tar ingen parametere med vilje – den kan ikke rettes mot ekte data.';

-- Se hva som ville blitt slettet, uten å slette:
--   SELECT navn, kunde_nummer FROM customer WHERE er_testdata;
--   SELECT anleggsnavn FROM anlegg WHERE er_testdata;
