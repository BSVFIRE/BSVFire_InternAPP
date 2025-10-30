/**
 * PowerOffice Integration Example
 * 
 * Dette eksemplet viser hvordan du kan integrere PowerOffice i din applikasjon
 * for å synkronisere data mellom systemene.
 */

import { PowerOfficeClient, createConfig } from './index';

/**
 * PowerOffice Service Class
 * Wrapper rundt PowerOffice klienten for enkel bruk i din app
 */
export class PowerOfficeService {
  private client: PowerOfficeClient;

  constructor(environment: 'demo' | 'production' = 'demo') {
    const config = createConfig(environment);
    this.client = new PowerOfficeClient(config);
  }

  /**
   * Synkroniser kunder fra PowerOffice til din database
   */
  async syncCustomers(): Promise<void> {
    try {
      console.log('Starting customer sync...');
      
      let page = 1;
      let hasMore = true;
      let totalSynced = 0;

      while (hasMore) {
        const response = await this.client.getCustomers({ 
          page, 
          pageSize: 100 
        });

        // Her ville du normalt lagret kundene i din database
        // For eksempel: await saveCustomersToDatabase(response.data);
        
        console.log(`Synced page ${page}, customers: ${response.data?.length || 0}`);
        totalSynced += response.data?.length || 0;

        // Sjekk om det er flere sider
        hasMore = response.data && response.data.length === 100;
        page++;
      }

      console.log(`✅ Customer sync complete. Total synced: ${totalSynced}`);
    } catch (error) {
      console.error('❌ Customer sync failed:', error);
      throw error;
    }
  }

  /**
   * Hent en kunde fra PowerOffice
   */
  async getCustomer(customerId: number) {
    try {
      return await this.client.getCustomer(customerId);
    } catch (error) {
      console.error(`Failed to get customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Opprett kunde i PowerOffice
   */
  async createCustomer(customerData: {
    name: string;
    email?: string;
    phone?: string;
    organizationNumber?: string;
    address?: {
      address1: string;
      zipCode: string;
      city: string;
      country: string;
    };
  }) {
    try {
      console.log('Creating customer in PowerOffice:', customerData.name);
      const customer = await this.client.createCustomer(customerData);
      console.log('✅ Customer created:', customer);
      return customer;
    } catch (error) {
      console.error('❌ Failed to create customer:', error);
      throw error;
    }
  }

  /**
   * Synkroniser fakturaer for en periode
   */
  async syncInvoices(fromDate: string, toDate: string): Promise<void> {
    try {
      console.log(`Syncing invoices from ${fromDate} to ${toDate}...`);
      
      let page = 1;
      let hasMore = true;
      let totalSynced = 0;

      while (hasMore) {
        const response = await this.client.getOutgoingInvoices({
          fromDate,
          toDate,
          page,
          pageSize: 100
        });

        // Lagre fakturaer i din database
        console.log(`Synced page ${page}, invoices: ${response.data?.length || 0}`);
        totalSynced += response.data?.length || 0;

        hasMore = response.data && response.data.length === 100;
        page++;
      }

      console.log(`✅ Invoice sync complete. Total synced: ${totalSynced}`);
    } catch (error) {
      console.error('❌ Invoice sync failed:', error);
      throw error;
    }
  }

  /**
   * Opprett faktura i PowerOffice
   */
  async createInvoice(invoiceData: {
    customerId: number;
    invoiceDate: string;
    dueDate: string;
    lines: Array<{
      productId: number;
      quantity: number;
      unitPrice: number;
      description?: string;
    }>;
  }) {
    try {
      console.log('Creating invoice in PowerOffice...');
      const invoice = await this.client.createOutgoingInvoice(invoiceData);
      console.log('✅ Invoice created:', invoice);
      return invoice;
    } catch (error) {
      console.error('❌ Failed to create invoice:', error);
      throw error;
    }
  }

  /**
   * Hent timeføringer for en ansatt
   */
  async getEmployeeTimeTracking(
    employeeId: number,
    fromDate: string,
    toDate: string
  ) {
    try {
      return await this.client.getTimeTrackingEntries({
        employeeId,
        fromDate,
        toDate
      });
    } catch (error) {
      console.error('Failed to get time tracking:', error);
      throw error;
    }
  }

  /**
   * Sjekk tilgjengelige privilegier
   */
  async checkPrivileges() {
    try {
      const info = await this.client.getClientIntegrationInfo();
      console.log('Available privileges:', info.validPrivileges);
      console.log('Client subscriptions:', info.clientSubscriptions);
      
      if (info.invalidPrivileges && info.invalidPrivileges.length > 0) {
        console.warn('Invalid privileges (missing subscriptions):', info.invalidPrivileges);
      }
      
      return info;
    } catch (error) {
      console.error('Failed to check privileges:', error);
      throw error;
    }
  }

  /**
   * Test forbindelse til PowerOffice
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing PowerOffice connection...');
      await this.client.refreshToken();
      const authInfo = this.client.getAuthInfo();
      
      if (authInfo.isValid) {
        console.log('✅ Connection successful');
        console.log('Token expires at:', authInfo.expiresAt);
        return true;
      } else {
        console.error('❌ Invalid token');
        return false;
      }
    } catch (error) {
      console.error('❌ Connection failed:', error);
      return false;
    }
  }

  /**
   * Hent alle ansatte
   */
  async getEmployees() {
    try {
      return await this.client.getEmployees();
    } catch (error) {
      console.error('Failed to get employees:', error);
      throw error;
    }
  }

  /**
   * Hent alle prosjekter
   */
  async getProjects() {
    try {
      return await this.client.getProjects();
    } catch (error) {
      console.error('Failed to get projects:', error);
      throw error;
    }
  }
}

/**
 * Eksempel på bruk i din applikasjon
 */
export async function exampleUsage() {
  // Opprett service (demo-miljø)
  const poweroffice = new PowerOfficeService('demo');

  // Test forbindelse
  const isConnected = await poweroffice.testConnection();
  if (!isConnected) {
    console.error('Could not connect to PowerOffice');
    return;
  }

  // Sjekk privilegier
  await poweroffice.checkPrivileges();

  // Synkroniser kunder
  await poweroffice.syncCustomers();

  // Opprett ny kunde
  await poweroffice.createCustomer({
    name: 'Eksempel Bedrift AS',
    email: 'post@eksempel.no',
    organizationNumber: '123456789',
    address: {
      address1: 'Eksempelveien 1',
      zipCode: '0001',
      city: 'Oslo',
      country: 'NO'
    }
  });

  // Synkroniser fakturaer for siste måned
  const today = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  await poweroffice.syncInvoices(
    lastMonth.toISOString().split('T')[0],
    today.toISOString().split('T')[0]
  );

  // Hent ansatte
  const employees = await poweroffice.getEmployees();
  console.log('Employees:', employees);

  // Hent prosjekter
  const projects = await poweroffice.getProjects();
  console.log('Projects:', projects);
}

/**
 * Eksempel på scheduled sync (kan kjøres med cron job)
 */
export async function scheduledSync() {
  const poweroffice = new PowerOfficeService('production');

  try {
    // Test forbindelse først
    const isConnected = await poweroffice.testConnection();
    if (!isConnected) {
      throw new Error('Could not connect to PowerOffice');
    }

    // Synkroniser kunder
    await poweroffice.syncCustomers();

    // Synkroniser fakturaer for siste 7 dager
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    await poweroffice.syncInvoices(
      weekAgo.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    );

    console.log('✅ Scheduled sync completed successfully');
  } catch (error) {
    console.error('❌ Scheduled sync failed:', error);
    // Her ville du normalt sendt en varsling eller logget feilen
    throw error;
  }
}
