# Rapport-modul

## ✅ Implementert funksjonalitet

### **Rapportoversikt**
- ✅ Hovedmeny med alle rapporttyper
- ✅ Visuell indikasjon på hvilke rapporter som er tilgjengelige
- ✅ Info-seksjon med brukerveiledning

### **Nødlys-rapport** 🟢 AKTIV
- ✅ Velg kunde fra dropdown (med søk)
- ✅ Velg anlegg (filtrert på valgt kunde)
- ✅ Vis alle nødlysenheter for valgt anlegg
- ✅ Søk i nødlysliste (plassering, type, status)
- ✅ Legg til ny nødlysenhet
- ✅ Rediger eksisterende nødlysenhet
- ✅ Slett nødlysenhet (med bekreftelse)
- ✅ **Snarvei fra Anlegg-detaljer** - Klikk på "Nødlys"-badge

### **Brannalarm-rapport** 🟢 AKTIV
- ✅ Velg kunde fra dropdown (med søk)
- ✅ Velg anlegg (filtrert på valgt kunde)
- ✅ **Enheter-modul**: Registrer detektorer og komponenter (20 typer)
  - **Sentral og styring**: Brannsentral, Panel, Kraftforsyning, Batteri, Sløyfer, IO-styring
  - **Detektorer**: Røykdetektor, Varmedetektor, Multikriteriedetektor, Flammedetektor, Linjedetektor, Aspirasjon, Manuell melder, Trådløse enheter
  - **Styring og slokning**: Sprinklerkontroll, Avstillingsbryter
  - **Varsling**: Brannklokke, Sirene, Optisk varsling
  - Kompakt tabell-visning eller detaljert kort-visning
  - Filtrer på kategori
  - Registrer antall, type/modell og notat
- ✅ **Styringer-modul**: Registrer og kontroller 16 ulike styringtyper
  - Øvrige styringer, Adgangskontroll, Slukkeanlegg, Klokkekurser
  - Flash/Blitz, Port, Brannspjæld, Overvåking
  - Musikkmuting, Branngardin, Dørstyring, Røykluker
  - Ventilasjonsanlegg, SD-Anlegg, Heisstyringer, Nøkkelsafe
  - Kompakt tabell-visning eller detaljert kort-visning
  - Filtrer på aktive/inaktive
  - Statistikk-oversikt
- ✅ **Nettverk-modul**: Administrer brannalarmnettverk
  - Legg til/rediger/slett nettverksenheter
  - Registrer nettverk-ID, plassering, type
  - SW-versjon, spenning, Ah, batterialder
  - Søk og filtrer i nettverk
- ✅ **Tilleggsutstyr-modul**: Registrer tilleggsutstyr
  - **Talevarsling**: Leverandør, batteri type/alder, plassering, kommentar
  - **Alarmsender**: Mottaker, sender 2G/4G, GSM-nummer, plassering, batteri, forsyning
    - Velg eksterne mottakere fra kontaktpersoner når "Ekstern" er valgt
  - **Nøkkelsafe**: Type, plassering, innhold, kommentar
  - Toggle for å aktivere/deaktivere hver type
- ✅ **Kontroll-modul**: Start og administrer kontroller
  - **Kontroll-oversikt**: Vis alle kontroller for anlegget
    - Pågående utkast (fortsett arbeid)
    - Tidligere kontroller (åpne for redigering/visning)
    - Avvik fra forrige år (sidebar med alle avvik)
  - **Velg kontrolltype**: FG790 eller NS3960
    - FG790: 3 posisjoner (Dokumentasjon, Visuell, Funksjonstest)
    - NS3960: 3 kategorier (Prosedyre, Visuell, Dokumentasjon)
  - Status: Utkast, Ferdig, Sendt
- ✅ Toggle-funksjon for å aktivere/deaktivere enheter og styringer
- ✅ Status-valg: Kontrollert Ok, Avvik, Visuell kontroll, Ikke aktuelt
- ✅ Notat-felt for hver enhet/styring

### **Slukkeutstyr-rapport** 🟢 AKTIV
- ✅ Velg kunde fra dropdown (med søk)
- ✅ Velg anlegg (filtrert på valgt kunde)
- ✅ **Brannslukkere-modul**: Registrer og kontroller brannslukkere
  - Internnummer, fabrikatnummer, plassering, etasje
  - Type (Pulver, Skum, CO2, Vann, Litium)
  - Størrelse (2KG, 6KG, 9KG, 12KG, 6L, 9L, etc.)
  - Produsent, produksjonsår
  - Sist kontrollert, neste kontroll
  - Status (OK, OK Byttet, Ikke funnet, Utgått, Skadet, etc.)
  - Statistikk: Totalt, OK, Defekt, Utgått
- ✅ **Brannslanger-modul**: Registrer og kontroller brannslanger
  - Internnummer, plassering, etasje
  - Type (Innvendig, Utvendig)
  - Lengde (20M, 25M, 30M, etc.)
  - Diameter (19mm, 25mm, 1", 2")
  - Produsent, produksjonsår
  - Munnstykke, skap type
  - Trykk (bar), sist kontrollert
  - Status (OK, Lekkasje, Må trykktestes, Skade, etc.)
  - Statistikk: Totalt, OK, Må trykktestes, Lekkasje

### **Kommende rapporter** 🔜
- ⏳ Røykluker

## 🎨 Design

- **Rapportkort** med ikoner og farger
- **Kunde/Anlegg-velger** med søkefunksjon
- **Responsiv tabell** med hover-effekter
- **Status-badges** med farger:
  - 🟢 OK (grønn)
  - 🔴 Defekt (rød)
  - 🟡 Mangler (gul)
  - 🔵 Utskiftet (blå)

## 📊 Datamodeller

### Nødlys
```typescript
interface NodlysEnhet {
  id: string
  anlegg_id: string | null       // Foreign key til anlegg
  internnummer: string | null    // Internt nummer
  amatur_id: string | null       // Armatur-identifikator
  fordeling: string | null       // Fordelingsnavn
  kurs: string | null            // Kursnummer
  etasje: string | null          // Etasje (f.eks. 1, 2, U1)
  type: string | null            // Type (f.eks. LED, Halogen)
  produsent: string | null       // Produsentnavn
  plassering: string | null      // Plassering (f.eks. "Gang", "Over hoveddør")
  status: string | null          // Status - OK, Defekt, Mangler, Utskiftet
  kundenavn: string | null       // Kundenavn (kan være utdatert)
  kontrollert: boolean | null    // Om enheten er kontrollert
  created_at: string             // Opprettelsesdato
}
```

### Brannslukkere
```typescript
interface Brannslukker {
  id: string
  anlegg_id: string              // Foreign key til anlegg
  internnummer: string | null    // Internt nummer
  fabrikatnummer: string | null  // Fabrikatnummer
  plassering: string | null      // Plassering
  etasje: string | null          // Etasje
  type: string | null            // Type (Pulver, Skum, CO2, Vann, Litium)
  storrelse: string | null       // Størrelse (2KG, 6KG, 9KG, etc.)
  produsent: string | null       // Produsent
  produksjonsaar: number | null  // Produksjonsår
  sist_kontrollert: string | null // Sist kontrollert dato
  neste_kontroll: string | null  // Neste kontroll dato
  status: string[] | null        // Status array
  kontrollert: boolean           // Om enheten er kontrollert
  merknad: string | null         // Merknad
  created_at: string             // Opprettelsesdato
}
```

### Brannslanger
```typescript
interface Brannslange {
  id: string
  anlegg_id: string              // Foreign key til anlegg
  internnummer: string | null    // Internt nummer
  plassering: string | null      // Plassering
  etasje: string | null          // Etasje
  type: string | null            // Type (Innvendig, Utvendig)
  lengde: string | null          // Lengde (20M, 25M, 30M, etc.)
  diameter: string | null        // Diameter (19mm, 25mm, 1", 2")
  produsent: string | null       // Produsent
  produksjonsaar: number | null  // Produksjonsår
  munnstykke: string | null      // Munnstykke type
  skap_type: string | null       // Skap type
  sist_kontrollert: string | null // Sist kontrollert dato
  neste_kontroll: string | null  // Neste kontroll dato
  trykk_bar: number | null       // Trykk i bar
  status: string[] | null        // Status array
  kontrollert: boolean           // Om enheten er kontrollert
  merknad: string | null         // Merknad
  created_at: string             // Opprettelsesdato
}
```

### Brannalarm - Styringer
```typescript
interface BrannalarmStyring {
  id?: string
  anlegg_id: string
  // For hver styringtype (16 stk): ovrige, adgang, slukke, klokke, etc.
  [key]_antall?: number          // Antall enheter
  [key]_status?: string          // Status (Kontrollert Ok, Avvik, etc.)
  [key]_note?: string            // Notat
  [key]_aktiv?: boolean          // Om styringen er aktiv
}
```

### Brannalarm - Nettverk
```typescript
interface NettverkEnhet {
  id: string
  anlegg_id: string
  nettverk_id: string            // Nettverk-ID
  plassering: string             // Plassering
  type: string                   // Type (Sentral, Repeater, etc.)
  sw_id?: string                 // SW-versjon
  spenning?: number              // Spenning (V)
  ah?: number                    // Kapasitet (Ah)
  batterialder?: number          // Batterialder (år)
  created_at?: string
}
```

## 🔗 Database

### Tabell: `anleggsdata_nodlys` (EKSISTERENDE)
**OBS:** Denne tabellen eksisterer allerede i databasen med tusenvis av nødlysenheter!

**Kolonner:**
- `id` - UUID (primary key)
- `anlegg_id` - UUID (foreign key til anlegg)
- `internnummer` - TEXT (internt nummer)
- `amatur_id` - TEXT (armatur-identifikator)
- `fordeling` - TEXT (fordelingsnavn)
- `kurs` - TEXT (kursnummer)
- `etasje` - TEXT (etasje)
- `type` - TEXT (type nødlys)
- `produsent` - TEXT (produsentnavn)
- `plassering` - TEXT (plassering)
- `status` - TEXT (OK, Defekt, Mangler, Utskiftet)
- `kundenavn` - TEXT (kundenavn)
- `kontrollert` - BOOLEAN (om enheten er kontrollert)
- `created_at` - TIMESTAMP (opprettelsesdato)

**⚠️ VIKTIG:** Ikke kjør `create_nodlys_table.sql` - tabellen eksisterer allerede!

### Tabell: `anleggsdata_brannslukkere` (EKSISTERENDE)
**OBS:** Denne tabellen eksisterer allerede i databasen!

**Kolonner:**
- `id` - UUID (primary key)
- `anlegg_id` - UUID (foreign key til anlegg)
- `apparat_nr` - TEXT (apparatnummer)
- `plassering` - TEXT
- `etasje` - TEXT
- `produsent` - TEXT
- `modell` - TEXT (2KG Pulver, 6KG Pulver, etc.)
- `brannklasse` - TEXT (A, AB, ABC, ABF, B, AF)
- `produksjonsaar` - TEXT
- `service` - TEXT
- `siste_kontroll` - TEXT
- `status` - TEXT[] (array av status-verdier)
- `type_avvik` - TEXT[] (array av avvik)
- `created_at` - TIMESTAMP

### Tabell: `anleggsdata_brannslanger` (EKSISTERENDE)
**OBS:** Denne tabellen eksisterer allerede i databasen!

**Kolonner:**
- `id` - UUID (primary key)
- `anlegg_id` - UUID (foreign key til anlegg)
- `slangenummer` - TEXT
- `plassering` - TEXT
- `etasje` - TEXT
- `produsent` - TEXT
- `modell` - TEXT (30M 19mm, 30M 25mm, etc.)
- `brannklasse` - TEXT
- `produksjonsaar` - TEXT
- `sistekontroll` - TEXT
- `trykktest` - TEXT
- `status` - TEXT (status)
- `type_avvik` - TEXT[] (array av avvik)
- `avvik` - TEXT
- `created_at` - TIMESTAMP

### Tabell: `anleggsdata_brannalarm` (EKSISTERENDE)
**OBS:** Denne tabellen eksisterer allerede i databasen!

**Kolonner:**
- `id` - UUID (primary key)
- `anlegg_id` - UUID (foreign key til anlegg)
- For hver av 16 styringtyper:
  - `[key]_antall` - INTEGER (antall enheter)
  - `[key]_status` - TEXT (status)
  - `[key]_note` - TEXT (notat)
  - `[key]_aktiv` - BOOLEAN (om styringen er aktiv)

### Tabell: `nettverk_brannalarm` (EKSISTERENDE)
**OBS:** Denne tabellen eksisterer allerede i databasen!

**Kolonner:**
- `id` - UUID (primary key)
- `anlegg_id` - UUID (foreign key til anlegg)
- `nettverk_id` - TEXT (nettverk-ID)
- `plassering` - TEXT (plassering)
- `type` - TEXT (type system)
- `sw_id` - TEXT (SW-versjon)
- `spenning` - NUMERIC (spenning i volt)
- `ah` - NUMERIC (kapasitet i Ah)
- `batterialder` - INTEGER (batterialder i år)
- `created_at` - TIMESTAMP

## 🚀 Bruk

### Nødlys - Hovedinngang:
1. Klikk på "Rapporter" i sidebar
2. Velg "Nødlys"-kort
3. Velg kunde fra dropdown
4. Velg anlegg fra dropdown
5. Se/rediger nødlysliste

### Nødlys - Snarvei fra Anlegg:
1. Gå til "Anlegg" i sidebar
2. Klikk på øye-ikonet for å se anleggsdetaljer
3. Under "Kontrollinfo" → klikk på "Nødlys"-badge (med ekstern-link ikon)
4. Du blir tatt direkte til nødlysrapporten med forhåndsvalgt kunde og anlegg

### Brannalarm - Hovedinngang:
1. Klikk på "Rapporter" i sidebar
2. Velg "Brannalarm"-kort
3. Velg kunde fra dropdown
4. Velg anlegg fra dropdown
5. Velg modul:
   - **Styringer**: Registrer og kontroller brannalarmstyringer
   - **Nettverk**: Administrer nettverksenheter

### Brannalarm - Styringer:
1. Klikk på en styringtype for å aktivere/deaktivere
2. Når aktiv, fyll inn:
   - Antall enheter
   - Status (Kontrollert Ok, Avvik, Visuell kontroll, Ikke aktuelt)
   - Notat (valgfritt)
3. Klikk "Lagre styringer" for å lagre

### Brannalarm - Nettverk:
1. Klikk "Nytt system" for å legge til
2. Fyll inn:
   - Nettverk-ID
   - Plassering
   - Type (Sentral, Repeater, Detektorløkke, etc.)
   - SW-versjon
   - Spenning, Ah, Batterialder
3. Bruk søk for å finne spesifikke systemer
4. Rediger eller slett eksisterende systemer

## 🔧 Teknisk implementering

### Filer:
- `src/pages/Rapporter.tsx` - Hovedside med rapportoversikt
- `src/pages/rapporter/Nodlys.tsx` - Nødlys-rapport med CRUD
- `src/pages/rapporter/Brannalarm.tsx` - Brannalarm hovedside
- `src/pages/rapporter/brannalarm/EnheterView.tsx` - Enheter-modul (detektorer, komponenter)
- `src/pages/rapporter/brannalarm/StyringerViewNew.tsx` - Styringer-modul (forbedret versjon)
- `src/pages/rapporter/brannalarm/NettverkView.tsx` - Nettverk-modul
- `src/pages/rapporter/brannalarm/TilleggsutstyrView.tsx` - Tilleggsutstyr-modul (talevarsling, alarmsender, nøkkelsafe)
- `src/pages/rapporter/Slukkeutstyr.tsx` - Slukkeutstyr hovedside med kunde/anlegg-velger
- `src/pages/rapporter/slukkeutstyr/BrannslukkereView.tsx` - Brannslukkere-modul
- `src/pages/rapporter/slukkeutstyr/BrannslangerView.tsx` - Brannslanger-modul
- `supabase_migrations/create_nodlys_table.sql` - Database-migrasjon (kun referanse)
- `supabase_migrations/create_slukkeutstyr_tables.sql` - Database-migrasjon for slukkeutstyr

### Navigation state:
Når du klikker på kontrolltype-badge fra Anlegg-detaljer, sendes følgende state:
```typescript
{
  kundeId: string,
  anleggId: string,
  rapportType: 'nodlys'
}
```

Dette gjør at kunde og anlegg er forhåndsvalgt når du kommer til rapporten.

## 📝 Neste steg

### Prioritet 1 - Nødlys:
- [ ] Eksporter nødlysrapport til PDF
- [x] Vis statistikk (totalt, OK, defekte, etc.)
- [ ] Filtrer på status

### Prioritet 1 - Brannalarm:
- [ ] Eksporter brannalarmrapport til PDF
- [x] Vis statistikk for styringer
- [x] Legg til flere moduler (detektorer, manuellmelder, etc.)

### Prioritet 1 - Slukkeutstyr:
- [ ] Eksporter slukkeutstyr-rapport til PDF
- [x] Vis statistikk (totalt, OK, defekt, utgått, etc.)
- [ ] Bulk-operasjoner for status
- [ ] Filtrer på status og etasje

### Prioritet 2:
- [x] Implementer Slukkeutstyr-rapport
- [ ] Implementer Røykluker-rapport
- [ ] Snarvei fra Anlegg-detaljer til Brannalarm og Slukkeutstyr

### Prioritet 3:
- [ ] Historikk for kontroller
- [ ] Bilder av utstyr
- [ ] QR-kode for rask registrering

## 🗄️ Database

**✅ KLAR TIL BRUK!**

Alle rapporter bruker eksisterende tabeller i databasen:
- **Nødlys**: `anleggsdata_nodlys` (tusenvis av enheter)
- **Brannalarm Styringer**: `anleggsdata_brannalarm`
- **Brannalarm Nettverk**: `nettverk_brannalarm`
- **Brannslukkere**: `anleggsdata_brannslukkere` (eksisterende data)
- **Brannslanger**: `anleggsdata_brannslanger` (eksisterende data)

**✅ INGEN MIGRASJONER NØDVENDIG** - alle tabeller eksisterer allerede med data!

**Merk:** SQL-filene i `supabase_migrations/` er kun for referanse og skal **IKKE** kjøres.
