const { Pool } = require('pg');
const { getPrivacyManager } = require('../services/privacy-manager');
const { activityMonitor } = require('../services/activity-monitor');

class JournalEntryModel {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.privacyManager = getPrivacyManager();
  }

  // Create a new journal entry with encryption
  async create(entryData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

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

      // Calculate metadata
      const wordCount = plainTextContent ? plainTextContent.split(/\s+/).length : 0;
      const readingTimeMinutes = Math.ceil(wordCount / 200);

      // Generate encryption key for this entry
      const encryptionKeyId = await this.generateEncryptionKey(studentId);
      const encryptionKey = await this.getEncryptionKey(encryptionKeyId);

      // Encrypt content using database functions
      const encryptedContentResult = await client.query(
        'SELECT encrypt_journal_content($1, $2) as encrypted_content',
        [content, encryptionKey]
      );
      const encryptedContent = encryptedContentResult.rows[0].encrypted_content;

      const encryptedPlainTextResult = await client.query(
        'SELECT encrypt_journal_content($1, $2) as encrypted_plain_text',
        [plainTextContent, encryptionKey]
      );
      const encryptedPlainText = encryptedPlainTextResult.rows[0].encrypted_plain_text;

      // Generate content hash for integrity
      const contentHashResult = await client.query(
        'SELECT generate_content_hash($1) as content_hash',
        [content]
      );
      const contentHash = contentHashResult.rows[0].content_hash;

      // Determine privacy level
      const privacyLevel = this.determinePrivacyLevel(isPrivate, isShareableWithTeacher, isShareableWithParent);

      // Insert journal entry
      const entryResult = await client.query(`
        INSERT INTO journal_entries (
          student_id, title, encrypted_content, encrypted_plain_text, content_hash,
          word_count, reading_time_minutes, privacy_level,
          is_private, is_shareable_with_teacher, is_shareable_with_parent,
          encryption_method, encryption_key_id, encrypted_at, encryption_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14)
        RETURNING id, created_at
      `, [
        studentId, title, encryptedContent, encryptedPlainText, contentHash,
        wordCount, readingTimeMinutes, privacyLevel,
        isPrivate, isShareableWithTeacher, isShareableWithParent,
        'aes256', encryptionKeyId, 1
      ]);

      const entryId = entryResult.rows[0].id;
      const createdAt = entryResult.rows[0].created_at;

      // Handle emotional state
      if (emotionalState) {
        await this.saveEmotionalState(client, entryId, emotionalState);
      }

      // Handle tags
      if (tags.length > 0) {
        await this.saveTags(client, entryId, tags, studentId);
      }

      // Handle attachments
      if (attachments.length > 0) {
        await this.saveAttachments(client, entryId, attachments);
      }

      await client.query('COMMIT');

      // Log activity
      await activityMonitor.logActivity({
        studentId,
        sessionId: `journal_create_${Date.now()}`,
        activityType: 'journal_entry_created',
        details: {
          entryId,
          wordCount,
          isPrivate,
          hasEmotionalState: !!emotionalState,
          tagCount: tags.length,
          attachmentCount: attachments.length
        },
        severity: 'low'
      });

      return {
        id: entryId,
        studentId,
        title,
        content: content, // Return unencrypted for immediate use
        plainTextContent,
        wordCount,
        readingTimeMinutes,
        privacyLevel,
        isPrivate,
        isShareableWithTeacher,
        isShareableWithParent,
        emotionalState,
        tags,
        attachments,
        createdAt,
        updatedAt: createdAt,
        lastEditedAt: createdAt,
        encryptionMetadata: {
          isEncrypted: true,
          encryptionMethod: 'aes256',
          encryptedAt: new Date(),
          keyId: encryptionKeyId
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating journal entry:', error);
      throw new Error('Failed to create journal entry');
    } finally {
      client.release();
    }
  }

  // Find journal entry by ID with decryption
  async findById(entryId, requestingUserId, requestInfo = {}) {
    const client = await this.pool.connect();
    
    try {
      // Get entry metadata
      const entryResult = await client.query(`
        SELECT 
          id, student_id, title, encrypted_content, encrypted_plain_text, content_hash,
          word_count, reading_time_minutes, privacy_level,
          is_private, is_shareable_with_teacher, is_shareable_with_parent,
          encryption_method, encryption_key_id, encrypted_at, encryption_version,
          created_at, updated_at, last_edited_at, published_at
        FROM journal_entries 
        WHERE id = $1 AND deleted_at IS NULL
      `, [entryId]);

      if (entryResult.rows.length === 0) {
        return null;
      }

      const entry = entryResult.rows[0];

      // Check access permissions
      const hasAccess = await this.checkAccess(entry, requestingUserId);
      if (!hasAccess) {
        throw new Error('Access denied to this journal entry');
      }

      // Decrypt content
      const encryptionKey = await this.getEncryptionKey(entry.encryption_key_id);
      
      let content = null;
      let plainTextContent = null;
      let decryptionSuccessful = true;

      try {
        if (entry.encrypted_content) {
          const decryptedContentResult = await client.query(
            'SELECT decrypt_journal_content($1, $2) as content',
            [entry.encrypted_content, encryptionKey]
          );
          content = decryptedContentResult.rows[0].content;
        }

        if (entry.encrypted_plain_text) {
          const decryptedPlainTextResult = await client.query(
            'SELECT decrypt_journal_content($1, $2) as plain_text',
            [entry.encrypted_plain_text, encryptionKey]
          );
          plainTextContent = decryptedPlainTextResult.rows[0].plain_text;
        }
      } catch (decryptError) {
        console.error('Decryption failed:', decryptError);
        decryptionSuccessful = false;
        content = '[DECRYPTION_FAILED]';
        plainTextContent = '[DECRYPTION_FAILED]';
      }

      // Log access
      await this.logAccess(entryId, requestingUserId, 'read', requestInfo, decryptionSuccessful);

      // Get related data
      const [emotionalState, tags, attachments] = await Promise.all([
        this.getEmotionalState(client, entryId),
        this.getTags(client, entryId),
        this.getAttachments(client, entryId)
      ]);

      return {
        id: entry.id,
        studentId: entry.student_id,
        title: entry.title,
        content,
        plainTextContent,
        wordCount: entry.word_count,
        readingTimeMinutes: entry.reading_time_minutes,
        privacyLevel: entry.privacy_level,
        isPrivate: entry.is_private,
        isShareableWithTeacher: entry.is_shareable_with_teacher,
        isShareableWithParent: entry.is_shareable_with_parent,
        emotionalState,
        tags,
        attachments,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
        lastEditedAt: entry.last_edited_at,
        publishedAt: entry.published_at,
        encryptionMetadata: {
          isEncrypted: true,
          encryptionMethod: entry.encryption_method,
          encryptedAt: entry.encrypted_at,
          keyId: entry.encryption_key_id,
          decryptionSuccessful
        }
      };

    } catch (error) {
      console.error('Error finding journal entry:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Find journal entries by student ID
  async findByStudentId(studentId, requestingUserId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      startDate,
      endDate,
      tags,
      emotions,
      searchQuery,
      includePrivate = true,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const client = await this.pool.connect();
    
    try {
      let whereConditions = ['student_id = $1', 'deleted_at IS NULL'];
      let queryParams = [studentId];
      let paramCount = 1;

      // Add date filters
      if (startDate) {
        paramCount++;
        whereConditions.push(`created_at >= $${paramCount}`);
        queryParams.push(startDate);
      }

      if (endDate) {
        paramCount++;
        whereConditions.push(`created_at <= $${paramCount}`);
        queryParams.push(endDate);
      }

      // Privacy filtering
      if (!includePrivate && requestingUserId !== studentId) {
        whereConditions.push('is_private = FALSE');
      }

      // Build query
      const query = `
        SELECT 
          id, student_id, title, word_count, reading_time_minutes,
          privacy_level, is_private, is_shareable_with_teacher, is_shareable_with_parent,
          created_at, updated_at, last_edited_at, published_at
        FROM journal_entries 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      const result = await client.query(query, queryParams);

      // For list views, we don't decrypt content for performance
      // Content decryption happens when individual entries are requested
      const entries = result.rows.map(row => ({
        id: row.id,
        studentId: row.student_id,
        title: row.title,
        wordCount: row.word_count,
        readingTimeMinutes: row.reading_time_minutes,
        privacyLevel: row.privacy_level,
        isPrivate: row.is_private,
        isShareableWithTeacher: row.is_shareable_with_teacher,
        isShareableWithParent: row.is_shareable_with_parent,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastEditedAt: row.last_edited_at,
        publishedAt: row.published_at,
        encryptionMetadata: {
          isEncrypted: true,
          contentAvailable: false // Content not loaded for performance
        }
      }));

      // Get total count for pagination
      const countResult = await client.query(`
        SELECT COUNT(*) as total
        FROM journal_entries 
        WHERE ${whereConditions.slice(0, -2).join(' AND ')}
      `, queryParams.slice(0, -2));

      const total = parseInt(countResult.rows[0].total);

      return {
        entries,
        total,
        hasMore: offset + limit < total,
        pagination: {
          limit,
          offset,
          total
        }
      };

    } catch (error) {
      console.error('Error finding journal entries:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update journal entry
  async update(entryId, updateData, requestingUserId) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // First check if entry exists and user has access
      const existing = await this.findById(entryId, requestingUserId);
      if (!existing) {
        throw new Error('Journal entry not found');
      }

      if (existing.studentId !== requestingUserId) {
        throw new Error('Access denied');
      }

      const {
        title,
        content,
        plainTextContent,
        emotionalState,
        tags,
        isPrivate,
        isShareableWithTeacher,
        isShareableWithParent
      } = updateData;

      let updateFields = [];
      let updateValues = [];
      let paramCount = 0;

      // Handle content updates (re-encrypt if content changed)
      if (content !== undefined) {
        const encryptionKey = await this.getEncryptionKey(existing.encryptionMetadata.keyId);
        
        paramCount++;
        const encryptedContentResult = await client.query(
          'SELECT encrypt_journal_content($1, $2) as encrypted_content',
          [content, encryptionKey]
        );
        updateFields.push(`encrypted_content = $${paramCount}`);
        updateValues.push(encryptedContentResult.rows[0].encrypted_content);

        // Update content hash
        paramCount++;
        const contentHashResult = await client.query(
          'SELECT generate_content_hash($1) as content_hash',
          [content]
        );
        updateFields.push(`content_hash = $${paramCount}`);
        updateValues.push(contentHashResult.rows[0].content_hash);

        // Update word count
        const wordCount = plainTextContent ? plainTextContent.split(/\s+/).length : 0;
        paramCount++;
        updateFields.push(`word_count = $${paramCount}`);
        updateValues.push(wordCount);

        paramCount++;
        updateFields.push(`reading_time_minutes = $${paramCount}`);
        updateValues.push(Math.ceil(wordCount / 200));
      }

      if (plainTextContent !== undefined) {
        const encryptionKey = await this.getEncryptionKey(existing.encryptionMetadata.keyId);
        
        paramCount++;
        const encryptedPlainTextResult = await client.query(
          'SELECT encrypt_journal_content($1, $2) as encrypted_plain_text',
          [plainTextContent, encryptionKey]
        );
        updateFields.push(`encrypted_plain_text = $${paramCount}`);
        updateValues.push(encryptedPlainTextResult.rows[0].encrypted_plain_text);
      }

      // Handle other field updates
      if (title !== undefined) {
        paramCount++;
        updateFields.push(`title = $${paramCount}`);
        updateValues.push(title);
      }

      if (isPrivate !== undefined) {
        paramCount++;
        updateFields.push(`is_private = $${paramCount}`);
        updateValues.push(isPrivate);
      }

      if (isShareableWithTeacher !== undefined) {
        paramCount++;
        updateFields.push(`is_shareable_with_teacher = $${paramCount}`);
        updateValues.push(isShareableWithTeacher);
      }

      if (isShareableWithParent !== undefined) {
        paramCount++;
        updateFields.push(`is_shareable_with_parent = $${paramCount}`);
        updateValues.push(isShareableWithParent);
      }

      // Update privacy level if any privacy setting changed
      if (isPrivate !== undefined || isShareableWithTeacher !== undefined || isShareableWithParent !== undefined) {
        const privacyLevel = this.determinePrivacyLevel(
          isPrivate !== undefined ? isPrivate : existing.isPrivate,
          isShareableWithTeacher !== undefined ? isShareableWithTeacher : existing.isShareableWithTeacher,
          isShareableWithParent !== undefined ? isShareableWithParent : existing.isShareableWithParent
        );
        paramCount++;
        updateFields.push(`privacy_level = $${paramCount}`);
        updateValues.push(privacyLevel);
      }

      // Always update last_edited_at
      updateFields.push('last_edited_at = NOW()');

      if (updateFields.length > 0) {
        paramCount++;
        updateValues.push(entryId);

        const updateQuery = `
          UPDATE journal_entries 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCount}
          RETURNING updated_at, last_edited_at
        `;

        await client.query(updateQuery, updateValues);
      }

      // Handle emotional state updates
      if (emotionalState !== undefined) {
        await this.updateEmotionalState(client, entryId, emotionalState);
      }

      // Handle tag updates
      if (tags !== undefined) {
        await this.updateTags(client, entryId, tags, requestingUserId);
      }

      await client.query('COMMIT');

      // Log access
      await this.logAccess(entryId, requestingUserId, 'edit', {}, true);

      // Return updated entry
      return await this.findById(entryId, requestingUserId);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating journal entry:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Soft delete journal entry
  async delete(entryId, requestingUserId) {
    const client = await this.pool.connect();
    
    try {
      // Check access first
      const entry = await this.findById(entryId, requestingUserId);
      if (!entry) {
        throw new Error('Journal entry not found');
      }

      if (entry.studentId !== requestingUserId) {
        throw new Error('Access denied');
      }

      // Soft delete
      await client.query(
        'UPDATE journal_entries SET deleted_at = NOW() WHERE id = $1',
        [entryId]
      );

      // Log access
      await this.logAccess(entryId, requestingUserId, 'delete', {}, true);

      return true;

    } catch (error) {
      console.error('Error deleting journal entry:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper methods
  determinePrivacyLevel(isPrivate, isShareableWithTeacher, isShareableWithParent) {
    if (isPrivate) return 'private';
    if (isShareableWithTeacher && isShareableWithParent) return 'public';
    if (isShareableWithTeacher) return 'teacher_shareable';
    if (isShareableWithParent) return 'parent_shareable';
    return 'private';
  }

  async checkAccess(entry, requestingUserId) {
    // Students can always access their own entries
    if (entry.student_id === requestingUserId) {
      return true;
    }

    // For now, implement basic access control
    // In a full implementation, you'd check teacher-student and parent-student relationships
    return !entry.is_private;
  }

  async logAccess(entryId, userId, accessType, requestInfo = {}, decryptionSuccessful = true) {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        SELECT log_journal_access($1, $2, $3, $4, $5, $6)
      `, [
        entryId,
        userId,
        accessType,
        requestInfo.source || 'web',
        requestInfo.ipAddress || null,
        requestInfo.userAgent || null
      ]);
    } catch (error) {
      console.warn('Failed to log journal access:', error);
    } finally {
      client.release();
    }
  }

  // Encryption key management
  async generateEncryptionKey(studentId) {
    // In a production system, this would integrate with a proper key management service
    // For now, we'll use a simple approach
    const keyId = `student_${studentId}_${Date.now()}`;
    
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO journal_encryption_keys (key_id, encryption_algorithm, created_by, activated_at)
        VALUES ($1, $2, $3, NOW())
      `, [keyId, 'aes256', studentId]);

      return keyId;
    } catch (error) {
      console.error('Error generating encryption key:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getEncryptionKey(keyId) {
    // In a production system, this would retrieve the actual key from a secure key store
    // For development, we'll use a deterministic key based on the keyId and environment
    const baseKey = process.env.JOURNAL_ENCRYPTION_KEY || 'default_journal_encryption_key_for_development';
    return `${baseKey}_${keyId}`;
  }

  // Stub methods for emotional state, tags, and attachments
  async saveEmotionalState(client, entryId, emotionalState) {
    if (!emotionalState.primary) return;

    await client.query(`
      INSERT INTO journal_emotions (
        journal_entry_id, primary_emotion, intensity, confidence,
        secondary_emotions, emotion_context, mood_before, mood_after, detected_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      entryId,
      emotionalState.primary,
      emotionalState.intensity || 0.5,
      emotionalState.confidence || 0.5,
      emotionalState.secondary || [],
      emotionalState.context || null,
      emotionalState.moodBefore || null,
      emotionalState.moodAfter || null,
      emotionalState.detectedBy || 'manual'
    ]);
  }

  async getEmotionalState(client, entryId) {
    const result = await client.query(`
      SELECT primary_emotion, intensity, confidence, secondary_emotions,
             emotion_context, mood_before, mood_after, detected_by, detected_at
      FROM journal_emotions
      WHERE journal_entry_id = $1
      ORDER BY detected_at DESC
      LIMIT 1
    `, [entryId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      primary: row.primary_emotion,
      intensity: parseFloat(row.intensity),
      confidence: parseFloat(row.confidence),
      secondary: row.secondary_emotions || [],
      context: row.emotion_context,
      moodBefore: row.mood_before,
      moodAfter: row.mood_after,
      detectedBy: row.detected_by,
      detectedAt: row.detected_at
    };
  }

  async updateEmotionalState(client, entryId, emotionalState) {
    // Delete existing emotional state
    await client.query('DELETE FROM journal_emotions WHERE journal_entry_id = $1', [entryId]);
    
    // Save new emotional state
    await this.saveEmotionalState(client, entryId, emotionalState);
  }

  async saveTags(client, entryId, tags, studentId) {
    for (const tagName of tags) {
      // Create tag if it doesn't exist
      await client.query(`
        INSERT INTO journal_tags (name, created_by)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET usage_count = journal_tags.usage_count + 1
      `, [tagName.toLowerCase(), studentId]);

      // Link tag to entry
      await client.query(`
        INSERT INTO journal_entry_tags (journal_entry_id, tag_id)
        SELECT $1, id FROM journal_tags WHERE name = $2
        ON CONFLICT (journal_entry_id, tag_id) DO NOTHING
      `, [entryId, tagName.toLowerCase()]);
    }
  }

  async getTags(client, entryId) {
    const result = await client.query(`
      SELECT jt.name, jt.color
      FROM journal_tags jt
      JOIN journal_entry_tags jet ON jt.id = jet.tag_id
      WHERE jet.journal_entry_id = $1
      ORDER BY jt.name
    `, [entryId]);

    return result.rows.map(row => row.name);
  }

  async updateTags(client, entryId, tags, studentId) {
    // Delete existing tags
    await client.query('DELETE FROM journal_entry_tags WHERE journal_entry_id = $1', [entryId]);
    
    // Save new tags
    if (tags.length > 0) {
      await this.saveTags(client, entryId, tags, studentId);
    }
  }

  async saveAttachments(client, entryId, attachments) {
    // Placeholder for attachment handling
    // In a full implementation, this would handle file uploads and encryption
  }

  async getAttachments(client, entryId) {
    // Placeholder for attachment retrieval
    return [];
  }
}

module.exports = JournalEntryModel; 