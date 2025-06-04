const { Pool } = require('pg');
const { scaffoldingEngine } = require('./scaffolding-engine');
const { getMistakeAnalysisService } = require('./mistake-analysis-service');
const { activityMonitor } = require('./activity-monitor');

// Solution path error class
class SolutionPathError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = 'SolutionPathError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Path categories and characteristics
const PATH_CATEGORIES = {
  ALGORITHMIC: 'algorithmic',           // Step-by-step procedural approach
  CONCEPTUAL: 'conceptual',            // Understanding-based approach
  VISUAL: 'visual',                    // Diagram/visual representation approach
  LOGICAL: 'logical',                  // Logical reasoning approach
  CREATIVE: 'creative',                // Non-standard creative approach
  EFFICIENT: 'efficient',              // Most efficient/shortest approach
  BEGINNER_FRIENDLY: 'beginner_friendly', // Easiest to understand approach
  ADVANCED: 'advanced'                 // Complex/sophisticated approach
};

const PATH_COMPLEXITY = {
  SIMPLE: 'simple',                    // Few steps, basic concepts
  MODERATE: 'moderate',                // Medium complexity
  COMPLEX: 'complex',                  // Many steps, advanced concepts
  EXPERT: 'expert'                     // Requires deep expertise
};

const PATH_LEARNING_STYLE = {
  SEQUENTIAL: 'sequential',            // Step-by-step learners
  GLOBAL: 'global',                   // Big-picture learners
  ACTIVE: 'active',                   // Hands-on learners
  REFLECTIVE: 'reflective',           // Thinking-oriented learners
  VISUAL: 'visual',                   // Visual learners
  VERBAL: 'verbal'                    // Text/verbal learners
};

class SolutionPathService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.scaffoldingEngine = scaffoldingEngine;
    this.mistakeAnalysisService = getMistakeAnalysisService();
    
    // Path recommendation algorithms
    this.pathRecommendationStrategies = this.initializeRecommendationStrategies();
    
    // Path comparison metrics
    this.pathComparisonMetrics = this.initializeComparisonMetrics();
  }

  // ============================================
  // MAIN PATH EXPLORATION METHODS
  // ============================================

  // Get all available solution paths for a problem template
  async getAvailablePaths(templateId, studentId, options = {}) {
    try {
      const {
        includeMetadata = true,
        includePersonalization = true,
        filterByStudentLevel = false,
        sortBy = 'effectiveness'
      } = options;

      const client = await this.pool.connect();
      
      try {
        // Get all paths for the template
        const pathsQuery = `
          SELECT sp.*, 
                 pt.subject, pt.difficulty_level as template_difficulty,
                 pt.grade_level_min, pt.grade_level_max,
                 COALESCE(spu.success_rate, sp.success_rate) as personalized_success_rate,
                 spu.attempts_count, spu.completion_time_avg, spu.preference_score
          FROM solution_paths sp
          JOIN problem_templates pt ON sp.template_id = pt.id
          LEFT JOIN student_path_usage spu ON sp.id = spu.path_id AND spu.student_id = $2
          WHERE sp.template_id = $1
          ORDER BY 
            CASE WHEN $3 = 'effectiveness' THEN COALESCE(spu.success_rate, sp.success_rate) END DESC,
            CASE WHEN $3 = 'preference' THEN COALESCE(spu.preference_score, 0) END DESC,
            CASE WHEN $3 = 'complexity' THEN sp.estimated_time_minutes END ASC,
            sp.times_used DESC
        `;

        const pathsResult = await client.query(pathsQuery, [templateId, studentId, sortBy]);
        let paths = pathsResult.rows;

        // Filter by student level if requested
        if (filterByStudentLevel && studentId) {
          const studentProfile = await this.getStudentProfile(client, studentId);
          paths = this.filterPathsByStudentLevel(paths, studentProfile);
        }

        // Add metadata and personalization
        for (let path of paths) {
          if (includeMetadata) {
            path.metadata = await this.getPathMetadata(client, path.id);
          }
          
          if (includePersonalization && studentId) {
            path.personalization = await this.getPathPersonalization(client, path.id, studentId);
          }
          
          // Add path characteristics
          path.characteristics = this.analyzePathCharacteristics(path);
        }

        return {
          totalPaths: paths.length,
          paths: paths,
          recommendations: includePersonalization ? 
            await this.generatePathRecommendations(templateId, studentId, paths) : null
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error getting available paths:', error);
      throw new SolutionPathError(
        'Failed to retrieve solution paths',
        'RETRIEVAL_ERROR',
        { templateId, studentId, originalError: error.message }
      );
    }
  }

  // Start exploring a specific solution path
  async startPathExploration(pathExplorationData) {
    try {
      const {
        pathId,
        studentId,
        sessionId,
        explorationMode = 'guided', // guided, independent, comparison
        requestInfo = {}
      } = pathExplorationData;

      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');

        // Get the solution path details
        const pathResult = await client.query(`
          SELECT sp.*, pt.title as template_title, pt.subject, pt.difficulty_level
          FROM solution_paths sp
          JOIN problem_templates pt ON sp.template_id = pt.id
          WHERE sp.id = $1
        `, [pathId]);

        if (pathResult.rows.length === 0) {
          throw new SolutionPathError('Solution path not found', 'NOT_FOUND');
        }

        const path = pathResult.rows[0];

        // Create path exploration session
        const explorationSession = await this.createPathExplorationSession(
          client,
          pathId,
          studentId,
          sessionId,
          explorationMode,
          requestInfo
        );

        // Generate initial guidance based on the path approach
        const initialGuidance = await this.generatePathGuidance(
          path,
          explorationSession,
          studentId,
          0 // Step 0 = introduction
        );

        // Log path exploration start
        await this.logPathExploration(
          client,
          explorationSession.id,
          'path_started',
          { pathId, explorationMode }
        );

        await client.query('COMMIT');

        // Log activity
        await activityMonitor.logActivity({
          studentId,
          sessionId: requestInfo.sessionId || `path_exploration_${Date.now()}`,
          activityType: 'solution_path_exploration_started',
          details: {
            pathId,
            pathName: path.path_name,
            templateId: path.template_id,
            explorationMode,
            estimatedTime: path.estimated_time_minutes
          },
          severity: 'low'
        });

        return {
          explorationSession,
          pathInfo: {
            id: path.id,
            name: path.path_name,
            description: path.path_description,
            category: this.categorizePathApproach(path),
            complexity: this.assessPathComplexity(path),
            estimatedTime: path.estimated_time_minutes,
            steps: JSON.parse(path.solution_steps || '[]')
          },
          initialGuidance,
          nextStepInfo: await this.getNextStepInfo(path, 1)
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error starting path exploration:', error);
      throw error;
    }
  }

  // Compare multiple solution paths
  async comparePathsForStudent(comparisonData) {
    try {
      const {
        pathIds,
        studentId,
        comparisonCriteria = ['efficiency', 'complexity', 'learning_value', 'success_rate'],
        includePersonalization = true
      } = comparisonData;

      const client = await this.pool.connect();
      
      try {
        // Get detailed information for all paths
        const pathsQuery = `
          SELECT sp.*, 
                 pt.subject, pt.difficulty_level,
                 COALESCE(spu.success_rate, sp.success_rate) as student_success_rate,
                 spu.attempts_count, spu.completion_time_avg, spu.preference_score
          FROM solution_paths sp
          JOIN problem_templates pt ON sp.template_id = pt.id
          LEFT JOIN student_path_usage spu ON sp.id = spu.path_id AND spu.student_id = $1
          WHERE sp.id = ANY($2)
        `;

        const pathsResult = await client.query(pathsQuery, [studentId, pathIds]);
        const paths = pathsResult.rows;

        if (paths.length === 0) {
          throw new SolutionPathError('No valid paths found for comparison', 'NOT_FOUND');
        }

        // Perform detailed comparison
        const comparison = {
          paths: [],
          criteriaAnalysis: {},
          recommendations: {},
          visualizations: {}
        };

        // Analyze each path
        for (const path of paths) {
          const pathAnalysis = await this.analyzePathForComparison(path, studentId, comparisonCriteria);
          comparison.paths.push(pathAnalysis);
        }

        // Generate criteria-based comparisons
        for (const criterion of comparisonCriteria) {
          comparison.criteriaAnalysis[criterion] = this.comparePathsByCriterion(comparison.paths, criterion);
        }

        // Generate personalized recommendations
        if (includePersonalization) {
          comparison.recommendations = await this.generateComparisonRecommendations(
            comparison.paths,
            studentId,
            comparisonCriteria
          );
        }

        // Generate comparison visualizations data
        comparison.visualizations = this.generateComparisonVisualizations(comparison.paths, comparisonCriteria);

        return comparison;

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error comparing solution paths:', error);
      throw new SolutionPathError(
        'Failed to compare solution paths',
        'COMPARISON_ERROR',
        { pathIds, originalError: error.message }
      );
    }
  }

  // Discover alternative paths based on current approach
  async discoverAlternativePaths(discoveryData) {
    try {
      const {
        currentPathId,
        studentId,
        currentStepNumber,
        studentResponse,
        templateId,
        discoveryMode = 'adaptive' // adaptive, comprehensive, targeted
      } = discoveryData;

      const client = await this.pool.connect();
      
      try {
        // Get current path and student progress
        const currentPath = await this.getPathById(client, currentPathId);
        const studentProfile = await this.getStudentProfile(client, studentId);
        
        // Analyze student's current approach
        const approachAnalysis = await this.analyzeStudentApproach(
          studentResponse,
          currentPath,
          currentStepNumber,
          studentId
        );

        // Find alternative paths
        const alternativePaths = await this.findAlternativePathsForTemplate(
          client,
          templateId,
          currentPathId,
          approachAnalysis,
          studentProfile,
          discoveryMode
        );

        // Generate discovery insights
        const discoveryInsights = await this.generateDiscoveryInsights(
          currentPath,
          alternativePaths,
          approachAnalysis,
          studentProfile
        );

        // Create path switching opportunities
        const switchingOpportunities = await this.identifyPathSwitchingOpportunities(
          currentPath,
          alternativePaths,
          currentStepNumber,
          studentProfile
        );

        return {
          currentPath: {
            id: currentPath.id,
            name: currentPath.path_name,
            category: this.categorizePathApproach(currentPath),
            progress: currentStepNumber
          },
          alternativePaths: alternativePaths.map(path => ({
            ...path,
            discoveryReason: path.discoveryReason,
            switchingPoints: path.switchingPoints,
            benefitsOverCurrent: path.benefitsOverCurrent
          })),
          insights: discoveryInsights,
          switchingOpportunities,
          recommendations: await this.generatePathSwitchingRecommendations(
            currentPath,
            alternativePaths,
            studentProfile,
            currentStepNumber
          )
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error discovering alternative paths:', error);
      throw new SolutionPathError(
        'Failed to discover alternative paths',
        'DISCOVERY_ERROR',
        { currentPathId, originalError: error.message }
      );
    }
  }

  // Track path exploration progress and learning outcomes
  async trackPathProgress(progressData) {
    try {
      const {
        explorationSessionId,
        pathId,
        studentId,
        stepNumber,
        stepResponse,
        timeSpent,
        difficultyRating,
        satisfactionRating,
        insights = []
      } = progressData;

      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');

        // Update exploration session progress
        await client.query(`
          UPDATE path_exploration_sessions 
          SET current_step = $1, 
              total_time_spent = total_time_spent + $2,
              last_activity_at = NOW(),
              insights_gained = insights_gained || $3
          WHERE id = $4
        `, [stepNumber, timeSpent || 0, JSON.stringify(insights), explorationSessionId]);

        // Log step completion
        await client.query(`
          INSERT INTO path_step_completions (
            exploration_session_id, path_id, step_number, step_response,
            time_spent, difficulty_rating, satisfaction_rating, completed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          explorationSessionId, pathId, stepNumber, stepResponse,
          timeSpent, difficultyRating, satisfactionRating
        ]);

        // Update student path usage statistics
        await this.updateStudentPathUsage(client, studentId, pathId, {
          stepCompleted: stepNumber,
          timeSpent,
          difficultyRating,
          satisfactionRating
        });

        // Generate adaptive recommendations based on progress
        const adaptiveRecommendations = await this.generateAdaptiveRecommendations(
          client,
          explorationSessionId,
          pathId,
          studentId,
          stepNumber
        );

        await client.query('COMMIT');

        return {
          progressTracked: true,
          currentStep: stepNumber,
          adaptiveRecommendations,
          nextStepGuidance: await this.generateNextStepGuidance(pathId, stepNumber + 1, studentId),
          pathCompletionPercentage: await this.calculatePathCompletionPercentage(explorationSessionId)
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error tracking path progress:', error);
      throw new SolutionPathError(
        'Failed to track path progress',
        'TRACKING_ERROR',
        { explorationSessionId, originalError: error.message }
      );
    }
  }

  // ============================================
  // PATH ANALYSIS AND RECOMMENDATION METHODS
  // ============================================

  // Analyze path characteristics for intelligent recommendations
  analyzePathCharacteristics(path) {
    const characteristics = {
      category: this.categorizePathApproach(path),
      complexity: this.assessPathComplexity(path),
      learningStyle: this.identifyPathLearningStyle(path),
      prerequisites: this.extractPathPrerequisites(path),
      strengths: this.identifyPathStrengths(path),
      challenges: this.identifyPathChallenges(path)
    };

    return characteristics;
  }

  // Categorize the approach type of a path
  categorizePathApproach(path) {
    const description = (path.path_description || '').toLowerCase();
    const steps = JSON.parse(path.solution_steps || '[]');

    // Analyze description and steps to categorize
    if (description.includes('formula') || description.includes('algorithm')) {
      return PATH_CATEGORIES.ALGORITHMIC;
    } else if (description.includes('visual') || description.includes('diagram')) {
      return PATH_CATEGORIES.VISUAL;
    } else if (description.includes('concept') || description.includes('understand')) {
      return PATH_CATEGORIES.CONCEPTUAL;
    } else if (description.includes('creative') || description.includes('alternative')) {
      return PATH_CATEGORIES.CREATIVE;
    } else if (path.estimated_time_minutes <= 5) {
      return PATH_CATEGORIES.EFFICIENT;
    } else if (path.difficulty_level === 'easy') {
      return PATH_CATEGORIES.BEGINNER_FRIENDLY;
    } else if (path.difficulty_level === 'advanced') {
      return PATH_CATEGORIES.ADVANCED;
    } else {
      return PATH_CATEGORIES.LOGICAL;
    }
  }

  // Assess the complexity level of a path
  assessPathComplexity(path) {
    const steps = JSON.parse(path.solution_steps || '[]');
    const stepCount = steps.length;
    const estimatedTime = path.estimated_time_minutes || 10;

    if (stepCount <= 3 && estimatedTime <= 5) {
      return PATH_COMPLEXITY.SIMPLE;
    } else if (stepCount <= 6 && estimatedTime <= 15) {
      return PATH_COMPLEXITY.MODERATE;
    } else if (stepCount <= 10 && estimatedTime <= 30) {
      return PATH_COMPLEXITY.COMPLEX;
    } else {
      return PATH_COMPLEXITY.EXPERT;
    }
  }

  // Identify the learning style best suited for a path
  identifyPathLearningStyle(path) {
    const description = (path.path_description || '').toLowerCase();
    const steps = JSON.parse(path.solution_steps || '[]');

    if (description.includes('visual') || description.includes('diagram') || description.includes('graph')) {
      return PATH_LEARNING_STYLE.VISUAL;
    } else if (description.includes('step') || description.includes('sequential')) {
      return PATH_LEARNING_STYLE.SEQUENTIAL;
    } else if (description.includes('concept') || description.includes('big picture')) {
      return PATH_LEARNING_STYLE.GLOBAL;
    } else if (description.includes('hands-on') || description.includes('practice')) {
      return PATH_LEARNING_STYLE.ACTIVE;
    } else if (description.includes('think') || description.includes('reflect')) {
      return PATH_LEARNING_STYLE.REFLECTIVE;
    } else {
      return PATH_LEARNING_STYLE.VERBAL;
    }
  }

  // Generate personalized path recommendations
  async generatePathRecommendations(templateId, studentId, availablePaths) {
    try {
      const studentProfile = await this.getStudentProfileSummary(studentId);
      const recommendations = {
        primary: null,
        alternatives: [],
        reasoning: {}
      };

      // Score paths based on student profile
      const scoredPaths = availablePaths.map(path => ({
        ...path,
        recommendationScore: this.calculatePathRecommendationScore(path, studentProfile)
      }));

      // Sort by recommendation score
      scoredPaths.sort((a, b) => b.recommendationScore - a.recommendationScore);

      // Primary recommendation
      recommendations.primary = scoredPaths[0];
      recommendations.reasoning.primary = this.generateRecommendationReasoning(
        scoredPaths[0],
        studentProfile,
        'primary'
      );

      // Alternative recommendations
      recommendations.alternatives = scoredPaths.slice(1, 4).map(path => ({
        ...path,
        reason: this.generateRecommendationReasoning(path, studentProfile, 'alternative')
      }));

      return recommendations;

    } catch (error) {
      console.error('Error generating path recommendations:', error);
      return null;
    }
  }

  // Calculate recommendation score for a path based on student profile
  calculatePathRecommendationScore(path, studentProfile) {
    let score = 0;

    // Base success rate weight (40%)
    score += (path.personalized_success_rate || path.success_rate || 0.5) * 40;

    // Learning style match weight (25%)
    const pathLearningStyle = this.identifyPathLearningStyle(path);
    if (studentProfile.preferredLearningStyle === pathLearningStyle) {
      score += 25;
    } else if (studentProfile.adaptiveLearningStyles?.includes(pathLearningStyle)) {
      score += 15;
    }

    // Complexity appropriateness weight (20%)
    const pathComplexity = this.assessPathComplexity(path);
    const complexityMatch = this.assessComplexityMatch(pathComplexity, studentProfile);
    score += complexityMatch * 20;

    // Previous preference weight (10%)
    if (path.preference_score) {
      score += (path.preference_score / 5) * 10;
    }

    // Time efficiency weight (5%)
    const timeEfficiency = Math.max(0, 1 - (path.estimated_time_minutes || 15) / 60);
    score += timeEfficiency * 5;

    return Math.round(score * 100) / 100;
  }

  // ============================================
  // PATH EXPLORATION SESSION MANAGEMENT
  // ============================================

  // Create a new path exploration session
  async createPathExplorationSession(client, pathId, studentId, problemSessionId, explorationMode, requestInfo) {
    const sessionResult = await client.query(`
      INSERT INTO path_exploration_sessions (
        path_id, student_id, problem_session_id, exploration_mode,
        started_at, current_step, total_steps, session_metadata
      ) VALUES ($1, $2, $3, $4, NOW(), 1, 
                (SELECT array_length(string_to_array(solution_steps::text, ','), 1) 
                 FROM solution_paths WHERE id = $1), $5)
      RETURNING id, started_at
    `, [
      pathId, studentId, problemSessionId, explorationMode,
      JSON.stringify(requestInfo)
    ]);

    return {
      id: sessionResult.rows[0].id,
      pathId,
      studentId,
      explorationMode,
      startedAt: sessionResult.rows[0].started_at,
      currentStep: 1
    };
  }

  // Generate guidance for path exploration
  async generatePathGuidance(path, explorationSession, studentId, stepNumber) {
    try {
      const steps = JSON.parse(path.solution_steps || '[]');
      const currentStep = steps[stepNumber] || null;

      // Use scaffolding engine for guidance
      const scaffoldingContext = {
        studentId,
        currentContent: currentStep ? currentStep.description : path.path_description,
        scaffoldingType: 'SOLUTION_PATH_EXPLORATION',
        subject: path.subject || 'general',
        difficulty: path.difficulty_level || 'medium',
        sessionContext: {
          pathName: path.path_name,
          pathCategory: this.categorizePathApproach(path),
          explorationMode: explorationSession.explorationMode,
          stepNumber,
          totalSteps: steps.length
        }
      };

      const scaffoldingResult = await this.scaffoldingEngine.generateScaffoldingPrompt(scaffoldingContext);

      return {
        content: scaffoldingResult.prompt,
        style: scaffoldingResult.scaffolding_style,
        pathSpecificHints: this.generatePathSpecificHints(path, stepNumber),
        encouragement: this.generateEncouragement(path, explorationSession),
        nextStepPreview: stepNumber < steps.length - 1 ? steps[stepNumber + 1]?.title : null
      };

    } catch (error) {
      console.error('Error generating path guidance:', error);
      return {
        content: `Let's explore the ${path.path_name} approach. This method focuses on ${path.path_description}.`,
        style: 'SUPPORTIVE',
        pathSpecificHints: [],
        encouragement: 'You\'re doing great! Take your time to understand each step.',
        nextStepPreview: null
      };
    }
  }

  // ============================================
  // UTILITY AND HELPER METHODS
  // ============================================

  // Initialize recommendation strategies
  initializeRecommendationStrategies() {
    return {
      effectiveness: (paths, profile) => this.recommendByEffectiveness(paths, profile),
      learningStyle: (paths, profile) => this.recommendByLearningStyle(paths, profile),
      adaptiveComplexity: (paths, profile) => this.recommendByAdaptiveComplexity(paths, profile),
      novelty: (paths, profile) => this.recommendByNovelty(paths, profile)
    };
  }

  // Initialize comparison metrics
  initializeComparisonMetrics() {
    return {
      efficiency: {
        name: 'Time Efficiency',
        weight: 0.3,
        calculate: (path) => Math.max(0, 1 - (path.estimated_time_minutes || 15) / 60)
      },
      complexity: {
        name: 'Complexity Level',
        weight: 0.25,
        calculate: (path) => this.normalizeComplexity(this.assessPathComplexity(path))
      },
      success_rate: {
        name: 'Success Rate',
        weight: 0.25,
        calculate: (path) => path.student_success_rate || path.success_rate || 0.5
      },
      learning_value: {
        name: 'Learning Value',
        weight: 0.2,
        calculate: (path) => this.calculateLearningValue(path)
      }
    };
  }

  // Get student profile for personalization
  async getStudentProfile(client, studentId) {
    const profileResult = await client.query(`
      SELECT * FROM students WHERE user_id = $1
    `, [studentId]);

    if (profileResult.rows.length === 0) {
      return this.getDefaultStudentProfile();
    }

    return profileResult.rows[0];
  }

  // Get summary of student profile for recommendations
  async getStudentProfileSummary(studentId) {
    try {
      const client = await this.pool.connect();
      try {
        const profile = await this.getStudentProfile(client, studentId);
        
        // Add calculated preferences from usage history
        const usagePreferences = await this.calculateUsagePreferences(client, studentId);
        
        return {
          ...profile,
          ...usagePreferences,
          preferredLearningStyle: this.inferPreferredLearningStyle(profile, usagePreferences),
          adaptiveLearningStyles: this.inferAdaptiveLearningStyles(profile, usagePreferences)
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting student profile summary:', error);
      return this.getDefaultStudentProfile();
    }
  }

  // Get default student profile
  getDefaultStudentProfile() {
    return {
      grade_level: 8,
      preferred_difficulty: 'medium',
      learning_patterns: {},
      preferredLearningStyle: PATH_LEARNING_STYLE.SEQUENTIAL,
      adaptiveLearningStyles: [PATH_LEARNING_STYLE.VISUAL, PATH_LEARNING_STYLE.ACTIVE]
    };
  }

  // Health check
  async healthCheck() {
    try {
      const dbResult = await this.pool.query('SELECT 1 as test');
      
      return {
        status: 'healthy',
        service: 'solution-path-service',
        features: {
          database: dbResult.rows.length > 0 ? 'connected' : 'disconnected',
          pathRecommendation: 'enabled',
          pathComparison: 'enabled',
          pathDiscovery: 'enabled',
          adaptiveGuidance: 'enabled'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'solution-path-service',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Additional helper methods (simplified implementations)
  async getPathById(client, pathId) {
    const result = await client.query('SELECT * FROM solution_paths WHERE id = $1', [pathId]);
    return result.rows[0];
  }

  async getNextStepInfo(path, stepNumber) {
    const steps = JSON.parse(path.solution_steps || '[]');
    const nextStep = steps[stepNumber - 1];
    return nextStep ? {
      stepNumber,
      title: nextStep.title,
      description: nextStep.description,
      estimatedTime: nextStep.estimatedTime || 5
    } : null;
  }

  generatePathSpecificHints(path, stepNumber) {
    const category = this.categorizePathApproach(path);
    const hints = [];

    switch (category) {
      case PATH_CATEGORIES.VISUAL:
        hints.push('Try drawing a diagram to visualize the problem');
        break;
      case PATH_CATEGORIES.ALGORITHMIC:
        hints.push('Follow each step carefully in order');
        break;
      case PATH_CATEGORIES.CONCEPTUAL:
        hints.push('Focus on understanding the underlying concept');
        break;
      default:
        hints.push('Take your time to understand this approach');
    }

    return hints;
  }

  generateEncouragement(path, explorationSession) {
    const messages = [
      `Great choice exploring the ${path.path_name} approach!`,
      'You\'re learning multiple ways to solve problems - that\'s excellent!',
      'Each approach you learn makes you a stronger problem solver.',
      'Take your time to really understand this method.'
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Placeholder methods for more complex functionality
  async analyzeStudentApproach(response, path, stepNumber, studentId) {
    return {
      approach_type: 'mixed',
      confidence_level: 'medium',
      alignment_with_path: 0.7,
      identified_patterns: []
    };
  }

  async findAlternativePathsForTemplate(client, templateId, currentPathId, analysis, profile, mode) {
    const result = await client.query(`
      SELECT * FROM solution_paths 
      WHERE template_id = $1 AND id != $2 
      ORDER BY success_rate DESC LIMIT 5
    `, [templateId, currentPathId]);
    
    return result.rows.map(path => ({
      ...path,
      discoveryReason: 'Alternative approach available',
      benefitsOverCurrent: 'Different perspective on the problem'
    }));
  }

  async generateDiscoveryInsights(currentPath, alternatives, analysis, profile) {
    return {
      total_alternatives: alternatives.length,
      recommended_exploration: alternatives.slice(0, 2),
      learning_opportunity: 'Exploring different approaches enhances problem-solving flexibility'
    };
  }

  async identifyPathSwitchingOpportunities(currentPath, alternatives, currentStep, profile) {
    return alternatives.map(alt => ({
      pathId: alt.id,
      pathName: alt.path_name,
      switchingPoint: Math.max(1, currentStep - 1),
      reason: 'Alternative approach may be more suitable'
    }));
  }

  async generatePathSwitchingRecommendations(currentPath, alternatives, profile, currentStep) {
    return {
      shouldSwitch: false,
      reason: 'Continue with current approach for consistency',
      alternatives: alternatives.slice(0, 2)
    };
  }

  // Additional placeholder methods for full functionality
  filterPathsByStudentLevel(paths, profile) { return paths; }
  async getPathMetadata(client, pathId) { return {}; }
  async getPathPersonalization(client, pathId, studentId) { return {}; }
  async analyzePathForComparison(path, studentId, criteria) { return path; }
  comparePathsByCriterion(paths, criterion) { return {}; }
  async generateComparisonRecommendations(paths, studentId, criteria) { return {}; }
  generateComparisonVisualizations(paths, criteria) { return {}; }
  async updateStudentPathUsage(client, studentId, pathId, data) { return; }
  async generateAdaptiveRecommendations(client, sessionId, pathId, studentId, step) { return []; }
  async generateNextStepGuidance(pathId, stepNumber, studentId) { return null; }
  async calculatePathCompletionPercentage(sessionId) { return 0; }
  async logPathExploration(client, sessionId, action, data) { return; }
  extractPathPrerequisites(path) { return []; }
  identifyPathStrengths(path) { return []; }
  identifyPathChallenges(path) { return []; }
  generateRecommendationReasoning(path, profile, type) { return 'Recommended based on your profile'; }
  assessComplexityMatch(pathComplexity, profile) { return 0.8; }
  normalizeComplexity(complexity) { return 0.5; }
  calculateLearningValue(path) { return 0.7; }
  async calculateUsagePreferences(client, studentId) { return {}; }
  inferPreferredLearningStyle(profile, usage) { return PATH_LEARNING_STYLE.SEQUENTIAL; }
  inferAdaptiveLearningStyles(profile, usage) { return [PATH_LEARNING_STYLE.VISUAL]; }
}

// Singleton instance
let solutionPathInstance = null;

const getSolutionPathService = () => {
  if (!solutionPathInstance) {
    solutionPathInstance = new SolutionPathService();
  }
  return solutionPathInstance;
};

module.exports = {
  SolutionPathService,
  getSolutionPathService,
  SolutionPathError,
  PATH_CATEGORIES,
  PATH_COMPLEXITY,
  PATH_LEARNING_STYLE
}; 