const { Pool } = require('pg');
const { activityMonitor } = require('./activity-monitor');

// Process documentation error class
class ProcessDocumentationError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = 'ProcessDocumentationError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Documentation types
const DOCUMENTATION_TYPES = {
  SESSION_SUMMARY: 'session_summary',           // Overview of a single session
  STUDENT_PROGRESS: 'student_progress',         // Student's progress over time
  LEARNING_PATTERN: 'learning_pattern',         // Learning patterns analysis
  INTERVENTION_ANALYSIS: 'intervention_analysis', // Effectiveness of interventions
  MISTAKE_ANALYSIS: 'mistake_analysis',         // Common mistakes and patterns
  COMPREHENSIVE_REPORT: 'comprehensive_report'  // Full detailed report
};

// Review focus areas
const REVIEW_FOCUS = {
  PROBLEM_SOLVING_PROCESS: 'problem_solving_process',
  CONCEPTUAL_UNDERSTANDING: 'conceptual_understanding',
  PROCEDURAL_FLUENCY: 'procedural_fluency',
  STRATEGIC_THINKING: 'strategic_thinking',
  METACOGNITIVE_SKILLS: 'metacognitive_skills',
  HELP_SEEKING_BEHAVIOR: 'help_seeking_behavior',
  RESILIENCE_PERSISTENCE: 'resilience_persistence'
};

class ProcessDocumentationService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  // ============================================
  // PRECISION UTILITY METHODS
  // ============================================

  // Round to specified decimal places
  roundToPrecision(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return Math.round((parseFloat(value) + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  // Calculate safe percentage (0-100) with proper rounding
  calculatePercentage(numerator, denominator, decimals = 1) {
    if (!denominator || denominator === 0) return 0;
    const percentage = (parseFloat(numerator) / parseFloat(denominator)) * 100;
    return this.roundToPrecision(percentage, decimals);
  }

  // Calculate safe rate (0-1) with proper rounding
  calculateRate(numerator, denominator, decimals = 3) {
    if (!denominator || denominator === 0) return 0;
    const rate = parseFloat(numerator) / parseFloat(denominator);
    return this.roundToPrecision(rate, decimals);
  }

  // Calculate safe average with proper rounding
  calculateAverage(values, decimals = 2) {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const numericValues = values.filter(v => v !== null && v !== undefined && !isNaN(v)).map(v => parseFloat(v));
    if (numericValues.length === 0) return 0;
    const sum = numericValues.reduce((acc, val) => acc + val, 0);
    return this.roundToPrecision(sum / numericValues.length, decimals);
  }

  // ============================================
  // MAIN DOCUMENTATION GENERATION METHODS
  // ============================================

  // Generate comprehensive process documentation for teacher review
  async generateProcessDocumentation(documentationRequest) {
    try {
      const {
        studentId,
        sessionId = null,
        timeWindowDays = 30,
        documentationType = DOCUMENTATION_TYPES.COMPREHENSIVE_REPORT,
        focusAreas = [REVIEW_FOCUS.PROBLEM_SOLVING_PROCESS],
        includeDetailedSteps = true,
        includeInterventions = true,
        includeMistakeAnalysis = true,
        includeRecommendations = true
      } = documentationRequest;

      const client = await this.pool.connect();
      
      try {
        let documentation = {
          generatedAt: new Date().toISOString(),
          documentationType,
          timeWindow: timeWindowDays,
          studentInfo: await this.getStudentInfo(client, studentId),
          summary: {},
          sessions: [],
          patterns: {},
          insights: {},
          recommendations: []
        };

        // Generate documentation based on type
        switch (documentationType) {
          case DOCUMENTATION_TYPES.SESSION_SUMMARY:
            documentation = await this.generateSessionSummary(client, sessionId, includeDetailedSteps);
            break;
          
          case DOCUMENTATION_TYPES.STUDENT_PROGRESS:
            documentation = await this.generateStudentProgress(client, studentId, timeWindowDays);
            break;
          
          case DOCUMENTATION_TYPES.LEARNING_PATTERN:
            documentation = await this.generateLearningPatterns(client, studentId, timeWindowDays);
            break;
          
          case DOCUMENTATION_TYPES.INTERVENTION_ANALYSIS:
            documentation = await this.generateInterventionAnalysis(client, studentId, timeWindowDays);
            break;
          
          case DOCUMENTATION_TYPES.MISTAKE_ANALYSIS:
            documentation = await this.generateMistakeAnalysis(client, studentId, timeWindowDays);
            break;
          
          case DOCUMENTATION_TYPES.COMPREHENSIVE_REPORT:
          default:
            documentation = await this.generateComprehensiveReport(
              client, 
              studentId, 
              timeWindowDays, 
              focusAreas,
              {
                includeDetailedSteps,
                includeInterventions,
                includeMistakeAnalysis,
                includeRecommendations
              }
            );
            break;
        }

        return documentation;

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error generating process documentation:', error);
      throw new ProcessDocumentationError(
        'Failed to generate process documentation',
        'GENERATION_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Generate session-specific documentation
  async generateSessionSummary(client, sessionId, includeDetailedSteps = true) {
    try {
      // Get session overview
      const sessionResult = await client.query(`
        SELECT ps.*, pt.title, pt.problem_type, pt.subject, pt.difficulty_level,
               u.username as student_name
        FROM problem_sessions ps
        JOIN problem_templates pt ON ps.template_id = pt.id
        JOIN users u ON ps.student_id = u.id
        WHERE ps.id = $1
      `, [sessionId]);

      if (sessionResult.rows.length === 0) {
        throw new ProcessDocumentationError('Session not found', 'NOT_FOUND');
      }

      const session = sessionResult.rows[0];

      // Get session steps
      const stepsResult = await client.query(`
        SELECT step_number, step_title, step_type, prompt, student_response,
               response_timestamp, attempts_count, is_completed, completed_at,
               response_quality, accuracy_score, understanding_level,
               ai_feedback, misconceptions_identified, needs_help
        FROM problem_session_steps
        WHERE session_id = $1
        ORDER BY step_number
      `, [sessionId]);

      // Get interventions
      const interventionsResult = await client.query(`
        SELECT intervention_type, intervention_content, trigger_reason,
               provided_at, was_helpful, led_to_progress, scaffolding_style,
               confidence_level
        FROM scaffolding_interventions
        WHERE session_id = $1
        ORDER BY provided_at
      `, [sessionId]);

      // Get mistakes
      const mistakesResult = await client.query(`
        SELECT mistake_type, mistake_category, mistake_description, severity,
               root_cause, was_corrected, understanding_improved, detected_at
        FROM problem_mistakes
        WHERE session_id = $1
        ORDER BY detected_at
      `, [sessionId]);

      // Analyze session patterns
      const sessionAnalysis = this.analyzeSessionPatterns(
        stepsResult.rows,
        interventionsResult.rows,
        mistakesResult.rows
      );

      return {
        documentationType: DOCUMENTATION_TYPES.SESSION_SUMMARY,
        generatedAt: new Date().toISOString(),
        session: {
          id: session.id,
          studentName: session.student_name,
          problemTitle: session.title,
          subject: session.subject,
          difficulty: session.difficulty_level,
          status: session.session_status,
          startedAt: session.started_at,
          completedAt: session.completed_at,
          duration: session.completion_time_minutes,
          accuracy: session.accuracy_score,
          hintsUsed: session.hints_requested,
          mistakesMade: session.mistakes_made
        },
        steps: includeDetailedSteps ? stepsResult.rows : this.summarizeSteps(stepsResult.rows),
        interventions: interventionsResult.rows,
        mistakes: mistakesResult.rows,
        analysis: sessionAnalysis,
        teacherNotes: await this.getTeacherNotes(client, sessionId)
      };

    } catch (error) {
      console.error('Error generating session summary:', error);
      throw error;
    }
  }

  // Generate comprehensive student progress documentation
  async generateComprehensiveReport(client, studentId, timeWindowDays, focusAreas, options) {
    try {
      const report = {
        documentationType: DOCUMENTATION_TYPES.COMPREHENSIVE_REPORT,
        generatedAt: new Date().toISOString(),
        timeWindow: timeWindowDays,
        studentInfo: await this.getStudentInfo(client, studentId),
        executiveSummary: {},
        sessions: [],
        patterns: {},
        insights: {},
        recommendations: []
      };

      // Get all sessions in time window
      const sessionsResult = await client.query(`
        SELECT ps.*, pt.title, pt.problem_type, pt.subject, pt.difficulty_level
        FROM problem_sessions ps
        JOIN problem_templates pt ON ps.template_id = pt.id
        WHERE ps.student_id = $1 
          AND ps.started_at >= NOW() - INTERVAL '${timeWindowDays} days'
        ORDER BY ps.started_at DESC
      `, [studentId]);

      report.sessions = await this.enrichSessionsWithDetails(client, sessionsResult.rows, options);

      // Generate executive summary
      report.executiveSummary = this.generateExecutiveSummary(report.sessions);

      // Analyze patterns for each focus area
      for (const focusArea of focusAreas) {
        report.patterns[focusArea] = await this.analyzePatternsByFocus(
          client, 
          studentId, 
          timeWindowDays, 
          focusArea
        );
      }

      // Generate insights
      report.insights = await this.generateLearningInsights(client, studentId, report.sessions, report.patterns);

      // Generate recommendations if requested
      if (options.includeRecommendations) {
        report.recommendations = await this.generateTeacherRecommendations(
          client, 
          studentId, 
          report.sessions, 
          report.patterns, 
          report.insights
        );
      }

      return report;

    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      throw error;
    }
  }

  // ============================================
  // SPECIALIZED ANALYSIS METHODS
  // ============================================

  // Analyze learning patterns for specific focus areas
  async analyzePatternsByFocus(client, studentId, timeWindowDays, focusArea) {
    try {
      switch (focusArea) {
        case REVIEW_FOCUS.PROBLEM_SOLVING_PROCESS:
          return await this.analyzeProblemSolvingPatterns(client, studentId, timeWindowDays);
        
        case REVIEW_FOCUS.CONCEPTUAL_UNDERSTANDING:
          return await this.analyzeConceptualPatterns(client, studentId, timeWindowDays);
        
        case REVIEW_FOCUS.PROCEDURAL_FLUENCY:
          return await this.analyzeProceduralPatterns(client, studentId, timeWindowDays);
        
        case REVIEW_FOCUS.STRATEGIC_THINKING:
          return await this.analyzeStrategicPatterns(client, studentId, timeWindowDays);
        
        case REVIEW_FOCUS.METACOGNITIVE_SKILLS:
          return await this.analyzeMetacognitivePatterns(client, studentId, timeWindowDays);
        
        case REVIEW_FOCUS.HELP_SEEKING_BEHAVIOR:
          return await this.analyzeHelpSeekingPatterns(client, studentId, timeWindowDays);
        
        case REVIEW_FOCUS.RESILIENCE_PERSISTENCE:
          return await this.analyzeResiliencePatterns(client, studentId, timeWindowDays);
        
        default:
          return await this.analyzeGeneralPatterns(client, studentId, timeWindowDays);
      }
    } catch (error) {
      console.error(`Error analyzing patterns for ${focusArea}:`, error);
      return { focusArea, error: error.message, patterns: [] };
    }
  }

  // Analyze problem-solving process patterns
  async analyzeProblemSolvingPatterns(client, studentId, timeWindowDays) {
    const query = `
      SELECT 
        pss.step_type,
        AVG(pss.accuracy_score) as avg_accuracy,
        COUNT(*) as step_count,
        COUNT(CASE WHEN pss.response_quality = 'excellent' THEN 1 END) as excellent_responses,
        COUNT(CASE WHEN pss.needs_help THEN 1 END) as help_requests,
        AVG(pss.attempts_count) as avg_attempts
      FROM problem_session_steps pss
      JOIN problem_sessions ps ON pss.session_id = ps.id
      WHERE ps.student_id = $1 
        AND ps.started_at >= NOW() - INTERVAL '${timeWindowDays} days'
      GROUP BY pss.step_type
      ORDER BY step_count DESC
    `;

    const result = await client.query(query, [studentId]);

    // Calculate overall accuracy with proper precision
    const accuracyValues = result.rows.map(row => parseFloat(row.avg_accuracy || 0));
    const overallAccuracy = this.calculateAverage(accuracyValues, 3);

    // Calculate help seeking rate with proper precision
    const totalHelpRequests = result.rows.reduce((sum, row) => sum + parseInt(row.help_requests || 0), 0);
    const totalStepCount = result.rows.reduce((sum, row) => sum + parseInt(row.step_count || 0), 0);
    const helpSeekingRate = this.calculateRate(totalHelpRequests, totalStepCount, 3);

    return {
      focusArea: REVIEW_FOCUS.PROBLEM_SOLVING_PROCESS,
      patterns: result.rows,
      analysis: {
        strongestStepType: result.rows[0]?.step_type || 'none',
        overallAccuracy,
        helpSeekingRate
      }
    };
  }

  // Analyze conceptual understanding patterns
  async analyzeConceptualPatterns(client, studentId, timeWindowDays) {
    const query = `
      SELECT 
        pt.subject,
        pt.difficulty_level,
        COUNT(*) as problem_count,
        AVG(ps.accuracy_score) as avg_accuracy,
        COUNT(CASE WHEN pm.mistake_type = 'conceptual' THEN 1 END) as conceptual_mistakes,
        COUNT(CASE WHEN ps.session_status = 'completed' THEN 1 END) as completed_problems
      FROM problem_sessions ps
      JOIN problem_templates pt ON ps.template_id = pt.id
      LEFT JOIN problem_mistakes pm ON ps.id = pm.session_id
      WHERE ps.student_id = $1 
        AND ps.started_at >= NOW() - INTERVAL '${timeWindowDays} days'
      GROUP BY pt.subject, pt.difficulty_level
      ORDER BY problem_count DESC
    `;

    const result = await client.query(query, [studentId]);

    // Calculate conceptual mistake rate with proper precision
    const totalConceptualMistakes = result.rows.reduce((sum, row) => sum + parseInt(row.conceptual_mistakes || 0), 0);
    const totalProblemCount = result.rows.reduce((sum, row) => sum + parseInt(row.problem_count || 0), 0);
    const conceptualMistakeRate = this.calculateRate(totalConceptualMistakes, totalProblemCount, 3);

    return {
      focusArea: REVIEW_FOCUS.CONCEPTUAL_UNDERSTANDING,
      patterns: result.rows,
      analysis: {
        strongestSubject: result.rows.reduce((max, curr) => 
          parseFloat(curr.avg_accuracy) > parseFloat(max.avg_accuracy || 0) ? curr : max, {}
        ).subject || 'none',
        conceptualMistakeRate
      }
    };
  }

  // Analyze help-seeking behavior patterns
  async analyzeHelpSeekingPatterns(client, studentId, timeWindowDays) {
    const query = `
      SELECT 
        si.intervention_type,
        si.trigger_reason,
        COUNT(*) as intervention_count,
        AVG(CASE WHEN si.was_helpful THEN 1 ELSE 0 END) as helpfulness_rate,
        AVG(CASE WHEN si.led_to_progress THEN 1 ELSE 0 END) as progress_rate
      FROM scaffolding_interventions si
      JOIN problem_sessions ps ON si.session_id = ps.id
      WHERE ps.student_id = $1 
        AND si.provided_at >= NOW() - INTERVAL '${timeWindowDays} days'
      GROUP BY si.intervention_type, si.trigger_reason
      ORDER BY intervention_count DESC
    `;

    const result = await client.query(query, [studentId]);

    // Calculate overall helpfulness with proper precision
    const helpfulnessValues = result.rows.map(row => parseFloat(row.helpfulness_rate || 0));
    const overallHelpfulness = this.calculateAverage(helpfulnessValues, 3);

    // Calculate self-advocacy rate with proper precision
    const studentRequestedCount = result.rows
      .filter(row => row.trigger_reason === 'student_requested')
      .reduce((sum, row) => sum + parseInt(row.intervention_count || 0), 0);
    const totalInterventionCount = result.rows.reduce((sum, row) => sum + parseInt(row.intervention_count || 0), 0);
    const selfAdvocacy = this.calculateRate(studentRequestedCount, totalInterventionCount, 3);

    return {
      focusArea: REVIEW_FOCUS.HELP_SEEKING_BEHAVIOR,
      patterns: result.rows,
      analysis: {
        mostCommonTrigger: result.rows[0]?.trigger_reason || 'none',
        overallHelpfulness,
        selfAdvocacy
      }
    };
  }

  // ============================================
  // INSIGHT GENERATION METHODS
  // ============================================

  // Generate comprehensive learning insights
  async generateLearningInsights(client, studentId, sessions, patterns) {
    try {
      const insights = {
        learningStrengths: [],
        areasForImprovement: [],
        learningPreferences: {},
        progressTrends: {},
        behavioralPatterns: {}
      };

      // Analyze strengths
      insights.learningStrengths = this.identifyLearningStrengths(sessions, patterns);

      // Identify improvement areas
      insights.areasForImprovement = this.identifyImprovementAreas(sessions, patterns);

      // Analyze learning preferences
      insights.learningPreferences = this.analyzeLearningPreferences(sessions, patterns);

      // Track progress trends
      insights.progressTrends = this.analyzeProgressTrends(sessions);

      // Identify behavioral patterns
      insights.behavioralPatterns = this.analyzeBehavioralPatterns(sessions, patterns);

      return insights;

    } catch (error) {
      console.error('Error generating learning insights:', error);
      return {
        learningStrengths: [],
        areasForImprovement: [],
        learningPreferences: {},
        progressTrends: {},
        behavioralPatterns: {},
        error: error.message
      };
    }
  }

  // Generate teacher recommendations
  async generateTeacherRecommendations(client, studentId, sessions, patterns, insights) {
    try {
      const recommendations = [];

      // Academic recommendations
      recommendations.push(...this.generateAcademicRecommendations(sessions, patterns, insights));

      // Instructional recommendations
      recommendations.push(...this.generateInstructionalRecommendations(sessions, patterns, insights));

      // Support recommendations
      recommendations.push(...this.generateSupportRecommendations(sessions, patterns, insights));

      // Next steps recommendations
      recommendations.push(...this.generateNextStepsRecommendations(sessions, patterns, insights));

      return recommendations.map(rec => ({
        ...rec,
        priority: this.calculateRecommendationPriority(rec, insights),
        evidence: this.generateRecommendationEvidence(rec, sessions, patterns),
        implementationSuggestions: this.generateImplementationSuggestions(rec)
      }));

    } catch (error) {
      console.error('Error generating teacher recommendations:', error);
      return [{
        category: 'error',
        title: 'Analysis Error',
        description: 'Unable to generate recommendations due to analysis error',
        priority: 'low',
        evidence: [],
        implementationSuggestions: []
      }];
    }
  }

  // ============================================
  // TEACHER REVIEW INTERFACE METHODS
  // ============================================

  // Add teacher review to a session
  async addTeacherReview(reviewData) {
    try {
      const {
        sessionId,
        teacherId,
        reviewType = 'complete',
        overallAssessment,
        strengthsObserved,
        areasForImprovement,
        specificFeedback,
        privateNotes,
        scoringData = {},
        nextSteps,
        recommendedPractice,
        followUpRequired = false
      } = reviewData;

      const client = await this.pool.connect();
      
      try {
        const result = await client.query(`
          INSERT INTO teacher_problem_reviews (
            session_id, teacher_id, review_type, overall_assessment,
            strengths_observed, areas_for_improvement, specific_feedback,
            private_notes, understanding_score, effort_score, process_score,
            final_score, next_steps, recommended_practice, follow_up_required
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id, reviewed_at
        `, [
          sessionId, teacherId, reviewType, overallAssessment,
          strengthsObserved, areasForImprovement, specificFeedback,
          privateNotes, scoringData.understanding || null, scoringData.effort || null,
          scoringData.process || null, scoringData.final || null,
          nextSteps, recommendedPractice, followUpRequired
        ]);

        // Log the review activity
        await activityMonitor.logActivity({
          studentId: null, // Will be filled from session lookup
          sessionId: `teacher_review_${Date.now()}`,
          activityType: 'teacher_review_added',
          details: {
            sessionId,
            teacherId,
            reviewType,
            overallAssessment,
            followUpRequired
          },
          severity: 'low'
        });

        return {
          reviewId: result.rows[0].id,
          reviewedAt: result.rows[0].reviewed_at,
          success: true
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error adding teacher review:', error);
      throw new ProcessDocumentationError(
        'Failed to add teacher review',
        'REVIEW_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Get sessions requiring teacher review
  async getSessionsForReview(teacherId, filters = {}) {
    try {
      const {
        studentId = null,
        subject = null,
        difficulty = null,
        reviewStatus = 'pending', // pending, reviewed, all
        timeWindowDays = 7,
        limit = 20,
        offset = 0
      } = filters;

      const client = await this.pool.connect();
      
      try {
        // Build query conditions
        const conditions = [
          `ps.started_at >= NOW() - INTERVAL '${timeWindowDays} days'`,
          `ps.session_status = 'completed'`
        ];
        const params = [];
        let paramCount = 0;

        if (studentId) {
          conditions.push(`ps.student_id = $${++paramCount}`);
          params.push(studentId);
        }

        if (subject) {
          conditions.push(`pt.subject = $${++paramCount}`);
          params.push(subject);
        }

        if (difficulty) {
          conditions.push(`pt.difficulty_level = $${++paramCount}`);
          params.push(difficulty);
        }

        if (reviewStatus === 'pending') {
          conditions.push(`tpr.id IS NULL`);
        } else if (reviewStatus === 'reviewed') {
          conditions.push(`tpr.id IS NOT NULL`);
        }

        const query = `
          SELECT ps.id, ps.student_id, ps.started_at, ps.completed_at,
                 ps.accuracy_score, ps.completion_time_minutes, ps.hints_requested,
                 ps.mistakes_made, pt.title, pt.subject, pt.difficulty_level,
                 u.username as student_name, tpr.id as review_id,
                 tpr.overall_assessment, tpr.reviewed_at
          FROM problem_sessions ps
          JOIN problem_templates pt ON ps.template_id = pt.id
          JOIN users u ON ps.student_id = u.id
          LEFT JOIN teacher_problem_reviews tpr ON ps.id = tpr.session_id
          WHERE ${conditions.join(' AND ')}
          ORDER BY ps.completed_at DESC
          LIMIT $${++paramCount} OFFSET $${++paramCount}
        `;

        params.push(parseInt(limit), parseInt(offset));

        const result = await client.query(query, params);

        // Get total count
        const countQuery = `
          SELECT COUNT(*) as total
          FROM problem_sessions ps
          JOIN problem_templates pt ON ps.template_id = pt.id
          LEFT JOIN teacher_problem_reviews tpr ON ps.id = tpr.session_id
          WHERE ${conditions.join(' AND ')}
        `;
        
        const countResult = await client.query(countQuery, params.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);

        return {
          sessions: result.rows.map(session => ({
            ...session,
            reviewStatus: session.review_id ? 'reviewed' : 'pending',
            urgency: this.calculateReviewUrgency(session)
          })),
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: offset + result.rows.length < total
          },
          filters
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error getting sessions for review:', error);
      throw new ProcessDocumentationError(
        'Failed to get sessions for review',
        'RETRIEVAL_ERROR',
        { originalError: error.message }
      );
    }
  }

  // ============================================
  // UTILITY AND HELPER METHODS
  // ============================================

  // Get student information
  async getStudentInfo(client, studentId) {
    const result = await client.query(`
      SELECT u.username, s.grade_level, s.learning_preferences
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      WHERE u.id = $1
    `, [studentId]);

    return result.rows[0] || { username: 'Unknown Student', grade_level: null, learning_preferences: {} };
  }

  // Analyze session patterns
  analyzeSessionPatterns(steps, interventions, mistakes) {
    // Calculate completion rate with proper precision
    const completedSteps = steps.filter(step => step.is_completed).length;
    const completionRate = this.calculateRate(completedSteps, steps.length, 3);
    
    // Calculate average accuracy with proper precision
    const accuracyValues = steps.map(step => step.accuracy_score).filter(score => score !== null && score !== undefined);
    const averageAccuracy = this.calculateAverage(accuracyValues, 3);
    
    // Calculate intervention effectiveness with proper precision
    const helpfulInterventions = interventions.filter(i => i.was_helpful).length;
    const interventionEffectiveness = this.calculateRate(helpfulInterventions, interventions.length, 3);
    
    return {
      completionRate,
      averageAccuracy,
      interventionEffectiveness,
      commonMistakeTypes: this.groupMistakesByType(mistakes),
      learningTrajectory: this.analyzeLearningTrajectory(steps),
      helpSeekingBehavior: this.analyzeHelpSeeking(interventions)
    };
  }

  // Generate executive summary
  generateExecutiveSummary(sessions) {
    const completedSessions = sessions.filter(s => s.session_status === 'completed');
    
    // Calculate completion rate with proper precision
    const completionRate = this.calculateRate(completedSessions.length, sessions.length, 3);
    
    // Calculate average accuracy with proper precision
    const accuracyValues = completedSessions.map(s => s.accuracy_score).filter(score => score !== null && score !== undefined);
    const averageAccuracy = this.calculateAverage(accuracyValues, 3);
    
    // Calculate average completion time with proper precision
    const completionTimeValues = completedSessions.map(s => s.completion_time_minutes).filter(time => time !== null && time !== undefined);
    const averageCompletionTime = this.calculateAverage(completionTimeValues, 1);
    
    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      completionRate,
      averageAccuracy,
      averageCompletionTime,
      totalHintsUsed: sessions.reduce((sum, s) => sum + (s.hints_requested || 0), 0),
      totalMistakes: sessions.reduce((sum, s) => sum + (s.mistakes_made || 0), 0),
      mostCommonSubject: this.findMostCommonSubject(sessions),
      progressTrend: this.calculateProgressTrend(sessions)
    };
  }

  // Enrich sessions with detailed information
  async enrichSessionsWithDetails(client, sessions, options) {
    const enrichedSessions = [];

    for (const session of sessions) {
      const enriched = { ...session };

      if (options.includeDetailedSteps) {
        const stepsResult = await client.query(`
          SELECT * FROM problem_session_steps WHERE session_id = $1 ORDER BY step_number
        `, [session.id]);
        enriched.steps = stepsResult.rows;
      }

      if (options.includeInterventions) {
        const interventionsResult = await client.query(`
          SELECT * FROM scaffolding_interventions WHERE session_id = $1 ORDER BY provided_at
        `, [session.id]);
        enriched.interventions = interventionsResult.rows;
      }

      if (options.includeMistakeAnalysis) {
        const mistakesResult = await client.query(`
          SELECT * FROM problem_mistakes WHERE session_id = $1 ORDER BY detected_at
        `, [session.id]);
        enriched.mistakes = mistakesResult.rows;
      }

      enrichedSessions.push(enriched);
    }

    return enrichedSessions;
  }

  // Identify learning strengths
  identifyLearningStrengths(sessions, patterns) {
    const strengths = [];

    // High completion rate
    const completionRate = sessions.filter(s => s.session_status === 'completed').length / sessions.length;
    if (completionRate > 0.8) {
      strengths.push({
        category: 'persistence',
        description: 'High problem completion rate',
        evidence: `Completes ${Math.round(completionRate * 100)}% of attempted problems`
      });
    }

    // High accuracy in specific subjects
    const subjectAccuracy = this.calculateSubjectAccuracy(sessions);
    for (const [subject, accuracy] of Object.entries(subjectAccuracy)) {
      if (accuracy > 0.8) {
        strengths.push({
          category: 'academic',
          description: `Strong performance in ${subject}`,
          evidence: `${Math.round(accuracy * 100)}% accuracy in ${subject} problems`
        });
      }
    }

    return strengths;
  }

  // Identify improvement areas
  identifyImprovementAreas(sessions, patterns) {
    const improvements = [];

    // Low accuracy in specific subjects
    const subjectAccuracy = this.calculateSubjectAccuracy(sessions);
    for (const [subject, accuracy] of Object.entries(subjectAccuracy)) {
      if (accuracy < 0.5) {
        improvements.push({
          category: 'academic',
          description: `Needs support in ${subject}`,
          evidence: `${Math.round(accuracy * 100)}% accuracy in ${subject} problems`
        });
      }
    }

    // High mistake rate
    const averageMistakes = sessions.reduce((sum, s) => sum + (s.mistakes_made || 0), 0) / sessions.length;
    if (averageMistakes > 3) {
      improvements.push({
        category: 'accuracy',
        description: 'Frequent mistakes indicate need for careful review',
        evidence: `Average of ${Math.round(averageMistakes)} mistakes per problem`
      });
    }

    return improvements;
  }

  // Additional helper methods for comprehensive analysis
  calculateSubjectAccuracy(sessions) {
    const subjectData = {};
    
    sessions.forEach(session => {
      if (!subjectData[session.subject]) {
        subjectData[session.subject] = { total: 0, accuracySum: 0 };
      }
      subjectData[session.subject].total += 1;
      subjectData[session.subject].accuracySum += session.accuracy_score || 0;
    });

    const result = {};
    for (const [subject, data] of Object.entries(subjectData)) {
      // Calculate average accuracy with proper precision
      result[subject] = this.roundToPrecision(data.accuracySum / data.total, 3);
    }

    return result;
  }

  analyzeLearningPreferences(sessions, patterns) {
    return {
      preferredSubjects: this.findTopSubjects(sessions, 3),
      preferredDifficulty: this.findPreferredDifficulty(sessions),
      helpSeekingStyle: this.analyzeHelpSeekingStyle(patterns),
      pacePreferences: this.analyzePacePreferences(sessions)
    };
  }

  analyzeProgressTrends(sessions) {
    const sortedSessions = sessions.sort((a, b) => new Date(a.started_at) - new Date(b.started_at));
    
    return {
      accuracyTrend: this.calculateTrend(sortedSessions.map(s => s.accuracy_score || 0)),
      completionTimeTrend: this.calculateTrend(sortedSessions.map(s => s.completion_time_minutes || 0)),
      helpUsageTrend: this.calculateTrend(sortedSessions.map(s => s.hints_requested || 0)),
      improvementRate: this.calculateImprovementRate(sortedSessions)
    };
  }

  // Health check
  async healthCheck() {
    try {
      const dbResult = await this.pool.query('SELECT 1 as test');
      
      return {
        status: 'healthy',
        service: 'process-documentation-service',
        features: {
          database: dbResult.rows.length > 0 ? 'connected' : 'disconnected',
          documentationGeneration: 'enabled',
          teacherReview: 'enabled',
          analyticsEngine: 'enabled'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'process-documentation-service',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Placeholder methods for additional functionality
  summarizeSteps(steps) { return steps.map(s => ({ step_number: s.step_number, is_completed: s.is_completed, quality: s.response_quality })); }
  async getTeacherNotes(client, sessionId) { return []; }
  analyzeProceduralPatterns(client, studentId, timeWindowDays) { return { focusArea: REVIEW_FOCUS.PROCEDURAL_FLUENCY, patterns: [], analysis: {} }; }
  analyzeStrategicPatterns(client, studentId, timeWindowDays) { return { focusArea: REVIEW_FOCUS.STRATEGIC_THINKING, patterns: [], analysis: {} }; }
  analyzeMetacognitivePatterns(client, studentId, timeWindowDays) { return { focusArea: REVIEW_FOCUS.METACOGNITIVE_SKILLS, patterns: [], analysis: {} }; }
  analyzeResiliencePatterns(client, studentId, timeWindowDays) { return { focusArea: REVIEW_FOCUS.RESILIENCE_PERSISTENCE, patterns: [], analysis: {} }; }
  analyzeGeneralPatterns(client, studentId, timeWindowDays) { return { focusArea: 'general', patterns: [], analysis: {} }; }
  generateAcademicRecommendations(sessions, patterns, insights) { return [{ category: 'academic', title: 'Continue current approach', description: 'Student is making good progress' }]; }
  generateInstructionalRecommendations(sessions, patterns, insights) { return [{ category: 'instructional', title: 'Maintain scaffolding level', description: 'Current support level is appropriate' }]; }
  generateSupportRecommendations(sessions, patterns, insights) { return []; }
  generateNextStepsRecommendations(sessions, patterns, insights) { return []; }
  calculateRecommendationPriority(rec, insights) { return 'medium'; }
  generateRecommendationEvidence(rec, sessions, patterns) { return ['Based on session analysis']; }
  generateImplementationSuggestions(rec) { return ['Implement during next class session']; }
  calculateReviewUrgency(session) { return session.mistakes_made > 3 ? 'high' : 'normal'; }
  groupMistakesByType(mistakes) { return mistakes.reduce((acc, m) => { acc[m.mistake_type] = (acc[m.mistake_type] || 0) + 1; return acc; }, {}); }
  analyzeLearningTrajectory(steps) { return { trend: 'improving' }; }
  analyzeHelpSeeking(interventions) { return { frequency: 'appropriate', timing: 'good' }; }
  findMostCommonSubject(sessions) { const subjects = sessions.map(s => s.subject); return subjects.sort((a,b) => subjects.filter(v => v===a).length - subjects.filter(v => v===b).length).pop() || 'general'; }
  calculateProgressTrend(sessions) { return 'improving'; }
  findTopSubjects(sessions, count) { return ['mathematics', 'science']; }
  findPreferredDifficulty(sessions) { return 'medium'; }
  analyzeHelpSeekingStyle(patterns) { return 'balanced'; }
  analyzePacePreferences(sessions) { return 'steady'; }
  calculateTrend(values) { 
    if (!Array.isArray(values) || values.length < 2) return 0;
    
    // Filter out null/undefined values and convert to numbers
    const numericValues = values.filter(v => v !== null && v !== undefined && !isNaN(v)).map(v => parseFloat(v));
    
    if (numericValues.length < 2) return 0;
    
    // Calculate linear trend using least squares method for better accuracy
    const n = numericValues.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ..., n-1
    const sumY = numericValues.reduce((sum, val) => sum + val, 0);
    const sumXY = numericValues.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices
    
    // Calculate slope (trend)
    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return 0;
    
    const slope = (n * sumXY - sumX * sumY) / denominator;
    
    // Return trend with proper precision
    return this.roundToPrecision(slope, 4);
  }
  calculateImprovementRate(sessions) { return 0.1; }
  analyzeBehavioralPatterns(sessions, patterns) { return { engagement: 'high', persistence: 'good' }; }
}

// Singleton instance
let processDocumentationInstance = null;

const getProcessDocumentationService = () => {
  if (!processDocumentationInstance) {
    processDocumentationInstance = new ProcessDocumentationService();
  }
  return processDocumentationInstance;
};

module.exports = {
  ProcessDocumentationService,
  getProcessDocumentationService,
  ProcessDocumentationError,
  DOCUMENTATION_TYPES,
  REVIEW_FOCUS
}; 