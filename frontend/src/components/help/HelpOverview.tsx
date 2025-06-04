import React from 'react';
import { HelpSection, UserRole } from '../../types/help';
import { featuredArticles, quickLinks } from '../../services/helpData';

interface HelpOverviewProps {
  sections: HelpSection[];
  userRole: UserRole;
  onSectionSelect: (sectionId: string) => void;
  onArticleSelect: (articleId: string) => void;
}

export const HelpOverview: React.FC<HelpOverviewProps> = ({
  sections,
  userRole,
  onSectionSelect,
  onArticleSelect
}) => {
  const roleEmojis = {
    student: '👨‍🎓',
    teacher: '👩‍🏫',
    parent: '👨‍👩‍👧‍👦',
    admin: '⚙️'
  };

  const roleDisplayNames = {
    student: 'Student',
    teacher: 'Teacher',
    parent: 'Parent',
    admin: 'Administrator'
  };

  // Filter featured articles for current role
  const roleFeaturedArticles = featuredArticles.filter(article => 
    article.targetRoles.includes(userRole)
  );

  // Filter quick links for current role
  const roleQuickLinks = quickLinks.filter(link => 
    link.roles.includes(userRole)
  );

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 text-white">
        <div className="flex items-center space-x-3 mb-4">
          <span className="text-4xl">{roleEmojis[userRole]}</span>
          <div>
            <h1 className="text-3xl font-bold">Welcome, {roleDisplayNames[userRole]}!</h1>
            <p className="text-blue-100 mt-2">
              Find everything you need to make the most of Mentra
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-2xl mb-2">🚀</div>
            <h3 className="font-semibold mb-1">Getting Started</h3>
            <p className="text-sm text-blue-100">New to Mentra? Start here</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-2xl mb-2">📖</div>
            <h3 className="font-semibold mb-1">User Guides</h3>
            <p className="text-sm text-blue-100">Step-by-step instructions</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-2xl mb-2">🔧</div>
            <h3 className="font-semibold mb-1">Support</h3>
            <p className="text-sm text-blue-100">Get help when you need it</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {roleQuickLinks.map((link, index) => (
            <button
              key={index}
              onClick={() => {
                // Extract article ID from path
                const articleId = link.path.split('/').pop();
                if (articleId) {
                  onArticleSelect(articleId);
                }
              }}
              className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <div className="font-medium text-gray-800">{link.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Featured Articles */}
      {roleFeaturedArticles.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Featured Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roleFeaturedArticles.slice(0, 4).map((article) => (
              <div
                key={article.id}
                onClick={() => onArticleSelect(article.id)}
                className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 text-lg leading-tight">
                    {article.title}
                  </h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex-shrink-0 ml-2">
                    {article.readTime} min
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {article.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-blue-600 text-sm font-medium">Read →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Sections */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div
              key={section.id}
              onClick={() => onSectionSelect(section.id)}
              className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">{section.icon}</span>
                <h3 className="font-semibold text-gray-800">{section.title}</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                {section.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {section.articles.length} articles
                </span>
                <span className="text-blue-600 text-sm font-medium">Browse →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Topics */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Popular Topics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Password Reset', query: 'password reset' },
            { label: 'Getting Started', query: 'getting started' },
            { label: 'Privacy & Safety', query: 'privacy safety' },
            { label: 'Browser Support', query: 'browser support' },
            { label: 'Mobile Access', query: 'mobile' },
            { label: 'Account Settings', query: 'account' },
            { label: 'AI Helper', query: 'ai helper' },
            { label: 'Troubleshooting', query: 'troubleshooting' }
          ].map((topic) => (
            <button
              key={topic.label}
              className="text-left text-sm text-gray-600 hover:text-blue-600 transition-colors"
              onClick={() => {
                // This would trigger a search - implement search logic here
                window.dispatchEvent(new CustomEvent('help-search', { detail: topic.query }));
              }}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Updates */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recently Updated</h2>
        <div className="space-y-3">
          {roleFeaturedArticles.slice(0, 3).map((article) => (
            <div
              key={article.id}
              onClick={() => onArticleSelect(article.id)}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <h3 className="font-medium text-gray-800">{article.title}</h3>
                <p className="text-sm text-gray-600 mt-1">Updated {article.lastUpdated}</p>
              </div>
              <span className="text-blue-600 text-sm font-medium">Read →</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 