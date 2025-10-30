/**
 * PowerOffice OAuth Authentication Client
 * Implements OAuth 2.0 Client Credentials Grant flow
 */

import { PowerOfficeConfig, getUrls } from './config';

export interface AccessToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * PowerOffice Authentication Manager
 * Handles OAuth token retrieval and caching
 */
export class PowerOfficeAuth {
  private config: PowerOfficeConfig;
  private cachedToken: AccessToken | null = null;

  constructor(config: PowerOfficeConfig) {
    this.config = config;
  }

  /**
   * Get a valid access token (retrieves new one if expired)
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 1 minute buffer)
    if (this.cachedToken && this.isTokenValid(this.cachedToken)) {
      return this.cachedToken.accessToken;
    }

    // Request new token
    const token = await this.requestAccessToken();
    this.cachedToken = token;
    return token.accessToken;
  }

  /**
   * Force refresh of access token
   */
  async refreshAccessToken(): Promise<string> {
    const token = await this.requestAccessToken();
    this.cachedToken = token;
    return token.accessToken;
  }

  /**
   * Clear cached token
   */
  clearToken(): void {
    this.cachedToken = null;
  }

  /**
   * Check if token is still valid (with 1 minute buffer)
   */
  private isTokenValid(token: AccessToken): boolean {
    const now = new Date();
    const bufferMs = 60 * 1000; // 1 minute buffer
    return token.expiresAt.getTime() - now.getTime() > bufferMs;
  }

  /**
   * Request new access token from PowerOffice
   */
  private async requestAccessToken(): Promise<AccessToken> {
    const urls = getUrls(this.config.environment);
    
    // Create Basic Auth header: Base64(applicationKey:clientKey)
    const credentials = `${this.config.applicationKey}:${this.config.clientKey}`;
    const base64Credentials = btoa(credentials);

    const response = await fetch(urls.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64Credentials}`,
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to obtain access token: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const data: TokenResponse = await response.json();

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      expiresAt
    };
  }

  /**
   * Get current token info (for debugging)
   */
  getTokenInfo(): { isValid: boolean; expiresAt: Date | null } {
    if (!this.cachedToken) {
      return { isValid: false, expiresAt: null };
    }

    return {
      isValid: this.isTokenValid(this.cachedToken),
      expiresAt: this.cachedToken.expiresAt
    };
  }
}
