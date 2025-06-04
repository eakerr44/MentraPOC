const { getAIService, AI_PROVIDERS, AIServiceError } = require('../services/ai-service');
const { getCurrentEnvironment } = require('../config/environment');

// Test configuration
const TEST_PROMPTS = [
  "Explain photosynthesis in simple terms for a 12-year-old student.",
  "What is 2 + 2 and why?",
  "Help me understand the water cycle.",
  "I'm struggling with fractions. Can you help?",
  "What's the difference between a noun and a verb?"
];

// Helper function to run tests with timeout
const runWithTimeout = async (testFn, timeout = 10000) => {
  return Promise.race([
    testFn(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Test timeout')), timeout)
    )
  ]);
};

// Test basic AI response generation
const testBasicResponse = async (aiService) => {
  console.log('\n🧪 Testing Basic AI Response Generation...');
  
  const prompt = TEST_PROMPTS[0];
  console.log(`   Prompt: "${prompt}"`);
  
  try {
    const response = await runWithTimeout(() => aiService.generateResponse(prompt));
    
    // Validate response structure
    const requiredFields = ['text', 'provider', 'model', 'usage', 'finishReason'];
    const missingFields = requiredFields.filter(field => !(field in response));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing response fields: ${missingFields.join(', ')}`);
    }
    
    if (!response.text || typeof response.text !== 'string') {
      throw new Error('Invalid response text');
    }
    
    if (response.text.length === 0) {
      throw new Error('Empty response text');
    }
    
    console.log(`   ✅ Response generated successfully`);
    console.log(`   Provider: ${response.provider}`);
    console.log(`   Model: ${response.model}`);
    console.log(`   Response time: ${response.responseTime}ms`);
    console.log(`   Tokens: ${response.usage.totalTokens}`);
    console.log(`   Preview: "${response.text.substring(0, 100)}..."`);
    
    return { success: true, response };
  } catch (error) {
    console.log(`   ❌ Basic response test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Test AI service health check
const testHealthCheck = async (aiService) => {
  console.log('\n🏥 Testing AI Service Health Check...');
  
  try {
    const health = await runWithTimeout(() => aiService.checkHealth(), 5000);
    
    console.log(`   Active Provider: ${health.activeProvider}`);
    console.log(`   Fallback Provider: ${health.fallbackProvider || 'None'}`);
    console.log(`   Overall Health: ${health.overall ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    for (const [provider, status] of Object.entries(health.providers)) {
      const healthIcon = status.healthy ? '✅' : '❌';
      const modelsInfo = status.models ? ` (${status.models.length} models)` : '';
      console.log(`   ${healthIcon} ${provider}${modelsInfo}`);
      
      if (!status.healthy && status.error) {
        console.log(`      Error: ${status.error}`);
      }
    }
    
    return { success: true, health };
  } catch (error) {
    console.log(`   ❌ Health check failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Test multiple prompts
const testMultiplePrompts = async (aiService) => {
  console.log('\n📝 Testing Multiple Prompts...');
  
  const results = [];
  
  for (let i = 0; i < Math.min(3, TEST_PROMPTS.length); i++) {
    const prompt = TEST_PROMPTS[i];
    console.log(`   Testing prompt ${i + 1}: "${prompt.substring(0, 50)}..."`);
    
    try {
      const response = await runWithTimeout(() => aiService.generateResponse(prompt), 8000);
      console.log(`   ✅ Success (${response.responseTime}ms)`);
      results.push({ success: true, prompt, response });
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.push({ success: false, prompt, error: error.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`   Summary: ${successCount}/${results.length} prompts successful`);
  
  return { success: successCount > 0, results };
};

// Test provider switching (if multiple providers available)
const testProviderSwitching = async (aiService) => {
  console.log('\n🔄 Testing Provider Switching...');
  
  try {
    const providerInfo = aiService.getProviderInfo();
    console.log(`   Available providers: ${providerInfo.available.join(', ')}`);
    console.log(`   Current active: ${providerInfo.active}`);
    
    if (providerInfo.available.length < 2) {
      console.log(`   ⚠️  Only one provider available, skipping switch test`);
      return { success: true, skipped: true };
    }
    
    // Find a different provider to switch to
    const alternativeProvider = providerInfo.available.find(p => p !== providerInfo.active);
    
    if (alternativeProvider) {
      console.log(`   Switching to: ${alternativeProvider}`);
      aiService.switchProvider(alternativeProvider);
      
      const newInfo = aiService.getProviderInfo();
      if (newInfo.active === alternativeProvider) {
        console.log(`   ✅ Successfully switched to ${alternativeProvider}`);
        
        // Test a quick response with the new provider
        const testResponse = await runWithTimeout(() => 
          aiService.generateResponse("Hello, this is a test.", { maxTokens: 50 }), 5000);
        
        console.log(`   ✅ New provider responding correctly`);
        
        // Switch back
        aiService.switchProvider(providerInfo.active);
        console.log(`   🔄 Switched back to original provider`);
        
        return { success: true };
      } else {
        throw new Error('Provider switch failed');
      }
    }
  } catch (error) {
    console.log(`   ❌ Provider switching test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Test response options (temperature, maxTokens, etc.)
const testResponseOptions = async (aiService) => {
  console.log('\n⚙️  Testing Response Options...');
  
  const testCases = [
    { description: 'Low temperature (more focused)', options: { temperature: 0.1, maxTokens: 100 } },
    { description: 'High temperature (more creative)', options: { temperature: 0.9, maxTokens: 100 } },
    { description: 'Limited tokens', options: { maxTokens: 50 } }
  ];
  
  const results = [];
  const basePrompt = "Explain gravity in one sentence.";
  
  for (const testCase of testCases) {
    console.log(`   Testing: ${testCase.description}`);
    
    try {
      const response = await runWithTimeout(() => 
        aiService.generateResponse(basePrompt, testCase.options), 6000);
      
      console.log(`   ✅ Success - ${response.usage.completionTokens} tokens`);
      results.push({ success: true, testCase, response });
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.push({ success: false, testCase, error: error.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  return { success: successCount > 0, results };
};

// Test error handling
const testErrorHandling = async (aiService) => {
  console.log('\n🚨 Testing Error Handling...');
  
  const errorTests = [
    { description: 'Empty prompt', prompt: '' },
    { description: 'Very long prompt', prompt: 'x'.repeat(20000) },
    { description: 'Null prompt', prompt: null }
  ];
  
  const results = [];
  
  for (const test of errorTests) {
    console.log(`   Testing: ${test.description}`);
    
    try {
      await aiService.generateResponse(test.prompt);
      console.log(`   ❌ Should have thrown an error`);
      results.push({ success: false, test, error: 'No error thrown' });
    } catch (error) {
      if (error instanceof AIServiceError) {
        console.log(`   ✅ Correctly threw AIServiceError: ${error.message}`);
        results.push({ success: true, test, error: error.message });
      } else {
        console.log(`   ⚠️  Threw non-AI error: ${error.message}`);
        results.push({ success: true, test, error: error.message });
      }
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  return { success: successCount === errorTests.length, results };
};

// Test available models
const testAvailableModels = async (aiService) => {
  console.log('\n🎭 Testing Available Models...');
  
  try {
    const models = await runWithTimeout(() => aiService.getAvailableModels(), 5000);
    
    if (Object.keys(models).length === 0) {
      console.log(`   ⚠️  No models available from any provider`);
      return { success: false, models };
    }
    
    for (const [provider, modelList] of Object.entries(models)) {
      console.log(`   ${provider}: ${modelList.length} model(s)`);
      if (modelList.length > 0) {
        console.log(`      ${modelList.slice(0, 3).join(', ')}${modelList.length > 3 ? '...' : ''}`);
      }
    }
    
    console.log(`   ✅ Models retrieved successfully`);
    return { success: true, models };
  } catch (error) {
    console.log(`   ❌ Failed to get models: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Main test runner
const runAIServiceTests = async () => {
  console.log('🤖 Starting AI Service Tests');
  console.log(`🌍 Environment: ${getCurrentEnvironment()}`);
  console.log('=' .repeat(60));
  
  let aiService;
  
  // Initialize AI service
  try {
    console.log('\n🚀 Initializing AI Service...');
    aiService = getAIService();
    console.log('✅ AI Service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize AI Service:', error.message);
    process.exit(1);
  }
  
  // Run all tests
  const testResults = [];
  
  testResults.push(await testHealthCheck(aiService));
  testResults.push(await testBasicResponse(aiService));
  testResults.push(await testMultiplePrompts(aiService));
  testResults.push(await testProviderSwitching(aiService));
  testResults.push(await testResponseOptions(aiService));
  testResults.push(await testErrorHandling(aiService));
  testResults.push(await testAvailableModels(aiService));
  
  // Calculate results
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.success).length;
  const skippedTests = testResults.filter(r => r.skipped).length;
  const failedTests = totalTests - passedTests - skippedTests;
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 AI Service Test Summary:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  if (skippedTests > 0) console.log(`⏭️  Skipped: ${skippedTests}/${totalTests}`);
  if (failedTests > 0) console.log(`❌ Failed: ${failedTests}/${totalTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / (totalTests - skippedTests)) * 100)}%`);
  
  if (passedTests >= totalTests - 1) { // Allow 1 failure
    console.log('\n🎉 AI Service tests completed successfully!');
    console.log('💡 The AI abstraction layer is ready for scaffolding engine integration');
    return true;
  } else {
    console.log('\n⚠️  Some AI Service tests failed. Review the configuration.');
    return false;
  }
};

// Run tests if script is called directly
if (require.main === module) {
  runAIServiceTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runAIServiceTests,
  testBasicResponse,
  testHealthCheck,
  testMultiplePrompts,
  testProviderSwitching,
  testResponseOptions,
  testErrorHandling,
  testAvailableModels
}; 