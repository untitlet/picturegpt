import { env } from '../config/env';

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
}

export class OpenRouterAdapter {
  private readonly baseUrl = 'https://openrouter.ai/api/v1';
  private readonly apiKey: string;

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
   * Generate image from prompt
   */
  async generateImage(
    prompt: string,
    model: string,
    width: number,
    height: number,
    negativePrompt?: string,
    inputImageUrl?: string
  ): Promise<string> {
    const endpoint = inputImageUrl ? '/images/generations' : '/images/generations';
    
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

    // If it's base64, we'll handle conversion elsewhere
    return imageUrl;
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
    const systemPromptMatch = content.match(/(?:System Prompt):?\s*([\s\S]*)/i);

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
  ): Promise<string> {
    // For now, use image-to-image generation
    // This may need adjustment based on specific model capabilities
    return this.generateImage(prompt, model, 1024, 1024, undefined, imageUrl);
  }

  /**
   * Get available models
   */
  async getModels(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
  }>> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    return data.data?.map((model: Record<string, unknown>) => ({
      id: String(model.id),
      name: String(model.name || model.id),
      description: String(model.description || ''),
    })) || [];
  }
}

export const openRouterAdapter = new OpenRouterAdapter();
export default openRouterAdapter;
