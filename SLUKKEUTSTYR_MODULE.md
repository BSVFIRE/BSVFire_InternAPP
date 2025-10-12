# Slukkeutstyr-modul

## ✅ Implementert funksjonalitet

### **Hovedfunksjoner**
- ✅ Velg kunde fra dropdown (med søk)
- ✅ Velg anlegg (filtrert på valgt kunde)
- ✅ Modulvalg: Brannslukkere eller Brannslanger
- ✅ Statistikk-oversikt for hver modul

### **Brannslukkere-modul** 🔴
- ✅ Vis alle brannslukkere for valgt anlegg
- ✅ Legg til nye brannslukkere (enkeltvis eller bulk)
- ✅ Rediger eksisterende brannslukkere
- ✅ Slett brannslukkere (med bekreftelse)
- ✅ Søk i brannslukkerliste
- ✅ Statistikk: Totalt, OK, Defekt, Utgått

**Felter:**
- Internnummer (Nr)
- Fabrikatnummer
- Plassering
- Etasje (dropdown: -2 til 12 Etg, Ukjent)
- Produsent
- Type (dropdown: Pulver, Skum, CO2, Vann, Litium)
- Størrelse (dropdown: 2KG, 6KG, 9KG, 12KG, 6L, 9L, 4L, 5KG)
- Produksjonsår
- Sist kontrollert (dato)
- Status (multi-select):
  - OK
  - OK Byttet
  - Ikke funnet
  - Ikke tilkomst
  - Utgått
  - Skadet
  - Mangler skilt
  - Manometerfeil
  - Ikke trykk
  - Fjernet

### **Brannslanger-modul** 🔵
- ✅ Vis alle brannslanger for valgt anlegg
- ✅ Legg til nye brannslanger (enkeltvis eller bulk)
- ✅ Rediger eksisterende brannslanger
- ✅ Slett brannslanger (med bekreftelse)
- ✅ Søk i brannslangeliste
- ✅ Statistikk: Totalt, OK, Må trykktestes, Lekkasje

**Felter:**
- Internnummer (Nr)
- Plassering
- Etasje (dropdown: -2 til 12 Etg, Ukjent)
- Produsent
- Type (dropdown: Innvendig, Utvendig)
- Lengde (dropdown: 20M, 25M, 30M, 35M, 40M)
- Diameter (dropdown: 19mm, 25mm, 1", 2")
- Produksjonsår
- Trykk (bar)
- Sist kontrollert (dato)
- Munnstykke
- Skap type
- Status (multi-select):
  - OK
  - Ikke funnet
  - Ikke tilkomst
  - Skade på slange
  - Feil strålerør
  - Ikke vann
  - Rust i skap
  - Mangler skilt
  - Slange feil vei
  - Lekkasje
  - Må trykktestes
  - Skade tilførselsslange
  - Lekkasje nav
  - Lekkasje slange
  - Lekkasje Strålerør

## 🎨 Design

- **Modulkort** med ikoner og farger
- **Kunde/Anlegg-velger** med søkefunksjon
- **Statistikk-kort** med fargekoding:
  - 🔵 Totalt (blå)
  - 🟢 OK (grønn)
  - 🔴 Defekt/Lekkasje (rød)
  - 🟡 Utgått/Må trykktestes (gul)
- **Responsivt skjema** med grid-layout
- **Status-knapper** med toggle-funksjonalitet

## 📊 Datamodeller

### Brannslukker
```typescript
interface Brannslukker {
  id?: string
  anlegg_id: string
  internnummer?: string | null
  fabrikatnummer?: string | null
  plassering?: string | null
  etasje?: string | null
  type?: string | null            // Pulver, Skum, CO2, Vann, Litium
  storrelse?: string | null       // 2KG, 6KG, 9KG, etc.
  produsent?: string | null
  produksjonsaar?: number | null
  sist_kontrollert?: string | null
  neste_kontroll?: string | null
  status?: string[] | null        // Array av status-verdier
  kontrollert?: boolean
  merknad?: string | null
}
```

### Brannslange
```typescript
interface Brannslange {
  id?: string
  anlegg_id: string
  internnummer?: string | null
  plassering?: string | null
  etasje?: string | null
  type?: string | null            // Innvendig, Utvendig
  lengde?: string | null          // 20M, 25M, 30M, etc.
  diameter?: string | null        // 19mm, 25mm, 1", 2"
  produsent?: string | null
  produksjonsaar?: number | null
  munnstykke?: string | null
  skap_type?: string | null
  sist_kontrollert?: string | null
  neste_kontroll?: string | null
  trykk_bar?: number | null
  status?: string[] | null        // Array av status-verdier
  kontrollert?: boolean
  merknad?: string | null
}
```

## 🔗 Database

### Tabell: `anleggsdata_brannslukkere`
**Kolonner:**
- `id` - UUID (primary key)
- `anlegg_id` - UUID (foreign key til anlegg)
- `internnummer` - TEXT
- `fabrikatnummer` - TEXT
- `plassering` - TEXT
- `etasje` - TEXT
- `type` - TEXT
- `storrelse` - TEXT
- `produsent` - TEXT
- `produksjonsaar` - INTEGER
- `sist_kontrollert` - DATE
- `neste_kontroll` - DATE
- `status` - TEXT (lagres som array)
- `kontrollert` - BOOLEAN
- `merknad` - TEXT
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### Tabell: `anleggsdata_brannslanger`
**Kolonner:**
- `id` - UUID (primary key)
- `anlegg_id` - UUID (foreign key til anlegg)
- `internnummer` - TEXT
- `plassering` - TEXT
- `etasje` - TEXT
- `type` - TEXT
- `lengde` - TEXT
- `diameter` - TEXT
- `produsent` - TEXT
- `produksjonsaar` - INTEGER
- `munnstykke` - TEXT
- `skap_type` - TEXT
- `sist_kontrollert` - DATE
- `neste_kontroll` - DATE
- `trykk_bar` - NUMERIC
- `status` - TEXT (lagres som array)
- `kontrollert` - BOOLEAN
- `merknad` - TEXT
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

## 🚀 Bruk

### Hovedinngang:
1. Klikk på "Rapporter" i sidebar
2. Velg "Slukkeutstyr"-kort
3. Velg kunde fra dropdown
4. Velg anlegg fra dropdown
5. Velg modul: Brannslukkere eller Brannslanger

### Brannslukkere:
1. Klikk "Brannslukkere"-kort
2. Legg til nye brannslukkere:
   - Skriv inn antall (1-50)
   - Klikk "Legg til"
3. Fyll inn informasjon for hver brannslukker
4. Velg status ved å klikke på status-knappene
5. Klikk "Lagre alle" for å lagre endringer

### Brannslanger:
1. Klikk "Brannslanger"-kort
2. Legg til nye brannslanger:
   - Skriv inn antall (1-50)
   - Klikk "Legg til"
3. Fyll inn informasjon for hver brannslange
4. Velg status ved å klikke på status-knappene
5. Klikk "Lagre alle" for å lagre endringer

## 🔧 Teknisk implementering

### Filer:
- `src/pages/rapporter/Slukkeutstyr.tsx` - Hovedside med kunde/anlegg-velger og modulvalg
- `src/pages/rapporter/slukkeutstyr/BrannslukkereView.tsx` - Brannslukkere-modul
- `src/pages/rapporter/slukkeutstyr/BrannslangerView.tsx` - Brannslanger-modul
- `supabase_migrations/create_slukkeutstyr_tables.sql` - Database-migrasjon

### Struktur:
```
src/pages/rapporter/
├── Slukkeutstyr.tsx              # Hovedside
└── slukkeutstyr/
    ├── BrannslukkereView.tsx     # Brannslukkere-modul
    └── BrannslangerView.tsx      # Brannslanger-modul
```

### Komponenter:
- **Slukkeutstyr.tsx**: Hovedkomponent med kunde/anlegg-velger og modulvalg
- **BrannslukkereView.tsx**: Håndterer brannslukkere med CRUD-operasjoner
- **BrannslangerView.tsx**: Håndterer brannslanger med CRUD-operasjoner

## 📝 Neste steg

### Prioritet 1:
- [ ] Eksporter rapport til PDF
- [ ] Bulk-operasjoner for status
- [ ] Filtrer på status og etasje
- [ ] Sortering på kolonner

### Prioritet 2:
- [ ] Inline-redigering i tabell
- [ ] Historikk for kontroller
- [ ] Kommentar-felt per anlegg
- [ ] Evakueringsplan-status

### Prioritet 3:
- [ ] Bilder av utstyr
- [ ] QR-kode for rask registrering
- [ ] Import fra Excel
- [ ] Snarvei fra Anlegg-detaljer

## 🗄️ Database-oppsett

**Kjør SQL-migrasjonen:**
```bash
# Koble til Supabase og kjør:
supabase_migrations/create_slukkeutstyr_tables.sql
```

Dette oppretter:
- Tabellene `anleggsdata_brannslukkere` og `anleggsdata_brannslanger`
- Indekser for raskere søk
- RLS (Row Level Security) policies
- Triggers for automatisk oppdatering av `updated_at`

## 📌 Notater

- Status lagres som array for å støtte flere status-verdier samtidig
- Alle felter er valgfrie bortsett fra `anlegg_id`
- Automatisk oppdatering av `updated_at` ved endringer
- Støtte for offline-modus (kommer senere)
- Basert på Flutter-implementasjonen fra BSV-FireBase-00.1
