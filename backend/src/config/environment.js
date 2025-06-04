const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Environment validation schema
const requiredEnvVars = {
  development: [
    'DATABASE_URL',
    'JWT_SECRET',
    'NODE_ENV'
  ],
  production: [
    'DATABASE_URL',
    'JWT_SECRET',
    'NODE_ENV',
    'FRONTEND_URL',
    'AI_API_KEY',
    'CHROMA_HOST',
    'CHROMA_PORT'
  ],
  staging: [
    'DATABASE_URL',
    'JWT_SECRET',
    'NODE_ENV',
    'FRONTEND_URL',
    'AI_API_KEY'
  ]
};

// Default configuration values
const defaultConfig = {
  // Server Configuration
  PORT: 3001,
  NODE_ENV: 'development',
  
  // Database Configuration
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  
  // JWT Configuration
  JWT_EXPIRES_IN: '7d',
  JWT_REFRESH_EXPIRES_IN: '30d',
  
  // Security Configuration
  BCRYPT_ROUNDS: 12,
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // AI Configuration
  AI_MODEL: 'llama2',
  AI_ENDPOINT: 'http://localhost:11434',
  
  // Vector Database Configuration
  CHROMA_HOST: 'localhost',
  CHROMA_PORT: 8000,
  CHROMA_COLLECTION_NAME: 'mentra_context',
  
  // Privacy & Compliance
  DATA_RETENTION_DAYS: 365,
  COPPA_MODE: true,
  ANALYTICS_ENABLED: false,
  
  // Logging Configuration
  LOG_LEVEL: 'info',
  LOG_FILE: 'logs/mentra.log'
};

// Environment-specific overrides
const environmentConfigs = {
  development: {
    NODE_ENV: 'development',
    FRONTEND_URL: 'http://localhost:5173',
    LOG_LEVEL: 'debug',
    ANALYTICS_ENABLED: false,
    RATE_LIMIT_MAX_REQUESTS: 1000, // More lenient for development
  },
  
  staging: {
    NODE_ENV: 'staging',
    LOG_LEVEL: 'info',
    ANALYTICS_ENABLED: true,
    DATA_RETENTION_DAYS: 90, // Shorter retention for staging
  },
  
  production: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'warn',
    ANALYTICS_ENABLED: true,
    BCRYPT_ROUNDS: 14, // Higher security for production
    RATE_LIMIT_MAX_REQUESTS: 50, // Stricter rate limiting
  }
};

// Get current environment
const getCurrentEnvironment = () => {
  return process.env.NODE_ENV || 'development';
};

// Validate required environment variables
const validateEnvironment = (env = getCurrentEnvironment()) => {
  const required = requiredEnvVars[env] || requiredEnvVars.development;
  const missing = [];
  
  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    environment: env
  };
};

// Get configuration value with environment-specific overrides
const getConfig = (key, fallback = null) => {
  const env = getCurrentEnvironment();
  
  // Check environment variable first
  if (process.env[key] !== undefined) {
    return process.env[key];
  }
  
  // Check environment-specific config
  if (environmentConfigs[env] && environmentConfigs[env][key] !== undefined) {
    return environmentConfigs[env][key];
  }
  
  // Check default config
  if (defaultConfig[key] !== undefined) {
    return defaultConfig[key];
  }
  
  // Return fallback
  return fallback;
};

// Get all configuration for current environment
const getAllConfig = () => {
  const env = getCurrentEnvironment();
  const envConfig = environmentConfigs[env] || {};
  
  // Merge configurations: defaults < environment-specific < process.env
  const config = {
    ...defaultConfig,
    ...envConfig
  };
  
  // Override with actual environment variables
  Object.keys(config).forEach(key => {
    if (process.env[key] !== undefined) {
      // Handle type conversion
      const envValue = process.env[key];
      
      // Convert boolean strings
      if (envValue === 'true') {
        config[key] = true;
      } else if (envValue === 'false') {
        config[key] = false;
      }
      // Convert numeric strings
      else if (/^\d+$/.test(envValue)) {
        config[key] = parseInt(envValue, 10);
      }
      // Keep as string
      else {
        config[key] = envValue;
      }
    }
  });
  
  return config;
};

// Database configuration based on environment
const getDatabaseConfig = () => {
  const env = getCurrentEnvironment();
  const config = getAllConfig();
  
  const baseConfig = {
    dialect: 'postgres',
    logging: env === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };
  
  // Environment-specific database settings
  if (env === 'production') {
    baseConfig.pool.max = 20;
    baseConfig.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    };
  } else if (env === 'staging') {
    baseConfig.pool.max = 15;
  }
  
  // Use DATABASE_URL if provided, otherwise construct from parts
  if (config.DATABASE_URL) {
    baseConfig.url = config.DATABASE_URL;
  } else {
    baseConfig.host = config.DB_HOST;
    baseConfig.port = config.DB_PORT;
    baseConfig.database = config.POSTGRES_DB;
    baseConfig.username = config.POSTGRES_USER;
    baseConfig.password = config.POSTGRES_PASSWORD;
  }
  
  return baseConfig;
};

// Security configuration based on environment
const getSecurityConfig = () => {
  const config = getAllConfig();
  const env = getCurrentEnvironment();
  
  return {
    jwt: {
      secret: config.JWT_SECRET,
      expiresIn: config.JWT_EXPIRES_IN,
      refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN
    },
    bcrypt: {
      rounds: config.BCRYPT_ROUNDS
    },
    rateLimit: {
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS
    },
    cors: {
      origin: config.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    },
    cookies: {
      secure: env === 'production',
      httpOnly: true,
      sameSite: env === 'production' ? 'strict' : 'lax'
    }
  };
};

// Vector database configuration
const getVectorDbConfig = () => {
  const config = getAllConfig();
  
  return {
    host: config.CHROMA_HOST,
    port: config.CHROMA_PORT,
    collectionName: config.CHROMA_COLLECTION_NAME,
    auth: config.CHROMA_AUTH_TOKEN || null
  };
};

// AI service configuration
const getAIConfig = () => {
  const config = getAllConfig();
  
  return {
    apiKey: config.AI_API_KEY,
    model: config.AI_MODEL,
    endpoint: config.AI_ENDPOINT,
    timeout: 30000, // 30 seconds
    retries: 3
  };
};

// Privacy and compliance configuration
const getPrivacyConfig = () => {
  const config = getAllConfig();
  
  return {
    dataRetentionDays: config.DATA_RETENTION_DAYS,
    coppaMode: config.COPPA_MODE,
    analyticsEnabled: config.ANALYTICS_ENABLED,
    cookieConsent: true,
    dataExportEnabled: true
  };
};

// Logging configuration
const getLoggingConfig = () => {
  const config = getAllConfig();
  const env = getCurrentEnvironment();
  
  return {
    level: config.LOG_LEVEL,
    file: config.LOG_FILE,
    console: env !== 'production',
    format: env === 'production' ? 'json' : 'simple',
    maxFiles: 5,
    maxSize: '10m'
  };
};

// Feature flags based on environment
const getFeatureFlags = () => {
  const env = getCurrentEnvironment();
  const config = getAllConfig();
  
  return {
    // Development features
    debugMode: env === 'development',
    testEndpoints: env !== 'production',
    mockData: env === 'development',
    
    // Production features
    analytics: config.ANALYTICS_ENABLED,
    emailNotifications: env === 'production',
    smsNotifications: false, // Not implemented yet
    
    // AI features
    aiScaffolding: true,
    contextInjection: true,
    safetyFilters: true,
    
    // Educational features
    journaling: true,
    problemSolving: true,
    dashboards: true,
    classroomManagement: true
  };
};

// Health check configuration
const getHealthCheckConfig = () => {
  return {
    timeout: 5000,
    interval: 30000,
    retries: 3,
    endpoints: {
      database: true,
      vectorDb: true,
      ai: false, // Optional service
      redis: false // Not implemented yet
    }
  };
};

// Export configuration summary for debugging
const getConfigSummary = () => {
  const env = getCurrentEnvironment();
  const validation = validateEnvironment(env);
  
  return {
    environment: env,
    validation,
    features: getFeatureFlags(),
    security: {
      jwtConfigured: !!getConfig('JWT_SECRET'),
      corsConfigured: !!getConfig('FRONTEND_URL'),
      bcryptRounds: getConfig('BCRYPT_ROUNDS')
    },
    database: {
      configured: !!getConfig('DATABASE_URL'),
      host: getConfig('DB_HOST'),
      port: getConfig('DB_PORT')
    },
    vectorDb: {
      configured: !!getConfig('CHROMA_HOST'),
      host: getConfig('CHROMA_HOST'),
      port: getConfig('CHROMA_PORT')
    },
    ai: {
      configured: !!getConfig('AI_API_KEY'),
      model: getConfig('AI_MODEL'),
      endpoint: getConfig('AI_ENDPOINT')
    }
  };
};

module.exports = {
  getCurrentEnvironment,
  validateEnvironment,
  getConfig,
  getAllConfig,
  getDatabaseConfig,
  getSecurityConfig,
  getVectorDbConfig,
  getAIConfig,
  getPrivacyConfig,
  getLoggingConfig,
  getFeatureFlags,
  getHealthCheckConfig,
  getConfigSummary
}; 