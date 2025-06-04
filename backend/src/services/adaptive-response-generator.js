const { 
  getIntelligentLearningHistory, 
  generateContextSummary,
  DEVELOPMENT_LEVELS,
  PERFORMANCE_THRESHOLDS
} = require('./context-manager');
const { getAIService } = require('./ai-service');
const { activityMonitor } = require('./activity-monitor');

// Vocabulary complexity levels for different developmental stages
const VOCABULARY_LEVELS = {
  EARLY_ELEMENTARY: {
    maxSyllables: 2,
    preferredWords: ['big', 'small', 'make', 'find', 'look', 'think', 'good', 'bad', 'easy', 'hard'],
    avoidWords: ['analyze', 'synthesize', 'evaluate', 'conceptualize', 'fundamental', 'theoretical'],
    sentenceLength: { min: 5, max: 12 },
    readingLevel: 2.0  // 2nd grade reading level
  },
  LATE_ELEMENTARY: {
    maxSyllables: 3,
    preferredWords: ['understand', 'discover', 'explore', 'compare', 'different', 'similar', 'important', 'example'],
    avoidWords: ['conceptual', 'theoretical', 'sophisticated', 'comprehensive', 'paradigm', 'methodology'],
    sentenceLength: { min: 8, max: 18 },
    readingLevel: 4.0  // 4th grade reading level
  },
  MIDDLE_SCHOOL: {
    maxSyllables: 4,
    preferredWords: ['analyze', 'evaluate', 'investigate', 'relationship', 'pattern', 'strategy', 'evidence', 'conclusion'],
    avoidWords: ['paradigmatic', 'epistemological', 'ontological', 'phenomenological', 'heuristic'],
    sentenceLength: { min: 10, max: 25 },
    readingLevel: 6.5  // 6th-7th grade reading level
  },
  HIGH_SCHOOL: {
    maxSyllables: 5,
    preferredWords: ['synthesize', 'conceptualize', 'hypothesis', 'methodology', 'theoretical', 'comprehensive', 'sophisticated'],
    avoidWords: [], // Can use advanced vocabulary
    sentenceLength: { min: 12, max: 30 },
    readingLevel: 9.0  // 9th grade reading level
  }
};

// Example types and metaphors appropriate for each level
const EXAMPLE_FRAMEWORKS = {
  EARLY_ELEMENTARY: {
    metaphors: ['like building with blocks', 'like counting toys', 'like sorting colors', 'like playing a game'],
    examples: ['using fingers to count', 'drawing pictures', 'using real objects', 'acting it out'],
    contexts: ['home', 'playground', 'classroom', 'family', 'pets', 'toys']
  },
  LATE_ELEMENTARY: {
    metaphors: ['like solving a puzzle', 'like following a recipe', 'like being a detective', 'like exploring a map'],
    examples: ['sports statistics', 'cooking measurements', 'nature observations', 'simple experiments'],
    contexts: ['school subjects', 'hobbies', 'community', 'simple science', 'basic history']
  },
  MIDDLE_SCHOOL: {
    metaphors: ['like conducting an experiment', 'like being an architect', 'like solving a mystery', 'like building a bridge'],
    examples: ['social media analytics', 'video game strategies', 'environmental data', 'historical patterns'],
    contexts: ['technology', 'social issues', 'current events', 'interdisciplinary connections']
  },
  HIGH_SCHOOL: {
    metaphors: ['like developing a theory', 'like conducting research', 'like creating a model', 'like analyzing systems'],
    examples: ['economic trends', 'scientific research', 'literary analysis', 'philosophical questions'],
    contexts: ['abstract concepts', 'complex systems', 'real-world applications', 'future implications']
  }
};

// Response adaptation strategies for different emotional states and performance levels
const ADAPTATION_STRATEGIES = {
  STRUGGLING: {
    simplification: 'high',
    encouragement: 'frequent',
    examples: 'concrete_multiple',
    pacing: 'slow',
    repetition: 'high',
    confidence_building: true
  },
  DEVELOPING: {
    simplification: 'moderate',
    encouragement: 'regular',
    examples: 'mixed_concrete_abstract',
    pacing: 'moderate',
    repetition: 'moderate',
    confidence_building: true
  },
  PROFICIENT: {
    simplification: 'minimal',
    encouragement: 'periodic',
    examples: 'abstract_with_concrete',
    pacing: 'normal',
    repetition: 'low',
    confidence_building: false
  },
  ADVANCED: {
    simplification: 'none',
    encouragement: 'achievement_focused',
    examples: 'abstract_complex',
    pacing: 'fast',
    repetition: 'minimal',
    challenge_extension: true
  }
};

// Error classes for adaptive response generation
class AdaptiveResponseError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'AdaptiveResponseError';
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

class AdaptiveResponseGenerator {
  constructor() {
    this.vocabularyLevels = VOCABULARY_LEVELS;
    this.exampleFrameworks = EXAMPLE_FRAMEWORKS;
    this.adaptationStrategies = ADAPTATION_STRATEGIES;
    this.aiService = getAIService();
  }

  // Main method to generate adaptive responses
  async generateAdaptiveResponse(options = {}) {
    try {
      const {
        studentId,
        originalPrompt,
        rawResponse = null,
        studentAge = null,
        subject = 'general',
        difficulty = 'medium',
        emotionalState = null,
        sessionContext = {},
        maxRetries = 2
      } = options;

      // Validate inputs
      if (!studentId || !originalPrompt) {
        throw new AdaptiveResponseError('studentId and originalPrompt are required');
      }

      // Get student's learning profile and developmental level
      const learningProfile = await this.getStudentLearningProfile(studentId, originalPrompt, {
        studentAge,
        subject,
        difficulty
      });

      // Generate or adapt the response
      let adaptedResponse;
      if (rawResponse) {
        // Adapt existing response
        adaptedResponse = await this.adaptExistingResponse(rawResponse, learningProfile, options);
      } else {
        // Generate new adaptive response
        adaptedResponse = await this.generateNewAdaptiveResponse(originalPrompt, learningProfile, options);
      }

      // Log the adaptation for monitoring
      await this.logAdaptationActivity(studentId, {
        originalPrompt,
        adaptedResponse: adaptedResponse.text,
        developmentLevel: learningProfile.developmentLevel,
        adaptationFactors: adaptedResponse.adaptationFactors,
        learningProfile
      });

      return {
        text: adaptedResponse.text,
        developmentLevel: learningProfile.developmentLevel,
        adaptationFactors: adaptedResponse.adaptationFactors,
        learningProfile: learningProfile.summary,
        responseMetadata: {
          adapted: true,
          originalLength: rawResponse?.length || 0,
          adaptedLength: adaptedResponse.text.length,
          vocabularyLevel: learningProfile.vocabularyLevel,
          readingLevel: learningProfile.targetReadingLevel,
          adaptationStrategies: adaptedResponse.adaptationStrategies
        }
      };

    } catch (error) {
      console.error('❌ Adaptive response generation failed:', error);
      
      // Return fallback response
      return this.generateFallbackResponse(options, error);
    }
  }

  // Get comprehensive student learning profile
  async getStudentLearningProfile(studentId, currentContent, options = {}) {
    try {
      const { studentAge, subject, difficulty } = options;

      // Get intelligent learning history
      const learningHistory = await getIntelligentLearningHistory(studentId, currentContent, {
        maxContexts: 10,
        includeEmotionalState: true,
        includePerformanceMetrics: true,
        studentAge,
        currentSubject: subject,
        currentDifficulty: difficulty
      });

      // Determine development level
      const developmentLevel = this.determineDevelopmentLevel(
        studentAge, 
        learningHistory.learningPatterns,
        learningHistory.developmentAssessment
      );

      // Assess performance level
      const performanceLevel = this.assessPerformanceLevel(learningHistory.learningPatterns);

      // Get vocabulary and complexity preferences
      const vocabularyLevel = this.vocabularyLevels[developmentLevel];
      const exampleFramework = this.exampleFrameworks[developmentLevel];
      const adaptationStrategy = this.adaptationStrategies[performanceLevel];

      // Analyze emotional patterns
      const emotionalProfile = this.analyzeEmotionalPatterns(learningHistory.learningPatterns);

      return {
        studentId,
        developmentLevel,
        performanceLevel,
        vocabularyLevel,
        exampleFramework,
        adaptationStrategy,
        emotionalProfile,
        targetReadingLevel: vocabularyLevel.readingLevel,
        learningPatterns: learningHistory.learningPatterns,
        recommendations: learningHistory.recommendations,
        summary: {
          level: developmentLevel,
          performance: performanceLevel,
          readingLevel: vocabularyLevel.readingLevel,
          adaptationNeeds: adaptationStrategy,
          emotionalConsiderations: emotionalProfile.dominantEmotions,
          strugglesIn: learningHistory.learningPatterns.struggleAreas.map(([area]) => area),
          strengthsIn: learningHistory.learningPatterns.strengthAreas.map(([area]) => area)
        }
      };

    } catch (error) {
      console.warn('⚠️ Could not get complete learning profile, using defaults:', error.message);
      
      // Return default profile based on age if available
      const defaultLevel = options.studentAge ? this.getDefaultDevelopmentLevel(options.studentAge) : 'MIDDLE_SCHOOL';
      
      return {
        studentId,
        developmentLevel: defaultLevel,
        performanceLevel: 'DEVELOPING',
        vocabularyLevel: this.vocabularyLevels[defaultLevel],
        exampleFramework: this.exampleFrameworks[defaultLevel],
        adaptationStrategy: this.adaptationStrategies.DEVELOPING,
        emotionalProfile: { dominantEmotions: ['neutral'], needsSupport: false },
        targetReadingLevel: this.vocabularyLevels[defaultLevel].readingLevel,
        summary: {
          level: defaultLevel,
          performance: 'DEVELOPING',
          readingLevel: this.vocabularyLevels[defaultLevel].readingLevel,
          default: true
        }
      };
    }
  }

  // Determine appropriate development level
  determineDevelopmentLevel(studentAge, learningPatterns, developmentAssessment) {
    // Use assessment if available
    if (developmentAssessment && developmentAssessment.level) {
      return developmentAssessment.level;
    }

    // Use age-based determination
    if (studentAge) {
      return this.getDefaultDevelopmentLevel(studentAge);
    }

    // Use performance-based estimation
    if (learningPatterns && learningPatterns.averagePerformance !== null) {
      const avgPerf = learningPatterns.averagePerformance;
      if (avgPerf < 0.4) return 'EARLY_ELEMENTARY';
      if (avgPerf < 0.6) return 'LATE_ELEMENTARY';
      if (avgPerf < 0.8) return 'MIDDLE_SCHOOL';
      return 'HIGH_SCHOOL';
    }

    return 'MIDDLE_SCHOOL'; // Default
  }

  // Get default development level based on age
  getDefaultDevelopmentLevel(age) {
    for (const [level, info] of Object.entries(DEVELOPMENT_LEVELS)) {
      if (age >= info.ageRange[0] && age <= info.ageRange[1]) {
        return level;
      }
    }
    return 'MIDDLE_SCHOOL'; // Default for out-of-range ages
  }

  // Assess performance level for adaptation strategy
  assessPerformanceLevel(learningPatterns) {
    if (!learningPatterns || learningPatterns.averagePerformance === null) {
      return 'DEVELOPING';
    }

    const avgPerf = learningPatterns.averagePerformance;
    
    if (avgPerf >= PERFORMANCE_THRESHOLDS.ADVANCED) return 'ADVANCED';
    if (avgPerf >= PERFORMANCE_THRESHOLDS.PROFICIENT) return 'PROFICIENT';
    if (avgPerf >= PERFORMANCE_THRESHOLDS.DEVELOPING) return 'DEVELOPING';
    return 'STRUGGLING';
  }

  // Analyze emotional patterns for response tone adaptation
  analyzeEmotionalPatterns(learningPatterns) {
    const emotionalPatterns = learningPatterns.emotionalPatterns || {};
    const sortedEmotions = Object.entries(emotionalPatterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    const dominantEmotions = sortedEmotions.map(([emotion]) => emotion);
    
    const negativeEmotions = ['frustrated', 'confused', 'anxious', 'bored', 'overwhelmed'];
    const positiveEmotions = ['engaged', 'confident', 'curious', 'excited', 'proud'];
    
    const needsSupport = dominantEmotions.some(emotion => negativeEmotions.includes(emotion));
    const showingPositivity = dominantEmotions.some(emotion => positiveEmotions.includes(emotion));

    return {
      dominantEmotions,
      needsSupport,
      showingPositivity,
      adaptationRecommendations: this.getEmotionalAdaptationRecommendations(dominantEmotions)
    };
  }

  // Get emotional adaptation recommendations
  getEmotionalAdaptationRecommendations(dominantEmotions) {
    const recommendations = [];

    dominantEmotions.forEach(emotion => {
      switch (emotion) {
        case 'frustrated':
          recommendations.push('Use calming, supportive language');
          recommendations.push('Break down complex concepts into smaller steps');
          recommendations.push('Provide extra encouragement');
          break;
        case 'confused':
          recommendations.push('Use clear, simple explanations');
          recommendations.push('Provide multiple examples');
          recommendations.push('Check understanding frequently');
          break;
        case 'confident':
          recommendations.push('Provide appropriate challenges');
          recommendations.push('Encourage deeper exploration');
          recommendations.push('Use achievement-focused language');
          break;
        case 'engaged':
          recommendations.push('Build on curiosity');
          recommendations.push('Introduce related concepts');
          recommendations.push('Encourage questions');
          break;
        case 'anxious':
          recommendations.push('Use reassuring, patient tone');
          recommendations.push('Normalize struggle and mistakes');
          recommendations.push('Provide structure and predictability');
          break;
      }
    });

    return recommendations;
  }

  // Adapt existing response to student's developmental level
  async adaptExistingResponse(rawResponse, learningProfile, options = {}) {
    const adaptationFactors = [];
    let adaptedText = rawResponse;

    // 1. Vocabulary simplification/complexification
    adaptedText = this.adaptVocabulary(adaptedText, learningProfile, adaptationFactors);

    // 2. Sentence structure adaptation
    adaptedText = this.adaptSentenceStructure(adaptedText, learningProfile, adaptationFactors);

    // 3. Example and metaphor replacement
    adaptedText = await this.adaptExamplesAndMetaphors(adaptedText, learningProfile, options, adaptationFactors);

    // 4. Emotional tone adaptation
    adaptedText = this.adaptEmotionalTone(adaptedText, learningProfile, adaptationFactors);

    // 5. Add developmental-appropriate encouragement
    adaptedText = this.addAppropriateEncouragement(adaptedText, learningProfile, adaptationFactors);

    return {
      text: adaptedText,
      adaptationFactors,
      adaptationStrategies: learningProfile.adaptationStrategy
    };
  }

  // Generate new adaptive response from scratch
  async generateNewAdaptiveResponse(originalPrompt, learningProfile, options = {}) {
    const { subject, emotionalState, sessionContext } = options;

    // Build adaptive prompt based on learning profile
    const adaptivePrompt = await this.buildAdaptivePrompt(originalPrompt, learningProfile, {
      subject,
      emotionalState,
      sessionContext
    });

    // Generate response using AI service
    const aiResponse = await this.aiService.generateResponse(adaptivePrompt, {
      temperature: 0.7,
      maxTokens: this.calculateMaxTokens(learningProfile),
      topP: 0.9
    });

    // Further adapt the generated response
    const adaptedResponse = await this.adaptExistingResponse(aiResponse.text, learningProfile, options);

    return {
      ...adaptedResponse,
      originalAIResponse: aiResponse.text,
      adaptivePromptUsed: adaptivePrompt
    };
  }

  // Build adaptive prompt based on learning profile
  async buildAdaptivePrompt(originalPrompt, learningProfile, options = {}) {
    let adaptivePrompt = `You are an educational AI assistant helping a student. `;

    // Add developmental level context
    adaptivePrompt += `The student is at ${learningProfile.developmentLevel.replace('_', ' ').toLowerCase()} level. `;

    // Add performance level context
    adaptivePrompt += `Their current performance level is ${learningProfile.performanceLevel.toLowerCase()}. `;

    // Add vocabulary guidance
    const vocabLevel = learningProfile.vocabularyLevel;
    adaptivePrompt += `Use vocabulary appropriate for grade ${vocabLevel.readingLevel} reading level. `;
    adaptivePrompt += `Keep sentences between ${vocabLevel.sentenceLength.min}-${vocabLevel.sentenceLength.max} words. `;

    // Add emotional considerations
    if (learningProfile.emotionalProfile.needsSupport) {
      adaptivePrompt += `The student may need emotional support. Use encouraging, patient language. `;
    }

    // Add specific adaptation strategies
    const strategy = learningProfile.adaptationStrategy;
    if (strategy.encouragement === 'frequent') {
      adaptivePrompt += `Provide frequent positive reinforcement. `;
    }
    if (strategy.examples === 'concrete_multiple') {
      adaptivePrompt += `Use multiple concrete, real-world examples. `;
    }
    if (strategy.pacing === 'slow') {
      adaptivePrompt += `Break information into small, digestible chunks. `;
    }

    // Add example framework guidance
    const framework = learningProfile.exampleFramework;
    if (framework && framework.contexts && framework.contexts.length > 0) {
      adaptivePrompt += `Use examples from these contexts: ${framework.contexts.join(', ')}. `;
    }

    // Add the original prompt
    adaptivePrompt += `\n\nStudent's question or content: ${originalPrompt}`;

    return adaptivePrompt;
  }

  // Calculate maximum tokens based on developmental level
  calculateMaxTokens(learningProfile) {
    const baseLimits = {
      EARLY_ELEMENTARY: 300,
      LATE_ELEMENTARY: 500,
      MIDDLE_SCHOOL: 800,
      HIGH_SCHOOL: 1200
    };

    const base = baseLimits[learningProfile.developmentLevel] || 600;
    
    // Adjust based on performance level
    const performanceMultiplier = {
      STRUGGLING: 0.8,  // Shorter responses for struggling students
      DEVELOPING: 1.0,
      PROFICIENT: 1.2,
      ADVANCED: 1.5     // Longer, more detailed responses for advanced students
    };

    return Math.round(base * (performanceMultiplier[learningProfile.performanceLevel] || 1.0));
  }

  // Adapt vocabulary complexity
  adaptVocabulary(text, learningProfile, adaptationFactors) {
    const vocabLevel = learningProfile.vocabularyLevel;
    let adaptedText = text;
    let replacements = 0;

    // Simple vocabulary replacement mapping
    const vocabularyMap = {
      // Complex to simple mappings for lower levels
      'analyze': learningProfile.developmentLevel === 'EARLY_ELEMENTARY' ? 'look at' : 
                learningProfile.developmentLevel === 'LATE_ELEMENTARY' ? 'study' : 'analyze',
      'synthesize': learningProfile.developmentLevel === 'EARLY_ELEMENTARY' ? 'put together' :
                   learningProfile.developmentLevel === 'LATE_ELEMENTARY' ? 'combine' : 'synthesize',
      'evaluate': learningProfile.developmentLevel === 'EARLY_ELEMENTARY' ? 'check' :
                 learningProfile.developmentLevel === 'LATE_ELEMENTARY' ? 'judge' : 'evaluate',
      'methodology': learningProfile.developmentLevel === 'EARLY_ELEMENTARY' ? 'way' :
                    learningProfile.developmentLevel === 'LATE_ELEMENTARY' ? 'method' : 'methodology',
      'fundamental': learningProfile.developmentLevel === 'EARLY_ELEMENTARY' ? 'basic' :
                    learningProfile.developmentLevel === 'LATE_ELEMENTARY' ? 'important' : 'fundamental',
      'theoretical': learningProfile.developmentLevel === 'EARLY_ELEMENTARY' ? 'idea' :
                    learningProfile.developmentLevel === 'LATE_ELEMENTARY' ? 'concept' : 'theoretical',
      'conceptualize': learningProfile.developmentLevel === 'EARLY_ELEMENTARY' ? 'think about' :
                     learningProfile.developmentLevel === 'LATE_ELEMENTARY' ? 'understand' : 'conceptualize'
    };

    // Apply vocabulary replacements
    Object.entries(vocabularyMap).forEach(([complex, simple]) => {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      if (regex.test(adaptedText) && complex !== simple) {
        adaptedText = adaptedText.replace(regex, simple);
        replacements++;
      }
    });

    if (replacements > 0) {
      adaptationFactors.push(`Simplified ${replacements} vocabulary terms for ${learningProfile.developmentLevel}`);
    }

    return adaptedText;
  }

  // Adapt sentence structure and complexity
  adaptSentenceStructure(text, learningProfile, adaptationFactors) {
    const targetLength = learningProfile.vocabularyLevel.sentenceLength;
    let adaptedText = text;
    let modifications = 0;

    // Split into sentences
    const sentences = adaptedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const adaptedSentences = sentences.map(sentence => {
      const words = sentence.trim().split(/\s+/);
      
      // If sentence is too long, try to break it down
      if (words.length > targetLength.max) {
        // Simple sentence splitting on conjunctions
        const conjunctions = ['and', 'but', 'or', 'so', 'because', 'although', 'while'];
        let adapted = sentence;
        
        conjunctions.forEach(conj => {
          const parts = adapted.split(new RegExp(`\\s+${conj}\\s+`, 'i'));
          if (parts.length > 1 && parts[0].trim().split(/\s+/).length > targetLength.min) {
            adapted = parts.join('. ');
            modifications++;
          }
        });
        
        return adapted;
      }
      
      return sentence;
    });

    adaptedText = adaptedSentences.join('. ') + '.';

    if (modifications > 0) {
      adaptationFactors.push(`Simplified ${modifications} complex sentences for readability`);
    }

    return adaptedText;
  }

  // Adapt examples and metaphors
  async adaptExamplesAndMetaphors(text, learningProfile, options, adaptationFactors) {
    const framework = learningProfile.exampleFramework;
    let adaptedText = text;
    let replacements = 0;

    // Simple metaphor replacement based on developmental level
    const metaphorMap = {
      'like conducting research': framework.metaphors[0] || 'like solving a puzzle',
      'theoretical framework': learningProfile.developmentLevel === 'EARLY_ELEMENTARY' ? 'set of ideas' : 
                              learningProfile.developmentLevel === 'LATE_ELEMENTARY' ? 'way of thinking' : 'theoretical framework',
      'systematic approach': learningProfile.developmentLevel === 'EARLY_ELEMENTARY' ? 'step-by-step way' :
                            learningProfile.developmentLevel === 'LATE_ELEMENTARY' ? 'organized method' : 'systematic approach'
    };

    // Apply metaphor replacements
    Object.entries(metaphorMap).forEach(([complex, simple]) => {
      const regex = new RegExp(complex, 'gi');
      if (regex.test(adaptedText) && complex !== simple) {
        adaptedText = adaptedText.replace(regex, simple);
        replacements++;
      }
    });

    if (replacements > 0) {
      adaptationFactors.push(`Adapted ${replacements} examples/metaphors for developmental level`);
    }

    return adaptedText;
  }

  // Adapt emotional tone
  adaptEmotionalTone(text, learningProfile, adaptationFactors) {
    const emotionalProfile = learningProfile.emotionalProfile;
    let adaptedText = text;
    let modifications = 0;

    // Add supportive language for students who need it
    if (emotionalProfile.needsSupport) {
      // Add encouraging phrases
      const encouragingPhrases = [
        "You're doing great! ",
        "This is a normal part of learning. ",
        "Take your time with this. ",
        "I believe you can figure this out. "
      ];

      // Add one at the beginning if the tone seems neutral or negative
      if (!text.toLowerCase().includes("great") && !text.toLowerCase().includes("excellent")) {
        const randomPhrase = encouragingPhrases[Math.floor(Math.random() * encouragingPhrases.length)];
        adaptedText = randomPhrase + adaptedText;
        modifications++;
      }
    }

    // Adjust tone for confident students
    if (emotionalProfile.showingPositivity && learningProfile.performanceLevel === 'ADVANCED') {
      // Add challenge-oriented language
      adaptedText = adaptedText.replace(/Let's try/g, "Let's explore");
      adaptedText = adaptedText.replace(/This might be/g, "This could be");
      modifications++;
    }

    if (modifications > 0) {
      adaptationFactors.push(`Adapted emotional tone for student's emotional state`);
    }

    return adaptedText;
  }

  // Add appropriate encouragement
  addAppropriateEncouragement(text, learningProfile, adaptationFactors) {
    const strategy = learningProfile.adaptationStrategy;
    let adaptedText = text;

    if (strategy.encouragement === 'frequent' && !text.toLowerCase().includes('great') && !text.toLowerCase().includes('excellent')) {
      // Add encouraging closing
      const encouragements = {
        EARLY_ELEMENTARY: [
          "You're such a good learner!",
          "Keep up the great work!",
          "I'm proud of your thinking!"
        ],
        LATE_ELEMENTARY: [
          "You're developing strong problem-solving skills!",
          "Your thinking is getting stronger!",
          "Great job working through this!"
        ],
        MIDDLE_SCHOOL: [
          "Your analytical thinking is impressive!",
          "You're developing sophisticated reasoning skills!",
          "I appreciate your thoughtful approach!"
        ],
        HIGH_SCHOOL: [
          "Your intellectual curiosity is excellent!",
          "You're demonstrating advanced critical thinking!",
          "Your reasoning shows real depth!"
        ]
      };

      const levelEncouragements = encouragements[learningProfile.developmentLevel] || encouragements.MIDDLE_SCHOOL;
      const randomEncouragement = levelEncouragements[Math.floor(Math.random() * levelEncouragements.length)];
      
      adaptedText += ` ${randomEncouragement}`;
      adaptationFactors.push('Added developmental-appropriate encouragement');
    }

    return adaptedText;
  }

  // Log adaptation activity for monitoring
  async logAdaptationActivity(studentId, adaptationData) {
    try {
      await activityMonitor.logActivity({
        studentId,
        sessionId: `adaptation-${Date.now()}`,
        activityType: 'adaptive_response_generation',
        details: {
          developmentLevel: adaptationData.developmentLevel,
          adaptationFactors: adaptationData.adaptationFactors,
          originalPromptLength: adaptationData.originalPrompt.length,
          adaptedResponseLength: adaptationData.adaptedResponse.length,
          learningProfileSummary: adaptationData.learningProfile
        },
        severity: 'low',
        context: {
          feature: 'adaptive_response_generator',
          adaptive_success: true
        }
      });
    } catch (error) {
      console.warn('⚠️ Could not log adaptation activity:', error.message);
    }
  }

  // Generate fallback response if adaptation fails
  generateFallbackResponse(options, error) {
    const { originalPrompt, studentAge } = options;
    const developmentLevel = studentAge ? this.getDefaultDevelopmentLevel(studentAge) : 'MIDDLE_SCHOOL';
    
    return {
      text: `I understand you're asking about: "${originalPrompt}". Let me help you explore this step by step. What specific part would you like to focus on first?`,
      developmentLevel,
      adaptationFactors: ['Used fallback response due to adaptation error'],
      learningProfile: { level: developmentLevel, default: true, error: error.message },
      responseMetadata: {
        adapted: false,
        fallback: true,
        error: error.message
      }
    };
  }

  // Health check for the adaptive response generator
  async healthCheck() {
    try {
      const aiHealth = await this.aiService.checkHealth();
      
      return {
        status: 'healthy',
        service: 'adaptive-response-generator',
        dependencies: {
          aiService: aiHealth.overall,
          contextManager: true, // Assume healthy if no errors
          activityMonitor: true  // Assume healthy if no errors
        },
        features: {
          vocabularyLevels: Object.keys(this.vocabularyLevels).length,
          exampleFrameworks: Object.keys(this.exampleFrameworks).length,
          adaptationStrategies: Object.keys(this.adaptationStrategies).length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'adaptive-response-generator',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
let adaptiveResponseGeneratorInstance = null;

const getAdaptiveResponseGenerator = () => {
  if (!adaptiveResponseGeneratorInstance) {
    adaptiveResponseGeneratorInstance = new AdaptiveResponseGenerator();
  }
  return adaptiveResponseGeneratorInstance;
};

module.exports = {
  AdaptiveResponseGenerator,
  getAdaptiveResponseGenerator,
  AdaptiveResponseError,
  VOCABULARY_LEVELS,
  EXAMPLE_FRAMEWORKS,
  ADAPTATION_STRATEGIES
}; 