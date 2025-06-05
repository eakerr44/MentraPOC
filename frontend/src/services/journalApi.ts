import axios from 'axios';
import { 
  JournalEntry, 
  CreateJournalEntryRequest, 
  UpdateJournalEntryRequest,
  JournalEntryFilters,
  JournalEntryResponse,
  JournalStats,
  JournalSettings,
  JournalError,
  // New search and history types
  SearchResponse,
  AdvancedSearchParams,
  SearchHistoryResponse,
  SearchSuggestion,
  TimelineResponse,
  EntryNavigation,
  ArchiveResponse,
  SortOption,
  SearchField
} from '../types/journal';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Get token from Zustand persistence (same location as dashboardApi)
  let token = null;
  try {
    const persistedState = localStorage.getItem('mentra-auth-storage');
    if (persistedState) {
      const authState = JSON.parse(persistedState);
      token = authState.state?.token;
    }
  } catch (error) {
    console.warn('Failed to get auth token from persistence:', error);
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export class JournalApiService {
  // Create a new journal entry
  static async createEntry(entryData: CreateJournalEntryRequest): Promise<JournalEntry> {
    try {
      const response = await api.post<JournalEntry>('/journal/entries', entryData);
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to create journal entry',
        'SAVE_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Update an existing journal entry
  static async updateEntry(entryData: UpdateJournalEntryRequest): Promise<JournalEntry> {
    try {
      const { id, ...updateData } = entryData;
      const response = await api.put<JournalEntry>(`/journal/entries/${id}`, updateData);
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to update journal entry',
        'SAVE_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Get a specific journal entry by ID
  static async getEntry(entryId: string): Promise<JournalEntry> {
    try {
      const response = await api.get<JournalEntry>(`/journal/entries/${entryId}`);
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to load journal entry',
        'LOAD_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Get journal entries with filtering and pagination
  static async getEntries(filters: JournalEntryFilters = {}): Promise<JournalEntryResponse> {
    try {
      const response = await api.get<JournalEntryResponse>('/journal/entries', {
        params: filters
      });
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to load journal entries',
        'LOAD_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Delete a journal entry
  static async deleteEntry(entryId: string): Promise<void> {
    try {
      await api.delete(`/journal/entries/${entryId}`);
    } catch (error: any) {
      throw new JournalError(
        'Failed to delete journal entry',
        'SAVE_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Get journal statistics
  static async getStats(): Promise<JournalStats> {
    try {
      const response = await api.get<JournalStats>('/journal/stats');
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to load journal statistics',
        'LOAD_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Get journal settings
  static async getSettings(): Promise<JournalSettings> {
    try {
      const response = await api.get<JournalSettings>('/journal/settings');
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to load journal settings',
        'LOAD_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Update journal settings
  static async updateSettings(settings: Partial<JournalSettings>): Promise<JournalSettings> {
    try {
      const response = await api.put<JournalSettings>('/journal/settings', settings);
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to update journal settings',
        'SAVE_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Search journal entries
  static async searchEntries(query: string, filters: Partial<JournalEntryFilters> = {}): Promise<JournalEntryResponse> {
    try {
      const response = await api.get<JournalEntryResponse>('/journal/search', {
        params: { ...filters, searchQuery: query }
      });
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to search journal entries',
        'LOAD_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Get suggested tags based on user's history
  static async getSuggestedTags(): Promise<string[]> {
    try {
      const response = await api.get<string[]>('/journal/tags/suggestions');
      return response.data;
    } catch (error: any) {
      console.warn('Failed to load tag suggestions:', error.message);
      return []; // Non-critical failure
    }
  }

  // Auto-save draft (non-blocking)
  static async saveDraft(entryId: string | null, content: string, title: string): Promise<void> {
    try {
      if (entryId) {
        await api.post(`/journal/entries/${entryId}/draft`, { content, title });
      } else {
        await api.post('/journal/drafts', { content, title });
      }
    } catch (error: any) {
      console.warn('Auto-save failed:', error.message);
      // Don't throw error for auto-save failures
    }
  }

  // Get draft content for an entry
  static async getDraft(entryId: string): Promise<{ title: string; content: string } | null> {
    try {
      const response = await api.get<{ title: string; content: string }>(`/journal/entries/${entryId}/draft`);
      return response.data;
    } catch (error: any) {
      return null; // No draft found
    }
  }

  // Get reflection prompts for a journal entry
  static async getPrompts(entryId: string): Promise<{ prompts: any[] }> {
    try {
      const response = await api.get(`/journal/entries/${entryId}/ai/reflection-prompts`);
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to get reflection prompts',
        'LOAD_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Generate new reflection prompts for a journal entry
  static async generateReflectionPrompts(entryId: string, options: {
    content?: string;
    maxPrompts?: number;
    preferredTypes?: string[];
  }): Promise<{ prompts: any[]; contentAnalysis: any; learningProfile: any; metadata: any }> {
    try {
      const response = await api.post(`/journal/entries/${entryId}/ai/reflection-prompts`, {
        maxPrompts: options.maxPrompts || 3,
        preferredTypes: options.preferredTypes || []
      });
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to generate reflection prompts',
        'LOAD_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Submit response to reflection prompt
  static async submitReflectionResponse(promptId: string, response: string): Promise<{ respondedAt: string }> {
    try {
      const apiResponse = await api.post(`/journal/ai/reflection-prompts/${promptId}/response`, {
        response
      });
      return apiResponse.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to submit reflection response',
        'SAVE_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Helper method to convert rich text to plain text for search
  static convertToPlainText(htmlContent: string): string {
    // Create a temporary DOM element to strip HTML tags
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  // Helper method to count words in text
  static countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Helper method to estimate reading time (average 200 words per minute)
  static estimateReadingTime(text: string): number {
    const wordCount = this.countWords(text);
    return Math.ceil(wordCount / 200);
  }

  // Validate journal entry data before submission
  static validateEntryData(entryData: CreateJournalEntryRequest | UpdateJournalEntryRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!entryData.title || entryData.title.trim().length === 0) {
      errors.push('Title is required');
    }
    
    if (entryData.title && entryData.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }
    
    if (!entryData.content || entryData.content.trim().length === 0) {
      errors.push('Content is required');
    }
    
    if (entryData.content && entryData.content.length > 50000) {
      errors.push('Content must be less than 50,000 characters');
    }
    
    if (entryData.tags && entryData.tags.length > 20) {
      errors.push('Maximum 20 tags allowed');
    }
    
    if (entryData.tags) {
      for (const tag of entryData.tags) {
        if (tag.length > 50) {
          errors.push('Tags must be less than 50 characters each');
          break;
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============================================
  // SEARCH AND HISTORY METHODS
  // ============================================

  // Basic journal search
  static async searchJournalEntries(
    query: string, 
    options: {
      studentId?: string;
      fields?: SearchField[];
      sortBy?: SortOption;
      limit?: number;
      offset?: number;
      highlights?: boolean;
      snippets?: boolean;
    } = {}
  ): Promise<SearchResponse> {
    try {
      const params = {
        q: query,
        ...options.studentId && { studentId: options.studentId },
        ...options.fields && { fields: options.fields.join(',') },
        ...options.sortBy && { sort: options.sortBy },
        ...options.limit && { limit: options.limit },
        ...options.offset && { offset: options.offset },
        highlights: options.highlights !== false ? 'true' : 'false',
        snippets: options.snippets !== false ? 'true' : 'false'
      };

      const response = await api.get<SearchResponse>('/journal/search', { params });
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to search journal entries',
        'LOAD_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Advanced journal search with complex filters
  static async advancedSearchJournalEntries(params: AdvancedSearchParams): Promise<SearchResponse> {
    try {
      const response = await api.post<SearchResponse>('/journal/search/advanced', params);
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to perform advanced search',
        'LOAD_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Get search history for current user
  static async getSearchHistory(limit: number = 50): Promise<SearchHistoryResponse> {
    try {
      const response = await api.get<SearchHistoryResponse>('/journal/search/history', {
        params: { limit }
      });
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to load search history',
        'LOAD_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Get search suggestions
  static async getSearchSuggestions(query: string): Promise<{ query: string; suggestions: SearchSuggestion[] }> {
    try {
      const response = await api.get<{ query: string; suggestions: SearchSuggestion[] }>('/journal/search/suggestions', {
        params: { q: query }
      });
      return response.data;
    } catch (error: any) {
      console.warn('Failed to load search suggestions:', error.message);
      return { query, suggestions: [] }; // Non-critical failure
    }
  }

  // ============================================
  // TIMELINE AND ARCHIVE METHODS
  // ============================================

  // Get journal timeline/history view
  static async getTimeline(options: {
    studentId?: string;
    timeWindow?: number;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    includeEmotions?: boolean;
    includeTags?: boolean;
    limit?: number;
  } = {}): Promise<TimelineResponse> {
    try {
      const params = {
        ...options.studentId && { studentId: options.studentId },
        ...options.timeWindow && { timeWindow: options.timeWindow },
        ...options.groupBy && { groupBy: options.groupBy },
        includeEmotions: options.includeEmotions !== false ? 'true' : 'false',
        includeTags: options.includeTags !== false ? 'true' : 'false',
        ...options.limit && { limit: options.limit }
      };

      const response = await api.get<TimelineResponse>('/journal/timeline', { params });
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to load journal timeline',
        'LOAD_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Get navigation for a specific journal entry (previous/next)
  static async getEntryNavigation(entryId: string, studentId?: string): Promise<EntryNavigation> {
    try {
      const params = studentId ? { studentId } : {};
      const response = await api.get<EntryNavigation>(`/journal/entries/${entryId}/navigation`, { params });
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to load entry navigation',
        'LOAD_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Get journal archive (entries grouped by date)
  static async getArchive(options: {
    studentId?: string;
    year?: string;
    month?: string;
    includeStats?: boolean;
  } = {}): Promise<ArchiveResponse> {
    try {
      const params = {
        ...options.studentId && { studentId: options.studentId },
        ...options.year && { year: options.year },
        ...options.month && { month: options.month },
        includeStats: options.includeStats !== false ? 'true' : 'false'
      };

      const response = await api.get<ArchiveResponse>('/journal/archive', { params });
      return response.data;
    } catch (error: any) {
      throw new JournalError(
        'Failed to load journal archive',
        'LOAD_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // ============================================
  // UTILITY METHODS FOR SEARCH
  // ============================================

  // Parse search query to extract terms and phrases
  static parseSearchQuery(query: string): { terms: string[]; phrases: string[] } {
    const phrases: string[] = [];
    const phraseRegex = /"([^"]+)"/g;
    let match;
    
    while ((match = phraseRegex.exec(query)) !== null) {
      phrases.push(match[1]);
    }
    
    // Remove phrases from query and extract terms
    const withoutPhrases = query.replace(/"[^"]+"/g, '').trim();
    const terms = withoutPhrases.split(/\s+/).filter(term => term.length > 0);
    
    return { terms, phrases };
  }

  // Build advanced search query string
  static buildAdvancedQuery(params: Partial<AdvancedSearchParams>): string {
    const queryParts: string[] = [];
    
    if (params.query) {
      queryParts.push(params.query);
    }
    
    if (params.tagFilters && params.tagFilters.length > 0) {
      queryParts.push(`tags:(${params.tagFilters.join(' OR ')})`);
    }
    
    if (params.emotionFilters && params.emotionFilters.length > 0) {
      queryParts.push(`emotions:(${params.emotionFilters.join(' OR ')})`);
    }
    
    return queryParts.join(' AND ');
  }

  // Format search results for display
  static formatSearchResults(results: SearchResponse): SearchResponse {
    return {
      ...results,
      results: results.results.map(result => ({
        ...result,
        // Ensure highlighted fields exist
        highlightedTitle: result.highlightedTitle || result.title,
        // Format creation date
        createdAt: new Date(result.createdAt).toISOString(),
        // Clean up snippet if it exists
        snippet: result.snippet ? this.cleanSnippet(result.snippet) : undefined,
        highlightedSnippet: result.highlightedSnippet ? this.cleanSnippet(result.highlightedSnippet) : undefined
      }))
    };
  }

  // Clean search snippet text
  private static cleanSnippet(snippet: string): string {
    return snippet
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Generate search stats summary
  static generateSearchStats(searchResponse: SearchResponse): {
    totalResults: number;
    executionTime: number;
    averageRelevance: number;
    topMatchedFields: string[];
  } {
    const { results, searchInfo } = searchResponse;
    
    const averageRelevance = results.length > 0 
      ? results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length 
      : 0;
    
    const fieldCounts: Record<string, number> = {};
    results.forEach(result => {
      result.matchedFields.forEach(field => {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      });
    });
    
    const topMatchedFields = Object.entries(fieldCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([field]) => field);
    
    return {
      totalResults: searchInfo.resultsFound,
      executionTime: searchInfo.executionTime,
      averageRelevance: Math.round(averageRelevance * 100) / 100,
      topMatchedFields
    };
  }

  // ============================================
  // SEARCH CACHING UTILITIES
  // ============================================

  private static searchCache = new Map<string, { data: SearchResponse; timestamp: number }>();
  private static cacheExpiry = 5 * 60 * 1000; // 5 minutes

  // Get cached search result
  static getCachedSearch(query: string, options: any): SearchResponse | null {
    const cacheKey = JSON.stringify({ query, options });
    const cached = this.searchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    
    if (cached) {
      this.searchCache.delete(cacheKey);
    }
    
    return null;
  }

  // Cache search result
  static setCachedSearch(query: string, options: any, data: SearchResponse): void {
    const cacheKey = JSON.stringify({ query, options });
    this.searchCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.searchCache.size > 50) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey) {
        this.searchCache.delete(firstKey);
      }
    }
  }

  // Clear search cache
  static clearSearchCache(): void {
    this.searchCache.clear();
  }
}

export default JournalApiService; 