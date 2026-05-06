import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import staticPlugin from '@fastify/static';
import { join } from 'path';
import pino from 'pino';
import fastifyMetrics from 'fastify-metrics';

import { env } from './config/env';
import prisma from './database';
import { S3Service } from './services/s3';
import { EncryptionService } from './services/encryption/encryption.service';
import { OpenRouterAdapter, openRouterAdapter } from './adapters/openrouter';
import { healthRoutes } from './routes/health';
import { presetRoutes } from './routes/presets';
import { generationRoutes } from './routes/generations';
import { bitrixRoutes } from './routes/bitrix';
import { settingsRoutes } from './routes/settings';
import { register } from './utils/metrics';
import { registerRateLimiting } from './middleware/rate-limit.middleware';
import { rbacMiddleware, ROLE_PERMISSIONS } from './middleware/rbac.middleware';
import { ModerationService } from './services/ai/moderation/moderation.service';
import { UpscaleService } from './services/ai/upscale.service';
import { ABTestService } from './services/ai/ab-test.service';
import { BitrixWebhookService } from './services/bitrix/webhooks/webhook.service';
import { BitrixSmartProcessService } from './services/bitrix/smart-process.service';

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

async function buildServer() {
  const server = Fastify({
    logger,
    bodyLimit: 50 * 1024 * 1024, // 50MB limit for file uploads
  });

  // Initialize services
  const s3Service = new S3Service({
    endpoint: env.S3_ENDPOINT,
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
    bucket: env.S3_BUCKET,
  });

  const encryptionService = new EncryptionService(env.ENCRYPTION_KEY || 'default-key-change-me');
  const moderationService = new ModerationService();
  const upscaleService = new UpscaleService(env.OPENROUTER_API_KEY, 'https://openrouter.ai/api/v1');
  const abTestService = new ABTestService(openRouterAdapter);
  const webhookService = new BitrixWebhookService(server, env.WEBHOOK_SECRET || 'webhook-secret');
  
  const bitrixSmartProcessService = env.BITRIX_TOKEN && env.BITRIX_DOMAIN
    ? new BitrixSmartProcessService(server, env.BITRIX_TOKEN, env.BITRIX_DOMAIN)
    : null;

  // Register plugins
  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  await server.register(helmet, {
    contentSecurityPolicy: false, // Configure based on your needs
  });

  // Register rate limiting with custom configuration
  await registerRateLimiting(server);

  // Add Prometheus metrics endpoint
  await server.register(fastifyMetrics, {
    endpoint: '/metrics',
    defaultMetrics: true,
  });

  // Serve static files from storage (fallback for local dev)
  if (env.NODE_ENV !== 'production') {
    await server.register(staticPlugin, {
      root: env.STORAGE_PATH || '/app/storage',
      prefix: '/storage/',
    });
  }

  // Add Prisma and S3 to server instance
  server.decorate('prisma', prisma);
  server.decorate('s3', s3Service);
  server.decorate('encryption', encryptionService);
  server.decorate('moderation', moderationService);

  // Register OpenRouter routes for model listing
  OpenRouterAdapter.registerRoutes(server, openRouterAdapter);

  // Register webhook endpoint for Bitrix24
  webhookService.registerWebhookEndpoint();

  // Register smart process routes if Bitrix is configured
  if (bitrixSmartProcessService) {
    BitrixSmartProcessService.registerRoutes(server, bitrixSmartProcessService);
  }

  // Register upscale route
  UpscaleService.registerRoutes(server, upscaleService);

  // Register A/B test routes
  ABTestService.registerRoutes(server, abTestService);

  // Register routes
  await server.register(healthRoutes, { prefix: '/api' });
  await server.register(presetRoutes, { prefix: '/api' });
  await server.register(generationRoutes, { prefix: '/api' });
  await server.register(bitrixRoutes, { prefix: '/api' });
  await server.register(settingsRoutes, { prefix: '/api' });

  // Global RBAC middleware (can be overridden per route)
  server.addHook('preHandler', async (request, reply) => {
    // Skip auth for public endpoints
    if (request.url.startsWith('/api/health') || request.url.startsWith('/api/openrouter')) {
      return;
    }

    // Extract user from header (in production, use JWT or session)
    const userRole = request.headers['x-user-role'] as string || 'viewer';
    const userId = request.headers['x-user-id'] as string || 'anonymous';
    
    request.user = {
      id: userId,
      role: userRole as 'admin' | 'manager' | 'viewer',
      permissions: ROLE_PERMISSIONS[userRole as 'admin' | 'manager' | 'viewer'] || [],
    };
  });

  // Graceful shutdown
  const onClose = async () => {
    server.log.info('Shutting down gracefully...');
    await prisma.$disconnect();
    server.log.info('Disconnected from database');
  };

  server.addHook('onClose', async (instance, done) => {
    await onClose();
    done();
  });

  return server;
}

export default buildServer;
