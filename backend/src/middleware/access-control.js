// Enhanced Role-Based Access Control and Data Filtering Middleware
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Access Control Error Classes
class AccessControlError extends Error {
  constructor(message, type = 'ACCESS_DENIED', statusCode = 403) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.name = 'AccessControlError';
  }
}

class DataFilterError extends Error {
  constructor(message, type = 'FILTER_ERROR', statusCode = 500) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.name = 'DataFilterError';
  }
}

// Audit Logger for Access Control Events
class AccessControlAudit {
  static async logAccessAttempt(req, resource, action, result, reason = null) {
    try {
      const logEntry = {
        user_id: req.user?.id || null,
        user_role: req.user?.role || 'anonymous',
        resource_type: resource || 'unknown',
        resource_id: req.params.studentId || req.params.childId || req.body.studentId || null,
        action: action,
        result: result, // 'granted', 'denied', 'error'
        reason: reason,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        timestamp: new Date(),
        request_data: {
          method: req.method,
          url: req.originalUrl,
          params: req.params,
          query: req.query
        }
      };

      await pool.query(`
        INSERT INTO access_control_audit_log (
          user_id, user_role, resource_type, resource_id, action, result,
          ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        logEntry.user_id, logEntry.user_role, logEntry.resource_type,
        logEntry.resource_id, logEntry.action, logEntry.result,
        logEntry.ip_address, logEntry.user_agent, logEntry.timestamp
      ]);

      // Log to console for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ACCESS CONTROL] ${result.toUpperCase()}: ${logEntry.user_role} ${action} ${resource}${reason ? ` - ${reason}` : ''}`);
      }

    } catch (error) {
      console.error('Failed to log access control event:', error);
    }
  }

  static async logSuspiciousActivity(req, activity, details) {
    try {
      await pool.query(`
        INSERT INTO security_alerts (
          user_id, user_role, activity_type, details, severity,
          ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        req.user?.id || null,
        req.user?.role || 'anonymous',
        activity,
        JSON.stringify(details),
        'medium',
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent'],
        new Date()
      ]);

      console.warn(`[SECURITY ALERT] ${activity}:`, details);
    } catch (error) {
      console.error('Failed to log security alert:', error);
    }
  }
}

// Permission Configuration System
class PermissionManager {
  static permissions = {
    // Student permissions
    student: {
      own_data: {
        journal: ['read', 'create', 'update'],
        problems: ['read', 'create', 'update'],
        goals: ['read', 'create', 'update'],
        achievements: ['read'],
        progress: ['read'],
        profile: ['read', 'update']
      },
      shared_data: {
        classroom: ['read'],
        public_resources: ['read']
      }
    },

    // Teacher permissions
    teacher: {
      own_data: {
        classroom: ['read', 'create', 'update', 'delete'],
        lesson_plans: ['read', 'create', 'update', 'delete'],
        assignments: ['read', 'create', 'update', 'delete'],
        profile: ['read', 'update']
      },
      student_data: {
        journal: ['read'], // Only assigned students
        problems: ['read', 'review'],
        goals: ['read', 'suggest'],
        achievements: ['read', 'create'],
        progress: ['read', 'analyze'],
        notes: ['read', 'create', 'update']
      },
      classroom_data: {
        analytics: ['read'],
        reports: ['read', 'create'],
        interventions: ['read', 'create', 'update']
      }
    },

    // Parent permissions
    parent: {
      child_data: {
        journal: ['read'], // Summary view only
        problems: ['read'], // Progress view only
        goals: ['read', 'collaborate'],
        achievements: ['read'],
        progress: ['read'],
        reports: ['read']
      },
      communication: {
        teachers: ['read', 'create'],
        school: ['read']
      },
      family_data: {
        goals: ['read', 'create', 'update'],
        resources: ['read', 'bookmark']
      }
    },

    // Admin permissions
    admin: {
      system: ['read', 'create', 'update', 'delete'],
      users: ['read', 'create', 'update', 'delete'],
      data: ['read', 'export', 'purge'],
      security: ['read', 'configure'],
      analytics: ['read', 'configure']
    }
  };

  static hasPermission(userRole, resource, action, context = {}) {
    const rolePermissions = this.permissions[userRole];
    if (!rolePermissions) return false;

    // Check direct permissions
    for (const category of Object.keys(rolePermissions)) {
      const categoryPerms = rolePermissions[category];
      if (categoryPerms[resource] && categoryPerms[resource].includes(action)) {
        return true;
      }
    }

    // Admin has all permissions
    if (userRole === 'admin') return true;

    return false;
  }

  static getPermissions(userRole, context = {}) {
    return this.permissions[userRole] || {};
  }
}

// Data Relationship Validator
class RelationshipValidator {
  static async validateStudentAccess(userId, userRole, studentId) {
    try {
      // Admin can access any student
      if (userRole === 'admin') return { allowed: true, reason: 'admin_access' };

      // Student can access their own data
      if (userRole === 'student' && userId === parseInt(studentId)) {
        return { allowed: true, reason: 'self_access' };
      }

      // Teacher can access assigned students
      if (userRole === 'teacher') {
        const teacherQuery = `
          SELECT tsa.student_id, tsa.assignment_type, tsa.permissions
          FROM teacher_student_assignments tsa
          WHERE tsa.teacher_id = $1 AND tsa.student_id = $2 AND tsa.status = 'active'
        `;
        const result = await pool.query(teacherQuery, [userId, studentId]);
        
        if (result.rows.length > 0) {
          return { 
            allowed: true, 
            reason: 'teacher_assignment',
            permissions: result.rows[0].permissions || {}
          };
        }
      }

      // Parent can access their children
      if (userRole === 'parent') {
        const parentQuery = `
          SELECT pcr.child_id, pcr.relationship_type, pcr.custody_status,
                 pcr.can_access_grades, pcr.can_view_detailed_progress
          FROM parent_child_relationships pcr
          WHERE pcr.parent_id = $1 AND pcr.child_id = $2 AND pcr.status = 'active'
        `;
        const result = await pool.query(parentQuery, [userId, studentId]);
        
        if (result.rows.length > 0) {
          return {
            allowed: true,
            reason: 'parent_child_relationship',
            permissions: {
              can_access_grades: result.rows[0].can_access_grades,
              can_view_detailed_progress: result.rows[0].can_view_detailed_progress
            }
          };
        }
      }

      return { allowed: false, reason: 'no_relationship' };
    } catch (error) {
      console.error('Error validating student access:', error);
      return { allowed: false, reason: 'validation_error' };
    }
  }

  static async validateTeacherAccess(userId, userRole, teacherId) {
    try {
      // Admin can access any teacher
      if (userRole === 'admin') return { allowed: true, reason: 'admin_access' };

      // Teacher can access their own data
      if (userRole === 'teacher' && userId === parseInt(teacherId)) {
        return { allowed: true, reason: 'self_access' };
      }

      // Parents can access their children's teachers
      if (userRole === 'parent') {
        const parentQuery = `
          SELECT DISTINCT tsa.teacher_id
          FROM teacher_student_assignments tsa
          JOIN parent_child_relationships pcr ON tsa.student_id = pcr.child_id
          WHERE pcr.parent_id = $1 AND tsa.teacher_id = $2 AND tsa.status = 'active' AND pcr.status = 'active'
        `;
        const result = await pool.query(parentQuery, [userId, teacherId]);
        
        if (result.rows.length > 0) {
          return { allowed: true, reason: 'parent_teacher_relationship' };
        }
      }

      return { allowed: false, reason: 'no_relationship' };
    } catch (error) {
      console.error('Error validating teacher access:', error);
      return { allowed: false, reason: 'validation_error' };
    }
  }

  static async validateClassroomAccess(userId, userRole, classroomId) {
    try {
      // Admin can access any classroom
      if (userRole === 'admin') return { allowed: true, reason: 'admin_access' };

      // Teacher can access their classrooms
      if (userRole === 'teacher') {
        const teacherQuery = `
          SELECT id FROM teacher_classrooms WHERE teacher_id = $1 AND classroom_id = $2 AND status = 'active'
        `;
        const result = await pool.query(teacherQuery, [userId, classroomId]);
        
        if (result.rows.length > 0) {
          return { allowed: true, reason: 'teacher_classroom' };
        }
      }

      // Student can access their enrolled classrooms
      if (userRole === 'student') {
        const studentQuery = `
          SELECT classroom_id FROM student_classroom_enrollments 
          WHERE student_id = $1 AND classroom_id = $2 AND status = 'active'
        `;
        const result = await pool.query(studentQuery, [userId, classroomId]);
        
        if (result.rows.length > 0) {
          return { allowed: true, reason: 'student_enrollment' };
        }
      }

      // Parent can access classrooms where their children are enrolled
      if (userRole === 'parent') {
        const parentQuery = `
          SELECT DISTINCT sce.classroom_id
          FROM student_classroom_enrollments sce
          JOIN parent_child_relationships pcr ON sce.student_id = pcr.child_id
          WHERE pcr.parent_id = $1 AND sce.classroom_id = $2 
            AND sce.status = 'active' AND pcr.status = 'active'
        `;
        const result = await pool.query(parentQuery, [userId, classroomId]);
        
        if (result.rows.length > 0) {
          return { allowed: true, reason: 'parent_child_enrollment' };
        }
      }

      return { allowed: false, reason: 'no_access' };
    } catch (error) {
      console.error('Error validating classroom access:', error);
      return { allowed: false, reason: 'validation_error' };
    }
  }
}

// Data Filter Builder
class DataFilterBuilder {
  static buildStudentDataFilter(userId, userRole, permissions = {}) {
    let filter = '';
    let params = [];
    let paramIndex = 1;

    if (userRole === 'admin') {
      // Admin can see all data
      return { filter: '', params: [] };
    }

    if (userRole === 'student') {
      // Students can only see their own data
      filter = `AND student_id = $${paramIndex}`;
      params.push(userId);
    } else if (userRole === 'teacher') {
      // Teachers can see data for their assigned students
      filter = `AND student_id IN (
        SELECT tsa.student_id 
        FROM teacher_student_assignments tsa 
        WHERE tsa.teacher_id = $${paramIndex} AND tsa.status = 'active'
      )`;
      params.push(userId);
    } else if (userRole === 'parent') {
      // Parents can see data for their children
      filter = `AND student_id IN (
        SELECT pcr.child_id 
        FROM parent_child_relationships pcr 
        WHERE pcr.parent_id = $${paramIndex} AND pcr.status = 'active'
      )`;
      params.push(userId);

      // Apply additional restrictions based on permissions
      if (permissions.can_view_detailed_progress === false) {
        filter += ` AND data_type != 'detailed_progress'`;
      }
    }

    return { filter, params };
  }

  static buildTeacherDataFilter(userId, userRole) {
    let filter = '';
    let params = [];

    if (userRole === 'admin') {
      return { filter: '', params: [] };
    }

    if (userRole === 'teacher') {
      filter = `AND teacher_id = $1`;
      params.push(userId);
    } else if (userRole === 'parent') {
      // Parents can see data for teachers of their children
      filter = `AND teacher_id IN (
        SELECT DISTINCT tsa.teacher_id
        FROM teacher_student_assignments tsa
        JOIN parent_child_relationships pcr ON tsa.student_id = pcr.child_id
        WHERE pcr.parent_id = $1 AND tsa.status = 'active' AND pcr.status = 'active'
      )`;
      params.push(userId);
    }

    return { filter, params };
  }

  static buildTimeRangeFilter(timeframe) {
    const now = new Date();
    let startDate;

    switch (timeframe) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return { filter: '', params: [] };
    }

    return {
      filter: 'AND created_at >= $',
      params: [startDate.toISOString()]
    };
  }

  static buildPrivacyFilter(userRole, privacySettings = {}) {
    let filter = '';
    let params = [];

    // Apply privacy filters based on settings
    if (privacySettings.hide_personal_info && userRole !== 'admin') {
      filter += ' AND is_personal = false';
    }

    if (privacySettings.limit_data_sharing && userRole === 'teacher') {
      filter += ' AND shareable_with_teachers = true';
    }

    if (privacySettings.limit_data_sharing && userRole === 'parent') {
      filter += ' AND shareable_with_parents = true';
    }

    return { filter, params };
  }
}

// Main Access Control Middleware Functions
const requireResourceAccess = (resourceType, action = 'read') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        await AccessControlAudit.logAccessAttempt(req, resourceType, action, 'denied', 'no_authentication');
        throw new AccessControlError('Authentication required', 'NO_AUTH', 401);
      }

      const { id: userId, role: userRole } = req.user;
      const hasPermission = PermissionManager.hasPermission(userRole, resourceType, action);

      if (!hasPermission) {
        await AccessControlAudit.logAccessAttempt(req, resourceType, action, 'denied', 'insufficient_permissions');
        throw new AccessControlError(
          `Permission denied: ${userRole} cannot ${action} ${resourceType}`,
          'INSUFFICIENT_PERMISSIONS'
        );
      }

      await AccessControlAudit.logAccessAttempt(req, resourceType, action, 'granted');
      next();

    } catch (error) {
      if (error instanceof AccessControlError) {
        return res.status(error.statusCode).json({
          error: error.type,
          message: error.message
        });
      }

      console.error('Access control error:', error);
      return res.status(500).json({
        error: 'ACCESS_CONTROL_ERROR',
        message: 'Internal server error during access control check'
      });
    }
  };
};

const requireStudentDataAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      await AccessControlAudit.logAccessAttempt(req, 'student_data', 'read', 'denied', 'no_authentication');
      throw new AccessControlError('Authentication required', 'NO_AUTH', 401);
    }

    const studentId = req.params.studentId || req.params.childId || req.body.studentId;
    if (!studentId) {
      throw new AccessControlError('Student ID is required', 'MISSING_STUDENT_ID', 400);
    }

    const validation = await RelationshipValidator.validateStudentAccess(
      req.user.id, 
      req.user.role, 
      studentId
    );

    if (!validation.allowed) {
      await AccessControlAudit.logAccessAttempt(
        req, 'student_data', 'read', 'denied', validation.reason
      );
      throw new AccessControlError(
        'You do not have permission to access this student\'s data',
        'STUDENT_ACCESS_DENIED'
      );
    }

    // Add validation result to request for use in route handlers
    req.accessValidation = validation;
    req.studentId = studentId;

    await AccessControlAudit.logAccessAttempt(
      req, 'student_data', 'read', 'granted', validation.reason
    );
    next();

  } catch (error) {
    if (error instanceof AccessControlError) {
      return res.status(error.statusCode).json({
        error: error.type,
        message: error.message
      });
    }

    console.error('Student data access control error:', error);
    return res.status(500).json({
      error: 'ACCESS_CONTROL_ERROR',
      message: 'Internal server error during student data access check'
    });
  }
};

const requireTeacherDataAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      await AccessControlAudit.logAccessAttempt(req, 'teacher_data', 'read', 'denied', 'no_authentication');
      throw new AccessControlError('Authentication required', 'NO_AUTH', 401);
    }

    const teacherId = req.params.teacherId || req.body.teacherId;
    if (!teacherId) {
      throw new AccessControlError('Teacher ID is required', 'MISSING_TEACHER_ID', 400);
    }

    const validation = await RelationshipValidator.validateTeacherAccess(
      req.user.id,
      req.user.role,
      teacherId
    );

    if (!validation.allowed) {
      await AccessControlAudit.logAccessAttempt(
        req, 'teacher_data', 'read', 'denied', validation.reason
      );
      throw new AccessControlError(
        'You do not have permission to access this teacher\'s data',
        'TEACHER_ACCESS_DENIED'
      );
    }

    req.accessValidation = validation;
    req.teacherId = teacherId;

    await AccessControlAudit.logAccessAttempt(
      req, 'teacher_data', 'read', 'granted', validation.reason
    );
    next();

  } catch (error) {
    if (error instanceof AccessControlError) {
      return res.status(error.statusCode).json({
        error: error.type,
        message: error.message
      });
    }

    console.error('Teacher data access control error:', error);
    return res.status(500).json({
      error: 'ACCESS_CONTROL_ERROR',
      message: 'Internal server error during teacher data access check'
    });
  }
};

const requireClassroomAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      await AccessControlAudit.logAccessAttempt(req, 'classroom', 'read', 'denied', 'no_authentication');
      throw new AccessControlError('Authentication required', 'NO_AUTH', 401);
    }

    const classroomId = req.params.classroomId || req.body.classroomId;
    if (!classroomId) {
      throw new AccessControlError('Classroom ID is required', 'MISSING_CLASSROOM_ID', 400);
    }

    const validation = await RelationshipValidator.validateClassroomAccess(
      req.user.id,
      req.user.role,
      classroomId
    );

    if (!validation.allowed) {
      await AccessControlAudit.logAccessAttempt(
        req, 'classroom', 'read', 'denied', validation.reason
      );
      throw new AccessControlError(
        'You do not have permission to access this classroom',
        'CLASSROOM_ACCESS_DENIED'
      );
    }

    req.accessValidation = validation;
    req.classroomId = classroomId;

    await AccessControlAudit.logAccessAttempt(
      req, 'classroom', 'read', 'granted', validation.reason
    );
    next();

  } catch (error) {
    if (error instanceof AccessControlError) {
      return res.status(error.statusCode).json({
        error: error.type,
        message: error.message
      });
    }

    console.error('Classroom access control error:', error);
    return res.status(500).json({
      error: 'ACCESS_CONTROL_ERROR',
      message: 'Internal server error during classroom access check'
    });
  }
};

// Data filtering middleware
const applyDataFilters = (options = {}) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'NO_AUTH',
          message: 'Authentication required for data filtering'
        });
      }

      const { id: userId, role: userRole } = req.user;
      const { filterType = 'student', timeframe } = options;

      let filters = {
        student: { filter: '', params: [] },
        teacher: { filter: '', params: [] },
        time: { filter: '', params: [] },
        privacy: { filter: '', params: [] }
      };

      // Build appropriate filters
      if (filterType === 'student' || options.includeStudentFilter) {
        filters.student = DataFilterBuilder.buildStudentDataFilter(
          userId, 
          userRole, 
          req.accessValidation?.permissions || {}
        );
      }

      if (filterType === 'teacher' || options.includeTeacherFilter) {
        filters.teacher = DataFilterBuilder.buildTeacherDataFilter(userId, userRole);
      }

      if (timeframe || req.query.timeframe) {
        filters.time = DataFilterBuilder.buildTimeRangeFilter(
          timeframe || req.query.timeframe
        );
      }

      if (req.privacySettings || options.includePrivacyFilter) {
        filters.privacy = DataFilterBuilder.buildPrivacyFilter(
          userRole, 
          req.privacySettings || {}
        );
      }

      // Combine filters
      const combinedFilter = Object.values(filters)
        .map(f => f.filter)
        .filter(f => f.length > 0)
        .join(' ');

      const combinedParams = Object.values(filters)
        .reduce((acc, f) => acc.concat(f.params), []);

      // Add to request for use in route handlers
      req.dataFilters = {
        sqlWhere: combinedFilter,
        params: combinedParams,
        individual: filters
      };

      next();

    } catch (error) {
      console.error('Data filtering error:', error);
      return res.status(500).json({
        error: 'DATA_FILTER_ERROR',
        message: 'Internal server error during data filtering'
      });
    }
  };
};

// Rate limiting for sensitive operations
const rateLimitSensitiveOperations = (req, res, next) => {
  // Implementation would depend on your rate limiting strategy
  // For now, we'll add basic tracking
  const key = `${req.user?.id || 'anonymous'}_${req.route.path}`;
  const now = Date.now();
  
  // This would typically use Redis or similar for production
  if (!global.rateLimitCache) global.rateLimitCache = new Map();
  
  const userRequests = global.rateLimitCache.get(key) || [];
  const recentRequests = userRequests.filter(time => now - time < 60000); // 1 minute window
  
  if (recentRequests.length >= 10) { // 10 requests per minute limit
    AccessControlAudit.logSuspiciousActivity(req, 'RATE_LIMIT_EXCEEDED', {
      endpoint: req.route.path,
      requestCount: recentRequests.length
    });
    
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.'
    });
  }
  
  recentRequests.push(now);
  global.rateLimitCache.set(key, recentRequests);
  
  next();
};

// Export all middleware functions and utilities
module.exports = {
  // Main middleware functions
  requireResourceAccess,
  requireStudentDataAccess,
  requireTeacherDataAccess,
  requireClassroomAccess,
  applyDataFilters,
  rateLimitSensitiveOperations,

  // Utility classes
  AccessControlAudit,
  PermissionManager,
  RelationshipValidator,
  DataFilterBuilder,

  // Error classes
  AccessControlError,
  DataFilterError
}; 