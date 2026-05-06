import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { bitrixApi } from '../api';

export function SettingsPage() {
  const { outputParams, aiModels, loadSettings, updateOutputParams } = useAppStore();
  const [bitrixStatus, setBitrixStatus] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const handleConnectBitrix = async () => {
    try {
      const { url } = await bitrixApi.getOAuthUrl();
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to get Bitrix OAuth URL:', error);
    }
  };

  const handleLoadBitrixStatus = async () => {
    setLoading(true);
    try {
      const status = await bitrixApi.getStatus();
      setBitrixStatus(status);
    } catch (error) {
      console.error('Failed to load Bitrix status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bitrix24 Integration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Bitrix24 Integration</h2>
        
        <div className="space-y-4">
          <button
            onClick={handleConnectBitrix}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Connect Bitrix24
          </button>

          <button
            onClick={handleLoadBitrixStatus}
            disabled={loading}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Check Connection Status'}
          </button>

          {bitrixStatus && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(bitrixStatus, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* AI Models Configuration */}
      {aiModels && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">AI Models</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preset Model
              </label>
              <input
                type="text"
                value={aiModels.presetModel}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generation Model
              </label>
              <input
                type="text"
                value={aiModels.generationModel}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Edit Model
              </label>
              <input
                type="text"
                value={aiModels.editModel}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Output Parameters */}
      {outputParams && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Output Parameters</h2>
          
          <div className="space-y-6">
            {/* Sizes */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Available Sizes</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {outputParams.sizes.map((size, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="font-medium">{size.name}</div>
                    <div className="text-sm text-gray-500">
                      {size.width} × {size.height}px
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Margins */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Default Margins (cm)</h3>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(outputParams.margins).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm text-gray-600 capitalize mb-1">
                      {key}
                    </label>
                    <input
                      type="number"
                      value={value}
                      readOnly
                      className="w-full border rounded-lg p-2 bg-gray-50"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Quality Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">CFG Scale</label>
                  <input
                    type="number"
                    value={outputParams.quality.cfgScale}
                    readOnly
                    className="w-full border rounded-lg p-2 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Steps</label>
                  <input
                    type="number"
                    value={outputParams.quality.steps}
                    readOnly
                    className="w-full border rounded-lg p-2 bg-gray-50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
