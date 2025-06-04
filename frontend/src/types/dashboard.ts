// Dashboard Type Definitions

export interface Student {
  id: number;
  name: string;
  username: string;
  gradeLevel: number;
  currentStreak: number;
  totalPoints: number;
  memberSince: string;
  learningPreferences: Record<string, any>;
}

export interface ActivitySummary {
  journal_entries: number;
  problem_sessions: number;
  new_achievements: number;
  current_streak: number;
}

export interface LearningInsight {
  type: 'strength' | 'growth_area' | 'recommendation';
  title: string;
  description: string;
  category: string;
  confidence: number;
  actionable: boolean;
}

export interface LearningInsights {
  topStrengths: LearningInsight[];
  growthAreas: LearningInsight[];
  recommendations: LearningInsight[];
  overallTrend: 'improving' | 'stable' | 'declining';
}

export interface GoalProgress {
  total_goals: number;
  active_goals: number;
  completed_goals: number;
  average_progress: number;
}

export interface Achievement {
  id: number;
  achievement_id: string;
  title: string;
  description: string;
  category: string;
  category_name: string;
  icon: string;
  points_earned: number;
  metadata: Record<string, any>;
  earned_at: string;
}

export interface UpcomingReminder {
  type: 'goal_deadline' | 'assignment_due' | 'reflection_prompt';
  title: string;
  due_date: string;
  id: number;
}

export interface StudentDashboardOverview {
  student: Student;
  activitySummary: ActivitySummary;
  learningInsights: LearningInsights;
  goalProgress: GoalProgress;
  recentAchievements: Achievement[];
  upcomingReminders: UpcomingReminder[];
  timeframe: string;
}

// Goal Management Types
export interface Goal {
  id: number;
  student_id: number;
  title: string;
  description: string;
  category: 'academic' | 'personal' | 'social' | 'creative' | 'health';
  target_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress_percentage: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  total_milestones: number;
  completed_milestones: number;
}

export interface Milestone {
  id: number;
  goal_id: number;
  title: string;
  description: string;
  target_date: string | null;
  completed_at: string | null;
  order_index: number;
  created_at: string;
}

export interface GoalActivity {
  id: number;
  goal_id: number;
  activity_type: 'created' | 'updated' | 'milestone_completed' | 'progress_updated';
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  goal_title?: string;
}

export interface GoalSummary {
  total: number;
  active: number;
  completed: number;
  averageProgress: number;
}

export interface GoalsData {
  goals: Goal[];
  recentActivities: GoalActivity[];
  summary: GoalSummary;
}

export interface CreateGoalRequest {
  title: string;
  description: string;
  category: Goal['category'];
  targetDate?: string;
  priority?: Goal['priority'];
  milestones?: {
    title: string;
    description: string;
    targetDate?: string;
    order?: number;
  }[];
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  category?: Goal['category'];
  target_date?: string;
  priority?: Goal['priority'];
  status?: Goal['status'];
}

// Progress Tracking Types
export interface ProgressMetric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  timeframe: string;
  unit: string;
}

export interface ProgressChart {
  type: 'line' | 'bar' | 'radar' | 'pie';
  title: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string;
      borderColor?: string;
      fill?: boolean;
    }[];
  };
  options?: Record<string, any>;
}

export interface ProgressData {
  metrics: ProgressMetric[];
  charts: ProgressChart[];
  trends: {
    overall: 'improving' | 'stable' | 'declining';
    categories: Record<string, 'improving' | 'stable' | 'declining'>;
  };
  projections: {
    category: string;
    current: number;
    projected: number;
    confidence: number;
    timeframe: string;
  }[];
}

// Achievement System Types
export interface AchievementCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface AchievementStatistics {
  total_achievements: number;
  recent_achievements: number;
  categories_completed: number;
}

export interface AchievementsData {
  achievements: Achievement[];
  statistics: AchievementStatistics;
  categories: AchievementCategory[];
}

// Activity Feed Types
export interface ActivityFeedItem {
  type: 'journal' | 'problem' | 'goal';
  id: number;
  title: string;
  created_at: string;
  metadata: Record<string, any>;
}

export interface ActivityFeedData {
  activities: ActivityFeedItem[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Dashboard Widget Types
export interface DashboardWidget {
  id: string;
  type: 'overview' | 'goals' | 'progress' | 'achievements' | 'activity_feed' | 'insights';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number; w: number; h: number };
  visible: boolean;
  settings: Record<string, any>;
}

export interface DashboardPreferences {
  id: number;
  student_id: number;
  widget_layout: DashboardWidget[];
  default_timeframe: '7d' | '30d' | '90d' | 'all';
  notification_settings: {
    goal_reminders: boolean;
    achievement_notifications: boolean;
    weekly_summaries: boolean;
    streak_milestones: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
  created_at: string;
  updated_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardApiClient {
  getOverview: (timeframe?: string) => Promise<StudentDashboardOverview>;
  getLearningInsights: (timeframe?: string, category?: string) => Promise<any>;
  getGoals: (status?: string) => Promise<GoalsData>;
  createGoal: (goal: CreateGoalRequest) => Promise<{ goal: Goal; message: string }>;
  updateGoal: (goalId: number, updates: UpdateGoalRequest) => Promise<{ goal: Goal; message: string }>;
  getProgress: (timeframe?: string, metric?: string) => Promise<ProgressData>;
  getAchievements: (category?: string, limit?: number) => Promise<AchievementsData>;
  getActivityFeed: (limit?: number, offset?: number) => Promise<ActivityFeedData>;
}

// Component Props Types
export interface StudentDashboardProps {
  userId: number;
  initialTimeframe?: string;
}

export interface DashboardOverviewProps {
  overview: StudentDashboardOverview;
  onTimeframeChange: (timeframe: string) => void;
}

export interface GoalsWidgetProps {
  goals: Goal[];
  summary: GoalSummary;
  onCreateGoal: (goal: CreateGoalRequest) => void;
  onUpdateGoal: (goalId: number, updates: UpdateGoalRequest) => void;
}

export interface ProgressWidgetProps {
  progress: ProgressData;
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
}

export interface AchievementsWidgetProps {
  achievements: Achievement[];
  statistics: AchievementStatistics;
  categories: AchievementCategory[];
}

export interface LearningInsightsWidgetProps {
  insights: LearningInsights;
  timeframe: string;
}

export interface ActivityFeedWidgetProps {
  activities: ActivityFeedItem[];
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
}

// Utility Types
export type TimeframeOption = {
  value: '7d' | '30d' | '90d' | 'all';
  label: string;
  days?: number;
};

export type GoalCategoryOption = {
  value: Goal['category'];
  label: string;
  icon: string;
  color: string;
};

export type PriorityOption = {
  value: Goal['priority'];
  label: string;
  color: string;
  weight: number;
};

// Dashboard State Management
export interface DashboardState {
  overview: StudentDashboardOverview | null;
  goals: GoalsData | null;
  progress: ProgressData | null;
  achievements: AchievementsData | null;
  activityFeed: ActivityFeedData | null;
  preferences: DashboardPreferences | null;
  loading: {
    overview: boolean;
    goals: boolean;
    progress: boolean;
    achievements: boolean;
    activityFeed: boolean;
  };
  errors: {
    overview: string | null;
    goals: string | null;
    progress: string | null;
    achievements: string | null;
    activityFeed: string | null;
  };
  currentTimeframe: string;
}

export interface DashboardActions {
  setTimeframe: (timeframe: string) => void;
  refreshOverview: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  refreshProgress: () => Promise<void>;
  refreshAchievements: () => Promise<void>;
  refreshActivityFeed: () => Promise<void>;
  createGoal: (goal: CreateGoalRequest) => Promise<void>;
  updateGoal: (goalId: number, updates: UpdateGoalRequest) => Promise<void>;
  loadMoreActivities: () => Promise<void>;
  clearError: (section: keyof DashboardState['errors']) => void;
} 