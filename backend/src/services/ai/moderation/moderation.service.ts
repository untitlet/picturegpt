import { z } from 'zod';

// Content moderation schemas
export const ModerationRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  negativePrompt: z.string().optional(),
});

export type ModerationRequest = z.infer<typeof ModerationRequestSchema>;

export interface ModerationResult {
  isSafe: boolean;
  categories: Record<string, number>;
  flaggedCategories: string[];
  reason?: string;
}

// Simple keyword-based moderation (can be enhanced with external API)
const PROHIBITED_KEYWORDS = [
  'violence',
  'gore',
  'nsfw',
  'explicit',
  'adult',
  'hate',
  'discrimination',
  'harassment',
];

export class ModerationService {
  /**
   * Basic content moderation using keyword filtering
   * Can be extended to use external APIs like OpenAI Moderation
   */
  async moderateContent(text: string): Promise<ModerationResult> {
    const lowerText = text.toLowerCase();
    const flaggedCategories: string[] = [];
    const categories: Record<string, number> = {};

    // Check for prohibited keywords
    PROHIBITED_KEYWORDS.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      const matches = lowerText.match(regex);
      const score = matches ? Math.min(matches.length * 0.3, 1.0) : 0;
      categories[keyword] = score;

      if (score > 0.5) {
        flaggedCategories.push(keyword);
      }
    });

    const isSafe = flaggedCategories.length === 0;

    return {
      isSafe,
      categories,
      flaggedCategories,
      reason: isSafe
        ? undefined
        : `Content flagged for: ${flaggedCategories.join(', ')}`,
    };
  }

  /**
   * Validate and moderate generation request
   */
  async validateGenerationRequest(
    prompt: string,
    negativePrompt?: string
  ): Promise<{ valid: boolean; error?: string }> {
    // Validate schema
    const validation = ModerationRequestSchema.safeParse({
      prompt,
      negativePrompt,
    });

    if (!validation.success) {
      return {
        valid: false,
        error: validation.error.errors[0].message,
      };
    }

    // Moderate prompt
    const promptModeration = await this.moderateContent(prompt);
    if (!promptModeration.isSafe) {
      return {
        valid: false,
        error: promptModeration.reason,
      };
    }

    // Moderate negative prompt if provided
    if (negativePrompt) {
      const negativeModeration = await this.moderateContent(negativePrompt);
      if (!negativeModeration.isSafe) {
        return {
          valid: false,
          error: `Negative prompt: ${negativeModeration.reason}`,
        };
      }
    }

    return { valid: true };
  }
}
