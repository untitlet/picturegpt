import { env } from '../config/env';
import { FastifyInstance } from 'fastify';

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
    image: string;
  };
  top_provider: {
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
}

interface OpenRouterImageResponse {
  id: string;
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

interface OpenRouterChatResponse {
  id: string;
  created: number;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterAdapter {
  private readonly baseUrl = 'https://openrouter.ai/api/v1';
  private readonly apiKey: string;
  private modelsCache: OpenRouterModel[] = [];
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.apiKey = env.OPENROUTER_API_KEY;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://aigenerator.local',
      'X-Title': 'AI Generator App',
    };
  }

  /**
   * Get available models with pricing and limits from OpenRouter
   * Caches results for 5 minutes to avoid rate limiting
   */
  async getModels(forceRefresh: boolean = false): Promise<OpenRouterModel[]> {
    const now = Date.now();
    
    if (!forceRefresh && this.modelsCache.length > 0 && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.modelsCache;
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      this.modelsCache = (data.data || []).map((model: any) => ({
        id: String(model.id),
        name: String(model.name || model.id),
        description: String(model.description || ''),
        context_length: Number(model.context_length || 4096),
        pricing: {
          prompt: String(model.pricing?.prompt || '0'),
          completion: String(model.pricing?.completion || '0'),
          image: String(model.pricing?.image || '0'),
        },
        top_provider: {
          max_completion_tokens: model.top_provider?.max_completion_tokens || null,
          is_moderated: Boolean(model.top_provider?.is_moderated || false),
        },
        architecture: model.architecture ? {
          modality: String(model.architecture.modality || 'text'),
          tokenizer: String(model.architecture.tokenizer || 'unknown'),
          instruct_type: model.architecture.instruct_type ? String(model.architecture.instruct_type) : undefined,
        } : undefined,
      }));

      this.cacheTimestamp = now;
      return this.modelsCache;
    } catch (error: any) {
      console.error('Failed to fetch OpenRouter models:', error.message);
      // Return cached models even if expired on error
      if (this.modelsCache.length > 0) {
        return this.modelsCache;
      }
      throw error;
    }
  }

  /**
   * Filter models by capability (image generation, chat, etc.)
   */
  async getModelsByCapability(capability: 'image' | 'chat' | 'vision'): Promise<OpenRouterModel[]> {
    const allModels = await this.getModels();
    
    switch (capability) {
      case 'image':
        return allModels.filter(m => 
          m.id.includes('stable-diffusion') ||
          m.id.includes('midjourney') ||
          m.id.includes('dall-e') ||
          m.id.includes('flux') ||
          m.id.includes('playground') ||
          m.pricing.image !== '0'
        );
      case 'vision':
        return allModels.filter(m =>
          m.architecture?.modality === 'multimodal' ||
          m.id.includes('vision') ||
          m.id.includes('gpt-4-v')
        );
      case 'chat':
        return allModels.filter(m =>
          !m.id.includes('stable-diffusion') &&
          !m.id.includes('midjourney') &&
          !m.id.includes('dall-e')
        );
      default:
        return allModels;
    }
  }

  /**
   * Generate image from prompt
   */
  async generateImage(
    prompt: string,
    model: string,
    width: number,
    height: number,
    negativePrompt?: string,
    inputImageUrl?: string,
    steps?: number,
    cfgScale?: number
  ): Promise<{ imageUrl: string; jobId: string }> {
    const endpoint = '/images/generations';
    
    const payload: Record<string, unknown> = {
      model,
      prompt,
      width,
      height,
      n: 1,
    };

    if (negativePrompt) {
      payload.negative_prompt = negativePrompt;
    }

    if (inputImageUrl) {
      payload.image_url = inputImageUrl;
    }

    if (steps !== undefined) {
      payload.steps = steps;
    }

    if (cfgScale !== undefined) {
      payload.cfg_scale = cfgScale;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data: OpenRouterImageResponse = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('No image generated');
    }

    const imageUrl = data.data[0].url || data.data[0].b64_json;
    
    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    return {
      imageUrl,
      jobId: data.id,
    };
  }

  /**
   * Generate prompt from reference image (image-to-prompt)
   */
  async imageToPrompt(imageUrl: string, model: string = 'openai/gpt-4-vision-preview'): Promise<{
    basePrompt: string;
    systemPrompt: string;
  }> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert prompt engineer for AI image generation. Analyze the provided image and create a detailed, descriptive prompt that could be used to generate a similar image. Include details about style, composition, lighting, colors, mood, and any notable elements. Also provide a system prompt that captures the essence of the style.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image and create a detailed prompt for AI image generation.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data: OpenRouterChatResponse = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Parse the response to extract base prompt and system prompt
    const basePromptMatch = content.match(/(?:Base Prompt|Prompt):?\s*([\s\S]*?)(?:System Prompt|$)/i);
    const systemPromptMatch = content.match(/(?:System Prompt):\s*([\s\S]*)/i);

    return {
      basePrompt: basePromptMatch?.[1]?.trim() || content,
      systemPrompt: systemPromptMatch?.[1]?.trim() || 'Generate high-quality images with attention to detail.',
    };
  }

  /**
   * Edit/enhance existing image
   */
  async editImage(
    imageUrl: string,
    prompt: string,
    model: string
  ): Promise<{ imageUrl: string; jobId: string }> {
    return this.generateImage(prompt, model, 1024, 1024, undefined, imageUrl);
  }

  /**
   * Register OpenRouter routes
   */
  static registerRoutes(app: FastifyInstance, adapter: OpenRouterAdapter) {
    // Get all models with pricing
    app.get('/api/openrouter/models', async (request, reply) => {
      try {
        const { refresh } = request.query as { refresh?: string };
        const models = await adapter.getModels(refresh === 'true');
        
        return reply.send({
          success: true,
          data: models,
          cached: Date.now() - adapter['cacheTimestamp'] < adapter['CACHE_TTL'],
        });
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    });

    // Get image generation models only
    app.get('/api/openrouter/models/image', async (request, reply) => {
      try {
        const models = await adapter.getModelsByCapability('image');
        return reply.send({ success: true, data: models });
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    });

    // Get vision models for preset creation
    app.get('/api/openrouter/models/vision', async (request, reply) => {
      try {
        const models = await adapter.getModelsByCapability('vision');
        return reply.send({ success: true, data: models });
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    });
  }
}

export const openRouterAdapter = new OpenRouterAdapter();
export default openRouterAdapter;
