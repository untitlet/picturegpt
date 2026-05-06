import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const SmartProcessSchema = z.object({
  typeId: z.number(),
  fields: z.record(z.any()),
});

export class BitrixSmartProcessService {
  private app: FastifyInstance;
  private bitrixToken: string;
  private bitrixDomain: string;

  constructor(
    app: FastifyInstance,
    bitrixToken: string,
    bitrixDomain: string
  ) {
    this.app = app;
    this.bitrixToken = bitrixToken;
    this.bitrixDomain = bitrixDomain;
  }

  /**
   * Get all smart process types
   */
  async getSmartProcessTypes(): Promise<
    Array<{
      ID: number;
      NAME: string;
      REST_API_NAME: string;
    }>
  > {
    const response = await fetch(
      `https://${this.bitrixDomain}/rest/crm.type.smartprocess.list`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth: this.bitrixToken,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch smart process types');
    }

    const data = await response.json();
    return data.result || [];
  }

  /**
   * Get fields for a specific smart process
   */
  async getSmartProcessFields(typeId: number): Promise<
    Array<{
      FIELD_NAME: string;
      FIELD_TYPE: string;
      IS_CUSTOM_FIELD: boolean;
      [key: string]: any;
    }>
  > {
    const response = await fetch(
      `https://${this.bitrixDomain}/rest/crm.type.smartprocess.fields`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth: this.bitrixToken,
          TYPE_ID: typeId,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch smart process fields');
    }

    const data = await response.json();
    return data.result || [];
  }

  /**
   * Create or update smart process instance
   */
  async upsertSmartProcess(
    typeId: number,
    fields: Record<string, any>,
    id?: number
  ): Promise<number> {
    const endpoint = id
      ? `crm.type.smartprocess.update`
      : `crm.type.smartprocess.add`;

    const body: Record<string, any> = {
      auth: this.bitrixToken,
      fields: {
        ...fields,
        TYPE_ID: typeId,
      },
    };

    if (id) {
      body.id = id;
    }

    const response = await fetch(
      `https://${this.bitrixDomain}/rest/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upsert smart process: ${error}`);
    }

    const data = await response.json();
    return data.result || id!;
  }

  /**
   * Upload file to Bitrix Disk and attach to smart process
   */
  async uploadFileToSmartProcess(
    typeId: number,
    entityId: number,
    fileFieldCode: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string = 'image/png'
  ): Promise<number> {
    // Step 1: Upload file to Disk
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, fileName);

    const diskResponse = await fetch(
      `https://${this.bitrixDomain}/rest/disk.file.upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.bitrixToken}`,
        },
        body: formData,
      }
    );

    if (!diskResponse.ok) {
      throw new Error('Failed to upload file to Disk');
    }

    const diskData = await diskResponse.json();
    const fileId = diskData.result.ID;

    // Step 2: Attach file to smart process
    const updateFields: Record<string, any> = {};
    
    // Check if field is multiple
    const fields = await this.getSmartProcessFields(typeId);
    const fieldInfo = fields.find((f) => f.FIELD_NAME === fileFieldCode);
    const isMultiple = fieldInfo?.MULTIPLE === 'Y';

    if (isMultiple) {
      // Get existing files and append new one
      const existingFiles = await this.getSmartProcess(entityId, typeId);
      const currentFiles = existingFields[fileFieldCode] || [];
      updateFields[fileFieldCode] = [...currentFiles, fileId];
    } else {
      updateFields[fileFieldCode] = fileId;
    }

    await this.upsertSmartProcess(typeId, updateFields, entityId);

    return fileId;
  }

  /**
   * Get smart process entity by ID
   */
  async getSmartProcess(
    entityId: number,
    typeId: number
  ): Promise<Record<string, any>> {
    const response = await fetch(
      `https://${this.bitrixDomain}/rest/crm.type.smartprocess.get`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth: this.bitrixToken,
          id: entityId,
          TYPE_ID: typeId,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch smart process');
    }

    const data = await response.json();
    return data.result || {};
  }

  /**
   * Register API routes for smart processes
   */
  static registerRoutes(app: FastifyInstance, service: BitrixSmartProcessService) {
    // Get all smart process types
    app.get('/api/bitrix/smart-processes', async (request, reply) => {
      try {
        const types = await service.getSmartProcessTypes();
        return reply.send({ success: true, data: types });
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    });

    // Get fields for specific smart process
    app.get(
      '/api/bitrix/smart-processes/:typeId/fields',
      async (request, reply) => {
        try {
          const { typeId } = request.params as { typeId: string };
          const fields = await service.getSmartProcessFields(parseInt(typeId));
          return reply.send({ success: true, data: fields });
        } catch (error: any) {
          return reply.code(500).send({ error: error.message });
        }
      }
    );

    // Update smart process with generated images
    app.post(
      '/api/bitrix/smart-processes/:typeId/:entityId/images',
      async (request, reply) => {
        try {
          const { typeId, entityId } = request.params as {
            typeId: string;
            entityId: string;
          };
          const { fieldCode, imageUrls } = request.body as {
            fieldCode: string;
            imageUrls: string[];
          };

          // Upload each image and collect file IDs
          const fileIds: number[] = [];
          
          for (const imageUrl of imageUrls) {
            // Download image from S3/local storage
            const imageResponse = await fetch(imageUrl);
            const buffer = Buffer.from(await imageResponse.arrayBuffer());
            const contentType = imageResponse.headers.get('content-type') || 'image/png';
            
            const fileId = await service.uploadFileToSmartProcess(
              parseInt(typeId),
              parseInt(entityId),
              fieldCode,
              buffer,
              `generated-${Date.now()}.png`,
              contentType
            );
            
            fileIds.push(fileId);
          }

          return reply.send({
            success: true,
            data: { fileIds },
          });
        } catch (error: any) {
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }
}
