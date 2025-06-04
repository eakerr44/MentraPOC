const { 
  testChromaConnection, 
  initializeContextCollection,
  getCollectionStats,
  resetCollection 
} = require('../config/vector-db');

const { 
  storeLearningContext, 
  generateContextSummary,
  CONTEXT_TYPES 
} = require('../services/context-manager');

require('dotenv').config();

// Test ChromaDB connection and functionality
const testVectorDatabase = async () => {
  console.log('🧪 Starting ChromaDB Vector Database Tests...\n');

  try {
    // Test 1: Connection
    console.log('📡 Testing ChromaDB connection...');
    await testChromaConnection();
    console.log('✅ ChromaDB connection successful\n');

    // Test 2: Collection initialization
    console.log('📁 Testing collection initialization...');
    await initializeContextCollection();
    console.log('✅ Collection initialized successfully\n');

    // Test 3: Store sample learning contexts
    console.log('💾 Testing context storage...');
    const testStudentId = 'test-student-vector-db';

    const contexts = [
      {
        studentId: testStudentId,
        content: 'Student struggled with quadratic equations but showed improvement after visual explanation',
        contextType: CONTEXT_TYPES.PROBLEM_SOLVING,
        subject: 'mathematics',
        difficulty: 'medium',
        emotional_state: 'frustrated_then_engaged',
        performance_metrics: { accuracy: 0.6, time_spent: 450 }
      },
      {
        studentId: testStudentId,
        content: 'Excellent reflection on learning goals, showing strong metacognitive awareness',
        contextType: CONTEXT_TYPES.JOURNAL_ENTRY,
        subject: 'general',
        difficulty: 'easy',
        emotional_state: 'confident',
        performance_metrics: { quality: 0.9, reflection_depth: 0.8 }
      },
      {
        studentId: testStudentId,
        content: 'Made common algebraic mistake but self-corrected when prompted to check work',
        contextType: CONTEXT_TYPES.MISTAKE_ANALYSIS,
        subject: 'mathematics',
        difficulty: 'medium',
        emotional_state: 'determined',
        performance_metrics: { self_correction: true, accuracy: 0.8 }
      }
    ];

    for (const [index, context] of contexts.entries()) {
      console.log(`  Storing context ${index + 1}...`);
      await storeLearningContext(context);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('✅ All test contexts stored successfully\n');

    // Test 4: Check collection statistics
    console.log('📊 Testing collection statistics...');
    const stats = await getCollectionStats();
    console.log('✅ Collection stats:', JSON.stringify(stats, null, 2));
    console.log();

    // Test 5: Context retrieval and summarization
    console.log('🔍 Testing context retrieval...');
    const testQuery = 'Help me understand how to solve quadratic equations';
    const contextSummary = await generateContextSummary(testStudentId, testQuery);
    
    console.log('✅ Context summary generated:');
    console.log('Summary:', contextSummary.summary);
    console.log('Context available:', contextSummary.context_available);
    console.log('Found contexts:', contextSummary.raw_contexts?.length || 0);
    console.log();

    // Test 6: Different query to test similarity matching
    console.log('🎯 Testing similarity matching with different query...');
    const testQuery2 = 'I want to write a reflection about my learning progress';
    const contextSummary2 = await generateContextSummary(testStudentId, testQuery2);
    
    console.log('✅ Second context summary generated:');
    console.log('Summary:', contextSummary2.summary);
    console.log('Found contexts:', contextSummary2.raw_contexts?.length || 0);
    console.log();

    console.log('🎉 All ChromaDB tests passed successfully!');
    console.log('💡 Vector database is ready for AI context injection\n');

    return {
      success: true,
      message: 'All vector database tests passed',
      stats,
      test_contexts_stored: contexts.length
    };

  } catch (error) {
    console.error('❌ Vector database test failed:', error);
    console.error('💡 Make sure ChromaDB is running: docker-compose up -d chroma\n');
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Cleanup test data
const cleanupTestData = async () => {
  try {
    console.log('🧹 Cleaning up test data...');
    await resetCollection();
    console.log('✅ Test data cleaned up successfully');
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error);
  }
};

// Run tests if script is called directly
if (require.main === module) {
  const runTests = async () => {
    const testResult = await testVectorDatabase();
    
    // Ask if user wants to cleanup (in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('\n🤔 Do you want to cleanup test data? (Data will remain for demo purposes)');
      console.log('💡 You can manually reset with: resetCollection() function');
    }
    
    process.exit(testResult.success ? 0 : 1);
  };

  runTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testVectorDatabase,
  cleanupTestData
}; 