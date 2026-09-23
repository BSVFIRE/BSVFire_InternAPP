-- Røykluker: sjekkpunkter, kretser og byttet utstyr som lister.
--
-- Bakgrunn: skjemaet hadde én kolonne per sjekkpunkt (sjekk_motor, tilstand_nettlampe …), bare plass
-- til ÉN krets, og ingen merknad per punkt. Kontrollrapporter fra bransjen (jf. Firesafe) skiller
-- mellom «avvik – må utbedres» og «anbefaling – bør utbedres», har merknad på hvert punkt og
-- opptil fire kretser per sentral. Derfor:
--
--   sjekkpunkter          [{ punkt, tilstand: 'Ok'|'Anbefaling'|'Avvik'|'Ikke aktuell', merknad }]
--   kretser               [{ nr, aktivering, hvile, motstand }]
--   byttet_utstyr_liste   [{ materiell, antall }]
--
-- De gamle kolonnene beholdes urørt (leses fortsatt av eldre rapporter), men skrives ikke lenger.
-- Kjøres én gang i Supabase Dashboard → SQL Editor.

alter table roykluke_sentraler
  add column if not exists sjekkpunkter jsonb not null default '[]'::jsonb,
  add column if not exists kretser jsonb not null default '[]'::jsonb,
  add column if not exists byttet_utstyr_liste jsonb not null default '[]'::jsonb;

-- Flytt dagens verdier inn i listene for sentraler som ikke er konvertert ennå.
-- 'Ok'/'OK' → Ok, 'Avvik' → Avvik, tomt → punktet tas ikke med.
with punkter as (
  select
    s.id,
    jsonb_path_query_array(
      jsonb_strip_nulls(jsonb_build_array(
        case when coalesce(s.tilstand_sentral, '') <> ''         then jsonb_build_object('punkt', 'Sentral',          'tilstand', initcap(s.tilstand_sentral),         'merknad', '') end,
        case when coalesce(s.tilstand_ladespenning, s.ladespenning_status, '') <> '' then jsonb_build_object('punkt', 'Ladespenning', 'tilstand', initcap(coalesce(s.tilstand_ladespenning, s.ladespenning_status)), 'merknad', '') end,
        case when coalesce(s.tilstand_nettspenning, '') <> ''    then jsonb_build_object('punkt', 'Nettspenning',     'tilstand', initcap(s.tilstand_nettspenning),    'merknad', '') end,
        case when coalesce(s.tilstand_nettlampe, '') <> ''       then jsonb_build_object('punkt', 'Nettlampe',        'tilstand', initcap(s.tilstand_nettlampe),       'merknad', '') end,
        case when coalesce(s.tilstand_feillampe, '') <> ''       then jsonb_build_object('punkt', 'Feillampe',        'tilstand', initcap(s.tilstand_feillampe),       'merknad', '') end,
        case when coalesce(s.tilstand_aktiveringslampe, '') <> '' then jsonb_build_object('punkt', 'Aktiveringslampe','tilstand', initcap(s.tilstand_aktiveringslampe),'merknad', '') end,
        case when coalesce(s.sjekk_motor, '') <> ''              then jsonb_build_object('punkt', 'Motor',            'tilstand', initcap(s.sjekk_motor),              'merknad', '') end,
        case when coalesce(s.tilstand_bryter, '') <> ''          then jsonb_build_object('punkt', 'Lufte bryter',     'tilstand', initcap(s.tilstand_bryter),          'merknad', '') end,
        case when coalesce(s.sjekk_manuell_utloser, '') <> ''    then jsonb_build_object('punkt', 'Manuell utløser',  'tilstand', initcap(s.sjekk_manuell_utloser),    'merknad', '') end,
        case when coalesce(s.sjekk_karm, '') <> ''               then jsonb_build_object('punkt', 'Karm',             'tilstand', initcap(s.sjekk_karm),               'merknad', '') end,
        case when coalesce(s.sjekk_overlys, '') <> ''            then jsonb_build_object('punkt', 'Overlys',          'tilstand', initcap(s.sjekk_overlys),            'merknad', '') end,
        case when coalesce(s.sjekk_beslag, s.sjekk_beslag_roykluke, '') <> '' then jsonb_build_object('punkt', 'Beslag', 'tilstand', initcap(coalesce(s.sjekk_beslag, s.sjekk_beslag_roykluke)), 'merknad', '') end,
        case when coalesce(s.sjekk_ledeskinner, '') <> ''        then jsonb_build_object('punkt', 'Ledeskinner',      'tilstand', initcap(s.sjekk_ledeskinner),        'merknad', '') end,
        case when coalesce(s.sjekk_gardin_status, '') <> ''      then jsonb_build_object('punkt', 'Gardin',           'tilstand', initcap(s.sjekk_gardin_status),      'merknad', '') end,
        case when coalesce(s.tilstand_signal, '') <> ''          then jsonb_build_object('punkt', 'Signal',           'tilstand', initcap(s.tilstand_signal),          'merknad', '') end,
        case when coalesce(s.sjekk_krets, '') <> ''              then jsonb_build_object('punkt', 'Krets',            'tilstand', initcap(s.sjekk_krets),              'merknad', '') end
      )), '$[*] ? (@ != null)'
    ) as liste
  from roykluke_sentraler s
  where s.sjekkpunkter = '[]'::jsonb
)
update roykluke_sentraler s
set sjekkpunkter = p.liste
from punkter p
where s.id = p.id and jsonb_array_length(p.liste) > 0;

-- Kretsen som lå i egne kolonner blir første rad i listen
update roykluke_sentraler
set kretser = jsonb_build_array(jsonb_build_object(
  'nr', coalesce(nullif(krets_nr, ''), '1'),
  'aktivering', coalesce(krets_aktiveringspenning, aktiveringspenning, ''),
  'hvile', coalesce(krets_hvilespenning, hvilespenning, ''),
  'motstand', coalesce(krets_motstand, '')
))
where kretser = '[]'::jsonb
  and coalesce(krets_aktiveringspenning, aktiveringspenning, krets_hvilespenning, hvilespenning, krets_motstand, krets_nr, '') <> '';

-- Byttet utstyr fra de to gamle kolonnene
update roykluke_sentraler
set byttet_utstyr_liste = jsonb_build_array(jsonb_build_object(
  'materiell', byttet_utstyr,
  'antall', coalesce(byttet_utstyr_antall, 1)
))
where byttet_utstyr_liste = '[]'::jsonb and coalesce(byttet_utstyr, '') <> '';

-- Kontroll om konverteringen traff
select
  count(*) as sentraler,
  count(*) filter (where jsonb_array_length(sjekkpunkter) > 0) as med_sjekkpunkter,
  count(*) filter (where jsonb_array_length(kretser) > 0) as med_kretser,
  count(*) filter (where jsonb_array_length(byttet_utstyr_liste) > 0) as med_byttet_utstyr
from roykluke_sentraler;
