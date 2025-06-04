-- Migration 006: Teacher Dashboard Tables
-- This migration adds tables for teacher dashboard functionality including student assignments, interventions, and notes

-- Teachers table (if not exists from previous migrations)
CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id VARCHAR(100),
    subject_areas TEXT[], -- Array of subjects taught
    grade_levels_taught INTEGER[], -- Array of grade levels
    teaching_experience INTEGER, -- Years of experience
    certifications TEXT[],
    bio TEXT,
    contact_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Teacher-Student Assignments Table
CREATE TABLE IF NOT EXISTS teacher_student_assignments (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(100),
    class_name VARCHAR(255),
    academic_year VARCHAR(20),
    semester VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'completed'
    assigned_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, student_id, subject, academic_year, semester)
);

-- Teacher Interventions Table
CREATE TABLE IF NOT EXISTS teacher_interventions (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- 'academic', 'behavioral', 'emotional', 'engagement', 'social'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    title VARCHAR(255),
    description TEXT NOT NULL,
    action_plan TEXT,
    target_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'in_progress', 'completed', 'cancelled'
    success_criteria TEXT,
    resources_needed TEXT[],
    parent_notification BOOLEAN DEFAULT false,
    admin_notification BOOLEAN DEFAULT false,
    follow_up_date DATE,
    outcome_notes TEXT,
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Teacher-Student Notes Table
CREATE TABLE IF NOT EXISTS teacher_student_notes (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general', -- 'general', 'academic', 'behavioral', 'parent_contact', 'achievement'
    is_private BOOLEAN DEFAULT false, -- Private notes only visible to the teacher
    is_shared_with_parents BOOLEAN DEFAULT false,
    is_shared_with_admin BOOLEAN DEFAULT false,
    tags TEXT[],
    related_intervention_id INTEGER REFERENCES teacher_interventions(id),
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Class Analytics Cache Table (for performance optimization)
CREATE TABLE IF NOT EXISTS class_analytics_cache (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timeframe VARCHAR(10) NOT NULL, -- '7d', '30d', '90d', 'all'
    metric_type VARCHAR(50) NOT NULL, -- 'engagement', 'progress', 'performance'
    analytics_data JSONB NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    UNIQUE(teacher_id, timeframe, metric_type)
);

-- Teacher Dashboard Preferences Table
CREATE TABLE IF NOT EXISTS teacher_dashboard_preferences (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    default_timeframe VARCHAR(10) DEFAULT '30d',
    default_view VARCHAR(50) DEFAULT 'overview', -- 'overview', 'individual', 'analytics'
    widget_layout JSONB,
    notification_settings JSONB DEFAULT '{
        "student_alerts": true,
        "weekly_reports": true,
        "intervention_reminders": true,
        "parent_communication": false
    }',
    alert_thresholds JSONB DEFAULT '{
        "streak_drop_threshold": 3,
        "inactivity_days": 3,
        "performance_drop_threshold": 20
    }',
    auto_generate_reports BOOLEAN DEFAULT true,
    report_frequency VARCHAR(20) DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
    theme VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id)
);

-- Teacher Communication Log Table
CREATE TABLE IF NOT EXISTS teacher_communication_log (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    communication_type VARCHAR(50) NOT NULL, -- 'email', 'phone', 'in_person', 'message', 'report'
    subject VARCHAR(255),
    content TEXT,
    direction VARCHAR(20) NOT NULL, -- 'outgoing', 'incoming'
    status VARCHAR(20) DEFAULT 'sent', -- 'draft', 'sent', 'delivered', 'read', 'replied'
    importance VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    requires_follow_up BOOLEAN DEFAULT false,
    follow_up_date DATE,
    related_intervention_id INTEGER REFERENCES teacher_interventions(id),
    attachments TEXT[],
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_teacher_student_assignments_teacher_id ON teacher_student_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_student_assignments_student_id ON teacher_student_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_student_assignments_status ON teacher_student_assignments(status);
CREATE INDEX IF NOT EXISTS idx_teacher_student_assignments_subject ON teacher_student_assignments(subject);

CREATE INDEX IF NOT EXISTS idx_teacher_interventions_teacher_id ON teacher_interventions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_interventions_student_id ON teacher_interventions(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_interventions_status ON teacher_interventions(status);
CREATE INDEX IF NOT EXISTS idx_teacher_interventions_priority ON teacher_interventions(priority);
CREATE INDEX IF NOT EXISTS idx_teacher_interventions_category ON teacher_interventions(category);
CREATE INDEX IF NOT EXISTS idx_teacher_interventions_target_date ON teacher_interventions(target_date);

CREATE INDEX IF NOT EXISTS idx_teacher_student_notes_teacher_id ON teacher_student_notes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_student_notes_student_id ON teacher_student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_student_notes_category ON teacher_student_notes(category);
CREATE INDEX IF NOT EXISTS idx_teacher_student_notes_created_at ON teacher_student_notes(created_at);

CREATE INDEX IF NOT EXISTS idx_class_analytics_cache_teacher_timeframe ON class_analytics_cache(teacher_id, timeframe);
CREATE INDEX IF NOT EXISTS idx_class_analytics_cache_expires_at ON class_analytics_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_teacher_communication_log_teacher_id ON teacher_communication_log(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_communication_log_student_id ON teacher_communication_log(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_communication_log_type ON teacher_communication_log(communication_type);
CREATE INDEX IF NOT EXISTS idx_teacher_communication_log_created_at ON teacher_communication_log(created_at);

-- Functions for teacher dashboard automation

-- Function to automatically detect and create student alerts
CREATE OR REPLACE FUNCTION detect_student_alerts(p_teacher_id INTEGER)
RETURNS TABLE(
    student_id INTEGER,
    student_name TEXT,
    alert_type TEXT,
    priority TEXT,
    alert_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.user_id,
        u.first_name || ' ' || u.last_name,
        CASE 
            WHEN s.current_streak = 0 THEN 'no_activity'
            WHEN s.last_activity_date < CURRENT_DATE - INTERVAL '3 days' THEN 'inactive'
            WHEN s.current_streak < 3 AND s.best_streak > 7 THEN 'streak_drop'
            WHEN recent_performance.avg_score < 2.5 THEN 'poor_performance'
            ELSE 'other'
        END,
        CASE 
            WHEN s.current_streak = 0 OR recent_performance.avg_score < 2.0 THEN 'high'
            WHEN s.last_activity_date < CURRENT_DATE - INTERVAL '3 days' 
                 OR (s.current_streak < 3 AND s.best_streak > 7) THEN 'medium'
            ELSE 'low'
        END,
        json_build_object(
            'current_streak', s.current_streak,
            'best_streak', s.best_streak,
            'last_activity', s.last_activity_date,
            'recent_performance', recent_performance.avg_score
        )::jsonb
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN teacher_student_assignments tsa ON s.user_id = tsa.student_id
    LEFT JOIN (
        SELECT 
            ps.student_id,
            AVG(CASE ps.performance_rating 
                WHEN 'excellent' THEN 5
                WHEN 'good' THEN 4  
                WHEN 'average' THEN 3
                WHEN 'needs_improvement' THEN 2
                ELSE 1
            END) as avg_score
        FROM problem_sessions ps
        WHERE ps.created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY ps.student_id
    ) recent_performance ON s.user_id = recent_performance.student_id
    WHERE tsa.teacher_id = p_teacher_id 
      AND tsa.status = 'active'
      AND (
        s.current_streak = 0 OR
        s.last_activity_date < CURRENT_DATE - INTERVAL '3 days' OR
        (s.current_streak < 3 AND s.best_streak > 7) OR
        recent_performance.avg_score < 2.5
      );
END;
$$ LANGUAGE plpgsql;

-- Function to generate weekly class report data
CREATE OR REPLACE FUNCTION generate_weekly_class_report(p_teacher_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    report_data JSONB;
    student_count INTEGER;
    active_students INTEGER;
    avg_engagement DECIMAL;
    total_activities INTEGER;
BEGIN
    -- Get basic class metrics
    SELECT 
        COUNT(DISTINCT s.user_id),
        COUNT(DISTINCT CASE WHEN s.last_activity_date >= CURRENT_DATE - INTERVAL '7 days' THEN s.user_id END),
        COALESCE(AVG(s.current_streak), 0),
        (
            SELECT COUNT(*) 
            FROM journal_entries je 
            JOIN teacher_student_assignments tsa ON je.user_id = tsa.student_id
            WHERE tsa.teacher_id = p_teacher_id 
              AND tsa.status = 'active'
              AND je.created_at >= CURRENT_DATE - INTERVAL '7 days'
        ) + (
            SELECT COUNT(*) 
            FROM problem_sessions ps 
            JOIN teacher_student_assignments tsa ON ps.student_id = tsa.student_id
            WHERE tsa.teacher_id = p_teacher_id 
              AND tsa.status = 'active'
              AND ps.created_at >= CURRENT_DATE - INTERVAL '7 days'
        )
    INTO student_count, active_students, avg_engagement, total_activities
    FROM students s
    JOIN teacher_student_assignments tsa ON s.user_id = tsa.student_id
    WHERE tsa.teacher_id = p_teacher_id AND tsa.status = 'active';
    
    -- Build report JSON
    report_data := json_build_object(
        'generated_at', CURRENT_TIMESTAMP,
        'period', 'Last 7 days',
        'class_summary', json_build_object(
            'total_students', student_count,
            'active_students', active_students,
            'engagement_rate', ROUND((active_students::decimal / NULLIF(student_count, 0)) * 100, 2),
            'average_streak', ROUND(avg_engagement, 1),
            'total_activities', total_activities
        ),
        'alerts', (
            SELECT json_agg(
                json_build_object(
                    'student_name', alert.student_name,
                    'alert_type', alert.alert_type,
                    'priority', alert.priority
                )
            )
            FROM detect_student_alerts(p_teacher_id) alert
        )
    );
    
    RETURN report_data;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired analytics cache
CREATE OR REPLACE FUNCTION cleanup_expired_analytics_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM class_analytics_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update teacher dashboard preferences timestamp
CREATE OR REPLACE FUNCTION update_teacher_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teacher_preferences_timestamp
    BEFORE UPDATE ON teacher_dashboard_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_teacher_preferences_timestamp();

-- Trigger to update teacher intervention timestamp
CREATE OR REPLACE FUNCTION update_teacher_intervention_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Automatically set completed_at when status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teacher_intervention_timestamp
    BEFORE UPDATE ON teacher_interventions
    FOR EACH ROW
    EXECUTE FUNCTION update_teacher_intervention_timestamp();

-- Insert sample teacher assignments for testing (if users exist)
INSERT INTO teacher_student_assignments (teacher_id, student_id, subject, class_name, academic_year, semester)
SELECT 
    (SELECT id FROM users WHERE role = 'teacher' LIMIT 1) as teacher_id,
    s.id as student_id,
    'Mathematics' as subject,
    'Math 101' as class_name,
    '2023-2024' as academic_year,
    'Fall' as semester
FROM users s 
WHERE s.role = 'student'
AND EXISTS (SELECT 1 FROM users WHERE role = 'teacher')
ON CONFLICT (teacher_id, student_id, subject, academic_year, semester) DO NOTHING; 