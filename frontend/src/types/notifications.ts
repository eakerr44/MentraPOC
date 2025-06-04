// TypeScript types for notification system
// Task 5.6: Build notification system for important updates and alerts

// Core notification interfaces
export interface Notification {
  id: number;
  title: string;
  message: string;
  data: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'dismissed' | 'failed';
  actionRequired: boolean;
  actionUrl?: string;
  actionText?: string;
  actionCompleted: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
  tags: string[];
  threadId?: string;
  type: NotificationType;
  sender?: NotificationSender;
}

export interface NotificationType {
  key: string;
  name: string;
  category: 'academic' | 'social' | 'system' | 'achievement' | 'reminder';
  icon: string;
  color: string;
}

export interface NotificationSender {
  firstName: string;
  lastName: string;
}

// Notification preferences
export interface NotificationPreference {
  typeKey: string;
  name: string;
  category: string;
  priority: string;
  icon: string;
  enabled: boolean;
  channels: string[];
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

// API response types
export interface NotificationListResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface NotificationCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

export interface NotificationPreferencesResponse {
  success: boolean;
  data: NotificationPreference[];
}

export interface NotificationAnalytics {
  typeKey: string;
  name: string;
  category: string;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalDismissed: number;
  totalActions: number;
  avgTimeToReadMinutes: number;
}

export interface NotificationAnalyticsResponse {
  success: boolean;
  data: NotificationAnalytics[];
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'notification' | 'unread_count' | 'mark_read_response' | 'pong';
  data?: any;
}

export interface NotificationWebSocketMessage extends WebSocketMessage {
  type: 'notification';
  data: Notification;
}

export interface UnreadCountWebSocketMessage extends WebSocketMessage {
  type: 'unread_count';
  data: {
    count: number;
  };
}

// Component prop types
export interface NotificationItemProps {
  notification: Notification;
  onRead?: (id: number) => void;
  onDismiss?: (id: number) => void;
  onActionComplete?: (id: number) => void;
  onClick?: (notification: Notification) => void;
  compact?: boolean;
}

export interface NotificationListProps {
  notifications: Notification[];
  loading?: boolean;
  error?: string;
  onRead?: (id: number) => void;
  onDismiss?: (id: number) => void;
  onActionComplete?: (id: number) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  emptyMessage?: string;
}

export interface NotificationBellProps {
  count: number;
  onClick: () => void;
  variant?: 'default' | 'compact';
  maxCount?: number;
}

export interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreferences?: () => void;
  position?: 'left' | 'right';
  maxHeight?: number;
}

export interface NotificationPreferencesProps {
  preferences: NotificationPreference[];
  onSave: (preferences: NotificationPreference[]) => void;
  loading?: boolean;
  error?: string;
}

export interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode?: 'student' | 'teacher' | 'parent';
}

// Filter and sort options
export interface NotificationFilters {
  status?: 'all' | 'unread' | 'read';
  category?: string;
  priority?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface NotificationSortOptions {
  field: 'createdAt' | 'priority' | 'status';
  direction: 'asc' | 'desc';
}

// Create notification payload
export interface CreateNotificationPayload {
  typeKey: string;
  recipientId?: number;
  recipientIds?: number[];
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  actionText?: string;
  scheduledFor?: string;
  expiresAt?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
}

// Bulk operations
export interface BulkNotificationOperation {
  notificationIds: number[];
  operation: 'read' | 'dismiss' | 'delete';
}

export interface BulkOperationResponse {
  success: boolean;
  data: {
    processed: number;
    successful: number;
    failed: number;
    results: Array<{
      notificationId: number;
      success: boolean;
    }>;
  };
}

// Real-time notification context
export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchNotifications: (options?: NotificationFilters & { offset?: number; limit?: number }) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAsDismissed: (id: number) => Promise<void>;
  markActionCompleted: (id: number) => Promise<void>;
  bulkMarkAsRead: (ids: number[]) => Promise<void>;
  clearAll: () => void;
  
  // Preferences
  preferences: NotificationPreference[];
  updatePreferences: (preferences: NotificationPreference[]) => Promise<void>;
  
  // WebSocket connection
  connect: () => void;
  disconnect: () => void;
}

// Helper notification creators
export interface AchievementNotificationData {
  title: string;
  description: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
}

export interface GoalNotificationData {
  id: number;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  completedAt?: string;
}

export interface AssignmentNotificationData {
  id: number;
  title: string;
  subject: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

export interface MessageNotificationData {
  id: number;
  subject: string;
  preview: string;
  senderId: number;
  senderName: string;
}

// Custom hooks return types
export interface UseNotificationReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  
  fetchNotifications: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAsDismissed: (id: number) => Promise<void>;
  markActionCompleted: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseNotificationWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
}

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreference[];
  loading: boolean;
  error: string | null;
  updatePreferences: (preferences: NotificationPreference[]) => Promise<void>;
  resetToDefaults: () => Promise<void>;
} 