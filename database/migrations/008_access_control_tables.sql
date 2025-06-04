-- Migration 008: Access Control and Security Audit Tables
-- This migration adds tables for comprehensive access control logging, security monitoring,
-- and enhanced role-based access control for Task 5.4

-- Access Control Audit Log Table
CREATE TABLE IF NOT EXISTS access_control_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN ('granted', 'denied', 'error')),
    reason VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    request_data JSONB,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Security Alerts Table
CREATE TABLE IF NOT EXISTS security_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    activity_type VARCHAR(100) NOT NULL,
    details JSONB NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive')),
    ip_address INET,
    user_agent TEXT,
    handled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    handled_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Teacher-Student Assignment Table with Permissions
CREATE TABLE IF NOT EXISTS teacher_student_assignments (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) DEFAULT 'primary' CHECK (assignment_type IN ('primary', 'secondary', 'specialist', 'temporary')),
    subject_area VARCHAR(100),
    permissions JSONB DEFAULT '{
        "can_view_journal": true,
        "can_view_problems": true,
        "can_view_goals": true,
        "can_create_goals": true,
        "can_view_detailed_progress": true,
        "can_add_notes": true,
        "can_communicate_with_parents": true
    }',
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'expired')),
    assigned_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, student_id, subject_area)
);

-- Teacher Classroom Associations
CREATE TABLE IF NOT EXISTS teacher_classrooms (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    classroom_id INTEGER NOT NULL,
    role VARCHAR(50) DEFAULT 'primary' CHECK (role IN ('primary', 'co_teacher', 'substitute', 'aide')),
    permissions JSONB DEFAULT '{
        "can_manage_students": true,
        "can_create_assignments": true,
        "can_grade": true,
        "can_view_analytics": true,
        "can_communicate_with_parents": true
    }',
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, classroom_id)
);

-- Student Classroom Enrollments with Enhanced Tracking
CREATE TABLE IF NOT EXISTS student_classroom_enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    classroom_id INTEGER NOT NULL,
    enrollment_type VARCHAR(50) DEFAULT 'regular' CHECK (enrollment_type IN ('regular', 'special_needs', 'advanced', 'remedial')),
    enrollment_date DATE DEFAULT CURRENT_DATE,
    withdrawal_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred', 'graduated', 'dropped')),
    academic_year VARCHAR(20),
    semester VARCHAR(20),
    enrolled_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, classroom_id, academic_year, semester)
);

-- Role Permissions Table for Flexible Permission Management
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_category VARCHAR(100),
    action VARCHAR(50) NOT NULL,
    permission_level VARCHAR(20) DEFAULT 'allowed' CHECK (permission_level IN ('allowed', 'denied', 'restricted')),
    conditions JSONB, -- Additional conditions for permission (e.g., time-based, location-based)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_name, resource_type, resource_category, action)
);

-- User-Specific Permission Overrides
CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(100) NOT NULL,
    resource_id INTEGER, -- Specific resource ID if applicable
    action VARCHAR(50) NOT NULL,
    permission_level VARCHAR(20) NOT NULL CHECK (permission_level IN ('allowed', 'denied', 'restricted')),
    reason TEXT,
    granted_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data Access Policies Table
CREATE TABLE IF NOT EXISTS data_access_policies (
    id SERIAL PRIMARY KEY,
    policy_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN ('privacy', 'security', 'retention', 'sharing')),
    target_roles TEXT[] NOT NULL, -- Array of roles this policy applies to
    rules JSONB NOT NULL, -- Policy rules in JSON format
    enforcement_level VARCHAR(20) DEFAULT 'strict' CHECK (enforcement_level IN ('strict', 'advisory', 'disabled')),
    effective_date DATE DEFAULT CURRENT_DATE,
    expiration_date DATE,
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approval_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'inactive', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session Security Tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    location_data JSONB, -- Geolocation if available
    login_method VARCHAR(50) DEFAULT 'password' CHECK (login_method IN ('password', 'sso', 'oauth', 'api_key')),
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP,
    forced_logout BOOLEAN DEFAULT false,
    logout_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Failed Login Attempts Tracking
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id SERIAL PRIMARY KEY,
    username_attempted VARCHAR(255),
    ip_address INET NOT NULL,
    user_agent TEXT,
    failure_reason VARCHAR(100),
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP, -- If IP is temporarily blocked
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data Retention Policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id SERIAL PRIMARY KEY,
    data_type VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    retention_period_days INTEGER NOT NULL,
    anonymization_period_days INTEGER, -- Days after which data is anonymized instead of deleted
    policy_description TEXT,
    applies_to_roles TEXT[], -- Which user roles this policy applies to
    exceptions JSONB, -- Special cases or exceptions
    last_cleanup_run TIMESTAMP,
    next_cleanup_run TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(data_type, table_name)
);

-- Indexes for Performance Optimization
CREATE INDEX IF NOT EXISTS idx_access_control_audit_user_id ON access_control_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_access_control_audit_resource ON access_control_audit_log(resource);
CREATE INDEX IF NOT EXISTS idx_access_control_audit_result ON access_control_audit_log(result);
CREATE INDEX IF NOT EXISTS idx_access_control_audit_created_at ON access_control_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_access_control_audit_ip ON access_control_audit_log(ip_address);

CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_activity_type ON security_alerts(activity_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_teacher_student_assignments_teacher ON teacher_student_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_student_assignments_student ON teacher_student_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_student_assignments_status ON teacher_student_assignments(status);

CREATE INDEX IF NOT EXISTS idx_teacher_classrooms_teacher ON teacher_classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classrooms_classroom ON teacher_classrooms(classroom_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classrooms_status ON teacher_classrooms(status);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON student_classroom_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_classroom ON student_classroom_enrollments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_status ON student_classroom_enrollments(status);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_name);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON role_permissions(resource_type);

CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user ON user_permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_resource ON user_permission_overrides(resource_type);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_expires ON user_permission_overrides(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_time ON failed_login_attempts(attempt_time);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_blocked ON failed_login_attempts(blocked_until);

-- Functions for Access Control Management

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id INTEGER,
    p_resource_type VARCHAR,
    p_action VARCHAR,
    p_resource_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR(50);
    has_permission BOOLEAN := false;
    override_permission VARCHAR(20);
    role_permission VARCHAR(20);
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM users WHERE id = p_user_id;
    
    IF user_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check for user-specific overrides first
    SELECT permission_level INTO override_permission
    FROM user_permission_overrides
    WHERE user_id = p_user_id 
      AND resource_type = p_resource_type
      AND action = p_action
      AND (resource_id IS NULL OR resource_id = p_resource_id)
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
    
    IF override_permission IS NOT NULL THEN
        RETURN override_permission = 'allowed';
    END IF;
    
    -- Check role-based permissions
    SELECT permission_level INTO role_permission
    FROM role_permissions
    WHERE role_name = user_role
      AND resource_type = p_resource_type
      AND action = p_action;
    
    IF role_permission IS NOT NULL THEN
        RETURN role_permission = 'allowed';
    END IF;
    
    -- Default deny if no explicit permission found
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to log access attempts
CREATE OR REPLACE FUNCTION log_access_attempt(
    p_user_id INTEGER,
    p_user_role VARCHAR,
    p_resource VARCHAR,
    p_action VARCHAR,
    p_result VARCHAR,
    p_reason VARCHAR DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_request_data JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO access_control_audit_log (
        user_id, user_role, resource, action, result, reason,
        ip_address, user_agent, request_data
    ) VALUES (
        p_user_id, p_user_role, p_resource, p_action, p_result, p_reason,
        p_ip_address, p_user_agent, p_request_data
    );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old audit logs based on retention policy
CREATE OR REPLACE FUNCTION cleanup_audit_logs() RETURNS INTEGER AS $$
DECLARE
    retention_days INTEGER := 365; -- Default 1 year retention
    deleted_count INTEGER;
BEGIN
    -- Get retention policy if exists
    SELECT retention_period_days INTO retention_days
    FROM data_retention_policies
    WHERE data_type = 'audit_logs' AND is_active = true
    LIMIT 1;
    
    -- Delete old audit logs
    DELETE FROM access_control_audit_log
    WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Update last cleanup time
    UPDATE data_retention_policies
    SET last_cleanup_run = CURRENT_TIMESTAMP,
        next_cleanup_run = CURRENT_TIMESTAMP + INTERVAL '1 day'
    WHERE data_type = 'audit_logs';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to detect suspicious login patterns
CREATE OR REPLACE FUNCTION detect_suspicious_login_activity() RETURNS TABLE(
    ip_address INET,
    failure_count BIGINT,
    last_attempt TIMESTAMP,
    should_block BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fla.ip_address,
        COUNT(*) as failure_count,
        MAX(fla.attempt_time) as last_attempt,
        COUNT(*) >= 5 as should_block -- Block after 5 failed attempts
    FROM failed_login_attempts fla
    WHERE fla.attempt_time > CURRENT_TIMESTAMP - INTERVAL '1 hour'
      AND (fla.blocked_until IS NULL OR fla.blocked_until < CURRENT_TIMESTAMP)
    GROUP BY fla.ip_address
    HAVING COUNT(*) >= 3; -- Report suspicious activity after 3 failures
END;
$$ LANGUAGE plpgsql;

-- Triggers for audit logging

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teacher_student_assignments_timestamp
    BEFORE UPDATE ON teacher_student_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_teacher_classrooms_timestamp
    BEFORE UPDATE ON teacher_classrooms
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_student_enrollments_timestamp
    BEFORE UPDATE ON student_classroom_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Insert default role permissions
INSERT INTO role_permissions (role_name, resource_type, resource_category, action, permission_level) VALUES
-- Student permissions
('student', 'journal', 'own_data', 'read', 'allowed'),
('student', 'journal', 'own_data', 'create', 'allowed'),
('student', 'journal', 'own_data', 'update', 'allowed'),
('student', 'problems', 'own_data', 'read', 'allowed'),
('student', 'problems', 'own_data', 'create', 'allowed'),
('student', 'problems', 'own_data', 'update', 'allowed'),
('student', 'goals', 'own_data', 'read', 'allowed'),
('student', 'goals', 'own_data', 'create', 'allowed'),
('student', 'goals', 'own_data', 'update', 'allowed'),
('student', 'achievements', 'own_data', 'read', 'allowed'),
('student', 'progress', 'own_data', 'read', 'allowed'),
('student', 'profile', 'own_data', 'read', 'allowed'),
('student', 'profile', 'own_data', 'update', 'allowed'),

-- Teacher permissions
('teacher', 'classroom', 'own_data', 'read', 'allowed'),
('teacher', 'classroom', 'own_data', 'create', 'allowed'),
('teacher', 'classroom', 'own_data', 'update', 'allowed'),
('teacher', 'classroom', 'own_data', 'delete', 'allowed'),
('teacher', 'journal', 'student_data', 'read', 'allowed'),
('teacher', 'problems', 'student_data', 'read', 'allowed'),
('teacher', 'problems', 'student_data', 'review', 'allowed'),
('teacher', 'goals', 'student_data', 'read', 'allowed'),
('teacher', 'goals', 'student_data', 'suggest', 'allowed'),
('teacher', 'achievements', 'student_data', 'read', 'allowed'),
('teacher', 'achievements', 'student_data', 'create', 'allowed'),
('teacher', 'progress', 'student_data', 'read', 'allowed'),
('teacher', 'progress', 'student_data', 'analyze', 'allowed'),
('teacher', 'analytics', 'classroom_data', 'read', 'allowed'),
('teacher', 'reports', 'classroom_data', 'read', 'allowed'),
('teacher', 'reports', 'classroom_data', 'create', 'allowed'),

-- Parent permissions
('parent', 'journal', 'child_data', 'read', 'restricted'), -- Summary view only
('parent', 'problems', 'child_data', 'read', 'restricted'), -- Progress view only
('parent', 'goals', 'child_data', 'read', 'allowed'),
('parent', 'goals', 'child_data', 'collaborate', 'allowed'),
('parent', 'achievements', 'child_data', 'read', 'allowed'),
('parent', 'progress', 'child_data', 'read', 'allowed'),
('parent', 'reports', 'child_data', 'read', 'allowed'),
('parent', 'teachers', 'communication', 'read', 'allowed'),
('parent', 'teachers', 'communication', 'create', 'allowed'),
('parent', 'goals', 'family_data', 'read', 'allowed'),
('parent', 'goals', 'family_data', 'create', 'allowed'),
('parent', 'goals', 'family_data', 'update', 'allowed'),

-- Admin permissions (admin has all permissions by default in code)
('admin', 'system', 'all', 'read', 'allowed'),
('admin', 'system', 'all', 'create', 'allowed'),
('admin', 'system', 'all', 'update', 'allowed'),
('admin', 'system', 'all', 'delete', 'allowed'),
('admin', 'users', 'all', 'read', 'allowed'),
('admin', 'users', 'all', 'create', 'allowed'),
('admin', 'users', 'all', 'update', 'allowed'),
('admin', 'users', 'all', 'delete', 'allowed'),
('admin', 'data', 'all', 'read', 'allowed'),
('admin', 'data', 'all', 'export', 'allowed'),
('admin', 'data', 'all', 'purge', 'allowed')

ON CONFLICT (role_name, resource_type, resource_category, action) DO NOTHING;

-- Insert default data retention policies
INSERT INTO data_retention_policies (data_type, table_name, retention_period_days, anonymization_period_days, policy_description, applies_to_roles) VALUES
('audit_logs', 'access_control_audit_log', 365, 180, 'Access control audit logs retained for 1 year, anonymized after 6 months', ARRAY['all']),
('security_alerts', 'security_alerts', 1095, 365, 'Security alerts retained for 3 years, anonymized after 1 year', ARRAY['admin']),
('user_sessions', 'user_sessions', 90, 30, 'User session data retained for 90 days, anonymized after 30 days', ARRAY['all']),
('failed_login_attempts', 'failed_login_attempts', 30, 7, 'Failed login attempts retained for 30 days, anonymized after 7 days', ARRAY['all']),
('journal_entries', 'journal_entries', 2555, 1095, 'Student journal entries retained for 7 years (educational records), anonymized after 3 years', ARRAY['student']),
('problem_sessions', 'problem_sessions', 2555, 1095, 'Problem solving sessions retained for 7 years (educational records), anonymized after 3 years', ARRAY['student'])

ON CONFLICT (data_type, table_name) DO NOTHING; 