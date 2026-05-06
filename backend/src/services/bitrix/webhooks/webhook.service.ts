import { FastifyInstance } from 'fastify';

export interface BitrixWebhookPayload {
  EVENT: string;
  DATA: {
    ID: number;
    FIELDS?: Record<string, any>;
    [key: string]: any;
  };
  AUTH?: {
    APPLICATION_ID: number;
    USER_ID: number;
  };
}

export class BitrixWebhookService {
  private app: FastifyInstance;
  private webhookSecret: string;

  constructor(app: FastifyInstance, webhookSecret: string) {
    this.app = app;
    this.webhookSecret = webhookSecret;
  }

  /**
   * Register webhook endpoint for Bitrix24 events
   */
  registerWebhookEndpoint() {
    this.app.post(
      '/api/bitrix/webhook',
      {
        config: {
          rawBody: true, // Need raw body for signature verification
        },
      },
      async (request, reply) => {
        try {
          const payload = request.body as BitrixWebhookPayload;
          
          // Verify webhook signature (if provided by Bitrix)
          // Note: Bitrix doesn't always send signatures, so this is optional
          const signature = request.headers['x-bitrix-signature'] as string;
          if (signature && !this.verifySignature(payload, signature)) {
            return reply.code(401).send({ error: 'Invalid signature' });
          }

          // Handle different event types
          await this.handleWebhookEvent(payload);

          return reply.send({ success: true });
        } catch (error: any) {
          this.app.log.error({ error }, 'Webhook processing failed');
          return reply.code(500).send({ error: 'Internal server error' });
        }
      }
    );
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(payload: any, signature: string): boolean {
    // Implement signature verification based on Bitrix documentation
    // This is a placeholder - actual implementation depends on Bitrix's signature format
    return true;
  }

  /**
   * Handle incoming webhook events
   */
  private async handleWebhookEvent(payload: BitrixWebhookPayload) {
    const { EVENT, DATA } = payload;

    this.app.log.info({ event: EVENT, data: DATA }, 'Received Bitrix webhook');

    switch (EVENT) {
      case 'ON_CRMD_ENTITY_ADD':
      case 'ON_CRMD_ENTITY_UPDATE':
      case 'ON_CRMD_ENTITY_DELETE':
        await this.handleCrmEntityEvent(EVENT, DATA);
        break;

      case 'ON_DISK_DOCUMENT_UPDATED':
        await this.handleDiskEvent(EVENT, DATA);
        break;

      default:
        this.app.log.warn({ event: EVENT }, 'Unhandled webhook event');
    }
  }

  /**
   * Handle CRM entity events (Deal, Contact, Company, Smart Process)
   */
  private async handleCrmEntityEvent(event: string, data: any) {
    const entityType = data.ENTITY_TYPE_ID || 'unknown';
    const entityId = data.ID;

    this.app.log.info(
      { event, entityType, entityId },
      'CRM entity changed'
    );

    // Sync with local database
    // Fetch updated entity data from Bitrix
    // Update local cache or trigger re-generation if needed
    
    try {
      // Pseudo-code - implement with your Bitrix service
      // const bitrixService = this.app.bitrixService;
      // const entityData = await bitrixService.getEntity(entityType, entityId);
      
      // Update bx_entity_mapping last_sync_at
      // await this.app.prisma.bxEntityMapping.update({...})
      
      this.app.log.info(
        { entityType, entityId },
        'Successfully synced CRM entity'
      );
    } catch (error: any) {
      this.app.log.error(
        { error, entityType, entityId },
        'Failed to sync CRM entity'
      );
    }
  }

  /**
   * Handle Bitrix Disk events
   */
  private async handleDiskEvent(event: string, data: any) {
    this.app.log.info({ event, data }, 'Disk event received');
    
    // Handle file updates, deletions, etc.
    // Update local S3 references if needed
  }

  /**
   * Register webhook in Bitrix24
   */
  async registerInBitrix(bitrixDomain: string, webhookUrl: string) {
    const response = await fetch(
      `https://${bitrixDomain}/rest/placement.bind`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          PLACEMENT: 'ON_CRMD_ENTITY_ADD',
          HANDLER: webhookUrl,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to register webhook in Bitrix24');
    }

    return response.json();
  }
}
