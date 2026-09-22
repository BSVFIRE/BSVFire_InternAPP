# PowerSync i FireCtrl

Offline-først for feltmodulene: en lokal SQLite-database i nettleseren holdes i synk med Supabase.
Pilot: **nødlys**. Appen kjører som før (direkte mot Supabase) når `VITE_POWERSYNC_URL` ikke er satt.

## Oppsett

1. **Supabase** – kjør `supabase.sql` i SQL Editor (bytt passord først).
2. **PowerSync-dashboard**
   - Connections → Postgres: Supabase *direct connection* (eller *Session mode*-pooler på Free-plan),
     bruker `powersync_role` + passordet fra steg 1.
   - Client auth → *Supabase auth* på, lim inn Supabase **JWT secret** (Settings → API).
   - Sync Streams → lim inn `sync-rules.yaml` → Deploy.
3. **Appen** – sett `VITE_POWERSYNC_URL=https://<instans>.powersync.journeyapps.com` i `.env.local`
   (lokalt) og i Netlify → Environment variables (prod). Bygg på nytt.

## Kode

| Fil | Rolle |
| --- | --- |
| `src/lib/powersync/schema.ts` | Lokalt SQLite-skjema (må matche Postgres-kolonnene) |
| `src/lib/powersync/connector.ts` | Token fra Supabase-sesjonen; lokale endringer lastes opp med supabase-js (RLS/triggere gjelder) |
| `src/lib/powersync/db.ts` | Databasen, `startPowerSync()`/`stoppPowerSync()` (kobles til auth i `authStore`) |
| `src/lib/powersync/nodlys.ts` | Lesing (`useNodlysLokal`) og skriving for nødlys |

## Ny modul

1. Legg tabellen til i `supabase.sql`-publikasjonen: `alter publication powersync add table <tabell>;`
2. Legg den til i `sync-rules.yaml` (Sync Streams i dashboardet) og deploy.
3. Legg til tabellen i `schema.ts`.
4. Bytt lese-/skriveveien i modulen til lokale spørringer (mønster: `nodlys.ts` + `powersyncAktiv`-grenene i `Nodlys.tsx`).
