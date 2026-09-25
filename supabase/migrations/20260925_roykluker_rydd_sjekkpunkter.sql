-- Rydder etter konverteringen i 20260923_roykluker_sjekkpunkter.sql.
--
-- Den gamle tabellen hadde alle sjekkpunkt-kolonnene utfylt uansett anleggstype, så hver sentral
-- fikk med seg punkter som ikke gjelder den: «Ledeskinner»/«Gardin» på røykluker, «Karm»/«Overlys»
-- på branngardin. I tillegg ble kretsen lagret som punktet «Krets», mens skjemaet nummererer dem.
--
-- Vi fjerner bare punkter som står til «Ok» uten merknad. Punkter med avvik, anbefaling eller
-- merknad beholdes – de vises i skjemaet som ekstra rader slik at ingen funn forsvinner.
--
-- Kjør steg 1 for å se hva som blir borte, deretter steg 2 og 3.

-- STEG 1: hva fjernes?
select s.anlegg_type, p->>'punkt' as punkt, p->>'tilstand' as tilstand, count(*)
from roykluke_sentraler s, jsonb_array_elements(s.sjekkpunkter) p
where p->>'tilstand' = 'Ok' and coalesce(p->>'merknad', '') = ''
  and (
    (s.anlegg_type = 'Røykluker'   and p->>'punkt' in ('Ledeskinner', 'Gardin'))
    or (s.anlegg_type = 'Branngardin' and p->>'punkt' in ('Karm', 'Overlys', 'Lufte bryter'))
  )
group by 1, 2, 3 order by 1, 2;

-- STEG 2: fjern punktene som ikke gjelder anleggstypen og som står til Ok uten merknad
update roykluke_sentraler s
set sjekkpunkter = coalesce((
  select jsonb_agg(p)
  from jsonb_array_elements(s.sjekkpunkter) p
  where not (
    p->>'tilstand' = 'Ok' and coalesce(p->>'merknad', '') = ''
    and (
      (s.anlegg_type = 'Røykluker'   and p->>'punkt' in ('Ledeskinner', 'Gardin'))
      or (s.anlegg_type = 'Branngardin' and p->>'punkt' in ('Karm', 'Overlys', 'Lufte bryter'))
    )
  )
), '[]'::jsonb)
where jsonb_array_length(s.sjekkpunkter) > 0;

-- STEG 3: «Krets» får nummer så den treffer raden i skjemaet.
-- Har sentralen kretser, brukes nummeret til den første. Ellers fjernes punktet hvis det er Ok
-- uten merknad, og beholdes som «Krets 1» hvis det har et funn.
update roykluke_sentraler s
set sjekkpunkter = (
  select coalesce(jsonb_agg(
    case
      when p->>'punkt' <> 'Krets' then p
      else jsonb_set(p, '{punkt}', to_jsonb('Krets ' || coalesce(s.kretser->0->>'nr', '1')))
    end
  ), '[]'::jsonb)
  from jsonb_array_elements(s.sjekkpunkter) p
  where not (p->>'punkt' = 'Krets' and p->>'tilstand' = 'Ok' and coalesce(p->>'merknad', '') = '' and jsonb_array_length(s.kretser) = 0)
)
where s.sjekkpunkter @> '[{"punkt": "Krets"}]'::jsonb;

-- STEG 4: kontroll – nå skal ingen sentral ha punkter som ikke gjelder typen, bortsett fra funn
select
  count(*) as sentraler,
  sum(jsonb_array_length(sjekkpunkter)) as sjekkpunkter_totalt,
  count(*) filter (where sjekkpunkter @> '[{"punkt": "Krets"}]'::jsonb) as har_unummerert_krets
from roykluke_sentraler;
