const { getAdaptiveResponseGenerator } = require('./adaptive-response-generator');
const { getAIService } = require('./ai-service');
const { activityMonitor } = require('./activity-monitor');
const { getIntelligentLearningHistory } = require('./context-manager');

// Emotional intelligence competency framework
const EI_COMPETENCIES = {
  SELF_AWARENESS: {
    name: 'Self-Awareness',
    description: 'Understanding one\'s own emotions, strengths, weaknesses, and values',
    subCompetencies: {
      EMOTIONAL_AWARENESS: 'Recognizing emotions and their effects',
      ACCURATE_SELF_ASSESSMENT: 'Knowing one\'s strengths and limitations',
      SELF_CONFIDENCE: 'Strong sense of self-worth and capabilities'
    },
    indicators: [
      'emotion_identification', 'emotion_intensity_awareness', 'trigger_recognition',
      'strength_acknowledgment', 'limitation_acceptance', 'confidence_expression'
    ]
  },
  SELF_REGULATION: {
    name: 'Self-Regulation',
    description: 'Managing disruptive emotions and impulses effectively',
    subCompetencies: {
      EMOTIONAL_SELF_CONTROL: 'Managing disruptive emotions and impulses',
      ADAPTABILITY: 'Flexibility in handling change',
      ACHIEVEMENT_ORIENTATION: 'Striving to improve performance',
      POSITIVE_OUTLOOK: 'Seeing the good in people, situations, and events'
    },
    indicators: [
      'coping_strategy_use', 'impulse_management', 'change_adaptation',
      'goal_pursuit', 'optimism_expression', 'resilience_demonstration'
    ]
  },
  MOTIVATION: {
    name: 'Motivation',
    description: 'Being driven to achieve for the sake of achievement',
    subCompetencies: {
      ACHIEVEMENT_DRIVE: 'Striving to improve or meet a standard of excellence',
      COMMITMENT: 'Aligning with group or organization goals',
      INITIATIVE: 'Readiness to act on opportunities',
      OPTIMISM: 'Persistence in pursuing goals despite obstacles'
    },
    indicators: [
      'goal_setting', 'persistence_demonstration', 'initiative_taking',
      'improvement_seeking', 'challenge_embracing', 'future_orientation'
    ]
  },
  EMPATHY: {
    name: 'Empathy',
    description: 'Understanding others\' emotions and perspectives',
    subCompetencies: {
      EMPATHIC_UNDERSTANDING: 'Understanding others\' emotions and perspectives',
      ORGANIZATIONAL_AWARENESS: 'Reading organizational politics',
      SERVICE_ORIENTATION: 'Recognizing and meeting others\' needs'
    },
    indicators: [
      'perspective_taking', 'emotional_understanding', 'social_awareness',
      'helping_behavior', 'interpersonal_sensitivity', 'cultural_awareness'
    ]
  },
  SOCIAL_SKILLS: {
    name: 'Social Skills',
    description: 'Managing relationships to move people in desired directions',
    subCompetencies: {
      INFLUENCE: 'Having a positive impact on others',
      COACH_AND_MENTOR: 'Helping others develop',
      CONFLICT_MANAGEMENT: 'Resolving disagreements',
      TEAMWORK: 'Working with others toward shared goals',
      INSPIRATIONAL_LEADERSHIP: 'Inspiring and guiding others'
    },
    indicators: [
      'relationship_building', 'communication_effectiveness', 'conflict_resolution',
      'collaboration_skills', 'leadership_behaviors', 'social_support_providing'
    ]
  }
};

// Emotional development stages by age
const EMOTIONAL_DEVELOPMENT_STAGES = {
  EARLY_ELEMENTARY: {
    ageRange: [5, 8],
    stage: 'Basic Emotional Recognition',
    capabilities: [
      'Identify basic emotions (happy, sad, angry, scared)',
      'Understand emotion-behavior connections',
      'Begin to use simple coping strategies',
      'Recognize emotions in others through facial expressions'
    ],
    challenges: [
      'Difficulty with complex emotions',
      'Limited emotional vocabulary',
      'Impulse control still developing',
      'Self-soothing skills emerging'
    ]
  },
  LATE_ELEMENTARY: {
    ageRange: [9, 11],
    stage: 'Emotional Awareness and Regulation',
    capabilities: [
      'Expanded emotional vocabulary',
      'Understanding of multiple emotions simultaneously',
      'Basic emotion regulation strategies',
      'Empathy development with peers'
    ],
    challenges: [
      'Peer comparison and social pressure',
      'Managing academic stress',
      'Developing emotional independence',
      'Understanding social emotion rules'
    ]
  },
  MIDDLE_SCHOOL: {
    ageRange: [12, 14],
    stage: 'Social-Emotional Development',
    capabilities: [
      'Complex emotional understanding',
      'Social perspective-taking',
      'Identity exploration through emotions',
      'Relationship emotion management'
    ],
    challenges: [
      'Emotional intensity from hormonal changes',
      'Identity confusion and mood swings',
      'Peer acceptance and belonging needs',
      'Academic and social pressure management'
    ]
  },
  HIGH_SCHOOL: {
    ageRange: [15, 18],
    stage: 'Emotional Maturity and Independence',
    capabilities: [
      'Sophisticated emotional analysis',
      'Long-term emotional planning',
      'Complex relationship management',
      'Value-based emotional decisions'
    ],
    challenges: [
      'Future anxiety and decision pressure',
      'Romantic relationship emotions',
      'Independence vs. security conflicts',
      'Career and life planning stress'
    ]
  }
};

// Emotional pattern analysis algorithms
const EMOTIONAL_PATTERN_TYPES = {
  EMOTIONAL_CYCLES: {
    name: 'Emotional Cycles',
    description: 'Recurring emotional patterns over time',
    patterns: ['daily_mood_cycles', 'weekly_stress_patterns', 'seasonal_affective_patterns']
  },
  TRIGGER_PATTERNS: {
    name: 'Emotional Triggers',
    description: 'Situations or events that consistently evoke certain emotions',
    patterns: ['academic_stress_triggers', 'social_anxiety_triggers', 'success_confidence_triggers']
  },
  COPING_PATTERNS: {
    name: 'Coping Strategies',
    description: 'How the student manages difficult emotions',
    patterns: ['adaptive_coping', 'avoidance_patterns', 'support_seeking_behaviors']
  },
  GROWTH_PATTERNS: {
    name: 'Emotional Growth',
    description: 'Development and improvement in emotional intelligence',
    patterns: ['vocabulary_expansion', 'regulation_improvement', 'empathy_development']
  },
  RELATIONSHIP_PATTERNS: {
    name: 'Social-Emotional Patterns',
    description: 'Emotional patterns in social contexts',
    patterns: ['peer_interaction_emotions', 'authority_relationship_emotions', 'collaboration_emotions']
  }
};

class EmotionalIntelligenceError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'EmotionalIntelligenceError';
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

class EmotionalIntelligenceAnalyzer {
  constructor() {
    this.adaptiveGenerator = getAdaptiveResponseGenerator();
    this.aiService = getAIService();
    this.competencies = EI_COMPETENCIES;
    this.developmentStages = EMOTIONAL_DEVELOPMENT_STAGES;
    this.patternTypes = EMOTIONAL_PATTERN_TYPES;
  }

  // Main method to analyze emotional intelligence from journal and reflection data
  async analyzeEmotionalIntelligence(options = {}) {
    try {
      const {
        studentId,
        journalEntries = [],
        reflectionResponses = [],
        timeWindowDays = 30,
        includeRecommendations = true,
        studentAge = null
      } = options;

      // Validate inputs
      if (!studentId) {
        throw new EmotionalIntelligenceError('studentId is required');
      }

      // Get comprehensive emotional data
      const emotionalData = await this.gatherEmotionalData(studentId, {
        journalEntries,
        reflectionResponses,
        timeWindowDays
      });

      // Analyze emotional patterns
      const patternAnalysis = this.analyzeEmotionalPatterns(emotionalData);

      // Assess EI competencies
      const competencyAssessment = await this.assessEICompetencies(emotionalData, patternAnalysis);

      // Determine developmental stage
      const developmentStage = this.assessDevelopmentStage(studentAge, competencyAssessment);

      // Track emotional growth over time
      const growthAnalysis = this.analyzeEmotionalGrowth(emotionalData, timeWindowDays);

      // Generate insights and recommendations
      const insights = await this.generateEmotionalInsights(
        patternAnalysis, 
        competencyAssessment, 
        developmentStage, 
        growthAnalysis
      );

      const recommendations = includeRecommendations 
        ? await this.generateEIRecommendations(competencyAssessment, developmentStage, insights)
        : null;

      // Log analysis activity
      await this.logEIAnalysis(studentId, {
        dataPoints: emotionalData.totalDataPoints,
        competencyScores: competencyAssessment.overallScores,
        insights: insights.length,
        timeWindow: timeWindowDays
      });

      return {
        studentId,
        analysisDate: new Date().toISOString(),
        timeWindow: timeWindowDays,
        emotionalData: {
          summary: emotionalData.summary,
          totalDataPoints: emotionalData.totalDataPoints
        },
        patternAnalysis,
        competencyAssessment,
        developmentStage,
        growthAnalysis,
        insights,
        recommendations,
        metadata: {
          dataQuality: this.assessDataQuality(emotionalData),
          confidence: this.calculateAnalysisConfidence(emotionalData, patternAnalysis),
          nextAnalysisRecommended: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Emotional intelligence analysis failed:', error);
      throw error;
    }
  }

  // Gather comprehensive emotional data from multiple sources
  async gatherEmotionalData(studentId, options = {}) {
    const { journalEntries, reflectionResponses, timeWindowDays } = options;
    
    const emotionalData = {
      journalEmotions: [],
      reflectionEmotions: [],
      emotionalVocabulary: new Set(),
      emotionalContexts: [],
      emotionalProgression: [],
      totalDataPoints: 0
    };

    // Process journal entries
    for (const entry of journalEntries) {
      if (entry.emotionalState) {
        const emotionData = {
          source: 'journal',
          timestamp: entry.createdAt,
          primary: entry.emotionalState.primary,
          secondary: entry.emotionalState.secondary || [],
          intensity: entry.emotionalState.intensity,
          confidence: entry.emotionalState.confidence,
          context: {
            title: entry.title,
            content: entry.plainTextContent?.substring(0, 200),
            tags: entry.tags,
            wordCount: entry.wordCount
          }
        };
        
        emotionalData.journalEmotions.push(emotionData);
        emotionalData.emotionalVocabulary.add(entry.emotionalState.primary);
        if (entry.emotionalState.secondary) {
          entry.emotionalState.secondary.forEach(emotion => 
            emotionalData.emotionalVocabulary.add(emotion)
          );
        }
        emotionalData.totalDataPoints++;
      }

      // Analyze emotional content in journal text
      const textEmotions = await this.extractEmotionsFromText(entry.content || entry.plainTextContent);
      if (textEmotions.length > 0) {
        emotionalData.emotionalContexts.push({
          source: 'journal_text',
          timestamp: entry.createdAt,
          emotions: textEmotions,
          context: entry.title
        });
      }
    }

    // Process reflection responses
    for (const response of reflectionResponses) {
      if (response.promptType === 'emotional-exploration' && response.response) {
        const responseEmotions = await this.analyzeReflectionEmotionalContent(response.response);
        
        emotionalData.reflectionEmotions.push({
          source: 'reflection',
          timestamp: response.respondedAt,
          promptType: response.promptType,
          emotionalInsights: responseEmotions,
          responseLength: response.response.length,
          context: {
            prompt: response.prompt?.substring(0, 100),
            developmentLevel: response.developmentLevel
          }
        });
        emotionalData.totalDataPoints++;
      }
    }

    // Create emotional progression timeline
    const allEmotionalEvents = [
      ...emotionalData.journalEmotions,
      ...emotionalData.reflectionEmotions
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    emotionalData.emotionalProgression = allEmotionalEvents;

    // Generate summary statistics
    emotionalData.summary = {
      vocabularySize: emotionalData.emotionalVocabulary.size,
      vocabularyList: Array.from(emotionalData.emotionalVocabulary),
      journalEntryCount: emotionalData.journalEmotions.length,
      reflectionCount: emotionalData.reflectionEmotions.length,
      averageIntensity: this.calculateAverageIntensity(emotionalData.journalEmotions),
      averageConfidence: this.calculateAverageConfidence(emotionalData.journalEmotions),
      mostFrequentEmotions: this.calculateEmotionFrequency(emotionalData),
      timeSpan: allEmotionalEvents.length > 0 ? {
        start: allEmotionalEvents[0].timestamp,
        end: allEmotionalEvents[allEmotionalEvents.length - 1].timestamp
      } : null
    };

    return emotionalData;
  }

  // Analyze emotional patterns using various algorithms
  analyzeEmotionalPatterns(emotionalData) {
    const patterns = {};

    // Analyze emotional cycles (daily, weekly patterns)
    patterns.cycles = this.analyzeCyclicalPatterns(emotionalData.emotionalProgression);

    // Identify emotional triggers
    patterns.triggers = this.identifyEmotionalTriggers(emotionalData);

    // Analyze coping and regulation patterns
    patterns.regulation = this.analyzeCopingPatterns(emotionalData);

    // Identify emotional growth trends
    patterns.growth = this.analyzeGrowthPatterns(emotionalData);

    // Social-emotional patterns
    patterns.social = this.analyzeSocialEmotionalPatterns(emotionalData);

    // Emotional stability and variability
    patterns.stability = this.analyzeEmotionalStability(emotionalData);

    return {
      patterns,
      summary: {
        totalPatternsIdentified: Object.values(patterns).reduce((sum, p) => sum + Object.keys(p).length, 0),
        strongestPatterns: this.identifyStrongestPatterns(patterns),
        concernAreas: this.identifyConcernAreas(patterns),
        positiveIndicators: this.identifyPositiveIndicators(patterns)
      }
    };
  }

  // Assess emotional intelligence competencies
  async assessEICompetencies(emotionalData, patternAnalysis) {
    const assessments = {};

    for (const [competencyKey, competency] of Object.entries(this.competencies)) {
      const assessment = await this.assessSingleCompetency(
        competencyKey, 
        competency, 
        emotionalData, 
        patternAnalysis
      );
      assessments[competencyKey] = assessment;
    }

    // Calculate overall scores
    const overallScores = {
      selfAwareness: assessments.SELF_AWARENESS.score,
      selfRegulation: assessments.SELF_REGULATION.score,
      motivation: assessments.MOTIVATION.score,
      empathy: assessments.EMPATHY.score,
      socialSkills: assessments.SOCIAL_SKILLS.score,
      overall: Object.values(assessments).reduce((sum, a) => sum + a.score, 0) / 5
    };

    return {
      competencyDetails: assessments,
      overallScores,
      strengths: this.identifyEIStrengths(assessments),
      developmentAreas: this.identifyEIDevelopmentAreas(assessments),
      balanceAnalysis: this.analyzeEIBalance(overallScores)
    };
  }

  // Assess single EI competency
  async assessSingleCompetency(competencyKey, competency, emotionalData, patternAnalysis) {
    let score = 0;
    const evidencePoints = [];
    const subCompetencyScores = {};

    // Assess each sub-competency
    for (const [subKey, subDescription] of Object.entries(competency.subCompetencies)) {
      const subScore = this.assessSubCompetency(subKey, subDescription, emotionalData, patternAnalysis);
      subCompetencyScores[subKey] = subScore;
      score += subScore.score;
      evidencePoints.push(...subScore.evidence);
    }

    // Average the sub-competency scores
    score = score / Object.keys(competency.subCompetencies).length;

    // Look for specific indicators
    const indicatorEvidence = this.findIndicatorEvidence(competency.indicators, emotionalData, patternAnalysis);
    evidencePoints.push(...indicatorEvidence);

    return {
      competency: competency.name,
      score: Math.min(100, Math.max(0, score)), // Ensure 0-100 range
      level: this.scoresToLevel(score),
      subCompetencies: subCompetencyScores,
      evidence: evidencePoints,
      recommendedActions: this.generateCompetencyRecommendations(competencyKey, score, evidencePoints)
    };
  }

  // Assess specific sub-competency
  assessSubCompetency(subKey, subDescription, emotionalData, patternAnalysis) {
    let score = 50; // Start with neutral score
    const evidence = [];

    switch (subKey) {
      case 'EMOTIONAL_AWARENESS':
        // Assess based on emotion identification accuracy and vocabulary
        score = this.assessEmotionalAwareness(emotionalData, evidence);
        break;
        
      case 'EMOTIONAL_SELF_CONTROL':
        // Assess based on emotional regulation patterns
        score = this.assessSelfControl(emotionalData, patternAnalysis, evidence);
        break;
        
      case 'ACHIEVEMENT_DRIVE':
        // Assess based on goal-setting and persistence indicators
        score = this.assessAchievementDrive(emotionalData, evidence);
        break;
        
      case 'EMPATHIC_UNDERSTANDING':
        // Assess based on perspective-taking in reflections
        score = this.assessEmpathy(emotionalData, evidence);
        break;
        
      case 'INFLUENCE':
        // Assess based on social interaction descriptions
        score = this.assessInfluence(emotionalData, evidence);
        break;
        
      default:
        // Generic assessment for other sub-competencies
        score = this.assessGenericSubCompetency(subKey, emotionalData, evidence);
    }

    return {
      name: subKey,
      score: Math.min(100, Math.max(0, score)),
      evidence,
      confidence: evidence.length > 0 ? Math.min(1.0, evidence.length / 3) : 0.3
    };
  }

  // Assess emotional awareness specifically
  assessEmotionalAwareness(emotionalData, evidence) {
    let score = 50;

    // Vocabulary diversity (20 points max)
    const vocabularyBonus = Math.min(20, emotionalData.summary.vocabularySize * 2);
    score += vocabularyBonus;
    if (vocabularyBonus > 0) {
      evidence.push(`Uses ${emotionalData.summary.vocabularySize} different emotion words`);
    }

    // Confidence in emotion identification (15 points max)
    const avgConfidence = emotionalData.summary.averageConfidence || 0.5;
    const confidenceBonus = Math.min(15, (avgConfidence - 0.5) * 30);
    score += confidenceBonus;
    if (avgConfidence > 0.7) {
      evidence.push(`High confidence in emotion identification (${(avgConfidence * 100).toFixed(0)}%)`);
    }

    // Complex emotion recognition (secondary emotions) (15 points max)
    const complexEmotionCount = emotionalData.journalEmotions.filter(e => 
      e.secondary && e.secondary.length > 0
    ).length;
    const complexEmotionBonus = Math.min(15, complexEmotionCount * 3);
    score += complexEmotionBonus;
    if (complexEmotionCount > 0) {
      evidence.push(`Recognizes complex/multiple emotions (${complexEmotionCount} instances)`);
    }

    return score;
  }

  // Assess self-control based on emotional regulation patterns
  assessSelfControl(emotionalData, patternAnalysis, evidence) {
    let score = 50;

    // Check for emotional stability
    if (patternAnalysis.patterns.stability && patternAnalysis.patterns.stability.stabilityScore > 0.7) {
      score += 20;
      evidence.push('Demonstrates emotional stability over time');
    }

    // Look for coping strategy usage
    if (patternAnalysis.patterns.regulation && patternAnalysis.patterns.regulation.adaptiveCoping > 0.6) {
      score += 15;
      evidence.push('Uses adaptive coping strategies');
    }

    // Check for emotional intensity management
    const avgIntensity = emotionalData.summary.averageIntensity || 3;
    if (avgIntensity < 4) {
      score += 10;
      evidence.push('Maintains moderate emotional intensity');
    }

    return score;
  }

  // Generate emotional growth analysis
  analyzeEmotionalGrowth(emotionalData, timeWindowDays) {
    if (emotionalData.emotionalProgression.length < 2) {
      return {
        growth: 'insufficient_data',
        trends: [],
        milestones: [],
        projections: []
      };
    }

    const progression = emotionalData.emotionalProgression;
    const timeSegments = this.segmentDataByTime(progression, timeWindowDays);
    
    return {
      vocabularyGrowth: this.analyzeVocabularyGrowth(timeSegments),
      intensityTrends: this.analyzeIntensityTrends(timeSegments),
      confidenceTrends: this.analyzeConfidenceTrends(timeSegments),
      complexityGrowth: this.analyzeEmotionalComplexityGrowth(timeSegments),
      milestones: this.identifyEmotionalMilestones(progression),
      overallTrend: this.calculateOverallGrowthTrend(timeSegments),
      projections: this.generateGrowthProjections(timeSegments)
    };
  }

  // Generate emotional insights using AI
  async generateEmotionalInsights(patternAnalysis, competencyAssessment, developmentStage, growthAnalysis) {
    const insights = [];

    // Pattern-based insights
    if (patternAnalysis.summary.strongestPatterns.length > 0) {
      for (const pattern of patternAnalysis.summary.strongestPatterns) {
        insights.push({
          type: 'pattern',
          category: 'emotional_patterns',
          title: `Strong ${pattern.type} Pattern Identified`,
          description: pattern.description,
          significance: pattern.strength,
          actionable: true,
          recommendations: pattern.recommendations || []
        });
      }
    }

    // Competency-based insights
    const strengths = competencyAssessment.strengths;
    const developmentAreas = competencyAssessment.developmentAreas;

    strengths.forEach(strength => {
      insights.push({
        type: 'strength',
        category: 'emotional_competency',
        title: `Strong ${strength.competency}`,
        description: `Demonstrates excellent ${strength.competency.toLowerCase()} with a score of ${strength.score.toFixed(0)}`,
        significance: 'high',
        actionable: true,
        recommendations: [`Continue building on your ${strength.competency.toLowerCase()} strength`]
      });
    });

    developmentAreas.forEach(area => {
      insights.push({
        type: 'development_opportunity',
        category: 'emotional_competency',
        title: `Growth Opportunity in ${area.competency}`,
        description: `Developing ${area.competency.toLowerCase()} skills could enhance emotional intelligence`,
        significance: 'medium',
        actionable: true,
        recommendations: area.recommendedActions || []
      });
    });

    // Growth-based insights
    if (growthAnalysis.overallTrend !== 'insufficient_data') {
      insights.push({
        type: 'growth',
        category: 'emotional_development',
        title: `Emotional Growth Trend: ${growthAnalysis.overallTrend}`,
        description: this.generateGrowthDescription(growthAnalysis),
        significance: 'high',
        actionable: true,
        recommendations: this.generateGrowthRecommendations(growthAnalysis)
      });
    }

    // Development stage insights
    if (developmentStage.recommendations.length > 0) {
      insights.push({
        type: 'developmental',
        category: 'age_appropriate_development',
        title: `${developmentStage.stage} Development`,
        description: `Currently in the ${developmentStage.stage.toLowerCase()} stage of emotional development`,
        significance: 'medium',
        actionable: true,
        recommendations: developmentStage.recommendations
      });
    }

    return insights;
  }

  // Generate EI improvement recommendations
  async generateEIRecommendations(competencyAssessment, developmentStage, insights) {
    const recommendations = {
      immediate: [], // Things to work on now
      shortTerm: [], // Goals for the next few weeks
      longTerm: [], // Goals for the next few months
      exercises: [], // Specific exercises and activities
      resources: [] // Recommended resources
    };

    // Immediate recommendations based on lowest scoring competencies
    const lowestCompetency = competencyAssessment.developmentAreas[0];
    if (lowestCompetency) {
      recommendations.immediate.push({
        category: 'competency_development',
        title: `Focus on ${lowestCompetency.competency}`,
        description: `Start with simple exercises to develop ${lowestCompetency.competency.toLowerCase()}`,
        actions: lowestCompetency.recommendedActions.slice(0, 2),
        timeframe: '1-2 weeks'
      });
    }

    // Short-term recommendations based on development stage
    const stageRecommendations = this.getStageSpecificRecommendations(developmentStage);
    recommendations.shortTerm.push(...stageRecommendations.shortTerm);

    // Long-term recommendations for overall EI development
    recommendations.longTerm.push({
      category: 'holistic_development',
      title: 'Build Comprehensive Emotional Intelligence',
      description: 'Develop all five core EI competencies through consistent practice',
      actions: [
        'Regular emotional self-reflection',
        'Practice empathy in daily interactions',
        'Develop emotional vocabulary',
        'Learn advanced emotion regulation techniques'
      ],
      timeframe: '3-6 months'
    });

    // Specific exercises based on competency gaps
    recommendations.exercises.push(...this.generateEIExercises(competencyAssessment));

    // Resource recommendations
    recommendations.resources.push(...this.getEIResources(developmentStage, competencyAssessment));

    return recommendations;
  }

  // Helper methods for pattern analysis
  analyzeCyclicalPatterns(emotionalProgression) {
    // Analyze daily, weekly, and monthly emotional cycles
    const cycles = {
      daily: this.analyzeDailyCycles(emotionalProgression),
      weekly: this.analyzeWeeklyCycles(emotionalProgression),
      monthly: this.analyzeMonthlyCycles(emotionalProgression)
    };

    return cycles;
  }

  identifyEmotionalTriggers(emotionalData) {
    const triggers = {};
    
    // Analyze contexts that lead to specific emotions
    emotionalData.emotionalContexts.forEach(context => {
      context.emotions.forEach(emotion => {
        if (!triggers[emotion.type]) triggers[emotion.type] = [];
        triggers[emotion.type].push({
          context: context.context,
          confidence: emotion.confidence,
          timestamp: context.timestamp
        });
      });
    });

    // Identify patterns in triggers
    Object.keys(triggers).forEach(emotion => {
      triggers[emotion] = this.analyzeContextPatterns(triggers[emotion]);
    });

    return triggers;
  }

  // Calculate analysis confidence based on data quality and quantity
  calculateAnalysisConfidence(emotionalData, patternAnalysis) {
    let confidence = 0;

    // Data quantity factor (0-0.4)
    const dataPoints = emotionalData.totalDataPoints;
    const quantityFactor = Math.min(0.4, dataPoints / 20);
    confidence += quantityFactor;

    // Data diversity factor (0-0.3)
    const vocabularySize = emotionalData.summary.vocabularySize;
    const diversityFactor = Math.min(0.3, vocabularySize / 10);
    confidence += diversityFactor;

    // Pattern strength factor (0-0.3)
    const patternStrength = patternAnalysis.summary.strongestPatterns.length > 0 
      ? patternAnalysis.summary.strongestPatterns[0].strength || 0
      : 0;
    confidence += patternStrength * 0.3;

    return Math.min(1.0, confidence);
  }

  // Extract emotions from text using AI analysis
  async extractEmotionsFromText(text) {
    try {
      const analysisPrompt = `
Analyze the emotional content in this text and identify the emotions expressed. 
Focus on explicit emotional words and implicit emotional tone.

Text: "${text.substring(0, 500)}"

Return emotions found with confidence scores (0-1):
Format: emotion_name:confidence_score

Only include emotions with confidence > 0.5`;

      const response = await this.aiService.generateResponse(analysisPrompt, {
        temperature: 0.3,
        maxTokens: 200
      });

      return this.parseEmotionAnalysisResponse(response.text);
    } catch (error) {
      console.warn('⚠️ Could not extract emotions from text:', error.message);
      return [];
    }
  }

  // Parse AI emotion analysis response
  parseEmotionAnalysisResponse(responseText) {
    const emotions = [];
    const lines = responseText.split('\n');
    
    for (const line of lines) {
      const match = line.match(/(\w+):(\d*\.?\d+)/);
      if (match) {
        const [, emotion, confidence] = match;
        const confScore = parseFloat(confidence);
        if (confScore > 0.5) {
          emotions.push({
            type: emotion.toLowerCase(),
            confidence: confScore
          });
        }
      }
    }
    
    return emotions;
  }

  // Log EI analysis activity
  async logEIAnalysis(studentId, analysisData) {
    try {
      await activityMonitor.logActivity({
        studentId,
        sessionId: `ei_analysis_${Date.now()}`,
        activityType: 'emotional_intelligence_analysis',
        details: {
          dataPoints: analysisData.dataPoints,
          competencyScores: analysisData.competencyScores,
          insightCount: analysisData.insights,
          timeWindow: analysisData.timeWindow
        },
        severity: 'low',
        context: {
          feature: 'emotional_intelligence',
          analysisType: 'comprehensive'
        }
      });
    } catch (error) {
      console.warn('⚠️ Could not log EI analysis activity:', error.message);
    }
  }

  // Health check for the EI analyzer
  async healthCheck() {
    try {
      const adaptiveHealth = await this.adaptiveGenerator.healthCheck();
      const aiHealth = await this.aiService.checkHealth();
      
      return {
        status: 'healthy',
        service: 'emotional-intelligence-analyzer',
        dependencies: {
          adaptiveResponseGenerator: adaptiveHealth.status,
          aiService: aiHealth.overall,
          activityMonitor: true
        },
        capabilities: {
          competencies: Object.keys(this.competencies).length,
          developmentStages: Object.keys(this.developmentStages).length,
          patternTypes: Object.keys(this.patternTypes).length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'emotional-intelligence-analyzer',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Additional helper methods would continue here...
  // [Implementing remaining helper methods for completeness]

  scoresToLevel(score) {
    if (score >= 85) return 'Advanced';
    if (score >= 70) return 'Proficient';
    if (score >= 55) return 'Developing';
    return 'Emerging';
  }

  assessDataQuality(emotionalData) {
    const quality = {
      score: 0,
      factors: []
    };

    // Data quantity
    if (emotionalData.totalDataPoints >= 10) {
      quality.score += 25;
      quality.factors.push('Sufficient data points');
    } else if (emotionalData.totalDataPoints >= 5) {
      quality.score += 15;
      quality.factors.push('Moderate data points');
    } else {
      quality.factors.push('Limited data points');
    }

    // Data diversity
    if (emotionalData.summary.vocabularySize >= 8) {
      quality.score += 25;
      quality.factors.push('Rich emotional vocabulary');
    } else if (emotionalData.summary.vocabularySize >= 4) {
      quality.score += 15;
      quality.factors.push('Moderate emotional vocabulary');
    }

    // Time span
    if (emotionalData.summary.timeSpan) {
      const days = (new Date(emotionalData.summary.timeSpan.end) - new Date(emotionalData.summary.timeSpan.start)) / (1000 * 60 * 60 * 24);
      if (days >= 14) {
        quality.score += 25;
        quality.factors.push('Good time span coverage');
      } else if (days >= 7) {
        quality.score += 15;
        quality.factors.push('Moderate time span');
      }
    }

    // Confidence levels
    if (emotionalData.summary.averageConfidence >= 0.8) {
      quality.score += 25;
      quality.factors.push('High confidence in emotional assessments');
    } else if (emotionalData.summary.averageConfidence >= 0.6) {
      quality.score += 15;
      quality.factors.push('Moderate confidence levels');
    }

    return {
      score: Math.min(100, quality.score),
      level: quality.score >= 75 ? 'High' : quality.score >= 50 ? 'Moderate' : 'Low',
      factors: quality.factors
    };
  }

  calculateAverageIntensity(journalEmotions) {
    if (journalEmotions.length === 0) return null;
    return journalEmotions.reduce((sum, e) => sum + e.intensity, 0) / journalEmotions.length;
  }

  calculateAverageConfidence(journalEmotions) {
    if (journalEmotions.length === 0) return null;
    return journalEmotions.reduce((sum, e) => sum + e.confidence, 0) / journalEmotions.length;
  }

  calculateEmotionFrequency(emotionalData) {
    const frequency = {};
    
    emotionalData.journalEmotions.forEach(e => {
      frequency[e.primary] = (frequency[e.primary] || 0) + 1;
      e.secondary.forEach(sec => {
        frequency[sec] = (frequency[sec] || 0) + 0.5; // Secondary emotions count as half
      });
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([emotion, count]) => ({ emotion, count }));
  }

  assessDevelopmentStage(studentAge, competencyAssessment) {
    let stage = null;
    
    if (studentAge) {
      for (const [stageKey, stageInfo] of Object.entries(this.developmentStages)) {
        if (studentAge >= stageInfo.ageRange[0] && studentAge <= stageInfo.ageRange[1]) {
          stage = { key: stageKey, ...stageInfo };
          break;
        }
      }
    }

    if (!stage) {
      // Infer stage from competency levels
      const avgScore = competencyAssessment.overallScores.overall;
      if (avgScore >= 80) stage = { key: 'HIGH_SCHOOL', ...this.developmentStages.HIGH_SCHOOL };
      else if (avgScore >= 65) stage = { key: 'MIDDLE_SCHOOL', ...this.developmentStages.MIDDLE_SCHOOL };
      else if (avgScore >= 50) stage = { key: 'LATE_ELEMENTARY', ...this.developmentStages.LATE_ELEMENTARY };
      else stage = { key: 'EARLY_ELEMENTARY', ...this.developmentStages.EARLY_ELEMENTARY };
    }

    return {
      ...stage,
      alignment: this.assessStageAlignment(stage, competencyAssessment),
      recommendations: this.getStageRecommendations(stage, competencyAssessment)
    };
  }

  assessStageAlignment(stage, competencyAssessment) {
    // Assess how well the student's EI development aligns with their stage
    const expectedScores = this.getExpectedScoresForStage(stage.key);
    const actualScores = competencyAssessment.overallScores;
    
    let alignment = 0;
    Object.keys(expectedScores).forEach(competency => {
      const expected = expectedScores[competency];
      const actual = actualScores[competency];
      alignment += Math.max(0, 1 - Math.abs(expected - actual) / 100);
    });
    
    return alignment / Object.keys(expectedScores).length;
  }

  getExpectedScoresForStage(stageKey) {
    const expectations = {
      EARLY_ELEMENTARY: { selfAwareness: 40, selfRegulation: 35, motivation: 45, empathy: 30, socialSkills: 35 },
      LATE_ELEMENTARY: { selfAwareness: 55, selfRegulation: 50, motivation: 60, empathy: 45, socialSkills: 50 },
      MIDDLE_SCHOOL: { selfAwareness: 70, selfRegulation: 60, motivation: 70, empathy: 65, socialSkills: 65 },
      HIGH_SCHOOL: { selfAwareness: 80, selfRegulation: 75, motivation: 80, empathy: 80, socialSkills: 75 }
    };
    return expectations[stageKey] || expectations.MIDDLE_SCHOOL;
  }

  getStageRecommendations(stage, competencyAssessment) {
    const recommendations = [];
    
    stage.capabilities.forEach(capability => {
      recommendations.push(`Continue developing: ${capability}`);
    });
    
    stage.challenges.forEach(challenge => {
      recommendations.push(`Address challenge: ${challenge}`);
    });
    
    return recommendations.slice(0, 3); // Top 3 recommendations
  }

  // Analyze reflection emotional content using AI
  async analyzeReflectionEmotionalContent(responseText) {
    try {
      const analysisPrompt = `
Analyze this reflection response for emotional intelligence indicators:

Response: "${responseText.substring(0, 800)}"

Identify:
1. Emotional vocabulary used
2. Self-awareness indicators
3. Empathy expressions
4. Emotional regulation mentions
5. Growth mindset language

Return structured analysis in JSON format.`;

      const response = await this.aiService.generateResponse(analysisPrompt, {
        temperature: 0.3,
        maxTokens: 300
      });

      // Parse the AI response for emotional insights
      return this.parseReflectionAnalysis(response.text);
    } catch (error) {
      console.warn('⚠️ Could not analyze reflection emotional content:', error.message);
      return {
        emotionalVocabulary: [],
        selfAwareness: 0.5,
        empathy: 0.5,
        regulation: 0.5,
        growthMindset: 0.5
      };
    }
  }

  parseReflectionAnalysis(responseText) {
    // Try to parse JSON response, fallback to text analysis
    try {
      return JSON.parse(responseText);
    } catch {
      // Fallback text analysis
      return {
        emotionalVocabulary: this.extractVocabularyFromText(responseText),
        selfAwareness: this.scoreTextForIndicator(responseText, ['I feel', 'I realize', 'I notice']),
        empathy: this.scoreTextForIndicator(responseText, ['others feel', 'understand', 'perspective']),
        regulation: this.scoreTextForIndicator(responseText, ['manage', 'cope', 'control', 'calm']),
        growthMindset: this.scoreTextForIndicator(responseText, ['learn', 'grow', 'improve', 'better'])
      };
    }
  }

  extractVocabularyFromText(text) {
    const emotionWords = [
      'happy', 'sad', 'angry', 'frustrated', 'excited', 'nervous', 'confident',
      'anxious', 'proud', 'disappointed', 'curious', 'confused', 'grateful'
    ];
    return emotionWords.filter(word => text.toLowerCase().includes(word));
  }

  scoreTextForIndicator(text, indicators) {
    const matches = indicators.filter(indicator => 
      text.toLowerCase().includes(indicator.toLowerCase())
    ).length;
    return Math.min(1.0, matches / indicators.length);
  }

  // Analyze coping and regulation patterns
  analyzeCopingPatterns(emotionalData) {
    const patterns = {
      adaptiveCoping: 0.5,
      avoidancePatterns: 0.3,
      supportSeeking: 0.4,
      strategies: []
    };

    // Analyze journal content for coping strategies
    emotionalData.journalEmotions.forEach(emotion => {
      if (emotion.context && emotion.context.content) {
        const content = emotion.context.content.toLowerCase();
        
        // Look for adaptive coping indicators
        if (content.includes('talked to') || content.includes('asked for help')) {
          patterns.supportSeeking += 0.1;
          patterns.strategies.push('Support seeking');
        }
        
        if (content.includes('took a break') || content.includes('deep breath')) {
          patterns.adaptiveCoping += 0.1;
          patterns.strategies.push('Self-regulation');
        }
        
        if (content.includes('avoided') || content.includes('ignored')) {
          patterns.avoidancePatterns += 0.1;
        }
      }
    });

    // Normalize scores
    patterns.adaptiveCoping = Math.min(1.0, patterns.adaptiveCoping);
    patterns.supportSeeking = Math.min(1.0, patterns.supportSeeking);
    patterns.avoidancePatterns = Math.min(1.0, patterns.avoidancePatterns);

    return patterns;
  }

  // Analyze emotional growth patterns
  analyzeGrowthPatterns(emotionalData) {
    if (emotionalData.emotionalProgression.length < 3) {
      return { trend: 'insufficient_data', indicators: [] };
    }

    const progression = emotionalData.emotionalProgression;
    const early = progression.slice(0, Math.floor(progression.length / 3));
    const late = progression.slice(-Math.floor(progression.length / 3));

    const patterns = {
      vocabularyGrowth: this.compareVocabulary(early, late),
      confidenceGrowth: this.compareConfidence(early, late),
      complexityGrowth: this.compareComplexity(early, late),
      trend: 'stable',
      indicators: []
    };

    // Determine overall trend
    const growthCount = [
      patterns.vocabularyGrowth,
      patterns.confidenceGrowth,
      patterns.complexityGrowth
    ].filter(g => g > 0).length;

    if (growthCount >= 2) patterns.trend = 'growing';
    else if (growthCount === 0) patterns.trend = 'declining';

    return patterns;
  }

  compareVocabulary(early, late) {
    const earlyVocab = new Set();
    const lateVocab = new Set();
    
    early.forEach(e => {
      if (e.primary) earlyVocab.add(e.primary);
      if (e.secondary) e.secondary.forEach(s => earlyVocab.add(s));
    });
    
    late.forEach(e => {
      if (e.primary) lateVocab.add(e.primary);
      if (e.secondary) e.secondary.forEach(s => lateVocab.add(s));
    });

    return lateVocab.size - earlyVocab.size;
  }

  compareConfidence(early, late) {
    const earlyAvg = early.reduce((sum, e) => sum + (e.confidence || 0.5), 0) / early.length;
    const lateAvg = late.reduce((sum, e) => sum + (e.confidence || 0.5), 0) / late.length;
    return lateAvg - earlyAvg;
  }

  compareComplexity(early, late) {
    const earlyComplex = early.filter(e => e.secondary && e.secondary.length > 0).length;
    const lateComplex = late.filter(e => e.secondary && e.secondary.length > 0).length;
    return (lateComplex / late.length) - (earlyComplex / early.length);
  }

  // Analyze social-emotional patterns
  analyzeSocialEmotionalPatterns(emotionalData) {
    const patterns = {
      socialInteractions: 0,
      empathyIndicators: 0,
      relationshipEmotions: [],
      collaborationPatterns: 0
    };

    emotionalData.emotionalContexts.forEach(context => {
      if (context.context && typeof context.context === 'string') {
        const content = context.context.toLowerCase();
        
        if (content.includes('friend') || content.includes('classmate') || content.includes('team')) {
          patterns.socialInteractions++;
        }
        
        if (content.includes('helped') || content.includes('understand') || content.includes('feel')) {
          patterns.empathyIndicators++;
        }
        
        if (content.includes('worked with') || content.includes('together')) {
          patterns.collaborationPatterns++;
        }
      }
    });

    return patterns;
  }

  // Analyze emotional stability
  analyzeEmotionalStability(emotionalData) {
    if (emotionalData.journalEmotions.length < 3) {
      return { stabilityScore: 0.5, variability: 'unknown' };
    }

    const intensities = emotionalData.journalEmotions.map(e => e.intensity);
    const mean = intensities.reduce((sum, i) => sum + i, 0) / intensities.length;
    const variance = intensities.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intensities.length;
    const stdDev = Math.sqrt(variance);

    const stabilityScore = Math.max(0, 1 - (stdDev / 2)); // Normalize to 0-1

    return {
      stabilityScore,
      variability: stdDev < 1 ? 'low' : stdDev < 1.5 ? 'moderate' : 'high',
      meanIntensity: mean,
      standardDeviation: stdDev
    };
  }

  // Identify strongest patterns
  identifyStrongestPatterns(patterns) {
    const strongPatterns = [];
    
    Object.entries(patterns).forEach(([patternType, patternData]) => {
      if (typeof patternData === 'object' && patternData !== null) {
        Object.entries(patternData).forEach(([subType, value]) => {
          if (typeof value === 'number' && value > 0.7) {
            strongPatterns.push({
              type: `${patternType}_${subType}`,
              strength: value,
              description: `Strong ${subType} pattern in ${patternType}`,
              recommendations: [`Focus on leveraging your ${subType} strength`]
            });
          }
        });
      }
    });

    return strongPatterns.sort((a, b) => b.strength - a.strength).slice(0, 3);
  }

  // Identify concern areas
  identifyConcernAreas(patterns) {
    const concerns = [];
    
    if (patterns.stability && patterns.stability.variability === 'high') {
      concerns.push('High emotional variability - consider stability practices');
    }
    
    if (patterns.regulation && patterns.regulation.adaptiveCoping < 0.4) {
      concerns.push('Limited adaptive coping strategies identified');
    }
    
    if (patterns.social && patterns.social.empathyIndicators < 2) {
      concerns.push('Few empathy indicators in social contexts');
    }

    return concerns;
  }

  // Identify positive indicators
  identifyPositiveIndicators(patterns) {
    const positives = [];
    
    if (patterns.growth && patterns.growth.trend === 'growing') {
      positives.push('Positive emotional growth trend identified');
    }
    
    if (patterns.regulation && patterns.regulation.supportSeeking > 0.6) {
      positives.push('Strong support-seeking behavior');
    }
    
    if (patterns.stability && patterns.stability.stabilityScore > 0.7) {
      positives.push('Good emotional stability');
    }

    return positives;
  }

  // Find evidence for specific indicators
  findIndicatorEvidence(indicators, emotionalData, patternAnalysis) {
    const evidence = [];
    
    indicators.forEach(indicator => {
      switch (indicator) {
        case 'emotion_identification':
          if (emotionalData.summary.vocabularySize > 5) {
            evidence.push(`Identifies ${emotionalData.summary.vocabularySize} different emotions`);
          }
          break;
        case 'coping_strategy_use':
          if (patternAnalysis.patterns.regulation && patternAnalysis.patterns.regulation.adaptiveCoping > 0.5) {
            evidence.push('Uses adaptive coping strategies');
          }
          break;
        case 'perspective_taking':
          if (patternAnalysis.patterns.social && patternAnalysis.patterns.social.empathyIndicators > 0) {
            evidence.push(`Shows empathy in ${patternAnalysis.patterns.social.empathyIndicators} contexts`);
          }
          break;
      }
    });

    return evidence;
  }

  // Generate competency recommendations
  generateCompetencyRecommendations(competencyKey, score, evidencePoints) {
    const recommendations = [];
    
    if (score < 50) {
      recommendations.push(`Focus on building foundational ${competencyKey.toLowerCase()} skills`);
      recommendations.push('Start with simple daily exercises');
    } else if (score < 70) {
      recommendations.push(`Continue developing ${competencyKey.toLowerCase()} through practice`);
      recommendations.push('Challenge yourself with more complex situations');
    } else {
      recommendations.push(`Excellent ${competencyKey.toLowerCase()}! Consider mentoring others`);
      recommendations.push('Apply skills in new and challenging contexts');
    }

    return recommendations;
  }

  // Assessment methods for specific competencies
  assessAchievementDrive(emotionalData, evidence) {
    let score = 50;
    
    // Look for goal-setting language
    const goalWords = ['goal', 'want to', 'hope to', 'plan to', 'achieve'];
    let goalCount = 0;
    
    emotionalData.journalEmotions.forEach(emotion => {
      if (emotion.context && emotion.context.content) {
        goalWords.forEach(word => {
          if (emotion.context.content.toLowerCase().includes(word)) {
            goalCount++;
          }
        });
      }
    });
    
    if (goalCount > 0) {
      score += Math.min(30, goalCount * 5);
      evidence.push(`Shows goal-oriented thinking (${goalCount} instances)`);
    }

    return score;
  }

  assessEmpathy(emotionalData, evidence) {
    let score = 50;
    
    // Look for perspective-taking language
    const empathyWords = ['others feel', 'understand', 'help', 'support', 'care about'];
    let empathyCount = 0;
    
    emotionalData.reflectionEmotions.forEach(reflection => {
      if (reflection.emotionalInsights) {
        empathyCount += reflection.emotionalInsights.empathy || 0;
      }
    });
    
    if (empathyCount > 0) {
      score += Math.min(25, empathyCount * 10);
      evidence.push('Shows empathetic understanding in reflections');
    }

    return score;
  }

  assessInfluence(emotionalData, evidence) {
    let score = 50;
    
    // Look for leadership and influence language
    const influenceWords = ['led', 'convinced', 'helped', 'taught', 'inspired'];
    let influenceCount = 0;
    
    emotionalData.journalEmotions.forEach(emotion => {
      if (emotion.context && emotion.context.content) {
        influenceWords.forEach(word => {
          if (emotion.context.content.toLowerCase().includes(word)) {
            influenceCount++;
          }
        });
      }
    });
    
    if (influenceCount > 0) {
      score += Math.min(20, influenceCount * 7);
      evidence.push(`Shows leadership behaviors (${influenceCount} instances)`);
    }

    return score;
  }

  assessGenericSubCompetency(subKey, emotionalData, evidence) {
    // Generic assessment based on data availability and quality
    let score = 50;
    
    if (emotionalData.totalDataPoints > 5) {
      score += 10;
      evidence.push('Sufficient data for assessment');
    }
    
    if (emotionalData.summary.averageConfidence > 0.7) {
      score += 10;
      evidence.push('High confidence in self-assessment');
    }
    
    return score;
  }

  // EI analysis methods
  identifyEIStrengths(assessments) {
    return Object.values(assessments)
      .filter(assessment => assessment.score >= 70)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(assessment => ({
        competency: assessment.competency,
        score: assessment.score,
        level: assessment.level
      }));
  }

  identifyEIDevelopmentAreas(assessments) {
    return Object.values(assessments)
      .filter(assessment => assessment.score < 70)
      .sort((a, b) => a.score - b.score)
      .slice(0, 2)
      .map(assessment => ({
        competency: assessment.competency,
        score: assessment.score,
        level: assessment.level,
        recommendedActions: assessment.recommendedActions
      }));
  }

  analyzeEIBalance(overallScores) {
    const scores = Object.values(overallScores).filter(score => typeof score === 'number');
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    
    return {
      mean,
      variance,
      balance: variance < 100 ? 'well-balanced' : variance < 300 ? 'moderately-balanced' : 'unbalanced',
      recommendation: variance > 300 ? 'Focus on developing weaker competencies' : 'Continue balanced development'
    };
  }

  // Growth analysis methods
  segmentDataByTime(progression, timeWindowDays) {
    const segments = [];
    const segmentSize = Math.max(1, Math.floor(timeWindowDays / 4)); // 4 segments
    
    for (let i = 0; i < progression.length; i += segmentSize) {
      segments.push(progression.slice(i, i + segmentSize));
    }
    
    return segments.filter(segment => segment.length > 0);
  }

  analyzeVocabularyGrowth(timeSegments) {
    if (timeSegments.length < 2) return { trend: 'insufficient_data' };
    
    const vocabularySizes = timeSegments.map(segment => {
      const vocab = new Set();
      segment.forEach(event => {
        if (event.primary) vocab.add(event.primary);
        if (event.secondary) event.secondary.forEach(s => vocab.add(s));
      });
      return vocab.size;
    });
    
    const growth = vocabularySizes[vocabularySizes.length - 1] - vocabularySizes[0];
    
    return {
      trend: growth > 0 ? 'expanding' : growth < 0 ? 'contracting' : 'stable',
      growth,
      sizes: vocabularySizes
    };
  }

  analyzeIntensityTrends(timeSegments) {
    if (timeSegments.length < 2) return { trend: 'insufficient_data' };
    
    const avgIntensities = timeSegments.map(segment => {
      const intensities = segment.filter(e => e.intensity).map(e => e.intensity);
      return intensities.length > 0 ? intensities.reduce((sum, i) => sum + i, 0) / intensities.length : 3;
    });
    
    const firstHalf = avgIntensities.slice(0, Math.ceil(avgIntensities.length / 2));
    const secondHalf = avgIntensities.slice(Math.floor(avgIntensities.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, i) => sum + i, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, i) => sum + i, 0) / secondHalf.length;
    
    return {
      trend: secondAvg > firstAvg + 0.3 ? 'increasing' : secondAvg < firstAvg - 0.3 ? 'decreasing' : 'stable',
      change: secondAvg - firstAvg,
      intensities: avgIntensities
    };
  }

  analyzeConfidenceTrends(timeSegments) {
    if (timeSegments.length < 2) return { trend: 'insufficient_data' };
    
    const avgConfidences = timeSegments.map(segment => {
      const confidences = segment.filter(e => e.confidence).map(e => e.confidence);
      return confidences.length > 0 ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0.5;
    });
    
    const firstAvg = avgConfidences.slice(0, Math.ceil(avgConfidences.length / 2))
      .reduce((sum, c) => sum + c, 0) / Math.ceil(avgConfidences.length / 2);
    const secondAvg = avgConfidences.slice(Math.floor(avgConfidences.length / 2))
      .reduce((sum, c) => sum + c, 0) / Math.ceil(avgConfidences.length / 2);
    
    return {
      trend: secondAvg > firstAvg + 0.1 ? 'increasing' : secondAvg < firstAvg - 0.1 ? 'decreasing' : 'stable',
      change: secondAvg - firstAvg,
      confidences: avgConfidences
    };
  }

  analyzeEmotionalComplexityGrowth(timeSegments) {
    if (timeSegments.length < 2) return { trend: 'insufficient_data' };
    
    const complexityScores = timeSegments.map(segment => {
      const totalEmotions = segment.length;
      const complexEmotions = segment.filter(e => e.secondary && e.secondary.length > 0).length;
      return totalEmotions > 0 ? complexEmotions / totalEmotions : 0;
    });
    
    const firstAvg = complexityScores.slice(0, Math.ceil(complexityScores.length / 2))
      .reduce((sum, s) => sum + s, 0) / Math.ceil(complexityScores.length / 2);
    const secondAvg = complexityScores.slice(Math.floor(complexityScores.length / 2))
      .reduce((sum, s) => sum + s, 0) / Math.ceil(complexityScores.length / 2);
    
    return {
      trend: secondAvg > firstAvg + 0.1 ? 'increasing' : secondAvg < firstAvg - 0.1 ? 'decreasing' : 'stable',
      change: secondAvg - firstAvg,
      scores: complexityScores
    };
  }

  identifyEmotionalMilestones(progression) {
    const milestones = [];
    
    // First emotion logged
    if (progression.length > 0) {
      milestones.push({
        type: 'first_entry',
        date: progression[0].timestamp,
        description: 'Started emotional self-tracking'
      });
    }
    
    // First complex emotion (secondary emotions)
    const firstComplex = progression.find(e => e.secondary && e.secondary.length > 0);
    if (firstComplex) {
      milestones.push({
        type: 'complex_emotion',
        date: firstComplex.timestamp,
        description: 'First recognition of multiple emotions'
      });
    }
    
    // High confidence milestone
    const highConfidence = progression.find(e => e.confidence && e.confidence > 0.9);
    if (highConfidence) {
      milestones.push({
        type: 'high_confidence',
        date: highConfidence.timestamp,
        description: 'Achieved high confidence in emotion identification'
      });
    }
    
    return milestones;
  }

  calculateOverallGrowthTrend(timeSegments) {
    if (timeSegments.length < 2) return 'insufficient_data';
    
    // Simple trend calculation based on vocabulary and confidence
    const firstSegment = timeSegments[0];
    const lastSegment = timeSegments[timeSegments.length - 1];
    
    const firstVocab = new Set();
    firstSegment.forEach(e => {
      if (e.primary) firstVocab.add(e.primary);
      if (e.secondary) e.secondary.forEach(s => firstVocab.add(s));
    });
    
    const lastVocab = new Set();
    lastSegment.forEach(e => {
      if (e.primary) lastVocab.add(e.primary);
      if (e.secondary) e.secondary.forEach(s => lastVocab.add(s));
    });
    
    const vocabGrowth = lastVocab.size > firstVocab.size;
    const confidenceGrowth = this.compareConfidence(firstSegment, lastSegment) > 0;
    
    if (vocabGrowth && confidenceGrowth) return 'strong_growth';
    if (vocabGrowth || confidenceGrowth) return 'moderate_growth';
    return 'stable';
  }

  generateGrowthProjections(timeSegments) {
    if (timeSegments.length < 3) return [];
    
    return [
      {
        timeframe: '1 month',
        projection: 'Continued vocabulary expansion and confidence building',
        confidence: 0.7
      },
      {
        timeframe: '3 months',
        projection: 'Development of more sophisticated emotional awareness',
        confidence: 0.6
      },
      {
        timeframe: '6 months',
        projection: 'Integration of emotional skills into daily decision-making',
        confidence: 0.5
      }
    ];
  }

  generateGrowthDescription(growthAnalysis) {
    const trend = growthAnalysis.overallTrend;
    switch (trend) {
      case 'strong_growth':
        return 'Showing excellent progress in emotional intelligence development with expanding vocabulary and increasing confidence';
      case 'moderate_growth':
        return 'Making steady progress in emotional awareness with some areas of improvement';
      case 'stable':
        return 'Maintaining consistent emotional intelligence skills with stable patterns';
      default:
        return 'Emotional intelligence development requires more data for accurate assessment';
    }
  }

  generateGrowthRecommendations(growthAnalysis) {
    const recommendations = [];
    
    if (growthAnalysis.vocabularyGrowth.trend === 'expanding') {
      recommendations.push('Continue exploring new emotional vocabulary');
    } else {
      recommendations.push('Focus on expanding emotional vocabulary through reading and reflection');
    }
    
    if (growthAnalysis.confidenceTrends.trend === 'increasing') {
      recommendations.push('Build on your growing confidence in emotional identification');
    } else {
      recommendations.push('Practice mindful emotion identification to build confidence');
    }
    
    return recommendations;
  }

  getStageSpecificRecommendations(developmentStage) {
    const recommendations = {
      shortTerm: [],
      longTerm: []
    };
    
    switch (developmentStage.key) {
      case 'EARLY_ELEMENTARY':
        recommendations.shortTerm.push({
          title: 'Basic Emotion Recognition',
          description: 'Practice identifying and naming basic emotions',
          timeframe: '2-3 weeks'
        });
        break;
      case 'LATE_ELEMENTARY':
        recommendations.shortTerm.push({
          title: 'Emotion Regulation Strategies',
          description: 'Learn simple coping strategies for difficult emotions',
          timeframe: '3-4 weeks'
        });
        break;
      case 'MIDDLE_SCHOOL':
        recommendations.shortTerm.push({
          title: 'Social-Emotional Skills',
          description: 'Develop empathy and perspective-taking abilities',
          timeframe: '4-6 weeks'
        });
        break;
      case 'HIGH_SCHOOL':
        recommendations.shortTerm.push({
          title: 'Advanced EI Integration',
          description: 'Apply emotional intelligence in leadership and decision-making',
          timeframe: '6-8 weeks'
        });
        break;
    }
    
    return recommendations;
  }

  generateEIExercises(competencyAssessment) {
    const exercises = [];
    
    // Add exercises based on development areas
    competencyAssessment.developmentAreas.forEach(area => {
      switch (area.competency) {
        case 'Self-Awareness':
          exercises.push({
            title: 'Daily Emotion Check-ins',
            description: 'Set 3 daily reminders to identify and rate your current emotion',
            duration: '5 minutes, 3 times daily'
          });
          break;
        case 'Self-Regulation':
          exercises.push({
            title: 'Breathing and Grounding Exercise',
            description: 'Practice 4-7-8 breathing when feeling strong emotions',
            duration: '5-10 minutes as needed'
          });
          break;
        case 'Empathy':
          exercises.push({
            title: 'Perspective-Taking Journal',
            description: 'Write about situations from others\' perspectives',
            duration: '10 minutes, 3 times weekly'
          });
          break;
      }
    });
    
    return exercises;
  }

  getEIResources(developmentStage, competencyAssessment) {
    const resources = [];
    
    // Age-appropriate resources
    switch (developmentStage.key) {
      case 'EARLY_ELEMENTARY':
        resources.push({
          type: 'book',
          title: 'The Way I Feel',
          description: 'Picture book for emotion identification'
        });
        break;
      case 'LATE_ELEMENTARY':
        resources.push({
          type: 'activity',
          title: 'Emotion regulation games',
          description: 'Interactive games for learning coping strategies'
        });
        break;
      case 'MIDDLE_SCHOOL':
        resources.push({
          type: 'course',
          title: 'Social-Emotional Learning modules',
          description: 'Structured curriculum for SEL development'
        });
        break;
      case 'HIGH_SCHOOL':
        resources.push({
          type: 'workshop',
          title: 'Leadership and Emotional Intelligence',
          description: 'Advanced EI application in leadership contexts'
        });
        break;
    }
    
    return resources;
  }

  // Cyclical pattern analysis methods
  analyzeDailyCycles(emotionalProgression) {
    const hourlyPatterns = {};
    
    emotionalProgression.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      if (!hourlyPatterns[hour]) hourlyPatterns[hour] = [];
      hourlyPatterns[hour].push(event);
    });
    
    return {
      patterns: hourlyPatterns,
      peakHours: Object.entries(hourlyPatterns)
        .sort(([,a], [,b]) => b.length - a.length)
        .slice(0, 3)
        .map(([hour, events]) => ({ hour: parseInt(hour), count: events.length }))
    };
  }

  analyzeWeeklyCycles(emotionalProgression) {
    const dailyPatterns = {};
    
    emotionalProgression.forEach(event => {
      const day = new Date(event.timestamp).getDay();
      if (!dailyPatterns[day]) dailyPatterns[day] = [];
      dailyPatterns[day].push(event);
    });
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return {
      patterns: dailyPatterns,
      summary: Object.entries(dailyPatterns).map(([day, events]) => ({
        day: dayNames[parseInt(day)],
        count: events.length,
        avgIntensity: events.filter(e => e.intensity).length > 0 
          ? events.filter(e => e.intensity).reduce((sum, e) => sum + e.intensity, 0) / events.filter(e => e.intensity).length
          : null
      }))
    };
  }

  analyzeMonthlyCycles(emotionalProgression) {
    const monthlyPatterns = {};
    
    emotionalProgression.forEach(event => {
      const month = new Date(event.timestamp).getMonth();
      if (!monthlyPatterns[month]) monthlyPatterns[month] = [];
      monthlyPatterns[month].push(event);
    });
    
    return {
      patterns: monthlyPatterns,
      seasonalTrends: this.analyzeSeasonalTrends(monthlyPatterns)
    };
  }

  analyzeSeasonalTrends(monthlyPatterns) {
    const seasons = {
      winter: [11, 0, 1], // Dec, Jan, Feb
      spring: [2, 3, 4],  // Mar, Apr, May
      summer: [5, 6, 7],  // Jun, Jul, Aug
      fall: [8, 9, 10]    // Sep, Oct, Nov
    };
    
    const seasonalData = {};
    
    Object.entries(seasons).forEach(([season, months]) => {
      seasonalData[season] = months.reduce((total, month) => {
        return total + (monthlyPatterns[month] ? monthlyPatterns[month].length : 0);
      }, 0);
    });
    
    return seasonalData;
  }

  analyzeContextPatterns(triggerInstances) {
    if (triggerInstances.length < 2) return { patterns: [], confidence: 'low' };
    
    // Group by similar contexts
    const contextGroups = {};
    
    triggerInstances.forEach(instance => {
      const context = instance.context.toLowerCase();
      let groupKey = 'other';
      
      if (context.includes('school') || context.includes('class')) groupKey = 'academic';
      else if (context.includes('friend') || context.includes('social')) groupKey = 'social';
      else if (context.includes('family') || context.includes('home')) groupKey = 'family';
      
      if (!contextGroups[groupKey]) contextGroups[groupKey] = [];
      contextGroups[groupKey].push(instance);
    });
    
    const patterns = Object.entries(contextGroups)
      .filter(([, instances]) => instances.length > 1)
      .map(([context, instances]) => ({
        context,
        frequency: instances.length,
        avgConfidence: instances.reduce((sum, i) => sum + i.confidence, 0) / instances.length
      }));
    
    return {
      patterns,
      confidence: patterns.length > 0 ? 'high' : 'moderate'
    };
  }
}

// Singleton instance
let emotionalIntelligenceAnalyzerInstance = null;

const getEmotionalIntelligenceAnalyzer = () => {
  if (!emotionalIntelligenceAnalyzerInstance) {
    emotionalIntelligenceAnalyzerInstance = new EmotionalIntelligenceAnalyzer();
  }
  return emotionalIntelligenceAnalyzerInstance;
};

module.exports = {
  EmotionalIntelligenceAnalyzer,
  getEmotionalIntelligenceAnalyzer,
  EmotionalIntelligenceError,
  EI_COMPETENCIES,
  EMOTIONAL_DEVELOPMENT_STAGES,
  EMOTIONAL_PATTERN_TYPES
}; 