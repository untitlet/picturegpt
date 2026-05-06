import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '../store/appStore';
import { generationsApi } from '../api';

interface GenerationFormProps {
  onSuccess?: () => void;
}

export function GenerationForm({ onSuccess }: GenerationFormProps) {
  const { presets, selectedPresetId, selectPreset, outputParams, loadGenerations } = useAppStore();
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedSize, setSelectedSize] = useState(0);
  const [quality, setQuality] = useState(7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<Array<{ file: File; preview: string }>>([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    multiple: true,
    onDrop: (acceptedFiles) => {
      const newImages = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setUploadedImages(prev => [...prev, ...newImages]);
    },
  });

  const removeImage = (index: number) => {
    setUploadedImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setIsGenerating(true);

    try {
      const size = outputParams?.sizes?.[selectedSize] || { width: 1024, height: 1024 };
      
      // For now, we'll use a placeholder userId - in production this would come from auth
      const userId = 'user_' + Date.now();

      await generationsApi.create({
        userId,
        presetId: selectedPresetId,
        prompt,
        negativePrompt: negativePrompt || undefined,
        model: 'stability/stable-diffusion-xl-base-1.0',
        width: size.width,
        height: size.height,
        quality,
      });

      // Reset form
      setPrompt('');
      setNegativePrompt('');
      setUploadedImages([]);
      
      // Reload generations
      await loadGenerations();
      
      // Notify parent
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create generation:', error);
      alert('Failed to create generation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      selectPreset(presetId);
      setPrompt(preset.basePrompt);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reference Images (optional)
        </label>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <p className="text-gray-500">
            {isDragActive ? 'Drop images here...' : 'Drag & drop images here, or click to select'}
          </p>
        </div>

        {uploadedImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {uploadedImages.map((img, index) => (
              <div key={index} className="relative">
                <img src={img.preview} alt="" className="h-20 w-20 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preset Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preset
        </label>
        <select
          value={selectedPresetId || ''}
          onChange={(e) => handleSelectPreset(e.target.value)}
          className="w-full border rounded-lg p-2"
        >
          <option value="">No preset</option>
          {presets.map(preset => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      {/* Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prompt *
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to generate..."
          className="w-full border rounded-lg p-3"
          rows={4}
          required
        />
      </div>

      {/* Negative Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Negative Prompt (optional)
        </label>
        <textarea
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="What to avoid in the image..."
          className="w-full border rounded-lg p-3"
          rows={2}
        />
      </div>

      {/* Size and Quality */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Size
          </label>
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(Number(e.target.value))}
            className="w-full border rounded-lg p-2"
          >
            {outputParams?.sizes?.map((size, index) => (
              <option key={index} value={index}>
                {size.name} ({size.width}x{size.height})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quality: {quality}/10
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isGenerating || !prompt.trim()}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
      >
        {isGenerating ? 'Generating...' : 'Generate'}
      </button>
    </form>
  );
}
