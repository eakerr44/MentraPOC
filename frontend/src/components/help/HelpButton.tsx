import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../../types/help';
import { HelpSearchService } from '../../services/helpSearch';

interface HelpButtonProps {
  userRole?: UserRole;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  userRole = 'student',
  className = '',
  size = 'md',
  showTooltip = true
}) => {
  const navigate = useNavigate();
  const [showQuickHelp, setShowQuickHelp] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const suggestions = HelpSearchService.getSearchSuggestions(userRole);

  const handleHelpClick = () => {
    navigate('/help');
  };

  const handleQuickSearch = (query: string) => {
    navigate(`/help/search?q=${encodeURIComponent(query)}`);
    setShowQuickHelp(false);
  };

  return (
    <div className="relative">
      {/* Main Help Button */}
      <button
        onClick={handleHelpClick}
        onMouseEnter={() => setShowQuickHelp(true)}
        onMouseLeave={() => setShowQuickHelp(false)}
        className={`
          ${sizeClasses[size]}
          ${className}
          bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg
          flex items-center justify-center transition-all duration-200
          hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        title={showTooltip ? 'Get Help' : undefined}
      >
        <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Quick Help Dropdown */}
      {showQuickHelp && (
        <div 
          className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
          onMouseEnter={() => setShowQuickHelp(true)}
          onMouseLeave={() => setShowQuickHelp(false)}
        >
          <div className="p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Quick Help</h3>
            
            {/* Quick Search Suggestions */}
            <div className="space-y-2 mb-4">
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSearch(suggestion)}
                  className="w-full text-left text-sm text-gray-600 hover:text-blue-600 p-2 rounded hover:bg-gray-50 transition-colors"
                >
                  🔍 {suggestion}
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="border-t border-gray-200 pt-3 space-y-2">
              <button
                onClick={handleHelpClick}
                className="w-full text-left text-sm text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors"
              >
                📚 Browse All Help Articles
              </button>
              <button
                onClick={() => {
                  navigate('/help/search');
                  setShowQuickHelp(false);
                }}
                className="w-full text-left text-sm text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors"
              >
                🔍 Advanced Search
              </button>
              <button
                onClick={() => {
                  // This would typically open a contact form or support chat
                  alert('Contact support feature would open here');
                  setShowQuickHelp(false);
                }}
                className="w-full text-left text-sm text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors"
              >
                📞 Contact Support
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Floating Help Button for easy integration
export const FloatingHelpButton: React.FC<{ userRole?: UserRole }> = ({ userRole }) => {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <HelpButton userRole={userRole} size="lg" />
    </div>
  );
};

// Header Help Button for navigation bars
export const HeaderHelpButton: React.FC<{ userRole?: UserRole }> = ({ userRole }) => {
  return (
    <HelpButton 
      userRole={userRole} 
      size="sm" 
      className="bg-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-300"
    />
  );
}; 