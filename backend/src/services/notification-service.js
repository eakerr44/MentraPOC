// Comprehensive Notification Service for Multi-Persona Dashboard
// Task 5.6: Build notification system for important updates and alerts

const { Pool } = require('pg');
const EventEmitter = require('events');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Notification Service - Handles all notification functionality
 * - Creates and manages notifications
 * - Handles real-time delivery
 * - Manages user preferences
 * - Provides analytics and reporting
 */
class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.realtimeConnections = new Map(); // Store WebSocket connections
    this.deliveryQueue = [];
    this.isProcessingQueue = false;
    
    // Start processing queue
    setInterval(() => this.processDeliveryQueue(), 5000); // Every 5 seconds
    
    // Cleanup old notifications daily
    setInterval(() => this.cleanupOldNotifications(), 24 * 60 * 60 * 1000); // Daily
  }

  /**
   * Create a new notification
   */
  async createNotification({
    typeKey,
    recipientId,
    title,
    message,
    data = {},
    senderId = null,
    actionUrl = null,
    actionText = null,
    scheduledFor = null,
    expiresAt = null,
    priority = 'medium',
    tags = [],
    threadId = null
  }) {
    try {
      const result = await pool.query(`
        INSERT INTO notifications (
          notification_type_id, recipient_id, sender_id, title, message, data,
          action_url, action_text, scheduled_for, expires_at, priority, tags, thread_id,
          action_required
        )
        SELECT nt.id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        FROM notification_types nt
        WHERE nt.type_key = $1
        RETURNING id, notification_type_id, scheduled_for
      `, [
        typeKey, recipientId, senderId, title, message, JSON.stringify(data),
        actionUrl, actionText, scheduledFor, expiresAt, priority, tags, threadId,
        !!actionUrl
      ]);

      if (result.rows.length === 0) {
        throw new Error(`Unknown notification type: ${typeKey}`);
      }

      const notification = result.rows[0];
      
      // Add to delivery queue if scheduled for now or past
      const now = new Date();
      const scheduled = new Date(notification.scheduled_for);
      
      if (scheduled <= now) {
        await this.queueForDelivery(notification.id);
      }

      // Emit event for real-time updates
      this.emit('notificationCreated', {
        notificationId: notification.id,
        recipientId,
        typeKey,
        priority
      });

      return notification.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create bulk notifications for multiple recipients
   */
  async createBulkNotifications({
    typeKey,
    recipientIds,
    title,
    message,
    data = {},
    senderId = null,
    actionUrl = null,
    scheduledFor = null
  }) {
    try {
      const notifications = [];
      
      // Create notifications in batch
      for (const recipientId of recipientIds) {
        const notificationId = await this.createNotification({
          typeKey,
          recipientId,
          title,
          message,
          data,
          senderId,
          actionUrl,
          scheduledFor
        });
        notifications.push(notificationId);
      }

      return notifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user with pagination and filtering
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        status = null,
        category = null,
        limit = 20,
        offset = 0,
        includeRead = true,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      let whereConditions = ['n.recipient_id = $1'];
      let params = [userId];
      let paramIndex = 2;

      // Add status filter
      if (status) {
        whereConditions.push(`n.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      } else if (!includeRead) {
        whereConditions.push(`n.status IN ('sent', 'delivered')`);
      }

      // Add category filter
      if (category) {
        whereConditions.push(`nt.category = $${paramIndex}`);
        params.push(category);
        paramIndex++;
      }

      // Add expiration filter
      whereConditions.push(`(n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)`);

      const query = `
        SELECT 
          n.id,
          n.title,
          n.message,
          n.data,
          n.priority,
          n.status,
          n.action_required,
          n.action_url,
          n.action_text,
          n.action_completed,
          n.created_at,
          n.read_at,
          n.expires_at,
          n.tags,
          n.thread_id,
          nt.type_key,
          nt.name as type_name,
          nt.category,
          nt.icon,
          nt.color,
          sender.first_name as sender_first_name,
          sender.last_name as sender_last_name
        FROM notifications n
        JOIN notification_types nt ON n.notification_type_id = nt.id
        LEFT JOIN users sender ON n.sender_id = sender.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY n.${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const result = await pool.query(query, params);
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM notifications n
        JOIN notification_types nt ON n.notification_type_id = nt.id
        WHERE ${whereConditions.slice(0, -2).join(' AND ')}
          AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
      `;
      
      const countResult = await pool.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      return {
        notifications: result.rows.map(this.formatNotification),
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId) {
    try {
      const result = await pool.query(
        'SELECT get_unread_notification_count($1) as count',
        [userId]
      );
      return result.rows[0].count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      const result = await pool.query(
        'SELECT mark_notification_read($1, $2) as success',
        [notificationId, userId]
      );

      if (result.rows[0].success) {
        // Emit event for real-time updates
        this.emit('notificationRead', { notificationId, userId });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark notification as dismissed
   */
  async markAsDismissed(notificationId, userId) {
    try {
      const result = await pool.query(`
        UPDATE notifications 
        SET status = 'dismissed', dismissed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND recipient_id = $2 AND status IN ('sent', 'delivered', 'read')
        RETURNING id
      `, [notificationId, userId]);

      if (result.rows.length > 0) {
        this.emit('notificationDismissed', { notificationId, userId });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error dismissing notification:', error);
      throw error;
    }
  }

  /**
   * Mark notification action as completed
   */
  async markActionCompleted(notificationId, userId) {
    try {
      const result = await pool.query(`
        UPDATE notifications 
        SET action_completed = true, action_completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND recipient_id = $2 AND action_required = true
        RETURNING id
      `, [notificationId, userId]);

      if (result.rows.length > 0) {
        this.emit('notificationActionCompleted', { notificationId, userId });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking action completed:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId) {
    try {
      const result = await pool.query(`
        SELECT 
          nt.type_key,
          nt.name,
          nt.category,
          nt.priority,
          nt.icon,
          COALESCE(np.enabled, nt.default_enabled) as enabled,
          COALESCE(np.channels, nt.channels) as channels,
          COALESCE(np.frequency, 'immediate') as frequency,
          np.quiet_hours_start,
          np.quiet_hours_end,
          np.timezone
        FROM notification_types nt
        LEFT JOIN notification_preferences np ON nt.id = np.notification_type_id AND np.user_id = $1
        WHERE $2 = ANY(nt.target_roles)
        ORDER BY nt.category, nt.name
      `, [userId, await this.getUserRole(userId)]);

      return result.rows;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId, preferences) {
    try {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        for (const pref of preferences) {
          await client.query(`
            INSERT INTO notification_preferences (
              user_id, notification_type_id, enabled, channels, frequency,
              quiet_hours_start, quiet_hours_end, timezone
            )
            SELECT $1, nt.id, $3, $4, $5, $6, $7, $8
            FROM notification_types nt
            WHERE nt.type_key = $2
            ON CONFLICT (user_id, notification_type_id)
            DO UPDATE SET
              enabled = EXCLUDED.enabled,
              channels = EXCLUDED.channels,
              frequency = EXCLUDED.frequency,
              quiet_hours_start = EXCLUDED.quiet_hours_start,
              quiet_hours_end = EXCLUDED.quiet_hours_end,
              timezone = EXCLUDED.timezone,
              updated_at = CURRENT_TIMESTAMP
          `, [
            userId,
            pref.typeKey,
            pref.enabled,
            pref.channels,
            pref.frequency,
            pref.quietHoursStart,
            pref.quietHoursEnd,
            pref.timezone
          ]);
        }

        await client.query('COMMIT');
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Add notification to delivery queue
   */
  async queueForDelivery(notificationId) {
    try {
      await pool.query(`
        UPDATE notifications 
        SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'pending'
      `, [notificationId]);

      this.deliveryQueue.push(notificationId);
      
      if (!this.isProcessingQueue) {
        await this.processDeliveryQueue();
      }
    } catch (error) {
      console.error('Error queueing notification for delivery:', error);
      throw error;
    }
  }

  /**
   * Process delivery queue
   */
  async processDeliveryQueue() {
    if (this.isProcessingQueue || this.deliveryQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const notificationIds = this.deliveryQueue.splice(0, 10); // Process in batches
      
      for (const notificationId of notificationIds) {
        await this.deliverNotification(notificationId);
      }
    } catch (error) {
      console.error('Error processing delivery queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Deliver notification to user
   */
  async deliverNotification(notificationId) {
    try {
      const result = await pool.query(`
        SELECT 
          n.*,
          nt.type_key,
          nt.channels as default_channels,
          u.id as user_id,
          u.role as user_role,
          COALESCE(np.channels, nt.channels) as delivery_channels,
          COALESCE(np.enabled, nt.default_enabled) as enabled
        FROM notifications n
        JOIN notification_types nt ON n.notification_type_id = nt.id
        JOIN users u ON n.recipient_id = u.id
        LEFT JOIN notification_preferences np ON nt.id = np.notification_type_id AND np.user_id = u.id
        WHERE n.id = $1 AND n.status = 'sent'
      `, [notificationId]);

      if (result.rows.length === 0) {
        return;
      }

      const notification = result.rows[0];
      
      // Check if user has notifications enabled for this type
      if (!notification.enabled) {
        await pool.query(`
          UPDATE notifications 
          SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [notificationId]);
        return;
      }

      // Deliver via real-time channel (WebSocket)
      if (notification.delivery_channels.includes('in_app')) {
        await this.deliverViaRealtime(notification);
      }

      // Mark as delivered
      await pool.query(`
        UPDATE notifications 
        SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [notificationId]);

      // Log delivery
      await pool.query(`
        INSERT INTO notification_delivery_log (
          notification_id, channel, status, sent_at, delivered_at
        ) VALUES ($1, 'in_app', 'delivered', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [notificationId]);

    } catch (error) {
      console.error('Error delivering notification:', error);
      
      // Mark as failed
      await pool.query(`
        UPDATE notifications 
        SET status = 'failed', delivery_attempts = delivery_attempts + 1, 
            last_delivery_attempt = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [notificationId]);
    }
  }

  /**
   * Deliver notification via real-time channel
   */
  async deliverViaRealtime(notification) {
    const userConnections = this.realtimeConnections.get(notification.recipient_id);
    
    if (userConnections && userConnections.size > 0) {
      const notificationData = {
        id: notification.id,
        type: notification.type_key,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        actionRequired: notification.action_required,
        actionUrl: notification.action_url,
        actionText: notification.action_text,
        createdAt: notification.created_at,
        expiresAt: notification.expires_at
      };

      // Send to all active connections for this user
      userConnections.forEach(connection => {
        if (connection.readyState === 1) { // WebSocket.OPEN
          connection.send(JSON.stringify({
            type: 'notification',
            data: notificationData
          }));
        }
      });
    }
  }

  /**
   * Register a real-time connection
   */
  registerRealtimeConnection(userId, connection, channelId) {
    if (!this.realtimeConnections.has(userId)) {
      this.realtimeConnections.set(userId, new Set());
    }
    
    this.realtimeConnections.get(userId).add(connection);
    
    // Store connection details in database
    pool.query(`
      INSERT INTO notification_channels (
        user_id, channel_id, connection_id, user_agent, ip_address, device_info
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (channel_id) DO UPDATE SET
        last_seen = CURRENT_TIMESTAMP,
        is_active = true
    `, [
      userId,
      channelId,
      connection.id || channelId,
      connection.headers?.['user-agent'],
      connection.ip,
      JSON.stringify(connection.deviceInfo || {})
    ]).catch(console.error);

    // Clean up on disconnect
    connection.on('close', () => {
      this.unregisterRealtimeConnection(userId, connection);
    });
  }

  /**
   * Unregister a real-time connection
   */
  unregisterRealtimeConnection(userId, connection) {
    const userConnections = this.realtimeConnections.get(userId);
    if (userConnections) {
      userConnections.delete(connection);
      if (userConnections.size === 0) {
        this.realtimeConnections.delete(userId);
      }
    }
  }

  /**
   * Create automated notification based on events
   */
  async createAutomatedNotification(eventType, eventData) {
    try {
      // Find matching notification rules
      const rules = await pool.query(`
        SELECT nr.*, nt.type_key
        FROM notification_rules nr
        JOIN notification_types nt ON nr.notification_type_id = nt.id
        WHERE nr.is_active = true AND nr.trigger_event = $1
      `, [eventType]);

      for (const rule of rules.rows) {
        // Check if conditions are met
        if (this.evaluateConditions(rule.conditions, eventData)) {
          // Find target recipients
          const recipients = await this.findTargetRecipients(rule.target_criteria, eventData);
          
          // Create notifications for each recipient
          for (const recipientId of recipients) {
            const { title, message } = this.processTemplate(rule, eventData);
            
            await this.createNotification({
              typeKey: rule.type_key,
              recipientId,
              title,
              message,
              data: eventData,
              scheduledFor: rule.delay_minutes > 0 ? 
                new Date(Date.now() + rule.delay_minutes * 60000) : null
            });
          }

          // Update rule statistics
          await pool.query(`
            UPDATE notification_rules 
            SET last_triggered = CURRENT_TIMESTAMP, trigger_count = trigger_count + 1
            WHERE id = $1
          `, [rule.id]);
        }
      }
    } catch (error) {
      console.error('Error creating automated notification:', error);
      throw error;
    }
  }

  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        notificationTypes = null,
        userRole = null
      } = options;

      let whereConditions = ['n.created_at BETWEEN $1 AND $2'];
      let params = [startDate, endDate];
      let paramIndex = 3;

      if (notificationTypes) {
        whereConditions.push(`nt.type_key = ANY($${paramIndex})`);
        params.push(notificationTypes);
        paramIndex++;
      }

      if (userRole) {
        whereConditions.push(`u.role = $${paramIndex}`);
        params.push(userRole);
        paramIndex++;
      }

      const query = `
        SELECT 
          nt.type_key,
          nt.name,
          nt.category,
          COUNT(*) as total_sent,
          COUNT(CASE WHEN n.status = 'delivered' THEN 1 END) as total_delivered,
          COUNT(CASE WHEN n.status = 'read' THEN 1 END) as total_read,
          COUNT(CASE WHEN n.status = 'dismissed' THEN 1 END) as total_dismissed,
          COUNT(CASE WHEN n.action_completed = true THEN 1 END) as total_actions,
          AVG(EXTRACT(EPOCH FROM (n.read_at - n.created_at))/60) as avg_time_to_read_minutes
        FROM notifications n
        JOIN notification_types nt ON n.notification_type_id = nt.id
        JOIN users u ON n.recipient_id = u.id
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY nt.type_key, nt.name, nt.category
        ORDER BY total_sent DESC
      `;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting notification analytics:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  formatNotification(row) {
    return {
      id: row.id,
      title: row.title,
      message: row.message,
      data: row.data,
      priority: row.priority,
      status: row.status,
      actionRequired: row.action_required,
      actionUrl: row.action_url,
      actionText: row.action_text,
      actionCompleted: row.action_completed,
      createdAt: row.created_at,
      readAt: row.read_at,
      expiresAt: row.expires_at,
      tags: row.tags,
      threadId: row.thread_id,
      type: {
        key: row.type_key,
        name: row.type_name,
        category: row.category,
        icon: row.icon,
        color: row.color
      },
      sender: row.sender_first_name ? {
        firstName: row.sender_first_name,
        lastName: row.sender_last_name
      } : null
    };
  }

  async getUserRole(userId) {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.role || 'student';
  }

  evaluateConditions(conditions, eventData) {
    // Simple condition evaluation - can be enhanced with more complex logic
    try {
      for (const [key, expectedValue] of Object.entries(conditions)) {
        if (eventData[key] !== expectedValue) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error evaluating conditions:', error);
      return false;
    }
  }

  async findTargetRecipients(criteria, eventData) {
    // Find recipients based on criteria - simplified implementation
    try {
      if (criteria.userId) {
        return [criteria.userId];
      }
      
      if (criteria.role) {
        const result = await pool.query(
          'SELECT id FROM users WHERE role = $1 AND status = $2',
          [criteria.role, 'active']
        );
        return result.rows.map(row => row.id);
      }

      return [];
    } catch (error) {
      console.error('Error finding target recipients:', error);
      return [];
    }
  }

  processTemplate(rule, eventData) {
    // Simple template processing - replace variables with event data
    let title = rule.custom_subject || rule.template_subject || 'Notification';
    let message = rule.custom_body || rule.template_body || 'You have a new notification';

    // Replace variables like {{variable_name}}
    for (const [key, value] of Object.entries(eventData)) {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), value);
      message = message.replace(new RegExp(placeholder, 'g'), value);
    }

    return { title, message };
  }

  async cleanupOldNotifications() {
    try {
      const result = await pool.query('SELECT cleanup_old_notifications()');
      console.log(`Cleaned up ${result.rows[0].cleanup_old_notifications} old notifications`);
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Convenience methods for common notification types
const NotificationHelpers = {
  /**
   * Send achievement notification
   */
  async sendAchievementNotification(studentId, achievementData) {
    await notificationService.createNotification({
      typeKey: 'achievement_earned',
      recipientId: studentId,
      title: `🏅 Achievement Unlocked: ${achievementData.title}`,
      message: achievementData.description,
      data: achievementData,
      priority: 'medium'
    });

    // Also notify parents
    const parents = await this.getParentsOfStudent(studentId);
    for (const parentId of parents) {
      await notificationService.createNotification({
        typeKey: 'child_achievement',
        recipientId: parentId,
        title: `🌟 Your child earned an achievement!`,
        message: `${achievementData.title}: ${achievementData.description}`,
        data: { ...achievementData, studentId },
        priority: 'high'
      });
    }
  },

  /**
   * Send goal completion notification
   */
  async sendGoalCompletedNotification(studentId, goalData) {
    await notificationService.createNotification({
      typeKey: 'goal_achieved',
      recipientId: studentId,
      title: `🎯 Goal Achieved: ${goalData.title}`,
      message: `Congratulations! You've successfully completed your goal.`,
      data: goalData,
      priority: 'high',
      actionUrl: `/goals/${goalData.id}`,
      actionText: 'View Goal'
    });
  },

  /**
   * Send teacher message to parent
   */
  async sendTeacherMessageNotification(parentId, teacherId, message, studentId) {
    await notificationService.createNotification({
      typeKey: 'teacher_message',
      recipientId: parentId,
      senderId: teacherId,
      title: `👩‍🏫 Message from Teacher`,
      message: message.subject || 'You have a new message from your child\'s teacher',
      data: { messageId: message.id, studentId },
      priority: 'medium',
      actionUrl: `/messages/${message.id}`,
      actionText: 'Read Message'
    });
  },

  /**
   * Send assignment due reminder
   */
  async sendAssignmentDueReminder(studentId, assignmentData) {
    const dueDate = new Date(assignmentData.dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    let urgency = 'medium';
    let title = `📝 Assignment Due: ${assignmentData.title}`;
    
    if (daysUntilDue <= 1) {
      urgency = 'high';
      title = `⚠️ Assignment Due Soon: ${assignmentData.title}`;
    }

    await notificationService.createNotification({
      typeKey: 'assignment_due',
      recipientId: studentId,
      title,
      message: `Your assignment "${assignmentData.title}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}.`,
      data: assignmentData,
      priority: urgency,
      actionUrl: `/assignments/${assignmentData.id}`,
      actionText: 'View Assignment'
    });
  },

  /**
   * Get parents of a student
   */
  async getParentsOfStudent(studentId) {
    try {
      const result = await pool.query(`
        SELECT pcr.parent_id
        FROM parent_child_relationships pcr
        WHERE pcr.child_id = $1 AND pcr.status = 'active'
      `, [studentId]);
      
      return result.rows.map(row => row.parent_id);
    } catch (error) {
      console.error('Error getting parents of student:', error);
      return [];
    }
  }
};

module.exports = {
  notificationService,
  NotificationHelpers
}; 