-- Mentra Guided Problem Solving System Database Schema
-- Migration 003: Problem Solving Tables with Scaffolding Support
-- Created: 2024

-- Problem difficulty levels
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard', 'advanced');

-- Problem types and subjects
CREATE TYPE problem_type AS ENUM ('math', 'science', 'writing', 'reading_comprehension', 'critical_thinking', 'mixed');

CREATE TYPE problem_subject AS ENUM (
  -- Mathematics
  'arithmetic', 'algebra', 'geometry', 'statistics', 'calculus',
  -- Science
  'biology', 'chemistry', 'physics', 'earth_science', 'environmental_science',
  -- Language Arts
  'creative_writing', 'essay_writing', 'grammar', 'vocabulary', 'reading_analysis',
  -- Other
  'logic', 'general'
);

-- Session status tracking
CREATE TYPE session_status AS ENUM ('active', 'completed', 'abandoned', 'paused');

-- Problem templates library
CREATE TABLE problem_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic template information
  title VARCHAR(200) NOT NULL,
  description TEXT,
  problem_type problem_type NOT NULL,
  subject problem_subject NOT NULL,
  difficulty_level difficulty_level NOT NULL,
  
  -- Problem content
  problem_statement TEXT NOT NULL,
  problem_data JSONB, -- Variables, diagrams, datasets, etc.
  solution_approach TEXT, -- General solution strategy
  expected_solution TEXT, -- Model answer
  
  -- Scaffolding configuration
  scaffolding_steps JSONB NOT NULL, -- Step-by-step breakdown
  hint_system JSONB, -- Progressive hints
  common_mistakes JSONB, -- Common errors and guidance
  
  -- Educational metadata
  learning_objectives TEXT[],
  prerequisite_skills TEXT[],
  bloom_taxonomy_level VARCHAR(50), -- remember, understand, apply, analyze, evaluate, create
  grade_level_min INTEGER,
  grade_level_max INTEGER,
  estimated_time_minutes INTEGER,
  
  -- Template management
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2), -- 0.00 to 1.00
  average_completion_time INTEGER, -- minutes
  
  -- Search and organization
  tags TEXT[],
  keywords TEXT[]
);

-- Student problem sessions
CREATE TABLE problem_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES problem_templates(id),
  
  -- Session information
  session_status session_status DEFAULT 'active',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  abandoned_at TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Problem instance data
  problem_instance JSONB NOT NULL, -- Customized problem for this session
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER NOT NULL,
  
  -- Progress tracking
  steps_completed INTEGER DEFAULT 0,
  hints_requested INTEGER DEFAULT 0,
  mistakes_made INTEGER DEFAULT 0,
  help_requests INTEGER DEFAULT 0,
  
  -- Performance metrics
  accuracy_score DECIMAL(3,2), -- 0.00 to 1.00
  effort_score DECIMAL(3,2), -- Based on engagement, attempts, etc.
  completion_time_minutes INTEGER,
  efficiency_score DECIMAL(3,2), -- How optimal their solution path was
  
  -- Final results
  student_solution TEXT,
  solution_steps JSONB, -- Student's step-by-step work
  teacher_feedback TEXT,
  ai_feedback TEXT,
  
  -- Session context
  emotional_state VARCHAR(50),
  difficulty_perception VARCHAR(50), -- too_easy, just_right, too_hard
  session_notes TEXT
);

-- Individual steps within a problem session
CREATE TABLE problem_session_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES problem_sessions(id) ON DELETE CASCADE,
  
  -- Step information
  step_number INTEGER NOT NULL,
  step_title VARCHAR(200),
  step_description TEXT,
  step_type VARCHAR(50), -- analyze, plan, execute, verify, reflect
  
  -- Step content
  prompt TEXT NOT NULL,
  expected_response TEXT,
  scaffolding_guidance TEXT,
  
  -- Student interaction
  student_response TEXT,
  response_timestamp TIMESTAMP,
  attempts_count INTEGER DEFAULT 0,
  
  -- Step completion tracking
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  needs_help BOOLEAN DEFAULT FALSE,
  skip_requested BOOLEAN DEFAULT FALSE,
  
  -- Quality assessment
  response_quality VARCHAR(50), -- excellent, good, needs_improvement, incorrect
  accuracy_score DECIMAL(3,2),
  understanding_level VARCHAR(50), -- confident, partial, confused
  
  -- AI analysis
  ai_feedback TEXT,
  suggested_improvements TEXT,
  misconceptions_identified TEXT[],
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scaffolding interventions and support provided
CREATE TABLE scaffolding_interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES problem_sessions(id) ON DELETE CASCADE,
  step_id UUID REFERENCES problem_session_steps(id) ON DELETE CASCADE,
  
  -- Intervention details
  intervention_type VARCHAR(50) NOT NULL, -- hint, question, encouragement, redirection
  intervention_content TEXT NOT NULL,
  trigger_reason VARCHAR(100), -- student_requested, mistake_detected, confusion_detected, timeout
  
  -- Timing
  provided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  response_time_seconds INTEGER, -- How long student took to respond
  
  -- Effectiveness tracking
  was_helpful BOOLEAN,
  led_to_progress BOOLEAN DEFAULT FALSE,
  student_feedback VARCHAR(500),
  
  -- AI scaffolding metadata
  scaffolding_style VARCHAR(50), -- socratic, direct, encouraging, analytical
  personalization_factors JSONB,
  confidence_level DECIMAL(3,2)
);

-- Mistake analysis and learning opportunities
CREATE TABLE problem_mistakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES problem_sessions(id) ON DELETE CASCADE,
  step_id UUID REFERENCES problem_session_steps(id) ON DELETE CASCADE,
  
  -- Mistake classification
  mistake_type VARCHAR(100), -- conceptual, computational, procedural, careless
  mistake_category VARCHAR(100), -- specific to subject area
  mistake_description TEXT NOT NULL,
  incorrect_response TEXT,
  
  -- Analysis
  root_cause TEXT, -- What led to the mistake
  severity VARCHAR(50) DEFAULT 'medium', -- low, medium, high
  is_common_mistake BOOLEAN DEFAULT FALSE,
  
  -- Remediation
  correction_provided TEXT,
  explanation_given TEXT,
  practice_recommended TEXT,
  
  -- Learning impact
  was_corrected BOOLEAN DEFAULT FALSE,
  understanding_improved BOOLEAN,
  repeated_in_session BOOLEAN DEFAULT FALSE,
  
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  corrected_at TIMESTAMP
);

-- Alternative solution paths and approaches
CREATE TABLE solution_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES problem_templates(id) ON DELETE CASCADE,
  
  -- Path information
  path_name VARCHAR(200) NOT NULL,
  path_description TEXT,
  difficulty_level difficulty_level,
  is_optimal BOOLEAN DEFAULT FALSE,
  
  -- Path steps
  solution_steps JSONB NOT NULL,
  estimated_time_minutes INTEGER,
  required_skills TEXT[],
  
  -- Usage data
  times_used INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2),
  student_preference_score DECIMAL(3,2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problem adaptations for individual students
CREATE TABLE problem_adaptations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES problem_templates(id) ON DELETE CASCADE,
  
  -- Adaptation type
  adaptation_type VARCHAR(50), -- difficulty, scaffolding, presentation, pace
  adaptation_description TEXT,
  
  -- Adaptation data
  modified_content JSONB,
  additional_scaffolding JSONB,
  simplified_language BOOLEAN DEFAULT FALSE,
  extra_examples BOOLEAN DEFAULT FALSE,
  
  -- Context for adaptation
  reason_for_adaptation TEXT,
  student_needs TEXT[],
  previous_performance JSONB,
  
  -- Effectiveness
  improvement_observed BOOLEAN,
  student_satisfaction INTEGER, -- 1-5 scale
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problem performance analytics
CREATE TABLE problem_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Time period for analytics
  analysis_period_start DATE NOT NULL,
  analysis_period_end DATE NOT NULL,
  
  -- Performance metrics
  total_sessions INTEGER DEFAULT 0,
  completed_sessions INTEGER DEFAULT 0,
  average_completion_time DECIMAL(5,2),
  overall_accuracy DECIMAL(3,2),
  improvement_rate DECIMAL(3,2), -- Rate of improvement over time
  
  -- Subject-specific performance
  subject_performance JSONB, -- Performance by subject
  difficulty_performance JSONB, -- Performance by difficulty level
  problem_type_performance JSONB, -- Performance by problem type
  
  -- Learning patterns
  strongest_subjects TEXT[],
  weakest_subjects TEXT[],
  preferred_solution_methods TEXT[],
  common_mistake_patterns TEXT[],
  
  -- Scaffolding effectiveness
  scaffolding_responsiveness DECIMAL(3,2), -- How well student responds to scaffolding
  hint_dependency DECIMAL(3,2), -- How much student relies on hints
  independence_score DECIMAL(3,2), -- How independently student can work
  
  -- Recommendations
  recommended_problem_types TEXT[],
  suggested_skill_focus TEXT[],
  adaptive_strategies TEXT[],
  
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teacher problem reviews and assessments
CREATE TABLE teacher_problem_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES problem_sessions(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Review data
  review_type VARCHAR(50) DEFAULT 'complete', -- quick, detailed, complete
  overall_assessment VARCHAR(50), -- excellent, good, satisfactory, needs_improvement
  
  -- Detailed feedback
  strengths_observed TEXT,
  areas_for_improvement TEXT,
  specific_feedback TEXT,
  private_notes TEXT, -- Not visible to student
  
  -- Scoring
  understanding_score INTEGER CHECK (understanding_score >= 1 AND understanding_score <= 5),
  effort_score INTEGER CHECK (effort_score >= 1 AND effort_score <= 5),
  process_score INTEGER CHECK (process_score >= 1 AND process_score <= 5),
  final_score INTEGER CHECK (final_score >= 1 AND final_score <= 5),
  
  -- Recommendations
  next_steps TEXT,
  recommended_practice TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  
  reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problem collections and assignments
CREATE TABLE problem_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Collection information
  name VARCHAR(200) NOT NULL,
  description TEXT,
  collection_type VARCHAR(50), -- unit, assignment, practice_set, assessment
  
  -- Educational context
  subject problem_subject,
  grade_level INTEGER,
  unit_name VARCHAR(200),
  learning_objectives TEXT[],
  
  -- Collection settings
  is_ordered BOOLEAN DEFAULT FALSE, -- Must complete in order
  time_limit_minutes INTEGER,
  attempts_allowed INTEGER DEFAULT 3,
  show_solutions BOOLEAN DEFAULT TRUE,
  
  -- Access control
  created_by UUID NOT NULL REFERENCES users(id),
  is_public BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problems within collections
CREATE TABLE collection_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES problem_collections(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES problem_templates(id) ON DELETE CASCADE,
  
  -- Position and configuration
  sort_order INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT TRUE,
  points_possible INTEGER DEFAULT 100,
  
  -- Collection-specific adaptations
  custom_instructions TEXT,
  modified_difficulty difficulty_level,
  additional_scaffolding JSONB,
  
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
-- Problem templates indexes
CREATE INDEX idx_problem_templates_type_subject ON problem_templates(problem_type, subject);
CREATE INDEX idx_problem_templates_difficulty ON problem_templates(difficulty_level);
CREATE INDEX idx_problem_templates_grade_level ON problem_templates(grade_level_min, grade_level_max);
CREATE INDEX idx_problem_templates_active ON problem_templates(is_active);
CREATE INDEX idx_problem_templates_tags ON problem_templates USING GIN(tags);
CREATE INDEX idx_problem_templates_usage ON problem_templates(usage_count DESC);

-- Problem sessions indexes
CREATE INDEX idx_problem_sessions_student_status ON problem_sessions(student_id, session_status);
CREATE INDEX idx_problem_sessions_template ON problem_sessions(template_id);
CREATE INDEX idx_problem_sessions_started_at ON problem_sessions(started_at);
CREATE INDEX idx_problem_sessions_completed_at ON problem_sessions(completed_at);

-- Session steps indexes
CREATE INDEX idx_session_steps_session_id ON problem_session_steps(session_id);
CREATE INDEX idx_session_steps_step_number ON problem_session_steps(session_id, step_number);
CREATE INDEX idx_session_steps_completed ON problem_session_steps(is_completed);

-- Scaffolding interventions indexes
CREATE INDEX idx_scaffolding_interventions_session ON scaffolding_interventions(session_id);
CREATE INDEX idx_scaffolding_interventions_type ON scaffolding_interventions(intervention_type);
CREATE INDEX idx_scaffolding_interventions_provided_at ON scaffolding_interventions(provided_at);

-- Problem mistakes indexes
CREATE INDEX idx_problem_mistakes_session ON problem_mistakes(session_id);
CREATE INDEX idx_problem_mistakes_type ON problem_mistakes(mistake_type);
CREATE INDEX idx_problem_mistakes_detected_at ON problem_mistakes(detected_at);

-- Analytics indexes
CREATE INDEX idx_problem_analytics_student_period ON problem_analytics(student_id, analysis_period_start, analysis_period_end);

-- Collection indexes
CREATE INDEX idx_collection_problems_collection ON collection_problems(collection_id, sort_order);

-- Apply updated_at triggers
CREATE TRIGGER update_problem_templates_updated_at BEFORE UPDATE ON problem_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_problem_collections_updated_at BEFORE UPDATE ON problem_collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SOLUTION PATH EXPLORATION ENHANCEMENT TABLES
-- ============================================

-- Path exploration sessions for tracking student exploration of different solution approaches
CREATE TABLE path_exploration_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path_id UUID NOT NULL REFERENCES solution_paths(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_session_id UUID REFERENCES problem_sessions(id) ON DELETE CASCADE,
  
  -- Exploration details
  exploration_mode VARCHAR(50) DEFAULT 'guided', -- guided, independent, comparison, discovery
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  abandoned_at TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Progress tracking
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER NOT NULL,
  steps_completed INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0, -- seconds
  
  -- Learning outcomes
  insights_gained JSONB DEFAULT '[]',
  difficulties_encountered JSONB DEFAULT '[]',
  breakthroughs_achieved JSONB DEFAULT '[]',
  
  -- Session assessment
  overall_satisfaction INTEGER CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 5),
  perceived_difficulty INTEGER CHECK (perceived_difficulty >= 1 AND perceived_difficulty <= 5),
  learning_value_rating INTEGER CHECK (learning_value_rating >= 1 AND learning_value_rating <= 5),
  would_recommend BOOLEAN,
  
  -- Session metadata
  session_metadata JSONB DEFAULT '{}',
  exploration_notes TEXT,
  
  UNIQUE(path_id, student_id, problem_session_id)
);

-- Individual step completions within path exploration
CREATE TABLE path_step_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exploration_session_id UUID NOT NULL REFERENCES path_exploration_sessions(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES solution_paths(id) ON DELETE CASCADE,
  
  -- Step details
  step_number INTEGER NOT NULL,
  step_response TEXT,
  step_approach VARCHAR(100), -- how student approached this step
  
  -- Timing and effort
  time_spent INTEGER, -- seconds
  attempts_count INTEGER DEFAULT 1,
  help_requested BOOLEAN DEFAULT FALSE,
  
  -- Step assessment
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  understanding_level VARCHAR(50), -- confident, partial, confused
  
  -- Step insights
  step_insights JSONB DEFAULT '[]',
  mistakes_made JSONB DEFAULT '[]',
  aha_moments TEXT,
  
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(exploration_session_id, step_number)
);

-- Student path usage statistics and preferences
CREATE TABLE student_path_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES solution_paths(id) ON DELETE CASCADE,
  
  -- Usage statistics
  times_attempted INTEGER DEFAULT 0,
  times_completed INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0, -- seconds
  
  -- Performance metrics
  success_rate DECIMAL(3,2) DEFAULT 0.00,
  average_completion_time INTEGER, -- seconds
  best_completion_time INTEGER, -- seconds
  completion_time_avg INTEGER, -- seconds (for compatibility)
  
  -- Student preferences and ratings
  preference_score INTEGER CHECK (preference_score >= 1 AND preference_score <= 5),
  difficulty_perception INTEGER CHECK (difficulty_perception >= 1 AND difficulty_perception <= 5),
  learning_value_rating INTEGER CHECK (learning_value_rating >= 1 AND learning_value_rating <= 5),
  
  -- Learning patterns
  learning_style_match VARCHAR(50), -- how well path matches student's learning style
  common_difficulties JSONB DEFAULT '[]',
  strengths_demonstrated JSONB DEFAULT '[]',
  
  -- Tracking metadata
  first_attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_completed_at TIMESTAMP,
  
  UNIQUE(student_id, path_id)
);

-- Path comparison sessions for when students compare multiple approaches
CREATE TABLE path_comparison_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_template_id UUID NOT NULL REFERENCES problem_templates(id) ON DELETE CASCADE,
  
  -- Comparison details
  compared_paths UUID[] NOT NULL, -- Array of path IDs
  comparison_criteria VARCHAR(255)[], -- efficiency, complexity, learning_value, etc.
  comparison_mode VARCHAR(50) DEFAULT 'side_by_side', -- side_by_side, sequential, matrix
  
  -- Session timing
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  total_time_spent INTEGER DEFAULT 0, -- seconds
  
  -- Comparison outcomes
  preferred_path_id UUID REFERENCES solution_paths(id),
  preference_reasoning TEXT,
  insights_gained JSONB DEFAULT '[]',
  
  -- Session assessment
  comparison_helpfulness INTEGER CHECK (comparison_helpfulness >= 1 AND comparison_helpfulness <= 5),
  decision_confidence INTEGER CHECK (decision_confidence >= 1 AND decision_confidence <= 5),
  
  -- Metadata
  session_notes TEXT,
  comparison_metadata JSONB DEFAULT '{}'
);

-- Path discovery events for tracking when students discover alternative approaches
CREATE TABLE path_discovery_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_path_id UUID REFERENCES solution_paths(id) ON DELETE CASCADE,
  discovered_path_id UUID NOT NULL REFERENCES solution_paths(id) ON DELETE CASCADE,
  problem_session_id UUID REFERENCES problem_sessions(id) ON DELETE CASCADE,
  
  -- Discovery context
  discovery_trigger VARCHAR(100), -- mistake_analysis, hint_request, exploration, suggestion
  discovery_step INTEGER, -- step where discovery occurred
  discovery_mode VARCHAR(50), -- adaptive, comprehensive, targeted
  
  -- Discovery details
  discovery_reasoning TEXT,
  benefits_identified JSONB DEFAULT '[]',
  switching_opportunities JSONB DEFAULT '[]',
  
  -- Student response
  student_interest_level INTEGER CHECK (student_interest_level >= 1 AND student_interest_level <= 5),
  exploration_decision VARCHAR(50), -- explore_now, bookmark, ignore, switch
  exploration_outcome VARCHAR(50), -- completed, abandoned, deferred
  
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  explored_at TIMESTAMP,
  outcome_recorded_at TIMESTAMP
);

-- Path effectiveness analytics for tracking which paths work best for which students
CREATE TABLE path_effectiveness_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path_id UUID NOT NULL REFERENCES solution_paths(id) ON DELETE CASCADE,
  
  -- Time period for analysis
  analysis_period_start DATE NOT NULL,
  analysis_period_end DATE NOT NULL,
  
  -- Overall effectiveness metrics
  total_attempts INTEGER DEFAULT 0,
  successful_completions INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 0.00,
  average_completion_time INTEGER, -- seconds
  median_completion_time INTEGER, -- seconds
  
  -- Student demographics effectiveness
  effectiveness_by_grade JSONB DEFAULT '{}', -- grade level performance
  effectiveness_by_learning_style JSONB DEFAULT '{}', -- learning style performance
  effectiveness_by_difficulty_preference JSONB DEFAULT '{}',
  
  -- Learning outcomes
  average_satisfaction_rating DECIMAL(3,2),
  average_learning_value_rating DECIMAL(3,2),
  recommendation_rate DECIMAL(3,2), -- percentage who would recommend
  
  -- Path characteristics impact
  complexity_effectiveness JSONB DEFAULT '{}',
  prerequisite_effectiveness JSONB DEFAULT '{}',
  
  -- Comparison with other paths
  relative_effectiveness_rank INTEGER,
  improvement_over_baseline DECIMAL(3,2),
  
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Path adaptation suggestions for improving paths based on student feedback
CREATE TABLE path_adaptation_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path_id UUID NOT NULL REFERENCES solution_paths(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE, -- null for aggregate suggestions
  
  -- Suggestion details
  suggestion_type VARCHAR(100), -- simplify_step, add_visual, provide_example, break_down, etc.
  target_step INTEGER, -- which step to improve, null for overall
  suggestion_description TEXT NOT NULL,
  
  -- Supporting evidence
  evidence_type VARCHAR(50), -- student_feedback, performance_data, mistake_analysis
  evidence_data JSONB DEFAULT '{}',
  confidence_score DECIMAL(3,2) DEFAULT 0.00,
  
  -- Implementation tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, implemented, rejected
  implementation_priority INTEGER CHECK (implementation_priority >= 1 AND implementation_priority <= 5),
  implementation_notes TEXT,
  
  -- Impact assessment
  expected_impact VARCHAR(50), -- high, medium, low
  target_audience VARCHAR(100), -- all_students, struggling_students, advanced_students, etc.
  
  suggested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  implemented_at TIMESTAMP
);

-- Enhanced indexes for path exploration performance
-- Path exploration sessions indexes
CREATE INDEX idx_path_exploration_sessions_student ON path_exploration_sessions(student_id);
CREATE INDEX idx_path_exploration_sessions_path ON path_exploration_sessions(path_id);
CREATE INDEX idx_path_exploration_sessions_problem_session ON path_exploration_sessions(problem_session_id);
CREATE INDEX idx_path_exploration_sessions_mode ON path_exploration_sessions(exploration_mode);
CREATE INDEX idx_path_exploration_sessions_started_at ON path_exploration_sessions(started_at);
CREATE INDEX idx_path_exploration_sessions_active ON path_exploration_sessions(student_id, completed_at) WHERE completed_at IS NULL;

-- Path step completions indexes
CREATE INDEX idx_path_step_completions_session ON path_step_completions(exploration_session_id);
CREATE INDEX idx_path_step_completions_path_step ON path_step_completions(path_id, step_number);
CREATE INDEX idx_path_step_completions_completed_at ON path_step_completions(completed_at);

-- Student path usage indexes
CREATE INDEX idx_student_path_usage_student ON student_path_usage(student_id);
CREATE INDEX idx_student_path_usage_path ON student_path_usage(path_id);
CREATE INDEX idx_student_path_usage_success_rate ON student_path_usage(success_rate DESC);
CREATE INDEX idx_student_path_usage_preference ON student_path_usage(preference_score DESC);
CREATE INDEX idx_student_path_usage_last_attempted ON student_path_usage(last_attempted_at);

-- Path comparison sessions indexes
CREATE INDEX idx_path_comparison_sessions_student ON path_comparison_sessions(student_id);
CREATE INDEX idx_path_comparison_sessions_template ON path_comparison_sessions(problem_template_id);
CREATE INDEX idx_path_comparison_sessions_started_at ON path_comparison_sessions(started_at);

-- Path discovery events indexes
CREATE INDEX idx_path_discovery_events_student ON path_discovery_events(student_id);
CREATE INDEX idx_path_discovery_events_current_path ON path_discovery_events(current_path_id);
CREATE INDEX idx_path_discovery_events_discovered_path ON path_discovery_events(discovered_path_id);
CREATE INDEX idx_path_discovery_events_trigger ON path_discovery_events(discovery_trigger);
CREATE INDEX idx_path_discovery_events_discovered_at ON path_discovery_events(discovered_at);

-- Path effectiveness analytics indexes
CREATE INDEX idx_path_effectiveness_analytics_path ON path_effectiveness_analytics(path_id);
CREATE INDEX idx_path_effectiveness_analytics_period ON path_effectiveness_analytics(analysis_period_start, analysis_period_end);
CREATE INDEX idx_path_effectiveness_analytics_success_rate ON path_effectiveness_analytics(success_rate DESC);

-- Path adaptation suggestions indexes
CREATE INDEX idx_path_adaptation_suggestions_path ON path_adaptation_suggestions(path_id);
CREATE INDEX idx_path_adaptation_suggestions_status ON path_adaptation_suggestions(status);
CREATE INDEX idx_path_adaptation_suggestions_priority ON path_adaptation_suggestions(implementation_priority DESC);
CREATE INDEX idx_path_adaptation_suggestions_suggested_at ON path_adaptation_suggestions(suggested_at);

-- Enhanced helper functions for path exploration

-- Function to calculate session completion percentage
CREATE OR REPLACE FUNCTION calculate_session_progress(session_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    total_steps INTEGER;
    completed_steps INTEGER;
BEGIN
    SELECT total_steps, steps_completed 
    INTO total_steps, completed_steps
    FROM problem_sessions 
    WHERE id = session_uuid;
    
    IF total_steps IS NULL OR total_steps = 0 THEN
        RETURN 0.00;
    END IF;
    
    RETURN (completed_steps::DECIMAL / total_steps::DECIMAL);
END;
$$ LANGUAGE plpgsql;

-- Function to update template usage statistics
CREATE OR REPLACE FUNCTION update_template_usage_stats(template_uuid UUID)
RETURNS VOID AS $$
DECLARE
    total_sessions INTEGER;
    completed_sessions INTEGER;
    avg_time DECIMAL;
    success_rate_calc DECIMAL;
BEGIN
    -- Count total and completed sessions
    SELECT COUNT(*), 
           COUNT(*) FILTER (WHERE session_status = 'completed'),
           AVG(completion_time_minutes) FILTER (WHERE session_status = 'completed')
    INTO total_sessions, completed_sessions, avg_time
    FROM problem_sessions 
    WHERE template_id = template_uuid;
    
    -- Calculate success rate
    IF total_sessions > 0 THEN
        success_rate_calc = completed_sessions::DECIMAL / total_sessions::DECIMAL;
    ELSE
        success_rate_calc = 0.00;
    END IF;
    
    -- Update template
    UPDATE problem_templates 
    SET usage_count = total_sessions,
        success_rate = success_rate_calc,
        average_completion_time = avg_time::INTEGER
    WHERE id = template_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to generate problem analytics
CREATE OR REPLACE FUNCTION generate_student_problem_analytics(
    student_uuid UUID, 
    start_date DATE, 
    end_date DATE
)
RETURNS UUID AS $$
DECLARE
    analytics_id UUID;
    total_sessions_count INTEGER;
    completed_sessions_count INTEGER;
    avg_completion_time DECIMAL;
    overall_accuracy_calc DECIMAL;
BEGIN
    -- Calculate basic metrics
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE session_status = 'completed'),
           AVG(completion_time_minutes) FILTER (WHERE session_status = 'completed'),
           AVG(accuracy_score) FILTER (WHERE accuracy_score IS NOT NULL)
    INTO total_sessions_count, completed_sessions_count, avg_completion_time, overall_accuracy_calc
    FROM problem_sessions 
    WHERE student_id = student_uuid 
      AND started_at::DATE BETWEEN start_date AND end_date;
    
    -- Insert analytics record
    INSERT INTO problem_analytics (
        student_id,
        analysis_period_start,
        analysis_period_end,
        total_sessions,
        completed_sessions,
        average_completion_time,
        overall_accuracy
    ) VALUES (
        student_uuid,
        start_date,
        end_date,
        total_sessions_count,
        completed_sessions_count,
        avg_completion_time,
        overall_accuracy_calc
    ) RETURNING id INTO analytics_id;
    
    RETURN analytics_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update student path usage statistics
CREATE OR REPLACE FUNCTION update_student_path_usage_stats(
    student_uuid UUID,
    path_uuid UUID,
    completion_success BOOLEAN,
    time_spent_seconds INTEGER,
    satisfaction_score INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO student_path_usage (
        student_id, path_id, times_attempted, times_completed, 
        total_time_spent, preference_score, last_attempted_at, last_completed_at
    ) VALUES (
        student_uuid, path_uuid, 1, 
        CASE WHEN completion_success THEN 1 ELSE 0 END,
        time_spent_seconds, satisfaction_score, NOW(),
        CASE WHEN completion_success THEN NOW() ELSE NULL END
    )
    ON CONFLICT (student_id, path_id) DO UPDATE SET
        times_attempted = student_path_usage.times_attempted + 1,
        times_completed = student_path_usage.times_completed + 
            CASE WHEN completion_success THEN 1 ELSE 0 END,
        total_time_spent = student_path_usage.total_time_spent + time_spent_seconds,
        preference_score = COALESCE(satisfaction_score, student_path_usage.preference_score),
        last_attempted_at = NOW(),
        last_completed_at = CASE WHEN completion_success THEN NOW() 
                                ELSE student_path_usage.last_completed_at END,
        success_rate = (student_path_usage.times_completed + 
                       CASE WHEN completion_success THEN 1 ELSE 0 END)::DECIMAL / 
                      (student_path_usage.times_attempted + 1),
        average_completion_time = CASE 
            WHEN completion_success THEN 
                (COALESCE(student_path_usage.average_completion_time * student_path_usage.times_completed, 0) + time_spent_seconds) / 
                (student_path_usage.times_completed + 1)
            ELSE student_path_usage.average_completion_time
        END;
END;
$$ LANGUAGE plpgsql;

-- Function to generate path effectiveness analytics
CREATE OR REPLACE FUNCTION generate_path_effectiveness_analytics(
    path_uuid UUID,
    start_date DATE,
    end_date DATE
)
RETURNS UUID AS $$
DECLARE
    analytics_id UUID;
    total_attempts_count INTEGER;
    successful_completions_count INTEGER;
    success_rate_calc DECIMAL;
    avg_completion_time_calc INTEGER;
BEGIN
    -- Calculate basic metrics
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE pes.completed_at IS NOT NULL),
           AVG(pes.total_time_spent) FILTER (WHERE pes.completed_at IS NOT NULL)
    INTO total_attempts_count, successful_completions_count, avg_completion_time_calc
    FROM path_exploration_sessions pes
    WHERE pes.path_id = path_uuid 
      AND pes.started_at::DATE BETWEEN start_date AND end_date;
    
    -- Calculate success rate
    IF total_attempts_count > 0 THEN
        success_rate_calc = successful_completions_count::DECIMAL / total_attempts_count::DECIMAL;
    ELSE
        success_rate_calc = 0.00;
    END IF;
    
    -- Insert analytics record
    INSERT INTO path_effectiveness_analytics (
        path_id,
        analysis_period_start,
        analysis_period_end,
        total_attempts,
        successful_completions,
        success_rate,
        average_completion_time
    ) VALUES (
        path_uuid,
        start_date,
        end_date,
        total_attempts_count,
        successful_completions_count,
        success_rate_calc,
        avg_completion_time_calc
    ) RETURNING id INTO analytics_id;
    
    RETURN analytics_id;
END;
$$ LANGUAGE plpgsql;

-- Function to track path discovery events
CREATE OR REPLACE FUNCTION track_path_discovery(
    student_uuid UUID,
    current_path_uuid UUID,
    discovered_path_uuid UUID,
    discovery_trigger_type VARCHAR(100),
    discovery_step_num INTEGER DEFAULT NULL,
    session_uuid UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    discovery_id UUID;
BEGIN
    INSERT INTO path_discovery_events (
        student_id, current_path_id, discovered_path_id, problem_session_id,
        discovery_trigger, discovery_step, discovery_reasoning
    ) VALUES (
        student_uuid, current_path_uuid, discovered_path_uuid, session_uuid,
        discovery_trigger_type, discovery_step_num,
        'Alternative solution path discovered through ' || discovery_trigger_type
    ) RETURNING id INTO discovery_id;
    
    RETURN discovery_id;
END;
$$ LANGUAGE plpgsql;

-- View for session progress overview
CREATE VIEW session_progress_overview AS
SELECT 
    ps.id,
    ps.student_id,
    ps.session_status,
    pt.title as problem_title,
    pt.problem_type,
    pt.subject,
    pt.difficulty_level,
    ps.current_step,
    ps.total_steps,
    ps.steps_completed,
    calculate_session_progress(ps.id) as progress_percentage,
    ps.started_at,
    ps.last_activity_at,
    ps.accuracy_score,
    ps.hints_requested,
    ps.mistakes_made
FROM problem_sessions ps
JOIN problem_templates pt ON ps.template_id = pt.id
WHERE ps.session_status != 'abandoned';

-- View for teacher dashboard
CREATE VIEW teacher_problem_dashboard AS
SELECT 
    ps.student_id,
    u.username as student_name,
    pt.title as problem_title,
    pt.subject,
    pt.difficulty_level,
    ps.session_status,
    ps.accuracy_score,
    ps.completion_time_minutes,
    ps.started_at,
    ps.completed_at,
    tpr.overall_assessment,
    tpr.reviewed_at
FROM problem_sessions ps
JOIN users u ON ps.student_id = u.id
JOIN problem_templates pt ON ps.template_id = pt.id
LEFT JOIN teacher_problem_reviews tpr ON ps.id = tpr.session_id
ORDER BY ps.started_at DESC;

-- Enhanced views for path exploration analytics

-- View for student path exploration overview
CREATE VIEW student_path_exploration_overview AS
SELECT 
    pes.student_id,
    u.username as student_name,
    sp.path_name,
    sp.difficulty_level,
    pt.title as problem_title,
    pt.subject,
    pes.exploration_mode,
    pes.started_at,
    pes.completed_at,
    pes.current_step,
    pes.total_steps,
    ROUND((pes.steps_completed::DECIMAL / pes.total_steps) * 100, 1) as completion_percentage,
    pes.total_time_spent,
    pes.overall_satisfaction,
    CASE 
        WHEN pes.completed_at IS NOT NULL THEN 'completed'
        WHEN pes.abandoned_at IS NOT NULL THEN 'abandoned'
        WHEN pes.last_activity_at > NOW() - INTERVAL '1 hour' THEN 'active'
        ELSE 'inactive'
    END as session_status
FROM path_exploration_sessions pes
JOIN users u ON pes.student_id = u.id
JOIN solution_paths sp ON pes.path_id = sp.id
JOIN problem_templates pt ON sp.template_id = pt.id
ORDER BY pes.started_at DESC;

-- View for path effectiveness dashboard
CREATE VIEW path_effectiveness_dashboard AS
SELECT 
    sp.id as path_id,
    sp.path_name,
    sp.path_description,
    sp.difficulty_level,
    pt.title as problem_title,
    pt.subject,
    COUNT(pes.id) as total_exploration_sessions,
    COUNT(pes.id) FILTER (WHERE pes.completed_at IS NOT NULL) as completed_sessions,
    ROUND(
        COUNT(pes.id) FILTER (WHERE pes.completed_at IS NOT NULL)::DECIMAL / 
        NULLIF(COUNT(pes.id), 0) * 100, 1
    ) as success_rate_percentage,
    AVG(pes.total_time_spent) FILTER (WHERE pes.completed_at IS NOT NULL) as avg_completion_time,
    AVG(pes.overall_satisfaction) as avg_satisfaction,
    AVG(pes.learning_value_rating) as avg_learning_value,
    COUNT(DISTINCT pes.student_id) as unique_students,
    sp.times_used as template_usage_count
FROM solution_paths sp
JOIN problem_templates pt ON sp.template_id = pt.id
LEFT JOIN path_exploration_sessions pes ON sp.id = pes.path_id
GROUP BY sp.id, sp.path_name, sp.path_description, sp.difficulty_level, 
         pt.title, pt.subject, sp.times_used
ORDER BY success_rate_percentage DESC, avg_satisfaction DESC;

-- ============================================
-- DIFFICULTY ADAPTATION SYSTEM TABLES
-- ============================================

-- Extended difficulty levels for adaptation system
CREATE TYPE extended_difficulty_level AS ENUM ('very_easy', 'easy', 'medium', 'hard', 'very_hard');

-- Student difficulty preferences (personalized difficulty settings)
CREATE TABLE student_difficulty_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject problem_subject NOT NULL DEFAULT 'general',
  
  -- Difficulty preference
  preferred_difficulty extended_difficulty_level NOT NULL DEFAULT 'medium',
  
  -- Adaptation metadata
  adaptation_metadata JSONB DEFAULT '{}', -- confidence level, adaptation reason, strategy used, etc.
  
  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(student_id, subject)
);

-- Difficulty adaptation history (tracks all difficulty changes over time)
CREATE TABLE difficulty_adaptation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject problem_subject NOT NULL DEFAULT 'general',
  
  -- Adaptation details
  previous_difficulty extended_difficulty_level NOT NULL,
  new_difficulty extended_difficulty_level NOT NULL,
  difficulty_change DECIMAL(3,2) NOT NULL, -- numeric change (-4.0 to +4.0)
  
  -- Adaptation reasoning
  adaptation_reason TEXT NOT NULL,
  confidence_level DECIMAL(3,2), -- 0.00 to 1.00
  strategy_used VARCHAR(50), -- conservative, moderate, aggressive, personalized
  
  -- Performance context
  performance_score DECIMAL(3,2), -- overall performance score that triggered adaptation
  session_count INTEGER, -- number of sessions analyzed
  time_window_days INTEGER, -- period analyzed for adaptation
  
  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problem difficulty recommendations (cached suggestions for improved performance)
CREATE TABLE problem_difficulty_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES problem_templates(id) ON DELETE CASCADE,
  
  -- Recommendation details
  recommended_difficulty extended_difficulty_level NOT NULL,
  current_difficulty difficulty_level NOT NULL, -- original template difficulty
  confidence_score DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00
  
  -- Recommendation reasoning
  recommendation_reason TEXT,
  based_on_performance JSONB DEFAULT '{}', -- performance metrics used
  adaptation_factors JSONB DEFAULT '{}', -- what factors influenced the recommendation
  
  -- Validity and tracking
  valid_until TIMESTAMP NOT NULL, -- when recommendation expires
  used BOOLEAN DEFAULT FALSE, -- whether student actually used this recommendation
  effectiveness_score DECIMAL(3,2), -- how well the recommendation worked (if used)
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP,
  
  UNIQUE(student_id, template_id)
);

-- Student performance profiles (aggregated performance data for quick adaptation decisions)
CREATE TABLE student_performance_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject problem_subject NOT NULL DEFAULT 'general',
  
  -- Performance metrics (last updated)
  overall_performance_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 1.00
  accuracy_trend DECIMAL(4,3), -- positive/negative trend in accuracy
  speed_trend DECIMAL(4,3), -- positive/negative trend in completion time
  help_seeking_pattern VARCHAR(50), -- frequent, moderate, rare, independent
  
  -- Difficulty-specific performance
  very_easy_performance DECIMAL(3,2),
  easy_performance DECIMAL(3,2),
  medium_performance DECIMAL(3,2),
  hard_performance DECIMAL(3,2),
  very_hard_performance DECIMAL(3,2),
  
  -- Learning characteristics
  learning_velocity DECIMAL(3,2), -- how quickly student improves
  consistency_score DECIMAL(3,2), -- how consistent performance is
  challenge_readiness DECIMAL(3,2), -- readiness for harder problems
  support_needs DECIMAL(3,2), -- need for additional support
  
  -- Adaptive factors
  optimal_difficulty_level extended_difficulty_level,
  adaptation_sensitivity DECIMAL(3,2), -- how responsive to difficulty changes
  last_adaptation_date DATE,
  adaptation_frequency INTEGER DEFAULT 0, -- how often difficulty has been adapted
  
  -- Profile metadata
  profile_confidence DECIMAL(3,2) DEFAULT 0.00, -- confidence in profile accuracy
  sessions_analyzed INTEGER DEFAULT 0,
  last_session_analyzed_at TIMESTAMP,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(student_id, subject)
);

-- Difficulty adaptation rules (configurable rules for automatic adaptation)
CREATE TABLE difficulty_adaptation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Rule identification
  rule_name VARCHAR(200) NOT NULL,
  rule_description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 50, -- 1-100, higher priority rules evaluated first
  
  -- Rule conditions
  performance_threshold_min DECIMAL(3,2), -- minimum performance score to trigger
  performance_threshold_max DECIMAL(3,2), -- maximum performance score to trigger
  session_count_minimum INTEGER DEFAULT 3, -- minimum sessions needed to apply rule
  confidence_threshold DECIMAL(3,2) DEFAULT 0.60, -- minimum confidence to apply
  
  -- Rule actions
  difficulty_adjustment DECIMAL(3,2) NOT NULL, -- how much to adjust difficulty
  adjustment_strategy VARCHAR(50) DEFAULT 'moderate', -- conservative, moderate, aggressive
  cooldown_period_days INTEGER DEFAULT 7, -- days to wait before applying again
  
  -- Rule applicability
  applicable_subjects problem_subject[] DEFAULT '{}', -- empty array means all subjects
  applicable_difficulties extended_difficulty_level[] DEFAULT '{}', -- empty means all
  student_filters JSONB DEFAULT '{}', -- grade level, learning style, etc.
  
  -- Rule metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(rule_name)
);

-- Difficulty adaptation events (log of all adaptation decisions and their outcomes)
CREATE TABLE difficulty_adaptation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject problem_subject NOT NULL DEFAULT 'general',
  
  -- Event details
  event_type VARCHAR(50) NOT NULL, -- adaptation_applied, recommendation_generated, rule_triggered
  event_description TEXT,
  
  -- Adaptation context
  trigger_session_id UUID REFERENCES problem_sessions(id),
  rule_id UUID REFERENCES difficulty_adaptation_rules(id),
  previous_difficulty extended_difficulty_level,
  new_difficulty extended_difficulty_level,
  
  -- Performance context
  performance_data JSONB DEFAULT '{}', -- performance metrics at time of event
  adaptation_factors JSONB DEFAULT '{}', -- what factors influenced the decision
  
  -- Event outcomes
  student_response VARCHAR(50), -- accepted, ignored, overridden
  effectiveness_rating DECIMAL(3,2), -- how effective the adaptation was
  follow_up_needed BOOLEAN DEFAULT FALSE,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  outcome_recorded_at TIMESTAMP
);

-- Indexes for difficulty adaptation performance
-- Student difficulty preferences indexes
CREATE INDEX idx_student_difficulty_preferences_student ON student_difficulty_preferences(student_id);
CREATE INDEX idx_student_difficulty_preferences_subject ON student_difficulty_preferences(subject);
CREATE INDEX idx_student_difficulty_preferences_difficulty ON student_difficulty_preferences(preferred_difficulty);
CREATE INDEX idx_student_difficulty_preferences_updated_at ON student_difficulty_preferences(updated_at);

-- Difficulty adaptation history indexes
CREATE INDEX idx_difficulty_adaptation_history_student ON difficulty_adaptation_history(student_id);
CREATE INDEX idx_difficulty_adaptation_history_subject ON difficulty_adaptation_history(subject);
CREATE INDEX idx_difficulty_adaptation_history_created_at ON difficulty_adaptation_history(created_at);
CREATE INDEX idx_difficulty_adaptation_history_confidence ON difficulty_adaptation_history(confidence_level DESC);

-- Problem difficulty recommendations indexes
CREATE INDEX idx_problem_difficulty_recommendations_student ON problem_difficulty_recommendations(student_id);
CREATE INDEX idx_problem_difficulty_recommendations_template ON problem_difficulty_recommendations(template_id);
CREATE INDEX idx_problem_difficulty_recommendations_valid ON problem_difficulty_recommendations(valid_until) WHERE valid_until > NOW();
CREATE INDEX idx_problem_difficulty_recommendations_confidence ON problem_difficulty_recommendations(confidence_score DESC);

-- Student performance profiles indexes
CREATE INDEX idx_student_performance_profiles_student ON student_performance_profiles(student_id);
CREATE INDEX idx_student_performance_profiles_subject ON student_performance_profiles(subject);
CREATE INDEX idx_student_performance_profiles_performance ON student_performance_profiles(overall_performance_score DESC);
CREATE INDEX idx_student_performance_profiles_optimal_difficulty ON student_performance_profiles(optimal_difficulty_level);
CREATE INDEX idx_student_performance_profiles_updated_at ON student_performance_profiles(updated_at);

-- Difficulty adaptation rules indexes
CREATE INDEX idx_difficulty_adaptation_rules_active ON difficulty_adaptation_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_difficulty_adaptation_rules_priority ON difficulty_adaptation_rules(priority DESC);

-- Difficulty adaptation events indexes
CREATE INDEX idx_difficulty_adaptation_events_student ON difficulty_adaptation_events(student_id);
CREATE INDEX idx_difficulty_adaptation_events_type ON difficulty_adaptation_events(event_type);
CREATE INDEX idx_difficulty_adaptation_events_created_at ON difficulty_adaptation_events(created_at);
CREATE INDEX idx_difficulty_adaptation_events_session ON difficulty_adaptation_events(trigger_session_id);

-- Apply updated_at triggers for difficulty adaptation tables
CREATE TRIGGER update_student_difficulty_preferences_updated_at 
  BEFORE UPDATE ON student_difficulty_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_performance_profiles_updated_at 
  BEFORE UPDATE ON student_performance_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_difficulty_adaptation_rules_updated_at 
  BEFORE UPDATE ON difficulty_adaptation_rules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper functions for difficulty adaptation

-- Function to convert difficulty level to numeric value
CREATE OR REPLACE FUNCTION difficulty_to_numeric(diff extended_difficulty_level)
RETURNS INTEGER AS $$
BEGIN
    CASE diff
        WHEN 'very_easy' THEN RETURN 1;
        WHEN 'easy' THEN RETURN 2;
        WHEN 'medium' THEN RETURN 3;
        WHEN 'hard' THEN RETURN 4;
        WHEN 'very_hard' THEN RETURN 5;
        ELSE RETURN 3; -- default to medium
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to convert numeric value to difficulty level
CREATE OR REPLACE FUNCTION numeric_to_difficulty(num INTEGER)
RETURNS extended_difficulty_level AS $$
BEGIN
    CASE num
        WHEN 1 THEN RETURN 'very_easy';
        WHEN 2 THEN RETURN 'easy';
        WHEN 3 THEN RETURN 'medium';
        WHEN 4 THEN RETURN 'hard';
        WHEN 5 THEN RETURN 'very_hard';
        ELSE RETURN 'medium'; -- default to medium
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update student performance profile
CREATE OR REPLACE FUNCTION update_student_performance_profile(
    student_uuid UUID,
    subject_name problem_subject DEFAULT 'general'
)
RETURNS VOID AS $$
DECLARE
    profile_data RECORD;
    session_count INTEGER;
    profile_confidence DECIMAL;
BEGIN
    -- Calculate performance metrics from recent sessions
    WITH recent_sessions AS (
        SELECT ps.*, pt.subject, pt.difficulty_level,
               CASE pt.difficulty_level
                   WHEN 'easy' THEN 2
                   WHEN 'medium' THEN 3  
                   WHEN 'hard' THEN 4
                   WHEN 'advanced' THEN 5
                   ELSE 3
               END as difficulty_numeric,
               -- Calculate composite performance score
               COALESCE(ps.accuracy_score, 0) * 0.6 +
               LEAST(1.0, GREATEST(0.0, (60.0 - ps.completion_time_minutes) / 60.0)) * 0.2 +
               GREATEST(0.0, (5.0 - ps.hints_requested) / 5.0) * 0.1 +
               GREATEST(0.0, (5.0 - ps.mistakes_made) / 5.0) * 0.1 as performance_score
        FROM problem_sessions ps
        JOIN problem_templates pt ON ps.template_id = pt.id
        WHERE ps.student_id = student_uuid 
          AND pt.subject = subject_name
          AND ps.session_status = 'completed'
          AND ps.started_at >= NOW() - INTERVAL '30 days'
        ORDER BY ps.started_at DESC
        LIMIT 20
    )
    SELECT 
        COUNT(*) as session_count,
        AVG(performance_score) as overall_performance,
        -- Performance by difficulty
        AVG(CASE WHEN difficulty_numeric = 2 THEN performance_score END) as easy_perf,
        AVG(CASE WHEN difficulty_numeric = 3 THEN performance_score END) as medium_perf,
        AVG(CASE WHEN difficulty_numeric = 4 THEN performance_score END) as hard_perf,
        AVG(CASE WHEN difficulty_numeric = 5 THEN performance_score END) as very_hard_perf,
        -- Trends
        CORR(EXTRACT(EPOCH FROM started_at), accuracy_score) as accuracy_trend,
        CORR(EXTRACT(EPOCH FROM started_at), completion_time_minutes) as speed_trend,
        -- Consistency
        STDDEV(performance_score) as performance_variance
    INTO profile_data
    FROM recent_sessions;
    
    session_count := COALESCE(profile_data.session_count, 0);
    
    -- Calculate profile confidence based on data volume and recency
    profile_confidence := LEAST(1.0, session_count / 10.0);
    
    -- Upsert performance profile
    INSERT INTO student_performance_profiles (
        student_id, subject, overall_performance_score,
        accuracy_trend, speed_trend,
        easy_performance, medium_performance, hard_performance, very_hard_performance,
        consistency_score, profile_confidence, sessions_analyzed,
        last_session_analyzed_at
    ) VALUES (
        student_uuid, subject_name, COALESCE(profile_data.overall_performance, 0),
        COALESCE(profile_data.accuracy_trend, 0), COALESCE(profile_data.speed_trend, 0),
        profile_data.easy_perf, profile_data.medium_perf, 
        profile_data.hard_perf, profile_data.very_hard_perf,
        GREATEST(0, 1.0 - COALESCE(profile_data.performance_variance, 1.0)),
        profile_confidence, session_count, NOW()
    )
    ON CONFLICT (student_id, subject) DO UPDATE SET
        overall_performance_score = EXCLUDED.overall_performance_score,
        accuracy_trend = EXCLUDED.accuracy_trend,
        speed_trend = EXCLUDED.speed_trend,
        easy_performance = EXCLUDED.easy_performance,
        medium_performance = EXCLUDED.medium_performance,
        hard_performance = EXCLUDED.hard_performance,
        very_hard_performance = EXCLUDED.very_hard_performance,
        consistency_score = EXCLUDED.consistency_score,
        profile_confidence = EXCLUDED.profile_confidence,
        sessions_analyzed = EXCLUDED.sessions_analyzed,
        last_session_analyzed_at = EXCLUDED.last_session_analyzed_at,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to recommend optimal difficulty for student
CREATE OR REPLACE FUNCTION recommend_optimal_difficulty(
    student_uuid UUID,
    subject_name problem_subject DEFAULT 'general'
)
RETURNS extended_difficulty_level AS $$
DECLARE
    profile RECORD;
    optimal_difficulty extended_difficulty_level;
BEGIN
    -- Get student performance profile
    SELECT * INTO profile
    FROM student_performance_profiles
    WHERE student_id = student_uuid AND subject = subject_name;
    
    -- If no profile exists, return medium
    IF profile IS NULL THEN
        RETURN 'medium';
    END IF;
    
    -- Determine optimal difficulty based on performance patterns
    -- Look for difficulty level where performance is in the 0.6-0.8 range (optimal challenge)
    
    IF profile.hard_performance IS NOT NULL AND profile.hard_performance BETWEEN 0.6 AND 0.8 THEN
        optimal_difficulty := 'hard';
    ELSIF profile.medium_performance IS NOT NULL AND profile.medium_performance BETWEEN 0.6 AND 0.8 THEN
        optimal_difficulty := 'medium';
    ELSIF profile.easy_performance IS NOT NULL AND profile.easy_performance BETWEEN 0.6 AND 0.8 THEN
        optimal_difficulty := 'easy';
    ELSIF profile.very_hard_performance IS NOT NULL AND profile.very_hard_performance BETWEEN 0.6 AND 0.8 THEN
        optimal_difficulty := 'very_hard';
    ELSE
        -- Fall back to current performance level
        IF profile.overall_performance_score > 0.85 THEN
            optimal_difficulty := 'hard';
        ELSIF profile.overall_performance_score > 0.7 THEN
            optimal_difficulty := 'medium';
        ELSIF profile.overall_performance_score > 0.5 THEN
            optimal_difficulty := 'easy';
        ELSE
            optimal_difficulty := 'very_easy';
        END IF;
    END IF;
    
    -- Update the profile with the optimal difficulty
    UPDATE student_performance_profiles 
    SET optimal_difficulty_level = optimal_difficulty,
        updated_at = NOW()
    WHERE student_id = student_uuid AND subject = subject_name;
    
    RETURN optimal_difficulty;
END;
$$ LANGUAGE plpgsql;

-- Function to log difficulty adaptation event
CREATE OR REPLACE FUNCTION log_difficulty_adaptation_event(
    student_uuid UUID,
    subject_name problem_subject,
    event_type_param VARCHAR(50),
    event_description_param TEXT,
    previous_diff extended_difficulty_level DEFAULT NULL,
    new_diff extended_difficulty_level DEFAULT NULL,
    session_uuid UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO difficulty_adaptation_events (
        student_id, subject, event_type, event_description,
        previous_difficulty, new_difficulty, trigger_session_id
    ) VALUES (
        student_uuid, subject_name, event_type_param, event_description_param,
        previous_diff, new_diff, session_uuid
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Views for difficulty adaptation analytics

-- View for student difficulty adaptation overview
CREATE VIEW student_difficulty_adaptation_overview AS
SELECT 
    sdp.student_id,
    u.username as student_name,
    sdp.subject,
    sdp.preferred_difficulty,
    spp.overall_performance_score,
    spp.optimal_difficulty_level,
    spp.profile_confidence,
    spp.sessions_analyzed,
    spp.last_session_analyzed_at,
    COUNT(dah.id) as total_adaptations,
    MAX(dah.created_at) as last_adaptation_date,
    AVG(dah.confidence_level) as avg_adaptation_confidence
FROM student_difficulty_preferences sdp
JOIN users u ON sdp.student_id = u.id
LEFT JOIN student_performance_profiles spp ON sdp.student_id = spp.student_id 
    AND sdp.subject = spp.subject
LEFT JOIN difficulty_adaptation_history dah ON sdp.student_id = dah.student_id 
    AND sdp.subject = dah.subject
GROUP BY sdp.student_id, u.username, sdp.subject, sdp.preferred_difficulty,
         spp.overall_performance_score, spp.optimal_difficulty_level,
         spp.profile_confidence, spp.sessions_analyzed, spp.last_session_analyzed_at
ORDER BY spp.last_session_analyzed_at DESC;

-- View for difficulty adaptation effectiveness
CREATE VIEW difficulty_adaptation_effectiveness AS
SELECT 
    dah.subject,
    dah.previous_difficulty,
    dah.new_difficulty,
    dah.strategy_used,
    COUNT(*) as adaptation_count,
    AVG(dah.confidence_level) as avg_confidence,
    AVG(dah.performance_score) as avg_triggering_performance,
    -- Calculate effectiveness by looking at subsequent performance
    AVG(next_performance.performance_score) as avg_subsequent_performance
FROM difficulty_adaptation_history dah
LEFT JOIN (
    SELECT 
        ps.student_id,
        pt.subject,
        ps.started_at,
        COALESCE(ps.accuracy_score, 0) * 0.6 +
        LEAST(1.0, GREATEST(0.0, (60.0 - ps.completion_time_minutes) / 60.0)) * 0.2 +
        GREATEST(0.0, (5.0 - ps.hints_requested) / 5.0) * 0.1 +
        GREATEST(0.0, (5.0 - ps.mistakes_made) / 5.0) * 0.1 as performance_score
    FROM problem_sessions ps
    JOIN problem_templates pt ON ps.template_id = pt.id
    WHERE ps.session_status = 'completed'
) next_performance ON dah.student_id = next_performance.student_id
    AND dah.subject = next_performance.subject
    AND next_performance.started_at BETWEEN dah.created_at AND dah.created_at + INTERVAL '14 days'
GROUP BY dah.subject, dah.previous_difficulty, dah.new_difficulty, dah.strategy_used
HAVING COUNT(*) >= 3
ORDER BY avg_subsequent_performance DESC; 