import React from 'react';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onHelpToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onHelpToggle }) => {
  const tabs = [
    { id: 'creation', label: 'Создание', icon: '🎨' },
    { id: 'presets', label: 'Пресеты', icon: '📋' },
    { id: 'settings', label: 'Настройки', icon: '⚙️' },
    { id: 'catalog', label: 'Каталог', icon: '📦' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">AI Generator</h1>
              <p className="text-xs text-slate-500 -mt-0.5">Bitrix24 Integration</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${activeTab === tab.id 
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Right Actions: Only Help Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={onHelpToggle}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200"
              title="Помощь и документация"
            >
              <span className="text-lg">❓</span>
              <span className="hidden sm:inline">Помощь</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
