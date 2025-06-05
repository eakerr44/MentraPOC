import axios from 'axios';
import { 
  StudentDashboardOverview, 
  GoalsData, 
  CreateGoalRequest, 
  UpdateGoalRequest, 
  Goal, 
  ProgressData, 
  AchievementsData, 
  ActivityFeedData,
  DashboardApiClient 
} from '../types/dashboard';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Get token from Zustand persistence
  let token = null;
  try {
    const persistedState = localStorage.getItem('mentra-auth-storage');
    if (persistedState) {
      const authState = JSON.parse(persistedState);
      token = authState.state?.token;
    }
  } catch (error) {
    console.warn('Failed to get auth token from persistence:', error);
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const API_BASE_URL = '/dashboard';

// Helper function to get auth token from Zustand persisted state (legacy - now using interceptor)
const getAuthToken = (): string | null => {
  try {
    const authData = localStorage.getItem('mentra-auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.state?.token || null;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

class DashboardApiService implements DashboardApiClient {
  private async request<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    try {
      const response = await api.request({
        url: `${API_BASE_URL}${endpoint}`,
        method,
        data
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Network error');
    }
  }

  async getOverview(timeframe: string = '30d'): Promise<StudentDashboardOverview> {
    const params = new URLSearchParams({ timeframe });
    return this.request<StudentDashboardOverview>(`/student/overview?${params}`);
  }

  async getLearningInsights(timeframe: string = '30d', category?: string): Promise<any> {
    const params = new URLSearchParams({ timeframe });
    if (category) params.append('category', category);
    
    return this.request(`/student/learning-insights?${params}`);
  }

  async getGoals(status?: string): Promise<GoalsData> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    
    return this.request<GoalsData>(`/student/goals?${params}`);
  }

  async createGoal(goalData: CreateGoalRequest): Promise<{ goal: Goal; message: string }> {
    return this.request<{ goal: Goal; message: string }>('/student/goals', 'POST', goalData);
  }

  async updateGoal(goalId: number, updates: UpdateGoalRequest): Promise<{ goal: Goal; message: string }> {
    return this.request<{ goal: Goal; message: string }>(`/student/goals/${goalId}`, 'PUT', updates);
  }

  async getProgress(timeframe: string = '30d', metric?: string): Promise<ProgressData> {
    const params = new URLSearchParams({ timeframe });
    if (metric) params.append('metric', metric);
    
    return this.request<ProgressData>(`/student/progress?${params}`);
  }

  async getAchievements(category?: string, limit: number = 20): Promise<AchievementsData> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (category) params.append('category', category);
    
    return this.request<AchievementsData>(`/student/achievements?${params}`);
  }

  async getActivityFeed(limit: number = 15, offset: number = 0): Promise<ActivityFeedData> {
    const params = new URLSearchParams({ 
      limit: limit.toString(), 
      offset: offset.toString() 
    });
    
    return this.request<ActivityFeedData>(`/student/activity-feed?${params}`);
  }

  // Goal milestone management
  async completeGoalMilestone(goalId: number, milestoneId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/student/goals/${goalId}/milestones/${milestoneId}/complete`, 'POST');
  }

  async addGoalMilestone(goalId: number, milestone: {
    title: string;
    description: string;
    targetDate?: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/student/goals/${goalId}/milestones`, 'POST', milestone);
  }

  // Dashboard preferences
  async getPreferences(): Promise<any> {
    return this.request('/student/preferences');
  }

  async updatePreferences(preferences: any): Promise<{ message: string }> {
    return this.request('/student/preferences', 'PUT', preferences);
  }

  // Utility methods for data transformation
  formatTimeframe(timeframe: string): string {
    const timeframeMap: Record<string, string> = {
      '7d': 'Last 7 days',
      '30d': 'Last 30 days',
      '90d': 'Last 90 days',
      'all': 'All time'
    };
    return timeframeMap[timeframe] || timeframe;
  }

  formatGoalCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'academic': 'Academic',
      'personal': 'Personal',
      'social': 'Social',
      'creative': 'Creative',
      'health': 'Health & Wellness'
    };
    return categoryMap[category] || category;
  }

  formatPriority(priority: string): string {
    const priorityMap: Record<string, string> = {
      'low': 'Low Priority',
      'medium': 'Medium Priority',
      'high': 'High Priority',
      'urgent': 'Urgent'
    };
    return priorityMap[priority] || priority;
  }

  getPriorityColor(priority: string): string {
    const colorMap: Record<string, string> = {
      'low': '#4CAF50',
      'medium': '#FF9800',
      'high': '#F44336',
      'urgent': '#9C27B0'
    };
    return colorMap[priority] || '#757575';
  }

  getCategoryIcon(category: string): string {
    const iconMap: Record<string, string> = {
      'academic': '📚',
      'personal': '🎯',
      'social': '👥',
      'creative': '🎨',
      'health': '💪'
    };
    return iconMap[category] || '📝';
  }

  getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    const trendMap: Record<string, string> = {
      'up': '📈',
      'down': '📉',
      'stable': '➡️'
    };
    return trendMap[trend];
  }

  getTrendColor(trend: 'up' | 'down' | 'stable'): string {
    const colorMap: Record<string, string> = {
      'up': '#4CAF50',
      'down': '#F44336',
      'stable': '#FF9800'
    };
    return colorMap[trend];
  }

  formatActivityType(type: string): string {
    const typeMap: Record<string, string> = {
      'journal': 'Journal Entry',
      'problem': 'Problem Solved',
      'goal': 'Goal Activity',
      'achievement_earned': 'Achievement Earned',
      'streak_milestone': 'Streak Milestone'
    };
    return typeMap[type] || type;
  }

  getActivityIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'journal': '📝',
      'problem': '🧮',
      'goal': '🎯',
      'achievement_earned': '🏆',
      'streak_milestone': '🔥'
    };
    return iconMap[type] || '📋';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  }

  formatRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return this.formatDate(dateString);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
    return `In ${Math.ceil(diffDays / 30)} months`;
  }

  calculateProgress(completed: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }

  generateInsightSummary(insights: any): string {
    const { topStrengths, growthAreas, recommendations } = insights;
    
    if (topStrengths.length === 0 && growthAreas.length === 0) {
      return "Keep up the great work! Continue your learning journey.";
    }
    
    const strengthSummary = topStrengths.length > 0 
      ? `You excel at ${topStrengths[0].title.toLowerCase()}`
      : '';
    
    const growthSummary = growthAreas.length > 0 
      ? `Focus on improving ${growthAreas[0].title.toLowerCase()}`
      : '';
    
    return [strengthSummary, growthSummary].filter(Boolean).join('. ') + '.';
  }

  getStreakMessage(streak: number): string {
    if (streak === 0) return "Start your learning streak today!";
    if (streak === 1) return "Great start! Keep it going!";
    if (streak < 7) return `${streak} days strong! You're building momentum!`;
    if (streak < 30) return `Amazing ${streak}-day streak! You're on fire! 🔥`;
    if (streak < 100) return `Incredible ${streak}-day streak! You're a learning champion! 🏆`;
    return `Legendary ${streak}-day streak! You're an inspiration! ⭐`;
  }

  getPointsMessage(points: number): string {
    if (points === 0) return "Start earning points by completing activities!";
    if (points < 100) return "Great start! Keep earning points!";
    if (points < 500) return "You're making excellent progress!";
    if (points < 1000) return "Fantastic achievement! You're a dedicated learner!";
    return "Outstanding! You're a learning superstar!";
  }
}

// Create and export singleton instance
export const dashboardApi = new DashboardApiService();
export default dashboardApi; 