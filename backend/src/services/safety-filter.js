const crypto = require('crypto');

// Safety error classes for different types of violations
class SafetyError extends Error {
  constructor(message, type, severity = 'medium', details = {}) {
    super(message);
    this.name = 'SafetyError';
    this.type = type;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class JailbreakError extends SafetyError {
  constructor(message, pattern, confidence, details = {}) {
    super(message, 'jailbreak', 'high', details);
    this.name = 'JailbreakError';
    this.pattern = pattern;
    this.confidence = confidence;
  }
}

class InappropriateContentError extends SafetyError {
  constructor(message, category, details = {}) {
    super(message, 'inappropriate_content', 'high', details);
    this.name = 'InappropriateContentError';
    this.category = category;
  }
}

class EducationalViolationError extends SafetyError {
  constructor(message, violationType, details = {}) {
    super(message, 'educational_violation', 'medium', details);
    this.name = 'EducationalViolationError';
    this.violationType = violationType;
  }
}

// Comprehensive jailbreak detection patterns
const JAILBREAK_PATTERNS = {
  // Role-playing attempts
  ROLE_PLAYING: [
    /(?:pretend|act|roleplay|role-play|imagine|be)\s+(?:you are|youre|you're|as)\s+(?:not|no longer|something|someone|a|an)/i,
    /(?:act|pretend|roleplay|simulate)\s+(?:like|as if|that)\s+you\s+(?:are|were|can|have)/i,
    /forget\s+(?:you are|youre|you're)\s+(?:a|an)\s+ai/i,
    /(?:you are|youre|you're)\s+(?:now|actually|really)\s+(?:a|an|my)/i,
    /(?:become|transform|turn into)\s+(?:a|an|my)/i
  ],

  // System prompt manipulation
  SYSTEM_MANIPULATION: [
    /ignore\s+(?:previous|all|your|the)\s+(?:instructions|rules|guidelines|prompts)/i,
    /(?:override|bypass|disable|turn off)\s+(?:safety|filter|restriction|limit)/i,
    /(?:system|admin|developer|programmer)\s+(?:mode|override|access|privilege)/i,
    /(?:jailbreak|break free|escape|hack|exploit)\s+(?:the|your|this)\s+(?:system|ai|prompt)/i,
    /(?:new|different|alternate)\s+(?:instructions|rules|guidelines|prompt)/i
  ],

  // Boundary testing - Enhanced patterns
  BOUNDARY_TESTING: [
    /what\s+(?:can't|cannot|wont|won't)\s+you\s+(?:do|say|tell|generate)/i,
    /(?:test|check|verify)\s+(?:your|the)\s+(?:limits|boundaries|restrictions)/i,
    /(?:loophole|workaround|way around)\s+(?:your|the)\s+(?:rules|restrictions)/i,
    /(?:hypothetically|theoretically|what if)\s+you\s+(?:could|were able to|had to)/i,
    /find\s+(?:a|some)\s+(?:loophole|way|method)\s+(?:in|around|through)/i,
    /(?:suppose|imagine)\s+(?:for a moment|briefly)\s+(?:you could|that you)/i,
    /(?:if you could|were able to)\s+(?:help|assist|do|break|ignore)/i,
    /(?:what would happen|what if)\s+(?:you|i)\s+(?:could|were|did)/i
  ],

  // Character encoding/obfuscation
  OBFUSCATION: [
    /[a-z]\s+[a-z]\s+[a-z]\s+[a-z]/i, // Spaced out letters
    /(?:base64|rot13|caesar|encode|decode)/i,
    /[^\x00-\x7F]{3,}/, // Non-ASCII sequences
    /\\u[0-9a-f]{4}/i, // Unicode escapes
    /&#\d+;/, // HTML entities
  ],

  // Prompt injection
  PROMPT_INJECTION: [
    /(?:prompt|instruction)\s*[:=]\s*["\']?(?:ignore|forget|override)/i,
    /<!--.*?(?:ignore|override|bypass).*?-->/i,
    /\{\{.*?(?:ignore|override|system).*?\}\}/i,
    /(?:input|user):\s*(?:ignore|override|forget)/i,
    /(?:ai|assistant):\s*(?:i will|i'll|okay)\s+(?:ignore|override)/i
  ],

  // Educational bypass attempts - Significantly Enhanced
  EDUCATIONAL_BYPASS: [
    // Direct homework/assignment requests
    /(?:homework|assignment|test|exam|quiz)\s+(?:answer|solution|cheat)/i,
    /(?:complete|do|finish|solve)\s+(?:my|this|the)\s+(?:homework|assignment|test)/i,
    /(?:give me|tell me|show me)\s+(?:the|all)\s+(?:answers|solutions)/i,
    
    // Academic dishonesty patterns
    /(?:plagiarism|copy|steal)\s+(?:help|assistance)/i,
    /(?:help me|assist me)\s+(?:plagiarize|copy|cheat)/i,
    
    // "Do my work" variations - CRITICAL ADDITIONS
    /(?:write|generate|create|make|compose)\s+(?:my|this|the)\s+(?:essay|paper|report|assignment|homework)/i,
    /(?:complete|finish|do)\s+(?:my|this|the)\s+(?:work|assignment|essay|paper|project|report)/i,
    /(?:write|create|generate)\s+(?:my|an|a)\s+(?:entire|full|complete)\s+(?:essay|paper|report|assignment)/i,
    
    // Shortcut-seeking patterns
    /(?:just|simply|quickly)\s+(?:give|tell|show)\s+(?:me\s+)?(?:the|all)\s+(?:answers|solutions|work)/i,
    /(?:can you|could you|will you)\s+(?:write|do|complete|finish)\s+(?:my|this)/i,
    
    // Delegation attempts
    /(?:you\s+)?(?:write|do|complete|solve|finish)\s+(?:this|my|the)\s+(?:for me|instead)/i,
    /(?:handle|take care of|deal with)\s+(?:my|this)\s+(?:assignment|homework|work)/i,
    
    // Work avoidance
    /(?:without me|for me|instead of me)\s+(?:doing|writing|working|thinking)/i,
    /(?:i don't want to|don't make me|avoid)\s+(?:do|write|think|work)/i,
    
    // Specific missed patterns - HIGH PRIORITY
    /(?:write|create|generate|make|compose|produce)\s+(?:my|a|an)\s+(?:entire|whole|complete)\s+(?:research\s+)?(?:paper|report|project|essay|presentation)/i,
    /(?:generate|create|make|build)\s+(?:my|a|an)\s+(?:science|history|english|math)\s+(?:report|project|presentation|assignment)/i,
    /(?:make|create|build|generate)\s+(?:my|some|a)\s+(?:presentation|slides|powerpoint)/i,
    /(?:compose|write|create|draft)\s+(?:my|a|an)\s+(?:college|university|application)\s+(?:essay|letter|statement)/i,
    /(?:compose|write|create|draft)\s+(?:my|a|an)\s+(?:college\s+application|university\s+application|application)\s+(?:essay|letter|statement)/i,
    /(?:write|create|do)\s+(?:my|this|the)\s+(?:entire|whole|complete)\s+(?:research|term|final)\s+(?:paper|project|assignment)/i
  ]
};

// Inappropriate content categories for educational environment - Enhanced
const INAPPROPRIATE_CONTENT = {
  VIOLENCE: [
    /(?:kill|murder|assassinate|torture|abuse|harm|hurt|attack|fight)/i,
    /(?:weapon|gun|knife|bomb|explosive|violence)/i,
    /(?:blood|gore|brutal|savage|violent)/i
  ],
  
  ADULT_CONTENT: [
    /(?:sex|sexual|porn|nude|naked|intimate)/i,
    /(?:drug|alcohol|smoking|marijuana|cocaine|substance)/i,
    /(?:gambling|bet|casino|poker)/i
  ],
  
  HATE_SPEECH: [
    /(?:hate|racist|discrimination|prejudice|bigot)/i,
    /(?:stupid|idiot|dumb|retard|loser)/i, // Bullying language
    /(?:discriminate|bully|harass|abuse)\s+(?:against|others|students)/i,
    /(?:bullying|harassment)\s+(?:strategies|tactics|methods)/i,
  ],
  
  PERSONAL_INFO: [
    /(?:address|phone|email|password|ssn|social security)/i,
    /(?:credit card|bank account|personal information)/i,
    /(?:home address|real name|private|confidential)/i
  ],
  
  DANGEROUS_ACTIVITIES: [
    /(?:suicide|self-harm|cutting|depression)/i,
    /(?:dangerous|risky|illegal|criminal)/i,
    /(?:how to make|instructions for)\s+(?:bomb|weapon|drug)/i
  ],

  // New category for accessing inappropriate content
  ACCESS_INAPPROPRIATE: [
    /(?:access|visit|find)\s+(?:inappropriate|blocked|restricted)\s+(?:websites|sites|content)/i,
    /(?:bypass|get around)\s+(?:filters|blocks|restrictions)/i,
    /(?:inappropriate|adult|explicit)\s+(?:websites|content|material)/i
  ]
};

// Educational content validation patterns - Enhanced
const EDUCATIONAL_VALIDATION = {
  REQUIRED_ELEMENTS: [
    /(?:learn|understand|explain|explore|discover|think|analyze)/i,
    /(?:why|how|what|when|where|because|therefore|however)/i,
    /(?:concept|idea|principle|theory|knowledge|skill)/i
  ],
  
  FORBIDDEN_SHORTCUTS: [
    /(?:just give me|tell me directly|skip explanation|don't explain)/i,
    /(?:quick answer|fast solution|shortcut|easy way)/i,
    /(?:without thinking|don't make me think)/i,
    /(?:just|simply|quickly)\s+(?:give|tell|show)\s+(?:me\s+)?(?:the|direct)/i
  ],
  
  LEARNING_INDICATORS: [
    /(?:help me understand|can you explain|why does|how does)/i,
    /(?:step by step|break it down|walk me through)/i,
    /(?:what if|what would happen|compare|contrast)/i
  ],

  // False positive filters - content that should NOT be flagged
  FALSE_POSITIVE_FILTERS: [
    /(?:improve|enhance|better)\s+(?:my|your)\s+(?:writing|essay|skills)/i,
    /(?:writing|communication|presentation)\s+skills/i,
    /(?:study|learning|academic)\s+(?:strategies|methods|techniques)/i
  ]
};

// Age-appropriate content guidelines
const AGE_APPROPRIATENESS = {
  ELEMENTARY: {
    maxComplexity: 3,
    allowedTopics: ['basic math', 'reading', 'science basics', 'creativity', 'friendship'],
    forbiddenTopics: ['complex politics', 'mature themes', 'advanced science']
  },
  MIDDLE_SCHOOL: {
    maxComplexity: 6,
    allowedTopics: ['algebra', 'history', 'literature', 'science', 'social issues'],
    forbiddenTopics: ['mature content', 'controversial politics']
  },
  HIGH_SCHOOL: {
    maxComplexity: 9,
    allowedTopics: ['all academic subjects', 'career guidance', 'college prep'],
    forbiddenTopics: ['inappropriate content']
  }
};

class SafetyFilter {
  constructor() {
    this.jailbreakPatterns = JAILBREAK_PATTERNS;
    this.inappropriateContent = INAPPROPRIATE_CONTENT;
    this.educationalValidation = EDUCATIONAL_VALIDATION;
    this.ageAppropriateGuidelines = AGE_APPROPRIATENESS;
    this.safetyLog = [];
    this.suspiciousActivityCount = new Map(); // Track repeated violations by user
  }

  // Main safety check method
  async checkSafety(input, options = {}) {
    const {
      studentId = null,
      studentAge = null,
      contextType = 'general',
      strictMode = true,
      logViolations = true
    } = options;

    const safetyResult = {
      safe: true,
      violations: [],
      riskLevel: 'low',
      sanitizedInput: input,
      recommendations: [],
      metadata: {
        studentId,
        timestamp: new Date().toISOString(),
        contextType,
        inputLength: input.length
      }
    };

    try {
      // 1. Input sanitization
      safetyResult.sanitizedInput = this.sanitizeInput(input);

      // 2. Jailbreak detection
      const jailbreakResult = this.detectJailbreak(safetyResult.sanitizedInput);
      if (jailbreakResult.detected) {
        safetyResult.safe = false;
        safetyResult.violations.push({
          type: 'jailbreak',
          severity: 'high',
          pattern: jailbreakResult.pattern,
          confidence: jailbreakResult.confidence,
          message: 'Potential jailbreak attempt detected'
        });
      }

      // 3. Inappropriate content detection
      const contentResult = this.detectInappropriateContent(safetyResult.sanitizedInput);
      if (contentResult.detected) {
        safetyResult.safe = false;
        safetyResult.violations.push({
          type: 'inappropriate_content',
          severity: 'high',
          category: contentResult.category,
          matches: contentResult.matches,
          message: 'Inappropriate content detected'
        });
      }

      // 4. Educational validation
      const educationalResult = this.validateEducationalContent(safetyResult.sanitizedInput);
      if (!educationalResult.appropriate) {
        if (strictMode) {
          safetyResult.safe = false;
        }
        safetyResult.violations.push({
          type: 'educational_violation',
          severity: 'medium',
          issues: educationalResult.issues,
          message: 'Content may not be educationally appropriate'
        });
      }

      // 5. Age appropriateness check
      if (studentAge) {
        const ageResult = this.checkAgeAppropriateness(safetyResult.sanitizedInput, studentAge);
        if (!ageResult.appropriate) {
          safetyResult.safe = false;
          safetyResult.violations.push({
            type: 'age_inappropriate',
            severity: 'medium',
            reason: ageResult.reason,
            message: 'Content not appropriate for student age'
          });
        }
      }

      // 6. Determine overall risk level
      safetyResult.riskLevel = this.calculateRiskLevel(safetyResult.violations);

      // 7. Generate safety recommendations
      safetyResult.recommendations = this.generateSafetyRecommendations(safetyResult.violations);

      // 8. Track suspicious activity
      if (studentId && safetyResult.violations.length > 0) {
        this.trackSuspiciousActivity(studentId, safetyResult.violations);
      }

      // 9. Log safety events
      if (logViolations && (!safetyResult.safe || safetyResult.violations.length > 0)) {
        this.logSafetyEvent(safetyResult);
      }

      return safetyResult;

    } catch (error) {
      console.error('❌ Safety check failed:', error);
      return {
        safe: false,
        violations: [{
          type: 'system_error',
          severity: 'high',
          message: 'Safety system error',
          error: error.message
        }],
        riskLevel: 'high',
        sanitizedInput: this.sanitizeInput(input),
        recommendations: ['Contact system administrator'],
        metadata: safetyResult.metadata
      };
    }
  }

  // Input sanitization
  sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';

    let sanitized = input;

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Decode common obfuscation attempts
    try {
      // HTML entity decoding
      sanitized = sanitized.replace(/&#(\d+);/g, (match, dec) => {
        const char = String.fromCharCode(dec);
        return /[a-zA-Z0-9\s.,!?]/.test(char) ? char : match;
      });

      // Basic Unicode escape decoding (safely)
      sanitized = sanitized.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
        const char = String.fromCharCode(parseInt(hex, 16));
        return /[a-zA-Z0-9\s.,!?]/.test(char) ? char : match;
      });
    } catch (error) {
      console.warn('Input sanitization warning:', error.message);
    }

    // Limit length to prevent DoS
    const maxLength = 5000;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...';
    }

    return sanitized;
  }

  // Jailbreak detection
  detectJailbreak(input) {
    const result = {
      detected: false,
      pattern: null,
      confidence: 0,
      matches: []
    };

    for (const [category, patterns] of Object.entries(this.jailbreakPatterns)) {
      for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
          result.detected = true;
          result.matches.push({
            category,
            pattern: pattern.toString(),
            match: match[0],
            index: match.index
          });
        }
      }
    }

    if (result.detected) {
      // Enhanced confidence calculation with higher sensitivity for educational threats
      let baseConfidence = 0.4; // Increased base confidence
      let matchBonus = result.matches.length * 0.15; // Slightly higher match bonus
      
      // High-priority category bonuses
      let categoryBonus = 0;
      if (result.matches.some(m => m.category === 'SYSTEM_MANIPULATION')) {
        categoryBonus += 0.3;
      }
      if (result.matches.some(m => m.category === 'EDUCATIONAL_BYPASS')) {
        categoryBonus += 0.25; // Higher priority for educational threats
      }
      if (result.matches.some(m => m.category === 'ROLE_PLAYING')) {
        categoryBonus += 0.2;
      }
      if (result.matches.some(m => m.category === 'BOUNDARY_TESTING')) {
        categoryBonus += 0.15; // Enhanced boundary testing detection
      }
      if (result.matches.some(m => m.category === 'PROMPT_INJECTION')) {
        categoryBonus += 0.2;
      }
      
      result.confidence = Math.min(baseConfidence + matchBonus + categoryBonus, 1.0);
      result.pattern = result.matches[0].category;
    }

    return result;
  }

  // Detect inappropriate content with false positive filtering
  detectInappropriateContent(input) {
    const result = {
      detected: false,
      category: null,
      matches: []
    };

    // First check for false positives (educational content that might trigger)
    for (const pattern of EDUCATIONAL_VALIDATION.FALSE_POSITIVE_FILTERS) {
      if (pattern.test(input)) {
        // This is likely educational content, don't flag it
        return result;
      }
    }

    for (const [category, patterns] of Object.entries(this.inappropriateContent)) {
      for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
          result.detected = true;
          result.category = category;
          result.matches.push({
            category,
            match: match[0],
            index: match.index
          });
        }
      }
    }

    return result;
  }

  // Educational content validation
  validateEducationalContent(input) {
    const result = {
      appropriate: true,
      issues: [],
      score: 0
    };

    // Check for required educational elements
    let educationalScore = 0;
    for (const pattern of this.educationalValidation.REQUIRED_ELEMENTS) {
      if (pattern.test(input)) {
        educationalScore += 1;
      }
    }

    // Check for forbidden shortcuts
    let shortcutPenalty = 0;
    for (const pattern of this.educationalValidation.FORBIDDEN_SHORTCUTS) {
      if (pattern.test(input)) {
        shortcutPenalty += 1;
        result.issues.push('Appears to request shortcuts rather than learning');
      }
    }

    // Check for learning indicators
    let learningScore = 0;
    for (const pattern of this.educationalValidation.LEARNING_INDICATORS) {
      if (pattern.test(input)) {
        learningScore += 1;
      }
    }

    result.score = educationalScore + learningScore - (shortcutPenalty * 2);

    // Determine appropriateness
    if (result.score < 0) {
      result.appropriate = false;
      result.issues.push('Low educational value detected');
    }

    if (shortcutPenalty > 1) {
      result.appropriate = false;
    }

    return result;
  }

  // Age appropriateness check
  checkAgeAppropriateness(input, age) {
    let ageGroup = 'MIDDLE_SCHOOL'; // Default
    
    if (age <= 11) ageGroup = 'ELEMENTARY';
    else if (age >= 15) ageGroup = 'HIGH_SCHOOL';

    const guidelines = this.ageAppropriateGuidelines[ageGroup];
    
    const result = {
      appropriate: true,
      reason: null,
      ageGroup
    };

    // Check complexity (rough estimation based on sentence structure and vocabulary)
    const complexityScore = this.estimateComplexity(input);
    if (complexityScore > guidelines.maxComplexity) {
      result.appropriate = false;
      result.reason = `Content complexity (${complexityScore}) exceeds age-appropriate level (${guidelines.maxComplexity})`;
    }

    // Check for forbidden topics (this would be expanded with NLP in production)
    for (const forbiddenTopic of guidelines.forbiddenTopics) {
      if (input.toLowerCase().includes(forbiddenTopic.toLowerCase())) {
        result.appropriate = false;
        result.reason = `Contains topic not appropriate for age group: ${forbiddenTopic}`;
        break;
      }
    }

    return result;
  }

  // Estimate content complexity (simplified version)
  estimateComplexity(text) {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / Math.max(sentences, 1);
    
    // Count complex words (more than 2 syllables - rough estimation)
    const complexWords = text.split(/\s+/).filter(word => 
      word.length > 6 && /[aeiou].*[aeiou].*[aeiou]/i.test(word)
    ).length;
    
    const complexWordRatio = complexWords / Math.max(words, 1);
    
    // Simple complexity score
    return Math.round(
      (avgWordsPerSentence / 3) + 
      (complexWordRatio * 10) + 
      (words > 100 ? 2 : 0)
    );
  }

  // Calculate overall risk level
  calculateRiskLevel(violations) {
    if (violations.length === 0) return 'low';

    const hasHighSeverity = violations.some(v => v.severity === 'high');
    const hasMediumSeverity = violations.some(v => v.severity === 'medium');
    const hasMultipleViolations = violations.length > 2;

    if (hasHighSeverity || hasMultipleViolations) return 'high';
    if (hasMediumSeverity) return 'medium';
    return 'low';
  }

  // Generate safety recommendations
  generateSafetyRecommendations(violations) {
    const recommendations = [];

    for (const violation of violations) {
      switch (violation.type) {
        case 'jailbreak':
          recommendations.push('Focus on educational questions and avoid trying to change how I work');
          recommendations.push('Ask directly about your learning topic instead');
          break;
          
        case 'inappropriate_content':
          recommendations.push('Please keep our conversation focused on learning and education');
          recommendations.push('Ask questions about school subjects or academic topics');
          break;
          
        case 'educational_violation':
          recommendations.push('Try asking questions that help you understand the concept better');
          recommendations.push('Focus on learning the process rather than just getting answers');
          break;
          
        case 'age_inappropriate':
          recommendations.push('Let\'s talk about topics that are right for your grade level');
          break;
      }
    }

    // Remove duplicates and limit
    return [...new Set(recommendations)].slice(0, 3);
  }

  // Track suspicious activity by student
  trackSuspiciousActivity(studentId, violations) {
    const currentCount = this.suspiciousActivityCount.get(studentId) || 0;
    const newCount = currentCount + violations.filter(v => v.severity === 'high').length;
    
    this.suspiciousActivityCount.set(studentId, newCount);

    // Alert if too many violations
    if (newCount >= 5) {
      console.warn(`⚠️  High number of safety violations for student ${studentId}: ${newCount}`);
      this.logSafetyEvent({
        type: 'repeated_violations',
        studentId,
        count: newCount,
        severity: 'high',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Log safety events
  logSafetyEvent(event) {
    const logEntry = {
      id: crypto.randomBytes(8).toString('hex'),
      timestamp: new Date().toISOString(),
      ...event
    };

    this.safetyLog.push(logEntry);

    // Keep log size manageable
    if (this.safetyLog.length > 1000) {
      this.safetyLog = this.safetyLog.slice(-500);
    }

    // In production, this would go to a proper logging system
    console.log('🛡️  Safety event logged:', logEntry);
  }

  // Response safety check for AI-generated content
  async checkResponseSafety(response, originalInput, options = {}) {
    const {
      studentAge = null,
      contextType = 'general'
    } = options;

    const safetyResult = {
      safe: true,
      violations: [],
      sanitizedResponse: response,
      riskLevel: 'low'
    };

    // Check if response maintains educational focus
    if (!this.isEducationallyFocused(response)) {
      safetyResult.violations.push({
        type: 'educational_drift',
        severity: 'medium',
        message: 'Response may have drifted from educational content'
      });
    }

    // Check if response is age-appropriate
    if (studentAge) {
      const ageResult = this.checkAgeAppropriateness(response, studentAge);
      if (!ageResult.appropriate) {
        safetyResult.safe = false;
        safetyResult.violations.push({
          type: 'age_inappropriate_response',
          severity: 'high',
          reason: ageResult.reason
        });
      }
    }

    // Check for inappropriate content in response
    const contentResult = this.detectInappropriateContent(response);
    if (contentResult.detected) {
      safetyResult.safe = false;
      safetyResult.violations.push({
        type: 'inappropriate_response',
        severity: 'high',
        category: contentResult.category
      });
    }

    // Sanitize response if needed
    if (safetyResult.violations.length > 0) {
      safetyResult.sanitizedResponse = this.sanitizeResponse(response, safetyResult.violations);
    }

    safetyResult.riskLevel = this.calculateRiskLevel(safetyResult.violations);

    return safetyResult;
  }

  // Check if content maintains educational focus
  isEducationallyFocused(content) {
    const educationalWords = [
      'learn', 'understand', 'explain', 'concept', 'practice', 'study',
      'knowledge', 'skill', 'education', 'academic', 'subject', 'lesson'
    ];

    const wordCount = content.split(/\s+/).length;
    const educationalWordCount = educationalWords.filter(word => 
      content.toLowerCase().includes(word)
    ).length;

    // Check for direct answer patterns (problematic for educational AI)
    const directAnswerPatterns = [
      /(?:here are|the answers are)\s*:?\s*[a-z]\s*,\s*[a-z]/i,
      /(?:answer|solution)\s*:?\s*[a-z]\s*,?\s*[a-z]?\s*,?\s*[a-z]/i,
      /^[a-z]\s*,\s*[a-z]\s*,\s*[a-z]/i // Starting with letter sequence
    ];

    for (const pattern of directAnswerPatterns) {
      if (pattern.test(content)) {
        return false; // Direct answers are not educationally focused
      }
    }

    // Should have at least some educational focus
    return educationalWordCount > 0 || wordCount < 20; // Short responses get a pass
  }

  // Sanitize response content
  sanitizeResponse(response, violations) {
    let sanitized = response;

    // If there are serious violations, provide a safe fallback
    const hasHighSeverityViolation = violations.some(v => v.severity === 'high');
    
    if (hasHighSeverityViolation) {
      sanitized = "I'm here to help with your learning! Let's focus on educational topics. What subject would you like to explore?";
    }

    return sanitized;
  }

  // Get safety statistics
  getSafetyStats() {
    const recentLogs = this.safetyLog.slice(-100); // Last 100 events
    
    const stats = {
      totalEvents: this.safetyLog.length,
      recentEvents: recentLogs.length,
      violationTypes: {},
      riskLevels: {},
      studentsWithViolations: this.suspiciousActivityCount.size,
      timestamp: new Date().toISOString()
    };

    // Count violation types
    for (const log of recentLogs) {
      if (log.violations) {
        for (const violation of log.violations) {
          stats.violationTypes[violation.type] = (stats.violationTypes[violation.type] || 0) + 1;
        }
      }
      if (log.riskLevel) {
        stats.riskLevels[log.riskLevel] = (stats.riskLevels[log.riskLevel] || 0) + 1;
      }
    }

    return stats;
  }

  // Health check for safety system
  healthCheck() {
    return {
      status: 'healthy',
      patternsLoaded: {
        jailbreak: Object.keys(this.jailbreakPatterns).length,
        inappropriate: Object.keys(this.inappropriateContent).length,
        educational: Object.keys(this.educationalValidation).length
      },
      loggedEvents: this.safetyLog.length,
      suspiciousStudents: this.suspiciousActivityCount.size,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance and classes
const safetyFilter = new SafetyFilter();

module.exports = {
  SafetyFilter,
  safetyFilter,
  SafetyError,
  JailbreakError,
  InappropriateContentError,
  EducationalViolationError,
  JAILBREAK_PATTERNS,
  INAPPROPRIATE_CONTENT,
  EDUCATIONAL_VALIDATION,
  AGE_APPROPRIATENESS
}; 