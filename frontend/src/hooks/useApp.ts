import { useState, useCallback } from 'react';

export function useApp() {
  const [activeTab, setActiveTab] = useState<string>('creation');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpSection, setHelpSection] = useState<string>('creation');

  const toggleHelp = useCallback(() => {
    setIsHelpOpen((prev) => !prev);
    // Sync help section with active tab
    setHelpSection(activeTab);
  }, [activeTab]);

  const closeHelp = useCallback(() => {
    setIsHelpOpen(false);
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    // Update help section when tab changes and panel is open
    if (isHelpOpen) {
      setHelpSection(tab);
    }
  }, [isHelpOpen]);

  return {
    activeTab,
    isHelpOpen,
    helpSection,
    setActiveTab: handleTabChange,
    toggleHelp,
    closeHelp,
  };
}
