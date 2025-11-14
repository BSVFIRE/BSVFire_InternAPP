# Guide: Tilbud Godkjenning

## Oversikt

Når et tilbud endres til status "Godkjent", skjer følgende automatisk:

1. **Kunde opprettes** (hvis den ikke allerede eksisterer)
2. **Anlegg opprettes** (hvis det ikke allerede eksisterer)
3. **Kontaktperson opprettes** (hvis den ikke allerede eksisterer)
4. **PDF genereres og lagres** på anlegget
5. **Tilbudet oppdateres** med referanser til kunde, anlegg og kontaktperson

## Hvordan bruke

### Rask statusendring i tabellen

1. Gå til **Tilbud Serviceavtale**
2. Finn tilbudet i listen
3. Klikk på **Status**-feltet (f.eks. "Utkast" eller "Sendt")
4. Velg **"Godkjent"** fra dropdown-menyen
5. Bekreft godkjenningen i dialogen
6. Vent mens systemet:
   - Oppretter kunde/anlegg/kontaktperson
   - Genererer PDF
   - Lagrer PDF på anlegget
7. Se suksessmelding med detaljer

### Krav for godkjenning

For at et tilbud skal kunne godkjennes må følgende være fylt ut:

- ✅ **Kundenavn** (obligatorisk)
- ✅ **Anleggsnavn** (obligatorisk)
- ⚠️ Kontaktperson (valgfritt, men anbefalt)

Hvis anleggsnavn mangler, vil systemet gi en feilmelding.

## Hva skjer ved godkjenning?

### 1. Kunde opprettes (hvis ny)

Hvis tilbudet ikke har en eksisterende kunde-ID, opprettes en ny kunde med:
- Navn fra tilbudet
- Organisasjonsnummer (hvis oppgitt)
- Type: "Bedrift"

### 2. Anlegg opprettes (hvis nytt)

Hvis tilbudet ikke har et eksisterende anlegg-ID, opprettes et nytt anlegg med:
- Anleggsnavn fra tilbudet
- Adresse/lokasjon (hvis oppgitt)
- Organisasjonsnummer (hvis oppgitt)
- Koblet til kunden
- Status: "Ikke startet"

### 3. Kontaktperson opprettes (hvis ny)

Hvis tilbudet har kontaktpersoninformasjon, men ingen kontaktperson-ID:
- Ny kontaktperson opprettes
- Kobles automatisk til anlegget som primær kontakt

### 4. PDF genereres og lagres

PDF-en genereres med all informasjon fra tilbudet og lagres:
- **Plassering**: `anlegg/{anlegg_id}/tilbud/`
- **Filnavn**: `Tilbud_Serviceavtale_{kundenavn}_{timestamp}.pdf`
- **Storage**: Supabase Storage bucket `anlegg.dokumenter`
- **Dokumentreferanse**: Lagres i `dokumenter`-tabellen med type "Tilbud Serviceavtale"

### 5. Tilbudet oppdateres

Tilbudet oppdateres med:
- `kunde_id` - referanse til kunde
- `anlegg_id` - referanse til anlegg
- `kontaktperson_id` - referanse til kontaktperson
- `status` - endres til "godkjent"

## Feilhåndtering

### Hvis noe går galt

Systemet vil:
1. Vise en feilmelding med detaljer
2. Rulle tilbake statusendringen
3. Logge feilen til konsollen

### Vanlige feil

- **"Anleggsnavn må være fylt ut"**: Fyll ut anleggsnavn i tilbudet før godkjenning
- **"Kunne ikke opprette kunde"**: Sjekk at kundenavnet er gyldig
- **"Kunne ikke laste opp PDF"**: Sjekk Supabase Storage-tilgang

## Teknisk implementering

### Filer involvert

- `/src/lib/tilbudGodkjenning.ts` - Hovedlogikk for godkjenning
- `/src/pages/TilbudServiceavtale.tsx` - UI og statusendring
- `/src/pages/tilbud/StatusDropdown.tsx` - Dropdown-komponent
- `/src/pages/tilbud/TilbudPDF.tsx` - PDF-generering

### Database-tabeller

- `customer` - Kunder
- `anlegg` - Anlegg
- `kontaktpersoner` - Kontaktpersoner
- `anlegg_kontaktpersoner` - Junction table (kobling)
- `serviceavtale_tilbud` - Tilbud
- `dokumenter` - Dokumentreferanser

### Storage

- Bucket: `anlegg.dokumenter`
- Path: `anlegg/{anlegg_id}/tilbud/{filename}.pdf`

## Tips

1. **Fyll ut all informasjon** før godkjenning for best resultat
2. **Sjekk at kunde/anlegg ikke allerede eksisterer** hvis du vil unngå duplikater
3. **PDF-en kan lastes ned** fra anleggets dokumenter-seksjon
4. **Statusendringen kan ikke angres** automatisk - du må manuelt endre tilbake

## Fremtidige forbedringer

Mulige forbedringer som kan legges til:

- [ ] Automatisk e-post til kunde ved godkjenning
- [ ] Mulighet til å velge eksisterende kunde/anlegg fra dropdown
- [ ] Forhåndsvisning av PDF før godkjenning
- [ ] Historikk over statusendringer
- [ ] Notifikasjoner til tekniker/salgsperson
