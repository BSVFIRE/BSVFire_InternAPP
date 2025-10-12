# Anlegg-modul

## ✅ Implementert funksjonalitet

### **Anleggsliste**
- ✅ Vis alle anlegg i tabell
- ✅ Søk etter anlegg (navn, kunde, adresse, poststed)
- ✅ Statistikk (totalt, utført, ikke utført, planlagt)
- ✅ Sortering med dropdown:
  - Navn (A-Å) - **Standard**
  - Navn (Å-A)
  - Kunde
  - Kontrollmåned (Januar-Desember)
  - Poststed
  - Status
- ✅ Viser antall resultater
- ✅ Viser kunde-navn for hvert anlegg
- ✅ Viser kontrolltyper som badges
- ✅ Fargekodet status

### **Opprett anlegg**
- ✅ Skjema for nytt anlegg
- ✅ Velg kunde fra dropdown
- ✅ Validering (kunde og anleggsnavn påkrevd)
- ✅ Velg kontrollmåned
- ✅ Velg status
- ✅ Velg kontrolltyper (multi-select med knapper)
- ✅ Lagre til Supabase

### **Rediger anlegg**
- ✅ Forhåndsutfylt skjema
- ✅ Oppdater eksisterende anlegg
- ✅ Timestamp for sist oppdatert

### **Anleggsdetaljer**
- ✅ Vis full anleggsinformasjon
- ✅ Adresse og lokasjon
- ✅ Kontrollinfo (måned, status, typer)
- ✅ **Kontaktpersoner** tilknyttet anlegget
  - Viser alle kontaktpersoner
  - Primær kontakt markert med ⭐
  - Navn, rolle, e-post, telefon
- ✅ Metadata (opprettet, sist oppdatert)

### **Slett anlegg**
- ✅ Bekreftelsesdialog
- ✅ Slett fra database

## 🎨 Design

- **Svart bakgrunn** med turkis accent
- **Responsiv tabell** med hover-effekter
- **Status-badges** med farger:
  - 🔴 Ikke utført (rød)
  - 🟢 Utført (grønn)
  - 🔵 Planlagt (blå)
  - 🟡 Utsatt (gul)
  - ⚫ Oppsagt (grå)
- **Kontrolltype-badges** (turkis)

## 📊 Datamodell

```typescript
interface Anlegg {
  id: string
  kundenr: string                  // Foreign key til customer
  anleggsnavn: string              // Påkrevd
  org_nummer: string | null
  kunde_nummer: string | null
  adresse: string | null
  postnummer: string | null
  poststed: string | null
  kontroll_maaned: string | null   // Januar-Desember eller 'NA'
  kontroll_status: string | null   // Ikke utført, Utført, Planlagt, Utsatt, Oppsagt
  kontroll_type: string[] | null   // Array: Brannalarm, Nødlys, Slukkeutstyr, Røykluker, Ekstern
  opprettet_dato: string
  sist_oppdatert: string | null
}
```

## 🔗 Database

Modulen bruker `anlegg`-tabellen i Supabase med følgende kolonner:
- `id` (UUID, primary key)
- `kundenr` (UUID, foreign key til customer)
- `anleggsnavn` (TEXT, NOT NULL)
- `org_nummer` (TEXT)
- `kunde_nummer` (TEXT)
- `adresse` (TEXT)
- `postnummer` (TEXT)
- `poststed` (TEXT)
- `kontroll_maaned` (TEXT)
- `kontroll_status` (TEXT)
- `kontroll_type` (TEXT[])
- `opprettet_dato` (TIMESTAMP)
- `sist_oppdatert` (TIMESTAMP)

## 🚀 Bruk

1. Naviger til "Anlegg" i sidebar
2. Se oversikt over alle anlegg
3. Bruk søkefeltet for å filtrere
4. Klikk øye-ikonet for å se detaljer
5. Klikk søppelbøtte-ikonet for å slette

## 🔗 Relasjoner

- **Kunde**: Hvert anlegg er knyttet til én kunde via `kundenr`
- **Ordre**: Anlegg kan ha flere ordre (fremtidig)
- **Kontroller**: Anlegg har kontrolldata (brannalarm, nødlys, etc.)

## 📝 Neste steg

- [ ] Vis tilknyttede ordre per anlegg
- [ ] Filtrer anlegg etter kunde
- [ ] Filtrer anlegg etter kontrolltype
- [ ] Filtrer anlegg etter status
- [ ] Vis anlegg på kart (Google Maps)
- [ ] Eksporter anleggsliste til CSV/PDF
