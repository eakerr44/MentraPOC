-- Migration 007: Parent Dashboard Tables
-- This migration adds tables for parent dashboard functionality including family analytics, 
-- parent-child relationships, communication, and personalized learning support

-- Parents table (if not exists from previous migrations)
CREATE TABLE IF NOT EXISTS parents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_name VARCHAR(100),
    address JSONB, -- Street, city, state, zip, country
    phone_numbers TEXT[], -- Array of phone numbers
    email_addresses TEXT[], -- Additional email addresses
    emergency_contacts JSONB,
    preferred_communication_method VARCHAR(50) DEFAULT 'email', -- 'email', 'phone', 'text', 'app'
    communication_preferences JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{
        "weekly_summaries": true,
        "achievement_alerts": true,
        "teacher_messages": true,
        "progress_reports": true,
        "goal_reminders": false
    }',
    language_preference VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Parent-Child Relationships Table
CREATE TABLE IF NOT EXISTS parent_child_relationships (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- 'mother', 'father', 'guardian', 'stepparent', 'grandparent', 'caregiver'
    primary_contact BOOLEAN DEFAULT false, -- Is this the primary parent contact for this child?
    custody_status VARCHAR(50), -- 'full', 'joint', 'visitation', 'emergency_only'
    can_access_grades BOOLEAN DEFAULT true,
    can_communicate_with_teachers BOOLEAN DEFAULT true,
    can_modify_goals BOOLEAN DEFAULT true,
    can_view_detailed_progress BOOLEAN DEFAULT true,
    emergency_contact BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    relationship_start_date DATE DEFAULT CURRENT_DATE,
    relationship_end_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_id, child_id)
);

-- Parent Dashboard Preferences Table
CREATE TABLE IF NOT EXISTS parent_dashboard_preferences (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    default_timeframe VARCHAR(10) DEFAULT '7d', -- Parents prefer weekly views
    default_child_view VARCHAR(50) DEFAULT 'overview', -- 'overview', 'detailed', 'comparison'
    widget_layout JSONB,
    summary_frequency VARCHAR(20) DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
    report_format VARCHAR(20) DEFAULT 'summary', -- 'summary', 'detailed', 'visual'
    notification_settings JSONB DEFAULT '{
        "weekly_summaries": true,
        "achievement_notifications": true,
        "teacher_communications": true,
        "goal_deadlines": true,
        "engagement_alerts": false,
        "progress_milestones": true
    }',
    communication_preferences JSONB DEFAULT '{
        "teacher_response_expectation": "24_hours",
        "preferred_contact_times": ["morning", "evening"],
        "communication_style": "detailed"
    }',
    learning_support_preferences JSONB DEFAULT '{
        "tip_categories": ["academic", "emotional", "social"],
        "tip_frequency": "weekly",
        "resource_types": ["articles", "activities", "videos"]
    }',
    privacy_settings JSONB DEFAULT '{
        "share_with_child": false,
        "share_achievement_celebrations": true,
        "share_progress_with_family": false
    }',
    theme VARCHAR(20) DEFAULT 'family',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_id)
);

-- Family Learning Analytics Cache Table
CREATE TABLE IF NOT EXISTS family_analytics_cache (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timeframe VARCHAR(10) NOT NULL, -- '7d', '30d', '90d'
    analytics_type VARCHAR(50) NOT NULL, -- 'engagement', 'progress', 'family_overview'
    analytics_data JSONB NOT NULL,
    children_included INTEGER[], -- Array of child IDs included in this analytics
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    UNIQUE(parent_id, timeframe, analytics_type)
);

-- Weekly Family Summaries Table
CREATE TABLE IF NOT EXISTS weekly_family_summaries (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    summary_data JSONB NOT NULL, -- Contains all children's weekly progress
    highlights JSONB, -- Key achievements and milestones
    concerns JSONB, -- Areas needing attention
    learning_tips JSONB, -- Personalized tips for the week
    celebration_moments JSONB, -- Positive moments to celebrate
    family_goals_progress JSONB, -- Progress on family learning goals
    auto_generated BOOLEAN DEFAULT true,
    parent_notes TEXT,
    shared_with_children BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_id, week_start_date)
);

-- Parent Learning Insights Table
CREATE TABLE IF NOT EXISTS parent_learning_insights (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL for family-wide insights
    insight_type VARCHAR(50) NOT NULL, -- 'learning_style', 'motivation', 'home_support', 'progress_pattern'
    insight_category VARCHAR(50) NOT NULL, -- 'academic', 'emotional', 'social', 'behavioral'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    actionable_tips JSONB, -- Specific actions parents can take
    supporting_data JSONB, -- Data points that support this insight
    resources JSONB, -- Educational resources and links
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'acted_on', 'dismissed'
    expires_at TIMESTAMP,
    parent_feedback TEXT,
    parent_rating INTEGER CHECK (parent_rating >= 1 AND parent_rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parent Communication Templates Table
CREATE TABLE IF NOT EXISTS parent_communication_templates (
    id SERIAL PRIMARY KEY,
    template_type VARCHAR(50) NOT NULL, -- 'teacher_inquiry', 'goal_discussion', 'concern_sharing'
    subject_template VARCHAR(255) NOT NULL,
    content_template TEXT NOT NULL,
    variables JSONB, -- Template variables like {child_name}, {teacher_name}
    category VARCHAR(50), -- 'academic', 'behavioral', 'social', 'achievement'
    tone VARCHAR(20) DEFAULT 'formal', -- 'formal', 'friendly', 'concerned', 'celebratory'
    is_default BOOLEAN DEFAULT false,
    created_by_parent INTEGER REFERENCES users(id),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Family Goals Table
CREATE TABLE IF NOT EXISTS family_goals (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL, -- 'learning_routine', 'screen_time', 'family_learning', 'reading_together'
    target_children INTEGER[], -- Array of child IDs this goal applies to
    target_metrics JSONB, -- What success looks like
    current_progress JSONB, -- Current status tracking
    start_date DATE DEFAULT CURRENT_DATE,
    target_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'paused', 'abandoned'
    priority VARCHAR(20) DEFAULT 'medium',
    reward_plan TEXT, -- How the family will celebrate achieving this goal
    parent_commitment TEXT, -- What the parent commits to doing
    child_involvement TEXT, -- How children are involved
    success_criteria TEXT,
    weekly_check_ins BOOLEAN DEFAULT true,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Family Goal Activities Table
CREATE TABLE IF NOT EXISTS family_goal_activities (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES family_goals(id) ON DELETE CASCADE,
    activity_date DATE DEFAULT CURRENT_DATE,
    activity_type VARCHAR(50) NOT NULL, -- 'progress_update', 'milestone_reached', 'challenge_noted', 'celebration'
    description TEXT NOT NULL,
    participants INTEGER[], -- Which family members participated
    outcome VARCHAR(50), -- 'positive', 'challenging', 'neutral'
    notes TEXT,
    attachments TEXT[], -- Photos, documents, etc.
    logged_by INTEGER REFERENCES users(id), -- Who logged this activity
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parent Resource Bookmarks Table
CREATE TABLE IF NOT EXISTS parent_resource_bookmarks (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- 'article', 'video', 'activity', 'tool', 'app'
    title VARCHAR(255) NOT NULL,
    url TEXT,
    description TEXT,
    content JSONB, -- For stored content like activities
    category VARCHAR(50), -- 'learning_support', 'emotional_development', 'academic_help'
    age_range VARCHAR(50), -- '5-8', '9-12', '13+', 'all'
    difficulty_level VARCHAR(20), -- 'easy', 'medium', 'challenging'
    estimated_time VARCHAR(50), -- '5 minutes', '30 minutes', '1 hour'
    tags TEXT[],
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    personal_notes TEXT,
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    shared_by VARCHAR(50), -- 'system', 'teacher', 'other_parent'
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_parent_child_relationships_parent_id ON parent_child_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_relationships_child_id ON parent_child_relationships(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_relationships_status ON parent_child_relationships(status);
CREATE INDEX IF NOT EXISTS idx_parent_child_relationships_primary_contact ON parent_child_relationships(primary_contact);

CREATE INDEX IF NOT EXISTS idx_family_analytics_cache_parent_timeframe ON family_analytics_cache(parent_id, timeframe);
CREATE INDEX IF NOT EXISTS idx_family_analytics_cache_expires_at ON family_analytics_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_weekly_family_summaries_parent_week ON weekly_family_summaries(parent_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_family_summaries_date_range ON weekly_family_summaries(week_start_date, week_end_date);

CREATE INDEX IF NOT EXISTS idx_parent_learning_insights_parent_id ON parent_learning_insights(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_learning_insights_child_id ON parent_learning_insights(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_learning_insights_type ON parent_learning_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_parent_learning_insights_status ON parent_learning_insights(status);

CREATE INDEX IF NOT EXISTS idx_family_goals_parent_id ON family_goals(parent_id);
CREATE INDEX IF NOT EXISTS idx_family_goals_status ON family_goals(status);
CREATE INDEX IF NOT EXISTS idx_family_goals_target_date ON family_goals(target_date);

CREATE INDEX IF NOT EXISTS idx_family_goal_activities_goal_id ON family_goal_activities(goal_id);
CREATE INDEX IF NOT EXISTS idx_family_goal_activities_date ON family_goal_activities(activity_date);

CREATE INDEX IF NOT EXISTS idx_parent_resource_bookmarks_parent_id ON parent_resource_bookmarks(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_resource_bookmarks_category ON parent_resource_bookmarks(category);
CREATE INDEX IF NOT EXISTS idx_parent_resource_bookmarks_favorite ON parent_resource_bookmarks(is_favorite);

-- Functions for parent dashboard automation

-- Function to generate weekly family summary
CREATE OR REPLACE FUNCTION generate_weekly_family_summary(p_parent_id INTEGER, p_week_start DATE)
RETURNS JSONB AS $$
DECLARE
    summary_data JSONB;
    week_end DATE;
    child_summaries JSONB;
    family_highlights JSONB;
    family_concerns JSONB;
BEGIN
    week_end := p_week_start + INTERVAL '6 days';
    
    -- Get summary for each child
    SELECT json_agg(
        json_build_object(
            'child_id', s.user_id,
            'child_name', u.first_name || ' ' || u.last_name,
            'journal_entries', COALESCE(journal_count, 0),
            'problem_sessions', COALESCE(problem_count, 0),
            'achievements', COALESCE(achievement_count, 0),
            'streak_at_week_end', s.current_streak,
            'points_earned', COALESCE(points_earned, 0),
            'engagement_level', 
                CASE 
                    WHEN s.current_streak >= 7 THEN 'excellent'
                    WHEN s.current_streak >= 4 THEN 'good' 
                    WHEN s.current_streak >= 1 THEN 'fair'
                    ELSE 'needs_attention'
                END
        )
    ) INTO child_summaries
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN parent_child_relationships pcr ON s.user_id = pcr.child_id
    LEFT JOIN (
        SELECT 
            je.user_id,
            COUNT(je.id) as journal_count
        FROM journal_entries je
        WHERE je.created_at BETWEEN p_week_start AND week_end + INTERVAL '1 day'
        GROUP BY je.user_id
    ) journal_stats ON s.user_id = journal_stats.user_id
    LEFT JOIN (
        SELECT 
            ps.student_id,
            COUNT(ps.id) as problem_count
        FROM problem_sessions ps
        WHERE ps.created_at BETWEEN p_week_start AND week_end + INTERVAL '1 day'
        GROUP BY ps.student_id
    ) problem_stats ON s.user_id = problem_stats.student_id
    LEFT JOIN (
        SELECT 
            sa.student_id,
            COUNT(sa.id) as achievement_count,
            SUM(sa.points_earned) as points_earned
        FROM student_achievements sa
        WHERE sa.earned_at BETWEEN p_week_start AND week_end + INTERVAL '1 day'
        GROUP BY sa.student_id
    ) achievement_stats ON s.user_id = achievement_stats.student_id
    WHERE pcr.parent_id = p_parent_id AND pcr.status = 'active';
    
    -- Build summary data
    summary_data := json_build_object(
        'week_period', json_build_object(
            'start', p_week_start,
            'end', week_end
        ),
        'children_summaries', child_summaries,
        'family_totals', json_build_object(
            'total_activities', (
                SELECT COALESCE(SUM((child->>'journal_entries')::int + (child->>'problem_sessions')::int), 0)
                FROM json_array_elements(child_summaries) child
            ),
            'total_achievements', (
                SELECT COALESCE(SUM((child->>'achievements')::int), 0)
                FROM json_array_elements(child_summaries) child
            ),
            'total_points', (
                SELECT COALESCE(SUM((child->>'points_earned')::int), 0)
                FROM json_array_elements(child_summaries) child
            )
        )
    );
    
    RETURN summary_data;
END;
$$ LANGUAGE plpgsql;

-- Function to detect family learning patterns and generate insights
CREATE OR REPLACE FUNCTION detect_family_learning_patterns(p_parent_id INTEGER)
RETURNS TABLE(
    insight_type TEXT,
    insight_category TEXT,
    title TEXT,
    description TEXT,
    confidence_score DECIMAL,
    actionable_tips JSONB
) AS $$
BEGIN
    -- Detect consistency patterns
    RETURN QUERY
    WITH streak_analysis AS (
        SELECT 
            s.user_id,
            u.first_name,
            s.current_streak,
            s.best_streak,
            CASE 
                WHEN s.current_streak >= 7 THEN 'consistent'
                WHEN s.current_streak >= 3 THEN 'developing'
                ELSE 'inconsistent'
            END as consistency_level
        FROM students s
        JOIN users u ON s.user_id = u.id
        JOIN parent_child_relationships pcr ON s.user_id = pcr.child_id
        WHERE pcr.parent_id = p_parent_id AND pcr.status = 'active'
    )
    SELECT 
        'consistency_pattern'::TEXT,
        'behavioral'::TEXT,
        'Family Learning Consistency'::TEXT,
        CASE 
            WHEN COUNT(*) FILTER (WHERE consistency_level = 'consistent') = COUNT(*) THEN
                'Excellent! All children are maintaining consistent learning habits.'
            WHEN COUNT(*) FILTER (WHERE consistency_level = 'inconsistent') > COUNT(*) / 2 THEN
                'Family learning routines need strengthening. Most children would benefit from more consistent schedules.'
            ELSE
                'Mixed consistency levels. Some children are doing well while others need more support.'
        END,
        CASE 
            WHEN COUNT(*) FILTER (WHERE consistency_level = 'consistent') = COUNT(*) THEN 0.9
            WHEN COUNT(*) FILTER (WHERE consistency_level = 'inconsistent') > COUNT(*) / 2 THEN 0.8
            ELSE 0.7
        END::DECIMAL,
        json_build_object(
            'tips', ARRAY[
                'Establish family learning time',
                'Create consistent daily routines',
                'Celebrate learning streaks together',
                'Set up learning spaces for each child'
            ]
        )::JSONB
    FROM streak_analysis
    WHERE COUNT(*) > 0;
    
    -- Add more pattern detection logic here...
    
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired family analytics cache
CREATE OR REPLACE FUNCTION cleanup_expired_family_analytics_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM family_analytics_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update parent dashboard preferences timestamp
CREATE OR REPLACE FUNCTION update_parent_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parent_preferences_timestamp
    BEFORE UPDATE ON parent_dashboard_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_preferences_timestamp();

-- Trigger to update family goals timestamp
CREATE OR REPLACE FUNCTION update_family_goals_timestamp()
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

CREATE TRIGGER trigger_update_family_goals_timestamp
    BEFORE UPDATE ON family_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_family_goals_timestamp();

-- Insert default parent communication templates
INSERT INTO parent_communication_templates (template_type, subject_template, content_template, variables, category, tone, is_default) VALUES
('teacher_inquiry', 'Question about {child_name}''s {subject} progress', 
 'Dear {teacher_name},

I hope this message finds you well. I wanted to reach out regarding {child_name}''s progress in {subject}.

{inquiry_details}

I would appreciate any insights you might have about how I can better support {child_name}''s learning at home.

Thank you for your time and dedication to {child_name}''s education.

Best regards,
{parent_name}', 
 '{"child_name": "text", "teacher_name": "text", "subject": "text", "inquiry_details": "textarea", "parent_name": "text"}'::JSONB,
 'academic', 'formal', true),

('achievement_celebration', 'Celebrating {child_name}''s recent achievement!', 
 'Dear {teacher_name},

I wanted to share how excited our family is about {child_name}''s recent {achievement_type}! 

{celebration_details}

Thank you for your role in supporting {child_name}''s growth and success.

Warm regards,
{parent_name}', 
 '{"child_name": "text", "teacher_name": "text", "achievement_type": "text", "celebration_details": "textarea", "parent_name": "text"}'::JSONB,
 'achievement', 'celebratory', true),

('concern_sharing', 'Concern about {child_name} - {concern_area}', 
 'Dear {teacher_name},

I hope you''re doing well. I wanted to discuss a concern I have regarding {child_name} in the area of {concern_area}.

{concern_details}

I would value your perspective and any suggestions you might have for supporting {child_name} both at school and at home.

Thank you for your partnership in {child_name}''s education.

Sincerely,
{parent_name}', 
 '{"child_name": "text", "teacher_name": "text", "concern_area": "text", "concern_details": "textarea", "parent_name": "text"}'::JSONB,
 'behavioral', 'concerned', true);

-- Insert sample parent-child relationships for testing (if users exist)
INSERT INTO parent_child_relationships (parent_id, child_id, relationship_type, primary_contact)
SELECT 
    p.id as parent_id,
    s.id as child_id,
    'parent' as relationship_type,
    true as primary_contact
FROM users p, users s 
WHERE p.role = 'parent' AND s.role = 'student'
AND NOT EXISTS (
    SELECT 1 FROM parent_child_relationships pcr 
    WHERE pcr.parent_id = p.id AND pcr.child_id = s.id
)
LIMIT 5; -- Limit to avoid creating too many test relationships 