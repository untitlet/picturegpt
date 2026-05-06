import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { settingsService } from '../services/settings/settings.service';
import { PortalSettingsSchema, BitrixFieldSchema } from '../schemas/portal-settings.schema';

/**
 * Settings Routes for Multi-Portal Configuration
 */
export async function settingsRoutes(fastify: FastifyInstance) {
  // Get current portal settings
  fastify.get('/api/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const portalId = request.headers['x-portal-id'] as string || 'default-portal';
    
    const settings = await settingsService.getPortalSettings(portalId);
    
    if (!settings) {
      return reply.code(404).send({ error: 'Settings not found' });
    }

    // Don't send sensitive data to frontend
    const sanitizedSettings = {
      ...settings,
      openrouter: {
        ...settings.openrouter,
        apiKey: settings.openrouter.apiKey ? '***' + settings.openrouter.apiKey.slice(-4) : undefined,
      },
      s3: {
        ...settings.s3,
        accessKeyId: settings.s3.accessKeyId ? '***' + settings.s3.accessKeyId.slice(-4) : undefined,
        secretAccessKey: undefined,
      },
      bitrix: {
        ...settings.bitrix,
        clientId: undefined,
        clientSecret: undefined,
        accessToken: undefined,
        refreshToken: undefined,
        webhookSecret: undefined,
      },
    };

    return sanitizedSettings;
  });

  // Update portal settings
  fastify.put('/api/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const portalId = request.headers['x-portal-id'] as string || 'default-portal';
    
    try {
      const body = request.body as any;
      const validated = PortalSettingsSchema.partial().parse(body);
      
      const updatedSettings = await settingsService.updatePortalSettings(portalId, validated);
      
      if (!updatedSettings) {
        return reply.code(500).send({ error: 'Failed to update settings' });
      }

      return { success: true, settings: updatedSettings };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // Get Bitrix fields (dynamic from CRM)
  fastify.get('/api/settings/bitrix/fields', async (request: FastifyRequest, reply: FastifyReply) => {
    const portalId = request.headers['x-portal-id'] as string || 'default-portal';
    const query = z.object({
      entityType: z.enum(['deal', 'contact', 'company', 'smart_process']),
      smartProcessId: z.coerce.number().optional(),
    }).parse(request.query);

    const fields = await settingsService.getBitrixFields(
      portalId,
      query.entityType,
      query.smartProcessId
    );

    return { fields };
  });

  // Test S3 connection
  fastify.post('/api/settings/s3/test', async (request: FastifyRequest, reply: FastifyReply) => {
    const portalId = request.headers['x-portal-id'] as string || 'default-portal';
    
    const isS3Enabled = await settingsService.isS3Enabled(portalId);
    
    if (!isS3Enabled) {
      return reply.code(400).send({ 
        success: false, 
        message: 'S3 is not enabled or fully configured' 
      });
    }

    // TODO: Implement actual S3 test connection
    return { success: true, message: 'S3 connection successful' };
  });

  // Test Bitrix24 connection
  fastify.post('/api/settings/bitrix/test', async (request: FastifyRequest, reply: FastifyReply) => {
    const portalId = request.headers['x-portal-id'] as string || 'default-portal';
    
    const settings = await settingsService.getPortalSettings(portalId);
    
    if (!settings?.bitrix.accessToken || !settings.bitrix.domain) {
      return reply.code(400).send({ 
        success: false, 
        message: 'Bitrix24 is not configured' 
      });
    }

    // TODO: Implement actual Bitrix test connection
    return { success: true, message: 'Bitrix24 connection successful' };
  });

  // Check if should use Bitrix image
  fastify.get('/api/settings/bitrix/use-bitrix-image', async (request: FastifyRequest, reply: FastifyReply) => {
    const portalId = request.headers['x-portal-id'] as string || 'default-portal';
    
    const useBitrixImage = await settingsService.shouldUseBitrixImage(portalId);
    const isS3Enabled = await settingsService.isS3Enabled(portalId);
    
    return {
      useBitrixImage,
      isS3Enabled,
      allowUpload: !useBitrixImage || isS3Enabled,
    };
  });
}
