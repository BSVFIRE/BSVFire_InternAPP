# Kontaktpersoner-modul

## ✅ Implementert funksjonalitet

### **Kontaktpersonliste**
- ✅ Vis alle kontaktpersoner på tvers av anlegg
- ✅ Søk etter navn, e-post, telefon, rolle eller anlegg
- ✅ Statistikk (totalt, med e-post, med telefon)
- ✅ Sortering med dropdown:
  - Navn (A-Å) - **Standard**
  - Navn (Å-A)
  - Rolle
  - Antall anlegg
- ✅ Viser antall resultater
- ✅ Viser tilknyttede anlegg per kontaktperson
- ✅ Viser primær kontakt med stjerne-ikon ⭐

### **Kontaktpersondetaljer**
- ✅ Vis full kontaktinformasjon
- ✅ Liste over alle tilknyttede anlegg
- ✅ Indikerer primær kontakt per anlegg
- ✅ Metadata (opprettet dato)

### **Slett kontaktperson**
- ✅ Bekreftelsesdialog
- ✅ Sletter alle koblinger til anlegg
- ✅ Slett fra database

## 🎨 Design

- **Svart bakgrunn** med turkis accent
- **Stjerne-ikon** (gul) for primær kontakt
- **Responsiv tabell** med hover-effekter
- **Rolle-badges** (turkis)
- Viser opptil 2 anlegg i tabellen, "+ X flere" hvis mer

## 📊 Datamodell

```typescript
interface Kontaktperson {
  id: string
  navn: string
  epost: string | null
  telefon: string | null
  rolle: string | null          // Eier, Driftstekniker, Styremedlem, Leder, Ekstern
  opprettet_dato: string
}

interface AnleggKontaktperson {
  anlegg_id: string
  kontaktperson_id: string
  primar: boolean              // Er dette primær kontakt for anlegget?
}
```

## 🔗 Database

### **Tabeller:**

**`kontaktpersoner`** - Hovedtabell:
- `id` (UUID, primary key)
- `navn` (TEXT, NOT NULL)
- `epost` (TEXT)
- `telefon` (TEXT)
- `rolle` (TEXT)
- `opprettet_dato` (TIMESTAMP)

**`anlegg_kontaktpersoner`** - Junction table (mange-til-mange):
- `id` (UUID, primary key)
- `anlegg_id` (UUID, foreign key til anlegg)
- `kontaktperson_id` (UUID, foreign key til kontaktpersoner)
- `primar` (BOOLEAN) - Er dette primær kontakt for anlegget?
- `opprettet_dato` (TIMESTAMP)

## 🔗 Relasjoner

- **Én kontaktperson** kan være knyttet til **flere anlegg**
- **Ett anlegg** kan ha **flere kontaktpersoner**
- **Primær kontakt**: Hvert anlegg kan ha én primær kontaktperson (markert med stjerne)

## 🚀 Bruk

1. Naviger til "Kontaktpersoner" i sidebar
2. Se oversikt over alle kontaktpersoner
3. Søk på tvers av navn, e-post, telefon, rolle eller anlegg
4. Klikk øye-ikonet for å se detaljer og alle tilknyttede anlegg
5. Primær kontakt vises med gul stjerne ⭐

## 📝 Neste steg

- [ ] Opprett/rediger kontaktperson
- [ ] Legg til/fjern kontaktperson fra anlegg
- [ ] Sett primær kontakt for anlegg
- [ ] Vis kontaktpersoner i Anlegg-detaljer
- [ ] Eksporter kontaktliste til CSV/PDF
- [ ] Send e-post direkte til kontaktperson

## 💡 Brukstilfeller

1. **Finn alle anlegg for en kontaktperson** - Søk på navn, se alle tilknyttede anlegg
2. **Finn primær kontakt for anlegg** - Stjerne-ikon indikerer primær
3. **Oppdater kontaktinfo** - Endres automatisk for alle tilknyttede anlegg
4. **Gjenbruk kontaktpersoner** - Samme person kan være kontakt for flere anlegg
