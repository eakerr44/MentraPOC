const { 
  getCurrentEnvironment, 
  validateEnvironment, 
  getConfigSummary 
} = require('../config/environment');
require('dotenv').config();

// Additional validation functions
const validateDatabaseConnection = async () => {
  try {
    const { testConnection } = require('../config/database');
    await testConnection();
    return { valid: true, message: 'Database connection successful' };
  } catch (error) {
    return { valid: false, message: `Database connection failed: ${error.message}` };
  }
};

const validateVectorDbConnection = async () => {
  try {
    const { testChromaConnection } = require('../config/vector-db');
    await testChromaConnection();
    return { valid: true, message: 'Vector database connection successful' };
  } catch (error) {
    return { valid: false, message: `Vector database connection failed: ${error.message}` };
  }
};

const validateJWTSecret = () => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    return { valid: false, message: 'JWT_SECRET is required' };
  }
  
  if (jwtSecret === 'your_jwt_secret_change_in_production') {
    return { valid: false, message: 'JWT_SECRET must be changed from default value' };
  }
  
  if (jwtSecret.length < 32) {
    return { valid: false, message: 'JWT_SECRET should be at least 32 characters long' };
  }
  
  return { valid: true, message: 'JWT_SECRET is valid' };
};

const validateAIConfiguration = () => {
  const env = getCurrentEnvironment();
  const aiApiKey = process.env.AI_API_KEY;
  const aiEndpoint = process.env.AI_ENDPOINT;
  
  // AI configuration is optional for development
  if (env === 'development') {
    return { valid: true, message: 'AI configuration is optional for development' };
  }
  
  if (!aiApiKey && !aiEndpoint) {
    return { valid: false, message: 'AI_API_KEY or AI_ENDPOINT is required for non-development environments' };
  }
  
  return { valid: true, message: 'AI configuration is valid' };
};

const validateSecurityConfiguration = () => {
  const env = getCurrentEnvironment();
  const errors = [];
  
  // Check BCRYPT_ROUNDS
  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  if (env === 'production' && bcryptRounds < 12) {
    errors.push('BCRYPT_ROUNDS should be at least 12 for production');
  }
  
  // Check FRONTEND_URL for non-development
  if (env !== 'development' && !process.env.FRONTEND_URL) {
    errors.push('FRONTEND_URL is required for non-development environments');
  }
  
  // Check NODE_ENV matches expected environment
  if (process.env.NODE_ENV && process.env.NODE_ENV !== env) {
    errors.push(`NODE_ENV (${process.env.NODE_ENV}) doesn't match expected environment (${env})`);
  }
  
  if (errors.length > 0) {
    return { valid: false, message: errors.join('; ') };
  }
  
  return { valid: true, message: 'Security configuration is valid' };
};

const validatePrivacyCompliance = () => {
  const env = getCurrentEnvironment();
  const warnings = [];
  
  // Check data retention settings
  const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS) || 365;
  if (retentionDays > 1095) { // 3 years
    warnings.push('DATA_RETENTION_DAYS is longer than 3 years - consider privacy implications');
  }
  
  // Check COPPA mode for environments handling student data
  const coppaMode = process.env.COPPA_MODE !== 'false';
  if (!coppaMode && (env === 'staging' || env === 'production')) {
    warnings.push('COPPA_MODE should be enabled for environments handling student data');
  }
  
  return { 
    valid: true, 
    message: warnings.length > 0 ? `Privacy warnings: ${warnings.join('; ')}` : 'Privacy configuration is valid',
    warnings 
  };
};

// Main validation function
const validateEnvironmentConfiguration = async () => {
  const env = getCurrentEnvironment();
  console.log(`🔍 Validating environment configuration for: ${env}\n`);
  
  const validationResults = [];
  
  // 1. Basic environment variables validation
  console.log('📋 Checking required environment variables...');
  const envValidation = validateEnvironment(env);
  validationResults.push({
    test: 'Environment Variables',
    ...envValidation
  });
  
  if (envValidation.valid) {
    console.log('✅ Required environment variables are present');
  } else {
    console.log('❌ Missing required environment variables:', envValidation.missing.join(', '));
  }
  
  // 2. JWT Secret validation
  console.log('\n🔐 Validating JWT configuration...');
  const jwtValidation = validateJWTSecret();
  validationResults.push({
    test: 'JWT Configuration',
    ...jwtValidation
  });
  
  if (jwtValidation.valid) {
    console.log('✅ JWT configuration is valid');
  } else {
    console.log('❌ JWT configuration error:', jwtValidation.message);
  }
  
  // 3. Security configuration validation
  console.log('\n🛡️  Validating security configuration...');
  const securityValidation = validateSecurityConfiguration();
  validationResults.push({
    test: 'Security Configuration',
    ...securityValidation
  });
  
  if (securityValidation.valid) {
    console.log('✅ Security configuration is valid');
  } else {
    console.log('❌ Security configuration error:', securityValidation.message);
  }
  
  // 4. AI configuration validation
  console.log('\n🤖 Validating AI configuration...');
  const aiValidation = validateAIConfiguration();
  validationResults.push({
    test: 'AI Configuration',
    ...aiValidation
  });
  
  if (aiValidation.valid) {
    console.log('✅ AI configuration is valid');
  } else {
    console.log('❌ AI configuration error:', aiValidation.message);
  }
  
  // 5. Privacy compliance validation
  console.log('\n🔒 Validating privacy compliance...');
  const privacyValidation = validatePrivacyCompliance();
  validationResults.push({
    test: 'Privacy Compliance',
    ...privacyValidation
  });
  
  if (privacyValidation.valid) {
    console.log('✅ Privacy configuration is valid');
    if (privacyValidation.warnings && privacyValidation.warnings.length > 0) {
      console.log('⚠️  Privacy warnings:', privacyValidation.message);
    }
  } else {
    console.log('❌ Privacy configuration error:', privacyValidation.message);
  }
  
  // 6. Database connection validation (optional for validation script)
  console.log('\n🗄️  Testing database connection...');
  const dbValidation = await validateDatabaseConnection();
  validationResults.push({
    test: 'Database Connection',
    ...dbValidation
  });
  
  if (dbValidation.valid) {
    console.log('✅ Database connection successful');
  } else {
    console.log('⚠️  Database connection warning:', dbValidation.message);
    console.log('   (This is normal if database is not running)');
  }
  
  // 7. Vector database connection validation (optional)
  console.log('\n🧠 Testing vector database connection...');
  const vectorDbValidation = await validateVectorDbConnection();
  validationResults.push({
    test: 'Vector Database Connection',
    ...vectorDbValidation
  });
  
  if (vectorDbValidation.valid) {
    console.log('✅ Vector database connection successful');
  } else {
    console.log('⚠️  Vector database connection warning:', vectorDbValidation.message);
    console.log('   (This is normal if ChromaDB is not running)');
  }
  
  // Summary
  console.log('\n📊 Validation Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const criticalTests = ['Environment Variables', 'JWT Configuration', 'Security Configuration'];
  const optionalTests = ['Database Connection', 'Vector Database Connection'];
  
  let criticalFailures = 0;
  let warnings = 0;
  
  validationResults.forEach(result => {
    const icon = result.valid ? '✅' : '❌';
    const status = result.valid ? 'PASS' : 'FAIL';
    
    if (!result.valid && criticalTests.includes(result.test)) {
      criticalFailures++;
    } else if (!result.valid && optionalTests.includes(result.test)) {
      warnings++;
    }
    
    console.log(`${icon} ${result.test}: ${status}`);
    if (!result.valid) {
      console.log(`   └─ ${result.message}`);
    }
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Overall result
  if (criticalFailures === 0) {
    console.log('🎉 Environment validation passed!');
    if (warnings > 0) {
      console.log(`⚠️  Note: ${warnings} optional service(s) not available (this is normal for some environments)`);
    }
    console.log('\n💡 Environment is ready for deployment\n');
    return true;
  } else {
    console.log(`❌ Environment validation failed with ${criticalFailures} critical error(s)`);
    console.log('\n🔧 Please fix the above issues before deploying\n');
    return false;
  }
};

// Configuration summary
const showConfigurationSummary = () => {
  console.log('📋 Configuration Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const summary = getConfigSummary();
  
  console.log(`Environment: ${summary.environment}`);
  console.log(`Features enabled: ${Object.entries(summary.features).filter(([,enabled]) => enabled).map(([name]) => name).join(', ')}`);
  console.log(`Database: ${summary.database.configured ? 'Configured' : 'Not configured'}`);
  console.log(`Vector DB: ${summary.vectorDb.configured ? 'Configured' : 'Not configured'}`);
  console.log(`AI Service: ${summary.ai.configured ? 'Configured' : 'Not configured'}`);
  console.log(`Security: JWT ${summary.security.jwtConfigured ? 'configured' : 'not configured'}, CORS ${summary.security.corsConfigured ? 'configured' : 'not configured'}`);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

// Run validation if script is called directly
if (require.main === module) {
  const runValidation = async () => {
    try {
      showConfigurationSummary();
      const isValid = await validateEnvironmentConfiguration();
      process.exit(isValid ? 0 : 1);
    } catch (error) {
      console.error('💥 Validation script failed:', error);
      process.exit(1);
    }
  };

  runValidation();
}

module.exports = {
  validateEnvironmentConfiguration,
  validateDatabaseConnection,
  validateVectorDbConnection,
  validateJWTSecret,
  validateAIConfiguration,
  validateSecurityConfiguration,
  validatePrivacyCompliance,
  showConfigurationSummary
}; 