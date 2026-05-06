import React, { useEffect } from 'react';
import './HelpPanel.css';

export interface HelpTopic {
  id: string;
  title: string;
  content: string;
  relatedTopics?: string[];
}

export interface HelpSection {
  id: string;
  title: string;
  topics: HelpTopic[];
}

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection?: string;
  sections: HelpSection[];
}

export const HelpPanel: React.FC<HelpPanelProps> = ({
  isOpen,
  onClose,
  activeSection = 'creation',
  sections,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedTopic, setExpandedTopic] = React.useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Get current section
  const currentSection = sections.find(s => s.id === activeSection) || sections[0];

  // Filter topics by search
  const filteredTopics = searchQuery
    ? currentSection.topics.filter(
        topic =>
          topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          topic.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentSection.topics;

  if (!isOpen) return null;

  return (
    <div className="bx-help-overlay" onClick={onClose}>
      <div className="bx-help-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bx-help-header">
          <h2 className="bx-help-title">Помощь</h2>
          <button className="bx-help-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="bx-help-search">
          <input
            type="text"
            className="bx-input"
            placeholder="Поиск по разделу..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Section Info */}
        <div className="bx-help-section-info">
          <span className="bx-badge bx-badge-info">
            {currentSection.title}
          </span>
        </div>

        {/* Topics List */}
        <div className="bx-help-content">
          {filteredTopics.length === 0 ? (
            <div className="bx-help-empty">
              <p>Ничего не найдено</p>
            </div>
          ) : (
            filteredTopics.map(topic => (
              <div
                key={topic.id}
                className={`bx-help-topic ${
                  expandedTopic === topic.id ? 'expanded' : ''
                }`}
              >
                <button
                  className="bx-help-topic-header"
                  onClick={() =>
                    setExpandedTopic(
                      expandedTopic === topic.id ? null : topic.id
                    )
                  }
                >
                  <span className="bx-help-topic-title">{topic.title}</span>
                  <span className="bx-help-topic-toggle">
                    {expandedTopic === topic.id ? '−' : '+'}
                  </span>
                </button>

                {expandedTopic === topic.id && (
                  <div className="bx-help-topic-content bx-animate-fade-in">
                    <p>{topic.content}</p>
                    {topic.relatedTopics && topic.relatedTopics.length > 0 && (
                      <div className="bx-help-related">
                        <strong>Смотрите также:</strong>
                        <ul>
                          {topic.relatedTopics.map((related, idx) => (
                            <li key={idx}>{related}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bx-help-footer">
          <p>Нужна дополнительная помощь?</p>
          <a href="mailto:support@example.com" className="bx-btn bx-btn-primary">
            Связаться с поддержкой
          </a>
        </div>
      </div>
    </div>
  );
};
