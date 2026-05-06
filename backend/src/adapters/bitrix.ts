import { env } from '../config/env';
import CryptoJS from 'crypto-js';

interface BitrixTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  domain: string;
  memberId?: string;
}

export class BitrixService {
  private readonly encryptionKey: string;

  constructor() {
    this.encryptionKey = env.ENCRYPTION_KEY;
  }

  private encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
  }

  private decrypt(ciphertext: string): string {
    const bytes = CryptoJS.AES.decrypt(ciphertext, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  private getBaseUrl(domain: string): string {
    return `https://${domain}/rest`;
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: env.BITRIX24_CLIENT_ID,
      redirect_uri: env.BITRIX24_REDIRECT_URI,
      response_type: 'code',
    });

    return `https://oauth.bitrix.info/oauth/authorize/?${params.toString()}`;
  }

  /**
   * Exchange code for tokens
   */
  async exchangeCode(code: string): Promise<BitrixTokenData> {
    const response = await fetch('https://oauth.bitrix.info/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: env.BITRIX24_CLIENT_ID,
        client_secret: env.BITRIX24_CLIENT_SECRET,
        redirect_uri: env.BITRIX24_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bitrix OAuth error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
      domain: data.domain,
      memberId: data.member_id,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string, domain: string): Promise<BitrixTokenData> {
    const response = await fetch(`https://${domain}/rest/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.BITRIX24_CLIENT_ID,
        client_secret: env.BITRIX24_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bitrix refresh error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
      domain,
      memberId: data.member_id,
    };
  }

  /**
   * Make authenticated API call
   */
  async apiCall(
    domain: string,
    accessToken: string,
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<unknown> {
    const url = `${this.getBaseUrl(domain)}/${method}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        auth: accessToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bitrix API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Bitrix API error: ${data.error_description || data.error}`);
    }

    return data.result;
  }

  /**
   * Get CRM entity fields
   */
  async getCrmFields(
    domain: string,
    accessToken: string,
    entityType: string
  ): Promise<Array<{
    field_name: string;
    field_title: string;
    field_type: string;
  }>> {
    const result = await this.apiCall(domain, accessToken, `crm.${entityType}.fields`) as Array<{
      field_name: string;
      field_title: string;
      field_type: string;
    }> | undefined;

    return result || [];
  }

  /**
   * Upload file to Bitrix Disk
   */
  async uploadFile(
    domain: string,
    accessToken: string,
    fileName: string,
    fileContent: Buffer,
    folderId?: number
  ): Promise<number> {
    // First, get or create folder
    const targetFolderId = folderId || await this.getAppFolderId(domain, accessToken);

    // Upload file
    const formData = new FormData();
    formData.append('name', fileName);
    formData.append('file', new Blob([fileContent]));
    formData.append('folderid', targetFolderId.toString());

    const response = await fetch(`${this.getBaseUrl(domain)}/disk.file.upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bitrix Disk upload error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Bitrix Disk error: ${data.error_description || data.error}`);
    }

    return data.result.id;
  }

  /**
   * Get or create app folder in Bitrix Disk
   */
  private async getAppFolderId(domain: string, accessToken: string): Promise<number> {
    // Try to get root folder
    const folders = await this.apiCall(domain, accessToken, 'disk.folder.get', {
      id: 0,
    }) as { id: number } | undefined;

    if (folders?.id) {
      return folders.id;
    }

    // Create folder if not exists
    const result = await this.apiCall(domain, accessToken, 'disk.folder.add', {
      name: 'AI Generator',
      parentId: 0,
    }) as { id: number } | undefined;

    return result?.id || 0;
  }

  /**
   * Update CRM entity with file IDs
   */
  async updateCrmEntity(
    domain: string,
    accessToken: string,
    entityType: string,
    entityId: number,
    fields: Record<string, unknown>
  ): Promise<void> {
    await this.apiCall(domain, accessToken, `crm.${entityType}.update`, {
      id: entityId,
      fields,
    });
  }

  /**
   * Get CRM entity by ID
   */
  async getCrmEntity(
    domain: string,
    accessToken: string,
    entityType: string,
    entityId: number
  ): Promise<Record<string, unknown>> {
    const result = await this.apiCall(domain, accessToken, `crm.${entityType}.get`, {
      id: entityId,
    }) as Record<string, unknown> | undefined;

    if (!result) {
      throw new Error(`Entity ${entityType}:${entityId} not found`);
    }

    return result;
  }
}

export const bitrixService = new BitrixService();
export default bitrixService;
