-- Nødlys: batteritype og fritekstnotat per armatur. Kjørt manuelt i SQL Editor 2026-09-19.
alter table anleggsdata_nodlys
  add column if not exists batteritype text,
  add column if not exists notat text;
