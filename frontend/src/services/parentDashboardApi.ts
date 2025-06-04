import {
  ParentDashboardOverview,
  ChildDetailedView,
  WeeklySummary,
  EngagementMetrics,
  TeacherCommunication,
  CreateCommunicationRequest,
  CommunicationTemplate,
  LearningTipsResponse,
  LearningResource,
  FamilyGoal,
  CreateFamilyGoalRequest,
  FamilyGoalActivity,
  ParentDashboardPreferences,
  ParentDashboardApiClient,
  EngagementLevel,
  Child,
  ChildProgress
} from '../types/parentDashboard';

const API_BASE_URL = '/api/dashboard';

class ParentDashboardApiService implements ParentDashboardApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Overview and Analytics
  async getOverview(timeframe: string = '7d'): Promise<ParentDashboardOverview> {
    const params = new URLSearchParams({ timeframe });
    return this.request<ParentDashboardOverview>(`/parent/overview?${params}`);
  }

  async getChildDetail(childId: number, timeframe: string = '30d'): Promise<ChildDetailedView> {
    const params = new URLSearchParams({ timeframe });
    return this.request<ChildDetailedView>(`/parent/child/${childId}?${params}`);
  }

  async getWeeklySummary(weekOffset: number = 0): Promise<WeeklySummary> {
    const params = new URLSearchParams({ weekOffset: weekOffset.toString() });
    return this.request<WeeklySummary>(`/parent/weekly-summary?${params}`);
  }

  async getEngagementMetrics(timeframe: string = '30d', childId?: number): Promise<EngagementMetrics> {
    const params = new URLSearchParams({ timeframe });
    if (childId) params.append('childId', childId.toString());
    
    return this.request<EngagementMetrics>(`/parent/engagement-metrics?${params}`);
  }

  // Communication
  async getTeacherCommunications(
    limit: number = 20, 
    offset: number = 0, 
    childId?: number
  ): Promise<{ communications: TeacherCommunication[]; pagination: any }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    if (childId) params.append('childId', childId.toString());
    
    return this.request<{ communications: TeacherCommunication[]; pagination: any }>(
      `/parent/teacher-communications?${params}`
    );
  }

  async sendCommunication(communication: CreateCommunicationRequest): Promise<{ communication: TeacherCommunication; message: string }> {
    return this.request<{ communication: TeacherCommunication; message: string }>('/parent/communication', {
      method: 'POST',
      body: JSON.stringify(communication),
    });
  }

  async getCommunicationTemplates(): Promise<CommunicationTemplate[]> {
    // This would be implemented when templates backend is added
    return [
      {
        id: 1,
        template_type: 'teacher_inquiry',
        subject_template: 'Question about {child_name}\'s {subject} progress',
        content_template: 'Dear {teacher_name},\n\nI hope this message finds you well. I wanted to reach out regarding {child_name}\'s progress in {subject}.\n\n{inquiry_details}\n\nI would appreciate any insights you might have about how I can better support {child_name}\'s learning at home.\n\nThank you for your time and dedication to {child_name}\'s education.\n\nBest regards,\n{parent_name}',
        variables: { child_name: 'text', teacher_name: 'text', subject: 'text', inquiry_details: 'textarea', parent_name: 'text' },
        category: 'academic',
        tone: 'formal',
        is_default: true,
        usage_count: 0
      },
      {
        id: 2,
        template_type: 'achievement_celebration',
        subject_template: 'Celebrating {child_name}\'s recent achievement!',
        content_template: 'Dear {teacher_name},\n\nI wanted to share how excited our family is about {child_name}\'s recent {achievement_type}!\n\n{celebration_details}\n\nThank you for your role in supporting {child_name}\'s growth and success.\n\nWarm regards,\n{parent_name}',
        variables: { child_name: 'text', teacher_name: 'text', achievement_type: 'text', celebration_details: 'textarea', parent_name: 'text' },
        category: 'achievement',
        tone: 'celebratory',
        is_default: true,
        usage_count: 0
      }
    ];
  }

  // Learning Support
  async getLearningTips(childId?: number): Promise<LearningTipsResponse> {
    const params = new URLSearchParams();
    if (childId) params.append('childId', childId.toString());
    
    return this.request<LearningTipsResponse>(`/parent/learning-tips?${params}`);
  }

  async getLearningResources(category?: string, ageRange?: string): Promise<LearningResource[]> {
    // This would be implemented when resources backend is added
    return [
      {
        type: 'website',
        title: 'Khan Academy Kids',
        description: 'Free educational app for young learners',
        url: 'https://www.khanacademy.org/kids',
        category: 'learning_support',
        ageRange: '2-8',
        difficulty: 'easy',
        estimatedTime: '15-30 minutes',
        tags: ['math', 'reading', 'interactive'],
        rating: 5,
        cost: 'free'
      },
      {
        type: 'activity',
        title: 'Family Reading Time',
        description: 'Daily reading routine for the whole family',
        category: 'learning_support',
        ageRange: 'all',
        difficulty: 'easy',
        estimatedTime: '20-30 minutes',
        tags: ['reading', 'routine', 'family'],
        cost: 'free'
      }
    ];
  }

  // Family Goals
  async getFamilyGoals(): Promise<FamilyGoal[]> {
    // This would be implemented when family goals backend is added
    return [];
  }

  async createFamilyGoal(goal: CreateFamilyGoalRequest): Promise<{ goal: FamilyGoal; message: string }> {
    // This would be implemented when family goals backend is added
    const newGoal: FamilyGoal = {
      id: Date.now(), // Temporary ID
      parent_id: 1,
      title: goal.title,
      description: goal.description,
      goal_type: goal.goalType,
      target_children: goal.targetChildren,
      target_metrics: goal.targetMetrics,
      current_progress: {},
      start_date: new Date().toISOString().split('T')[0],
      target_date: goal.targetDate,
      status: 'active',
      priority: goal.priority || 'medium',
      reward_plan: goal.rewardPlan,
      parent_commitment: goal.parentCommitment,
      child_involvement: goal.childInvolvement,
      success_criteria: goal.successCriteria,
      weekly_check_ins: goal.weeklyCheckIns || true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return { goal: newGoal, message: 'Family goal created successfully' };
  }

  async updateFamilyGoal(goalId: number, updates: Partial<FamilyGoal>): Promise<{ goal: FamilyGoal; message: string }> {
    // This would be implemented when family goals backend is added
    const updatedGoal = { ...updates, id: goalId, updated_at: new Date().toISOString() } as FamilyGoal;
    return { goal: updatedGoal, message: 'Family goal updated successfully' };
  }

  async addGoalActivity(goalId: number, activity: Partial<FamilyGoalActivity>): Promise<{ activity: FamilyGoalActivity; message: string }> {
    // This would be implemented when family goals backend is added
    const newActivity: FamilyGoalActivity = {
      id: Date.now(),
      goal_id: goalId,
      activity_date: activity.activity_date || new Date().toISOString().split('T')[0],
      activity_type: activity.activity_type || 'progress_update',
      description: activity.description || '',
      participants: activity.participants || [],
      outcome: activity.outcome || 'neutral',
      notes: activity.notes,
      attachments: activity.attachments,
      logged_by: activity.logged_by || 1,
      created_at: new Date().toISOString()
    };

    return { activity: newActivity, message: 'Goal activity added successfully' };
  }

  // Preferences
  async getPreferences(): Promise<ParentDashboardPreferences> {
    // This would be implemented when preferences backend is added
    return {
      id: 1,
      parent_id: 1,
      default_timeframe: '7d',
      default_child_view: 'overview',
      summary_frequency: 'weekly',
      report_format: 'summary',
      notification_settings: {
        weekly_summaries: true,
        achievement_notifications: true,
        teacher_communications: true,
        goal_deadlines: true,
        engagement_alerts: false,
        progress_milestones: true
      },
      communication_preferences: {
        teacher_response_expectation: '24_hours',
        preferred_contact_times: ['morning', 'evening'],
        communication_style: 'detailed'
      },
      learning_support_preferences: {
        tip_categories: ['academic', 'emotional', 'social'],
        tip_frequency: 'weekly',
        resource_types: ['articles', 'activities', 'videos']
      },
      privacy_settings: {
        share_with_child: false,
        share_achievement_celebrations: true,
        share_progress_with_family: false
      },
      theme: 'family',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  async updatePreferences(preferences: Partial<ParentDashboardPreferences>): Promise<{ message: string }> {
    return this.request<{ message: string }>('/parent/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  // Utility methods for data formatting and display
  formatChildName(child: { first_name: string; last_name: string }): string {
    return `${child.first_name} ${child.last_name}`;
  }

  formatGradeLevel(gradeLevel: number): string {
    if (gradeLevel <= 0) return 'Pre-K';
    if (gradeLevel <= 5) return `${gradeLevel}th Grade`;
    if (gradeLevel === 6) return '6th Grade';
    if (gradeLevel === 7) return '7th Grade';
    if (gradeLevel === 8) return '8th Grade';
    if (gradeLevel === 9) return '9th Grade (Freshman)';
    if (gradeLevel === 10) return '10th Grade (Sophomore)';
    if (gradeLevel === 11) return '11th Grade (Junior)';
    if (gradeLevel === 12) return '12th Grade (Senior)';
    return `Grade ${gradeLevel}`;
  }

  getEngagementLevel(streak: number, lastActivity: string): EngagementLevel {
    const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceActivity > 7) return 'needs_attention';
    if (daysSinceActivity > 3) return 'fair';
    if (streak >= 7) return 'excellent';
    if (streak >= 3) return 'good';
    return 'fair';
  }

  getEngagementColor(level: EngagementLevel): string {
    const colors = {
      excellent: '#4CAF50',
      good: '#8BC34A',
      fair: '#FF9800',
      needs_attention: '#F44336'
    };
    return colors[level];
  }

  getEngagementIcon(level: EngagementLevel): string {
    const icons = {
      excellent: '🌟',
      good: '👍',
      fair: '📈',
      needs_attention: '💙'
    };
    return icons[level];
  }

  getEngagementMessage(level: EngagementLevel): string {
    const messages = {
      excellent: 'Fantastic! Your child is highly engaged with learning.',
      good: 'Great work! Your child is consistently engaged.',
      fair: 'Your child is making progress. Consider additional encouragement.',
      needs_attention: 'Your child may need extra support and motivation.'
    };
    return messages[level];
  }

  formatRelationshipType(type: string): string {
    const typeMap: Record<string, string> = {
      mother: 'Mother',
      father: 'Father',
      guardian: 'Guardian',
      stepparent: 'Step-parent',
      grandparent: 'Grandparent',
      caregiver: 'Caregiver',
      parent: 'Parent'
    };
    return typeMap[type] || type;
  }

  getCommunicationIcon(type: string): string {
    const iconMap: Record<string, string> = {
      email: '📧',
      phone: '📞',
      in_person: '👥',
      message: '💬',
      report: '📋'
    };
    return iconMap[type] || '💬';
  }

  getCommunicationStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      draft: '#757575',
      sent: '#2196F3',
      delivered: '#4CAF50',
      read: '#FF9800',
      replied: '#9C27B0'
    };
    return colorMap[status] || '#757575';
  }

  getImportanceColor(importance: string): string {
    const colorMap: Record<string, string> = {
      low: '#4CAF50',
      normal: '#2196F3',
      high: '#FF9800',
      urgent: '#F44336'
    };
    return colorMap[importance] || '#2196F3';
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

  formatWeekPeriod(weekStart: string, weekEnd: string): string {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()}-${end.getDate()}`;
    }
    
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
  }

  getFamilyEngagementSummary(overview: ParentDashboardOverview): {
    level: EngagementLevel;
    message: string;
    score: number;
  } {
    const { familyOverview, children } = overview;
    const engagementRate = familyOverview.totalChildren > 0 
      ? (familyOverview.activeChildren / familyOverview.totalChildren) * 100 
      : 0;
    
    let level: EngagementLevel;
    if (engagementRate >= 80) level = 'excellent';
    else if (engagementRate >= 60) level = 'good';
    else if (engagementRate >= 40) level = 'fair';
    else level = 'needs_attention';

    const message = this.generateFamilyMessage(overview);

    return {
      level,
      message,
      score: Math.round(engagementRate)
    };
  }

  generateFamilyMessage(overview: ParentDashboardOverview): string {
    const { familyOverview, children } = overview;
    
    if (familyOverview.totalChildren === 1) {
      const child = children[0];
      const level = this.getEngagementLevel(child.current_streak, child.last_activity_date);
      return `${child.first_name} ${this.getEngagementMessage(level).toLowerCase()}`;
    }
    
    const engagement = this.getFamilyEngagementSummary(overview);
    let message = `Your family of ${familyOverview.totalChildren} children `;
    
    if (engagement.level === 'excellent') {
      message += 'is thriving! All children are actively engaged in learning. 🌟';
    } else if (engagement.level === 'good') {
      message += 'is doing well! Most children are engaged in their learning journey. 👍';
    } else if (engagement.level === 'fair') {
      message += 'is making progress. Some children might benefit from additional encouragement. 📈';
    } else {
      message += 'may need extra support. Consider reaching out to teachers for guidance. 💙';
    }
    
    return message;
  }

  getStreakMessage(averageStreak: number): string {
    if (averageStreak >= 14) return 'Outstanding family learning consistency! 🔥';
    if (averageStreak >= 7) return 'Great family learning habits are forming! 💪';
    if (averageStreak >= 3) return 'Your family is building good momentum! 🌱';
    if (averageStreak >= 1) return 'Encourage daily learning routines for better results! 📅';
    return 'Let\'s work together to establish daily learning habits! 🎯';
  }

  getPerformanceMessage(childrenProgress: ChildProgress[]): string {
    if (childrenProgress.length === 0) return 'Keep track of your children\'s progress here! 📊';
    
    const avgPerformance = childrenProgress.reduce((acc, child) => acc + child.avg_performance, 0) / childrenProgress.length;
    
    if (avgPerformance >= 4) return 'Excellent family academic performance! 🌟';
    if (avgPerformance >= 3.5) return 'Strong family progress with room to grow! 📈';
    if (avgPerformance >= 3) return 'Steady family progress - keep supporting at home! 🎯';
    if (avgPerformance >= 2.5) return 'Consider additional home learning support! ⚠️';
    return 'Your children may benefit from extra learning support! 🆘';
  }

  generateWeeklyCelebrations(summary: WeeklySummary): string[] {
    const celebrations: string[] = [];
    
    // Check for achievements
    const totalAchievements = summary.familyTotals.totalAchievements;
    if (totalAchievements > 0) {
      celebrations.push(`🏆 ${totalAchievements} new achievement${totalAchievements > 1 ? 's' : ''} this week!`);
    }
    
    // Check for consistent learners
    const consistentLearners = summary.childrenSummaries.filter(child => 
      child.engagementLevel === 'excellent' || child.engagementLevel === 'good'
    );
    if (consistentLearners.length > 0) {
      celebrations.push(`⭐ ${consistentLearners.length} child${consistentLearners.length > 1 ? 'ren' : ''} maintaining great learning habits!`);
    }
    
    // Check for high activity
    const totalActivities = summary.familyTotals.totalJournalEntries + summary.familyTotals.totalProblemSessions;
    if (totalActivities > 10) {
      celebrations.push(`🎯 ${totalActivities} learning activities completed as a family!`);
    }
    
    return celebrations;
  }

  generateWeeklySupport(summary: WeeklySummary): string[] {
    const support: string[] = [];
    
    // Check for children needing attention
    const needsAttention = summary.childrenSummaries.filter(child => 
      child.engagementLevel === 'needs_attention'
    );
    if (needsAttention.length > 0) {
      support.push(`💙 ${needsAttention.map(c => c.child_name.split(' ')[0]).join(' and ')} may need extra encouragement this week.`);
    }
    
    // Check for low activity
    const lowActivity = summary.childrenSummaries.filter(child => 
      child.journal_entries + child.problem_sessions < 2
    );
    if (lowActivity.length > 0) {
      support.push(`📚 Consider setting up daily learning time with ${lowActivity.map(c => c.child_name.split(' ')[0]).join(' and ')}.`);
    }
    
    return support;
  }

  // Goal type helpers
  getGoalTypeIcon(goalType: string): string {
    const iconMap: Record<string, string> = {
      learning_routine: '📅',
      screen_time: '📱',
      family_learning: '👨‍👩‍👧‍👦',
      reading_together: '📚',
      homework_support: '✏️'
    };
    return iconMap[goalType] || '🎯';
  }

  getGoalTypeColor(goalType: string): string {
    const colorMap: Record<string, string> = {
      learning_routine: '#4CAF50',
      screen_time: '#FF9800',
      family_learning: '#2196F3',
      reading_together: '#9C27B0',
      homework_support: '#607D8B'
    };
    return colorMap[goalType] || '#757575';
  }

  formatGoalType(goalType: string): string {
    const typeMap: Record<string, string> = {
      learning_routine: 'Learning Routine',
      screen_time: 'Screen Time Management',
      family_learning: 'Family Learning',
      reading_together: 'Reading Together',
      homework_support: 'Homework Support'
    };
    return typeMap[goalType] || goalType;
  }

  getGoalStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      active: '#4CAF50',
      completed: '#2196F3',
      paused: '#FF9800',
      abandoned: '#F44336'
    };
    return colorMap[status] || '#757575';
  }

  calculateGoalProgress(goal: FamilyGoal): number {
    // This would calculate progress based on target metrics
    // For now, return a placeholder
    return Math.random() * 100;
  }

  // Chart data generation helpers
  generateFamilyEngagementChart(childrenProgress: ChildProgress[]): any {
    const labels = childrenProgress.map(child => child.first_name);
    const streakData = childrenProgress.map(child => child.current_streak);
    const activityData = childrenProgress.map(child => child.journal_entries + child.problem_sessions);

    return {
      type: 'bar',
      title: 'Family Learning Engagement',
      data: {
        labels,
        datasets: [
          {
            label: 'Learning Streak (days)',
            data: streakData,
            backgroundColor: '#4CAF50',
          },
          {
            label: 'Weekly Activities',
            data: activityData,
            backgroundColor: '#2196F3',
          }
        ]
      }
    };
  }

  generateWeeklyTrendChart(weeklySummaries: WeeklySummary[]): any {
    const labels = weeklySummaries.map(week => this.formatWeekPeriod(week.weekPeriod.start, week.weekPeriod.end));
    const activityData = weeklySummaries.map(week => 
      week.familyTotals.totalJournalEntries + week.familyTotals.totalProblemSessions
    );
    const achievementData = weeklySummaries.map(week => week.familyTotals.totalAchievements);

    return {
      type: 'line',
      title: 'Family Learning Trends',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Activities',
            data: activityData,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            fill: true,
          },
          {
            label: 'Achievements',
            data: achievementData,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            fill: true,
          }
        ]
      }
    };
  }

  // Learning tips helpers
  categorizeTips(tips: any[]): Record<string, any[]> {
    return tips.reduce((acc, tip) => {
      if (!acc[tip.category]) acc[tip.category] = [];
      acc[tip.category].push(tip);
      return acc;
    }, {} as Record<string, any[]>);
  }

  getPriorityTips(tips: any[]): any[] {
    return tips
      .filter(tip => tip.priority === 'high')
      .slice(0, 3);
  }

  getAgeAppropriateTips(tips: any[], childAge: number): any[] {
    return tips.filter(tip => {
      if (!tip.ageRange) return true;
      // Simple age range checking logic
      return true; // Placeholder
    });
  }
}

// Create and export singleton instance
export const parentDashboardApi = new ParentDashboardApiService();
export default parentDashboardApi; 