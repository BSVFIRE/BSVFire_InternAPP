# Nødlys Import Guide

## Oversikt

Systemet støtter nå import av nødlysdata fra Excel og CSV-filer. Dette gjør det enkelt å overføre eksisterende nødlyslister til databasen uten å måtte registrere hver enhet manuelt.

## Støttede Filformater

- **Excel**: `.xlsx`, `.xls`
- **CSV**: `.csv` (komma- eller semikolon-separert)

## Hvordan Importere Nødlys

### Steg 1: Forbered Filen

Filen må inneholde en header-rad med kolonnenavn. Systemet støtter følgende kolonner:

| Kolonne | Beskrivelse | Eksempel |
|---------|-------------|----------|
| **Armatur ID** | Unik ID for armaturen | 1, 2, 3... |
| **Fordeling** | Fordelingsnummer | F1, F2, Fordeling 1 |
| **Kurs** | Kursnummer | K1, K2, Kurs 1 |
| **Etasje** | Etasje/plan | 1.Etg, 2.Etg, -1.Etg |
| **Plassering** | Beskrivelse av plassering | Gang ved inngang, Trapp |
| **Produsent** | Produsent/leverandør | Glamox, Philips |
| **Type** | Type nødlys | ML, LL, Strobe, Fluoriserende |
| **Status** | Status på enheten | OK, Defekt, Mangler, Utskiftet |
| **Kontrollert** | Om enheten er kontrollert | Ja, Nei, X, 1, 0 |
| **Internnummer** | Internt referansenummer | (valgfri) |

### Steg 2: Kolonnenavn

Systemet er **fleksibelt** med kolonnenavn og støtter flere varianter:

- **Armatur ID**: "Armatur ID", "armatur-id", "id", "Armatur"
- **Fordeling**: "Fordeling", "Fordelingsnummer", "Fordeling nr"
- **Kurs**: "Kurs", "Kursnummer", "Kurs nr"
- **Etasje**: "Etasje", "Etg", "Plan"
- **Plassering**: "Plassering", "Lokasjon", "Rom", "Område", "Sted"
- **Produsent**: "Produsent", "Fabrikant", "Merke", "Leverandør"
- **Type**: "Type", "Lystype", "Armaturtype"
- **Status**: "Status", "Tilstand"
- **Kontrollert**: "Kontrollert", "Sjekket", "OK"

**Merk**: Kolonnenavn er ikke case-sensitive.

### Steg 3: Last ned Mal

I import-dialogen kan du laste ned en ferdig Excel-mal:

1. Klikk på **"Importer fra Excel/CSV"**
2. Klikk på **"Last ned mal"**
3. Fyll ut malen med dine data
4. Last opp filen

### Steg 4: Importer

1. Gå til **Rapporter → Nødlys**
2. Velg kunde og anlegg
3. Klikk på **"Importer fra Excel/CSV"**
4. Velg fil eller dra og slipp filen
5. Forhåndsvis dataene
6. Klikk **"Importer"**

## Forhåndsvisning

Før import får du se en forhåndsvisning av dataene som skal importeres.

## Feilhåndtering

### Vanlige Feil

- **"Ingen data funnet i filen"**: Sjekk at filen har header-rad og data
- **"Ugyldig filformat"**: Kun .xlsx, .xls og .csv er støttet
- **Import feilet for enkelte rader**: Systemet viser hvilke rader som feilet

### Delvis Import

Hvis noen rader feiler, vil de radene som lyktes fortsatt bli importert.

## Tips

1. **Konsistent formatering**: Bruk samme format for etasje, fordeling, kurs
2. **Standardverdier**: Status settes til "OK" hvis ikke angitt
3. **Tomme celler**: Vises som "-" i grensesnittet
