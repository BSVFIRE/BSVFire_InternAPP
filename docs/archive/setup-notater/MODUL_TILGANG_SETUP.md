# Modul Tilgang System - Oppsett

## Oversikt

Dette systemet lar deg som administrator kontrollere hvem som har tilgang til hvilke moduler i applikasjonen.

### Funksjoner:
- **Granulær tilgangskontroll** - Gi tilgang per modul per ansatt
- **Se/Rediger-tilganger** - Skille mellom lesing og redigering
- **Super-admin** - erik.skille@bsvfire.no har alltid full tilgang
- **Dynamisk meny** - Admin-menyen viser kun moduler brukeren har tilgang til

## Oppsett

### 1. Kjør SQL-migrasjonen

Gå til Supabase SQL Editor og kjør innholdet i:
```
supabase_migrations/create_modul_tilganger.sql
```

Dette oppretter:
- `moduler` - Tabell med alle tilgjengelige moduler
- `modul_tilganger` - Kobling mellom ansatte og moduler
- RLS-policies for sikkerhet
- Hjelpefunksjon `har_modul_tilgang()`

### 2. Tilgjengelige moduler

| Modul Key | Navn | Beskrivelse |
|-----------|------|-------------|
| `admin_modul_tilgang` | Modul Tilganger | Administrer hvem som har tilgang til hva |
| `admin_aarsavslutning` | Årsavslutning | Årsavslutning og statusoppdatering |
| `admin_prisadministrasjon` | Prisadministrasjon | Administrer priser for tjenester |
| `admin_poweroffice` | PowerOffice | PowerOffice integrasjon |
| `admin_dropbox` | Dropbox Mapper | Administrer Dropbox mappekoblinger |
| `admin_logger` | System Logger | Se systemlogger og feilmeldinger |
| `admin_ai_embeddings` | AI Embeddings | Administrer AI embeddings |
| `admin_ai_knowledge` | AI Kunnskapsbase | Administrer AI kunnskapsbase |
| `anlegg_priser_se` | Se priser (Anlegg) | Kan se priser under anlegg |
| `anlegg_priser_rediger` | Rediger priser (Anlegg) | Kan redigere priser under anlegg |
| `tilbud_serviceavtale` | Tilbud Serviceavtale | Tilgang til serviceavtale-tilbud |
| `tilbud_alarmoverforing` | Tilbud Alarmoverføring | Tilgang til alarmoverførings-tilbud |
| `send_rapporter` | Send Rapporter | Tilgang til å sende rapporter |

## Bruk

### Admin-grensesnitt

1. Logg inn som super-admin (erik.skille@bsvfire.no)
2. Gå til **Administrator** → **Modul Oversikt**
3. Klikk på en ansatt for å se/endre tilganger
4. Bruk knappene:
   - 👁️ (blå) = Kan se modulen
   - ✏️ (grønn) = Kan redigere i modulen
5. Hurtigknapper:
   - **Gi full tilgang** - Gir alle tilganger
   - **Fjern alle tilganger** - Fjerner alle tilganger

### I koden

Bruk `useModulTilgang` hook for å sjekke tilganger:

```tsx
import { useModulTilgang } from '@/hooks/useModulTilgang'

function MyComponent() {
  const { harTilgang, isSuperAdmin } = useModulTilgang()
  
  // Sjekk om bruker kan se priser
  if (harTilgang('anlegg_priser_se', 'se')) {
    // Vis priser
  }
  
  // Sjekk om bruker kan redigere priser
  if (harTilgang('anlegg_priser_rediger', 'rediger')) {
    // Vis redigeringsknapper
  }
}
```

### Legge til nye moduler

1. Legg til i `moduler`-tabellen:
```sql
INSERT INTO moduler (modul_key, navn, beskrivelse, kategori, ikon, sortering)
VALUES ('min_nye_modul', 'Min Nye Modul', 'Beskrivelse', 'admin', 'Icon', 100);
```

2. Bruk i koden:
```tsx
const { harTilgang } = useModulTilgang()
if (harTilgang('min_nye_modul', 'se')) {
  // ...
}
```

## Filer

- `supabase_migrations/create_modul_tilganger.sql` - Database-migrasjon
- `src/hooks/useModulTilgang.ts` - React hook for tilgangskontroll
- `src/pages/AdminModulOversikt.tsx` - Admin-grensesnitt
- `src/components/Layout.tsx` - Oppdatert med dynamisk admin-meny

## Sikkerhet

- Super-admin (erik.skille@bsvfire.no) har alltid full tilgang
- RLS-policies sikrer at kun autentiserte brukere kan lese tilganger
- Kun admin kan opprette/endre tilganger (via UI)
