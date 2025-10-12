# Kunder-modul

## ✅ Implementert funksjonalitet

### **Kundeliste**
- ✅ Vis alle kunder i tabell
- ✅ Søk etter kunde (navn, org.nr, poststed)
- ✅ Statistikk (totalt, med e-post, med telefon)
- ✅ Sortering med dropdown:
  - Navn (A-Å) - **Standard**
  - Navn (Å-A)
  - Nyeste først
  - Eldste først
  - Poststed
- ✅ Viser antall resultater

### **Kundedetaljer**
- ✅ Vis full kundeinformasjon
- ✅ Kontaktinformasjon
- ✅ Adresse
- ✅ Metadata (opprettet, sist oppdatert)

### **Opprett kunde**
- ✅ Skjema for ny kunde
- ✅ Validering (navn er påkrevd)
- ✅ Lagre til Supabase
- ✅ **Brønnøysund Register-integrasjon**:
  - Søk etter bedrift på navn (live search med debounce)
  - Søk etter bedrift på organisasjonsnummer
  - Automatisk utfylling av navn, org.nr, adresse, postnummer og poststed
  - Dropdown med søkeresultater
  - Formatering av organisasjonsnummer (XXX XXX XXX)

### **Rediger kunde**
- ✅ Forhåndsutfylt skjema
- ✅ Oppdater eksisterende kunde
- ✅ Timestamp for sist oppdatert
- ✅ Brønnøysund-søk også tilgjengelig ved redigering

### **Slett kunde**
- ✅ Bekreftelsesdialog
- ✅ Slett fra database

## 🎨 Design

- **Svart bakgrunn** med turkis accent
- **Responsiv tabell** med hover-effekter
- **Ikoner** fra Lucide React
- **Smooth overganger** mellom visninger

## 📊 Datamodell

```typescript
interface Kunde {
  id: string
  navn: string                       // Påkrevd
  organisasjonsnummer: string | null
  adresse: string | null
  postnummer: string | null
  poststed: string | null
  telefon: string | null
  epost: string | null
  opprettet_dato: string
  sist_oppdatert: string | null
}
```

## 🔗 Database

Modulen bruker `customer`-tabellen i Supabase med følgende kolonner:
- `id` (UUID, primary key)
- `navn` (TEXT, NOT NULL)
- `organisasjonsnummer` (TEXT)
- `adresse` (TEXT)
- `postnummer` (TEXT)
- `poststed` (TEXT)
- `telefon` (TEXT)
- `epost` (TEXT)
- `opprettet_dato` (TIMESTAMP)
- `sist_oppdatert` (TIMESTAMP)

## 🚀 Bruk

1. Naviger til "Kunder" i sidebar
2. Se oversikt over alle kunder
3. Bruk søkefeltet for å filtrere
4. Klikk "Ny kunde" for å opprette
   - **Søk i Brønnøysundregistrene** for å finne bedrift
   - Skriv bedriftsnavn eller org.nr for automatisk utfylling
   - Eller fyll ut manuelt
5. Klikk øye-ikonet for å se detaljer
6. Klikk blyant-ikonet for å redigere
7. Klikk søppelbøtte-ikonet for å slette

## 🔌 API-integrasjon

### Brønnøysundregistrene
Applikasjonen bruker det åpne API-et fra Brønnøysundregistrene for å hente bedriftsinformasjon:
- **API Base URL**: `https://data.brreg.no/enhetsregisteret/api`
- **Dokumentasjon**: https://data.brreg.no/enhetsregisteret/api/docs/index.html
- **Ingen API-nøkkel påkrevd** - dette er et åpent offentlig API
- **Funksjoner**:
  - Søk bedrifter på navn
  - Hent bedrift på organisasjonsnummer
  - Automatisk formatering av org.nr
  - Adresseekstraksjon (forretningsadresse/postadresse)

## 📝 Neste steg

- [ ] Legg til kontaktpersoner per kunde
- [ ] Vis tilknyttede anlegg
- [ ] Eksporter kundeliste til CSV/PDF
- [ ] Filtrer etter poststed/region
- [ ] Bulk-operasjoner (slett flere)
