import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import prisma from '../database';
import { CreateGenerationJobSchema, ImageGenerationRequestSchema } from '../types/schemas';
import { addGenerationJob, addEditJob } from '../services/queue';

export async function generationRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all generation jobs (with pagination)
  fastify.get('/generations', async (request: FastifyRequest<{ Querystring: { page?: string; limit?: string; status?: string } }>, reply) => {
    const { page = '1', limit = '20', status } = request.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [jobs, total] = await Promise.all([
      prisma.generationJob.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          preset: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.generationJob.count({ where }),
    ]);

    return reply.send({
      data: jobs,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  });

  // Get single generation job
  fastify.get('/generations/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = request.params;

    const job = await prisma.generationJob.findUnique({
      where: { id },
      include: {
        preset: true,
      },
    });

    if (!job) {
      return reply.code(404).send({ error: 'Generation job not found' });
    }

    return reply.send(job);
  });

  // Create generation job
  fastify.post('/generations', async (request: FastifyRequest<{ Body: z.infer<typeof CreateGenerationJobSchema> }>, reply) => {
    const validated = CreateGenerationJobSchema.parse(request.body);

    try {
      const jobId = await addGenerationJob(validated.userId, {
        prompt: validated.prompt,
        negativePrompt: validated.negativePrompt,
        model: validated.model,
        width: validated.width,
        height: validated.height,
        quality: validated.quality,
        inputImageUrl: validated.inputImageUrl,
      });

      const job = await prisma.generationJob.findUnique({
        where: { id: jobId },
      });

      return reply.code(201).send(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create generation job';
      return reply.code(500).send({ error: message });
    }
  });

  // Edit/regenerate image
  fastify.post('/generations/:id/edit', async (request: FastifyRequest<{ Params: { id: string }; Body: { prompt: string; model: string } }>, reply) => {
    const { id } = request.params;
    const { prompt, model } = request.body;

    const originalJob = await prisma.generationJob.findUnique({
      where: { id },
    });

    if (!originalJob) {
      return reply.code(404).send({ error: 'Generation job not found' });
    }

    if (!originalJob.inputImageUrl && !originalJob.outputImageUrls) {
      return reply.code(400).send({ error: 'No source image available for editing' });
    }

    const imageUrl = originalJob.inputImageUrl || 
      (Array.isArray(originalJob.outputImageUrls) ? originalJob.outputImageUrls[0] : null);

    if (!imageUrl) {
      return reply.code(400).send({ error: 'No source image URL available' });
    }

    try {
      const jobId = await addEditJob(
        originalJob.userId,
        imageUrl,
        prompt,
        model
      );

      const job = await prisma.generationJob.findUnique({
        where: { id: jobId },
      });

      return reply.code(201).send(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create edit job';
      return reply.code(500).send({ error: message });
    }
  });

  // Cancel generation job
  fastify.delete('/generations/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = request.params;

    const job = await prisma.generationJob.findUnique({
      where: { id },
    });

    if (!job) {
      return reply.code(404).send({ error: 'Generation job not found' });
    }

    if (job.status === 'completed') {
      return reply.code(400).send({ error: 'Cannot cancel completed job' });
    }

    await prisma.generationJob.update({
      where: { id },
      data: { status: 'failed', errorMessage: 'Cancelled by user' },
    });

    return reply.code(204).send();
  });
}
