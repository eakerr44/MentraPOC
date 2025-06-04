import {
  TeacherDashboardOverview,
  DetailedClassAnalytics,
  ClassPatterns,
  StudentDetailedView,
  ClassStudent,
  TeacherIntervention,
  CreateInterventionRequest,
  UpdateInterventionRequest,
  TeacherNote,
  CreateNoteRequest,
  ClassReport,
  TeacherDashboardPreferences,
  TeacherDashboardApiClient,
  InterventionCategory,
  InterventionPriority,
  NoteCategory
} from '../types/teacherDashboard';

const API_BASE_URL = '/api/dashboard';

class TeacherDashboardApiService implements TeacherDashboardApiClient {
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
  async getOverview(timeframe: string = '30d'): Promise<TeacherDashboardOverview> {
    const params = new URLSearchParams({ timeframe });
    return this.request<TeacherDashboardOverview>(`/teacher/overview?${params}`);
  }

  async getClassAnalytics(timeframe: string = '30d', metric?: string): Promise<DetailedClassAnalytics> {
    const params = new URLSearchParams({ timeframe });
    if (metric) params.append('metric', metric);
    
    return this.request<DetailedClassAnalytics>(`/teacher/class-analytics?${params}`);
  }

  async getClassPatterns(timeframe: string = '30d', analysisType?: string): Promise<ClassPatterns> {
    const params = new URLSearchParams({ timeframe });
    if (analysisType) params.append('type', analysisType);
    
    return this.request<ClassPatterns>(`/teacher/patterns?${params}`);
  }

  // Student Management
  async getStudentDetail(studentId: number, timeframe: string = '30d'): Promise<StudentDetailedView> {
    const params = new URLSearchParams({ timeframe });
    return this.request<StudentDetailedView>(`/teacher/student/${studentId}?${params}`);
  }

  async getStudentList(): Promise<ClassStudent[]> {
    const overview = await this.getOverview();
    return overview.students;
  }

  // Interventions
  async getInterventions(priority?: string, category?: string): Promise<TeacherIntervention[]> {
    const params = new URLSearchParams();
    if (priority) params.append('priority', priority);
    if (category) params.append('category', category);
    
    return this.request<TeacherIntervention[]>(`/teacher/interventions?${params}`);
  }

  async createIntervention(intervention: CreateInterventionRequest): Promise<{ intervention: TeacherIntervention; message: string }> {
    return this.request<{ intervention: TeacherIntervention; message: string }>('/teacher/interventions', {
      method: 'POST',
      body: JSON.stringify(intervention),
    });
  }

  async updateIntervention(interventionId: number, updates: UpdateInterventionRequest): Promise<{ intervention: TeacherIntervention; message: string }> {
    return this.request<{ intervention: TeacherIntervention; message: string }>(`/teacher/interventions/${interventionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Notes
  async addStudentNote(studentId: number, note: CreateNoteRequest): Promise<{ note: TeacherNote; message: string }> {
    return this.request<{ note: TeacherNote; message: string }>(`/teacher/student/${studentId}/notes`, {
      method: 'PUT',
      body: JSON.stringify(note),
    });
  }

  async getStudentNotes(studentId: number): Promise<TeacherNote[]> {
    const studentDetail = await this.getStudentDetail(studentId);
    return studentDetail.teacherNotes;
  }

  // Reports
  async generateReport(reportType: string = 'weekly', format: string = 'summary', timeframe: string = '7d'): Promise<ClassReport> {
    const params = new URLSearchParams({
      type: reportType,
      format: format,
      timeframe: timeframe,
    });
    
    return this.request<ClassReport>(`/teacher/reports?${params}`);
  }

  // Preferences (placeholder - would need backend implementation)
  async getPreferences(): Promise<TeacherDashboardPreferences> {
    // This would be implemented when teacher preferences backend is added
    return {
      id: 1,
      teacher_id: 1,
      default_timeframe: '30d',
      default_view: 'overview',
      notification_settings: {
        student_alerts: true,
        weekly_reports: true,
        intervention_reminders: true,
        parent_communication: false,
      },
      alert_thresholds: {
        streak_drop_threshold: 3,
        inactivity_days: 3,
        performance_drop_threshold: 20,
      },
      auto_generate_reports: true,
      report_frequency: 'weekly',
      theme: 'light',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async updatePreferences(preferences: Partial<TeacherDashboardPreferences>): Promise<{ message: string }> {
    // This would be implemented when teacher preferences backend is added
    return { message: 'Preferences updated successfully' };
  }

  // Utility methods for data formatting and display
  formatStudentName(student: { first_name: string; last_name: string }): string {
    return `${student.first_name} ${student.last_name}`;
  }

  formatGradeLevel(gradeLevel: number): string {
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

  formatEngagementLevel(streak: number, lastActivity: string): 'high' | 'medium' | 'low' | 'inactive' {
    const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceActivity > 7) return 'inactive';
    if (daysSinceActivity > 3) return 'low';
    if (streak >= 7) return 'high';
    if (streak >= 3) return 'medium';
    return 'low';
  }

  getEngagementColor(level: 'high' | 'medium' | 'low' | 'inactive'): string {
    const colors = {
      high: '#4CAF50',
      medium: '#FF9800',
      low: '#FFC107',
      inactive: '#F44336'
    };
    return colors[level];
  }

  getEngagementIcon(level: 'high' | 'medium' | 'low' | 'inactive'): string {
    const icons = {
      high: '🔥',
      medium: '⚡',
      low: '📉',
      inactive: '😴'
    };
    return icons[level];
  }

  formatInterventionCategory(category: InterventionCategory): string {
    const categoryMap: Record<InterventionCategory, string> = {
      academic: 'Academic Support',
      behavioral: 'Behavioral',
      emotional: 'Emotional Well-being',
      engagement: 'Student Engagement',
      social: 'Social Skills'
    };
    return categoryMap[category] || category;
  }

  getInterventionCategoryIcon(category: InterventionCategory): string {
    const iconMap: Record<InterventionCategory, string> = {
      academic: '📚',
      behavioral: '👥',
      emotional: '💙',
      engagement: '🎯',
      social: '🤝'
    };
    return iconMap[category] || '📋';
  }

  getInterventionCategoryColor(category: InterventionCategory): string {
    const colorMap: Record<InterventionCategory, string> = {
      academic: '#2196F3',
      behavioral: '#FF9800',
      emotional: '#9C27B0',
      engagement: '#4CAF50',
      social: '#607D8B'
    };
    return colorMap[category] || '#757575';
  }

  formatInterventionPriority(priority: InterventionPriority): string {
    const priorityMap: Record<InterventionPriority, string> = {
      low: 'Low Priority',
      medium: 'Medium Priority',
      high: 'High Priority',
      urgent: 'Urgent'
    };
    return priorityMap[priority] || priority;
  }

  getInterventionPriorityColor(priority: InterventionPriority): string {
    const colorMap: Record<InterventionPriority, string> = {
      low: '#4CAF50',
      medium: '#FF9800',
      high: '#F44336',
      urgent: '#9C27B0'
    };
    return colorMap[priority] || '#757575';
  }

  formatNoteCategory(category: NoteCategory): string {
    const categoryMap: Record<NoteCategory, string> = {
      general: 'General Note',
      academic: 'Academic',
      behavioral: 'Behavioral',
      parent_contact: 'Parent Contact',
      achievement: 'Achievement'
    };
    return categoryMap[category] || category;
  }

  getNoteCategoryIcon(category: NoteCategory): string {
    const iconMap: Record<NoteCategory, string> = {
      general: '📝',
      academic: '📚',
      behavioral: '👥',
      parent_contact: '📞',
      achievement: '🏆'
    };
    return iconMap[category] || '📋';
  }

  formatAlertPriority(priority: 'high' | 'medium' | 'low'): string {
    const priorityMap = {
      high: 'High Priority',
      medium: 'Medium Priority',
      low: 'Low Priority'
    };
    return priorityMap[priority];
  }

  getAlertPriorityColor(priority: 'high' | 'medium' | 'low'): string {
    const colorMap = {
      high: '#F44336',
      medium: '#FF9800',
      low: '#FFC107'
    };
    return colorMap[priority];
  }

  getAlertIcon(alertType: string): string {
    const iconMap: Record<string, string> = {
      'No recent activity': '😴',
      'Inactive for 3+ days': '📉',
      'Significant streak drop': '⚠️'
    };
    return iconMap[alertType] || '⚠️';
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

  calculateClassEngagement(overview: TeacherDashboardOverview): {
    score: number;
    level: 'excellent' | 'good' | 'needs_improvement' | 'poor';
    trend: 'improving' | 'stable' | 'declining';
  } {
    const { classOverview } = overview;
    const engagementRate = classOverview.totalStudents > 0 
      ? (classOverview.activeStudents / classOverview.totalStudents) * 100 
      : 0;
    
    let level: 'excellent' | 'good' | 'needs_improvement' | 'poor';
    if (engagementRate >= 80) level = 'excellent';
    else if (engagementRate >= 60) level = 'good';
    else if (engagementRate >= 40) level = 'needs_improvement';
    else level = 'poor';

    // Simplified trend calculation (would use historical data in real implementation)
    const trend: 'improving' | 'stable' | 'declining' = 'stable';

    return {
      score: Math.round(engagementRate),
      level,
      trend
    };
  }

  generateClassSummary(overview: TeacherDashboardOverview): string {
    const { classOverview, alertsAndConcerns } = overview;
    const engagement = this.calculateClassEngagement(overview);
    
    let summary = `Your class of ${classOverview.totalStudents} students `;
    
    if (engagement.level === 'excellent') {
      summary += 'is highly engaged and performing well. ';
    } else if (engagement.level === 'good') {
      summary += 'shows good engagement levels. ';
    } else {
      summary += 'could benefit from increased engagement strategies. ';
    }

    if (alertsAndConcerns.length > 0) {
      summary += `${alertsAndConcerns.length} student${alertsAndConcerns.length > 1 ? 's' : ''} may need attention.`;
    } else {
      summary += 'All students are maintaining good activity levels.';
    }

    return summary;
  }

  getPerformanceMessage(avgPerformance: number): string {
    if (avgPerformance >= 4) return 'Excellent performance across the class! 🌟';
    if (avgPerformance >= 3.5) return 'Strong performance with room for growth! 📈';
    if (avgPerformance >= 3) return 'Steady progress - consider additional support strategies. 🎯';
    if (avgPerformance >= 2.5) return 'Performance needs attention - intervention recommended. ⚠️';
    return 'Significant support needed - please review learning strategies. 🆘';
  }

  getStreakMessage(averageStreak: number): string {
    if (averageStreak >= 14) return 'Outstanding consistency! Students are highly motivated! 🔥';
    if (averageStreak >= 7) return 'Good learning habits are forming! 💪';
    if (averageStreak >= 3) return 'Students are building momentum! 🌱';
    if (averageStreak >= 1) return 'Encourage daily practice for better results! 📅';
    return 'Focus on establishing daily learning routines! 🎯';
  }

  // Chart data generation helpers
  generateEngagementChartData(studentProgress: any[]): any {
    const labels = studentProgress.map(s => `${s.first_name} ${s.last_name}`);
    const streakData = studentProgress.map(s => s.current_streak);
    const activityData = studentProgress.map(s => s.journal_entries + s.problem_sessions);

    return {
      type: 'bar',
      title: 'Student Engagement Overview',
      data: {
        labels,
        datasets: [
          {
            label: 'Current Streak',
            data: streakData,
            backgroundColor: '#4CAF50',
          },
          {
            label: 'Total Activities',
            data: activityData,
            backgroundColor: '#2196F3',
          }
        ]
      }
    };
  }

  generatePerformanceChartData(studentProgress: any[]): any {
    const labels = studentProgress.map(s => `${s.first_name} ${s.last_name}`);
    const performanceData = studentProgress.map(s => s.avg_performance);

    return {
      type: 'line',
      title: 'Academic Performance Trends',
      data: {
        labels,
        datasets: [
          {
            label: 'Average Performance',
            data: performanceData,
            borderColor: '#FF9800',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            fill: true,
          }
        ]
      }
    };
  }

  // Intervention suggestion helpers
  suggestInterventions(alert: any): CreateInterventionRequest[] {
    const suggestions: CreateInterventionRequest[] = [];

    if (alert.alert_type === 'No recent activity') {
      suggestions.push({
        studentId: alert.user_id,
        category: 'engagement',
        priority: 'high',
        title: 'Re-engage Inactive Student',
        description: `${alert.student_name} has not been active recently. Consider checking in personally and identifying barriers to participation.`,
        actionPlan: 'Schedule one-on-one meeting, review goals, provide encouragement',
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
      });
    }

    if (alert.alert_type === 'Significant streak drop') {
      suggestions.push({
        studentId: alert.user_id,
        category: 'engagement',
        priority: 'medium',
        title: 'Address Streak Decline',
        description: `${alert.student_name} has experienced a significant drop in learning streak. Help them rebuild momentum.`,
        actionPlan: 'Review recent challenges, adjust difficulty level, provide additional support',
      });
    }

    return suggestions;
  }
}

// Create and export singleton instance
export const teacherDashboardApi = new TeacherDashboardApiService();
export default teacherDashboardApi; 