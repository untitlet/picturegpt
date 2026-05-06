import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import prisma from '../database';
import { CreatePresetSchema, UpdatePresetSchema } from '../types/schemas';
import { addAnalysisJob } from '../services/queue';
import { openRouterAdapter } from '../adapters/openrouter';

export async function presetRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all presets
  fastify.get('/presets', async (request, reply) => {
    const presets = await prisma.preset.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { generationJobs: true },
        },
      },
    });

    return reply.send(presets);
  });

  // Get single preset
  fastify.get('/presets/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = request.params;

    const preset = await prisma.preset.findUnique({
      where: { id },
      include: {
        generationJobs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!preset) {
      return reply.code(404).send({ error: 'Preset not found' });
    }

    return reply.send(preset);
  });

  // Create preset
  fastify.post('/presets', async (request: FastifyRequest<{ Body: z.infer<typeof CreatePresetSchema> }>, reply) => {
    const validated = CreatePresetSchema.parse(request.body);

    const preset = await prisma.preset.create({
      data: validated,
    });

    return reply.code(201).send(preset);
  });

  // Create preset from image (image-to-prompt)
  fastify.post('/presets/from-image', async (request: FastifyRequest<{ Body: { imageUrl: string; name?: string } }>, reply) => {
    const { imageUrl, name } = request.body;

    if (!imageUrl) {
      return reply.code(400).send({ error: 'Image URL is required' });
    }

    try {
      // Generate prompt from image
      const result = await openRouterAdapter.imageToPrompt(imageUrl);

      const preset = await prisma.preset.create({
        data: {
          name: name || `Preset ${new Date().toISOString()}`,
          basePrompt: result.basePrompt,
          systemPrompt: result.systemPrompt,
          referenceImageUrl: imageUrl,
          aiModelPreset: 'default',
        },
      });

      return reply.code(201).send(preset);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to analyze image';
      return reply.code(500).send({ error: message });
    }
  });

  // Update preset
  fastify.patch('/presets/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof UpdatePresetSchema> }>, reply) => {
    const { id } = request.params;
    const validated = UpdatePresetSchema.parse(request.body);

    const preset = await prisma.preset.update({
      where: { id },
      data: validated,
    });

    return reply.send(preset);
  });

  // Delete preset
  fastify.delete('/presets/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = request.params;

    // Check if preset is used in active jobs
    const activeJobs = await prisma.generationJob.count({
      where: {
        presetId: id,
        status: { in: ['queued', 'processing'] },
      },
    });

    if (activeJobs > 0) {
      return reply.code(400).send({ 
        error: 'Cannot delete preset with active generation jobs',
        activeJobs,
      });
    }

    await prisma.preset.delete({
      where: { id },
    });

    return reply.code(204).send();
  });
}
