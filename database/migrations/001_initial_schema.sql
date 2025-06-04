-- Mentra Initial Database Schema
-- Migration 001: User Authentication and Role-Based Access Control
-- Created: 2024

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable encryption for sensitive data
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User roles enumeration
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'parent', 'admin');

-- User account statuses
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');

-- Main users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  status account_status DEFAULT 'pending_verification',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  timezone VARCHAR(100) DEFAULT 'UTC',
  last_login_at TIMESTAMP,
  email_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP -- Soft delete for data retention
);

-- Student profiles with learning preferences
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade_level INTEGER,
  learning_style VARCHAR(50), -- visual, auditory, kinesthetic, reading_writing
  academic_goals TEXT,
  strengths TEXT[],
  challenges TEXT[],
  parent_id UUID REFERENCES users(id), -- Link to parent account
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teacher profiles with classroom information
CREATE TABLE teacher_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_name VARCHAR(255),
  department VARCHAR(100),
  subjects_taught TEXT[],
  years_experience INTEGER,
  teaching_philosophy TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parent profiles linked to students
CREATE TABLE parent_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50), -- mother, father, guardian, etc.
  emergency_contact BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classroom/group management
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(100),
  grade_level INTEGER,
  school_year VARCHAR(20),
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student-classroom enrollment
CREATE TABLE classroom_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, dropped
  UNIQUE(classroom_id, student_id)
);

-- Authentication tokens for password reset, email verification
CREATE TABLE auth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_type VARCHAR(50) NOT NULL, -- password_reset, email_verification, api_access
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session management for security
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Privacy preferences for FERPA/COPPA compliance
CREATE TABLE privacy_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_sharing_consent BOOLEAN DEFAULT FALSE,
  analytics_consent BOOLEAN DEFAULT FALSE,
  marketing_consent BOOLEAN DEFAULT FALSE,
  parent_notification_consent BOOLEAN DEFAULT TRUE, -- For minors
  data_retention_period INTEGER DEFAULT 365, -- Days
  consent_date TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX idx_student_profiles_parent_id ON student_profiles(parent_id);
CREATE INDEX idx_teacher_profiles_user_id ON teacher_profiles(user_id);
CREATE INDEX idx_parent_profiles_user_id ON parent_profiles(user_id);
CREATE INDEX idx_classroom_enrollments_classroom_id ON classroom_enrollments(classroom_id);
CREATE INDEX idx_classroom_enrollments_student_id ON classroom_enrollments(student_id);
CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_token_type ON auth_tokens(token_type);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teacher_profiles_updated_at BEFORE UPDATE ON teacher_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parent_profiles_updated_at BEFORE UPDATE ON parent_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_privacy_settings_updated_at BEFORE UPDATE ON privacy_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 