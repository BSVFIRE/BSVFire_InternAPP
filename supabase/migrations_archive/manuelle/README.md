# Supabase Database Migrations

## Hvordan kjøre migrasjoner

### Manuelt via Supabase Dashboard:
1. Gå til [Supabase Dashboard](https://supabase.com/dashboard)
2. Velg ditt prosjekt
3. Gå til **SQL Editor**
4. Kopier innholdet fra SQL-filen
5. Lim inn og kjør SQL-koden

### Via Supabase CLI (anbefalt):
```bash
# Installer Supabase CLI hvis du ikke har det
npm install -g supabase

# Logg inn
supabase login

# Link til ditt prosjekt
supabase link --project-ref <your-project-ref>

# Kjør migrasjonen
supabase db push
```

## Migrasjoner

### `create_nodlys_table.sql`
**Opprettet:** 2025-10-09  
**Beskrivelse:** Oppretter tabell for registrering av nødlysarmaturer

**Tabellstruktur:**
- `id` - UUID (primary key)
- `anlegg_id` - UUID (foreign key til anlegg)
- `plassering` - TEXT (plassering av nødlysenheten)
- `type` - TEXT (LED, Halogen, Fluorescerende, Annet)
- `watt` - INTEGER (effekt i watt)
- `status` - TEXT (OK, Defekt, Mangler, Utskiftet)
- `sist_kontrollert` - DATE (dato for siste kontroll)
- `kommentar` - TEXT (eventuelle merknader)
- `opprettet_dato` - TIMESTAMP (opprettelsesdato)

**Indekser:**
- `idx_nodlys_anlegg_id` - For rask søk på anlegg
- `idx_nodlys_status` - For filtrering på status
- `idx_nodlys_sist_kontrollert` - For sortering på kontrolldato

**Row Level Security:**
- Autentiserte brukere har full tilgang (SELECT, INSERT, UPDATE, DELETE)

## Fremtidige migrasjoner

Når du legger til flere rapporttyper (brannalarm, slukkeutstyr, røykluker), opprett tilsvarende SQL-filer her.
