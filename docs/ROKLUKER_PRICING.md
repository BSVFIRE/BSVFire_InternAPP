# Røykluker Prisberegning

## Oversikt
Røykluker bruker tier-basert prising for luker og fast pris for sentral.

## Prisstruktur

### Sentral
- **Fast pris: 950 kr** for første sentral
- Ingen ekstra sentraler (sentralenhet_ekstra = 0)

### Luker (tier-basert)
Prisen per luke avhenger av totalt antall luker:

| Antall luker | Pris per luke |
|--------------|---------------|
| 0-10         | 350 kr        |
| 11-20        | 300 kr        |
| 21-40        | 250 kr        |
| 41+          | 200 kr        |

### Rapport
- Konfigurerbar pris (standard: 750 kr)

## Prisberegning

### Formel:
```
Total = (Antall luker × Pris per luke) + Sentral (950 kr) + Rapport
```

### Eksempler:

#### Eksempel 1: Lite anlegg (8 luker)
```
Luker: 8 × 350 kr = 2800 kr (tier 0-10)
Sentral: 950 kr
Rapport: 750 kr
---
Total: 4500 kr
```

#### Eksempel 2: Middels anlegg (15 luker)
```
Luker: 15 × 300 kr = 4500 kr (tier 11-20)
Sentral: 950 kr
Rapport: 750 kr
---
Total: 6200 kr
```

#### Eksempel 3: Stort anlegg (30 luker)
```
Luker: 30 × 250 kr = 7500 kr (tier 21-40)
Sentral: 950 kr
Rapport: 750 kr
---
Total: 9200 kr
```

#### Eksempel 4: Veldig stort anlegg (50 luker)
```
Luker: 50 × 200 kr = 10000 kr (tier 41+)
Sentral: 950 kr
Rapport: 750 kr
---
Total: 11700 kr
```

## Sammenligning: Fast vs Tier-pris

### Hvis alle luker kostet 350 kr:
- 10 luker: 3500 kr + 950 kr = 4450 kr
- 20 luker: 7000 kr + 950 kr = 7950 kr
- 40 luker: 14000 kr + 950 kr = 14950 kr
- 50 luker: 17500 kr + 950 kr = 18450 kr

### Med tier-system:
- 10 luker: 3500 kr + 950 kr = 4450 kr (samme)
- 20 luker: 6000 kr + 950 kr = 6950 kr (**1000 kr billigere**)
- 40 luker: 10000 kr + 950 kr = 10950 kr (**4000 kr billigere**)
- 50 luker: 10000 kr + 950 kr = 10950 kr (**7500 kr billigere**)

## Konfigurasjon i Prisadministrasjon

For Røykluker kan du konfigurere:

1. **Minstepris** - Minimum beløp
2. **Rapport-pris** - Fast pris for rapport
3. **Sentralenhet - Første** - Pris for sentral (950 kr)
4. **Enhetspriser** (luker):
   - 0-10 luker: 350 kr
   - 11-20 luker: 300 kr
   - 21-40 luker: 250 kr
   - 41+ luker: 200 kr

## UI i tilbudsskjema

Når Røykluker er valgt, vises:

1. **Antall enheter** (luker)
   - Viser automatisk pris per luke basert på antall
   - Eksempel: "15 luker → 300 kr per luke"

2. **Antall sentralenheter**
   - Standard: 1 sentral
   - Pris: 950 kr for første sentral

3. **Rapport-checkbox**
   - Valgfritt
   - Standard pris: 750 kr

4. **Prisoppsummering**
   - Viser total pris for Røykluker
   - Inkludert i total pris for hele tilbudet

## Beste praksis

1. **Standard oppsett**: 1 sentral + antall luker
2. **Sjekk tier-prisen**: Systemet viser automatisk hvilken pris som gjelder
3. **Store anlegg**: Tier-systemet gir automatisk rabatt ved mange luker
4. **Juster tiers**: Du kan endre tier-grensene i Prisadministrasjon

## Fremtidige forbedringer

Potensielle utvidelser:
- [ ] Flere sentraler (hvis nødvendig)
- [ ] Ekstra rabatt ved veldig store anlegg (100+ luker)
- [ ] Sesongbaserte priser
- [ ] Kunde-spesifikke rabatter
