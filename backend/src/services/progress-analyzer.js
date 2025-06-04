const { getEmotionalIntelligenceAnalyzer } = require('./emotional-intelligence-analyzer');
const { activityMonitor } = require('./activity-monitor');

// Progress analysis error class
class ProgressAnalysisError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = 'ProgressAnalysisError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Progress metrics types and categories
const PROGRESS_METRICS = {
  WRITING_GROWTH: {
    name: 'Writing Development',
    metrics: ['word_count', 'vocabulary_diversity', 'entry_frequency', 'writing_complexity'],
    categories: ['fluency', 'vocabulary', 'consistency', 'depth']
  },
  EMOTIONAL_GROWTH: {
    name: 'Emotional Intelligence',
    metrics: ['emotion_identification', 'emotion_regulation', 'empathy_development', 'self_awareness'],
    categories: ['awareness', 'regulation', 'social_skills', 'motivation']
  },
  REFLECTION_DEPTH: {
    name: 'Reflection Quality',
    metrics: ['response_depth', 'critical_thinking', 'self_analysis', 'growth_mindset'],
    categories: ['depth', 'analysis', 'insight', 'mindset']
  },
  LEARNING_CONSISTENCY: {
    name: 'Learning Consistency',
    metrics: ['entry_streaks', 'weekly_patterns', 'goal_achievement', 'engagement_trends'],
    categories: ['frequency', 'patterns', 'goals', 'engagement']
  },
  OVERALL_DEVELOPMENT: {
    name: 'Overall Development',
    metrics: ['composite_score', 'milestone_achievement', 'skill_progression', 'confidence_growth'],
    categories: ['overall', 'milestones', 'skills', 'confidence']
  }
};

// Time period definitions for progress tracking
const TIME_PERIODS = {
  DAILY: { label: 'Daily', days: 1, segments: 30 },
  WEEKLY: { label: 'Weekly', days: 7, segments: 12 },
  MONTHLY: { label: 'Monthly', days: 30, segments: 6 },
  QUARTERLY: { label: 'Quarterly', days: 90, segments: 4 },
  YEARLY: { label: 'Yearly', days: 365, segments: 12 }
};

class ProgressAnalyzer {
  constructor() {
    this.eiAnalyzer = getEmotionalIntelligenceAnalyzer();
    this.progressCache = new Map(); // Cache for expensive calculations
    this.metricsRegistry = PROGRESS_METRICS;
    this.timePeriods = TIME_PERIODS;
  }

  // Main method to generate comprehensive progress analysis
  async analyzeStudentProgress(options = {}) {
    try {
      const {
        studentId,
        journalEntries = [],
        reflectionResponses = [],
        timeWindowDays = 90,
        timePeriod = 'WEEKLY',
        metricTypes = ['WRITING_GROWTH', 'EMOTIONAL_GROWTH', 'REFLECTION_DEPTH'],
        includeProjections = true,
        includeMilestones = true
      } = options;

      // Validate inputs
      if (!studentId) {
        throw new ProgressAnalysisError('studentId is required', 'MISSING_PARAMETER');
      }

      // Process time-series data
      const timeSeriesData = this.processTimeSeriesData(
        journalEntries, 
        reflectionResponses, 
        timeWindowDays, 
        timePeriod
      );

      // Calculate progress metrics for each type
      const progressMetrics = {};
      for (const metricType of metricTypes) {
        progressMetrics[metricType] = await this.calculateProgressMetrics(
          metricType,
          timeSeriesData,
          { studentId, timeWindowDays }
        );
      }

      // Generate growth trends
      const growthTrends = this.calculateGrowthTrends(progressMetrics, timePeriod);

      // Identify milestones and achievements
      const milestones = includeMilestones 
        ? this.identifyMilestones(timeSeriesData, progressMetrics)
        : [];

      // Generate future projections
      const projections = includeProjections 
        ? this.generateProgressProjections(growthTrends, timePeriod)
        : {};

      // Calculate overall progress score
      const overallProgress = this.calculateOverallProgress(progressMetrics);

      // Generate insights and recommendations
      const insights = this.generateProgressInsights(progressMetrics, growthTrends, milestones);

      // Log progress analysis activity
      await this.logProgressAnalysis(studentId, {
        timeWindow: timeWindowDays,
        metricTypes,
        dataPoints: timeSeriesData.totalDataPoints,
        insights: insights.length
      });

      return {
        studentId,
        analysisDate: new Date().toISOString(),
        timeWindow: { days: timeWindowDays, period: timePeriod },
        timeSeriesData: {
          periods: timeSeriesData.periods.length,
          totalDataPoints: timeSeriesData.totalDataPoints,
          dateRange: timeSeriesData.dateRange
        },
        progressMetrics,
        growthTrends,
        milestones,
        projections,
        overallProgress,
        insights,
        visualizationData: this.generateVisualizationData(progressMetrics, growthTrends, timePeriod),
        metadata: {
          calculationTime: new Date().toISOString(),
          cacheUsed: false,
          confidence: this.calculateAnalysisConfidence(timeSeriesData, progressMetrics)
        }
      };

    } catch (error) {
      console.error('❌ Progress analysis failed:', error);
      throw error;
    }
  }

  // Process raw data into time-series format
  processTimeSeriesData(journalEntries, reflectionResponses, timeWindowDays, timePeriod) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (timeWindowDays * 24 * 60 * 60 * 1000));
    
    const period = this.timePeriods[timePeriod];
    const periodLength = period.days * 24 * 60 * 60 * 1000; // milliseconds
    const periods = [];

    // Create time periods
    for (let i = 0; i < period.segments; i++) {
      const periodEnd = new Date(endDate.getTime() - (i * periodLength));
      const periodStart = new Date(periodEnd.getTime() - periodLength);
      
      if (periodStart >= startDate) {
        periods.unshift({
          id: i,
          startDate: periodStart,
          endDate: periodEnd,
          label: this.formatPeriodLabel(periodStart, periodEnd, timePeriod),
          journalEntries: [],
          reflectionResponses: [],
          metrics: {}
        });
      }
    }

    // Distribute data into periods
    let totalDataPoints = 0;

    journalEntries.forEach(entry => {
      const entryDate = new Date(entry.createdAt);
      const period = periods.find(p => entryDate >= p.startDate && entryDate < p.endDate);
      if (period) {
        period.journalEntries.push(entry);
        totalDataPoints++;
      }
    });

    reflectionResponses.forEach(response => {
      const responseDate = new Date(response.respondedAt);
      const period = periods.find(p => responseDate >= p.startDate && responseDate < p.endDate);
      if (period) {
        period.reflectionResponses.push(response);
        totalDataPoints++;
      }
    });

    return {
      periods,
      totalDataPoints,
      dateRange: { start: startDate, end: endDate },
      timePeriod,
      segmentCount: periods.length
    };
  }

  // Calculate specific progress metrics
  async calculateProgressMetrics(metricType, timeSeriesData, options = {}) {
    const metricConfig = this.metricsRegistry[metricType];
    if (!metricConfig) {
      throw new ProgressAnalysisError(`Unknown metric type: ${metricType}`, 'INVALID_METRIC');
    }

    const metrics = {};

    switch (metricType) {
      case 'WRITING_GROWTH':
        metrics.word_count = this.calculateWordCountGrowth(timeSeriesData);
        metrics.vocabulary_diversity = this.calculateVocabularyGrowth(timeSeriesData);
        metrics.entry_frequency = this.calculateEntryFrequency(timeSeriesData);
        metrics.writing_complexity = this.calculateWritingComplexity(timeSeriesData);
        break;

      case 'EMOTIONAL_GROWTH':
        metrics.emotion_identification = await this.calculateEmotionIdentificationGrowth(timeSeriesData, options);
        metrics.emotion_regulation = await this.calculateEmotionRegulationGrowth(timeSeriesData, options);
        metrics.empathy_development = await this.calculateEmpathyGrowth(timeSeriesData, options);
        metrics.self_awareness = await this.calculateSelfAwarenessGrowth(timeSeriesData, options);
        break;

      case 'REFLECTION_DEPTH':
        metrics.response_depth = this.calculateResponseDepth(timeSeriesData);
        metrics.critical_thinking = this.calculateCriticalThinking(timeSeriesData);
        metrics.self_analysis = this.calculateSelfAnalysis(timeSeriesData);
        metrics.growth_mindset = this.calculateGrowthMindset(timeSeriesData);
        break;

      case 'LEARNING_CONSISTENCY':
        metrics.entry_streaks = this.calculateEntryStreaks(timeSeriesData);
        metrics.weekly_patterns = this.calculateWeeklyPatterns(timeSeriesData);
        metrics.goal_achievement = this.calculateGoalAchievement(timeSeriesData);
        metrics.engagement_trends = this.calculateEngagementTrends(timeSeriesData);
        break;

      case 'OVERALL_DEVELOPMENT':
        metrics.composite_score = this.calculateCompositeScore(timeSeriesData);
        metrics.milestone_achievement = this.calculateMilestoneAchievement(timeSeriesData);
        metrics.skill_progression = this.calculateSkillProgression(timeSeriesData);
        metrics.confidence_growth = this.calculateConfidenceGrowth(timeSeriesData);
        break;
    }

    // Add metadata to each metric
    Object.keys(metrics).forEach(key => {
      if (metrics[key]) {
        metrics[key].metricType = metricType;
        metrics[key].calculatedAt = new Date().toISOString();
        metrics[key].confidence = this.calculateMetricConfidence(metrics[key]);
      }
    });

    return {
      type: metricType,
      name: metricConfig.name,
      categories: metricConfig.categories,
      metrics,
      summary: this.summarizeMetrics(metrics),
      trends: this.calculateMetricTrends(metrics)
    };
  }

  // Calculate growth trends across metrics
  calculateGrowthTrends(progressMetrics, timePeriod) {
    const trends = {};

    Object.keys(progressMetrics).forEach(metricType => {
      const metrics = progressMetrics[metricType].metrics;
      trends[metricType] = {};

      Object.keys(metrics).forEach(metricName => {
        const metric = metrics[metricName];
        if (metric.values && metric.values.length > 1) {
          trends[metricType][metricName] = {
            trend: this.calculateTrendDirection(metric.values),
            slope: this.calculateTrendSlope(metric.values),
            correlation: this.calculateTrendCorrelation(metric.values),
            volatility: this.calculateTrendVolatility(metric.values),
            prediction: this.predictNextValue(metric.values)
          };
        }
      });
    });

    return trends;
  }

  // Identify significant milestones and achievements
  identifyMilestones(timeSeriesData, progressMetrics) {
    const milestones = [];

    // Writing milestones
    const writingMetrics = progressMetrics.WRITING_GROWTH?.metrics;
    if (writingMetrics) {
      if (writingMetrics.word_count?.current > 500) {
        milestones.push({
          type: 'writing_milestone',
          title: 'Prolific Writer',
          description: 'Reached 500+ words in a single entry',
          achievedDate: this.findAchievementDate(timeSeriesData, 'word_count', 500),
          category: 'writing',
          significance: 'medium'
        });
      }

      if (writingMetrics.entry_frequency?.streak > 7) {
        milestones.push({
          type: 'consistency_milestone',
          title: 'Weekly Warrior',
          description: 'Maintained a 7-day writing streak',
          achievedDate: this.findStreakAchievementDate(timeSeriesData, 7),
          category: 'consistency',
          significance: 'high'
        });
      }
    }

    // Emotional intelligence milestones
    const emotionalMetrics = progressMetrics.EMOTIONAL_GROWTH?.metrics;
    if (emotionalMetrics) {
      if (emotionalMetrics.emotion_identification?.growth > 0.3) {
        milestones.push({
          type: 'emotional_milestone',
          title: 'Emotion Detective',
          description: 'Significant improvement in emotion identification',
          achievedDate: this.findGrowthAchievementDate(timeSeriesData, 'emotion_identification'),
          category: 'emotional',
          significance: 'high'
        });
      }
    }

    // Reflection milestones
    const reflectionMetrics = progressMetrics.REFLECTION_DEPTH?.metrics;
    if (reflectionMetrics) {
      if (reflectionMetrics.response_depth?.average > 0.7) {
        milestones.push({
          type: 'reflection_milestone',
          title: 'Deep Thinker',
          description: 'Consistently writing thoughtful, deep reflections',
          achievedDate: this.findDepthAchievementDate(timeSeriesData),
          category: 'reflection',
          significance: 'medium'
        });
      }
    }

    return milestones.sort((a, b) => new Date(b.achievedDate) - new Date(a.achievedDate));
  }

  // Generate future progress projections
  generateProgressProjections(growthTrends, timePeriod) {
    const projections = {};
    const futurePeriods = 3; // Project 3 periods into the future

    Object.keys(growthTrends).forEach(metricType => {
      projections[metricType] = {};
      
      Object.keys(growthTrends[metricType]).forEach(metricName => {
        const trend = growthTrends[metricType][metricName];
        
        projections[metricType][metricName] = {
          projectedValues: this.projectFutureValues(trend, futurePeriods),
          confidence: this.calculateProjectionConfidence(trend),
          scenarios: this.generateScenarios(trend),
          recommendations: this.generateProjectionRecommendations(trend, metricName)
        };
      });
    });

    return projections;
  }

  // Calculate overall progress score
  calculateOverallProgress(progressMetrics) {
    const weights = {
      WRITING_GROWTH: 0.25,
      EMOTIONAL_GROWTH: 0.30,
      REFLECTION_DEPTH: 0.25,
      LEARNING_CONSISTENCY: 0.20
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.keys(progressMetrics).forEach(metricType => {
      if (weights[metricType]) {
        const metrics = progressMetrics[metricType].metrics;
        const avgScore = this.calculateAverageMetricScore(metrics);
        totalScore += avgScore * weights[metricType];
        totalWeight += weights[metricType];
      }
    });

    const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
      score: Math.round(overallScore * 100) / 100,
      level: this.getProgressLevel(overallScore),
      components: this.getProgressComponents(progressMetrics, weights),
      interpretation: this.interpretOverallProgress(overallScore),
      nextMilestone: this.getNextMilestone(overallScore)
    };
  }

  // Generate actionable insights
  generateProgressInsights(progressMetrics, growthTrends, milestones) {
    const insights = [];

    // Analyze strongest growth areas
    const strongestGrowth = this.identifyStrongestGrowth(growthTrends);
    if (strongestGrowth) {
      insights.push({
        type: 'strength',
        category: 'growth',
        title: `Excellent progress in ${strongestGrowth.area}`,
        description: `You've shown remarkable improvement in ${strongestGrowth.metric}`,
        impact: 'high',
        actionable: true,
        recommendations: [`Continue focusing on ${strongestGrowth.area}`, 'Share your progress with your teacher']
      });
    }

    // Identify areas needing attention
    const needsAttention = this.identifyAreasNeedingAttention(progressMetrics);
    needsAttention.forEach(area => {
      insights.push({
        type: 'opportunity',
        category: 'improvement',
        title: `Opportunity to grow in ${area.name}`,
        description: area.description,
        impact: 'medium',
        actionable: true,
        recommendations: area.recommendations
      });
    });

    // Recent milestone achievements
    const recentMilestones = milestones.filter(m => 
      new Date(m.achievedDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    recentMilestones.forEach(milestone => {
      insights.push({
        type: 'achievement',
        category: 'milestone',
        title: `🎉 ${milestone.title}`,
        description: milestone.description,
        impact: milestone.significance,
        actionable: false,
        recommendations: [`Celebrate this achievement!`, 'Set your next goal']
      });
    });

    return insights;
  }

  // Generate data for visualization components
  generateVisualizationData(progressMetrics, growthTrends, timePeriod) {
    return {
      lineCharts: this.generateLineChartData(progressMetrics),
      barCharts: this.generateBarChartData(progressMetrics),
      radarCharts: this.generateRadarChartData(progressMetrics),
      heatmaps: this.generateHeatmapData(progressMetrics, timePeriod),
      progressBars: this.generateProgressBarData(progressMetrics),
      trendIndicators: this.generateTrendIndicatorData(growthTrends),
      timelineData: this.generateTimelineData(progressMetrics)
    };
  }

  // Specific metric calculation methods
  calculateWordCountGrowth(timeSeriesData) {
    const values = timeSeriesData.periods.map(period => {
      const totalWords = period.journalEntries.reduce((sum, entry) => sum + (entry.wordCount || 0), 0);
      return { period: period.label, value: totalWords, date: period.endDate };
    });

    return {
      values,
      current: values[values.length - 1]?.value || 0,
      average: values.reduce((sum, v) => sum + v.value, 0) / values.length,
      growth: this.calculateGrowthRate(values),
      trend: this.calculateTrendDirection(values)
    };
  }

  calculateVocabularyGrowth(timeSeriesData) {
    const values = timeSeriesData.periods.map(period => {
      const allWords = period.journalEntries
        .map(entry => entry.plainTextContent || '')
        .join(' ')
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      const uniqueWords = new Set(allWords);
      return { period: period.label, value: uniqueWords.size, date: period.endDate };
    });

    return {
      values,
      current: values[values.length - 1]?.value || 0,
      average: values.reduce((sum, v) => sum + v.value, 0) / values.length,
      growth: this.calculateGrowthRate(values),
      diversity: this.calculateVocabularyDiversity(values)
    };
  }

  async calculateEmotionIdentificationGrowth(timeSeriesData, options) {
    const values = await Promise.all(timeSeriesData.periods.map(async period => {
      const entries = period.journalEntries.filter(entry => entry.emotionalState);
      const avgConfidence = entries.length > 0 
        ? entries.reduce((sum, entry) => sum + (entry.emotionalState.confidence || 0.5), 0) / entries.length
        : 0;
      
      return { period: period.label, value: avgConfidence, date: period.endDate };
    }));

    return {
      values,
      current: values[values.length - 1]?.value || 0,
      average: values.reduce((sum, v) => sum + v.value, 0) / values.length,
      growth: this.calculateGrowthRate(values),
      confidence: this.calculateMetricConfidence({ values })
    };
  }

  // Helper methods for calculations
  calculateGrowthRate(values) {
    if (values.length < 2) return 0;
    const first = values[0].value;
    const last = values[values.length - 1].value;
    return first > 0 ? ((last - first) / first) * 100 : 0;
  }

  calculateTrendDirection(values) {
    if (values.length < 3) return 'stable';
    
    const recentValues = values.slice(-3);
    const slope = this.calculateTrendSlope(recentValues);
    
    if (slope > 0.1) return 'increasing';
    if (slope < -0.1) return 'decreasing';
    return 'stable';
  }

  calculateTrendSlope(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v.value, 0);
    const sumXY = values.reduce((sum, v, i) => sum + (i * v.value), 0);
    const sumXX = values.reduce((sum, _, i) => sum + (i * i), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  // Additional helper methods would continue here...
  // [Implementation of remaining calculation methods]

  formatPeriodLabel(startDate, endDate, timePeriod) {
    switch (timePeriod) {
      case 'DAILY':
        return startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'WEEKLY':
        return `Week of ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      case 'MONTHLY':
        return startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      default:
        return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }
  }

  async logProgressAnalysis(studentId, analysisData) {
    try {
      await activityMonitor.logActivity({
        studentId,
        sessionId: `progress_analysis_${Date.now()}`,
        activityType: 'progress_analysis_generated',
        details: analysisData,
        severity: 'low',
        context: {
          feature: 'progress_visualization',
          analysisType: 'comprehensive'
        }
      });
    } catch (error) {
      console.warn('⚠️ Could not log progress analysis activity:', error.message);
    }
  }

  // Health check for the progress analyzer
  async healthCheck() {
    try {
      const eiHealth = await this.eiAnalyzer.healthCheck();
      
      return {
        status: 'healthy',
        service: 'progress-analyzer',
        dependencies: {
          emotionalIntelligenceAnalyzer: eiHealth.status,
          activityMonitor: true
        },
        capabilities: {
          metricTypes: Object.keys(this.metricsRegistry).length,
          timePeriods: Object.keys(this.timePeriods).length,
          cacheSize: this.progressCache.size
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'progress-analyzer',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Stub implementations for remaining methods
  calculateEntryFrequency(timeSeriesData) {
    return { values: [], current: 0, average: 0, streak: 0 };
  }

  calculateWritingComplexity(timeSeriesData) {
    return { values: [], current: 0, average: 0, growth: 0 };
  }

  calculateAnalysisConfidence(timeSeriesData, progressMetrics) {
    return Math.min(1.0, timeSeriesData.totalDataPoints / 20);
  }

  calculateMetricConfidence(metric) {
    return 0.8; // Default confidence
  }

  summarizeMetrics(metrics) {
    return { total: Object.keys(metrics).length, averageGrowth: 0 };
  }

  calculateMetricTrends(metrics) {
    return {};
  }

  // Additional stub methods for completeness...
  calculateTrendCorrelation(values) { return 0.5; }
  calculateTrendVolatility(values) { return 0.2; }
  predictNextValue(values) { return values[values.length - 1]?.value || 0; }
  findAchievementDate(data, metric, threshold) { return new Date().toISOString(); }
  findStreakAchievementDate(data, days) { return new Date().toISOString(); }
  findGrowthAchievementDate(data, metric) { return new Date().toISOString(); }
  findDepthAchievementDate(data) { return new Date().toISOString(); }
  projectFutureValues(trend, periods) { return []; }
  calculateProjectionConfidence(trend) { return 0.7; }
  generateScenarios(trend) { return {}; }
  generateProjectionRecommendations(trend, metric) { return []; }
  calculateAverageMetricScore(metrics) { return 0.5; }
  getProgressLevel(score) { return score > 0.7 ? 'Advanced' : score > 0.4 ? 'Developing' : 'Beginning'; }
  getProgressComponents(metrics, weights) { return {}; }
  interpretOverallProgress(score) { return 'Making good progress'; }
  getNextMilestone(score) { return 'Continue consistent practice'; }
  identifyStrongestGrowth(trends) { return null; }
  identifyAreasNeedingAttention(metrics) { return []; }
  generateLineChartData(metrics) { return {}; }
  generateBarChartData(metrics) { return {}; }
  generateRadarChartData(metrics) { return {}; }
  generateHeatmapData(metrics, period) { return {}; }
  generateProgressBarData(metrics) { return {}; }
  generateTrendIndicatorData(trends) { return {}; }
  generateTimelineData(metrics) { return {}; }
  calculateVocabularyDiversity(values) { return 0.5; }
}

// Singleton instance
let progressAnalyzerInstance = null;

const getProgressAnalyzer = () => {
  if (!progressAnalyzerInstance) {
    progressAnalyzerInstance = new ProgressAnalyzer();
  }
  return progressAnalyzerInstance;
};

module.exports = {
  ProgressAnalyzer,
  getProgressAnalyzer,
  ProgressAnalysisError,
  PROGRESS_METRICS,
  TIME_PERIODS
}; 