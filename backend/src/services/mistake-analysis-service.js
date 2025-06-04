const { Pool } = require('pg');
const { scaffoldingEngine } = require('./scaffolding-engine');
const { safetyFilter } = require('./safety-filter');
const { activityMonitor } = require('./activity-monitor');

// Mistake analysis error class
class MistakeAnalysisError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = 'MistakeAnalysisError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Mistake classification types
const MISTAKE_TYPES = {
  CONCEPTUAL: 'conceptual',           // Misunderstanding of core concepts
  PROCEDURAL: 'procedural',           // Wrong steps or process
  COMPUTATIONAL: 'computational',     // Calculation errors
  STRATEGIC: 'strategic',            // Wrong approach or strategy
  CARELESS: 'careless',              // Simple oversight or typo
  COMMUNICATION: 'communication',     // Unclear explanation
  PREREQUISITE: 'prerequisite',       // Missing foundational knowledge
  METACOGNITIVE: 'metacognitive'      // Poor self-monitoring
};

// Mistake severity levels
const MISTAKE_SEVERITY = {
  LOW: 'low',           // Minor error, easily corrected
  MEDIUM: 'medium',     // Moderate error, needs guidance
  HIGH: 'high',         // Major error, fundamental misunderstanding
  CRITICAL: 'critical'  // Severe error, requires immediate intervention
};

// Question types for guided remediation
const QUESTION_TYPES = {
  DIAGNOSTIC: 'diagnostic',         // Understand the thinking process
  SOCRATIC: 'socratic',            // Lead to discovery through questions
  CLARIFYING: 'clarifying',        // Clear up confusion
  PROBING: 'probing',              // Dig deeper into understanding
  REDIRECTING: 'redirecting',      // Guide toward correct approach
  METACOGNITIVE: 'metacognitive'   // Encourage reflection on thinking
};

class MistakeAnalysisService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.scaffoldingEngine = scaffoldingEngine;
    this.safetyFilter = safetyFilter;
    
    // Subject-specific mistake patterns
    this.mistakePatterns = this.initializeMistakePatterns();
    
    // Guided questioning templates
    this.questioningTemplates = this.initializeQuestioningTemplates();
  }

  // ============================================
  // MAIN MISTAKE ANALYSIS METHODS
  // ============================================

  // Comprehensive mistake analysis with classification and remediation
  async analyzeMistake(mistakeData) {
    try {
      const {
        sessionId,
        stepNumber,
        studentResponse,
        expectedResponse,
        stepContext,
        studentId,
        problemContext
      } = mistakeData;

      // Perform multi-level mistake analysis
      const mistakeClassification = await this.classifyMistake({
        studentResponse,
        expectedResponse,
        stepContext,
        problemContext
      });

      // Generate guided questions based on mistake type
      const guidedQuestions = await this.generateGuidedQuestions({
        mistakeClassification,
        stepContext,
        studentId,
        problemContext
      });

      // Create remediation strategy
      const remediationStrategy = await this.createRemediationStrategy({
        mistakeClassification,
        stepContext,
        studentId,
        guidedQuestions
      });

      // Log the mistake for pattern analysis
      await this.logMistakeAnalysis({
        sessionId,
        stepNumber,
        mistakeClassification,
        guidedQuestions,
        remediationStrategy
      });

      return {
        mistakeClassification,
        guidedQuestions,
        remediationStrategy,
        analysisMetadata: {
          confidence: mistakeClassification.confidence,
          analysisDate: new Date().toISOString(),
          analysisVersion: '1.0'
        }
      };

    } catch (error) {
      console.error('Error in mistake analysis:', error);
      throw new MistakeAnalysisError(
        'Failed to analyze mistake',
        'ANALYSIS_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Classify mistakes using pattern matching and AI analysis
  async classifyMistake(classificationData) {
    const {
      studentResponse,
      expectedResponse,
      stepContext,
      problemContext
    } = classificationData;

    try {
      // Initialize classification result
      const classification = {
        primaryType: MISTAKE_TYPES.CONCEPTUAL,
        secondaryTypes: [],
        severity: MISTAKE_SEVERITY.MEDIUM,
        confidence: 0.5,
        indicators: [],
        misconceptions: [],
        rootCauses: [],
        patterns: []
      };

      // Pattern-based classification
      const patternAnalysis = this.analyzeByPatterns(
        studentResponse,
        expectedResponse,
        problemContext.subject
      );

      // Content analysis
      const contentAnalysis = await this.analyzeResponseContent(
        studentResponse,
        expectedResponse,
        stepContext
      );

      // Subject-specific analysis
      const subjectAnalysis = await this.analyzeBySubject(
        studentResponse,
        expectedResponse,
        problemContext.subject,
        stepContext
      );

      // Combine analyses
      classification.primaryType = this.determinePrimaryMistakeType([
        patternAnalysis,
        contentAnalysis,
        subjectAnalysis
      ]);

      classification.severity = this.determineSeverity([
        patternAnalysis,
        contentAnalysis,
        subjectAnalysis
      ]);

      classification.confidence = this.calculateConfidence([
        patternAnalysis,
        contentAnalysis,
        subjectAnalysis
      ]);

      classification.indicators = this.extractIndicators([
        patternAnalysis,
        contentAnalysis,
        subjectAnalysis
      ]);

      classification.misconceptions = this.identifyMisconceptions([
        patternAnalysis,
        contentAnalysis,
        subjectAnalysis
      ]);

      classification.rootCauses = await this.identifyRootCauses(
        classification,
        stepContext,
        problemContext
      );

      return classification;

    } catch (error) {
      console.error('Error classifying mistake:', error);
      
      // Return basic classification as fallback
      return {
        primaryType: MISTAKE_TYPES.CONCEPTUAL,
        severity: MISTAKE_SEVERITY.MEDIUM,
        confidence: 0.3,
        indicators: ['classification_failed'],
        misconceptions: [],
        rootCauses: ['analysis_error'],
        patterns: []
      };
    }
  }

  // Generate guided questions to help student understand their mistake
  async generateGuidedQuestions(questionData) {
    const {
      mistakeClassification,
      stepContext,
      studentId,
      problemContext
    } = questionData;

    try {
      const questions = [];

      // Start with diagnostic questions to understand thinking
      const diagnosticQuestions = await this.generateDiagnosticQuestions(
        mistakeClassification,
        stepContext
      );
      questions.push(...diagnosticQuestions);

      // Add mistake-specific questions
      const specificQuestions = await this.generateMistakeSpecificQuestions(
        mistakeClassification,
        stepContext,
        problemContext
      );
      questions.push(...specificQuestions);

      // Add scaffolding questions using the scaffolding engine
      const scaffoldingQuestions = await this.generateScaffoldingQuestions(
        mistakeClassification,
        stepContext,
        studentId
      );
      questions.push(...scaffoldingQuestions);

      // Add metacognitive questions for reflection
      const metacognitiveQuestions = await this.generateMetacognitiveQuestions(
        mistakeClassification,
        stepContext
      );
      questions.push(...metacognitiveQuestions);

      // Prioritize and sequence questions
      const sequencedQuestions = this.sequenceQuestions(questions, mistakeClassification);

      return {
        immediate: sequencedQuestions.slice(0, 2), // Most important questions first
        followUp: sequencedQuestions.slice(2, 5),  // Additional questions if needed
        reflection: sequencedQuestions.slice(5),   // Deeper reflection questions
        totalQuestions: sequencedQuestions.length,
        questioningStrategy: this.determineQuestioningStrategy(mistakeClassification)
      };

    } catch (error) {
      console.error('Error generating guided questions:', error);
      
      // Return fallback questions
      return {
        immediate: [
          {
            type: QUESTION_TYPES.DIAGNOSTIC,
            question: "Can you walk me through your thinking on this step?",
            purpose: "Understand student's reasoning process"
          }
        ],
        followUp: [
          {
            type: QUESTION_TYPES.CLARIFYING,
            question: "What part of this problem seems most challenging to you?",
            purpose: "Identify specific difficulties"
          }
        ],
        reflection: [],
        totalQuestions: 2,
        questioningStrategy: 'supportive'
      };
    }
  }

  // Create a comprehensive remediation strategy
  async createRemediationStrategy(strategyData) {
    const {
      mistakeClassification,
      stepContext,
      studentId,
      guidedQuestions
    } = strategyData;

    try {
      const strategy = {
        immediate: {
          actions: [],
          explanations: [],
          examples: []
        },
        shortTerm: {
          practice: [],
          concepts: [],
          skills: []
        },
        longTerm: {
          recommendations: [],
          resources: [],
          monitoring: []
        },
        adaptations: []
      };

      // Immediate interventions based on mistake type
      strategy.immediate = await this.createImmediateInterventions(
        mistakeClassification,
        stepContext
      );

      // Short-term remediation plan
      strategy.shortTerm = await this.createShortTermPlan(
        mistakeClassification,
        stepContext
      );

      // Long-term learning plan
      strategy.longTerm = await this.createLongTermPlan(
        mistakeClassification,
        studentId
      );

      // Adaptive modifications
      strategy.adaptations = await this.createAdaptiveModifications(
        mistakeClassification,
        stepContext,
        studentId
      );

      return strategy;

    } catch (error) {
      console.error('Error creating remediation strategy:', error);
      
      // Return basic remediation strategy
      return {
        immediate: {
          actions: ['Review the problem step'],
          explanations: ['Let\'s break this down into smaller parts'],
          examples: []
        },
        shortTerm: {
          practice: ['Similar problems'],
          concepts: ['Core concepts review'],
          skills: []
        },
        longTerm: {
          recommendations: ['Continue practice'],
          resources: [],
          monitoring: []
        },
        adaptations: []
      };
    }
  }

  // ============================================
  // PATTERN ANALYSIS METHODS
  // ============================================

  // Analyze mistakes using predefined patterns
  analyzeByPatterns(studentResponse, expectedResponse, subject) {
    const patterns = this.mistakePatterns[subject] || this.mistakePatterns.general;
    const analysis = {
      matchedPatterns: [],
      indicators: [],
      confidence: 0.0
    };

    for (const pattern of patterns) {
      const match = this.checkPattern(studentResponse, pattern);
      if (match.matched) {
        analysis.matchedPatterns.push({
          pattern: pattern.name,
          type: pattern.type,
          confidence: match.confidence,
          indicators: match.indicators
        });
        analysis.indicators.push(...match.indicators);
        analysis.confidence = Math.max(analysis.confidence, match.confidence);
      }
    }

    return analysis;
  }

  // Analyze response content for mistake indicators
  async analyzeResponseContent(studentResponse, expectedResponse, stepContext) {
    const analysis = {
      lengthAnalysis: this.analyzeLengthIndicators(studentResponse, expectedResponse),
      structureAnalysis: this.analyzeStructure(studentResponse),
      keywordAnalysis: this.analyzeKeywords(studentResponse, stepContext),
      coherenceAnalysis: this.analyzeCoherence(studentResponse),
      completenessAnalysis: this.analyzeCompleteness(studentResponse, expectedResponse)
    };

    // Safety check
    const safetyResult = await this.safetyFilter.checkContent(studentResponse);
    analysis.safetyCheck = safetyResult;

    return analysis;
  }

  // Subject-specific mistake analysis
  async analyzeBySubject(studentResponse, expectedResponse, subject, stepContext) {
    switch (subject) {
      case 'arithmetic':
      case 'algebra':
      case 'geometry':
        return this.analyzeMathMistakes(studentResponse, expectedResponse, stepContext);
      
      case 'biology':
      case 'chemistry':
      case 'physics':
        return this.analyzeScienceMistakes(studentResponse, expectedResponse, stepContext);
      
      case 'creative_writing':
      case 'essay_writing':
        return this.analyzeWritingMistakes(studentResponse, expectedResponse, stepContext);
      
      default:
        return this.analyzeGeneralMistakes(studentResponse, expectedResponse, stepContext);
    }
  }

  // ============================================
  // QUESTION GENERATION METHODS
  // ============================================

  // Generate diagnostic questions to understand student thinking
  async generateDiagnosticQuestions(mistakeClassification, stepContext) {
    const questions = [];
    const template = this.questioningTemplates.diagnostic[mistakeClassification.primaryType];

    for (const questionTemplate of template.questions) {
      questions.push({
        type: QUESTION_TYPES.DIAGNOSTIC,
        question: this.personalizeQuestion(questionTemplate.question, stepContext),
        purpose: questionTemplate.purpose,
        expectedInsights: questionTemplate.insights,
        priority: questionTemplate.priority || 'medium'
      });
    }

    return questions;
  }

  // Generate mistake-specific questions
  async generateMistakeSpecificQuestions(mistakeClassification, stepContext, problemContext) {
    const questions = [];
    const mistakeType = mistakeClassification.primaryType;

    switch (mistakeType) {
      case MISTAKE_TYPES.CONCEPTUAL:
        questions.push(...this.generateConceptualQuestions(stepContext, problemContext));
        break;
      
      case MISTAKE_TYPES.PROCEDURAL:
        questions.push(...this.generateProceduralQuestions(stepContext, problemContext));
        break;
      
      case MISTAKE_TYPES.COMPUTATIONAL:
        questions.push(...this.generateComputationalQuestions(stepContext, problemContext));
        break;
      
      case MISTAKE_TYPES.STRATEGIC:
        questions.push(...this.generateStrategicQuestions(stepContext, problemContext));
        break;
      
      default:
        questions.push(...this.generateGeneralQuestions(stepContext, problemContext));
    }

    return questions;
  }

  // Generate scaffolding questions using the AI engine
  async generateScaffoldingQuestions(mistakeClassification, stepContext, studentId) {
    try {
      const scaffoldingContext = {
        studentId,
        currentContent: stepContext.prompt,
        scaffoldingType: 'MISTAKE_ANALYSIS',
        subject: stepContext.subject || 'general',
        difficulty: stepContext.difficulty || 'medium',
        sessionContext: {
          mistakeType: mistakeClassification.primaryType,
          severity: mistakeClassification.severity,
          misconceptions: mistakeClassification.misconceptions
        }
      };

      const scaffoldingResult = await this.scaffoldingEngine.generateScaffoldingPrompt(scaffoldingContext);

      // Parse scaffolding response into questions
      const questions = this.parseScaffoldingIntoQuestions(scaffoldingResult.prompt);

      return questions.map(question => ({
        type: QUESTION_TYPES.SOCRATIC,
        question: question.text,
        purpose: question.purpose || 'Guide understanding through questioning',
        scaffoldingStyle: scaffoldingResult.scaffolding_style,
        priority: 'high'
      }));

    } catch (error) {
      console.error('Error generating scaffolding questions:', error);
      return [];
    }
  }

  // Generate metacognitive questions for reflection
  async generateMetacognitiveQuestions(mistakeClassification, stepContext) {
    const questions = [];
    const severity = mistakeClassification.severity;

    // Add reflection questions based on mistake severity
    if (severity === MISTAKE_SEVERITY.HIGH || severity === MISTAKE_SEVERITY.CRITICAL) {
      questions.push({
        type: QUESTION_TYPES.METACOGNITIVE,
        question: "What strategies could you use to check your work in the future?",
        purpose: "Develop self-monitoring skills",
        priority: 'high'
      });
    }

    questions.push({
      type: QUESTION_TYPES.METACOGNITIVE,
      question: "What did you learn from working through this mistake?",
      purpose: "Consolidate learning from error",
      priority: 'medium'
    });

    questions.push({
      type: QUESTION_TYPES.METACOGNITIVE,
      question: "How will you approach similar problems differently next time?",
      purpose: "Transfer learning to future situations",
      priority: 'medium'
    });

    return questions;
  }

  // ============================================
  // SUBJECT-SPECIFIC ANALYSIS METHODS
  // ============================================

  // Analyze math-specific mistakes
  analyzeMathMistakes(studentResponse, expectedResponse, stepContext) {
    const analysis = {
      type: 'mathematics',
      indicators: [],
      patterns: []
    };

    // Check for common math mistake patterns
    const mathPatterns = [
      { pattern: /\d+\s*[\+\-\*\/]\s*\d+\s*=\s*\d+/, type: 'computational' },
      { pattern: /x\s*=\s*\d+/, type: 'algebraic' },
      { pattern: /\(\s*\d+\s*,\s*\d+\s*\)/, type: 'coordinate' }
    ];

    for (const mathPattern of mathPatterns) {
      if (mathPattern.pattern.test(studentResponse)) {
        analysis.patterns.push(mathPattern.type);
      }
    }

    // Check for specific math errors
    if (/[-]?\d+\.\d+/.test(studentResponse) && !/[-]?\d+\.\d+/.test(expectedResponse)) {
      analysis.indicators.push('unnecessary_decimal');
    }

    if (studentResponse.includes('=') && !expectedResponse.includes('=')) {
      analysis.indicators.push('premature_equation');
    }

    return analysis;
  }

  // Analyze science-specific mistakes
  analyzeScienceMistakes(studentResponse, expectedResponse, stepContext) {
    const analysis = {
      type: 'science',
      indicators: [],
      patterns: []
    };

    // Check for scientific vocabulary usage
    const scientificTerms = ['hypothesis', 'experiment', 'variable', 'control', 'observation'];
    const usedTerms = scientificTerms.filter(term => 
      studentResponse.toLowerCase().includes(term)
    );

    if (usedTerms.length === 0 && scientificTerms.some(term => 
      expectedResponse.toLowerCase().includes(term)
    )) {
      analysis.indicators.push('missing_scientific_vocabulary');
    }

    // Check for units and measurements
    if (/\d+/.test(studentResponse) && !/\d+\s*(cm|m|g|kg|ml|l|°C|°F)/.test(studentResponse)) {
      analysis.indicators.push('missing_units');
    }

    return analysis;
  }

  // Analyze writing-specific mistakes
  analyzeWritingMistakes(studentResponse, expectedResponse, stepContext) {
    const analysis = {
      type: 'writing',
      indicators: [],
      patterns: []
    };

    // Check for structure
    const sentences = studentResponse.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2 && expectedResponse.split(/[.!?]+/).length >= 2) {
      analysis.indicators.push('insufficient_development');
    }

    // Check for transitions
    const transitions = ['however', 'therefore', 'furthermore', 'in addition', 'consequently'];
    if (!transitions.some(transition => studentResponse.toLowerCase().includes(transition))) {
      analysis.indicators.push('lack_of_transitions');
    }

    return analysis;
  }

  // Analyze general mistakes
  analyzeGeneralMistakes(studentResponse, expectedResponse, stepContext) {
    const analysis = {
      type: 'general',
      indicators: [],
      patterns: []
    };

    // Basic completeness check
    if (studentResponse.trim().length < expectedResponse.trim().length * 0.3) {
      analysis.indicators.push('incomplete_response');
    }

    // Check for reasoning indicators
    const reasoningWords = ['because', 'since', 'therefore', 'thus', 'so'];
    if (!reasoningWords.some(word => studentResponse.toLowerCase().includes(word))) {
      analysis.indicators.push('lack_of_reasoning');
    }

    return analysis;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  // Initialize mistake patterns for different subjects
  initializeMistakePatterns() {
    return {
      general: [
        {
          name: 'incomplete_response',
          type: MISTAKE_TYPES.COMMUNICATION,
          pattern: /^.{0,10}$/,
          indicators: ['too_short']
        },
        {
          name: 'no_reasoning',
          type: MISTAKE_TYPES.METACOGNITIVE,
          pattern: /^(?!.*(because|since|therefore|thus|so)).*/i,
          indicators: ['missing_explanation']
        }
      ],
      mathematics: [
        {
          name: 'calculation_error',
          type: MISTAKE_TYPES.COMPUTATIONAL,
          pattern: /\d+\s*[\+\-\*\/]\s*\d+\s*=\s*\d+/,
          indicators: ['arithmetic_mistake']
        },
        {
          name: 'order_of_operations',
          type: MISTAKE_TYPES.PROCEDURAL,
          pattern: /\d+\s*[\+\-]\s*\d+\s*[\*\/]\s*\d+/,
          indicators: ['pemdas_error']
        }
      ]
    };
  }

  // Initialize questioning templates
  initializeQuestioningTemplates() {
    return {
      diagnostic: {
        [MISTAKE_TYPES.CONCEPTUAL]: {
          questions: [
            {
              question: "Can you explain what you think this problem is asking?",
              purpose: "Check problem comprehension",
              insights: ['understanding_level'],
              priority: 'high'
            },
            {
              question: "What concepts do you think are important for solving this?",
              purpose: "Assess conceptual knowledge",
              insights: ['concept_awareness'],
              priority: 'medium'
            }
          ]
        },
        [MISTAKE_TYPES.PROCEDURAL]: {
          questions: [
            {
              question: "Can you walk me through each step you took?",
              purpose: "Identify procedural errors",
              insights: ['step_accuracy'],
              priority: 'high'
            },
            {
              question: "Which step do you think might need revision?",
              purpose: "Encourage self-evaluation",
              insights: ['self_awareness'],
              priority: 'medium'
            }
          ]
        }
      }
    };
  }

  // Check if response matches a specific pattern
  checkPattern(response, pattern) {
    const match = {
      matched: false,
      confidence: 0.0,
      indicators: []
    };

    if (pattern.pattern.test(response)) {
      match.matched = true;
      match.confidence = 0.8;
      match.indicators = pattern.indicators;
    }

    return match;
  }

  // Analyze response length indicators
  analyzeLengthIndicators(studentResponse, expectedResponse) {
    const studentLength = studentResponse.trim().length;
    const expectedLength = expectedResponse.trim().length;
    const ratio = expectedLength > 0 ? studentLength / expectedLength : 0;

    return {
      ratio,
      tooShort: ratio < 0.3,
      tooLong: ratio > 3.0,
      appropriate: ratio >= 0.3 && ratio <= 3.0
    };
  }

  // Analyze response structure
  analyzeStructure(response) {
    return {
      hasSentences: /[.!?]/.test(response),
      hasCapitalization: /[A-Z]/.test(response),
      hasPunctuation: /[.,;:!?]/.test(response),
      sentenceCount: response.split(/[.!?]+/).filter(s => s.trim().length > 0).length
    };
  }

  // Analyze keywords in response
  analyzeKeywords(response, stepContext) {
    const expectedKeywords = stepContext.keywords || [];
    const foundKeywords = expectedKeywords.filter(keyword =>
      response.toLowerCase().includes(keyword.toLowerCase())
    );

    return {
      expectedCount: expectedKeywords.length,
      foundCount: foundKeywords.length,
      missing: expectedKeywords.filter(keyword =>
        !response.toLowerCase().includes(keyword.toLowerCase())
      ),
      coverage: expectedKeywords.length > 0 ? foundKeywords.length / expectedKeywords.length : 1
    };
  }

  // Additional utility methods for mistake analysis
  analyzeCoherence(response) {
    // Simple coherence check based on sentence flow
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return {
      sentenceCount: sentences.length,
      averageLength: sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length || 0,
      hasLogicalFlow: sentences.length > 1 // Simplified check
    };
  }

  analyzeCompleteness(studentResponse, expectedResponse) {
    const studentWords = studentResponse.trim().split(/\s+/).filter(w => w.length > 0);
    const expectedWords = expectedResponse.trim().split(/\s+/).filter(w => w.length > 0);
    
    return {
      wordCount: studentWords.length,
      expectedWordCount: expectedWords.length,
      completeness: expectedWords.length > 0 ? studentWords.length / expectedWords.length : 1,
      isComplete: studentWords.length >= expectedWords.length * 0.5
    };
  }

  // Determine primary mistake type from multiple analyses
  determinePrimaryMistakeType(analyses) {
    const typeScores = {};
    
    for (const analysis of analyses) {
      if (analysis.matchedPatterns) {
        for (const pattern of analysis.matchedPatterns) {
          typeScores[pattern.type] = (typeScores[pattern.type] || 0) + pattern.confidence;
        }
      }
    }

    // Return the type with highest score, or default to conceptual
    const maxType = Object.keys(typeScores).reduce((a, b) => 
      typeScores[a] > typeScores[b] ? a : b, MISTAKE_TYPES.CONCEPTUAL
    );

    return maxType;
  }

  // Determine mistake severity
  determineSeverity(analyses) {
    // Simple severity determination based on analysis results
    const indicators = analyses.flatMap(a => a.indicators || []);
    
    if (indicators.includes('fundamental_misunderstanding') || indicators.includes('critical_error')) {
      return MISTAKE_SEVERITY.CRITICAL;
    } else if (indicators.includes('major_error') || indicators.includes('conceptual_gap')) {
      return MISTAKE_SEVERITY.HIGH;
    } else if (indicators.includes('procedural_error') || indicators.includes('incomplete_response')) {
      return MISTAKE_SEVERITY.MEDIUM;
    } else {
      return MISTAKE_SEVERITY.LOW;
    }
  }

  // Calculate analysis confidence
  calculateConfidence(analyses) {
    const confidences = analyses.map(a => a.confidence || 0.5);
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  // Extract indicators from analyses
  extractIndicators(analyses) {
    return analyses.flatMap(a => a.indicators || []);
  }

  // Identify misconceptions from analyses
  identifyMisconceptions(analyses) {
    // Extract misconceptions from analysis patterns
    const misconceptions = [];
    
    for (const analysis of analyses) {
      if (analysis.matchedPatterns) {
        for (const pattern of analysis.matchedPatterns) {
          if (pattern.type === MISTAKE_TYPES.CONCEPTUAL) {
            misconceptions.push(`Potential misconception in ${pattern.pattern}`);
          }
        }
      }
    }

    return misconceptions;
  }

  // Identify root causes
  async identifyRootCauses(classification, stepContext, problemContext) {
    const rootCauses = [];

    // Based on mistake type, suggest likely root causes
    switch (classification.primaryType) {
      case MISTAKE_TYPES.CONCEPTUAL:
        rootCauses.push('Incomplete understanding of core concepts');
        break;
      case MISTAKE_TYPES.PROCEDURAL:
        rootCauses.push('Unfamiliarity with problem-solving procedures');
        break;
      case MISTAKE_TYPES.COMPUTATIONAL:
        rootCauses.push('Arithmetic calculation errors');
        break;
      case MISTAKE_TYPES.STRATEGIC:
        rootCauses.push('Difficulty selecting appropriate problem-solving strategy');
        break;
      default:
        rootCauses.push('General learning difficulty');
    }

    return rootCauses;
  }

  // Log mistake analysis to database
  async logMistakeAnalysis(logData) {
    const client = await this.pool.connect();
    
    try {
      const {
        sessionId,
        stepNumber,
        mistakeClassification,
        guidedQuestions,
        remediationStrategy
      } = logData;

      await client.query(`
        INSERT INTO problem_mistakes (
          session_id, step_id, mistake_type, mistake_category, mistake_description,
          severity, root_cause, correction_provided, explanation_given, practice_recommended
        ) VALUES (
          $1,
          (SELECT id FROM problem_session_steps WHERE session_id = $1 AND step_number = $2),
          $3, $4, $5, $6, $7, $8, $9, $10
        )
      `, [
        sessionId,
        stepNumber,
        mistakeClassification.primaryType,
        mistakeClassification.secondaryTypes.join(','),
        JSON.stringify(mistakeClassification),
        mistakeClassification.severity,
        mistakeClassification.rootCauses.join('; '),
        JSON.stringify(guidedQuestions),
        JSON.stringify(remediationStrategy),
        remediationStrategy.shortTerm.practice.join('; ')
      ]);

    } finally {
      client.release();
    }
  }

  // Health check
  async healthCheck() {
    try {
      const dbResult = await this.pool.query('SELECT 1 as test');
      
      return {
        status: 'healthy',
        service: 'mistake-analysis-service',
        features: {
          database: dbResult.rows.length > 0 ? 'connected' : 'disconnected',
          patternAnalysis: 'enabled',
          guidedQuestioning: 'enabled',
          remediationStrategies: 'enabled'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'mistake-analysis-service',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Additional helper methods for question generation
  personalizeQuestion(questionTemplate, stepContext) {
    return questionTemplate.replace('{step}', stepContext.title || 'this step')
                          .replace('{subject}', stepContext.subject || 'the topic');
  }

  parseScaffoldingIntoQuestions(scaffoldingText) {
    // Simple parsing of scaffolding text into questions
    const sentences = scaffoldingText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.filter(s => s.includes('?')).map(s => ({
      text: s.trim() + '?',
      purpose: 'Guide understanding'
    }));
  }

  sequenceQuestions(questions, mistakeClassification) {
    // Sort questions by priority and type
    return questions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      return bPriority - aPriority;
    });
  }

  determineQuestioningStrategy(mistakeClassification) {
    switch (mistakeClassification.severity) {
      case MISTAKE_SEVERITY.CRITICAL:
        return 'intensive_support';
      case MISTAKE_SEVERITY.HIGH:
        return 'guided_discovery';
      case MISTAKE_SEVERITY.MEDIUM:
        return 'socratic_questioning';
      default:
        return 'supportive';
    }
  }

  // Placeholder methods for specific question types
  generateConceptualQuestions(stepContext, problemContext) {
    return [{
      type: QUESTION_TYPES.CLARIFYING,
      question: "What do you think is the main concept we're working with here?",
      purpose: "Clarify conceptual understanding",
      priority: 'high'
    }];
  }

  generateProceduralQuestions(stepContext, problemContext) {
    return [{
      type: QUESTION_TYPES.PROBING,
      question: "Can you think of the steps we usually follow for this type of problem?",
      purpose: "Review correct procedure",
      priority: 'high'
    }];
  }

  generateComputationalQuestions(stepContext, problemContext) {
    return [{
      type: QUESTION_TYPES.DIAGNOSTIC,
      question: "Let's double-check this calculation step by step. What do you get?",
      purpose: "Identify calculation error",
      priority: 'high'
    }];
  }

  generateStrategicQuestions(stepContext, problemContext) {
    return [{
      type: QUESTION_TYPES.REDIRECTING,
      question: "What different approaches could we try for this problem?",
      purpose: "Explore alternative strategies",
      priority: 'high'
    }];
  }

  generateGeneralQuestions(stepContext, problemContext) {
    return [{
      type: QUESTION_TYPES.DIAGNOSTIC,
      question: "Can you tell me more about your thinking on this?",
      purpose: "Understand general approach",
      priority: 'medium'
    }];
  }

  // Remediation strategy methods
  async createImmediateInterventions(mistakeClassification, stepContext) {
    return {
      actions: [`Address ${mistakeClassification.primaryType} mistake`],
      explanations: ['Let me help clarify this concept'],
      examples: ['Here\'s a similar example']
    };
  }

  async createShortTermPlan(mistakeClassification, stepContext) {
    return {
      practice: ['Practice similar problems'],
      concepts: ['Review related concepts'],
      skills: ['Strengthen foundational skills']
    };
  }

  async createLongTermPlan(mistakeClassification, studentId) {
    return {
      recommendations: ['Regular practice sessions'],
      resources: ['Additional learning materials'],
      monitoring: ['Track progress on similar problems']
    };
  }

  async createAdaptiveModifications(mistakeClassification, stepContext, studentId) {
    return [
      'Provide additional scaffolding',
      'Break down into smaller steps',
      'Use visual aids if helpful'
    ];
  }
}

// Singleton instance
let mistakeAnalysisInstance = null;

const getMistakeAnalysisService = () => {
  if (!mistakeAnalysisInstance) {
    mistakeAnalysisInstance = new MistakeAnalysisService();
  }
  return mistakeAnalysisInstance;
};

module.exports = {
  MistakeAnalysisService,
  getMistakeAnalysisService,
  MistakeAnalysisError,
  MISTAKE_TYPES,
  MISTAKE_SEVERITY,
  QUESTION_TYPES
}; 