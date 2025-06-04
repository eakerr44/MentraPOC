// Notification API Service for Multi-Persona Dashboard
// Task 5.6: Build notification system for important updates and alerts

import {
  Notification,
  NotificationListResponse,
  NotificationCountResponse,
  NotificationPreferencesResponse,
  NotificationPreference,
  CreateNotificationPayload,
  BulkOperationResponse,
  NotificationFilters,
  WebSocketMessage,
  NotificationAnalyticsResponse
} from '../types/notifications';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

class NotificationApiService {
  private token: string | null = null;
  private websocket: WebSocket | null = null;
  private wsEventListeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  // Authentication
  setAuthToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearAuthToken() {
    this.token = null;
    localStorage.removeItem('authToken');
    this.disconnectWebSocket();
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Notification CRUD operations
  async getNotifications(options: NotificationFilters & { 
    limit?: number; 
    offset?: number; 
    sortBy?: string; 
    sortOrder?: string;
  } = {}): Promise<NotificationListResponse> {
    const params = new URLSearchParams();
    
    if (options.status) {
      if (options.status === 'unread') {
        params.append('status', 'delivered');
        params.append('includeRead', 'false');
      } else if (options.status === 'read') {
        params.append('status', 'read');
        params.append('includeRead', 'true');
      } else {
        // 'all' status
        params.append('includeRead', 'true');
      }
    }
    
    if (options.category) params.append('category', options.category);
    if (options.priority) params.append('priority', options.priority);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);

    const queryString = params.toString();
    const endpoint = queryString ? `/api/notifications?${queryString}` : '/api/notifications';

    return this.request<NotificationListResponse>(endpoint);
  }

  async getNotification(id: number): Promise<{ success: boolean; data: Notification }> {
    return this.request<{ success: boolean; data: Notification }>(`/api/notifications/${id}`);
  }

  async getUnreadCount(): Promise<NotificationCountResponse> {
    return this.request<NotificationCountResponse>('/api/notifications/unread-count');
  }

  async createNotification(payload: CreateNotificationPayload): Promise<{ success: boolean; data: any }> {
    return this.request<{ success: boolean; data: any }>('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async markAsRead(id: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAsDismissed(id: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/notifications/${id}/dismiss`, {
      method: 'PATCH',
    });
  }

  async markActionCompleted(id: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/notifications/${id}/action-completed`, {
      method: 'PATCH',
    });
  }

  async bulkMarkAsRead(notificationIds: number[]): Promise<BulkOperationResponse> {
    return this.request<BulkOperationResponse>('/api/notifications/bulk-read', {
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
    });
  }

  // Notification preferences
  async getPreferences(): Promise<NotificationPreferencesResponse> {
    return this.request<NotificationPreferencesResponse>('/api/notifications/preferences');
  }

  async updatePreferences(preferences: NotificationPreference[]): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    });
  }

  // Analytics (admin/teacher only)
  async getAnalytics(options: {
    startDate?: Date;
    endDate?: Date;
    notificationTypes?: string[];
    userRole?: string;
  } = {}): Promise<NotificationAnalyticsResponse> {
    const params = new URLSearchParams();
    
    if (options.startDate) params.append('startDate', options.startDate.toISOString());
    if (options.endDate) params.append('endDate', options.endDate.toISOString());
    if (options.notificationTypes) params.append('notificationTypes', options.notificationTypes.join(','));
    if (options.userRole) params.append('userRole', options.userRole);

    const queryString = params.toString();
    const endpoint = queryString ? `/api/notifications/analytics?${queryString}` : '/api/notifications/analytics';

    return this.request<NotificationAnalyticsResponse>(endpoint);
  }

  // Helper endpoints
  async sendAchievementNotification(studentId: number, achievementData: any): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/notifications/helpers/achievement', {
      method: 'POST',
      body: JSON.stringify({ studentId, achievementData }),
    });
  }

  async sendGoalCompletedNotification(studentId: number, goalData: any): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/notifications/helpers/goal-completed', {
      method: 'POST',
      body: JSON.stringify({ studentId, goalData }),
    });
  }

  async sendTeacherMessageNotification(parentId: number, message: any, studentId: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/notifications/helpers/teacher-message', {
      method: 'POST',
      body: JSON.stringify({ parentId, message, studentId }),
    });
  }

  async sendAssignmentReminder(studentId: number, assignmentData: any): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/notifications/helpers/assignment-reminder', {
      method: 'POST',
      body: JSON.stringify({ studentId, assignmentData }),
    });
  }

  // WebSocket connection management
  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (!this.token) {
        reject(new Error('No authentication token available'));
        return;
      }

      const wsUrl = `${WS_BASE_URL}/ws/notifications?token=${encodeURIComponent(this.token)}`;
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('WebSocket connected for notifications');
        this.reconnectAttempts = 0;
        this.emitEvent('connected');
        resolve();
      };

      this.websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.emitEvent('disconnected', { code: event.code, reason: event.reason });
        
        // Attempt to reconnect if not intentionally closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emitEvent('error', error);
        reject(error);
      };
    });
  }

  private handleWebSocketMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'notification':
        this.emitEvent('notification', message.data);
        break;
      case 'unread_count':
        this.emitEvent('unread_count', message.data);
        break;
      case 'mark_read_response':
        this.emitEvent('mark_read_response', message.data);
        break;
      case 'pong':
        this.emitEvent('pong');
        break;
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  private attemptReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect WebSocket in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connectWebSocket().catch(error => {
        console.error('WebSocket reconnection failed:', error);
      });
    }, delay);
  }

  disconnectWebSocket() {
    if (this.websocket) {
      this.websocket.close(1000, 'Intentional disconnect');
      this.websocket = null;
    }
  }

  sendWebSocketMessage(message: any) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.wsEventListeners.has(event)) {
      this.wsEventListeners.set(event, []);
    }
    this.wsEventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.wsEventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: string, data?: any) {
    const listeners = this.wsEventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  isWebSocketConnected(): boolean {
    return this.websocket !== null && this.websocket.readyState === WebSocket.OPEN;
  }

  getWebSocketState(): string {
    if (!this.websocket) return 'CLOSED';
    
    switch (this.websocket.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  // Ping/pong for connection health
  ping() {
    this.sendWebSocketMessage({ type: 'ping' });
  }

  // Real-time mark as read
  markAsReadViaWebSocket(notificationId: number) {
    this.sendWebSocketMessage({
      type: 'mark_read',
      notificationId
    });
  }
}

// Create singleton instance
export const notificationApi = new NotificationApiService();

// Export default for easy importing
export default notificationApi; 