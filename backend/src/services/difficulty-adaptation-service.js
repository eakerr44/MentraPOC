const { Pool } = require('pg');
const { activityMonitor } = require('./activity-monitor');
const { getProblemSolvingService } = require('./problem-solving-service');

// Difficulty adaptation error class
class DifficultyAdaptationError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = 'DifficultyAdaptationError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Difficulty levels with numeric values for calculations
const DIFFICULTY_LEVELS = {
  VERY_EASY: { name: 'very_easy', value: 1, label: 'Very Easy' },
  EASY: { name: 'easy', value: 2, label: 'Easy' },
  MEDIUM: { name: 'medium', value: 3, label: 'Medium' },
  HARD: { name: 'hard', value: 4, label: 'Hard' },
  VERY_HARD: { name: 'very_hard', value: 5, label: 'Very Hard' }
};

// Performance indicators for adaptation
const PERFORMANCE_INDICATORS = {
  EXCELLENT: { min: 0.9, adjustment: 0.5 },    // Increase difficulty
  GOOD: { min: 0.75, adjustment: 0.2 },        // Slight increase
  SATISFACTORY: { min: 0.6, adjustment: 0 },   // Maintain level
  STRUGGLING: { min: 0.4, adjustment: -0.3 },  // Decrease difficulty
  FAILING: { min: 0, adjustment: -0.6 }        // Significant decrease
};

// Adaptation strategies
const ADAPTATION_STRATEGIES = {
  CONSERVATIVE: 'conservative',     // Slow, gradual changes
  MODERATE: 'moderate',            // Balanced adaptation
  AGGRESSIVE: 'aggressive',        // Quick adaptation to performance
  PERSONALIZED: 'personalized'    // Based on learning profile
};

class DifficultyAdaptationService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  // ============================================
  // CORE ADAPTATION METHODS
  // ============================================

  // Main method to adapt difficulty for a student
  async adaptDifficultyForStudent(studentId, options = {}) {
    try {
      const {
        subject = null,
        timeWindowDays = 14,
        strategy = ADAPTATION_STRATEGIES.MODERATE,
        minSessions = 3,
        includeRecommendations = true
      } = options;

      const client = await this.pool.connect();
      
      try {
        // Get student performance data
        const performanceData = await this.getStudentPerformanceData(
          client, studentId, subject, timeWindowDays
        );

        if (performanceData.totalSessions < minSessions) {
          return {
            adaptationStatus: 'insufficient_data',
            message: `Need at least ${minSessions} sessions for reliable adaptation`,
            currentDifficulty: await this.getCurrentDifficulty(client, studentId, subject),
            performanceData
          };
        }

        // Analyze performance and determine adaptation
        const analysis = this.analyzePerformanceForAdaptation(performanceData, strategy);
        
        // Calculate new difficulty level
        const adaptationResult = await this.calculateDifficultyAdaptation(
          client, studentId, analysis, subject
        );

        // Apply adaptation if significant enough
        if (Math.abs(adaptationResult.difficultyChange) >= 0.1) {
          await this.applyDifficultyAdaptation(client, studentId, adaptationResult, subject);
        }

        // Generate recommendations if requested
        const recommendations = includeRecommendations 
          ? await this.generateAdaptationRecommendations(analysis, adaptationResult)
          : [];

        // Log adaptation activity
        await activityMonitor.logActivity({
          studentId,
          sessionId: `difficulty_adaptation_${Date.now()}`,
          activityType: 'difficulty_adapted',
          details: {
            subject,
            previousDifficulty: adaptationResult.previousDifficulty,
            newDifficulty: adaptationResult.newDifficulty,
            difficultyChange: adaptationResult.difficultyChange,
            reason: analysis.adaptationReason,
            strategy
          },
          severity: 'low'
        });

        return {
          adaptationStatus: 'successful',
          analysis,
          adaptationResult,
          recommendations,
          timestamp: new Date().toISOString()
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error adapting difficulty for student:', error);
      throw new DifficultyAdaptationError(
        'Failed to adapt difficulty for student',
        'ADAPTATION_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Get comprehensive performance data for adaptation analysis
  async getStudentPerformanceData(client, studentId, subject, timeWindowDays) {
    const subjectFilter = subject ? 'AND pt.subject = $3' : '';
    const params = [studentId, timeWindowDays];
    if (subject) params.push(subject);

    const query = `
      WITH session_metrics AS (
        SELECT 
          ps.id,
          ps.accuracy_score,
          ps.completion_time_minutes,
          ps.hints_requested,
          ps.mistakes_made,
          ps.session_status,
          pt.difficulty_level,
          pt.subject,
          ps.started_at,
          -- Calculate session difficulty as numeric value
          CASE pt.difficulty_level
            WHEN 'very_easy' THEN 1
            WHEN 'easy' THEN 2  
            WHEN 'medium' THEN 3
            WHEN 'hard' THEN 4
            WHEN 'very_hard' THEN 5
            ELSE 3
          END as difficulty_numeric,
          -- Calculate performance score (0-1)
          COALESCE(ps.accuracy_score, 0) * 0.6 +
          LEAST(1.0, GREATEST(0.0, (60.0 - ps.completion_time_minutes) / 60.0)) * 0.2 +
          GREATEST(0.0, (5.0 - ps.hints_requested) / 5.0) * 0.1 +
          GREATEST(0.0, (5.0 - ps.mistakes_made) / 5.0) * 0.1 as performance_score
        FROM problem_sessions ps
        JOIN problem_templates pt ON ps.template_id = pt.id
        WHERE ps.student_id = $1 
          AND ps.started_at >= NOW() - INTERVAL '${timeWindowDays} days'
          AND ps.session_status = 'completed'
          ${subjectFilter}
        ORDER BY ps.started_at DESC
      )
      SELECT 
        COUNT(*) as total_sessions,
        AVG(accuracy_score) as avg_accuracy,
        AVG(completion_time_minutes) as avg_completion_time,
        AVG(hints_requested) as avg_hints_used,
        AVG(mistakes_made) as avg_mistakes,
        AVG(difficulty_numeric) as avg_difficulty_attempted,
        AVG(performance_score) as avg_performance_score,
        STDDEV(performance_score) as performance_stability,
        -- Recent vs older performance comparison
        AVG(CASE WHEN started_at >= NOW() - INTERVAL '${Math.ceil(timeWindowDays/2)} days' 
                 THEN performance_score END) as recent_performance,
        AVG(CASE WHEN started_at < NOW() - INTERVAL '${Math.ceil(timeWindowDays/2)} days' 
                 THEN performance_score END) as older_performance,
        -- Difficulty-specific performance
        AVG(CASE WHEN difficulty_numeric <= 2 THEN performance_score END) as easy_performance,
        AVG(CASE WHEN difficulty_numeric = 3 THEN performance_score END) as medium_performance,
        AVG(CASE WHEN difficulty_numeric >= 4 THEN performance_score END) as hard_performance,
        -- Session completion rates by difficulty
        COUNT(CASE WHEN difficulty_numeric <= 2 THEN 1 END) as easy_sessions,
        COUNT(CASE WHEN difficulty_numeric = 3 THEN 1 END) as medium_sessions,
        COUNT(CASE WHEN difficulty_numeric >= 4 THEN 1 END) as hard_sessions,
        -- Trend analysis
        CORR(EXTRACT(EPOCH FROM started_at), performance_score) as performance_trend
      FROM session_metrics
    `;

    const result = await client.query(query, params);
    const data = result.rows[0];

    // Convert string values to numbers and handle nulls
    return {
      totalSessions: parseInt(data.total_sessions) || 0,
      avgAccuracy: parseFloat(data.avg_accuracy) || 0,
      avgCompletionTime: parseFloat(data.avg_completion_time) || 0,
      avgHintsUsed: parseFloat(data.avg_hints_used) || 0,
      avgMistakes: parseFloat(data.avg_mistakes) || 0,
      avgDifficultyAttempted: parseFloat(data.avg_difficulty_attempted) || 3,
      avgPerformanceScore: parseFloat(data.avg_performance_score) || 0,
      performanceStability: parseFloat(data.performance_stability) || 0,
      recentPerformance: parseFloat(data.recent_performance) || 0,
      olderPerformance: parseFloat(data.older_performance) || 0,
      easyPerformance: parseFloat(data.easy_performance) || null,
      mediumPerformance: parseFloat(data.medium_performance) || null,
      hardPerformance: parseFloat(data.hard_performance) || null,
      easySessions: parseInt(data.easy_sessions) || 0,
      mediumSessions: parseInt(data.medium_sessions) || 0,
      hardSessions: parseInt(data.hard_sessions) || 0,
      performanceTrend: parseFloat(data.performance_trend) || 0,
      subject: subject
    };
  }

  // Analyze performance data to determine adaptation needs
  analyzePerformanceForAdaptation(performanceData, strategy) {
    const {
      avgPerformanceScore = 0,
      recentPerformance,
      olderPerformance,
      performanceTrend = 0,
      performanceStability = 0,
      avgDifficultyAttempted = 3
    } = performanceData;

    // Ensure all values are numbers to prevent NaN
    const safeAvgPerformanceScore = isNaN(avgPerformanceScore) ? 0 : avgPerformanceScore;
    const safePerformanceTrend = isNaN(performanceTrend) ? 0 : performanceTrend;
    const safePerformanceStability = isNaN(performanceStability) ? 0 : performanceStability;

    // Determine performance category
    let performanceCategory = 'SATISFACTORY';
    let baseAdjustment = 0;

    for (const [category, threshold] of Object.entries(PERFORMANCE_INDICATORS)) {
      if (safeAvgPerformanceScore >= threshold.min) {
        performanceCategory = category;
        baseAdjustment = threshold.adjustment;
        break;
      }
    }

    // Apply strategy modifiers
    let strategyMultiplier = 1.0;
    switch (strategy) {
      case ADAPTATION_STRATEGIES.CONSERVATIVE:
        strategyMultiplier = 0.5;
        break;
      case ADAPTATION_STRATEGIES.AGGRESSIVE:
        strategyMultiplier = 1.5;
        break;
      case ADAPTATION_STRATEGIES.PERSONALIZED:
        // Adjust based on stability - less stable performance gets smaller changes
        strategyMultiplier = Math.max(0.3, 1.0 - safePerformanceStability);
        break;
    }

    // Factor in performance trend
    const trendAdjustment = safePerformanceTrend * 0.2; // Trend influence

    // Factor in recent vs older performance comparison
    let recentTrendAdjustment = 0;
    if (recentPerformance && olderPerformance && !isNaN(recentPerformance) && !isNaN(olderPerformance)) {
      const improvement = recentPerformance - olderPerformance;
      recentTrendAdjustment = improvement * 0.3;
    }

    // Calculate final adjustment with safety checks
    const rawAdjustment = (baseAdjustment + trendAdjustment + recentTrendAdjustment) * strategyMultiplier;
    const finalAdjustment = isNaN(rawAdjustment) ? 0 : rawAdjustment;

    // Determine adaptation reason
    let adaptationReason = `Performance: ${performanceCategory.toLowerCase()}`;
    if (Math.abs(recentTrendAdjustment) > 0.1) {
      adaptationReason += recentTrendAdjustment > 0 ? ', improving recently' : ', declining recently';
    }
    if (Math.abs(safePerformanceTrend) > 0.1) {
      adaptationReason += safePerformanceTrend > 0 ? ', positive trend' : ', negative trend';
    }

    return {
      performanceCategory,
      avgPerformanceScore: Math.round(safeAvgPerformanceScore * 1000) / 1000,
      baseAdjustment,
      strategyMultiplier,
      trendAdjustment,
      recentTrendAdjustment,
      finalAdjustment: Math.round(finalAdjustment * 1000) / 1000,
      adaptationReason,
      confidence: this.calculateAdaptationConfidence(performanceData),
      recommendedAction: this.determineRecommendedAction(finalAdjustment, performanceCategory)
    };
  }

  // Calculate how much to adjust difficulty based on analysis
  async calculateDifficultyAdaptation(client, studentId, analysis, subject) {
    try {
      // Get current difficulty level
      const currentDifficulty = await this.getCurrentDifficulty(client, studentId, subject);
      const currentDifficultyValue = this.getDifficultyValue(currentDifficulty);

      // Calculate new difficulty value
      const newDifficultyValue = Math.max(1, Math.min(5, 
        currentDifficultyValue + analysis.finalAdjustment
      ));

      const newDifficulty = this.getDifficultyName(newDifficultyValue);
      const difficultyChange = newDifficultyValue - currentDifficultyValue;

      // Calculate adaptation metadata
      const adaptationMetadata = {
        confidenceLevel: analysis.confidence,
        adaptationReason: analysis.adaptationReason,
        performanceCategory: analysis.performanceCategory,
        strategyUsed: 'moderate', // Could be passed from options
        effectiveDate: new Date().toISOString()
      };

      return {
        previousDifficulty: currentDifficulty,
        newDifficulty,
        previousDifficultyValue: currentDifficultyValue,
        newDifficultyValue,
        difficultyChange: Math.round(difficultyChange * 1000) / 1000,
        adaptationMetadata,
        shouldApply: Math.abs(difficultyChange) >= 0.1 && analysis.confidence > 0.6
      };

    } catch (error) {
      console.error('Error calculating difficulty adaptation:', error);
      throw error;
    }
  }

  // ============================================
  // UTILITY AND HELPER METHODS
  // ============================================

  // Get current difficulty preference for student
  async getCurrentDifficulty(client, studentId, subject = null) {
    try {
      const subjectFilter = subject ? 'AND subject = $2' : '';
      const params = [studentId];
      if (subject) params.push(subject);

      const query = `
        SELECT preferred_difficulty, subject
        FROM student_difficulty_preferences 
        WHERE student_id = $1 ${subjectFilter}
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      const result = await client.query(query, params);
      
      if (result.rows.length > 0) {
        return result.rows[0].preferred_difficulty;
      }

      // If no preference exists, determine from recent sessions
      const recentSessionQuery = `
        SELECT pt.difficulty_level
        FROM problem_sessions ps
        JOIN problem_templates pt ON ps.template_id = pt.id
        WHERE ps.student_id = $1
          ${subject ? 'AND pt.subject = $2' : ''}
          AND ps.started_at >= NOW() - INTERVAL '30 days'
        ORDER BY ps.started_at DESC
        LIMIT 5
      `;

      const recentResult = await client.query(recentSessionQuery, params);
      
      if (recentResult.rows.length > 0) {
        // Return most common difficulty from recent sessions
        const difficulties = recentResult.rows.map(row => row.difficulty_level);
        return this.getMostCommonValue(difficulties);
      }

      // Default to medium if no data
      return 'medium';

    } catch (error) {
      console.error('Error getting current difficulty:', error);
      return 'medium';
    }
  }

  // Apply difficulty adaptation to student preferences
  async applyDifficultyAdaptation(client, studentId, adaptationResult, subject) {
    try {
      const { newDifficulty, adaptationMetadata } = adaptationResult;

      // Insert or update difficulty preference
      const upsertQuery = `
        INSERT INTO student_difficulty_preferences (
          student_id, subject, preferred_difficulty, adaptation_metadata, updated_at
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (student_id, subject) 
        DO UPDATE SET 
          preferred_difficulty = EXCLUDED.preferred_difficulty,
          adaptation_metadata = EXCLUDED.adaptation_metadata,
          updated_at = NOW()
      `;

      await client.query(upsertQuery, [
        studentId,
        subject || 'general',
        newDifficulty,
        JSON.stringify(adaptationMetadata)
      ]);

      // Log the adaptation in history
      const historyQuery = `
        INSERT INTO difficulty_adaptation_history (
          student_id, subject, previous_difficulty, new_difficulty, 
          difficulty_change, adaptation_reason, confidence_level, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;

      await client.query(historyQuery, [
        studentId,
        subject || 'general',
        adaptationResult.previousDifficulty,
        newDifficulty,
        adaptationResult.difficultyChange,
        adaptationMetadata.adaptationReason,
        adaptationMetadata.confidenceLevel
      ]);

    } catch (error) {
      console.error('Error applying difficulty adaptation:', error);
      throw error;
    }
  }

  // Generate recommendations based on adaptation analysis
  async generateAdaptationRecommendations(analysis, adaptationResult) {
    const recommendations = [];

    // Performance-based recommendations
    switch (analysis.performanceCategory) {
      case 'EXCELLENT':
        recommendations.push({
          type: 'challenge',
          title: 'Ready for More Challenge',
          description: 'Student is excelling and ready for harder problems',
          priority: 'medium',
          actions: ['Introduce advanced concepts', 'Provide enrichment activities']
        });
        break;

      case 'STRUGGLING':
      case 'FAILING':
        recommendations.push({
          type: 'support',
          title: 'Additional Support Needed',
          description: 'Student may benefit from review and easier problems',
          priority: 'high',
          actions: ['Review fundamental concepts', 'Provide additional scaffolding', 'Consider peer tutoring']
        });
        break;

      case 'GOOD':
        recommendations.push({
          type: 'maintain',
          title: 'Steady Progress',
          description: 'Student is making good progress at current level',
          priority: 'low',
          actions: ['Continue current approach', 'Monitor for consistency']
        });
        break;
    }

    // Trend-based recommendations
    if (analysis.recentTrendAdjustment < -0.2) {
      recommendations.push({
        type: 'intervention',
        title: 'Performance Declining',
        description: 'Recent performance shows concerning decline',
        priority: 'high',
        actions: ['Schedule check-in', 'Review recent challenges', 'Adjust study approach']
      });
    }

    // Confidence-based recommendations
    if (analysis.confidence < 0.5) {
      recommendations.push({
        type: 'caution',
        title: 'Insufficient Data',
        description: 'More practice sessions needed for reliable adaptation',
        priority: 'medium',
        actions: ['Encourage regular practice', 'Monitor closely', 'Delay major changes']
      });
    }

    return recommendations;
  }

  // Calculate confidence level for adaptation decision
  calculateAdaptationConfidence(performanceData) {
    const {
      totalSessions,
      performanceStability,
      avgPerformanceScore
    } = performanceData;

    // Base confidence on amount of data
    let confidence = Math.min(1.0, totalSessions / 10.0); // Max confidence at 10+ sessions

    // Adjust for performance stability (lower volatility = higher confidence)
    if (performanceStability !== null && performanceStability < 1.0) {
      confidence *= (1.0 - Math.min(0.5, performanceStability));
    }

    // Adjust for extreme performance scores (very high/low may indicate ceiling/floor effects)
    if (avgPerformanceScore < 0.1 || avgPerformanceScore > 0.95) {
      confidence *= 0.8;
    }

    return Math.round(confidence * 1000) / 1000;
  }

  // Determine recommended action based on adaptation analysis
  determineRecommendedAction(adjustment, category) {
    if (Math.abs(adjustment) < 0.1) {
      return 'maintain_current_level';
    } else if (adjustment > 0.3) {
      return 'increase_difficulty_significantly';
    } else if (adjustment > 0) {
      return 'increase_difficulty_gradually';
    } else if (adjustment < -0.3) {
      return 'decrease_difficulty_significantly';
    } else {
      return 'decrease_difficulty_gradually';
    }
  }

  // Get difficulty value from name
  getDifficultyValue(difficultyName) {
    for (const level of Object.values(DIFFICULTY_LEVELS)) {
      if (level.name === difficultyName) {
        return level.value;
      }
    }
    return 3; // Default to medium
  }

  // Get difficulty name from value
  getDifficultyName(difficultyValue) {
    const roundedValue = Math.round(difficultyValue);
    for (const level of Object.values(DIFFICULTY_LEVELS)) {
      if (level.value === roundedValue) {
        return level.name;
      }
    }
    return 'medium'; // Default to medium
  }

  // Find most common value in array
  getMostCommonValue(array) {
    const frequency = {};
    array.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    
    return Object.keys(frequency).reduce((a, b) => 
      frequency[a] > frequency[b] ? a : b
    );
  }

  // Health check
  async healthCheck() {
    try {
      const dbResult = await this.pool.query('SELECT 1 as test');
      
      return {
        status: 'healthy',
        service: 'difficulty-adaptation-service',
        features: {
          database: dbResult.rows.length > 0 ? 'connected' : 'disconnected',
          performanceAnalysis: 'enabled',
          adaptiveAlgorithm: 'enabled',
          recommendationEngine: 'enabled'
        },
        difficultyLevels: Object.keys(DIFFICULTY_LEVELS),
        adaptationStrategies: Object.values(ADAPTATION_STRATEGIES),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'difficulty-adaptation-service',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
let difficultyAdaptationInstance = null;

const getDifficultyAdaptationService = () => {
  if (!difficultyAdaptationInstance) {
    difficultyAdaptationInstance = new DifficultyAdaptationService();
  }
  return difficultyAdaptationInstance;
};

module.exports = {
  DifficultyAdaptationService,
  getDifficultyAdaptationService,
  DifficultyAdaptationError,
  DIFFICULTY_LEVELS,
  PERFORMANCE_INDICATORS,
  ADAPTATION_STRATEGIES
}; 