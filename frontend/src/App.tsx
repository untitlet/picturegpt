import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { CreatePage } from './pages/CreatePage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  const { activeTab, setActiveTab, loadPresets, loadSettings } = useAppStore();

  useEffect(() => {
    loadPresets();
    loadSettings();
  }, []);

  const tabs = [
    { id: 'create' as const, label: 'Создание', icon: '🎨' },
    { id: 'presets' as const, label: 'Пресеты', icon: '📋' },
    { id: 'settings' as const, label: 'Настройки', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with Tabs */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-500">AI Image Generator</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'create' && <CreatePage />}
        {activeTab === 'presets' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Пресеты</h2>
            <p className="text-gray-500">Пресеты будут доступны здесь. Используйте форму создания для добавления пресетов.</p>
          </div>
        )}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}

export default App;
