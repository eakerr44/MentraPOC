// Teacher Dashboard Type Definitions

export interface Teacher {
  id: number;
  name: string;
  username: string;
  subjectAreas: string[];
  gradeLevels: number[];
  schoolId?: string;
  memberSince: string;
}

export interface ClassOverview {
  totalStudents: number;
  activeStudents: number;
  averageStreak: number;
  totalPoints: number;
}

export interface ClassStudent {
  user_id: number;
  first_name: string;
  last_name: string;
  username: string;
  grade_level: number;
  current_streak: number;
  total_points: number;
  last_activity_date: string;
}

export interface ClassAnalytics {
  total_students: number;
  avg_streak: number;
  total_class_points: number;
  students_journaling: number;
  students_problem_solving: number;
  total_journal_entries: number;
  total_problem_sessions: number;
}

export interface StudentProgress {
  user_id: number;
  first_name: string;
  last_name: string;
  current_streak: number;
  total_points: number;
  grade_level: number;
  journal_entries: number;
  problem_sessions: number;
  achievements: number;
  avg_performance: number;
}

export interface ClassInsights {
  engagementTrends: InsightItem[];
  learningPatterns: InsightItem[];
  performanceTrends: InsightItem[];
  recommendations: RecommendationItem[];
}

export interface InsightItem {
  type: string;
  title: string;
  description: string;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
  affectedStudents: number;
}

export interface RecommendationItem {
  type: 'engagement' | 'academic' | 'behavioral' | 'intervention';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  actionItems: string[];
  expectedOutcome: string;
  estimatedEffort: 'low' | 'medium' | 'high';
}

export interface ClassActivity {
  type: 'journal' | 'problem' | 'achievement';
  id: number;
  title: string;
  created_at: string;
  student_name: string;
  student_id: number;
  metadata: Record<string, any>;
}

export interface StudentAlert {
  user_id: number;
  student_name: string;
  alert_type: 'No recent activity' | 'Inactive for 3+ days' | 'Significant streak drop';
  priority: 'high' | 'medium' | 'low';
  last_activity_date: string;
  current_streak: number;
  best_streak: number;
}

export interface TeacherDashboardOverview {
  teacher: Teacher;
  classOverview: ClassOverview;
  students: ClassStudent[];
  classAnalytics: ClassAnalytics;
  studentProgress: StudentProgress[];
  classInsights: ClassInsights;
  recentActivities: ClassActivity[];
  alertsAndConcerns: StudentAlert[];
  timeframe: string;
}

// Student Detail View Types
export interface StudentDetailedView {
  overview: any; // Reuse from student dashboard types
  insights: any;
  goals: any;
  achievements: any;
  teacherNotes: TeacherNote[];
  detailedMetrics: StudentDetailedMetrics;
}

export interface StudentDetailedMetrics {
  journal_entries: number;
  avg_journal_length: number;
  mood_variety: number;
  problem_sessions: number;
  completed_problems: number;
  avg_time_per_problem: number;
  active_journal_days: number;
  active_problem_days: number;
  achievements_earned: number;
  points_from_achievements: number;
}

// Intervention Management Types
export interface TeacherIntervention {
  id: number;
  teacher_id: number;
  student_id: number;
  category: 'academic' | 'behavioral' | 'emotional' | 'engagement' | 'social';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title?: string;
  description: string;
  action_plan?: string;
  target_date?: string;
  status: 'active' | 'in_progress' | 'completed' | 'cancelled';
  success_criteria?: string;
  resources_needed?: string[];
  parent_notification: boolean;
  admin_notification: boolean;
  follow_up_date?: string;
  outcome_notes?: string;
  effectiveness_rating?: number; // 1-5
  created_at: string;
  updated_at: string;
  completed_at?: string;
  student_name?: string;
  grade_level?: number;
}

export interface CreateInterventionRequest {
  studentId: number;
  category: TeacherIntervention['category'];
  priority?: TeacherIntervention['priority'];
  title?: string;
  description: string;
  actionPlan?: string;
  targetDate?: string;
  successCriteria?: string;
  resourcesNeeded?: string[];
  parentNotification?: boolean;
  adminNotification?: boolean;
}

export interface UpdateInterventionRequest {
  title?: string;
  description?: string;
  action_plan?: string;
  target_date?: string;
  status?: TeacherIntervention['status'];
  success_criteria?: string;
  resources_needed?: string[];
  parent_notification?: boolean;
  admin_notification?: boolean;
  follow_up_date?: string;
  outcome_notes?: string;
  effectiveness_rating?: number;
}

// Teacher Notes Types
export interface TeacherNote {
  id: number;
  teacher_id: number;
  student_id: number;
  note_content: string;
  category: 'general' | 'academic' | 'behavioral' | 'parent_contact' | 'achievement';
  is_private: boolean;
  is_shared_with_parents: boolean;
  is_shared_with_admin: boolean;
  tags?: string[];
  related_intervention_id?: number;
  follow_up_required: boolean;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
  teacher_name?: string;
}

export interface CreateNoteRequest {
  note: string;
  category?: TeacherNote['category'];
  isPrivate?: boolean;
  isSharedWithParents?: boolean;
  isSharedWithAdmin?: boolean;
  tags?: string[];
  relatedInterventionId?: number;
  followUpRequired?: boolean;
  followUpDate?: string;
}

// Analytics and Patterns Types
export interface DetailedClassAnalytics {
  metrics: AnalyticsMetric[];
  charts: AnalyticsChart[];
  trends: {
    overall: 'improving' | 'stable' | 'declining';
    categories: Record<string, 'improving' | 'stable' | 'declining'>;
  };
  comparisons: {
    previousPeriod: number;
    classAverage: number;
    schoolAverage?: number;
  };
}

export interface AnalyticsMetric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  description: string;
}

export interface AnalyticsChart {
  type: 'line' | 'bar' | 'radar' | 'pie' | 'scatter';
  title: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
      fill?: boolean;
    }[];
  };
  options?: Record<string, any>;
}

export interface ClassPatterns {
  patterns: LearningPattern[];
  insights: PatternInsight[];
  recommendations: InterventionRecommendation[];
}

export interface LearningPattern {
  type: 'learning_style' | 'performance_pattern' | 'engagement_pattern' | 'temporal_pattern';
  title: string;
  description: string;
  affectedStudents: string[];
  confidence: number;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface PatternInsight {
  category: string;
  title: string;
  description: string;
  evidence: string[];
  implications: string[];
  studentCount: number;
}

export interface InterventionRecommendation {
  type: 'individual' | 'group' | 'class_wide';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  targetStudents: number[];
  suggestedActions: string[];
  expectedOutcome: string;
  estimatedTimeframe: string;
  resourcesRequired: string[];
}

// Reports Types
export interface ClassReport {
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  generatedAt: string;
  timeframe: string;
  summary: ClassAnalytics;
  studentDetails?: StudentProgress[] | null;
  insights: ClassInsights;
  recommendations?: RecommendationItem[] | null;
}

// Teacher Dashboard Preferences Types
export interface TeacherDashboardPreferences {
  id: number;
  teacher_id: number;
  default_timeframe: '7d' | '30d' | '90d' | 'all';
  default_view: 'overview' | 'individual' | 'analytics';
  widget_layout?: DashboardWidget[];
  notification_settings: {
    student_alerts: boolean;
    weekly_reports: boolean;
    intervention_reminders: boolean;
    parent_communication: boolean;
  };
  alert_thresholds: {
    streak_drop_threshold: number;
    inactivity_days: number;
    performance_drop_threshold: number;
  };
  auto_generate_reports: boolean;
  report_frequency: 'daily' | 'weekly' | 'monthly';
  theme: 'light' | 'dark' | 'auto';
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  type: 'overview' | 'students' | 'analytics' | 'alerts' | 'activities' | 'interventions';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number; w: number; h: number };
  visible: boolean;
  settings: Record<string, any>;
}

// API Client Interface
export interface TeacherDashboardApiClient {
  // Overview and Analytics
  getOverview: (timeframe?: string) => Promise<TeacherDashboardOverview>;
  getClassAnalytics: (timeframe?: string, metric?: string) => Promise<DetailedClassAnalytics>;
  getClassPatterns: (timeframe?: string, analysisType?: string) => Promise<ClassPatterns>;
  
  // Student Management
  getStudentDetail: (studentId: number, timeframe?: string) => Promise<StudentDetailedView>;
  getStudentList: () => Promise<ClassStudent[]>;
  
  // Interventions
  getInterventions: (priority?: string, category?: string) => Promise<TeacherIntervention[]>;
  createIntervention: (intervention: CreateInterventionRequest) => Promise<{ intervention: TeacherIntervention; message: string }>;
  updateIntervention: (interventionId: number, updates: UpdateInterventionRequest) => Promise<{ intervention: TeacherIntervention; message: string }>;
  
  // Notes
  addStudentNote: (studentId: number, note: CreateNoteRequest) => Promise<{ note: TeacherNote; message: string }>;
  getStudentNotes: (studentId: number) => Promise<TeacherNote[]>;
  
  // Reports
  generateReport: (reportType?: string, format?: string, timeframe?: string) => Promise<ClassReport>;
  
  // Preferences
  getPreferences: () => Promise<TeacherDashboardPreferences>;
  updatePreferences: (preferences: Partial<TeacherDashboardPreferences>) => Promise<{ message: string }>;
}

// Component Props Types
export interface TeacherDashboardProps {
  teacherId: number;
  initialTimeframe?: string;
}

export interface ClassOverviewProps {
  overview: TeacherDashboardOverview;
  onTimeframeChange: (timeframe: string) => void;
  onStudentSelect: (studentId: number) => void;
}

export interface StudentListProps {
  students: ClassStudent[];
  alerts: StudentAlert[];
  onStudentSelect: (studentId: number) => void;
  onCreateIntervention: (studentId: number) => void;
}

export interface ClassAnalyticsProps {
  analytics: DetailedClassAnalytics;
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
}

export interface InterventionsWidgetProps {
  interventions: TeacherIntervention[];
  onCreateIntervention: (intervention: CreateInterventionRequest) => void;
  onUpdateIntervention: (interventionId: number, updates: UpdateInterventionRequest) => void;
}

export interface StudentDetailProps {
  studentId: number;
  studentData: StudentDetailedView;
  onAddNote: (note: CreateNoteRequest) => void;
  onCreateIntervention: (intervention: CreateInterventionRequest) => void;
  onClose: () => void;
}

export interface AlertsWidgetProps {
  alerts: StudentAlert[];
  onStudentSelect: (studentId: number) => void;
  onCreateIntervention: (studentId: number) => void;
  onDismissAlert: (studentId: number) => void;
}

// Utility Types
export type InterventionCategory = TeacherIntervention['category'];
export type InterventionPriority = TeacherIntervention['priority'];
export type InterventionStatus = TeacherIntervention['status'];
export type NoteCategory = TeacherNote['category'];

export interface InterventionCategoryOption {
  value: InterventionCategory;
  label: string;
  icon: string;
  color: string;
}

export interface InterventionPriorityOption {
  value: InterventionPriority;
  label: string;
  color: string;
  urgency: number;
}

// Dashboard State Management
export interface TeacherDashboardState {
  overview: TeacherDashboardOverview | null;
  selectedStudentId: number | null;
  studentDetail: StudentDetailedView | null;
  classAnalytics: DetailedClassAnalytics | null;
  interventions: TeacherIntervention[];
  classPatterns: ClassPatterns | null;
  preferences: TeacherDashboardPreferences | null;
  loading: {
    overview: boolean;
    studentDetail: boolean;
    analytics: boolean;
    interventions: boolean;
    patterns: boolean;
  };
  errors: {
    overview: string | null;
    studentDetail: string | null;
    analytics: string | null;
    interventions: string | null;
    patterns: string | null;
  };
  currentTimeframe: string;
  activeView: 'overview' | 'analytics' | 'students' | 'interventions' | 'reports';
}

export interface TeacherDashboardActions {
  setTimeframe: (timeframe: string) => void;
  setActiveView: (view: TeacherDashboardState['activeView']) => void;
  selectStudent: (studentId: number | null) => void;
  refreshOverview: () => Promise<void>;
  refreshStudentDetail: (studentId: number) => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  refreshInterventions: () => Promise<void>;
  createIntervention: (intervention: CreateInterventionRequest) => Promise<void>;
  updateIntervention: (interventionId: number, updates: UpdateInterventionRequest) => Promise<void>;
  addStudentNote: (studentId: number, note: CreateNoteRequest) => Promise<void>;
  generateReport: (options: any) => Promise<ClassReport>;
  clearError: (section: keyof TeacherDashboardState['errors']) => void;
} 