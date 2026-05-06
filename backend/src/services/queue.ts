import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import prisma from '../database';
import type { ImageGenerationRequest } from '../types/schemas';

interface GenerationJobData {
  jobId: string;
  userId: string;
  request: ImageGenerationRequest;
}

interface AnalysisJobData {
  jobId: string;
  imageUrl: string;
  presetId?: string;
}

interface EditJobData {
  jobId: string;
  userId: string;
  imageUrl: string;
  prompt: string;
  model: string;
}

// Create Redis connection
const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Queues
export const generateQueue = new Queue<GenerationJobData>('ai:generate', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // keep for 1 hour
    },
    removeOnFail: {
      age: 24 * 3600, // keep for 1 day
    },
  },
});

export const analyzeQueue = new Queue<AnalysisJobData>('ai:analyze', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const editQueue = new Queue<EditJobData>('ai:edit', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Helper functions to add jobs
export async function addGenerationJob(
  userId: string,
  request: ImageGenerationRequest
): Promise<string> {
  const job = await prisma.generationJob.create({
    data: {
      userId,
      presetId: request.inputImageUrl ? undefined : undefined,
      status: 'queued',
      prompt: request.prompt,
      negativePrompt: request.negativePrompt,
      model: request.model,
      width: request.width,
      height: request.height,
      quality: request.quality,
      inputImageUrl: request.inputImageUrl,
    },
  });

  await generateQueue.add('generate', {
    jobId: job.id,
    userId,
    request,
  });

  return job.id;
}

export async function addAnalysisJob(
  imageUrl: string,
  presetId?: string
): Promise<string> {
  const jobId = `analyze_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await analyzeQueue.add('analyze', {
    jobId,
    imageUrl,
    presetId,
  });

  return jobId;
}

export async function addEditJob(
  userId: string,
  imageUrl: string,
  prompt: string,
  model: string
): Promise<string> {
  const job = await prisma.generationJob.create({
    data: {
      userId,
      status: 'queued',
      prompt,
      model,
      width: 1024,
      height: 1024,
      quality: 7,
      inputImageUrl: imageUrl,
    },
  });

  await editQueue.add('edit', {
    jobId: job.id,
    userId,
    imageUrl,
    prompt,
    model,
  });

  return job.id;
}
