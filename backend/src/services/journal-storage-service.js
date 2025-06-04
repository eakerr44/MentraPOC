const JournalEntryModel = require('../models/JournalEntry');
const { getPrivacyManager } = require('./privacy-manager');
const { activityMonitor } = require('./activity-monitor');

// Journal storage error class
class JournalStorageError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = 'JournalStorageError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class JournalStorageService {
  constructor() {
    this.journalModel = new JournalEntryModel();
    this.privacyManager = getPrivacyManager();
  }

  // Create a new journal entry with full privacy and encryption handling
  async createEntry(entryData, requestInfo = {}) {
    try {
      const {
        studentId,
        title,
        content,
        plainTextContent,
        emotionalState,
        tags = [],
        isPrivate = true,
        isShareableWithTeacher = false,
        isShareableWithParent = false,
        attachments = []
      } = entryData;

      // Validate required fields
      if (!studentId) {
        throw new JournalStorageError('Student ID is required', 'VALIDATION_ERROR');
      }

      if (!title || title.trim().length === 0) {
        throw new JournalStorageError('Title is required', 'VALIDATION_ERROR');
      }

      if (!content || content.trim().length === 0) {
        throw new JournalStorageError('Content is required', 'VALIDATION_ERROR');
      }

      // Validate content length limits
      if (title.length > 500) {
        throw new JournalStorageError('Title too long (max 500 characters)', 'VALIDATION_ERROR');
      }

      if (content.length > 100000) { // 100KB limit
        throw new JournalStorageError('Content too long (max 100KB)', 'VALIDATION_ERROR');
      }

      // Process privacy settings with privacy manager
      const privacyProcessedData = await this.privacyManager.processJournalEntryPrivacy({
        ...entryData,
        isPrivate,
        isShareableWithTeacher,
        isShareableWithParent
      });

      // Create the entry using the model
      const entry = await this.journalModel.create({
        studentId,
        title: title.trim(),
        content: content.trim(),
        plainTextContent: plainTextContent || this.extractPlainText(content),
        emotionalState,
        tags: this.validateAndNormalizeTags(tags),
        isPrivate: privacyProcessedData.isPrivate,
        isShareableWithTeacher: privacyProcessedData.isShareableWithTeacher,
        isShareableWithParent: privacyProcessedData.isShareableWithParent,
        attachments
      });

      // Update privacy audit trail
      await this.privacyManager.updateEntryPrivacy(
        entry.id,
        studentId,
        {
          isPrivate: privacyProcessedData.isPrivate,
          isShareableWithTeacher: privacyProcessedData.isShareableWithTeacher,
          isShareableWithParent: privacyProcessedData.isShareableWithParent
        },
        studentId
      );

      // Log successful creation
      await activityMonitor.logActivity({
        studentId,
        sessionId: requestInfo.sessionId || `journal_create_${Date.now()}`,
        activityType: 'encrypted_journal_entry_created',
        details: {
          entryId: entry.id,
          wordCount: entry.wordCount,
          encryptionEnabled: true,
          privacyLevel: entry.privacyLevel,
          hasEmotionalState: !!emotionalState,
          tagCount: tags.length
        },
        severity: 'low',
        context: {
          feature: 'journal_storage',
          encryption: 'enabled'
        }
      });

      return entry;

    } catch (error) {
      console.error('Error creating journal entry:', error);
      
      if (error instanceof JournalStorageError) {
        throw error;
      }
      
      throw new JournalStorageError(
        'Failed to create journal entry',
        'STORAGE_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Get a journal entry by ID with proper access control and decryption
  async getEntry(entryId, requestingUserId, requestInfo = {}) {
    try {
      if (!entryId) {
        throw new JournalStorageError('Entry ID is required', 'VALIDATION_ERROR');
      }

      if (!requestingUserId) {
        throw new JournalStorageError('Requesting user ID is required', 'VALIDATION_ERROR');
      }

      const entry = await this.journalModel.findById(entryId, requestingUserId, {
        source: requestInfo.source || 'web',
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent
      });

      if (!entry) {
        throw new JournalStorageError('Journal entry not found', 'NOT_FOUND');
      }

      // Additional privacy checks
      const hasPrivacyAccess = await this.privacyManager.checkEntryAccess(
        entryId,
        requestingUserId,
        requestInfo.userRole || 'student'
      );

      if (!hasPrivacyAccess) {
        throw new JournalStorageError('Access denied', 'ACCESS_DENIED');
      }

      // Check if decryption was successful
      if (!entry.encryptionMetadata.decryptionSuccessful) {
        await activityMonitor.logActivity({
          studentId: entry.studentId,
          sessionId: requestInfo.sessionId || `journal_access_${Date.now()}`,
          activityType: 'journal_decryption_failed',
          details: {
            entryId,
            requestingUserId,
            encryptionKeyId: entry.encryptionMetadata.keyId
          },
          severity: 'medium',
          context: {
            feature: 'journal_storage',
            security: 'decryption_failure'
          }
        });

        throw new JournalStorageError(
          'Failed to decrypt journal entry',
          'DECRYPTION_ERROR',
          { entryId, keyId: entry.encryptionMetadata.keyId }
        );
      }

      return entry;

    } catch (error) {
      console.error('Error getting journal entry:', error);
      
      if (error instanceof JournalStorageError) {
        throw error;
      }
      
      throw new JournalStorageError(
        'Failed to retrieve journal entry',
        'STORAGE_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Get journal entries for a student with filtering and pagination
  async getEntries(studentId, requestingUserId, options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        startDate,
        endDate,
        tags,
        emotions,
        searchQuery,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        includePrivate = true
      } = options;

      // Validate pagination parameters
      if (limit > 100) {
        throw new JournalStorageError('Limit cannot exceed 100', 'VALIDATION_ERROR');
      }

      if (offset < 0) {
        throw new JournalStorageError('Offset cannot be negative', 'VALIDATION_ERROR');
      }

      // Check if requesting user can access entries
      const canAccessPrivate = requestingUserId === studentId || 
        await this.checkTeacherStudentRelationship(requestingUserId, studentId) ||
        await this.checkParentStudentRelationship(requestingUserId, studentId);

      const result = await this.journalModel.findByStudentId(studentId, requestingUserId, {
        limit,
        offset,
        startDate,
        endDate,
        tags: tags ? this.validateAndNormalizeTags(tags.split(',')) : undefined,
        emotions,
        searchQuery,
        includePrivate: canAccessPrivate && includePrivate,
        sortBy,
        sortOrder
      });

      // Apply additional privacy filtering if needed
      if (!canAccessPrivate) {
        const isTeacher = await this.checkTeacherStudentRelationship(requestingUserId, studentId);
        const isParent = await this.checkParentStudentRelationship(requestingUserId, studentId);
        
        result.entries = result.entries.filter(entry => 
          !entry.isPrivate || 
          (entry.isShareableWithTeacher && isTeacher) ||
          (entry.isShareableWithParent && isParent)
        );
      }

      return result;

    } catch (error) {
      console.error('Error getting journal entries:', error);
      
      if (error instanceof JournalStorageError) {
        throw error;
      }
      
      throw new JournalStorageError(
        'Failed to retrieve journal entries',
        'STORAGE_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Update a journal entry
  async updateEntry(entryId, updateData, requestingUserId, requestInfo = {}) {
    try {
      if (!entryId) {
        throw new JournalStorageError('Entry ID is required', 'VALIDATION_ERROR');
      }

      if (!requestingUserId) {
        throw new JournalStorageError('Requesting user ID is required', 'VALIDATION_ERROR');
      }

      // Get existing entry to check permissions
      const existingEntry = await this.getEntry(entryId, requestingUserId, requestInfo);
      
      if (existingEntry.studentId !== requestingUserId) {
        throw new JournalStorageError('Only the entry owner can update it', 'ACCESS_DENIED');
      }

      // Validate update data
      if (updateData.title !== undefined && updateData.title.length > 500) {
        throw new JournalStorageError('Title too long (max 500 characters)', 'VALIDATION_ERROR');
      }

      if (updateData.content !== undefined && updateData.content.length > 100000) {
        throw new JournalStorageError('Content too long (max 100KB)', 'VALIDATION_ERROR');
      }

      // Process privacy changes
      let privacyUpdateData = { ...updateData };
      if (updateData.isPrivate !== undefined || 
          updateData.isShareableWithTeacher !== undefined || 
          updateData.isShareableWithParent !== undefined) {
        
        privacyUpdateData = await this.privacyManager.processJournalEntryPrivacy({
          ...existingEntry,
          ...updateData
        });

        // Update privacy audit trail
        await this.privacyManager.updateEntryPrivacy(
          entryId,
          existingEntry.studentId,
          {
            isPrivate: privacyUpdateData.isPrivate,
            isShareableWithTeacher: privacyUpdateData.isShareableWithTeacher,
            isShareableWithParent: privacyUpdateData.isShareableWithParent
          },
          requestingUserId
        );
      }

      // Normalize tags if provided
      if (updateData.tags !== undefined) {
        privacyUpdateData.tags = this.validateAndNormalizeTags(updateData.tags);
      }

      // Extract plain text if content is updated
      if (updateData.content !== undefined && updateData.plainTextContent === undefined) {
        privacyUpdateData.plainTextContent = this.extractPlainText(updateData.content);
      }

      const updatedEntry = await this.journalModel.update(entryId, privacyUpdateData, requestingUserId);

      // Log update activity
      await activityMonitor.logActivity({
        studentId: existingEntry.studentId,
        sessionId: requestInfo.sessionId || `journal_update_${Date.now()}`,
        activityType: 'encrypted_journal_entry_updated',
        details: {
          entryId,
          updatedFields: Object.keys(updateData),
          privacyChanged: !!(updateData.isPrivate !== undefined || 
                            updateData.isShareableWithTeacher !== undefined || 
                            updateData.isShareableWithParent !== undefined)
        },
        severity: 'low',
        context: {
          feature: 'journal_storage',
          operation: 'update'
        }
      });

      return updatedEntry;

    } catch (error) {
      console.error('Error updating journal entry:', error);
      
      if (error instanceof JournalStorageError) {
        throw error;
      }
      
      throw new JournalStorageError(
        'Failed to update journal entry',
        'STORAGE_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Delete a journal entry (soft delete)
  async deleteEntry(entryId, requestingUserId, requestInfo = {}) {
    try {
      if (!entryId) {
        throw new JournalStorageError('Entry ID is required', 'VALIDATION_ERROR');
      }

      if (!requestingUserId) {
        throw new JournalStorageError('Requesting user ID is required', 'VALIDATION_ERROR');
      }

      // Get existing entry to check permissions
      const existingEntry = await this.getEntry(entryId, requestingUserId, requestInfo);
      
      if (existingEntry.studentId !== requestingUserId) {
        throw new JournalStorageError('Only the entry owner can delete it', 'ACCESS_DENIED');
      }

      const result = await this.journalModel.delete(entryId, requestingUserId);

      // Update privacy audit trail for deletion
      await this.privacyManager.updateEntryPrivacy(
        entryId,
        existingEntry.studentId,
        { deleted: true },
        requestingUserId
      );

      // Log deletion activity
      await activityMonitor.logActivity({
        studentId: existingEntry.studentId,
        sessionId: requestInfo.sessionId || `journal_delete_${Date.now()}`,
        activityType: 'encrypted_journal_entry_deleted',
        details: {
          entryId,
          title: existingEntry.title,
          wordCount: existingEntry.wordCount
        },
        severity: 'low',
        context: {
          feature: 'journal_storage',
          operation: 'delete'
        }
      });

      return result;

    } catch (error) {
      console.error('Error deleting journal entry:', error);
      
      if (error instanceof JournalStorageError) {
        throw error;
      }
      
      throw new JournalStorageError(
        'Failed to delete journal entry',
        'STORAGE_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Bulk privacy operations
  async bulkUpdatePrivacy(entryIds, studentId, privacySettings, requestingUserId, requestInfo = {}) {
    try {
      if (!Array.isArray(entryIds) || entryIds.length === 0) {
        throw new JournalStorageError('Entry IDs array is required', 'VALIDATION_ERROR');
      }

      if (entryIds.length > 50) {
        throw new JournalStorageError('Cannot update more than 50 entries at once', 'VALIDATION_ERROR');
      }

      if (studentId !== requestingUserId) {
        throw new JournalStorageError('Can only update your own entries', 'ACCESS_DENIED');
      }

      // Verify all entries belong to the student
      const updatePromises = entryIds.map(async (entryId) => {
        return this.updateEntry(entryId, privacySettings, requestingUserId, requestInfo);
      });

      const results = await Promise.allSettled(updatePromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Log bulk operation
      await activityMonitor.logActivity({
        studentId,
        sessionId: requestInfo.sessionId || `journal_bulk_${Date.now()}`,
        activityType: 'journal_bulk_privacy_update',
        details: {
          totalEntries: entryIds.length,
          successful,
          failed,
          privacySettings
        },
        severity: 'low',
        context: {
          feature: 'journal_storage',
          operation: 'bulk_privacy_update'
        }
      });

      return {
        totalEntries: entryIds.length,
        successful,
        failed,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason.message })
      };

    } catch (error) {
      console.error('Error in bulk privacy update:', error);
      
      if (error instanceof JournalStorageError) {
        throw error;
      }
      
      throw new JournalStorageError(
        'Failed to update privacy settings',
        'STORAGE_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Get journal statistics for a student
  async getJournalStatistics(studentId, requestingUserId, timeWindowDays = 30) {
    try {
      const entries = await this.getEntries(studentId, requestingUserId, {
        limit: 1000, // Get more entries for statistics
        includePrivate: requestingUserId === studentId
      });

      const now = new Date();
      const timeWindow = new Date(now.getTime() - (timeWindowDays * 24 * 60 * 60 * 1000));

      const recentEntries = entries.entries.filter(entry => 
        new Date(entry.createdAt) >= timeWindow
      );

      const totalWordCount = entries.entries.reduce((sum, entry) => sum + entry.wordCount, 0);
      const averageWordsPerEntry = entries.entries.length > 0 ? 
        Math.round(totalWordCount / entries.entries.length) : 0;

      // Calculate streak (simplified)
      const entryDates = entries.entries
        .map(entry => new Date(entry.createdAt).toDateString())
        .sort()
        .reverse();
      
      const uniqueDates = [...new Set(entryDates)];
      let currentStreak = 0;
      
      for (let i = 0; i < uniqueDates.length; i++) {
        const date = new Date(uniqueDates[i]);
        const expectedDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
        
        if (date.toDateString() === expectedDate.toDateString()) {
          currentStreak++;
        } else {
          break;
        }
      }

      return {
        totalEntries: entries.total,
        recentEntries: recentEntries.length,
        totalWordCount,
        averageWordsPerEntry,
        currentStreak,
        timeWindow: timeWindowDays,
        encryptionEnabled: true,
        lastEntryDate: entries.entries.length > 0 ? entries.entries[0].createdAt : null
      };

    } catch (error) {
      console.error('Error getting journal statistics:', error);
      throw new JournalStorageError(
        'Failed to get journal statistics',
        'STORAGE_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Helper methods
  extractPlainText(htmlContent) {
    // Simple HTML tag removal - in production, use a proper HTML parser
    return htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  validateAndNormalizeTags(tags) {
    if (!Array.isArray(tags)) {
      return [];
    }

    return tags
      .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
      .map(tag => tag.trim().toLowerCase())
      .filter((tag, index, arr) => arr.indexOf(tag) === index) // Remove duplicates
      .slice(0, 10); // Limit to 10 tags
  }

  // Stub methods for relationship checking (would be implemented based on your user model)
  async checkTeacherStudentRelationship(teacherId, studentId) {
    // In a full implementation, this would check if the teacher has access to the student
    return false;
  }

  async checkParentStudentRelationship(parentId, studentId) {
    // In a full implementation, this would check if the parent has access to the student
    return false;
  }

  // Health check for the storage service
  async healthCheck() {
    try {
      // Test database connection
      const testResult = await this.journalModel.pool.query('SELECT 1 as test');
      
      // Test privacy manager
      const privacyHealth = await this.privacyManager.healthCheck();

      return {
        status: 'healthy',
        service: 'journal-storage-service',
        features: {
          encryption: 'enabled',
          privacyManagement: privacyHealth.status,
          databaseConnection: testResult.rows.length > 0 ? 'connected' : 'disconnected'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'journal-storage-service',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
let journalStorageInstance = null;

const getJournalStorageService = () => {
  if (!journalStorageInstance) {
    journalStorageInstance = new JournalStorageService();
  }
  return journalStorageInstance;
};

module.exports = {
  JournalStorageService,
  getJournalStorageService,
  JournalStorageError
}; 