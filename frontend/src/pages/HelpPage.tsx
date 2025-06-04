import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HelpOverview } from '../components/help/HelpOverview';
import { HelpSearch } from '../components/help/HelpSearch';
import { HelpArticleView } from '../components/help/HelpArticleView';
import { HelpNavigation } from '../components/help/HelpNavigation';
import { helpArticles, helpSections } from '../services/helpData';
import { HelpSearchService } from '../services/helpSearch';
import { UserRole } from '../types/help';

interface HelpPageProps {
  userRole?: UserRole;
}

export const HelpPage: React.FC<HelpPageProps> = ({ userRole = 'student' }) => {
  const { articleId, section } = useParams<{ articleId?: string; section?: string }>();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(userRole);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Get current article if viewing one
  const currentArticle = articleId ? helpArticles.find(a => a.id === articleId) : null;

  // Filter sections based on selected role
  const filteredSections = helpSections.filter(section => 
    section.targetRoles.includes(selectedRole)
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearchMode(query.length > 0);
    if (query.length > 0) {
      navigate('/help/search');
    } else {
      navigate('/help');
    }
  };

  const handleArticleSelect = (articleId: string) => {
    navigate(`/help/article/${articleId}`);
    setIsSearchMode(false);
    setSearchQuery('');
  };

  const handleSectionSelect = (sectionId: string) => {
    navigate(`/help/section/${sectionId}`);
    setIsSearchMode(false);
    setSearchQuery('');
  };

  const handleBackToOverview = () => {
    navigate('/help');
    setIsSearchMode(false);
    setSearchQuery('');
  };

  useEffect(() => {
    // Update search mode based on URL
    if (window.location.pathname.includes('/search')) {
      setIsSearchMode(true);
    } else {
      setIsSearchMode(false);
    }
  }, [window.location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToOverview}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <span className="text-2xl">📚</span>
                <h1 className="text-xl font-semibold text-gray-800">Mentra Help Center</h1>
              </button>
              
              {currentArticle && (
                <nav className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-400">/</span>
                  <button
                    onClick={handleBackToOverview}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Help Center
                  </button>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-600 truncate max-w-xs">
                    {currentArticle.title}
                  </span>
                </nav>
              )}
            </div>

            {/* Role Selector */}
            <div className="flex items-center space-x-4">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="student">👨‍🎓 Student</option>
                <option value="teacher">👩‍🏫 Teacher</option>
                <option value="parent">👨‍👩‍👧‍👦 Parent</option>
                <option value="admin">⚙️ Admin</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <HelpNavigation
              sections={filteredSections}
              currentSection={section}
              currentArticle={articleId}
              onSectionSelect={handleSectionSelect}
              onArticleSelect={handleArticleSelect}
              selectedRole={selectedRole}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-4xl">
            {/* Search Bar */}
            <div className="mb-8">
              <HelpSearch
                query={searchQuery}
                onSearch={handleSearch}
                userRole={selectedRole}
                placeholder={`Search help articles for ${selectedRole}s...`}
              />
            </div>

            {/* Content Area */}
            {currentArticle ? (
              <HelpArticleView
                article={currentArticle}
                userRole={selectedRole}
                onRelatedArticleClick={handleArticleSelect}
              />
            ) : isSearchMode ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Search Results</h2>
                <HelpSearch
                  query={searchQuery}
                  onSearch={handleSearch}
                  userRole={selectedRole}
                  showResults={true}
                  onArticleSelect={handleArticleSelect}
                />
              </div>
            ) : (
              <HelpOverview
                sections={filteredSections}
                userRole={selectedRole}
                onSectionSelect={handleSectionSelect}
                onArticleSelect={handleArticleSelect}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Need More Help?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Can't find what you're looking for? Contact your teacher or school support.
              </p>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Contact Support →
              </button>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Quick Links</h3>
              <div className="space-y-2">
                {['Password Reset', 'Getting Started', 'Privacy & Safety', 'Browser Support'].map((link) => (
                  <button
                    key={link}
                    onClick={() => handleSearch(link.toLowerCase())}
                    className="block text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    {link}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Documentation</h3>
              <div className="space-y-2">
                <a href="/help/api-docs" className="block text-sm text-gray-600 hover:text-gray-800 transition-colors">
                  API Documentation
                </a>
                <a href="/help/setup-guide" className="block text-sm text-gray-600 hover:text-gray-800 transition-colors">
                  Setup Guide
                </a>
                <a href="/help/troubleshooting" className="block text-sm text-gray-600 hover:text-gray-800 transition-colors">
                  Troubleshooting
                </a>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Mentra Help Center • Last updated January 15, 2024 • 
              <button className="text-blue-600 hover:text-blue-800 ml-1">
                Report an issue
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 