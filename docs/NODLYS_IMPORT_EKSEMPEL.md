# Nødlys Import - Eksempel

## Rask Start

### 1. Lag Excel-fil med følgende struktur:

```
Armatur ID | Fordeling | Kurs | Etasje | Plassering           | Produsent | Type | Status | Kontrollert
-----------|-----------|------|--------|----------------------|-----------|------|--------|------------
1          | F1        | K1   | 1.Etg  | Gang ved inngang     | Glamox    | ML   | OK     | Ja
2          | F1        | K2   | 1.Etg  | Trapp                | Glamox    | LL   | OK     | Nei
3          | F2        | K1   | 2.Etg  | Kontor 201           | Philips   | ML   | OK     | Ja
4          | F2        | K2   | 2.Etg  | Møterom              | Glamox    | ML   | OK     | Ja
5          | F1        | K3   | 0.Etg  | Resepsjon            | Glamox    | ML   | OK     | Ja
6          | F3        | K1   | -1.Etg | Kjeller gang         | Philips   | LL   | Defekt | Ja
```

### 2. Eller bruk CSV-format:

```csv
Armatur ID,Fordeling,Kurs,Etasje,Plassering,Produsent,Type,Status,Kontrollert
1,F1,K1,1.Etg,Gang ved inngang,Glamox,ML,OK,Ja
2,F1,K2,1.Etg,Trapp,Glamox,LL,OK,Nei
3,F2,K1,2.Etg,Kontor 201,Philips,ML,OK,Ja
```

## Alternative Kolonnenavn

Du kan bruke forskjellige varianter av kolonnenavn:

### Eksempel 1: Norske navn
```
ID | Fordeling | Kurs | Etasje | Plassering | Produsent | Type | Status | Kontrollert
```

### Eksempel 2: Kortere navn
```
Armatur | Ford | K | Etg | Sted | Merke | Type | Status | OK
```

### Eksempel 3: Engelske navn (støttes også)
```
ID | Distribution | Circuit | Floor | Location | Manufacturer | Type | Status | Checked
```

## Verdier for Kontrollert-kolonnen

Følgende verdier tolkes som "Ja" (kontrollert):
- `Ja`
- `Yes`
- `True`
- `1`
- `X`

Alt annet tolkes som "Nei" (ikke kontrollert).

## Eksempel med Minimal Data

Kun Armatur ID og Plassering er teknisk nødvendig:

```
Armatur ID | Plassering
-----------|------------------
1          | Gang ved inngang
2          | Trapp
3          | Kontor 201
```

Resten av feltene kan fylles ut senere i systemet.

## PDF-eksempel fra Leverandør

Hvis du har en PDF fra leverandør, kan du:

1. Kopiere tabellen fra PDF til Excel
2. Justere kolonnenavn til å matche systemet
3. Importere filen

## Konvertering fra Gammelt System

Hvis du har data fra et annet system:

1. Eksporter til Excel/CSV
2. Legg til/endre kolonnenavn til å matche
3. Importer

Eksempel mapping:
```
Gammelt system    →  Nytt system
-----------------    ------------
Nr                →  Armatur ID
Lokasjon          →  Plassering
Fabrikant         →  Produsent
Etg               →  Etasje
```
