-- Session Analytics and Tracking Enhancement Tables
-- Migration 004: Enhanced session tracking and analytics
-- Created: 2024

-- Session heartbeat tracking for real-time monitoring
CREATE TABLE session_heartbeats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES problem_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Real-time session state
  current_step INTEGER,
  response_in_progress BOOLEAN DEFAULT FALSE,
  time_on_step INTEGER, -- seconds spent on current step
  interface_events JSONB DEFAULT '[]', -- UI interactions, scrolls, clicks, etc.
  engagement_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  
  -- Performance indicators
  typing_speed INTEGER, -- characters per minute
  pause_duration INTEGER, -- seconds of inactivity
  help_attempts INTEGER DEFAULT 0,
  
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session engagement metrics (aggregated data)
CREATE TABLE session_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES problem_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Engagement scoring
  overall_engagement_score DECIMAL(3,2), -- 0.00 to 1.00
  attention_score DECIMAL(3,2), -- Based on idle time and interface activity
  persistence_score DECIMAL(3,2), -- Based on retry attempts and continuation
  help_seeking_score DECIMAL(3,2), -- Based on hint requests and help patterns
  
  -- Time-based metrics
  total_active_time INTEGER, -- seconds actively engaged
  total_idle_time INTEGER, -- seconds of inactivity
  longest_idle_period INTEGER, -- longest continuous idle time
  total_interface_events INTEGER,
  
  -- Step-specific metrics
  avg_time_per_step DECIMAL(5,2), -- average minutes per step
  steps_requiring_help INTEGER,
  steps_with_mistakes INTEGER,
  
  -- Calculated metrics
  efficiency_score DECIMAL(3,2), -- Task completion efficiency
  focus_score DECIMAL(3,2), -- Sustained attention measure
  
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learning trajectory tracking
CREATE TABLE learning_trajectories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject problem_subject NOT NULL,
  
  -- Trajectory data points
  trajectory_data JSONB NOT NULL, -- Array of performance points over time
  
  -- Trend analysis
  overall_trend VARCHAR(20), -- improving, declining, stable, inconsistent
  trend_strength DECIMAL(3,2), -- 0.00 to 1.00, strength of trend
  trend_confidence DECIMAL(3,2), -- Statistical confidence in trend
  
  -- Performance predictions
  predicted_accuracy_next_week DECIMAL(3,2),
  predicted_completion_rate_next_week DECIMAL(3,2),
  prediction_confidence DECIMAL(3,2),
  
  -- Learning velocity
  learning_velocity DECIMAL(4,3), -- Rate of improvement per session
  consistency_score DECIMAL(3,2), -- How consistent performance is
  
  -- Analysis period
  analysis_start_date DATE NOT NULL,
  analysis_end_date DATE NOT NULL,
  sessions_analyzed INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session comparison benchmarks
CREATE TABLE session_benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Benchmark categories
  subject problem_subject NOT NULL,
  difficulty_level difficulty_level NOT NULL,
  grade_level_min INTEGER,
  grade_level_max INTEGER,
  
  -- Benchmark metrics
  benchmark_accuracy DECIMAL(3,2), -- Expected accuracy for this category
  benchmark_completion_time INTEGER, -- Expected completion time in minutes
  benchmark_hint_usage DECIMAL(3,2), -- Expected hints per step
  benchmark_mistake_rate DECIMAL(3,2), -- Expected mistakes per step
  
  -- Percentile data
  accuracy_percentiles JSONB, -- 10th, 25th, 50th, 75th, 90th percentiles
  time_percentiles JSONB,
  hint_percentiles JSONB,
  
  -- Sample size and confidence
  sample_size INTEGER,
  confidence_level DECIMAL(3,2),
  last_updated DATE,
  
  -- Benchmark metadata
  benchmark_type VARCHAR(50) DEFAULT 'general', -- general, grade_specific, adaptive
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Real-time session alerts
CREATE TABLE session_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES problem_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type VARCHAR(50) NOT NULL, -- stuck, struggling, disengaged, error_pattern, time_limit
  alert_level VARCHAR(20) NOT NULL, -- info, warning, critical
  alert_message TEXT NOT NULL,
  
  -- Alert triggers
  trigger_conditions JSONB, -- What conditions triggered this alert
  trigger_threshold DECIMAL(5,2), -- Threshold value that was exceeded
  
  -- Response tracking
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID REFERENCES users(id), -- Teacher who acknowledged
  resolution_action TEXT,
  resolved_at TIMESTAMP,
  
  -- Alert metadata
  auto_generated BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 50, -- 1-100, higher is more urgent
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance anomaly detection
CREATE TABLE performance_anomalies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES problem_sessions(id) ON DELETE CASCADE,
  
  -- Anomaly identification
  anomaly_type VARCHAR(50) NOT NULL, -- performance_drop, unusual_pattern, outlier_time, error_spike
  anomaly_description TEXT,
  
  -- Statistical data
  expected_value DECIMAL(6,3), -- What was expected
  actual_value DECIMAL(6,3), -- What was observed
  deviation_score DECIMAL(4,2), -- How many standard deviations from norm
  statistical_significance DECIMAL(3,2), -- P-value or confidence level
  
  -- Context data
  baseline_period_days INTEGER, -- How many days of history used for baseline
  baseline_sessions INTEGER, -- Number of sessions in baseline
  anomaly_context JSONB, -- Additional context about the anomaly
  
  -- Follow-up tracking
  investigated BOOLEAN DEFAULT FALSE,
  investigation_notes TEXT,
  resolution_status VARCHAR(20) DEFAULT 'pending', -- pending, investigating, resolved, false_positive
  
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  investigated_at TIMESTAMP
);

-- Session analytics cache (for performance optimization)
CREATE TABLE session_analytics_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Cache key components
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  analytics_type VARCHAR(50) NOT NULL, -- student_summary, learning_patterns, progress_trends
  time_window VARCHAR(20) NOT NULL, -- daily, weekly, monthly, quarterly
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  
  -- Cached data
  analytics_data JSONB NOT NULL,
  
  -- Cache metadata
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Invalidation tracking
  invalidated BOOLEAN DEFAULT FALSE,
  invalidation_reason TEXT
);

-- Indexes for performance optimization

-- Session heartbeats indexes
CREATE INDEX idx_session_heartbeats_session ON session_heartbeats(session_id);
CREATE INDEX idx_session_heartbeats_student ON session_heartbeats(student_id);
CREATE INDEX idx_session_heartbeats_recorded_at ON session_heartbeats(recorded_at);
CREATE INDEX idx_session_heartbeats_engagement ON session_heartbeats(engagement_level);
CREATE INDEX idx_session_heartbeats_active_sessions ON session_heartbeats(session_id, recorded_at) 
  WHERE recorded_at >= NOW() - INTERVAL '1 hour';

-- Session engagement metrics indexes
CREATE INDEX idx_session_engagement_session ON session_engagement_metrics(session_id);
CREATE INDEX idx_session_engagement_student ON session_engagement_metrics(student_id);
CREATE INDEX idx_session_engagement_calculated_at ON session_engagement_metrics(calculated_at);
CREATE INDEX idx_session_engagement_scores ON session_engagement_metrics(overall_engagement_score, persistence_score);

-- Learning trajectories indexes
CREATE INDEX idx_learning_trajectories_student ON learning_trajectories(student_id);
CREATE INDEX idx_learning_trajectories_subject ON learning_trajectories(subject);
CREATE INDEX idx_learning_trajectories_trend ON learning_trajectories(overall_trend);
CREATE INDEX idx_learning_trajectories_dates ON learning_trajectories(analysis_start_date, analysis_end_date);
CREATE INDEX idx_learning_trajectories_updated_at ON learning_trajectories(updated_at);

-- Session benchmarks indexes
CREATE INDEX idx_session_benchmarks_category ON session_benchmarks(subject, difficulty_level);
CREATE INDEX idx_session_benchmarks_grade ON session_benchmarks(grade_level_min, grade_level_max);
CREATE INDEX idx_session_benchmarks_updated ON session_benchmarks(last_updated);

-- Session alerts indexes
CREATE INDEX idx_session_alerts_session ON session_alerts(session_id);
CREATE INDEX idx_session_alerts_student ON session_alerts(student_id);
CREATE INDEX idx_session_alerts_type_level ON session_alerts(alert_type, alert_level);
CREATE INDEX idx_session_alerts_created_at ON session_alerts(created_at);
CREATE INDEX idx_session_alerts_unresolved ON session_alerts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_session_alerts_priority ON session_alerts(priority DESC, created_at DESC);

-- Performance anomalies indexes
CREATE INDEX idx_performance_anomalies_student ON performance_anomalies(student_id);
CREATE INDEX idx_performance_anomalies_session ON performance_anomalies(session_id);
CREATE INDEX idx_performance_anomalies_type ON performance_anomalies(anomaly_type);
CREATE INDEX idx_performance_anomalies_detected_at ON performance_anomalies(detected_at);
CREATE INDEX idx_performance_anomalies_uninvestigated ON performance_anomalies(investigated) WHERE investigated = FALSE;

-- Analytics cache indexes
CREATE INDEX idx_analytics_cache_key ON session_analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_student ON session_analytics_cache(student_id);
CREATE INDEX idx_analytics_cache_type_window ON session_analytics_cache(analytics_type, time_window);
CREATE INDEX idx_analytics_cache_expires_at ON session_analytics_cache(expires_at);
CREATE INDEX idx_analytics_cache_valid ON session_analytics_cache(expires_at) WHERE invalidated = FALSE;

-- Apply updated_at triggers
CREATE TRIGGER update_learning_trajectories_updated_at 
  BEFORE UPDATE ON learning_trajectories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_benchmarks_updated_at 
  BEFORE UPDATE ON session_benchmarks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper functions for session analytics

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  session_uuid UUID
)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  engagement_score DECIMAL(3,2);
  total_time INTEGER;
  active_time INTEGER;
  idle_time INTEGER;
  interface_events INTEGER;
BEGIN
  -- Get session timing and activity data
  SELECT 
    EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at))::INTEGER,
    COALESCE(SUM(
      CASE WHEN sh.engagement_level = 'high' THEN 60
           WHEN sh.engagement_level = 'medium' THEN 30
           ELSE 10
      END
    ), 0)
  INTO total_time, active_time
  FROM problem_sessions ps
  LEFT JOIN session_heartbeats sh ON ps.id = sh.session_id
  WHERE ps.id = session_uuid
  GROUP BY ps.id, ps.started_at, ps.completed_at;
  
  -- Calculate basic engagement metrics
  IF total_time > 0 THEN
    engagement_score := LEAST(1.0, (active_time::DECIMAL / total_time::DECIMAL));
  ELSE
    engagement_score := 0.0;
  END IF;
  
  RETURN engagement_score;
END;
$$ LANGUAGE plpgsql;

-- Function to detect performance anomalies
CREATE OR REPLACE FUNCTION detect_performance_anomaly(
  student_uuid UUID,
  current_accuracy DECIMAL(3,2),
  current_time INTEGER,
  subject_name problem_subject
)
RETURNS BOOLEAN AS $$
DECLARE
  baseline_accuracy DECIMAL(3,2);
  baseline_time DECIMAL(5,2);
  accuracy_std DECIMAL(3,2);
  time_std DECIMAL(5,2);
  accuracy_deviation DECIMAL(4,2);
  time_deviation DECIMAL(4,2);
  is_anomaly BOOLEAN := FALSE;
BEGIN
  -- Get baseline performance from last 30 days
  SELECT 
    AVG(ps.accuracy_score),
    AVG(EXTRACT(EPOCH FROM (ps.completed_at - ps.started_at))/60),
    STDDEV(ps.accuracy_score),
    STDDEV(EXTRACT(EPOCH FROM (ps.completed_at - ps.started_at))/60)
  INTO baseline_accuracy, baseline_time, accuracy_std, time_std
  FROM problem_sessions ps
  JOIN problem_templates pt ON ps.template_id = pt.id
  WHERE ps.student_id = student_uuid
    AND pt.subject = subject_name
    AND ps.session_status = 'completed'
    AND ps.started_at >= NOW() - INTERVAL '30 days'
    AND ps.accuracy_score IS NOT NULL;
  
  -- Calculate deviations
  IF baseline_accuracy IS NOT NULL AND accuracy_std IS NOT NULL AND accuracy_std > 0 THEN
    accuracy_deviation := ABS(current_accuracy - baseline_accuracy) / accuracy_std;
    
    -- Check if accuracy is more than 2 standard deviations from baseline
    IF accuracy_deviation > 2.0 THEN
      is_anomaly := TRUE;
      
      -- Log the anomaly
      INSERT INTO performance_anomalies (
        student_id, anomaly_type, expected_value, actual_value, 
        deviation_score, baseline_period_days
      ) VALUES (
        student_uuid, 'accuracy_anomaly', baseline_accuracy, current_accuracy,
        accuracy_deviation, 30
      );
    END IF;
  END IF;
  
  RETURN is_anomaly;
END;
$$ LANGUAGE plpgsql;

-- Function to generate session alerts
CREATE OR REPLACE FUNCTION generate_session_alert(
  session_uuid UUID,
  alert_type_param VARCHAR(50),
  alert_message_param TEXT,
  alert_level_param VARCHAR(20) DEFAULT 'warning'
)
RETURNS UUID AS $$
DECLARE
  alert_id UUID;
  student_uuid UUID;
BEGIN
  -- Get student ID for the session
  SELECT student_id INTO student_uuid
  FROM problem_sessions
  WHERE id = session_uuid;
  
  -- Insert the alert
  INSERT INTO session_alerts (
    session_id, student_id, alert_type, alert_level, alert_message
  ) VALUES (
    session_uuid, student_uuid, alert_type_param, alert_level_param, alert_message_param
  ) RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update learning trajectory
CREATE OR REPLACE FUNCTION update_learning_trajectory(
  student_uuid UUID,
  subject_name problem_subject
)
RETURNS VOID AS $$
DECLARE
  trajectory_data JSONB;
  trend_analysis RECORD;
  sample_size INTEGER;
BEGIN
  -- Get recent session data for trajectory
  WITH recent_sessions AS (
    SELECT 
      ps.started_at::DATE as session_date,
      AVG(ps.accuracy_score) as daily_accuracy,
      COUNT(*) as daily_sessions,
      AVG(EXTRACT(EPOCH FROM (ps.completed_at - ps.started_at))/60) as avg_duration
    FROM problem_sessions ps
    JOIN problem_templates pt ON ps.template_id = pt.id
    WHERE ps.student_id = student_uuid
      AND pt.subject = subject_name
      AND ps.session_status = 'completed'
      AND ps.started_at >= NOW() - INTERVAL '30 days'
      AND ps.accuracy_score IS NOT NULL
    GROUP BY ps.started_at::DATE
    ORDER BY session_date ASC
  )
  SELECT 
    json_agg(
      json_build_object(
        'date', session_date,
        'accuracy', daily_accuracy,
        'sessions', daily_sessions,
        'duration', avg_duration
      ) ORDER BY session_date
    ),
    COUNT(*)
  INTO trajectory_data, sample_size
  FROM recent_sessions;
  
  -- Calculate trend using simple regression (placeholder - would use more sophisticated analysis)
  SELECT 
    CASE 
      WHEN COUNT(*) < 5 THEN 'insufficient_data'
      WHEN CORR(EXTRACT(EPOCH FROM started_at), accuracy_score) > 0.3 THEN 'improving'
      WHEN CORR(EXTRACT(EPOCH FROM started_at), accuracy_score) < -0.3 THEN 'declining'
      ELSE 'stable'
    END as trend,
    ABS(COALESCE(CORR(EXTRACT(EPOCH FROM started_at), accuracy_score), 0)) as strength,
    CASE WHEN COUNT(*) >= 10 THEN 0.8 ELSE 0.5 END as confidence
  INTO trend_analysis
  FROM problem_sessions ps
  JOIN problem_templates pt ON ps.template_id = pt.id
  WHERE ps.student_id = student_uuid
    AND pt.subject = subject_name
    AND ps.session_status = 'completed'
    AND ps.started_at >= NOW() - INTERVAL '30 days'
    AND ps.accuracy_score IS NOT NULL;
  
  -- Upsert learning trajectory
  INSERT INTO learning_trajectories (
    student_id, subject, trajectory_data, overall_trend, trend_strength,
    trend_confidence, analysis_start_date, analysis_end_date, sessions_analyzed
  ) VALUES (
    student_uuid, subject_name, trajectory_data, trend_analysis.trend,
    trend_analysis.strength, trend_analysis.confidence,
    CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, sample_size
  )
  ON CONFLICT (student_id, subject) DO UPDATE SET
    trajectory_data = EXCLUDED.trajectory_data,
    overall_trend = EXCLUDED.overall_trend,
    trend_strength = EXCLUDED.trend_strength,
    trend_confidence = EXCLUDED.trend_confidence,
    analysis_end_date = EXCLUDED.analysis_end_date,
    sessions_analyzed = EXCLUDED.sessions_analyzed,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to cache analytics results
CREATE OR REPLACE FUNCTION cache_analytics_result(
  cache_key_param VARCHAR(255),
  analytics_data_param JSONB,
  expiry_hours INTEGER DEFAULT 24
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO session_analytics_cache (
    cache_key, analytics_data, expires_at
  ) VALUES (
    cache_key_param, analytics_data_param, NOW() + (expiry_hours || ' hours')::INTERVAL
  )
  ON CONFLICT (cache_key) DO UPDATE SET
    analytics_data = EXCLUDED.analytics_data,
    expires_at = EXCLUDED.expires_at,
    generated_at = NOW(),
    hit_count = session_analytics_cache.hit_count + 1,
    last_accessed = NOW(),
    invalidated = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to retrieve cached analytics
CREATE OR REPLACE FUNCTION get_cached_analytics(
  cache_key_param VARCHAR(255)
)
RETURNS JSONB AS $$
DECLARE
  cached_data JSONB;
BEGIN
  SELECT analytics_data INTO cached_data
  FROM session_analytics_cache
  WHERE cache_key = cache_key_param
    AND expires_at > NOW()
    AND invalidated = FALSE;
  
  -- Update hit count and access time if found
  IF cached_data IS NOT NULL THEN
    UPDATE session_analytics_cache
    SET hit_count = hit_count + 1,
        last_accessed = NOW()
    WHERE cache_key = cache_key_param;
  END IF;
  
  RETURN cached_data;
END;
$$ LANGUAGE plpgsql;

-- Views for common analytics queries

-- Real-time session monitoring view
CREATE VIEW real_time_session_monitor AS
SELECT 
  ps.id as session_id,
  ps.student_id,
  u.username as student_name,
  ps.current_step,
  ps.total_steps,
  ROUND((ps.steps_completed::float / ps.total_steps) * 100, 1) as progress_percentage,
  ps.session_status,
  pt.title as problem_title,
  pt.subject,
  pt.difficulty_level,
  ps.started_at,
  ps.last_activity_at,
  EXTRACT(EPOCH FROM (NOW() - ps.last_activity_at))/60 as minutes_idle,
  CASE 
    WHEN ps.session_status = 'active' AND ps.last_activity_at < NOW() - INTERVAL '10 minutes' THEN 'stuck'
    WHEN ps.session_status = 'active' AND ps.last_activity_at < NOW() - INTERVAL '5 minutes' THEN 'idle'
    ELSE ps.session_status
  END as current_status,
  sh.engagement_level as latest_engagement
FROM problem_sessions ps
JOIN users u ON ps.student_id = u.id
JOIN problem_templates pt ON ps.template_id = pt.id
LEFT JOIN LATERAL (
  SELECT engagement_level
  FROM session_heartbeats
  WHERE session_id = ps.id
  ORDER BY recorded_at DESC
  LIMIT 1
) sh ON true
WHERE ps.session_status IN ('active', 'paused')
  AND ps.started_at >= NOW() - INTERVAL '24 hours'
ORDER BY ps.last_activity_at DESC;

-- Student progress overview
CREATE VIEW student_progress_overview AS
SELECT 
  ps.student_id,
  u.username as student_name,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE ps.session_status = 'completed') as completed_sessions,
  ROUND(AVG(ps.accuracy_score) FILTER (WHERE ps.accuracy_score IS NOT NULL), 3) as avg_accuracy,
  ROUND(AVG(EXTRACT(EPOCH FROM (ps.completed_at - ps.started_at))/60) FILTER (WHERE ps.session_status = 'completed'), 1) as avg_duration_minutes,
  SUM(ps.hints_requested) as total_hints,
  SUM(ps.mistakes_made) as total_mistakes,
  COUNT(DISTINCT pt.subject) as subjects_attempted,
  MAX(ps.started_at) as last_session_date,
  lt.overall_trend as learning_trend
FROM problem_sessions ps
JOIN users u ON ps.student_id = u.id
JOIN problem_templates pt ON ps.template_id = pt.id
LEFT JOIN learning_trajectories lt ON ps.student_id = lt.student_id AND pt.subject = lt.subject
WHERE ps.started_at >= NOW() - INTERVAL '30 days'
GROUP BY ps.student_id, u.username, lt.overall_trend
ORDER BY last_session_date DESC;

-- Class performance dashboard
CREATE VIEW class_performance_dashboard AS
SELECT 
  pt.subject,
  pt.difficulty_level,
  COUNT(*) as total_sessions,
  COUNT(DISTINCT ps.student_id) as unique_students,
  COUNT(*) FILTER (WHERE ps.session_status = 'completed') as completed_sessions,
  ROUND((COUNT(*) FILTER (WHERE ps.session_status = 'completed')::float / COUNT(*)) * 100, 1) as completion_rate,
  ROUND(AVG(ps.accuracy_score) FILTER (WHERE ps.accuracy_score IS NOT NULL), 3) as avg_accuracy,
  ROUND(AVG(EXTRACT(EPOCH FROM (ps.completed_at - ps.started_at))/60) FILTER (WHERE ps.session_status = 'completed'), 1) as avg_duration,
  COUNT(sa.id) as active_alerts
FROM problem_sessions ps
JOIN problem_templates pt ON ps.template_id = pt.id
LEFT JOIN session_alerts sa ON ps.id = sa.session_id AND sa.resolved_at IS NULL
WHERE ps.started_at >= NOW() - INTERVAL '7 days'
GROUP BY pt.subject, pt.difficulty_level
ORDER BY pt.subject, 
  CASE pt.difficulty_level 
    WHEN 'easy' THEN 1 
    WHEN 'medium' THEN 2 
    WHEN 'hard' THEN 3 
    WHEN 'advanced' THEN 4 
  END; 