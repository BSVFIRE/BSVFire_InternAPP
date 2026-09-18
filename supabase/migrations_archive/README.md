# Arkiverte migrasjoner

Disse filene er **ikke** en del av `supabase/migrations/` og kjøres ikke av CLI-en.
De ligger her som historikk.

- `manuelle/` – SQL-filer som ble kjørt manuelt i SQL Editor i 2025–2026, uten tidsstempel
  eller rekkefølge. Noen er kjørt, noen ikke, og flere overlapper. Den faktiske tilstanden
  i produksjon er dokumentert i `supabase/migrations/20260918_rls_hardening.sql` (RLS) og
  i `src/lib/database.types.ts` (skjema, generert med `supabase gen types`).
- `multi_tenant_migration/` – utkast til `company_id`-basert multi-tenant. Ikke tatt i bruk.

## Regel fra nå av

Alle skjemaendringer legges i `supabase/migrations/` med tidsstempel-prefiks
(`YYYYMMDD_beskrivelse.sql`), og etter kjøring i prod regenereres typene:

```bash
supabase gen types typescript --linked --schema public > src/lib/database.types.ts
```
