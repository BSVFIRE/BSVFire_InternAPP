-- Antall åpne avvik per anlegg, på tvers av kontrolltypene. Brukes av anleggslisten.
-- Reglene er de samme som i src/lib/anleggAvvik.ts (detaljsiden), hold dem i takt:
--   Nødlys:        status ikke i (OK, Utskiftet)
--   Brannslukkere: status[] inneholder noe utenom OK / OK Byttet / Byttet ved kontroll /
--                  Ikke funnet / Ikke tilkomst / Fjernet
--   Brannslanger:  status <> OK eller type_avvik[] ikke tom
--   Røykluker:     luke med status Avvik
--   Førstehjelp:   status Utgått/Mangler eller utløpsdato passert
--   Brannalarm:    sjekkpunkter med avvik_type fra SISTE FG790-kontroll,
--                  NS3960-punkter med avvik=true fra SISTE NS3960-kontroll

create or replace function public.avvik_per_anlegg()
returns table (anlegg_id uuid, antall bigint)
language sql stable security invoker set search_path = public as $$
  with
  nodlys as (
    select anlegg_id, count(*) n from anleggsdata_nodlys
    where anlegg_id is not null and status is not null and status not in ('OK', 'Utskiftet')
    group by anlegg_id
  ),
  slukkere as (
    select anlegg_id, count(*) n from anleggsdata_brannslukkere b
    where anlegg_id is not null and exists (
      select 1 from unnest(coalesce(b.status, '{}')) s
      where s is not null and s not in ('OK', 'OK Byttet', 'Byttet ved kontroll', 'Ikke funnet', 'Ikke tilkomst', 'Fjernet')
    )
    group by anlegg_id
  ),
  slanger as (
    select anlegg_id, count(*) n from anleggsdata_brannslanger
    where anlegg_id is not null and (
      (status is not null and status <> 'OK') or coalesce(array_length(type_avvik, 1), 0) > 0
    )
    group by anlegg_id
  ),
  luker as (
    select s.anlegg_id, count(*) n
    from roykluke_luker l join roykluke_sentraler s on s.id = l.sentral_id
    where s.anlegg_id is not null and l.status = 'Avvik'
    group by s.anlegg_id
  ),
  forstehjelp as (
    select anlegg_id, count(*) n from anleggsdata_forstehjelp
    where status in ('Utgått', 'Mangler')
       or (utlopsdato is not null and utlopsdato < current_date)
    group by anlegg_id
  ),
  siste_kontroll as (
    select distinct on (anlegg_id, rapport_type) id, anlegg_id, rapport_type
    from anleggsdata_kontroll
    where anlegg_id is not null and rapport_type in ('FG790', 'NS3960')
    order by anlegg_id, rapport_type, dato desc nulls last, created_at desc nulls last
  ),
  fg790 as (
    select k.anlegg_id, count(*) n
    from kontrollsjekkpunkter_brannalarm p join siste_kontroll k on k.id = p.kontroll_id and k.rapport_type = 'FG790'
    where p.avvik_type is not null
    group by k.anlegg_id
  ),
  ns3960 as (
    select k.anlegg_id, count(*) n
    from ns3960_kontrollpunkter p join siste_kontroll k on k.id = p.kontroll_id and k.rapport_type = 'NS3960'
    where p.avvik = true
    group by k.anlegg_id
  ),
  alle as (
    select * from nodlys union all select * from slukkere union all select * from slanger
    union all select * from luker union all select * from forstehjelp
    union all select * from fg790 union all select * from ns3960
  )
  select anlegg_id, sum(n)::bigint as antall from alle group by anlegg_id;
$$;

grant execute on function public.avvik_per_anlegg() to authenticated;
