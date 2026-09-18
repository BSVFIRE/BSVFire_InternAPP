# PowerOffice + Supabase Edge Function Setup

## 🎯 Løsning på CORS-problemet

Jeg har laget en Supabase Edge Function som fungerer som proxy mellom din frontend og PowerOffice API.

## 📁 Filer opprettet

- `supabase/functions/poweroffice-proxy/index.ts` - Edge Function proxy

## 🚀 Slik setter du det opp

### Steg 1: Deploy Edge Function

```bash
# Fra rot-mappen av prosjektet
supabase functions deploy poweroffice-proxy
```

### Steg 2: Sett environment secrets

```bash
supabase secrets set POWEROFFICE_APPLICATION_KEY=a026a508-b5ce-47d4-9a0a-7163adb4c066
supabase secrets set POWEROFFICE_CLIENT_KEY=9abf170a-d7ed-4946-9890-16a90ce40285
supabase secrets set POWEROFFICE_SUBSCRIPTION_KEY=8614510ab41041e992959512b78ed229
```

### Steg 3: Test Edge Function

```bash
# Test lokalt først
supabase functions serve poweroffice-proxy

# I en annen terminal, test:
curl http://localhost:54321/functions/v1/poweroffice-proxy/customers
```

### Steg 4: Oppdater frontend

Opprett en ny service-fil som kaller Edge Function i stedet for PowerOffice direkte:

```typescript
// src/services/poweroffice/edge-client.ts
import { supabase } from '../supabase'

export class PowerOfficeEdgeClient {
  private baseUrl: string

  constructor() {
    // Bruk din Supabase project URL
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/poweroffice-proxy`
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const { data: { session } } = await supabase.auth.getSession()
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'API request failed')
    }

    return response.json()
  }

  // Kunder
  async getCustomers(params?: { page?: number; pageSize?: number }) {
    const query = params ? `?${new URLSearchParams(params as any)}` : ''
    return this.request(`/customers${query}`)
  }

  async getCustomer(id: number) {
    return this.request(`/customers/${id}`)
  }

  async createCustomer(data: any) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Produkter
  async getProducts(params?: { page?: number; pageSize?: number }) {
    const query = params ? `?${new URLSearchParams(params as any)}` : ''
    return this.request(`/products${query}`)
  }

  // Fakturaer
  async getInvoices(params?: { fromDate?: string; toDate?: string }) {
    const query = params ? `?${new URLSearchParams(params as any)}` : ''
    return this.request(`/outgoingInvoices${query}`)
  }

  // Ansatte
  async getEmployees() {
    return this.request('/employees')
  }

  // Prosjekter
  async getProjects(params?: { page?: number; pageSize?: number }) {
    const query = params ? `?${new URLSearchParams(params as any)}` : ''
    return this.request(`/projects${query}`)
  }

  // Klient-info
  async getClientInfo() {
    return this.request('/ClientIntegrationInformation')
  }
}

// Singleton instance
export const powerofficeClient = new PowerOfficeEdgeClient()
```

### Steg 5: Oppdater testsiden

```typescript
// src/pages/PowerOfficeTest.tsx
import { useState } from 'react'
import { powerofficeClient } from '../services/poweroffice/edge-client'

export default function PowerOfficeTest() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runTest = async (testFn: () => Promise<any>, testName: string) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log(`Running test: ${testName}`)
      const data = await testFn()
      setResult(data)
      console.log(`${testName} result:`, data)
    } catch (err: any) {
      setError(err.message)
      console.error(`${testName} error:`, err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PowerOffice Go API Test
          </h1>
          <p className="text-gray-600 mb-6">
            Test PowerOffice API via Supabase Edge Function
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => runTest(() => powerofficeClient.getClientInfo(), 'Client Info')}
              disabled={loading}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              Klient Info
            </button>

            <button
              onClick={() => runTest(() => powerofficeClient.getCustomers(), 'Customers')}
              disabled={loading}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              Hent Kunder
            </button>

            <button
              onClick={() => runTest(() => powerofficeClient.getProducts(), 'Products')}
              disabled={loading}
              className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
            >
              Hent Produkter
            </button>

            <button
              onClick={() => runTest(() => powerofficeClient.getEmployees(), 'Employees')}
              disabled={loading}
              className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
            >
              Hent Ansatte
            </button>

            <button
              onClick={() => runTest(() => powerofficeClient.getProjects(), 'Projects')}
              disabled={loading}
              className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
            >
              Hent Prosjekter
            </button>

            <button
              onClick={() => runTest(() => powerofficeClient.getInvoices(), 'Invoices')}
              disabled={loading}
              className="px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400"
            >
              Hent Fakturaer
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Laster...</span>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-red-800 font-semibold mb-2">Feil</h3>
              <pre className="text-red-700 text-sm whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          {result && !loading && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-green-800 font-semibold mb-2">Resultat</h3>
              <pre className="text-green-900 text-sm whitespace-pre-wrap overflow-auto max-h-96 bg-white p-4 rounded">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

## ✅ Fordeler med denne løsningen

- ✅ **Ingen CORS-problemer** - Edge Function håndterer alt
- ✅ **Sikker** - Credentials lagres på serveren, ikke i nettleseren
- ✅ **Token caching** - Edge Function cacher access tokens
- ✅ **Enkel å bruke** - Frontend kaller bare Edge Function
- ✅ **Skalerbar** - Supabase håndterer skalering automatisk

## 🔐 Sikkerhet

Edge Function:
- Lagrer credentials som secrets (ikke i kode)
- Cacher access tokens sikkert
- Kan legge til Supabase auth for å beskytte endpointet
- Ingen credentials eksponeres til frontend

## 📝 Neste steg

1. Deploy Edge Function: `supabase functions deploy poweroffice-proxy`
2. Sett secrets med dine PowerOffice nøkler
3. Test Edge Function
4. Oppdater frontend til å bruke `powerofficeClient`
5. Test i nettleseren - nå uten CORS-feil!

## 🐛 Feilsøking

### Edge Function deployer ikke
```bash
# Sjekk at Supabase CLI er installert
supabase --version

# Logg inn
supabase login

# Link til prosjekt
supabase link --project-ref your-project-ref
```

### Secrets fungerer ikke
```bash
# List secrets
supabase secrets list

# Sett på nytt
supabase secrets set POWEROFFICE_APPLICATION_KEY=...
```

### CORS-feil fortsatt
- Sjekk at du kaller Edge Function URL, ikke PowerOffice direkte
- Sjekk at CORS headers er satt i Edge Function

---

**Nå kan du kalle PowerOffice API fra nettleseren uten CORS-problemer! 🎉**
