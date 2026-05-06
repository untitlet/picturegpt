import { z } from 'zod';

/**
 * Schema for Portal-specific Settings
 * All sensitive data is stored encrypted in DB
 */
export const PortalSettingsSchema = z.object({
  // OpenRouter Configuration
  openrouter: z.object({
    apiKey: z.string().min(1, 'API Key is required'),
    defaultModel: z.string().optional(),
    imageModel: z.string().optional(),
    visionModel: z.string().optional(),
    upscaleModel: z.string().optional(),
    moderationEnabled: z.boolean().default(false),
    abTestEnabled: z.boolean().default(false),
    abTestModels: z.array(z.string()).optional(),
  }),

  // S3 Storage Configuration
  s3: z.object({
    enabled: z.boolean().default(false),
    endpoint: z.string().url().optional(),
    region: z.string().default('us-east-1'),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    bucketName: z.string().default('bx-images'),
    usePresignedUrls: z.boolean().default(true),
    presignedUrlExpiry: z.number().default(3600), // seconds
  }),

  // Bitrix24 Integration
  bitrix: z.object({
    domain: z.string().url().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    tokenExpiresAt: z.number().optional(),
    
    // Entity Mapping
    entityType: z.enum(['deal', 'contact', 'company', 'smart_process']).optional(),
    smartProcessId: z.number().optional(),
    
    // Image Field Configuration
    imageFieldCode: z.string().optional(), // UF_ or standard field code
    imageFieldType: z.enum(['file', 'multiple_file']).optional(),
    useBitrixImage: z.boolean().default(false), // Toggle: Use Bitrix image vs Upload own
    
    // Webhook Configuration
    webhookEnabled: z.boolean().default(false),
    webhookSecret: z.string().optional(),
  }),

  // Output Parameters
  output: z.object({
    defaultWidth: z.number().default(1024),
    defaultHeight: z.number().default(1024),
    customSizes: z.array(z.object({
      name: z.string(),
      width: z.number(),
      height: z.number(),
      unit: z.enum(['px', 'cm']).default('px'),
    })).default([]),
    defaultMargins: z.object({
      top: z.number().default(0),
      right: z.number().default(0),
      bottom: z.number().default(0),
      left: z.number().default(0),
    }),
    defaultQuality: z.number().min(1).max(10).default(7),
    defaultSteps: z.number().default(30),
    defaultCfgScale: z.number().default(7),
  }),

  // Session Behavior
  session: z.object({
    persistImages: z.boolean().default(false), // If false + no S3, images are temp only
    autoSaveToBitrix: z.boolean().default(false),
    cacheDuration: z.number().default(3600), // seconds
  }),

  // Security & Access
  security: z.object({
    rbacEnabled: z.boolean().default(false),
    allowedRoles: z.array(z.enum(['admin', 'manager', 'viewer'])).default(['admin', 'manager', 'viewer']),
    rateLimitEnabled: z.boolean().default(true),
    rateLimitMax: z.number().default(100),
    rateLimitWindowMs: z.number().default(60000),
  }),
});

export type PortalSettings = z.infer<typeof PortalSettingsSchema>;

/**
 * Schema for creating/updating portal settings
 */
export const UpdatePortalSettingsSchema = PortalSettingsSchema.partial();

/**
 * Schema for Bitrix field selection (dynamic from CRM)
 */
export const BitrixFieldSchema = z.object({
  code: z.string(),
  name: z.string(),
  type: z.enum(['file', 'multiple_file', 'string', 'enum', 'text']),
  isRequired: z.boolean(),
  isMultiple: z.boolean(),
});

export type BitrixField = z.infer<typeof BitrixFieldSchema>;
