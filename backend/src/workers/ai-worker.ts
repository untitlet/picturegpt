import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '../database';
import { env } from '../config/env';
import { openRouterAdapter } from '../adapters/openrouter';
import { bitrixService } from '../adapters/bitrix';
import pino from 'pino';
import { S3Service } from '../services/s3';
import { metrics } from '../utils/metrics';

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

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Initialize S3 Service
const s3Service = new S3Service({
  endpoint: env.S3_ENDPOINT,
  accessKeyId: env.S3_ACCESS_KEY,
  secretAccessKey: env.S3_SECRET_KEY,
  bucket: env.S3_BUCKET,
});

const concurrency = env.WORKER_CONCURRENCY || 2;

// Generation worker
const generateWorker = new Worker(
  'ai:generate',
  async (job: Job) => {
    const { jobId, userId, request } = job.data;
    const startTime = Date.now();
    
    logger.info(`Processing generation job ${jobId}`);
    metrics.activeJobs.inc({ model: request.model });

    try {
      // Update job status to processing
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { status: 'processing' },
      });

      // Call OpenRouter API
      const imageUrl = await openRouterAdapter.generateImage(
        request.prompt,
        request.model,
        request.width,
        request.height,
        request.negativePrompt,
        request.inputImageUrl
      );

      // Save image to S3
      let s3Url: string;
      
      if (imageUrl.startsWith('http')) {
        // Download and upload to S3
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const key = s3Service.generateKey(`${jobId}.png`, 'generations');
        s3Url = await s3Service.uploadBuffer(key, buffer, 'image/png');
      } else {
        // It's base64, decode and upload
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const key = s3Service.generateKey(`${jobId}.png`, 'generations');
        s3Url = await s3Service.uploadBuffer(key, buffer, 'image/png');
      }

      const duration = (Date.now() - startTime) / 1000;
      metrics.jobDuration.observe({ model: request.model, type: 'generation' }, duration);
      metrics.jobsProcessed.inc({ status: 'completed', model: request.model });
      metrics.s3Uploads.inc({ status: 'success' });

      // Update job with result
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          outputImageUrls: [s3Url],
          completedAt: new Date(),
        },
      });

      logger.info(`Generation job ${jobId} completed successfully in ${duration}s`);
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error(`Generation job ${jobId} failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      
      metrics.jobsFailed.inc({ error_type: errorType, model: request.model });
      metrics.jobDuration.observe({ model: request.model, type: 'generation' }, duration);

      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage,
          completedAt: new Date(),
        },
      });

      throw error; // Re-throw for BullMQ retry logic
    } finally {
      metrics.activeJobs.dec({ model: request.model });
    }
  },
  {
    connection,
    concurrency,
  }
);

// Analysis worker (image-to-prompt)
const analyzeWorker = new Worker(
  'ai:analyze',
  async (job: Job) => {
    const { jobId, imageUrl, presetId } = job.data;
    const startTime = Date.now();
    
    logger.info(`Processing analysis job ${jobId}`);

    try {
      const result = await openRouterAdapter.imageToPrompt(imageUrl);

      if (presetId) {
        await prisma.preset.update({
          where: { id: presetId },
          data: {
            basePrompt: result.basePrompt,
            systemPrompt: result.systemPrompt,
          },
        });
      } else {
        // Create new preset
        await prisma.preset.create({
          data: {
            name: `Preset ${new Date().toISOString()}`,
            basePrompt: result.basePrompt,
            systemPrompt: result.systemPrompt,
            referenceImageUrl: imageUrl,
            aiModelPreset: 'default',
          },
        });
      }

      const duration = (Date.now() - startTime) / 1000;
      metrics.jobDuration.observe({ model: 'analysis', type: 'image-to-prompt' }, duration);
      metrics.jobsProcessed.inc({ status: 'completed', model: 'analysis' });

      logger.info(`Analysis job ${jobId} completed successfully in ${duration}s`);
    } catch (error) {
      logger.error(`Analysis job ${jobId} failed:`, error);
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      metrics.jobsFailed.inc({ error_type: errorType, model: 'analysis' });
      throw error;
    }
  },
  {
    connection,
    concurrency,
  }
);

// Edit worker
const editWorker = new Worker(
  'ai:edit',
  async (job: Job) => {
    const { jobId, userId, imageUrl, prompt, model } = job.data;
    const startTime = Date.now();
    
    logger.info(`Processing edit job ${jobId}`);
    metrics.activeJobs.inc({ model: model || 'edit' });

    try {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { status: 'processing' },
      });

      const outputUrl = await openRouterAdapter.editImage(imageUrl, prompt, model);

      // Save image to S3
      let s3Url: string;
      
      if (outputUrl.startsWith('http')) {
        const response = await fetch(outputUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const key = s3Service.generateKey(`${jobId}_edit.png`, 'edits');
        s3Url = await s3Service.uploadBuffer(key, buffer, 'image/png');
      } else {
        const base64Data = outputUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const key = s3Service.generateKey(`${jobId}_edit.png`, 'edits');
        s3Url = await s3Service.uploadBuffer(key, buffer, 'image/png');
      }

      const duration = (Date.now() - startTime) / 1000;
      metrics.jobDuration.observe({ model: model || 'edit', type: 'edit' }, duration);
      metrics.jobsProcessed.inc({ status: 'completed', model: model || 'edit' });
      metrics.s3Uploads.inc({ status: 'success' });

      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          outputImageUrls: [s3Url],
          completedAt: new Date(),
        },
      });

      logger.info(`Edit job ${jobId} completed successfully in ${duration}s`);
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error(`Edit job ${jobId} failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      
      metrics.jobsFailed.inc({ error_type: errorType, model: model || 'edit' });
      metrics.jobDuration.observe({ model: model || 'edit', type: 'edit' }, duration);

      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage,
          completedAt: new Date(),
        },
      });

      throw error;
    } finally {
      metrics.activeJobs.dec({ model: model || 'edit' });
    }
  },
  {
    connection,
    concurrency,
  }
);

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down workers...');
  await Promise.all([
    generateWorker.close(),
    analyzeWorker.close(),
    editWorker.close(),
  ]);
  await prisma.$disconnect();
  logger.info('Workers shut down gracefully');
  process.exit(0);
});

logger.info('AI Worker started successfully with S3 storage');
