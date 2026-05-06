import { create } from 'zustand';
import type { Preset, GenerationJob, OutputParams, AiModelsConfig } from '../types';
import { presetsApi, generationsApi, settingsApi } from '../api';

interface AppState {
  // Presets
  presets: Preset[];
  loadingPresets: boolean;
  
  // Generations
  generations: GenerationJob[];
  loadingGenerations: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // Settings
  outputParams: OutputParams | null;
  aiModels: AiModelsConfig | null;
  
  // UI State
  activeTab: 'create' | 'presets' | 'settings';
  selectedPresetId?: string;
  
  // Actions
  loadPresets: () => Promise<void>;
  createPreset: (data: Partial<Preset>) => Promise<Preset>;
  createPresetFromImage: (imageUrl: string, name?: string) => Promise<Preset>;
  deletePreset: (id: string) => Promise<void>;
  selectPreset: (id?: string) => void;
  
  loadGenerations: (page?: number) => Promise<void>;
  createGeneration: (data: Partial<GenerationJob>) => Promise<GenerationJob>;
  editGeneration: (id: string, prompt: string, model: string) => Promise<GenerationJob>;
  
  loadSettings: () => Promise<void>;
  updateOutputParams: (params: Partial<OutputParams>) => Promise<void>;
  
  setActiveTab: (tab: 'create' | 'presets' | 'settings') => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  presets: [],
  loadingPresets: false,
  generations: [],
  loadingGenerations: false,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  outputParams: null,
  aiModels: null,
  activeTab: 'create',
  selectedPresetId: undefined,
  
  // Preset actions
  loadPresets: async () => {
    set({ loadingPresets: true });
    try {
      const presets = await presetsApi.getAll();
      set({ presets, loadingPresets: false });
    } catch (error) {
      console.error('Failed to load presets:', error);
      set({ loadingPresets: false });
    }
  },
  
  createPreset: async (data) => {
    const preset = await presetsApi.create(data);
    set(state => ({ presets: [preset, ...state.presets] }));
    return preset;
  },
  
  createPresetFromImage: async (imageUrl, name) => {
    const preset = await presetsApi.createFromImage(imageUrl, name);
    set(state => ({ presets: [preset, ...state.presets] }));
    return preset;
  },
  
  deletePreset: async (id) => {
    await presetsApi.delete(id);
    set(state => ({ 
      presets: state.presets.filter(p => p.id !== id),
      selectedPresetId: state.selectedPresetId === id ? undefined : state.selectedPresetId,
    }));
  },
  
  selectPreset: (id) => {
    set({ selectedPresetId: id });
  },
  
  // Generation actions
  loadGenerations: async (page = 1) => {
    set({ loadingGenerations: true });
    try {
      const { data, pagination } = await generationsApi.getAll(page, get().pagination.limit);
      set({ generations: data, pagination, loadingGenerations: false });
    } catch (error) {
      console.error('Failed to load generations:', error);
      set({ loadingGenerations: false });
    }
  },
  
  createGeneration: async (data) => {
    const job = await generationsApi.create(data);
    set(state => ({ generations: [job, ...state.generations] }));
    return job;
  },
  
  editGeneration: async (id, prompt, model) => {
    const job = await generationsApi.edit(id, prompt, model);
    set(state => ({ generations: [job, ...state.generations] }));
    return job;
  },
  
  // Settings actions
  loadSettings: async () => {
    try {
      const [outputParams, aiModels] = await Promise.all([
        settingsApi.getOutputParams(),
        settingsApi.getAiModels(),
      ]);
      set({ outputParams, aiModels });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },
  
  updateOutputParams: async (params) => {
    await settingsApi.updateOutputParams(params);
    await get().loadSettings();
  },
  
  // UI actions
  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },
}));
