# Tilbud Serviceavtale Module

## Oversikt
Ny modul under Dokumentasjon for å opprette og administrere serviceavtaletilbud.

## Funksjoner

### 1. Kundeinformasjon
- **Velg eksisterende kunde**: Dropdown med alle registrerte kunder
- **Søk i Brønnøysundregistrene**: 
  - Søk etter bedriftsnavn (med debounce)
  - Søk med organisasjonsnummer
  - Automatisk utfylling av kundedata
- **Manuell registrering**: Mulighet til å legge inn kundenavn og org.nr manuelt
- **Anleggsvalg**: Hvis kunde er valgt, kan man velge et av kundens anlegg

### 2. Kontaktperson
- **Velg eksisterende**: Dropdown med alle registrerte kontaktpersoner
- **Opprett ny**: Inline-skjema for å opprette ny kontaktperson med:
  - Navn (påkrevd)
  - E-post
  - Telefon

### 3. Tjenester
Interaktive checkboxer for å velge inkluderte tjenester:
- **Brannalarm** (rød)
- **Nødlys** (gul)
- **Slukkeuttsyr** (blå)
- **Røkluker** (lilla)
- **Eksternt** (grønn)

### 4. Tilleggsdetaljer
- Tilbudsnummer
- Status (Utkast, Sendt, Godkjent, Avvist)
- Beskrivelse
- Interne notater

## Filstruktur

```
src/pages/
├── TilbudServiceavtale.tsx          # Hovedkomponent med liste og oversikt
└── tilbud/
    ├── TilbudForm.tsx               # Hovedskjema
    ├── TilbudDetails.tsx            # Detaljvisning
    ├── StatusBadge.tsx              # Status badge komponent
    ├── CustomerSection.tsx          # Kundeseksjon med Brønnøysund-søk
    ├── ContactPersonSection.tsx     # Kontaktpersonseksjon
    └── ServicesSection.tsx          # Tjenestevelger

supabase_migrations/
└── create_serviceavtale_tilbud_table.sql  # Database migration
```

## Database

### Tabell: `serviceavtale_tilbud`

**Kolonner:**
- `id` - UUID (primary key)
- `kunde_id` - UUID (foreign key til customer)
- `kunde_navn` - TEXT (påkrevd)
- `kunde_organisasjonsnummer` - TEXT
- `anlegg_id` - UUID (foreign key til anlegg)
- `anlegg_navn` - TEXT
- `kontaktperson_id` - UUID (foreign key til kontaktpersoner)
- `kontaktperson_navn` - TEXT
- `kontaktperson_epost` - TEXT
- `kontaktperson_telefon` - TEXT
- `tjeneste_brannalarm` - BOOLEAN
- `tjeneste_nodlys` - BOOLEAN
- `tjeneste_slukkeutstyr` - BOOLEAN
- `tjeneste_rokluker` - BOOLEAN
- `tjeneste_eksternt` - BOOLEAN
- `tilbud_nummer` - TEXT
- `beskrivelse` - TEXT
- `notater` - TEXT
- `status` - TEXT (utkast, sendt, godkjent, avvist)
- `opprettet` - TIMESTAMPTZ
- `sist_oppdatert` - TIMESTAMPTZ
- `sendt_dato` - TIMESTAMPTZ
- `opprettet_av` - UUID (foreign key til auth.users)

**Indekser:**
- kunde_id
- anlegg_id
- kontaktperson_id
- status
- opprettet (DESC)

**RLS Policies:**
- Alle autentiserte brukere kan lese, opprette, oppdatere og slette

## Routing

**URL:** `/tilbud-serviceavtale`

**Navigasjon:** Dokumentasjon → Tilbud Serviceavtale

## UI/UX Features

### Liste-visning
- Søk etter kunde, anlegg eller tilbudsnummer
- Statistikk-kort: Totalt, Utkast, Sendt, Godkjent
- Tabell med:
  - Kunde/Anlegg
  - Tjenester (badges)
  - Status
  - Opprettet dato
  - Handlinger (Vis, Rediger, Slett)

### Skjema
- Modulær oppbygning med separate seksjoner
- Brønnøysund API-integrasjon for kundesøk
- Inline opprettelse av kontaktperson
- Visuell tjenestevelger med fargekoding
- Validering av påkrevde felt

### Detaljvisning
- Oversiktlig visning av all informasjon
- Status badge
- Kontaktinformasjon med klikkbare lenker
- Visuell fremheving av valgte tjenester
- Metadata (opprettet, oppdatert, sendt)

## Integrasjoner

### Brønnøysund API
- Søk etter bedriftsnavn
- Hent bedrift med organisasjonsnummer
- Automatisk formatering av org.nr (XXX XXX XXX)
- Viser adresse og poststed i søkeresultater

### Supabase
- Real-time data synkronisering
- RLS for sikkerhet
- Automatisk timestamp-oppdatering
- Foreign key constraints

## Neste steg (valgfritt)

1. **PDF-generering**: Generer PDF av tilbud
2. **E-post**: Send tilbud direkte til kunde via e-post
3. **Mal-system**: Lagre og gjenbruk tilbudsmaler
4. **Prising**: Integrer med prissystem for automatisk beregning
5. **Godkjenningsflyt**: Workflow for godkjenning av tilbud
6. **Historikk**: Logg endringer og versjonshistorikk

## Installasjon

1. Kjør database migration:
```sql
psql -d your_database -f supabase_migrations/create_serviceavtale_tilbud_table.sql
```

2. Modulen er automatisk tilgjengelig i Dokumentasjon-seksjonen

## Testing

- Verifiser at Brønnøysund-søk fungerer
- Test opprettelse av tilbud med eksisterende kunde
- Test opprettelse av tilbud med ny kunde via Brønnøysund
- Test opprettelse av ny kontaktperson inline
- Verifiser at alle tjenester kan velges/fravelges
- Test redigering og sletting av tilbud
- Sjekk at status-endringer fungerer
