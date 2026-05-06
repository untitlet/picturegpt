import { FastifyInstance, FastifyRequest } from 'fastify';
import prisma from '../database';

export async function settingsRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all settings
  fastify.get('/settings', async (request, reply) => {
    const settings = await prisma.appSetting.findMany();
    
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, unknown>);

    return reply.send(settingsObject);
  });

  // Get single setting
  fastify.get('/settings/:key', async (request: FastifyRequest<{ Params: { key: string } }>, reply) => {
    const { key } = request.params;

    const setting = await prisma.appSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return reply.code(404).send({ error: 'Setting not found' });
    }

    return reply.send(setting.value);
  });

  // Update/create setting
  fastify.put('/settings/:key', async (request: FastifyRequest<{ Params: { key: string }; Body: { value: unknown } }>, reply) => {
    const { key } = request.params;
    const { value } = request.body;

    const setting = await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    return reply.send(setting);
  });

  // Delete setting
  fastify.delete('/settings/:key', async (request: FastifyRequest<{ Params: { key: string } }>, reply) => {
    const { key } = request.params;

    await prisma.appSetting.delete({
      where: { key },
    });

    return reply.code(204).send();
  });

  // Get AI models configuration
  fastify.get('/settings/ai-models', async (request, reply) => {
    const [presetModel, generationModel, editModel] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: 'ai_preset_model' } }),
      prisma.appSetting.findUnique({ where: { key: 'ai_generation_model' } }),
      prisma.appSetting.findUnique({ where: { key: 'ai_edit_model' } }),
    ]);

    return reply.send({
      presetModel: presetModel?.value || 'openai/gpt-4-vision-preview',
      generationModel: generationModel?.value || 'stability/stable-diffusion-xl-base-1.0',
      editModel: editModel?.value || 'stability/stable-diffusion-xl-base-1.0',
    });
  });

  // Get output parameters
  fastify.get('/settings/output-params', async (request, reply) => {
    const sizes = await prisma.appSetting.findUnique({ where: { key: 'output_sizes' } });
    const margins = await prisma.appSetting.findUnique({ where: { key: 'output_margins' } });
    const quality = await prisma.appSetting.findUnique({ where: { key: 'output_quality' } });

    return reply.send({
      sizes: sizes?.value || [
        { name: '20x20cm', width: 1024, height: 1024 },
        { name: '20x40cm', width: 1024, height: 2048 },
        { name: '30x30cm', width: 1536, height: 1536 },
      ],
      margins: margins?.value || { top: 0, right: 0, bottom: 0, left: 0 },
      quality: quality?.value || { cfgScale: 7, steps: 30 },
    });
  });

  // Update output parameters
  fastify.put('/settings/output-params', async (request: FastifyRequest<{ Body: { sizes?: unknown[]; margins?: object; quality?: object } }>, reply) => {
    const { sizes, margins, quality } = request.body;

    const updates = [];
    
    if (sizes !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: 'output_sizes' },
          create: { key: 'output_sizes', value: sizes },
          update: { value: sizes },
        })
      );
    }

    if (margins !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: 'output_margins' },
          create: { key: 'output_margins', value: margins },
          update: { value: margins },
        })
      );
    }

    if (quality !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: 'output_quality' },
          create: { key: 'output_quality', value: quality },
          update: { value: quality },
        })
      );
    }

    await Promise.all(updates);

    return reply.send({ success: true });
  });
}
