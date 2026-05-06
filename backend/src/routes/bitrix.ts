import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import prisma from '../database';
import { CreateBxMappingSchema } from '../types/schemas';
import { bitrixService } from '../adapters/bitrix';

export async function bitrixRoutes(fastify: FastifyInstance): Promise<void> {
  // Get OAuth URL
  fastify.get('/bitrix/oauth-url', async (request, reply) => {
    const url = bitrixService.getAuthUrl();
    return reply.send({ url });
  });

  // Handle OAuth callback
  fastify.get('/bitrix/callback', async (request: FastifyRequest<{ Querystring: { code: string; domain?: string } }>, reply) => {
    const { code, domain } = request.query;

    if (!code) {
      return reply.code(400).send({ error: 'Authorization code is required' });
    }

    try {
      const tokenData = await bitrixService.exchangeCode(code);

      // Store tokens in database (encrypted)
      await prisma.bitrixToken.upsert({
        where: { domain: tokenData.domain },
        create: {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          expiresAt: tokenData.expiresAt,
          domain: tokenData.domain,
          memberId: tokenData.memberId,
        },
        update: {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          expiresAt: tokenData.expiresAt,
          memberId: tokenData.memberId,
        },
      });

      return reply.redirect('/settings?bitrix=connected');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect Bitrix24';
      return reply.redirect(`/settings?bitrix=error&message=${encodeURIComponent(message)}`);
    }
  });

  // Get connection status
  fastify.get('/bitrix/status', async (request, reply) => {
    const tokens = await prisma.bitrixToken.findMany({
      select: {
        domain: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const connections = tokens.map(token => ({
      domain: token.domain,
      connected: token.expiresAt > new Date(),
      expiresAt: token.expiresAt,
    }));

    return reply.send({ connections });
  });

  // Disconnect Bitrix24
  fastify.delete('/bitrix/:domain', async (request: FastifyRequest<{ Params: { domain: string } }>, reply) => {
    const { domain } = request.params;

    await prisma.bitrixToken.delete({
      where: { domain },
    });

    return reply.code(204).send();
  });

  // Get CRM entity fields
  fastify.get('/bitrix/:domain/crm/:entityType/fields', async (request: FastifyRequest<{ Params: { domain: string; entityType: string } }>, reply) => {
    const { domain, entityType } = request.params;

    const token = await prisma.bitrixToken.findUnique({
      where: { domain },
    });

    if (!token || token.expiresAt < new Date()) {
      return reply.code(401).send({ error: 'Not connected or token expired' });
    }

    try {
      const fields = await bitrixService.getCrmFields(domain, token.accessToken, entityType);

      // Filter and format fields
      const formattedFields = fields
        .filter(field => 
          field.field_type === 'file' || 
          field.field_type === 'string' || 
          field.field_type === 'enumeration' ||
          field.field_name.startsWith('UF_')
        )
        .map(field => ({
          code: field.field_name,
          title: field.field_title,
          type: field.field_type === 'file' ? 'file' : 
                 field.field_type === 'enumeration' ? 'multiple' : 'string',
          isUf: field.field_name.startsWith('UF_'),
        }));

      return reply.send({ fields: formattedFields });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch fields';
      return reply.code(500).send({ error: message });
    }
  });

  // Create entity mapping
  fastify.post('/bitrix/mappings', async (request: FastifyRequest<{ Body: z.infer<typeof CreateBxMappingSchema> }>, reply) => {
    const validated = CreateBxMappingSchema.parse(request.body);

    const mapping = await prisma.bxEntityMapping.create({
      data: validated,
    });

    return reply.code(201).send(mapping);
  });

  // Get entity mappings
  fastify.get('/bitrix/mappings', async (request: FastifyRequest<{ Querystring: { entityType?: string; entityId?: string } }>, reply) => {
    const { entityType, entityId } = request.query;

    const where: Record<string, unknown> = {};
    if (entityType) {
      where.entityType = entityType;
    }
    if (entityId) {
      where.entityId = parseInt(entityId, 10);
    }

    const mappings = await prisma.bxEntityMapping.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(mappings);
  });

  // Delete mapping
  fastify.delete('/bitrix/mappings/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = request.params;

    await prisma.bxEntityMapping.delete({
      where: { id },
    });

    return reply.code(204).send();
  });

  // Test connection
  fastify.post('/bitrix/:domain/test', async (request: FastifyRequest<{ Params: { domain: string }; Body: { entityType: string; entityId: number } }>, reply) => {
    const { domain } = request.params;
    const { entityType, entityId } = request.body;

    const token = await prisma.bitrixToken.findUnique({
      where: { domain },
    });

    if (!token || token.expiresAt < new Date()) {
      return reply.code(401).send({ error: 'Not connected or token expired' });
    }

    try {
      const entity = await bitrixService.getCrmEntity(domain, token.accessToken, entityType, entityId);
      
      return reply.send({
        success: true,
        entity: {
          id: entityId,
          type: entityType,
          title: (entity as Record<string, unknown>).TITLE || (entity as Record<string, unknown>).NAME || 'Untitled',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to test connection';
      return reply.code(500).send({ error: message, success: false });
    }
  });
}
