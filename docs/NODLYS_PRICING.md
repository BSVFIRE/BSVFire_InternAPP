# Nødlys Prisberegning

## Oversikt
Nødlys har en spesiell prisstruktur som skiller seg fra de andre tjenestene.

## Felt i Nødlys

### 1. Antall LL (Ledelys)
- Antall ledelysenheter
- Bruker samme tier-struktur som Brannalarm (0-50, 51-100, etc.)
- Pris per enhet avhenger av totalt antall LL

### 2. Antall ML (Markeringslys)
- Antall markeringslysenheter
- Bruker samme tier-struktur som LL
- Pris per enhet avhenger av totalt antall ML
- LL og ML har samme enhetspriser, men prises separat basert på antall

### 3. Sentralisert anlegg
- Checkbox for å aktivere sentralisert anlegg
- **Fast pris: 1500 kr per anlegg**
- Når aktivert, kan du angi antall sentraliserte anlegg
- Eksempel: 2 anlegg = 2 × 1500 kr = 3000 kr

### 4. Rapport
- Samme som andre tjenester
- Fast pris (konfigurerbar i Prisadministrasjon)

## Prisberegning

### Formel:
```
Total = (LL × LL_pris) + (ML × ML_pris) + (Sentraliserte anlegg × 1500) + Rapport
```

### Eksempel 1: Kun LL og ML
```
LL: 30 enheter × 25 kr = 750 kr
ML: 20 enheter × 25 kr = 500 kr
Rapport: 750 kr
---
Total: 2000 kr
```

### Eksempel 2: Med sentralisert anlegg
```
LL: 75 enheter × 20 kr = 1500 kr (tier 51-100)
ML: 40 enheter × 25 kr = 1000 kr (tier 0-50)
Sentralisert anlegg: 2 × 1500 kr = 3000 kr
Rapport: 750 kr
---
Total: 6250 kr
```

### Eksempel 3: Stor installasjon
```
LL: 150 enheter × 17 kr = 2550 kr (tier 101-200)
ML: 120 enheter × 17 kr = 2040 kr (tier 101-200)
Sentralisert anlegg: 3 × 1500 kr = 4500 kr
Rapport: 750 kr
---
Total: 9840 kr
```

## Konfigurasjon i Prisadministrasjon

For Nødlys kan du konfigurere:

1. **Minstepris** - Minimum beløp som alltid skal belastes
2. **Enhetspriser** (gjelder både LL og ML):
   - 0-50 enheter: X kr
   - 51-100 enheter: Y kr
   - 101-200 enheter: Z kr
   - 201+ enheter: W kr
3. **Rapport-pris** - Fast pris for rapport

**NB:** Prisen for sentralisert anlegg (1500 kr) er hardkodet i systemet.

## UI i tilbudsskjema

Når Nødlys er valgt, vises:

1. **To felt for enheter:**
   - Antall LL (Ledelys)
   - Antall ML (Markeringslys)
   - Begge bruker samme enhetspriser basert på tier
   - Hver type prises separat basert på sitt antall

2. **Sentralisert anlegg-seksjon:**
   - Checkbox: "Sentralisert anlegg (1500 kr per anlegg)"
   - Når aktivert: Input for antall anlegg
   - Viser beregning: "X × 1500 kr = Y kr"

3. **Rapport-checkbox** (som alle andre tjenester)

4. **Prisoppsummering:**
   - Viser total pris for Nødlys
   - Inkludert i total pris for hele tilbudet

## Forskjeller fra andre tjenester

| Aspekt | Brannalarm/Andre | Nødlys |
|--------|------------------|--------|
| Enhetstyper | 1 type (enheter) | 2 typer (LL og ML) |
| Sentralenheter | Første + ekstra (variabel pris) | Fast pris × antall |
| Enhetsprising | En tier-beregning | To separate tier-beregninger |
| Sentralenhet-pris | Konfigurerbar | Hardkodet (1500 kr) |

## Tips

1. **Alltid angi både LL og ML** hvis begge finnes i anlegget
2. **Husk å aktivere "Sentralisert anlegg"** hvis relevant
3. **Sjekk prisoppsummeringen** før lagring
4. **Bruk notater-feltet** for å dokumentere spesielle forhold

## Fremtidige forbedringer

Potensielle utvidelser:
- [ ] Konfigurerbar pris for sentralisert anlegg
- [ ] Separate tier-strukturer for LL og ML
- [ ] Rabatt ved mange sentraliserte anlegg
- [ ] Automatisk beregning basert på anleggstype
