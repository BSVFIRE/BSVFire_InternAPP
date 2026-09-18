-- RLS-innstramming, kjørt manuelt i Supabase SQL Editor 2026-09-18.
-- Denne filen dokumenterer det som ALLEREDE er kjørt i prod, slik at repoet stemmer.
-- Kjør IKKE på nytt mot prod uten å sjekke – flere policies vil da mangle ("does not exist").
--
-- Bakgrunn (kodegjennomgang 2026-09-17):
--   * 17 tabeller hadde SELECT-policy "USING (true)" for rollen public → lesbare med anon-nøkkelen
--   * 7 tabeller var også skrivbare uten innlogging
--   * detektorlister, detektor_items og serviceavtale_tilbud hadde RLS avslått
--   * dropbox_config (access/refresh token) var lesbar for alle innloggede
--   * alle innloggede kunne endre ansatte.rolle, modul_tilganger, system_logs, serviceavtale_priser
--   * ansatte.id er IKKE lik auth.uid() – policies med "auth.uid() = id" virket aldri

-- ============================================================
-- BLOKK 1: Slå på RLS og fjern anonym tilgang (trygg delmengde)
-- ============================================================
alter table detektorlister enable row level security;
alter table detektor_items enable row level security;
alter table serviceavtale_tilbud enable row level security;

drop policy if exists "Alle kan lese customer" on customer;
drop policy if exists "Alle kan lese anlegg" on anlegg;
drop policy if exists "Alle kan lese kontaktpersoner" on kontaktpersoner;
drop policy if exists "Alle kan lese anlegg_kontaktpersoner" on anlegg_kontaktpersoner;
drop policy if exists "Alle kan lese anleggsdata_nodlys" on anleggsdata_nodlys;
drop policy if exists "Alle kan lese eksterne kontaktpersoner" on kontaktperson_ekstern;
drop policy if exists "Alle kan lese avvik" on avvik;
drop policy if exists "Alle kan lese opplaering" on opplaering;

drop policy if exists "Alle kan opprette avvik" on avvik;
drop policy if exists "Alle kan oppdatere avvik" on avvik;
drop policy if exists "Alle kan slette avvik" on avvik;
drop policy if exists "Alle kan opprette opplaering" on opplaering;
drop policy if exists "Alle kan oppdatere opplaering" on opplaering;
drop policy if exists "Alle kan slette opplaering" on opplaering;

drop policy if exists "Authenticated users can check dropbox status" on dropbox_config;

-- ============================================================
-- BLOKK 2: Tabeller som bare hadde den åpne policyen – erstatt
-- ============================================================
drop policy if exists "Alle kan se møter" on moter;
create policy "Innloggede kan se møter" on moter for select to authenticated using (true);
drop policy if exists "Alle kan se deltakere" on mote_deltakere;
create policy "Innloggede kan se deltakere" on mote_deltakere for select to authenticated using (true);
drop policy if exists "Alle kan se agendapunkter" on mote_agendapunkter;
create policy "Innloggede kan se agendapunkter" on mote_agendapunkter for select to authenticated using (true);
drop policy if exists "Alle kan se referater" on mote_referater;
create policy "Innloggede kan se referater" on mote_referater for select to authenticated using (true);
drop policy if exists "Alle kan se møteoppgaver" on mote_oppgaver;
create policy "Innloggede kan se møteoppgaver" on mote_oppgaver for select to authenticated using (true);

drop policy if exists "Users can view all alarmorganisering" on alarmorganisering;
drop policy if exists "Users can insert alarmorganisering" on alarmorganisering;
drop policy if exists "Users can update alarmorganisering" on alarmorganisering;
drop policy if exists "Users can delete alarmorganisering" on alarmorganisering;
create policy "Innloggede full tilgang" on alarmorganisering for all to authenticated using (true) with check (true);

drop policy if exists "Allow all operations on addressering" on addressering;
create policy "Innloggede full tilgang" on addressering for all to authenticated using (true) with check (true);

-- Legacy-tabeller uten bruk i koden: ingen policies = ingen tilgang
drop policy if exists "Users can view all kundekort" on kundekort;
drop policy if exists "Users can insert kundekort" on kundekort;
drop policy if exists "Users can update kundekort" on kundekort;
drop policy if exists "Users can delete kundekort" on kundekort;
drop policy if exists "Users can view all project facilities" on prosjekt_anlegg;
drop policy if exists "Users can insert project facilities" on prosjekt_anlegg;
drop policy if exists "Users can update project facilities" on prosjekt_anlegg;
drop policy if exists "Users can delete project facilities" on prosjekt_anlegg;
drop policy if exists "Users can view all project messages" on prosjekt_meldinger;
drop policy if exists "Users can insert project messages" on prosjekt_meldinger;
drop policy if exists "Users can update project messages" on prosjekt_meldinger;
drop policy if exists "Users can delete project messages" on prosjekt_meldinger;

-- ============================================================
-- BLOKK 3: Koble ansatte til auth-bruker, innfør is_admin()
-- ============================================================
alter table ansatte add column if not exists auth_user_id uuid unique references auth.users(id);

update ansatte a
set auth_user_id = u.id
from auth.users u
where lower(u.email) = lower(a.epost) and a.auth_user_id is null;

-- security definer: leser ansatte uten å trigge RLS-rekursjon
create or replace function public.current_ansatt_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from ansatte where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from ansatte
    where auth_user_id = auth.uid() and rolle in ('admin', 'administrator')
  );
$$;

revoke all on function public.current_ansatt_id() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_ansatt_id() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ansatte: alle innloggede kan lese, egen rad kan oppdateres, resten kun admin
drop policy if exists "Users can update ansatte" on ansatte;
drop policy if exists "Users can delete ansatte" on ansatte;
drop policy if exists "Users can insert ansatte" on ansatte;
drop policy if exists "Users can update own ansatte record" on ansatte;

create policy "Egen rad kan oppdateres" on ansatte
  for update to authenticated
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
create policy "Admin kan oppdatere ansatte" on ansatte
  for update to authenticated using (is_admin()) with check (is_admin());
create policy "Admin kan opprette ansatte" on ansatte
  for insert to authenticated with check (is_admin());
create policy "Admin kan slette ansatte" on ansatte
  for delete to authenticated using (is_admin());

-- RLS kan ikke begrense enkeltkolonner; trigger hindrer at ikke-admin endrer egen rolle
create or replace function public.beskytt_rolle()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.rolle is distinct from old.rolle and not is_admin() then
    raise exception 'Kun administrator kan endre rolle';
  end if;
  if new.auth_user_id is distinct from old.auth_user_id and not is_admin() then
    raise exception 'Kun administrator kan endre brukerkobling';
  end if;
  return new;
end $$;

drop trigger if exists trg_beskytt_rolle on ansatte;
create trigger trg_beskytt_rolle before update on ansatte
  for each row execute function beskytt_rolle();

-- modul_tilganger: kun admin kan endre
drop policy if exists "Admin can insert modul_tilganger" on modul_tilganger;
drop policy if exists "Admin can update modul_tilganger" on modul_tilganger;
drop policy if exists "Admin can delete modul_tilganger" on modul_tilganger;
create policy "Kun admin kan endre modul_tilganger" on modul_tilganger
  for all to authenticated using (is_admin()) with check (is_admin());

-- system_logs: alle kan skrive, kun admin kan lese/slette
drop policy if exists "Administratorer kan lese logger" on system_logs;
drop policy if exists "Administratorer kan slette logger" on system_logs;
create policy "Kun admin kan lese logger" on system_logs
  for select to authenticated using (is_admin());
create policy "Kun admin kan slette logger" on system_logs
  for delete to authenticated using (is_admin());

-- serviceavtale_priser: kun admin kan endre
drop policy if exists "Admins can update pricing" on serviceavtale_priser;
create policy "Kun admin kan endre priser" on serviceavtale_priser
  for update to authenticated using (is_admin()) with check (is_admin());
