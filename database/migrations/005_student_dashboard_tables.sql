-- Migration 005: Student Dashboard Tables
-- This migration adds tables for student goal tracking, achievements, and dashboard-related functionality

-- Student Goals Table
CREATE TABLE IF NOT EXISTS student_goals (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'academic', 'personal', 'social', 'creative', 'health'
    target_date DATE,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL
);

-- Goal Milestones Table
CREATE TABLE IF NOT EXISTS goal_milestones (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES student_goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    completed_at TIMESTAMP NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goal Activities Table (for tracking goal-related actions)
CREATE TABLE IF NOT EXISTS goal_activities (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES student_goals(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'milestone_completed', 'progress_updated'
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Achievement Categories Table
CREATE TABLE IF NOT EXISTS achievement_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100), -- Icon name or URL
    color VARCHAR(20), -- Hex color code
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Achievements Table
CREATE TABLE IF NOT EXISTS student_achievements (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(100) NOT NULL, -- Unique identifier for the achievement type
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL REFERENCES achievement_categories(id),
    icon VARCHAR(100),
    points_earned INTEGER DEFAULT 0,
    metadata JSONB, -- Additional achievement data
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, achievement_id) -- Prevent duplicate achievements
);

-- Student Dashboard Preferences Table
CREATE TABLE IF NOT EXISTS student_dashboard_preferences (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    widget_layout JSONB, -- Dashboard widget configuration
    default_timeframe VARCHAR(10) DEFAULT '30d', -- '7d', '30d', '90d', 'all'
    notification_settings JSONB,
    theme VARCHAR(20) DEFAULT 'light', -- 'light', 'dark', 'auto'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id)
);

-- Learning Streaks Table
CREATE TABLE IF NOT EXISTS learning_streaks (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_type VARCHAR(50) NOT NULL, -- 'daily_journal', 'problem_solving', 'overall_activity'
    current_count INTEGER DEFAULT 0,
    best_count INTEGER DEFAULT 0,
    last_activity_date DATE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, streak_type)
);

-- Dashboard Activity Feed Table (for personalized activity tracking)
CREATE TABLE IF NOT EXISTS dashboard_activities (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'journal_entry', 'problem_solved', 'goal_achieved', 'streak_milestone'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    related_id INTEGER, -- ID of related entity (journal entry, problem session, etc.)
    metadata JSONB,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_goals_student_id ON student_goals(student_id);
CREATE INDEX IF NOT EXISTS idx_student_goals_status ON student_goals(status);
CREATE INDEX IF NOT EXISTS idx_student_goals_category ON student_goals(category);
CREATE INDEX IF NOT EXISTS idx_student_goals_target_date ON student_goals(target_date);

CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_completed ON goal_milestones(completed_at);

CREATE INDEX IF NOT EXISTS idx_goal_activities_goal_id ON goal_activities(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_activities_created_at ON goal_activities(created_at);

CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id ON student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_category ON student_achievements(category);
CREATE INDEX IF NOT EXISTS idx_student_achievements_earned_at ON student_achievements(earned_at);

CREATE INDEX IF NOT EXISTS idx_learning_streaks_student_id ON learning_streaks(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_streaks_type ON learning_streaks(streak_type);

CREATE INDEX IF NOT EXISTS idx_dashboard_activities_student_id ON dashboard_activities(student_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_activities_type ON dashboard_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_activities_created_at ON dashboard_activities(created_at);

-- Add total_points and current_streak columns to students table if they don't exist
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- Insert default achievement categories
INSERT INTO achievement_categories (id, name, description, icon, color) VALUES
('learning', 'Learning Milestones', 'Achievements related to learning progress and knowledge acquisition', '🎓', '#4CAF50'),
('streak', 'Consistency Streaks', 'Achievements for maintaining learning streaks and regular activity', '🔥', '#FF5722'),
('goal', 'Goal Achievement', 'Achievements for completing personal learning goals', '🎯', '#2196F3'),
('social', 'Social Learning', 'Achievements related to collaboration and peer interaction', '👥', '#9C27B0'),
('creativity', 'Creative Expression', 'Achievements for creative projects and artistic expression', '🎨', '#E91E63'),
('problem_solving', 'Problem Solving', 'Achievements for mathematical and logical problem solving', '🧮', '#FF9800'),
('reflection', 'Self Reflection', 'Achievements for thoughtful journaling and self-awareness', '💭', '#607D8B'),
('growth', 'Personal Growth', 'Achievements for emotional intelligence and personal development', '🌱', '#8BC34A')
ON CONFLICT (id) DO NOTHING;

-- Function to update streak counts
CREATE OR REPLACE FUNCTION update_learning_streak(
    p_student_id INTEGER,
    p_streak_type VARCHAR(50),
    p_activity_date DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER AS $$
DECLARE
    current_streak INTEGER;
    best_streak INTEGER;
    last_date DATE;
BEGIN
    -- Get current streak data
    SELECT current_count, best_count, last_activity_date 
    INTO current_streak, best_streak, last_date
    FROM learning_streaks 
    WHERE student_id = p_student_id AND streak_type = p_streak_type;
    
    IF NOT FOUND THEN
        -- Create new streak record
        INSERT INTO learning_streaks (student_id, streak_type, current_count, best_count, last_activity_date)
        VALUES (p_student_id, p_streak_type, 1, 1, p_activity_date);
        RETURN 1;
    END IF;
    
    -- Check if activity is consecutive
    IF last_date = p_activity_date THEN
        -- Same day, no change
        RETURN current_streak;
    ELSIF last_date = p_activity_date - INTERVAL '1 day' THEN
        -- Consecutive day, increment streak
        current_streak := current_streak + 1;
        best_streak := GREATEST(best_streak, current_streak);
    ELSE
        -- Streak broken, reset to 1
        current_streak := 1;
    END IF;
    
    -- Update streak record
    UPDATE learning_streaks 
    SET current_count = current_streak,
        best_count = best_streak,
        last_activity_date = p_activity_date,
        updated_at = CURRENT_TIMESTAMP
    WHERE student_id = p_student_id AND streak_type = p_streak_type;
    
    -- Update student's overall current streak
    UPDATE students 
    SET current_streak = (
        SELECT MAX(current_count) 
        FROM learning_streaks 
        WHERE student_id = p_student_id
    ),
    best_streak = (
        SELECT MAX(best_count) 
        FROM learning_streaks 
        WHERE student_id = p_student_id
    ),
    last_activity_date = p_activity_date
    WHERE user_id = p_student_id;
    
    RETURN current_streak;
END;
$$ LANGUAGE plpgsql;

-- Function to award achievement
CREATE OR REPLACE FUNCTION award_achievement(
    p_student_id INTEGER,
    p_achievement_id VARCHAR(100),
    p_title VARCHAR(255),
    p_description TEXT,
    p_category VARCHAR(50),
    p_points INTEGER DEFAULT 0,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN AS $$
DECLARE
    achievement_exists BOOLEAN;
BEGIN
    -- Check if student already has this achievement
    SELECT EXISTS(
        SELECT 1 FROM student_achievements 
        WHERE student_id = p_student_id AND achievement_id = p_achievement_id
    ) INTO achievement_exists;
    
    IF achievement_exists THEN
        RETURN FALSE; -- Achievement already earned
    END IF;
    
    -- Award the achievement
    INSERT INTO student_achievements (
        student_id, achievement_id, title, description, category, points_earned, metadata
    ) VALUES (
        p_student_id, p_achievement_id, p_title, p_description, p_category, p_points, p_metadata
    );
    
    -- Update student's total points
    UPDATE students 
    SET total_points = COALESCE(total_points, 0) + p_points
    WHERE user_id = p_student_id;
    
    -- Log dashboard activity
    INSERT INTO dashboard_activities (
        student_id, activity_type, title, description, points_earned, metadata
    ) VALUES (
        p_student_id, 'achievement_earned', p_title, p_description, p_points, 
        jsonb_build_object('achievement_id', p_achievement_id, 'category', p_category)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update goal progress
CREATE OR REPLACE FUNCTION update_goal_progress() RETURNS TRIGGER AS $$
BEGIN
    -- Update goal progress percentage when milestone is completed
    IF TG_OP = 'UPDATE' AND OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
        UPDATE student_goals 
        SET progress_percentage = (
            SELECT (COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END)::float / COUNT(*)::float) * 100
            FROM goal_milestones 
            WHERE goal_id = NEW.goal_id
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.goal_id;
        
        -- Log milestone completion activity
        INSERT INTO goal_activities (goal_id, activity_type, description)
        VALUES (NEW.goal_id, 'milestone_completed', 'Milestone "' || NEW.title || '" completed');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_goal_progress
    AFTER UPDATE ON goal_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_goal_progress();

-- Trigger to mark goal as completed when all milestones are done
CREATE OR REPLACE FUNCTION check_goal_completion() RETURNS TRIGGER AS $$
BEGIN
    -- Check if all milestones are completed
    IF NOT EXISTS(
        SELECT 1 FROM goal_milestones 
        WHERE goal_id = NEW.goal_id AND completed_at IS NULL
    ) THEN
        UPDATE student_goals 
        SET status = 'completed',
            progress_percentage = 100.00,
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.goal_id AND status = 'active';
        
        -- Award goal completion achievement
        PERFORM award_achievement(
            (SELECT student_id FROM student_goals WHERE id = NEW.goal_id),
            'goal_completed_' || NEW.goal_id,
            'Goal Completed',
            'Completed goal: ' || (SELECT title FROM student_goals WHERE id = NEW.goal_id),
            'goal',
            50,
            jsonb_build_object('goal_id', NEW.goal_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_goal_completion
    AFTER UPDATE ON goal_milestones
    FOR EACH ROW
    WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
    EXECUTE FUNCTION check_goal_completion(); 