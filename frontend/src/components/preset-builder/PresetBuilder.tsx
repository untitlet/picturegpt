import React, { useState } from 'react';
import { Plus, Save, Trash2, Edit2 } from 'lucide-react';

interface PresetBuilderProps {
  onSave: (preset: PresetData) => void;
  onCancel: () => void;
}

export interface PresetData {
  name: string;
  basePrompt: string;
  systemPrompt: string;
  referenceImageUrl?: string;
  aiModelPreset: string;
  parameters: {
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
    seed?: number;
  };
  negativePrompt?: string;
}

const DEFAULT_PARAMETERS = {
  width: 1024,
  height: 1024,
  steps: 30,
  cfgScale: 7.5,
};

export const PresetBuilder: React.FC<PresetBuilderProps> = ({
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<PresetData>({
    name: '',
    basePrompt: '',
    systemPrompt: '',
    aiModelPreset: 'stabilityai/stable-diffusion-xl',
    parameters: DEFAULT_PARAMETERS,
    negativePrompt: '',
  });

  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const updateParameter = (key: keyof typeof formData.parameters, value: number) => {
    setFormData((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real app, upload the reference image here and get URL
    let referenceImageUrl = formData.referenceImageUrl;
    if (referenceImage) {
      // Upload logic would go here
      console.log('Would upload:', referenceImage);
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Create New Preset</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formData.name || !formData.basePrompt}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Preset
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Preset Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded dark:border-gray-700 dark:bg-gray-800"
                  placeholder="e.g., Product Photography"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  AI Model
                </label>
                <select
                  value={formData.aiModelPreset}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      aiModelPreset: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="stabilityai/stable-diffusion-xl">
                    Stable Diffusion XL
                  </option>
                  <option value="midjourney/midjourney-v5">
                    Midjourney v5
                  </option>
                  <option value="openai/dall-e-3">
                    DALL-E 3
                  </option>
                </select>
              </div>
            </div>

            {/* Reference Image */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Reference Image (Optional)
              </label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Reference"
                      className="max-h-48 mx-auto rounded"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setReferenceImage(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Plus className="w-8 h-8 mx-auto text-gray-400" />
                    <span className="text-sm text-gray-500">
                      Click to upload or drag and drop
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Prompts */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Base Prompt *
                </label>
                <textarea
                  value={formData.basePrompt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      basePrompt: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded dark:border-gray-700 dark:bg-gray-800 min-h-[100px]"
                  placeholder="Describe what you want to generate..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  System Prompt
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      systemPrompt: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded dark:border-gray-700 dark:bg-gray-800 min-h-[60px]"
                  placeholder="Additional context for the AI model..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Negative Prompt
                </label>
                <textarea
                  value={formData.negativePrompt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      negativePrompt: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded dark:border-gray-700 dark:bg-gray-800 min-h-[60px]"
                  placeholder="What to avoid in the generation..."
                />
              </div>
            </div>

            {/* Parameters */}
            <div className="border-t dark:border-gray-700 pt-4">
              <h3 className="font-semibold mb-4">Generation Parameters</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    value={formData.parameters.width}
                    onChange={(e) =>
                      updateParameter('width', parseInt(e.target.value) || 1024)
                    }
                    className="w-full px-3 py-2 border rounded dark:border-gray-700 dark:bg-gray-800"
                    min="256"
                    max="2048"
                    step="64"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={formData.parameters.height}
                    onChange={(e) =>
                      updateParameter('height', parseInt(e.target.value) || 1024)
                    }
                    className="w-full px-3 py-2 border rounded dark:border-gray-700 dark:bg-gray-800"
                    min="256"
                    max="2048"
                    step="64"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Steps
                  </label>
                  <input
                    type="number"
                    value={formData.parameters.steps}
                    onChange={(e) =>
                      updateParameter('steps', parseInt(e.target.value) || 30)
                    }
                    className="w-full px-3 py-2 border rounded dark:border-gray-700 dark:bg-gray-800"
                    min="1"
                    max="150"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    CFG Scale
                  </label>
                  <input
                    type="number"
                    value={formData.parameters.cfgScale}
                    onChange={(e) =>
                      updateParameter(
                        'cfgScale',
                        parseFloat(e.target.value) || 7.5
                      )
                    }
                    className="w-full px-3 py-2 border rounded dark:border-gray-700 dark:bg-gray-800"
                    min="1"
                    max="20"
                    step="0.5"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
