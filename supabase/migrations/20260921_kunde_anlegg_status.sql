-- Status på kunde og anlegg: aktiv → pauset → deaktivert.
--
-- Erstatter «skjult»-flagget som eneste tilstand, men beholder kolonnen og holder den i synk
-- (skjult = status <> 'aktiv') slik at alle eksisterende filtre i appen fortsetter å virke.
--
-- Regler (håndheves i databasen, appen viser vennlige meldinger):
--   * En kunde kan ikke settes til pauset/deaktivert så lenge den har aktive anlegg.
--     Anleggene må settes til pauset/deaktivert eller flyttes til en annen kunde først.
--   * Et anlegg kan ikke settes til aktiv når kunden er pauset/deaktivert.

-- 1. Kolonner
alter table customer add column if not exists status text not null default 'aktiv';
alter table anlegg   add column if not exists status text not null default 'aktiv';

alter table customer drop constraint if exists customer_status_check;
alter table customer add constraint customer_status_check check (status in ('aktiv', 'pauset', 'deaktivert'));
alter table anlegg drop constraint if exists anlegg_status_check;
alter table anlegg add constraint anlegg_status_check check (status in ('aktiv', 'pauset', 'deaktivert'));

-- 2. Fyll inn fra dagens skjult-flagg
update customer set status = 'deaktivert' where skjult is true and status = 'aktiv';
update anlegg   set status = 'deaktivert' where skjult is true and status = 'aktiv';

-- 3. Hold status og skjult i synk begge veier
-- (Before-triggere kjører i alfabetisk rekkefølge: 1_synk må kjøre før 2_sjekk, slik at en gammel
--  «skjult = true» også blir kontrollert som en statusendring.)
create or replace function synk_status_skjult() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.skjult is true and new.status = 'aktiv' then new.status := 'deaktivert'; end if;
  elsif new.status is distinct from old.status then
    -- status endret: skjult følger
    null;
  elsif new.skjult is distinct from old.skjult then
    -- bare skjult endret (gammel kode): status følger
    new.status := case when new.skjult then 'deaktivert' else 'aktiv' end;
  end if;
  new.skjult := (new.status <> 'aktiv');
  return new;
end $$;

drop trigger if exists customer_synk_status on customer;
drop trigger if exists customer_1_synk_status on customer;
create trigger customer_1_synk_status before insert or update on customer
  for each row execute function synk_status_skjult();
drop trigger if exists anlegg_synk_status on anlegg;
drop trigger if exists anlegg_1_synk_status on anlegg;
create trigger anlegg_1_synk_status before insert or update on anlegg
  for each row execute function synk_status_skjult();

-- 4. Kunde kan ikke pauses/deaktiveres med aktive anlegg
create or replace function sjekk_kunde_status() returns trigger language plpgsql as $$
declare antall int;
begin
  if new.status <> 'aktiv' and new.status is distinct from old.status then
    select count(*) into antall from anlegg where kundenr = new.id and status = 'aktiv';
    if antall > 0 then
      raise exception 'Kunden har % aktive anlegg. Sett anleggene til pauset/deaktivert eller flytt dem til en annen kunde før kunden kan settes til %.', antall, new.status
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists customer_sjekk_status on customer;
drop trigger if exists customer_2_sjekk_status on customer;
create trigger customer_2_sjekk_status before update on customer
  for each row execute function sjekk_kunde_status();

-- 5. Anlegg kan ikke aktiveres under en kunde som ikke er aktiv
create or replace function sjekk_anlegg_status() returns trigger language plpgsql as $$
declare kunde_status text;
begin
  if new.status = 'aktiv' and new.kundenr is not null
     and (tg_op = 'INSERT' or new.status is distinct from old.status or new.kundenr is distinct from old.kundenr) then
    select status into kunde_status from customer where id = new.kundenr;
    if kunde_status is not null and kunde_status <> 'aktiv' then
      raise exception 'Kunden er %. Aktiver kunden først, eller sett anlegget til samme status.', kunde_status
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists anlegg_sjekk_status on anlegg;
drop trigger if exists anlegg_2_sjekk_status on anlegg;
create trigger anlegg_2_sjekk_status before insert or update on anlegg
  for each row execute function sjekk_anlegg_status();

create index if not exists anlegg_kundenr_status_idx on anlegg (kundenr, status);
