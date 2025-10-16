# Nedlastinger og E-postlogg

## Oversikt

Dette dokumentet beskriver funksjonaliteten for nedlastinger og e-postlogging som ble implementert i systemet.

## Funksjoner

### 1. E-postlogg Database

**Tabell:** `epost_logg`

Lagrer all informasjon om e-postutsendelser av dokumenter.

**Felter:**
- `id` - Unik ID
- `anlegg_id` - Referanse til anlegg
- `dokument_navn` - Navn på dokumentet som ble sendt
- `dokument_storage_path` - Sti til dokumentet i storage
- `mottaker_epost` - E-postadresse til mottaker
- `mottaker_navn` - Navn på mottaker (hvis tilgjengelig)
- `mottaker_type` - Type mottaker: 'kunde', 'tekniker', eller 'ekstra'
- `sendt_av_ansatt_id` - Referanse til ansatt som sendte e-posten
- `sendt_dato` - Tidspunkt for utsendelse
- `emne` - E-postens emne
- `status` - Status: 'sendt' eller 'feilet'
- `feilmelding` - Feilmelding hvis sending feilet

**Migrering:** `supabase_migrations/create_epost_logg.sql`

### 2. Send Rapporter - Logging

Oppdatert `SendRapporter.tsx` til å automatisk logge alle e-postutsendelser.

**Funksjonalitet:**
- Logger hver enkelt dokument sendt til hver mottaker
- Registrerer hvem som sendte, når det ble sendt, og til hvem
- Håndterer feil og logger feilede forsøk
- Sporer mottakertype (kunde, tekniker, ekstra)

### 3. Nedlastinger-side

Ny side: `/nedlastinger`

**To hovedvisninger:**

#### A. Dokumenter
- Viser alle tilgjengelige dokumenter fra alle anlegg
- Søk etter dokumentnavn eller anleggsnavn
- Filtrer etter type (PDF, Rapport, Servicerapport)
- Filtrer etter dato (fra/til)
- Favoritt-funksjon (lagres lokalt i browser)
- Sortering: Favoritter først, deretter nyeste først
- Last ned dokumenter direkte

**Funksjoner:**
- ⭐ Marker dokumenter som favoritter
- 🔍 Søk i dokumentnavn og anleggsnavn
- 🗂️ Filtrer etter dokumenttype
- 📅 Filtrer etter dato
- ⬇️ Last ned dokumenter

#### B. E-posthistorikk
- Viser alle e-poster som er sendt via systemet
- Detaljert informasjon om hver utsendelse
- Søk i dokumentnavn, anleggsnavn, mottaker
- Filtrer etter dato
- Visuell indikator for sendt/feilet status
- Fargekoding av mottakertype

**Informasjon som vises:**
- Dokumentnavn
- Mottaker (navn og e-post)
- Mottakertype (Kunde/Tekniker/Ekstra)
- Anlegg
- Sendt av (ansatt)
- Dato og tid
- E-postens emne
- Status (sendt/feilet)

**Fargekoding:**
- 🔵 Kunde - Blå
- 🟢 Tekniker - Grønn
- 🟣 Ekstra - Lilla
- ✅ Sendt - Grønn ikon
- ❌ Feilet - Rød bakgrunn og ikon

## Navigasjon

Nedlastinger-siden er tilgjengelig fra:
- Dokumentasjon-siden (`/dokumentasjon`)
- Direkte URL: `/nedlastinger`

Begge sider har tilbake-knapp til Dokumentasjon.

## Teknisk Implementering

### Database
```sql
-- Kjør migrering
psql -d your_database -f supabase_migrations/create_epost_logg.sql
```

### Frontend Komponenter
- `src/pages/Nedlastinger.tsx` - Hovedside
- `src/pages/SendRapporter.tsx` - Oppdatert med logging
- `src/pages/Dokumentasjon.tsx` - Oppdatert med link til Nedlastinger

### State Management
- Dokumenter lastes fra Supabase Storage
- E-postlogg lastes fra `epost_logg` tabell
- Favoritter lagres i `localStorage`

### Filtrering og Søk
- Real-time filtrering ved endring
- Kombinert søk i flere felter
- Dato-range filtrering
- Type-filtrering for dokumenter

## Fremtidige Forbedringer

Potensielle utvidelser:
- [ ] Eksporter e-posthistorikk til CSV/Excel
- [ ] Statistikk over e-postutsendelser
- [ ] Notifikasjoner ved feilede utsendelser
- [ ] Bulk-nedlasting av dokumenter
- [ ] Avanserte søkefiltre (f.eks. per kunde)
- [ ] Automatisk retry av feilede e-poster
- [ ] E-post templates administrasjon

## Brukerveiledning

### Slik bruker du Nedlastinger-siden:

1. **Navigér til siden:**
   - Gå til Dokumentasjon → Nedlastinger

2. **Velg visning:**
   - Klikk "Dokumenter" for å se alle tilgjengelige filer
   - Klikk "E-posthistorikk" for å se sendte e-poster

3. **Søk og filtrer:**
   - Bruk søkefeltet for å finne spesifikke dokumenter/e-poster
   - Velg type-filter for dokumenter
   - Sett dato-range for å begrense resultater

4. **Last ned dokumenter:**
   - Klikk "Last ned" knappen på ønsket dokument
   - Filen lastes ned til din nedlastingsmappe

5. **Favoritter:**
   - Klikk på stjerne-ikonet for å markere favoritter
   - Favoritter vises øverst i listen

### Slik bruker du E-postlogging:

E-postlogging skjer automatisk når du sender e-post via "Send rapporter":

1. Gå til Dokumentasjon → Send rapporter
2. Velg kunde, anlegg, dokumenter og mottakere
3. Send e-post som normalt
4. Alle utsendelser logges automatisk
5. Se historikk under Nedlastinger → E-posthistorikk

## Support

Ved problemer eller spørsmål, kontakt systemadministrator.
