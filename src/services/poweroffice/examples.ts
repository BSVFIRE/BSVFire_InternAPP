/**
 * PowerOffice API Usage Examples
 * 
 * These examples demonstrate how to use the PowerOffice client
 */

import { PowerOfficeClient, createConfig } from './index';

/**
 * Example 1: Initialize client and get customers
 */
export async function exampleGetCustomers() {
  try {
    // Create client with demo environment
    const config = createConfig('demo');
    const client = new PowerOfficeClient(config);

    // Get all customers (first page)
    const customers = await client.getCustomers({ page: 1, pageSize: 50 });
    console.log('Customers:', customers);

    return customers;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
}

/**
 * Example 2: Get client integration information
 */
export async function exampleGetClientInfo() {
  try {
    const config = createConfig('demo');
    const client = new PowerOfficeClient(config);

    // Get integration info including privileges
    const info = await client.getClientIntegrationInfo();
    console.log('Client Integration Info:', info);
    console.log('Valid Privileges:', info.validPrivileges);
    console.log('Client Subscriptions:', info.clientSubscriptions);

    return info;
  } catch (error) {
    console.error('Error fetching client info:', error);
    throw error;
  }
}

/**
 * Example 3: Create a new customer
 */
export async function exampleCreateCustomer() {
  try {
    const config = createConfig('demo');
    const client = new PowerOfficeClient(config);

    const newCustomer = {
      name: 'Test Kunde AS',
      email: 'test@example.com',
      phone: '+47 12345678',
      organizationNumber: '123456789',
      address: {
        address1: 'Testveien 1',
        zipCode: '0001',
        city: 'Oslo',
        country: 'NO'
      }
    };

    const customer = await client.createCustomer(newCustomer);
    console.log('Created customer:', customer);

    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

/**
 * Example 4: Get invoices for a date range
 */
export async function exampleGetInvoices() {
  try {
    const config = createConfig('demo');
    const client = new PowerOfficeClient(config);

    // Get invoices from last 30 days
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const invoices = await client.getOutgoingInvoices({
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0],
      page: 1,
      pageSize: 50
    });

    console.log('Invoices:', invoices);
    return invoices;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
}

/**
 * Example 5: Get time tracking entries
 */
export async function exampleGetTimeTracking() {
  try {
    const config = createConfig('demo');
    const client = new PowerOfficeClient(config);

    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7); // Last 7 days

    const entries = await client.getTimeTrackingEntries({
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0]
    });

    console.log('Time tracking entries:', entries);
    return entries;
  } catch (error) {
    console.error('Error fetching time tracking:', error);
    throw error;
  }
}

/**
 * Example 6: Check authentication status
 */
export async function exampleCheckAuth() {
  try {
    const config = createConfig('demo');
    const client = new PowerOfficeClient(config);

    // Force token refresh to test authentication
    await client.refreshToken();
    
    const authInfo = client.getAuthInfo();
    console.log('Authentication info:', authInfo);
    console.log('Token is valid:', authInfo.isValid);
    console.log('Token expires at:', authInfo.expiresAt);

    return authInfo;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

/**
 * Example 7: Get products
 */
export async function exampleGetProducts() {
  try {
    const config = createConfig('demo');
    const client = new PowerOfficeClient(config);

    const products = await client.getProducts({ page: 1, pageSize: 50 });
    console.log('Products:', products);

    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

/**
 * Example 8: Get projects
 */
export async function exampleGetProjects() {
  try {
    const config = createConfig('demo');
    const client = new PowerOfficeClient(config);

    const projects = await client.getProjects({ page: 1, pageSize: 50 });
    console.log('Projects:', projects);

    return projects;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}

/**
 * Example 9: Get employees
 */
export async function exampleGetEmployees() {
  try {
    const config = createConfig('demo');
    const client = new PowerOfficeClient(config);

    const employees = await client.getEmployees();
    console.log('Employees:', employees);

    return employees;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}
