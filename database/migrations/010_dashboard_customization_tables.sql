-- Migration 010: Dashboard Customization & Preference Settings
-- Task 5.7: Implement dashboard customization and preference settings
-- This migration enhances existing preference tables and adds comprehensive customization features

-- Enhanced Widget Templates Table (predefined widget types and configurations)
CREATE TABLE IF NOT EXISTS dashboard_widget_templates (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'overview', 'analytics', 'goals', 'social', 'tools'
    component_name VARCHAR(100) NOT NULL, -- React component name
    default_size VARCHAR(20) DEFAULT 'medium', -- 'small', 'medium', 'large', 'xl'
    min_width INTEGER DEFAULT 2,
    min_height INTEGER DEFAULT 2,
    max_width INTEGER DEFAULT 12,
    max_height INTEGER DEFAULT 8,
    resizable BOOLEAN DEFAULT true,
    movable BOOLEAN DEFAULT true,
    default_props JSONB DEFAULT '{}',
    available_for_roles VARCHAR(20)[] DEFAULT ARRAY['student', 'teacher', 'parent'],
    requires_permissions VARCHAR(100)[] DEFAULT ARRAY[]::VARCHAR[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Widget Instances Table (specific widget configurations for each user)
CREATE TABLE IF NOT EXISTS user_dashboard_widgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id VARCHAR(100) NOT NULL REFERENCES dashboard_widget_templates(id),
    widget_key VARCHAR(100) NOT NULL, -- Unique key for this widget instance
    title VARCHAR(255), -- Custom title override
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 4,
    height INTEGER NOT NULL DEFAULT 3,
    visible BOOLEAN DEFAULT true,
    locked BOOLEAN DEFAULT false, -- Prevent moving/resizing
    custom_props JSONB DEFAULT '{}', -- Widget-specific settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, widget_key)
);

-- Dashboard Layout Presets Table (saved layout configurations)
CREATE TABLE IF NOT EXISTS dashboard_layout_presets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false, -- Allow sharing with other users
    layout_data JSONB NOT NULL, -- Complete layout configuration
    thumbnail_url VARCHAR(500), -- Preview image
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Theme Configuration Table
CREATE TABLE IF NOT EXISTS user_theme_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme_name VARCHAR(50) DEFAULT 'default', -- 'default', 'dark', 'light', 'high_contrast', 'custom'
    primary_color VARCHAR(20) DEFAULT '#667eea',
    secondary_color VARCHAR(20) DEFAULT '#764ba2',
    accent_color VARCHAR(20) DEFAULT '#ff6b6b',
    background_type VARCHAR(20) DEFAULT 'gradient', -- 'solid', 'gradient', 'pattern', 'image'
    background_value TEXT, -- Color, gradient, pattern name, or image URL
    font_family VARCHAR(100) DEFAULT 'system',
    font_size_scale DECIMAL(3,2) DEFAULT 1.00, -- 0.75 to 1.5 scale multiplier
    border_radius INTEGER DEFAULT 8, -- Global border radius
    shadow_intensity VARCHAR(20) DEFAULT 'medium', -- 'none', 'light', 'medium', 'strong'
    animation_enabled BOOLEAN DEFAULT true,
    reduced_motion BOOLEAN DEFAULT false, -- Accessibility setting
    high_contrast BOOLEAN DEFAULT false, -- Accessibility setting
    custom_css TEXT, -- Advanced users can add custom CSS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Dashboard Behavior Preferences Table (interaction and automation settings)
CREATE TABLE IF NOT EXISTS dashboard_behavior_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auto_refresh_enabled BOOLEAN DEFAULT true,
    auto_refresh_interval INTEGER DEFAULT 300, -- seconds
    default_timeframe VARCHAR(10) DEFAULT '30d',
    sidebar_collapsed BOOLEAN DEFAULT false,
    compact_mode BOOLEAN DEFAULT false,
    show_animations BOOLEAN DEFAULT true,
    show_tooltips BOOLEAN DEFAULT true,
    keyboard_shortcuts_enabled BOOLEAN DEFAULT true,
    default_view VARCHAR(50), -- Role-specific default view
    quick_actions JSONB DEFAULT '[]', -- Pinned quick actions
    data_density VARCHAR(20) DEFAULT 'comfortable', -- 'compact', 'comfortable', 'spacious'
    date_format VARCHAR(20) DEFAULT 'relative', -- 'relative', 'absolute', 'iso'
    number_format VARCHAR(20) DEFAULT 'compact', -- 'full', 'compact', 'abbreviated'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Dashboard Usage Analytics Table (track user behavior for insights)
CREATE TABLE IF NOT EXISTS dashboard_usage_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    widget_id VARCHAR(100),
    action_type VARCHAR(50) NOT NULL, -- 'view', 'interact', 'resize', 'move', 'configure'
    action_details JSONB,
    duration_seconds INTEGER, -- Time spent on action
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    screen_resolution VARCHAR(20),
    device_type VARCHAR(20) -- 'desktop', 'tablet', 'mobile'
);

-- Shared Dashboard Templates Table (community/system templates)
CREATE TABLE IF NOT EXISTS shared_dashboard_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    template_data JSONB NOT NULL,
    target_role VARCHAR(20) NOT NULL,
    category VARCHAR(50), -- 'productivity', 'analytics', 'minimal', 'comprehensive'
    difficulty_level VARCHAR(20) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    is_official BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    tags VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR[],
    preview_images TEXT[] DEFAULT ARRAY[]::TEXT[],
    requirements JSONB DEFAULT '{}', -- System requirements or prerequisites
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template Ratings Table
CREATE TABLE IF NOT EXISTS dashboard_template_ratings (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES shared_dashboard_templates(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, user_id)
);

-- Update existing preference tables with new fields
ALTER TABLE student_dashboard_preferences 
ADD COLUMN IF NOT EXISTS layout_preset_id INTEGER REFERENCES dashboard_layout_presets(id),
ADD COLUMN IF NOT EXISTS sidebar_collapsed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS compact_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_css TEXT,
ADD COLUMN IF NOT EXISTS keyboard_shortcuts JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quick_filters JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS pinned_widgets VARCHAR(100)[] DEFAULT ARRAY[]::VARCHAR[];

ALTER TABLE teacher_dashboard_preferences 
ADD COLUMN IF NOT EXISTS layout_preset_id INTEGER REFERENCES dashboard_layout_presets(id),
ADD COLUMN IF NOT EXISTS sidebar_collapsed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS compact_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_css TEXT,
ADD COLUMN IF NOT EXISTS keyboard_shortcuts JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quick_filters JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS class_view_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS student_card_layout VARCHAR(20) DEFAULT 'grid'; -- 'grid', 'list', 'table'

ALTER TABLE parent_dashboard_preferences 
ADD COLUMN IF NOT EXISTS layout_preset_id INTEGER REFERENCES dashboard_layout_presets(id),
ADD COLUMN IF NOT EXISTS sidebar_collapsed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS compact_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_css TEXT,
ADD COLUMN IF NOT EXISTS keyboard_shortcuts JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quick_filters JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS child_view_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS family_card_layout VARCHAR(20) DEFAULT 'cards'; -- 'cards', 'timeline', 'summary'

-- Insert default widget templates
INSERT INTO dashboard_widget_templates (id, name, description, category, component_name, default_size, available_for_roles) VALUES
-- Student widgets
('student_overview', 'Learning Overview', 'Quick summary of learning progress and activity', 'overview', 'StudentOverviewWidget', 'large', ARRAY['student']),
('current_goals', 'Current Goals', 'Active learning goals and progress tracking', 'goals', 'CurrentGoalsWidget', 'medium', ARRAY['student']),
('recent_achievements', 'Recent Achievements', 'Latest earned achievements and badges', 'goals', 'RecentAchievementsWidget', 'medium', ARRAY['student']),
('learning_streak', 'Learning Streak', 'Current and best learning streaks', 'overview', 'LearningStreakWidget', 'small', ARRAY['student']),
('progress_chart', 'Progress Chart', 'Visual progress tracking over time', 'analytics', 'ProgressChartWidget', 'large', ARRAY['student']),
('upcoming_reminders', 'Upcoming Reminders', 'Goal deadlines and important dates', 'tools', 'UpcomingRemindersWidget', 'medium', ARRAY['student']),
('mood_tracker', 'Mood Tracker', 'Daily mood and emotion tracking', 'tools', 'MoodTrackerWidget', 'small', ARRAY['student']),
('activity_feed', 'Activity Feed', 'Recent learning activities and milestones', 'social', 'ActivityFeedWidget', 'medium', ARRAY['student']),

-- Teacher widgets  
('class_overview', 'Class Overview', 'Summary of class performance and engagement', 'overview', 'ClassOverviewWidget', 'large', ARRAY['teacher']),
('student_alerts', 'Student Alerts', 'Students requiring attention or intervention', 'overview', 'StudentAlertsWidget', 'medium', ARRAY['teacher']),
('class_progress', 'Class Progress', 'Visual tracking of class-wide progress', 'analytics', 'ClassProgressWidget', 'large', ARRAY['teacher']),
('recent_activities', 'Recent Activities', 'Latest student submissions and activities', 'overview', 'RecentActivitiesWidget', 'medium', ARRAY['teacher']),
('assignment_status', 'Assignment Status', 'Current assignment completion rates', 'tools', 'AssignmentStatusWidget', 'medium', ARRAY['teacher']),
('intervention_queue', 'Intervention Queue', 'Students needing intervention or support', 'tools', 'InterventionQueueWidget', 'medium', ARRAY['teacher']),
('class_analytics', 'Class Analytics', 'Detailed analytics and insights', 'analytics', 'ClassAnalyticsWidget', 'large', ARRAY['teacher']),
('parent_communications', 'Parent Communications', 'Recent parent messages and updates', 'social', 'ParentCommunicationsWidget', 'medium', ARRAY['teacher']),

-- Parent widgets
('family_overview', 'Family Overview', 'Summary of all children\'s progress', 'overview', 'FamilyOverviewWidget', 'large', ARRAY['parent']),
('children_progress', 'Children Progress', 'Individual progress for each child', 'analytics', 'ChildrenProgressWidget', 'large', ARRAY['parent']),
('weekly_summary', 'Weekly Summary', 'Weekly highlights and achievements', 'overview', 'WeeklySummaryWidget', 'medium', ARRAY['parent']),
('teacher_messages', 'Teacher Messages', 'Recent communications from teachers', 'social', 'TeacherMessagesWidget', 'medium', ARRAY['parent']),
('learning_tips', 'Learning Tips', 'Personalized tips for supporting learning', 'tools', 'LearningTipsWidget', 'medium', ARRAY['parent']),
('family_goals', 'Family Goals', 'Shared family learning goals', 'goals', 'FamilyGoalsWidget', 'medium', ARRAY['parent']),
('engagement_metrics', 'Engagement Metrics', 'Children\'s engagement and activity levels', 'analytics', 'EngagementMetricsWidget', 'medium', ARRAY['parent']),
('upcoming_events', 'Upcoming Events', 'School events and important dates', 'tools', 'UpcomingEventsWidget', 'small', ARRAY['parent']),

-- Universal widgets
('notification_center', 'Notification Center', 'Recent notifications and alerts', 'tools', 'NotificationCenterWidget', 'small', ARRAY['student', 'teacher', 'parent']),
('quick_actions', 'Quick Actions', 'Frequently used actions and shortcuts', 'tools', 'QuickActionsWidget', 'small', ARRAY['student', 'teacher', 'parent']),
('help_support', 'Help & Support', 'Quick access to help and support resources', 'tools', 'HelpSupportWidget', 'small', ARRAY['student', 'teacher', 'parent']);

-- Insert default shared templates
INSERT INTO shared_dashboard_templates (name, description, template_data, target_role, category, is_official, is_featured) VALUES
('Student Starter', 'Perfect layout for students getting started with Mentra', '{"widgets": [{"id": "student_overview", "x": 0, "y": 0, "w": 8, "h": 4}, {"id": "current_goals", "x": 8, "y": 0, "w": 4, "h": 4}, {"id": "learning_streak", "x": 0, "y": 4, "w": 4, "h": 2}, {"id": "recent_achievements", "x": 4, "y": 4, "w": 4, "h": 2}, {"id": "activity_feed", "x": 8, "y": 4, "w": 4, "h": 4}]}', 'student', 'productivity', true, true),
('Student Analytics Focus', 'Data-driven layout for students who love tracking progress', '{"widgets": [{"id": "progress_chart", "x": 0, "y": 0, "w": 8, "h": 6}, {"id": "learning_streak", "x": 8, "y": 0, "w": 4, "h": 3}, {"id": "recent_achievements", "x": 8, "y": 3, "w": 4, "h": 3}, {"id": "current_goals", "x": 0, "y": 6, "w": 6, "h": 4}, {"id": "mood_tracker", "x": 6, "y": 6, "w": 3, "h": 4}, {"id": "upcoming_reminders", "x": 9, "y": 6, "w": 3, "h": 4}]}', 'student', 'analytics', true, true),
('Teacher Command Center', 'Comprehensive layout for active classroom management', '{"widgets": [{"id": "class_overview", "x": 0, "y": 0, "w": 8, "h": 4}, {"id": "student_alerts", "x": 8, "y": 0, "w": 4, "h": 4}, {"id": "recent_activities", "x": 0, "y": 4, "w": 6, "h": 4}, {"id": "intervention_queue", "x": 6, "y": 4, "w": 6, "h": 4}, {"id": "assignment_status", "x": 0, "y": 8, "w": 4, "h": 3}, {"id": "parent_communications", "x": 4, "y": 8, "w": 4, "h": 3}, {"id": "class_analytics", "x": 8, "y": 8, "w": 4, "h": 3}]}', 'teacher', 'comprehensive', true, true),
('Parent Family Hub', 'Perfect overview for busy parents tracking multiple children', '{"widgets": [{"id": "family_overview", "x": 0, "y": 0, "w": 8, "h": 4}, {"id": "weekly_summary", "x": 8, "y": 0, "w": 4, "h": 4}, {"id": "children_progress", "x": 0, "y": 4, "w": 8, "h": 4}, {"id": "teacher_messages", "x": 8, "y": 4, "w": 4, "h": 2}, {"id": "learning_tips", "x": 8, "y": 6, "w": 4, "h": 2}, {"id": "family_goals", "x": 0, "y": 8, "w": 6, "h": 3}, {"id": "upcoming_events", "x": 6, "y": 8, "w": 3, "h": 3}, {"id": "engagement_metrics", "x": 9, "y": 8, "w": 3, "h": 3}]}', 'parent', 'comprehensive', true, true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_dashboard_widgets_user_id ON user_dashboard_widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dashboard_widgets_template_id ON user_dashboard_widgets(template_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layout_presets_user_id ON dashboard_layout_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layout_presets_is_default ON dashboard_layout_presets(is_default);
CREATE INDEX IF NOT EXISTS idx_user_theme_preferences_user_id ON user_theme_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_behavior_preferences_user_id ON dashboard_behavior_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_usage_analytics_user_id ON dashboard_usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_usage_analytics_timestamp ON dashboard_usage_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_shared_dashboard_templates_target_role ON shared_dashboard_templates(target_role);
CREATE INDEX IF NOT EXISTS idx_shared_dashboard_templates_category ON shared_dashboard_templates(category);
CREATE INDEX IF NOT EXISTS idx_dashboard_template_ratings_template_id ON dashboard_template_ratings(template_id);

-- Database functions for preference management
CREATE OR REPLACE FUNCTION get_user_dashboard_layout(p_user_id INTEGER)
RETURNS TABLE (
    widget_key VARCHAR(100),
    template_id VARCHAR(100),
    title VARCHAR(255),
    position_x INTEGER,
    position_y INTEGER,
    width INTEGER,
    height INTEGER,
    visible BOOLEAN,
    locked BOOLEAN,
    custom_props JSONB,
    template_name VARCHAR(255),
    template_category VARCHAR(50),
    component_name VARCHAR(100),
    default_props JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        udw.widget_key,
        udw.template_id,
        COALESCE(udw.title, dwt.name) as title,
        udw.position_x,
        udw.position_y,
        udw.width,
        udw.height,
        udw.visible,
        udw.locked,
        udw.custom_props,
        dwt.name as template_name,
        dwt.category as template_category,
        dwt.component_name,
        dwt.default_props
    FROM user_dashboard_widgets udw
    JOIN dashboard_widget_templates dwt ON udw.template_id = dwt.id
    WHERE udw.user_id = p_user_id
    ORDER BY udw.position_y, udw.position_x;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION save_dashboard_layout(
    p_user_id INTEGER,
    p_layout_data JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    widget_data JSONB;
BEGIN
    -- Delete existing widgets for user
    DELETE FROM user_dashboard_widgets WHERE user_id = p_user_id;
    
    -- Insert new widget configuration
    FOR widget_data IN SELECT jsonb_array_elements(p_layout_data->'widgets')
    LOOP
        INSERT INTO user_dashboard_widgets (
            user_id, template_id, widget_key, title, position_x, position_y, 
            width, height, visible, locked, custom_props
        ) VALUES (
            p_user_id,
            widget_data->>'template_id',
            widget_data->>'widget_key',
            widget_data->>'title',
            (widget_data->>'position_x')::INTEGER,
            (widget_data->>'position_y')::INTEGER,
            (widget_data->>'width')::INTEGER,
            (widget_data->>'height')::INTEGER,
            COALESCE((widget_data->>'visible')::BOOLEAN, true),
            COALESCE((widget_data->>'locked')::BOOLEAN, false),
            COALESCE(widget_data->'custom_props', '{}'::jsonb)
        );
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION track_widget_interaction(
    p_user_id INTEGER,
    p_session_id VARCHAR(100),
    p_widget_id VARCHAR(100),
    p_action_type VARCHAR(50),
    p_action_details JSONB DEFAULT NULL,
    p_duration_seconds INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO dashboard_usage_analytics (
        user_id, session_id, widget_id, action_type, action_details, duration_seconds
    ) VALUES (
        p_user_id, p_session_id, p_widget_id, p_action_type, p_action_details, p_duration_seconds
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_dashboard_recommendations(p_user_id INTEGER)
RETURNS TABLE (
    recommendation_type VARCHAR(50),
    title VARCHAR(255),
    description TEXT,
    action_data JSONB,
    priority INTEGER
) AS $$
DECLARE
    user_role VARCHAR(20);
    widget_count INTEGER;
    unused_widgets VARCHAR(100)[];
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM users WHERE id = p_user_id;
    
    -- Count current widgets
    SELECT COUNT(*) INTO widget_count FROM user_dashboard_widgets WHERE user_id = p_user_id;
    
    -- Get available but unused widgets
    SELECT ARRAY(
        SELECT dwt.id 
        FROM dashboard_widget_templates dwt 
        WHERE user_role = ANY(dwt.available_for_roles)
        AND dwt.id NOT IN (
            SELECT template_id FROM user_dashboard_widgets WHERE user_id = p_user_id
        )
    ) INTO unused_widgets;
    
    -- Generate recommendations
    IF widget_count = 0 THEN
        RETURN QUERY VALUES (
            'layout_template'::VARCHAR(50),
            'Get Started with a Template'::VARCHAR(255),
            'Choose from our pre-designed layouts to get started quickly'::TEXT,
            jsonb_build_object('action', 'browse_templates', 'role', user_role)::JSONB,
            1::INTEGER
        );
    END IF;
    
    IF array_length(unused_widgets, 1) > 0 THEN
        RETURN QUERY VALUES (
            'add_widget'::VARCHAR(50),
            'Discover New Widgets'::VARCHAR(255),
            'Add useful widgets to enhance your dashboard'::TEXT,
            jsonb_build_object('action', 'add_widget', 'suggestions', unused_widgets[1:3])::JSONB,
            2::INTEGER
        );
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function for old analytics data
CREATE OR REPLACE FUNCTION cleanup_dashboard_analytics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM dashboard_usage_analytics 
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql; 