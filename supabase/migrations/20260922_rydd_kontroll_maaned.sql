-- Rydder kontroll_maaned: noen anlegg fikk hele datostrengen fra et regneark
-- («Sun Nov 01 2026 00:00:00 GMT+0100 …») i stedet for månedsnavnet. Importen er rettet
-- (src/components/AnleggImport.tsx), dette fikser radene som allerede ligger i basen.
--
-- Kjør steg 1 først og se over listen. Kjør så steg 2.

-- STEG 1: hva vil bli endret?
select
  id,
  anleggsnavn,
  kontroll_maaned as fra,
  (array['Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'])
    [extract(month from kontroll_maaned::timestamptz)::int] as til
from anlegg
where kontroll_maaned is not null
  and kontroll_maaned not in ('Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember','NA')
  and kontroll_maaned ~ '\d{4}'
order by anleggsnavn;

-- STEG 2: gjør endringen
update anlegg
set kontroll_maaned = (array['Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'])
  [extract(month from kontroll_maaned::timestamptz)::int]
where kontroll_maaned is not null
  and kontroll_maaned not in ('Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember','NA')
  and kontroll_maaned ~ '\d{4}';

-- STEG 3: sjekk at det ikke er flere avvikende verdier igjen
select kontroll_maaned, count(*) from anlegg group by 1 order by 2 desc;
