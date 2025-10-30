# PowerOffice Go API Client

En komplett TypeScript/JavaScript klient for PowerOffice Go API v2 med OAuth 2.0 autentisering.

## 🚀 Hurtigstart

```typescript
import { PowerOfficeClient, createConfig } from './services/poweroffice';

// Opprett klient (bruker miljøvariabler fra .env.local)
const config = createConfig('demo');
const client = new PowerOfficeClient(config);

// Hent kunder
const customers = await client.getCustomers();
console.log(customers);
```

## 📚 Dokumentasjon

- **[POWEROFFICE_QUICKSTART.md](../../../POWEROFFICE_QUICKSTART.md)** - Kom i gang på 5 minutter
- **[POWEROFFICE_API_GUIDE.md](../../../POWEROFFICE_API_GUIDE.md)** - Komplett API-dokumentasjon
- **[POWEROFFICE_OPPSUMMERING.md](../../../POWEROFFICE_OPPSUMMERING.md)** - Teknisk oversikt

## 📦 Moduler

- **`config.ts`** - Konfigurasjon og miljøinnstillinger
- **`auth.ts`** - OAuth 2.0 autentisering og token-håndtering
- **`client.ts`** - API klient med alle endpoints
- **`examples.ts`** - 9 ferdige eksempler
- **`index.ts`** - Eksporter

## 🔑 Oppsett

Legg til i `.env.local`:

```env
VITE_POWEROFFICE_APPLICATION_KEY=din-application-key
VITE_POWEROFFICE_CLIENT_KEY=din-client-key
VITE_POWEROFFICE_SUBSCRIPTION_KEY=din-subscription-key
```

## 🎯 Støttede endpoints

- ✅ Kunder (GET, POST, PUT)
- ✅ Produkter (GET)
- ✅ Fakturaer (GET, POST)
- ✅ Prosjekter (GET)
- ✅ Timeføring (GET)
- ✅ Ansatte (GET)
- ✅ Klient-info (GET)

## 💡 Eksempler

Se `examples.ts` eller kjør testsiden:

```bash
npm run dev
# Åpne http://localhost:5173/poweroffice-test
```

## 🔐 Sikkerhet

- Credentials lagres i miljøvariabler
- Access tokens caches sikkert
- Automatisk token-fornyelse
- Ingen hardkodede hemmeligheter

## 📖 Les mer

Start med [POWEROFFICE_QUICKSTART.md](../../../POWEROFFICE_QUICKSTART.md) for å komme i gang!
