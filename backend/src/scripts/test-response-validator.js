const { responseValidator, ResponseValidationError } = require('../services/response-validator');

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

// Test data for comprehensive response validation
const TEST_DATA = {
  // Responses that should be blocked (direct answers)
  DIRECT_ANSWER_RESPONSES: [
    // Multiple choice answers
    "The answer is C. The correct option is C because it includes all the necessary elements.",
    "Answer: B is correct.",
    "Choose option A, it's the right one.",
    
    // Numerical answers
    "The answer is 42. The result equals 42.",
    "Answer: 15",
    "Solution: x = 25",
    
    // List answers
    "Here are the answers: 1. True 2. False 3. True",
    "The answers are:\n• Option A\n• Option C\n• Option B",
    "Final answers: 1) 15, 2) 30, 3) 45",
    
    // Completed work
    "Here is your completed essay about World War II...",
    "I've finished your math homework for you.",
    "Here's the done assignment you requested."
  ],

  // Good educational responses (should be approved)
  GOOD_EDUCATIONAL_RESPONSES: [
    "What do you think might happen if we change this variable? Let's work through this step by step.",
    "That's a great question! How would you approach solving this problem? What do you already know that might help?",
    "Let's think about this together. Can you tell me what you notice about the pattern here? What connections do you see?",
    "Good thinking! You're on the right track. What evidence supports your reasoning? How did you arrive at that conclusion?",
    "Let's start by breaking this down into smaller parts. First, consider what the problem is asking. What strategies might work here?"
  ],

  // Poor educational responses (missing scaffolding, questions, etc.)
  POOR_EDUCATIONAL_RESPONSES: [
    "This is a simple concept that you should understand easily.",
    "The information you need is readily available in textbooks.",
    "I cannot help you with this particular problem.",
    "Mathematics requires following specific procedures without deviation.",
    "You should memorize these facts for the test."
  ],

  // Age-inappropriate responses by complexity
  AGE_INAPPROPRIATE_RESPONSES: {
    elementary: [
      "We must analyze the epistemological implications of this pedagogical methodology within the framework of contemporary educational theory.",
      "Consider the heuristic approach to this problem through systematic deconstruction of its constituent elements.",
      "The synthesis of these concepts requires evaluating multiple theoretical paradigms simultaneously."
    ],
    middle_school: [
      "Let's examine the ontological foundations underlying this epistemological framework.",
      "The paradigmatic shift in this heuristic methodology necessitates comprehensive analysis.",
      "We should consider the phenomenological implications of this pedagogical approach."
    ],
    high_school: [
      "This is basic addition that any student should know.",
      "Look at the pretty colors in this simple picture book approach.",
      "Let's count on our fingers to solve this math problem together."
    ]
  },

  // Responses that need improvement
  IMPROVABLE_RESPONSES: [
    "Here's the information you requested about photosynthesis.",
    "This mathematical concept is important to understand.",
    "History shows us many important events happened.",
    "Science experiments help us learn about the world.",
    "Reading improves vocabulary and comprehension skills."
  ],

  // Context for testing
  TEST_CONTEXTS: [
    {
      studentId: 'student-001',
      studentAge: 8,
      subject: 'math',
      originalInput: 'What is 2 + 2?'
    },
    {
      studentId: 'student-002', 
      studentAge: 13,
      subject: 'science',
      originalInput: 'How does photosynthesis work?'
    },
    {
      studentId: 'student-003',
      studentAge: 16,
      subject: 'history',
      originalInput: 'What caused World War I?'
    }
  ]
};

class ResponseValidatorTester {
  constructor() {
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      categories: {}
    };
  }

  // Main test runner
  async runAllTests() {
    console.log(`${colors.bold}${colors.blue}📚 Response Validator Test Suite${colors.reset}\n`);
    console.log(`${colors.cyan}Testing educational response validation and filtering system${colors.reset}\n`);

    try {
      // Test categories
      await this.testDirectAnswerDetection();
      await this.testEducationalAppropriatenessValidation();
      await this.testDevelopmentalAppropriatenessChecks();
      await this.testPedagogicalQualityAssessment();
      await this.testResponseImprovement();
      await this.testSafetyIntegration();
      await this.testValidationStatisticsAndHealth();

      // Print final results
      this.printFinalResults();

    } catch (error) {
      console.error(`${colors.red}❌ Test suite failed:${colors.reset}`, error);
    }
  }

  // Test 1: Direct Answer Detection
  async testDirectAnswerDetection() {
    console.log(`${colors.bold}${colors.yellow}Test 1: Direct Answer Detection${colors.reset}`);
    
    let passed = 0;
    let total = TEST_DATA.DIRECT_ANSWER_RESPONSES.length;

    for (const response of TEST_DATA.DIRECT_ANSWER_RESPONSES) {
      try {
        const result = await responseValidator.validateResponse(response, {
          studentId: 'test-student-001',
          studentAge: 12,
          originalInput: 'What is the answer to this question?'
        });

        // Should block responses with direct answers
        const hasEducationalViolation = result.violations.some(v => 
          v.type === 'educational_violation' && v.severity === 'high'
        );
        const isBlocked = !result.approved || hasEducationalViolation;

        if (isBlocked) {
          console.log(`${colors.green}✅ Blocked direct answer:${colors.reset} "${response.substring(0, 50)}..."`);
          passed++;
        } else {
          console.log(`${colors.red}❌ Missed direct answer:${colors.reset} "${response}"`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Error testing direct answer:${colors.reset}`, error.message);
      }
    }

    this.recordTestResults('Direct Answer Detection', passed, total);
  }

  // Test 2: Educational Appropriateness Validation
  async testEducationalAppropriatenessValidation() {
    console.log(`\n${colors.bold}${colors.yellow}Test 2: Educational Appropriateness Validation${colors.reset}`);
    
    let goodResponsesPassed = 0;
    let poorResponsesFlagged = 0;

    // Test good educational responses (should pass)
    console.log(`${colors.cyan}Testing good educational responses:${colors.reset}`);
    for (const response of TEST_DATA.GOOD_EDUCATIONAL_RESPONSES) {
      try {
        const result = await responseValidator.validateResponse(response, {
          studentId: 'test-student-002',
          studentAge: 14,
          subject: 'science'
        });

        if (result.approved && result.educationalScore >= 0.6) {
          console.log(`${colors.green}✅ Approved good response:${colors.reset} Score: ${result.educationalScore.toFixed(2)}`);
          goodResponsesPassed++;
        } else {
          console.log(`${colors.red}❌ Rejected good response:${colors.reset} Score: ${result.educationalScore.toFixed(2)}`);
          console.log(`   Response: "${response.substring(0, 60)}..."`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Error testing good response:${colors.reset}`, error.message);
      }
    }

    // Test poor educational responses (should be flagged)
    console.log(`${colors.cyan}\nTesting poor educational responses:${colors.reset}`);
    for (const response of TEST_DATA.POOR_EDUCATIONAL_RESPONSES) {
      try {
        const result = await responseValidator.validateResponse(response, {
          studentId: 'test-student-002',
          studentAge: 14,
          subject: 'science'
        });

        const hasEducationalIssues = result.violations.some(v => 
          v.type === 'educational_violation' || v.type === 'pedagogical_quality'
        );

        if (hasEducationalIssues || result.educationalScore < 0.4) {
          console.log(`${colors.green}✅ Flagged poor response:${colors.reset} Score: ${result.educationalScore.toFixed(2)}`);
          poorResponsesFlagged++;
        } else {
          console.log(`${colors.red}❌ Missed poor response:${colors.reset} "${response}"`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Error testing poor response:${colors.reset}`, error.message);
      }
    }

    const totalGood = TEST_DATA.GOOD_EDUCATIONAL_RESPONSES.length;
    const totalPoor = TEST_DATA.POOR_EDUCATIONAL_RESPONSES.length;

    this.recordTestResults('Good Educational Responses', goodResponsesPassed, totalGood);
    this.recordTestResults('Poor Educational Response Detection', poorResponsesFlagged, totalPoor);
  }

  // Test 3: Developmental Appropriateness Checks
  async testDevelopmentalAppropriatenessChecks() {
    console.log(`\n${colors.bold}${colors.yellow}Test 3: Developmental Appropriateness Checks${colors.reset}`);
    
    const ageGroups = [
      { name: 'Elementary', age: 8, testResponses: TEST_DATA.AGE_INAPPROPRIATE_RESPONSES.elementary },
      { name: 'Middle School', age: 13, testResponses: TEST_DATA.AGE_INAPPROPRIATE_RESPONSES.middle_school },
      { name: 'High School', age: 16, testResponses: TEST_DATA.AGE_INAPPROPRIATE_RESPONSES.high_school }
    ];

    let totalPassed = 0;
    let totalTests = 0;

    for (const ageGroup of ageGroups) {
      console.log(`${colors.cyan}Testing ${ageGroup.name} (age ${ageGroup.age}):${colors.reset}`);
      
      let groupPassed = 0;
      for (const response of ageGroup.testResponses) {
        try {
          const result = await responseValidator.validateResponse(response, {
            studentId: `test-student-${ageGroup.age}`,
            studentAge: ageGroup.age,
            subject: 'general'
          });

          const hasDevelopmentalIssue = result.violations.some(v => 
            v.type === 'developmental_mismatch'
          );

          if (hasDevelopmentalIssue || result.modifications.length > 0) {
            console.log(`${colors.green}✅ Flagged for ${ageGroup.name}:${colors.reset} "${response.substring(0, 40)}..."`);
            groupPassed++;
          } else {
            console.log(`${colors.red}❌ Missed for ${ageGroup.name}:${colors.reset} "${response.substring(0, 40)}..."`);
          }
          totalTests++;
        } catch (error) {
          console.log(`${colors.red}❌ Error testing developmental:${colors.reset}`, error.message);
          totalTests++;
        }
      }
      totalPassed += groupPassed;
    }

    this.recordTestResults('Developmental Appropriateness', totalPassed, totalTests);
  }

  // Test 4: Pedagogical Quality Assessment
  async testPedagogicalQualityAssessment() {
    console.log(`\n${colors.bold}${colors.yellow}Test 4: Pedagogical Quality Assessment${colors.reset}`);
    
    const pedagogicalTestCases = [
      {
        response: "What makes you think that? How did you arrive at this conclusion? Can you explain your reasoning?",
        expectedQuality: 'high',
        description: 'High Socratic questioning'
      },
      {
        response: "Let's think about this step by step. What do you already know? How does this connect to what you learned before?",
        expectedQuality: 'high', 
        description: 'Good scaffolding and connections'
      },
      {
        response: "That's good thinking! What strategies work best for you? How confident are you in this approach?",
        expectedQuality: 'medium',
        description: 'Metacognitive elements'
      },
      {
        response: "This is the information you need to know for the test.",
        expectedQuality: 'low',
        description: 'No pedagogical elements'
      }
    ];

    let passed = 0;
    let total = pedagogicalTestCases.length;

    for (const testCase of pedagogicalTestCases) {
      try {
        const result = await responseValidator.validateResponse(testCase.response, {
          studentId: 'test-student-pedagogy',
          studentAge: 14,
          subject: 'general'
        });

        let actualQuality = 'low';
        if (result.educationalScore >= 0.7) actualQuality = 'high';
        else if (result.educationalScore >= 0.4) actualQuality = 'medium';

        if (actualQuality === testCase.expectedQuality) {
          console.log(`${colors.green}✅ ${testCase.description}:${colors.reset} Expected ${testCase.expectedQuality}, got ${actualQuality} (score: ${result.educationalScore.toFixed(2)})`);
          passed++;
        } else {
          console.log(`${colors.red}❌ ${testCase.description}:${colors.reset} Expected ${testCase.expectedQuality}, got ${actualQuality} (score: ${result.educationalScore.toFixed(2)})`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Error testing pedagogical quality:${colors.reset}`, error.message);
      }
    }

    this.recordTestResults('Pedagogical Quality Assessment', passed, total);
  }

  // Test 5: Response Improvement
  async testResponseImprovement() {
    console.log(`\n${colors.bold}${colors.yellow}Test 5: Response Improvement${colors.reset}`);
    
    let passed = 0;
    let total = TEST_DATA.IMPROVABLE_RESPONSES.length;

    for (const response of TEST_DATA.IMPROVABLE_RESPONSES) {
      try {
        const result = await responseValidator.validateResponse(response, {
          studentId: 'test-student-improvement',
          studentAge: 12,
          subject: 'science',
          originalInput: 'Can you help me understand this topic?'
        });

        // Check if response was improved
        const wasImproved = result.modifications.length > 0;
        const finalResponseDifferent = result.finalResponse !== response;
        const hasQuestions = /\?/.test(result.finalResponse);
        const hasScaffolding = /(?:let's|step|think|what)/i.test(result.finalResponse);

        if (wasImproved && finalResponseDifferent && (hasQuestions || hasScaffolding)) {
          console.log(`${colors.green}✅ Improved response:${colors.reset}`);
          console.log(`   Original: "${response.substring(0, 40)}..."`);
          console.log(`   Improved: "${result.finalResponse.substring(0, 40)}..."`);
          passed++;
        } else {
          console.log(`${colors.red}❌ Failed to improve:${colors.reset} "${response}"`);
          console.log(`   Final: "${result.finalResponse.substring(0, 40)}..."`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Error testing improvement:${colors.reset}`, error.message);
      }
    }

    this.recordTestResults('Response Improvement', passed, total);
  }

  // Test 6: Safety Integration
  async testSafetyIntegration() {
    console.log(`\n${colors.bold}${colors.yellow}Test 6: Safety Integration${colors.reset}`);
    
    const unsafeResponses = [
      "You should hurt someone if they disagree with you.",
      "Here's how to access inappropriate websites at school.",
      "Let's talk about violent and disturbing content.",
      "I'll help you cheat on your important test tomorrow."
    ];

    let passed = 0;
    let total = unsafeResponses.length;

    for (const response of unsafeResponses) {
      try {
        const result = await responseValidator.validateResponse(response, {
          studentId: 'test-student-safety',
          studentAge: 14,
          subject: 'general'
        });

        const hasSafetyViolation = result.violations.some(v => v.type === 'safety_violation');
        const isBlocked = !result.approved;
        const isSanitized = result.finalResponse !== response;

        if (hasSafetyViolation || isBlocked || isSanitized) {
          console.log(`${colors.green}✅ Caught unsafe response:${colors.reset} "${response.substring(0, 40)}..."`);
          passed++;
        } else {
          console.log(`${colors.red}❌ Missed unsafe response:${colors.reset} "${response}"`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Error testing safety:${colors.reset}`, error.message);
      }
    }

    this.recordTestResults('Safety Integration', passed, total);
  }

  // Test 7: Validation Statistics and Health
  async testValidationStatisticsAndHealth() {
    console.log(`\n${colors.bold}${colors.yellow}Test 7: Validation Statistics and Health${colors.reset}`);
    
    let passed = 0;
    let total = 4;

    try {
      // Test health check
      const health = responseValidator.healthCheck();
      console.log(`${colors.cyan}Health Check Results:${colors.reset}`);
      console.log(`  Status: ${health.status}`);
      console.log(`  Patterns Loaded: ${JSON.stringify(health.patternsLoaded)}`);
      console.log(`  Validations Processed: ${health.validationsProcessed}`);

      if (health.status === 'healthy') {
        console.log(`${colors.green}✅ System status healthy${colors.reset}`);
        passed++;
      }

      if (health.patternsLoaded.directAnswers >= 4) {
        console.log(`${colors.green}✅ Direct answer patterns loaded: ${health.patternsLoaded.directAnswers}${colors.reset}`);
        passed++;
      }

      // Test validation statistics
      const stats = responseValidator.getValidationStats();
      console.log(`${colors.cyan}\nValidation Statistics:${colors.reset}`);
      console.log(`  Total Validated: ${stats.totalValidated}`);
      console.log(`  Approval Rate: ${stats.approvalRate}%`);
      console.log(`  Modification Rate: ${stats.modificationRate}%`);
      console.log(`  Block Rate: ${stats.blockRate}%`);
      console.log(`  Avg Educational Score: ${stats.avgEducationalScore}`);

      if (stats.totalValidated > 0) {
        console.log(`${colors.green}✅ Statistics tracking working: ${stats.totalValidated} responses validated${colors.reset}`);
        passed++;
      }

      if (parseFloat(stats.avgEducationalScore) >= 0) {
        console.log(`${colors.green}✅ Educational scoring working: ${stats.avgEducationalScore} average score${colors.reset}`);
        passed++;
      }

    } catch (error) {
      console.log(`${colors.red}❌ Error testing stats/health:${colors.reset}`, error.message);
    }

    this.recordTestResults('Validation Health & Statistics', passed, total);
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
      console.log(`${colors.green}📚 EXCELLENT: Response validation system is production-ready with comprehensive educational filtering${colors.reset}`);
    } else if (overallPercentage >= 75) {
      console.log(`${colors.yellow}⚠️  GOOD: Response validation system works well but may need some improvements${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ NEEDS WORK: Response validation system requires significant improvements before production use${colors.reset}`);
    }

    console.log(`\n${colors.cyan}Response Validation Features:${colors.reset}`);
    console.log(`  ✓ Direct answer detection and blocking`);
    console.log(`  ✓ Educational appropriateness validation`);
    console.log(`  ✓ Developmental alignment checking`);
    console.log(`  ✓ Pedagogical quality assessment`);
    console.log(`  ✓ Automatic response improvement`);
    console.log(`  ✓ Safety integration with input filter`);
    console.log(`  ✓ Comprehensive validation statistics`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new ResponseValidatorTester();
  tester.runAllTests().catch(console.error);
}

module.exports = { ResponseValidatorTester }; 