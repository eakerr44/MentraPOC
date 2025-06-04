const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const { 
  authenticateUser, 
  refreshAccessToken, 
  revokeSession, 
  revokeAllUserSessions,
  hashPassword,
  getUserByEmail,
  cleanupExpiredSessions
} = require('../services/auth-service');
const { 
  authenticateToken, 
  optionalAuth, 
  requireSelfOrAdmin 
} = require('../middleware/auth');
const { sequelize } = require('../config/database');

const router = express.Router();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 registration attempts per hour
  message: {
    error: 'Too many registration attempts',
    message: 'Please try again later'
  }
});

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  })
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])')).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match'
  }),
  role: Joi.string().valid('student', 'teacher', 'parent').required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  dateOfBirth: Joi.date().max('now').optional(),
  // Profile-specific fields
  gradeLevel: Joi.when('role', { is: 'student', then: Joi.number().min(1).max(12) }),
  learningStyle: Joi.when('role', { is: 'student', then: Joi.string().valid('visual', 'auditory', 'kinesthetic', 'reading_writing') }),
  schoolName: Joi.when('role', { is: 'teacher', then: Joi.string().max(255) }),
  subjectsTaught: Joi.when('role', { is: 'teacher', then: Joi.array().items(Joi.string()) }),
  relationshipType: Joi.when('role', { is: 'parent', then: Joi.string().max(50) })
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required'
  })
});

// Helper function to get client IP and user agent
const getClientInfo = (req) => {
  const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  return { ipAddress, userAgent };
};

// POST /api/v1/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message,
        details: error.details
      });
    }

    const { email, password } = value;
    const { ipAddress, userAgent } = getClientInfo(req);

    // Authenticate user
    const authResult = await authenticateUser(email, password, ipAddress, userAgent);

    if (!authResult.success) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: authResult.message
      });
    }

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', authResult.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      success: true,
      message: authResult.message,
      user: authResult.user,
      accessToken: authResult.tokens.accessToken,
      expiresIn: authResult.tokens.expiresIn
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error'
    });
  }
});

// POST /api/v1/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message,
        details: error.details
      });
    }

    const {
      email,
      password,
      role,
      firstName,
      lastName,
      dateOfBirth,
      gradeLevel,
      learningStyle,
      schoolName,
      subjectsTaught,
      relationshipType
    } = value;

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Create user
      const userQuery = `
        INSERT INTO users (email, password_hash, role, status, first_name, last_name, date_of_birth)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, email, role, first_name, last_name, created_at
      `;

      const [userResult] = await sequelize.query(userQuery, {
        replacements: [
          email.toLowerCase(),
          passwordHash,
          role,
          'active', // Auto-activate for demo purposes
          firstName,
          lastName,
          dateOfBirth || null
        ],
        transaction
      });

      const newUser = userResult[0];

      // Create role-specific profile
      if (role === 'student') {
        const studentProfileQuery = `
          INSERT INTO student_profiles (user_id, grade_level, learning_style)
          VALUES ($1, $2, $3)
        `;
        await sequelize.query(studentProfileQuery, {
          replacements: [newUser.id, gradeLevel || null, learningStyle || null],
          transaction
        });
      } else if (role === 'teacher') {
        const teacherProfileQuery = `
          INSERT INTO teacher_profiles (user_id, school_name, subjects_taught)
          VALUES ($1, $2, $3)
        `;
        await sequelize.query(teacherProfileQuery, {
          replacements: [newUser.id, schoolName || null, subjectsTaught || []],
          transaction
        });
      } else if (role === 'parent') {
        const parentProfileQuery = `
          INSERT INTO parent_profiles (user_id, relationship_type)
          VALUES ($1, $2)
        `;
        await sequelize.query(parentProfileQuery, {
          replacements: [newUser.id, relationshipType || null],
          transaction
        });
      }

      // Create privacy settings
      const privacyQuery = `
        INSERT INTO privacy_settings (user_id, consent_date)
        VALUES ($1, CURRENT_TIMESTAMP)
      `;
      await sequelize.query(privacyQuery, {
        replacements: [newUser.id],
        transaction
      });

      await transaction.commit();

      // Remove sensitive data
      const { id, ...safeUser } = newUser;
      
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        user: safeUser
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'User exists',
        message: 'An account with this email already exists'
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error'
    });
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        message: 'No refresh token provided'
      });
    }

    // Refresh access token
    const refreshResult = await refreshAccessToken(refreshToken);

    if (!refreshResult.success) {
      // Clear invalid refresh token cookie
      res.clearCookie('refreshToken');
      return res.status(401).json({
        error: 'Token refresh failed',
        message: refreshResult.message
      });
    }

    res.json({
      success: true,
      message: refreshResult.message,
      accessToken: refreshResult.tokens.accessToken,
      expiresIn: refreshResult.tokens.expiresIn
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'Internal server error'
    });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      // Revoke the session
      await revokeSession(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Internal server error'
    });
  }
});

// POST /api/v1/auth/logout-all
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    // Revoke all user sessions
    const revokedCount = await revokeAllUserSessions(req.user.id);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: `Logged out from ${revokedCount} devices successfully`
    });

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Internal server error'
    });
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// GET /api/v1/auth/verify
router.get('/verify', optionalAuth, (req, res) => {
  res.json({
    authenticated: !!req.user,
    user: req.user || null
  });
});

// Admin endpoint to cleanup expired sessions
router.post('/cleanup-sessions', authenticateToken, async (req, res) => {
  try {
    // Only admins can trigger cleanup
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        message: 'Only administrators can cleanup sessions'
      });
    }

    const cleanedCount = await cleanupExpiredSessions();

    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired sessions`
    });

  } catch (error) {
    console.error('Session cleanup error:', error);
    res.status(500).json({
      error: 'Cleanup failed',
      message: 'Internal server error'
    });
  }
});

module.exports = router; 