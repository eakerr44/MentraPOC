const { safetyFilter } = require('./safety-filter');

// Response validation error classes
class ResponseValidationError extends Error {
  constructor(message, type, severity = 'medium', details = {}) {
    super(message);
    this.name = 'ResponseValidationError';
    this.type = type;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class EducationalViolationError extends ResponseValidationError {
  constructor(message, violationType, details = {}) {
    super(message, 'educational_violation', 'high', details);
    this.name = 'EducationalViolationError';
    this.violationType = violationType;
  }
}

class DevelopmentalMismatchError extends ResponseValidationError {
  constructor(message, expectedLevel, actualLevel, details = {}) {
    super(message, 'developmental_mismatch', 'medium', details);
    this.name = 'DevelopmentalMismatchError';
    this.expectedLevel = expectedLevel;
    this.actualLevel = actualLevel;
  }
}

// Educational response validation patterns
const EDUCATIONAL_RESPONSE_PATTERNS = {
  // Prohibited direct answer patterns
  DIRECT_ANSWERS: {
    MULTIPLE_CHOICE: [
      /(?:the answer is|answer:|correct answer is)\s*[a-d]/i,
      /^[a-d]\.?\s*(?:is|the|correct)/i,
      /choose\s+(?:option\s+)?[a-d]/i
    ],
    NUMERICAL: [
      /(?:the answer is|answer:|equals|result is)\s*\d+/i,
      /^(?:answer:|result:)\s*\d+/i,
      /(?:solution:|answer:)\s*x\s*=\s*\d+/i
    ],
    LIST_ANSWERS: [
      /(?:here are|the answers are):\s*(?:\d+\.|\-|\•)/i,
      /^(?:answers?:?|solutions?:?)\s*\n/i,
      /(?:final answers?|complete solutions?):\s*/i
    ],
    COMPLETION: [
      /(?:here is|here's)\s+(?:your|the)\s+(?:completed|finished|done)\s+(?:essay|report|assignment)/i,
      /(?:i've|i have)\s+(?:completed|finished|written|done)\s+(?:your|this|the)/i
    ]
  },

  // Required educational elements
  EDUCATIONAL_ELEMENTS: {
    QUESTIONING: [
      /what do you think/i,
      /how would you/i,
      /can you (?:explain|tell me|think about)/i,
      /why might/i,
      /what if/i,
      /let's think about/i
    ],
    GUIDANCE: [
      /let's (?:start by|begin with|explore)/i,
      /first,?\s+(?:consider|think about|look at)/i,
      /one way to approach this/i,
      /you might want to/i,
      /try (?:thinking about|considering)/i
    ],
    SCAFFOLDING: [
      /step by step/i,
      /break (?:this|it) down/i,
      /let's work through/i,
      /building on/i,
      /connects? to what you (?:know|learned)/i
    ],
    ENCOURAGEMENT: [
      /(?:great|good|excellent|nice)\s+(?:question|thinking|work|job)/i,
      /you're on the right track/i,
      /that's a good (?:start|approach|idea)/i,
      /keep (?:going|thinking)/i
    ]
  },

  // Pedagogical quality indicators
  PEDAGOGICAL_QUALITY: {
    SOCRATIC_METHOD: [
      /what makes you think/i,
      /how did you arrive at/i,
      /what evidence supports/i,
      /can you explain your reasoning/i
    ],
    METACOGNITION: [
      /what strategies (?:did you use|work best)/i,
      /how do you know/i,
      /what's your thought process/i,
      /how confident are you/i
    ],
    CONNECTION_BUILDING: [
      /(?:similar to|like|reminds me of)/i,
      /connects? to/i,
      /(?:relates|related) to/i,
      /builds? (?:on|upon)/i
    ]
  }
};

// Age-appropriate language and complexity guidelines
const DEVELOPMENTAL_GUIDELINES = {
  ELEMENTARY: {
    maxSentenceLength: 15,
    maxParagraphLength: 3,
    simpleLanguage: true,
    visualSupport: true,
    concreteConcepts: true,
    forbiddenWords: ['analyze', 'synthesize', 'evaluate', 'critique', 'hypothesis', 'methodology'],
    preferredWords: ['look at', 'think about', 'what do you see', 'tell me', 'show me']
  },
  MIDDLE_SCHOOL: {
    maxSentenceLength: 20,
    maxParagraphLength: 4,
    simpleLanguage: false,
    visualSupport: true,
    concreteConcepts: false,
    forbiddenWords: ['epistemological', 'paradigmatic', 'heuristic', 'ontological'],
    preferredWords: ['analyze', 'compare', 'explain why', 'what patterns', 'how does this relate']
  },
  HIGH_SCHOOL: {
    maxSentenceLength: 25,
    maxParagraphLength: 5,
    simpleLanguage: false,
    visualSupport: false,
    concreteConcepts: false,
    forbiddenWords: [],
    preferredWords: ['evaluate', 'synthesize', 'critique', 'justify', 'what implications']
  }
};

class ResponseValidator {
  constructor() {
    this.educationalPatterns = EDUCATIONAL_RESPONSE_PATTERNS;
    this.developmentalGuidelines = DEVELOPMENTAL_GUIDELINES;
    this.validationLog = [];
    this.responseMetrics = {
      totalValidated: 0,
      blocked: 0,
      modified: 0,
      approved: 0
    };
  }

  // Main response validation method
  async validateResponse(response, context = {}) {
    const {
      originalInput = '',
      studentId = null,
      studentAge = null,
      subject = 'general',
      learningObjective = null,
      scaffoldingLevel = 'medium',
      sessionContext = {},
      skipImprovement = false
    } = context;

    const validationResult = {
      approved: true,
      violations: [],
      modifications: [],
      finalResponse: response,
      educationalScore: 0,
      developmentalAlignment: null,
      recommendations: [],
      metadata: {
        originalLength: response.length,
        validationTimestamp: new Date().toISOString(),
        studentId,
        subject
      }
    };

    try {
      // 1. Safety and content filtering (using existing safety filter)
      const safetyResult = await safetyFilter.checkResponseSafety(response, originalInput, {
        studentAge,
        contextType: 'response'
      });

      if (!safetyResult.safe) {
        validationResult.approved = false;
        validationResult.violations.push({
          type: 'safety_violation',
          severity: 'high',
          details: safetyResult.violations,
          message: 'Response contains unsafe content'
        });
      }

      // 2. Educational appropriateness validation
      const educationalResult = this.validateEducationalAppropriateness(response, originalInput);
      validationResult.educationalScore = educationalResult.score;
      
      if (!educationalResult.appropriate) {
        if (educationalResult.hasDirectAnswers) {
          validationResult.approved = false;
        }
        validationResult.violations.push({
          type: 'educational_violation',
          severity: educationalResult.hasDirectAnswers ? 'high' : 'medium',
          issues: educationalResult.issues,
          message: 'Response does not meet educational standards'
        });
      }

      // 3. Developmental appropriateness check
      if (studentAge) {
        const developmentalResult = this.validateDevelopmentalAppropriateness(response, studentAge);
        validationResult.developmentalAlignment = developmentalResult;
        
        if (!developmentalResult.appropriate) {
          validationResult.violations.push({
            type: 'developmental_mismatch',
            severity: 'medium',
            expectedLevel: developmentalResult.expectedLevel,
            actualLevel: developmentalResult.detectedLevel,
            issues: developmentalResult.issues,
            message: 'Response complexity does not match student developmental level'
          });
        }
      }

      // 4. Pedagogical quality assessment
      const pedagogicalResult = this.assessPedagogicalQuality(response, scaffoldingLevel);
      if (pedagogicalResult.score < 0.3) {
        validationResult.violations.push({
          type: 'pedagogical_quality',
          severity: 'medium',
          score: pedagogicalResult.score,
          missing: pedagogicalResult.missingElements,
          message: 'Response lacks sufficient pedagogical quality'
        });
      }

      // 5. Generate improved response if needed
      if (!skipImprovement && (!validationResult.approved || validationResult.violations.length > 0)) {
        const improvedResponse = this.generateImprovedResponse(
          response, 
          validationResult.violations, 
          context
        );
        
        if (improvedResponse) {
          validationResult.finalResponse = improvedResponse;
          validationResult.modifications.push({
            type: 'educational_improvement',
            reason: 'Enhanced educational value and safety',
            originalLength: response.length,
            newLength: improvedResponse.length
          });
          
          // Re-validate improved response
          const revalidation = await this.validateResponse(improvedResponse, {
            ...context,
            skipImprovement: true // Prevent infinite recursion
          });
          
          if (revalidation.approved) {
            validationResult.approved = true;
            validationResult.educationalScore = revalidation.educationalScore;
          }
        }
      }

      // 6. Generate recommendations
      validationResult.recommendations = this.generateRecommendations(
        validationResult.violations,
        context
      );

      // 7. Update metrics and log
      this.updateMetrics(validationResult);
      this.logValidation(validationResult, context);

      return validationResult;

    } catch (error) {
      console.error('❌ Response validation failed:', error);
      return {
        approved: false,
        violations: [{
          type: 'validation_error',
          severity: 'high',
          message: 'Response validation system error',
          error: error.message
        }],
        finalResponse: "I apologize, but I'm having trouble processing that response. Let me help you learn this concept step by step instead.",
        educationalScore: 0,
        recommendations: ['Contact system administrator'],
        metadata: validationResult.metadata
      };
    }
  }

  // Validate educational appropriateness
  validateEducationalAppropriateness(response, originalInput) {
    const result = {
      appropriate: true,
      score: 0,
      issues: [],
      hasDirectAnswers: false,
      missingElements: []
    };

    // Check for prohibited direct answers
    let directAnswerCount = 0;
    for (const [category, patterns] of Object.entries(this.educationalPatterns.DIRECT_ANSWERS)) {
      for (const pattern of patterns) {
        if (pattern.test(response)) {
          directAnswerCount++;
          result.hasDirectAnswers = true;
          result.issues.push(`Contains direct ${category.toLowerCase().replace('_', ' ')}`);
        }
      }
    }

    if (directAnswerCount > 0) {
      result.appropriate = false;
      result.score -= directAnswerCount * 0.3;
    }

    // Check for required educational elements
    let educationalElementScore = 0;
    const requiredElements = ['QUESTIONING', 'GUIDANCE', 'SCAFFOLDING', 'ENCOURAGEMENT'];
    
    for (const element of requiredElements) {
      const patterns = this.educationalPatterns.EDUCATIONAL_ELEMENTS[element];
      let hasElement = false;
      
      for (const pattern of patterns) {
        if (pattern.test(response)) {
          hasElement = true;
          break;
        }
      }
      
      if (hasElement) {
        educationalElementScore += 0.25;
      } else {
        result.missingElements.push(element.toLowerCase());
      }
    }

    result.score += educationalElementScore;

    // Check for pedagogical quality indicators
    let qualityScore = 0;
    for (const [category, patterns] of Object.entries(this.educationalPatterns.PEDAGOGICAL_QUALITY)) {
      for (const pattern of patterns) {
        if (pattern.test(response)) {
          qualityScore += 0.1;
        }
      }
    }

    result.score += Math.min(qualityScore, 0.3);

    // Final appropriateness determination
    if (result.score < 0.4 && !result.hasDirectAnswers) {
      result.appropriate = false;
      result.issues.push('Insufficient educational engagement');
    }

    return result;
  }

  // Validate developmental appropriateness
  validateDevelopmentalAppropriateness(response, studentAge) {
    let ageGroup = 'MIDDLE_SCHOOL';
    if (studentAge <= 11) ageGroup = 'ELEMENTARY';
    else if (studentAge >= 15) ageGroup = 'HIGH_SCHOOL';

    const guidelines = this.developmentalGuidelines[ageGroup];
    const result = {
      appropriate: true,
      expectedLevel: ageGroup,
      detectedLevel: this.detectResponseComplexity(response),
      issues: [],
      ageGroup
    };

    // Check sentence length
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    
    if (avgSentenceLength > guidelines.maxSentenceLength) {
      result.appropriate = false;
      result.issues.push(`Sentences too long (avg: ${Math.round(avgSentenceLength)}, max: ${guidelines.maxSentenceLength})`);
    }

    // Check paragraph length
    const paragraphs = response.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const avgParagraphSentences = paragraphs.reduce((sum, p) => {
      return sum + p.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    }, 0) / paragraphs.length;

    if (avgParagraphSentences > guidelines.maxParagraphLength) {
      result.appropriate = false;
      result.issues.push(`Paragraphs too long (avg: ${Math.round(avgParagraphSentences)} sentences)`);
    }

    // Check for forbidden words
    const words = response.toLowerCase().split(/\s+/);
    const forbiddenWordsFound = guidelines.forbiddenWords.filter(word => 
      words.includes(word.toLowerCase())
    );

    if (forbiddenWordsFound.length > 0) {
      result.appropriate = false;
      result.issues.push(`Contains age-inappropriate words: ${forbiddenWordsFound.join(', ')}`);
    }

    return result;
  }

  // Detect response complexity level
  detectResponseComplexity(response) {
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = response.split(/\s+/);
    const avgSentenceLength = words.length / sentences.length;
    
    // Count complex words (>6 characters or academic terms)
    const complexWords = words.filter(word => 
      word.length > 6 || 
      /(?:analyze|synthesize|evaluate|hypothesis|methodology|epistemological)/i.test(word)
    ).length;
    
    const complexityRatio = complexWords / words.length;
    
    if (avgSentenceLength <= 15 && complexityRatio <= 0.1) return 'ELEMENTARY';
    if (avgSentenceLength <= 20 && complexityRatio <= 0.2) return 'MIDDLE_SCHOOL';
    return 'HIGH_SCHOOL';
  }

  // Assess pedagogical quality
  assessPedagogicalQuality(response, scaffoldingLevel) {
    const result = {
      score: 0,
      elements: {},
      missingElements: []
    };

    // Evaluate different pedagogical elements
    for (const [category, patterns] of Object.entries(this.educationalPatterns.PEDAGOGICAL_QUALITY)) {
      let categoryScore = 0;
      let hasElements = false;

      for (const pattern of patterns) {
        if (pattern.test(response)) {
          categoryScore += 0.1;
          hasElements = true;
        }
      }

      result.elements[category] = Math.min(categoryScore, 0.3);
      result.score += result.elements[category];

      if (!hasElements) {
        result.missingElements.push(category.toLowerCase().replace('_', ' '));
      }
    }

    // Check for educational elements
    for (const [category, patterns] of Object.entries(this.educationalPatterns.EDUCATIONAL_ELEMENTS)) {
      let hasElement = false;
      
      for (const pattern of patterns) {
        if (pattern.test(response)) {
          hasElement = true;
          result.score += 0.1;
          break;
        }
      }
      
      if (!hasElement && category !== 'ENCOURAGEMENT') {
        result.missingElements.push(category.toLowerCase());
      }
    }

    return result;
  }

  // Generate improved response
  generateImprovedResponse(originalResponse, violations, context) {
    const { studentAge = 13, subject = 'general', originalInput = '' } = context;
    
    // Check if violations are severe enough to require a completely new response
    const hasSafetyViolation = violations.some(v => v.type === 'safety_violation');
    const hasDirectAnswers = violations.some(v => 
      v.type === 'educational_violation' && v.severity === 'high'
    );

    if (hasSafetyViolation || hasDirectAnswers) {
      // Generate a safe, educational fallback response
      return this.generateEducationalFallback(originalInput, context);
    }

    // For less severe violations, try to improve the original response
    let improvedResponse = originalResponse;

    // Add educational elements if missing
    const hasQuestions = /\?/.test(improvedResponse);
    if (!hasQuestions && originalInput) {
      improvedResponse += "\n\nWhat do you think about this? Can you tell me your reasoning?";
    }

    // Add scaffolding if needed
    const hasScaffolding = /(?:step by step|let's|first|next)/i.test(improvedResponse);
    if (!hasScaffolding) {
      improvedResponse = "Let's work through this step by step.\n\n" + improvedResponse;
    }

    // Adjust complexity for age
    if (studentAge <= 11) {
      improvedResponse = this.simplifyLanguage(improvedResponse);
    }

    return improvedResponse;
  }

  // Generate educational fallback response
  generateEducationalFallback(originalInput, context) {
    const { studentAge = 13, subject = 'general' } = context;
    
    const fallbacks = {
      math: "That's a great math question! Let's think about this together. What do you already know that might help us solve this problem?",
      science: "Interesting science question! Let's explore this step by step. What do you observe or notice first?",
      english: "That's a thoughtful question about language and writing! Let's break this down together. What are your initial thoughts?",
      history: "What an important historical topic! Let's examine this carefully. What do you already know about this time period?",
      general: "That's a wonderful question! I'd love to help you explore this topic. What are your thoughts so far?"
    };

    let fallback = fallbacks[subject.toLowerCase()] || fallbacks.general;

    // Adjust for age
    if (studentAge <= 11) {
      fallback = this.simplifyLanguage(fallback);
    }

    return fallback;
  }

  // Simplify language for younger students
  simplifyLanguage(text) {
    const replacements = {
      'explore': 'look at',
      'examine': 'look at',
      'analyze': 'think about',
      'consider': 'think about',
      'demonstrate': 'show',
      'elaborate': 'tell me more',
      'fascinating': 'interesting',
      'consequently': 'so',
      'therefore': 'so',
      'however': 'but'
    };

    let simplified = text;
    for (const [complex, simple] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      simplified = simplified.replace(regex, simple);
    }

    return simplified;
  }

  // Generate recommendations
  generateRecommendations(violations, context) {
    const recommendations = [];

    for (const violation of violations) {
      switch (violation.type) {
        case 'safety_violation':
          recommendations.push('Ensure response focuses on educational content only');
          break;
        case 'educational_violation':
          if (violation.severity === 'high') {
            recommendations.push('Avoid giving direct answers; guide students to discover solutions');
          }
          recommendations.push('Include more questioning and scaffolding elements');
          break;
        case 'developmental_mismatch':
          recommendations.push(`Adjust language complexity for ${violation.expectedLevel} level`);
          break;
        case 'pedagogical_quality':
          recommendations.push('Enhance pedagogical elements like questioning and connection-building');
          break;
      }
    }

    return [...new Set(recommendations)].slice(0, 3);
  }

  // Update validation metrics
  updateMetrics(validationResult) {
    this.responseMetrics.totalValidated++;
    
    if (!validationResult.approved) {
      this.responseMetrics.blocked++;
    } else if (validationResult.modifications.length > 0) {
      this.responseMetrics.modified++;
    } else {
      this.responseMetrics.approved++;
    }
  }

  // Log validation events
  logValidation(validationResult, context) {
    const logEntry = {
      id: require('crypto').randomBytes(8).toString('hex'),
      timestamp: new Date().toISOString(),
      approved: validationResult.approved,
      violations: validationResult.violations.length,
      educationalScore: validationResult.educationalScore,
      studentId: context.studentId,
      subject: context.subject,
      responseLength: validationResult.metadata.originalLength
    };

    this.validationLog.push(logEntry);

    // Keep log manageable
    if (this.validationLog.length > 1000) {
      this.validationLog = this.validationLog.slice(-500);
    }

    console.log('📚 Response validated:', logEntry);
  }

  // Get validation statistics
  getValidationStats() {
    const recentLogs = this.validationLog.slice(-100);
    
    const stats = {
      totalValidated: this.responseMetrics.totalValidated,
      approvalRate: this.responseMetrics.totalValidated > 0 ? 
        (this.responseMetrics.approved / this.responseMetrics.totalValidated * 100).toFixed(1) : 0,
      modificationRate: this.responseMetrics.totalValidated > 0 ? 
        (this.responseMetrics.modified / this.responseMetrics.totalValidated * 100).toFixed(1) : 0,
      blockRate: this.responseMetrics.totalValidated > 0 ? 
        (this.responseMetrics.blocked / this.responseMetrics.totalValidated * 100).toFixed(1) : 0,
      avgEducationalScore: recentLogs.length > 0 ? 
        (recentLogs.reduce((sum, log) => sum + (log.educationalScore || 0), 0) / recentLogs.length).toFixed(2) : 0,
      timestamp: new Date().toISOString()
    };

    return stats;
  }

  // Health check
  healthCheck() {
    return {
      status: 'healthy',
      patternsLoaded: {
        directAnswers: Object.keys(this.educationalPatterns.DIRECT_ANSWERS).length,
        educationalElements: Object.keys(this.educationalPatterns.EDUCATIONAL_ELEMENTS).length,
        pedagogicalQuality: Object.keys(this.educationalPatterns.PEDAGOGICAL_QUALITY).length
      },
      validationsProcessed: this.responseMetrics.totalValidated,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
const responseValidator = new ResponseValidator();

module.exports = {
  ResponseValidator,
  responseValidator,
  ResponseValidationError,
  EducationalViolationError,
  DevelopmentalMismatchError,
  EDUCATIONAL_RESPONSE_PATTERNS,
  DEVELOPMENTAL_GUIDELINES
}; 