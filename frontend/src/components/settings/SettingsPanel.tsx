import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';

interface SettingsState {
  openrouter: {
    apiKey: string;
    defaultModel: string;
    imageModel: string;
    visionModel: string;
    upscaleModel: string;
    moderationEnabled: boolean;
    abTestEnabled: boolean;
  };
  s3: {
    enabled: boolean;
    endpoint: string;
    region: string;
    accessKeyId: string;
    bucketName: string;
    usePresignedUrls: boolean;
  };
  bitrix: {
    domain: string;
    entityType: 'deal' | 'contact' | 'company' | 'smart_process';
    smartProcessId?: number;
    imageFieldCode: string;
    imageFieldType: 'file' | 'multiple_file';
    useBitrixImage: boolean;
    webhookEnabled: boolean;
  };
  output: {
    defaultWidth: number;
    defaultHeight: number;
    customSizes: Array<{ name: string; width: number; height: number; unit: 'px' | 'cm' }>;
    defaultQuality: number;
    defaultSteps: number;
    defaultCfgScale: number;
  };
  session: {
    persistImages: boolean;
    autoSaveToBitrix: boolean;
  };
}

export const SettingsPanel: React.FC = () => {
  const { portalId, setPortalId } = useAppStore();
  const [activeTab, setActiveTab] = useState<'openrouter' | 's3' | 'bitrix' | 'output' | 'session'>('openrouter');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bitrixFields, setBitrixFields] = useState<Array<{ code: string; name: string; type: string }>>([]);
  
  const [settings, setSettings] = useState<SettingsState>({
    openrouter: {
      apiKey: '',
      defaultModel: '',
      imageModel: '',
      visionModel: '',
      upscaleModel: '',
      moderationEnabled: false,
      abTestEnabled: false,
    },
    s3: {
      enabled: false,
      endpoint: '',
      region: 'us-east-1',
      accessKeyId: '',
      bucketName: 'bx-images',
      usePresignedUrls: true,
    },
    bitrix: {
      domain: '',
      entityType: 'deal',
      imageFieldCode: '',
      imageFieldType: 'file',
      useBitrixImage: false,
      webhookEnabled: false,
    },
    output: {
      defaultWidth: 1024,
      defaultHeight: 1024,
      customSizes: [],
      defaultQuality: 7,
      defaultSteps: 30,
      defaultCfgScale: 7,
    },
    session: {
      persistImages: false,
      autoSaveToBitrix: false,
    },
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [portalId]);

  // Load Bitrix fields when entity type changes
  useEffect(() => {
    if (settings.bitrix.domain && activeTab === 'bitrix') {
      loadBitrixFields();
    }
  }, [settings.bitrix.entityType, settings.bitrix.smartProcessId, activeTab]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings', {
        headers: { 'X-Portal-ID': portalId },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          ...data,
          openrouter: { ...prev.openrouter, ...data.openrouter },
          s3: { ...prev.s3, ...data.s3 },
          bitrix: { ...prev.bitrix, ...data.bitrix },
          output: { ...prev.output, ...data.output },
          session: { ...prev.session, ...data.session },
        }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBitrixFields = async () => {
    try {
      const params = new URLSearchParams({
        entityType: settings.bitrix.entityType,
        ...(settings.bitrix.entityType === 'smart_process' && settings.bitrix.smartProcessId
          ? { smartProcessId: String(settings.bitrix.smartProcessId) }
          : {}),
      });

      const response = await fetch(`/api/settings/bitrix/fields?${params}`, {
        headers: { 'X-Portal-ID': portalId },
      });

      if (response.ok) {
        const data = await response.json();
        setBitrixFields(data.fields || []);
      }
    } catch (error) {
      console.error('Failed to load Bitrix fields:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Portal-ID': portalId,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Настройки успешно сохранены!');
      } else {
        alert('Ошибка при сохранении настроек');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Ошибка при сохранении настроек');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestS3 = async () => {
    try {
      const response = await fetch('/api/settings/s3/test', {
        method: 'POST',
        headers: { 'X-Portal-ID': portalId },
      });
      const data = await response.json();
      alert(data.message || (data.success ? 'S3 подключен успешно!' : 'Ошибка подключения S3'));
    } catch (error) {
      alert('Ошибка тестирования S3');
    }
  };

  const handleTestBitrix = async () => {
    try {
      const response = await fetch('/api/settings/bitrix/test', {
        method: 'POST',
        headers: { 'X-Portal-ID': portalId },
      });
      const data = await response.json();
      alert(data.message || (data.success ? 'Bitrix24 подключен успешно!' : 'Ошибка подключения Bitrix24'));
    } catch (error) {
      alert('Ошибка тестирования Bitrix24');
    }
  };

  if (isLoading) {
    return <div className="p-6">Загрузка настроек...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {[
            { id: 'openrouter', label: 'AI Модели' },
            { id: 's3', label: 'Хранилище (S3)' },
            { id: 'bitrix', label: 'Bitrix24' },
            { id: 'output', label: 'Параметры вывода' },
            { id: 'session', label: 'Сессия' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* OpenRouter Settings */}
        {activeTab === 'openrouter' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Настройки OpenRouter</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key *
              </label>
              <input
                type="password"
                value={settings.openrouter.apiKey}
                onChange={e => setSettings(prev => ({
                  ...prev,
                  openrouter: { ...prev.openrouter, apiKey: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="sk-or-..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Ключ шифруется перед сохранением в базу данных
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Модель для генерации
                </label>
                <select
                  value={settings.openrouter.imageModel}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    openrouter: { ...prev.openrouter, imageModel: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Выберите модель</option>
                  <option value="black-forest-labs/flux-schnell">Flux Schnell</option>
                  <option value="black-forest-labs/flux-dev">Flux Dev</option>
                  <option value="stabilityai/stable-diffusion-xl-base-1.0">SDXL</option>
                  <option value="midjourney/midjourney">Midjourney</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Модель для пресетов (Vision)
                </label>
                <select
                  value={settings.openrouter.visionModel}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    openrouter: { ...prev.openrouter, visionModel: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Выберите модель</option>
                  <option value="openai/gpt-4-vision-preview">GPT-4 Vision</option>
                  <option value="anthropic/claude-3-opus">Claude 3 Opus</option>
                  <option value="google/gemini-pro-vision">Gemini Pro Vision</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Модель для апскейлинга
                </label>
                <select
                  value={settings.openrouter.upscaleModel}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    openrouter: { ...prev.openrouter, upscaleModel: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Выберите модель</option>
                  <option value="stabilityai/stable-diffusion-x4-upscaler">SD x4 Upscaler</option>
                  <option value="esrgan/esrgan-x4">ESRGAN x4</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Модель по умолчанию
                </label>
                <select
                  value={settings.openrouter.defaultModel}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    openrouter: { ...prev.openrouter, defaultModel: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Выберите модель</option>
                  <option value="black-forest-labs/flux-schnell">Flux Schnell</option>
                  <option value="stabilityai/stable-diffusion-xl-base-1.0">SDXL</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.openrouter.moderationEnabled}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    openrouter: { ...prev.openrouter, moderationEnabled: e.target.checked }
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Включить модерацию контента</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.openrouter.abTestEnabled}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    openrouter: { ...prev.openrouter, abTestEnabled: e.target.checked }
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">A/B тестирование моделей</span>
              </label>
            </div>
          </div>
        )}

        {/* S3 Settings */}
        {activeTab === 's3' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Настройки S3 хранилища</h3>
            
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={settings.s3.enabled}
                onChange={e => setSettings(prev => ({
                  ...prev,
                  s3: { ...prev.s3, enabled: e.target.checked }
                }))}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">
                Включить S3 хранилище
              </label>
            </div>

            {settings.s3.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Endpoint URL *
                  </label>
                  <input
                    type="url"
                    value={settings.s3.endpoint}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      s3: { ...prev.s3, endpoint: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="https://s3.amazonaws.com или https://minio.example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Access Key ID *
                    </label>
                    <input
                      type="text"
                      value={settings.s3.accessKeyId}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        s3: { ...prev.s3, accessKeyId: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bucket Name
                    </label>
                    <input
                      type="text"
                      value={settings.s3.bucketName}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        s3: { ...prev.s3, bucketName: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    value={settings.s3.region}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      s3: { ...prev.s3, region: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <button
                  onClick={handleTestS3}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Тест подключения
                </button>

                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Если S3 не включен, изображения будут храниться только в сессии и удаляться после её завершения.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Bitrix Settings */}
        {activeTab === 'bitrix' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Интеграция с Bitrix24</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Домен Bitrix24 *
              </label>
              <input
                type="url"
                value={settings.bitrix.domain}
                onChange={e => setSettings(prev => ({
                  ...prev,
                  bitrix: { ...prev.bitrix, domain: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://your-company.bitrix24.ru"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип сущности
              </label>
              <select
                value={settings.bitrix.entityType}
                onChange={e => setSettings(prev => ({
                  ...prev,
                  bitrix: { 
                    ...prev.bitrix, 
                    entityType: e.target.value as any 
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="deal">Сделка (Deal)</option>
                <option value="contact">Контакт</option>
                <option value="company">Компания</option>
                <option value="smart_process">Смарт-процесс</option>
              </select>
            </div>

            {settings.bitrix.entityType === 'smart_process' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Смарт-процесса
                </label>
                <input
                  type="number"
                  value={settings.bitrix.smartProcessId || ''}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    bitrix: { 
                      ...prev.bitrix, 
                      smartProcessId: parseInt(e.target.value) || undefined 
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            {bitrixFields.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Поле для изображений
                </label>
                <select
                  value={settings.bitrix.imageFieldCode}
                  onChange={e => {
                    const field = bitrixFields.find(f => f.code === e.target.value);
                    setSettings(prev => ({
                      ...prev,
                      bitrix: { 
                        ...prev.bitrix, 
                        imageFieldCode: e.target.value,
                        imageFieldType: field?.type === 'multiple_file' ? 'multiple_file' : 'file'
                      }
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Выберите поле</option>
                  {bitrixFields.map(field => (
                    <option key={field.code} value={field.code}>
                      {field.name} ({field.code}){field.type === 'multiple_file' ? ' [Множественное]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                checked={settings.bitrix.useBitrixImage}
                onChange={e => setSettings(prev => ({
                  ...prev,
                  bitrix: { ...prev.bitrix, useBitrixImage: e.target.checked }
                }))}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">
                Использовать изображение из поля Bitrix24
              </label>
            </div>

            {settings.bitrix.useBitrixImage && !settings.bitrix.imageFieldCode && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  ⚠️ Выберите поле типа "Файл" выше для использования изображений из Bitrix24
                </p>
              </div>
            )}

            {settings.bitrix.useBitrixImage && settings.bitrix.imageFieldCode && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  ✓ Изображения будут загружаться из поля "{settings.bitrix.imageFieldCode}"
                </p>
              </div>
            )}

            <button
              onClick={handleTestBitrix}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Тест подключения
            </button>
          </div>
        )}

        {/* Output Settings */}
        {activeTab === 'output' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Параметры вывода изображений</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ширина по умолчанию (px)
                </label>
                <input
                  type="number"
                  value={settings.output.defaultWidth}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    output: { ...prev.output, defaultWidth: parseInt(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Высота по умолчанию (px)
                </label>
                <input
                  type="number"
                  value={settings.output.defaultHeight}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    output: { ...prev.output, defaultHeight: parseInt(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Качество (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.output.defaultQuality}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    output: { ...prev.output, defaultQuality: parseInt(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Steps
                </label>
                <input
                  type="number"
                  value={settings.output.defaultSteps}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    output: { ...prev.output, defaultSteps: parseInt(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CFG Scale
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.output.defaultCfgScale}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    output: { ...prev.output, defaultCfgScale: parseFloat(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        )}

        {/* Session Settings */}
        {activeTab === 'session' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Настройки сессии</h3>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.session.persistImages}
                onChange={e => setSettings(prev => ({
                  ...prev,
                  session: { ...prev.session, persistImages: e.target.checked }
                }))}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">
                Сохранять изображения между сессиями
              </label>
            </div>

            {!settings.s3.enabled && !settings.session.persistImages && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  ⚠️ Изображения будут удалены после завершения сессии. Включите S3 или сохранение для постоянного хранения.
                </p>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.session.autoSaveToBitrix}
                onChange={e => setSettings(prev => ({
                  ...prev,
                  session: { ...prev.session, autoSaveToBitrix: e.target.checked }
                }))}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">
                Автоматически сохранять в Bitrix24 после генерации
              </label>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </div>
      </div>
    </div>
  );
};
