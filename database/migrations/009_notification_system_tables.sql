-- Migration 009: Notification System Tables
-- This migration adds tables for comprehensive notification management and delivery
-- for Task 5.6: Build notification system for important updates and alerts

-- Notification Types Configuration
CREATE TABLE IF NOT EXISTS notification_types (
    id SERIAL PRIMARY KEY,
    type_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('academic', 'social', 'system', 'achievement', 'reminder')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    default_enabled BOOLEAN DEFAULT true,
    requires_action BOOLEAN DEFAULT false,
    icon VARCHAR(50),
    color VARCHAR(20),
    channels TEXT[] DEFAULT ARRAY['in_app'], -- Supported delivery channels
    target_roles TEXT[] NOT NULL, -- Which roles can receive this type
    template_subject TEXT,
    template_body TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type_id INTEGER NOT NULL REFERENCES notification_types(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    channels TEXT[] DEFAULT ARRAY['in_app'], -- Which channels this user wants for this type
    frequency VARCHAR(20) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'UTC',
    custom_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, notification_type_id)
);

-- Main Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    notification_type_id INTEGER NOT NULL REFERENCES notification_types(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- Additional data for the notification
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'dismissed', 'failed')),
    
    -- Action related fields
    action_required BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    action_text VARCHAR(100),
    action_completed BOOLEAN DEFAULT false,
    action_completed_at TIMESTAMP,
    
    -- Scheduling and delivery
    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    dismissed_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Categorization and grouping
    category VARCHAR(50),
    tags TEXT[],
    thread_id VARCHAR(100), -- For grouping related notifications
    parent_notification_id INTEGER REFERENCES notifications(id),
    
    -- Delivery tracking
    delivery_attempts INTEGER DEFAULT 0,
    last_delivery_attempt TIMESTAMP,
    delivery_channels TEXT[] DEFAULT ARRAY['in_app'],
    delivery_status JSONB DEFAULT '{}', -- Status per channel
    
    -- Metadata
    source_type VARCHAR(50), -- What generated this notification
    source_id INTEGER, -- ID of the source entity
    template_id INTEGER,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    notification_type_id INTEGER NOT NULL REFERENCES notification_types(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    language VARCHAR(10) DEFAULT 'en',
    
    -- Template content
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    html_template TEXT,
    push_template TEXT, -- For push notifications
    
    -- Template variables
    variables JSONB DEFAULT '{}', -- Available variables and their descriptions
    sample_data JSONB DEFAULT '{}', -- Sample data for testing
    
    -- Targeting
    target_roles TEXT[],
    conditions JSONB DEFAULT '{}', -- Conditions for when to use this template
    
    -- Status and versioning
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Delivery Log
CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'bounced')),
    attempt_number INTEGER DEFAULT 1,
    
    -- Delivery details
    external_id VARCHAR(255), -- ID from external service (email provider, push service, etc.)
    delivery_response TEXT,
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Timing
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    -- Metadata
    provider VARCHAR(100), -- Email provider, push service, etc.
    provider_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Groups (for bulk operations)
CREATE TABLE IF NOT EXISTS notification_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    notification_type_id INTEGER REFERENCES notification_types(id),
    
    -- Targeting
    target_criteria JSONB NOT NULL, -- Criteria for selecting recipients
    estimated_recipients INTEGER,
    actual_recipients INTEGER,
    
    -- Scheduling
    scheduled_for TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approval_required BOOLEAN DEFAULT false,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
    sent_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Statistics
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_read INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Subscriptions (for topics/channels)
CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_type VARCHAR(50) NOT NULL, -- 'class', 'student', 'subject', 'goal', etc.
    subscription_id INTEGER NOT NULL, -- ID of the class, student, etc.
    notification_types TEXT[], -- Which notification types to receive for this subscription
    enabled BOOLEAN DEFAULT true,
    
    -- Subscription metadata
    role_in_subscription VARCHAR(50), -- 'teacher', 'parent', 'student', etc.
    subscription_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, subscription_type, subscription_id)
);

-- Notification Rules (for automated notifications)
CREATE TABLE IF NOT EXISTS notification_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    notification_type_id INTEGER NOT NULL REFERENCES notification_types(id),
    
    -- Rule configuration
    trigger_event VARCHAR(100) NOT NULL, -- What event triggers this notification
    conditions JSONB NOT NULL, -- Conditions that must be met
    target_criteria JSONB NOT NULL, -- Who should receive the notification
    
    -- Template and content
    template_id INTEGER REFERENCES notification_templates(id),
    custom_subject TEXT,
    custom_body TEXT,
    data_mapping JSONB DEFAULT '{}', -- How to map event data to notification data
    
    -- Scheduling and frequency
    delay_minutes INTEGER DEFAULT 0,
    max_frequency VARCHAR(20) DEFAULT 'unlimited', -- Rate limiting
    frequency_window_hours INTEGER DEFAULT 24,
    
    -- Status and management
    is_active BOOLEAN DEFAULT true,
    last_triggered TIMESTAMP,
    trigger_count INTEGER DEFAULT 0,
    
    created_by INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Real-time Notification Channels (for WebSocket connections)
CREATE TABLE IF NOT EXISTS notification_channels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id VARCHAR(255) NOT NULL UNIQUE,
    channel_type VARCHAR(50) DEFAULT 'websocket',
    
    -- Connection details
    connection_id VARCHAR(255),
    device_info JSONB DEFAULT '{}',
    user_agent TEXT,
    ip_address INET,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_ping TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Subscription details
    subscribed_types TEXT[], -- Which notification types this channel wants
    channel_preferences JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Analytics
CREATE TABLE IF NOT EXISTS notification_analytics (
    id SERIAL PRIMARY KEY,
    notification_type_id INTEGER REFERENCES notification_types(id),
    date DATE NOT NULL,
    
    -- Send statistics
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_read INTEGER DEFAULT 0,
    total_dismissed INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    
    -- Response statistics
    total_actions_taken INTEGER DEFAULT 0,
    avg_time_to_read INTERVAL,
    avg_time_to_action INTERVAL,
    
    -- Channel breakdown
    channel_stats JSONB DEFAULT '{}',
    
    -- User role breakdown
    role_stats JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(notification_type_id, date)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status ON notifications(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_type_created ON notifications(notification_type_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_thread ON notifications(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_source ON notifications(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_notification ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_status ON notification_delivery_log(status, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_channels_user_active ON notification_channels(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notification_channels_channel_id ON notification_channels(channel_id);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user ON notification_subscriptions(user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_target ON notification_subscriptions(subscription_type, subscription_id);

CREATE INDEX IF NOT EXISTS idx_notification_rules_active ON notification_rules(is_active, trigger_event);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_date ON notification_analytics(date, notification_type_id);

-- Functions for Notification Management

-- Function to get user notification preferences with defaults
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id INTEGER)
RETURNS TABLE(
    notification_type_key VARCHAR,
    enabled BOOLEAN,
    channels TEXT[],
    frequency VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nt.type_key,
        COALESCE(np.enabled, nt.default_enabled) as enabled,
        COALESCE(np.channels, nt.channels) as channels,
        COALESCE(np.frequency, 'immediate') as frequency
    FROM notification_types nt
    LEFT JOIN notification_preferences np ON nt.id = np.notification_type_id AND np.user_id = p_user_id
    WHERE nt.type_key = ANY(nt.target_roles) OR EXISTS (
        SELECT 1 FROM users u WHERE u.id = p_user_id AND u.role = ANY(nt.target_roles)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
    p_type_key VARCHAR,
    p_recipient_id INTEGER,
    p_title VARCHAR,
    p_message TEXT,
    p_data JSONB DEFAULT '{}',
    p_sender_id INTEGER DEFAULT NULL,
    p_action_url VARCHAR DEFAULT NULL,
    p_scheduled_for TIMESTAMP DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_notification_id INTEGER;
    v_type_id INTEGER;
BEGIN
    -- Get notification type ID
    SELECT id INTO v_type_id FROM notification_types WHERE type_key = p_type_key;
    
    IF v_type_id IS NULL THEN
        RAISE EXCEPTION 'Unknown notification type: %', p_type_key;
    END IF;
    
    -- Insert notification
    INSERT INTO notifications (
        notification_type_id, recipient_id, sender_id, title, message, 
        data, action_url, scheduled_for
    ) VALUES (
        v_type_id, p_recipient_id, p_sender_id, p_title, p_message,
        p_data, p_action_url, COALESCE(p_scheduled_for, CURRENT_TIMESTAMP)
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id INTEGER, p_user_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE notifications 
    SET status = 'read', read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_notification_id 
      AND recipient_id = p_user_id 
      AND status IN ('sent', 'delivered');
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM notifications
    WHERE recipient_id = p_user_id 
      AND status IN ('sent', 'delivered')
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
    
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
    v_retention_days INTEGER := 90; -- Default retention
BEGIN
    -- Delete expired notifications
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;
    
    -- Delete old read notifications beyond retention period
    DELETE FROM notifications 
    WHERE status = 'read' 
      AND read_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * v_retention_days;
    
    -- Delete old dismissed notifications
    DELETE FROM notifications 
    WHERE status = 'dismissed' 
      AND dismissed_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_notification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notifications_timestamp
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_timestamp();

CREATE TRIGGER trigger_update_notification_preferences_timestamp
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_timestamp();

-- Insert default notification types
INSERT INTO notification_types (type_key, name, description, category, priority, target_roles, icon, color) VALUES
-- Academic notifications
('assignment_due', 'Assignment Due', 'Assignment is due soon', 'academic', 'high', ARRAY['student'], '📝', 'orange'),
('assignment_graded', 'Assignment Graded', 'Your assignment has been graded', 'academic', 'medium', ARRAY['student'], '✅', 'green'),
('new_assignment', 'New Assignment', 'New assignment has been created', 'academic', 'medium', ARRAY['student'], '📋', 'blue'),
('progress_update', 'Progress Update', 'Your learning progress has been updated', 'academic', 'medium', ARRAY['student', 'parent'], '📊', 'blue'),

-- Goal and achievement notifications  
('goal_achieved', 'Goal Achieved', 'Congratulations! You achieved a goal', 'achievement', 'high', ARRAY['student', 'parent'], '🎯', 'green'),
('goal_due', 'Goal Due Soon', 'Your goal deadline is approaching', 'reminder', 'medium', ARRAY['student'], '⏰', 'orange'),
('milestone_reached', 'Milestone Reached', 'You reached an important milestone', 'achievement', 'high', ARRAY['student', 'parent'], '🏆', 'gold'),
('achievement_earned', 'Achievement Earned', 'You earned a new achievement', 'achievement', 'medium', ARRAY['student', 'parent'], '🏅', 'purple'),

-- Teacher notifications
('student_struggling', 'Student Needs Help', 'A student may need additional support', 'academic', 'high', ARRAY['teacher'], '🆘', 'red'),
('parent_message', 'Message from Parent', 'You have a new message from a parent', 'social', 'medium', ARRAY['teacher'], '💬', 'blue'),
('class_summary', 'Daily Class Summary', 'Summary of today\'s class activities', 'academic', 'low', ARRAY['teacher'], '📈', 'blue'),

-- Parent notifications
('teacher_message', 'Message from Teacher', 'You have a new message from your child\'s teacher', 'social', 'medium', ARRAY['parent'], '👩‍🏫', 'blue'),
('child_achievement', 'Child Achievement', 'Your child earned a new achievement', 'achievement', 'high', ARRAY['parent'], '🌟', 'gold'),
('weekly_summary', 'Weekly Progress Summary', 'Your child\'s weekly learning summary', 'academic', 'low', ARRAY['parent'], '📊', 'blue'),
('activity_reminder', 'Learning Activity Reminder', 'Reminder to check on learning activities', 'reminder', 'low', ARRAY['parent'], '🔔', 'gray'),

-- System notifications
('system_maintenance', 'System Maintenance', 'Scheduled system maintenance notification', 'system', 'medium', ARRAY['student', 'teacher', 'parent', 'admin'], '🔧', 'gray'),
('new_feature', 'New Feature Available', 'A new feature has been added', 'system', 'low', ARRAY['student', 'teacher', 'parent'], '✨', 'purple'),
('security_alert', 'Security Alert', 'Important security notification', 'system', 'urgent', ARRAY['student', 'teacher', 'parent', 'admin'], '🔒', 'red'),

-- Engagement notifications
('daily_reminder', 'Daily Learning Reminder', 'Don\'t forget to continue your learning journey', 'reminder', 'low', ARRAY['student'], '📚', 'green'),
('streak_milestone', 'Learning Streak', 'You\'re on a learning streak!', 'achievement', 'medium', ARRAY['student'], '🔥', 'orange'),
('inactive_warning', 'Missing You!', 'We haven\'t seen you in a while', 'reminder', 'medium', ARRAY['student'], '💭', 'yellow')

ON CONFLICT (type_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP; 