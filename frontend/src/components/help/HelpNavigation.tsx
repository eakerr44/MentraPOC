import React, { useState } from 'react';
import { HelpSection, UserRole } from '../../types/help';

interface HelpNavigationProps {
  sections: HelpSection[];
  currentSection?: string;
  currentArticle?: string;
  onSectionSelect: (sectionId: string) => void;
  onArticleSelect: (articleId: string) => void;
  selectedRole: UserRole;
}

export const HelpNavigation: React.FC<HelpNavigationProps> = ({
  sections,
  currentSection,
  currentArticle,
  onSectionSelect,
  onArticleSelect,
  selectedRole
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const getRoleDisplayName = (role: UserRole) => {
    const displayNames = {
      student: 'Student',
      teacher: 'Teacher',
      parent: 'Parent',
      admin: 'Administrator'
    };
    return displayNames[role];
  };

  const getRoleEmoji = (role: UserRole) => {
    const emojis = {
      student: '👨‍🎓',
      teacher: '👩‍🏫',
      parent: '👨‍👩‍👧‍👦',
      admin: '⚙️'
    };
    return emojis[role];
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-lg">{getRoleEmoji(selectedRole)}</span>
          <h2 className="font-semibold text-gray-800">{getRoleDisplayName(selectedRole)} Help</h2>
        </div>
        <p className="text-sm text-gray-600">
          Browse articles and guides for {selectedRole}s
        </p>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors">
            🔍 Search Help Articles
          </button>
          <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors">
            📞 Contact Support
          </button>
          <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors">
            💬 Give Feedback
          </button>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="p-2">
        <nav className="space-y-1">
          {sections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const isCurrentSection = currentSection === section.id;
            const hasCurrentArticle = section.articles.some(article => article.id === currentArticle);

            return (
              <div key={section.id}>
                {/* Section Header */}
                <button
                  onClick={() => {
                    toggleSection(section.id);
                    onSectionSelect(section.id);
                  }}
                  className={`w-full flex items-center justify-between p-3 text-left rounded-lg transition-colors ${
                    isCurrentSection || hasCurrentArticle
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{section.icon}</span>
                    <div>
                      <div className="font-medium">{section.title}</div>
                      <div className="text-xs text-gray-500">
                        {section.articles.length} article{section.articles.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* Section Articles */}
                {isExpanded && (
                  <div className="ml-6 mt-2 space-y-1">
                    {section.articles.map((article) => {
                      const isCurrentArticle = currentArticle === article.id;
                      
                      return (
                        <button
                          key={article.id}
                          onClick={() => onArticleSelect(article.id)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            isCurrentArticle
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm mb-1">
                                {article.title}
                              </div>
                              <div className="text-xs text-gray-500 line-clamp-2">
                                {article.description}
                              </div>
                              <div className="flex items-center space-x-2 mt-2">
                                {article.featured && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                    ⭐
                                  </span>
                                )}
                                <span className="text-xs text-gray-400">
                                  {article.readTime} min
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Help Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Help Statistics</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Articles:</span>
            <span className="font-medium text-gray-800">
              {sections.reduce((total, section) => total + section.articles.length, 0)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Categories:</span>
            <span className="font-medium text-gray-800">{sections.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Featured:</span>
            <span className="font-medium text-gray-800">
              {sections.reduce((total, section) => 
                total + section.articles.filter(article => article.featured).length, 0
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Role-Specific Tips */}
      <div className="p-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {getRoleDisplayName(selectedRole)} Tips
        </h3>
        <div className="space-y-2">
          {selectedRole === 'student' && (
            <>
              <div className="text-xs text-gray-600 p-2 bg-blue-50 rounded">
                💡 Start with "Getting Started" if you're new to Mentra
              </div>
              <div className="text-xs text-gray-600 p-2 bg-green-50 rounded">
                📝 Check out the journaling guide for daily reflection tips
              </div>
            </>
          )}
          {selectedRole === 'teacher' && (
            <>
              <div className="text-xs text-gray-600 p-2 bg-blue-50 rounded">
                🎯 Use classroom management tools for better student engagement
              </div>
              <div className="text-xs text-gray-600 p-2 bg-purple-50 rounded">
                📊 Monitor student progress with dashboard analytics
              </div>
            </>
          )}
          {selectedRole === 'parent' && (
            <>
              <div className="text-xs text-gray-600 p-2 bg-blue-50 rounded">
                👀 Learn to read your child's engagement levels
              </div>
              <div className="text-xs text-gray-600 p-2 bg-orange-50 rounded">
                🏠 Find tips for supporting learning at home
              </div>
            </>
          )}
          {selectedRole === 'admin' && (
            <>
              <div className="text-xs text-gray-600 p-2 bg-red-50 rounded">
                ⚙️ Check setup guides for system configuration
              </div>
              <div className="text-xs text-gray-600 p-2 bg-yellow-50 rounded">
                🔧 Use troubleshooting guides for common issues
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500 mb-2">
          Can't find what you're looking for?
        </p>
        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
          Submit a Help Request →
        </button>
      </div>
    </div>
  );
}; 