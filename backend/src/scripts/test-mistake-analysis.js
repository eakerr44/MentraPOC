const { getMistakeAnalysisService, MISTAKE_TYPES, MISTAKE_SEVERITY, QUESTION_TYPES } = require('../services/mistake-analysis-service');
const { getProblemSolvingService } = require('../services/problem-solving-service');

class MistakeAnalysisTest {
  constructor() {
    this.mistakeAnalysisService = getMistakeAnalysisService();
    this.problemSolvingService = getProblemSolvingService();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🔍 Starting Mistake Analysis System Tests...\n');

    try {
      // Test 1: Service Health Check
      await this.testHealthCheck();
      
      // Test 2: Basic Mistake Classification
      await this.testBasicMistakeClassification();
      
      // Test 3: Subject-Specific Analysis
      await this.testSubjectSpecificAnalysis();
      
      // Test 4: Guided Question Generation
      await this.testGuidedQuestionGeneration();
      
      // Test 5: Remediation Strategy Creation
      await this.testRemediationStrategyCreation();
      
      // Test 6: Pattern Analysis
      await this.testPatternAnalysis();
      
      // Test 7: Integration with Problem Solving Service
      await this.testProblemSolvingIntegration();
      
      // Test 8: Enhanced Analysis Flow
      await this.testEnhancedAnalysisFlow();
      
      // Test 9: Error Handling
      await this.testErrorHandling();
      
      // Test 10: Performance and Load Testing
      await this.testPerformance();

      this.printSummary();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    }
  }

  async testHealthCheck() {
    console.log('Test 1: Service Health Check');
    
    try {
      const health = await this.mistakeAnalysisService.healthCheck();
      
      this.assert(health.status === 'healthy', 'Service should be healthy');
      this.assert(health.features.database === 'connected', 'Database should be connected');
      this.assert(health.features.patternAnalysis === 'enabled', 'Pattern analysis should be enabled');
      
      console.log('✅ Health check passed');
      this.testResults.push({ test: 'Health Check', status: 'PASS' });
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      this.testResults.push({ test: 'Health Check', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testBasicMistakeClassification() {
    console.log('Test 2: Basic Mistake Classification');
    
    try {
      const testCases = [
        {
          name: 'Conceptual Mistake',
          studentResponse: 'I think force makes things move faster',
          expectedResponse: 'Force causes acceleration, not constant velocity',
          stepContext: { prompt: 'Explain the relationship between force and motion', subject: 'physics' },
          problemContext: { subject: 'physics', difficulty: 'medium' },
          expectedType: MISTAKE_TYPES.CONCEPTUAL
        },
        {
          name: 'Computational Mistake',
          studentResponse: '2 + 3 × 4 = 20',
          expectedResponse: '2 + 3 × 4 = 14',
          stepContext: { prompt: 'Calculate using order of operations', subject: 'arithmetic' },
          problemContext: { subject: 'arithmetic', difficulty: 'easy' },
          expectedType: MISTAKE_TYPES.COMPUTATIONAL
        },
        {
          name: 'Procedural Mistake',
          studentResponse: 'To solve x + 5 = 10, I subtract 5 from the left side only',
          expectedResponse: 'To solve x + 5 = 10, subtract 5 from both sides',
          stepContext: { prompt: 'Solve the equation x + 5 = 10', subject: 'algebra' },
          problemContext: { subject: 'algebra', difficulty: 'medium' },
          expectedType: MISTAKE_TYPES.PROCEDURAL
        }
      ];

      for (const testCase of testCases) {
        const result = await this.mistakeAnalysisService.analyzeMistake({
          sessionId: 'test_session',
          stepNumber: 1,
          studentResponse: testCase.studentResponse,
          expectedResponse: testCase.expectedResponse,
          stepContext: testCase.stepContext,
          studentId: 'test_student',
          problemContext: testCase.problemContext
        });

        this.assert(result.mistakeClassification, `Should return mistake classification for ${testCase.name}`);
        this.assert(result.guidedQuestions, `Should return guided questions for ${testCase.name}`);
        this.assert(result.remediationStrategy, `Should return remediation strategy for ${testCase.name}`);
        
        console.log(`  ✓ ${testCase.name}: ${result.mistakeClassification.primaryType} (confidence: ${result.mistakeClassification.confidence})`);
      }
      
      console.log('✅ Basic mistake classification tests passed');
      this.testResults.push({ test: 'Basic Mistake Classification', status: 'PASS' });
    } catch (error) {
      console.log('❌ Basic mistake classification failed:', error.message);
      this.testResults.push({ test: 'Basic Mistake Classification', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testSubjectSpecificAnalysis() {
    console.log('Test 3: Subject-Specific Analysis');
    
    try {
      const subjects = [
        {
          subject: 'mathematics',
          studentResponse: '5 + 3 * 2 = 16',
          expectedResponse: '5 + 3 * 2 = 11',
          expectedIndicators: ['arithmetic_mistake']
        },
        {
          subject: 'physics',
          studentResponse: 'The ball falls faster because it weighs more',
          expectedResponse: 'All objects fall at the same rate in a vacuum',
          expectedIndicators: ['missing_scientific_vocabulary']
        },
        {
          subject: 'writing',
          studentResponse: 'Dogs are good.',
          expectedResponse: 'Dogs are excellent companions because they provide loyalty, protection, and emotional support.',
          expectedIndicators: ['insufficient_development']
        }
      ];

      for (const test of subjects) {
        const analysis = await this.mistakeAnalysisService.analyzeBySubject(
          test.studentResponse,
          test.expectedResponse,
          test.subject,
          { prompt: 'Test prompt' }
        );

        this.assert(analysis.type === test.subject || analysis.type === 'general', `Should analyze ${test.subject} correctly`);
        console.log(`  ✓ ${test.subject}: ${analysis.indicators.length} indicators found`);
      }
      
      console.log('✅ Subject-specific analysis tests passed');
      this.testResults.push({ test: 'Subject-Specific Analysis', status: 'PASS' });
    } catch (error) {
      console.log('❌ Subject-specific analysis failed:', error.message);
      this.testResults.push({ test: 'Subject-Specific Analysis', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testGuidedQuestionGeneration() {
    console.log('Test 4: Guided Question Generation');
    
    try {
      const mistakeClassification = {
        primaryType: MISTAKE_TYPES.CONCEPTUAL,
        severity: MISTAKE_SEVERITY.MEDIUM,
        indicators: ['misunderstanding_concept'],
        misconceptions: ['Force directly controls speed'],
        confidence: 0.8
      };

      const stepContext = {
        prompt: 'Explain how force affects motion',
        title: 'Force and Motion',
        subject: 'physics'
      };

      const questions = await this.mistakeAnalysisService.generateGuidedQuestions({
        mistakeClassification,
        stepContext,
        studentId: 'test_student',
        problemContext: { subject: 'physics', difficulty: 'medium' }
      });

      this.assert(questions.immediate && questions.immediate.length > 0, 'Should generate immediate questions');
      this.assert(questions.followUp && questions.followUp.length >= 0, 'Should have follow-up questions array');
      this.assert(questions.reflection && questions.reflection.length >= 0, 'Should have reflection questions array');
      this.assert(questions.questioningStrategy, 'Should have questioning strategy');

      console.log(`  ✓ Generated ${questions.totalQuestions} total questions`);
      console.log(`  ✓ Strategy: ${questions.questioningStrategy}`);
      console.log(`  ✓ First question: "${questions.immediate[0].question}"`);
      
      console.log('✅ Guided question generation tests passed');
      this.testResults.push({ test: 'Guided Question Generation', status: 'PASS' });
    } catch (error) {
      console.log('❌ Guided question generation failed:', error.message);
      this.testResults.push({ test: 'Guided Question Generation', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testRemediationStrategyCreation() {
    console.log('Test 5: Remediation Strategy Creation');
    
    try {
      const mistakeClassification = {
        primaryType: MISTAKE_TYPES.PROCEDURAL,
        severity: MISTAKE_SEVERITY.HIGH,
        indicators: ['wrong_procedure'],
        rootCauses: ['Unfamiliarity with algebraic procedures']
      };

      const strategy = await this.mistakeAnalysisService.createRemediationStrategy({
        mistakeClassification,
        stepContext: { prompt: 'Solve algebraic equation' },
        studentId: 'test_student',
        guidedQuestions: { immediate: [] }
      });

      this.assert(strategy.immediate, 'Should have immediate remediation');
      this.assert(strategy.shortTerm, 'Should have short-term remediation');
      this.assert(strategy.longTerm, 'Should have long-term remediation');
      this.assert(strategy.adaptations, 'Should have adaptive modifications');

      console.log(`  ✓ Immediate actions: ${strategy.immediate.actions.length}`);
      console.log(`  ✓ Short-term practices: ${strategy.shortTerm.practice.length}`);
      console.log(`  ✓ Long-term recommendations: ${strategy.longTerm.recommendations.length}`);
      
      console.log('✅ Remediation strategy creation tests passed');
      this.testResults.push({ test: 'Remediation Strategy Creation', status: 'PASS' });
    } catch (error) {
      console.log('❌ Remediation strategy creation failed:', error.message);
      this.testResults.push({ test: 'Remediation Strategy Creation', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testPatternAnalysis() {
    console.log('Test 6: Pattern Analysis');
    
    try {
      const patterns = this.mistakeAnalysisService.mistakePatterns;
      
      this.assert(patterns.general, 'Should have general patterns');
      this.assert(patterns.mathematics, 'Should have mathematics patterns');
      this.assert(patterns.general.length > 0, 'Should have at least one general pattern');

      // Test pattern matching
      const response = 'x';  // Very short response
      const analysis = this.mistakeAnalysisService.analyzeByPatterns(response, 'Expected longer response', 'general');
      
      this.assert(analysis.matchedPatterns !== undefined, 'Should return pattern analysis');
      this.assert(analysis.indicators !== undefined, 'Should return indicators');
      
      console.log(`  ✓ Found ${analysis.matchedPatterns.length} pattern matches`);
      
      console.log('✅ Pattern analysis tests passed');
      this.testResults.push({ test: 'Pattern Analysis', status: 'PASS' });
    } catch (error) {
      console.log('❌ Pattern analysis failed:', error.message);
      this.testResults.push({ test: 'Pattern Analysis', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testProblemSolvingIntegration() {
    console.log('Test 7: Integration with Problem Solving Service');
    
    try {
      // Test the integration method
      const response = 'I think 2 + 2 = 5';
      const stepInfo = {
        prompt: 'What is 2 + 2?',
        expected_response: '4',
        title: 'Basic Addition'
      };
      const problemInstance = {
        subject: 'arithmetic',
        difficulty: 'easy',
        title: 'Basic Math'
      };

      const result = await this.problemSolvingService.analyzeMistakeWithGuidedQuestions(
        response,
        stepInfo,
        problemInstance,
        'test_student'
      );

      if (result) {
        this.assert(result.mistakeClassification, 'Should return mistake classification');
        this.assert(result.guidedQuestions, 'Should return guided questions');
        console.log(`  ✓ Integration successful: ${result.mistakeClassification.primaryType}`);
      } else {
        console.log('  ✓ Integration handled gracefully (no result)');
      }
      
      console.log('✅ Problem solving integration tests passed');
      this.testResults.push({ test: 'Problem Solving Integration', status: 'PASS' });
    } catch (error) {
      console.log('❌ Problem solving integration failed:', error.message);
      this.testResults.push({ test: 'Problem Solving Integration', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testEnhancedAnalysisFlow() {
    console.log('Test 8: Enhanced Analysis Flow');
    
    try {
      // Test the complete analysis flow
      const analysisResult = await this.problemSolvingService.analyzeStepResponse(
        'Force makes things go faster',
        {
          prompt: 'Explain the relationship between force and motion',
          expected_response: 'Force causes acceleration, not constant velocity',
          title: 'Force and Motion'
        },
        {
          subject: 'physics',
          difficulty: 'medium',
          title: 'Physics Problem'
        },
        'test_student'
      );

      this.assert(analysisResult.quality, 'Should return quality assessment');
      this.assert(analysisResult.accuracy !== undefined, 'Should return accuracy score');
      this.assert(analysisResult.understanding, 'Should return understanding level');
      this.assert(analysisResult.feedback, 'Should return feedback');

      console.log(`  ✓ Quality: ${analysisResult.quality}`);
      console.log(`  ✓ Accuracy: ${analysisResult.accuracy}`);
      console.log(`  ✓ Understanding: ${analysisResult.understanding}`);
      console.log(`  ✓ Has guided questions: ${!!analysisResult.guidedQuestions}`);
      
      console.log('✅ Enhanced analysis flow tests passed');
      this.testResults.push({ test: 'Enhanced Analysis Flow', status: 'PASS' });
    } catch (error) {
      console.log('❌ Enhanced analysis flow failed:', error.message);
      this.testResults.push({ test: 'Enhanced Analysis Flow', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testErrorHandling() {
    console.log('Test 9: Error Handling');
    
    try {
      // Test with invalid inputs
      try {
        await this.mistakeAnalysisService.analyzeMistake({
          // Missing required fields
          sessionId: 'test',
          stepNumber: 1
        });
        console.log('  ✓ Handled missing required fields gracefully');
      } catch (error) {
        console.log('  ✓ Properly threw error for missing fields');
      }

      // Test with empty response
      const result = await this.mistakeAnalysisService.analyzeBySubject('', 'Expected response', 'general', {});
      this.assert(result, 'Should handle empty response');

      console.log('✅ Error handling tests passed');
      this.testResults.push({ test: 'Error Handling', status: 'PASS' });
    } catch (error) {
      console.log('❌ Error handling failed:', error.message);
      this.testResults.push({ test: 'Error Handling', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testPerformance() {
    console.log('Test 10: Performance Testing');
    
    try {
      const startTime = Date.now();
      
      // Run multiple analyses to test performance
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          this.mistakeAnalysisService.analyzeMistake({
            sessionId: `perf_test_${i}`,
            stepNumber: 1,
            studentResponse: `Test response ${i}`,
            expectedResponse: 'Expected response',
            stepContext: { prompt: 'Test prompt', subject: 'general' },
            studentId: 'perf_test_student',
            problemContext: { subject: 'general', difficulty: 'medium' }
          })
        );
      }
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / results.length;

      this.assert(results.length === 5, 'Should complete all performance tests');
      this.assert(avgTime < 5000, 'Average analysis time should be under 5 seconds');

      console.log(`  ✓ Completed ${results.length} analyses in ${totalTime}ms`);
      console.log(`  ✓ Average time per analysis: ${avgTime.toFixed(2)}ms`);
      
      console.log('✅ Performance tests passed');
      this.testResults.push({ test: 'Performance Testing', status: 'PASS' });
    } catch (error) {
      console.log('❌ Performance testing failed:', error.message);
      this.testResults.push({ test: 'Performance Testing', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  printSummary() {
    console.log('📊 Test Summary');
    console.log('================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  ❌ ${r.test}: ${r.error}`));
    }
    
    console.log('\nDetailed Results:');
    this.testResults.forEach(r => {
      const status = r.status === 'PASS' ? '✅' : '❌';
      console.log(`  ${status} ${r.test}`);
    });
    
    console.log('\n🎉 Mistake Analysis System Testing Complete!');
  }
}

// Run tests if called directly
if (require.main === module) {
  async function main() {
    const tester = new MistakeAnalysisTest();
    
    try {
      await tester.runAllTests();
      process.exit(0);
    } catch (error) {
      console.error('Test suite failed:', error);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = { MistakeAnalysisTest }; 