import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  JournalEntry, 
  JournalEntryDraft, 
  JournalSettings, 
  JournalStats,
  JournalEntryFilters,
  CreateJournalEntryRequest,
  UpdateJournalEntryRequest,
  JournalError 
} from '../types/journal';
import JournalApiService from '../services/journalApi';

interface JournalState {
  // Data state
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  draft: JournalEntryDraft | null;
  settings: JournalSettings | null;
  stats: JournalStats | null;
  suggestedTags: string[];
  
  // UI state
  isLoading: boolean;
  isSaving: boolean;
  isAutoSaving: boolean;
  error: string | null;
  filters: JournalEntryFilters;
  hasMore: boolean;
  total: number;
  
  // Search state
  searchQuery: string;
  searchResults: JournalEntry[];
  isSearching: boolean;
  
  // Editor state
  isEditorOpen: boolean;
  editorMode: 'create' | 'edit';
  autoSaveTimer: NodeJS.Timeout | null;
  
  // Actions
  // Entry management
  loadEntries: (filters?: JournalEntryFilters) => Promise<void>;
  loadMoreEntries: () => Promise<void>;
  createEntry: (entryData: CreateJournalEntryRequest) => Promise<JournalEntry>;
  updateEntry: (entryData: UpdateJournalEntryRequest) => Promise<JournalEntry>;
  deleteEntry: (entryId: string) => Promise<void>;
  setCurrentEntry: (entry: JournalEntry | null) => void;
  
  // Draft management
  updateDraft: (draft: Partial<JournalEntryDraft>) => void;
  saveDraft: () => Promise<void>;
  loadDraft: (entryId: string) => Promise<void>;
  clearDraft: () => void;
  
  // Search
  searchEntries: (query: string) => Promise<void>;
  clearSearch: () => void;
  setFilters: (filters: Partial<JournalEntryFilters>) => void;
  
  // Settings and stats
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<JournalSettings>) => Promise<void>;
  loadStats: () => Promise<void>;
  loadSuggestedTags: () => Promise<void>;
  
  // Editor UI
  openEditor: (mode: 'create' | 'edit', entry?: JournalEntry) => void;
  closeEditor: () => void;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Auto-save
  startAutoSave: () => void;
  stopAutoSave: () => void;
  
  // Utilities
  reset: () => void;
}

const initialState = {
  entries: [],
  currentEntry: null,
  draft: null,
  settings: null,
  stats: null,
  suggestedTags: [],
  isLoading: false,
  isSaving: false,
  isAutoSaving: false,
  error: null,
  filters: {},
  hasMore: false,
  total: 0,
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  isEditorOpen: false,
  editorMode: 'create' as const,
  autoSaveTimer: null,
};

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Entry management
      loadEntries: async (filters = {}) => {
        set({ isLoading: true, error: null });
        try {
          const response = await JournalApiService.getEntries(filters);
          set({
            entries: response.entries,
            total: response.total,
            hasMore: response.hasMore,
            filters: response.filters,
            isLoading: false,
          });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to load entries', 
            isLoading: false 
          });
        }
      },

      loadMoreEntries: async () => {
        const { filters, entries, hasMore, isLoading } = get();
        if (!hasMore || isLoading) return;

        set({ isLoading: true });
        try {
          const response = await JournalApiService.getEntries({
            ...filters,
            offset: entries.length,
          });
          set({
            entries: [...entries, ...response.entries],
            hasMore: response.hasMore,
            isLoading: false,
          });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to load more entries', 
            isLoading: false 
          });
        }
      },

      createEntry: async (entryData) => {
        set({ isSaving: true, error: null });
        try {
          const newEntry = await JournalApiService.createEntry(entryData);
          const { entries } = get();
          set({
            entries: [newEntry, ...entries],
            currentEntry: newEntry,
            isSaving: false,
            isEditorOpen: false,
          });
          get().clearDraft();
          return newEntry;
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to create entry', 
            isSaving: false 
          });
          throw error;
        }
      },

      updateEntry: async (entryData) => {
        set({ isSaving: true, error: null });
        try {
          const updatedEntry = await JournalApiService.updateEntry(entryData);
          const { entries } = get();
          const updatedEntries = entries.map(entry => 
            entry.id === updatedEntry.id ? updatedEntry : entry
          );
          set({
            entries: updatedEntries,
            currentEntry: updatedEntry,
            isSaving: false,
            isEditorOpen: false,
          });
          get().clearDraft();
          return updatedEntry;
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to update entry', 
            isSaving: false 
          });
          throw error;
        }
      },

      deleteEntry: async (entryId) => {
        set({ isLoading: true, error: null });
        try {
          await JournalApiService.deleteEntry(entryId);
          const { entries } = get();
          const updatedEntries = entries.filter(entry => entry.id !== entryId);
          set({
            entries: updatedEntries,
            currentEntry: null,
            isLoading: false,
          });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to delete entry', 
            isLoading: false 
          });
        }
      },

      setCurrentEntry: (entry) => {
        set({ currentEntry: entry });
      },

      // Draft management
      updateDraft: (draftUpdate) => {
        const { draft } = get();
        const updatedDraft = { ...draft, ...draftUpdate } as JournalEntryDraft;
        set({ draft: updatedDraft });
      },

      saveDraft: async () => {
        const { draft, currentEntry } = get();
        if (!draft) return;

        set({ isAutoSaving: true });
        try {
          await JournalApiService.saveDraft(
            currentEntry?.id || null,
            draft.content,
            draft.title
          );
          set({ isAutoSaving: false });
        } catch (error: any) {
          console.warn('Auto-save failed:', error.message);
          set({ isAutoSaving: false });
        }
      },

      loadDraft: async (entryId) => {
        try {
          const draftData = await JournalApiService.getDraft(entryId);
          if (draftData) {
            const { draft } = get();
            set({
              draft: {
                ...draft,
                title: draftData.title,
                content: draftData.content,
              } as JournalEntryDraft
            });
          }
        } catch (error: any) {
          console.warn('Failed to load draft:', error.message);
        }
      },

      clearDraft: () => {
        set({ draft: null });
        get().stopAutoSave();
      },

      // Search
      searchEntries: async (query) => {
        set({ isSearching: true, searchQuery: query, error: null });
        try {
          const response = await JournalApiService.searchEntries(query, get().filters);
          set({
            searchResults: response.entries,
            isSearching: false,
          });
        } catch (error: any) {
          set({ 
            error: error.message || 'Search failed', 
            isSearching: false 
          });
        }
      },

      clearSearch: () => {
        set({ searchQuery: '', searchResults: [] });
      },

      setFilters: (newFilters) => {
        const { filters } = get();
        const updatedFilters = { ...filters, ...newFilters };
        set({ filters: updatedFilters });
        get().loadEntries(updatedFilters);
      },

      // Settings and stats
      loadSettings: async () => {
        try {
          const settings = await JournalApiService.getSettings();
          set({ settings });
        } catch (error: any) {
          console.warn('Failed to load settings:', error.message);
        }
      },

      updateSettings: async (settingsUpdate) => {
        try {
          const updatedSettings = await JournalApiService.updateSettings(settingsUpdate);
          set({ settings: updatedSettings });
        } catch (error: any) {
          set({ error: error.message || 'Failed to update settings' });
        }
      },

      loadStats: async () => {
        try {
          const stats = await JournalApiService.getStats();
          set({ stats });
        } catch (error: any) {
          console.warn('Failed to load stats:', error.message);
        }
      },

      loadSuggestedTags: async () => {
        try {
          const suggestedTags = await JournalApiService.getSuggestedTags();
          set({ suggestedTags });
        } catch (error: any) {
          console.warn('Failed to load suggested tags:', error.message);
        }
      },

      // Editor UI
      openEditor: (mode, entry) => {
        set({
          isEditorOpen: true,
          editorMode: mode,
          currentEntry: entry || null,
        });

        if (mode === 'create') {
          const { settings } = get();
          set({
            draft: {
              title: '',
              content: '',
              tags: [],
              isPrivate: settings?.defaultPrivacy === 'private',
              isShareableWithTeacher: settings?.defaultPrivacy === 'teacher-shareable',
              isShareableWithParent: settings?.defaultPrivacy === 'parent-shareable',
            },
          });
        } else if (entry) {
          set({
            draft: {
              title: entry.title,
              content: entry.content,
              tags: entry.tags,
              isPrivate: entry.isPrivate,
              isShareableWithTeacher: entry.isShareableWithTeacher,
              isShareableWithParent: entry.isShareableWithParent,
              emotionalState: entry.emotionalState,
              mood: entry.mood,
            },
          });
          get().loadDraft(entry.id);
        }

        get().startAutoSave();
      },

      closeEditor: () => {
        set({
          isEditorOpen: false,
          currentEntry: null,
        });
        get().clearDraft();
      },

      // Error handling
      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // Auto-save
      startAutoSave: () => {
        const { settings, autoSaveTimer } = get();
        if (autoSaveTimer) clearInterval(autoSaveTimer);

        const interval = (settings?.autoSaveInterval || 30) * 1000; // Convert to milliseconds
        const timer = setInterval(() => {
          get().saveDraft();
        }, interval);

        set({ autoSaveTimer: timer });
      },

      stopAutoSave: () => {
        const { autoSaveTimer } = get();
        if (autoSaveTimer) {
          clearInterval(autoSaveTimer);
          set({ autoSaveTimer: null });
        }
      },

      // Utilities
      reset: () => {
        get().stopAutoSave();
        set(initialState);
      },
    }),
    {
      name: 'journal-store',
      partialize: (state) => ({
        settings: state.settings,
        filters: state.filters,
        // Don't persist loading states, errors, or timers
      }),
    }
  )
); 