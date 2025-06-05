const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { roleCheck } = require('../middleware/role-check');
const { getReflectionPromptGenerator } = require('../services/reflection-prompt-generator');
const { getEmotionalIntelligenceAnalyzer } = require('../services/emotional-intelligence-analyzer');
const { getPrivacyManager } = require('../services/privacy-manager');
const { getProgressAnalyzer } = require('../services/progress-analyzer');
const { getJournalStorageService } = require('../services/journal-storage-service');
const { getJournalSearchService, SEARCH_FIELDS, SORT_OPTIONS } = require('../services/journal-search-service');
const { activityMonitor } = require('../services/activity-monitor');

// Mock database for development - replace with actual database integration
const mockJournalEntries = new Map();
const mockReflectionPrompts = new Map();
const mockPromptResponses = new Map();
const mockJournalSettings = new Map();

// Helper function to generate IDs
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper function to get user from request
const getUserFromRequest = (req) => {
  return {
    id: req.user.id,
    role: req.user.role,
    age: req.user.age || null
  };
};

// Helper function to get request info for activity logging
const getRequestInfo = (req) => {
  return {
    sessionId: req.sessionId || `${req.user.id}_${Date.now()}`,
    source: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web',
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    userRole: req.user.role
  };
};

// ============================================
// JOURNAL ENTRY ROUTES (with encryption)
// ============================================

// Get all journal entries for a student
router.get('/entries', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    
    // Development mode: Return mock data for demo tokens
    if (process.env.NODE_ENV === 'development' && user.id === 'demo-user-1') {
      console.log('📝 Returning mock journal entries for demo user');
      
      return res.json({
        entries: [
          {
            id: 'entry-1',
            title: 'My First Day Learning',
            content: 'Today was an amazing day! I learned so much about mathematics and really enjoyed the problem-solving exercises.',
            mood: 'excited',
            emotionalState: ['happy', 'motivated'],
            tags: ['math', 'learning', 'growth'],
            isPrivate: false,
            createdAt: '2024-01-20T10:00:00Z',
            updatedAt: '2024-01-20T10:00:00Z'
          },
          {
            id: 'entry-2',
            title: 'Struggling with Fractions',
            content: 'Today I had a harder time with fractions. I need to practice more, but I\'m not giving up!',
            mood: 'determined',
            emotionalState: ['challenged', 'persistent'],
            tags: ['math', 'fractions', 'challenge'],
            isPrivate: true,
            createdAt: '2024-01-19T15:30:00Z',
            updatedAt: '2024-01-19T15:30:00Z'
          },
          {
            id: 'entry-3',
            title: 'Great Day in Science',
            content: 'We did an experiment with chemical reactions today. It was so cool to see the colors change!',
            mood: 'curious',
            emotionalState: ['fascinated', 'engaged'],
            tags: ['science', 'experiment', 'chemistry'],
            isPrivate: false,
            createdAt: '2024-01-18T14:15:00Z',
            updatedAt: '2024-01-18T14:15:00Z'
          }
        ],
        total: 3,
        hasMore: false,
        pagination: {
          limit: 20,
          offset: 0,
          page: 1,
          totalPages: 1
        },
        encryptionEnabled: true,
        filters: req.query
      });
    }
    
    const requestInfo = getRequestInfo(req);
    const {
      startDate,
      endDate,
      emotions,
      tags,
      isPrivate,
      searchQuery,
      limit = 20,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const journalStorage = getJournalStorageService();

    // Get the target student ID (for teachers/parents accessing student data)
    const targetStudentId = req.query.studentId || user.id;

    const result = await journalStorage.getEntries(targetStudentId, user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      startDate,
      endDate,
      tags,
      emotions,
      searchQuery,
      sortBy,
      sortOrder: sortOrder.toUpperCase(),
      includePrivate: isPrivate !== 'false'
    });

    res.json({
      entries: result.entries,
      total: result.total,
      hasMore: result.hasMore,
      pagination: result.pagination,
      encryptionEnabled: true,
      filters: { startDate, endDate, emotions, tags, isPrivate, searchQuery, limit, offset, sortBy, sortOrder }
    });

  } catch (error) {
    console.error('Error fetching journal entries:', error);
    
    if (error.type === 'ACCESS_DENIED') {
      return res.status(403).json({ error: error.message });
    }
    if (error.type === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
});

// Create a new journal entry
router.post('/entries', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const requestInfo = getRequestInfo(req);
    const {
      title,
      content,
      plainTextContent,
      emotionalState,
      mood,
      tags = [],
      isPrivate = true,
      isShareableWithTeacher = false,
      isShareableWithParent = false
    } = req.body;

    const journalStorage = getJournalStorageService();

    const entry = await journalStorage.createEntry({
      studentId: user.id,
      title,
      content,
      plainTextContent,
      emotionalState,
      mood,
      tags,
      isPrivate,
      isShareableWithTeacher,
      isShareableWithParent
    }, requestInfo);

    res.status(201).json({
      ...entry,
      encryptionStatus: 'encrypted',
      storageType: 'database'
    });

  } catch (error) {
    console.error('Error creating journal entry:', error);
    
    if (error.type === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

// Get a specific journal entry
router.get('/entries/:entryId', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const requestInfo = getRequestInfo(req);
    const { entryId } = req.params;

    const journalStorage = getJournalStorageService();

    const entry = await journalStorage.getEntry(entryId, user.id, requestInfo);

    res.json({
      ...entry,
      encryptionStatus: entry.encryptionMetadata.decryptionSuccessful ? 'decrypted' : 'decryption_failed'
    });

  } catch (error) {
    console.error('Error fetching journal entry:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Journal entry not found' });
    }
    if (error.type === 'ACCESS_DENIED') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (error.type === 'DECRYPTION_ERROR') {
      return res.status(500).json({ 
        error: 'Failed to decrypt journal entry',
        details: 'The entry appears to be corrupted or uses an incompatible encryption key'
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch journal entry' });
  }
});

// Update a journal entry
router.put('/entries/:entryId', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const requestInfo = getRequestInfo(req);
    const { entryId } = req.params;

    const journalStorage = getJournalStorageService();

    const updatedEntry = await journalStorage.updateEntry(entryId, req.body, user.id, requestInfo);

    res.json({
      ...updatedEntry,
      encryptionStatus: 'encrypted',
      updateTimestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating journal entry:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Journal entry not found' });
    }
    if (error.type === 'ACCESS_DENIED') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (error.type === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to update journal entry' });
  }
});

// Delete a journal entry
router.delete('/entries/:entryId', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const requestInfo = getRequestInfo(req);
    const { entryId } = req.params;

    const journalStorage = getJournalStorageService();

    await journalStorage.deleteEntry(entryId, user.id, requestInfo);

    res.status(204).end();

  } catch (error) {
    console.error('Error deleting journal entry:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Journal entry not found' });
    }
    if (error.type === 'ACCESS_DENIED') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.status(500).json({ error: 'Failed to delete journal entry' });
  }
});

// ============================================
// JOURNAL STATISTICS AND SETTINGS ROUTES (updated for encryption)
// ============================================

// Get journal statistics
router.get('/stats', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { timeWindowDays = 30 } = req.query;
    const targetStudentId = req.query.studentId || user.id;

    const journalStorage = getJournalStorageService();

    const stats = await journalStorage.getJournalStatistics(
      targetStudentId, 
      user.id, 
      parseInt(timeWindowDays)
    );

    res.json(stats);

  } catch (error) {
    console.error('Error fetching journal stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get journal settings (placeholder - would integrate with user preferences)
router.get('/settings', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    
    // For now, return default settings with encryption info
    const settings = {
      userId: user.id,
      autoSaveInterval: 30,
      defaultPrivacy: 'private',
      enableEmotionalTracking: true,
      enableAIPrompts: true,
      encryptionEnabled: true,
      encryptionMethod: 'aes256',
      weeklyGoals: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.json(settings);

  } catch (error) {
    console.error('Error fetching journal settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update journal settings
router.put('/settings', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const updates = req.body;

    // For now, just echo back the updates with encryption settings
    const updatedSettings = {
      userId: user.id,
      ...updates,
      encryptionEnabled: true, // Always enabled
      encryptionMethod: 'aes256',
      updatedAt: new Date().toISOString()
    };

    res.json(updatedSettings);

  } catch (error) {
    console.error('Error updating journal settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Health check for encrypted journal storage
router.get('/storage/health', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const journalStorage = getJournalStorageService();
    const health = await journalStorage.healthCheck();
    
    res.json(health);
  } catch (error) {
    console.error('Error checking journal storage health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// BULK OPERATIONS WITH ENCRYPTION
// ============================================

// Bulk update privacy settings
router.put('/entries/privacy/bulk', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const requestInfo = getRequestInfo(req);
    const { entryIds, privacySettings } = req.body;

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return res.status(400).json({ error: 'entryIds array is required' });
    }

    if (!privacySettings || typeof privacySettings !== 'object') {
      return res.status(400).json({ error: 'privacySettings object is required' });
    }

    const journalStorage = getJournalStorageService();

    const result = await journalStorage.bulkUpdatePrivacy(
      entryIds, 
      user.id, 
      privacySettings, 
      user.id, 
      requestInfo
    );

    res.json({
      ...result,
      encryptionMaintained: true,
      operationType: 'bulk_privacy_update'
    });

  } catch (error) {
    console.error('Error in bulk privacy update:', error);
    
    if (error.type === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    if (error.type === 'ACCESS_DENIED') {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

// ============================================
// JOURNAL SEARCH AND HISTORY ROUTES
// ============================================

// Basic journal search
router.get('/search', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const requestInfo = getRequestInfo(req);
    const {
      q: query,
      studentId,
      fields,
      sort = SORT_OPTIONS.RELEVANCE,
      limit = 20,
      offset = 0,
      highlights = 'true',
      snippets = 'true'
    } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const targetStudentId = studentId || user.id;
    const searchFields = fields ? fields.split(',') : [SEARCH_FIELDS.ALL];

    const journalSearch = getJournalSearchService();

    const searchResult = await journalSearch.searchJournalEntries({
      studentId: targetStudentId,
      requestingUserId: user.id,
      query,
      searchFields,
      sortBy: sort,
      limit: parseInt(limit),
      offset: parseInt(offset),
      highlightResults: highlights === 'true',
      includeSnippets: snippets === 'true',
      requestInfo
    });

    res.json({
      ...searchResult,
      searchType: 'basic',
      encryptionEnabled: true
    });

  } catch (error) {
    console.error('Error performing journal search:', error);
    
    if (error.type === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    if (error.type === 'ACCESS_DENIED') {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to search journal entries' });
  }
});

// Advanced journal search with complex filters
router.post('/search/advanced', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const requestInfo = getRequestInfo(req);
    const {
      query,
      studentId,
      dateRange,
      emotionFilters,
      tagFilters,
      wordCountRange,
      privacyFilters,
      sortBy = SORT_OPTIONS.RELEVANCE,
      limit = 20,
      offset = 0
    } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const targetStudentId = studentId || user.id;

    const journalSearch = getJournalSearchService();

    const searchResult = await journalSearch.advancedSearch({
      studentId: targetStudentId,
      requestingUserId: user.id,
      advancedQuery: query,
      dateRange,
      emotionFilters,
      tagFilters,
      wordCountRange,
      privacyFilters,
      sortBy,
      limit: parseInt(limit),
      offset: parseInt(offset),
      requestInfo
    });

    res.json({
      ...searchResult,
      searchType: 'advanced',
      encryptionEnabled: true
    });

  } catch (error) {
    console.error('Error performing advanced journal search:', error);
    
    if (error.type === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    if (error.type === 'ACCESS_DENIED') {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to perform advanced search' });
  }
});

// Get search history for a user
router.get('/search/history', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { limit = 50 } = req.query;

    const journalSearch = getJournalSearchService();
    const searchHistory = await journalSearch.getSearchHistory(user.id, parseInt(limit));

    res.json({
      history: searchHistory,
      userId: user.id,
      total: searchHistory.length
    });

  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({ error: 'Failed to fetch search history' });
  }
});

// Get search suggestions
router.get('/search/suggestions', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    const journalSearch = getJournalSearchService();
    const suggestions = await journalSearch.generateSearchSuggestions(query, 0);

    res.json({
      query,
      suggestions
    });

  } catch (error) {
    console.error('Error generating search suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// ============================================
// JOURNAL HISTORY AND TIMELINE ROUTES
// ============================================

// Get journal timeline/history view
router.get('/timeline', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      studentId,
      timeWindow = 90, // days
      groupBy = 'month', // day, week, month, year
      includeEmotions = 'true',
      includeTags = 'true',
      limit = 100
    } = req.query;

    const targetStudentId = studentId || user.id;
    const journalStorage = getJournalStorageService();

    // Get entries for the timeline
    const entries = await journalStorage.getEntries(targetStudentId, user.id, {
      limit: parseInt(limit),
      sortBy: 'created_at',
      sortOrder: 'DESC',
      includePrivate: user.id === targetStudentId
    });

    // Group entries by time period
    const timeline = groupEntriesByTime(entries.entries, groupBy);

    // Add metadata for timeline visualization
    const timelineData = {
      timeline,
      groupBy,
      timeWindow: parseInt(timeWindow),
      totalEntries: entries.total,
      dateRange: {
        start: entries.entries.length > 0 ? entries.entries[entries.entries.length - 1].createdAt : null,
        end: entries.entries.length > 0 ? entries.entries[0].createdAt : null
      },
      includeEmotions: includeEmotions === 'true',
      includeTags: includeTags === 'true',
      encryptionEnabled: true
    };

    res.json(timelineData);

  } catch (error) {
    console.error('Error fetching journal timeline:', error);
    res.status(500).json({ error: 'Failed to fetch journal timeline' });
  }
});

// Get journal entry navigation (previous/next)
router.get('/entries/:entryId/navigation', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { entryId } = req.params;
    const { studentId } = req.query;

    const targetStudentId = studentId || user.id;
    const journalStorage = getJournalStorageService();

    // Get current entry
    const currentEntry = await journalStorage.getEntry(entryId, user.id);
    if (!currentEntry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    // Get all entries to find navigation
    const allEntries = await journalStorage.getEntries(targetStudentId, user.id, {
      limit: 1000,
      sortBy: 'created_at',
      sortOrder: 'ASC',
      includePrivate: user.id === targetStudentId
    });

    const currentIndex = allEntries.entries.findIndex(entry => entry.id === entryId);
    
    const navigation = {
      current: {
        id: entryId,
        position: currentIndex + 1,
        total: allEntries.entries.length
      },
      previous: currentIndex > 0 ? {
        id: allEntries.entries[currentIndex - 1].id,
        title: allEntries.entries[currentIndex - 1].title,
        createdAt: allEntries.entries[currentIndex - 1].createdAt
      } : null,
      next: currentIndex < allEntries.entries.length - 1 ? {
        id: allEntries.entries[currentIndex + 1].id,
        title: allEntries.entries[currentIndex + 1].title,
        createdAt: allEntries.entries[currentIndex + 1].createdAt
      } : null
    };

    res.json(navigation);

  } catch (error) {
    console.error('Error fetching navigation:', error);
    res.status(500).json({ error: 'Failed to fetch navigation' });
  }
});

// Get journal archive (entries grouped by date)
router.get('/archive', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      studentId,
      year,
      month,
      includeStats = 'true'
    } = req.query;

    const targetStudentId = studentId || user.id;
    const journalStorage = getJournalStorageService();

    // Build date filters
    const filters = {};
    if (year) {
      const startDate = new Date(parseInt(year), month ? parseInt(month) - 1 : 0, 1);
      const endDate = month 
        ? new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
        : new Date(parseInt(year) + 1, 0, 0, 23, 59, 59);
      
      filters.startDate = startDate.toISOString();
      filters.endDate = endDate.toISOString();
    }

    const entries = await journalStorage.getEntries(targetStudentId, user.id, {
      ...filters,
      limit: 500,
      sortBy: 'created_at',
      sortOrder: 'DESC',
      includePrivate: user.id === targetStudentId
    });

    // Group by year/month/day for archive view
    const archive = groupEntriesForArchive(entries.entries);

    const archiveData = {
      archive,
      filters: { year, month },
      totalEntries: entries.total,
      includeStats: includeStats === 'true'
    };

    // Add statistics if requested
    if (includeStats === 'true') {
      const stats = await journalStorage.getJournalStatistics(targetStudentId, user.id, 365);
      archiveData.stats = stats;
    }

    res.json(archiveData);

  } catch (error) {
    console.error('Error fetching journal archive:', error);
    res.status(500).json({ error: 'Failed to fetch journal archive' });
  }
});

// Health check for search service
router.get('/search/health', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const journalSearch = getJournalSearchService();
    const health = await journalSearch.healthCheck();
    
    res.json(health);
  } catch (error) {
    console.error('Error checking search service health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper functions for timeline and archive grouping
function groupEntriesByTime(entries, groupBy) {
  const groups = {};
  
  entries.forEach(entry => {
    const date = new Date(entry.createdAt);
    let key;
    
    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        key = date.getFullYear().toString();
        break;
      default:
        key = date.toISOString().split('T')[0];
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(entry);
  });
  
  return groups;
}

function groupEntriesForArchive(entries) {
  const archive = {};
  
  entries.forEach(entry => {
    const date = new Date(entry.createdAt);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    if (!archive[year]) archive[year] = {};
    if (!archive[year][month]) archive[year][month] = {};
    if (!archive[year][month][day]) archive[year][month][day] = [];
    
    archive[year][month][day].push({
      id: entry.id,
      title: entry.title,
      wordCount: entry.wordCount,
      createdAt: entry.createdAt,
      privacyLevel: entry.privacyLevel
    });
  });
  
  return archive;
}

// ============================================
// EMOTIONAL INTELLIGENCE ANALYSIS ROUTES
// ============================================

// Get comprehensive emotional intelligence analysis for a student
router.get('/emotional-intelligence/analysis/:studentId?', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const studentId = req.params.studentId || user.id;
    const {
      timeWindowDays = 30,
      includeRecommendations = true,
      studentAge = null
    } = req.query;

    // Check access permissions
    if (user.role === 'student' && studentId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get journal entries for analysis
    const journalEntries = Array.from(mockJournalEntries.values())
      .filter(entry => entry.studentId === studentId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Get reflection responses for analysis
    const reflectionResponses = Array.from(mockReflectionPrompts.values())
      .filter(prompt => prompt.studentId === studentId && prompt.response)
      .sort((a, b) => new Date(b.respondedAt) - new Date(a.respondedAt));

    // Perform emotional intelligence analysis
    const eiAnalyzer = getEmotionalIntelligenceAnalyzer();
    const analysis = await eiAnalyzer.analyzeEmotionalIntelligence({
      studentId,
      journalEntries,
      reflectionResponses,
      timeWindowDays: parseInt(timeWindowDays),
      includeRecommendations: includeRecommendations === 'true',
      studentAge: studentAge ? parseInt(studentAge) : null
    });

    res.json(analysis);

  } catch (error) {
    console.error('Error performing EI analysis:', error);
    res.status(500).json({ error: 'Failed to perform emotional intelligence analysis' });
  }
});

// Get emotional intelligence competency breakdown
router.get('/emotional-intelligence/competencies/:studentId?', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const studentId = req.params.studentId || user.id;

    // Check access permissions
    if (user.role === 'student' && studentId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get recent analysis or perform new one
    const journalEntries = Array.from(mockJournalEntries.values())
      .filter(entry => entry.studentId === studentId);

    const reflectionResponses = Array.from(mockReflectionPrompts.values())
      .filter(prompt => prompt.studentId === studentId && prompt.response);

    if (journalEntries.length === 0 && reflectionResponses.length === 0) {
      return res.json({
        competencies: {},
        message: 'Insufficient data for competency analysis'
      });
    }

    const eiAnalyzer = getEmotionalIntelligenceAnalyzer();
    const analysis = await eiAnalyzer.analyzeEmotionalIntelligence({
      studentId,
      journalEntries,
      reflectionResponses,
      timeWindowDays: 30,
      includeRecommendations: false
    });

    res.json({
      competencies: analysis.competencyAssessment,
      developmentStage: analysis.developmentStage,
      dataQuality: analysis.metadata.dataQuality,
      confidence: analysis.metadata.confidence
    });

  } catch (error) {
    console.error('Error getting EI competencies:', error);
    res.status(500).json({ error: 'Failed to get emotional intelligence competencies' });
  }
});

// Get emotional growth tracking over time
router.get('/emotional-intelligence/growth/:studentId?', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const studentId = req.params.studentId || user.id;
    const { timeWindowDays = 60 } = req.query;

    // Check access permissions
    if (user.role === 'student' && studentId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const journalEntries = Array.from(mockJournalEntries.values())
      .filter(entry => entry.studentId === studentId);

    const reflectionResponses = Array.from(mockReflectionPrompts.values())
      .filter(prompt => prompt.studentId === studentId && prompt.response);

    const eiAnalyzer = getEmotionalIntelligenceAnalyzer();
    const analysis = await eiAnalyzer.analyzeEmotionalIntelligence({
      studentId,
      journalEntries,
      reflectionResponses,
      timeWindowDays: parseInt(timeWindowDays),
      includeRecommendations: false
    });

    res.json({
      growthAnalysis: analysis.growthAnalysis,
      patternAnalysis: analysis.patternAnalysis,
      timeWindow: timeWindowDays,
      dataPoints: analysis.emotionalData.totalDataPoints
    });

  } catch (error) {
    console.error('Error getting EI growth analysis:', error);
    res.status(500).json({ error: 'Failed to get emotional growth analysis' });
  }
});

// Get emotional patterns and insights
router.get('/emotional-intelligence/patterns/:studentId?', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const studentId = req.params.studentId || user.id;

    // Check access permissions
    if (user.role === 'student' && studentId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const journalEntries = Array.from(mockJournalEntries.values())
      .filter(entry => entry.studentId === studentId);

    const reflectionResponses = Array.from(mockReflectionPrompts.values())
      .filter(prompt => prompt.studentId === studentId && prompt.response);

    const eiAnalyzer = getEmotionalIntelligenceAnalyzer();
    const analysis = await eiAnalyzer.analyzeEmotionalIntelligence({
      studentId,
      journalEntries,
      reflectionResponses,
      timeWindowDays: 30,
      includeRecommendations: false
    });

    res.json({
      patterns: analysis.patternAnalysis,
      insights: analysis.insights,
      vocabulary: analysis.emotionalData.summary.vocabularyList,
      emotionFrequency: analysis.emotionalData.summary.mostFrequentEmotions
    });

  } catch (error) {
    console.error('Error getting EI patterns:', error);
    res.status(500).json({ error: 'Failed to get emotional patterns' });
  }
});

// Get personalized EI recommendations
router.get('/emotional-intelligence/recommendations/:studentId?', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const studentId = req.params.studentId || user.id;

    // Check access permissions
    if (user.role === 'student' && studentId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const journalEntries = Array.from(mockJournalEntries.values())
      .filter(entry => entry.studentId === studentId);

    const reflectionResponses = Array.from(mockReflectionPrompts.values())
      .filter(prompt => prompt.studentId === studentId && prompt.response);

    const eiAnalyzer = getEmotionalIntelligenceAnalyzer();
    const analysis = await eiAnalyzer.analyzeEmotionalIntelligence({
      studentId,
      journalEntries,
      reflectionResponses,
      timeWindowDays: 30,
      includeRecommendations: true
    });

    res.json({
      recommendations: analysis.recommendations,
      developmentStage: {
        stage: analysis.developmentStage.stage,
        key: analysis.developmentStage.key,
        alignment: analysis.developmentStage.alignment
      },
      priorityAreas: analysis.competencyAssessment.developmentAreas,
      strengths: analysis.competencyAssessment.strengths
    });

  } catch (error) {
    console.error('Error getting EI recommendations:', error);
    res.status(500).json({ error: 'Failed to get emotional intelligence recommendations' });
  }
});

// Track emotional intelligence milestone achievements
router.post('/emotional-intelligence/milestones/:studentId?', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const studentId = req.params.studentId || user.id;
    const { milestoneType, achievement, context } = req.body;

    // Only students can track their own milestones
    if (studentId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Log milestone achievement
    await activityMonitor.logActivity({
      studentId,
      sessionId: `ei_milestone_${Date.now()}`,
      activityType: 'emotional_intelligence_milestone',
      details: {
        milestoneType,
        achievement,
        context,
        timestamp: new Date().toISOString()
      },
      severity: 'low',
      context: {
        feature: 'emotional_intelligence',
        milestone: milestoneType
      }
    });

    res.json({
      success: true,
      message: 'Milestone recorded successfully',
      milestone: {
        type: milestoneType,
        achievement,
        date: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error tracking EI milestone:', error);
    res.status(500).json({ error: 'Failed to track milestone' });
  }
});

// Get emotional intelligence dashboard data
router.get('/emotional-intelligence/dashboard/:studentId?', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const studentId = req.params.studentId || user.id;

    // Check access permissions
    if (user.role === 'student' && studentId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const journalEntries = Array.from(mockJournalEntries.values())
      .filter(entry => entry.studentId === studentId);

    const reflectionResponses = Array.from(mockReflectionPrompts.values())
      .filter(prompt => prompt.studentId === studentId && prompt.response);

    if (journalEntries.length === 0 && reflectionResponses.length === 0) {
      return res.json({
        message: 'No emotional data available',
        suggestions: [
          'Start by creating journal entries with emotional tracking',
          'Respond to emotional reflection prompts',
          'Use emotion identification features regularly'
        ]
      });
    }

    const eiAnalyzer = getEmotionalIntelligenceAnalyzer();
    const analysis = await eiAnalyzer.analyzeEmotionalIntelligence({
      studentId,
      journalEntries,
      reflectionResponses,
      timeWindowDays: 30,
      includeRecommendations: true
    });

    // Create dashboard summary
    const dashboard = {
      summary: {
        overallScore: analysis.competencyAssessment.overallScores.overall,
        dataQuality: analysis.metadata.dataQuality.level,
        confidence: analysis.metadata.confidence,
        timeWindow: analysis.timeWindow,
        lastAnalysis: analysis.analysisDate
      },
      competencyScores: analysis.competencyAssessment.overallScores,
      recentInsights: analysis.insights.slice(0, 3),
      topRecommendations: analysis.recommendations ? 
        analysis.recommendations.immediate.slice(0, 2) : [],
      emotionalVocabulary: {
        size: analysis.emotionalData.summary.vocabularySize,
        recent: analysis.emotionalData.summary.vocabularyList.slice(0, 8)
      },
      growthTrend: analysis.growthAnalysis.overallTrend,
      strengths: analysis.competencyAssessment.strengths,
      developmentAreas: analysis.competencyAssessment.developmentAreas,
      milestones: analysis.growthAnalysis.milestones || [],
      nextAnalysisDate: analysis.metadata.nextAnalysisRecommended
    };

    res.json(dashboard);

  } catch (error) {
    console.error('Error generating EI dashboard:', error);
    res.status(500).json({ error: 'Failed to generate emotional intelligence dashboard' });
  }
});

// Health check for emotional intelligence analyzer
router.get('/emotional-intelligence/health', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const eiAnalyzer = getEmotionalIntelligenceAnalyzer();
    const health = await eiAnalyzer.healthCheck();
    
    res.json(health);
  } catch (error) {
    console.error('Error checking EI analyzer health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// PRIVACY MANAGEMENT ROUTES
// ============================================

// Get privacy audit trail for a journal entry
router.get('/entries/:entryId/privacy/audit', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { entryId } = req.params;

    // Check if user owns the entry
    const entry = mockJournalEntries.get(entryId);
    if (!entry || entry.studentId !== user.id) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    const privacyManager = getPrivacyManager();
    const auditTrail = await privacyManager.getPrivacyAuditTrail(entryId, user.id);

    res.json(auditTrail);

  } catch (error) {
    console.error('Error fetching privacy audit trail:', error);
    res.status(500).json({ error: 'Failed to fetch privacy audit trail' });
  }
});

// Update privacy settings for a journal entry
router.put('/entries/:entryId/privacy', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { entryId } = req.params;
    const { isPrivate, isShareableWithTeacher, isShareableWithParent } = req.body;

    // Check if user owns the entry
    const entry = mockJournalEntries.get(entryId);
    if (!entry || entry.studentId !== user.id) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    const privacySettings = {
      isPrivate: isPrivate !== undefined ? isPrivate : entry.isPrivate,
      isShareableWithTeacher: isShareableWithTeacher !== undefined ? isShareableWithTeacher : entry.isShareableWithTeacher,
      isShareableWithParent: isShareableWithParent !== undefined ? isShareableWithParent : entry.isShareableWithParent
    };

    // Update entry with new privacy settings
    const updatedEntry = {
      ...entry,
      ...privacySettings,
      updatedAt: new Date().toISOString()
    };

    // Process privacy changes with privacy manager
    const privacyManager = getPrivacyManager();
    const processedEntry = await privacyManager.processJournalEntryPrivacy(updatedEntry);
    
    // Update privacy audit trail
    await privacyManager.updateEntryPrivacy(entryId, user.id, privacySettings, user.id);

    mockJournalEntries.set(entryId, processedEntry);

    res.json(processedEntry);

  } catch (error) {
    console.error('Error updating entry privacy:', error);
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

// Get privacy summary for a student
router.get('/privacy/summary', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { timeWindowDays = 30 } = req.query;

    const privacyManager = getPrivacyManager();
    const summary = await privacyManager.getPrivacySummary(user.id, parseInt(timeWindowDays));

    res.json(summary);

  } catch (error) {
    console.error('Error fetching privacy summary:', error);
    res.status(500).json({ error: 'Failed to fetch privacy summary' });
  }
});

// Get privacy notifications for a student
router.get('/privacy/notifications', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);

    const privacyManager = getPrivacyManager();
    const notifications = privacyManager.getPendingNotifications(user.id);

    res.json({ notifications });

  } catch (error) {
    console.error('Error fetching privacy notifications:', error);
    res.status(500).json({ error: 'Failed to fetch privacy notifications' });
  }
});

// Mark privacy notification as read
router.put('/privacy/notifications/:notificationId/read', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const { notificationId } = req.params;

    const privacyManager = getPrivacyManager();
    privacyManager.markNotificationSent(notificationId);

    res.json({ success: true });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Privacy manager health check
router.get('/privacy/health', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const privacyManager = getPrivacyManager();
    const health = await privacyManager.healthCheck();
    
    res.json(health);
  } catch (error) {
    console.error('Error checking privacy manager health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// PROGRESS VISUALIZATION ROUTES
// ============================================

// Get comprehensive progress analysis for a student
router.get('/progress/analysis/:studentId?', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const studentId = req.params.studentId || user.id;
    const {
      timeWindowDays = 90,
      timePeriod = 'WEEKLY',
      metricTypes,
      includeProjections = true,
      includeMilestones = true
    } = req.query;

    // Check access permissions
    if (user.role === 'student' && studentId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get student's journal entries and reflection responses
    const journalEntries = Array.from(mockJournalEntries.values())
      .filter(entry => entry.studentId === studentId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const reflectionResponses = Array.from(mockReflectionPrompts.values())
      .filter(prompt => prompt.studentId === studentId && prompt.response)
      .sort((a, b) => new Date(b.respondedAt) - new Date(a.respondedAt));

    if (journalEntries.length === 0 && reflectionResponses.length === 0) {
      return res.json({
        message: 'No data available for progress analysis',
        suggestions: [
          'Create journal entries with emotional tracking',
          'Respond to reflection prompts',
          'Use the journaling feature regularly'
        ],
        studentId,
        analysisDate: new Date().toISOString()
      });
    }

    // Parse metric types
    const requestedMetricTypes = metricTypes 
      ? metricTypes.split(',')
      : ['WRITING_GROWTH', 'EMOTIONAL_GROWTH', 'REFLECTION_DEPTH', 'LEARNING_CONSISTENCY'];

    // Perform progress analysis
    const progressAnalyzer = getProgressAnalyzer();
    const analysis = await progressAnalyzer.analyzeStudentProgress({
      studentId,
      journalEntries,
      reflectionResponses,
      timeWindowDays: parseInt(timeWindowDays),
      timePeriod,
      metricTypes: requestedMetricTypes,
      includeProjections: includeProjections === 'true',
      includeMilestones: includeMilestones === 'true'
    });

    res.json(analysis);

  } catch (error) {
    console.error('Error generating progress analysis:', error);
    res.status(500).json({ error: 'Failed to generate progress analysis' });
  }
});

// Get specific progress metrics for a student
router.get('/progress/metrics/:metricType/:studentId?', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const studentId = req.params.studentId || user.id;
    const { metricType } = req.params;
    const { timeWindowDays = 30, timePeriod = 'WEEKLY' } = req.query;

    // Check access permissions
    if (user.role === 'student' && studentId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get student data
    const journalEntries = Array.from(mockJournalEntries.values())
      .filter(entry => entry.studentId === studentId);

    const reflectionResponses = Array.from(mockReflectionPrompts.values())
      .filter(prompt => prompt.studentId === studentId && prompt.response);

    const progressAnalyzer = getProgressAnalyzer();
    
    // Create minimal time series data for single metric
    const timeSeriesData = progressAnalyzer.processTimeSeriesData(
      journalEntries,
      reflectionResponses,
      parseInt(timeWindowDays),
      timePeriod
    );

    // Calculate specific metric
    const metrics = await progressAnalyzer.calculateProgressMetrics(
      metricType,
      timeSeriesData,
      { studentId, timeWindowDays: parseInt(timeWindowDays) }
    );

    res.json({
      studentId,
      metricType,
      timeWindow: { days: parseInt(timeWindowDays), period: timePeriod },
      metrics,
      calculatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting progress metrics:', error);
    res.status(500).json({ error: 'Failed to get progress metrics' });
  }
});

// Get growth trends for visualization
router.get('/progress/trends/:studentId?', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const studentId = req.params.studentId || user.id;
    const { timeWindowDays = 60, timePeriod = 'WEEKLY' } = req.query;

    // Check access permissions
    if (user.role === 'student' && studentId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const journalEntries = Array.from(mockJournalEntries.values())
      .filter(entry => entry.studentId === studentId);

    const reflectionResponses = Array.from(mockReflectionPrompts.values())
      .filter(prompt => prompt.studentId === studentId && prompt.response);

    const progressAnalyzer = getProgressAnalyzer();
    const analysis = await progressAnalyzer.analyzeStudentProgress({
      studentId,
      journalEntries,
      reflectionResponses,
      timeWindowDays: parseInt(timeWindowDays),
      timePeriod,
      metricTypes: ['WRITING_GROWTH', 'EMOTIONAL_GROWTH', 'REFLECTION_DEPTH'],
      includeProjections: false,
      includeMilestones: false
    });

    res.json({
      studentId,
      trends: analysis.growthTrends,
      visualizationData: analysis.visualizationData,
      timeWindow: analysis.timeWindow,
      confidence: analysis.metadata.confidence
    });

  } catch (error) {
    console.error('Error getting growth trends:', error);
    res.status(500).json({ error: 'Failed to get growth trends' });
  }
});

// Get milestone achievements
router.get('/progress/milestones/:studentId?', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const studentId = req.params.studentId || user.id;
    const { timeWindowDays = 180 } = req.query;

    // Check access permissions
    if (user.role === 'student' && studentId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const journalEntries = Array.from(mockJournalEntries.values())
      .filter(entry => entry.studentId === studentId);

    const reflectionResponses = Array.from(mockReflectionPrompts.values())
      .filter(prompt => prompt.studentId === studentId && prompt.response);

    const progressAnalyzer = getProgressAnalyzer();
    const analysis = await progressAnalyzer.analyzeStudentProgress({
      studentId,
      journalEntries,
      reflectionResponses,
      timeWindowDays: parseInt(timeWindowDays),
      includeMilestones: true,
      includeProjections: false
    });

    res.json({
      studentId,
      milestones: analysis.milestones,
      overallProgress: analysis.overallProgress,
      insights: analysis.insights.filter(insight => insight.type === 'achievement'),
      timeWindow: analysis.timeWindow
    });

  } catch (error) {
    console.error('Error getting milestones:', error);
    res.status(500).json({ error: 'Failed to get milestones' });
  }
});

// Get progress projections
router.get('/progress/projections/:studentId?', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const studentId = req.params.studentId || user.id;
    const { timeWindowDays = 90, timePeriod = 'WEEKLY' } = req.query;

    // Check access permissions
    if (user.role === 'student' && studentId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const journalEntries = Array.from(mockJournalEntries.values())
      .filter(entry => entry.studentId === studentId);

    const reflectionResponses = Array.from(mockReflectionPrompts.values())
      .filter(prompt => prompt.studentId === studentId && prompt.response);

    if (journalEntries.length < 5) {
      return res.json({
        message: 'Insufficient data for reliable projections',
        minimumRequired: 5,
        currentEntries: journalEntries.length,
        recommendations: [
          'Create more journal entries',
          'Use the reflection features regularly',
          'Continue journaling for at least 2 more weeks'
        ]
      });
    }

    const progressAnalyzer = getProgressAnalyzer();
    const analysis = await progressAnalyzer.analyzeStudentProgress({
      studentId,
      journalEntries,
      reflectionResponses,
      timeWindowDays: parseInt(timeWindowDays),
      timePeriod,
      includeProjections: true,
      includeMilestones: false
    });

    res.json({
      studentId,
      projections: analysis.projections,
      growthTrends: analysis.growthTrends,
      confidence: analysis.metadata.confidence,
      timeWindow: analysis.timeWindow,
      recommendations: analysis.insights.filter(insight => insight.actionable)
    });

  } catch (error) {
    console.error('Error getting projections:', error);
    res.status(500).json({ error: 'Failed to get progress projections' });
  }
});

// Get progress summary/dashboard data
router.get('/progress/summary/:studentId?', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const studentId = req.params.studentId || user.id;

    // Check access permissions
    if (user.role === 'student' && studentId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const journalEntries = Array.from(mockJournalEntries.values())
      .filter(entry => entry.studentId === studentId);

    const reflectionResponses = Array.from(mockReflectionPrompts.values())
      .filter(prompt => prompt.studentId === studentId && prompt.response);

    if (journalEntries.length === 0) {
      return res.json({
        studentId,
        message: 'No progress data available',
        suggestions: [
          'Start by creating your first journal entry',
          'Use emotional tracking features',
          'Respond to reflection prompts'
        ],
        quickStats: {
          totalEntries: 0,
          totalReflections: 0,
          daysActive: 0
        }
      });
    }

    const progressAnalyzer = getProgressAnalyzer();
    const analysis = await progressAnalyzer.analyzeStudentProgress({
      studentId,
      journalEntries,
      reflectionResponses,
      timeWindowDays: 30,
      timePeriod: 'WEEKLY',
      includeMilestones: true,
      includeProjections: false
    });

    // Create summary for dashboard
    const summary = {
      studentId,
      lastUpdated: new Date().toISOString(),
      quickStats: {
        totalEntries: journalEntries.length,
        totalReflections: reflectionResponses.length,
        currentStreak: analysis.progressMetrics.LEARNING_CONSISTENCY?.metrics.entry_streaks?.current || 0,
        overallScore: analysis.overallProgress.score
      },
      recentProgress: {
        level: analysis.overallProgress.level,
        interpretation: analysis.overallProgress.interpretation,
        nextMilestone: analysis.overallProgress.nextMilestone
      },
      topInsights: analysis.insights.slice(0, 3),
      recentMilestones: analysis.milestones.slice(0, 2),
      growthAreas: {
        strongest: analysis.insights.find(i => i.type === 'strength')?.title || 'Keep exploring!',
        developing: analysis.insights.find(i => i.type === 'opportunity')?.title || 'All areas looking good!'
      },
      visualizationData: {
        progressChart: analysis.visualizationData.lineCharts,
        competencyRadar: analysis.visualizationData.radarCharts,
        trendIndicators: analysis.visualizationData.trendIndicators
      }
    };

    res.json(summary);

  } catch (error) {
    console.error('Error getting progress summary:', error);
    res.status(500).json({ error: 'Failed to get progress summary' });
  }
});

// Get available progress metric types
router.get('/progress/metric-types', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const progressAnalyzer = getProgressAnalyzer();
    
    res.json({
      metricTypes: progressAnalyzer.metricsRegistry,
      timePeriods: progressAnalyzer.timePeriods,
      availableVisualizations: [
        'line_charts',
        'bar_charts', 
        'radar_charts',
        'progress_bars',
        'trend_indicators',
        'milestone_timeline'
      ]
    });

  } catch (error) {
    console.error('Error getting metric types:', error);
    res.status(500).json({ error: 'Failed to get metric types' });
  }
});

// Health check for progress analyzer
router.get('/progress/health', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const progressAnalyzer = getProgressAnalyzer();
    const health = await progressAnalyzer.healthCheck();
    
    res.json(health);
  } catch (error) {
    console.error('Error checking progress analyzer health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 