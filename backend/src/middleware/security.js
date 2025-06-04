const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { getSecurityConfig, getCurrentEnvironment } = require('../config/environment');

// Rate limiting configuration
const createRateLimiter = () => {
  const config = getSecurityConfig();
  const env = getCurrentEnvironment();
  
  // Base rate limiting configuration
  const baseConfig = {
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    },
    standardHeaders: 'draft-7', // Use standard X-RateLimit headers
    legacyHeaders: true, // Also include legacy headers for compatibility
    // Store rate limit info in headers for debugging in development
    skipSuccessfulRequests: env === 'production',
    keyGenerator: (req) => {
      // Use IP and user ID if available for more granular rate limiting
      return req.user ? `${req.ip}-${req.user.id}` : req.ip;
    }
  };
  
  return rateLimit(baseConfig);
};

// API-specific rate limiter (stricter)
const createAPIRateLimiter = () => {
  const config = getSecurityConfig();
  const env = getCurrentEnvironment();
  
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env === 'production' ? 100 : 500, // Stricter for production
    message: {
      error: 'Too many API requests',
      message: 'API rate limit exceeded. Please try again later.',
      retryAfter: 900 // 15 minutes
    },
    standardHeaders: 'draft-7',
    legacyHeaders: true,
    keyGenerator: (req) => {
      return req.user ? `api-${req.ip}-${req.user.id}` : `api-${req.ip}`;
    }
  });
};

// Authentication-specific rate limiter (very strict)
const createAuthRateLimiter = () => {
  const env = getCurrentEnvironment();
  
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env === 'production' ? 5 : 20, // Very strict for auth endpoints
    message: {
      error: 'Too many authentication attempts',
      message: 'Authentication rate limit exceeded. Please try again in 15 minutes.',
      retryAfter: 900
    },
    standardHeaders: 'draft-7',
    legacyHeaders: true,
    skipSuccessfulRequests: false, // Count all auth attempts
    keyGenerator: (req) => `auth-${req.ip}`
  });
};

// CORS configuration
const createCORSMiddleware = () => {
  const config = getSecurityConfig();
  const env = getCurrentEnvironment();
  
  // Enhanced CORS configuration
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // In development, allow localhost origins
      if (env === 'development') {
        const allowedDevelopmentOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173'
        ];
        
        if (allowedDevelopmentOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
          return callback(null, true);
        }
        
        // In development, block other origins but don't throw error
        console.warn(`CORS blocked origin in development: ${origin}`);
        return callback(null, false);
      }
      
      // Production/staging origin validation
      const allowedOrigins = Array.isArray(config.cors.origin) 
        ? config.cors.origin 
        : [config.cors.origin];
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        return callback(null, false);
      }
    },
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Forwarded-For',
      'X-Real-IP'
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200 // For legacy browser support
  };
  
  return cors(corsOptions);
};

// Security headers configuration
const createSecurityHeaders = () => {
  const env = getCurrentEnvironment();
  const config = getSecurityConfig();
  
  // Content Security Policy
  const cspDirectives = {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  };
  
  // Development-specific CSP relaxations
  if (env === 'development') {
    cspDirectives.scriptSrc.push("'unsafe-eval'"); // For development tools
    cspDirectives.connectSrc.push("ws://localhost:*"); // For WebSocket connections
    cspDirectives.connectSrc.push("http://localhost:*"); // For local API calls
  }
  
  const helmetMiddleware = helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: cspDirectives,
      reportOnly: false // Set to false so header is enforced, not just reported
    },
    
    // HTTP Strict Transport Security
    hsts: {
      maxAge: env === 'production' ? 31536000 : 3600, // 1 year in production, 1 hour otherwise
      includeSubDomains: env === 'production',
      preload: env === 'production'
    },
    
    // Prevent clickjacking
    frameguard: {
      action: 'deny'
    },
    
    // Prevent MIME type sniffing
    noSniff: true,
    
    // Disable XSS filter in helmet (we'll add it manually)
    xssFilter: false,
    
    // Referrer Policy
    referrerPolicy: {
      policy: ['strict-origin-when-cross-origin']
    },
    
    // Hide X-Powered-By header
    hidePoweredBy: true,
    
    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false
    },
    
    // Download options for IE8+
    ieNoOpen: true,
    
    // Permissions Policy (Feature Policy)
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      accelerometer: [],
      gyroscope: [],
      magnetometer: []
    }
  });
  
  // Create combined middleware that includes manual XSS protection header
  return [
    helmetMiddleware,
    (req, res, next) => {
      // Manually set XSS protection header for test compatibility
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    }
  ];
};

// Request size and validation middleware
const createRequestValidation = () => {
  return (req, res, next) => {
    // Log potentially suspicious requests in production
    if (getCurrentEnvironment() === 'production') {
      if (req.get('User-Agent') === '' || !req.get('User-Agent')) {
        console.warn(`Suspicious request without User-Agent from IP: ${req.ip}`);
      }
      
      if (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',').length > 3) {
        console.warn(`Suspicious request with many X-Forwarded-For headers from IP: ${req.ip}`);
      }
    }
    
    next();
  };
};

// Security logging middleware
const createSecurityLogger = () => {
  return (req, res, next) => {
    const env = getCurrentEnvironment();
    
    // Log failed authentication attempts
    res.on('finish', () => {
      if (req.path.includes('/auth/') && res.statusCode === 401) {
        console.warn(`Failed authentication attempt from IP: ${req.ip}, Path: ${req.path}, User-Agent: ${req.get('User-Agent')}`);
      }
      
      // Log suspicious 4xx errors in production
      if (env === 'production' && res.statusCode >= 400 && res.statusCode < 500) {
        if (res.statusCode === 404 && req.path.includes('..')) {
          console.warn(`Path traversal attempt from IP: ${req.ip}, Path: ${req.path}`);
        }
        
        if (res.statusCode === 403) {
          console.warn(`Forbidden access attempt from IP: ${req.ip}, Path: ${req.path}`);
        }
      }
    });
    
    next();
  };
};

// Main security middleware setup function
const setupSecurity = (app) => {
  const env = getCurrentEnvironment();
  
  console.log(`🛡️  Configuring security for ${env} environment...`);
  
  // Trust proxy for accurate IP addresses (required for rate limiting)
  app.set('trust proxy', 1);
  
  // Security headers (should be first)
  const securityHeaders = createSecurityHeaders();
  securityHeaders.forEach(middleware => app.use(middleware));
  
  // CORS configuration
  app.use(createCORSMiddleware());
  
  // Rate limiting (after CORS, before auth)
  const globalRateLimit = createRateLimiter();
  const apiRateLimit = createAPIRateLimiter();
  const authRateLimit = createAuthRateLimiter();
  
  // Apply global rate limiting
  app.use(globalRateLimit);
  
  // Apply stricter rate limiting to API routes
  app.use('/api/', apiRateLimit);
  
  // Apply very strict rate limiting to auth routes
  app.use('/api/v1/auth/', authRateLimit);
  
  // Request validation and security logging
  app.use(createRequestValidation());
  app.use(createSecurityLogger());
  
  console.log('✅ Security middleware configured successfully');
  
  return {
    globalRateLimit,
    apiRateLimit,
    authRateLimit
  };
};

module.exports = {
  setupSecurity,
  createRateLimiter,
  createAPIRateLimiter,
  createAuthRateLimiter,
  createCORSMiddleware,
  createSecurityHeaders,
  createRequestValidation,
  createSecurityLogger
}; 