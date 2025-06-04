// Notification API Routes for Multi-Persona Dashboard
// Task 5.6: Build notification system for important updates and alerts

const express = require('express');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { notificationService, NotificationHelpers } = require('../services/notification-service');

const router = express.Router();

// WebSocket server for real-time notifications
const wss = new WebSocket.Server({ noServer: true });

/**
 * GET /notifications
 * Get user notifications with filtering and pagination
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      status,
      category,
      limit = 20,
      offset = 0,
      includeRead = 'true',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const options = {
      status: status || null,
      category: category || null,
      limit: parseInt(limit),
      offset: parseInt(offset),
      includeRead: includeRead === 'true',
      sortBy,
      sortOrder
    };

    const result = await notificationService.getUserNotifications(userId, options);

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

/**
 * GET /notifications/unread-count
 * Get unread notification count for current user
 */
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
});

/**
 * GET /notifications/:id
 * Get specific notification by ID
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id);

    const result = await notificationService.getUserNotifications(userId, {
      limit: 1,
      offset: 0
    });

    const notification = result.notifications.find(n => n.id === notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification',
      error: error.message
    });
  }
});

/**
 * POST /notifications
 * Create a new notification (admin/teacher only)
 */
router.post('/', auth, async (req, res) => {
  try {
    const senderId = req.user.id;
    const userRole = req.user.role;

    // Check if user has permission to send notifications
    if (!['admin', 'teacher'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create notifications'
      });
    }

    const {
      typeKey,
      recipientId,
      recipientIds, // For bulk notifications
      title,
      message,
      data = {},
      actionUrl,
      actionText,
      scheduledFor,
      expiresAt,
      priority = 'medium',
      tags = []
    } = req.body;

    // Validate required fields
    if (!typeKey || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: typeKey, title, message'
      });
    }

    if (!recipientId && !recipientIds) {
      return res.status(400).json({
        success: false,
        message: 'Either recipientId or recipientIds must be provided'
      });
    }

    let notificationIds;

    if (recipientIds && Array.isArray(recipientIds)) {
      // Bulk notification
      notificationIds = await notificationService.createBulkNotifications({
        typeKey,
        recipientIds,
        title,
        message,
        data,
        senderId,
        actionUrl,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null
      });
    } else {
      // Single notification
      const notificationId = await notificationService.createNotification({
        typeKey,
        recipientId,
        title,
        message,
        data,
        senderId,
        actionUrl,
        actionText,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        priority,
        tags
      });
      notificationIds = [notificationId];
    }

    res.status(201).json({
      success: true,
      data: {
        notificationIds,
        message: `Created ${notificationIds.length} notification${notificationIds.length !== 1 ? 's' : ''}`
      }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
});

/**
 * PATCH /notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id);

    const success = await notificationService.markAsRead(notificationId, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or already read'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

/**
 * PATCH /notifications/:id/dismiss
 * Mark notification as dismissed
 */
router.patch('/:id/dismiss', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id);

    const success = await notificationService.markAsDismissed(notificationId, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or already dismissed'
      });
    }

    res.json({
      success: true,
      message: 'Notification dismissed'
    });
  } catch (error) {
    console.error('Error dismissing notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss notification',
      error: error.message
    });
  }
});

/**
 * PATCH /notifications/:id/action-completed
 * Mark notification action as completed
 */
router.patch('/:id/action-completed', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id);

    const success = await notificationService.markActionCompleted(notificationId, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or action not required'
      });
    }

    res.json({
      success: true,
      message: 'Notification action marked as completed'
    });
  } catch (error) {
    console.error('Error marking action as completed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark action as completed',
      error: error.message
    });
  }
});

/**
 * POST /notifications/bulk-read
 * Mark multiple notifications as read
 */
router.post('/bulk-read', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: 'notificationIds must be an array'
      });
    }

    const results = [];
    for (const notificationId of notificationIds) {
      const success = await notificationService.markAsRead(parseInt(notificationId), userId);
      results.push({ notificationId, success });
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      data: {
        processed: results.length,
        successful: successCount,
        failed: results.length - successCount,
        results
      }
    });
  } catch (error) {
    console.error('Error bulk marking notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: error.message
    });
  }
});

/**
 * GET /notifications/preferences
 * Get user notification preferences
 */
router.get('/preferences', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await notificationService.getUserPreferences(userId);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification preferences',
      error: error.message
    });
  }
});

/**
 * PUT /notifications/preferences
 * Update user notification preferences
 */
router.put('/preferences', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;

    if (!Array.isArray(preferences)) {
      return res.status(400).json({
        success: false,
        message: 'preferences must be an array'
      });
    }

    const success = await notificationService.updateUserPreferences(userId, preferences);

    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update preferences'
      });
    }

    res.json({
      success: true,
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message
    });
  }
});

/**
 * GET /notifications/analytics
 * Get notification analytics (admin/teacher only)
 */
router.get('/analytics', auth, async (req, res) => {
  try {
    const userRole = req.user.role;

    if (!['admin', 'teacher'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view notification analytics'
      });
    }

    const {
      startDate,
      endDate,
      notificationTypes,
      userRole: targetRole
    } = req.query;

    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      notificationTypes: notificationTypes ? notificationTypes.split(',') : null,
      userRole: targetRole || null
    };

    const analytics = await notificationService.getNotificationAnalytics(options);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching notification analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification analytics',
      error: error.message
    });
  }
});

/**
 * POST /notifications/helpers/achievement
 * Send achievement notification (convenience endpoint)
 */
router.post('/helpers/achievement', auth, async (req, res) => {
  try {
    const userRole = req.user.role;

    if (!['admin', 'teacher', 'system'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const { studentId, achievementData } = req.body;

    if (!studentId || !achievementData) {
      return res.status(400).json({
        success: false,
        message: 'studentId and achievementData are required'
      });
    }

    await NotificationHelpers.sendAchievementNotification(studentId, achievementData);

    res.json({
      success: true,
      message: 'Achievement notification sent successfully'
    });
  } catch (error) {
    console.error('Error sending achievement notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send achievement notification',
      error: error.message
    });
  }
});

/**
 * POST /notifications/helpers/goal-completed
 * Send goal completion notification (convenience endpoint)
 */
router.post('/helpers/goal-completed', auth, async (req, res) => {
  try {
    const userRole = req.user.role;

    if (!['admin', 'teacher', 'system'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const { studentId, goalData } = req.body;

    if (!studentId || !goalData) {
      return res.status(400).json({
        success: false,
        message: 'studentId and goalData are required'
      });
    }

    await NotificationHelpers.sendGoalCompletedNotification(studentId, goalData);

    res.json({
      success: true,
      message: 'Goal completion notification sent successfully'
    });
  } catch (error) {
    console.error('Error sending goal completion notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send goal completion notification',
      error: error.message
    });
  }
});

/**
 * POST /notifications/helpers/teacher-message
 * Send teacher message notification (convenience endpoint)
 */
router.post('/helpers/teacher-message', auth, async (req, res) => {
  try {
    const senderId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can send teacher message notifications'
      });
    }

    const { parentId, message, studentId } = req.body;

    if (!parentId || !message || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'parentId, message, and studentId are required'
      });
    }

    await NotificationHelpers.sendTeacherMessageNotification(parentId, senderId, message, studentId);

    res.json({
      success: true,
      message: 'Teacher message notification sent successfully'
    });
  } catch (error) {
    console.error('Error sending teacher message notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send teacher message notification',
      error: error.message
    });
  }
});

/**
 * POST /notifications/helpers/assignment-reminder
 * Send assignment due reminder (convenience endpoint)
 */
router.post('/helpers/assignment-reminder', auth, async (req, res) => {
  try {
    const userRole = req.user.role;

    if (!['admin', 'teacher'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const { studentId, assignmentData } = req.body;

    if (!studentId || !assignmentData) {
      return res.status(400).json({
        success: false,
        message: 'studentId and assignmentData are required'
      });
    }

    await NotificationHelpers.sendAssignmentDueReminder(studentId, assignmentData);

    res.json({
      success: true,
      message: 'Assignment reminder sent successfully'
    });
  } catch (error) {
    console.error('Error sending assignment reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send assignment reminder',
      error: error.message
    });
  }
});

/**
 * WebSocket connection handler for real-time notifications
 */
function handleWebSocketUpgrade(request, socket, head) {
  // Extract token from query string or headers
  const url = new URL(request.url, `http://${request.headers.host}`);
  const token = url.searchParams.get('token') || request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.userId = userId;
      ws.isAlive = true;

      // Generate unique channel ID
      const channelId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      ws.channelId = channelId;

      // Register connection with notification service
      notificationService.registerRealtimeConnection(userId, ws, channelId);

      console.log(`WebSocket connected for user ${userId} (channel: ${channelId})`);

      // Send initial unread count
      notificationService.getUnreadCount(userId).then(count => {
        ws.send(JSON.stringify({
          type: 'unread_count',
          data: { count }
        }));
      }).catch(console.error);

      // Handle ping/pong for connection health
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          
          switch (message.type) {
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
            case 'mark_read':
              if (message.notificationId) {
                notificationService.markAsRead(message.notificationId, userId)
                  .then(success => {
                    ws.send(JSON.stringify({
                      type: 'mark_read_response',
                      data: { notificationId: message.notificationId, success }
                    }));
                  })
                  .catch(console.error);
              }
              break;
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket disconnected for user ${userId} (channel: ${channelId})`);
        notificationService.unregisterRealtimeConnection(userId, ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        notificationService.unregisterRealtimeConnection(userId, ws);
      });
    });
  } catch (error) {
    console.error('Invalid WebSocket token:', error);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
  }
}

// Ping/pong heartbeat to keep connections alive
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Terminating dead WebSocket connection');
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Every 30 seconds

wss.on('close', () => {
  clearInterval(interval);
});

// Export router and WebSocket handler
module.exports = {
  router,
  handleWebSocketUpgrade,
  wss
}; 