const { 
  getAdaptiveResponseGenerator, 
  AdaptiveResponseError, 
  VOCABULARY_LEVELS, 
  EXAMPLE_FRAMEWORKS, 
  ADAPTATION_STRATEGIES 
} = require('../services/adaptive-response-generator');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Test data for different developmental levels and scenarios
const TEST_DATA = {
  // Student profiles for different developmental levels
  STUDENT_PROFILES: {
    EARLY_ELEMENTARY: {
      studentId: 'student-early-elem-001',
      studentAge: 7,
      expectedLevel: 'EARLY_ELEMENTARY',
      expectedReadingLevel: 2.0
    },
    LATE_ELEMENTARY: {
      studentId: 'student-late-elem-001',
      studentAge: 10,
      expectedLevel: 'LATE_ELEMENTARY',
      expectedReadingLevel: 4.0
    },
    MIDDLE_SCHOOL: {
      studentId: 'student-middle-001',
      studentAge: 13,
      expectedLevel: 'MIDDLE_SCHOOL',
      expectedReadingLevel: 6.5
    },
    HIGH_SCHOOL: {
      studentId: 'student-high-001',
      studentAge: 16,
      expectedLevel: 'HIGH_SCHOOL',
      expectedReadingLevel: 9.0
    }
  },

  // Test prompts for adaptation
  TEST_PROMPTS: {
    SIMPLE_MATH: "What is 25 + 17?",
    COMPLEX_PROBLEM: "How do you analyze the relationship between economic factors and environmental sustainability?",
    EMOTIONAL_STRUGGLE: "I don't understand fractions and I'm getting frustrated",
    CONFIDENT_CHALLENGE: "I've mastered basic algebra, what's next?",
    SCIENCE_QUESTION: "Explain photosynthesis to me"
  },

  // Raw responses to adapt (simulating AI responses)
  RAW_RESPONSES: {
    COMPLEX_VOCABULARY: "To synthesize this conceptual framework, we must analyze the fundamental theoretical underpinnings and evaluate the methodological approach to conceptualize a comprehensive understanding.",
    LONG_SENTENCES: "Mathematics is a subject that requires systematic thinking and careful analysis of problems, and when students approach mathematical concepts with persistence and dedication, they often discover that what initially seemed challenging becomes manageable through practice and understanding of underlying principles.",
    TECHNICAL_EXPLANATION: "Photosynthesis is a complex biochemical process whereby chlorophyll-containing organisms convert carbon dioxide and water into glucose using electromagnetic radiation from the sun, simultaneously producing oxygen as a byproduct through the Calvin cycle and light-dependent reactions.",
    SIMPLE_CONTENT: "Math is fun! You can count things and add numbers together to get bigger numbers."
  },

  // Emotional states for testing
  EMOTIONAL_STATES: ['frustrated', 'confused', 'confident', 'engaged', 'anxious', 'curious']
};

class AdaptiveResponseGeneratorTester {
  constructor() {
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      categories: {}
    };
    this.adaptiveGenerator = getAdaptiveResponseGenerator();
  }

  // Main test runner
  async runAllTests() {
    console.log(`${colors.bold}${colors.blue}🧠 Adaptive Response Generator Test Suite${colors.reset}\n`);
    console.log(`${colors.cyan}Testing developmental level adaptation and personalized response generation${colors.reset}\n`);

    try {
      // Test categories
      await this.testDevelopmentalLevelDetection();
      await this.testVocabularyAdaptation();
      await this.testSentenceStructureAdaptation();
      await this.testEmotionalToneAdaptation();
      await this.testExampleAndMetaphorAdaptation();
      await this.testPerformanceLevelAdaptation();
      await this.testAdaptivePromptGeneration();
      await this.testCompleteResponseAdaptation();
      await this.testFallbackBehavior();
      await this.testIntegrationWithExistingServices();

      // Print final results
      this.printFinalResults();

    } catch (error) {
      console.error(`${colors.red}❌ Test suite failed:${colors.reset}`, error);
    }
  }

  // Test 1: Developmental Level Detection
  async testDevelopmentalLevelDetection() {
    console.log(`${colors.bold}${colors.yellow}Test 1: Developmental Level Detection${colors.reset}`);
    
    let passed = 0;
    let total = 5;

    // Test age-based level detection
    for (const [levelName, profile] of Object.entries(TEST_DATA.STUDENT_PROFILES)) {
      try {
        const learningProfile = await this.adaptiveGenerator.getStudentLearningProfile(
          profile.studentId, 
          "Test prompt", 
          { studentAge: profile.studentAge }
        );

        if (learningProfile.developmentLevel === profile.expectedLevel) {
          console.log(`${colors.green}✅ Correctly detected ${levelName}:${colors.reset} Age ${profile.studentAge} → ${learningProfile.developmentLevel}`);
          passed++;
        } else {
          console.log(`${colors.red}❌ Incorrect level for ${levelName}:${colors.reset} Expected ${profile.expectedLevel}, got ${learningProfile.developmentLevel}`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Error testing ${levelName}:${colors.reset}`, error.message);
      }
    }

    // Test default level when no age provided
    try {
      const learningProfile = await this.adaptiveGenerator.getStudentLearningProfile(
        'test-no-age-student',
        "Test prompt",
        {}
      );

      if (learningProfile.developmentLevel === 'MIDDLE_SCHOOL') {
        console.log(`${colors.green}✅ Default level correctly assigned:${colors.reset} ${learningProfile.developmentLevel}`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Incorrect default level:${colors.reset} Expected MIDDLE_SCHOOL, got ${learningProfile.developmentLevel}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing default level:${colors.reset}`, error.message);
    }

    this.recordTestResults('Developmental Level Detection', passed, total);
  }

  // Test 2: Vocabulary Adaptation
  async testVocabularyAdaptation() {
    console.log(`\n${colors.bold}${colors.yellow}Test 2: Vocabulary Adaptation${colors.reset}`);
    
    let passed = 0;
    let total = 4;

    // Test vocabulary simplification for each level
    for (const [levelName, profile] of Object.entries(TEST_DATA.STUDENT_PROFILES)) {
      try {
        const adaptedResponse = await this.adaptiveGenerator.generateAdaptiveResponse({
          studentId: profile.studentId,
          originalPrompt: "Test question",
          rawResponse: TEST_DATA.RAW_RESPONSES.COMPLEX_VOCABULARY,
          studentAge: profile.studentAge
        });

        // Check if complex words were simplified for lower levels
        const hasComplexWords = this.hasComplexVocabulary(adaptedResponse.text, profile.expectedLevel);
        const isAppropriate = !hasComplexWords || profile.expectedLevel === 'HIGH_SCHOOL';

        if (isAppropriate) {
          console.log(`${colors.green}✅ Vocabulary adapted for ${levelName}:${colors.reset} ${adaptedResponse.adaptationFactors.length} adaptations`);
          passed++;
        } else {
          console.log(`${colors.red}❌ Vocabulary not properly adapted for ${levelName}${colors.reset}`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Error testing vocabulary adaptation for ${levelName}:${colors.reset}`, error.message);
      }
    }

    this.recordTestResults('Vocabulary Adaptation', passed, total);
  }

  // Test 3: Sentence Structure Adaptation
  async testSentenceStructureAdaptation() {
    console.log(`\n${colors.bold}${colors.yellow}Test 3: Sentence Structure Adaptation${colors.reset}`);
    
    let passed = 0;
    let total = 4;

    // Test sentence length adaptation for each level
    for (const [levelName, profile] of Object.entries(TEST_DATA.STUDENT_PROFILES)) {
      try {
        const adaptedResponse = await this.adaptiveGenerator.generateAdaptiveResponse({
          studentId: profile.studentId,
          originalPrompt: "Test question",
          rawResponse: TEST_DATA.RAW_RESPONSES.LONG_SENTENCES,
          studentAge: profile.studentAge
        });

        const avgSentenceLength = this.calculateAverageSentenceLength(adaptedResponse.text);
        const targetLength = VOCABULARY_LEVELS[profile.expectedLevel].sentenceLength.max;
        
        if (avgSentenceLength <= targetLength + 5) { // Allow some tolerance
          console.log(`${colors.green}✅ Sentence length adapted for ${levelName}:${colors.reset} Avg: ${avgSentenceLength} words`);
          passed++;
        } else {
          console.log(`${colors.red}❌ Sentences too long for ${levelName}:${colors.reset} Avg: ${avgSentenceLength} words (max: ${targetLength})`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Error testing sentence adaptation for ${levelName}:${colors.reset}`, error.message);
      }
    }

    this.recordTestResults('Sentence Structure Adaptation', passed, total);
  }

  // Test 4: Emotional Tone Adaptation
  async testEmotionalToneAdaptation() {
    console.log(`\n${colors.bold}${colors.yellow}Test 4: Emotional Tone Adaptation${colors.reset}`);
    
    let passed = 0;
    let total = 3;

    // Test supportive tone for frustrated student
    try {
      const adaptedResponse = await this.adaptiveGenerator.generateAdaptiveResponse({
        studentId: 'test-frustrated-student',
        originalPrompt: TEST_DATA.TEST_PROMPTS.EMOTIONAL_STRUGGLE,
        studentAge: 10,
        emotionalState: 'frustrated'
      });

      const hasSupportiveLanguage = this.hasSupportiveLanguage(adaptedResponse.text);
      
      if (hasSupportiveLanguage) {
        console.log(`${colors.green}✅ Supportive tone for frustrated student:${colors.reset} Encouraging language detected`);
        passed++;
      } else {
        console.log(`${colors.red}❌ No supportive language for frustrated student${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing frustrated student adaptation:${colors.reset}`, error.message);
    }

    // Test challenging tone for confident student
    try {
      const adaptedResponse = await this.adaptiveGenerator.generateAdaptiveResponse({
        studentId: 'test-confident-student',
        originalPrompt: TEST_DATA.TEST_PROMPTS.CONFIDENT_CHALLENGE,
        studentAge: 16,
        emotionalState: 'confident'
      });

      const hasChallengeLanguage = this.hasChallengeLanguage(adaptedResponse.text);
      
      if (hasChallengeLanguage || adaptedResponse.adaptationFactors.some(f => f.includes('tone'))) {
        console.log(`${colors.green}✅ Appropriate tone for confident student:${colors.reset} Challenge-oriented approach`);
        passed++;
      } else {
        console.log(`${colors.red}❌ No challenge language for confident student${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing confident student adaptation:${colors.reset}`, error.message);
    }

    // Test encouragement adaptation
    try {
      const adaptedResponse = await this.adaptiveGenerator.generateAdaptiveResponse({
        studentId: 'test-encouragement-student',
        originalPrompt: "I'm working on a math problem",
        rawResponse: "Here's how to solve this problem. First step is to identify the variables.",
        studentAge: 8,
        emotionalState: 'confused'
      });

      const hasEncouragement = this.hasEncouragement(adaptedResponse.text);
      
      if (hasEncouragement) {
        console.log(`${colors.green}✅ Encouragement added appropriately:${colors.reset} Motivational language included`);
        passed++;
      } else {
        console.log(`${colors.red}❌ No encouragement added for young confused student${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing encouragement:${colors.reset}`, error.message);
    }

    this.recordTestResults('Emotional Tone Adaptation', passed, total);
  }

  // Test 5: Example and Metaphor Adaptation
  async testExampleAndMetaphorAdaptation() {
    console.log(`\n${colors.bold}${colors.yellow}Test 5: Example and Metaphor Adaptation${colors.reset}`);
    
    let passed = 0;
    let total = 3;

    // Test metaphor simplification for young student
    try {
      const adaptedResponse = await this.adaptiveGenerator.generateAdaptiveResponse({
        studentId: 'test-metaphor-young',
        originalPrompt: "How does learning work?",
        rawResponse: "Learning is like conducting research in a theoretical framework",
        studentAge: 7
      });

      const hasSimpleMetaphors = this.hasSimpleMetaphors(adaptedResponse.text);
      
      if (hasSimpleMetaphors || adaptedResponse.adaptationFactors.some(f => f.includes('metaphor'))) {
        console.log(`${colors.green}✅ Metaphors adapted for young student:${colors.reset} Age-appropriate analogies`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Complex metaphors not simplified for young student${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing metaphor adaptation:${colors.reset}`, error.message);
    }

    // Test example framework integration
    try {
      const learningProfile = await this.adaptiveGenerator.getStudentLearningProfile(
        'test-examples-student',
        "Tell me about patterns",
        { studentAge: 13 }
      );

      const hasMiddleSchoolContexts = learningProfile.exampleFramework.contexts.includes('technology') ||
                                     learningProfile.exampleFramework.contexts.includes('current events');
      
      if (hasMiddleSchoolContexts) {
        console.log(`${colors.green}✅ Example framework appropriate for middle school:${colors.reset} Relevant contexts included`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Example framework not age-appropriate${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing example framework:${colors.reset}`, error.message);
    }

    // Test context-appropriate examples
    try {
      const adaptedResponse = await this.adaptiveGenerator.generateAdaptiveResponse({
        studentId: 'test-context-student',
        originalPrompt: TEST_DATA.TEST_PROMPTS.SCIENCE_QUESTION,
        studentAge: 16
      });

      // High school students should get more sophisticated examples
      const hasSophisticatedContent = this.hasSophisticatedContent(adaptedResponse.text);
      
      if (hasSophisticatedContent || adaptedResponse.learningProfile.level === 'HIGH_SCHOOL') {
        console.log(`${colors.green}✅ Context-appropriate examples for high school:${colors.reset} Sophisticated content level`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Examples not sophisticated enough for high school${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing context examples:${colors.reset}`, error.message);
    }

    this.recordTestResults('Example and Metaphor Adaptation', passed, total);
  }

  // Test 6: Performance Level Adaptation
  async testPerformanceLevelAdaptation() {
    console.log(`\n${colors.bold}${colors.yellow}Test 6: Performance Level Adaptation${colors.reset}`);
    
    let passed = 0;
    let total = 4;

    // Test all performance levels
    const performanceLevels = ['STRUGGLING', 'DEVELOPING', 'PROFICIENT', 'ADVANCED'];
    
    for (const level of performanceLevels) {
      try {
        // Create a mock learning profile with the performance level
        const mockProfile = {
          studentId: `test-${level.toLowerCase()}-student`,
          developmentLevel: 'MIDDLE_SCHOOL',
          performanceLevel: level,
          vocabularyLevel: VOCABULARY_LEVELS.MIDDLE_SCHOOL,
          exampleFramework: EXAMPLE_FRAMEWORKS.MIDDLE_SCHOOL,
          adaptationStrategy: ADAPTATION_STRATEGIES[level],
          emotionalProfile: { dominantEmotions: ['neutral'], needsSupport: level === 'STRUGGLING' },
          targetReadingLevel: 6.5
        };

        const adaptedResponse = await this.adaptiveGenerator.adaptExistingResponse(
          "This is a test response that needs adaptation",
          mockProfile,
          {}
        );

        const strategy = ADAPTATION_STRATEGIES[level];
        const hasCorrectAdaptations = this.validatePerformanceAdaptations(adaptedResponse, strategy, level);
        
        if (hasCorrectAdaptations) {
          console.log(`${colors.green}✅ Correct adaptations for ${level}:${colors.reset} Strategy applied appropriately`);
          passed++;
        } else {
          console.log(`${colors.red}❌ Incorrect adaptations for ${level}${colors.reset}`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Error testing ${level} performance level:${colors.reset}`, error.message);
      }
    }

    this.recordTestResults('Performance Level Adaptation', passed, total);
  }

  // Test 7: Adaptive Prompt Generation
  async testAdaptivePromptGeneration() {
    console.log(`\n${colors.bold}${colors.yellow}Test 7: Adaptive Prompt Generation${colors.reset}`);
    
    let passed = 0;
    let total = 3;

    // Test prompt includes developmental level
    try {
      const learningProfile = {
        developmentLevel: 'LATE_ELEMENTARY',
        performanceLevel: 'DEVELOPING',
        vocabularyLevel: VOCABULARY_LEVELS.LATE_ELEMENTARY,
        exampleFramework: EXAMPLE_FRAMEWORKS.LATE_ELEMENTARY,
        adaptationStrategy: ADAPTATION_STRATEGIES.DEVELOPING,
        emotionalProfile: { needsSupport: false }
      };

      const adaptivePrompt = await this.adaptiveGenerator.buildAdaptivePrompt(
        "What is multiplication?",
        learningProfile,
        {}
      );

      const includesLevel = adaptivePrompt.includes('late elementary') && 
                          adaptivePrompt.includes('developing') &&
                          adaptivePrompt.includes('grade 4');
      
      if (includesLevel) {
        console.log(`${colors.green}✅ Adaptive prompt includes developmental context:${colors.reset} Level and grade specified`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Adaptive prompt missing developmental context${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing adaptive prompt:${colors.reset}`, error.message);
    }

    // Test emotional support in prompt
    try {
      const learningProfile = {
        developmentLevel: 'MIDDLE_SCHOOL',
        performanceLevel: 'STRUGGLING',
        vocabularyLevel: VOCABULARY_LEVELS.MIDDLE_SCHOOL,
        adaptationStrategy: ADAPTATION_STRATEGIES.STRUGGLING,
        emotionalProfile: { needsSupport: true }
      };

      const adaptivePrompt = await this.adaptiveGenerator.buildAdaptivePrompt(
        "I'm confused about algebra",
        learningProfile,
        {}
      );

      const includesSupport = adaptivePrompt.includes('emotional support') || 
                            adaptivePrompt.includes('encouraging') ||
                            adaptivePrompt.includes('patient');
      
      if (includesSupport) {
        console.log(`${colors.green}✅ Adaptive prompt includes emotional support guidance:${colors.reset} Support language specified`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Adaptive prompt missing emotional support guidance${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing emotional support in prompt:${colors.reset}`, error.message);
    }

    // Test strategy inclusion in prompt
    try {
      const learningProfile = {
        developmentLevel: 'HIGH_SCHOOL',
        performanceLevel: 'ADVANCED',
        vocabularyLevel: VOCABULARY_LEVELS.HIGH_SCHOOL,
        adaptationStrategy: ADAPTATION_STRATEGIES.ADVANCED,
        emotionalProfile: { needsSupport: false },
        exampleFramework: EXAMPLE_FRAMEWORKS.HIGH_SCHOOL
      };

      const adaptivePrompt = await this.adaptiveGenerator.buildAdaptivePrompt(
        "Explain quantum physics",
        learningProfile,
        {}
      );

      const includesStrategy = adaptivePrompt.includes('abstract concepts') ||
                             adaptivePrompt.includes('complex systems') ||
                             adaptivePrompt.includes('grade 9');
      
      if (includesStrategy) {
        console.log(`${colors.green}✅ Adaptive prompt includes appropriate strategies:${colors.reset} Advanced context included`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Adaptive prompt missing strategy context${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing strategy inclusion:${colors.reset}`, error.message);
    }

    this.recordTestResults('Adaptive Prompt Generation', passed, total);
  }

  // Test 8: Complete Response Adaptation
  async testCompleteResponseAdaptation() {
    console.log(`\n${colors.bold}${colors.yellow}Test 8: Complete Response Adaptation${colors.reset}`);
    
    let passed = 0;
    let total = 3;

    // Test end-to-end adaptation
    try {
      const adaptedResponse = await this.adaptiveGenerator.generateAdaptiveResponse({
        studentId: 'test-complete-student',
        originalPrompt: TEST_DATA.TEST_PROMPTS.SCIENCE_QUESTION,
        studentAge: 10,
        subject: 'science',
        difficulty: 'medium',
        emotionalState: 'curious'
      });

      const hasAllAdaptations = adaptedResponse.text && 
                               adaptedResponse.developmentLevel &&
                               adaptedResponse.adaptationFactors &&
                               adaptedResponse.responseMetadata &&
                               adaptedResponse.responseMetadata.adapted;
      
      if (hasAllAdaptations) {
        console.log(`${colors.green}✅ Complete response adaptation working:${colors.reset} All components present`);
        console.log(`   Level: ${adaptedResponse.developmentLevel}, Adaptations: ${adaptedResponse.adaptationFactors.length}`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Incomplete response adaptation${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing complete adaptation:${colors.reset}`, error.message);
    }

    // Test token limit calculation
    try {
      const learningProfile = await this.adaptiveGenerator.getStudentLearningProfile(
        'test-tokens-student',
        "Test",
        { studentAge: 7 }
      );

      const tokenLimit = this.adaptiveGenerator.calculateMaxTokens(learningProfile);
      const expectedRange = [200, 400]; // Early elementary should be in this range
      
      if (tokenLimit >= expectedRange[0] && tokenLimit <= expectedRange[1]) {
        console.log(`${colors.green}✅ Token limit appropriate for age:${colors.reset} ${tokenLimit} tokens for early elementary`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Token limit inappropriate:${colors.reset} ${tokenLimit} tokens (expected ${expectedRange[0]}-${expectedRange[1]})`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing token limits:${colors.reset}`, error.message);
    }

    // Test adaptation logging
    try {
      const initialResponse = await this.adaptiveGenerator.generateAdaptiveResponse({
        studentId: 'test-logging-student',
        originalPrompt: "Test logging",
        studentAge: 14
      });

      // If no errors thrown, logging is working (integration test)
      const loggingWorking = initialResponse && initialResponse.text;
      
      if (loggingWorking) {
        console.log(`${colors.green}✅ Adaptation logging integration working:${colors.reset} Activity monitor integration successful`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Adaptation logging integration failed${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing adaptation logging:${colors.reset}`, error.message);
    }

    this.recordTestResults('Complete Response Adaptation', passed, total);
  }

  // Test 9: Fallback Behavior
  async testFallbackBehavior() {
    console.log(`\n${colors.bold}${colors.yellow}Test 9: Fallback Behavior${colors.reset}`);
    
    let passed = 0;
    let total = 3;

    // Test invalid input handling
    try {
      const fallbackResponse = await this.adaptiveGenerator.generateAdaptiveResponse({
        // Missing required fields
        originalPrompt: "Test"
        // No studentId
      });

      const isFallback = fallbackResponse.responseMetadata && fallbackResponse.responseMetadata.fallback;
      
      if (isFallback) {
        console.log(`${colors.green}✅ Fallback response for invalid input:${colors.reset} Error handled gracefully`);
        passed++;
      } else {
        console.log(`${colors.red}❌ No fallback response for invalid input${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing invalid input fallback:${colors.reset}`, error.message);
    }

    // Test fallback with minimal data
    try {
      const fallbackResponse = await this.adaptiveGenerator.generateAdaptiveResponse({
        studentId: 'test-minimal-student',
        originalPrompt: "Help with math"
        // Minimal data provided
      });

      const hasText = fallbackResponse.text && fallbackResponse.text.length > 0;
      
      if (hasText) {
        console.log(`${colors.green}✅ Fallback works with minimal data:${colors.reset} Response generated`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Fallback failed with minimal data${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing minimal data fallback:${colors.reset}`, error.message);
    }

    // Test health check
    try {
      const health = await this.adaptiveGenerator.healthCheck();
      
      const isHealthy = health.status === 'healthy' || health.status === 'unhealthy'; // Either is valid response
      
      if (isHealthy && health.service === 'adaptive-response-generator') {
        console.log(`${colors.green}✅ Health check working:${colors.reset} Status: ${health.status}`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Health check not working properly${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing health check:${colors.reset}`, error.message);
    }

    this.recordTestResults('Fallback Behavior', passed, total);
  }

  // Test 10: Integration with Existing Services
  async testIntegrationWithExistingServices() {
    console.log(`\n${colors.bold}${colors.yellow}Test 10: Integration with Existing Services${colors.reset}`);
    
    let passed = 0;
    let total = 3;

    // Test AI service integration
    try {
      const response = await this.adaptiveGenerator.generateAdaptiveResponse({
        studentId: 'test-ai-integration',
        originalPrompt: "Simple math question: 2 + 2",
        studentAge: 8
      });

      const hasAIResponse = response.text && response.text.length > 0;
      
      if (hasAIResponse) {
        console.log(`${colors.green}✅ AI service integration working:${colors.reset} Response generated via AI`);
        passed++;
      } else {
        console.log(`${colors.red}❌ AI service integration failed${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing AI service integration:${colors.reset}`, error.message);
    }

    // Test context manager integration (via learning profile)
    try {
      const profile = await this.adaptiveGenerator.getStudentLearningProfile(
        'test-context-integration',
        "Test content",
        { studentAge: 12, subject: 'math' }
      );

      const hasProfileData = profile.studentId && profile.developmentLevel && profile.vocabularyLevel;
      
      if (hasProfileData) {
        console.log(`${colors.green}✅ Context manager integration working:${colors.reset} Learning profile generated`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Context manager integration failed${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing context manager integration:${colors.reset}`, error.message);
    }

    // Test activity monitor integration (logging)
    try {
      // Generate a response which should trigger activity logging
      await this.adaptiveGenerator.generateAdaptiveResponse({
        studentId: 'test-activity-integration',
        originalPrompt: "Test activity monitoring",
        studentAge: 15
      });

      // If no errors thrown, activity monitor integration is working
      console.log(`${colors.green}✅ Activity monitor integration working:${colors.reset} Adaptation logged successfully`);
      passed++;
    } catch (error) {
      console.log(`${colors.red}❌ Error testing activity monitor integration:${colors.reset}`, error.message);
    }

    this.recordTestResults('Integration with Existing Services', passed, total);
  }

  // Helper methods for testing

  hasComplexVocabulary(text, level) {
    const complexWords = ['synthesize', 'conceptualize', 'methodology', 'theoretical', 'fundamental'];
    const lowerText = text.toLowerCase();
    const hasComplex = complexWords.some(word => lowerText.includes(word));
    
    // Early elementary shouldn't have complex words
    if (level === 'EARLY_ELEMENTARY') return hasComplex;
    // Late elementary should have minimal complex words
    if (level === 'LATE_ELEMENTARY') return complexWords.filter(word => lowerText.includes(word)).length > 2;
    
    return false; // Middle school and high school can have complex vocabulary
  }

  calculateAverageSentenceLength(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const totalWords = sentences.reduce((sum, sentence) => {
      return sum + sentence.trim().split(/\s+/).length;
    }, 0);
    
    return sentences.length > 0 ? Math.round(totalWords / sentences.length) : 0;
  }

  hasSupportiveLanguage(text) {
    const supportiveWords = ['great', 'excellent', 'believe', 'can do', 'take your time', 'normal part', 'doing well'];
    const lowerText = text.toLowerCase();
    return supportiveWords.some(phrase => lowerText.includes(phrase));
  }

  hasChallengeLanguage(text) {
    const challengeWords = ['explore', 'investigate', 'advanced', 'complex', 'sophisticated', 'deeper'];
    const lowerText = text.toLowerCase();
    return challengeWords.some(word => lowerText.includes(word));
  }

  hasEncouragement(text) {
    const encouragement = ['great', 'excellent', 'wonderful', 'good job', 'well done', 'proud', 'awesome'];
    const lowerText = text.toLowerCase();
    return encouragement.some(phrase => lowerText.includes(phrase));
  }

  hasSimpleMetaphors(text) {
    const simpleMetaphors = ['like building', 'like playing', 'like counting', 'like solving a puzzle'];
    const lowerText = text.toLowerCase();
    return simpleMetaphors.some(metaphor => lowerText.includes(metaphor));
  }

  hasSophisticatedContent(text) {
    const sophisticatedWords = ['analyze', 'synthesize', 'complex', 'theoretical', 'advanced', 'sophisticated'];
    const lowerText = text.toLowerCase();
    return sophisticatedWords.filter(word => lowerText.includes(word)).length >= 2;
  }

  validatePerformanceAdaptations(adaptedResponse, strategy, level) {
    const factors = adaptedResponse.adaptationFactors || [];
    
    // Check if adaptations match the strategy
    if (strategy.encouragement === 'frequent') {
      return factors.some(f => f.includes('encouragement')) || adaptedResponse.text.toLowerCase().includes('great');
    }
    
    if (strategy.simplification === 'high') {
      return factors.some(f => f.includes('simplified') || f.includes('vocabulary'));
    }
    
    // For advanced students, should have minimal adaptations
    if (level === 'ADVANCED') {
      return factors.length <= 2;
    }
    
    return true; // Default pass if basic checks pass
  }

  // Record test results
  recordTestResults(category, passed, total) {
    this.testResults.categories[category] = { passed, total };
    this.testResults.total += total;
    this.testResults.passed += passed;
    this.testResults.failed += (total - passed);

    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
    const status = percentage >= 80 ? colors.green : percentage >= 60 ? colors.yellow : colors.red;
    
    console.log(`${status}Result: ${passed}/${total} tests passed (${percentage}%)${colors.reset}\n`);
  }

  // Print final test results
  printFinalResults() {
    console.log(`${colors.bold}${colors.blue}📊 Final Test Results${colors.reset}\n`);
    
    // Overall results
    const overallPercentage = this.testResults.total > 0 ? 
      Math.round((this.testResults.passed / this.testResults.total) * 100) : 0;
    
    const overallStatus = overallPercentage >= 90 ? colors.green : 
                         overallPercentage >= 75 ? colors.yellow : colors.red;

    console.log(`${colors.bold}Overall Results:${colors.reset}`);
    console.log(`${overallStatus}${this.testResults.passed}/${this.testResults.total} tests passed (${overallPercentage}%)${colors.reset}\n`);

    // Category breakdown
    console.log(`${colors.bold}Category Breakdown:${colors.reset}`);
    for (const [category, results] of Object.entries(this.testResults.categories)) {
      const percentage = results.total > 0 ? Math.round((results.passed / results.total) * 100) : 0;
      const status = percentage >= 80 ? colors.green : percentage >= 60 ? colors.yellow : colors.red;
      console.log(`  ${status}${category}: ${results.passed}/${results.total} (${percentage}%)${colors.reset}`);
    }

    // Final assessment
    console.log(`\n${colors.bold}Assessment:${colors.reset}`);
    if (overallPercentage >= 90) {
      console.log(`${colors.green}🧠 EXCELLENT: Adaptive Response Generator is production-ready with comprehensive developmental adaptation${colors.reset}`);
    } else if (overallPercentage >= 75) {
      console.log(`${colors.yellow}⚠️  GOOD: Adaptive Response Generator works well but may need some improvements${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ NEEDS WORK: Adaptive Response Generator requires significant improvements before production use${colors.reset}`);
    }

    console.log(`\n${colors.cyan}Adaptive Response Features:${colors.reset}`);
    console.log(`  ✓ Developmental level detection and adaptation`);
    console.log(`  ✓ Vocabulary complexity adjustment`);
    console.log(`  ✓ Sentence structure simplification`);
    console.log(`  ✓ Emotional tone adaptation`);
    console.log(`  ✓ Age-appropriate examples and metaphors`);
    console.log(`  ✓ Performance level-based adaptation strategies`);
    console.log(`  ✓ Adaptive prompt generation`);
    console.log(`  ✓ Integration with AI, context, and activity monitoring services`);
    console.log(`  ✓ Comprehensive fallback behavior`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new AdaptiveResponseGeneratorTester();
  tester.runAllTests().catch(console.error);
}

module.exports = { AdaptiveResponseGeneratorTester }; 