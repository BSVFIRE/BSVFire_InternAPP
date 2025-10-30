/**
 * PowerOffice Edge Client
 * Kaller PowerOffice API via Supabase Edge Function (løser CORS-problem)
 */

export class PowerOfficeEdgeClient {
  private baseUrl: string

  constructor() {
    // Bruk Supabase Edge Function URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://snyzduzqyjsllzvwuahh.supabase.co'
    this.baseUrl = `${supabaseUrl}/functions/v1/poweroffice-proxy`
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'API request failed' }))
      console.error('API Error Response:', error)
      const errorMsg = error.error || error.message || error.Message || `API request failed: ${response.status}`
      throw new Error(errorMsg)
    }

    return response.json()
  }

  // ==================== Klient Info ====================
  
  async getClientInfo() {
    return this.request('/ClientIntegrationInformation')
  }

  // ==================== Kunder ====================
  
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

  async updateCustomer(id: number, data: any) {
    // Try PATCH instead of PUT
    return this.request(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }

  // ==================== Produkter ====================
  
  async getProducts(params?: { page?: number; pageSize?: number }) {
    const query = params ? `?${new URLSearchParams(params as any)}` : ''
    return this.request(`/products${query}`)
  }

  async getProduct(id: number) {
    return this.request(`/products/${id}`)
  }

  async createProduct(data: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateProduct(id: number, data: any) {
    return this.request(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }

  async getProductGroups() {
    return this.request('/productGroups')
  }

  async getUnitsOfMeasure() {
    return this.request('/unitsOfMeasure')
  }

  async getAccounts() {
    return this.request('/accounts')
  }

  // ==================== Fakturaer ====================
  
  async getInvoices(params?: { fromDate?: string; toDate?: string; page?: number; pageSize?: number }) {
    const query = params ? `?${new URLSearchParams(params as any)}` : ''
    return this.request(`/outgoingInvoices${query}`)
  }

  async getInvoice(id: number) {
    return this.request(`/outgoingInvoices/${id}`)
  }

  async createInvoice(data: any) {
    return this.request('/outgoingInvoices', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // ==================== Prosjekter ====================
  
  async getProjects(params?: { page?: number; pageSize?: number }) {
    const query = params ? `?${new URLSearchParams(params as any)}` : ''
    return this.request(`/projects${query}`)
  }

  async getProject(id: number) {
    return this.request(`/projects/${id}`)
  }

  // ==================== Ansatte ====================
  
  async getEmployees() {
    return this.request('/employees')
  }

  async getEmployee(id: number) {
    return this.request(`/employees/${id}`)
  }

  // ==================== Timeføring ====================
  
  async getTimeTracking(params?: { fromDate?: string; toDate?: string; employeeId?: number }) {
    const query = params ? `?${new URLSearchParams(params as any)}` : ''
    return this.request(`/timeTracking${query}`)
  }
}

// Singleton instance
export const powerofficeClient = new PowerOfficeEdgeClient()
