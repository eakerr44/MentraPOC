const { getJournalStorageService } = require('./journal-storage-service');
const { activityMonitor } = require('./activity-monitor');

// Search error class
class JournalSearchError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = 'JournalSearchError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Search types and operators
const SEARCH_OPERATORS = {
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',
  PHRASE: 'PHRASE',
  WILDCARD: 'WILDCARD'
};

const SEARCH_FIELDS = {
  TITLE: 'title',
  CONTENT: 'content',
  TAGS: 'tags',
  EMOTIONS: 'emotions',
  ALL: 'all'
};

const SORT_OPTIONS = {
  RELEVANCE: 'relevance',
  DATE_DESC: 'date_desc',
  DATE_ASC: 'date_asc',
  WORD_COUNT: 'word_count',
  TITLE: 'title'
};

class JournalSearchService {
  constructor() {
    this.journalStorage = getJournalStorageService();
    this.searchCache = new Map(); // Cache for recent searches
    this.searchHistory = new Map(); // Track user search history
    this.maxCacheSize = 100;
    this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
  }

  // Main search method with comprehensive filtering and ranking
  async searchJournalEntries(searchParams) {
    try {
      const {
        studentId,
        requestingUserId,
        query,
        searchFields = [SEARCH_FIELDS.ALL],
        operator = SEARCH_OPERATORS.AND,
        filters = {},
        sortBy = SORT_OPTIONS.RELEVANCE,
        limit = 20,
        offset = 0,
        highlightResults = true,
        includeSnippets = true,
        requestInfo = {}
      } = searchParams;

      // Validate search parameters
      this.validateSearchParams(searchParams);

      // Check cache first
      const cacheKey = this.generateCacheKey(searchParams);
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        await this.logSearchActivity(studentId, requestingUserId, { ...searchParams, fromCache: true });
        return cachedResult;
      }

      // Parse and normalize search query
      const parsedQuery = this.parseSearchQuery(query, operator);

      // Get base entries with filters
      const baseEntries = await this.getFilteredEntries(studentId, requestingUserId, filters);

      // Perform search across different fields
      let searchResults = [];

      if (searchFields.includes(SEARCH_FIELDS.ALL) || searchFields.includes(SEARCH_FIELDS.TITLE)) {
        const titleResults = await this.searchInTitles(baseEntries, parsedQuery);
        searchResults = this.mergeSearchResults(searchResults, titleResults, 'title');
      }

      if (searchFields.includes(SEARCH_FIELDS.ALL) || searchFields.includes(SEARCH_FIELDS.CONTENT)) {
        const contentResults = await this.searchInContent(baseEntries, parsedQuery, studentId, requestingUserId);
        searchResults = this.mergeSearchResults(searchResults, contentResults, 'content');
      }

      if (searchFields.includes(SEARCH_FIELDS.ALL) || searchFields.includes(SEARCH_FIELDS.TAGS)) {
        const tagResults = await this.searchInTags(baseEntries, parsedQuery);
        searchResults = this.mergeSearchResults(searchResults, tagResults, 'tags');
      }

      if (searchFields.includes(SEARCH_FIELDS.ALL) || searchFields.includes(SEARCH_FIELDS.EMOTIONS)) {
        const emotionResults = await this.searchInEmotions(baseEntries, parsedQuery);
        searchResults = this.mergeSearchResults(searchResults, emotionResults, 'emotions');
      }

      // Calculate relevance scores and sort
      const scoredResults = this.calculateRelevanceScores(searchResults, parsedQuery);
      const sortedResults = this.sortSearchResults(scoredResults, sortBy);

      // Apply pagination
      const paginatedResults = sortedResults.slice(offset, offset + limit);

      // Generate snippets and highlights
      const enhancedResults = await this.enhanceSearchResults(
        paginatedResults,
        parsedQuery,
        highlightResults,
        includeSnippets,
        studentId,
        requestingUserId
      );

      // Build final result
      const searchResult = {
        query: {
          original: query,
          parsed: parsedQuery,
          searchFields,
          operator
        },
        results: enhancedResults,
        pagination: {
          total: sortedResults.length,
          limit,
          offset,
          hasMore: offset + limit < sortedResults.length
        },
        searchInfo: {
          executionTime: Date.now(), // Will be calculated below
          resultsFound: sortedResults.length,
          searchedEntries: baseEntries.length,
          sortBy,
          fromCache: false
        },
        suggestions: await this.generateSearchSuggestions(query, searchResults.length)
      };

      // Cache the result
      this.setCache(cacheKey, searchResult);

      // Log search activity
      await this.logSearchActivity(studentId, requestingUserId, searchParams, searchResult);

      // Store in search history
      this.addToSearchHistory(requestingUserId, searchParams, searchResult);

      return searchResult;

    } catch (error) {
      console.error('Journal search failed:', error);
      
      if (error instanceof JournalSearchError) {
        throw error;
      }
      
      throw new JournalSearchError(
        'Failed to search journal entries',
        'SEARCH_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Advanced search with complex queries
  async advancedSearch(searchParams) {
    const {
      studentId,
      requestingUserId,
      advancedQuery,
      dateRange,
      emotionFilters,
      tagFilters,
      wordCountRange,
      privacyFilters,
      sortBy = SORT_OPTIONS.RELEVANCE,
      limit = 20,
      offset = 0
    } = searchParams;

    try {
      // Build complex filter object
      const filters = {
        ...dateRange && {
          startDate: dateRange.start,
          endDate: dateRange.end
        },
        ...emotionFilters && { emotions: emotionFilters },
        ...tagFilters && { tags: tagFilters },
        ...wordCountRange && {
          minWordCount: wordCountRange.min,
          maxWordCount: wordCountRange.max
        },
        ...privacyFilters && { privacy: privacyFilters }
      };

      // Parse advanced query syntax
      const parsedAdvancedQuery = this.parseAdvancedQuery(advancedQuery);

      // Execute search with advanced parameters
      return await this.searchJournalEntries({
        studentId,
        requestingUserId,
        query: parsedAdvancedQuery.query,
        searchFields: parsedAdvancedQuery.fields,
        operator: parsedAdvancedQuery.operator,
        filters,
        sortBy,
        limit,
        offset,
        highlightResults: true,
        includeSnippets: true
      });

    } catch (error) {
      throw new JournalSearchError(
        'Advanced search failed',
        'ADVANCED_SEARCH_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Search within journal content (requires decryption)
  async searchInContent(entries, parsedQuery, studentId, requestingUserId) {
    const contentMatches = [];

    for (const entry of entries) {
      try {
        // Get full entry with decrypted content
        const fullEntry = await this.journalStorage.getEntry(entry.id, requestingUserId);
        
        if (fullEntry && fullEntry.plainTextContent) {
          const matches = this.findMatches(fullEntry.plainTextContent, parsedQuery);
          
          if (matches.length > 0) {
            contentMatches.push({
              entryId: entry.id,
              entry: fullEntry,
              matches,
              field: 'content',
              score: this.calculateFieldScore(matches, fullEntry.plainTextContent.length)
            });
          }
        }
      } catch (error) {
        // Skip entries we can't decrypt or access
        console.warn(`Could not search in entry ${entry.id}:`, error.message);
      }
    }

    return contentMatches;
  }

  // Search within titles (no decryption needed)
  async searchInTitles(entries, parsedQuery) {
    const titleMatches = [];

    for (const entry of entries) {
      const matches = this.findMatches(entry.title, parsedQuery);
      
      if (matches.length > 0) {
        titleMatches.push({
          entryId: entry.id,
          entry,
          matches,
          field: 'title',
          score: this.calculateFieldScore(matches, entry.title.length) * 1.5 // Boost title matches
        });
      }
    }

    return titleMatches;
  }

  // Search within tags
  async searchInTags(entries, parsedQuery) {
    const tagMatches = [];

    for (const entry of entries) {
      // Get tags for this entry
      const entryTags = await this.getEntryTags(entry.id);
      const tagsText = entryTags.join(' ');
      
      const matches = this.findMatches(tagsText, parsedQuery);
      
      if (matches.length > 0) {
        tagMatches.push({
          entryId: entry.id,
          entry,
          matches,
          field: 'tags',
          score: this.calculateFieldScore(matches, tagsText.length) * 1.2 // Boost tag matches
        });
      }
    }

    return tagMatches;
  }

  // Search within emotional states
  async searchInEmotions(entries, parsedQuery) {
    const emotionMatches = [];

    for (const entry of entries) {
      // Get emotional state for this entry
      const emotionalState = await this.getEntryEmotionalState(entry.id);
      
      if (emotionalState) {
        const emotionsText = [
          emotionalState.primary,
          ...(emotionalState.secondary || []),
          emotionalState.context
        ].filter(Boolean).join(' ');
        
        const matches = this.findMatches(emotionsText, parsedQuery);
        
        if (matches.length > 0) {
          emotionMatches.push({
            entryId: entry.id,
            entry,
            matches,
            field: 'emotions',
            score: this.calculateFieldScore(matches, emotionsText.length)
          });
        }
      }
    }

    return emotionMatches;
  }

  // Get search history for a user
  async getSearchHistory(userId, limit = 50) {
    const userHistory = this.searchHistory.get(userId) || [];
    return userHistory.slice(0, limit).map(item => ({
      query: item.query,
      timestamp: item.timestamp,
      resultsCount: item.resultsCount,
      executionTime: item.executionTime
    }));
  }

  // Get search suggestions based on query and history
  async generateSearchSuggestions(query, resultsCount) {
    const suggestions = [];

    // If no results, suggest related terms
    if (resultsCount === 0) {
      suggestions.push({
        type: 'spell_check',
        text: `Did you mean "${this.suggestSpellCorrection(query)}"?`
      });
      
      suggestions.push({
        type: 'broaden',
        text: 'Try using fewer or more general terms'
      });
    }

    // Add common search patterns
    if (query.length > 3) {
      suggestions.push({
        type: 'related',
        text: `Search for entries about "${query}"`
      });
    }

    return suggestions;
  }

  // Get filtered entries based on search criteria
  async getFilteredEntries(studentId, requestingUserId, filters) {
    const searchOptions = {
      limit: 1000, // Get more entries for comprehensive search
      ...filters,
      includePrivate: requestingUserId === studentId
    };

    const result = await this.journalStorage.getEntries(studentId, requestingUserId, searchOptions);
    return result.entries;
  }

  // Parse search query into structured format
  parseSearchQuery(query, operator = SEARCH_OPERATORS.AND) {
    if (!query || query.trim().length === 0) {
      return { terms: [], phrases: [], operator };
    }

    const normalized = query.toLowerCase().trim();
    
    // Extract quoted phrases
    const phrases = [];
    const phraseRegex = /"([^"]+)"/g;
    let match;
    
    while ((match = phraseRegex.exec(normalized)) !== null) {
      phrases.push(match[1]);
    }

    // Remove phrases from query and extract individual terms
    const withoutPhrases = normalized.replace(/"[^"]+"/g, '').trim();
    const terms = withoutPhrases.split(/\s+/).filter(term => term.length > 0);

    return {
      terms,
      phrases,
      operator,
      original: query
    };
  }

  // Parse advanced query syntax (field:value, operators, etc.)
  parseAdvancedQuery(advancedQuery) {
    const result = {
      query: '',
      fields: [SEARCH_FIELDS.ALL],
      operator: SEARCH_OPERATORS.AND
    };

    if (!advancedQuery) return result;

    // Parse field-specific searches like "title:learning" or "tags:math"
    const fieldRegex = /(title|content|tags|emotions):([^\s]+)/g;
    const fieldMatches = [];
    let match;

    while ((match = fieldRegex.exec(advancedQuery)) !== null) {
      fieldMatches.push({
        field: match[1],
        value: match[2]
      });
    }

    if (fieldMatches.length > 0) {
      result.fields = fieldMatches.map(fm => fm.field);
      result.query = fieldMatches.map(fm => fm.value).join(' ');
    } else {
      result.query = advancedQuery;
    }

    return result;
  }

  // Find matches for query terms in text
  findMatches(text, parsedQuery) {
    if (!text || !parsedQuery.terms.length && !parsedQuery.phrases.length) {
      return [];
    }

    const normalizedText = text.toLowerCase();
    const matches = [];

    // Find phrase matches
    for (const phrase of parsedQuery.phrases) {
      const phraseIndex = normalizedText.indexOf(phrase);
      if (phraseIndex !== -1) {
        matches.push({
          type: 'phrase',
          text: phrase,
          position: phraseIndex,
          length: phrase.length
        });
      }
    }

    // Find term matches
    for (const term of parsedQuery.terms) {
      const termRegex = new RegExp(`\\b${term}\\b`, 'gi');
      let termMatch;
      
      while ((termMatch = termRegex.exec(text)) !== null) {
        matches.push({
          type: 'term',
          text: term,
          position: termMatch.index,
          length: term.length
        });
      }
    }

    return matches.sort((a, b) => a.position - b.position);
  }

  // Calculate relevance score for search results
  calculateRelevanceScores(searchResults, parsedQuery) {
    return searchResults.map(result => {
      let score = result.score || 0;
      
      // Boost based on match quality
      const phraseMatches = result.matches.filter(m => m.type === 'phrase').length;
      const termMatches = result.matches.filter(m => m.type === 'term').length;
      
      score += phraseMatches * 3; // Phrase matches are more valuable
      score += termMatches * 1;
      
      // Boost recent entries
      const daysSinceCreated = (Date.now() - new Date(result.entry.createdAt)) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - daysSinceCreated) * 0.1;
      
      return {
        ...result,
        relevanceScore: score
      };
    });
  }

  // Sort search results by specified criteria
  sortSearchResults(results, sortBy) {
    switch (sortBy) {
      case SORT_OPTIONS.RELEVANCE:
        return results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      
      case SORT_OPTIONS.DATE_DESC:
        return results.sort((a, b) => new Date(b.entry.createdAt) - new Date(a.entry.createdAt));
      
      case SORT_OPTIONS.DATE_ASC:
        return results.sort((a, b) => new Date(a.entry.createdAt) - new Date(b.entry.createdAt));
      
      case SORT_OPTIONS.WORD_COUNT:
        return results.sort((a, b) => (b.entry.wordCount || 0) - (a.entry.wordCount || 0));
      
      case SORT_OPTIONS.TITLE:
        return results.sort((a, b) => a.entry.title.localeCompare(b.entry.title));
      
      default:
        return results;
    }
  }

  // Enhance search results with highlights and snippets
  async enhanceSearchResults(results, parsedQuery, highlightResults, includeSnippets, studentId, requestingUserId) {
    const enhanced = [];

    for (const result of results) {
      const enhanced_result = {
        id: result.entry.id,
        title: result.entry.title,
        createdAt: result.entry.createdAt,
        wordCount: result.entry.wordCount,
        relevanceScore: result.relevanceScore,
        matchedFields: [result.field],
        privacy: {
          isPrivate: result.entry.isPrivate,
          privacyLevel: result.entry.privacyLevel
        }
      };

      // Add highlighted title if needed
      if (highlightResults && result.field === 'title') {
        enhanced_result.highlightedTitle = this.highlightMatches(result.entry.title, result.matches);
      } else {
        enhanced_result.highlightedTitle = result.entry.title;
      }

      // Add content snippet if requested
      if (includeSnippets && result.field === 'content') {
        try {
          const fullEntry = await this.journalStorage.getEntry(result.entry.id, requestingUserId);
          if (fullEntry && fullEntry.plainTextContent) {
            enhanced_result.snippet = this.generateSnippet(fullEntry.plainTextContent, result.matches, 150);
            
            if (highlightResults) {
              enhanced_result.highlightedSnippet = this.highlightMatches(enhanced_result.snippet, result.matches);
            }
          }
        } catch (error) {
          // Skip snippet if we can't access content
        }
      }

      enhanced.push(enhanced_result);
    }

    return enhanced;
  }

  // Generate text snippet around matches
  generateSnippet(text, matches, maxLength = 150) {
    if (matches.length === 0) {
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }

    // Find the best position to center the snippet
    const firstMatch = matches[0];
    const snippetStart = Math.max(0, firstMatch.position - Math.floor(maxLength / 2));
    const snippetEnd = Math.min(text.length, snippetStart + maxLength);
    
    let snippet = text.substring(snippetStart, snippetEnd);
    
    // Add ellipses if needed
    if (snippetStart > 0) snippet = '...' + snippet;
    if (snippetEnd < text.length) snippet = snippet + '...';
    
    return snippet;
  }

  // Highlight search matches in text
  highlightMatches(text, matches) {
    if (!matches || matches.length === 0) return text;

    let highlightedText = text;
    let offset = 0;

    // Sort matches by position to apply highlights correctly
    const sortedMatches = [...matches].sort((a, b) => a.position - b.position);

    for (const match of sortedMatches) {
      const startTag = '<mark>';
      const endTag = '</mark>';
      const insertPosition = match.position + offset;
      
      highlightedText = 
        highlightedText.slice(0, insertPosition) +
        startTag +
        highlightedText.slice(insertPosition, insertPosition + match.length) +
        endTag +
        highlightedText.slice(insertPosition + match.length);
      
      offset += startTag.length + endTag.length;
    }

    return highlightedText;
  }

  // Helper methods
  calculateFieldScore(matches, textLength) {
    if (matches.length === 0 || textLength === 0) return 0;
    
    // Score based on match density and frequency
    const matchCharacters = matches.reduce((sum, match) => sum + match.length, 0);
    const density = matchCharacters / textLength;
    const frequency = matches.length;
    
    return (density * 10) + (frequency * 2);
  }

  mergeSearchResults(existing, newResults, field) {
    const merged = [...existing];
    
    for (const newResult of newResults) {
      const existingIndex = merged.findIndex(r => r.entryId === newResult.entryId);
      
      if (existingIndex >= 0) {
        // Combine scores and matches
        merged[existingIndex].score += newResult.score;
        merged[existingIndex].matches.push(...newResult.matches);
        if (!merged[existingIndex].fields) merged[existingIndex].fields = [];
        merged[existingIndex].fields.push(field);
      } else {
        merged.push({
          ...newResult,
          fields: [field]
        });
      }
    }
    
    return merged;
  }

  validateSearchParams(params) {
    if (!params.studentId) {
      throw new JournalSearchError('Student ID is required', 'VALIDATION_ERROR');
    }
    
    if (!params.requestingUserId) {
      throw new JournalSearchError('Requesting user ID is required', 'VALIDATION_ERROR');
    }
    
    if (!params.query || params.query.trim().length === 0) {
      throw new JournalSearchError('Search query is required', 'VALIDATION_ERROR');
    }
    
    if (params.query.length > 500) {
      throw new JournalSearchError('Search query too long (max 500 characters)', 'VALIDATION_ERROR');
    }
  }

  // Cache management
  generateCacheKey(params) {
    const keyData = {
      studentId: params.studentId,
      query: params.query,
      fields: params.searchFields,
      filters: params.filters,
      sortBy: params.sortBy,
      limit: params.limit,
      offset: params.offset
    };
    
    return JSON.stringify(keyData);
  }

  getFromCache(key) {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    if (cached) {
      this.searchCache.delete(key);
    }
    return null;
  }

  setCache(key, data) {
    if (this.searchCache.size >= this.maxCacheSize) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
    
    this.searchCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Search history management
  addToSearchHistory(userId, searchParams, searchResult) {
    if (!this.searchHistory.has(userId)) {
      this.searchHistory.set(userId, []);
    }
    
    const userHistory = this.searchHistory.get(userId);
    userHistory.unshift({
      query: searchParams.query,
      searchFields: searchParams.searchFields,
      resultsCount: searchResult.pagination.total,
      executionTime: Date.now() - searchResult.searchInfo.executionTime,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 searches
    if (userHistory.length > 100) {
      userHistory.splice(100);
    }
  }

  // Activity logging
  async logSearchActivity(studentId, requestingUserId, searchParams, searchResult = null) {
    try {
      await activityMonitor.logActivity({
        studentId,
        sessionId: searchParams.requestInfo?.sessionId || `search_${Date.now()}`,
        activityType: 'journal_search_performed',
        details: {
          query: searchParams.query,
          searchFields: searchParams.searchFields,
          resultsFound: searchResult?.pagination.total || 0,
          fromCache: searchResult?.searchInfo.fromCache || false,
          sortBy: searchParams.sortBy
        },
        severity: 'low',
        context: {
          feature: 'journal_search',
          searchType: 'basic'
        }
      });
    } catch (error) {
      console.warn('Failed to log search activity:', error);
    }
  }

  // Stub methods for data access (would be implemented based on your data layer)
  async getEntryTags(entryId) {
    // This would query the journal_entry_tags table
    return ['placeholder', 'tags']; // Placeholder implementation
  }

  async getEntryEmotionalState(entryId) {
    // This would query the journal_emotions table
    return null; // Placeholder implementation
  }

  suggestSpellCorrection(query) {
    // Simple spell correction - in production, use a proper spell checker
    return query.replace(/(\w+)/g, word => {
      // Basic common corrections
      const corrections = {
        'teh': 'the',
        'adn': 'and',
        'learrning': 'learning',
        'scohol': 'school'
      };
      return corrections[word.toLowerCase()] || word;
    });
  }

  // Health check
  async healthCheck() {
    try {
      const storageHealth = await this.journalStorage.healthCheck();
      
      return {
        status: 'healthy',
        service: 'journal-search-service',
        features: {
          caching: 'enabled',
          searchHistory: 'enabled',
          encryptedContentSearch: 'enabled',
          journalStorage: storageHealth.status
        },
        cache: {
          size: this.searchCache.size,
          maxSize: this.maxCacheSize
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'journal-search-service',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
let journalSearchInstance = null;

const getJournalSearchService = () => {
  if (!journalSearchInstance) {
    journalSearchInstance = new JournalSearchService();
  }
  return journalSearchInstance;
};

module.exports = {
  JournalSearchService,
  getJournalSearchService,
  JournalSearchError,
  SEARCH_OPERATORS,
  SEARCH_FIELDS,
  SORT_OPTIONS
}; 