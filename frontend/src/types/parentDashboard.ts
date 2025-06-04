// Parent Dashboard Type Definitions

export interface Parent {
  id: number;
  name: string;
  username: string;
  contactPreferences: Record<string, any>;
  notificationSettings: Record<string, any>;
  memberSince: string;
}

export interface FamilyOverview {
  totalChildren: number;
  activeChildren: number;
  totalPoints: number;
  averageStreak: number;
}

export interface Child {
  user_id: number;
  first_name: string;
  last_name: string;
  username: string;
  grade_level: number;
  current_streak: number;
  total_points: number;
  last_activity_date: string;
  best_streak: number;
  relationship_type: string;
  primary_contact: boolean;
}

export interface FamilyAnalytics {
  total_children: number;
  avg_family_streak: number;
  total_family_points: number;
  children_journaling: number;
  children_problem_solving: number;
  total_journal_entries: number;
  total_problem_sessions: number;
  total_achievements: number;
}

export interface ChildProgress {
  user_id: number;
  first_name: string;
  last_name: string;
  current_streak: number;
  total_points: number;
  grade_level: number;
  last_activity_date: string;
  relationship_type: string;
  journal_entries: number;
  problem_sessions: number;
  achievements: number;
  avg_performance: number;
}

export interface FamilyInsights {
  strengths: InsightItem[];
  growthAreas: InsightItem[];
  homeLearningTips: LearningTip[];
  motivationalStrategies: MotivationalStrategy[];
  celebrationMoments: CelebrationMoment[];
}

export interface InsightItem {
  type: string;
  title: string;
  description: string;
  confidence: number;
  category: 'academic' | 'emotional' | 'social' | 'behavioral';
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface LearningTip {
  category: 'routine' | 'motivation' | 'independence' | 'academic' | 'emotional';
  title: string;
  description: string;
  actionItems: string[];
  ageAppropriate: boolean;
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'challenging';
}

export interface MotivationalStrategy {
  type: 'encouragement' | 'reward' | 'challenge' | 'collaboration';
  title: string;
  description: string;
  whenToUse: string;
  expectedOutcome: string;
  childPersonalities: string[];
}

export interface CelebrationMoment {
  type: 'achievement' | 'milestone' | 'improvement' | 'effort';
  title: string;
  description: string;
  childName: string;
  date: string;
  shareWorthy: boolean;
}

export interface WeeklyHighlight {
  type: 'achievement' | 'streak_milestone' | 'goal_progress' | 'learning_moment';
  title: string;
  description: string;
  date: string;
  child_name: string;
  points_earned?: number;
  category: string;
}

export interface TeacherCommunication {
  id: number;
  teacher_id: number;
  student_id: number;
  parent_id: number;
  communication_type: 'email' | 'phone' | 'in_person' | 'message' | 'report';
  subject: string;
  content: string;
  direction: 'outgoing' | 'incoming';
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'replied';
  importance: 'low' | 'normal' | 'high' | 'urgent';
  requires_follow_up: boolean;
  follow_up_date?: string;
  attachments?: string[];
  created_at: string;
  teacher_name: string;
  child_name: string;
  unread?: boolean;
}

export interface UpcomingEvent {
  type: 'goal_deadline' | 'parent_conference' | 'report_card' | 'family_activity';
  title: string;
  description: string;
  date: string;
  children_involved: 'all' | number[];
  actionRequired?: boolean;
  reminderSet?: boolean;
}

export interface ParentDashboardOverview {
  parent: Parent;
  familyOverview: FamilyOverview;
  children: Child[];
  familyAnalytics: FamilyAnalytics;
  childrenProgress: ChildProgress[];
  familyInsights: FamilyInsights;
  weeklyHighlights: WeeklyHighlight[];
  teacherCommunications: TeacherCommunication[];
  upcomingEvents: UpcomingEvent[];
  timeframe: string;
}

// Weekly Summary Types
export interface WeeklySummary {
  weekPeriod: {
    start: string;
    end: string;
    weekOffset: number;
  };
  childrenSummaries: ChildWeeklySummary[];
  familyTotals: {
    totalJournalEntries: number;
    totalProblemSessions: number;
    totalAchievements: number;
    totalPointsEarned: number;
  };
  weeklyHighlights?: WeeklyHighlight[];
  learningInsights?: FamilyInsights;
  celebrationMoments?: CelebrationMoment[];
  areasForSupport?: string[];
}

export interface ChildWeeklySummary {
  user_id: number;
  child_name: string;
  journal_entries: number;
  problem_sessions: number;
  achievements: number;
  achievement_titles?: string;
  week_end_streak: number;
  points_earned: number;
  engagementLevel: 'excellent' | 'good' | 'fair' | 'needs_attention';
  weeklyGrowth: {
    strengthAreas: string[];
    improvementAreas: string[];
    parentSupport: string[];
  };
}

// Engagement Metrics Types
export interface EngagementMetrics {
  metrics: EngagementMetric[];
  trends: {
    overall: 'improving' | 'stable' | 'declining';
    byChild: Record<number, 'improving' | 'stable' | 'declining'>;
    byCategory: Record<string, 'improving' | 'stable' | 'declining'>;
  };
  recommendations: EngagementRecommendation[];
  comparisons?: {
    previousPeriod: number;
    familyAverage: number;
    ageGroupAverage?: number;
  };
}

export interface EngagementMetric {
  childId: number;
  childName: string;
  category: 'consistency' | 'participation' | 'quality' | 'independence';
  currentValue: number;
  targetValue: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  description: string;
  lastUpdated: string;
}

export interface EngagementRecommendation {
  type: 'home_activity' | 'routine_change' | 'motivation_strategy' | 'communication';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  targetChildren: number[];
  actionItems: string[];
  expectedOutcome: string;
  timeframe: string;
  resources?: LearningResource[];
}

// Child Detail View Types
export interface ChildDetailedView {
  overview: any; // Reuse from student dashboard types
  insights: any;
  goals: any;
  achievements: any;
  parentInsights: ParentInsight[];
  learningRecommendations: ParentLearningRecommendation[];
  teacherFeedback?: TeacherFeedback[];
  growthTracking?: GrowthTracking;
}

export interface ParentInsight {
  id: number;
  insight_type: 'learning_style' | 'motivation' | 'home_support' | 'progress_pattern';
  insight_category: 'academic' | 'emotional' | 'social' | 'behavioral';
  title: string;
  description: string;
  confidence_score: number;
  actionable_tips: LearningTip[];
  supporting_data: Record<string, any>;
  resources: LearningResource[];
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'acted_on' | 'dismissed';
  created_at: string;
  parent_name?: string;
}

export interface ParentLearningRecommendation {
  type: 'home_activity' | 'reading' | 'practice' | 'discussion' | 'exploration';
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'as_needed';
  estimatedTime: string;
  materials?: string[];
  ageAppropriate: boolean;
  skillsTargeted: string[];
}

export interface TeacherFeedback {
  teacher_name: string;
  subject: string;
  feedback: string;
  recommendations: string[];
  date: string;
  positive_highlights: string[];
  areas_for_growth: string[];
}

export interface GrowthTracking {
  academic: {
    subjects: Record<string, GrowthMetric>;
    overallTrend: 'improving' | 'stable' | 'needs_attention';
  };
  social: {
    skills: Record<string, GrowthMetric>;
    overallTrend: 'improving' | 'stable' | 'needs_attention';
  };
  emotional: {
    skills: Record<string, GrowthMetric>;
    overallTrend: 'improving' | 'stable' | 'needs_attention';
  };
}

export interface GrowthMetric {
  currentLevel: number;
  previousLevel: number;
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
  notes: string;
}

// Communication Types
export interface CreateCommunicationRequest {
  teacherId: number;
  childId: number;
  subject: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  requestFollowUp?: boolean;
  followUpDate?: string;
}

export interface CommunicationTemplate {
  id: number;
  template_type: 'teacher_inquiry' | 'goal_discussion' | 'concern_sharing' | 'achievement_celebration';
  subject_template: string;
  content_template: string;
  variables: Record<string, string>;
  category: 'academic' | 'behavioral' | 'social' | 'achievement';
  tone: 'formal' | 'friendly' | 'concerned' | 'celebratory';
  is_default: boolean;
  usage_count: number;
}

// Learning Tips and Resources Types
export interface LearningTipsResponse {
  personalizedTips: PersonalizedTips[];
  generalTips: LearningTip[];
  resources?: LearningResource[];
}

export interface PersonalizedTips {
  childId: number;
  childName: string;
  tips: LearningTip[];
}

export interface LearningResource {
  type: 'website' | 'article' | 'video' | 'activity' | 'tool' | 'app' | 'book';
  title: string;
  description: string;
  url?: string;
  content?: Record<string, any>;
  category: string;
  ageRange: string;
  difficulty: 'easy' | 'medium' | 'challenging';
  estimatedTime: string;
  tags: string[];
  rating?: number;
  cost?: 'free' | 'paid' | 'subscription';
}

// Family Goals Types
export interface FamilyGoal {
  id: number;
  parent_id: number;
  title: string;
  description: string;
  goal_type: 'learning_routine' | 'screen_time' | 'family_learning' | 'reading_together' | 'homework_support';
  target_children: number[];
  target_metrics: Record<string, any>;
  current_progress: Record<string, any>;
  start_date: string;
  target_date?: string;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  priority: 'low' | 'medium' | 'high';
  reward_plan?: string;
  parent_commitment?: string;
  child_involvement?: string;
  success_criteria?: string;
  weekly_check_ins: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFamilyGoalRequest {
  title: string;
  description: string;
  goalType: FamilyGoal['goal_type'];
  targetChildren: number[];
  targetMetrics: Record<string, any>;
  targetDate?: string;
  priority?: FamilyGoal['priority'];
  rewardPlan?: string;
  parentCommitment?: string;
  childInvolvement?: string;
  successCriteria?: string;
  weeklyCheckIns?: boolean;
}

export interface FamilyGoalActivity {
  id: number;
  goal_id: number;
  activity_date: string;
  activity_type: 'progress_update' | 'milestone_reached' | 'challenge_noted' | 'celebration';
  description: string;
  participants: number[];
  outcome: 'positive' | 'challenging' | 'neutral';
  notes?: string;
  attachments?: string[];
  logged_by: number;
  created_at: string;
}

// Dashboard Preferences Types
export interface ParentDashboardPreferences {
  id: number;
  parent_id: number;
  default_timeframe: '7d' | '30d' | '90d';
  default_child_view: 'overview' | 'detailed' | 'comparison';
  widget_layout?: DashboardWidget[];
  summary_frequency: 'daily' | 'weekly' | 'monthly';
  report_format: 'summary' | 'detailed' | 'visual';
  notification_settings: {
    weekly_summaries: boolean;
    achievement_notifications: boolean;
    teacher_communications: boolean;
    goal_deadlines: boolean;
    engagement_alerts: boolean;
    progress_milestones: boolean;
  };
  communication_preferences: {
    teacher_response_expectation: string;
    preferred_contact_times: string[];
    communication_style: string;
  };
  learning_support_preferences: {
    tip_categories: string[];
    tip_frequency: string;
    resource_types: string[];
  };
  privacy_settings: {
    share_with_child: boolean;
    share_achievement_celebrations: boolean;
    share_progress_with_family: boolean;
  };
  theme: 'family' | 'light' | 'dark';
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  type: 'family_overview' | 'children_progress' | 'weekly_summary' | 'communications' | 'learning_tips' | 'family_goals';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number; w: number; h: number };
  visible: boolean;
  settings: Record<string, any>;
}

// API Client Interface
export interface ParentDashboardApiClient {
  // Overview and Analytics
  getOverview: (timeframe?: string) => Promise<ParentDashboardOverview>;
  getChildDetail: (childId: number, timeframe?: string) => Promise<ChildDetailedView>;
  getWeeklySummary: (weekOffset?: number) => Promise<WeeklySummary>;
  getEngagementMetrics: (timeframe?: string, childId?: number) => Promise<EngagementMetrics>;
  
  // Communication
  getTeacherCommunications: (limit?: number, offset?: number, childId?: number) => Promise<{ communications: TeacherCommunication[]; pagination: any }>;
  sendCommunication: (communication: CreateCommunicationRequest) => Promise<{ communication: TeacherCommunication; message: string }>;
  getCommunicationTemplates: () => Promise<CommunicationTemplate[]>;
  
  // Learning Support
  getLearningTips: (childId?: number) => Promise<LearningTipsResponse>;
  getLearningResources: (category?: string, ageRange?: string) => Promise<LearningResource[]>;
  
  // Family Goals
  getFamilyGoals: () => Promise<FamilyGoal[]>;
  createFamilyGoal: (goal: CreateFamilyGoalRequest) => Promise<{ goal: FamilyGoal; message: string }>;
  updateFamilyGoal: (goalId: number, updates: Partial<FamilyGoal>) => Promise<{ goal: FamilyGoal; message: string }>;
  addGoalActivity: (goalId: number, activity: Partial<FamilyGoalActivity>) => Promise<{ activity: FamilyGoalActivity; message: string }>;
  
  // Preferences
  getPreferences: () => Promise<ParentDashboardPreferences>;
  updatePreferences: (preferences: Partial<ParentDashboardPreferences>) => Promise<{ message: string }>;
}

// Component Props Types
export interface ParentDashboardProps {
  parentId: number;
  initialTimeframe?: string;
}

export interface FamilyOverviewProps {
  overview: ParentDashboardOverview;
  onTimeframeChange: (timeframe: string) => void;
  onChildSelect: (childId: number) => void;
  onViewWeeklySummary: () => void;
}

export interface ChildrenProgressProps {
  children: Child[];
  childrenProgress: ChildProgress[];
  onChildSelect: (childId: number) => void;
  onSendMessage: (childId: number) => void;
}

export interface WeeklySummaryProps {
  summary: WeeklySummary;
  onWeekChange: (weekOffset: number) => void;
  onChildSelect: (childId: number) => void;
  onShareSummary: () => void;
}

export interface CommunicationWidgetProps {
  communications: TeacherCommunication[];
  onSendMessage: (communication: CreateCommunicationRequest) => void;
  onReplyToMessage: (communicationId: number) => void;
  onMarkAsRead: (communicationId: number) => void;
}

export interface LearningTipsWidgetProps {
  tips: LearningTipsResponse;
  onSaveTip: (tip: LearningTip) => void;
  onRequestMoreTips: (childId?: number) => void;
  onRateTip: (tipId: string, rating: number) => void;
}

export interface FamilyGoalsWidgetProps {
  goals: FamilyGoal[];
  onCreateGoal: (goal: CreateFamilyGoalRequest) => void;
  onUpdateGoal: (goalId: number, updates: Partial<FamilyGoal>) => void;
  onAddActivity: (goalId: number, activity: Partial<FamilyGoalActivity>) => void;
}

export interface ChildDetailProps {
  childId: number;
  childData: ChildDetailedView;
  onSendMessage: (communication: CreateCommunicationRequest) => void;
  onSetGoal: (goal: CreateFamilyGoalRequest) => void;
  onClose: () => void;
}

// Utility Types
export type EngagementLevel = 'excellent' | 'good' | 'fair' | 'needs_attention';
export type CommunicationType = TeacherCommunication['communication_type'];
export type CommunicationStatus = TeacherCommunication['status'];
export type GoalType = FamilyGoal['goal_type'];
export type GoalStatus = FamilyGoal['status'];

export interface EngagementLevelOption {
  value: EngagementLevel;
  label: string;
  color: string;
  icon: string;
  description: string;
}

export interface GoalTypeOption {
  value: GoalType;
  label: string;
  icon: string;
  description: string;
  suggestedMetrics: string[];
}

// Dashboard State Management
export interface ParentDashboardState {
  overview: ParentDashboardOverview | null;
  selectedChildId: number | null;
  childDetail: ChildDetailedView | null;
  weeklySummary: WeeklySummary | null;
  engagementMetrics: EngagementMetrics | null;
  communications: TeacherCommunication[];
  learningTips: LearningTipsResponse | null;
  familyGoals: FamilyGoal[];
  preferences: ParentDashboardPreferences | null;
  loading: {
    overview: boolean;
    childDetail: boolean;
    weeklySummary: boolean;
    engagementMetrics: boolean;
    communications: boolean;
    learningTips: boolean;
    familyGoals: boolean;
  };
  errors: {
    overview: string | null;
    childDetail: string | null;
    weeklySummary: string | null;
    engagementMetrics: string | null;
    communications: string | null;
    learningTips: string | null;
    familyGoals: string | null;
  };
  currentTimeframe: string;
  currentWeekOffset: number;
  activeView: 'overview' | 'weekly_summary' | 'children' | 'communications' | 'learning_tips' | 'family_goals';
}

export interface ParentDashboardActions {
  setTimeframe: (timeframe: string) => void;
  setWeekOffset: (weekOffset: number) => void;
  setActiveView: (view: ParentDashboardState['activeView']) => void;
  selectChild: (childId: number | null) => void;
  refreshOverview: () => Promise<void>;
  refreshChildDetail: (childId: number) => Promise<void>;
  refreshWeeklySummary: () => Promise<void>;
  refreshEngagementMetrics: () => Promise<void>;
  refreshCommunications: () => Promise<void>;
  refreshLearningTips: () => Promise<void>;
  refreshFamilyGoals: () => Promise<void>;
  sendCommunication: (communication: CreateCommunicationRequest) => Promise<void>;
  createFamilyGoal: (goal: CreateFamilyGoalRequest) => Promise<void>;
  updateFamilyGoal: (goalId: number, updates: Partial<FamilyGoal>) => Promise<void>;
  clearError: (section: keyof ParentDashboardState['errors']) => void;
} 