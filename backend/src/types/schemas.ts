import { z } from 'zod';

// Preset schemas
export const CreatePresetSchema = z.object({
  name: z.string().min(1).max(255),
  basePrompt: z.string().min(1),
  systemPrompt: z.string().optional().default(''),
  referenceImageUrl: z.string().url().optional(),
  aiModelPreset: z.string().min(1),
});

export const UpdatePresetSchema = CreatePresetSchema.partial();

// Generation job schemas
export const CreateGenerationJobSchema = z.object({
  userId: z.string().uuid(),
  presetId: z.string().uuid().optional(),
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  model: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  quality: z.number().min(0).max(10),
  inputImageUrl: z.string().url().optional(),
});

export const UpdateGenerationJobSchema = z.object({
  status: z.enum(['queued', 'processing', 'completed', 'failed']).optional(),
  outputImageUrls: z.array(z.string()).optional(),
  errorMessage: z.string().optional(),
});

// Bitrix entity mapping schemas
export const CreateBxMappingSchema = z.object({
  entityType: z.enum(['deal', 'smart_process', 'contact', 'company']),
  entityId: z.number().int().positive(),
  bxFieldCode: z.string().min(1),
  fieldType: z.enum(['file', 'string', 'json', 'multiple']),
});

// App settings schemas
export const UpdateAppSettingSchema = z.object({
  key: z.string().min(1),
  value: z.record(z.unknown()),
});

// OpenRouter API schemas
export const ImageGenerationRequestSchema = z.object({
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  model: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  quality: z.number().min(0).max(10),
  inputImageUrl: z.string().url().optional(),
});

// Bitrix OAuth schema
export const BitrixTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number(),
  domain: z.string(),
  member_id: z.string().optional(),
});

// Export types
export type CreatePresetInput = z.infer<typeof CreatePresetSchema>;
export type UpdatePresetInput = z.infer<typeof UpdatePresetSchema>;
export type CreateGenerationJobInput = z.infer<typeof CreateGenerationJobSchema>;
export type UpdateGenerationJobInput = z.infer<typeof UpdateGenerationJobSchema>;
export type CreateBxMappingInput = z.infer<typeof CreateBxMappingSchema>;
export type UpdateAppSettingInput = z.infer<typeof UpdateAppSettingSchema>;
export type ImageGenerationRequest = z.infer<typeof ImageGenerationRequestSchema>;
export type BitrixTokenInput = z.infer<typeof BitrixTokenSchema>;
