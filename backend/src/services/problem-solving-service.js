const { Pool } = require('pg');
const { scaffoldingEngine } = require('./scaffolding-engine');
const { safetyFilter } = require('./safety-filter');
const { responseValidator } = require('./response-validator');
const { getMistakeAnalysisService, MISTAKE_TYPES, MISTAKE_SEVERITY } = require('./mistake-analysis-service');
const { activityMonitor } = require('./activity-monitor');

// Problem-solving error class
class ProblemSolvingError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = 'ProblemSolvingError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Step types for problem-solving scaffolding
const STEP_TYPES = {
  ANALYZE: 'analyze',      // Understanding the problem
  PLAN: 'plan',           // Developing a strategy
  EXECUTE: 'execute',     // Implementing the solution
  VERIFY: 'verify',       // Checking the work
  REFLECT: 'reflect'      // Learning from the process
};

// Intervention triggers
const INTERVENTION_TRIGGERS = {
  STUDENT_REQUESTED: 'student_requested',
  MISTAKE_DETECTED: 'mistake_detected',
  CONFUSION_DETECTED: 'confusion_detected',
  TIMEOUT: 'timeout',
  STRUGGLING: 'struggling',
  OFF_TRACK: 'off_track'
};

class ProblemSolvingService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.scaffoldingEngine = scaffoldingEngine;
    this.safetyFilter = safetyFilter;
    this.responseValidator = responseValidator;
    this.mistakeAnalysisService = getMistakeAnalysisService();
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  // Start a new problem-solving session
  async startProblemSession(sessionData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        studentId,
        templateId,
        requestInfo = {}
      } = sessionData;

      // Get the problem template
      const template = await this.getProblemTemplate(client, templateId);
      if (!template) {
        throw new ProblemSolvingError('Problem template not found', 'NOT_FOUND');
      }

      // Generate personalized problem instance
      const problemInstance = await this.generateProblemInstance(template, studentId);

      // Create the session
      const sessionResult = await client.query(`
        INSERT INTO problem_sessions (
          student_id, template_id, problem_instance, total_steps,
          emotional_state, session_notes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, started_at
      `, [
        studentId,
        templateId,
        JSON.stringify(problemInstance),
        problemInstance.steps.length,
        requestInfo.emotionalState || null,
        requestInfo.sessionNotes || null
      ]);

      const sessionId = sessionResult.rows[0].id;

      // Create individual step records
      await this.createSessionSteps(client, sessionId, problemInstance.steps);

      // Generate initial scaffolding for first step
      const firstStepGuidance = await this.generateStepGuidance(
        sessionId, 
        1, 
        problemInstance.steps[0], 
        studentId, 
        requestInfo
      );

      await client.query('COMMIT');

      // Log activity
      await activityMonitor.logActivity({
        studentId,
        sessionId: requestInfo.sessionId || `problem_session_${Date.now()}`,
        activityType: 'problem_session_started',
        details: {
          sessionId,
          templateId,
          problemType: template.problem_type,
          subject: template.subject,
          difficulty: template.difficulty_level,
          totalSteps: problemInstance.steps.length
        },
        severity: 'low'
      });

      return {
        sessionId,
        problemInstance,
        currentStep: 1,
        totalSteps: problemInstance.steps.length,
        firstStepGuidance,
        startedAt: sessionResult.rows[0].started_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error starting problem session:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get current session state
  async getSessionState(sessionId, studentId) {
    const client = await this.pool.connect();
    
    try {
      // Get session information
      const sessionResult = await client.query(`
        SELECT ps.*, pt.title, pt.problem_type, pt.subject, pt.difficulty_level
        FROM problem_sessions ps
        JOIN problem_templates pt ON ps.template_id = pt.id
        WHERE ps.id = $1 AND ps.student_id = $2
      `, [sessionId, studentId]);

      if (sessionResult.rows.length === 0) {
        throw new ProblemSolvingError('Session not found or access denied', 'NOT_FOUND');
      }

      const session = sessionResult.rows[0];

      // Get current and completed steps
      const stepsResult = await client.query(`
        SELECT step_number, step_title, step_type, prompt, student_response,
               is_completed, completed_at, response_quality, understanding_level,
               ai_feedback, needs_help
        FROM problem_session_steps
        WHERE session_id = $1
        ORDER BY step_number
      `, [sessionId]);

      const steps = stepsResult.rows;
      const currentStepNumber = session.current_step;
      const currentStep = steps.find(s => s.step_number === currentStepNumber);

      // Get recent interventions
      const interventionsResult = await client.query(`
        SELECT intervention_type, intervention_content, provided_at, was_helpful
        FROM scaffolding_interventions
        WHERE session_id = $1
        ORDER BY provided_at DESC
        LIMIT 5
      `, [sessionId]);

      return {
        session: {
          id: session.id,
          status: session.session_status,
          currentStep: currentStepNumber,
          totalSteps: session.total_steps,
          stepsCompleted: session.steps_completed,
          hintsRequested: session.hints_requested,
          mistakesMade: session.mistakes_made,
          accuracyScore: session.accuracy_score,
          emotionalState: session.emotional_state,
          startedAt: session.started_at,
          lastActivityAt: session.last_activity_at
        },
        problemInfo: {
          title: session.title,
          type: session.problem_type,
          subject: session.subject,
          difficulty: session.difficulty_level,
          instance: JSON.parse(session.problem_instance)
        },
        currentStep,
        allSteps: steps,
        recentInterventions: interventionsResult.rows,
        progressPercentage: (session.steps_completed / session.total_steps) * 100
      };

    } catch (error) {
      console.error('Error getting session state:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================
  // STEP-BY-STEP PROCESSING
  // ============================================

  // Submit response to current step
  async submitStepResponse(sessionId, studentId, responseData, requestInfo = {}) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        stepNumber,
        response,
        timeSpent = null,
        requestHelp = false
      } = responseData;

      // Get session and step information
      const sessionState = await this.getSessionState(sessionId, studentId);
      
      if (sessionState.session.status !== 'active') {
        throw new ProblemSolvingError('Session is not active', 'INVALID_STATE');
      }

      if (stepNumber !== sessionState.session.currentStep) {
        throw new ProblemSolvingError('Invalid step number', 'INVALID_STEP');
      }

      // Validate and analyze the response
      const analysisResult = await this.analyzeStepResponse(
        response, 
        sessionState.currentStep, 
        sessionState.problemInfo.instance,
        studentId
      );

      // Update step record
      await client.query(`
        UPDATE problem_session_steps 
        SET student_response = $1, response_timestamp = NOW(), 
            attempts_count = attempts_count + 1, needs_help = $2,
            response_quality = $3, accuracy_score = $4, understanding_level = $5,
            ai_feedback = $6, misconceptions_identified = $7
        WHERE session_id = $8 AND step_number = $9
      `, [
        response,
        requestHelp,
        analysisResult.quality,
        analysisResult.accuracy,
        analysisResult.understanding,
        analysisResult.feedback,
        JSON.stringify(analysisResult.misconceptions),
        sessionId,
        stepNumber
      ]);

      let nextAction = 'continue';
      let interventionNeeded = false;
      let scaffoldingResponse = null;

      // Determine if intervention is needed
      if (requestHelp || analysisResult.quality === 'incorrect' || analysisResult.understanding === 'confused') {
        interventionNeeded = true;
        const triggerReason = requestHelp ? INTERVENTION_TRIGGERS.STUDENT_REQUESTED : 
                             analysisResult.quality === 'incorrect' ? INTERVENTION_TRIGGERS.MISTAKE_DETECTED :
                             INTERVENTION_TRIGGERS.CONFUSION_DETECTED;

        // Generate scaffolding intervention
        scaffoldingResponse = await this.generateScaffoldingIntervention(
          sessionId,
          stepNumber,
          triggerReason,
          analysisResult,
          sessionState,
          studentId,
          requestInfo
        );

        // Log the intervention
        await client.query(`
          INSERT INTO scaffolding_interventions (
            session_id, step_id, intervention_type, intervention_content,
            trigger_reason, scaffolding_style, confidence_level
          ) VALUES (
            $1, 
            (SELECT id FROM problem_session_steps WHERE session_id = $1 AND step_number = $2),
            $3, $4, $5, $6, $7
          )
        `, [
          sessionId,
          stepNumber,
          scaffoldingResponse.type,
          scaffoldingResponse.content,
          triggerReason,
          scaffoldingResponse.style,
          scaffoldingResponse.confidence
        ]);

        // Update session hint counter if this was a hint
        if (scaffoldingResponse.type === 'hint') {
          await client.query(`
            UPDATE problem_sessions 
            SET hints_requested = hints_requested + 1, last_activity_at = NOW()
            WHERE id = $1
          `, [sessionId]);
        }

      } else if (analysisResult.quality === 'excellent' || analysisResult.quality === 'good') {
        // Mark step as completed and advance
        await client.query(`
          UPDATE problem_session_steps 
          SET is_completed = TRUE, completed_at = NOW()
          WHERE session_id = $1 AND step_number = $2
        `, [sessionId, stepNumber]);

        // Update session progress
        const nextStepNumber = stepNumber + 1;
        const isLastStep = nextStepNumber > sessionState.session.totalSteps;

        if (isLastStep) {
          // Complete the session
          await this.completeSession(client, sessionId, sessionState);
          nextAction = 'completed';
        } else {
          // Advance to next step
          await client.query(`
            UPDATE problem_sessions 
            SET current_step = $1, steps_completed = steps_completed + 1, last_activity_at = NOW()
            WHERE id = $2
          `, [nextStepNumber, sessionId]);

          // Generate guidance for next step
          const nextStepState = sessionState.allSteps.find(s => s.step_number === nextStepNumber);
          scaffoldingResponse = await this.generateStepGuidance(
            sessionId,
            nextStepNumber,
            nextStepState,
            studentId,
            requestInfo
          );
          nextAction = 'next_step';
        }
      }

      // Log mistakes if any were detected
      if (analysisResult.mistakes && analysisResult.mistakes.length > 0) {
        await this.logMistakes(client, sessionId, stepNumber, analysisResult.mistakes);
        
        await client.query(`
          UPDATE problem_sessions 
          SET mistakes_made = mistakes_made + $1, last_activity_at = NOW()
          WHERE id = $2
        `, [analysisResult.mistakes.length, sessionId]);
      }

      await client.query('COMMIT');

      // Log activity
      await activityMonitor.logActivity({
        studentId,
        sessionId: requestInfo.sessionId || `step_response_${Date.now()}`,
        activityType: 'problem_step_submitted',
        details: {
          sessionId,
          stepNumber,
          responseQuality: analysisResult.quality,
          understanding: analysisResult.understanding,
          interventionNeeded,
          mistakesCount: analysisResult.mistakes?.length || 0
        },
        severity: interventionNeeded ? 'medium' : 'low'
      });

      return {
        stepNumber,
        analysisResult,
        nextAction,
        scaffoldingResponse,
        sessionProgress: {
          currentStep: nextAction === 'next_step' ? stepNumber + 1 : stepNumber,
          totalSteps: sessionState.session.totalSteps,
          completed: nextAction === 'completed'
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error submitting step response:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Enhanced submission method with guided questioning
  async submitStepResponseWithGuidedQuestions(sessionId, studentId, responseData, requestInfo = {}) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        stepNumber,
        response,
        timeSpent = null,
        requestHelp = false,
        questioningSessionId = null // For continued questioning sessions
      } = responseData;

      // Get session and step information
      const sessionState = await this.getSessionState(sessionId, studentId);
      
      if (sessionState.session.status !== 'active') {
        throw new ProblemSolvingError('Session is not active', 'INVALID_STATE');
      }

      if (stepNumber !== sessionState.session.currentStep) {
        throw new ProblemSolvingError('Invalid step number', 'INVALID_STEP');
      }

      // Enhanced analysis with mistake detection
      const analysisResult = await this.analyzeStepResponse(
        response, 
        sessionState.currentStep, 
        sessionState.problemInfo.instance,
        studentId
      );

      // Update step record with enhanced data
      await client.query(`
        UPDATE problem_session_steps 
        SET student_response = $1, response_timestamp = NOW(), 
            attempts_count = attempts_count + 1, needs_help = $2,
            response_quality = $3, accuracy_score = $4, understanding_level = $5,
            ai_feedback = $6, misconceptions_identified = $7
        WHERE session_id = $8 AND step_number = $9
      `, [
        response,
        requestHelp,
        analysisResult.quality,
        analysisResult.accuracy,
        analysisResult.understanding,
        analysisResult.feedback,
        JSON.stringify(analysisResult.misconceptions),
        sessionId,
        stepNumber
      ]);

      let nextAction = 'continue';
      let interventionNeeded = false;
      let scaffoldingResponse = null;
      let guidedQuestioningSession = null;

      // Enhanced intervention logic with guided questioning
      if (requestHelp || analysisResult.quality === 'incorrect' || analysisResult.understanding === 'confused') {
        interventionNeeded = true;
        const triggerReason = requestHelp ? INTERVENTION_TRIGGERS.STUDENT_REQUESTED : 
                             analysisResult.quality === 'incorrect' ? INTERVENTION_TRIGGERS.MISTAKE_DETECTED :
                             INTERVENTION_TRIGGERS.CONFUSION_DETECTED;

        // If we have guided questions from mistake analysis, use them
        if (analysisResult.guidedQuestions && analysisResult.guidedQuestions.immediate.length > 0) {
          guidedQuestioningSession = await this.createGuidedQuestioningSession(
            sessionId,
            stepNumber,
            analysisResult.guidedQuestions,
            analysisResult.remediationStrategy,
            triggerReason
          );
          
          scaffoldingResponse = {
            type: 'guided_questioning',
            content: analysisResult.guidedQuestions.immediate[0].question,
            questioningSession: guidedQuestioningSession,
            strategy: analysisResult.guidedQuestions.questioningStrategy,
            purpose: analysisResult.guidedQuestions.immediate[0].purpose
          };
        } else {
          // Fall back to regular scaffolding
          scaffoldingResponse = await this.generateScaffoldingIntervention(
            sessionId,
            stepNumber,
            triggerReason,
            analysisResult,
            sessionState,
            studentId,
            requestInfo
          );
        }

        // Log the intervention
        await client.query(`
          INSERT INTO scaffolding_interventions (
            session_id, step_id, intervention_type, intervention_content,
            trigger_reason, scaffolding_style, confidence_level,
            personalization_factors
          ) VALUES (
            $1, 
            (SELECT id FROM problem_session_steps WHERE session_id = $1 AND step_number = $2),
            $3, $4, $5, $6, $7, $8
          )
        `, [
          sessionId,
          stepNumber,
          scaffoldingResponse.type,
          scaffoldingResponse.content,
          triggerReason,
          scaffoldingResponse.style || 'adaptive',
          scaffoldingResponse.confidence || 0.8,
          JSON.stringify({
            mistakeType: analysisResult.mistakes?.[0]?.type,
            severity: analysisResult.mistakes?.[0]?.severity,
            hasGuidedQuestions: !!guidedQuestioningSession
          })
        ]);

        // Update session hint counter if this was a hint
        if (scaffoldingResponse.type === 'hint' || scaffoldingResponse.type === 'guided_questioning') {
          await client.query(`
            UPDATE problem_sessions 
            SET hints_requested = hints_requested + 1, last_activity_at = NOW()
            WHERE id = $1
          `, [sessionId]);
        }

      } else if (analysisResult.quality === 'excellent' || analysisResult.quality === 'good') {
        // Mark step as completed and advance
        await client.query(`
          UPDATE problem_session_steps 
          SET is_completed = TRUE, completed_at = NOW()
          WHERE session_id = $1 AND step_number = $2
        `, [sessionId, stepNumber]);

        // Update session progress
        const nextStepNumber = stepNumber + 1;
        const isLastStep = nextStepNumber > sessionState.session.totalSteps;

        if (isLastStep) {
          // Complete the session
          await this.completeSession(client, sessionId, sessionState);
          nextAction = 'completed';
        } else {
          // Advance to next step
          await client.query(`
            UPDATE problem_sessions 
            SET current_step = $1, steps_completed = steps_completed + 1, last_activity_at = NOW()
            WHERE id = $2
          `, [nextStepNumber, sessionId]);

          // Generate guidance for next step
          const nextStepState = sessionState.allSteps.find(s => s.step_number === nextStepNumber);
          scaffoldingResponse = await this.generateStepGuidance(
            sessionId,
            nextStepNumber,
            nextStepState,
            studentId,
            requestInfo
          );
          nextAction = 'next_step';
        }
      }

      // Enhanced mistake logging with detailed analysis
      if (analysisResult.mistakes && analysisResult.mistakes.length > 0) {
        await this.logEnhancedMistakes(
          client, 
          sessionId, 
          stepNumber, 
          analysisResult.mistakes,
          analysisResult.guidedQuestions,
          analysisResult.remediationStrategy
        );
        
        await client.query(`
          UPDATE problem_sessions 
          SET mistakes_made = mistakes_made + $1, last_activity_at = NOW()
          WHERE id = $2
        `, [analysisResult.mistakes.length, sessionId]);
      }

      await client.query('COMMIT');

      // Log enhanced activity
      await activityMonitor.logActivity({
        studentId,
        sessionId: requestInfo.sessionId || `step_response_${Date.now()}`,
        activityType: 'problem_step_submitted_enhanced',
        details: {
          sessionId,
          stepNumber,
          responseQuality: analysisResult.quality,
          understanding: analysisResult.understanding,
          interventionNeeded,
          mistakesCount: analysisResult.mistakes?.length || 0,
          hasGuidedQuestions: !!guidedQuestioningSession,
          questioningStrategy: analysisResult.guidedQuestions?.questioningStrategy
        },
        severity: interventionNeeded ? 'medium' : 'low'
      });

      return {
        stepNumber,
        analysisResult,
        nextAction,
        scaffoldingResponse,
        guidedQuestioningSession,
        sessionProgress: {
          currentStep: nextAction === 'next_step' ? stepNumber + 1 : stepNumber,
          totalSteps: sessionState.session.totalSteps,
          completed: nextAction === 'completed'
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error submitting enhanced step response:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Request hint for current step
  async requestHint(sessionId, studentId, hintLevel = 'gentle', requestInfo = {}) {
    const client = await this.pool.connect();
    
    try {
      const sessionState = await this.getSessionState(sessionId, studentId);
      
      if (sessionState.session.status !== 'active') {
        throw new ProblemSolvingError('Session is not active', 'INVALID_STATE');
      }

      // Generate contextualized hint
      const hintResponse = await this.generateScaffoldingIntervention(
        sessionId,
        sessionState.session.currentStep,
        INTERVENTION_TRIGGERS.STUDENT_REQUESTED,
        { requestedHintLevel: hintLevel },
        sessionState,
        studentId,
        requestInfo
      );

      // Log the hint intervention
      await client.query(`
        INSERT INTO scaffolding_interventions (
          session_id, step_id, intervention_type, intervention_content,
          trigger_reason, scaffolding_style, confidence_level
        ) VALUES (
          $1, 
          (SELECT id FROM problem_session_steps WHERE session_id = $1 AND step_number = $2),
          $3, $4, $5, $6, $7
        )
      `, [
        sessionId,
        sessionState.session.currentStep,
        'hint',
        hintResponse.content,
        INTERVENTION_TRIGGERS.STUDENT_REQUESTED,
        hintResponse.style,
        hintResponse.confidence
      ]);

      // Update session hint counter
      await client.query(`
        UPDATE problem_sessions 
        SET hints_requested = hints_requested + 1, last_activity_at = NOW()
        WHERE id = $1
      `, [sessionId]);

      return {
        hint: hintResponse.content,
        hintLevel: hintLevel,
        style: hintResponse.style,
        totalHintsUsed: sessionState.session.hintsRequested + 1
      };

    } catch (error) {
      console.error('Error requesting hint:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================
  // AI ANALYSIS AND SCAFFOLDING
  // ============================================

  // Analyze student response to a step
  async analyzeStepResponse(response, stepInfo, problemInstance, studentId) {
    try {
      // Basic quality assessment
      let quality = 'needs_improvement';
      let accuracy = 0.5;
      let understanding = 'partial';
      let misconceptions = [];
      let mistakes = [];
      let feedback = '';
      let guidedQuestions = null;
      let remediationStrategy = null;

      // Safety check first
      const safetyResult = await this.safetyFilter.checkContent(response);
      if (!safetyResult.isSafe) {
        return {
          quality: 'inappropriate',
          accuracy: 0.0,
          understanding: 'confused',
          feedback: 'Please provide an appropriate response to the problem.',
          misconceptions: [],
          mistakes: [{ type: 'inappropriate_content', description: 'Response contains inappropriate content' }],
          guidedQuestions: null,
          remediationStrategy: null
        };
      }

      // Content validation
      const validationResult = await this.responseValidator.validateResponse(response, {
        context: 'problem_solving',
        studentAge: 13, // Default, should be passed from user data
        originalInput: stepInfo.prompt
      });

      if (validationResult.hasViolations) {
        feedback = validationResult.improvedResponse || 'Please try to provide a more detailed response.';
      }

      // Check if we have an expected response to compare against
      if (stepInfo.expected_response) {
        const similarity = this.calculateResponseSimilarity(response, stepInfo.expected_response);
        
        if (similarity > 0.8) {
          quality = 'excellent';
          accuracy = 0.9 + (similarity - 0.8) * 0.5;
          understanding = 'confident';
          feedback = 'Excellent work! Your reasoning is clear and accurate.';
        } else if (similarity > 0.6) {
          quality = 'good';
          accuracy = 0.7 + (similarity - 0.6) * 1.0;
          understanding = 'partial';
          feedback = 'Good thinking! Your approach is on the right track.';
        } else {
          // Potential mistake detected - use advanced analysis
          const mistakeAnalysisResult = await this.analyzeMistakeWithGuidedQuestions(
            response,
            stepInfo,
            problemInstance,
            studentId
          );

          if (mistakeAnalysisResult) {
            quality = this.mapMistakeTypeToQuality(mistakeAnalysisResult.mistakeClassification.primaryType);
            accuracy = this.mapSeverityToAccuracy(mistakeAnalysisResult.mistakeClassification.severity);
            understanding = this.mapSeverityToUnderstanding(mistakeAnalysisResult.mistakeClassification.severity);
            misconceptions = mistakeAnalysisResult.mistakeClassification.misconceptions;
            mistakes = [{
              type: mistakeAnalysisResult.mistakeClassification.primaryType,
              description: mistakeAnalysisResult.mistakeClassification.rootCauses.join('; '),
              severity: mistakeAnalysisResult.mistakeClassification.severity,
              indicators: mistakeAnalysisResult.mistakeClassification.indicators
            }];
            guidedQuestions = mistakeAnalysisResult.guidedQuestions;
            remediationStrategy = mistakeAnalysisResult.remediationStrategy;
            feedback = this.generateMistakeBasedFeedback(mistakeAnalysisResult);
          } else {
            // Fallback analysis
            if (similarity > 0.3) {
              quality = 'needs_improvement';
              accuracy = 0.4 + (similarity - 0.3) * 1.0;
              understanding = 'partial';
              feedback = 'You have some good ideas, but let\'s work on developing them further.';
            } else {
              quality = 'incorrect';
              accuracy = Math.max(0.1, similarity);
              understanding = 'confused';
              feedback = 'Let\'s take a step back and think about this differently.';
              
              mistakes.push({
                type: 'conceptual',
                description: 'Student response does not match expected approach',
                severity: 'medium'
              });
            }
          }
        }
      } else {
        // General assessment when no specific expected response
        const responseLength = response.trim().length;
        const hasStructure = /\b(first|second|then|next|because|therefore)\b/i.test(response);
        const hasReasoning = /\b(because|since|so|therefore|thus)\b/i.test(response);

        if (responseLength > 50 && hasStructure && hasReasoning) {
          quality = 'good';
          accuracy = 0.75;
          understanding = 'confident';
          feedback = 'I can see you\'re thinking through this systematically. Good work!';
        } else if (responseLength > 20) {
          quality = 'needs_improvement';
          accuracy = 0.6;
          understanding = 'partial';
          feedback = 'You\'re on the right track. Can you explain your reasoning a bit more?';
        } else {
          quality = 'incorrect';
          accuracy = 0.3;
          understanding = 'confused';
          feedback = 'Please try to provide a more complete response. What are you thinking?';
          
          // Generate guided questions for incomplete responses
          try {
            const mistakeAnalysisResult = await this.mistakeAnalysisService.analyzeMistake({
              sessionId: 'temp',
              stepNumber: 1,
              studentResponse: response,
              expectedResponse: stepInfo.expected_response || 'Complete response expected',
              stepContext: stepInfo,
              studentId,
              problemContext: {
                subject: problemInstance.subject || 'general',
                difficulty: problemInstance.difficulty || 'medium'
              }
            });
            
            guidedQuestions = mistakeAnalysisResult.guidedQuestions;
            remediationStrategy = mistakeAnalysisResult.remediationStrategy;
          } catch (error) {
            console.warn('Could not generate guided questions:', error.message);
          }
        }
      }

      return {
        quality,
        accuracy: Math.round(accuracy * 100) / 100,
        understanding,
        feedback,
        misconceptions,
        mistakes,
        guidedQuestions,
        remediationStrategy
      };

    } catch (error) {
      console.error('Error analyzing step response:', error);
      return {
        quality: 'unknown',
        accuracy: 0.5,
        understanding: 'partial',
        feedback: 'I\'m having trouble analyzing your response right now. Please continue.',
        misconceptions: [],
        mistakes: [],
        guidedQuestions: null,
        remediationStrategy: null
      };
    }
  }

  // New method to perform detailed mistake analysis with guided questioning
  async analyzeMistakeWithGuidedQuestions(response, stepInfo, problemInstance, studentId) {
    try {
      const mistakeData = {
        sessionId: 'analysis_session',
        stepNumber: 1,
        studentResponse: response,
        expectedResponse: stepInfo.expected_response,
        stepContext: {
          prompt: stepInfo.prompt,
          title: stepInfo.title,
          type: stepInfo.type,
          subject: problemInstance.subject || 'general',
          difficulty: problemInstance.difficulty || 'medium',
          keywords: this.extractKeywordsFromStep(stepInfo)
        },
        studentId,
        problemContext: {
          title: problemInstance.title,
          subject: problemInstance.subject || 'general',
          difficulty: problemInstance.difficulty || 'medium',
          type: problemInstance.type || 'general'
        }
      };

      return await this.mistakeAnalysisService.analyzeMistake(mistakeData);

    } catch (error) {
      console.error('Error in detailed mistake analysis:', error);
      return null;
    }
  }

  // Generate scaffolding intervention
  async generateScaffoldingIntervention(sessionId, stepNumber, triggerReason, analysisResult, sessionState, studentId, requestInfo) {
    try {
      // Determine scaffolding type based on trigger
      let scaffoldingType = 'PROBLEM_SOLVING';
      if (triggerReason === INTERVENTION_TRIGGERS.MISTAKE_DETECTED) {
        scaffoldingType = 'MISTAKE_ANALYSIS';
      }

      // Build context for scaffolding
      const scaffoldingContext = {
        studentId,
        currentContent: sessionState.currentStep?.prompt || '',
        scaffoldingType,
        subject: sessionState.problemInfo.subject,
        difficulty: sessionState.problemInfo.difficulty,
        emotionalState: sessionState.session.emotionalState || requestInfo.emotionalState,
        sessionContext: {
          stepNumber,
          totalSteps: sessionState.session.totalSteps,
          hintsRequested: sessionState.session.hintsRequested,
          mistakesMade: sessionState.session.mistakesMade,
          progressPercentage: sessionState.progressPercentage
        }
      };

      // Generate scaffolding response
      const scaffoldingResult = await this.scaffoldingEngine.generateScaffoldingPrompt(scaffoldingContext);

      // Customize based on trigger reason
      let interventionContent = scaffoldingResult.prompt;
      let interventionType = 'guidance';

      if (triggerReason === INTERVENTION_TRIGGERS.STUDENT_REQUESTED) {
        interventionType = 'hint';
        if (analysisResult.requestedHintLevel === 'direct') {
          interventionContent = this.generateDirectHint(sessionState.currentStep, sessionState.problemInfo.instance);
        }
      } else if (triggerReason === INTERVENTION_TRIGGERS.MISTAKE_DETECTED) {
        interventionType = 'correction';
        interventionContent = this.enhanceForMistakeCorrection(interventionContent, analysisResult.mistakes);
      } else if (triggerReason === INTERVENTION_TRIGGERS.CONFUSION_DETECTED) {
        interventionType = 'clarification';
        interventionContent = this.enhanceForConfusion(interventionContent, sessionState.currentStep);
      }

      return {
        type: interventionType,
        content: interventionContent,
        style: scaffoldingResult.scaffolding_style,
        confidence: scaffoldingResult.context_used ? 0.8 : 0.6,
        triggerReason
      };

    } catch (error) {
      console.error('Error generating scaffolding intervention:', error);
      
      // Fallback to generic helpful response
      return {
        type: 'guidance',
        content: 'Let\'s work through this step by step. Take your time and think about what the question is asking.',
        style: 'SUPPORTIVE',
        confidence: 0.5,
        triggerReason
      };
    }
  }

  // Generate initial guidance for a step
  async generateStepGuidance(sessionId, stepNumber, stepInfo, studentId, requestInfo = {}) {
    try {
      const scaffoldingContext = {
        studentId,
        currentContent: stepInfo?.prompt || '',
        scaffoldingType: 'PROBLEM_SOLVING',
        subject: 'general', // Will be enhanced with actual subject
        difficulty: 'medium', // Will be enhanced with actual difficulty
        emotionalState: requestInfo.emotionalState,
        sessionContext: {
          stepNumber,
          isFirstStep: stepNumber === 1
        }
      };

      const scaffoldingResult = await this.scaffoldingEngine.generateScaffoldingPrompt(scaffoldingContext);

      return {
        content: scaffoldingResult.prompt,
        style: scaffoldingResult.scaffolding_style,
        confidence: scaffoldingResult.context_used ? 0.8 : 0.6
      };

    } catch (error) {
      console.error('Error generating step guidance:', error);
      return {
        content: 'Let\'s begin this step. Read the prompt carefully and think about your approach.',
        style: 'BALANCED',
        confidence: 0.5
      };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  // Get problem template by ID
  async getProblemTemplate(client, templateId) {
    const result = await client.query(`
      SELECT * FROM problem_templates 
      WHERE id = $1 AND is_active = true
    `, [templateId]);
    
    return result.rows[0] || null;
  }

  // Generate personalized problem instance
  async generateProblemInstance(template, studentId) {
    // Start with the template's scaffolding steps
    const baseSteps = template.scaffolding_steps || [];
    
    // For now, return a basic structure
    // In a full implementation, this would adapt based on student profile
    return {
      title: template.title,
      statement: template.problem_statement,
      data: template.problem_data || {},
      steps: baseSteps.map((step, index) => ({
        number: index + 1,
        title: step.title || `Step ${index + 1}`,
        type: step.type || STEP_TYPES.EXECUTE,
        prompt: step.prompt,
        expected_response: step.expected_response,
        scaffolding_guidance: step.scaffolding_guidance
      })),
      adaptations: []
    };
  }

  // Create session step records
  async createSessionSteps(client, sessionId, steps) {
    for (const step of steps) {
      await client.query(`
        INSERT INTO problem_session_steps (
          session_id, step_number, step_title, step_type, prompt, expected_response, scaffolding_guidance
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        sessionId,
        step.number,
        step.title,
        step.type,
        step.prompt,
        step.expected_response,
        step.scaffolding_guidance
      ]);
    }
  }

  // Complete a problem session
  async completeSession(client, sessionId, sessionState) {
    // Calculate final metrics
    const accuracy = sessionState.allSteps.reduce((sum, step) => {
      return sum + (step.accuracy_score || 0);
    }, 0) / sessionState.allSteps.length;

    const completionTime = Math.round((Date.now() - new Date(sessionState.session.startedAt)) / (1000 * 60));

    await client.query(`
      UPDATE problem_sessions 
      SET session_status = 'completed', completed_at = NOW(), 
          accuracy_score = $1, completion_time_minutes = $2,
          steps_completed = total_steps
      WHERE id = $3
    `, [accuracy, completionTime, sessionId]);
  }

  // Log mistakes for analysis
  async logMistakes(client, sessionId, stepNumber, mistakes) {
    for (const mistake of mistakes) {
      await client.query(`
        INSERT INTO problem_mistakes (
          session_id, step_id, mistake_type, mistake_description, severity
        ) VALUES (
          $1,
          (SELECT id FROM problem_session_steps WHERE session_id = $1 AND step_number = $2),
          $3, $4, $5
        )
      `, [sessionId, stepNumber, mistake.type, mistake.description, mistake.severity || 'medium']);
    }
  }

  // Calculate response similarity (simplified)
  calculateResponseSimilarity(response1, response2) {
    if (!response1 || !response2) return 0;
    
    const clean1 = response1.toLowerCase().replace(/[^\w\s]/g, '');
    const clean2 = response2.toLowerCase().replace(/[^\w\s]/g, '');
    
    const words1 = clean1.split(/\s+/);
    const words2 = clean2.split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  // Generate direct hint for a step
  generateDirectHint(stepInfo, problemInstance) {
    if (stepInfo?.scaffolding_guidance) {
      return stepInfo.scaffolding_guidance;
    }
    
    return 'Think about breaking this down into smaller parts. What do you know for certain?';
  }

  // Enhance response for mistake correction
  enhanceForMistakeCorrection(baseResponse, mistakes) {
    if (mistakes && mistakes.length > 0) {
      const mistakeTypes = mistakes.map(m => m.type).join(', ');
      return `${baseResponse}\n\nI notice there might be some confusion with ${mistakeTypes}. Let's work through this together.`;
    }
    return baseResponse;
  }

  // Enhance response for confusion
  enhanceForConfusion(baseResponse, stepInfo) {
    return `${baseResponse}\n\nLet's take this one piece at a time. What part of the question makes the most sense to you right now?`;
  }

  // Health check
  async healthCheck() {
    try {
      const dbResult = await this.pool.query('SELECT 1 as test');
      const scaffoldingHealth = await this.scaffoldingEngine.healthCheck();
      
      return {
        status: 'healthy',
        service: 'problem-solving-service',
        features: {
          database: dbResult.rows.length > 0 ? 'connected' : 'disconnected',
          scaffoldingEngine: scaffoldingHealth.status,
          safetyFilter: 'enabled',
          responseValidator: 'enabled'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'problem-solving-service',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // New helper methods for mistake analysis integration

  // Map mistake type to quality rating
  mapMistakeTypeToQuality(mistakeType) {
    switch (mistakeType) {
      case MISTAKE_TYPES.CARELESS:
        return 'needs_improvement';
      case MISTAKE_TYPES.COMPUTATIONAL:
        return 'needs_improvement';
      case MISTAKE_TYPES.PROCEDURAL:
        return 'incorrect';
      case MISTAKE_TYPES.CONCEPTUAL:
        return 'incorrect';
      case MISTAKE_TYPES.STRATEGIC:
        return 'incorrect';
      default:
        return 'needs_improvement';
    }
  }

  // Map severity to accuracy score
  mapSeverityToAccuracy(severity) {
    switch (severity) {
      case MISTAKE_SEVERITY.LOW:
        return 0.6;
      case MISTAKE_SEVERITY.MEDIUM:
        return 0.4;
      case MISTAKE_SEVERITY.HIGH:
        return 0.2;
      case MISTAKE_SEVERITY.CRITICAL:
        return 0.1;
      default:
        return 0.3;
    }
  }

  // Map severity to understanding level
  mapSeverityToUnderstanding(severity) {
    switch (severity) {
      case MISTAKE_SEVERITY.LOW:
        return 'partial';
      case MISTAKE_SEVERITY.MEDIUM:
        return 'confused';
      case MISTAKE_SEVERITY.HIGH:
        return 'confused';
      case MISTAKE_SEVERITY.CRITICAL:
        return 'confused';
      default:
        return 'partial';
    }
  }

  // Generate feedback based on mistake analysis
  generateMistakeBasedFeedback(mistakeAnalysisResult) {
    const { mistakeClassification, guidedQuestions } = mistakeAnalysisResult;
    
    let feedback = 'I notice there might be some confusion here. ';
    
    // Add specific feedback based on mistake type
    switch (mistakeClassification.primaryType) {
      case MISTAKE_TYPES.CONCEPTUAL:
        feedback += 'Let\'s make sure we understand the core concept clearly.';
        break;
      case MISTAKE_TYPES.PROCEDURAL:
        feedback += 'Let\'s review the steps for this type of problem.';
        break;
      case MISTAKE_TYPES.COMPUTATIONAL:
        feedback += 'Let\'s double-check our calculations.';
        break;
      case MISTAKE_TYPES.STRATEGIC:
        feedback += 'Let\'s think about different approaches we could use.';
        break;
      default:
        feedback += 'Let\'s work through this together.';
    }

    // Add the first guided question if available
    if (guidedQuestions && guidedQuestions.immediate.length > 0) {
      feedback += ` ${guidedQuestions.immediate[0].question}`;
    }

    return feedback;
  }

  // Create a guided questioning session for iterative learning
  async createGuidedQuestioningSession(sessionId, stepNumber, guidedQuestions, remediationStrategy, triggerReason) {
    const questioningSession = {
      id: `questioning_${sessionId}_${stepNumber}_${Date.now()}`,
      sessionId,
      stepNumber,
      triggerReason,
      questions: {
        immediate: guidedQuestions.immediate,
        followUp: guidedQuestions.followUp,
        reflection: guidedQuestions.reflection
      },
      currentQuestionIndex: 0,
      currentQuestionType: 'immediate',
      strategy: guidedQuestions.questioningStrategy,
      remediationStrategy,
      responses: [],
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    // Store questioning session (in production, this would go to a cache or database)
    // For now, we'll return the session object
    return questioningSession;
  }

  // Extract keywords from step for analysis
  extractKeywordsFromStep(stepInfo) {
    const text = `${stepInfo.title || ''} ${stepInfo.prompt || ''}`;
    const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
    
    // Filter out common words and return unique keywords
    const commonWords = ['the', 'and', 'or', 'but', 'for', 'with', 'this', 'that', 'you', 'are', 'can', 'what', 'how'];
    return [...new Set(words.filter(word => !commonWords.includes(word)))];
  }

  // Enhanced mistake logging with guided questions and remediation
  async logEnhancedMistakes(client, sessionId, stepNumber, mistakes, guidedQuestions, remediationStrategy) {
    for (const mistake of mistakes) {
      await client.query(`
        INSERT INTO problem_mistakes (
          session_id, step_id, mistake_type, mistake_category, mistake_description, severity,
          root_cause, correction_provided, explanation_given, practice_recommended,
          is_common_mistake
        ) VALUES (
          $1,
          (SELECT id FROM problem_session_steps WHERE session_id = $1 AND step_number = $2),
          $3, $4, $5, $6, $7, $8, $9, $10, $11
        )
      `, [
        sessionId, 
        stepNumber, 
        mistake.type, 
        mistake.indicators?.join(',') || '',
        mistake.description, 
        mistake.severity || 'medium',
        mistake.rootCause || 'Unknown',
        JSON.stringify(guidedQuestions),
        JSON.stringify(remediationStrategy),
        remediationStrategy?.shortTerm?.practice?.join('; ') || '',
        false // Default to not common mistake
      ]);
    }
  }
}

// Singleton instance
let problemSolvingInstance = null;

const getProblemSolvingService = () => {
  if (!problemSolvingInstance) {
    problemSolvingInstance = new ProblemSolvingService();
  }
  return problemSolvingInstance;
};

module.exports = {
  ProblemSolvingService,
  getProblemSolvingService,
  ProblemSolvingError,
  STEP_TYPES,
  INTERVENTION_TRIGGERS
}; 