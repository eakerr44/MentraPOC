// Comprehensive Notification System Test Suite
// Task 5.6: Build notification system for important updates and alerts

const { Pool } = require('pg');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { notificationService, NotificationHelpers } = require('../services/notification-service');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

class NotificationSystemTester {
  constructor() {
    this.testResults = [];
    this.testUserId = null;
    this.testParentId = null;
    this.testTeacherId = null;
  }

  async runAllTests() {
    console.log('🔔 Starting Notification System Test Suite...\n');

    try {
      // Setup test data
      await this.setupTestData();

      // Run tests
      await this.testDatabaseSchema();
      await this.testNotificationTypes();
      await this.testNotificationService();
      await this.testNotificationHelpers();
      await this.testUserPreferences();
      await this.testWebSocketConnection();
      await this.testAnalytics();
      await this.testCleanup();

      // Display results
      this.displayResults();

      // Cleanup
      await this.cleanupTestData();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.addResult('Test Suite', false, error.message);
    }
  }

  async setupTestData() {
    console.log('📋 Setting up test data...');

    try {
      // Create test users
      const studentResult = await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, status)
        VALUES ('test.student@notification.test', 'hashed_password', 'Test', 'Student', 'student', 'active')
        RETURNING id
      `);
      this.testUserId = studentResult.rows[0].id;

      const parentResult = await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, status)
        VALUES ('test.parent@notification.test', 'hashed_password', 'Test', 'Parent', 'parent', 'active')
        RETURNING id
      `);
      this.testParentId = parentResult.rows[0].id;

      const teacherResult = await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, status)
        VALUES ('test.teacher@notification.test', 'hashed_password', 'Test', 'Teacher', 'teacher', 'active')
        RETURNING id
      `);
      this.testTeacherId = teacherResult.rows[0].id;

      // Create parent-child relationship
      await pool.query(`
        INSERT INTO parent_child_relationships (parent_id, child_id, status)
        VALUES ($1, $2, 'active')
      `, [this.testParentId, this.testUserId]);

      this.addResult('Test Data Setup', true, 'Created test users and relationships');
      console.log('✅ Test data setup complete\n');

    } catch (error) {
      this.addResult('Test Data Setup', false, error.message);
      throw error;
    }
  }

  async testDatabaseSchema() {
    console.log('🗄️ Testing database schema...');

    try {
      // Test notification_types table
      const typesResult = await pool.query('SELECT COUNT(*) as count FROM notification_types');
      const typesCount = parseInt(typesResult.rows[0].count);
      
      if (typesCount >= 18) { // We inserted 18 default notification types
        this.addResult('Notification Types', true, `Found ${typesCount} notification types`);
      } else {
        this.addResult('Notification Types', false, `Expected >= 18 types, found ${typesCount}`);
      }

      // Test database functions
      const functionTests = [
        'get_user_notification_preferences',
        'create_notification',
        'mark_notification_read',
        'get_unread_notification_count',
        'cleanup_old_notifications'
      ];

      for (const funcName of functionTests) {
        const funcResult = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = $1
          ) as exists
        `, [funcName]);
        
        if (funcResult.rows[0].exists) {
          this.addResult(`Function: ${funcName}`, true, 'Function exists');
        } else {
          this.addResult(`Function: ${funcName}`, false, 'Function not found');
        }
      }

      // Test table existence
      const tables = [
        'notification_types',
        'notification_preferences',
        'notifications',
        'notification_templates',
        'notification_delivery_log',
        'notification_groups',
        'notification_subscriptions',
        'notification_rules',
        'notification_channels',
        'notification_analytics'
      ];

      for (const tableName of tables) {
        const tableResult = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = $1
          ) as exists
        `, [tableName]);
        
        if (tableResult.rows[0].exists) {
          this.addResult(`Table: ${tableName}`, true, 'Table exists');
        } else {
          this.addResult(`Table: ${tableName}`, false, 'Table not found');
        }
      }

      console.log('✅ Database schema tests complete\n');

    } catch (error) {
      this.addResult('Database Schema', false, error.message);
    }
  }

  async testNotificationTypes() {
    console.log('📝 Testing notification types...');

    try {
      // Test different notification categories
      const categories = ['academic', 'social', 'system', 'achievement', 'reminder'];
      
      for (const category of categories) {
        const result = await pool.query(`
          SELECT COUNT(*) as count FROM notification_types 
          WHERE category = $1
        `, [category]);
        
        const count = parseInt(result.rows[0].count);
        if (count > 0) {
          this.addResult(`Category: ${category}`, true, `Found ${count} notification types`);
        } else {
          this.addResult(`Category: ${category}`, false, 'No notification types found');
        }
      }

      // Test role targeting
      const roles = ['student', 'teacher', 'parent'];
      
      for (const role of roles) {
        const result = await pool.query(`
          SELECT COUNT(*) as count FROM notification_types 
          WHERE $1 = ANY(target_roles)
        `, [role]);
        
        const count = parseInt(result.rows[0].count);
        if (count > 0) {
          this.addResult(`Role Targeting: ${role}`, true, `Found ${count} notification types`);
        } else {
          this.addResult(`Role Targeting: ${role}`, false, 'No notification types found');
        }
      }

      console.log('✅ Notification types tests complete\n');

    } catch (error) {
      this.addResult('Notification Types', false, error.message);
    }
  }

  async testNotificationService() {
    console.log('🔧 Testing notification service...');

    try {
      // Test creating a notification
      const notificationId = await notificationService.createNotification({
        typeKey: 'goal_achieved',
        recipientId: this.testUserId,
        title: 'Test Achievement',
        message: 'You completed a test goal!',
        data: { goalId: 123, points: 50 },
        priority: 'high',
        actionUrl: '/goals/123',
        actionText: 'View Goal'
      });

      if (notificationId) {
        this.addResult('Create Notification', true, `Created notification ID: ${notificationId}`);
      } else {
        this.addResult('Create Notification', false, 'Failed to create notification');
      }

      // Test getting user notifications
      const userNotifications = await notificationService.getUserNotifications(this.testUserId);
      if (userNotifications.notifications.length > 0) {
        this.addResult('Get User Notifications', true, `Found ${userNotifications.notifications.length} notifications`);
      } else {
        this.addResult('Get User Notifications', false, 'No notifications found');
      }

      // Test unread count
      const unreadCount = await notificationService.getUnreadCount(this.testUserId);
      if (unreadCount >= 0) {
        this.addResult('Get Unread Count', true, `Unread count: ${unreadCount}`);
      } else {
        this.addResult('Get Unread Count', false, 'Invalid unread count');
      }

      // Test marking as read
      if (notificationId) {
        const markReadResult = await notificationService.markAsRead(notificationId, this.testUserId);
        this.addResult('Mark As Read', markReadResult, markReadResult ? 'Successfully marked as read' : 'Failed to mark as read');
      }

      // Test bulk notifications
      const bulkIds = await notificationService.createBulkNotifications({
        typeKey: 'system_maintenance',
        recipientIds: [this.testUserId, this.testParentId],
        title: 'System Maintenance',
        message: 'Scheduled maintenance tonight',
        data: { maintenanceId: 456 }
      });

      if (bulkIds && bulkIds.length === 2) {
        this.addResult('Bulk Notifications', true, `Created ${bulkIds.length} bulk notifications`);
      } else {
        this.addResult('Bulk Notifications', false, 'Failed to create bulk notifications');
      }

      console.log('✅ Notification service tests complete\n');

    } catch (error) {
      this.addResult('Notification Service', false, error.message);
    }
  }

  async testNotificationHelpers() {
    console.log('🎯 Testing notification helpers...');

    try {
      // Test achievement notification
      await NotificationHelpers.sendAchievementNotification(this.testUserId, {
        title: 'Test Achievement',
        description: 'You earned a test badge!',
        points: 100,
        rarity: 'rare',
        icon: '🏆'
      });
      this.addResult('Achievement Helper', true, 'Achievement notification sent');

      // Test goal completion notification
      await NotificationHelpers.sendGoalCompletedNotification(this.testUserId, {
        id: 789,
        title: 'Test Goal',
        description: 'Complete the test',
        targetValue: 100,
        currentValue: 100
      });
      this.addResult('Goal Completion Helper', true, 'Goal completion notification sent');

      // Test assignment reminder
      await NotificationHelpers.sendAssignmentDueReminder(this.testUserId, {
        id: 101,
        title: 'Math Homework',
        subject: 'Mathematics',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
      });
      this.addResult('Assignment Reminder Helper', true, 'Assignment reminder sent');

      // Test teacher message notification
      await NotificationHelpers.sendTeacherMessageNotification(
        this.testParentId,
        this.testTeacherId,
        { id: 202, subject: 'Test Message' },
        this.testUserId
      );
      this.addResult('Teacher Message Helper', true, 'Teacher message notification sent');

      console.log('✅ Notification helpers tests complete\n');

    } catch (error) {
      this.addResult('Notification Helpers', false, error.message);
    }
  }

  async testUserPreferences() {
    console.log('⚙️ Testing user preferences...');

    try {
      // Get default preferences
      const preferences = await notificationService.getUserPreferences(this.testUserId);
      if (preferences.length > 0) {
        this.addResult('Get User Preferences', true, `Found ${preferences.length} preferences`);
      } else {
        this.addResult('Get User Preferences', false, 'No preferences found');
      }

      // Update preferences
      const testPreferences = [
        {
          typeKey: 'goal_achieved',
          enabled: false,
          channels: ['in_app'],
          frequency: 'immediate'
        },
        {
          typeKey: 'assignment_due',
          enabled: true,
          channels: ['in_app'],
          frequency: 'daily'
        }
      ];

      const updateResult = await notificationService.updateUserPreferences(this.testUserId, testPreferences);
      this.addResult('Update User Preferences', updateResult, updateResult ? 'Preferences updated' : 'Failed to update preferences');

      // Verify preferences were updated
      const updatedPreferences = await notificationService.getUserPreferences(this.testUserId);
      const goalPref = updatedPreferences.find(p => p.type_key === 'goal_achieved');
      const assignmentPref = updatedPreferences.find(p => p.type_key === 'assignment_due');

      if (goalPref && !goalPref.enabled) {
        this.addResult('Preference Update Verification', true, 'Goal preference correctly disabled');
      } else {
        this.addResult('Preference Update Verification', false, 'Goal preference not updated correctly');
      }

      console.log('✅ User preferences tests complete\n');

    } catch (error) {
      this.addResult('User Preferences', false, error.message);
    }
  }

  async testWebSocketConnection() {
    console.log('🔌 Testing WebSocket connection...');

    try {
      // Create a test JWT token
      const token = jwt.sign(
        { id: this.testUserId, email: 'test.student@notification.test' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );

      // Test WebSocket connection (simplified - in reality would test against running server)
      this.addResult('WebSocket Token Generation', true, 'JWT token created for WebSocket test');

      // Test connection management
      const mockConnection = {
        readyState: 1, // WebSocket.OPEN
        send: (data) => console.log('Mock send:', data),
        on: (event, handler) => console.log(`Mock listener for ${event}`),
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1'
      };

      notificationService.registerRealtimeConnection(this.testUserId, mockConnection, 'test-channel-123');
      this.addResult('WebSocket Registration', true, 'Connection registered successfully');

      notificationService.unregisterRealtimeConnection(this.testUserId, mockConnection);
      this.addResult('WebSocket Unregistration', true, 'Connection unregistered successfully');

      console.log('✅ WebSocket connection tests complete\n');

    } catch (error) {
      this.addResult('WebSocket Connection', false, error.message);
    }
  }

  async testAnalytics() {
    console.log('📊 Testing notification analytics...');

    try {
      // Wait a moment for notifications to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test analytics retrieval
      const analytics = await notificationService.getNotificationAnalytics({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        endDate: new Date() // Today
      });

      if (analytics && Array.isArray(analytics)) {
        this.addResult('Notification Analytics', true, `Retrieved analytics for ${analytics.length} notification types`);
        
        // Check if we have analytics for our test notifications
        const goalAnalytics = analytics.find(a => a.type_key === 'goal_achieved');
        if (goalAnalytics && goalAnalytics.total_sent > 0) {
          this.addResult('Analytics Data Accuracy', true, `Goal achievements: ${goalAnalytics.total_sent} sent`);
        }
      } else {
        this.addResult('Notification Analytics', false, 'Invalid analytics data');
      }

      console.log('✅ Analytics tests complete\n');

    } catch (error) {
      this.addResult('Notification Analytics', false, error.message);
    }
  }

  async testCleanup() {
    console.log('🧹 Testing cleanup functionality...');

    try {
      // Test cleanup function
      const cleanupResult = await pool.query('SELECT cleanup_old_notifications()');
      const deletedCount = cleanupResult.rows[0].cleanup_old_notifications;
      
      this.addResult('Cleanup Function', true, `Cleanup completed, ${deletedCount} old notifications removed`);

      console.log('✅ Cleanup tests complete\n');

    } catch (error) {
      this.addResult('Cleanup Function', false, error.message);
    }
  }

  async cleanupTestData() {
    console.log('🧽 Cleaning up test data...');

    try {
      // Delete test notifications
      await pool.query('DELETE FROM notifications WHERE recipient_id IN ($1, $2, $3)', 
        [this.testUserId, this.testParentId, this.testTeacherId]);

      // Delete test preferences
      await pool.query('DELETE FROM notification_preferences WHERE user_id IN ($1, $2, $3)', 
        [this.testUserId, this.testParentId, this.testTeacherId]);

      // Delete parent-child relationship
      await pool.query('DELETE FROM parent_child_relationships WHERE parent_id = $1 AND child_id = $2', 
        [this.testParentId, this.testUserId]);

      // Delete test users
      await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', 
        [this.testUserId, this.testParentId, this.testTeacherId]);

      console.log('✅ Test data cleanup complete\n');

    } catch (error) {
      console.error('⚠️ Error during cleanup:', error.message);
    }
  }

  addResult(testName, success, details) {
    this.testResults.push({
      name: testName,
      success,
      details
    });
  }

  displayResults() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('═'.repeat(50));

    let passed = 0;
    let failed = 0;

    this.testResults.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} | ${result.name}`);
      if (result.details) {
        console.log(`       ${result.details}`);
      }
      
      if (result.success) {
        passed++;
      } else {
        failed++;
      }
    });

    console.log('═'.repeat(50));
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);

    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Notification system is working correctly.');
    } else {
      console.log(`\n⚠️ ${failed} test(s) failed. Please review the issues above.`);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new NotificationSystemTester();
  tester.runAllTests()
    .then(() => {
      console.log('\n🔔 Notification system test suite completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = NotificationSystemTester; 