/**
 * PowerOffice Go API Client
 * Main client for interacting with PowerOffice API endpoints
 */

import { PowerOfficeAuth } from './auth';
import { PowerOfficeConfig, getUrls } from './config';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  queryParams?: Record<string, string | number | boolean>;
}

export interface ClientIntegrationInfo {
  clientSubscriptions: string[];
  validPrivileges: string[];
  invalidPrivileges: string[];
}

/**
 * PowerOffice API Client
 * Provides methods to interact with PowerOffice Go API v2
 */
export class PowerOfficeClient {
  private auth: PowerOfficeAuth;
  private config: PowerOfficeConfig;
  private baseUrl: string;

  constructor(config: PowerOfficeConfig) {
    this.config = config;
    this.auth = new PowerOfficeAuth(config);
    this.baseUrl = getUrls(config.environment).apiBaseUrl;
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', body, queryParams } = options;

    // Get valid access token
    const accessToken = await this.auth.getAccessToken();

    // Build URL with query parameters
    let url = `${this.baseUrl}${endpoint}`;
    if (queryParams) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      url += `?${params.toString()}`;
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Ocp-Apim-Subscription-Key': this.config.subscriptionKey
    };

    // Add Content-Type for requests with body
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    // Make request
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    // Handle errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed: ${method} ${endpoint}\n` +
        `Status: ${response.status} ${response.statusText}\n` +
        `Response: ${errorText}`
      );
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return null as T;
  }

  // ==================== Client Information ====================

  /**
   * Get client integration information including privileges
   */
  async getClientIntegrationInfo(): Promise<ClientIntegrationInfo> {
    return this.request<ClientIntegrationInfo>('/ClientIntegrationInformation');
  }

  // ==================== Customers ====================

  /**
   * Get all customers
   */
  async getCustomers(queryParams?: {
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    return this.request('/customers', { queryParams });
  }

  /**
   * Get a specific customer by ID
   */
  async getCustomer(customerId: number): Promise<any> {
    return this.request(`/customers/${customerId}`);
  }

  /**
   * Create a new customer
   */
  async createCustomer(customerData: any): Promise<any> {
    return this.request('/customers', {
      method: 'POST',
      body: customerData
    });
  }

  /**
   * Update a customer
   */
  async updateCustomer(customerId: number, customerData: any): Promise<any> {
    return this.request(`/customers/${customerId}`, {
      method: 'PUT',
      body: customerData
    });
  }

  // ==================== Products ====================

  /**
   * Get all products
   */
  async getProducts(queryParams?: {
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    return this.request('/products', { queryParams });
  }

  /**
   * Get a specific product by ID
   */
  async getProduct(productId: number): Promise<any> {
    return this.request(`/products/${productId}`);
  }

  // ==================== Invoices ====================

  /**
   * Get all outgoing invoices
   */
  async getOutgoingInvoices(queryParams?: {
    page?: number;
    pageSize?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<any> {
    return this.request('/outgoingInvoices', { queryParams });
  }

  /**
   * Get a specific outgoing invoice
   */
  async getOutgoingInvoice(invoiceId: number): Promise<any> {
    return this.request(`/outgoingInvoices/${invoiceId}`);
  }

  /**
   * Create a new outgoing invoice
   */
  async createOutgoingInvoice(invoiceData: any): Promise<any> {
    return this.request('/outgoingInvoices', {
      method: 'POST',
      body: invoiceData
    });
  }

  // ==================== Projects ====================

  /**
   * Get all projects
   */
  async getProjects(queryParams?: {
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    return this.request('/projects', { queryParams });
  }

  /**
   * Get a specific project
   */
  async getProject(projectId: number): Promise<any> {
    return this.request(`/projects/${projectId}`);
  }

  // ==================== Time Tracking ====================

  /**
   * Get time tracking entries
   */
  async getTimeTrackingEntries(queryParams?: {
    fromDate?: string;
    toDate?: string;
    employeeId?: number;
  }): Promise<any> {
    return this.request('/timeTracking', { queryParams });
  }

  // ==================== Employees ====================

  /**
   * Get all employees
   */
  async getEmployees(): Promise<any> {
    return this.request('/employees');
  }

  /**
   * Get a specific employee
   */
  async getEmployee(employeeId: number): Promise<any> {
    return this.request(`/employees/${employeeId}`);
  }

  // ==================== Utility Methods ====================

  /**
   * Get authentication info (for debugging)
   */
  getAuthInfo() {
    return this.auth.getTokenInfo();
  }

  /**
   * Force refresh access token
   */
  async refreshToken(): Promise<void> {
    await this.auth.refreshAccessToken();
  }

  /**
   * Clear cached access token
   */
  clearToken(): void {
    this.auth.clearToken();
  }
}
