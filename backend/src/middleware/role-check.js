const { sequelize } = require('../config/database');

// Middleware to ensure user can access classroom data
const requireClassroomAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Must be authenticated to access this resource'
      });
    }

    const classroomId = req.params.classroomId || req.body.classroomId;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (!classroomId) {
      return res.status(400).json({
        error: 'Missing classroom ID',
        message: 'Classroom ID is required for this operation'
      });
    }

    // Admin can access any classroom
    if (userRole === 'admin') {
      return next();
    }

    // Teacher can access their own classrooms
    if (userRole === 'teacher') {
      const teacherQuery = `
        SELECT id FROM classrooms 
        WHERE id = $1 AND teacher_id = $2
      `;
      
      const [result] = await sequelize.query(teacherQuery, {
        replacements: [classroomId, userId]
      });

      if (result.length > 0) {
        return next();
      }
    }

    // Student can access classrooms they're enrolled in
    if (userRole === 'student') {
      const studentQuery = `
        SELECT ce.classroom_id 
        FROM classroom_enrollments ce
        WHERE ce.classroom_id = $1 AND ce.student_id = $2 AND ce.status = 'active'
      `;
      
      const [result] = await sequelize.query(studentQuery, {
        replacements: [classroomId, userId]
      });

      if (result.length > 0) {
        return next();
      }
    }

    // Parent can access classrooms their children are enrolled in
    if (userRole === 'parent') {
      const parentQuery = `
        SELECT DISTINCT ce.classroom_id
        FROM classroom_enrollments ce
        JOIN student_profiles sp ON ce.student_id = sp.user_id
        WHERE ce.classroom_id = $1 AND sp.parent_id = $2 AND ce.status = 'active'
      `;
      
      const [result] = await sequelize.query(parentQuery, {
        replacements: [classroomId, userId]
      });

      if (result.length > 0) {
        return next();
      }
    }

    return res.status(403).json({
      error: 'Access denied',
      message: 'You do not have permission to access this classroom'
    });

  } catch (error) {
    console.error('Classroom access check error:', error);
    return res.status(500).json({
      error: 'Authorization error',
      message: 'Error checking classroom access permissions'
    });
  }
};

// Middleware to validate parent-child relationships
const requireParentChildRelationship = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Must be authenticated to access this resource'
      });
    }

    const studentId = req.params.studentId || req.body.studentId;
    const parentId = req.user.id;

    if (req.user.role !== 'parent') {
      return res.status(403).json({
        error: 'Parent access required',
        message: 'This endpoint requires parent role'
      });
    }

    if (!studentId) {
      return res.status(400).json({
        error: 'Missing student ID',
        message: 'Student ID is required for this operation'
      });
    }

    // Check if parent-child relationship exists
    const relationshipQuery = `
      SELECT sp.user_id 
      FROM student_profiles sp 
      WHERE sp.user_id = $1 AND sp.parent_id = $2
    `;
    
    const [result] = await sequelize.query(relationshipQuery, {
      replacements: [studentId, parentId]
    });

    if (result.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this student\'s data'
      });
    }

    // Add student info to request for convenience
    req.studentId = studentId;
    next();

  } catch (error) {
    console.error('Parent-child relationship check error:', error);
    return res.status(500).json({
      error: 'Authorization error',
      message: 'Error checking parent-child relationship'
    });
  }
};

// Middleware to ensure teacher can access their students
const requireTeacherStudentRelationship = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Must be authenticated to access this resource'
      });
    }

    const studentId = req.params.studentId || req.body.studentId;
    const teacherId = req.user.id;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        error: 'Teacher access required',
        message: 'This endpoint requires teacher role'
      });
    }

    if (!studentId) {
      return res.status(400).json({
        error: 'Missing student ID',
        message: 'Student ID is required for this operation'
      });
    }

    // Check if student is enrolled in teacher's classroom
    const enrollmentQuery = `
      SELECT ce.student_id 
      FROM classroom_enrollments ce
      JOIN classrooms c ON ce.classroom_id = c.id
      WHERE ce.student_id = $1 AND c.teacher_id = $2 AND ce.status = 'active'
    `;
    
    const [result] = await sequelize.query(enrollmentQuery, {
      replacements: [studentId, teacherId]
    });

    if (result.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this student\'s data'
      });
    }

    // Add student info to request for convenience
    req.studentId = studentId;
    next();

  } catch (error) {
    console.error('Teacher-student relationship check error:', error);
    return res.status(500).json({
      error: 'Authorization error',
      message: 'Error checking teacher-student relationship'
    });
  }
};

// Middleware for data privacy controls
const requirePrivacyConsent = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Must be authenticated to access this resource'
      });
    }

    const userId = req.user.id;

    // Check if user has given privacy consent
    const privacyQuery = `
      SELECT consent_date, data_sharing_consent, analytics_consent
      FROM privacy_settings 
      WHERE user_id = $1
    `;
    
    const [result] = await sequelize.query(privacyQuery, {
      replacements: [userId]
    });

    if (result.length === 0) {
      return res.status(403).json({
        error: 'Privacy consent required',
        message: 'Privacy consent must be given before accessing this feature'
      });
    }

    const privacySettings = result[0];

    // For COPPA compliance, additional checks for students under 13
    if (req.user.role === 'student') {
      const userQuery = `
        SELECT date_of_birth 
        FROM users 
        WHERE id = $1
      `;
      
      const [userResult] = await sequelize.query(userQuery, {
        replacements: [userId]
      });

      if (userResult.length > 0 && userResult[0].date_of_birth) {
        const birthDate = new Date(userResult[0].date_of_birth);
        const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        
        if (age < 13 && !privacySettings.data_sharing_consent) {
          return res.status(403).json({
            error: 'Parental consent required',
            message: 'Parental consent is required for users under 13'
          });
        }
      }
    }

    // Add privacy settings to request for use in business logic
    req.privacySettings = privacySettings;
    next();

  } catch (error) {
    console.error('Privacy consent check error:', error);
    return res.status(500).json({
      error: 'Authorization error',
      message: 'Error checking privacy consent'
    });
  }
};

// Middleware to check feature permissions based on role
const requireFeatureAccess = (featureName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Must be authenticated to access this resource'
      });
    }

    const userRole = req.user.role;

    // Define feature access by role
    const featurePermissions = {
      'journal_entry': ['student'],
      'journal_view': ['student', 'teacher', 'parent', 'admin'],
      'problem_solving': ['student'],
      'problem_review': ['student', 'teacher', 'admin'],
      'classroom_management': ['teacher', 'admin'],
      'student_progress': ['teacher', 'parent', 'admin'],
      'ai_scaffolding': ['student', 'teacher'],
      'data_export': ['teacher', 'admin'],
      'user_management': ['admin'],
      'analytics_dashboard': ['teacher', 'admin']
    };

    const allowedRoles = featurePermissions[featureName];

    if (!allowedRoles) {
      return res.status(404).json({
        error: 'Feature not found',
        message: `Feature '${featureName}' is not recognized`
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Feature access denied',
        message: `Feature '${featureName}' requires one of these roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Middleware to enforce data retention policies
const enforceDataRetention = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Must be authenticated to access this resource'
      });
    }

    // Only check retention for data access operations
    if (req.method !== 'GET') {
      return next();
    }

    const userId = req.params.userId || req.user.id;
    const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS) || 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Check if we're requesting old data that should be purged
    if (req.query.startDate) {
      const requestedDate = new Date(req.query.startDate);
      if (requestedDate < cutoffDate) {
        return res.status(410).json({
          error: 'Data expired',
          message: `Requested data is older than ${retentionDays} days and has been purged for privacy compliance`
        });
      }
    }

    next();

  } catch (error) {
    console.error('Data retention enforcement error:', error);
    return res.status(500).json({
      error: 'Data retention error',
      message: 'Error enforcing data retention policy'
    });
  }
};

module.exports = {
  requireClassroomAccess,
  requireParentChildRelationship,
  requireTeacherStudentRelationship,
  requirePrivacyConsent,
  requireFeatureAccess,
  enforceDataRetention
}; 