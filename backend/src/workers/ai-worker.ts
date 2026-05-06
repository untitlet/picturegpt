import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import prisma from './database';
import { env } from './config/env';
import { openRouterAdapter } from './adapters/openrouter';
import { bitrixService } from './adapters/bitrix';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import pino from 'pino';

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

// Ensure storage directory exists
if (!existsSync(env.STORAGE_PATH)) {
  mkdirSync(env.STORAGE_PATH, { recursive: true });
}

// Generation worker
const generateWorker = new Worker(
  'ai:generate',
  async (job: Job) => {
    const { jobId, userId, request } = job.data;
    
    logger.info(`Processing generation job ${jobId}`);

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

      // Save image locally or download from URL
      let localUrl: string;
      
      if (imageUrl.startsWith('http')) {
        // Download and save
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const filename = `${jobId}_${Date.now()}.png`;
        const filepath = join(env.STORAGE_PATH, filename);
        writeFileSync(filepath, buffer);
        localUrl = `/storage/${filename}`;
      } else {
        // It's base64, decode and save
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${jobId}_${Date.now()}.png`;
        const filepath = join(env.STORAGE_PATH, filename);
        writeFileSync(filepath, buffer);
        localUrl = `/storage/${filename}`;
      }

      // Update job with result
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          outputImageUrls: [localUrl],
          completedAt: new Date(),
        },
      });

      logger.info(`Generation job ${jobId} completed successfully`);
    } catch (error) {
      logger.error(`Generation job ${jobId} failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage,
          completedAt: new Date(),
        },
      });

      throw error; // Re-throw for BullMQ retry logic
    }
  },
  {
    connection,
    concurrency: 3, // Process 3 jobs concurrently
  }
);

// Analysis worker (image-to-prompt)
const analyzeWorker = new Worker(
  'ai:analyze',
  async (job: Job) => {
    const { jobId, imageUrl, presetId } = job.data;
    
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

      logger.info(`Analysis job ${jobId} completed successfully`);
    } catch (error) {
      logger.error(`Analysis job ${jobId} failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

// Edit worker
const editWorker = new Worker(
  'ai:edit',
  async (job: Job) => {
    const { jobId, userId, imageUrl, prompt, model } = job.data;
    
    logger.info(`Processing edit job ${jobId}`);

    try {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { status: 'processing' },
      });

      const outputUrl = await openRouterAdapter.editImage(imageUrl, prompt, model);

      // Save image locally
      let localUrl: string;
      
      if (outputUrl.startsWith('http')) {
        const response = await fetch(outputUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const filename = `${jobId}_edit_${Date.now()}.png`;
        const filepath = join(env.STORAGE_PATH, filename);
        writeFileSync(filepath, buffer);
        localUrl = `/storage/${filename}`;
      } else {
        const base64Data = outputUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${jobId}_edit_${Date.now()}.png`;
        const filepath = join(env.STORAGE_PATH, filename);
        writeFileSync(filepath, buffer);
        localUrl = `/storage/${filename}`;
      }

      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          outputImageUrls: [localUrl],
          completedAt: new Date(),
        },
      });

      logger.info(`Edit job ${jobId} completed successfully`);
    } catch (error) {
      logger.error(`Edit job ${jobId} failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
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

logger.info('AI Worker started successfully');
