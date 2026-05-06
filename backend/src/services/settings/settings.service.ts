import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../encryption/encryption.service';
import { PortalSettings, PortalSettingsSchema, UpdatePortalSettingsSchema } from '../../schemas/portal-settings.schema';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * Settings Service for Multi-Portal Configuration
 * Handles encrypted storage and retrieval of sensitive settings
 */
export class SettingsService {
  private encryptionService: EncryptionService;

  constructor() {
    this.encryptionService = new EncryptionService();
  }

  /**
   * Get settings for a specific portal
   */
  async getPortalSettings(portalId: string = 'default-portal'): Promise<PortalSettings | null> {
    try {
      const settingsKeys = [
        'openrouter',
        's3',
        'bitrix',
        'output',
        'session',
        'security'
      ];

      const settings: Record<string, any> = {};

      for (const key of settingsKeys) {
        const setting = await prisma.appSettings.findUnique({
          where: {
            portalId_key: {
              portalId,
              key: `${portalId}:${key}`
            }
          }
        });

        if (setting) {
          // Decrypt sensitive values
          const decryptedValue = await this.decryptValue(setting.value);
          settings[key] = decryptedValue;
        }
      }

      // If no settings found, return defaults
      if (Object.keys(settings).length === 0) {
        return this.getDefaultSettings();
      }

      // Validate and return
      const result = PortalSettingsSchema.safeParse(settings);
      if (!result.success) {
        logger.warn(`Invalid settings for portal ${portalId}:`, result.error);
        return this.getDefaultSettings();
      }

      return result.data;
    } catch (error) {
      logger.error(`Error getting portal settings: ${error}`);
      return null;
    }
  }

  /**
   * Update settings for a specific portal
   */
  async updatePortalSettings(
    portalId: string,
    updates: UpdatePortalSettingsSchema
  ): Promise<PortalSettings | null> {
    try {
      const currentSettings = await this.getPortalSettings(portalId) || this.getDefaultSettings();
      
      // Merge with current settings
      const mergedSettings = {
        ...currentSettings,
        ...updates,
        openrouter: { ...currentSettings.openrouter, ...updates.openrouter },
        s3: { ...currentSettings.s3, ...updates.s3 },
        bitrix: { ...currentSettings.bitrix, ...updates.bitrix },
        output: { ...currentSettings.output, ...updates.output },
        session: { ...currentSettings.session, ...updates.session },
        security: { ...currentSettings.security, ...updates.security },
      };

      // Validate merged settings
      const validatedSettings = PortalSettingsSchema.parse(mergedSettings);

      // Save each section separately with encryption
      const settingsSections = ['openrouter', 's3', 'bitrix', 'output', 'session', 'security'] as const;
      
      for (const section of settingsSections) {
        const encryptedValue = await this.encryptValue(validatedSettings[section]);
        
        await prisma.appSettings.upsert({
          where: {
            portalId_key: {
              portalId,
              key: `${portalId}:${section}`
            }
          },
          update: {
            value: encryptedValue,
            updatedAt: new Date()
          },
          create: {
            portalId,
            key: `${portalId}:${section}`,
            value: encryptedValue
          }
        });
      }

      return validatedSettings;
    } catch (error) {
      logger.error(`Error updating portal settings: ${error}`);
      return null;
    }
  }

  /**
   * Get Bitrix fields for entity type (dynamic from CRM)
   */
  async getBitrixFields(
    portalId: string,
    entityType: string,
    smartProcessId?: number
  ): Promise<Array<{ code: string; name: string; type: string; isMultiple: boolean }>> {
    try {
      const settings = await this.getPortalSettings(portalId);
      
      if (!settings?.bitrix.accessToken || !settings.bitrix.domain) {
        return [];
      }

      // Call Bitrix24 API to get fields
      const fields = await this.fetchBitrixFields(
        settings.bitrix.domain,
        settings.bitrix.accessToken,
        entityType,
        smartProcessId
      );

      return fields;
    } catch (error) {
      logger.error(`Error getting Bitrix fields: ${error}`);
      return [];
    }
  }

  /**
   * Check if S3 is enabled and configured
   */
  async isS3Enabled(portalId: string): Promise<boolean> {
    const settings = await this.getPortalSettings(portalId);
    return settings?.s3.enabled === true && 
           !!settings.s3.accessKeyId && 
           !!settings.s3.secretAccessKey &&
           !!settings.s3.endpoint;
  }

  /**
   * Check if should use Bitrix image field
   */
  async shouldUseBitrixImage(portalId: string): Promise<boolean> {
    const settings = await this.getPortalSettings(portalId);
    return settings?.bitrix.useBitrixImage === true && 
           !!settings.bitrix.imageFieldCode &&
           !!settings.bitrix.accessToken;
  }

  /**
   * Get default settings template
   */
  getDefaultSettings(): PortalSettings {
    return PortalSettingsSchema.parse({
      openrouter: {
        apiKey: '',
        moderationEnabled: false,
        abTestEnabled: false,
      },
      s3: {
        enabled: false,
        bucketName: 'bx-images',
        usePresignedUrls: true,
      },
      bitrix: {
        useBitrixImage: false,
        webhookEnabled: false,
      },
      output: {
        defaultWidth: 1024,
        defaultHeight: 1024,
        customSizes: [],
        defaultMargins: { top: 0, right: 0, bottom: 0, left: 0 },
        defaultQuality: 7,
        defaultSteps: 30,
        defaultCfgScale: 7,
      },
      session: {
        persistImages: false,
        autoSaveToBitrix: false,
        cacheDuration: 3600,
      },
      security: {
        rbacEnabled: false,
        allowedRoles: ['admin', 'manager', 'viewer'],
        rateLimitEnabled: true,
        rateLimitMax: 100,
        rateLimitWindowMs: 60000,
      },
    });
  }

  /**
   * Encrypt sensitive values before storing
   */
  private async encryptValue(value: any): Promise<any> {
    const stringValue = JSON.stringify(value);
    const encrypted = await this.encryptionService.encrypt(stringValue);
    return { encrypted };
  }

  /**
   * Decrypt values after retrieving
   */
  private async decryptValue(storedValue: any): Promise<any> {
    if (!storedValue?.encrypted) {
      return storedValue;
    }
    
    const decrypted = await this.encryptionService.decrypt(storedValue.encrypted);
    return JSON.parse(decrypted);
  }

  /**
   * Fetch fields from Bitrix24 API
   */
  private async fetchBitrixFields(
    domain: string,
    accessToken: string,
    entityType: string,
    smartProcessId?: number
  ): Promise<Array<{ code: string; name: string; type: string; isMultiple: boolean }>> {
    // Implementation calls Bitrix24 REST API
    // crm.deal.fields, crm.contact.fields, or crm.type.fields for smart processes
    const url = smartProcessId
      ? `${domain}/rest/crm.type.fields/${smartProcessId}`
      : `${domain}/rest/crm.${entityType}.fields`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth: accessToken,
      }),
    });

    const data = await response.json();
    
    if (!data.result) {
      return [];
    }

    // Filter and map fields
    return Object.values(data.result)
      .filter((field: any) => field.type === 'file' || field.type === 'multiple_file')
      .map((field: any) => ({
        code: field.fieldName || field.id,
        name: field.title || field.fieldName,
        type: field.type,
        isMultiple: field.multiple === 'Y' || field.type === 'multiple_file',
      }));
  }
}

export const settingsService = new SettingsService();
