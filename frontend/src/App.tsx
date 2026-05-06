import React from 'react';
import { Header } from './components/layout/Header';
import { HelpPanel } from './components/help/HelpPanel';
import { useApp } from './hooks/useApp';
import { getAllHelpSections } from './data/help-content';
import './styles/bitrix-theme.css';

// Placeholder components for tabs
const CreationTab = () => (
  <div className="bx-container" style={{ padding: '2rem' }}>
    <h1>Создание изображений</h1>
    <p className="bx-gray-600">Интерфейс генерации изображений с загрузкой файлов, выбором пресетов и настройками</p>
  </div>
);

const PresetsTab = () => (
  <div className="bx-container" style={{ padding: '2rem' }}>
    <h1>Пресеты</h1>
    <p className="bx-gray-600">Управление пресетами: создание, редактирование, удаление</p>
  </div>
);

const SettingsTab = () => (
  <div className="bx-container" style={{ padding: '2rem' }}>
    <h1>Настройки</h1>
    <p className="bx-gray-600">Интеграция с Bitrix24, AI модели, параметры вывода, безопасность</p>
  </div>
);

const CatalogTab = () => (
  <div className="bx-container" style={{ padding: '2rem' }}>
    <h1>Каталог возможностей</h1>
    <p className="bx-gray-600">Полный обзор всех функций системы</p>
  </div>
);

function App() {
  const { activeTab, isHelpOpen, helpSection, setActiveTab, closeHelp, toggleHelp } = useApp();
  const helpSections = getAllHelpSections();

  const renderTab = () => {
    switch (activeTab) {
      case 'creation':
        return <CreationTab />;
      case 'presets':
        return <PresetsTab />;
      case 'settings':
        return <SettingsTab />;
      case 'catalog':
        return <CatalogTab />;
      default:
        return <CreationTab />;
    }
  };

  return (
    <div className="app">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onHelpToggle={() => toggleHelp()}
      />
      
      <main className="app-main">
        {renderTab()}
      </main>

      <HelpPanel
        isOpen={isHelpOpen}
        onClose={closeHelp}
        activeSection={helpSection}
        sections={helpSections}
      />
    </div>
  );
}

export default App;
