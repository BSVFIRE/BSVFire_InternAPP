# Multi-Tenant Migrering for FireCtrl.IO

## Oversikt

Denne mappen inneholder SQL-scripts for å sette opp et **nytt** multi-tenant Supabase-prosjekt for FireCtrl.IO SaaS.

## Filstruktur

```
MULTI_TENANT_MIGRATION/
├── README.md                           # Denne filen
├── 01_create_companies_table.sql       # Companies + user mapping + hjelpefunksjoner
├── 02_create_all_tables.sql            # Hovedtabeller (customer, anlegg, ordre, etc.)
├── 03_create_technical_tables.sql      # Tekniske tabeller (brannalarm, nødlys, etc.)
├── 04_create_service_fdv_system_tables.sql  # Service, FDV og system-tabeller
├── 05_create_rls_policies.sql          # RLS policies for alle tabeller
└── 06_create_triggers.sql              # Auto-triggers for company_id (ingen frontend-endring!)
```

## Fremgangsmåte

### Fase 1: Forberedelse
1. **Opprett ny Supabase-organisasjon:** `FireCtrl` eller `FireCtrl.IO`
2. **Opprett nytt prosjekt:** `firectrl-production`
3. **Ta backup av BSVFire-prosjektet** (Settings → Database → Download backup)

### Fase 2: Database-oppsett (i nytt prosjekt)
Kjør scriptene i rekkefølge i Supabase SQL Editor:

1. `01_create_companies_table.sql` - Oppretter companies, user_mapping og hjelpefunksjoner
2. `02_create_all_tables.sql` - Hovedtabeller (customer, anlegg, ordre, etc.)
3. `03_create_technical_tables.sql` - Tekniske tabeller (brannalarm, nødlys, røykluke, etc.)
4. `04_create_service_fdv_system_tables.sql` - Service, FDV og system-tabeller
5. `05_create_rls_policies.sql` - RLS policies for alle tabeller
6. `06_create_triggers.sql` - Auto-triggers (setter company_id automatisk!)

### Fase 3: Data-migrering
1. Eksporter data fra BSVFire-prosjektet (pg_dump eller Supabase backup)
2. Importer til nytt prosjekt
3. Kjør UPDATE for å sette company_id på alle rader:
   ```sql
   UPDATE customer SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879');
   UPDATE anlegg SET company_id = (SELECT id FROM companies WHERE org_nr = '921044879');
   -- osv for alle tabeller...
   ```
4. Verifiser at all data er på plass

### Fase 4: Koble brukere til selskap
```sql
-- Koble eksisterende brukere til BSVFire
INSERT INTO user_company_mapping (user_id, company_id, rolle)
SELECT 
  au.id,
  (SELECT id FROM companies WHERE org_nr = '921044879'),
  'admin'
FROM auth.users au;
```

### Fase 5: Go-live
1. Oppdater `.env.local` med nye Supabase-credentials:
   ```
   VITE_SUPABASE_URL=https://ditt-nye-prosjekt.supabase.co
   VITE_SUPABASE_ANON_KEY=din-nye-anon-key
   ```
2. Deploy til produksjon
3. Verifiser at BSVFire fungerer som før

## Viktige notater

⚠️ **IKKE kjør disse scriptene i BSVFire-prosjektet!**

Disse scriptene er ment for et NYTT Supabase-prosjekt. BSVFire-prosjektet skal forbli urørt til migreringen er fullført og testet.

## Tabeller som får company_id

### Hovedtabeller
- customer
- anlegg
- kontaktpersoner
- ansatte
- ordre
- servicerapporter
- avvik
- oppgaver
- moter
- prosjekter
- prosjekteringer
- salgs_leads
- rapporter
- dokumenter
- hendelser

### Anleggsdata
- anleggsdata_brannalarm
- anleggsdata_brannslanger
- anleggsdata_brannslukkere
- anleggsdata_forstehjelp
- anleggsdata_nodlys
- anleggsdata_kontroll

### Røykluke
- roykluke_sentraler
- roykluke_luker

### Brannalarm
- brannalarm_styringer
- enheter_brannalarm
- nettverk_brannalarm
- alarmorganisering
- alarmoverforing

### Detektor
- detektorlister
- detektor_items

### Serviceavtaler
- serviceavtale_priser
- serviceavtale_tilbud

### Priser
- priser_kundenummer
- prishistorikk

### FDV
- fdv_leverandorer
- fdv_produkttyper
- fdv_datablader
- fdv_anlegg_datablader
- fdv_genererte_dokumenter

### System
- knowledge_base
- epost_logg
- system_logs

## Junction-tabeller (uten company_id)

Disse tabellene trenger IKKE `company_id` fordi de refererer til tabeller som allerede har det:

- anlegg_kontaktpersoner
- anlegg_todos
- mote_deltakere
- mote_agendapunkter
- mote_oppgaver
- mote_referater
- kontrollsjekkpunkter_brannalarm
- kontroll_notater
- salgs_leads_kommentarer
- prosjektering_risikoanalyse
- prosjektering_systemplan

## Kontakt

Ved spørsmål, kontakt utvikler.
