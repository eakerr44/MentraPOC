const { 
  storeContext, 
  queryContext, 
  getStudentContext,
  testChromaConnection 
} = require('../config/vector-db');
const crypto = require('crypto');

// Context types for different learning interactions
const CONTEXT_TYPES = {
  JOURNAL_ENTRY: 'journal_entry',
  PROBLEM_SOLVING: 'problem_solving',
  REFLECTION: 'reflection',
  MISTAKE_ANALYSIS: 'mistake_analysis',
  LEARNING_GOAL: 'learning_goal',
  EMOTIONAL_STATE: 'emotional_state',
  SCAFFOLDING_INTERACTION: 'scaffolding_interaction'
};

// Student development levels for age-appropriate scaffolding
const DEVELOPMENT_LEVELS = {
  EARLY_ELEMENTARY: { ageRange: [5, 8], cognitiveStage: 'concrete_operational_early' },
  LATE_ELEMENTARY: { ageRange: [9, 11], cognitiveStage: 'concrete_operational_late' },
  MIDDLE_SCHOOL: { ageRange: [12, 14], cognitiveStage: 'formal_operational_early' },
  HIGH_SCHOOL: { ageRange: [15, 18], cognitiveStage: 'formal_operational_mature' }
};

// Performance trend analysis thresholds
const PERFORMANCE_THRESHOLDS = {
  STRUGGLING: 0.4,
  DEVELOPING: 0.6,
  PROFICIENT: 0.8,
  ADVANCED: 0.9
};

// Generate embedding for text (placeholder - in real implementation would use actual embedding model)
const generateEmbedding = async (text) => {
  // TODO: Replace with actual embedding generation using sentence-transformers or OpenAI embeddings
  // For now, creating a simple hash-based pseudo-embedding for development
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  
  // Convert hash to array of floats between -1 and 1 (384 dimensions for testing)
  const embedding = [];
  for (let i = 0; i < 384; i += 8) {
    const chunk = hash.slice(i, i + 8);
    const value = (parseInt(chunk, 16) / 0xffffffff - 0.5) * 2;
    embedding.push(isNaN(value) ? 0 : value);
  }
  
  return embedding.slice(0, 384); // Ensure exactly 384 dimensions
};

// Analyze student's learning patterns and performance trends
const analyzeLearningPatterns = (contexts, timeWindowDays = 30) => {
  const now = new Date();
  const timeWindow = new Date(now.getTime() - (timeWindowDays * 24 * 60 * 60 * 1000));
  
  // Filter contexts within time window
  const recentContexts = contexts.filter(ctx => {
    const contextDate = new Date(ctx.timestamp);
    return contextDate >= timeWindow;
  });

  // Analyze performance trends
  const performanceHistory = recentContexts
    .filter(ctx => ctx.performance_metrics && typeof ctx.performance_metrics.accuracy === 'number')
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map(ctx => ({
      date: ctx.timestamp,
      accuracy: ctx.performance_metrics.accuracy,
      subject: ctx.subject,
      difficulty: ctx.difficulty,
      contextType: ctx.context_type
    }));

  // Calculate performance trend (improving, stable, declining)
  let performanceTrend = 'stable';
  if (performanceHistory.length >= 3) {
    const recent = performanceHistory.slice(-3);
    const early = performanceHistory.slice(0, 3);
    const recentAvg = recent.reduce((sum, p) => sum + p.accuracy, 0) / recent.length;
    const earlyAvg = early.reduce((sum, p) => sum + p.accuracy, 0) / early.length;
    
    if (recentAvg > earlyAvg + 0.1) performanceTrend = 'improving';
    else if (recentAvg < earlyAvg - 0.1) performanceTrend = 'declining';
  }

  // Identify common struggle areas
  const struggleAreas = recentContexts
    .filter(ctx => ctx.performance_metrics?.accuracy < PERFORMANCE_THRESHOLDS.STRUGGLING)
    .reduce((areas, ctx) => {
      const key = `${ctx.subject}-${ctx.difficulty}`;
      areas[key] = (areas[key] || 0) + 1;
      return areas;
    }, {});

  // Identify strength areas
  const strengthAreas = recentContexts
    .filter(ctx => ctx.performance_metrics?.accuracy > PERFORMANCE_THRESHOLDS.PROFICIENT)
    .reduce((areas, ctx) => {
      const key = `${ctx.subject}-${ctx.difficulty}`;
      areas[key] = (areas[key] || 0) + 1;
      return areas;
    }, {});

  // Analyze emotional patterns
  const emotionalPatterns = recentContexts
    .filter(ctx => ctx.emotional_state)
    .reduce((patterns, ctx) => {
      patterns[ctx.emotional_state] = (patterns[ctx.emotional_state] || 0) + 1;
      return patterns;
    }, {});

  // Calculate engagement level
  const totalSessions = recentContexts.length;
  const activeDays = [...new Set(recentContexts.map(ctx => 
    new Date(ctx.timestamp).toDateString()
  ))].length;
  const engagementLevel = totalSessions > 0 ? Math.min(activeDays / Math.min(timeWindowDays, 14), 1) : 0;

  return {
    timeWindow: timeWindowDays,
    totalInteractions: recentContexts.length,
    performanceTrend,
    averagePerformance: performanceHistory.length > 0 
      ? performanceHistory.reduce((sum, p) => sum + p.accuracy, 0) / performanceHistory.length 
      : null,
    struggleAreas: Object.entries(struggleAreas)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3),
    strengthAreas: Object.entries(strengthAreas)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3),
    emotionalPatterns,
    engagementLevel,
    performanceHistory: performanceHistory.slice(-10) // Last 10 data points
  };
};

// Determine student's development level for age-appropriate scaffolding
const assessDevelopmentLevel = (studentAge, performanceHistory = []) => {
  // Determine base development level from age
  let developmentLevel = DEVELOPMENT_LEVELS.MIDDLE_SCHOOL; // Default
  
  for (const [level, info] of Object.entries(DEVELOPMENT_LEVELS)) {
    if (studentAge >= info.ageRange[0] && studentAge <= info.ageRange[1]) {
      developmentLevel = { level, ...info };
      break;
    }
  }

  // Adjust based on performance patterns
  const avgPerformance = performanceHistory.length > 0
    ? performanceHistory.reduce((sum, p) => sum + p.accuracy, 0) / performanceHistory.length
    : 0.5;

  // Advanced students might be ready for higher-level scaffolding
  const adjustmentFactor = avgPerformance > PERFORMANCE_THRESHOLDS.ADVANCED ? 'advanced' :
                          avgPerformance < PERFORMANCE_THRESHOLDS.STRUGGLING ? 'support_needed' :
                          'appropriate';

  return {
    ...developmentLevel,
    adjustmentFactor,
    recommendedScaffoldingStyle: getScaffoldingStyle(developmentLevel, adjustmentFactor)
  };
};

// Get appropriate scaffolding style based on development level
const getScaffoldingStyle = (developmentLevel, adjustmentFactor) => {
  const baseStyles = {
    EARLY_ELEMENTARY: {
      questionStyle: 'simple_concrete',
      explanationDepth: 'basic',
      abstractionLevel: 'low',
      exampleTypes: 'visual_concrete'
    },
    LATE_ELEMENTARY: {
      questionStyle: 'structured_guided',
      explanationDepth: 'moderate',
      abstractionLevel: 'medium_low',
      exampleTypes: 'concrete_with_patterns'
    },
    MIDDLE_SCHOOL: {
      questionStyle: 'socratic_guided',
      explanationDepth: 'detailed',
      abstractionLevel: 'medium',
      exampleTypes: 'abstract_with_concrete'
    },
    HIGH_SCHOOL: {
      questionStyle: 'socratic_independent',
      explanationDepth: 'comprehensive',
      abstractionLevel: 'high',
      exampleTypes: 'abstract_conceptual'
    }
  };

  let style = baseStyles[developmentLevel.level] || baseStyles.MIDDLE_SCHOOL;

  // Adjust style based on performance
  if (adjustmentFactor === 'advanced') {
    style.explanationDepth = style.explanationDepth === 'basic' ? 'moderate' : 'comprehensive';
    style.questionStyle = style.questionStyle.replace('simple_', 'structured_');
  } else if (adjustmentFactor === 'support_needed') {
    style.explanationDepth = 'basic';
    style.abstractionLevel = 'low';
    style.questionStyle = 'simple_concrete';
  }

  return style;
};

// Calculate adaptive context weights based on relevance, recency, and success
const calculateContextWeights = (contexts, currentContext, studentPatterns) => {
  return contexts.map(ctx => {
    let weight = 1.0;

    // Recency weight (more recent = higher weight)
    const daysSince = Math.max(1, (Date.now() - new Date(ctx.timestamp)) / (1000 * 60 * 60 * 24));
    const recencyWeight = Math.max(0.1, 1 / Math.log(daysSince + 1));

    // Success weight (successful interactions = higher weight)
    const successWeight = ctx.performance_metrics?.accuracy 
      ? Math.max(0.3, ctx.performance_metrics.accuracy) 
      : 0.7; // Neutral if no performance data

    // Relevance weight (similar content/subject = higher weight)
    const relevanceWeight = ctx.distance ? Math.max(0.2, 1 - ctx.distance) : 0.8;

    // Struggle area weight (if current topic is a struggle area, weight helpful contexts higher)
    const currentTopic = `${currentContext.subject}-${currentContext.difficulty}`;
    const isRelevantToStruggles = studentPatterns.struggleAreas.some(([area]) => 
      area === currentTopic || ctx.subject === currentContext.subject
    );
    const struggleWeight = isRelevantToStruggles && successWeight > 0.6 ? 1.5 : 1.0;

    // Emotional alignment weight (positive emotional states = higher weight)
    const positiveEmotions = ['engaged', 'confident', 'curious', 'excited'];
    const emotionalWeight = ctx.emotional_state && positiveEmotions.includes(ctx.emotional_state) 
      ? 1.2 : 1.0;

    weight = recencyWeight * successWeight * relevanceWeight * struggleWeight * emotionalWeight;

    return {
      ...ctx,
      weight,
      weightFactors: {
        recency: recencyWeight,
        success: successWeight,
        relevance: relevanceWeight,
        struggle: struggleWeight,
        emotional: emotionalWeight
      }
    };
  });
};

// Store a learning interaction context
const storeLearningContext = async (contextData) => {
  try {
    const {
      studentId,
      content,
      contextType,
      sessionId,
      subject,
      difficulty,
      emotional_state,
      performance_metrics,
      additional_metadata = {}
    } = contextData;

    // Validate required fields
    if (!studentId || !content || !contextType) {
      throw new Error('Missing required fields: studentId, content, or contextType');
    }

    // Generate embedding for the content
    const embedding = await generateEmbedding(content);

    // Create unique ID for this context
    const contextId = `${studentId}_${contextType}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Prepare metadata
    const metadata = {
      student_id: studentId,
      content_type: contextType,
      session_id: sessionId || null,
      subject: subject || null,
      difficulty: difficulty || null,
      emotional_state: emotional_state || null,
      performance_metrics: performance_metrics || {},
      ...additional_metadata
    };

    // Store in vector database
    const result = await storeContext({
      id: contextId,
      content,
      embedding,
      metadata
    });

    console.log(`📚 Stored learning context for student ${studentId}: ${contextType}`);
    return { ...result, contextId, contextType };
  } catch (error) {
    console.error('❌ Failed to store learning context:', error);
    throw error;
  }
};

// Enhanced intelligent context retrieval with learning pattern analysis
const getIntelligentLearningHistory = async (studentId, currentContent, options = {}) => {
  try {
    const {
      maxContexts = 8,
      contextTypes = null,
      timeWindowDays = 30,
      includeEmotionalState = true,
      includePerformanceMetrics = true,
      studentAge = null,
      currentSubject = null,
      currentDifficulty = null
    } = options;

    // Generate embedding for current content to find similar past interactions
    const queryEmbedding = await generateEmbedding(currentContent);

    // Query for similar contexts
    const whereClause = { student_id: studentId };
    if (contextTypes && contextTypes.length > 0) {
      whereClause.content_type = { $in: contextTypes };
    }

    const similarContexts = await queryContext(queryEmbedding, {
      nResults: maxContexts * 2, // Get more to allow for intelligent filtering
      where: whereClause,
      include: ['documents', 'metadatas', 'distances']
    });

    // Get recent contexts for the student
    const recentContexts = await getStudentContext(studentId, {
      limit: maxContexts * 2,
      contentType: contextTypes ? contextTypes[0] : null
    });

    // Process and combine contexts
    const allContexts = [];

    // Add similar contexts with distance information
    similarContexts.documents.forEach((doc, index) => {
      const metadata = similarContexts.metadatas[index];
      const distance = similarContexts.distances[index];
      
      allContexts.push({
        type: 'similar_interaction',
        content: doc,
        context_type: metadata.content_type,
        distance: distance,
        timestamp: metadata.timestamp,
        subject: metadata.subject,
        difficulty: metadata.difficulty,
        emotional_state: includeEmotionalState ? metadata.emotional_state : null,
        performance_metrics: includePerformanceMetrics ? metadata.performance_metrics : null
      });
    });

    // Add recent contexts
    recentContexts.contexts.forEach((doc, index) => {
      const metadata = recentContexts.metadata[index];
      
      // Avoid duplicates
      const isDuplicate = allContexts.some(ctx => 
        ctx.content === doc && ctx.timestamp === metadata.timestamp
      );
      
      if (!isDuplicate) {
        allContexts.push({
          type: 'recent_interaction',
          content: doc,
          context_type: metadata.content_type,
          timestamp: metadata.timestamp,
          subject: metadata.subject,
          difficulty: metadata.difficulty,
          emotional_state: includeEmotionalState ? metadata.emotional_state : null,
          performance_metrics: includePerformanceMetrics ? metadata.performance_metrics : null
        });
      }
    });

    // Analyze learning patterns
    const learningPatterns = analyzeLearningPatterns(allContexts, timeWindowDays);

    // Assess development level if age provided
    const developmentAssessment = studentAge 
      ? assessDevelopmentLevel(studentAge, learningPatterns.performanceHistory)
      : null;

    // Calculate adaptive weights for each context
    const currentContext = { 
      subject: currentSubject, 
      difficulty: currentDifficulty, 
      content: currentContent 
    };
    
    const weightedContexts = calculateContextWeights(allContexts, currentContext, learningPatterns);

    // Sort by weight and select top contexts
    const topContexts = weightedContexts
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxContexts);

    return {
      studentId,
      totalContextsAnalyzed: allContexts.length,
      selectedContexts: topContexts.length,
      contexts: topContexts,
      learningPatterns,
      developmentAssessment,
      queryContent: currentContent,
      recommendations: generateScaffoldingRecommendations(learningPatterns, developmentAssessment, topContexts)
    };
  } catch (error) {
    console.error('❌ Failed to retrieve intelligent learning history:', error);
    throw error;
  }
};

// Generate scaffolding recommendations based on learning analysis
const generateScaffoldingRecommendations = (patterns, development, contexts) => {
  const recommendations = {
    scaffoldingApproach: 'balanced',
    focusAreas: [],
    avoidanceAreas: [],
    emotionalConsiderations: [],
    adaptiveStrategies: []
  };

  // Performance-based recommendations
  if (patterns.performanceTrend === 'declining') {
    recommendations.scaffoldingApproach = 'supportive';
    recommendations.adaptiveStrategies.push('Provide more step-by-step guidance');
    recommendations.adaptiveStrategies.push('Use confidence-building positive reinforcement');
  } else if (patterns.performanceTrend === 'improving') {
    recommendations.scaffoldingApproach = 'challenging';
    recommendations.adaptiveStrategies.push('Introduce slightly more complex problems');
    recommendations.adaptiveStrategies.push('Encourage independent problem-solving');
  }

  // Struggle area recommendations
  patterns.struggleAreas.forEach(([area, frequency]) => {
    recommendations.focusAreas.push(`Extra support needed in ${area} (${frequency} recent difficulties)`);
  });

  // Strength area leverage
  patterns.strengthAreas.forEach(([area, frequency]) => {
    recommendations.adaptiveStrategies.push(`Build on success in ${area} to scaffold new concepts`);
  });

  // Emotional considerations
  const commonEmotions = Object.entries(patterns.emotionalPatterns)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 2);
    
  commonEmotions.forEach(([emotion, frequency]) => {
    if (['frustrated', 'confused', 'anxious'].includes(emotion)) {
      recommendations.emotionalConsiderations.push(`Address ${emotion} state - use calming, supportive language`);
    } else if (['engaged', 'curious', 'excited'].includes(emotion)) {
      recommendations.emotionalConsiderations.push(`Leverage ${emotion} state - encourage exploration`);
    }
  });

  // Development-level recommendations
  if (development) {
    const style = development.recommendedScaffoldingStyle;
    recommendations.adaptiveStrategies.push(`Use ${style.questionStyle} questioning approach`);
    recommendations.adaptiveStrategies.push(`Maintain ${style.explanationDepth} explanation depth`);
    recommendations.adaptiveStrategies.push(`Keep abstraction level ${style.abstractionLevel}`);
  }

  // Engagement recommendations
  if (patterns.engagementLevel < 0.3) {
    recommendations.emotionalConsiderations.push('Low engagement detected - use motivating, interactive approaches');
  } else if (patterns.engagementLevel > 0.7) {
    recommendations.adaptiveStrategies.push('High engagement - can introduce more challenging concepts');
  }

  return recommendations;
};

// Retrieve relevant context for AI scaffolding (enhanced version)
const getRelevantContext = async (studentId, currentContent, options = {}) => {
  // This is the enhanced version that uses intelligent analysis
  return await getIntelligentLearningHistory(studentId, currentContent, options);
};

// Generate context summary for AI injection (enhanced version)
const generateContextSummary = async (studentId, currentContent, options = {}) => {
  try {
    const intelligentHistory = await getIntelligentLearningHistory(studentId, currentContent, options);
    
    if (intelligentHistory.selectedContexts === 0) {
      return {
        summary: "No relevant learning history found for this student.",
        context_available: false,
        recommendations: { scaffoldingApproach: 'exploratory', adaptiveStrategies: ['Start with basic assessment'] }
      };
    }

    const { contexts, learningPatterns, developmentAssessment, recommendations } = intelligentHistory;

    // Generate comprehensive summary
    let summary = `STUDENT LEARNING CONTEXT ANALYSIS:\n\n`;
    
    // Performance overview
    summary += `📊 PERFORMANCE TRENDS:\n`;
    summary += `- Overall trend: ${learningPatterns.performanceTrend}\n`;
    if (learningPatterns.averagePerformance !== null) {
      summary += `- Recent average performance: ${(learningPatterns.averagePerformance * 100).toFixed(1)}%\n`;
    }
    summary += `- Engagement level: ${(learningPatterns.engagementLevel * 100).toFixed(1)}%\n`;
    summary += `- Total recent interactions: ${learningPatterns.totalInteractions}\n\n`;

    // Struggle and strength areas
    if (learningPatterns.struggleAreas.length > 0) {
      summary += `⚠️  AREAS NEEDING SUPPORT:\n`;
      learningPatterns.struggleAreas.forEach(([area, count]) => {
        summary += `- ${area} (${count} difficulties)\n`;
      });
      summary += `\n`;
    }

    if (learningPatterns.strengthAreas.length > 0) {
      summary += `💪 STRENGTH AREAS TO LEVERAGE:\n`;
      learningPatterns.strengthAreas.forEach(([area, count]) => {
        summary += `- ${area} (${count} successes)\n`;
      });
      summary += `\n`;
    }

    // Emotional patterns
    if (Object.keys(learningPatterns.emotionalPatterns).length > 0) {
      summary += `😊 EMOTIONAL PATTERNS:\n`;
      Object.entries(learningPatterns.emotionalPatterns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .forEach(([emotion, count]) => {
          summary += `- ${emotion}: ${count} times\n`;
        });
      summary += `\n`;
    }

    // Development level assessment
    if (developmentAssessment) {
      summary += `🧠 COGNITIVE DEVELOPMENT:\n`;
      summary += `- Level: ${developmentAssessment.level}\n`;
      summary += `- Cognitive stage: ${developmentAssessment.cognitiveStage}\n`;
      summary += `- Adjustment needed: ${developmentAssessment.adjustmentFactor}\n\n`;
    }

    // AI Scaffolding recommendations
    summary += `🎯 SCAFFOLDING RECOMMENDATIONS:\n`;
    summary += `- Approach: ${recommendations.scaffoldingApproach}\n`;
    if (recommendations.adaptiveStrategies.length > 0) {
      summary += `- Strategies:\n`;
      recommendations.adaptiveStrategies.forEach(strategy => {
        summary += `  • ${strategy}\n`;
      });
    }
    if (recommendations.emotionalConsiderations.length > 0) {
      summary += `- Emotional considerations:\n`;
      recommendations.emotionalConsiderations.forEach(consideration => {
        summary += `  • ${consideration}\n`;
      });
    }
    summary += `\n`;

    // Relevant context examples
    const topContexts = contexts.slice(0, 3);
    if (topContexts.length > 0) {
      summary += `📚 MOST RELEVANT PAST INTERACTIONS:\n`;
      topContexts.forEach((ctx, index) => {
        const weightInfo = `(weight: ${ctx.weight.toFixed(2)})`;
        summary += `${index + 1}. [${ctx.context_type}] ${ctx.content.substring(0, 120)}... ${weightInfo}\n`;
        if (ctx.performance_metrics?.accuracy) {
          summary += `   Performance: ${(ctx.performance_metrics.accuracy * 100).toFixed(1)}%\n`;
        }
      });
    }

    return {
      summary,
      context_available: true,
      learning_patterns: learningPatterns,
      development_assessment: developmentAssessment,
      scaffolding_recommendations: recommendations,
      raw_contexts: contexts,
      analysis_metadata: {
        total_analyzed: intelligentHistory.totalContextsAnalyzed,
        selected_count: intelligentHistory.selectedContexts,
        query_content: currentContent
      }
    };
  } catch (error) {
    console.error('❌ Failed to generate enhanced context summary:', error);
    throw error;
  }
};

// Health check for context manager
const healthCheck = async () => {
  try {
    await testChromaConnection();
    return {
      status: 'healthy',
      vector_db: 'connected',
      context_types: Object.values(CONTEXT_TYPES),
      development_levels: Object.keys(DEVELOPMENT_LEVELS),
      features: [
        'intelligent_history_retrieval',
        'performance_trend_analysis',
        'adaptive_context_weighting',
        'development_level_assessment',
        'scaffolding_recommendations'
      ],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      vector_db: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = {
  CONTEXT_TYPES,
  DEVELOPMENT_LEVELS,
  PERFORMANCE_THRESHOLDS,
  storeLearningContext,
  getRelevantContext,
  getIntelligentLearningHistory,
  generateContextSummary,
  analyzeLearningPatterns,
  assessDevelopmentLevel,
  calculateContextWeights,
  generateScaffoldingRecommendations,
  generateEmbedding,
  healthCheck
}; 