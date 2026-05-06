import React, { useMemo } from 'react';

interface HelpTopic {
  id: string;
  title: string;
  content: string;
  related?: string[];
}

interface HelpSection {
  id: string;
  title: string;
  description: string;
  topics: HelpTopic[];
}

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: string;
  sections: HelpSection[];
}

export const HelpPanel: React.FC<HelpPanelProps> = ({
  isOpen,
  onClose,
  activeSection,
  sections,
}) => {
  const [expandedTopic, setExpandedTopic] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const currentSection = useMemo(() => {
    return sections.find((s) => s.id === activeSection);
  }, [sections, activeSection]);

  const filteredTopics = useMemo(() => {
    if (!currentSection || !searchQuery) return currentSection?.topics || [];
    const query = searchQuery.toLowerCase();
    return currentSection.topics.filter(
      (topic) =>
        topic.title.toLowerCase().includes(query) ||
        topic.content.toLowerCase().includes(query)
    );
  }, [currentSection, searchQuery]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={`
          fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {currentSection?.title || 'Помощь'}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {currentSection?.description || 'Выберите раздел для получения помощи'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Поиск по темам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ui-input pl-10"
              />
            </div>
          </div>

          {/* Topics List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredTopics.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium">Ничего не найдено</p>
                <p className="text-sm text-slate-400 mt-1">Попробуйте изменить запрос</p>
              </div>
            ) : (
              filteredTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="ui-card overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium text-slate-900 text-left">{topic.title}</span>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        expandedTopic === topic.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedTopic === topic.id && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                        {topic.content}
                      </p>
                      {topic.related && topic.related.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Смотрите также:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {topic.related.map((rel) => (
                              <span
                                key={rel}
                                className="ui-badge bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100"
                              >
                                {rel}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Нужна дополнительная помощь? Обратитесь в поддержку.</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
