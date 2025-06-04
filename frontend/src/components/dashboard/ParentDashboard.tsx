import React, { useState, useEffect, useCallback } from 'react';
import {
  ParentDashboardOverview,
  WeeklySummary,
  EngagementMetrics,
  TeacherCommunication,
  CreateCommunicationRequest,
  LearningTipsResponse,
  FamilyGoal,
  CreateFamilyGoalRequest,
  ChildDetailedView,
  ParentDashboardProps
} from '../../types/parentDashboard';
import { parentDashboardApi } from '../../services/parentDashboardApi';
import './ParentDashboard.css';

const ParentDashboard: React.FC<ParentDashboardProps> = ({
  parentId,
  initialTimeframe = '7d'
}) => {
  // State management
  const [overview, setOverview] = useState<ParentDashboardOverview | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [childDetail, setChildDetail] = useState<ChildDetailedView | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics | null>(null);
  const [communications, setCommunications] = useState<TeacherCommunication[]>([]);
  const [learningTips, setLearningTips] = useState<LearningTipsResponse | null>(null);
  const [familyGoals, setFamilyGoals] = useState<FamilyGoal[]>([]);
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [weekOffset, setWeekOffset] = useState(0);

  const [loading, setLoading] = useState({
    overview: true,
    childDetail: false,
    weeklySummary: true,
    engagementMetrics: false,
    communications: true,
    learningTips: false,
    familyGoals: false
  });

  const [errors, setErrors] = useState({
    overview: null as string | null,
    childDetail: null as string | null,
    weeklySummary: null as string | null,
    engagementMetrics: null as string | null,
    communications: null as string | null,
    learningTips: null as string | null,
    familyGoals: null as string | null
  });

  const [activeView, setActiveView] = useState<'overview' | 'weekly_summary' | 'children' | 'communications' | 'learning_tips' | 'family_goals'>('overview');

  // Data fetching functions
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, overview: true }));
      setErrors(prev => ({ ...prev, overview: null }));

      const data = await parentDashboardApi.getOverview(timeframe);
      setOverview(data);
    } catch (error) {
      console.error('Error fetching parent overview:', error);
      setErrors(prev => ({ ...prev, overview: error instanceof Error ? error.message : 'Failed to load overview' }));
    } finally {
      setLoading(prev => ({ ...prev, overview: false }));
    }
  }, [timeframe]);

  const fetchWeeklySummary = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, weeklySummary: true }));
      setErrors(prev => ({ ...prev, weeklySummary: null }));

      const data = await parentDashboardApi.getWeeklySummary(weekOffset);
      setWeeklySummary(data);
    } catch (error) {
      console.error('Error fetching weekly summary:', error);
      setErrors(prev => ({ ...prev, weeklySummary: error instanceof Error ? error.message : 'Failed to load weekly summary' }));
    } finally {
      setLoading(prev => ({ ...prev, weeklySummary: false }));
    }
  }, [weekOffset]);

  const fetchCommunications = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, communications: true }));
      setErrors(prev => ({ ...prev, communications: null }));

      const data = await parentDashboardApi.getTeacherCommunications(20, 0);
      setCommunications(data.communications);
    } catch (error) {
      console.error('Error fetching communications:', error);
      setErrors(prev => ({ ...prev, communications: error instanceof Error ? error.message : 'Failed to load communications' }));
    } finally {
      setLoading(prev => ({ ...prev, communications: false }));
    }
  }, []);

  const fetchLearningTips = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, learningTips: true }));
      setErrors(prev => ({ ...prev, learningTips: null }));

      const data = await parentDashboardApi.getLearningTips();
      setLearningTips(data);
    } catch (error) {
      console.error('Error fetching learning tips:', error);
      setErrors(prev => ({ ...prev, learningTips: error instanceof Error ? error.message : 'Failed to load learning tips' }));
    } finally {
      setLoading(prev => ({ ...prev, learningTips: false }));
    }
  }, []);

  const fetchFamilyGoals = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, familyGoals: true }));
      setErrors(prev => ({ ...prev, familyGoals: null }));

      const data = await parentDashboardApi.getFamilyGoals();
      setFamilyGoals(data);
    } catch (error) {
      console.error('Error fetching family goals:', error);
      setErrors(prev => ({ ...prev, familyGoals: error instanceof Error ? error.message : 'Failed to load family goals' }));
    } finally {
      setLoading(prev => ({ ...prev, familyGoals: false }));
    }
  }, []);

  const fetchChildDetail = useCallback(async (childId: number) => {
    try {
      setLoading(prev => ({ ...prev, childDetail: true }));
      setErrors(prev => ({ ...prev, childDetail: null }));

      const data = await parentDashboardApi.getChildDetail(childId, timeframe);
      setChildDetail(data);
    } catch (error) {
      console.error('Error fetching child detail:', error);
      setErrors(prev => ({ ...prev, childDetail: error instanceof Error ? error.message : 'Failed to load child details' }));
    } finally {
      setLoading(prev => ({ ...prev, childDetail: false }));
    }
  }, [timeframe]);

  // Event handlers
  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    setTimeframe(newTimeframe);
  }, []);

  const handleWeekChange = useCallback((newWeekOffset: number) => {
    setWeekOffset(newWeekOffset);
  }, []);

  const handleChildSelect = useCallback((childId: number | null) => {
    setSelectedChildId(childId);
    if (childId) {
      fetchChildDetail(childId);
    } else {
      setChildDetail(null);
    }
  }, [fetchChildDetail]);

  const handleSendCommunication = useCallback(async (communication: CreateCommunicationRequest) => {
    try {
      await parentDashboardApi.sendCommunication(communication);
      await fetchCommunications();
    } catch (error) {
      console.error('Error sending communication:', error);
    }
  }, [fetchCommunications]);

  const handleCreateFamilyGoal = useCallback(async (goal: CreateFamilyGoalRequest) => {
    try {
      await parentDashboardApi.createFamilyGoal(goal);
      await fetchFamilyGoals();
    } catch (error) {
      console.error('Error creating family goal:', error);
    }
  }, [fetchFamilyGoals]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchOverview(),
      fetchWeeklySummary(),
      fetchCommunications()
    ]);
  }, [fetchOverview, fetchWeeklySummary, fetchCommunications]);

  // Effects
  useEffect(() => {
    fetchOverview();
    fetchWeeklySummary();
  }, [fetchOverview, fetchWeeklySummary]);

  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  // Loading state
  const isLoading = Object.values(loading).some(Boolean);

  // Error state
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="parent-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Family Learning Dashboard 👨‍👩‍👧‍👦</h1>
            <p className="dashboard-subtitle">
              {overview?.parent 
                ? `Welcome, ${overview.parent.name}! ${parentDashboardApi.generateFamilyMessage(overview)}`
                : 'Loading your family dashboard...'
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

            <select 
              value={timeframe} 
              onChange={(e) => handleTimeframeChange(e.target.value)}
              className="timeframe-selector"
            >
              <option value="7d">This week</option>
              <option value="30d">This month</option>
              <option value="90d">Last 3 months</option>
            </select>
          </div>
        </div>

        {/* Family Summary Stats */}
        {overview && (
          <div className="family-stats">
            <div className="stat-item">
              <span className="stat-icon">👨‍👩‍👧‍👦</span>
              <div className="stat-content">
                <div className="stat-value">{overview.familyOverview.totalChildren}</div>
                <div className="stat-label">Children</div>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">🌟</span>
              <div className="stat-content">
                <div className="stat-value">{overview.familyOverview.activeChildren}</div>
                <div className="stat-label">Active This Week</div>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">🔥</span>
              <div className="stat-content">
                <div className="stat-value">{Math.round(overview.familyOverview.averageStreak)}</div>
                <div className="stat-label">Avg. Streak</div>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">🏆</span>
              <div className="stat-content">
                <div className="stat-value">{overview.familyOverview.totalPoints}</div>
                <div className="stat-label">Family Points</div>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">💬</span>
              <div className="stat-content">
                <div className="stat-value">{communications.filter(c => c.unread).length}</div>
                <div className="stat-label">New Messages</div>
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
          🏠 Family Overview
        </button>
        <button 
          className={`nav-tab ${activeView === 'weekly_summary' ? 'active' : ''}`}
          onClick={() => setActiveView('weekly_summary')}
        >
          📅 Weekly Summary
        </button>
        <button 
          className={`nav-tab ${activeView === 'children' ? 'active' : ''}`}
          onClick={() => setActiveView('children')}
        >
          👧👦 My Children
        </button>
        <button 
          className={`nav-tab ${activeView === 'communications' ? 'active' : ''}`}
          onClick={() => setActiveView('communications')}
        >
          💬 Teacher Messages
        </button>
        <button 
          className={`nav-tab ${activeView === 'learning_tips' ? 'active' : ''}`}
          onClick={() => setActiveView('learning_tips')}
        >
          💡 Learning Tips
        </button>
        <button 
          className={`nav-tab ${activeView === 'family_goals' ? 'active' : ''}`}
          onClick={() => setActiveView('family_goals')}
        >
          🎯 Family Goals
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
        {/* Family Overview Tab */}
        {activeView === 'overview' && (
          <div className="overview-tab">
            {overview ? (
              <div className="overview-content">
                {/* Family Summary */}
                <div className="family-summary">
                  <h2>Family Learning Summary</h2>
                  <div className="summary-cards">
                    <div className="summary-card engagement">
                      <h3>Family Engagement</h3>
                      <div className="engagement-stats">
                        <div className="engagement-score">
                          {parentDashboardApi.getFamilyEngagementSummary(overview).score}%
                        </div>
                        <div className="engagement-level">
                          {parentDashboardApi.getFamilyEngagementSummary(overview).level}
                        </div>
                      </div>
                      <p>{parentDashboardApi.getStreakMessage(overview.familyOverview.averageStreak)}</p>
                    </div>

                    <div className="summary-card activities">
                      <h3>This Week's Activities</h3>
                      <div className="activity-stats">
                        <div>📝 {overview.familyAnalytics.total_journal_entries} Journal Entries</div>
                        <div>🧮 {overview.familyAnalytics.total_problem_sessions} Problem Sessions</div>
                        <div>🏆 {overview.familyAnalytics.total_achievements} Achievements</div>
                      </div>
                    </div>

                    <div className="summary-card performance">
                      <h3>Academic Progress</h3>
                      <div className="performance-stats">
                        <div className="children-learning">
                          {overview.familyAnalytics.children_journaling}/{overview.familyOverview.totalChildren} journaling
                        </div>
                        <div className="children-problem-solving">
                          {overview.familyAnalytics.children_problem_solving}/{overview.familyOverview.totalChildren} problem solving
                        </div>
                      </div>
                      <p>{parentDashboardApi.getPerformanceMessage(overview.childrenProgress)}</p>
                    </div>
                  </div>
                </div>

                {/* Weekly Highlights */}
                {overview.weeklyHighlights.length > 0 && (
                  <div className="weekly-highlights">
                    <h2>🌟 This Week's Highlights</h2>
                    <div className="highlights-list">
                      {overview.weeklyHighlights.map((highlight, index) => (
                        <div key={index} className="highlight-item">
                          <span className="highlight-icon">
                            {highlight.type === 'achievement' ? '🏆' : 
                             highlight.type === 'streak_milestone' ? '🔥' : '⭐'}
                          </span>
                          <div className="highlight-content">
                            <h4>{highlight.title}</h4>
                            <p>{highlight.description}</p>
                            <div className="highlight-meta">
                              <span>{highlight.child_name}</span>
                              <span>{parentDashboardApi.formatDate(highlight.date)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Children Quick View */}
                <div className="children-overview">
                  <h2>👧👦 Your Children</h2>
                  <div className="children-grid">
                    {overview.children.map((child) => {
                      const engagementLevel = parentDashboardApi.getEngagementLevel(
                        child.current_streak, 
                        child.last_activity_date
                      );
                      
                      return (
                        <div key={child.user_id} className="child-card">
                          <div className="child-header">
                            <h3>{parentDashboardApi.formatChildName(child)}</h3>
                            <span 
                              className="engagement-badge"
                              style={{ backgroundColor: parentDashboardApi.getEngagementColor(engagementLevel) }}
                            >
                              {parentDashboardApi.getEngagementIcon(engagementLevel)} {engagementLevel}
                            </span>
                          </div>
                          <div className="child-stats">
                            <div>Grade: {parentDashboardApi.formatGradeLevel(child.grade_level)}</div>
                            <div>Learning Streak: {child.current_streak} days</div>
                            <div>Points: {child.total_points}</div>
                            <div>Last Active: {parentDashboardApi.formatDate(child.last_activity_date)}</div>
                          </div>
                          <div className="child-actions">
                            <button 
                              onClick={() => handleChildSelect(child.user_id)}
                              className="view-detail-btn"
                            >
                              View Progress
                            </button>
                            <button 
                              onClick={() => handleSendCommunication({
                                teacherId: 1, // Would get from child's teacher
                                childId: child.user_id,
                                subject: `Question about ${child.first_name}'s progress`,
                                message: ''
                              })}
                              className="message-teacher-btn"
                            >
                              Message Teacher
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Teacher Communications */}
                {overview.teacherCommunications.length > 0 && (
                  <div className="recent-communications">
                    <h2>💬 Recent Teacher Messages</h2>
                    <div className="communications-list">
                      {overview.teacherCommunications.slice(0, 3).map((comm) => (
                        <div key={comm.id} className="communication-item">
                          <span className="comm-icon">{parentDashboardApi.getCommunicationIcon(comm.communication_type)}</span>
                          <div className="comm-content">
                            <h4>{comm.subject}</h4>
                            <p>From {comm.teacher_name} about {comm.child_name}</p>
                            <div className="comm-meta">
                              <span className={`status-badge ${comm.status}`}>{comm.status}</span>
                              <span>{parentDashboardApi.formatDate(comm.created_at)}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setActiveView('communications')}
                            className="view-message-btn"
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                    {overview.teacherCommunications.length > 3 && (
                      <button 
                        onClick={() => setActiveView('communications')}
                        className="view-all-btn"
                      >
                        View All Messages ({overview.teacherCommunications.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : loading.overview ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading family overview...</p>
              </div>
            ) : (
              <div className="error-state">
                <span className="error-icon">😔</span>
                <p>Unable to load family overview</p>
                <button onClick={fetchOverview}>Try Again</button>
              </div>
            )}
          </div>
        )}

        {/* Weekly Summary Tab */}
        {activeView === 'weekly_summary' && (
          <div className="weekly-summary-tab">
            <div className="week-navigation">
              <button 
                onClick={() => handleWeekChange(weekOffset - 1)}
                className="week-nav-btn"
              >
                ← Previous Week
              </button>
              <div className="current-week">
                {weeklySummary && (
                  <h2>{parentDashboardApi.formatWeekPeriod(weeklySummary.weekPeriod.start, weeklySummary.weekPeriod.end)}</h2>
                )}
              </div>
              <button 
                onClick={() => handleWeekChange(weekOffset + 1)}
                className="week-nav-btn"
                disabled={weekOffset >= 0}
              >
                Next Week →
              </button>
            </div>

            {weeklySummary ? (
              <div className="weekly-summary-content">
                {/* Family Totals */}
                <div className="weekly-totals">
                  <h3>Family Learning This Week</h3>
                  <div className="totals-grid">
                    <div className="total-item">
                      <span className="total-value">{weeklySummary.familyTotals.totalJournalEntries}</span>
                      <span className="total-label">Journal Entries</span>
                    </div>
                    <div className="total-item">
                      <span className="total-value">{weeklySummary.familyTotals.totalProblemSessions}</span>
                      <span className="total-label">Problem Sessions</span>
                    </div>
                    <div className="total-item">
                      <span className="total-value">{weeklySummary.familyTotals.totalAchievements}</span>
                      <span className="total-label">Achievements</span>
                    </div>
                    <div className="total-item">
                      <span className="total-value">{weeklySummary.familyTotals.totalPointsEarned}</span>
                      <span className="total-label">Points Earned</span>
                    </div>
                  </div>
                </div>

                {/* Children Summaries */}
                <div className="children-summaries">
                  <h3>Individual Progress</h3>
                  <div className="children-summary-grid">
                    {weeklySummary.childrenSummaries.map((child) => (
                      <div key={child.user_id} className="child-summary-card">
                        <h4>{child.child_name}</h4>
                        <div className="child-weekly-stats">
                          <div className="stat">
                            <span className="value">{child.journal_entries}</span>
                            <span className="label">Journal</span>
                          </div>
                          <div className="stat">
                            <span className="value">{child.problem_sessions}</span>
                            <span className="label">Problems</span>
                          </div>
                          <div className="stat">
                            <span className="value">{child.achievements}</span>
                            <span className="label">Achievements</span>
                          </div>
                          <div className="stat">
                            <span className="value">{child.week_end_streak}</span>
                            <span className="label">Streak</span>
                          </div>
                        </div>
                        <div className={`engagement-level ${child.engagementLevel}`}>
                          {parentDashboardApi.getEngagementIcon(child.engagementLevel)} {child.engagementLevel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Celebrations and Support */}
                <div className="weekly-insights">
                  <div className="celebrations">
                    <h3>🎉 Celebrate This Week</h3>
                    <div className="celebration-list">
                      {parentDashboardApi.generateWeeklyCelebrations(weeklySummary).map((celebration, index) => (
                        <div key={index} className="celebration-item">
                          <span>{celebration}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="support-suggestions">
                    <h3>💡 Support Suggestions</h3>
                    <div className="support-list">
                      {parentDashboardApi.generateWeeklySupport(weeklySummary).map((suggestion, index) => (
                        <div key={index} className="support-item">
                          <span>{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : loading.weeklySummary ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading weekly summary...</p>
              </div>
            ) : (
              <div className="error-state">
                <span className="error-icon">📅</span>
                <p>Unable to load weekly summary</p>
                <button onClick={fetchWeeklySummary}>Try Again</button>
              </div>
            )}
          </div>
        )}

        {/* Children Tab - Placeholder */}
        {activeView === 'children' && (
          <div className="children-tab">
            <div className="placeholder-content">
              <h2>👧👦 Children Progress Details</h2>
              <p>Detailed individual child progress views coming soon...</p>
              {overview && (
                <div className="children-preview">
                  {overview.children.map((child) => (
                    <div key={child.user_id} className="child-preview-card">
                      <h3>{parentDashboardApi.formatChildName(child)}</h3>
                      <p>Grade: {parentDashboardApi.formatGradeLevel(child.grade_level)}</p>
                      <p>Current Streak: {child.current_streak} days</p>
                      <button onClick={() => handleChildSelect(child.user_id)}>
                        View Detailed Progress
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Communications Tab - Placeholder */}
        {activeView === 'communications' && (
          <div className="communications-tab">
            <div className="communications-content">
              <h2>💬 Teacher Communications</h2>
              {communications.length > 0 ? (
                <div className="communications-list">
                  {communications.map((comm) => (
                    <div key={comm.id} className="communication-card">
                      <div className="comm-header">
                        <h3>{comm.subject}</h3>
                        <div className="comm-badges">
                          <span 
                            className="importance-badge"
                            style={{ backgroundColor: parentDashboardApi.getImportanceColor(comm.importance) }}
                          >
                            {comm.importance}
                          </span>
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: parentDashboardApi.getCommunicationStatusColor(comm.status) }}
                          >
                            {comm.status}
                          </span>
                        </div>
                      </div>
                      <div className="comm-details">
                        <p><strong>From:</strong> {comm.teacher_name}</p>
                        <p><strong>About:</strong> {comm.child_name}</p>
                        <p><strong>Date:</strong> {parentDashboardApi.formatDate(comm.created_at)}</p>
                      </div>
                      <div className="comm-actions">
                        <button className="reply-btn">Reply</button>
                        <button className="view-detail-btn">View Full Message</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No messages yet. Your communication with teachers will appear here.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Learning Tips Tab - Placeholder */}
        {activeView === 'learning_tips' && (
          <div className="learning-tips-tab">
            <div className="placeholder-content">
              <h2>💡 Learning Tips & Resources</h2>
              <p>Personalized learning tips and family activities coming soon...</p>
              <button onClick={fetchLearningTips}>Get Learning Tips</button>
            </div>
          </div>
        )}

        {/* Family Goals Tab - Placeholder */}
        {activeView === 'family_goals' && (
          <div className="family-goals-tab">
            <div className="placeholder-content">
              <h2>🎯 Family Learning Goals</h2>
              <p>Set and track family learning goals together...</p>
              <button onClick={fetchFamilyGoals}>View Family Goals</button>
            </div>
          </div>
        )}
      </div>

      {/* Child Detail Modal */}
      {selectedChildId && (
        <div className="child-detail-modal">
          <div className="modal-backdrop" onClick={() => handleChildSelect(null)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Child Progress Details</h2>
              <button 
                onClick={() => handleChildSelect(null)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {loading.childDetail ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading child details...</p>
                </div>
              ) : childDetail ? (
                <div className="child-detail-content">
                  <p>Detailed child progress view coming soon...</p>
                  <pre>{JSON.stringify(childDetail, null, 2)}</pre>
                </div>
              ) : (
                <div className="error-state">
                  <p>Failed to load child details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="dashboard-footer">
        <p>Supporting your family's learning journey together! 🌟 Every child can succeed with the right support.</p>
      </div>
    </div>
  );
};

export default ParentDashboard; 