/**
 * Test script for encrypted journal storage service
 * Tests creation, retrieval, updating, and deletion of encrypted journal entries
 */

require('dotenv').config();
const { getJournalStorageService, JournalStorageError } = require('../services/journal-storage-service');
const { Pool } = require('pg');

// Test configuration
const TEST_CONFIG = {
  studentId: 'test-student-123',
  teacherId: 'test-teacher-456',
  parentId: 'test-parent-789'
};

// Test data
const sampleJournalEntry = {
  title: 'My First Encrypted Journal Entry',
  content: '<p>Today I learned about <strong>encryption</strong> and how it protects my journal entries. I feel excited about learning new technologies!</p>',
  plainTextContent: 'Today I learned about encryption and how it protects my journal entries. I feel excited about learning new technologies!',
  emotionalState: {
    primary: 'excited',
    intensity: 0.8,
    confidence: 0.9,
    secondary: ['curious', 'motivated'],
    context: 'Learning about encryption',
    detectedBy: 'manual'
  },
  tags: ['learning', 'technology', 'encryption', 'security'],
  isPrivate: true,
  isShareableWithTeacher: false,
  isShareableWithParent: true
};

class JournalStorageTest {
  constructor() {
    this.journalStorage = getJournalStorageService();
    this.createdEntryIds = [];
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  // Test helper methods
  async assert(condition, message) {
    if (condition) {
      console.log(`✅ ${message}`);
      this.testResults.passed++;
    } else {
      console.log(`❌ ${message}`);
      this.testResults.failed++;
      this.testResults.errors.push(message);
    }
  }

  async assertThrows(asyncFn, expectedErrorType, message) {
    try {
      await asyncFn();
      console.log(`❌ ${message} (Expected error but none was thrown)`);
      this.testResults.failed++;
      this.testResults.errors.push(`${message} - Expected error but none was thrown`);
    } catch (error) {
      if (error instanceof JournalStorageError && error.type === expectedErrorType) {
        console.log(`✅ ${message}`);
        this.testResults.passed++;
      } else {
        console.log(`❌ ${message} (Wrong error type: ${error.type || error.constructor.name})`);
        this.testResults.failed++;
        this.testResults.errors.push(`${message} - Wrong error type`);
      }
    }
  }

  // Individual test methods
  async testHealthCheck() {
    console.log('\n📋 Testing Health Check...');
    
    try {
      const health = await this.journalStorage.healthCheck();
      await this.assert(health.status === 'healthy', 'Health check returns healthy status');
      await this.assert(health.features.encryption === 'enabled', 'Encryption is enabled');
      await this.assert(health.features.databaseConnection === 'connected', 'Database connection is working');
    } catch (error) {
      console.log(`❌ Health check failed: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async testCreateEntry() {
    console.log('\n📝 Testing Journal Entry Creation...');
    
    try {
      const entry = await this.journalStorage.createEntry({
        studentId: TEST_CONFIG.studentId,
        ...sampleJournalEntry
      });

      this.createdEntryIds.push(entry.id);

      await this.assert(entry.id && typeof entry.id === 'string', 'Entry has valid ID');
      await this.assert(entry.title === sampleJournalEntry.title, 'Title is preserved');
      await this.assert(entry.content === sampleJournalEntry.content, 'Content is preserved');
      await this.assert(entry.wordCount > 0, 'Word count is calculated');
      await this.assert(entry.encryptionMetadata.isEncrypted === true, 'Entry is marked as encrypted');
      await this.assert(entry.encryptionMetadata.encryptionMethod === 'aes256', 'Uses AES256 encryption');
      await this.assert(entry.privacyLevel === 'parent_shareable', 'Privacy level is correctly determined');

      console.log(`   Entry ID: ${entry.id}`);
      console.log(`   Word Count: ${entry.wordCount}`);
      console.log(`   Encryption Key ID: ${entry.encryptionMetadata.keyId}`);

    } catch (error) {
      console.log(`❌ Entry creation failed: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async testValidation() {
    console.log('\n🔍 Testing Input Validation...');

    // Test missing required fields
    await this.assertThrows(
      () => this.journalStorage.createEntry({}),
      'VALIDATION_ERROR',
      'Rejects entry without student ID'
    );

    await this.assertThrows(
      () => this.journalStorage.createEntry({ studentId: TEST_CONFIG.studentId }),
      'VALIDATION_ERROR',
      'Rejects entry without title'
    );

    await this.assertThrows(
      () => this.journalStorage.createEntry({ 
        studentId: TEST_CONFIG.studentId, 
        title: 'Test' 
      }),
      'VALIDATION_ERROR',
      'Rejects entry without content'
    );

    // Test length limits
    await this.assertThrows(
      () => this.journalStorage.createEntry({
        studentId: TEST_CONFIG.studentId,
        title: 'x'.repeat(501), // Exceeds 500 char limit
        content: 'Test content'
      }),
      'VALIDATION_ERROR',
      'Rejects title that is too long'
    );

    await this.assertThrows(
      () => this.journalStorage.createEntry({
        studentId: TEST_CONFIG.studentId,
        title: 'Test Title',
        content: 'x'.repeat(100001) // Exceeds 100KB limit
      }),
      'VALIDATION_ERROR',
      'Rejects content that is too long'
    );
  }

  async testRetrieveEntry() {
    console.log('\n🔍 Testing Entry Retrieval...');

    if (this.createdEntryIds.length === 0) {
      console.log('⚠️ No entries to test retrieval with');
      return;
    }

    try {
      const entryId = this.createdEntryIds[0];
      const entry = await this.journalStorage.getEntry(entryId, TEST_CONFIG.studentId);

      await this.assert(entry.id === entryId, 'Retrieved entry has correct ID');
      await this.assert(entry.title === sampleJournalEntry.title, 'Title is correctly decrypted');
      await this.assert(entry.content === sampleJournalEntry.content, 'Content is correctly decrypted');
      await this.assert(entry.encryptionMetadata.decryptionSuccessful === true, 'Decryption was successful');
      await this.assert(entry.emotionalState.primary === 'excited', 'Emotional state is preserved');
      await this.assert(entry.tags.includes('encryption'), 'Tags are preserved');

      console.log(`   Decrypted content preview: ${entry.plainTextContent.substring(0, 50)}...`);

    } catch (error) {
      console.log(`❌ Entry retrieval failed: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async testAccessControl() {
    console.log('\n🔒 Testing Access Control...');

    if (this.createdEntryIds.length === 0) {
      console.log('⚠️ No entries to test access control with');
      return;
    }

    const entryId = this.createdEntryIds[0];

    // Test access with wrong user ID
    await this.assertThrows(
      () => this.journalStorage.getEntry(entryId, 'wrong-user-id'),
      'ACCESS_DENIED',
      'Denies access to wrong user'
    );

    // Test access with missing entry ID
    await this.assertThrows(
      () => this.journalStorage.getEntry('nonexistent-id', TEST_CONFIG.studentId),
      'NOT_FOUND',
      'Returns not found for nonexistent entry'
    );
  }

  async testUpdateEntry() {
    console.log('\n✏️ Testing Entry Updates...');

    if (this.createdEntryIds.length === 0) {
      console.log('⚠️ No entries to test updates with');
      return;
    }

    try {
      const entryId = this.createdEntryIds[0];
      const updateData = {
        title: 'Updated Encrypted Journal Entry',
        content: '<p>This entry has been <em>updated</em> with new encrypted content!</p>',
        plainTextContent: 'This entry has been updated with new encrypted content!',
        tags: ['updated', 'encryption', 'test'],
        isPrivate: false,
        isShareableWithTeacher: true
      };

      const updatedEntry = await this.journalStorage.updateEntry(entryId, updateData, TEST_CONFIG.studentId);

      await this.assert(updatedEntry.title === updateData.title, 'Title is updated and re-encrypted');
      await this.assert(updatedEntry.content === updateData.content, 'Content is updated and re-encrypted');
      await this.assert(updatedEntry.isPrivate === false, 'Privacy settings are updated');
      await this.assert(updatedEntry.isShareableWithTeacher === true, 'Teacher sharing is enabled');
      await this.assert(updatedEntry.privacyLevel === 'teacher_shareable', 'Privacy level is recalculated');
      await this.assert(updatedEntry.tags.includes('updated'), 'Tags are updated');

      console.log(`   Updated privacy level: ${updatedEntry.privacyLevel}`);

    } catch (error) {
      console.log(`❌ Entry update failed: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async testListEntries() {
    console.log('\n📋 Testing Entry Listing...');

    try {
      const result = await this.journalStorage.getEntries(TEST_CONFIG.studentId, TEST_CONFIG.studentId, {
        limit: 10,
        offset: 0,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      });

      await this.assert(Array.isArray(result.entries), 'Returns entries array');
      await this.assert(typeof result.total === 'number', 'Returns total count');
      await this.assert(typeof result.hasMore === 'boolean', 'Returns hasMore flag');
      await this.assert(result.entries.length <= 10, 'Respects limit parameter');

      if (result.entries.length > 0) {
        const entry = result.entries[0];
        await this.assert(entry.encryptionMetadata.isEncrypted === true, 'Listed entries show encryption status');
        await this.assert(entry.encryptionMetadata.contentAvailable === false, 'Content not loaded for performance');
      }

      console.log(`   Found ${result.entries.length} entries (total: ${result.total})`);

    } catch (error) {
      console.log(`❌ Entry listing failed: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async testStatistics() {
    console.log('\n📊 Testing Statistics...');

    try {
      const stats = await this.journalStorage.getJournalStatistics(
        TEST_CONFIG.studentId, 
        TEST_CONFIG.studentId, 
        30
      );

      await this.assert(typeof stats.totalEntries === 'number', 'Returns total entries count');
      await this.assert(typeof stats.totalWordCount === 'number', 'Returns total word count');
      await this.assert(typeof stats.averageWordsPerEntry === 'number', 'Returns average words per entry');
      await this.assert(stats.encryptionEnabled === true, 'Shows encryption is enabled');
      await this.assert(typeof stats.currentStreak === 'number', 'Returns current streak');

      console.log(`   Total entries: ${stats.totalEntries}`);
      console.log(`   Total words: ${stats.totalWordCount}`);
      console.log(`   Average words: ${stats.averageWordsPerEntry}`);
      console.log(`   Current streak: ${stats.currentStreak} days`);

    } catch (error) {
      console.log(`❌ Statistics failed: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async testBulkOperations() {
    console.log('\n🔄 Testing Bulk Operations...');

    if (this.createdEntryIds.length === 0) {
      console.log('⚠️ No entries to test bulk operations with');
      return;
    }

    try {
      const result = await this.journalStorage.bulkUpdatePrivacy(
        this.createdEntryIds,
        TEST_CONFIG.studentId,
        { isPrivate: true, isShareableWithTeacher: false, isShareableWithParent: false },
        TEST_CONFIG.studentId
      );

      await this.assert(result.totalEntries === this.createdEntryIds.length, 'Processes all entries');
      await this.assert(result.successful > 0, 'Some operations succeeded');
      await this.assert(result.failed === 0, 'No operations failed');

      console.log(`   Updated ${result.successful} entries successfully`);

    } catch (error) {
      console.log(`❌ Bulk operations failed: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async testDeleteEntry() {
    console.log('\n🗑️ Testing Entry Deletion...');

    if (this.createdEntryIds.length === 0) {
      console.log('⚠️ No entries to test deletion with');
      return;
    }

    try {
      const entryId = this.createdEntryIds[0];
      
      // Test deletion
      const result = await this.journalStorage.deleteEntry(entryId, TEST_CONFIG.studentId);
      await this.assert(result === true, 'Deletion returns success');

      // Verify entry is deleted (soft delete)
      await this.assertThrows(
        () => this.journalStorage.getEntry(entryId, TEST_CONFIG.studentId),
        'NOT_FOUND',
        'Deleted entry is no longer accessible'
      );

      // Remove from our tracking
      this.createdEntryIds = this.createdEntryIds.filter(id => id !== entryId);

    } catch (error) {
      console.log(`❌ Entry deletion failed: ${error.message}`);
      this.testResults.failed++;
    }
  }

  // Cleanup method
  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    for (const entryId of this.createdEntryIds) {
      try {
        await this.journalStorage.deleteEntry(entryId, TEST_CONFIG.studentId);
        console.log(`   Deleted entry: ${entryId}`);
      } catch (error) {
        console.log(`   Failed to delete entry ${entryId}: ${error.message}`);
      }
    }
  }

  // Main test runner
  async runAllTests() {
    console.log('🚀 Starting Encrypted Journal Storage Tests\n');
    console.log('=' .repeat(60));

    try {
      // Run tests in order
      await this.testHealthCheck();
      await this.testValidation();
      await this.testCreateEntry();
      await this.testRetrieveEntry();
      await this.testAccessControl();
      await this.testUpdateEntry();
      await this.testListEntries();
      await this.testStatistics();
      await this.testBulkOperations();
      await this.testDeleteEntry();

      // Print summary
      console.log('\n' + '=' .repeat(60));
      console.log('📊 TEST SUMMARY');
      console.log('=' .repeat(60));
      console.log(`✅ Passed: ${this.testResults.passed}`);
      console.log(`❌ Failed: ${this.testResults.failed}`);
      console.log(`📊 Total:  ${this.testResults.passed + this.testResults.failed}`);

      if (this.testResults.failed > 0) {
        console.log('\n🔍 FAILED TESTS:');
        this.testResults.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }

      const successRate = ((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1);
      console.log(`\n🎯 Success Rate: ${successRate}%`);

      if (this.testResults.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Encrypted journal storage is working correctly.');
      } else {
        console.log('\n⚠️  Some tests failed. Please review the errors above.');
      }

    } catch (error) {
      console.error('\n💥 Critical test failure:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const test = new JournalStorageTest();
  test.runAllTests()
    .then(() => {
      console.log('\n✨ Test run completed.');
      process.exit(test.testResults.failed === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = JournalStorageTest; 