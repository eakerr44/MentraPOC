const { verifyToken, getUserById } = require('../services/auth-service');
const { AccessControlService } = require('../services/access-control-service');
const { AccessControlAudit } = require('./access-control');

// Extract token from request headers
const extractTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and "token" formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  return authHeader;
};

// Enhanced authentication middleware with access control integration
const authenticateJWT = async (req, res, next) => {
  try {
    // Extract token from header
    const token = extractTokenFromHeader(req);
    
    if (!token) {
      await AccessControlAudit.logAccessAttempt(req, 'authentication', 'login', 'denied', 'no_token');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    // Development mode: Handle demo tokens
    if (process.env.NODE_ENV === 'development' && token.startsWith('demo-token-')) {
      console.log('🔧 DEV MODE: Using demo token authentication');
      
      // Create demo user for development
      const demoUser = {
        id: 'demo-user-1',
        email: 'demo@mentra.com',
        role: 'student',
        status: 'active',
        first_name: 'Demo',
        last_name: 'User',
        grade_level: '8th',
        learning_style: 'visual',
        school_name: 'Demo School',
        subjects_taught: null,
        relationship_type: null
      };

      req.user = {
        id: demoUser.id,
        email: demoUser.email,
        role: demoUser.role,
        status: demoUser.status,
        first_name: demoUser.first_name,
        last_name: demoUser.last_name,
        profile: {
          grade_level: demoUser.grade_level,
          learning_style: demoUser.learning_style,
          school_name: demoUser.school_name,
          subjects_taught: demoUser.subjects_taught,
          relationship_type: demoUser.relationship_type
        },
        permissions: ['read:own_data', 'write:own_data'] // Basic permissions for demo
      };
      
      req.token = {
        raw: token,
        decoded: { id: demoUser.id, role: demoUser.role }
      };

      console.log('✅ Demo user authenticated:', demoUser.email);
      return next();
    }

    // Verify token
    const tokenVerification = verifyToken(token, 'access');
    
    if (!tokenVerification.valid) {
      await AccessControlAudit.logAccessAttempt(req, 'authentication', 'login', 'denied', 'invalid_token');
      return res.status(401).json({
        error: 'Invalid token',
        message: tokenVerification.error
      });
    }

    // Get user details from database
    const user = await getUserById(tokenVerification.decoded.id);
    
    if (!user) {
      await AccessControlAudit.logAccessAttempt(req, 'authentication', 'login', 'denied', 'user_not_found');
      return res.status(401).json({
        error: 'User not found',
        message: 'Token refers to non-existent user'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      await AccessControlAudit.logAccessAttempt(req, 'authentication', 'login', 'denied', 'account_inactive');
      return res.status(401).json({
        error: 'Account inactive',
        message: 'User account is not active'
      });
    }

    // Add enhanced user information to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      first_name: user.first_name,
      last_name: user.last_name,
      profile: {
        grade_level: user.grade_level,
        learning_style: user.learning_style,
        school_name: user.school_name,
        subjects_taught: user.subjects_taught,
        relationship_type: user.relationship_type
      },
      permissions: await AccessControlService.getUserPermissions(user.id, user.role)
    };
    
    req.token = {
      raw: token,
      decoded: tokenVerification.decoded
    };

    // Log successful authentication
    await AccessControlAudit.logAccessAttempt(req, 'authentication', 'login', 'granted', 'valid_token');
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    await AccessControlAudit.logAccessAttempt(req, 'authentication', 'login', 'error', 'server_error');
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req);
    
    if (!token) {
      // No token provided, continue without user info
      req.user = null;
      req.token = null;
      return next();
    }

    // Verify token
    const tokenVerification = verifyToken(token, 'access');
    
    if (!tokenVerification.valid) {
      // Invalid token, continue without user info
      req.user = null;
      req.token = null;
      return next();
    }

    // Get user details
    const user = await getUserById(tokenVerification.decoded.id);
    
    if (!user || user.status !== 'active') {
      // User not found or inactive, continue without user info
      req.user = null;
      req.token = null;
      return next();
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      first_name: user.first_name,
      last_name: user.last_name,
      profile: {
        grade_level: user.grade_level,
        learning_style: user.learning_style,
        school_name: user.school_name,
        subjects_taught: user.subjects_taught,
        relationship_type: user.relationship_type
      },
      permissions: await AccessControlService.getUserPermissions(user.id, user.role)
    };
    
    req.token = {
      raw: token,
      decoded: tokenVerification.decoded
    };

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // For optional auth, continue even if there's an error
    req.user = null;
    req.token = null;
    next();
  }
};

// Enhanced role-based authorization middleware factory
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    // Ensure user is authenticated first
    if (!req.user) {
      await AccessControlAudit.logAccessAttempt(req, 'authorization', 'role_check', 'denied', 'no_authentication');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Must be authenticated to access this resource'
      });
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      await AccessControlAudit.logAccessAttempt(
        req, 'authorization', 'role_check', 'denied', 
        `required_role_${allowedRoles.join('_or_')}_current_${req.user.role}`
      );
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required role: ${allowedRoles.join(' or ')}. Current role: ${req.user.role}`
      });
    }

    await AccessControlAudit.logAccessAttempt(req, 'authorization', 'role_check', 'granted', `role_${req.user.role}`);
    next();
  };
};

// Enhanced permission-based middleware
const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    if (!req.user) {
      await AccessControlAudit.logAccessAttempt(req, resource, action, 'denied', 'no_authentication');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Must be authenticated to access this resource'
      });
    }

    const hasPermission = await AccessControlService.checkPermission(
      req.user.id, 
      req.user.role, 
      resource, 
      action
    );

    if (!hasPermission) {
      await AccessControlAudit.logAccessAttempt(req, resource, action, 'denied', 'insufficient_permissions');
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Permission denied: Cannot ${action} ${resource}`
      });
    }

    await AccessControlAudit.logAccessAttempt(req, resource, action, 'granted', 'permission_check_passed');
    next();
  };
};

// Specific role middleware functions
const requireStudent = requireRole('student');
const requireTeacher = requireRole('teacher');
const requireParent = requireRole('parent');
const requireAdmin = requireRole('admin');
const requireTeacherOrAdmin = requireRole('teacher', 'admin');
const requireParentOrTeacher = requireRole('parent', 'teacher');

// Self-access or admin middleware (user can access their own data or admin can access any)
const requireSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Must be authenticated to access this resource'
    });
  }

  const targetUserId = req.params.userId || req.params.id;
  const isAdmin = req.user.role === 'admin';
  const isSelf = req.user.id === parseInt(targetUserId);

  if (!isAdmin && !isSelf) {
    AccessControlAudit.logAccessAttempt(req, 'user_data', 'read', 'denied', 'not_self_or_admin');
    return res.status(403).json({
      error: 'Access denied',
      message: 'Can only access your own data unless you are an administrator'
    });
  }

  AccessControlAudit.logAccessAttempt(req, 'user_data', 'read', 'granted', isAdmin ? 'admin_access' : 'self_access');
  next();
};

// Enhanced student data access middleware with new access control system
const requireStudentDataAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      await AccessControlAudit.logAccessAttempt(req, 'student_data', 'read', 'denied', 'no_authentication');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Must be authenticated to access this resource'
      });
    }

    const targetStudentId = req.params.studentId || req.params.id;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Use the new access control service for validation
    const validation = await AccessControlService.validateResourceAccess(
      userId, 
      userRole, 
      'student_data', 
      targetStudentId, 
      'read'
    );

    if (!validation.allowed) {
      await AccessControlAudit.logAccessAttempt(
        req, 'student_data', 'read', 'denied', validation.reason
      );
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this student\'s data'
      });
    }

    // Add validation results to request for use in route handlers
    req.accessValidation = validation;
    req.studentId = targetStudentId;

    await AccessControlAudit.logAccessAttempt(
      req, 'student_data', 'read', 'granted', validation.reason
    );
    next();

  } catch (error) {
    console.error('Student data access check error:', error);
    await AccessControlAudit.logAccessAttempt(req, 'student_data', 'read', 'error', 'validation_error');
    return res.status(500).json({
      error: 'Authorization error',
      message: 'Error checking data access permissions'
    });
  }
};

// Data filtering middleware factory
const applyDataFiltering = (options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Must be authenticated for data filtering'
        });
      }

      // Build secure query filters
      const baseQuery = options.baseQuery || '';
      const secureQuery = AccessControlService.buildSecureQuery(
        baseQuery,
        req.user.id,
        req.user.role,
        {
          ...options,
          timeframe: req.query.timeframe || options.timeframe,
          privacySettings: req.privacySettings || {}
        }
      );

      // Add query info to request for route handlers
      req.secureQuery = secureQuery;
      req.accessibleStudents = await AccessControlService.getAccessibleStudents(req.user.id, req.user.role);
      req.accessibleTeachers = await AccessControlService.getAccessibleTeachers(req.user.id, req.user.role);

      next();
    } catch (error) {
      console.error('Data filtering middleware error:', error);
      return res.status(500).json({
        error: 'Data filtering error',
        message: 'Error applying data filters'
      });
    }
  };
};

// Session security middleware
const validateSession = async (req, res, next) => {
  try {
    if (!req.user || !req.token) {
      return next(); // Skip if not authenticated
    }

    // Check if session is still valid in database
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const sessionQuery = `
      SELECT id, is_active, last_activity, login_time
      FROM user_sessions
      WHERE user_id = $1 AND session_token = $2 AND is_active = true
    `;

    const result = await pool.query(sessionQuery, [req.user.id, req.token.raw]);

    if (result.rows.length === 0) {
      await AccessControlAudit.logAccessAttempt(req, 'session', 'validate', 'denied', 'session_not_found');
      return res.status(401).json({
        error: 'Session expired',
        message: 'Session is no longer valid'
      });
    }

    const session = result.rows[0];
    const lastActivity = new Date(session.last_activity);
    const now = new Date();
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

    if (now - lastActivity > sessionTimeout) {
      // Mark session as inactive
      await pool.query(
        'UPDATE user_sessions SET is_active = false, logout_time = CURRENT_TIMESTAMP WHERE id = $1',
        [session.id]
      );
      
      await AccessControlAudit.logAccessAttempt(req, 'session', 'validate', 'denied', 'session_timeout');
      return res.status(401).json({
        error: 'Session expired',
        message: 'Session has timed out'
      });
    }

    // Update last activity
    await pool.query(
      'UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
      [session.id]
    );

    req.sessionInfo = session;
    next();

  } catch (error) {
    console.error('Session validation error:', error);
    // Don't fail the request for session validation errors
    next();
  }
};

module.exports = {
  authenticateToken: authenticateJWT, // Maintain backwards compatibility
  authenticateJWT,
  optionalAuth,
  requireRole,
  requirePermission,
  requireStudent,
  requireTeacher,
  requireParent,
  requireAdmin,
  requireTeacherOrAdmin,
  requireParentOrTeacher,
  requireSelfOrAdmin,
  requireStudentDataAccess,
  applyDataFiltering,
  validateSession,
  extractTokenFromHeader
}; 