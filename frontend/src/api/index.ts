import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Presets API
export const presetsApi = {
  getAll: () => api.get('/presets').then(res => res.data),
  getById: (id: string) => api.get(`/presets/${id}`).then(res => res.data),
  create: (data: unknown) => api.post('/presets', data).then(res => res.data),
  createFromImage: (imageUrl: string, name?: string) => 
    api.post('/presets/from-image', { imageUrl, name }).then(res => res.data),
  update: (id: string, data: unknown) => 
    api.patch(`/presets/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/presets/${id}`).then(res => res.data),
};

// Generations API
export const generationsApi = {
  getAll: (page = 1, limit = 20, status?: string) => 
    api.get('/generations', { params: { page, limit, status } }).then(res => res.data),
  getById: (id: string) => api.get(`/generations/${id}`).then(res => res.data),
  create: (data: unknown) => api.post('/generations', data).then(res => res.data),
  edit: (id: string, prompt: string, model: string) => 
    api.post(`/generations/${id}/edit`, { prompt, model }).then(res => res.data),
  cancel: (id: string) => api.delete(`/generations/${id}`).then(res => res.data),
};

// Bitrix API
export const bitrixApi = {
  getOAuthUrl: () => api.get('/bitrix/oauth-url').then(res => res.data),
  getStatus: () => api.get('/bitrix/status').then(res => res.data),
  disconnect: (domain: string) => api.delete(`/bitrix/${domain}`).then(res => res.data),
  getFields: (domain: string, entityType: string) => 
    api.get(`/bitrix/${domain}/crm/${entityType}/fields`).then(res => res.data),
  getMappings: (entityType?: string, entityId?: string) => 
    api.get('/bitrix/mappings', { params: { entityType, entityId } }).then(res => res.data),
  createMapping: (data: unknown) => api.post('/bitrix/mappings', data).then(res => res.data),
  deleteMapping: (id: string) => api.delete(`/bitrix/mappings/${id}`).then(res => res.data),
  testConnection: (domain: string, entityType: string, entityId: number) => 
    api.post(`/bitrix/${domain}/test`, { entityType, entityId }).then(res => res.data),
};

// Settings API
export const settingsApi = {
  getAll: () => api.get('/settings').then(res => res.data),
  getAiModels: () => api.get('/settings/ai-models').then(res => res.data),
  getOutputParams: () => api.get('/settings/output-params').then(res => res.data),
  updateOutputParams: (data: unknown) => 
    api.put('/settings/output-params', data).then(res => res.data),
  updateSetting: (key: string, value: unknown) => 
    api.put(`/settings/${key}`, { value }).then(res => res.data),
};

// Health API
export const healthApi = {
  check: () => api.get('/health').then(res => res.data),
  ready: () => api.get('/ready').then(res => res.data),
};
