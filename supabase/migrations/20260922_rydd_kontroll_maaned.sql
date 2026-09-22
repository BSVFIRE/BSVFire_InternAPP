-- Rydder kontroll_maaned: noen anlegg fikk hele datostrengen fra et regneark
-- («Sun Nov 01 2026 00:00:00 GMT+0100 (sentraleuropeisk normaltid)») i stedet for månedsnavnet.
-- Importen er rettet (src/components/AnleggImport.tsx); dette fikser radene som allerede ligger i basen.
--
-- Datostrengen kan ikke castes til timestamp (Postgres godtar ikke tidssone-navnet på slutten),
-- så vi plukker ut den engelske månedsforkortelsen med et tekstsøk.
--
-- Kjør steg 1 først og se over listen. Kjør så steg 2.

-- STEG 1: hva vil bli endret?
select
  id,
  anleggsnavn,
  kontroll_maaned as fra,
  case substring(kontroll_maaned from '\m(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\M')
    when 'Jan' then 'Januar'    when 'Feb' then 'Februar'  when 'Mar' then 'Mars'
    when 'Apr' then 'April'     when 'May' then 'Mai'      when 'Jun' then 'Juni'
    when 'Jul' then 'Juli'      when 'Aug' then 'August'   when 'Sep' then 'September'
    when 'Oct' then 'Oktober'   when 'Nov' then 'November' when 'Dec' then 'Desember'
  end as til
from anlegg
where kontroll_maaned is not null
  and kontroll_maaned not in ('Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember','NA')
  and kontroll_maaned ~ '\m(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\M'
order by anleggsnavn;

-- STEG 2: gjør endringen
update anlegg
set kontroll_maaned = case substring(kontroll_maaned from '\m(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\M')
    when 'Jan' then 'Januar'    when 'Feb' then 'Februar'  when 'Mar' then 'Mars'
    when 'Apr' then 'April'     when 'May' then 'Mai'      when 'Jun' then 'Juni'
    when 'Jul' then 'Juli'      when 'Aug' then 'August'   when 'Sep' then 'September'
    when 'Oct' then 'Oktober'   when 'Nov' then 'November' when 'Dec' then 'Desember'
  end
where kontroll_maaned is not null
  and kontroll_maaned not in ('Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember','NA')
  and kontroll_maaned ~ '\m(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\M';

-- STEG 3: sjekk at bare de tolv månedene og NA står igjen
select kontroll_maaned, count(*) from anlegg group by 1 order by 2 desc;
