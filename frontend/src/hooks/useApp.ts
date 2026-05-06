import { useState, useCallback } from 'react';
import { HelpSection } from '../components/help/HelpPanel';

interface AppState {
  activeTab: string;
  isHelpOpen: boolean;
  helpSection: string;
}

export const useApp = () => {
  const [state, setState] = useState<AppState>({
    activeTab: 'creation',
    isHelpOpen: false,
    helpSection: 'creation',
  });

  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({
      ...prev,
      activeTab: tab,
      helpSection: tab, // Автоматически переключаем раздел помощи
    }));
  }, []);

  const openHelp = useCallback((sectionId?: string) => {
    setState(prev => ({
      ...prev,
      isHelpOpen: true,
      helpSection: sectionId || prev.helpSection,
    }));
  }, []);

  const closeHelp = useCallback(() => {
    setState(prev => ({
      ...prev,
      isHelpOpen: false,
    }));
  }, []);

  const toggleHelp = useCallback((sectionId?: string) => {
    setState(prev => {
      const shouldOpen = !prev.isHelpOpen;
      return {
        ...prev,
        isHelpOpen: shouldOpen,
        helpSection: sectionId || prev.helpSection,
      };
    });
  }, []);

  return {
    activeTab: state.activeTab,
    isHelpOpen: state.isHelpOpen,
    helpSection: state.helpSection,
    setActiveTab,
    openHelp,
    closeHelp,
    toggleHelp,
  };
};
