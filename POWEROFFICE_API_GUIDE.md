# PowerOffice Go API Integration Guide

Dette er en komplett implementasjon av PowerOffice Go API v2 med OAuth 2.0 autentisering.

## 📋 Innhold

- [Oppsett](#oppsett)
- [Konfigurasjon](#konfigurasjon)
- [Grunnleggende bruk](#grunnleggende-bruk)
- [API Metoder](#api-metoder)
- [Eksempler](#eksempler)
- [Feilhåndtering](#feilhåndtering)
- [Sikkerhet](#sikkerhet)

## 🚀 Oppsett

### 1. Legg til miljøvariabler

Opprett eller oppdater `.env.local` filen med dine PowerOffice credentials:

```env
# PowerOffice Go API Credentials (Demo miljø)
VITE_POWEROFFICE_APPLICATION_KEY=din-application-key-her
VITE_POWEROFFICE_CLIENT_KEY=din-client-key-her
VITE_POWEROFFICE_SUBSCRIPTION_KEY=din-subscription-key-her
```

**Viktig:** Disse nøklene er hemmelige og skal ALDRI committes til Git!

### 2. Filstruktur

API-integrasjonen er organisert slik:

```
src/services/poweroffice/
├── config.ts          # Konfigurasjon og miljøinnstillinger
├── auth.ts            # OAuth autentisering og token-håndtering
├── client.ts          # Hoved-API klient med alle endpoints
├── examples.ts        # Eksempler på bruk
└── index.ts           # Eksporter
```

## ⚙️ Konfigurasjon

### Miljøer

API-en støtter to miljøer:

- **Demo**: For testing (`https://goapi.poweroffice.net/Demo/v2`)
- **Production**: For produksjon (`https://goapi.poweroffice.net/v2`)

### Credentials

Du trenger tre nøkler:

1. **Application Key** (Applikasjonsnøkkel): Unik for din integrasjon
2. **Client Key** (Klientnøkkel): Unik per klient-instans (HEMMELIG!)
3. **Subscription Key**: For API-tilgang via Azure API Management

## 💻 Grunnleggende bruk

### Initialisering

```typescript
import { PowerOfficeClient, createConfig } from './services/poweroffice';

// Opprett konfigurasjon (bruker miljøvariabler)
const config = createConfig('demo'); // eller 'production'

// Opprett klient
const client = new PowerOfficeClient(config);
```

### Enkel forespørsel

```typescript
// Hent alle kunder
const customers = await client.getCustomers();
console.log(customers);
```

## 📚 API Metoder

### Klient-informasjon

```typescript
// Hent integrasjons-informasjon og privilegier
const info = await client.getClientIntegrationInfo();
console.log('Privilegier:', info.validPrivileges);
console.log('Abonnementer:', info.clientSubscriptions);
```

### Kunder (Customers)

```typescript
// Hent alle kunder (med paginering)
const customers = await client.getCustomers({ 
  page: 1, 
  pageSize: 50 
});

// Hent en spesifikk kunde
const customer = await client.getCustomer(123);

// Opprett ny kunde
const newCustomer = await client.createCustomer({
  name: 'Acme AS',
  email: 'post@acme.no',
  organizationNumber: '123456789',
  address: {
    address1: 'Storgata 1',
    zipCode: '0001',
    city: 'Oslo',
    country: 'NO'
  }
});

// Oppdater kunde
const updated = await client.updateCustomer(123, {
  name: 'Acme Norge AS'
});
```

### Produkter (Products)

```typescript
// Hent alle produkter
const products = await client.getProducts({ 
  page: 1, 
  pageSize: 50 
});

// Hent et spesifikt produkt
const product = await client.getProduct(456);
```

### Fakturaer (Invoices)

```typescript
// Hent utgående fakturaer
const invoices = await client.getOutgoingInvoices({
  fromDate: '2024-01-01',
  toDate: '2024-12-31',
  page: 1,
  pageSize: 50
});

// Hent en spesifikk faktura
const invoice = await client.getOutgoingInvoice(789);

// Opprett ny faktura
const newInvoice = await client.createOutgoingInvoice({
  customerId: 123,
  invoiceDate: '2024-10-30',
  dueDate: '2024-11-30',
  lines: [
    {
      productId: 456,
      quantity: 2,
      unitPrice: 1000
    }
  ]
});
```

### Prosjekter (Projects)

```typescript
// Hent alle prosjekter
const projects = await client.getProjects({ 
  page: 1, 
  pageSize: 50 
});

// Hent et spesifikt prosjekt
const project = await client.getProject(321);
```

### Timeføring (Time Tracking)

```typescript
// Hent timeføringer
const entries = await client.getTimeTrackingEntries({
  fromDate: '2024-10-01',
  toDate: '2024-10-31',
  employeeId: 123 // valgfritt
});
```

### Ansatte (Employees)

```typescript
// Hent alle ansatte
const employees = await client.getEmployees();

// Hent en spesifikk ansatt
const employee = await client.getEmployee(123);
```

## 🔐 Autentisering

API-en håndterer OAuth automatisk:

- **Access tokens** caches og fornyes automatisk
- Tokens er gyldige i 20 minutter
- Automatisk fornyelse 1 minutt før utløp

### Manuell token-håndtering

```typescript
// Sjekk token-status
const authInfo = client.getAuthInfo();
console.log('Token gyldig:', authInfo.isValid);
console.log('Utløper:', authInfo.expiresAt);

// Tving fornyelse av token
await client.refreshToken();

// Slett cached token
client.clearToken();
```

## 📖 Eksempler

Se `src/services/poweroffice/examples.ts` for komplette eksempler:

```typescript
import { 
  exampleGetCustomers,
  exampleGetClientInfo,
  exampleCreateCustomer,
  exampleGetInvoices,
  exampleGetTimeTracking
} from './services/poweroffice/examples';

// Kjør et eksempel
await exampleGetCustomers();
```

## ⚠️ Feilhåndtering

```typescript
try {
  const customers = await client.getCustomers();
} catch (error) {
  if (error.message.includes('401')) {
    console.error('Autentiseringsfeil - sjekk credentials');
  } else if (error.message.includes('403')) {
    console.error('Ingen tilgang - sjekk privilegier');
  } else {
    console.error('API-feil:', error);
  }
}
```

### Vanlige feilkoder

- **401 Unauthorized**: Ugyldig token eller credentials
- **403 Forbidden**: Mangler privilegier for operasjonen
- **404 Not Found**: Ressurs finnes ikke
- **429 Too Many Requests**: Rate limit overskredet
- **500 Internal Server Error**: Serverfeil hos PowerOffice

## 🔒 Sikkerhet

### Viktige sikkerhetsprinsipper

1. **Aldri hardkod credentials** - bruk miljøvariabler
2. **Client Key er HEMMELIG** - behandle som passord
3. **Access tokens er HEMMELIGE** - ikke logg eller del
4. **Bruk HTTPS** - all kommunikasjon er kryptert
5. **Lagre tokens sikkert** - i minnet eller kryptert database

### Multithreading og flere klienter

Hvis du skal håndtere flere PowerOffice-klienter samtidig:

```typescript
// Opprett separate klient-instanser for hver kunde
const clients = new Map<string, PowerOfficeClient>();

function getClientForCustomer(customerId: string) {
  if (!clients.has(customerId)) {
    const config = {
      applicationKey: process.env.APP_KEY,
      clientKey: getClientKeyForCustomer(customerId), // Hent fra sikker lagring
      subscriptionKey: process.env.SUB_KEY,
      environment: 'production'
    };
    clients.set(customerId, new PowerOfficeClient(config));
  }
  return clients.get(customerId);
}
```

**KRITISK**: Sørg for at tokens ikke blandes mellom klienter!

## 🧪 Testing

### Test med demo-miljø

```typescript
// Bruk demo-miljø for testing
const config = createConfig('demo');
const client = new PowerOfficeClient(config);

// Test autentisering
const authInfo = await client.getAuthInfo();
console.log('Autentisering OK:', authInfo.isValid);

// Test API-tilgang
const info = await client.getClientIntegrationInfo();
console.log('Tilgjengelige privilegier:', info.validPrivileges);
```

## 📝 Neste steg

1. **Sett opp credentials** i `.env.local`
2. **Test autentisering** med `exampleCheckAuth()`
3. **Sjekk privilegier** med `exampleGetClientInfo()`
4. **Start med enkle operasjoner** som å hente kunder
5. **Utvid etter behov** med flere endpoints

## 🔗 Ressurser

- [PowerOffice Developer Portal](https://developer.poweroffice.net/)
- [API Dokumentasjon](https://developer.poweroffice.net/api-documentation)
- [OAuth 2.0 Spesifikasjon](https://oauth.net/2/)

## 💡 Tips

- Start alltid med demo-miljøet
- Sjekk privilegier før du prøver nye operasjoner
- Bruk paginering for store datasett
- Implementer retry-logikk for midlertidige feil
- Logg API-kall for debugging (men IKKE tokens!)

## ❓ Vanlige spørsmål

**Q: Hvordan får jeg Application Key?**  
A: Registrer deg som utvikler på PowerOffice Developer Portal.

**Q: Hvor lenge er access token gyldig?**  
A: 20 minutter. API-en fornyer automatisk.

**Q: Kan jeg bruke samme token for flere klienter?**  
A: NEI! Hver klient må ha sin egen Client Key og Access Token.

**Q: Hva gjør jeg hvis jeg får 403 Forbidden?**  
A: Sjekk at klienten har riktig Go-abonnement for den operasjonen.

**Q: Hvordan håndterer jeg rate limits?**  
A: Implementer exponential backoff og respekter Retry-After headers.
