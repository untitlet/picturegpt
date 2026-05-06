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
import { healthRoutes } from './routes/health';
import { presetRoutes } from './routes/presets';
import { generationRoutes } from './routes/generations';
import { bitrixRoutes } from './routes/bitrix';
import { settingsRoutes } from './routes/settings';
import { register } from './utils/metrics';

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

  // Initialize S3 Service
  const s3Service = new S3Service({
    endpoint: env.S3_ENDPOINT,
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
    bucket: env.S3_BUCKET,
  });

  // Register plugins
  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  await server.register(helmet, {
    contentSecurityPolicy: false, // Configure based on your needs
  });

  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

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

  // Register routes
  await server.register(healthRoutes, { prefix: '/api' });
  await server.register(presetRoutes, { prefix: '/api' });
  await server.register(generationRoutes, { prefix: '/api' });
  await server.register(bitrixRoutes, { prefix: '/api' });
  await server.register(settingsRoutes, { prefix: '/api' });

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
