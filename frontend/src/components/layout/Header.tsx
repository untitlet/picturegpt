import React, { useState, useEffect } from 'react';
import { HelpPanel } from '../help/HelpPanel';
import './Header.css';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onHelpToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onHelpToggle }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const tabs = [
    { id: 'creation', label: 'Создание', icon: '🎨' },
    { id: 'presets', label: 'Пресеты', icon: '📋' },
    { id: 'settings', label: 'Настройки', icon: '⚙️' },
    { id: 'catalog', label: 'Каталог', icon: '📦' },
  ];

  return (
    <header className="bx-header">
      <div className="bx-header-left">
        <div className="bx-logo">
          <span className="bx-logo-icon">🤖</span>
          <span className="bx-logo-text">AI Generator</span>
        </div>
      </div>

      <nav className="bx-header-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`bx-header-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="bx-tab-icon">{tab.icon}</span>
            <span className="bx-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="bx-header-right">
        <button 
          className="bx-header-help-btn"
          onClick={onHelpToggle}
          title="Помощь"
        >
          <span className="bx-help-icon">❓</span>
        </button>

        <div className="bx-user-menu">
          <button 
            className="bx-user-avatar"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <img src="https://via.placeholder.com/32" alt="User" />
          </button>
          
          {userMenuOpen && (
            <div className="bx-user-dropdown">
              <div className="bx-dropdown-item">Профиль</div>
              <div className="bx-dropdown-item">Настройки</div>
              <div className="bx-dropdown-divider"></div>
              <div className="bx-dropdown-item danger">Выйти</div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
