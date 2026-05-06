import React, { useState } from 'react';
import { X, ZoomIn, Zap } from 'lucide-react';

interface ImageVariant {
  id: string;
  url: string;
  prompt: string;
  model: string;
  parameters: {
    width: number;
    height: number;
    steps?: number;
    cfg?: number;
  };
  metrics?: {
    generationTime: number;
    cost: number;
  };
}

interface ComparisonModalProps {
  variants: ImageVariant[];
  onClose: () => void;
  onSelectVariant?: (variant: ImageVariant) => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  variants,
  onClose,
  onSelectVariant,
}) => {
  const [viewMode, setViewMode] = useState<'side' | 'grid'>('side');
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const handleSelect = (variant: ImageVariant) => {
    if (onSelectVariant) {
      onSelectVariant(variant);
    }
    setSelectedVariant(variant.id);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold">Compare Variants ({variants.length})</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('side')}
              className={`px-3 py-1 rounded ${
                viewMode === 'side'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              Grid View
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Area */}
        <div className="flex-1 overflow-auto p-4">
          {viewMode === 'side' ? (
            <div className="flex gap-4 h-full">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className={`flex-1 min-w-0 border-2 rounded-lg overflow-hidden ${
                    selectedVariant === variant.id
                      ? 'border-blue-500'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <div className="relative h-full">
                    <img
                      src={variant.url}
                      alt={variant.prompt}
                      className="w-full h-full object-contain"
                    />
                    {onSelectVariant && (
                      <button
                        onClick={() => handleSelect(variant)}
                        className="absolute bottom-2 right-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Select
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className={`border-2 rounded-lg overflow-hidden cursor-pointer ${
                    selectedVariant === variant.id
                      ? 'border-blue-500'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                  onClick={() => handleSelect(variant)}
                >
                  <img
                    src={variant.url}
                    alt={variant.prompt}
                    className="w-full aspect-square object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Variant Details */}
        <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
          <h3 className="font-semibold mb-2">Variant Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {variants.map((variant) => (
              <div
                key={variant.id}
                className={`p-3 rounded-lg ${
                  selectedVariant === variant.id
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : 'bg-white dark:bg-gray-700'
                }`}
              >
                <div className="text-sm font-medium truncate">{variant.model}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {variant.parameters.width}x{variant.parameters.height}
                </div>
                {variant.metrics && (
                  <>
                    <div className="text-xs text-gray-500">
                      Time: {(variant.metrics.generationTime / 1000).toFixed(1)}s
                    </div>
                    <div className="text-xs text-gray-500">
                      Cost: ${variant.metrics.cost.toFixed(4)}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
