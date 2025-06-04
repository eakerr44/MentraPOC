const { Pool } = require('pg');
const { activityMonitor } = require('./activity-monitor');

// Session analytics error class
class SessionAnalyticsError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = 'SessionAnalyticsError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Analytics time windows
const TIME_WINDOWS = {
  REAL_TIME: 'real_time',     // Last 5 minutes
  HOURLY: 'hourly',           // Last hour
  DAILY: 'daily',             // Last 24 hours
  WEEKLY: 'weekly',           // Last 7 days
  MONTHLY: 'monthly',         // Last 30 days
  QUARTERLY: 'quarterly'      // Last 90 days
};

// Metric types
const METRIC_TYPES = {
  ENGAGEMENT: 'engagement',
  PERFORMANCE: 'performance',
  EFFICIENCY: 'efficiency',
  LEARNING: 'learning',
  BEHAVIORAL: 'behavioral'
};

// Session status categories
const SESSION_STATUS_CATEGORIES = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  PAUSED: 'paused',
  STUCK: 'stuck'
};

class SessionAnalyticsService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  // ============================================
  // REAL-TIME SESSION TRACKING
  // ============================================

  // Get real-time active sessions overview
  async getRealTimeSessionOverview(teacherId = null, classId = null) {
    try {
      const client = await this.pool.connect();
      
      try {
        // Build query conditions for class/teacher filtering
        let teacherFilter = '';
        let params = [];
        let paramCount = 0;

        if (teacherId) {
          // This would integrate with class management - for now just filter by recent activity
          teacherFilter = 'AND ps.last_activity_at >= NOW() - INTERVAL \'1 hour\'';
        }

        const query = `
          WITH active_sessions AS (
            SELECT ps.*, pt.title, pt.subject, pt.difficulty_level, pt.problem_type,
                   u.username as student_name,
                   EXTRACT(EPOCH FROM (NOW() - ps.last_activity_at))/60 as minutes_idle,
                   CASE 
                     WHEN ps.session_status = 'active' AND ps.last_activity_at < NOW() - INTERVAL '10 minutes' THEN 'stuck'
                     ELSE ps.session_status
                   END as current_status
            FROM problem_sessions ps
            JOIN problem_templates pt ON ps.template_id = pt.id
            JOIN users u ON ps.student_id = u.id
            WHERE ps.session_status IN ('active', 'paused')
              AND ps.started_at >= NOW() - INTERVAL '24 hours'
              ${teacherFilter}
          ),
          session_stats AS (
            SELECT 
              COUNT(*) as total_active,
              COUNT(*) FILTER (WHERE current_status = 'active') as currently_active,
              COUNT(*) FILTER (WHERE current_status = 'stuck') as stuck_sessions,
              COUNT(*) FILTER (WHERE current_status = 'paused') as paused_sessions,
              AVG(minutes_idle) as avg_idle_time,
              COUNT(DISTINCT student_id) as active_students
            FROM active_sessions
          )
          SELECT 
            ss.*,
            json_agg(
              json_build_object(
                'sessionId', ases.id,
                'studentName', ases.student_name,
                'studentId', ases.student_id,
                'problemTitle', ases.title,
                'subject', ases.subject,
                'difficulty', ases.difficulty_level,
                'currentStep', ases.current_step,
                'totalSteps', ases.total_steps,
                'progress', ROUND((ases.steps_completed::float / ases.total_steps) * 100, 1),
                'status', ases.current_status,
                'minutesIdle', ROUND(ases.minutes_idle::numeric, 1),
                'startedAt', ases.started_at,
                'lastActivity', ases.last_activity_at
              ) ORDER BY ases.last_activity_at DESC
            ) as active_sessions_detail
          FROM session_stats ss, active_sessions ases
          GROUP BY ss.total_active, ss.currently_active, ss.stuck_sessions, 
                   ss.paused_sessions, ss.avg_idle_time, ss.active_students
        `;

        const result = await client.query(query, params);
        
        if (result.rows.length === 0) {
          return {
            timestamp: new Date().toISOString(),
            overview: {
              totalActive: 0,
              currentlyActive: 0,
              stuckSessions: 0,
              pausedSessions: 0,
              avgIdleTime: 0,
              activeStudents: 0
            },
            activeSessions: []
          };
        }

        const data = result.rows[0];

        return {
          timestamp: new Date().toISOString(),
          overview: {
            totalActive: parseInt(data.total_active) || 0,
            currentlyActive: parseInt(data.currently_active) || 0,
            stuckSessions: parseInt(data.stuck_sessions) || 0,
            pausedSessions: parseInt(data.paused_sessions) || 0,
            avgIdleTime: Math.round((parseFloat(data.avg_idle_time) || 0) * 10) / 10,
            activeStudents: parseInt(data.active_students) || 0
          },
          activeSessions: data.active_sessions_detail || [],
          teacherId,
          classId
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error getting real-time session overview:', error);
      throw new SessionAnalyticsError(
        'Failed to get real-time session overview',
        'REALTIME_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Track session activity heartbeat
  async trackSessionHeartbeat(sessionId, studentId, activityData = {}) {
    try {
      const client = await this.pool.connect();
      
      try {
        const {
          currentStep = null,
          responseInProgress = false,
          timeOnStep = 0,
          interfaceEvents = [],
          engagementLevel = 'medium'
        } = activityData;

        // Update session last activity
        await client.query(`
          UPDATE problem_sessions 
          SET last_activity_at = NOW()
          WHERE id = $1 AND student_id = $2
        `, [sessionId, studentId]);

        // Insert heartbeat record for detailed tracking
        await client.query(`
          INSERT INTO session_heartbeats (
            session_id, student_id, current_step, response_in_progress,
            time_on_step, interface_events, engagement_level, recorded_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          sessionId,
          studentId,
          currentStep,
          responseInProgress,
          timeOnStep,
          JSON.stringify(interfaceEvents),
          engagementLevel
        ]);

        return {
          success: true,
          timestamp: new Date().toISOString()
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error tracking session heartbeat:', error);
      // Don't throw error for heartbeat failures - they shouldn't break user experience
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ============================================
  // COMPREHENSIVE SESSION ANALYTICS
  // ============================================

  // Get comprehensive session analytics for a student
  async getStudentSessionAnalytics(studentId, options = {}) {
    try {
      const {
        timeWindow = TIME_WINDOWS.MONTHLY,
        includeComparisons = true,
        includeProgressTrends = true,
        includePredictions = false
      } = options;

      const client = await this.pool.connect();
      
      try {
        const timeFilter = this.getTimeFilter(timeWindow);
        
        // Get comprehensive session metrics
        const metricsQuery = `
          WITH session_metrics AS (
            SELECT 
              ps.*,
              pt.subject,
              pt.difficulty_level,
              pt.problem_type,
              EXTRACT(EPOCH FROM (ps.completed_at - ps.started_at))/60 as session_duration_minutes,
              CASE 
                WHEN ps.session_status = 'completed' THEN ps.steps_completed::float / ps.total_steps
                ELSE NULL
              END as completion_ratio,
              ps.hints_requested::float / ps.total_steps as hint_density,
              ps.mistakes_made::float / ps.total_steps as mistake_density
            FROM problem_sessions ps
            JOIN problem_templates pt ON ps.template_id = pt.id
            WHERE ps.student_id = $1 
              AND ps.started_at >= ${timeFilter}
          ),
          overall_stats AS (
            SELECT 
              COUNT(*) as total_sessions,
              COUNT(*) FILTER (WHERE session_status = 'completed') as completed_sessions,
              COUNT(*) FILTER (WHERE session_status = 'abandoned') as abandoned_sessions,
              COUNT(*) FILTER (WHERE session_status = 'active') as active_sessions,
              AVG(session_duration_minutes) FILTER (WHERE session_status = 'completed') as avg_duration,
              AVG(accuracy_score) FILTER (WHERE accuracy_score IS NOT NULL) as avg_accuracy,
              AVG(completion_ratio) FILTER (WHERE completion_ratio IS NOT NULL) as avg_completion_rate,
              AVG(hint_density) as avg_hint_usage,
              AVG(mistake_density) as avg_mistake_rate,
              SUM(hints_requested) as total_hints,
              SUM(mistakes_made) as total_mistakes,
              COUNT(DISTINCT subject) as subjects_attempted,
              COUNT(DISTINCT difficulty_level) as difficulty_levels_attempted
            FROM session_metrics
          ),
          subject_performance AS (
            SELECT 
              subject,
              COUNT(*) as sessions,
              AVG(accuracy_score) as avg_accuracy,
              AVG(session_duration_minutes) FILTER (WHERE session_status = 'completed') as avg_duration,
              COUNT(*) FILTER (WHERE session_status = 'completed') as completed,
              AVG(hint_density) as avg_hint_usage
            FROM session_metrics
            GROUP BY subject
          ),
          difficulty_performance AS (
            SELECT 
              difficulty_level,
              COUNT(*) as sessions,
              AVG(accuracy_score) as avg_accuracy,
              AVG(session_duration_minutes) FILTER (WHERE session_status = 'completed') as avg_duration,
              COUNT(*) FILTER (WHERE session_status = 'completed') as completed,
              AVG(completion_ratio) FILTER (WHERE completion_ratio IS NOT NULL) as avg_completion_rate
            FROM session_metrics
            GROUP BY difficulty_level
          )
          SELECT 
            os.*,
            (SELECT json_agg(sp.*) FROM subject_performance sp) as subject_breakdown,
            (SELECT json_agg(dp.*) FROM difficulty_performance dp) as difficulty_breakdown
          FROM overall_stats os
        `;

        const metricsResult = await client.query(metricsQuery, [studentId]);
        const metrics = metricsResult.rows[0];

        let trendData = null;
        if (includeProgressTrends) {
          trendData = await this.getProgressTrends(client, studentId, timeWindow);
        }

        let comparisonData = null;
        if (includeComparisons) {
          comparisonData = await this.getPerformanceComparisons(client, studentId, timeWindow);
        }

        let predictions = null;
        if (includePredictions) {
          predictions = await this.generatePerformancePredictions(client, studentId);
        }

        return {
          studentId,
          timeWindow,
          analyzedAt: new Date().toISOString(),
          overallMetrics: {
            totalSessions: parseInt(metrics.total_sessions) || 0,
            completedSessions: parseInt(metrics.completed_sessions) || 0,
            abandonedSessions: parseInt(metrics.abandoned_sessions) || 0,
            activeSessions: parseInt(metrics.active_sessions) || 0,
            completionRate: this.calculatePercentage(parseInt(metrics.completed_sessions), parseInt(metrics.total_sessions)),
            averageDuration: Math.round((parseFloat(metrics.avg_duration) || 0) * 10) / 10,
            averageAccuracy: Math.round((parseFloat(metrics.avg_accuracy) || 0) * 1000) / 1000,
            averageCompletionRate: Math.round((parseFloat(metrics.avg_completion_rate) || 0) * 1000) / 1000,
            averageHintUsage: Math.round((parseFloat(metrics.avg_hint_usage) || 0) * 1000) / 1000,
            averageMistakeRate: Math.round((parseFloat(metrics.avg_mistake_rate) || 0) * 1000) / 1000,
            totalHints: parseInt(metrics.total_hints) || 0,
            totalMistakes: parseInt(metrics.total_mistakes) || 0,
            subjectsAttempted: parseInt(metrics.subjects_attempted) || 0,
            difficultyLevelsAttempted: parseInt(metrics.difficulty_levels_attempted) || 0
          },
          subjectBreakdown: metrics.subject_breakdown || [],
          difficultyBreakdown: metrics.difficulty_breakdown || [],
          progressTrends: trendData,
          performanceComparisons: comparisonData,
          predictions
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error getting student session analytics:', error);
      throw new SessionAnalyticsError(
        'Failed to get student session analytics',
        'ANALYTICS_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Get learning pattern analysis
  async getLearningPatternAnalysis(studentId, options = {}) {
    try {
      const {
        timeWindow = TIME_WINDOWS.MONTHLY,
        includeTimePatterns = true,
        includeEngagementPatterns = true,
        includePerformancePatterns = true
      } = options;

      const client = await this.pool.connect();
      
      try {
        const timeFilter = this.getTimeFilter(timeWindow);
        
        let timePatterns = null;
        if (includeTimePatterns) {
          timePatterns = await this.analyzeTimePatterns(client, studentId, timeFilter);
        }

        let engagementPatterns = null;
        if (includeEngagementPatterns) {
          engagementPatterns = await this.analyzeEngagementPatterns(client, studentId, timeFilter);
        }

        let performancePatterns = null;
        if (includePerformancePatterns) {
          performancePatterns = await this.analyzePerformancePatterns(client, studentId, timeFilter);
        }

        return {
          studentId,
          timeWindow,
          analyzedAt: new Date().toISOString(),
          timePatterns,
          engagementPatterns,
          performancePatterns,
          insights: this.generateLearningInsights(timePatterns, engagementPatterns, performancePatterns)
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error getting learning pattern analysis:', error);
      throw new SessionAnalyticsError(
        'Failed to get learning pattern analysis',
        'PATTERN_ANALYSIS_ERROR',
        { originalError: error.message }
      );
    }
  }

  // ============================================
  // TEACHER ANALYTICS AND CLASS OVERVIEW
  // ============================================

  // Get teacher dashboard analytics
  async getTeacherDashboardAnalytics(teacherId, options = {}) {
    try {
      const {
        timeWindow = TIME_WINDOWS.WEEKLY,
        classId = null,
        includeStudentProgress = true,
        includeClassComparisons = true
      } = options;

      const client = await this.pool.connect();
      
      try {
        const timeFilter = this.getTimeFilter(timeWindow);
        
        // Get class-wide session statistics
        const classStatsQuery = `
          WITH class_sessions AS (
            SELECT ps.*, pt.subject, pt.difficulty_level, pt.problem_type, u.username as student_name
            FROM problem_sessions ps
            JOIN problem_templates pt ON ps.template_id = pt.id
            JOIN users u ON ps.student_id = u.id
            WHERE ps.started_at >= ${timeFilter}
              ${classId ? 'AND ps.student_id IN (SELECT student_id FROM class_enrollments WHERE class_id = $2)' : ''}
          ),
          overall_stats AS (
            SELECT 
              COUNT(*) as total_sessions,
              COUNT(DISTINCT student_id) as active_students,
              COUNT(*) FILTER (WHERE session_status = 'completed') as completed_sessions,
              COUNT(*) FILTER (WHERE session_status = 'abandoned') as abandoned_sessions,
              AVG(accuracy_score) FILTER (WHERE accuracy_score IS NOT NULL) as avg_class_accuracy,
              AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) FILTER (WHERE session_status = 'completed') as avg_session_duration,
              SUM(hints_requested) as total_hints,
              SUM(mistakes_made) as total_mistakes
            FROM class_sessions
          ),
          student_summary AS (
            SELECT 
              student_id,
              student_name,
              COUNT(*) as sessions,
              COUNT(*) FILTER (WHERE session_status = 'completed') as completed,
              AVG(accuracy_score) FILTER (WHERE accuracy_score IS NOT NULL) as avg_accuracy,
              SUM(hints_requested) as hints_used,
              SUM(mistakes_made) as mistakes_made,
              MAX(started_at) as last_session
            FROM class_sessions
            GROUP BY student_id, student_name
          )
          SELECT 
            os.*,
            (SELECT json_agg(ss.* ORDER BY ss.last_session DESC) FROM student_summary ss) as student_summaries
          FROM overall_stats os
        `;

        const params = [teacherId];
        if (classId) params.push(classId);

        const classStatsResult = await client.query(classStatsQuery, params);
        const classStats = classStatsResult.rows[0];

        // Get subject and difficulty performance across class
        const performanceBreakdownQuery = `
          SELECT 
            pt.subject,
            pt.difficulty_level,
            COUNT(*) as sessions,
            COUNT(*) FILTER (WHERE ps.session_status = 'completed') as completed,
            AVG(ps.accuracy_score) FILTER (WHERE ps.accuracy_score IS NOT NULL) as avg_accuracy,
            COUNT(DISTINCT ps.student_id) as students_attempted
          FROM problem_sessions ps
          JOIN problem_templates pt ON ps.template_id = pt.id
          WHERE ps.started_at >= ${timeFilter}
            ${classId ? 'AND ps.student_id IN (SELECT student_id FROM class_enrollments WHERE class_id = $2)' : ''}
          GROUP BY pt.subject, pt.difficulty_level
          ORDER BY pt.subject, 
            CASE pt.difficulty_level 
              WHEN 'easy' THEN 1 
              WHEN 'medium' THEN 2 
              WHEN 'hard' THEN 3 
              WHEN 'advanced' THEN 4 
            END
        `;

        const performanceResult = await client.query(performanceBreakdownQuery, params);

        return {
          teacherId,
          classId,
          timeWindow,
          analyzedAt: new Date().toISOString(),
          classOverview: {
            totalSessions: parseInt(classStats.total_sessions) || 0,
            activeStudents: parseInt(classStats.active_students) || 0,
            completedSessions: parseInt(classStats.completed_sessions) || 0,
            abandonedSessions: parseInt(classStats.abandoned_sessions) || 0,
            completionRate: this.calculatePercentage(parseInt(classStats.completed_sessions), parseInt(classStats.total_sessions)),
            averageClassAccuracy: Math.round((parseFloat(classStats.avg_class_accuracy) || 0) * 1000) / 1000,
            averageSessionDuration: Math.round((parseFloat(classStats.avg_session_duration) || 0) * 10) / 10,
            totalHints: parseInt(classStats.total_hints) || 0,
            totalMistakes: parseInt(classStats.total_mistakes) || 0
          },
          studentSummaries: classStats.student_summaries || [],
          performanceBreakdown: performanceResult.rows,
          insights: this.generateTeacherInsights(classStats, performanceResult.rows)
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error getting teacher dashboard analytics:', error);
      throw new SessionAnalyticsError(
        'Failed to get teacher dashboard analytics',
        'TEACHER_ANALYTICS_ERROR',
        { originalError: error.message }
      );
    }
  }

  // ============================================
  // ADVANCED ANALYTICS HELPER METHODS
  // ============================================

  // Get progress trends over time
  async getProgressTrends(client, studentId, timeWindow) {
    const timeFilter = this.getTimeFilter(timeWindow);
    const interval = this.getTimeInterval(timeWindow);

    const query = `
      SELECT 
        DATE_TRUNC('${interval}', ps.started_at) as time_period,
        COUNT(*) as sessions,
        COUNT(*) FILTER (WHERE ps.session_status = 'completed') as completed,
        AVG(ps.accuracy_score) FILTER (WHERE ps.accuracy_score IS NOT NULL) as avg_accuracy,
        AVG(EXTRACT(EPOCH FROM (ps.completed_at - ps.started_at))/60) FILTER (WHERE ps.session_status = 'completed') as avg_duration,
        SUM(ps.hints_requested) as total_hints,
        SUM(ps.mistakes_made) as total_mistakes
      FROM problem_sessions ps
      WHERE ps.student_id = $1 
        AND ps.started_at >= ${timeFilter}
      GROUP BY DATE_TRUNC('${interval}', ps.started_at)
      ORDER BY time_period ASC
    `;

    const result = await client.query(query, [studentId]);
    return result.rows;
  }

  // Analyze time-based learning patterns
  async analyzeTimePatterns(client, studentId, timeFilter) {
    const query = `
      SELECT 
        EXTRACT(hour FROM ps.started_at) as hour_of_day,
        EXTRACT(dow FROM ps.started_at) as day_of_week,
        COUNT(*) as sessions,
        AVG(ps.accuracy_score) FILTER (WHERE ps.accuracy_score IS NOT NULL) as avg_accuracy,
        AVG(EXTRACT(EPOCH FROM (ps.completed_at - ps.started_at))/60) FILTER (WHERE ps.session_status = 'completed') as avg_duration
      FROM problem_sessions ps
      WHERE ps.student_id = $1 
        AND ps.started_at >= ${timeFilter}
      GROUP BY EXTRACT(hour FROM ps.started_at), EXTRACT(dow FROM ps.started_at)
      ORDER BY sessions DESC
    `;

    const result = await client.query(query, [studentId]);
    
    // Aggregate by hour and day of week
    const hourlyPattern = {};
    const dailyPattern = {};
    
    result.rows.forEach(row => {
      const hour = parseInt(row.hour_of_day);
      const day = parseInt(row.day_of_week);
      
      if (!hourlyPattern[hour]) {
        hourlyPattern[hour] = { sessions: 0, totalAccuracy: 0, totalDuration: 0, count: 0 };
      }
      if (!dailyPattern[day]) {
        dailyPattern[day] = { sessions: 0, totalAccuracy: 0, totalDuration: 0, count: 0 };
      }
      
      hourlyPattern[hour].sessions += parseInt(row.sessions);
      hourlyPattern[hour].totalAccuracy += parseFloat(row.avg_accuracy) || 0;
      hourlyPattern[hour].totalDuration += parseFloat(row.avg_duration) || 0;
      hourlyPattern[hour].count++;
      
      dailyPattern[day].sessions += parseInt(row.sessions);
      dailyPattern[day].totalAccuracy += parseFloat(row.avg_accuracy) || 0;
      dailyPattern[day].totalDuration += parseFloat(row.avg_duration) || 0;
      dailyPattern[day].count++;
    });

    return {
      hourlyPattern,
      dailyPattern,
      peakHours: this.findPeakTimes(hourlyPattern),
      peakDays: this.findPeakDays(dailyPattern)
    };
  }

  // Analyze engagement patterns
  async analyzeEngagementPatterns(client, studentId, timeFilter) {
    const query = `
      SELECT 
        ps.session_status,
        ps.hints_requested,
        ps.mistakes_made,
        ps.steps_completed,
        ps.total_steps,
        EXTRACT(EPOCH FROM (COALESCE(ps.completed_at, ps.abandoned_at, NOW()) - ps.started_at))/60 as session_length,
        pt.difficulty_level,
        pt.subject
      FROM problem_sessions ps
      JOIN problem_templates pt ON ps.template_id = pt.id
      WHERE ps.student_id = $1 
        AND ps.started_at >= ${timeFilter}
      ORDER BY ps.started_at ASC
    `;

    const result = await client.query(query, [studentId]);
    
    const engagementMetrics = {
      averageSessionLength: 0,
      completionRate: 0,
      helpSeekingBehavior: 'moderate',
      persistenceLevel: 'medium',
      difficultyPreference: 'medium'
    };

    if (result.rows.length > 0) {
      const totalSessions = result.rows.length;
      const completedSessions = result.rows.filter(row => row.session_status === 'completed').length;
      const avgSessionLength = result.rows.reduce((sum, row) => sum + parseFloat(row.session_length), 0) / totalSessions;
      const avgHintUsage = result.rows.reduce((sum, row) => sum + parseInt(row.hints_requested), 0) / totalSessions;
      
      engagementMetrics.averageSessionLength = Math.round(avgSessionLength * 10) / 10;
      engagementMetrics.completionRate = Math.round((completedSessions / totalSessions) * 1000) / 1000;
      
      // Determine help seeking behavior
      if (avgHintUsage > 3) {
        engagementMetrics.helpSeekingBehavior = 'high';
      } else if (avgHintUsage < 1) {
        engagementMetrics.helpSeekingBehavior = 'low';
      }
      
      // Determine persistence level
      const abandonmentRate = result.rows.filter(row => row.session_status === 'abandoned').length / totalSessions;
      if (abandonmentRate < 0.1) {
        engagementMetrics.persistenceLevel = 'high';
      } else if (abandonmentRate > 0.3) {
        engagementMetrics.persistenceLevel = 'low';
      }
    }

    return engagementMetrics;
  }

  // Analyze performance patterns
  async analyzePerformancePatterns(client, studentId, timeFilter) {
    const query = `
      SELECT 
        ps.accuracy_score,
        ps.session_status,
        pt.difficulty_level,
        pt.subject,
        ps.started_at,
        ROW_NUMBER() OVER (ORDER BY ps.started_at ASC) as session_order
      FROM problem_sessions ps
      JOIN problem_templates pt ON ps.template_id = pt.id
      WHERE ps.student_id = $1 
        AND ps.started_at >= ${timeFilter}
        AND ps.accuracy_score IS NOT NULL
      ORDER BY ps.started_at ASC
    `;

    const result = await client.query(query, [studentId]);
    
    if (result.rows.length === 0) {
      return {
        trend: 'insufficient_data',
        consistency: 'unknown',
        improvementRate: 0
      };
    }

    // Calculate trend using simple linear regression
    const scores = result.rows.map(row => parseFloat(row.accuracy_score));
    const trend = this.calculateTrend(scores);
    
    // Calculate consistency (standard deviation)
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const consistency = Math.sqrt(variance);

    return {
      trend: trend > 0.01 ? 'improving' : trend < -0.01 ? 'declining' : 'stable',
      trendValue: Math.round(trend * 1000) / 1000,
      consistency: consistency < 0.1 ? 'high' : consistency > 0.2 ? 'low' : 'medium',
      consistencyValue: Math.round(consistency * 1000) / 1000,
      improvementRate: Math.round(trend * 100 * 1000) / 1000, // percentage improvement per session
      averageAccuracy: Math.round(mean * 1000) / 1000
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  // Get time filter SQL based on time window
  getTimeFilter(timeWindow) {
    const intervals = {
      [TIME_WINDOWS.REAL_TIME]: 'NOW() - INTERVAL \'5 minutes\'',
      [TIME_WINDOWS.HOURLY]: 'NOW() - INTERVAL \'1 hour\'',
      [TIME_WINDOWS.DAILY]: 'NOW() - INTERVAL \'1 day\'',
      [TIME_WINDOWS.WEEKLY]: 'NOW() - INTERVAL \'7 days\'',
      [TIME_WINDOWS.MONTHLY]: 'NOW() - INTERVAL \'30 days\'',
      [TIME_WINDOWS.QUARTERLY]: 'NOW() - INTERVAL \'90 days\''
    };
    
    return intervals[timeWindow] || intervals[TIME_WINDOWS.MONTHLY];
  }

  // Get time interval for grouping based on time window
  getTimeInterval(timeWindow) {
    const intervals = {
      [TIME_WINDOWS.REAL_TIME]: 'minute',
      [TIME_WINDOWS.HOURLY]: 'minute',
      [TIME_WINDOWS.DAILY]: 'hour',
      [TIME_WINDOWS.WEEKLY]: 'day',
      [TIME_WINDOWS.MONTHLY]: 'day',
      [TIME_WINDOWS.QUARTERLY]: 'week'
    };
    
    return intervals[timeWindow] || 'day';
  }

  // Calculate percentage with precision
  calculatePercentage(numerator, denominator, decimals = 1) {
    if (!denominator || denominator === 0) return 0;
    const percentage = (parseFloat(numerator) / parseFloat(denominator)) * 100;
    return Math.round(percentage * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  // Calculate trend using simple linear regression
  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({length: n}, (_, i) => i + 1);
    const y = values;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope || 0;
  }

  // Find peak activity times
  findPeakTimes(hourlyPattern) {
    const hours = Object.keys(hourlyPattern).map(h => parseInt(h));
    if (hours.length === 0) return [];
    
    return hours
      .sort((a, b) => hourlyPattern[b].sessions - hourlyPattern[a].sessions)
      .slice(0, 3)
      .map(hour => ({
        hour,
        sessions: hourlyPattern[hour].sessions,
        avgAccuracy: hourlyPattern[hour].count > 0 ? 
          Math.round((hourlyPattern[hour].totalAccuracy / hourlyPattern[hour].count) * 1000) / 1000 : 0
      }));
  }

  // Find peak activity days
  findPeakDays(dailyPattern) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const days = Object.keys(dailyPattern).map(d => parseInt(d));
    if (days.length === 0) return [];
    
    return days
      .sort((a, b) => dailyPattern[b].sessions - dailyPattern[a].sessions)
      .slice(0, 3)
      .map(day => ({
        day: dayNames[day] || 'Unknown',
        dayOfWeek: day,
        sessions: dailyPattern[day].sessions,
        avgAccuracy: dailyPattern[day].count > 0 ? 
          Math.round((dailyPattern[day].totalAccuracy / dailyPattern[day].count) * 1000) / 1000 : 0
      }));
  }

  // Generate learning insights
  generateLearningInsights(timePatterns, engagementPatterns, performancePatterns) {
    const insights = [];

    if (timePatterns && timePatterns.peakHours.length > 0) {
      insights.push({
        type: 'time_optimization',
        insight: `Student performs best during ${timePatterns.peakHours[0].hour}:00 hour`,
        recommendation: 'Schedule challenging problems during peak performance times',
        confidence: 'medium'
      });
    }

    if (engagementPatterns) {
      if (engagementPatterns.helpSeekingBehavior === 'high') {
        insights.push({
          type: 'help_seeking',
          insight: 'Student frequently requests hints',
          recommendation: 'Consider providing more scaffolding or reducing difficulty',
          confidence: 'high'
        });
      } else if (engagementPatterns.helpSeekingBehavior === 'low') {
        insights.push({
          type: 'independence',
          insight: 'Student works independently with minimal help',
          recommendation: 'Can handle more challenging problems',
          confidence: 'high'
        });
      }
    }

    if (performancePatterns) {
      if (performancePatterns.trend === 'improving') {
        insights.push({
          type: 'progress',
          insight: 'Student shows consistent improvement over time',
          recommendation: 'Continue current approach and gradually increase difficulty',
          confidence: 'high'
        });
      } else if (performancePatterns.trend === 'declining') {
        insights.push({
          type: 'concern',
          insight: 'Performance trending downward',
          recommendation: 'Review recent challenges and provide additional support',
          confidence: 'medium'
        });
      }
    }

    return insights;
  }

  // Generate teacher insights
  generateTeacherInsights(classStats, performanceBreakdown) {
    const insights = [];

    const completionRate = this.calculatePercentage(
      parseInt(classStats.completed_sessions), 
      parseInt(classStats.total_sessions)
    );

    if (completionRate < 70) {
      insights.push({
        type: 'class_completion',
        insight: `Class completion rate is ${completionRate}%, below optimal`,
        recommendation: 'Review problem difficulty and provide additional support',
        priority: 'high'
      });
    }

    const avgAccuracy = parseFloat(classStats.avg_class_accuracy) || 0;
    if (avgAccuracy < 0.6) {
      insights.push({
        type: 'class_performance',
        insight: `Class average accuracy is ${Math.round(avgAccuracy * 100)}%, indicating difficulty`,
        recommendation: 'Consider reducing complexity or adding more scaffolding',
        priority: 'high'
      });
    }

    return insights;
  }

  // Health check
  async healthCheck() {
    try {
      const dbResult = await this.pool.query('SELECT 1 as test');
      
      return {
        status: 'healthy',
        service: 'session-analytics-service',
        features: {
          database: dbResult.rows.length > 0 ? 'connected' : 'disconnected',
          realTimeTracking: 'enabled',
          comprehensiveAnalytics: 'enabled',
          learningPatterns: 'enabled',
          teacherDashboard: 'enabled',
          progressTrends: 'enabled'
        },
        timeWindows: Object.values(TIME_WINDOWS),
        metricTypes: Object.values(METRIC_TYPES),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'session-analytics-service',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
let sessionAnalyticsInstance = null;

const getSessionAnalyticsService = () => {
  if (!sessionAnalyticsInstance) {
    sessionAnalyticsInstance = new SessionAnalyticsService();
  }
  return sessionAnalyticsInstance;
};

module.exports = {
  SessionAnalyticsService,
  getSessionAnalyticsService,
  SessionAnalyticsError,
  TIME_WINDOWS,
  METRIC_TYPES,
  SESSION_STATUS_CATEGORIES
}; 