
-- En kode uten anlegg_id er en blank etikett som ligger i servicebilen.
--
-- Erstatter arbeidsflyten der koden ble født i Kontrollportal (ledige_koder) og koblet
-- med tastatur der. Nå fødes koden her, og kobles til et anlegg i FireCtrl ved skanning.

create table if not exists anlegg_qr_koder (
  kode         text primary key check (kode ~ '^[A-Z0-9]{8}$'),
  anlegg_id    uuid references anlegg(id) on delete set null,
  merkelapp    text,                                   -- «Sentral 2, kjeller»
  opprettet    timestamptz not null default now(),
  opprettet_av uuid references ansatte(id),
  koblet       timestamptz,
  koblet_av    uuid references ansatte(id)
);

create index if not exists idx_anlegg_qr_koder_anlegg on anlegg_qr_koder(anlegg_id);
create index if not exists idx_anlegg_qr_koder_ledige on anlegg_qr_koder(opprettet) where anlegg_id is null;

alter table anlegg_qr_koder enable row level security;

create policy "Innloggede kan lese qr-koder" on anlegg_qr_koder
  for select to authenticated using (true);
create policy "Innloggede kan opprette qr-koder" on anlegg_qr_koder
  for insert to authenticated with check (true);
create policy "Innloggede kan koble qr-koder" on anlegg_qr_koder
  for update to authenticated using (true) with check (true);
create policy "Kun admin kan slette qr-koder" on anlegg_qr_koder
  for delete to authenticated using (is_admin());

-- Eksisterende unik_kode på anlegg blir første kode per anlegg (kun gyldige 8-tegns koder)
insert into anlegg_qr_koder (kode, anlegg_id, merkelapp, opprettet, koblet)
select upper(unik_kode), id, 'Sentral 1', coalesce(opprettet_dato::timestamptz, created_at, now()), coalesce(sist_oppdatert::timestamptz, now())
from anlegg
where unik_kode is not null and upper(unik_kode) ~ '^[A-Z0-9]{8}$'
on conflict (kode) do nothing;

-- Når en kode kobles til et anlegg som ennå ikke har unik_kode/kontrollportal_url,
-- fylles de ut så eksisterende visninger (og Kontrollportal-sync) fortsetter å virke.
create or replace function public.qr_kode_koblet()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Gjelder både insert (OLD er null) og update der anlegg_id settes/endres
  if new.anlegg_id is not null and (tg_op = 'INSERT' or old.anlegg_id is distinct from new.anlegg_id) then
    new.koblet := coalesce(new.koblet, now());
    update anlegg
      set unik_kode = coalesce(unik_kode, new.kode),
          kontrollportal_url = coalesce(kontrollportal_url, 'https://www.kontrollportal.no/anlegg?kode=' || new.kode)
      where id = new.anlegg_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_qr_kode_koblet on anlegg_qr_koder;
create trigger trg_qr_kode_koblet before insert or update on anlegg_qr_koder
  for each row execute function qr_kode_koblet();
