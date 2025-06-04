import React, { useState, useEffect, useRef } from 'react';
import { UserRole, SearchResult } from '../../types/help';
import { HelpSearchService } from '../../services/helpSearch';

interface HelpSearchProps {
  query: string;
  onSearch: (query: string) => void;
  userRole: UserRole;
  placeholder?: string;
  showResults?: boolean;
  onArticleSelect?: (articleId: string) => void;
}

export const HelpSearch: React.FC<HelpSearchProps> = ({
  query,
  onSearch,
  userRole,
  placeholder = 'Search help articles...',
  showResults = false,
  onArticleSelect
}) => {
  const [searchInput, setSearchInput] = useState(query);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [quickAnswer, setQuickAnswer] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const suggestions = HelpSearchService.getSearchSuggestions(userRole);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    if (searchInput.length > 2) {
      setIsSearching(true);
      const results = HelpSearchService.search(searchInput, { role: userRole });
      const answer = HelpSearchService.getQuickAnswer(searchInput);
      
      setSearchResults(results);
      setQuickAnswer(answer);
      setIsSearching(false);
    } else {
      setSearchResults([]);
      setQuickAnswer(null);
    }
  }, [searchInput, userRole]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    
    if (value.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchInput(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
  };

  const handleResultClick = (articleId: string) => {
    if (onArticleSelect) {
      onArticleSelect(articleId);
    }
    setShowSuggestions(false);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const terms = query.toLowerCase().split(/\s+/);
    let highlightedText = text;
    
    terms.forEach(term => {
      if (term.length > 2) {
        const regex = new RegExp(`(${term})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
      }
    });
    
    return highlightedText;
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="w-full px-4 py-3 pl-12 pr-12 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                onSearch('');
                setShowSuggestions(false);
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Search Suggestions and Results */}
      {showSuggestions && (searchInput.length === 0 || searchInput.length > 2) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Quick Answer */}
          {quickAnswer && searchInput.length > 2 && (
            <div className="p-4 border-b border-gray-100 bg-blue-50">
              <div className="flex items-start space-x-3">
                <div className="text-blue-600 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800 text-sm mb-1">Quick Answer</h4>
                  <p className="text-sm text-blue-700">{quickAnswer}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchInput.length > 2 && searchResults.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </h4>
              </div>
              {searchResults.slice(0, 5).map((result) => (
                <button
                  key={result.article.id}
                  onClick={() => handleResultClick(result.article.id)}
                  className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-800 mb-1">
                        <span 
                          dangerouslySetInnerHTML={{ 
                            __html: highlightMatch(result.article.title, searchInput) 
                          }} 
                        />
                      </h5>
                      <p 
                        className="text-sm text-gray-600 line-clamp-2" 
                        dangerouslySetInnerHTML={{ 
                          __html: highlightMatch(result.matchedText, searchInput) 
                        }} 
                      />
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {result.article.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {result.article.readTime} min read
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <div className="text-xs text-gray-400">
                        Score: {Math.round(result.relevanceScore)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {searchInput.length > 2 && searchResults.length === 0 && !isSearching && (
            <div className="p-4 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.386 0-4.548-.923-6.161-2.435M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 mb-2">No articles found for "{searchInput}"</p>
              <p className="text-xs text-gray-500">Try different keywords or browse by category</p>
            </div>
          )}

          {/* Loading */}
          {isSearching && (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Searching...</p>
            </div>
          )}

          {/* Suggestions */}
          {searchInput.length === 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700">Popular searches</h4>
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full Results Display */}
      {showResults && searchInput.length > 2 && (
        <div className="mt-6">
          {quickAnswer && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="text-blue-600 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-800 mb-1">Quick Answer</h3>
                  <p className="text-blue-700">{quickAnswer}</p>
                </div>
              </div>
            </div>
          )}

          {searchResults.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchInput}"
              </h3>
              {searchResults.map((result) => (
                <div
                  key={result.article.id}
                  onClick={() => handleResultClick(result.article.id)}
                  className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-800 text-lg">
                      <span 
                        dangerouslySetInnerHTML={{ 
                          __html: highlightMatch(result.article.title, searchInput) 
                        }} 
                      />
                    </h4>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex-shrink-0 ml-2">
                      {result.article.readTime} min
                    </span>
                  </div>
                  <p 
                    className="text-gray-600 mb-4" 
                    dangerouslySetInnerHTML={{ 
                      __html: highlightMatch(result.matchedText, searchInput) 
                    }} 
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {result.article.type}
                      </span>
                      {result.matchedKeywords.slice(0, 3).map((keyword) => (
                        <span
                          key={keyword}
                          className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <span className="text-blue-600 text-sm font-medium">Read →</span>
                  </div>
                </div>
              ))}
            </div>
          ) : !isSearching ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.386 0-4.548-.923-6.161-2.435M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No results found</h3>
              <p className="text-gray-600 mb-4">We couldn't find any articles matching "{searchInput}"</p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Try searching for:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.slice(0, 4).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}; 