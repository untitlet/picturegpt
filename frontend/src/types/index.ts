export interface Preset {
  id: string;
  name: string;
  basePrompt: string;
  systemPrompt: string;
  referenceImageUrl?: string;
  aiModelPreset: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationJob {
  id: string;
  userId: string;
  presetId?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  prompt: string;
  negativePrompt?: string;
  model: string;
  width: number;
  height: number;
  quality: number;
  inputImageUrl?: string;
  outputImageUrls?: string[];
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  preset?: {
    id: string;
    name: string;
  };
}

export interface BxEntityMapping {
  id: string;
  entityType: 'deal' | 'smart_process' | 'contact' | 'company';
  entityId: number;
  bxFieldCode: string;
  fieldType: 'file' | 'string' | 'json' | 'multiple';
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmField {
  code: string;
  title: string;
  type: string;
  isUf: boolean;
}

export interface OutputSize {
  name: string;
  width: number;
  height: number;
}

export interface OutputParams {
  sizes: OutputSize[];
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  quality: {
    cfgScale: number;
    steps: number;
  };
}

export interface AiModelsConfig {
  presetModel: string;
  generationModel: string;
  editModel: string;
}
