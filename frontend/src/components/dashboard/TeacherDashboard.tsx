import React, { useState, useEffect, useCallback } from 'react';
import {
  TeacherDashboardOverview,
  TeacherIntervention,
  CreateInterventionRequest,
  UpdateInterventionRequest,
  CreateNoteRequest,
  StudentDetailedView,
  TeacherDashboardProps
} from '../../types/teacherDashboard';
import { teacherDashboardApi } from '../../services/teacherDashboardApi';
import './TeacherDashboard.css';

// Sub-components (to be implemented)
// import ClassOverview from './ClassOverview';
// import StudentList from './StudentList';
// import ClassAnalytics from './ClassAnalytics';
// import InterventionsWidget from './InterventionsWidget';
// import StudentDetail from './StudentDetail';
// import AlertsWidget from './AlertsWidget';

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacherId,
  initialTimeframe = '30d'
}) => {
  // State management
  const [overview, setOverview] = useState<TeacherDashboardOverview | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetailedView | null>(null);
  const [classAnalytics, setClassAnalytics] = useState<any>(null);
  const [interventions, setInterventions] = useState<TeacherIntervention[]>([]);
  const [timeframe, setTimeframe] = useState(initialTimeframe);

  const [loading, setLoading] = useState({
    overview: true,
    studentDetail: false,
    analytics: true,
    interventions: true,
    patterns: false
  });

  const [errors, setErrors] = useState({
    overview: null as string | null,
    studentDetail: null as string | null,
    analytics: null as string | null,
    interventions: null as string | null,
    patterns: null as string | null
  });

  const [activeView, setActiveView] = useState<'overview' | 'analytics' | 'students' | 'interventions' | 'reports'>('overview');

  // Data fetching functions
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, overview: true }));
      setErrors(prev => ({ ...prev, overview: null }));

      const data = await teacherDashboardApi.getOverview(timeframe);
      setOverview(data);
    } catch (error) {
      console.error('Error fetching teacher overview:', error);
      setErrors(prev => ({ ...prev, overview: error instanceof Error ? error.message : 'Failed to load overview' }));
    } finally {
      setLoading(prev => ({ ...prev, overview: false }));
    }
  }, [timeframe]);

  const fetchClassAnalytics = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, analytics: true }));
      setErrors(prev => ({ ...prev, analytics: null }));

      const data = await teacherDashboardApi.getClassAnalytics(timeframe);
      setClassAnalytics(data);
    } catch (error) {
      console.error('Error fetching class analytics:', error);
      setErrors(prev => ({ ...prev, analytics: error instanceof Error ? error.message : 'Failed to load analytics' }));
    } finally {
      setLoading(prev => ({ ...prev, analytics: false }));
    }
  }, [timeframe]);

  const fetchInterventions = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, interventions: true }));
      setErrors(prev => ({ ...prev, interventions: null }));

      const data = await teacherDashboardApi.getInterventions();
      setInterventions(data);
    } catch (error) {
      console.error('Error fetching interventions:', error);
      setErrors(prev => ({ ...prev, interventions: error instanceof Error ? error.message : 'Failed to load interventions' }));
    } finally {
      setLoading(prev => ({ ...prev, interventions: false }));
    }
  }, []);

  const fetchStudentDetail = useCallback(async (studentId: number) => {
    try {
      setLoading(prev => ({ ...prev, studentDetail: true }));
      setErrors(prev => ({ ...prev, studentDetail: null }));

      const data = await teacherDashboardApi.getStudentDetail(studentId, timeframe);
      setStudentDetail(data);
    } catch (error) {
      console.error('Error fetching student detail:', error);
      setErrors(prev => ({ ...prev, studentDetail: error instanceof Error ? error.message : 'Failed to load student details' }));
    } finally {
      setLoading(prev => ({ ...prev, studentDetail: false }));
    }
  }, [timeframe]);

  // Event handlers
  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    setTimeframe(newTimeframe);
  }, []);

  const handleStudentSelect = useCallback((studentId: number | null) => {
    setSelectedStudentId(studentId);
    if (studentId) {
      fetchStudentDetail(studentId);
    } else {
      setStudentDetail(null);
    }
  }, [fetchStudentDetail]);

  const handleCreateIntervention = useCallback(async (intervention: CreateInterventionRequest) => {
    try {
      await teacherDashboardApi.createIntervention(intervention);
      await fetchInterventions();
      await fetchOverview(); // Refresh overview to update alerts
    } catch (error) {
      console.error('Error creating intervention:', error);
      // You might want to show a toast notification here
    }
  }, [fetchInterventions, fetchOverview]);

  const handleUpdateIntervention = useCallback(async (interventionId: number, updates: UpdateInterventionRequest) => {
    try {
      await teacherDashboardApi.updateIntervention(interventionId, updates);
      await fetchInterventions();
    } catch (error) {
      console.error('Error updating intervention:', error);
      // You might want to show a toast notification here
    }
  }, [fetchInterventions]);

  const handleAddStudentNote = useCallback(async (studentId: number, note: CreateNoteRequest) => {
    try {
      await teacherDashboardApi.addStudentNote(studentId, note);
      if (selectedStudentId === studentId) {
        await fetchStudentDetail(studentId);
      }
    } catch (error) {
      console.error('Error adding student note:', error);
      // You might want to show a toast notification here
    }
  }, [selectedStudentId, fetchStudentDetail]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchOverview(),
      fetchClassAnalytics(),
      fetchInterventions()
    ]);
  }, [fetchOverview, fetchClassAnalytics, fetchInterventions]);

  const handleGenerateReport = useCallback(async () => {
    try {
      const report = await teacherDashboardApi.generateReport('weekly', 'summary', timeframe);
      console.log('Generated report:', report);
      // You might want to show the report in a modal or download it
    } catch (error) {
      console.error('Error generating report:', error);
    }
  }, [timeframe]);

  // Effects
  useEffect(() => {
    fetchOverview();
    fetchClassAnalytics();
  }, [fetchOverview, fetchClassAnalytics]);

  useEffect(() => {
    fetchInterventions();
  }, [fetchInterventions]);

  // Loading state
  const isLoading = Object.values(loading).some(Boolean);

  // Error state
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="teacher-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Teacher Dashboard 👩‍🏫</h1>
            <p className="dashboard-subtitle">
              {overview?.teacher 
                ? `Welcome, ${overview.teacher.name}! ${teacherDashboardApi.generateClassSummary(overview)}`
                : 'Loading your class dashboard...'
              }
            </p>
          </div>

          <div className="header-actions">
            <button 
              onClick={handleRefresh} 
              className="refresh-btn"
              disabled={isLoading}
            >
              🔄 Refresh
            </button>

            <button 
              onClick={handleGenerateReport} 
              className="report-btn"
            >
              📊 Generate Report
            </button>

            <select 
              value={timeframe} 
              onChange={(e) => handleTimeframeChange(e.target.value)}
              className="timeframe-selector"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {/* Class Summary Stats */}
        {overview && (
          <div className="class-stats">
            <div className="stat-item">
              <span className="stat-icon">👥</span>
              <div className="stat-content">
                <div className="stat-value">{overview.classOverview.totalStudents}</div>
                <div className="stat-label">Total Students</div>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">✅</span>
              <div className="stat-content">
                <div className="stat-value">{overview.classOverview.activeStudents}</div>
                <div className="stat-label">Active Students</div>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">🔥</span>
              <div className="stat-content">
                <div className="stat-value">{Math.round(overview.classOverview.averageStreak)}</div>
                <div className="stat-label">Avg. Streak</div>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">⚠️</span>
              <div className="stat-content">
                <div className="stat-value">{overview.alertsAndConcerns.length}</div>
                <div className="stat-label">Alerts</div>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">🎯</span>
              <div className="stat-content">
                <div className="stat-value">{interventions.filter(i => i.status === 'active').length}</div>
                <div className="stat-label">Active Interventions</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dashboard Navigation */}
      <div className="dashboard-nav">
        <button 
          className={`nav-tab ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          📊 Class Overview
        </button>
        <button 
          className={`nav-tab ${activeView === 'students' ? 'active' : ''}`}
          onClick={() => setActiveView('students')}
        >
          👥 Students
        </button>
        <button 
          className={`nav-tab ${activeView === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveView('analytics')}
        >
          📈 Analytics
        </button>
        <button 
          className={`nav-tab ${activeView === 'interventions' ? 'active' : ''}`}
          onClick={() => setActiveView('interventions')}
        >
          🎯 Interventions
        </button>
        <button 
          className={`nav-tab ${activeView === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveView('reports')}
        >
          📋 Reports
        </button>
      </div>

      {/* Error Display */}
      {hasErrors && (
        <div className="dashboard-errors">
          {Object.entries(errors).map(([key, error]) => 
            error && (
              <div key={key} className="error-message">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
                <button 
                  onClick={() => setErrors(prev => ({ ...prev, [key]: null }))}
                  className="dismiss-error"
                >
                  ✕
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {/* Class Overview Tab */}
        {activeView === 'overview' && (
          <div className="overview-tab">
            {overview ? (
              <div className="overview-content">
                {/* Class Summary */}
                <div className="class-summary">
                  <h2>Class Summary</h2>
                  <div className="summary-cards">
                    <div className="summary-card engagement">
                      <h3>Class Engagement</h3>
                      <div className="engagement-stats">
                        <div className="engagement-score">
                          {teacherDashboardApi.calculateClassEngagement(overview).score}%
                        </div>
                        <div className="engagement-level">
                          {teacherDashboardApi.calculateClassEngagement(overview).level}
                        </div>
                      </div>
                      <p>{teacherDashboardApi.getStreakMessage(overview.classOverview.averageStreak)}</p>
                    </div>

                    <div className="summary-card activities">
                      <h3>Recent Activities</h3>
                      <div className="activity-stats">
                        <div>📝 {overview.classAnalytics.total_journal_entries} Journal Entries</div>
                        <div>🧮 {overview.classAnalytics.total_problem_sessions} Problem Sessions</div>
                      </div>
                    </div>

                    <div className="summary-card performance">
                      <h3>Class Performance</h3>
                      <div className="performance-stats">
                        <div className="avg-performance">
                          {overview.studentProgress.reduce((acc, s) => acc + s.avg_performance, 0) / overview.studentProgress.length || 0}
                        </div>
                        <p>{teacherDashboardApi.getPerformanceMessage(
                          overview.studentProgress.reduce((acc, s) => acc + s.avg_performance, 0) / overview.studentProgress.length || 0
                        )}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Alerts */}
                {overview.alertsAndConcerns.length > 0 && (
                  <div className="student-alerts">
                    <h2>Student Alerts</h2>
                    <div className="alerts-list">
                      {overview.alertsAndConcerns.map((alert, index) => (
                        <div key={index} className={`alert-item priority-${alert.priority}`}>
                          <span className="alert-icon">{teacherDashboardApi.getAlertIcon(alert.alert_type)}</span>
                          <div className="alert-content">
                            <h4>{alert.student_name}</h4>
                            <p>{alert.alert_type}</p>
                            <div className="alert-meta">
                              <span>Current streak: {alert.current_streak}</span>
                              <span>Last activity: {teacherDashboardApi.formatDate(alert.last_activity_date)}</span>
                            </div>
                          </div>
                          <div className="alert-actions">
                            <button 
                              onClick={() => handleStudentSelect(alert.user_id)}
                              className="view-student-btn"
                            >
                              View Student
                            </button>
                            <button 
                              onClick={() => handleCreateIntervention({
                                studentId: alert.user_id,
                                category: 'engagement',
                                priority: alert.priority as any,
                                description: `Address ${alert.alert_type.toLowerCase()} for ${alert.student_name}`,
                              })}
                              className="create-intervention-btn"
                            >
                              Create Intervention
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Class Activities */}
                {overview.recentActivities.length > 0 && (
                  <div className="recent-activities">
                    <h2>Recent Class Activities</h2>
                    <div className="activities-list">
                      {overview.recentActivities.map((activity, index) => (
                        <div key={index} className="activity-item">
                          <span className="activity-icon">
                            {activity.type === 'journal' ? '📝' : activity.type === 'problem' ? '🧮' : '🏆'}
                          </span>
                          <div className="activity-content">
                            <h4>{activity.title}</h4>
                            <p>by {activity.student_name}</p>
                            <div className="activity-meta">
                              <span>{teacherDashboardApi.formatDate(activity.created_at)}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleStudentSelect(activity.student_id)}
                            className="view-student-btn"
                          >
                            View Student
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : loading.overview ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading class overview...</p>
              </div>
            ) : (
              <div className="error-state">
                <span className="error-icon">😔</span>
                <p>Unable to load class overview</p>
                <button onClick={fetchOverview}>Try Again</button>
              </div>
            )}
          </div>
        )}

        {/* Students Tab - Placeholder */}
        {activeView === 'students' && (
          <div className="students-tab">
            <div className="students-content">
              <h2>👥 Student Management</h2>
              {overview ? (
                <div className="students-grid">
                  {overview.students.map((student) => {
                    const engagementLevel = teacherDashboardApi.formatEngagementLevel(
                      student.current_streak, 
                      student.last_activity_date
                    );
                    
                    return (
                      <div key={student.user_id} className="student-card">
                        <div className="student-header">
                          <h3>{teacherDashboardApi.formatStudentName(student)}</h3>
                          <span 
                            className="engagement-badge"
                            style={{ backgroundColor: teacherDashboardApi.getEngagementColor(engagementLevel) }}
                          >
                            {teacherDashboardApi.getEngagementIcon(engagementLevel)} {engagementLevel}
                          </span>
                        </div>
                        <div className="student-stats">
                          <div>Grade: {teacherDashboardApi.formatGradeLevel(student.grade_level)}</div>
                          <div>Streak: {student.current_streak} days</div>
                          <div>Points: {student.total_points}</div>
                          <div>Last Active: {teacherDashboardApi.formatDate(student.last_activity_date)}</div>
                        </div>
                        <div className="student-actions">
                          <button 
                            onClick={() => handleStudentSelect(student.user_id)}
                            className="view-detail-btn"
                          >
                            View Details
                          </button>
                          <button 
                            onClick={() => handleCreateIntervention({
                              studentId: student.user_id,
                              category: 'academic',
                              description: `Support for ${teacherDashboardApi.formatStudentName(student)}`,
                            })}
                            className="create-intervention-btn"
                          >
                            Create Intervention
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p>Loading students...</p>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab - Placeholder */}
        {activeView === 'analytics' && (
          <div className="analytics-tab">
            <div className="placeholder-content">
              <h2>📈 Class Analytics</h2>
              <p>Advanced analytics and pattern analysis coming soon...</p>
              <div className="placeholder-data">
                {classAnalytics ? (
                  <div>
                    <p>Analytics data loaded and ready for visualization</p>
                    <pre>{JSON.stringify(classAnalytics, null, 2)}</pre>
                  </div>
                ) : (
                  <p>Loading analytics data...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Interventions Tab - Placeholder */}
        {activeView === 'interventions' && (
          <div className="interventions-tab">
            <div className="interventions-content">
              <h2>🎯 Intervention Management</h2>
              {interventions.length > 0 ? (
                <div className="interventions-list">
                  {interventions.map((intervention) => (
                    <div key={intervention.id} className="intervention-card">
                      <div className="intervention-header">
                        <h3>{intervention.title || 'Untitled Intervention'}</h3>
                        <div className="intervention-badges">
                          <span 
                            className="priority-badge"
                            style={{ backgroundColor: teacherDashboardApi.getInterventionPriorityColor(intervention.priority) }}
                          >
                            {teacherDashboardApi.formatInterventionPriority(intervention.priority)}
                          </span>
                          <span 
                            className="category-badge"
                            style={{ backgroundColor: teacherDashboardApi.getInterventionCategoryColor(intervention.category) }}
                          >
                            {teacherDashboardApi.getInterventionCategoryIcon(intervention.category)} {teacherDashboardApi.formatInterventionCategory(intervention.category)}
                          </span>
                        </div>
                      </div>
                      <div className="intervention-content">
                        <p><strong>Student:</strong> {intervention.student_name}</p>
                        <p><strong>Description:</strong> {intervention.description}</p>
                        {intervention.action_plan && (
                          <p><strong>Action Plan:</strong> {intervention.action_plan}</p>
                        )}
                        <div className="intervention-meta">
                          <span>Status: {intervention.status}</span>
                          <span>Created: {teacherDashboardApi.formatDate(intervention.created_at)}</span>
                          {intervention.target_date && (
                            <span>Target: {teacherDashboardApi.formatRelativeDate(intervention.target_date)}</span>
                          )}
                        </div>
                      </div>
                      <div className="intervention-actions">
                        <button 
                          onClick={() => handleUpdateIntervention(intervention.id, { status: 'completed' })}
                          className="complete-btn"
                          disabled={intervention.status === 'completed'}
                        >
                          Mark Complete
                        </button>
                        <button 
                          onClick={() => handleStudentSelect(intervention.student_id)}
                          className="view-student-btn"
                        >
                          View Student
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No interventions created yet. Create one from the student alerts or individual student views.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports Tab - Placeholder */}
        {activeView === 'reports' && (
          <div className="reports-tab">
            <div className="placeholder-content">
              <h2>📋 Class Reports</h2>
              <p>Automated report generation and export functionality coming soon...</p>
              <button onClick={handleGenerateReport} className="generate-report-btn">
                Generate Weekly Report
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudentId && (
        <div className="student-detail-modal">
          <div className="modal-backdrop" onClick={() => handleStudentSelect(null)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Student Details</h2>
              <button 
                onClick={() => handleStudentSelect(null)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {loading.studentDetail ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading student details...</p>
                </div>
              ) : studentDetail ? (
                <div className="student-detail-content">
                  <p>Student detail view coming soon...</p>
                  <pre>{JSON.stringify(studentDetail, null, 2)}</pre>
                </div>
              ) : (
                <div className="error-state">
                  <p>Failed to load student details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="dashboard-footer">
        <p>Empowering educators with data-driven insights! 🌟 Help your students reach their full potential.</p>
      </div>
    </div>
  );
};

export default TeacherDashboard; 