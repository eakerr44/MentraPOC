const crypto = require('crypto');
const { activityMonitor } = require('./activity-monitor');

// Privacy-related error classes
class PrivacyError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = 'PrivacyError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class PrivacyManager {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    this.privacyAuditLog = new Map(); // In production, this would be a database
    this.notificationQueue = [];
    this.bulkOperations = new Map();
  }

  // Generate encryption key if not provided
  generateEncryptionKey() {
    const key = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️  Generated new encryption key. In production, this should be stored securely.');
    return key;
  }

  // Encrypt sensitive journal content
  encryptContent(content, studentId) {
    try {
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey + studentId);
      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encryptedContent: encrypted,
        isEncrypted: true,
        encryptionMethod: 'aes-256-cbc',
        encryptedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new PrivacyError('Failed to encrypt content', 'ENCRYPTION_ERROR', { error: error.message });
    }
  }

  // Decrypt journal content
  decryptContent(encryptedData, studentId) {
    try {
      if (!encryptedData.isEncrypted) {
        return encryptedData.encryptedContent; // Return as-is if not encrypted
      }

      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey + studentId);
      let decrypted = decipher.update(encryptedData.encryptedContent, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new PrivacyError('Failed to decrypt content', 'DECRYPTION_ERROR', { error: error.message });
    }
  }

  // Process journal entry for privacy (encrypt if private)
  async processJournalEntryPrivacy(entry, options = {}) {
    const { forceEncryption = false } = options;
    
    try {
      // Encrypt content if entry is private or force encryption is enabled
      if (entry.isPrivate || forceEncryption) {
        const encryptionResult = this.encryptContent(entry.content, entry.studentId);
        entry.content = encryptionResult.encryptedContent;
        entry.encryptionMetadata = {
          isEncrypted: true,
          encryptionMethod: encryptionResult.encryptionMethod,
          encryptedAt: encryptionResult.encryptedAt
        };

        // Also encrypt plain text content
        if (entry.plainTextContent) {
          const plainTextResult = this.encryptContent(entry.plainTextContent, entry.studentId);
          entry.plainTextContent = plainTextResult.encryptedContent;
        }
      }

      // Log privacy processing
      await this.logPrivacyEvent({
        studentId: entry.studentId,
        entryId: entry.id,
        action: 'content_processed',
        details: {
          isPrivate: entry.isPrivate,
          encrypted: entry.encryptionMetadata?.isEncrypted || false,
          isShareableWithTeacher: entry.isShareableWithTeacher,
          isShareableWithParent: entry.isShareableWithParent
        }
      });

      return entry;
    } catch (error) {
      console.error('Privacy processing failed:', error);
      throw new PrivacyError('Failed to process entry privacy', 'PROCESSING_ERROR', { error: error.message });
    }
  }

  // Prepare journal entry for viewing (decrypt if needed and user has access)
  async prepareEntryForViewing(entry, viewerRole, viewerId) {
    try {
      // Check access permissions
      const hasAccess = this.checkViewAccess(entry, viewerRole, viewerId);
      if (!hasAccess) {
        throw new PrivacyError('Access denied to private content', 'ACCESS_DENIED', {
          entryId: entry.id,
          viewerRole,
          viewerId
        });
      }

      // Decrypt content if needed
      if (entry.encryptionMetadata?.isEncrypted) {
        entry.content = this.decryptContent({
          encryptedContent: entry.content,
          isEncrypted: true
        }, entry.studentId);

        if (entry.plainTextContent) {
          entry.plainTextContent = this.decryptContent({
            encryptedContent: entry.plainTextContent,
            isEncrypted: true
          }, entry.studentId);
        }
      }

      // Log access
      await this.logPrivacyEvent({
        studentId: entry.studentId,
        entryId: entry.id,
        action: 'content_accessed',
        accessorId: viewerId,
        accessorRole: viewerRole,
        details: {
          wasEncrypted: entry.encryptionMetadata?.isEncrypted || false
        }
      });

      return entry;
    } catch (error) {
      console.error('Entry preparation failed:', error);
      if (error instanceof PrivacyError) throw error;
      throw new PrivacyError('Failed to prepare entry for viewing', 'PREPARATION_ERROR', { error: error.message });
    }
  }

  // Check if a user has access to view an entry
  checkViewAccess(entry, viewerRole, viewerId) {
    // Students can always view their own entries
    if (viewerRole === 'student' && entry.studentId === viewerId) {
      return true;
    }

    // If entry is private, only the student can view it
    if (entry.isPrivate) {
      return false;
    }

    // Teachers can view if sharing is enabled
    if (viewerRole === 'teacher' && entry.isShareableWithTeacher) {
      return true;
    }

    // Parents can view if sharing is enabled
    if (viewerRole === 'parent' && entry.isShareableWithParent) {
      return true;
    }

    return false;
  }

  // Update privacy settings for a journal entry
  async updateEntryPrivacy(entryId, studentId, newPrivacySettings, updatedBy) {
    try {
      const oldSettings = await this.getEntryPrivacySettings(entryId);
      
      // Create audit trail entry
      const auditEntry = {
        id: crypto.randomBytes(8).toString('hex'),
        entryId,
        studentId,
        updatedBy,
        timestamp: new Date().toISOString(),
        action: 'privacy_settings_changed',
        oldSettings,
        newSettings: newPrivacySettings,
        changes: this.calculatePrivacyChanges(oldSettings, newPrivacySettings)
      };

      // Store audit entry
      if (!this.privacyAuditLog.has(entryId)) {
        this.privacyAuditLog.set(entryId, []);
      }
      this.privacyAuditLog.get(entryId).push(auditEntry);

      // Generate notifications for privacy changes
      await this.generatePrivacyChangeNotifications(auditEntry);

      // Log activity
      await activityMonitor.logActivity({
        studentId,
        sessionId: `privacy_${Date.now()}`,
        activityType: 'privacy_settings_updated',
        details: {
          entryId,
          changes: auditEntry.changes,
          updatedBy
        },
        severity: 'low',
        context: {
          feature: 'privacy_management',
          action: 'settings_update'
        }
      });

      return auditEntry;
    } catch (error) {
      console.error('Privacy update failed:', error);
      throw new PrivacyError('Failed to update privacy settings', 'UPDATE_ERROR', { error: error.message });
    }
  }

  // Bulk privacy operations
  async bulkUpdatePrivacy(entryIds, studentId, privacySettings, updatedBy) {
    const operationId = crypto.randomBytes(8).toString('hex');
    
    try {
      const operation = {
        id: operationId,
        studentId,
        updatedBy,
        startTime: new Date().toISOString(),
        entryIds,
        privacySettings,
        results: [],
        status: 'processing',
        errors: []
      };

      this.bulkOperations.set(operationId, operation);

      const results = [];
      for (const entryId of entryIds) {
        try {
          const result = await this.updateEntryPrivacy(entryId, studentId, privacySettings, updatedBy);
          results.push({ entryId, status: 'success', auditId: result.id });
        } catch (error) {
          results.push({ entryId, status: 'error', error: error.message });
          operation.errors.push({ entryId, error: error.message });
        }
      }

      operation.results = results;
      operation.status = 'completed';
      operation.endTime = new Date().toISOString();
      operation.successCount = results.filter(r => r.status === 'success').length;
      operation.errorCount = results.filter(r => r.status === 'error').length;

      // Log bulk operation
      await activityMonitor.logActivity({
        studentId,
        sessionId: `bulk_privacy_${Date.now()}`,
        activityType: 'bulk_privacy_update',
        details: {
          operationId,
          entryCount: entryIds.length,
          successCount: operation.successCount,
          errorCount: operation.errorCount,
          privacySettings
        },
        severity: 'low',
        context: {
          feature: 'privacy_management',
          action: 'bulk_update'
        }
      });

      return operation;
    } catch (error) {
      console.error('Bulk privacy update failed:', error);
      const operation = this.bulkOperations.get(operationId);
      if (operation) {
        operation.status = 'failed';
        operation.error = error.message;
        operation.endTime = new Date().toISOString();
      }
      throw new PrivacyError('Bulk privacy update failed', 'BULK_UPDATE_ERROR', { operationId, error: error.message });
    }
  }

  // Get privacy audit trail for an entry
  async getPrivacyAuditTrail(entryId, studentId) {
    try {
      const auditTrail = this.privacyAuditLog.get(entryId) || [];
      
      // Filter by student ID for security
      const filteredTrail = auditTrail.filter(entry => entry.studentId === studentId);
      
      return {
        entryId,
        auditTrail: filteredTrail,
        totalEvents: filteredTrail.length,
        firstEvent: filteredTrail.length > 0 ? filteredTrail[0].timestamp : null,
        lastEvent: filteredTrail.length > 0 ? filteredTrail[filteredTrail.length - 1].timestamp : null
      };
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      throw new PrivacyError('Failed to retrieve audit trail', 'AUDIT_RETRIEVAL_ERROR', { error: error.message });
    }
  }

  // Get privacy summary for a student
  async getPrivacySummary(studentId, timeWindowDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeWindowDays);

      // Collect all audit events for the student
      const allEvents = [];
      for (const [entryId, events] of this.privacyAuditLog) {
        const studentEvents = events.filter(event => 
          event.studentId === studentId && 
          new Date(event.timestamp) >= cutoffDate
        );
        allEvents.push(...studentEvents);
      }

      // Calculate summary statistics
      const summary = {
        studentId,
        timeWindow: timeWindowDays,
        totalPrivacyEvents: allEvents.length,
        privacyChanges: allEvents.filter(e => e.action === 'privacy_settings_changed').length,
        sharingEnabled: allEvents.filter(e => 
          e.action === 'privacy_settings_changed' && 
          (e.newSettings.isShareableWithTeacher || e.newSettings.isShareableWithParent)
        ).length,
        encryptedAccesses: allEvents.filter(e => 
          e.action === 'content_accessed' && 
          e.details.wasEncrypted
        ).length,
        recentEvents: allEvents
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 10)
      };

      return summary;
    } catch (error) {
      console.error('Failed to generate privacy summary:', error);
      throw new PrivacyError('Failed to generate privacy summary', 'SUMMARY_ERROR', { error: error.message });
    }
  }

  // Generate notifications for privacy changes
  async generatePrivacyChangeNotifications(auditEntry) {
    try {
      const notifications = [];

      // Check what changed
      const changes = auditEntry.changes;
      
      if (changes.includes('privacy_enabled')) {
        notifications.push({
          type: 'privacy_enabled',
          message: 'Your journal entry is now private and encrypted',
          recipient: auditEntry.studentId,
          priority: 'low'
        });
      }

      if (changes.includes('sharing_enabled')) {
        notifications.push({
          type: 'sharing_enabled',
          message: 'Your journal entry is now shared with your teacher or parent',
          recipient: auditEntry.studentId,
          priority: 'medium'
        });
      }

      if (changes.includes('sharing_disabled')) {
        notifications.push({
          type: 'sharing_disabled',
          message: 'Sharing for your journal entry has been disabled',
          recipient: auditEntry.studentId,
          priority: 'medium'
        });
      }

      // Add notifications to queue
      notifications.forEach(notification => {
        notification.id = crypto.randomBytes(8).toString('hex');
        notification.timestamp = new Date().toISOString();
        notification.auditId = auditEntry.id;
        notification.entryId = auditEntry.entryId;
        this.notificationQueue.push(notification);
      });

      return notifications;
    } catch (error) {
      console.error('Failed to generate notifications:', error);
      return [];
    }
  }

  // Log privacy events
  async logPrivacyEvent(event) {
    try {
      const logEntry = {
        id: crypto.randomBytes(8).toString('hex'),
        timestamp: new Date().toISOString(),
        ...event
      };

      // In production, this would go to a proper logging system
      console.log('🔒 Privacy event logged:', logEntry);

      return logEntry;
    } catch (error) {
      console.error('Privacy event logging failed:', error);
    }
  }

  // Helper methods
  getEntryPrivacySettings(entryId) {
    // This would query the database in a real implementation
    // For now, return a mock structure
    return {
      isPrivate: true,
      isShareableWithTeacher: false,
      isShareableWithParent: false
    };
  }

  calculatePrivacyChanges(oldSettings, newSettings) {
    const changes = [];
    
    if (oldSettings.isPrivate !== newSettings.isPrivate) {
      changes.push(newSettings.isPrivate ? 'privacy_enabled' : 'privacy_disabled');
    }
    
    if (oldSettings.isShareableWithTeacher !== newSettings.isShareableWithTeacher ||
        oldSettings.isShareableWithParent !== newSettings.isShareableWithParent) {
      const oldSharing = oldSettings.isShareableWithTeacher || oldSettings.isShareableWithParent;
      const newSharing = newSettings.isShareableWithTeacher || newSettings.isShareableWithParent;
      
      if (!oldSharing && newSharing) {
        changes.push('sharing_enabled');
      } else if (oldSharing && !newSharing) {
        changes.push('sharing_disabled');
      } else {
        changes.push('sharing_modified');
      }
    }

    return changes;
  }

  // Get pending notifications
  getPendingNotifications(userId) {
    return this.notificationQueue.filter(notification => 
      notification.recipient === userId && !notification.sent
    );
  }

  // Mark notification as sent
  markNotificationSent(notificationId) {
    const notification = this.notificationQueue.find(n => n.id === notificationId);
    if (notification) {
      notification.sent = true;
      notification.sentAt = new Date().toISOString();
    }
  }

  // Health check
  async healthCheck() {
    try {
      return {
        status: 'healthy',
        service: 'privacy-manager',
        auditTrailEntries: this.privacyAuditLog.size,
        pendingNotifications: this.notificationQueue.filter(n => !n.sent).length,
        bulkOperations: this.bulkOperations.size,
        encryptionEnabled: !!this.encryptionKey,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'privacy-manager',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
let privacyManagerInstance = null;

const getPrivacyManager = () => {
  if (!privacyManagerInstance) {
    privacyManagerInstance = new PrivacyManager();
  }
  return privacyManagerInstance;
};

module.exports = {
  PrivacyManager,
  getPrivacyManager,
  PrivacyError
}; 