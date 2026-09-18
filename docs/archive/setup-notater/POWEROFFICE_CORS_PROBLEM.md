# ⚠️ PowerOffice API - CORS Problem

## 🚨 Problemet

PowerOffice Go API kan **IKKE** kalles direkte fra nettleseren på grunn av CORS (Cross-Origin Resource Sharing) restriksjoner.

Feilen du ser:
```
Preflight response is not successful. Status code: 404
Fetch API cannot load https://goapi.poweroffice.net/Demo/OAuth/Token due to access control checks.
```

Dette er **normalt** og **forventet** - PowerOffice API er designet for å kalles fra en backend/server, ikke fra nettleseren.

## 🔧 Løsninger

### Løsning 1: Backend API (Anbefalt for produksjon)

Du må lage en backend som fungerer som proxy mellom din frontend og PowerOffice API.

#### Eksempel med Node.js/Express:

```javascript
// server.js
import express from 'express';
import cors from 'cors';
import { PowerOfficeClient } from './poweroffice-client.js';

const app = express();
app.use(cors());
app.use(express.json());

// PowerOffice credentials (fra miljøvariabler)
const config = {
  applicationKey: process.env.POWEROFFICE_APPLICATION_KEY,
  clientKey: process.env.POWEROFFICE_CLIENT_KEY,
  subscriptionKey: process.env.POWEROFFICE_SUBSCRIPTION_KEY,
  environment: 'demo'
};

const client = new PowerOfficeClient(config);

// Endpoint for å hente kunder
app.get('/api/poweroffice/customers', async (req, res) => {
  try {
    const customers = await client.getCustomers();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for å hente produkter
app.get('/api/poweroffice/products', async (req, res) => {
  try {
    const products = await client.getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('PowerOffice proxy server running on port 3001');
});
```

### Løsning 2: Supabase Edge Functions (Anbefalt for ditt prosjekt)

Siden du allerede bruker Supabase, kan du lage Edge Functions:

```typescript
// supabase/functions/poweroffice-proxy/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Hent credentials fra environment
  const config = {
    applicationKey: Deno.env.get('POWEROFFICE_APPLICATION_KEY'),
    clientKey: Deno.env.get('POWEROFFICE_CLIENT_KEY'),
    subscriptionKey: Deno.env.get('POWEROFFICE_SUBSCRIPTION_KEY'),
  }

  // Autentiser mot PowerOffice
  const credentials = btoa(`${config.applicationKey}:${config.clientKey}`)
  
  const tokenResponse = await fetch('https://goapi.poweroffice.net/Demo/OAuth/Token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })

  const { access_token } = await tokenResponse.json()

  // Bruk token til å hente data
  const { pathname } = new URL(req.url)
  const endpoint = pathname.replace('/poweroffice-proxy', '')
  
  const dataResponse = await fetch(`https://goapi.poweroffice.net/demo/v2${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Ocp-Apim-Subscription-Key': config.subscriptionKey
    }
  })

  const data = await dataResponse.json()
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### Løsning 3: Vite Proxy (Kun for lokal utvikling)

For testing lokalt kan du bruke Vite's proxy:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/poweroffice': {
        target: 'https://goapi.poweroffice.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/poweroffice/, ''),
        configure: (proxy, options) => {
          // Legg til headers
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Ocp-Apim-Subscription-Key', 'din-subscription-key');
          });
        }
      }
    }
  }
})
```

**MERK:** Dette fungerer bare i development, ikke i produksjon!

## 🎯 Anbefalt løsning for ditt prosjekt

Siden du bruker Supabase, anbefaler jeg **Supabase Edge Functions**:

### Steg 1: Opprett Edge Function

```bash
supabase functions new poweroffice-proxy
```

### Steg 2: Implementer proxy-logikk

Se eksempel over.

### Steg 3: Deploy

```bash
supabase functions deploy poweroffice-proxy
```

### Steg 4: Sett secrets

```bash
supabase secrets set POWEROFFICE_APPLICATION_KEY=a026a508-b5ce-47d4-9a0a-7163adb4c066
supabase secrets set POWEROFFICE_CLIENT_KEY=9abf170a-d7ed-4946-9890-16a90ce40285
supabase secrets set POWEROFFICE_SUBSCRIPTION_KEY=8614510ab41041e992959512b78ed229
```

### Steg 5: Kall fra frontend

```typescript
// I din frontend
const response = await fetch('https://your-project.supabase.co/functions/v1/poweroffice-proxy/customers', {
  headers: {
    'Authorization': `Bearer ${supabaseToken}`
  }
});
const customers = await response.json();
```

## 📝 Oppsummering

- ❌ **Kan IKKE** kalle PowerOffice API direkte fra nettleseren (CORS)
- ✅ **Må** bruke en backend/proxy
- ✅ **Anbefalt:** Supabase Edge Functions
- ✅ **Alternativ:** Node.js backend
- ⚠️ **Vite proxy:** Kun for lokal testing

## 🔐 Sikkerhet

**VIKTIG:** Når du bruker en backend:
- Credentials lagres på serveren (ikke i nettleseren)
- Brukere får IKKE tilgang til dine PowerOffice nøkler
- Du kan implementere autentisering og autorisasjon
- Mer sikkert enn å eksponere credentials i frontend

## 🚀 Neste steg

1. Velg løsning (anbefaler Supabase Edge Functions)
2. Implementer proxy/backend
3. Oppdater frontend til å kalle din backend i stedet for PowerOffice direkte
4. Test integrasjonen

---

**PowerOffice API-klienten jeg har laget er fortsatt nyttig - den brukes bare på backend i stedet for frontend!**
