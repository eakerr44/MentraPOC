#!/usr/bin/env node

// Test script for Role-Based Access Control System (Task 5.4)
// This script validates all aspects of the access control implementation

const { Pool } = require('pg');
const { AccessControlService } = require('../services/access-control-service');
const {
  AccessControlAudit,
  PermissionManager,
  RelationshipValidator,
  DataFilterBuilder
} = require('../middleware/access-control');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mentra_dev'
});

// Test configuration
const TEST_CONFIG = {
  verbose: process.argv.includes('--verbose'),
  skipCleanup: process.argv.includes('--skip-cleanup'),
  runOnly: process.argv.find(arg => arg.startsWith('--test='))?.split('=')[1] || null
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: []
};

// Console colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  if (TEST_CONFIG.verbose || color === 'red') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }
}

function logTest(testName, status, details = '') {
  const statusColor = status === 'PASS' ? 'green' : 'red';
  const statusSymbol = status === 'PASS' ? '✓' : '✗';
  console.log(`${colors[statusColor]}${statusSymbol} ${testName}${colors.reset}${details ? ` - ${details}` : ''}`);
  
  testResults.total++;
  if (status === 'PASS') {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push(`${testName}: ${details}`);
  }
}

// Test data setup
async function setupTestData() {
  log('Setting up test data...', 'cyan');
  
  try {
    // Create test users
    const testUsers = [
      { role: 'admin', name: 'Test Admin', email: 'admin@test.com' },
      { role: 'teacher', name: 'Test Teacher', email: 'teacher@test.com' },
      { role: 'student', name: 'Test Student', email: 'student@test.com' },
      { role: 'parent', name: 'Test Parent', email: 'parent@test.com' }
    ];

    const userIds = {};
    
    for (const user of testUsers) {
      const result = await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, status)
        VALUES ($1, 'test_hash', $2, 'User', $3, 'active')
        ON CONFLICT (email) DO UPDATE SET 
          first_name = EXCLUDED.first_name,
          role = EXCLUDED.role,
          status = EXCLUDED.status
        RETURNING id
      `, [user.email, user.name, user.role]);
      
      userIds[user.role] = result.rows[0].id;
    }

    // Create student profile
    await pool.query(`
      INSERT INTO students (user_id, grade_level)
      VALUES ($1, 8)
      ON CONFLICT (user_id) DO UPDATE SET grade_level = EXCLUDED.grade_level
    `, [userIds.student]);

    // Create teacher profile
    await pool.query(`
      INSERT INTO teachers (user_id, subject_areas, grade_levels_taught)
      VALUES ($1, ARRAY['Math', 'Science'], ARRAY[7, 8, 9])
      ON CONFLICT (user_id) DO UPDATE SET 
        subject_areas = EXCLUDED.subject_areas,
        grade_levels_taught = EXCLUDED.grade_levels_taught
    `, [userIds.teacher]);

    // Create parent profile
    await pool.query(`
      INSERT INTO parents (user_id, family_name)
      VALUES ($1, 'Test Family')
      ON CONFLICT (user_id) DO UPDATE SET family_name = EXCLUDED.family_name
    `, [userIds.parent]);

    // Create teacher-student assignment
    await pool.query(`
      INSERT INTO teacher_student_assignments (teacher_id, student_id, assignment_type, status)
      VALUES ($1, $2, 'primary', 'active')
      ON CONFLICT (teacher_id, student_id, subject_area) DO UPDATE SET
        assignment_type = EXCLUDED.assignment_type,
        status = EXCLUDED.status
    `, [userIds.teacher, userIds.student]);

    // Create parent-child relationship
    await pool.query(`
      INSERT INTO parent_child_relationships (parent_id, child_id, relationship_type, status)
      VALUES ($1, $2, 'parent', 'active')
      ON CONFLICT (parent_id, child_id) DO UPDATE SET
        relationship_type = EXCLUDED.relationship_type,
        status = EXCLUDED.status
    `, [userIds.parent, userIds.student]);

    // Create test journal entry
    await pool.query(`
      INSERT INTO journal_entries (user_id, title, content, mood, is_personal, shareable_with_teachers, shareable_with_parents)
      VALUES ($1, 'Test Journal Entry', 'This is a test entry', 'happy', false, true, true)
      ON CONFLICT DO NOTHING
    `, [userIds.student]);

    // Create test problem session
    await pool.query(`
      INSERT INTO problem_sessions (student_id, template_id, status, performance_rating)
      VALUES ($1, 1, 'completed', 'good')
      ON CONFLICT DO NOTHING
    `, [userIds.student]);

    log('Test data setup complete', 'green');
    return userIds;
  } catch (error) {
    log(`Error setting up test data: ${error.message}`, 'red');
    throw error;
  }
}

// Test permission checking
async function testPermissionChecking(userIds) {
  log('\n--- Testing Permission Checking ---', 'blue');

  try {
    // Test 1: Student can read their own journal
    const canStudentReadJournal = await AccessControlService.checkPermission(
      userIds.student, 'student', 'journal', 'read'
    );
    logTest('Student can read journal', canStudentReadJournal ? 'PASS' : 'FAIL');

    // Test 2: Student cannot delete journal (not in permissions)
    const canStudentDeleteJournal = await AccessControlService.checkPermission(
      userIds.student, 'student', 'journal', 'delete'
    );
    logTest('Student cannot delete journal', !canStudentDeleteJournal ? 'PASS' : 'FAIL');

    // Test 3: Teacher can read student journal
    const canTeacherReadJournal = await AccessControlService.checkPermission(
      userIds.teacher, 'teacher', 'journal', 'read'
    );
    logTest('Teacher can read student journal', canTeacherReadJournal ? 'PASS' : 'FAIL');

    // Test 4: Parent can read child data (restricted)
    const canParentReadJournal = await AccessControlService.checkPermission(
      userIds.parent, 'parent', 'journal', 'read'
    );
    logTest('Parent can read child journal (restricted)', canParentReadJournal ? 'PASS' : 'FAIL');

    // Test 5: Admin has all permissions
    const canAdminReadJournal = await AccessControlService.checkPermission(
      userIds.admin, 'admin', 'journal', 'read'
    );
    logTest('Admin can read any journal', canAdminReadJournal ? 'PASS' : 'FAIL');

  } catch (error) {
    logTest('Permission checking', 'FAIL', error.message);
  }
}

// Test relationship validation
async function testRelationshipValidation(userIds) {
  log('\n--- Testing Relationship Validation ---', 'blue');

  try {
    // Test 1: Teacher can access assigned student
    const teacherStudentAccess = await RelationshipValidator.validateStudentAccess(
      userIds.teacher, 'teacher', userIds.student
    );
    logTest('Teacher can access assigned student', teacherStudentAccess.allowed ? 'PASS' : 'FAIL');

    // Test 2: Parent can access their child
    const parentChildAccess = await RelationshipValidator.validateStudentAccess(
      userIds.parent, 'parent', userIds.student
    );
    logTest('Parent can access their child', parentChildAccess.allowed ? 'PASS' : 'FAIL');

    // Test 3: Student can access their own data
    const studentSelfAccess = await RelationshipValidator.validateStudentAccess(
      userIds.student, 'student', userIds.student
    );
    logTest('Student can access own data', studentSelfAccess.allowed ? 'PASS' : 'FAIL');

    // Test 4: Teacher cannot access unassigned student
    const unauthorizedAccess = await RelationshipValidator.validateStudentAccess(
      userIds.teacher, 'teacher', userIds.admin // Using admin ID as unassigned student
    );
    logTest('Teacher cannot access unassigned student', !unauthorizedAccess.allowed ? 'PASS' : 'FAIL');

    // Test 5: Admin can access any student
    const adminAccess = await RelationshipValidator.validateStudentAccess(
      userIds.admin, 'admin', userIds.student
    );
    logTest('Admin can access any student', adminAccess.allowed ? 'PASS' : 'FAIL');

  } catch (error) {
    logTest('Relationship validation', 'FAIL', error.message);
  }
}

// Test data filtering
async function testDataFiltering(userIds) {
  log('\n--- Testing Data Filtering ---', 'blue');

  try {
    // Test 1: Get accessible students for teacher
    const teacherStudents = await AccessControlService.getAccessibleStudents(userIds.teacher, 'teacher');
    const hasAssignedStudent = teacherStudents.some(s => s.id === userIds.student);
    logTest('Teacher can see assigned students', hasAssignedStudent ? 'PASS' : 'FAIL');

    // Test 2: Get accessible students for parent
    const parentStudents = await AccessControlService.getAccessibleStudents(userIds.parent, 'parent');
    const hasChild = parentStudents.some(s => s.id === userIds.student);
    logTest('Parent can see their children', hasChild ? 'PASS' : 'FAIL');

    // Test 3: Student can only see themselves
    const studentView = await AccessControlService.getAccessibleStudents(userIds.student, 'student');
    const onlySelf = studentView.length === 1 && studentView[0].id === userIds.student;
    logTest('Student can only see themselves', onlySelf ? 'PASS' : 'FAIL');

    // Test 4: Build secure query for journal entries
    const secureQuery = AccessControlService.buildSecureQuery(
      'SELECT * FROM journal_entries',
      userIds.teacher,
      'teacher',
      { filterType: 'student', studentIdColumn: 'user_id' }
    );
    const hasFilter = secureQuery.query.includes('teacher_student_assignments');
    logTest('Secure query includes teacher filter', hasFilter ? 'PASS' : 'FAIL');

    // Test 5: Time-based filtering
    const timeQuery = AccessControlService.buildSecureQuery(
      'SELECT * FROM journal_entries',
      userIds.student,
      'student',
      { timeframe: '7d' }
    );
    const hasTimeFilter = timeQuery.query.includes('created_at >=');
    logTest('Time-based filtering works', hasTimeFilter ? 'PASS' : 'FAIL');

  } catch (error) {
    logTest('Data filtering', 'FAIL', error.message);
  }
}

// Test audit logging
async function testAuditLogging(userIds) {
  log('\n--- Testing Audit Logging ---', 'blue');

  try {
    // Create mock request object
    const mockReq = {
      user: { id: userIds.student, role: 'student' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Test Agent' },
      originalUrl: '/test',
      method: 'GET',
      params: { id: '123' },
      query: { filter: 'test' }
    };

    // Test 1: Log successful access
    await AccessControlAudit.logAccessAttempt(mockReq, 'journal', 'read', 'granted', 'test_access');
    
    // Verify log entry exists
    const logQuery = await pool.query(`
      SELECT * FROM access_control_audit_log 
      WHERE user_id = $1 AND resource = 'journal' AND action = 'read' AND result = 'granted'
      ORDER BY created_at DESC LIMIT 1
    `, [userIds.student]);
    
    logTest('Audit log entry created', logQuery.rows.length > 0 ? 'PASS' : 'FAIL');

    // Test 2: Log denied access
    await AccessControlAudit.logAccessAttempt(mockReq, 'admin_panel', 'access', 'denied', 'insufficient_permissions');
    
    const deniedLogQuery = await pool.query(`
      SELECT * FROM access_control_audit_log 
      WHERE user_id = $1 AND resource = 'admin_panel' AND result = 'denied'
      ORDER BY created_at DESC LIMIT 1
    `, [userIds.student]);
    
    logTest('Denied access logged', deniedLogQuery.rows.length > 0 ? 'PASS' : 'FAIL');

    // Test 3: Security alert logging
    await AccessControlAudit.logSuspiciousActivity(mockReq, 'MULTIPLE_FAILED_LOGINS', {
      attempts: 5,
      timeframe: '5 minutes'
    });
    
    const alertQuery = await pool.query(`
      SELECT * FROM security_alerts 
      WHERE user_id = $1 AND activity_type = 'MULTIPLE_FAILED_LOGINS'
      ORDER BY created_at DESC LIMIT 1
    `, [userIds.student]);
    
    logTest('Security alert logged', alertQuery.rows.length > 0 ? 'PASS' : 'FAIL');

  } catch (error) {
    logTest('Audit logging', 'FAIL', error.message);
  }
}

// Test database functions
async function testDatabaseFunctions(userIds) {
  log('\n--- Testing Database Functions ---', 'blue');

  try {
    // Test 1: check_user_permission function
    const permissionCheck = await pool.query(`
      SELECT check_user_permission($1, 'journal', 'read') as has_permission
    `, [userIds.student]);
    
    logTest('Database permission check function', permissionCheck.rows[0].has_permission ? 'PASS' : 'FAIL');

    // Test 2: log_access_attempt function
    await pool.query(`
      SELECT log_access_attempt($1, 'student', 'test_resource', 'read', 'granted', 'function_test')
    `, [userIds.student]);
    
    const functionLogQuery = await pool.query(`
      SELECT * FROM access_control_audit_log 
      WHERE user_id = $1 AND resource = 'test_resource' AND reason = 'function_test'
      ORDER BY created_at DESC LIMIT 1
    `, [userIds.student]);
    
    logTest('Database logging function', functionLogQuery.rows.length > 0 ? 'PASS' : 'FAIL');

    // Test 3: detect_suspicious_login_activity function
    // First insert some failed login attempts
    await pool.query(`
      INSERT INTO failed_login_attempts (username_attempted, ip_address, failure_reason, attempt_time)
      VALUES ('test@example.com', '192.168.1.100', 'invalid_password', CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
             ('test@example.com', '192.168.1.100', 'invalid_password', CURRENT_TIMESTAMP - INTERVAL '3 minutes'),
             ('test@example.com', '192.168.1.100', 'invalid_password', CURRENT_TIMESTAMP - INTERVAL '1 minute')
    `);
    
    const suspiciousActivity = await pool.query('SELECT * FROM detect_suspicious_login_activity()');
    logTest('Suspicious activity detection', suspiciousActivity.rows.length > 0 ? 'PASS' : 'FAIL');

  } catch (error) {
    logTest('Database functions', 'FAIL', error.message);
  }
}

// Test data retention and cleanup
async function testDataRetention(userIds) {
  log('\n--- Testing Data Retention ---', 'blue');

  try {
    // Test 1: Insert old audit log entry
    await pool.query(`
      INSERT INTO access_control_audit_log (user_id, user_role, resource, action, result, created_at)
      VALUES ($1, 'student', 'test_old', 'read', 'granted', CURRENT_TIMESTAMP - INTERVAL '400 days')
    `, [userIds.student]);

    // Test 2: Run cleanup function
    const cleanupResult = await pool.query('SELECT cleanup_audit_logs()');
    const deletedCount = cleanupResult.rows[0].cleanup_audit_logs;
    
    logTest('Audit log cleanup', deletedCount >= 0 ? 'PASS' : 'FAIL', `Deleted ${deletedCount} old entries`);

    // Test 3: Check retention policy exists
    const retentionPolicy = await pool.query(`
      SELECT * FROM data_retention_policies 
      WHERE data_type = 'audit_logs' AND is_active = true
    `);
    
    logTest('Retention policy configured', retentionPolicy.rows.length > 0 ? 'PASS' : 'FAIL');

    // Test 4: Test service cleanup method
    const serviceCleanup = await AccessControlService.cleanupExpiredData();
    logTest('Service cleanup method', !serviceCleanup.error ? 'PASS' : 'FAIL');

  } catch (error) {
    logTest('Data retention', 'FAIL', error.message);
  }
}

// Test access control integration
async function testAccessControlIntegration(userIds) {
  log('\n--- Testing Access Control Integration ---', 'blue');

  try {
    // Test 1: Generate access report
    const report = await AccessControlService.generateAccessReport({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      includeSuccessful: true,
      includeFailed: true
    });
    
    logTest('Access report generation', !report.error ? 'PASS' : 'FAIL');

    // Test 2: User permissions retrieval
    const permissions = await AccessControlService.getUserPermissions(userIds.student, 'student');
    const hasJournalRead = permissions['journal.read']?.level === 'allowed';
    
    logTest('User permissions retrieval', hasJournalRead ? 'PASS' : 'FAIL');

    // Test 3: Resource access validation
    const validation = await AccessControlService.validateResourceAccess(
      userIds.teacher, 'teacher', 'student_data', userIds.student, 'read'
    );
    
    logTest('Resource access validation', validation.allowed ? 'PASS' : 'FAIL');

    // Test 4: Data filtering with service
    const testData = [
      { id: 1, user_id: userIds.student, content: 'Test 1' },
      { id: 2, user_id: userIds.admin, content: 'Test 2' }
    ];
    
    const filteredData = await AccessControlService.filterData(
      testData, userIds.teacher, 'teacher', 'journal_entries'
    );
    
    // Teacher should only see student's data (not admin's)
    const correctFiltering = filteredData.length === 1 && filteredData[0].user_id === userIds.student;
    logTest('Data filtering service', correctFiltering ? 'PASS' : 'FAIL');

  } catch (error) {
    logTest('Access control integration', 'FAIL', error.message);
  }
}

// Test role-based dashboard access
async function testDashboardAccess(userIds) {
  log('\n--- Testing Dashboard Access ---', 'blue');

  try {
    // Test 1: Student dashboard access
    const studentDashboard = await AccessControlService.checkPermission(
      userIds.student, 'student', 'progress', 'read'
    );
    logTest('Student can access own dashboard', studentDashboard ? 'PASS' : 'FAIL');

    // Test 2: Teacher classroom analytics access
    const teacherAnalytics = await AccessControlService.checkPermission(
      userIds.teacher, 'teacher', 'analytics', 'read'
    );
    logTest('Teacher can access classroom analytics', teacherAnalytics ? 'PASS' : 'FAIL');

    // Test 3: Parent child progress access
    const parentAccess = await AccessControlService.checkPermission(
      userIds.parent, 'parent', 'progress', 'read'
    );
    logTest('Parent can access child progress', parentAccess ? 'PASS' : 'FAIL');

    // Test 4: Cross-role access denial
    const studentAdminAccess = await AccessControlService.checkPermission(
      userIds.student, 'student', 'users', 'delete'
    );
    logTest('Student cannot access admin functions', !studentAdminAccess ? 'PASS' : 'FAIL');

  } catch (error) {
    logTest('Dashboard access', 'FAIL', error.message);
  }
}

// Clean up test data
async function cleanupTestData() {
  if (TEST_CONFIG.skipCleanup) {
    log('Skipping cleanup (--skip-cleanup flag)', 'yellow');
    return;
  }

  log('\nCleaning up test data...', 'cyan');
  
  try {
    // Clean up in reverse order to avoid foreign key constraints
    await pool.query("DELETE FROM access_control_audit_log WHERE reason LIKE '%test%'");
    await pool.query("DELETE FROM security_alerts WHERE activity_type = 'MULTIPLE_FAILED_LOGINS'");
    await pool.query("DELETE FROM failed_login_attempts WHERE ip_address = '192.168.1.100'");
    await pool.query("DELETE FROM teacher_student_assignments WHERE teacher_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')");
    await pool.query("DELETE FROM parent_child_relationships WHERE parent_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')");
    await pool.query("DELETE FROM journal_entries WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')");
    await pool.query("DELETE FROM problem_sessions WHERE student_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')");
    await pool.query("DELETE FROM students WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')");
    await pool.query("DELETE FROM teachers WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')");
    await pool.query("DELETE FROM parents WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')");
    await pool.query("DELETE FROM users WHERE email LIKE '%@test.com'");
    
    log('Test data cleanup complete', 'green');
  } catch (error) {
    log(`Error during cleanup: ${error.message}`, 'red');
  }
}

// Main test runner
async function runTests() {
  console.log(`${colors.bold}${colors.cyan}Mentra Access Control System Test Suite${colors.reset}\n`);

  try {
    // Setup
    const userIds = await setupTestData();

    // Define all tests
    const allTests = {
      permissions: () => testPermissionChecking(userIds),
      relationships: () => testRelationshipValidation(userIds),
      filtering: () => testDataFiltering(userIds),
      audit: () => testAuditLogging(userIds),
      database: () => testDatabaseFunctions(userIds),
      retention: () => testDataRetention(userIds),
      integration: () => testAccessControlIntegration(userIds),
      dashboard: () => testDashboardAccess(userIds)
    };

    // Run specific test or all tests
    if (TEST_CONFIG.runOnly) {
      if (allTests[TEST_CONFIG.runOnly]) {
        await allTests[TEST_CONFIG.runOnly]();
      } else {
        log(`Test '${TEST_CONFIG.runOnly}' not found. Available tests: ${Object.keys(allTests).join(', ')}`, 'red');
      }
    } else {
      // Run all tests
      for (const [testName, testFunction] of Object.entries(allTests)) {
        await testFunction();
      }
    }

    // Cleanup
    await cleanupTestData();

  } catch (error) {
    log(`\nFatal error: ${error.message}`, 'red');
    if (TEST_CONFIG.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }

  // Print results
  console.log(`\n${colors.bold}Test Results:${colors.reset}`);
  console.log(`${colors.green}✓ Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${testResults.failed}${colors.reset}`);
  console.log(`Total: ${testResults.total}`);

  if (testResults.failed > 0) {
    console.log(`\n${colors.red}${colors.bold}Failures:${colors.reset}`);
    testResults.errors.forEach(error => {
      console.log(`${colors.red}  - ${error}${colors.reset}`);
    });
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bold}All tests passed! ✓${colors.reset}`);
    console.log(`\n${colors.cyan}Access Control System is functioning correctly.${colors.reset}`);
  }
}

// Handle script arguments
if (require.main === module) {
  runTests().catch(error => {
    console.error(`${colors.red}Test execution failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  setupTestData,
  cleanupTestData
}; 