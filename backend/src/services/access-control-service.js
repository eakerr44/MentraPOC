// Comprehensive Access Control Service for Role-Based Data Filtering
const { Pool } = require('pg');
const {
  AccessControlAudit,
  PermissionManager,
  RelationshipValidator,
  DataFilterBuilder,
  AccessControlError
} = require('../middleware/access-control');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Access Control Service for managing data access and filtering
 */
class AccessControlService {
  
  /**
   * Check if a user has permission to perform an action on a resource
   */
  static async checkPermission(userId, userRole, resource, action, context = {}) {
    try {
      // Use database function for permission checking
      const result = await pool.query(
        'SELECT check_user_permission($1, $2, $3, $4) as has_permission',
        [userId, resource, action, context.resourceId || null]
      );
      
      return result.rows[0]?.has_permission || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a user role
   */
  static async getUserPermissions(userId, userRole) {
    try {
      const query = `
        SELECT rp.resource_type, rp.resource_category, rp.action, rp.permission_level,
               rp.conditions, upo.permission_level as override_level
        FROM role_permissions rp
        LEFT JOIN user_permission_overrides upo ON (
          upo.user_id = $1 AND 
          upo.resource_type = rp.resource_type AND 
          upo.action = rp.action AND
          (upo.expires_at IS NULL OR upo.expires_at > CURRENT_TIMESTAMP)
        )
        WHERE rp.role_name = $2
        ORDER BY rp.resource_type, rp.action
      `;
      
      const result = await pool.query(query, [userId, userRole]);
      
      const permissions = {};
      result.rows.forEach(row => {
        const key = `${row.resource_type}.${row.action}`;
        const permissionLevel = row.override_level || row.permission_level;
        
        permissions[key] = {
          level: permissionLevel,
          category: row.resource_category,
          conditions: row.conditions,
          hasOverride: !!row.override_level
        };
      });
      
      return permissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return {};
    }
  }

  /**
   * Build secure SQL query with role-based filtering
   */
  static buildSecureQuery(baseQuery, userId, userRole, options = {}) {
    const {
      tableAlias = '',
      userIdColumn = 'user_id',
      studentIdColumn = 'student_id',
      teacherIdColumn = 'teacher_id',
      filterType = 'student',
      timeframe,
      privacySettings = {}
    } = options;

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    // Build role-based filters
    if (userRole === 'admin') {
      // Admin can see all data - no additional filters
    } else if (userRole === 'student') {
      // Students can only see their own data
      whereClauses.push(`${tableAlias}${userIdColumn} = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    } else if (userRole === 'teacher') {
      if (filterType === 'student') {
        // Teachers can see data for their assigned students
        whereClauses.push(`${tableAlias}${studentIdColumn} IN (
          SELECT tsa.student_id 
          FROM teacher_student_assignments tsa 
          WHERE tsa.teacher_id = $${paramIndex} AND tsa.status = 'active'
        )`);
        params.push(userId);
        paramIndex++;
      } else if (filterType === 'teacher') {
        // Teachers can see their own data
        whereClauses.push(`${tableAlias}${teacherIdColumn} = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
      }
    } else if (userRole === 'parent') {
      if (filterType === 'student') {
        // Parents can see data for their children
        whereClauses.push(`${tableAlias}${studentIdColumn} IN (
          SELECT pcr.child_id 
          FROM parent_child_relationships pcr 
          WHERE pcr.parent_id = $${paramIndex} AND pcr.status = 'active'
        )`);
        params.push(userId);
        paramIndex++;
      }
    }

    // Add time-based filtering
    if (timeframe) {
      const timeFilter = this.buildTimeFilter(timeframe, paramIndex, tableAlias);
      if (timeFilter.clause) {
        whereClauses.push(timeFilter.clause);
        params.push(...timeFilter.params);
        paramIndex += timeFilter.params.length;
      }
    }

    // Add privacy filtering
    if (Object.keys(privacySettings).length > 0) {
      const privacyFilter = this.buildPrivacyFilter(privacySettings, userRole, tableAlias);
      if (privacyFilter.clause) {
        whereClauses.push(privacyFilter.clause);
        params.push(...privacyFilter.params);
      }
    }

    // Combine base query with filters
    let secureQuery = baseQuery;
    if (whereClauses.length > 0) {
      const whereClause = whereClauses.join(' AND ');
      if (baseQuery.toLowerCase().includes('where')) {
        secureQuery += ` AND ${whereClause}`;
      } else {
        secureQuery += ` WHERE ${whereClause}`;
      }
    }

    return {
      query: secureQuery,
      params: params
    };
  }

  /**
   * Build time-based filter
   */
  static buildTimeFilter(timeframe, startParamIndex, tableAlias = '') {
    const now = new Date();
    let startDate;

    switch (timeframe) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
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
        return { clause: null, params: [] };
    }

    return {
      clause: `${tableAlias}created_at >= $${startParamIndex}`,
      params: [startDate.toISOString()]
    };
  }

  /**
   * Build privacy-based filter
   */
  static buildPrivacyFilter(privacySettings, userRole, tableAlias = '') {
    const clauses = [];
    const params = [];

    if (privacySettings.hide_personal_info && userRole !== 'admin') {
      clauses.push(`${tableAlias}is_personal = false`);
    }

    if (privacySettings.limit_data_sharing) {
      if (userRole === 'teacher') {
        clauses.push(`${tableAlias}shareable_with_teachers = true`);
      } else if (userRole === 'parent') {
        clauses.push(`${tableAlias}shareable_with_parents = true`);
      }
    }

    return {
      clause: clauses.length > 0 ? clauses.join(' AND ') : null,
      params: params
    };
  }

  /**
   * Get accessible students for a user
   */
  static async getAccessibleStudents(userId, userRole) {
    try {
      let query;
      let params;

      if (userRole === 'admin') {
        query = `
          SELECT u.id, u.first_name, u.last_name, u.username, s.grade_level
          FROM users u
          JOIN students s ON u.id = s.user_id
          WHERE u.role = 'student' AND u.status = 'active'
          ORDER BY u.last_name, u.first_name
        `;
        params = [];
      } else if (userRole === 'teacher') {
        query = `
          SELECT u.id, u.first_name, u.last_name, u.username, s.grade_level,
                 tsa.assignment_type, tsa.subject_area, tsa.permissions
          FROM users u
          JOIN students s ON u.id = s.user_id
          JOIN teacher_student_assignments tsa ON u.id = tsa.student_id
          WHERE tsa.teacher_id = $1 AND tsa.status = 'active' AND u.status = 'active'
          ORDER BY u.last_name, u.first_name
        `;
        params = [userId];
      } else if (userRole === 'parent') {
        query = `
          SELECT u.id, u.first_name, u.last_name, u.username, s.grade_level,
                 pcr.relationship_type, pcr.can_access_grades, pcr.can_view_detailed_progress
          FROM users u
          JOIN students s ON u.id = s.user_id
          JOIN parent_child_relationships pcr ON u.id = pcr.child_id
          WHERE pcr.parent_id = $1 AND pcr.status = 'active' AND u.status = 'active'
          ORDER BY u.last_name, u.first_name
        `;
        params = [userId];
      } else if (userRole === 'student') {
        query = `
          SELECT u.id, u.first_name, u.last_name, u.username, s.grade_level
          FROM users u
          JOIN students s ON u.id = s.user_id
          WHERE u.id = $1 AND u.status = 'active'
        `;
        params = [userId];
      } else {
        return [];
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting accessible students:', error);
      return [];
    }
  }

  /**
   * Get accessible teachers for a user
   */
  static async getAccessibleTeachers(userId, userRole) {
    try {
      let query;
      let params;

      if (userRole === 'admin') {
        query = `
          SELECT u.id, u.first_name, u.last_name, u.username, t.subject_areas
          FROM users u
          JOIN teachers t ON u.id = t.user_id
          WHERE u.role = 'teacher' AND u.status = 'active'
          ORDER BY u.last_name, u.first_name
        `;
        params = [];
      } else if (userRole === 'parent') {
        query = `
          SELECT DISTINCT u.id, u.first_name, u.last_name, u.username, t.subject_areas
          FROM users u
          JOIN teachers t ON u.id = t.user_id
          JOIN teacher_student_assignments tsa ON u.id = tsa.teacher_id
          JOIN parent_child_relationships pcr ON tsa.student_id = pcr.child_id
          WHERE pcr.parent_id = $1 AND pcr.status = 'active' AND tsa.status = 'active' 
            AND u.status = 'active'
          ORDER BY u.last_name, u.first_name
        `;
        params = [userId];
      } else if (userRole === 'teacher') {
        query = `
          SELECT u.id, u.first_name, u.last_name, u.username, t.subject_areas
          FROM users u
          JOIN teachers t ON u.id = t.user_id
          WHERE u.id = $1 AND u.status = 'active'
        `;
        params = [userId];
      } else {
        return [];
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting accessible teachers:', error);
      return [];
    }
  }

  /**
   * Filter data based on user permissions and relationships
   */
  static async filterData(data, userId, userRole, dataType, options = {}) {
    try {
      if (!data || data.length === 0) return data;
      if (userRole === 'admin') return data; // Admin can see all data

      const accessibleIds = await this.getAccessibleResourceIds(userId, userRole, dataType);
      
      return data.filter(item => {
        const resourceId = this.getResourceIdFromItem(item, dataType);
        return accessibleIds.includes(resourceId);
      });
    } catch (error) {
      console.error('Error filtering data:', error);
      return [];
    }
  }

  /**
   * Get accessible resource IDs for a user
   */
  static async getAccessibleResourceIds(userId, userRole, dataType) {
    try {
      if (userRole === 'admin') {
        // Admin can access all resources - return all IDs for the data type
        const query = this.getAllResourceIdsQuery(dataType);
        const result = await pool.query(query);
        return result.rows.map(row => row.id);
      }

      switch (dataType) {
        case 'students':
          const students = await this.getAccessibleStudents(userId, userRole);
          return students.map(s => s.id);
        
        case 'teachers':
          const teachers = await this.getAccessibleTeachers(userId, userRole);
          return teachers.map(t => t.id);
        
        case 'journal_entries':
          return await this.getAccessibleJournalEntryIds(userId, userRole);
        
        case 'problem_sessions':
          return await this.getAccessibleProblemSessionIds(userId, userRole);
        
        case 'goals':
          return await this.getAccessibleGoalIds(userId, userRole);
        
        default:
          return [];
      }
    } catch (error) {
      console.error('Error getting accessible resource IDs:', error);
      return [];
    }
  }

  /**
   * Get resource ID from data item
   */
  static getResourceIdFromItem(item, dataType) {
    switch (dataType) {
      case 'students':
      case 'teachers':
        return item.id || item.user_id;
      case 'journal_entries':
        return item.user_id;
      case 'problem_sessions':
        return item.student_id;
      case 'goals':
        return item.student_id;
      default:
        return item.id;
    }
  }

  /**
   * Validate access to specific resource
   */
  static async validateResourceAccess(userId, userRole, resourceType, resourceId, action = 'read') {
    try {
      // Check basic permission
      const hasPermission = await this.checkPermission(userId, userRole, resourceType, action);
      if (!hasPermission) {
        return { allowed: false, reason: 'insufficient_permissions' };
      }

      // Check relationship-based access
      switch (resourceType) {
        case 'student_data':
          return await RelationshipValidator.validateStudentAccess(userId, userRole, resourceId);
        case 'teacher_data':
          return await RelationshipValidator.validateTeacherAccess(userId, userRole, resourceId);
        case 'classroom':
          return await RelationshipValidator.validateClassroomAccess(userId, userRole, resourceId);
        default:
          return { allowed: true, reason: 'permission_granted' };
      }
    } catch (error) {
      console.error('Error validating resource access:', error);
      return { allowed: false, reason: 'validation_error' };
    }
  }

  /**
   * Get accessible journal entry IDs
   */
  static async getAccessibleJournalEntryIds(userId, userRole) {
    let query;
    let params;

    if (userRole === 'student') {
      query = 'SELECT id FROM journal_entries WHERE user_id = $1';
      params = [userId];
    } else if (userRole === 'teacher') {
      query = `
        SELECT je.id FROM journal_entries je
        JOIN teacher_student_assignments tsa ON je.user_id = tsa.student_id
        WHERE tsa.teacher_id = $1 AND tsa.status = 'active'
      `;
      params = [userId];
    } else if (userRole === 'parent') {
      query = `
        SELECT je.id FROM journal_entries je
        JOIN parent_child_relationships pcr ON je.user_id = pcr.child_id
        WHERE pcr.parent_id = $1 AND pcr.status = 'active'
      `;
      params = [userId];
    } else {
      return [];
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => row.id);
  }

  /**
   * Get accessible problem session IDs
   */
  static async getAccessibleProblemSessionIds(userId, userRole) {
    let query;
    let params;

    if (userRole === 'student') {
      query = 'SELECT id FROM problem_sessions WHERE student_id = $1';
      params = [userId];
    } else if (userRole === 'teacher') {
      query = `
        SELECT ps.id FROM problem_sessions ps
        JOIN teacher_student_assignments tsa ON ps.student_id = tsa.student_id
        WHERE tsa.teacher_id = $1 AND tsa.status = 'active'
      `;
      params = [userId];
    } else if (userRole === 'parent') {
      query = `
        SELECT ps.id FROM problem_sessions ps
        JOIN parent_child_relationships pcr ON ps.student_id = pcr.child_id
        WHERE pcr.parent_id = $1 AND pcr.status = 'active'
      `;
      params = [userId];
    } else {
      return [];
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => row.id);
  }

  /**
   * Get accessible goal IDs
   */
  static async getAccessibleGoalIds(userId, userRole) {
    let query;
    let params;

    if (userRole === 'student') {
      query = 'SELECT id FROM student_goals WHERE student_id = $1';
      params = [userId];
    } else if (userRole === 'teacher') {
      query = `
        SELECT sg.id FROM student_goals sg
        JOIN teacher_student_assignments tsa ON sg.student_id = tsa.student_id
        WHERE tsa.teacher_id = $1 AND tsa.status = 'active'
      `;
      params = [userId];
    } else if (userRole === 'parent') {
      query = `
        SELECT sg.id FROM student_goals sg
        JOIN parent_child_relationships pcr ON sg.student_id = pcr.child_id
        WHERE pcr.parent_id = $1 AND pcr.status = 'active'
      `;
      params = [userId];
    } else {
      return [];
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => row.id);
  }

  /**
   * Log access attempt with full context
   */
  static async logAccess(req, resource, action, result, reason = null, additionalData = {}) {
    try {
      await AccessControlAudit.logAccessAttempt(req, resource, action, result, reason);
      
      // Additional logging for sensitive operations
      if (action === 'delete' || action === 'export' || reason?.includes('denied')) {
        await pool.query(`
          INSERT INTO access_control_audit_log (
            user_id, user_role, resource, action, result, reason,
            ip_address, user_agent, request_data, session_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          req.user?.id || null,
          req.user?.role || 'anonymous',
          resource,
          action,
          result,
          reason,
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent'],
          JSON.stringify({
            ...additionalData,
            url: req.originalUrl,
            method: req.method,
            params: req.params,
            query: req.query
          }),
          req.sessionID || null
        ]);
      }
    } catch (error) {
      console.error('Error logging access:', error);
    }
  }

  /**
   * Generate access control report for audit
   */
  static async generateAccessReport(options = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date(),
      userId = null,
      resource = null,
      includeSuccessful = true,
      includeFailed = true
    } = options;

    try {
      let whereClause = 'WHERE created_at BETWEEN $1 AND $2';
      let params = [startDate, endDate];
      let paramIndex = 3;

      if (userId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      if (resource) {
        whereClause += ` AND resource = $${paramIndex}`;
        params.push(resource);
        paramIndex++;
      }

      const resultFilter = [];
      if (includeSuccessful) resultFilter.push("'granted'");
      if (includeFailed) resultFilter.push("'denied'", "'error'");
      
      if (resultFilter.length > 0) {
        whereClause += ` AND result IN (${resultFilter.join(', ')})`;
      }

      const query = `
        SELECT 
          user_role,
          resource,
          action,
          result,
          COUNT(*) as attempt_count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM access_control_audit_log
        ${whereClause}
        GROUP BY user_role, resource, action, result
        ORDER BY attempt_count DESC
      `;

      const result = await pool.query(query, params);
      
      return {
        reportPeriod: { startDate, endDate },
        accessPatterns: result.rows,
        totalAttempts: result.rows.reduce((sum, row) => sum + parseInt(row.attempt_count), 0)
      };
    } catch (error) {
      console.error('Error generating access report:', error);
      return { error: 'Failed to generate access report' };
    }
  }

  /**
   * Clean up expired permissions and sessions
   */
  static async cleanupExpiredData() {
    try {
      const results = {};

      // Clean up expired permission overrides
      const expiredPermsResult = await pool.query(`
        DELETE FROM user_permission_overrides 
        WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
      `);
      results.expiredPermissions = expiredPermsResult.rowCount;

      // Clean up old sessions
      const oldSessionsResult = await pool.query(`
        DELETE FROM user_sessions 
        WHERE last_activity < CURRENT_TIMESTAMP - INTERVAL '90 days'
      `);
      results.oldSessions = oldSessionsResult.rowCount;

      // Clean up old failed login attempts
      const oldFailuresResult = await pool.query(`
        DELETE FROM failed_login_attempts 
        WHERE attempt_time < CURRENT_TIMESTAMP - INTERVAL '30 days'
      `);
      results.oldFailures = oldFailuresResult.rowCount;

      // Run audit log cleanup
      const auditCleanupResult = await pool.query('SELECT cleanup_audit_logs()');
      results.auditLogs = auditCleanupResult.rows[0].cleanup_audit_logs;

      return results;
    } catch (error) {
      console.error('Error cleaning up expired data:', error);
      return { error: 'Failed to cleanup expired data' };
    }
  }
}

// Export the service
module.exports = {
  AccessControlService,
  
  // Utility functions for easy importing
  checkPermission: AccessControlService.checkPermission.bind(AccessControlService),
  buildSecureQuery: AccessControlService.buildSecureQuery.bind(AccessControlService),
  validateResourceAccess: AccessControlService.validateResourceAccess.bind(AccessControlService),
  getAccessibleStudents: AccessControlService.getAccessibleStudents.bind(AccessControlService),
  filterData: AccessControlService.filterData.bind(AccessControlService),
  logAccess: AccessControlService.logAccess.bind(AccessControlService)
}; 