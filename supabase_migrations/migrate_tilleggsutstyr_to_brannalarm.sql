-- Migrer tilleggsutstyr-data fra anleggsdata_kontroll til anleggsdata_brannalarm
-- Dette scriptet kopierer data uten å slette noe fra anleggsdata_kontroll

DO $$
DECLARE
  kontroll_record RECORD;
BEGIN
  -- Loop gjennom alle kontroller som har tilleggsutstyr-data
  FOR kontroll_record IN 
    SELECT DISTINCT ON (anlegg_id)
      anlegg_id,
      talevarsling,
      talevarsling_leverandor,
      talevarsling_batteri_type,
      talevarsling_batteri_alder,
      talevarsling_plassering,
      talevarsling_kommentar,
      alarmsender_i_anlegg,
      mottaker,
      gsm_nummer,
      plassering,
      batterialder,
      batteritype,
      forsynet_fra_brannsentral,
      "sender_2G_4G" as sender_2G_4G,
      mottaker_kommentar,
      ekstern_mottaker,
      ekstern_mottaker_info,
      ekstern_mottaker_aktiv,
      nokkelsafe,
      nokkelsafe_type,
      nokkelsafe_plassering,
      nokkelsafe_innhold,
      nokkelsafe_kommentar
    FROM anleggsdata_kontroll
    WHERE 
      talevarsling IS NOT NULL 
      OR alarmsender_i_anlegg IS NOT NULL 
      OR nokkelsafe IS NOT NULL
    ORDER BY anlegg_id, dato DESC -- Ta nyeste kontroll per anlegg
  LOOP
    -- Oppdater eller insert i anleggsdata_brannalarm
    INSERT INTO anleggsdata_brannalarm (
      anlegg_id,
      talevarsling,
      talevarsling_leverandor,
      talevarsling_batteri_type,
      talevarsling_batteri_alder,
      talevarsling_plassering,
      talevarsling_kommentar,
      alarmsender_i_anlegg,
      mottaker,
      gsm_nummer,
      plassering,
      batterialder,
      batteritype,
      forsynet_fra_brannsentral,
      "sender_2G_4G",
      mottaker_kommentar,
      ekstern_mottaker,
      ekstern_mottaker_info,
      ekstern_mottaker_aktiv,
      nokkelsafe,
      nokkelsafe_type,
      nokkelsafe_plassering,
      nokkelsafe_innhold,
      nokkelsafe_kommentar
    ) VALUES (
      kontroll_record.anlegg_id,
      kontroll_record.talevarsling,
      kontroll_record.talevarsling_leverandor,
      kontroll_record.talevarsling_batteri_type,
      kontroll_record.talevarsling_batteri_alder,
      kontroll_record.talevarsling_plassering,
      kontroll_record.talevarsling_kommentar,
      kontroll_record.alarmsender_i_anlegg,
      kontroll_record.mottaker,
      kontroll_record.gsm_nummer,
      kontroll_record.plassering,
      kontroll_record.batterialder,
      kontroll_record.batteritype,
      kontroll_record.forsynet_fra_brannsentral,
      kontroll_record.sender_2G_4G,
      kontroll_record.mottaker_kommentar,
      kontroll_record.ekstern_mottaker,
      kontroll_record.ekstern_mottaker_info,
      kontroll_record.ekstern_mottaker_aktiv,
      kontroll_record.nokkelsafe,
      kontroll_record.nokkelsafe_type,
      kontroll_record.nokkelsafe_plassering,
      kontroll_record.nokkelsafe_innhold,
      kontroll_record.nokkelsafe_kommentar
    )
    ON CONFLICT (anlegg_id) 
    DO UPDATE SET
      talevarsling = COALESCE(EXCLUDED.talevarsling, anleggsdata_brannalarm.talevarsling),
      talevarsling_leverandor = COALESCE(EXCLUDED.talevarsling_leverandor, anleggsdata_brannalarm.talevarsling_leverandor),
      talevarsling_batteri_type = COALESCE(EXCLUDED.talevarsling_batteri_type, anleggsdata_brannalarm.talevarsling_batteri_type),
      talevarsling_batteri_alder = COALESCE(EXCLUDED.talevarsling_batteri_alder, anleggsdata_brannalarm.talevarsling_batteri_alder),
      talevarsling_plassering = COALESCE(EXCLUDED.talevarsling_plassering, anleggsdata_brannalarm.talevarsling_plassering),
      talevarsling_kommentar = COALESCE(EXCLUDED.talevarsling_kommentar, anleggsdata_brannalarm.talevarsling_kommentar),
      alarmsender_i_anlegg = COALESCE(EXCLUDED.alarmsender_i_anlegg, anleggsdata_brannalarm.alarmsender_i_anlegg),
      mottaker = COALESCE(EXCLUDED.mottaker, anleggsdata_brannalarm.mottaker),
      gsm_nummer = COALESCE(EXCLUDED.gsm_nummer, anleggsdata_brannalarm.gsm_nummer),
      plassering = COALESCE(EXCLUDED.plassering, anleggsdata_brannalarm.plassering),
      batterialder = COALESCE(EXCLUDED.batterialder, anleggsdata_brannalarm.batterialder),
      batteritype = COALESCE(EXCLUDED.batteritype, anleggsdata_brannalarm.batteritype),
      forsynet_fra_brannsentral = COALESCE(EXCLUDED.forsynet_fra_brannsentral, anleggsdata_brannalarm.forsynet_fra_brannsentral),
      "sender_2G_4G" = COALESCE(EXCLUDED."sender_2G_4G", anleggsdata_brannalarm."sender_2G_4G"),
      mottaker_kommentar = COALESCE(EXCLUDED.mottaker_kommentar, anleggsdata_brannalarm.mottaker_kommentar),
      ekstern_mottaker = COALESCE(EXCLUDED.ekstern_mottaker, anleggsdata_brannalarm.ekstern_mottaker),
      ekstern_mottaker_info = COALESCE(EXCLUDED.ekstern_mottaker_info, anleggsdata_brannalarm.ekstern_mottaker_info),
      ekstern_mottaker_aktiv = COALESCE(EXCLUDED.ekstern_mottaker_aktiv, anleggsdata_brannalarm.ekstern_mottaker_aktiv),
      nokkelsafe = COALESCE(EXCLUDED.nokkelsafe, anleggsdata_brannalarm.nokkelsafe),
      nokkelsafe_type = COALESCE(EXCLUDED.nokkelsafe_type, anleggsdata_brannalarm.nokkelsafe_type),
      nokkelsafe_plassering = COALESCE(EXCLUDED.nokkelsafe_plassering, anleggsdata_brannalarm.nokkelsafe_plassering),
      nokkelsafe_innhold = COALESCE(EXCLUDED.nokkelsafe_innhold, anleggsdata_brannalarm.nokkelsafe_innhold),
      nokkelsafe_kommentar = COALESCE(EXCLUDED.nokkelsafe_kommentar, anleggsdata_brannalarm.nokkelsafe_kommentar);
    
    RAISE NOTICE 'Migrert tilleggsutstyr for anlegg_id: %', kontroll_record.anlegg_id;
  END LOOP;
  
  RAISE NOTICE 'Migrering fullført!';
END $$;
