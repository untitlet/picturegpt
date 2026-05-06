import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const ABTestRequestSchema = z.object({
  jobId: z.string().uuid(),
  variants: z.array(z.object({
    model: z.string(),
    prompt: z.string(),
    parameters: z.record(z.any()).optional(),
  })).min(2).max(5),
});

export interface ABTestVariant {
  model: string;
  prompt: string;
  parameters: Record<string, any>;
  imageUrl?: string;
  jobId?: string;
  metrics?: {
    generationTime: number;
    cost: number;
    userRating?: number;
  };
}

export class ABTestService {
  private aiAdapter: any;

  constructor(aiAdapter: any) {
    this.aiAdapter = aiAdapter;
  }

  /**
   * Run A/B test between different models or prompts
   */
  async runABTest(
    variants: ABTestVariant[]
  ): Promise<{ results: ABTestVariant[]; winner?: string }> {
    const results: ABTestVariant[] = [];

    // Generate images for all variants in parallel
    const promises = variants.map(async (variant) => {
      const startTime = Date.now();
      
      try {
        const result = await this.aiAdapter.generateImage({
          model: variant.model,
          prompt: variant.prompt,
          ...variant.parameters,
        });

        const generationTime = Date.now() - startTime;
        
        // Estimate cost based on model and image size
        const cost = this.estimateCost(variant.model, variant.parameters);

        results.push({
          ...variant,
          imageUrl: result.imageUrl,
          jobId: result.jobId,
          metrics: {
            generationTime,
            cost,
          },
        });
      } catch (error: any) {
        results.push({
          ...variant,
          metrics: {
            generationTime: Date.now() - startTime,
            cost: 0,
          },
        });
      }
    });

    await Promise.all(promises);

    // Determine winner based on generation time and cost (can be enhanced with user ratings)
    const successfulVariants = results.filter((v) => v.imageUrl);
    let winner: string | undefined;

    if (successfulVariants.length > 0) {
      // Simple scoring: balance between speed and cost
      const scored = successfulVariants.map((v) => ({
        ...v,
        score: 1 / (v.metrics!.generationTime * 0.7 + v.metrics!.cost * 0.3),
      }));

      scored.sort((a, b) => b.score - a.score);
      winner = scored[0].model;
    }

    return { results, winner };
  }

  /**
   * Estimate cost based on model pricing
   */
  private estimateCost(model: string, parameters: Record<string, any>): number {
    // Placeholder pricing - replace with actual OpenRouter pricing
    const basePrices: Record<string, number> = {
      'stabilityai/stable-diffusion-xl': 0.002,
      'midjourney/midjourney-v5': 0.008,
      'openai/dall-e-3': 0.04,
    };

    const basePrice = basePrices[model] || 0.005;
    const sizeMultiplier = parameters.width && parameters.height
      ? (parameters.width * parameters.height) / (1024 * 1024)
      : 1;

    return basePrice * sizeMultiplier;
  }

  /**
   * Register A/B test routes
   */
  static registerRoutes(app: FastifyInstance, service: ABTestService) {
    app.post(
      '/api/ab-test',
      {
        schema: {
          body: {
            type: 'object',
            properties: {
              jobId: { type: 'string', format: 'uuid' },
              variants: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    model: { type: 'string' },
                    prompt: { type: 'string' },
                    parameters: { type: 'object' },
                  },
                  required: ['model', 'prompt'],
                },
                minItems: 2,
                maxItems: 5,
              },
            },
            required: ['variants'],
          },
        },
      },
      async (request, reply) => {
        try {
          const { variants } = ABTestRequestSchema.parse(request.body);
          
          const result = await service.runABTest(variants);
          
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
