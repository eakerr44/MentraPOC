import React, { useState, useEffect, useCallback } from 'react';
import { 
  StudentDashboardOverview, 
  Goal, 
  CreateGoalRequest, 
  UpdateGoalRequest,
  StudentDashboardProps 
} from '../../types/dashboard';
import { dashboardApi } from '../../services/dashboardApi';
import './StudentDashboard.css';

// Sub-components (to be implemented)
// import DashboardOverview from './DashboardOverview';
// import GoalsWidget from './GoalsWidget';
// import ProgressWidget from './ProgressWidget';
// import AchievementsWidget from './AchievementsWidget';
// import ActivityFeedWidget from './ActivityFeedWidget';
// import LearningInsightsWidget from './LearningInsightsWidget';

const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
  userId, 
  initialTimeframe = '30d' 
}) => {
  // State management
  const [overview, setOverview] = useState<StudentDashboardOverview | null>(null);
  const [goals, setGoals] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [achievements, setAchievements] = useState<any>(null);
  const [activityFeed, setActivityFeed] = useState<any>(null);
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  
  const [loading, setLoading] = useState({
    overview: true,
    goals: true,
    progress: true,
    achievements: true,
    activityFeed: true
  });
  
  const [errors, setErrors] = useState({
    overview: null as string | null,
    goals: null as string | null,
    progress: null as string | null,
    achievements: null as string | null,
    activityFeed: null as string | null
  });

  const [activeTab, setActiveTab] = useState('overview');

  // Data fetching functions
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, overview: true }));
      setErrors(prev => ({ ...prev, overview: null }));
      
      const data = await dashboardApi.getOverview(timeframe);
      setOverview(data);
    } catch (error) {
      console.error('Error fetching overview:', error);
      setErrors(prev => ({ ...prev, overview: error instanceof Error ? error.message : 'Failed to load overview' }));
    } finally {
      setLoading(prev => ({ ...prev, overview: false }));
    }
  }, [timeframe]);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, goals: true }));
      setErrors(prev => ({ ...prev, goals: null }));
      
      const data = await dashboardApi.getGoals();
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
      setErrors(prev => ({ ...prev, goals: error instanceof Error ? error.message : 'Failed to load goals' }));
    } finally {
      setLoading(prev => ({ ...prev, goals: false }));
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, progress: true }));
      setErrors(prev => ({ ...prev, progress: null }));
      
      const data = await dashboardApi.getProgress(timeframe);
      setProgress(data);
    } catch (error) {
      console.error('Error fetching progress:', error);
      setErrors(prev => ({ ...prev, progress: error instanceof Error ? error.message : 'Failed to load progress' }));
    } finally {
      setLoading(prev => ({ ...prev, progress: false }));
    }
  }, [timeframe]);

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, achievements: true }));
      setErrors(prev => ({ ...prev, achievements: null }));
      
      const data = await dashboardApi.getAchievements();
      setAchievements(data);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      setErrors(prev => ({ ...prev, achievements: error instanceof Error ? error.message : 'Failed to load achievements' }));
    } finally {
      setLoading(prev => ({ ...prev, achievements: false }));
    }
  }, []);

  const fetchActivityFeed = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, activityFeed: true }));
      setErrors(prev => ({ ...prev, activityFeed: null }));
      
      const data = await dashboardApi.getActivityFeed();
      setActivityFeed(data);
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      setErrors(prev => ({ ...prev, activityFeed: error instanceof Error ? error.message : 'Failed to load activity feed' }));
    } finally {
      setLoading(prev => ({ ...prev, activityFeed: false }));
    }
  }, []);

  // Event handlers
  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    setTimeframe(newTimeframe);
  }, []);

  const handleCreateGoal = useCallback(async (goalData: CreateGoalRequest) => {
    try {
      await dashboardApi.createGoal(goalData);
      await fetchGoals();
      await fetchOverview(); // Refresh overview to update goal progress
    } catch (error) {
      console.error('Error creating goal:', error);
      // You might want to show a toast notification here
    }
  }, [fetchGoals, fetchOverview]);

  const handleUpdateGoal = useCallback(async (goalId: number, updates: UpdateGoalRequest) => {
    try {
      await dashboardApi.updateGoal(goalId, updates);
      await fetchGoals();
      await fetchOverview(); // Refresh overview to update goal progress
    } catch (error) {
      console.error('Error updating goal:', error);
      // You might want to show a toast notification here
    }
  }, [fetchGoals, fetchOverview]);

  const handleLoadMoreActivities = useCallback(async () => {
    if (!activityFeed || loading.activityFeed) return;
    
    try {
      const offset = activityFeed.activities.length;
      const data = await dashboardApi.getActivityFeed(15, offset);
      
      setActivityFeed((prev: any) => ({
        ...data,
        activities: [...prev.activities, ...data.activities]
      }));
    } catch (error) {
      console.error('Error loading more activities:', error);
    }
  }, [activityFeed, loading.activityFeed]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchOverview(),
      fetchGoals(),
      fetchProgress(),
      fetchAchievements(),
      fetchActivityFeed()
    ]);
  }, [fetchOverview, fetchGoals, fetchProgress, fetchAchievements, fetchActivityFeed]);

  // Effects
  useEffect(() => {
    fetchOverview();
    fetchProgress();
  }, [fetchOverview, fetchProgress]);

  useEffect(() => {
    fetchGoals();
    fetchAchievements();
    fetchActivityFeed();
  }, [fetchGoals, fetchAchievements, fetchActivityFeed]);

  // Loading state
  const isLoading = Object.values(loading).some(Boolean);

  // Error state
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="student-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Welcome back{overview?.student?.name ? `, ${overview.student.name.split(' ')[0]}` : ''}! 👋</h1>
            <p className="dashboard-subtitle">
              {overview?.student ? dashboardApi.getStreakMessage(overview.student.currentStreak) : 'Loading your learning dashboard...'}
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
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {/* Quick Stats Bar */}
        {overview && (
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-icon">🔥</span>
              <div className="stat-content">
                <div className="stat-value">{overview.student.currentStreak}</div>
                <div className="stat-label">Day Streak</div>
              </div>
            </div>
            
            <div className="stat-item">
              <span className="stat-icon">⭐</span>
              <div className="stat-content">
                <div className="stat-value">{overview.student.totalPoints}</div>
                <div className="stat-label">Total Points</div>
              </div>
            </div>
            
            <div className="stat-item">
              <span className="stat-icon">🎯</span>
              <div className="stat-content">
                <div className="stat-value">{overview.goalProgress.active_goals}</div>
                <div className="stat-label">Active Goals</div>
              </div>
            </div>
            
            <div className="stat-item">
              <span className="stat-icon">🏆</span>
              <div className="stat-content">
                <div className="stat-value">{overview.recentAchievements.length}</div>
                <div className="stat-label">Recent Achievements</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dashboard Navigation */}
      <div className="dashboard-nav">
        <button 
          className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`nav-tab ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          🎯 Goals
        </button>
        <button 
          className={`nav-tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          📈 Progress
        </button>
        <button 
          className={`nav-tab ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          🏆 Achievements
        </button>
        <button 
          className={`nav-tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          📋 Activity
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
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {overview ? (
              <div className="overview-content">
                <div className="dashboard-summary">
                  <h2>Learning Summary</h2>
                  <div className="summary-grid">
                    <div className="summary-card">
                      <h3>📝 Journal Entries</h3>
                      <div className="summary-value">{overview.activitySummary.journal_entries}</div>
                      <div className="summary-period">in {dashboardApi.formatTimeframe(timeframe)}</div>
                    </div>
                    
                    <div className="summary-card">
                      <h3>🧮 Problems Solved</h3>
                      <div className="summary-value">{overview.activitySummary.problem_sessions}</div>
                      <div className="summary-period">in {dashboardApi.formatTimeframe(timeframe)}</div>
                    </div>
                    
                    <div className="summary-card">
                      <h3>🏆 New Achievements</h3>
                      <div className="summary-value">{overview.activitySummary.new_achievements}</div>
                      <div className="summary-period">in {dashboardApi.formatTimeframe(timeframe)}</div>
                    </div>
                  </div>
                </div>

                {/* Learning Insights */}
                {overview.learningInsights && (
                  <div className="insights-section">
                    <h2>💡 Learning Insights</h2>
                    <div className="insights-grid">
                      {overview.learningInsights.topStrengths.length > 0 && (
                        <div className="insight-card strengths">
                          <h3>💪 Top Strengths</h3>
                          <ul>
                            {overview.learningInsights.topStrengths.map((strength, index) => (
                              <li key={index}>{strength.title}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {overview.learningInsights.growthAreas.length > 0 && (
                        <div className="insight-card growth">
                          <h3>🌱 Growth Areas</h3>
                          <ul>
                            {overview.learningInsights.growthAreas.map((area, index) => (
                              <li key={index}>{area.title}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {overview.learningInsights.recommendations.length > 0 && (
                        <div className="insight-card recommendations">
                          <h3>💡 Recommendations</h3>
                          <ul>
                            {overview.learningInsights.recommendations.map((rec, index) => (
                              <li key={index}>{rec.title}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recent Achievements */}
                {overview.recentAchievements.length > 0 && (
                  <div className="recent-achievements">
                    <h2>🏆 Recent Achievements</h2>
                    <div className="achievements-list">
                      {overview.recentAchievements.map((achievement, index) => (
                        <div key={index} className="achievement-item">
                          <span className="achievement-icon">{achievement.icon || '🏆'}</span>
                          <div className="achievement-content">
                            <h4>{achievement.title}</h4>
                            <p>{achievement.description}</p>
                            <div className="achievement-meta">
                              <span className="points">+{achievement.points_earned} points</span>
                              <span className="date">{dashboardApi.formatDate(achievement.earned_at)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : loading.overview ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading your dashboard...</p>
              </div>
            ) : (
              <div className="error-state">
                <span className="error-icon">😔</span>
                <p>Unable to load dashboard overview</p>
                <button onClick={fetchOverview}>Try Again</button>
              </div>
            )}
          </div>
        )}

        {/* Goals Tab - Placeholder */}
        {activeTab === 'goals' && (
          <div className="goals-tab">
            <div className="placeholder-content">
              <h2>🎯 Goals Management</h2>
              <p>Goal tracking widget coming soon...</p>
              <div className="placeholder-data">
                {goals ? (
                  <div>
                    <p>Total Goals: {goals.summary.total}</p>
                    <p>Active Goals: {goals.summary.active}</p>
                    <p>Completed Goals: {goals.summary.completed}</p>
                  </div>
                ) : (
                  <p>Loading goals data...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress Tab - Placeholder */}
        {activeTab === 'progress' && (
          <div className="progress-tab">
            <div className="placeholder-content">
              <h2>📈 Progress Tracking</h2>
              <p>Progress visualization widget coming soon...</p>
            </div>
          </div>
        )}

        {/* Achievements Tab - Placeholder */}
        {activeTab === 'achievements' && (
          <div className="achievements-tab">
            <div className="placeholder-content">
              <h2>🏆 Achievements</h2>
              <p>Achievements gallery widget coming soon...</p>
              <div className="placeholder-data">
                {achievements ? (
                  <div>
                    <p>Total Achievements: {achievements.statistics.total_achievements}</p>
                    <p>Recent Achievements: {achievements.statistics.recent_achievements}</p>
                  </div>
                ) : (
                  <p>Loading achievements data...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab - Placeholder */}
        {activeTab === 'activity' && (
          <div className="activity-tab">
            <div className="placeholder-content">
              <h2>📋 Activity Feed</h2>
              <p>Activity timeline widget coming soon...</p>
              <div className="placeholder-data">
                {activityFeed ? (
                  <div>
                    <p>Recent Activities: {activityFeed.activities.length}</p>
                    <ul>
                      {activityFeed.activities.slice(0, 5).map((activity: any, index: number) => (
                        <li key={index}>
                          {dashboardApi.getActivityIcon(activity.type)} {activity.title} 
                          - {dashboardApi.formatDate(activity.created_at)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>Loading activity data...</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <p>Keep up the great work! 🌟 Remember: every small step counts towards your learning journey.</p>
      </div>
    </div>
  );
};

export default StudentDashboard; 