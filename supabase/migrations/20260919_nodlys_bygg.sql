-- Nødlys: valgfritt bygg-nivå over etasje («Bygg 1 – 1.Etg»). Kjørt manuelt i SQL Editor 2026-09-19.
alter table anleggsdata_nodlys add column if not exists bygg text;
