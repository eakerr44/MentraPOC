import React, { useEffect, useState } from 'react';
import { HelpArticle, UserRole } from '../../types/help';
import { HelpSearchService } from '../../services/helpSearch';

interface HelpArticleViewProps {
  article: HelpArticle;
  userRole: UserRole;
  onRelatedArticleClick: (articleId: string) => void;
}

export const HelpArticleView: React.FC<HelpArticleViewProps> = ({
  article,
  userRole,
  onRelatedArticleClick
}) => {
  const [relatedArticles, setRelatedArticles] = useState<HelpArticle[]>([]);
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null);

  useEffect(() => {
    const related = HelpSearchService.getRelatedArticles(article.id);
    setRelatedArticles(related);
  }, [article.id]);

  const handleFeedback = (helpful: boolean) => {
    setIsHelpful(helpful);
    // In a real app, this would send feedback to analytics
    console.log(`Article ${article.id} marked as ${helpful ? 'helpful' : 'not helpful'}`);
  };

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    let formattedContent = content
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-gray-800 mt-8 mb-4">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold text-gray-800 mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-gray-800 mt-8 mb-6">$1</h1>')
      // Bold text
      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold text-gray-900">$1</strong>')
      // Code blocks
      .replace(/```bash\n([\s\S]*?)\n```/gim, '<pre class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono my-4"><code>$1</code></pre>')
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono my-4"><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/gim, '<code class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">$1</code>')
      // Lists
      .replace(/^- (.*$)/gim, '<li class="ml-4 mb-2">• $1</li>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-4">')
      // Wrap in paragraphs
      .replace(/^(.+)$/gm, '<p class="mb-4">$1</p>');

    return formattedContent;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      'user-guide': 'bg-blue-100 text-blue-800',
      'quick-reference': 'bg-green-100 text-green-800',
      'faq': 'bg-purple-100 text-purple-800',
      'troubleshooting': 'bg-red-100 text-red-800',
      'api-docs': 'bg-gray-100 text-gray-800',
      'setup-guide': 'bg-yellow-100 text-yellow-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'getting-started': '🚀',
      'daily-use': '📚',
      'advanced-features': '⚙️',
      'troubleshooting': '🔧',
      'account-management': '👤',
      'privacy-safety': '🔒',
      'technical-support': '💻'
    };
    return icons[category as keyof typeof icons] || '📄';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Article Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl">{getCategoryIcon(article.category)}</span>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${getTypeColor(article.type)}`}>
                {article.type.replace('-', ' ').toUpperCase()}
              </span>
              {article.featured && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">
                  ⭐ FEATURED
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>
            <p className="text-lg text-gray-600 mb-6">{article.description}</p>
          </div>
        </div>

        {/* Article Meta */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-600">{article.readTime} min read</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-600">Updated {article.lastUpdated}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {article.targetRoles.map((role) => (
              <span key={role} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
        <div className="prose prose-lg max-w-none">
          <div 
            className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatContent(article.content) }}
          />
        </div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="border-t border-gray-200 pt-6 mt-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Feedback Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Was this article helpful?</h3>
        {isHelpful === null ? (
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleFeedback(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V9a2 2 0 00-2-2V5a2 2 0 00-2-2H4a2 2 0 00-2 2v7a2 2 0 002 2h3m7-10L7 20" />
              </svg>
              <span>Yes, this helped</span>
            </button>
            <button
              onClick={() => handleFeedback(false)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2v2a2 2 0 002 2h6a2 2 0 002-2v-7a2 2 0 00-2-2h-3m-7 10L17 4" />
              </svg>
              <span>No, this didn't help</span>
            </button>
          </div>
        ) : (
          <div className={`p-4 rounded-lg ${isHelpful ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className={`flex items-center space-x-2 ${isHelpful ? 'text-green-700' : 'text-red-700'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">
                Thank you for your feedback!
              </span>
            </div>
            {!isHelpful && (
              <p className="text-sm text-red-600 mt-2">
                If you need additional help, please contact your teacher or school support.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Related Articles</h3>
          <div className="space-y-4">
            {relatedArticles.map((relatedArticle) => (
              <div
                key={relatedArticle.id}
                onClick={() => onRelatedArticleClick(relatedArticle.id)}
                className="flex items-start space-x-4 p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="text-2xl">{getCategoryIcon(relatedArticle.category)}</div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800 mb-1">{relatedArticle.title}</h4>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{relatedArticle.description}</p>
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs px-2 py-1 rounded ${getTypeColor(relatedArticle.type)}`}>
                      {relatedArticle.type.replace('-', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{relatedArticle.readTime} min read</span>
                  </div>
                </div>
                <div className="text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back to Top */}
      <div className="fixed bottom-8 right-8">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Back to top"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    </div>
  );
}; 