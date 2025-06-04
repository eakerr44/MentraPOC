const axios = require('axios');
const { 
  hashPassword, 
  verifyPassword, 
  generateAccessToken, 
  verifyToken,
  cleanupExpiredSessions 
} = require('../services/auth-service');
require('dotenv').config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3001}/api/v1`;

// Test data
const testUser = {
  email: 'test@mentra.com',
  password: 'TestPassword123!',
  role: 'student',
  firstName: 'Test',
  lastName: 'Student',
  gradeLevel: 10,
  learningStyle: 'visual'
};

// Test JWT authentication system
const testAuthSystem = async () => {
  console.log('🧪 Starting JWT Authentication System Tests...\n');

  try {
    // Test 1: Password hashing and verification
    console.log('🔐 Testing password hashing and verification...');
    const hashedPassword = await hashPassword(testUser.password);
    const isPasswordValid = await verifyPassword(testUser.password, hashedPassword);
    const isWrongPasswordValid = await verifyPassword('wrongpassword', hashedPassword);
    
    if (isPasswordValid && !isWrongPasswordValid) {
      console.log('✅ Password hashing and verification working correctly');
    } else {
      throw new Error('Password hashing/verification failed');
    }

    // Test 2: JWT token generation and verification
    console.log('🎫 Testing JWT token generation and verification...');
    const mockUser = { id: 'test-id', email: testUser.email, role: testUser.role };
    const accessToken = generateAccessToken(mockUser);
    const tokenVerification = verifyToken(accessToken, 'access');
    
    if (tokenVerification.valid && tokenVerification.decoded.email === testUser.email) {
      console.log('✅ JWT token generation and verification working correctly');
    } else {
      throw new Error('JWT token generation/verification failed');
    }

    // Test 3: API health check
    console.log('🏥 Testing API health check...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`);
      if (healthResponse.status === 200 || healthResponse.status === 503) {
        console.log('✅ API health check endpoint working');
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('⚠️  API server not running. Start with: npm run dev');
        return { success: false, error: 'Server not running' };
      }
      throw error;
    }

    // Test 4: User registration
    console.log('👤 Testing user registration...');
    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUser);
      
      if (registerResponse.status === 201) {
        console.log('✅ User registration successful');
      } else {
        console.log('⚠️  Registration response:', registerResponse.status);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  User already exists (this is expected if running tests multiple times)');
      } else {
        console.error('❌ Registration failed:', error.response?.data || error.message);
        throw error;
      }
    }

    // Test 5: User login
    console.log('🔑 Testing user login...');
    let accessTokenFromLogin = null;
    let refreshTokenFromLogin = null;
    
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });

    if (loginResponse.status === 200 && loginResponse.data.accessToken) {
      accessTokenFromLogin = loginResponse.data.accessToken;
      // Note: refresh token would be in cookies in real usage
      console.log('✅ User login successful');
    } else {
      throw new Error('Login failed');
    }

    // Test 6: Protected route access
    console.log('🛡️  Testing protected route access...');
    const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessTokenFromLogin}`
      }
    });

    if (meResponse.status === 200 && meResponse.data.user) {
      console.log('✅ Protected route access working');
      console.log(`   User: ${meResponse.data.user.first_name} ${meResponse.data.user.last_name} (${meResponse.data.user.role})`);
    } else {
      throw new Error('Protected route access failed');
    }

    // Test 7: Invalid token handling
    console.log('🚫 Testing invalid token handling...');
    try {
      await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      throw new Error('Should have rejected invalid token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Invalid token properly rejected');
      } else {
        throw error;
      }
    }

    // Test 8: Token verification endpoint
    console.log('✅ Testing token verification endpoint...');
    const verifyResponse = await axios.get(`${API_BASE_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${accessTokenFromLogin}`
      }
    });

    if (verifyResponse.status === 200 && verifyResponse.data.authenticated) {
      console.log('✅ Token verification endpoint working');
    } else {
      throw new Error('Token verification failed');
    }

    // Test 9: User logout
    console.log('👋 Testing user logout...');
    const logoutResponse = await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${accessTokenFromLogin}`
      }
    });

    if (logoutResponse.status === 200) {
      console.log('✅ User logout successful');
    } else {
      throw new Error('Logout failed');
    }

    // Test 10: Session cleanup
    console.log('🧹 Testing session cleanup...');
    const cleanedCount = await cleanupExpiredSessions();
    console.log(`✅ Session cleanup completed (${cleanedCount} sessions cleaned)`);

    console.log('\n🎉 All JWT authentication tests passed successfully!');
    console.log('💡 Authentication system is ready for production\n');

    return {
      success: true,
      message: 'All authentication tests passed',
      test_user: {
        email: testUser.email,
        role: testUser.role,
        name: `${testUser.firstName} ${testUser.lastName}`
      }
    };

  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    console.error('💡 Make sure the backend server is running and database is connected\n');
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Cleanup test user (optional)
const cleanupTestUser = async () => {
  try {
    console.log('🧹 Cleaning up test user...');
    
    // Note: In a real implementation, you might want to add a delete user endpoint
    // For now, we'll just note that the test user exists for demo purposes
    console.log('ℹ️  Test user remains in database for demo purposes');
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Password: ${testUser.password}`);
    
  } catch (error) {
    console.error('❌ Failed to cleanup test user:', error);
  }
};

// Run tests if script is called directly
if (require.main === module) {
  const runTests = async () => {
    const testResult = await testAuthSystem();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('\n💡 Test user credentials for manual testing:');
      console.log(`   Email: ${testUser.email}`);
      console.log(`   Password: ${testUser.password}`);
      console.log(`   Role: ${testUser.role}`);
    }
    
    process.exit(testResult.success ? 0 : 1);
  };

  runTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testAuthSystem,
  cleanupTestUser,
  testUser
}; 