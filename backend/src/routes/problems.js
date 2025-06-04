const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { roleCheck } = require('../middleware/role-check');
const { getProblemSolvingService, STEP_TYPES, INTERVENTION_TRIGGERS } = require('../services/problem-solving-service');
const { activityMonitor } = require('../services/activity-monitor');

// Helper function to get user from request
const getUserFromRequest = (req) => {
  return {
    id: req.user.id,
    role: req.user.role,
    age: req.user.age || null
  };
};

// Helper function to get request info for activity logging
const getRequestInfo = (req) => {
  return {
    sessionId: req.sessionId || `${req.user.id}_${Date.now()}`,
    source: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web',
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    userRole: req.user.role,
    emotionalState: req.body.emotionalState || req.query.emotionalState
  };
};

// ============================================
// PRECISION UTILITY FUNCTIONS
// ============================================

// Round to specified decimal places
const roundToPrecision = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return 0;
  return Math.round((parseFloat(value) + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// Calculate safe percentage (0-100) with proper rounding
const calculatePercentage = (numerator, denominator, decimals = 1) => {
  if (!denominator || denominator === 0) return 0;
  const percentage = (parseFloat(numerator) / parseFloat(denominator)) * 100;
  return roundToPrecision(percentage, decimals);
};

// Calculate safe average with proper rounding
const calculateAverage = (values, decimals = 2) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const numericValues = values.filter(v => v !== null && v !== undefined && !isNaN(v)).map(v => parseFloat(v));
  if (numericValues.length === 0) return 0;
  const sum = numericValues.reduce((acc, val) => acc + val, 0);
  return roundToPrecision(sum / numericValues.length, decimals);
};

// ============================================
// PROBLEM TEMPLATES ROUTES
// ============================================

// Get available problem templates
router.get('/templates', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      problemType,
      subject,
      difficulty,
      gradeLevel,
      limit = 20,
      offset = 0,
      searchQuery,
      tags
    } = req.query;

    const problemSolvingService = getProblemSolvingService();
    
    // Build query conditions
    const conditions = ['pt.is_active = true'];
    const params = [];
    let paramCount = 0;

    if (problemType) {
      conditions.push(`pt.problem_type = $${++paramCount}`);
      params.push(problemType);
    }

    if (subject) {
      conditions.push(`pt.subject = $${++paramCount}`);
      params.push(subject);
    }

    if (difficulty) {
      conditions.push(`pt.difficulty_level = $${++paramCount}`);
      params.push(difficulty);
    }

    if (gradeLevel) {
      conditions.push(`pt.grade_level_min <= $${++paramCount} AND pt.grade_level_max >= $${++paramCount}`);
      params.push(parseInt(gradeLevel), parseInt(gradeLevel));
      paramCount++;
    }

    if (searchQuery) {
      conditions.push(`(pt.title ILIKE $${++paramCount} OR pt.description ILIKE $${++paramCount})`);
      params.push(`%${searchQuery}%`, `%${searchQuery}%`);
      paramCount++;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      conditions.push(`pt.tags && $${++paramCount}`);
      params.push(tagArray);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT pt.id, pt.title, pt.description, pt.problem_type, pt.subject, 
             pt.difficulty_level, pt.grade_level_min, pt.grade_level_max,
             pt.estimated_time_minutes, pt.tags, pt.learning_objectives,
             pt.usage_count, pt.success_rate, pt.average_completion_time,
             pt.created_at
      FROM problem_templates pt
      ${whereClause}
      ORDER BY pt.usage_count DESC, pt.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    params.push(parseInt(limit), parseInt(offset));

    const result = await problemSolvingService.pool.query(query, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM problem_templates pt
      ${whereClause}
    `;
    
    const countResult = await problemSolvingService.pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      templates: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + result.rows.length < total
      },
      filters: { problemType, subject, difficulty, gradeLevel, searchQuery, tags }
    });

  } catch (error) {
    console.error('Error fetching problem templates:', error);
    res.status(500).json({ error: 'Failed to fetch problem templates' });
  }
});

// Get specific problem template details
router.get('/templates/:templateId', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const { templateId } = req.params;
    const problemSolvingService = getProblemSolvingService();

    const result = await problemSolvingService.pool.query(`
      SELECT pt.*, 
             COALESCE(sp.times_used, 0) as alternative_paths_count
      FROM problem_templates pt
      LEFT JOIN (
        SELECT template_id, COUNT(*) as times_used
        FROM solution_paths
        GROUP BY template_id
      ) sp ON pt.id = sp.template_id
      WHERE pt.id = $1 AND pt.is_active = true
    `, [templateId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem template not found' });
    }

    const template = result.rows[0];

    // Get solution paths for this template
    const pathsResult = await problemSolvingService.pool.query(`
      SELECT id, path_name, path_description, difficulty_level, is_optimal, estimated_time_minutes
      FROM solution_paths
      WHERE template_id = $1
      ORDER BY is_optimal DESC, times_used DESC
    `, [templateId]);

    res.json({
      template: {
        ...template,
        solutionPaths: pathsResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching problem template:', error);
    res.status(500).json({ error: 'Failed to fetch problem template' });
  }
});

// ============================================
// PROBLEM SESSION ROUTES
// ============================================

// Start a new problem-solving session
router.post('/sessions', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const requestInfo = getRequestInfo(req);
    const { templateId, notes } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const problemSolvingService = getProblemSolvingService();

    const sessionData = {
      studentId: user.id,
      templateId,
      requestInfo: {
        ...requestInfo,
        sessionNotes: notes
      }
    };

    const result = await problemSolvingService.startProblemSession(sessionData);

    res.status(201).json({
      sessionId: result.sessionId,
      problemInstance: result.problemInstance,
      currentStep: result.currentStep,
      totalSteps: result.totalSteps,
      guidance: result.firstStepGuidance,
      startedAt: result.startedAt
    });

  } catch (error) {
    console.error('Error starting problem session:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to start problem session' });
  }
});

// Get current session state
router.get('/sessions/:sessionId', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { sessionId } = req.params;

    const problemSolvingService = getProblemSolvingService();
    
    // Students can only access their own sessions
    const studentId = user.role === 'student' ? user.id : req.query.studentId;
    
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required for non-student users' });
    }

    const sessionState = await problemSolvingService.getSessionState(sessionId, studentId);

    res.json(sessionState);

  } catch (error) {
    console.error('Error getting session state:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to get session state' });
  }
});

// Submit response to current step
router.post('/sessions/:sessionId/steps/:stepNumber/response', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const requestInfo = getRequestInfo(req);
    const { sessionId, stepNumber } = req.params;
    const { response, timeSpent, requestHelp = false } = req.body;

    if (!response || response.trim().length === 0) {
      return res.status(400).json({ error: 'Response is required' });
    }

    const problemSolvingService = getProblemSolvingService();

    const responseData = {
      stepNumber: parseInt(stepNumber),
      response: response.trim(),
      timeSpent,
      requestHelp
    };

    const result = await problemSolvingService.submitStepResponse(
      sessionId, 
      user.id, 
      responseData, 
      requestInfo
    );

    res.json({
      stepNumber: result.stepNumber,
      analysis: result.analysisResult,
      nextAction: result.nextAction,
      scaffolding: result.scaffoldingResponse,
      progress: result.sessionProgress
    });

  } catch (error) {
    console.error('Error submitting step response:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    if (error.type === 'INVALID_STATE' || error.type === 'INVALID_STEP') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to submit step response' });
  }
});

// Request hint for current step
router.post('/sessions/:sessionId/hint', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const requestInfo = getRequestInfo(req);
    const { sessionId } = req.params;
    const { hintLevel = 'gentle' } = req.body;

    const problemSolvingService = getProblemSolvingService();

    const result = await problemSolvingService.requestHint(
      sessionId, 
      user.id, 
      hintLevel, 
      requestInfo
    );

    res.json(result);

  } catch (error) {
    console.error('Error requesting hint:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    if (error.type === 'INVALID_STATE') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to request hint' });
  }
});

// Get student's problem sessions
router.get('/sessions', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      studentId,
      status,
      subject,
      difficulty,
      limit = 20,
      offset = 0,
      sortBy = 'started_at',
      sortOrder = 'desc'
    } = req.query;

    // Determine target student ID
    const targetStudentId = user.role === 'student' ? user.id : studentId;
    
    if (!targetStudentId) {
      return res.status(400).json({ error: 'Student ID is required for non-student users' });
    }

    const problemSolvingService = getProblemSolvingService();

    // Build query conditions
    const conditions = ['ps.student_id = $1'];
    const params = [targetStudentId];
    let paramCount = 1;

    if (status) {
      conditions.push(`ps.session_status = $${++paramCount}`);
      params.push(status);
    }

    if (subject) {
      conditions.push(`pt.subject = $${++paramCount}`);
      params.push(subject);
    }

    if (difficulty) {
      conditions.push(`pt.difficulty_level = $${++paramCount}`);
      params.push(difficulty);
    }

    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const validSortFields = ['started_at', 'completed_at', 'accuracy_score'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'started_at';

    const query = `
      SELECT ps.id, ps.session_status, ps.started_at, ps.completed_at,
             ps.current_step, ps.total_steps, ps.steps_completed,
             ps.accuracy_score, ps.completion_time_minutes,
             ps.hints_requested, ps.mistakes_made,
             pt.title, pt.problem_type, pt.subject, pt.difficulty_level
      FROM problem_sessions ps
      JOIN problem_templates pt ON ps.template_id = pt.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ps.${sortField} ${orderDirection}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    params.push(parseInt(limit), parseInt(offset));

    const result = await problemSolvingService.pool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM problem_sessions ps
      JOIN problem_templates pt ON ps.template_id = pt.id
      WHERE ${conditions.join(' AND ')}
    `;
    
    const countResult = await problemSolvingService.pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      sessions: result.rows.map(session => ({
        ...session,
        progressPercentage: calculatePercentage(session.steps_completed, session.total_steps, 1)
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + result.rows.length < total
      },
      filters: { status, subject, difficulty, sortBy, sortOrder }
    });

  } catch (error) {
    console.error('Error fetching problem sessions:', error);
    res.status(500).json({ error: 'Failed to fetch problem sessions' });
  }
});

// ============================================
// PROGRESS AND ANALYTICS ROUTES
// ============================================

// Get problem-solving statistics for a student
router.get('/analytics/stats', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { studentId, timeWindowDays = 30 } = req.query;

    const targetStudentId = user.role === 'student' ? user.id : studentId;
    
    if (!targetStudentId) {
      return res.status(400).json({ error: 'Student ID is required for non-student users' });
    }

    const problemSolvingService = getProblemSolvingService();
    const daysAgo = parseInt(timeWindowDays);

    const statsQuery = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE session_status = 'completed') as completed_sessions,
        COUNT(*) FILTER (WHERE session_status = 'active') as active_sessions,
        COUNT(*) FILTER (WHERE session_status = 'abandoned') as abandoned_sessions,
        AVG(accuracy_score) FILTER (WHERE accuracy_score IS NOT NULL) as average_accuracy,
        AVG(completion_time_minutes) FILTER (WHERE completion_time_minutes IS NOT NULL) as average_completion_time,
        SUM(hints_requested) as total_hints_used,
        SUM(mistakes_made) as total_mistakes,
        AVG(steps_completed::float / total_steps) as average_completion_rate
      FROM problem_sessions
      WHERE student_id = $1 
        AND started_at >= NOW() - INTERVAL '${daysAgo} days'
    `;

    const statsResult = await problemSolvingService.pool.query(statsQuery, [targetStudentId]);
    const stats = statsResult.rows[0];

    // Get subject-specific performance
    const subjectQuery = `
      SELECT 
        pt.subject,
        COUNT(*) as sessions_count,
        AVG(ps.accuracy_score) FILTER (WHERE ps.accuracy_score IS NOT NULL) as avg_accuracy,
        COUNT(*) FILTER (WHERE ps.session_status = 'completed') as completed_count
      FROM problem_sessions ps
      JOIN problem_templates pt ON ps.template_id = pt.id
      WHERE ps.student_id = $1 
        AND ps.started_at >= NOW() - INTERVAL '${daysAgo} days'
      GROUP BY pt.subject
      ORDER BY sessions_count DESC
    `;

    const subjectResult = await problemSolvingService.pool.query(subjectQuery, [targetStudentId]);

    // Get difficulty-specific performance
    const difficultyQuery = `
      SELECT 
        pt.difficulty_level,
        COUNT(*) as sessions_count,
        AVG(ps.accuracy_score) FILTER (WHERE ps.accuracy_score IS NOT NULL) as avg_accuracy,
        COUNT(*) FILTER (WHERE ps.session_status = 'completed') as completed_count
      FROM problem_sessions ps
      JOIN problem_templates pt ON ps.template_id = pt.id
      WHERE ps.student_id = $1 
        AND ps.started_at >= NOW() - INTERVAL '${daysAgo} days'
      GROUP BY pt.difficulty_level
      ORDER BY 
        CASE pt.difficulty_level 
          WHEN 'easy' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'hard' THEN 3 
          WHEN 'advanced' THEN 4 
        END
    `;

    const difficultyResult = await problemSolvingService.pool.query(difficultyQuery, [targetStudentId]);

    res.json({
      studentId: targetStudentId,
      timeWindow: daysAgo,
      overallStats: {
        totalSessions: parseInt(stats.total_sessions) || 0,
        completedSessions: parseInt(stats.completed_sessions) || 0,
        activeSessions: parseInt(stats.active_sessions) || 0,
        abandonedSessions: parseInt(stats.abandoned_sessions) || 0,
        averageAccuracy: roundToPrecision(parseFloat(stats.average_accuracy) || 0, 3),
        averageCompletionTime: roundToPrecision(parseFloat(stats.average_completion_time) || 0, 1),
        totalHintsUsed: parseInt(stats.total_hints_used) || 0,
        totalMistakes: parseInt(stats.total_mistakes) || 0,
        averageCompletionRate: roundToPrecision(parseFloat(stats.average_completion_rate) || 0, 3)
      },
      subjectPerformance: subjectResult.rows,
      difficultyPerformance: difficultyResult.rows,
      calculatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching problem analytics:', error);
    res.status(500).json({ error: 'Failed to fetch problem analytics' });
  }
});

// Get detailed session analysis
router.get('/sessions/:sessionId/analysis', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { sessionId } = req.params;

    const problemSolvingService = getProblemSolvingService();

    // Get session analysis with steps and interventions
    const analysisQuery = `
      SELECT 
        ps.*,
        pt.title, pt.subject, pt.difficulty_level,
        json_agg(
          json_build_object(
            'step_number', pss.step_number,
            'step_title', pss.step_title,
            'step_type', pss.step_type,
            'response_quality', pss.response_quality,
            'accuracy_score', pss.accuracy_score,
            'understanding_level', pss.understanding_level,
            'attempts_count', pss.attempts_count,
            'is_completed', pss.is_completed,
            'needs_help', pss.needs_help
          ) ORDER BY pss.step_number
        ) as steps_analysis
      FROM problem_sessions ps
      JOIN problem_templates pt ON ps.template_id = pt.id
      LEFT JOIN problem_session_steps pss ON ps.id = pss.session_id
      WHERE ps.id = $1
      GROUP BY ps.id, pt.title, pt.subject, pt.difficulty_level
    `;

    const analysisResult = await problemSolvingService.pool.query(analysisQuery, [sessionId]);

    if (analysisResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionAnalysis = analysisResult.rows[0];

    // Get interventions for this session
    const interventionsQuery = `
      SELECT intervention_type, trigger_reason, scaffolding_style, provided_at,
             was_helpful, led_to_progress
      FROM scaffolding_interventions
      WHERE session_id = $1
      ORDER BY provided_at ASC
    `;

    const interventionsResult = await problemSolvingService.pool.query(interventionsQuery, [sessionId]);

    // Get mistakes for this session
    const mistakesQuery = `
      SELECT mistake_type, mistake_category, mistake_description, severity,
             was_corrected, understanding_improved, detected_at
      FROM problem_mistakes
      WHERE session_id = $1
      ORDER BY detected_at ASC
    `;

    const mistakesResult = await problemSolvingService.pool.query(mistakesQuery, [sessionId]);

    res.json({
      sessionAnalysis: {
        ...sessionAnalysis,
        stepsAnalysis: sessionAnalysis.steps_analysis || []
      },
      interventions: interventionsResult.rows,
      mistakes: mistakesResult.rows,
      summary: {
        completionPercentage: calculatePercentage(sessionAnalysis.steps_completed, sessionAnalysis.total_steps, 1),
        averageStepAccuracy: sessionAnalysis.steps_analysis
          ? roundToPrecision(sessionAnalysis.steps_analysis.reduce((sum, step) => sum + (step.accuracy_score || 0), 0) / sessionAnalysis.steps_analysis.length, 3)
          : 0,
        interventionsCount: interventionsResult.rows.length,
        mistakesCount: mistakesResult.rows.length,
        helpfulInterventions: interventionsResult.rows.filter(i => i.was_helpful).length
      }
    });

  } catch (error) {
    console.error('Error fetching session analysis:', error);
    res.status(500).json({ error: 'Failed to fetch session analysis' });
  }
});

// ============================================
// TEACHER ROUTES
// ============================================

// Get class problem-solving overview (teachers only)
router.get('/class-overview', authenticateJWT, roleCheck(['teacher']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { classId, timeWindowDays = 7 } = req.query;

    // This would typically integrate with a class management system
    // For now, return mock data structure
    res.json({
      message: 'Class overview endpoint ready for integration with class management system',
      teacherId: user.id,
      timeWindow: timeWindowDays,
      classId: classId || 'default'
    });

  } catch (error) {
    console.error('Error fetching class overview:', error);
    res.status(500).json({ error: 'Failed to fetch class overview' });
  }
});

// Health check for problem-solving service
router.get('/health', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const problemSolvingService = getProblemSolvingService();
    const health = await problemSolvingService.healthCheck();
    
    res.json(health);
  } catch (error) {
    console.error('Error checking problem-solving health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get available step types and intervention triggers (for frontend)
router.get('/constants', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    res.json({
      stepTypes: STEP_TYPES,
      interventionTriggers: INTERVENTION_TRIGGERS,
      subjects: [
        'arithmetic', 'algebra', 'geometry', 'statistics', 'calculus',
        'biology', 'chemistry', 'physics', 'earth_science', 'environmental_science',
        'creative_writing', 'essay_writing', 'grammar', 'vocabulary', 'reading_analysis',
        'logic', 'general'
      ],
      problemTypes: ['math', 'science', 'writing', 'reading_comprehension', 'critical_thinking', 'mixed'],
      difficultyLevels: ['easy', 'medium', 'hard', 'advanced']
    });
  } catch (error) {
    console.error('Error fetching constants:', error);
    res.status(500).json({ error: 'Failed to fetch constants' });
  }
});

// ============================================
// ENHANCED MISTAKE ANALYSIS ROUTES
// ============================================

// Submit response with enhanced mistake analysis and guided questioning
router.post('/sessions/:sessionId/steps/:stepNumber/response-enhanced', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const requestInfo = getRequestInfo(req);
    const { sessionId, stepNumber } = req.params;
    const { response, timeSpent, requestHelp = false, questioningSessionId = null } = req.body;

    if (!response || response.trim().length === 0) {
      return res.status(400).json({ error: 'Response is required' });
    }

    const problemSolvingService = getProblemSolvingService();

    const responseData = {
      stepNumber: parseInt(stepNumber),
      response: response.trim(),
      timeSpent,
      requestHelp,
      questioningSessionId
    };

    // Use enhanced submission method with mistake analysis
    const result = await problemSolvingService.submitStepResponseWithGuidedQuestions(
      sessionId, 
      user.id, 
      responseData, 
      requestInfo
    );

    res.json({
      stepNumber: result.stepNumber,
      analysis: result.analysisResult,
      nextAction: result.nextAction,
      scaffolding: result.scaffoldingResponse,
      guidedQuestioningSession: result.guidedQuestioningSession,
      progress: result.sessionProgress,
      enhancedFeatures: {
        mistakeAnalysis: !!result.analysisResult.mistakes?.length,
        guidedQuestions: !!result.analysisResult.guidedQuestions,
        remediationStrategy: !!result.analysisResult.remediationStrategy
      }
    });

  } catch (error) {
    console.error('Error submitting enhanced step response:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    if (error.type === 'INVALID_STATE' || error.type === 'INVALID_STEP') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to submit enhanced step response' });
  }
});

// Get guided questions for a specific mistake
router.post('/sessions/:sessionId/steps/:stepNumber/analyze-mistake', authenticateJWT, roleCheck(['student', 'teacher']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { sessionId, stepNumber } = req.params;
    const { studentResponse, expectedResponse, stepContext } = req.body;

    if (!studentResponse) {
      return res.status(400).json({ error: 'Student response is required' });
    }

    const problemSolvingService = getProblemSolvingService();
    
    // Get session context for analysis
    const sessionState = await problemSolvingService.getSessionState(sessionId, user.id);
    
    const mistakeAnalysisResult = await problemSolvingService.analyzeMistakeWithGuidedQuestions(
      studentResponse,
      stepContext || sessionState.currentStep,
      sessionState.problemInfo.instance,
      user.id
    );

    if (!mistakeAnalysisResult) {
      return res.status(500).json({ error: 'Could not analyze mistake' });
    }

    res.json({
      mistakeClassification: mistakeAnalysisResult.mistakeClassification,
      guidedQuestions: mistakeAnalysisResult.guidedQuestions,
      remediationStrategy: mistakeAnalysisResult.remediationStrategy,
      analysisMetadata: mistakeAnalysisResult.analysisMetadata
    });

  } catch (error) {
    console.error('Error analyzing mistake:', error);
    res.status(500).json({ error: 'Failed to analyze mistake' });
  }
});

// Respond to guided question
router.post('/guided-questioning/:questioningSessionId/respond', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const requestInfo = getRequestInfo(req);
    const { questioningSessionId } = req.params;
    const { response, questionIndex, moveToNext = true } = req.body;

    if (!response || response.trim().length === 0) {
      return res.status(400).json({ error: 'Response is required' });
    }

    // In a full implementation, this would retrieve and update the questioning session
    // For now, we'll return a mock response structure
    const questioningSession = {
      id: questioningSessionId,
      currentQuestionIndex: questionIndex,
      responses: [{ response: response.trim(), timestamp: new Date().toISOString() }],
      status: moveToNext ? 'continue' : 'completed',
      nextQuestion: moveToNext ? 'What steps would you take to solve this differently?' : null,
      feedback: 'Thank you for sharing your thinking. Let\'s explore this further.',
      progress: {
        totalQuestions: 3,
        answered: 1,
        remaining: 2
      }
    };

    // Log questioning activity
    await activityMonitor.logActivity({
      studentId: user.id,
      sessionId: requestInfo.sessionId || `questioning_${Date.now()}`,
      activityType: 'guided_question_response',
      details: {
        questioningSessionId,
        questionIndex,
        responseLength: response.length,
        moveToNext
      },
      severity: 'low'
    });

    res.json({
      questioningSession,
      feedback: questioningSession.feedback,
      nextQuestion: questioningSession.nextQuestion,
      completed: questioningSession.status === 'completed'
    });

  } catch (error) {
    console.error('Error responding to guided question:', error);
    res.status(500).json({ error: 'Failed to process guided question response' });
  }
});

// Get mistake patterns and statistics
router.get('/analytics/mistakes', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { studentId, timeWindowDays = 30, mistakeType, subject } = req.query;

    const targetStudentId = user.role === 'student' ? user.id : studentId;
    
    if (!targetStudentId) {
      return res.status(400).json({ error: 'Student ID is required for non-student users' });
    }

    const problemSolvingService = getProblemSolvingService();
    const daysAgo = parseInt(timeWindowDays);

    // Build query conditions
    const conditions = ['ps.student_id = $1', 'pm.detected_at >= NOW() - INTERVAL \'${daysAgo} days\''];
    const params = [targetStudentId];
    let paramCount = 1;

    if (mistakeType) {
      conditions.push(`pm.mistake_type = $${++paramCount}`);
      params.push(mistakeType);
    }

    if (subject) {
      conditions.push(`pt.subject = $${++paramCount}`);
      params.push(subject);
    }

    const mistakeStatsQuery = `
      SELECT 
        pm.mistake_type,
        pm.severity,
        COUNT(*) as frequency,
        AVG(CASE WHEN pm.was_corrected THEN 1 ELSE 0 END) as correction_rate,
        COUNT(CASE WHEN pm.repeated_in_session THEN 1 END) as repeated_count,
        pt.subject,
        pt.difficulty_level
      FROM problem_mistakes pm
      JOIN problem_sessions ps ON pm.session_id = ps.id
      JOIN problem_templates pt ON ps.template_id = pt.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY pm.mistake_type, pm.severity, pt.subject, pt.difficulty_level
      ORDER BY frequency DESC
    `;

    const result = await problemSolvingService.pool.query(mistakeStatsQuery, params);

    // Get common misconceptions
    const misconceptionsQuery = `
      SELECT 
        pm.mistake_description::json->>'misconceptions' as misconceptions,
        COUNT(*) as frequency
      FROM problem_mistakes pm
      JOIN problem_sessions ps ON pm.session_id = ps.id
      WHERE ps.student_id = $1 
        AND pm.detected_at >= NOW() - INTERVAL '${daysAgo} days'
        AND pm.mistake_description::json->>'misconceptions' IS NOT NULL
      GROUP BY pm.mistake_description::json->>'misconceptions'
      ORDER BY frequency DESC
      LIMIT 10
    `;

    const misconceptionsResult = await problemSolvingService.pool.query(misconceptionsQuery, [targetStudentId]);

    res.json({
      studentId: targetStudentId,
      timeWindow: daysAgo,
      mistakePatterns: result.rows,
      commonMisconceptions: misconceptionsResult.rows,
      summary: {
        totalMistakes: result.rows.reduce((sum, row) => sum + parseInt(row.frequency), 0),
        mostCommonType: result.rows[0]?.mistake_type || 'none',
        overallCorrectionRate: calculateAverage(result.rows.map(row => parseFloat(row.correction_rate)), 3)
      },
      calculatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching mistake analytics:', error);
    res.status(500).json({ error: 'Failed to fetch mistake analytics' });
  }
});

// Get remediation recommendations for a student
router.get('/students/:studentId/remediation', authenticateJWT, roleCheck(['teacher', 'student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { studentId } = req.params;
    const { subject, mistakeType, timeWindowDays = 30 } = req.query;

    // Students can only access their own remediation
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const problemSolvingService = getProblemSolvingService();

    // Get recent mistakes for pattern analysis
    const mistakesQuery = `
      SELECT 
        pm.mistake_type,
        pm.severity,
        pm.practice_recommended,
        pm.explanation_given::json as remediation_data,
        pt.subject,
        pt.difficulty_level,
        COUNT(*) as frequency
      FROM problem_mistakes pm
      JOIN problem_sessions ps ON pm.session_id = ps.id
      JOIN problem_templates pt ON ps.template_id = pt.id
      WHERE ps.student_id = $1 
        AND pm.detected_at >= NOW() - INTERVAL '${timeWindowDays} days'
        ${subject ? 'AND pt.subject = $2' : ''}
        ${mistakeType ? `AND pm.mistake_type = $${subject ? 3 : 2}` : ''}
      GROUP BY pm.mistake_type, pm.severity, pm.practice_recommended, pm.explanation_given, pt.subject, pt.difficulty_level
      ORDER BY frequency DESC
      LIMIT 20
    `;

    const queryParams = [studentId];
    if (subject) queryParams.push(subject);
    if (mistakeType) queryParams.push(mistakeType);

    const mistakesResult = await problemSolvingService.pool.query(mistakesQuery, queryParams);

    // Generate remediation recommendations
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      resources: []
    };

    // Analyze mistake patterns and generate recommendations
    const mistakeFrequency = {};
    for (const mistake of mistakesResult.rows) {
      mistakeFrequency[mistake.mistake_type] = (mistakeFrequency[mistake.mistake_type] || 0) + parseInt(mistake.frequency);
    }

    // Most frequent mistake type gets priority
    const topMistakeType = Object.keys(mistakeFrequency).reduce((a, b) => 
      mistakeFrequency[a] > mistakeFrequency[b] ? a : b, 'conceptual'
    );

    // Generate type-specific recommendations
    switch (topMistakeType) {
      case 'conceptual':
        recommendations.immediate.push('Review fundamental concepts');
        recommendations.shortTerm.push('Practice concept application exercises');
        recommendations.longTerm.push('Regular concept reinforcement activities');
        break;
      case 'procedural':
        recommendations.immediate.push('Practice step-by-step procedures');
        recommendations.shortTerm.push('Work through guided examples');
        recommendations.longTerm.push('Build procedural fluency through repetition');
        break;
      case 'computational':
        recommendations.immediate.push('Practice basic calculations');
        recommendations.shortTerm.push('Use calculation checking strategies');
        recommendations.longTerm.push('Develop number sense and estimation skills');
        break;
      default:
        recommendations.immediate.push('Focus on careful problem reading');
        recommendations.shortTerm.push('Practice problem-solving strategies');
        recommendations.longTerm.push('Develop metacognitive skills');
    }

    res.json({
      studentId,
      timeWindow: timeWindowDays,
      mistakeAnalysis: mistakesResult.rows,
      recommendations,
      topMistakeType,
      totalMistakes: Object.values(mistakeFrequency).reduce((sum, freq) => sum + freq, 0),
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating remediation recommendations:', error);
    res.status(500).json({ error: 'Failed to generate remediation recommendations' });
  }
});

// ============================================
// SOLUTION PATH EXPLORATION ROUTES
// ============================================

// Get available solution paths for a problem template
router.get('/templates/:templateId/solution-paths', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { templateId } = req.params;
    const {
      includeMetadata = true,
      includePersonalization = true,
      filterByStudentLevel = false,
      sortBy = 'effectiveness'
    } = req.query;

    const { getSolutionPathService } = require('../services/solution-path-service');
    const solutionPathService = getSolutionPathService();

    // Students access their own paths, others need to specify student
    const targetStudentId = user.role === 'student' ? user.id : req.query.studentId;

    if (!targetStudentId && includePersonalization) {
      return res.status(400).json({ error: 'Student ID required for personalized recommendations' });
    }

    const options = {
      includeMetadata: includeMetadata === 'true',
      includePersonalization: includePersonalization === 'true' && targetStudentId,
      filterByStudentLevel: filterByStudentLevel === 'true',
      sortBy
    };

    const pathsData = await solutionPathService.getAvailablePaths(templateId, targetStudentId, options);

    res.json(pathsData);

  } catch (error) {
    console.error('Error getting available solution paths:', error);
    res.status(500).json({ error: 'Failed to retrieve solution paths' });
  }
});

// Start exploring a specific solution path
router.post('/solution-paths/:pathId/explore', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const requestInfo = getRequestInfo(req);
    const { pathId } = req.params;
    const { sessionId, explorationMode = 'guided', notes } = req.body;

    const { getSolutionPathService } = require('../services/solution-path-service');
    const solutionPathService = getSolutionPathService();

    const pathExplorationData = {
      pathId,
      studentId: user.id,
      sessionId,
      explorationMode,
      requestInfo: {
        ...requestInfo,
        notes
      }
    };

    const explorationResult = await solutionPathService.startPathExploration(pathExplorationData);

    res.status(201).json({
      explorationSession: explorationResult.explorationSession,
      pathInfo: explorationResult.pathInfo,
      initialGuidance: explorationResult.initialGuidance,
      nextStep: explorationResult.nextStepInfo
    });

  } catch (error) {
    console.error('Error starting path exploration:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to start path exploration' });
  }
});

// Track progress in path exploration
router.post('/path-exploration/:explorationSessionId/progress', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { explorationSessionId } = req.params;
    const {
      pathId,
      stepNumber,
      stepResponse,
      timeSpent,
      difficultyRating,
      satisfactionRating,
      insights = []
    } = req.body;

    if (!stepResponse || stepResponse.trim().length === 0) {
      return res.status(400).json({ error: 'Step response is required' });
    }

    const { getSolutionPathService } = require('../services/solution-path-service');
    const solutionPathService = getSolutionPathService();

    const progressData = {
      explorationSessionId,
      pathId,
      studentId: user.id,
      stepNumber,
      stepResponse: stepResponse.trim(),
      timeSpent,
      difficultyRating,
      satisfactionRating,
      insights
    };

    const progressResult = await solutionPathService.trackPathProgress(progressData);

    res.json({
      progressTracked: progressResult.progressTracked,
      currentStep: progressResult.currentStep,
      adaptiveRecommendations: progressResult.adaptiveRecommendations,
      nextStepGuidance: progressResult.nextStepGuidance,
      completionPercentage: progressResult.pathCompletionPercentage
    });

  } catch (error) {
    console.error('Error tracking path progress:', error);
    
    if (error.type === 'TRACKING_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to track path progress' });
  }
});

// Compare multiple solution paths
router.post('/solution-paths/compare', authenticateJWT, roleCheck(['student', 'teacher']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      pathIds,
      comparisonCriteria = ['efficiency', 'complexity', 'learning_value', 'success_rate'],
      includePersonalization = true
    } = req.body;

    if (!pathIds || !Array.isArray(pathIds) || pathIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 path IDs are required for comparison' });
    }

    const { getSolutionPathService } = require('../services/solution-path-service');
    const solutionPathService = getSolutionPathService();

    // Students compare for themselves, others can specify student
    const targetStudentId = user.role === 'student' ? user.id : req.body.studentId;

    if (!targetStudentId && includePersonalization) {
      return res.status(400).json({ error: 'Student ID required for personalized comparison' });
    }

    const comparisonData = {
      pathIds,
      studentId: targetStudentId,
      comparisonCriteria,
      includePersonalization: includePersonalization && targetStudentId
    };

    const comparisonResult = await solutionPathService.comparePathsForStudent(comparisonData);

    res.json(comparisonResult);

  } catch (error) {
    console.error('Error comparing solution paths:', error);
    
    if (error.type === 'COMPARISON_ERROR' || error.type === 'NOT_FOUND') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to compare solution paths' });
  }
});

// Discover alternative solution paths
router.post('/solution-paths/:currentPathId/discover-alternatives', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { currentPathId } = req.params;
    const {
      currentStepNumber,
      studentResponse,
      templateId,
      discoveryMode = 'adaptive'
    } = req.body;

    if (!currentStepNumber || !studentResponse || !templateId) {
      return res.status(400).json({ 
        error: 'Current step number, student response, and template ID are required' 
      });
    }

    const { getSolutionPathService } = require('../services/solution-path-service');
    const solutionPathService = getSolutionPathService();

    const discoveryData = {
      currentPathId,
      studentId: user.id,
      currentStepNumber,
      studentResponse,
      templateId,
      discoveryMode
    };

    const discoveryResult = await solutionPathService.discoverAlternativePaths(discoveryData);

    res.json(discoveryResult);

  } catch (error) {
    console.error('Error discovering alternative paths:', error);
    
    if (error.type === 'DISCOVERY_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to discover alternative paths' });
  }
});

// Get path exploration sessions for a student
router.get('/path-exploration/sessions', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      studentId,
      pathId,
      explorationMode,
      status,
      limit = 20,
      offset = 0,
      sortBy = 'started_at',
      sortOrder = 'desc'
    } = req.query;

    // Determine target student ID
    const targetStudentId = user.role === 'student' ? user.id : studentId;
    
    if (!targetStudentId) {
      return res.status(400).json({ error: 'Student ID is required for non-student users' });
    }

    const { getSolutionPathService } = require('../services/solution-path-service');
    const solutionPathService = getSolutionPathService();

    // Build query conditions
    const conditions = ['pes.student_id = $1'];
    const params = [targetStudentId];
    let paramCount = 1;

    if (pathId) {
      conditions.push(`pes.path_id = $${++paramCount}`);
      params.push(pathId);
    }

    if (explorationMode) {
      conditions.push(`pes.exploration_mode = $${++paramCount}`);
      params.push(explorationMode);
    }

    if (status) {
      if (status === 'active') {
        conditions.push(`pes.completed_at IS NULL AND pes.abandoned_at IS NULL`);
      } else if (status === 'completed') {
        conditions.push(`pes.completed_at IS NOT NULL`);
      } else if (status === 'abandoned') {
        conditions.push(`pes.abandoned_at IS NOT NULL`);
      }
    }

    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const validSortFields = ['started_at', 'completed_at', 'total_time_spent', 'overall_satisfaction'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'started_at';

    const query = `
      SELECT pes.*, sp.path_name, sp.path_description, sp.difficulty_level,
             pt.title as problem_title, pt.subject
      FROM path_exploration_sessions pes
      JOIN solution_paths sp ON pes.path_id = sp.id
      JOIN problem_templates pt ON sp.template_id = pt.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY pes.${sortField} ${orderDirection}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    params.push(parseInt(limit), parseInt(offset));

    const result = await solutionPathService.pool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM path_exploration_sessions pes
      WHERE ${conditions.join(' AND ')}
    `;
    
    const countResult = await solutionPathService.pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      sessions: result.rows.map(session => ({
        ...session,
        status: session.completed_at ? 'completed' : 
                session.abandoned_at ? 'abandoned' : 'active',
        progressPercentage: calculatePercentage(session.steps_completed, session.total_steps, 1)
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + result.rows.length < total
      },
      filters: { pathId, explorationMode, status, sortBy, sortOrder }
    });

  } catch (error) {
    console.error('Error fetching path exploration sessions:', error);
    res.status(500).json({ error: 'Failed to fetch path exploration sessions' });
  }
});

// Get path exploration analytics
router.get('/analytics/path-exploration', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { studentId, timeWindowDays = 30, pathId, subject } = req.query;

    const targetStudentId = user.role === 'student' ? user.id : studentId;
    
    if (!targetStudentId) {
      return res.status(400).json({ error: 'Student ID is required for non-student users' });
    }

    const { getSolutionPathService } = require('../services/solution-path-service');
    const solutionPathService = getSolutionPathService();
    const daysAgo = parseInt(timeWindowDays);

    // Build query conditions
    const conditions = ['pes.student_id = $1', `pes.started_at >= NOW() - INTERVAL '${daysAgo} days'`];
    const params = [targetStudentId];
    let paramCount = 1;

    if (pathId) {
      conditions.push(`pes.path_id = $${++paramCount}`);
      params.push(pathId);
    }

    if (subject) {
      conditions.push(`pt.subject = $${++paramCount}`);
      params.push(subject);
    }

    const analyticsQuery = `
      SELECT 
        COUNT(*) as total_explorations,
        COUNT(*) FILTER (WHERE pes.completed_at IS NOT NULL) as completed_explorations,
        COUNT(*) FILTER (WHERE pes.abandoned_at IS NOT NULL) as abandoned_explorations,
        AVG(pes.total_time_spent) FILTER (WHERE pes.completed_at IS NOT NULL) as avg_completion_time,
        AVG(pes.overall_satisfaction) as avg_satisfaction,
        AVG(pes.learning_value_rating) as avg_learning_value,
        COUNT(DISTINCT pes.path_id) as unique_paths_explored,
        COUNT(DISTINCT pt.subject) as subjects_explored
      FROM path_exploration_sessions pes
      JOIN solution_paths sp ON pes.path_id = sp.id
      JOIN problem_templates pt ON sp.template_id = pt.id
      WHERE ${conditions.join(' AND ')}
    `;

    const analyticsResult = await solutionPathService.pool.query(analyticsQuery, params);
    const analytics = analyticsResult.rows[0];

    // Get path-specific performance
    const pathQuery = `
      SELECT 
        sp.path_name,
        sp.difficulty_level,
        COUNT(*) as exploration_count,
        AVG(pes.total_time_spent) FILTER (WHERE pes.completed_at IS NOT NULL) as avg_time,
        COUNT(*) FILTER (WHERE pes.completed_at IS NOT NULL) as completed_count,
        AVG(pes.overall_satisfaction) as avg_satisfaction
      FROM path_exploration_sessions pes
      JOIN solution_paths sp ON pes.path_id = sp.id
      JOIN problem_templates pt ON sp.template_id = pt.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY sp.id, sp.path_name, sp.difficulty_level
      ORDER BY exploration_count DESC
    `;

    const pathResult = await solutionPathService.pool.query(pathQuery, params);

    res.json({
      studentId: targetStudentId,
      timeWindow: daysAgo,
      overallAnalytics: {
        totalExplorations: parseInt(analytics.total_explorations) || 0,
        completedExplorations: parseInt(analytics.completed_explorations) || 0,
        abandonedExplorations: parseInt(analytics.abandoned_explorations) || 0,
        completionRate: calculatePercentage(parseInt(analytics.completed_explorations), parseInt(analytics.total_explorations), 1),
        averageCompletionTime: roundToPrecision(parseFloat(analytics.avg_completion_time) || 0, 1),
        averageSatisfaction: roundToPrecision(parseFloat(analytics.avg_satisfaction) || 0, 2),
        averageLearningValue: roundToPrecision(parseFloat(analytics.avg_learning_value) || 0, 2),
        uniquePathsExplored: parseInt(analytics.unique_paths_explored) || 0,
        subjectsExplored: parseInt(analytics.subjects_explored) || 0
      },
      pathPerformance: pathResult.rows,
      calculatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching path exploration analytics:', error);
    res.status(500).json({ error: 'Failed to fetch path exploration analytics' });
  }
});

// Get path effectiveness analytics (teacher/admin only)
router.get('/analytics/path-effectiveness', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const { pathId, timeWindowDays = 30, subject, difficultyLevel } = req.query;

    const { getSolutionPathService } = require('../services/solution-path-service');
    const solutionPathService = getSolutionPathService();
    const daysAgo = parseInt(timeWindowDays);

    // Build query conditions
    const conditions = [`pes.started_at >= NOW() - INTERVAL '${daysAgo} days'`];
    const params = [];
    let paramCount = 0;

    if (pathId) {
      conditions.push(`sp.id = $${++paramCount}`);
      params.push(pathId);
    }

    if (subject) {
      conditions.push(`pt.subject = $${++paramCount}`);
      params.push(subject);
    }

    if (difficultyLevel) {
      conditions.push(`sp.difficulty_level = $${++paramCount}`);
      params.push(difficultyLevel);
    }

    const effectivenessQuery = `
      SELECT 
        sp.id as path_id,
        sp.path_name,
        sp.difficulty_level,
        pt.title as problem_title,
        pt.subject,
        COUNT(pes.id) as total_explorations,
        COUNT(pes.id) FILTER (WHERE pes.completed_at IS NOT NULL) as successful_completions,
        ROUND(
          COUNT(pes.id) FILTER (WHERE pes.completed_at IS NOT NULL)::DECIMAL / 
          NULLIF(COUNT(pes.id), 0) * 100, 1
        ) as success_rate_percentage,
        AVG(pes.total_time_spent) FILTER (WHERE pes.completed_at IS NOT NULL) as avg_completion_time,
        AVG(pes.overall_satisfaction) as avg_satisfaction,
        AVG(pes.learning_value_rating) as avg_learning_value,
        COUNT(DISTINCT pes.student_id) as unique_students
      FROM solution_paths sp
      JOIN problem_templates pt ON sp.template_id = pt.id
      LEFT JOIN path_exploration_sessions pes ON sp.id = pes.path_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY sp.id, sp.path_name, sp.difficulty_level, pt.title, pt.subject
      HAVING COUNT(pes.id) > 0
      ORDER BY success_rate_percentage DESC, avg_satisfaction DESC
    `;

    const result = await solutionPathService.pool.query(effectivenessQuery, params);

    res.json({
      timeWindow: daysAgo,
      pathEffectiveness: result.rows,
      summary: {
        totalPaths: result.rows.length,
        averageSuccessRate: calculateAverage(result.rows.map(path => parseFloat(path.success_rate_percentage)), 1),
        topPerformingPath: result.rows[0] || null,
        totalExplorations: result.rows.reduce((sum, path) => sum + parseInt(path.total_explorations), 0)
      },
      filters: { pathId, subject, difficultyLevel },
      calculatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching path effectiveness analytics:', error);
    res.status(500).json({ error: 'Failed to fetch path effectiveness analytics' });
  }
});

// ============================================
// TEACHER REVIEW AND PROCESS DOCUMENTATION ROUTES
// ============================================

// Get sessions requiring teacher review
router.get('/sessions/review', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      studentId,
      subject,
      difficulty,
      reviewStatus = 'pending',
      timeWindowDays = 7,
      limit = 20,
      offset = 0
    } = req.query;

    const { getProcessDocumentationService } = require('../services/process-documentation-service');
    const processDocumentationService = getProcessDocumentationService();

    const filters = {
      studentId,
      subject,
      difficulty,
      reviewStatus,
      timeWindowDays: parseInt(timeWindowDays),
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const sessionsForReview = await processDocumentationService.getSessionsForReview(user.id, filters);

    res.json(sessionsForReview);

  } catch (error) {
    console.error('Error getting sessions for review:', error);
    res.status(500).json({ error: 'Failed to get sessions for review' });
  }
});

// Generate process documentation for teacher review
router.post('/documentation/generate', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      studentId,
      sessionId = null,
      timeWindowDays = 30,
      documentationType = 'comprehensive_report',
      focusAreas = ['problem_solving_process'],
      includeDetailedSteps = true,
      includeInterventions = true,
      includeMistakeAnalysis = true,
      includeRecommendations = true
    } = req.body;

    if (!studentId && !sessionId) {
      return res.status(400).json({ error: 'Either studentId or sessionId is required' });
    }

    const { getProcessDocumentationService, DOCUMENTATION_TYPES, REVIEW_FOCUS } = require('../services/process-documentation-service');
    const processDocumentationService = getProcessDocumentationService();

    // Validate documentation type
    const validTypes = Object.values(DOCUMENTATION_TYPES);
    if (!validTypes.includes(documentationType)) {
      return res.status(400).json({ 
        error: 'Invalid documentation type',
        validTypes: validTypes
      });
    }

    // Validate focus areas
    const validFocusAreas = Object.values(REVIEW_FOCUS);
    const invalidFocusAreas = focusAreas.filter(area => !validFocusAreas.includes(area));
    if (invalidFocusAreas.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid focus areas',
        invalidAreas: invalidFocusAreas,
        validAreas: validFocusAreas
      });
    }

    const documentationRequest = {
      studentId,
      sessionId,
      timeWindowDays: parseInt(timeWindowDays),
      documentationType,
      focusAreas,
      includeDetailedSteps,
      includeInterventions,
      includeMistakeAnalysis,
      includeRecommendations
    };

    const documentation = await processDocumentationService.generateProcessDocumentation(documentationRequest);

    // Log documentation generation activity
    await activityMonitor.logActivity({
      studentId: user.id,
      sessionId: `documentation_generation_${Date.now()}`,
      activityType: 'process_documentation_generated',
      details: {
        targetStudentId: studentId,
        targetSessionId: sessionId,
        documentationType,
        focusAreas,
        timeWindow: timeWindowDays,
        generatedBy: user.id
      },
      severity: 'low'
    });

    res.json({
      documentation,
      metadata: {
        generatedBy: user.id,
        generatedAt: new Date().toISOString(),
        documentationType,
        timeWindow: timeWindowDays
      }
    });

  } catch (error) {
    console.error('Error generating process documentation:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to generate process documentation' });
  }
});

// Get specific session documentation (detailed view for teacher review)
router.get('/sessions/:sessionId/documentation', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { sessionId } = req.params;
    const { includeDetailedSteps = true } = req.query;

    const { getProcessDocumentationService } = require('../services/process-documentation-service');
    const processDocumentationService = getProcessDocumentationService();

    const documentationRequest = {
      sessionId,
      documentationType: 'session_summary',
      includeDetailedSteps: includeDetailedSteps === 'true'
    };

    const sessionDocumentation = await processDocumentationService.generateProcessDocumentation(documentationRequest);

    res.json(sessionDocumentation);

  } catch (error) {
    console.error('Error getting session documentation:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to get session documentation' });
  }
});

// Add teacher review to a session
router.post('/sessions/:sessionId/review', authenticateJWT, roleCheck(['teacher']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { sessionId } = req.params;
    const {
      reviewType = 'complete',
      overallAssessment,
      strengthsObserved,
      areasForImprovement,
      specificFeedback,
      privateNotes,
      scoring = {},
      nextSteps,
      recommendedPractice,
      followUpRequired = false
    } = req.body;

    if (!overallAssessment) {
      return res.status(400).json({ error: 'Overall assessment is required' });
    }

    const { getProcessDocumentationService } = require('../services/process-documentation-service');
    const processDocumentationService = getProcessDocumentationService();

    const reviewData = {
      sessionId,
      teacherId: user.id,
      reviewType,
      overallAssessment,
      strengthsObserved,
      areasForImprovement,
      specificFeedback,
      privateNotes,
      scoringData: scoring,
      nextSteps,
      recommendedPractice,
      followUpRequired
    };

    const reviewResult = await processDocumentationService.addTeacherReview(reviewData);

    res.status(201).json({
      success: true,
      reviewId: reviewResult.reviewId,
      reviewedAt: reviewResult.reviewedAt,
      message: 'Teacher review added successfully'
    });

  } catch (error) {
    console.error('Error adding teacher review:', error);
    
    if (error.type === 'REVIEW_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to add teacher review' });
  }
});

// Get teacher reviews for a session
router.get('/sessions/:sessionId/reviews', authenticateJWT, roleCheck(['teacher', 'admin', 'student', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { sessionId } = req.params;
    const { includePrivateNotes = false } = req.query;

    // Students and parents cannot see private notes
    const showPrivateNotes = (user.role === 'teacher' || user.role === 'admin') && includePrivateNotes === 'true';

    const problemSolvingService = getProblemSolvingService();

    const reviewsQuery = `
      SELECT tpr.id, tpr.teacher_id, tpr.review_type, tpr.overall_assessment,
             tpr.strengths_observed, tpr.areas_for_improvement, tpr.specific_feedback,
             ${showPrivateNotes ? 'tpr.private_notes,' : ''}
             tpr.understanding_score, tpr.effort_score, tpr.process_score, tpr.final_score,
             tpr.next_steps, tpr.recommended_practice, tpr.follow_up_required,
             tpr.reviewed_at, u.username as teacher_name
      FROM teacher_problem_reviews tpr
      JOIN users u ON tpr.teacher_id = u.id
      WHERE tpr.session_id = $1
      ORDER BY tpr.reviewed_at DESC
    `;

    const result = await problemSolvingService.pool.query(reviewsQuery, [sessionId]);

    res.json({
      sessionId,
      reviews: result.rows,
      totalReviews: result.rows.length,
      includesPrivateNotes: showPrivateNotes
    });

  } catch (error) {
    console.error('Error getting teacher reviews:', error);
    res.status(500).json({ error: 'Failed to get teacher reviews' });
  }
});

// Get comprehensive student progress documentation
router.get('/students/:studentId/progress-documentation', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { studentId } = req.params;
    const {
      timeWindowDays = 30,
      focusAreas = 'problem_solving_process,conceptual_understanding',
      includeRecommendations = true
    } = req.query;

    const { getProcessDocumentationService, REVIEW_FOCUS } = require('../services/process-documentation-service');
    const processDocumentationService = getProcessDocumentationService();

    // Parse focus areas
    const focusAreasList = focusAreas.split(',').map(area => area.trim());
    
    // Validate focus areas
    const validFocusAreas = Object.values(REVIEW_FOCUS);
    const invalidFocusAreas = focusAreasList.filter(area => !validFocusAreas.includes(area));
    if (invalidFocusAreas.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid focus areas',
        invalidAreas: invalidFocusAreas,
        validAreas: validFocusAreas
      });
    }

    const documentationRequest = {
      studentId,
      timeWindowDays: parseInt(timeWindowDays),
      documentationType: 'comprehensive_report',
      focusAreas: focusAreasList,
      includeDetailedSteps: false, // Summary level for progress overview
      includeInterventions: true,
      includeMistakeAnalysis: true,
      includeRecommendations: includeRecommendations === 'true'
    };

    const progressDocumentation = await processDocumentationService.generateProcessDocumentation(documentationRequest);

    res.json(progressDocumentation);

  } catch (error) {
    console.error('Error getting student progress documentation:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to get student progress documentation' });
  }
});

// Get learning pattern analysis for a student
router.get('/students/:studentId/learning-patterns', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { studentId } = req.params;
    const {
      timeWindowDays = 30,
      focusArea = 'problem_solving_process'
    } = req.query;

    const { getProcessDocumentationService, REVIEW_FOCUS } = require('../services/process-documentation-service');
    const processDocumentationService = getProcessDocumentationService();

    // Validate focus area
    const validFocusAreas = Object.values(REVIEW_FOCUS);
    if (!validFocusAreas.includes(focusArea)) {
      return res.status(400).json({ 
        error: 'Invalid focus area',
        providedArea: focusArea,
        validAreas: validFocusAreas
      });
    }

    const documentationRequest = {
      studentId,
      timeWindowDays: parseInt(timeWindowDays),
      documentationType: 'learning_pattern',
      focusAreas: [focusArea],
      includeDetailedSteps: false,
      includeInterventions: true,
      includeMistakeAnalysis: true,
      includeRecommendations: false
    };

    const patternAnalysis = await processDocumentationService.generateProcessDocumentation(documentationRequest);

    res.json(patternAnalysis);

  } catch (error) {
    console.error('Error getting learning patterns:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to get learning patterns' });
  }
});

// Get intervention effectiveness analysis
router.get('/analytics/intervention-effectiveness', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      studentId,
      timeWindowDays = 30,
      interventionType,
      subject
    } = req.query;

    const problemSolvingService = getProblemSolvingService();

    // Build query conditions
    const conditions = [`si.provided_at >= NOW() - INTERVAL '${parseInt(timeWindowDays)} days'`];
    const params = [];
    let paramCount = 0;

    if (studentId) {
      conditions.push(`ps.student_id = $${++paramCount}`);
      params.push(studentId);
    }

    if (interventionType) {
      conditions.push(`si.intervention_type = $${++paramCount}`);
      params.push(interventionType);
    }

    if (subject) {
      conditions.push(`pt.subject = $${++paramCount}`);
      params.push(subject);
    }

    const effectivenessQuery = `
      SELECT 
        si.intervention_type,
        si.trigger_reason,
        pt.subject,
        pt.difficulty_level,
        COUNT(*) as total_interventions,
        COUNT(CASE WHEN si.was_helpful THEN 1 END) as helpful_interventions,
        COUNT(CASE WHEN si.led_to_progress THEN 1 END) as progress_interventions,
        AVG(si.confidence_level) as avg_confidence,
        AVG(EXTRACT(EPOCH FROM (pss.completed_at - si.provided_at))/60) as avg_time_to_completion
      FROM scaffolding_interventions si
      JOIN problem_sessions ps ON si.session_id = ps.id
      JOIN problem_templates pt ON ps.template_id = pt.id
      LEFT JOIN problem_session_steps pss ON si.step_id = pss.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY si.intervention_type, si.trigger_reason, pt.subject, pt.difficulty_level
      ORDER BY total_interventions DESC
    `;

    const result = await problemSolvingService.pool.query(effectivenessQuery, params);

    // Calculate overall effectiveness metrics
    const overallStats = result.rows.reduce((acc, row) => {
      acc.totalInterventions += parseInt(row.total_interventions);
      acc.totalHelpful += parseInt(row.helpful_interventions);
      acc.totalProgressLeading += parseInt(row.progress_interventions);
      return acc;
    }, { totalInterventions: 0, totalHelpful: 0, totalProgressLeading: 0 });

    const analysis = {
      timeWindow: parseInt(timeWindowDays),
      overallEffectiveness: {
        totalInterventions: overallStats.totalInterventions,
        helpfulnessRate: overallStats.totalInterventions > 0 ? 
          overallStats.totalHelpful / overallStats.totalInterventions : 0,
        progressRate: overallStats.totalInterventions > 0 ? 
          overallStats.totalProgressLeading / overallStats.totalInterventions : 0
      },
      detailedBreakdown: result.rows.map(row => ({
        ...row,
        helpfulness_rate: roundToPrecision(parseFloat(row.helpful_interventions) / parseFloat(row.total_interventions), 3),
        progress_rate: roundToPrecision(parseFloat(row.progress_interventions) / parseFloat(row.total_interventions), 3),
        avg_confidence: roundToPrecision(parseFloat(row.avg_confidence || 0), 2),
        avg_time_to_completion: roundToPrecision(parseFloat(row.avg_time_to_completion || 0), 1)
      })),
      filters: { studentId, interventionType, subject, timeWindowDays }
    };

    res.json(analysis);

  } catch (error) {
    console.error('Error getting intervention effectiveness analysis:', error);
    res.status(500).json({ error: 'Failed to get intervention effectiveness analysis' });
  }
});

// Health check for process documentation service
router.get('/documentation/health', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const { getProcessDocumentationService } = require('../services/process-documentation-service');
    const processDocumentationService = getProcessDocumentationService();
    
    const health = await processDocumentationService.healthCheck();
    
    res.json(health);
  } catch (error) {
    console.error('Error checking process documentation health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get available documentation types and focus areas (for frontend)
router.get('/documentation/constants', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const { DOCUMENTATION_TYPES, REVIEW_FOCUS } = require('../services/process-documentation-service');
    
    res.json({
      documentationTypes: DOCUMENTATION_TYPES,
      reviewFocusAreas: REVIEW_FOCUS,
      defaultTimeWindow: 30,
      supportedFormats: ['json'],
      maxTimeWindow: 365
    });
  } catch (error) {
    console.error('Error fetching documentation constants:', error);
    res.status(500).json({ error: 'Failed to fetch documentation constants' });
  }
});

// ============================================
// DIFFICULTY ADAPTATION ROUTES
// ============================================

// Adapt difficulty for a student based on performance
router.post('/students/:studentId/adapt-difficulty', authenticateJWT, roleCheck(['teacher', 'admin', 'student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { studentId } = req.params;
    const {
      subject = null,
      timeWindowDays = 14,
      strategy = 'moderate',
      minSessions = 3,
      includeRecommendations = true,
      forceAdaptation = false
    } = req.body;

    // Students can only adapt their own difficulty
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({ error: 'Students can only adapt their own difficulty settings' });
    }

    const { getDifficultyAdaptationService, ADAPTATION_STRATEGIES } = require('../services/difficulty-adaptation-service');
    const difficultyAdaptationService = getDifficultyAdaptationService();

    // Validate strategy
    const validStrategies = Object.values(ADAPTATION_STRATEGIES);
    if (!validStrategies.includes(strategy)) {
      return res.status(400).json({ 
        error: 'Invalid adaptation strategy',
        validStrategies: validStrategies
      });
    }

    const adaptationOptions = {
      subject,
      timeWindowDays: parseInt(timeWindowDays),
      strategy,
      minSessions: parseInt(minSessions),
      includeRecommendations
    };

    const adaptationResult = await difficultyAdaptationService.adaptDifficultyForStudent(
      studentId, 
      adaptationOptions
    );

    // Log the adaptation request
    await activityMonitor.logActivity({
      studentId: user.id,
      sessionId: `difficulty_adaptation_request_${Date.now()}`,
      activityType: 'difficulty_adaptation_requested',
      details: {
        targetStudentId: studentId,
        subject,
        strategy,
        timeWindowDays,
        adaptationStatus: adaptationResult.adaptationStatus,
        requestedBy: user.role
      },
      severity: 'low'
    });

    res.json({
      success: true,
      adaptationResult,
      requestedBy: user.role,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error adapting difficulty for student:', error);
    
    if (error.type === 'ADAPTATION_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to adapt difficulty for student' });
  }
});

// Get current difficulty preferences for a student
router.get('/students/:studentId/difficulty-preferences', authenticateJWT, roleCheck(['teacher', 'admin', 'student', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { studentId } = req.params;
    const { subject } = req.query;

    // Access control check
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({ error: 'Students can only view their own difficulty preferences' });
    }

    const { getDifficultyAdaptationService } = require('../services/difficulty-adaptation-service');
    const difficultyAdaptationService = getDifficultyAdaptationService();

    const client = await difficultyAdaptationService.pool.connect();
    
    try {
      // Get difficulty preferences
      const preferencesQuery = `
        SELECT sdp.*, spp.overall_performance_score, spp.optimal_difficulty_level,
               spp.profile_confidence, spp.sessions_analyzed, spp.last_session_analyzed_at
        FROM student_difficulty_preferences sdp
        LEFT JOIN student_performance_profiles spp ON sdp.student_id = spp.student_id 
          AND sdp.subject = spp.subject
        WHERE sdp.student_id = $1
        ${subject ? 'AND sdp.subject = $2' : ''}
        ORDER BY sdp.updated_at DESC
      `;

      const params = [studentId];
      if (subject) params.push(subject);

      const preferencesResult = await client.query(preferencesQuery, params);

      // Get recent adaptation history
      const historyQuery = `
        SELECT * FROM difficulty_adaptation_history
        WHERE student_id = $1
        ${subject ? 'AND subject = $2' : ''}
        ORDER BY created_at DESC
        LIMIT 10
      `;

      const historyResult = await client.query(historyQuery, params);

      res.json({
        studentId,
        preferences: preferencesResult.rows,
        recentAdaptations: historyResult.rows,
        filters: { subject },
        retrievedAt: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error getting difficulty preferences:', error);
    res.status(500).json({ error: 'Failed to get difficulty preferences' });
  }
});

// Update difficulty preference manually
router.put('/students/:studentId/difficulty-preferences', authenticateJWT, roleCheck(['teacher', 'admin', 'student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { studentId } = req.params;
    const {
      subject = 'general',
      preferredDifficulty,
      reason = 'manual_adjustment'
    } = req.body;

    // Students can only update their own preferences
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({ error: 'Students can only update their own difficulty preferences' });
    }

    if (!preferredDifficulty) {
      return res.status(400).json({ error: 'Preferred difficulty is required' });
    }

    const { getDifficultyAdaptationService, DIFFICULTY_LEVELS } = require('../services/difficulty-adaptation-service');
    const difficultyAdaptationService = getDifficultyAdaptationService();

    // Validate difficulty level
    const validDifficulties = Object.values(DIFFICULTY_LEVELS).map(level => level.name);
    if (!validDifficulties.includes(preferredDifficulty)) {
      return res.status(400).json({ 
        error: 'Invalid difficulty level',
        validDifficulties: validDifficulties
      });
    }

    const client = await difficultyAdaptationService.pool.connect();
    
    try {
      // Get current preference for comparison
      const currentQuery = `
        SELECT preferred_difficulty FROM student_difficulty_preferences
        WHERE student_id = $1 AND subject = $2
      `;
      const currentResult = await client.query(currentQuery, [studentId, subject]);
      const previousDifficulty = currentResult.rows[0]?.preferred_difficulty || 'medium';

      // Update preference
      const updateQuery = `
        INSERT INTO student_difficulty_preferences (
          student_id, subject, preferred_difficulty, adaptation_metadata, updated_at
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (student_id, subject) 
        DO UPDATE SET 
          preferred_difficulty = EXCLUDED.preferred_difficulty,
          adaptation_metadata = EXCLUDED.adaptation_metadata,
          updated_at = NOW()
        RETURNING *
      `;

      const metadata = {
        manuallySet: true,
        setBy: user.role,
        reason: reason,
        timestamp: new Date().toISOString()
      };

      const updateResult = await client.query(updateQuery, [
        studentId,
        subject,
        preferredDifficulty,
        JSON.stringify(metadata)
      ]);

      // Log in adaptation history if difficulty changed
      if (previousDifficulty !== preferredDifficulty) {
        const previousValue = difficultyAdaptationService.getDifficultyValue(previousDifficulty);
        const newValue = difficultyAdaptationService.getDifficultyValue(preferredDifficulty);
        const difficultyChange = newValue - previousValue;

        await client.query(`
          INSERT INTO difficulty_adaptation_history (
            student_id, subject, previous_difficulty, new_difficulty, 
            difficulty_change, adaptation_reason, confidence_level, strategy_used
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          studentId,
          subject,
          previousDifficulty,
          preferredDifficulty,
          difficultyChange,
          `Manual adjustment: ${reason}`,
          1.0, // Maximum confidence for manual settings
          'manual'
        ]);
      }

      res.json({
        success: true,
        preference: updateResult.rows[0],
        previousDifficulty,
        difficultyChanged: previousDifficulty !== preferredDifficulty,
        updatedBy: user.role,
        timestamp: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating difficulty preference:', error);
    res.status(500).json({ error: 'Failed to update difficulty preference' });
  }
});

// Get difficulty adaptation history for a student
router.get('/students/:studentId/adaptation-history', authenticateJWT, roleCheck(['teacher', 'admin', 'student', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { studentId } = req.params;
    const {
      subject,
      timeWindowDays = 90,
      limit = 50,
      offset = 0
    } = req.query;

    // Access control check
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({ error: 'Students can only view their own adaptation history' });
    }

    const { getDifficultyAdaptationService } = require('../services/difficulty-adaptation-service');
    const difficultyAdaptationService = getDifficultyAdaptationService();

    const client = await difficultyAdaptationService.pool.connect();
    
    try {
      // Build query conditions
      const conditions = [
        'student_id = $1',
        `created_at >= NOW() - INTERVAL '${parseInt(timeWindowDays)} days'`
      ];
      const params = [studentId];
      let paramCount = 1;

      if (subject) {
        conditions.push(`subject = $${++paramCount}`);
        params.push(subject);
      }

      const historyQuery = `
        SELECT dah.*, 
               CASE 
                 WHEN difficulty_change > 0 THEN 'increase'
                 WHEN difficulty_change < 0 THEN 'decrease'
                 ELSE 'no_change'
               END as adaptation_direction,
               ABS(difficulty_change) as adaptation_magnitude
        FROM difficulty_adaptation_history dah
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      params.push(parseInt(limit), parseInt(offset));

      const historyResult = await client.query(historyQuery, params);

      // Get summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_adaptations,
          COUNT(CASE WHEN difficulty_change > 0 THEN 1 END) as increases,
          COUNT(CASE WHEN difficulty_change < 0 THEN 1 END) as decreases,
          AVG(confidence_level) as avg_confidence,
          COUNT(DISTINCT subject) as subjects_adapted,
          MIN(created_at) as first_adaptation,
          MAX(created_at) as last_adaptation
        FROM difficulty_adaptation_history
        WHERE ${conditions.join(' AND ')}
      `;

      const summaryResult = await client.query(summaryQuery, params.slice(0, -2));

      res.json({
        studentId,
        timeWindow: timeWindowDays,
        adaptationHistory: historyResult.rows,
        summary: summaryResult.rows[0],
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: historyResult.rows.length === parseInt(limit)
        },
        filters: { subject },
        retrievedAt: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error getting adaptation history:', error);
    res.status(500).json({ error: 'Failed to get adaptation history' });
  }
});

// Get adapted problem recommendations for a student
router.get('/students/:studentId/adapted-problems', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { studentId } = req.params;
    const {
      subject,
      problemType,
      useAdaptedDifficulty = true,
      limit = 20,
      includeExplanation = true
    } = req.query;

    // Students can only get their own adapted problems
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({ error: 'Students can only get their own adapted problems' });
    }

    const problemSolvingService = getProblemSolvingService();
    const { getDifficultyAdaptationService } = require('../services/difficulty-adaptation-service');
    const difficultyAdaptationService = getDifficultyAdaptationService();

    let adaptedDifficulty = null;
    let adaptationInfo = null;

    if (useAdaptedDifficulty === 'true') {
      const client = await difficultyAdaptationService.pool.connect();
      
      try {
        // Get student's adapted difficulty preference
        adaptedDifficulty = await difficultyAdaptationService.getCurrentDifficulty(
          client, studentId, subject
        );

        // Get adaptation information for explanation
        if (includeExplanation === 'true') {
          const preferenceQuery = `
            SELECT sdp.*, spp.overall_performance_score, spp.profile_confidence
            FROM student_difficulty_preferences sdp
            LEFT JOIN student_performance_profiles spp ON sdp.student_id = spp.student_id 
              AND sdp.subject = spp.subject
            WHERE sdp.student_id = $1
            ${subject ? 'AND sdp.subject = $2' : ''}
            ORDER BY sdp.updated_at DESC
            LIMIT 1
          `;
          
          const params = [studentId];
          if (subject) params.push(subject);
          
          const preferenceResult = await client.query(preferenceQuery, params);
          if (preferenceResult.rows.length > 0) {
            adaptationInfo = preferenceResult.rows[0];
          }
        }

      } finally {
        client.release();
      }
    }

    // Build query for adapted problems
    const conditions = ['pt.is_active = true'];
    const params = [];
    let paramCount = 0;

    if (problemType) {
      conditions.push(`pt.problem_type = $${++paramCount}`);
      params.push(problemType);
    }

    if (subject) {
      conditions.push(`pt.subject = $${++paramCount}`);
      params.push(subject);
    }

    if (adaptedDifficulty && adaptedDifficulty !== 'medium') {
      // Map extended difficulty levels to standard difficulty levels
      const difficultyMapping = {
        'very_easy': 'easy',
        'easy': 'easy',
        'medium': 'medium',
        'hard': 'hard',
        'very_hard': 'advanced'
      };
      
      const mappedDifficulty = difficultyMapping[adaptedDifficulty] || 'medium';
      conditions.push(`pt.difficulty_level = $${++paramCount}`);
      params.push(mappedDifficulty);
    }

    const problemsQuery = `
      SELECT pt.*, 
             ps_stats.attempts,
             ps_stats.avg_accuracy,
             ps_stats.completion_rate
      FROM problem_templates pt
      LEFT JOIN (
        SELECT template_id,
               COUNT(*) as attempts,
               AVG(accuracy_score) as avg_accuracy,
               COUNT(*) FILTER (WHERE session_status = 'completed')::FLOAT / COUNT(*) as completion_rate
        FROM problem_sessions
        WHERE student_id = $${++paramCount}
        GROUP BY template_id
      ) ps_stats ON pt.id = ps_stats.template_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY 
        CASE WHEN ps_stats.attempts IS NULL THEN 0 ELSE 1 END, -- New problems first
        pt.success_rate DESC,
        pt.usage_count DESC
      LIMIT $${++paramCount}
    `;

    params.push(studentId, parseInt(limit));

    const problemsResult = await problemSolvingService.pool.query(problemsQuery, params);

    res.json({
      studentId,
      adaptedDifficulty: adaptedDifficulty,
      adaptationInfo: adaptationInfo,
      problems: problemsResult.rows.map(problem => ({
        ...problem,
        isAdapted: useAdaptedDifficulty === 'true' && adaptedDifficulty && adaptedDifficulty !== 'medium',
        originalDifficulty: problem.difficulty_level,
        adaptedFrom: adaptationInfo ? adaptationInfo.adaptation_metadata : null
      })),
      filters: { subject, problemType, useAdaptedDifficulty },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting adapted problems:', error);
    res.status(500).json({ error: 'Failed to get adapted problems' });
  }
});

// Get difficulty adaptation analytics (teacher/admin only)
router.get('/analytics/difficulty-adaptation', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      studentId,
      subject,
      timeWindowDays = 30,
      strategy
    } = req.query;

    const { getDifficultyAdaptationService } = require('../services/difficulty-adaptation-service');
    const difficultyAdaptationService = getDifficultyAdaptationService();

    const client = await difficultyAdaptationService.pool.connect();
    
    try {
      // Build query conditions
      const conditions = [`dah.created_at >= NOW() - INTERVAL '${parseInt(timeWindowDays)} days'`];
      const params = [];
      let paramCount = 0;

      if (studentId) {
        conditions.push(`dah.student_id = $${++paramCount}`);
        params.push(studentId);
      }

      if (subject) {
        conditions.push(`dah.subject = $${++paramCount}`);
        params.push(subject);
      }

      if (strategy) {
        conditions.push(`dah.strategy_used = $${++paramCount}`);
        params.push(strategy);
      }

      // Get adaptation statistics
      const analyticsQuery = `
        SELECT 
          COUNT(*) as total_adaptations,
          COUNT(CASE WHEN difficulty_change > 0 THEN 1 END) as difficulty_increases,
          COUNT(CASE WHEN difficulty_change < 0 THEN 1 END) as difficulty_decreases,
          AVG(confidence_level) as avg_confidence,
          AVG(ABS(difficulty_change)) as avg_adaptation_magnitude,
          COUNT(DISTINCT student_id) as students_adapted,
          COUNT(DISTINCT subject) as subjects_affected
        FROM difficulty_adaptation_history dah
        WHERE ${conditions.join(' AND ')}
      `;

      const analyticsResult = await client.query(analyticsQuery, params);

      // Get adaptation by strategy
      const strategyQuery = `
        SELECT 
          strategy_used,
          COUNT(*) as usage_count,
          AVG(confidence_level) as avg_confidence,
          AVG(difficulty_change) as avg_change
        FROM difficulty_adaptation_history dah
        WHERE ${conditions.join(' AND ')}
          AND strategy_used IS NOT NULL
        GROUP BY strategy_used
        ORDER BY usage_count DESC
      `;

      const strategyResult = await client.query(strategyQuery, params);

      // Get adaptation by subject
      const subjectQuery = `
        SELECT 
          subject,
          COUNT(*) as adaptation_count,
          AVG(confidence_level) as avg_confidence,
          COUNT(CASE WHEN difficulty_change > 0 THEN 1 END) as increases,
          COUNT(CASE WHEN difficulty_change < 0 THEN 1 END) as decreases
        FROM difficulty_adaptation_history dah
        WHERE ${conditions.join(' AND ')}
        GROUP BY subject
        ORDER BY adaptation_count DESC
      `;

      const subjectResult = await client.query(subjectQuery, params);

      // Get recent adaptations
      const recentQuery = `
        SELECT dah.*, u.username as student_name
        FROM difficulty_adaptation_history dah
        JOIN users u ON dah.student_id = u.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY dah.created_at DESC
        LIMIT 20
      `;

      const recentResult = await client.query(recentQuery, params);

      res.json({
        timeWindow: timeWindowDays,
        overallAnalytics: analyticsResult.rows[0],
        strategyBreakdown: strategyResult.rows,
        subjectBreakdown: subjectResult.rows,
        recentAdaptations: recentResult.rows,
        filters: { studentId, subject, strategy },
        calculatedAt: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error getting difficulty adaptation analytics:', error);
    res.status(500).json({ error: 'Failed to get difficulty adaptation analytics' });
  }
});

// Health check for difficulty adaptation service
router.get('/difficulty-adaptation/health', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const { getDifficultyAdaptationService } = require('../services/difficulty-adaptation-service');
    const difficultyAdaptationService = getDifficultyAdaptationService();
    
    const health = await difficultyAdaptationService.healthCheck();
    
    res.json(health);
  } catch (error) {
    console.error('Error checking difficulty adaptation health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get difficulty adaptation constants (for frontend)
router.get('/difficulty-adaptation/constants', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const { DIFFICULTY_LEVELS, PERFORMANCE_INDICATORS, ADAPTATION_STRATEGIES } = require('../services/difficulty-adaptation-service');
    
    res.json({
      difficultyLevels: DIFFICULTY_LEVELS,
      performanceIndicators: PERFORMANCE_INDICATORS,
      adaptationStrategies: ADAPTATION_STRATEGIES,
      defaultStrategy: 'moderate',
      defaultTimeWindow: 14,
      minimumSessions: 3,
      maxTimeWindow: 90
    });
  } catch (error) {
    console.error('Error fetching difficulty adaptation constants:', error);
    res.status(500).json({ error: 'Failed to fetch difficulty adaptation constants' });
  }
});

// ============================================
// SESSION ANALYTICS AND TRACKING ROUTES (Task 4.6)
// ============================================

// Get real-time session overview for teachers
router.get('/analytics/real-time-sessions', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { classId } = req.query;

    const { getSessionAnalyticsService } = require('../services/session-analytics-service');
    const sessionAnalyticsService = getSessionAnalyticsService();

    const overview = await sessionAnalyticsService.getRealTimeSessionOverview(user.id, classId);

    res.json(overview);

  } catch (error) {
    console.error('Error getting real-time session overview:', error);
    res.status(500).json({ error: 'Failed to get real-time session overview' });
  }
});

// Track session heartbeat (for real-time monitoring)
router.post('/sessions/:sessionId/heartbeat', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { sessionId } = req.params;
    const {
      currentStep,
      responseInProgress = false,
      timeOnStep = 0,
      interfaceEvents = [],
      engagementLevel = 'medium'
    } = req.body;

    const { getSessionAnalyticsService } = require('../services/session-analytics-service');
    const sessionAnalyticsService = getSessionAnalyticsService();

    const result = await sessionAnalyticsService.trackSessionHeartbeat(sessionId, user.id, {
      currentStep,
      responseInProgress,
      timeOnStep,
      interfaceEvents,
      engagementLevel
    });

    res.json(result);

  } catch (error) {
    console.error('Error tracking session heartbeat:', error);
    // Don't return 500 for heartbeat failures - just log and return success
    res.json({ success: false, error: 'Heartbeat tracking failed' });
  }
});

// Get comprehensive student session analytics
router.get('/analytics/students/:studentId/comprehensive', authenticateJWT, roleCheck(['teacher', 'admin', 'student', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { studentId } = req.params;
    const {
      timeWindow = 'monthly',
      includeComparisons = true,
      includeProgressTrends = true,
      includePredictions = false
    } = req.query;

    // Access control check
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({ error: 'Students can only view their own analytics' });
    }

    const { getSessionAnalyticsService } = require('../services/session-analytics-service');
    const sessionAnalyticsService = getSessionAnalyticsService();

    const analytics = await sessionAnalyticsService.getStudentSessionAnalytics(studentId, {
      timeWindow,
      includeComparisons: includeComparisons === 'true',
      includeProgressTrends: includeProgressTrends === 'true',
      includePredictions: includePredictions === 'true'
    });

    res.json(analytics);

  } catch (error) {
    console.error('Error getting comprehensive student analytics:', error);
    res.status(500).json({ error: 'Failed to get comprehensive student analytics' });
  }
});

// Get learning pattern analysis for a student
router.get('/analytics/students/:studentId/learning-patterns', authenticateJWT, roleCheck(['teacher', 'admin', 'student', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { studentId } = req.params;
    const {
      timeWindow = 'monthly',
      includeTimePatterns = true,
      includeEngagementPatterns = true,
      includePerformancePatterns = true
    } = req.query;

    // Access control check
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({ error: 'Students can only view their own learning patterns' });
    }

    const { getSessionAnalyticsService } = require('../services/session-analytics-service');
    const sessionAnalyticsService = getSessionAnalyticsService();

    const patterns = await sessionAnalyticsService.getLearningPatternAnalysis(studentId, {
      timeWindow,
      includeTimePatterns: includeTimePatterns === 'true',
      includeEngagementPatterns: includeEngagementPatterns === 'true',
      includePerformancePatterns: includePerformancePatterns === 'true'
    });

    res.json(patterns);

  } catch (error) {
    console.error('Error getting learning pattern analysis:', error);
    res.status(500).json({ error: 'Failed to get learning pattern analysis' });
  }
});

// Get teacher dashboard analytics
router.get('/analytics/teacher-dashboard', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      timeWindow = 'weekly',
      classId,
      includeStudentProgress = true,
      includeClassComparisons = true
    } = req.query;

    const { getSessionAnalyticsService } = require('../services/session-analytics-service');
    const sessionAnalyticsService = getSessionAnalyticsService();

    const dashboard = await sessionAnalyticsService.getTeacherDashboardAnalytics(user.id, {
      timeWindow,
      classId,
      includeStudentProgress: includeStudentProgress === 'true',
      includeClassComparisons: includeClassComparisons === 'true'
    });

    res.json(dashboard);

  } catch (error) {
    console.error('Error getting teacher dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to get teacher dashboard analytics' });
  }
});

// Get session alerts for a teacher
router.get('/alerts/sessions', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      alertLevel,
      alertType,
      resolved = false,
      limit = 50,
      offset = 0,
      timeWindowHours = 24
    } = req.query;

    const problemSolvingService = getProblemSolvingService();

    // Build query conditions
    const conditions = [`sa.created_at >= NOW() - INTERVAL '${parseInt(timeWindowHours)} hours'`];
    const params = [];
    let paramCount = 0;

    if (alertLevel) {
      conditions.push(`sa.alert_level = $${++paramCount}`);
      params.push(alertLevel);
    }

    if (alertType) {
      conditions.push(`sa.alert_type = $${++paramCount}`);
      params.push(alertType);
    }

    if (resolved === 'false') {
      conditions.push('sa.resolved_at IS NULL');
    } else if (resolved === 'true') {
      conditions.push('sa.resolved_at IS NOT NULL');
    }

    const alertsQuery = `
      SELECT sa.*, u.username as student_name, pt.title as problem_title, pt.subject
      FROM session_alerts sa
      JOIN users u ON sa.student_id = u.id
      JOIN problem_sessions ps ON sa.session_id = ps.id
      JOIN problem_templates pt ON ps.template_id = pt.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY sa.priority DESC, sa.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    params.push(parseInt(limit), parseInt(offset));

    const result = await problemSolvingService.pool.query(alertsQuery, params);

    // Get summary counts
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE alert_level = 'critical') as critical_alerts,
        COUNT(*) FILTER (WHERE alert_level = 'warning') as warning_alerts,
        COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved_alerts
      FROM session_alerts sa
      WHERE ${conditions.join(' AND ')}
    `;

    const summaryResult = await problemSolvingService.pool.query(summaryQuery, params.slice(0, -2));

    res.json({
      alerts: result.rows,
      summary: summaryResult.rows[0],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: result.rows.length === parseInt(limit)
      },
      filters: { alertLevel, alertType, resolved, timeWindowHours }
    });

  } catch (error) {
    console.error('Error getting session alerts:', error);
    res.status(500).json({ error: 'Failed to get session alerts' });
  }
});

// Acknowledge/resolve a session alert
router.post('/alerts/:alertId/resolve', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { alertId } = req.params;
    const { resolutionAction } = req.body;

    const problemSolvingService = getProblemSolvingService();

    const updateQuery = `
      UPDATE session_alerts 
      SET acknowledged_at = NOW(), 
          acknowledged_by = $1,
          resolved_at = NOW(),
          resolution_action = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await problemSolvingService.pool.query(updateQuery, [
      user.id,
      resolutionAction || 'Acknowledged by teacher',
      alertId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({
      success: true,
      alert: result.rows[0],
      resolvedBy: user.id,
      resolvedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error resolving session alert:', error);
    res.status(500).json({ error: 'Failed to resolve session alert' });
  }
});

// Get performance anomalies
router.get('/analytics/anomalies', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      studentId,
      anomalyType,
      investigated = false,
      timeWindowDays = 7,
      limit = 20,
      offset = 0
    } = req.query;

    const problemSolvingService = getProblemSolvingService();

    // Build query conditions
    const conditions = [`pa.detected_at >= NOW() - INTERVAL '${parseInt(timeWindowDays)} days'`];
    const params = [];
    let paramCount = 0;

    if (studentId) {
      conditions.push(`pa.student_id = $${++paramCount}`);
      params.push(studentId);
    }

    if (anomalyType) {
      conditions.push(`pa.anomaly_type = $${++paramCount}`);
      params.push(anomalyType);
    }

    if (investigated === 'false') {
      conditions.push('pa.investigated = FALSE');
    } else if (investigated === 'true') {
      conditions.push('pa.investigated = TRUE');
    }

    const anomaliesQuery = `
      SELECT pa.*, u.username as student_name
      FROM performance_anomalies pa
      JOIN users u ON pa.student_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY pa.deviation_score DESC, pa.detected_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    params.push(parseInt(limit), parseInt(offset));

    const result = await problemSolvingService.pool.query(anomaliesQuery, params);

    res.json({
      anomalies: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: result.rows.length === parseInt(limit)
      },
      filters: { studentId, anomalyType, investigated, timeWindowDays }
    });

  } catch (error) {
    console.error('Error getting performance anomalies:', error);
    res.status(500).json({ error: 'Failed to get performance anomalies' });
  }
});

// Mark anomaly as investigated
router.post('/analytics/anomalies/:anomalyId/investigate', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { anomalyId } = req.params;
    const { investigationNotes, resolutionStatus = 'investigated' } = req.body;

    const problemSolvingService = getProblemSolvingService();

    const updateQuery = `
      UPDATE performance_anomalies 
      SET investigated = TRUE,
          investigation_notes = $1,
          resolution_status = $2,
          investigated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const result = await problemSolvingService.pool.query(updateQuery, [
      investigationNotes,
      resolutionStatus,
      anomalyId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    res.json({
      success: true,
      anomaly: result.rows[0],
      investigatedBy: user.id,
      investigatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error investigating anomaly:', error);
    res.status(500).json({ error: 'Failed to investigate anomaly' });
  }
});

// Get session engagement metrics
router.get('/analytics/engagement/:sessionId', authenticateJWT, roleCheck(['teacher', 'admin', 'student']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { sessionId } = req.params;

    const problemSolvingService = getProblemSolvingService();

    // Get engagement metrics for the session
    const engagementQuery = `
      SELECT sem.*, ps.student_id, ps.session_status
      FROM session_engagement_metrics sem
      JOIN problem_sessions ps ON sem.session_id = ps.id
      WHERE sem.session_id = $1
    `;

    const engagementResult = await problemSolvingService.pool.query(engagementQuery, [sessionId]);

    if (engagementResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session engagement metrics not found' });
    }

    const engagement = engagementResult.rows[0];

    // Access control check
    if (user.role === 'student' && user.id !== engagement.student_id) {
      return res.status(403).json({ error: 'Students can only view their own engagement metrics' });
    }

    // Get heartbeat data for detailed analysis
    const heartbeatQuery = `
      SELECT engagement_level, recorded_at, time_on_step, interface_events
      FROM session_heartbeats
      WHERE session_id = $1
      ORDER BY recorded_at ASC
    `;

    const heartbeatResult = await problemSolvingService.pool.query(heartbeatQuery, [sessionId]);

    res.json({
      sessionId,
      engagementMetrics: engagement,
      heartbeatData: heartbeatResult.rows,
      analysisTimestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting session engagement metrics:', error);
    res.status(500).json({ error: 'Failed to get session engagement metrics' });
  }
});

// Get learning trajectory for a student
router.get('/analytics/students/:studentId/trajectory', authenticateJWT, roleCheck(['teacher', 'admin', 'student', 'parent']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { studentId } = req.params;
    const { subject } = req.query;

    // Access control check
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({ error: 'Students can only view their own learning trajectory' });
    }

    const problemSolvingService = getProblemSolvingService();

    // Build query conditions
    const conditions = ['student_id = $1'];
    const params = [studentId];
    let paramCount = 1;

    if (subject) {
      conditions.push(`subject = $${++paramCount}`);
      params.push(subject);
    }

    const trajectoryQuery = `
      SELECT *
      FROM learning_trajectories
      WHERE ${conditions.join(' AND ')}
      ORDER BY updated_at DESC
    `;

    const result = await problemSolvingService.pool.query(trajectoryQuery, params);

    res.json({
      studentId,
      trajectories: result.rows,
      filters: { subject },
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting learning trajectory:', error);
    res.status(500).json({ error: 'Failed to get learning trajectory' });
  }
});

// Get session benchmarks and comparisons
router.get('/analytics/benchmarks', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const {
      subject,
      difficultyLevel,
      gradeLevel
    } = req.query;

    const problemSolvingService = getProblemSolvingService();

    // Build query conditions
    const conditions = [];
    const params = [];
    let paramCount = 0;

    if (subject) {
      conditions.push(`subject = $${++paramCount}`);
      params.push(subject);
    }

    if (difficultyLevel) {
      conditions.push(`difficulty_level = $${++paramCount}`);
      params.push(difficultyLevel);
    }

    if (gradeLevel) {
      conditions.push(`grade_level_min <= $${++paramCount} AND grade_level_max >= $${++paramCount}`);
      params.push(parseInt(gradeLevel), parseInt(gradeLevel));
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const benchmarksQuery = `
      SELECT *
      FROM session_benchmarks
      ${whereClause}
      ORDER BY last_updated DESC
    `;

    const result = await problemSolvingService.pool.query(benchmarksQuery, params);

    res.json({
      benchmarks: result.rows,
      filters: { subject, difficultyLevel, gradeLevel },
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting session benchmarks:', error);
    res.status(500).json({ error: 'Failed to get session benchmarks' });
  }
});

// Generate session analytics report
router.post('/analytics/generate-report', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      reportType = 'comprehensive',
      studentIds = [],
      timeWindow = 'monthly',
      includeComparisons = true,
      includeRecommendations = true
    } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'At least one student ID is required' });
    }

    const { getSessionAnalyticsService } = require('../services/session-analytics-service');
    const sessionAnalyticsService = getSessionAnalyticsService();

    // Generate analytics for each student
    const studentAnalytics = [];
    for (const studentId of studentIds) {
      try {
        const analytics = await sessionAnalyticsService.getStudentSessionAnalytics(studentId, {
          timeWindow,
          includeComparisons,
          includeProgressTrends: true,
          includePredictions: includeRecommendations
        });
        studentAnalytics.push(analytics);
      } catch (error) {
        console.error(`Error getting analytics for student ${studentId}:`, error);
        studentAnalytics.push({
          studentId,
          error: 'Failed to generate analytics for this student'
        });
      }
    }

    // Log report generation
    await activityMonitor.logActivity({
      studentId: user.id,
      sessionId: `report_generation_${Date.now()}`,
      activityType: 'analytics_report_generated',
      details: {
        reportType,
        studentCount: studentIds.length,
        timeWindow,
        generatedBy: user.id
      },
      severity: 'low'
    });

    res.json({
      reportType,
      timeWindow,
      generatedBy: user.id,
      generatedAt: new Date().toISOString(),
      studentAnalytics,
      summary: {
        totalStudents: studentIds.length,
        successfulAnalytics: studentAnalytics.filter(a => !a.error).length,
        failedAnalytics: studentAnalytics.filter(a => a.error).length
      }
    });

  } catch (error) {
    console.error('Error generating analytics report:', error);
    res.status(500).json({ error: 'Failed to generate analytics report' });
  }
});

// Health check for session analytics service
router.get('/analytics/health', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const { getSessionAnalyticsService } = require('../services/session-analytics-service');
    const sessionAnalyticsService = getSessionAnalyticsService();
    
    const health = await sessionAnalyticsService.healthCheck();
    
    res.json(health);
  } catch (error) {
    console.error('Error checking session analytics health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get session analytics constants (for frontend)
router.get('/analytics/constants', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const { TIME_WINDOWS, METRIC_TYPES, SESSION_STATUS_CATEGORIES } = require('../services/session-analytics-service');
    
    res.json({
      timeWindows: TIME_WINDOWS,
      metricTypes: METRIC_TYPES,
      sessionStatusCategories: SESSION_STATUS_CATEGORIES,
      alertLevels: ['info', 'warning', 'critical'],
      alertTypes: ['stuck', 'struggling', 'disengaged', 'error_pattern', 'time_limit'],
      anomalyTypes: ['performance_drop', 'unusual_pattern', 'outlier_time', 'error_spike'],
      engagementLevels: ['low', 'medium', 'high'],
      defaultTimeWindow: 'monthly',
      maxTimeWindow: 'quarterly'
    });
  } catch (error) {
    console.error('Error fetching session analytics constants:', error);
    res.status(500).json({ error: 'Failed to fetch session analytics constants' });
  }
});

// ============================================
// PROBLEM TEMPLATE MANAGEMENT ROUTES (Task 4.7)
// ============================================

// Create a new problem template
router.post('/templates/create', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      title,
      description,
      problem_type,
      template_subtype,
      subject,
      difficulty_level,
      problem_statement,
      expected_solution,
      problem_data,
      learning_objectives,
      prerequisite_skills,
      bloom_taxonomy_level,
      grade_level_min,
      grade_level_max,
      estimated_time_minutes,
      tags,
      keywords
    } = req.body;

    // Validate required fields
    if (!title || !problem_type || !subject || !difficulty_level || !problem_statement) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['title', 'problem_type', 'subject', 'difficulty_level', 'problem_statement']
      });
    }

    const { getProblemTemplateService } = require('../services/problem-template-service');
    const problemTemplateService = getProblemTemplateService();

    const templateData = {
      title,
      description,
      problem_type,
      template_subtype,
      subject,
      difficulty_level,
      problem_statement,
      expected_solution,
      problem_data,
      learning_objectives,
      prerequisite_skills,
      bloom_taxonomy_level,
      grade_level_min: grade_level_min || 1,
      grade_level_max: grade_level_max || 12,
      estimated_time_minutes: estimated_time_minutes || 30,
      tags: tags || [],
      keywords: keywords || []
    };

    const result = await problemTemplateService.createTemplate(templateData, user.id);

    res.status(201).json({
      success: true,
      message: 'Problem template created successfully',
      template: result.template,
      configuration: result.scaffoldingConfiguration
    });

  } catch (error) {
    console.error('Error creating problem template:', error);
    
    if (error.type === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: error.message, details: error.details });
    }
    if (error.type === 'INVALID_TYPE' || error.type === 'INVALID_SUBTYPE') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to create problem template' });
  }
});

// Get problem template types and configurations
router.get('/templates/types', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const { PROBLEM_TEMPLATE_TYPES, GRADE_LEVEL_ADAPTATIONS } = require('../services/problem-template-service');
    
    res.json({
      templateTypes: PROBLEM_TEMPLATE_TYPES,
      gradeAdaptations: GRADE_LEVEL_ADAPTATIONS,
      supportedTypes: ['math', 'science', 'writing'],
      supportedSubjects: [
        'arithmetic', 'algebra', 'geometry', 'statistics', 'calculus',
        'biology', 'chemistry', 'physics', 'earth_science', 'environmental_science',
        'creative_writing', 'essay_writing', 'grammar', 'vocabulary', 'reading_analysis',
        'logic', 'general'
      ],
      difficultyLevels: ['easy', 'medium', 'hard', 'advanced'],
      bloomTaxonomyLevels: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
    });

  } catch (error) {
    console.error('Error fetching template types:', error);
    res.status(500).json({ error: 'Failed to fetch template types' });
  }
});

// Get templates with advanced filtering
router.get('/templates/search', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const {
      problemType,
      subject,
      difficulty,
      gradeLevel,
      tags,
      searchQuery,
      limit = 20,
      offset = 0,
      sortBy = 'usage_count',
      sortOrder = 'desc'
    } = req.query;

    const { getProblemTemplateService } = require('../services/problem-template-service');
    const problemTemplateService = getProblemTemplateService();

    const filters = {
      problemType,
      subject,
      difficulty,
      gradeLevel: gradeLevel ? parseInt(gradeLevel) : null,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : null,
      searchQuery,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy,
      sortOrder
    };

    const result = await problemTemplateService.getTemplates(filters);

    res.json(result);

  } catch (error) {
    console.error('Error searching templates:', error);
    res.status(500).json({ error: 'Failed to search templates' });
  }
});

// Get detailed template by ID
router.get('/templates/:templateId/details', authenticateJWT, roleCheck(['student', 'teacher', 'parent']), async (req, res) => {
  try {
    const { templateId } = req.params;
    const { includeUsageStats = true } = req.query;

    const { getProblemTemplateService } = require('../services/problem-template-service');
    const problemTemplateService = getProblemTemplateService();

    const template = await problemTemplateService.getTemplateById(templateId);

    res.json({
      template,
      includesUsageStats: includeUsageStats === 'true',
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting template details:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to get template details' });
  }
});

// Adapt template for specific student
router.post('/templates/:templateId/adapt', authenticateJWT, roleCheck(['student', 'teacher']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { templateId } = req.params;
    const {
      studentId,
      adaptationOptions = {}
    } = req.body;

    // Students can only adapt templates for themselves
    const targetStudentId = user.role === 'student' ? user.id : (studentId || user.id);

    if (user.role === 'student' && targetStudentId !== user.id) {
      return res.status(403).json({ error: 'Students can only adapt templates for themselves' });
    }

    const { getProblemTemplateService } = require('../services/problem-template-service');
    const problemTemplateService = getProblemTemplateService();

    const result = await problemTemplateService.adaptTemplateForStudent(
      templateId,
      targetStudentId,
      adaptationOptions
    );

    res.json({
      success: true,
      adaptation: result,
      adaptedFor: targetStudentId,
      adaptedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error adapting template:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    if (error.type === 'ADAPTATION_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to adapt template' });
  }
});

// Generate sample problems from template
router.post('/templates/:templateId/generate-samples', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const { templateId } = req.params;
    const {
      count = 3,
      variationLevel = 'medium'
    } = req.body;

    if (count > 10) {
      return res.status(400).json({ error: 'Maximum 10 samples can be generated at once' });
    }

    const validVariationLevels = ['low', 'medium', 'high'];
    if (!validVariationLevels.includes(variationLevel)) {
      return res.status(400).json({ 
        error: 'Invalid variation level',
        validLevels: validVariationLevels
      });
    }

    const { getProblemTemplateService } = require('../services/problem-template-service');
    const problemTemplateService = getProblemTemplateService();

    const result = await problemTemplateService.generateSampleProblems(
      templateId,
      parseInt(count),
      variationLevel
    );

    res.json(result);

  } catch (error) {
    console.error('Error generating sample problems:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    if (error.type === 'GENERATION_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to generate sample problems' });
  }
});

// Update existing template
router.put('/templates/:templateId', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { templateId } = req.params;
    const updateData = req.body;

    // Get current template to check ownership/permissions
    const { getProblemTemplateService } = require('../services/problem-template-service');
    const problemTemplateService = getProblemTemplateService();
    
    const currentTemplate = await problemTemplateService.getTemplateById(templateId);

    // Only allow creator or admin to update
    if (user.role !== 'admin' && currentTemplate.created_by !== user.id) {
      return res.status(403).json({ error: 'Only template creator or admin can update templates' });
    }

    // Perform update (this would need to be implemented in the service)
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Template update functionality coming soon',
      templateId,
      updatedBy: user.id,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating template:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template (soft delete)
router.delete('/templates/:templateId', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { templateId } = req.params;

    // Get current template to check ownership/permissions
    const { getProblemTemplateService } = require('../services/problem-template-service');
    const problemTemplateService = getProblemTemplateService();
    
    const currentTemplate = await problemTemplateService.getTemplateById(templateId);

    // Only allow creator or admin to delete
    if (user.role !== 'admin' && currentTemplate.created_by !== user.id) {
      return res.status(403).json({ error: 'Only template creator or admin can delete templates' });
    }

    // Perform soft delete (this would need to be implemented in the service)
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Template deletion functionality coming soon',
      templateId,
      deletedBy: user.id,
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting template:', error);
    
    if (error.type === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Get template usage analytics
router.get('/templates/:templateId/analytics', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const { templateId } = req.params;
    const { timeWindowDays = 30 } = req.query;

    const problemSolvingService = getProblemSolvingService();

    // Get usage analytics for the template
    const analyticsQuery = `
      SELECT 
        COUNT(*) as total_uses,
        COUNT(DISTINCT student_id) as unique_students,
        COUNT(*) FILTER (WHERE session_status = 'completed') as completed_sessions,
        AVG(accuracy_score) FILTER (WHERE accuracy_score IS NOT NULL) as avg_accuracy,
        AVG(completion_time_minutes) FILTER (WHERE completion_time_minutes IS NOT NULL) as avg_completion_time,
        AVG(steps_completed::float / total_steps) as avg_progress,
        SUM(hints_requested) as total_hints_requested,
        SUM(mistakes_made) as total_mistakes
      FROM problem_sessions
      WHERE template_id = $1
        AND started_at >= NOW() - INTERVAL '${parseInt(timeWindowDays)} days'
    `;

    const analyticsResult = await problemSolvingService.pool.query(analyticsQuery, [templateId]);
    const analytics = analyticsResult.rows[0];

    // Get difficulty breakdown
    const difficultyQuery = `
      SELECT 
        ps.difficulty_perception,
        COUNT(*) as count,
        AVG(ps.accuracy_score) as avg_accuracy
      FROM problem_sessions ps
      WHERE ps.template_id = $1
        AND ps.started_at >= NOW() - INTERVAL '${parseInt(timeWindowDays)} days'
        AND ps.difficulty_perception IS NOT NULL
      GROUP BY ps.difficulty_perception
    `;

    const difficultyResult = await problemSolvingService.pool.query(difficultyQuery, [templateId]);

    res.json({
      templateId,
      timeWindow: timeWindowDays,
      analytics: {
        totalUses: parseInt(analytics.total_uses) || 0,
        uniqueStudents: parseInt(analytics.unique_students) || 0,
        completedSessions: parseInt(analytics.completed_sessions) || 0,
        completionRate: calculatePercentage(parseInt(analytics.completed_sessions), parseInt(analytics.total_uses)),
        averageAccuracy: roundToPrecision(parseFloat(analytics.avg_accuracy) || 0, 3),
        averageCompletionTime: roundToPrecision(parseFloat(analytics.avg_completion_time) || 0, 1),
        averageProgress: roundToPrecision(parseFloat(analytics.avg_progress) || 0, 3),
        totalHintsRequested: parseInt(analytics.total_hints_requested) || 0,
        totalMistakes: parseInt(analytics.total_mistakes) || 0
      },
      difficultyPerceptions: difficultyResult.rows,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting template analytics:', error);
    res.status(500).json({ error: 'Failed to get template analytics' });
  }
});

// Bulk create templates from predefined sets
router.post('/templates/bulk-create', authenticateJWT, roleCheck(['admin']), async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { templateSet, overwrite = false } = req.body;

    if (!templateSet || !['math', 'science', 'writing', 'all'].includes(templateSet)) {
      return res.status(400).json({ 
        error: 'Invalid template set',
        validSets: ['math', 'science', 'writing', 'all']
      });
    }

    // This would create predefined templates
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Bulk template creation functionality coming soon',
      templateSet,
      createdBy: user.id,
      createdAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error bulk creating templates:', error);
    res.status(500).json({ error: 'Failed to bulk create templates' });
  }
});

// Health check for problem template service
router.get('/templates/health', authenticateJWT, roleCheck(['teacher', 'admin']), async (req, res) => {
  try {
    const { getProblemTemplateService } = require('../services/problem-template-service');
    const problemTemplateService = getProblemTemplateService();
    
    const health = await problemTemplateService.healthCheck();
    
    res.json(health);
  } catch (error) {
    console.error('Error checking problem template service health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 