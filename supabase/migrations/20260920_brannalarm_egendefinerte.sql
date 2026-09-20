-- Brannalarm: egendefinerte enhetstyper/styringer per anlegg (de faste er kolonner). Kjørt manuelt i SQL Editor 2026-09-20.
-- Format: [{ id, navn, slag: 'enhet'|'styring', kategori, typer: [{type, antall}], antall, status, note, avvik: [] }]
alter table anleggsdata_brannalarm
  add column if not exists egendefinerte jsonb not null default '[]'::jsonb;
