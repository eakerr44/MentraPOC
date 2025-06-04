export interface JournalEntry {
  id: string;
  studentId: string;
  title: string;
  content: string; // Rich text HTML content
  plainTextContent: string; // Plain text version for search
  emotionalState?: EmotionalState;
  mood?: MoodLevel;
  tags: string[];
  isPrivate: boolean;
  isShareableWithTeacher: boolean;
  isShareableWithParent: boolean;
  createdAt: string;
  updatedAt: string;
  lastEditedAt: string;
  wordCount: number;
  readingTimeMinutes: number;
  aiReflectionPrompts?: AIReflectionPrompt[];
  attachments?: JournalAttachment[];
}

export interface EmotionalState {
  primary: EmotionType;
  secondary?: EmotionType[];
  intensity: 1 | 2 | 3 | 4 | 5; // 1 = mild, 5 = very strong
  confidence: number; // 0-1, how confident the student is about their emotion assessment
}

export type EmotionType = 
  | 'happy' | 'excited' | 'proud' | 'grateful' | 'calm' | 'confident'
  | 'sad' | 'frustrated' | 'anxious' | 'angry' | 'disappointed' | 'overwhelmed'
  | 'confused' | 'curious' | 'surprised' | 'bored' | 'tired' | 'neutral';

export type MoodLevel = 'very-low' | 'low' | 'neutral' | 'good' | 'great';

export interface AIReflectionPrompt {
  id: string;
  prompt: string;
  response?: string;
  generatedAt: string;
  respondedAt?: string;
  promptType: 'emotional-exploration' | 'learning-reflection' | 'goal-setting' | 'problem-solving' | 'gratitude-appreciation' | 'growth-mindset';
  developmentLevel: string;
  personalizedElements?: Record<string, string>;
  templateUsed?: string;
  metadata?: {
    contentTriggers: string[];
    themes: string[];
    complexity: string;
    learningProfileSummary?: any;
  };
}

export interface JournalAttachment {
  id: string;
  type: 'image' | 'audio' | 'file';
  fileName: string;
  fileSize: number;
  url: string;
  uploadedAt: string;
}

export interface JournalEntryDraft {
  title: string;
  content: string;
  emotionalState?: Partial<EmotionalState>;
  mood?: MoodLevel;
  tags: string[];
  isPrivate: boolean;
  isShareableWithTeacher: boolean;
  isShareableWithParent: boolean;
}

export interface JournalSettings {
  autoSaveInterval: number; // seconds
  defaultPrivacy: 'private' | 'teacher-shareable' | 'parent-shareable' | 'public';
  enableEmotionalTracking: boolean;
  enableAIPrompts: boolean;
  dailyReminderTime?: string; // HH:MM format
  weeklyGoals: string[];
}

export interface JournalStats {
  totalEntries: number;
  totalWordCount: number;
  averageWordsPerEntry: number;
  longestStreak: number; // days
  currentStreak: number; // days
  emotionalTrends: Record<EmotionType, number>;
  topTags: Array<{ tag: string; count: number }>;
  weeklyProgress: Array<{
    week: string; // ISO week string
    entries: number;
    words: number;
    emotions: Record<EmotionType, number>;
  }>;
}

// API request/response types
export interface CreateJournalEntryRequest {
  title: string;
  content: string;
  plainTextContent: string;
  emotionalState?: EmotionalState;
  mood?: MoodLevel;
  tags: string[];
  isPrivate: boolean;
  isShareableWithTeacher: boolean;
  isShareableWithParent: boolean;
}

export interface UpdateJournalEntryRequest extends Partial<CreateJournalEntryRequest> {
  id: string;
}

export interface JournalEntryFilters {
  startDate?: string;
  endDate?: string;
  emotions?: EmotionType[];
  tags?: string[];
  isPrivate?: boolean;
  searchQuery?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'wordCount';
  sortOrder?: 'asc' | 'desc';
}

export interface JournalEntryResponse {
  entries: JournalEntry[];
  total: number;
  hasMore: boolean;
  filters: JournalEntryFilters;
}

// Component prop types
export interface JournalEntryEditorProps {
  entry?: JournalEntry;
  onSave: (entry: CreateJournalEntryRequest | UpdateJournalEntryRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  autoSave?: boolean;
}

export interface JournalEntryCardProps {
  entry: JournalEntry;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (entryId: string) => void;
  onShare: (entry: JournalEntry) => void;
  showPrivacyControls?: boolean;
}

export interface EmotionSelectorProps {
  selectedEmotion?: EmotionalState;
  onEmotionChange: (emotion: EmotionalState) => void;
  disabled?: boolean;
}

export interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: string[];
  maxTags?: number;
  disabled?: boolean;
}

// Error types
export class JournalError extends Error {
  constructor(
    message: string,
    public code: 'VALIDATION_ERROR' | 'SAVE_ERROR' | 'LOAD_ERROR' | 'PERMISSION_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'JournalError';
  }
}

// ============================================
// SEARCH AND HISTORY TYPES
// ============================================

export type PrivacyLevel = 'private' | 'teacher_shareable' | 'parent_shareable' | 'public';

export interface SearchQuery {
  original: string;
  parsed: {
    terms: string[];
    phrases: string[];
    operator: SearchOperator;
    original: string;
  };
  searchFields: SearchField[];
  operator: SearchOperator;
}

export enum SearchOperator {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  PHRASE = 'PHRASE',
  WILDCARD = 'WILDCARD'
}

export enum SearchField {
  TITLE = 'title',
  CONTENT = 'content',
  TAGS = 'tags',
  EMOTIONS = 'emotions',
  ALL = 'all'
}

export enum SortOption {
  RELEVANCE = 'relevance',
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
  WORD_COUNT = 'word_count',
  TITLE = 'title'
}

export interface SearchMatch {
  type: 'phrase' | 'term';
  text: string;
  position: number;
  length: number;
}

export interface SearchResult {
  id: string;
  title: string;
  highlightedTitle: string;
  createdAt: string;
  wordCount: number;
  relevanceScore: number;
  matchedFields: string[];
  snippet?: string;
  highlightedSnippet?: string;
  privacy: {
    isPrivate: boolean;
    privacyLevel: PrivacyLevel;
  };
}

export interface SearchResponse {
  query: SearchQuery;
  results: SearchResult[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  searchInfo: {
    executionTime: number;
    resultsFound: number;
    searchedEntries: number;
    sortBy: SortOption;
    fromCache: boolean;
  };
  suggestions: SearchSuggestion[];
  searchType: 'basic' | 'advanced';
  encryptionEnabled: boolean;
}

export interface SearchSuggestion {
  type: 'spell_check' | 'broaden' | 'related';
  text: string;
}

export interface AdvancedSearchParams {
  query: string;
  studentId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  emotionFilters?: string[];
  tagFilters?: string[];
  wordCountRange?: {
    min: number;
    max: number;
  };
  privacyFilters?: PrivacyLevel[];
  sortBy?: SortOption;
  limit?: number;
  offset?: number;
}

export interface SearchHistoryItem {
  query: string;
  timestamp: string;
  resultsCount: number;
  executionTime: number;
}

export interface SearchHistoryResponse {
  history: SearchHistoryItem[];
  userId: string;
  total: number;
}

// Timeline and Archive Types
export interface TimelineEntry {
  id: string;
  title: string;
  createdAt: string;
  wordCount: number;
  privacyLevel: PrivacyLevel;
}

export interface TimelineGroup {
  [key: string]: TimelineEntry[];
}

export interface TimelineResponse {
  timeline: TimelineGroup;
  groupBy: 'day' | 'week' | 'month' | 'year';
  timeWindow: number;
  totalEntries: number;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  includeEmotions: boolean;
  includeTags: boolean;
  encryptionEnabled: boolean;
}

export interface NavigationEntry {
  id: string;
  title: string;
  createdAt: string;
}

export interface EntryNavigation {
  current: {
    id: string;
    position: number;
    total: number;
  };
  previous: NavigationEntry | null;
  next: NavigationEntry | null;
}

export interface ArchiveEntry {
  id: string;
  title: string;
  wordCount: number;
  createdAt: string;
  privacyLevel: PrivacyLevel;
}

export interface ArchiveGroup {
  [year: number]: {
    [month: number]: {
      [day: number]: ArchiveEntry[];
    };
  };
}

export interface ArchiveResponse {
  archive: ArchiveGroup;
  filters: {
    year?: string;
    month?: string;
  };
  totalEntries: number;
  includeStats: boolean;
  stats?: JournalStats;
}

// Search Component Props
export interface SearchBarProps {
  onSearch: (query: string, options?: Partial<AdvancedSearchParams>) => void;
  placeholder?: string;
  showAdvanced?: boolean;
  initialQuery?: string;
  isLoading?: boolean;
  suggestions?: SearchSuggestion[];
}

export interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  pagination: SearchResponse['pagination'];
  searchInfo: SearchResponse['searchInfo'];
  onLoadMore?: () => void;
  onResultClick: (entryId: string) => void;
  isLoading?: boolean;
}

export interface AdvancedSearchFormProps {
  onSearch: (params: AdvancedSearchParams) => void;
  onClose: () => void;
  initialParams?: Partial<AdvancedSearchParams>;
  isLoading?: boolean;
}

export interface SearchHistoryProps {
  history: SearchHistoryItem[];
  onSearchFromHistory: (query: string) => void;
  onClearHistory?: () => void;
  isLoading?: boolean;
}

export interface TimelineViewProps {
  timeline: TimelineGroup;
  groupBy: TimelineResponse['groupBy'];
  onGroupByChange: (groupBy: TimelineResponse['groupBy']) => void;
  onEntryClick: (entryId: string) => void;
  isLoading?: boolean;
}

export interface ArchiveViewProps {
  archive: ArchiveGroup;
  filters: ArchiveResponse['filters'];
  onFilterChange: (filters: ArchiveResponse['filters']) => void;
  onEntryClick: (entryId: string) => void;
  stats?: JournalStats;
  isLoading?: boolean;
}

export interface EntryNavigationProps {
  navigation: EntryNavigation;
  onNavigate: (entryId: string) => void;
  isLoading?: boolean;
}

// Search Store State
export interface SearchState {
  // Current search
  currentQuery: string;
  currentResults: SearchResult[];
  searchInfo: SearchResponse['searchInfo'] | null;
  pagination: SearchResponse['pagination'] | null;
  suggestions: SearchSuggestion[];
  
  // Search history
  searchHistory: SearchHistoryItem[];
  
  // Timeline and archive
  timeline: TimelineGroup | null;
  archive: ArchiveGroup | null;
  navigation: EntryNavigation | null;
  
  // UI state
  isSearching: boolean;
  isLoadingHistory: boolean;
  isLoadingTimeline: boolean;
  isLoadingArchive: boolean;
  
  // Advanced search
  advancedSearchVisible: boolean;
  lastAdvancedParams: AdvancedSearchParams | null;
  
  // Errors
  searchError: string | null;
  historyError: string | null;
}

// Search Actions
export interface SearchActions {
  // Basic search
  search: (query: string, options?: { append?: boolean }) => Promise<void>;
  advancedSearch: (params: AdvancedSearchParams, options?: { append?: boolean }) => Promise<void>;
  clearSearch: () => void;
  
  // Search history
  loadSearchHistory: () => Promise<void>;
  clearSearchHistory: () => void;
  searchFromHistory: (query: string) => Promise<void>;
  
  // Timeline and archive
  loadTimeline: (params?: { 
    groupBy?: TimelineResponse['groupBy']; 
    timeWindow?: number;
    studentId?: string;
  }) => Promise<void>;
  loadArchive: (filters?: ArchiveResponse['filters'], studentId?: string) => Promise<void>;
  loadNavigation: (entryId: string, studentId?: string) => Promise<void>;
  
  // Suggestions
  loadSuggestions: (query: string) => Promise<void>;
  
  // UI actions
  setAdvancedSearchVisible: (visible: boolean) => void;
  setSearchError: (error: string | null) => void;
} 