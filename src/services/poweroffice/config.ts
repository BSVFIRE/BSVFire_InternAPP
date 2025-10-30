/**
 * PowerOffice Go API Configuration
 * 
 * Store your credentials in environment variables for security:
 * - POWEROFFICE_APPLICATION_KEY
 * - POWEROFFICE_CLIENT_KEY
 * - POWEROFFICE_SUBSCRIPTION_KEY
 */

export interface PowerOfficeConfig {
  applicationKey: string;
  clientKey: string;
  subscriptionKey: string;
  environment: 'demo' | 'production';
}

export interface PowerOfficeUrls {
  tokenUrl: string;
  apiBaseUrl: string;
}

/**
 * Get URLs based on environment
 */
export function getUrls(environment: 'demo' | 'production'): PowerOfficeUrls {
  if (environment === 'demo') {
    return {
      tokenUrl: 'https://goapi.poweroffice.net/Demo/OAuth/Token',
      apiBaseUrl: 'https://goapi.poweroffice.net/Demo/v2'
    };
  }
  
  return {
    tokenUrl: 'https://goapi.poweroffice.net/OAuth/Token',
    apiBaseUrl: 'https://goapi.poweroffice.net/v2'
  };
}

/**
 * Create configuration from environment variables
 */
export function createConfig(environment: 'demo' | 'production' = 'demo'): PowerOfficeConfig {
  const applicationKey = import.meta.env.VITE_POWEROFFICE_APPLICATION_KEY || '';
  const clientKey = import.meta.env.VITE_POWEROFFICE_CLIENT_KEY || '';
  const subscriptionKey = import.meta.env.VITE_POWEROFFICE_SUBSCRIPTION_KEY || '';

  if (!applicationKey || !clientKey || !subscriptionKey) {
    throw new Error(
      'Missing PowerOffice credentials. Please set VITE_POWEROFFICE_APPLICATION_KEY, ' +
      'VITE_POWEROFFICE_CLIENT_KEY, and VITE_POWEROFFICE_SUBSCRIPTION_KEY in your .env file'
    );
  }

  return {
    applicationKey,
    clientKey,
    subscriptionKey,
    environment
  };
}
