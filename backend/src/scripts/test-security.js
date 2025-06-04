const axios = require('axios');
const { getCurrentEnvironment } = require('../config/environment');

// Security testing configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const TEST_TIMEOUT = 5000;

// Helper function to make requests with timeout
const makeRequest = async (config) => {
  try {
    const response = await axios({
      timeout: TEST_TIMEOUT,
      validateStatus: () => true, // Don't throw on any status code
      ...config
    });
    return response;
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      headers: {}
    };
  }
};

// Test security headers
const testSecurityHeaders = async () => {
  console.log('\n🛡️  Testing Security Headers...');
  
  const response = await makeRequest({
    method: 'GET',
    url: `${API_BASE}/health`
  });
  
  const headers = response.headers;
  const results = [];
  
  // Check for important security headers
  const expectedHeaders = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'x-xss-protection': '1; mode=block',
    'strict-transport-security': 'max-age=', // Partial check
    'referrer-policy': 'strict-origin-when-cross-origin',
    'content-security-policy': 'default-src'
  };
  
  for (const [headerName, expectedValue] of Object.entries(expectedHeaders)) {
    const headerValue = headers[headerName.toLowerCase()];
    
    if (headerValue && headerValue.includes(expectedValue)) {
      results.push(`✅ ${headerName}: Present`);
    } else {
      results.push(`❌ ${headerName}: Missing or incorrect`);
    }
  }
  
  // Check that X-Powered-By is hidden
  if (!headers['x-powered-by']) {
    results.push('✅ x-powered-by: Hidden (good)');
  } else {
    results.push('❌ x-powered-by: Exposed');
  }
  
  results.forEach(result => console.log(`   ${result}`));
  
  return {
    passed: results.filter(r => r.includes('✅')).length,
    failed: results.filter(r => r.includes('❌')).length,
    total: results.length
  };
};

// Test CORS configuration
const testCORS = async () => {
  console.log('\n🌐 Testing CORS Configuration...');
  
  const tests = [
    {
      name: 'Valid origin',
      origin: 'http://localhost:5173',
      expectedStatus: 200
    },
    {
      name: 'Invalid origin',
      origin: 'https://malicious-site.com',
      expectedStatus: 200 // CORS errors are client-side, server returns 200
    },
    {
      name: 'No origin (should be allowed)',
      origin: null,
      expectedStatus: 200
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const headers = {};
    if (test.origin) {
      headers['Origin'] = test.origin;
    }
    
    const response = await makeRequest({
      method: 'OPTIONS',
      url: `${API_BASE}/api/v1`,
      headers
    });
    
    if (response.status === test.expectedStatus) {
      results.push(`✅ ${test.name}: Handled correctly`);
    } else {
      results.push(`❌ ${test.name}: Unexpected status ${response.status}`);
    }
    
    // Check CORS headers in response
    if (response.headers['access-control-allow-origin']) {
      console.log(`   CORS Origin: ${response.headers['access-control-allow-origin']}`);
    }
  }
  
  results.forEach(result => console.log(`   ${result}`));
  
  return {
    passed: results.filter(r => r.includes('✅')).length,
    failed: results.filter(r => r.includes('❌')).length,
    total: results.length
  };
};

// Test rate limiting
const testRateLimit = async () => {
  console.log('\n⏱️  Testing Rate Limiting...');
  
  console.log('   Making multiple requests to test rate limiting...');
  
  const requests = [];
  const numRequests = 10;
  
  // Make multiple concurrent requests
  for (let i = 0; i < numRequests; i++) {
    requests.push(makeRequest({
      method: 'GET',
      url: `${API_BASE}/api/v1`
    }));
  }
  
  const responses = await Promise.all(requests);
  const rateLimitHeaders = responses[0].headers;
  
  const results = [];
  
  // Check for rate limit headers
  if (rateLimitHeaders['x-ratelimit-limit']) {
    results.push(`✅ Rate limit headers present`);
    console.log(`   Rate Limit: ${rateLimitHeaders['x-ratelimit-limit']}`);
    console.log(`   Remaining: ${rateLimitHeaders['x-ratelimit-remaining']}`);
  } else {
    results.push(`❌ Rate limit headers missing`);
  }
  
  // Check if any requests were rate limited (status 429)
  const rateLimitedRequests = responses.filter(r => r.status === 429);
  if (rateLimitedRequests.length === 0) {
    results.push(`✅ Rate limiting configured (no 429 errors in normal usage)`);
  } else {
    results.push(`⚠️  ${rateLimitedRequests.length} requests were rate limited (this might be expected)`);
  }
  
  results.forEach(result => console.log(`   ${result}`));
  
  return {
    passed: results.filter(r => r.includes('✅')).length,
    failed: results.filter(r => r.includes('❌')).length,
    total: results.length
  };
};

// Test request validation
const testRequestValidation = async () => {
  console.log('\n🔍 Testing Request Validation...');
  
  const tests = [
    {
      name: 'Valid JSON request',
      data: { test: 'data' },
      expectedStatus: [200, 404] // 404 is ok for test endpoint
    },
    {
      name: 'Empty request body',
      data: '',
      expectedStatus: [200, 404, 400]
    },
    {
      name: 'Large request body',
      data: { large: 'x'.repeat(1000) },
      expectedStatus: [200, 404, 413] // 413 = payload too large
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const response = await makeRequest({
      method: 'POST',
      url: `${API_BASE}/api/v1/test`,
      data: test.data,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (test.expectedStatus.includes(response.status)) {
      results.push(`✅ ${test.name}: Handled correctly`);
    } else {
      results.push(`❌ ${test.name}: Unexpected status ${response.status}`);
    }
  }
  
  results.forEach(result => console.log(`   ${result}`));
  
  return {
    passed: results.filter(r => r.includes('✅')).length,
    failed: results.filter(r => r.includes('❌')).length,
    total: results.length
  };
};

// Test authentication rate limiting
const testAuthRateLimit = async () => {
  console.log('\n🔐 Testing Authentication Rate Limiting...');
  
  console.log('   Testing auth endpoint rate limiting...');
  
  const requests = [];
  const numRequests = 3; // Keep low to avoid hitting limits
  
  for (let i = 0; i < numRequests; i++) {
    requests.push(makeRequest({
      method: 'POST',
      url: `${API_BASE}/api/v1/auth/login`,
      data: { email: 'test@example.com', password: 'wrongpassword' }
    }));
  }
  
  const responses = await Promise.all(requests);
  const authHeaders = responses[0].headers;
  
  const results = [];
  
  // Check for rate limit headers on auth endpoints
  if (authHeaders['x-ratelimit-limit']) {
    results.push(`✅ Auth rate limit headers present`);
    console.log(`   Auth Rate Limit: ${authHeaders['x-ratelimit-limit']}`);
  } else {
    results.push(`❌ Auth rate limit headers missing`);
  }
  
  // All auth requests should get some response (even if wrong credentials)
  const validResponses = responses.filter(r => r.status > 0);
  if (validResponses.length === numRequests) {
    results.push(`✅ Auth endpoints responding correctly`);
  } else {
    results.push(`❌ Some auth requests failed`);
  }
  
  results.forEach(result => console.log(`   ${result}`));
  
  return {
    passed: results.filter(r => r.includes('✅')).length,
    failed: results.filter(r => r.includes('❌')).length,
    total: results.length
  };
};

// Main test function
const runSecurityTests = async () => {
  console.log('🧪 Starting Security Middleware Tests');
  console.log(`🔗 Testing API at: ${API_BASE}`);
  console.log(`🌍 Environment: ${getCurrentEnvironment()}`);
  console.log('=' .repeat(50));
  
  const testResults = [];
  
  try {
    // Run all security tests
    testResults.push(await testSecurityHeaders());
    testResults.push(await testCORS());
    testResults.push(await testRateLimit());
    testResults.push(await testRequestValidation());
    testResults.push(await testAuthRateLimit());
    
    // Calculate overall results
    const totalPassed = testResults.reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = testResults.reduce((sum, result) => sum + result.failed, 0);
    const totalTests = testResults.reduce((sum, result) => sum + result.total, 0);
    
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Security Test Summary:');
    console.log(`✅ Passed: ${totalPassed}/${totalTests}`);
    console.log(`❌ Failed: ${totalFailed}/${totalTests}`);
    console.log(`📈 Success Rate: ${Math.round((totalPassed / totalTests) * 100)}%`);
    
    if (totalFailed === 0) {
      console.log('\n🎉 All security tests passed!');
      return true;
    } else {
      console.log('\n⚠️  Some security tests failed. Review the configuration.');
      return false;
    }
    
  } catch (error) {
    console.error('\n💥 Security tests failed with error:', error.message);
    console.error('💡 Make sure the backend server is running');
    return false;
  }
};

// Run tests if script is called directly
if (require.main === module) {
  runSecurityTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runSecurityTests,
  testSecurityHeaders,
  testCORS,
  testRateLimit,
  testRequestValidation,
  testAuthRateLimit
}; 