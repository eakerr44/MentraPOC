import React, { useState, useEffect } from 'react';
import { useJournalStore } from '../stores/journalStore';
import { JournalEntryEditor } from '../components/journal/JournalEntryEditor';
import { PrivacyDashboard } from '../components/journal/PrivacyDashboard';
import { ProgressDashboard } from '../components/progress/ProgressDashboard';
import { JournalEntry } from '../types/journal';
import { Plus, BookOpen, Search, Filter, Calendar, Shield, TrendingUp } from 'lucide-react';

export const JournalPage: React.FC = () => {
  const {
    entries,
    isEditorOpen,
    editorMode,
    currentEntry,
    isLoading,
    error,
    loadEntries,
    openEditor,
    closeEditor,
    createEntry,
    updateEntry,
    deleteEntry,
    clearError
  } = useJournalStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isPrivacyDashboardOpen, setIsPrivacyDashboardOpen] = useState(false);
  const [isProgressDashboardOpen, setIsProgressDashboardOpen] = useState(false);

  // Load entries on mount
  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleNewEntry = () => {
    openEditor('create');
  };

  const handleEditEntry = (entry: JournalEntry) => {
    openEditor('edit', entry);
  };

  const handleSaveEntry = async (entryData: any) => {
    try {
      if (editorMode === 'create') {
        await createEntry(entryData);
      } else if (currentEntry) {
        await updateEntry({ id: currentEntry.id, ...entryData });
      }
      closeEditor();
    } catch (error) {
      console.error('Failed to save entry:', error);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await deleteEntry(entryId);
      } catch (error) {
        console.error('Failed to delete entry:', error);
      }
    }
  };

  const filteredEntries = entries.filter(entry =>
    searchQuery === '' || 
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.plainTextContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-red-800">{error}</div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Learning Journal</h1>
            <p className="text-gray-600 mt-2">Track your thoughts, reflections, and daily learning experiences</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Progress Dashboard Button */}
            <button
              onClick={() => setIsProgressDashboardOpen(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              Progress
            </button>
            
            {/* Privacy Dashboard Button */}
            <button
              onClick={() => setIsPrivacyDashboardOpen(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              <Shield className="w-5 h-5 mr-2" />
              Privacy
            </button>
            
            <button
              onClick={handleNewEntry}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Entry
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search your entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
            
            <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <Calendar className="w-4 h-4 mr-2" />
              Date
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-900">{entries.length}</div>
            <div className="text-blue-700 text-sm">Total Entries</div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-900">
              {entries.reduce((sum, entry) => sum + entry.wordCount, 0).toLocaleString()}
            </div>
            <div className="text-green-700 text-sm">Words Written</div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-900">
              {entries.filter(entry => 
                new Date(entry.createdAt).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <div className="text-purple-700 text-sm">Entries Today</div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading your journal entries...</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && entries.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No journal entries yet</h3>
          <p className="text-gray-500 mb-6">Start your learning journey by creating your first entry.</p>
          <button
            onClick={handleNewEntry}
            className="flex items-center mx-auto px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create First Entry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleEditEntry(entry)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
                  {entry.title}
                </h3>
                <div className="flex items-center text-sm text-gray-500">
                  {entry.isPrivate ? '🔒' : '👁️'}
                </div>
              </div>
              
              <div 
                className="text-gray-600 text-sm line-clamp-3 mb-4"
                dangerouslySetInnerHTML={{ 
                  __html: entry.plainTextContent?.substring(0, 150) + '...' || '' 
                }}
              />
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                <span>{entry.wordCount} words</span>
              </div>
              
              {entry.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {entry.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {entry.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{entry.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search Results */}
      {searchQuery && filteredEntries.length === 0 && entries.length > 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500">No entries found matching "{searchQuery}"</div>
        </div>
      )}

      {/* Journal Entry Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="w-full h-full">
            <JournalEntryEditor
              entry={currentEntry || undefined}
              onSave={handleSaveEntry}
              onCancel={closeEditor}
            />
          </div>
        </div>
      )}

      {/* Progress Dashboard Modal */}
      {isProgressDashboardOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-5/6 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Learning Progress</h2>
              <button
                onClick={() => setIsProgressDashboardOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto h-full pb-6">
              <ProgressDashboard
                embedded={true}
                viewMode="student"
              />
            </div>
          </div>
        </div>
      )}

      {/* Privacy Dashboard Modal */}
      {isPrivacyDashboardOpen && (
        <PrivacyDashboard onClose={() => setIsPrivacyDashboardOpen(false)} />
      )}
    </div>
  );
}; 