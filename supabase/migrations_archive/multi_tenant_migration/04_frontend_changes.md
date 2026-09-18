# Frontend-endringer for Multi-Tenant

## Oversikt
Når database er klar med `company_id`, må frontend oppdateres for å sende med `company_id` ved INSERT-operasjoner.

## Endringer som må gjøres

### 1. Opprett en context/hook for company_id

```typescript
// src/contexts/CompanyContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface CompanyContextType {
  companyId: string | null
  companyName: string | null
  loading: boolean
}

const CompanyContext = createContext<CompanyContextType>({
  companyId: null,
  companyName: null,
  loading: true
})

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCompany() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('user_company_mapping')
        .select('company_id, companies(navn)')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setCompanyId(data.company_id)
        setCompanyName((data.companies as any)?.navn || null)
      }
      setLoading(false)
    }

    loadCompany()
  }, [])

  return (
    <CompanyContext.Provider value={{ companyId, companyName, loading }}>
      {children}
    </CompanyContext.Provider>
  )
}

export const useCompany = () => useContext(CompanyContext)
```

### 2. Oppdater alle INSERT-operasjoner

**Før:**
```typescript
await supabase.from('customer').insert([{
  navn: 'Ny Kunde',
  epost: 'kunde@test.no'
}])
```

**Etter:**
```typescript
const { companyId } = useCompany()

await supabase.from('customer').insert([{
  navn: 'Ny Kunde',
  epost: 'kunde@test.no',
  company_id: companyId  // <-- Legg til dette
}])
```

### 3. Tabeller som må oppdateres

Søk etter `.insert(` i kodebasen og legg til `company_id`:

- [ ] customer
- [ ] anlegg
- [ ] kontaktpersoner
- [ ] ansatte
- [ ] ordre
- [ ] servicerapporter
- [ ] avvik
- [ ] oppgaver
- [ ] moter
- [ ] prosjekter
- [ ] prosjekteringer
- [ ] salgs_leads
- [ ] rapporter
- [ ] dokumenter
- [ ] (alle andre tabeller med company_id)

### 4. Alternativ: Database trigger (automatisk)

I stedet for å endre all frontend-kode, kan du lage en trigger som automatisk setter `company_id`:

```sql
-- Trigger som automatisk setter company_id ved INSERT
CREATE OR REPLACE FUNCTION set_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Legg til trigger på alle tabeller
CREATE TRIGGER set_customer_company_id
  BEFORE INSERT ON customer
  FOR EACH ROW EXECUTE FUNCTION set_company_id();

CREATE TRIGGER set_anlegg_company_id
  BEFORE INSERT ON anlegg
  FOR EACH ROW EXECUTE FUNCTION set_company_id();

-- ... gjenta for alle tabeller
```

**Fordel med trigger:** Ingen frontend-endringer nødvendig!

## Anbefalt rekkefølge

1. ✅ Opprett nytt Supabase-prosjekt (FireCtrl.IO)
2. ✅ Kjør SQL-scripts 01, 02, 03
3. ✅ Legg til triggers (automatisk company_id)
4. ⬜ Migrer BSVFire-data
5. ⬜ Test grundig
6. ⬜ Bytt frontend til nytt prosjekt
