import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const UpscaleRequestSchema = z.object({
  jobId: z.string().uuid(),
  scale: z.number().min(1).max(4).default(2),
});

export class UpscaleService {
  private openRouterApiKey: string;
  private openRouterBaseUrl: string;

  constructor(openRouterApiKey: string, openRouterBaseUrl: string) {
    this.openRouterApiKey = openRouterApiKey;
    this.openRouterBaseUrl = openRouterBaseUrl;
  }

  /**
   * Upscale an image using AI model
   * Uses models like stabilityai/stable-diffusion-x4-upscaler or similar
   */
  async upscaleImage(
    imageUrl: string,
    scale: number = 2
  ): Promise<{ upscaledUrl: string; metadata: any }> {
    // This is a placeholder - in production, you'd call an actual upscaling API
    // Options: Stability AI, Replicate, or local deployment of ESRGAN
    
    const response = await fetch(
      `${this.openRouterBaseUrl}/v1/images/generations`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://bx-image-generator.local',
          'X-Title': 'BX Image Generator',
        },
        body: JSON.stringify({
          model: 'stabilityai/stable-diffusion-x4-upscaler',
          prompt: 'high quality, detailed, sharp, 4k',
          image: imageUrl,
          n: 1,
          size: '1024x1024', // Adjust based on original size * scale
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Upscaling failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      upscaledUrl: data.data[0].url,
      metadata: {
        originalUrl: imageUrl,
        scale,
        model: 'stabilityai/stable-diffusion-x4-upscaler',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Register upscale routes
   */
  static registerRoutes(app: FastifyInstance, service: UpscaleService) {
    app.post(
      '/api/upscale',
      {
        schema: {
          body: {
            type: 'object',
            properties: {
              jobId: { type: 'string', format: 'uuid' },
              scale: { type: 'number', minimum: 1, maximum: 4 },
            },
            required: ['jobId'],
          },
        },
      },
      async (request, reply) => {
        try {
          const { jobId, scale } = UpscaleRequestSchema.parse(request.body);

          // Get job from database to retrieve image URL
          // This is pseudo-code - implement with your DB layer
          const job = await app.prisma.generationJobs.findUnique({
            where: { id: jobId },
          });

          if (!job || !job.output_image_urls) {
            return reply.code(404).send({ error: 'Job not found' });
          }

          const imageUrl = Array.isArray(job.output_image_urls)
            ? job.output_image_urls[0]
            : job.output_image_urls;

          const result = await service.upscaleImage(imageUrl, scale);

          return reply.send({
            success: true,
            data: result,
          });
        } catch (error: any) {
          return reply.code(400).send({ error: error.message });
        }
      }
    );
  }
}
