const { 
  getAdaptiveResponseGenerator, 
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

async function testAdaptiveResponseCore() {
  console.log(`${colors.bold}${colors.blue}🧠 Adaptive Response Generator - Core Features Test${colors.reset}\n`);
  console.log(`${colors.cyan}Testing core adaptation without ChromaDB dependencies${colors.reset}\n`);

  const adaptiveGenerator = getAdaptiveResponseGenerator();
  let passed = 0;
  let total = 0;

  // Test 1: Age-based development level detection
  console.log(`${colors.bold}${colors.yellow}Test 1: Age-Based Development Level Detection${colors.reset}`);
  total += 4;
  
  const ageTests = [
    { age: 7, expected: 'EARLY_ELEMENTARY' },
    { age: 10, expected: 'LATE_ELEMENTARY' },
    { age: 13, expected: 'MIDDLE_SCHOOL' },
    { age: 16, expected: 'HIGH_SCHOOL' }
  ];

  for (const test of ageTests) {
    try {
      const profile = await adaptiveGenerator.getStudentLearningProfile(
        `test-student-${test.age}`,
        "Test prompt",
        { studentAge: test.age }
      );

      if (profile.developmentLevel === test.expected) {
        console.log(`${colors.green}✅ Age ${test.age} → ${profile.developmentLevel}${colors.reset}`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Age ${test.age}: Expected ${test.expected}, got ${profile.developmentLevel}${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing age ${test.age}: ${error.message}${colors.reset}`);
    }
  }

  // Test 2: Vocabulary adaptation
  console.log(`\n${colors.bold}${colors.yellow}Test 2: Vocabulary Adaptation${colors.reset}`);
  total += 2;

  try {
    const complexText = "To synthesize this conceptual framework, we must analyze the fundamental theoretical underpinnings.";
    
    // Test adaptation for early elementary
    const earlyProfile = {
      developmentLevel: 'EARLY_ELEMENTARY',
      vocabularyLevel: VOCABULARY_LEVELS.EARLY_ELEMENTARY
    };
    
    const adaptedEarly = adaptiveGenerator.adaptVocabulary(complexText, earlyProfile, []);
    const hasSimpleWords = !adaptedEarly.toLowerCase().includes('synthesize') && 
                          !adaptedEarly.toLowerCase().includes('theoretical');
    
    if (hasSimpleWords) {
      console.log(`${colors.green}✅ Early elementary vocabulary simplified${colors.reset}`);
      console.log(`   Original: "${complexText}"`);
      console.log(`   Adapted: "${adaptedEarly}"`);
      passed++;
    } else {
      console.log(`${colors.red}❌ Early elementary vocabulary not simplified${colors.reset}`);
    }

    // Test that high school keeps complex vocabulary
    const highProfile = {
      developmentLevel: 'HIGH_SCHOOL',
      vocabularyLevel: VOCABULARY_LEVELS.HIGH_SCHOOL
    };
    
    const adaptedHigh = adaptiveGenerator.adaptVocabulary(complexText, highProfile, []);
    const keepsComplexWords = adaptedHigh.toLowerCase().includes('synthesize') || 
                             adaptedHigh.toLowerCase().includes('theoretical');
    
    if (keepsComplexWords) {
      console.log(`${colors.green}✅ High school vocabulary preserved${colors.reset}`);
      passed++;
    } else {
      console.log(`${colors.red}❌ High school vocabulary incorrectly simplified${colors.reset}`);
    }

  } catch (error) {
    console.log(`${colors.red}❌ Error testing vocabulary adaptation: ${error.message}${colors.reset}`);
  }

  // Test 3: Sentence structure adaptation
  console.log(`\n${colors.bold}${colors.yellow}Test 3: Sentence Structure Adaptation${colors.reset}`);
  total += 1;

  try {
    const longSentence = "Mathematics is a subject that requires systematic thinking and careful analysis of problems, and when students approach mathematical concepts with persistence and dedication, they often discover that what initially seemed challenging becomes manageable through practice and understanding of underlying principles.";
    
    const earlyProfile = {
      developmentLevel: 'EARLY_ELEMENTARY',
      vocabularyLevel: VOCABULARY_LEVELS.EARLY_ELEMENTARY
    };
    
    const adaptedSentence = adaptiveGenerator.adaptSentenceStructure(longSentence, earlyProfile, []);
    const sentences = adaptedSentence.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgLength = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length;
    
    if (avgLength <= VOCABULARY_LEVELS.EARLY_ELEMENTARY.sentenceLength.max + 5) {
      console.log(`${colors.green}✅ Long sentence broken down: ${avgLength.toFixed(1)} avg words${colors.reset}`);
      passed++;
    } else {
      console.log(`${colors.red}❌ Sentence not adequately simplified: ${avgLength.toFixed(1)} avg words${colors.reset}`);
    }

  } catch (error) {
    console.log(`${colors.red}❌ Error testing sentence adaptation: ${error.message}${colors.reset}`);
  }

  // Test 4: Token calculation
  console.log(`\n${colors.bold}${colors.yellow}Test 4: Token Limit Calculation${colors.reset}`);
  total += 1;

  try {
    const earlyProfile = {
      developmentLevel: 'EARLY_ELEMENTARY',
      performanceLevel: 'DEVELOPING'
    };
    
    const tokens = adaptiveGenerator.calculateMaxTokens(earlyProfile);
    const expectedRange = [200, 400];
    
    if (tokens >= expectedRange[0] && tokens <= expectedRange[1]) {
      console.log(`${colors.green}✅ Token limit appropriate: ${tokens} tokens for early elementary${colors.reset}`);
      passed++;
    } else {
      console.log(`${colors.red}❌ Token limit inappropriate: ${tokens} tokens${colors.reset}`);
    }

  } catch (error) {
    console.log(`${colors.red}❌ Error testing token calculation: ${error.message}${colors.reset}`);
  }

  // Test 5: Fallback response generation
  console.log(`\n${colors.bold}${colors.yellow}Test 5: Fallback Response Generation${colors.reset}`);
  total += 1;

  try {
    const fallback = adaptiveGenerator.generateFallbackResponse(
      { originalPrompt: "Test question", studentAge: 12 },
      new Error("Test error")
    );
    
    if (fallback.text && fallback.developmentLevel && fallback.responseMetadata.fallback) {
      console.log(`${colors.green}✅ Fallback response generated correctly${colors.reset}`);
      console.log(`   Level: ${fallback.developmentLevel}, Fallback: ${fallback.responseMetadata.fallback}`);
      passed++;
    } else {
      console.log(`${colors.red}❌ Fallback response incomplete${colors.reset}`);
    }

  } catch (error) {
    console.log(`${colors.red}❌ Error testing fallback: ${error.message}${colors.reset}`);
  }

  // Test 6: Complete adaptation with raw response
  console.log(`\n${colors.bold}${colors.yellow}Test 6: Complete Response Adaptation${colors.reset}`);
  total += 1;

  try {
    const response = await adaptiveGenerator.generateAdaptiveResponse({
      studentId: 'test-complete-adaptation',
      originalPrompt: "What is 2 + 2?",
      rawResponse: "To synthesize the mathematical framework for addition, we must analyze the fundamental concepts.",
      studentAge: 8
    });

    if (response.text && response.developmentLevel && response.adaptationFactors.length > 0) {
      console.log(`${colors.green}✅ Complete adaptation working:${colors.reset}`);
      console.log(`   Level: ${response.developmentLevel}`);
      console.log(`   Adaptations: ${response.adaptationFactors.length}`);
      console.log(`   Text: "${response.text.substring(0, 100)}..."`);
      passed++;
    } else {
      console.log(`${colors.red}❌ Complete adaptation failed${colors.reset}`);
    }

  } catch (error) {
    console.log(`${colors.red}❌ Error testing complete adaptation: ${error.message}${colors.reset}`);
  }

  // Final results
  const percentage = Math.round((passed / total) * 100);
  const status = percentage >= 80 ? colors.green : percentage >= 60 ? colors.yellow : colors.red;

  console.log(`\n${colors.bold}${colors.blue}📊 Core Features Test Results${colors.reset}`);
  console.log(`${status}${passed}/${total} tests passed (${percentage}%)${colors.reset}\n`);

  if (percentage >= 80) {
    console.log(`${colors.green}🎉 EXCELLENT: Core adaptive response features are working correctly!${colors.reset}`);
    console.log(`${colors.cyan}The system successfully adapts responses based on:${colors.reset}`);
    console.log(`  ✓ Student age and developmental level`);
    console.log(`  ✓ Vocabulary complexity`);
    console.log(`  ✓ Sentence structure and length`);
    console.log(`  ✓ Appropriate token limits`);
    console.log(`  ✓ Robust fallback behavior`);
  } else if (percentage >= 60) {
    console.log(`${colors.yellow}⚠️  GOOD: Most core features working, some refinements needed${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ NEEDS WORK: Core features require fixes before production use${colors.reset}`);
  }

  console.log(`\n${colors.cyan}Note: This test focuses on core adaptation logic without external dependencies.${colors.reset}`);
  console.log(`${colors.cyan}Full integration testing requires ChromaDB and complete context manager setup.${colors.reset}`);
}

// Run the test
if (require.main === module) {
  testAdaptiveResponseCore().catch(console.error);
}

module.exports = { testAdaptiveResponseCore }; 