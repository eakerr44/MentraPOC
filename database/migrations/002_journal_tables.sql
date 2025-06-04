-- Mentra Journal System Database Schema
-- Migration 002: Journal Entries with Encryption Support
-- Created: 2024

-- Journal entry privacy levels
CREATE TYPE privacy_level AS ENUM ('private', 'teacher_shareable', 'parent_shareable', 'public');

-- Emotional states for tracking
CREATE TYPE emotion_type AS ENUM (
  'happy', 'sad', 'angry', 'anxious', 'excited', 'calm', 'frustrated', 
  'proud', 'confused', 'motivated', 'tired', 'grateful', 'curious'
);

-- Journal entries with encryption support
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic entry information
  title VARCHAR(500) NOT NULL,
  encrypted_content BYTEA, -- Encrypted journal content using pgcrypto
  encrypted_plain_text BYTEA, -- Encrypted plain text version for search
  content_hash VARCHAR(64), -- SHA-256 hash for integrity verification
  
  -- Metadata (unencrypted for querying)
  word_count INTEGER DEFAULT 0,
  reading_time_minutes INTEGER DEFAULT 0,
  
  -- Privacy and sharing settings
  privacy_level privacy_level DEFAULT 'private',
  is_private BOOLEAN DEFAULT TRUE,
  is_shareable_with_teacher BOOLEAN DEFAULT FALSE,
  is_shareable_with_parent BOOLEAN DEFAULT FALSE,
  
  -- Encryption metadata
  encryption_method VARCHAR(50) DEFAULT 'aes256',
  encryption_key_id VARCHAR(100), -- Reference to encryption key
  encrypted_at TIMESTAMP,
  encryption_version INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP,
  deleted_at TIMESTAMP -- Soft delete
);

-- Emotional state tracking for entries
CREATE TABLE journal_emotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  
  -- Primary emotion data
  primary_emotion emotion_type NOT NULL,
  intensity DECIMAL(3,2) CHECK (intensity >= 0 AND intensity <= 1), -- 0.0 to 1.0
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1), -- AI confidence
  
  -- Secondary emotions (array for complex emotional states)
  secondary_emotions emotion_type[],
  
  -- Context and notes
  emotion_context TEXT, -- What triggered this emotion
  mood_before TEXT,
  mood_after TEXT,
  
  -- Metadata
  detected_by VARCHAR(50) DEFAULT 'manual', -- manual, ai_analysis, etc.
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags for organizing journal entries
CREATE TABLE journal_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7), -- Hex color code
  created_by UUID REFERENCES users(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many relationship between entries and tags
CREATE TABLE journal_entry_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES journal_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(journal_entry_id, tag_id)
);

-- Journal attachments (files, images, links)
CREATE TABLE journal_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  
  -- File information
  original_filename VARCHAR(255),
  stored_filename VARCHAR(255), -- UUID-based filename for security
  file_path TEXT, -- Encrypted file path
  file_size BIGINT,
  mime_type VARCHAR(100),
  
  -- Attachment metadata
  attachment_type VARCHAR(50), -- image, document, link, recording
  description TEXT,
  is_encrypted BOOLEAN DEFAULT TRUE,
  
  -- Access control
  access_level privacy_level DEFAULT 'private',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal entry access log for auditing
CREATE TABLE journal_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  
  -- Access information
  accessed_by UUID NOT NULL REFERENCES users(id),
  access_type VARCHAR(50), -- read, edit, share, download
  access_source VARCHAR(100), -- web, mobile, api
  
  -- Privacy tracking
  was_encrypted BOOLEAN DEFAULT TRUE,
  decryption_successful BOOLEAN DEFAULT TRUE,
  privacy_level_at_access privacy_level,
  
  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal encryption keys for key rotation
CREATE TABLE journal_encryption_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_id VARCHAR(100) NOT NULL UNIQUE,
  
  -- Key management
  encryption_algorithm VARCHAR(50) DEFAULT 'aes256',
  key_hash VARCHAR(64), -- Hash of the key for verification
  key_status VARCHAR(20) DEFAULT 'active', -- active, rotating, retired
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP,
  retired_at TIMESTAMP,
  
  -- Rotation information
  previous_key_id VARCHAR(100),
  next_key_id VARCHAR(100)
);

-- Journal drafts for auto-save functionality
CREATE TABLE journal_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Draft content (encrypted)
  encrypted_title BYTEA,
  encrypted_content BYTEA,
  encrypted_plain_text BYTEA,
  
  -- Metadata
  word_count INTEGER DEFAULT 0,
  last_saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  
  -- Source information
  source_entry_id UUID REFERENCES journal_entries(id), -- If editing existing entry
  device_id VARCHAR(100), -- For device-specific drafts
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI reflection prompts and responses
CREATE TABLE journal_reflection_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  
  -- Prompt information
  prompt_type VARCHAR(50), -- emotional_exploration, learning_reflection, etc.
  prompt_text TEXT NOT NULL,
  development_level VARCHAR(20), -- elementary, middle_school, high_school
  
  -- Response data (encrypted)
  encrypted_response BYTEA,
  response_word_count INTEGER,
  response_sentiment DECIMAL(3,2), -- -1 to 1 sentiment score
  
  -- AI metadata
  generated_by VARCHAR(50) DEFAULT 'ai_engine',
  ai_confidence DECIMAL(3,2),
  prompt_version VARCHAR(20),
  
  -- Timestamps
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance and search
-- Journal entries indexes
CREATE INDEX idx_journal_entries_student_id ON journal_entries(student_id);
CREATE INDEX idx_journal_entries_privacy_level ON journal_entries(privacy_level);
CREATE INDEX idx_journal_entries_created_at ON journal_entries(created_at);
CREATE INDEX idx_journal_entries_word_count ON journal_entries(word_count);
CREATE INDEX idx_journal_entries_is_private ON journal_entries(is_private);
CREATE INDEX idx_journal_entries_sharing ON journal_entries(is_shareable_with_teacher, is_shareable_with_parent);

-- Emotions indexes
CREATE INDEX idx_journal_emotions_entry_id ON journal_emotions(journal_entry_id);
CREATE INDEX idx_journal_emotions_primary ON journal_emotions(primary_emotion);
CREATE INDEX idx_journal_emotions_intensity ON journal_emotions(intensity);

-- Tags indexes
CREATE INDEX idx_journal_tags_name ON journal_tags(name);
CREATE INDEX idx_journal_entry_tags_entry_id ON journal_entry_tags(journal_entry_id);
CREATE INDEX idx_journal_entry_tags_tag_id ON journal_entry_tags(tag_id);

-- Access log indexes
CREATE INDEX idx_journal_access_log_entry_id ON journal_access_log(journal_entry_id);
CREATE INDEX idx_journal_access_log_user_id ON journal_access_log(accessed_by);
CREATE INDEX idx_journal_access_log_accessed_at ON journal_access_log(accessed_at);

-- Drafts indexes
CREATE INDEX idx_journal_drafts_student_id ON journal_drafts(student_id);
CREATE INDEX idx_journal_drafts_expires_at ON journal_drafts(expires_at);

-- Reflection prompts indexes
CREATE INDEX idx_reflection_prompts_entry_id ON journal_reflection_prompts(journal_entry_id);
CREATE INDEX idx_reflection_prompts_type ON journal_reflection_prompts(prompt_type);

-- Apply updated_at triggers
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journal_drafts_updated_at BEFORE UPDATE ON journal_drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Data retention policies (for compliance)
-- Delete expired drafts automatically
CREATE OR REPLACE FUNCTION cleanup_expired_drafts()
RETURNS void AS $$
BEGIN
    DELETE FROM journal_drafts WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to encrypt journal content
CREATE OR REPLACE FUNCTION encrypt_journal_content(content TEXT, key_text TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(content, key_text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt journal content
CREATE OR REPLACE FUNCTION decrypt_journal_content(encrypted_content BYTEA, key_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_content, key_text);
EXCEPTION
    WHEN others THEN
        RETURN NULL; -- Return NULL if decryption fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate content hash for integrity
CREATE OR REPLACE FUNCTION generate_content_hash(content TEXT)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(digest(content, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- View for unencrypted journal entries (for authorized access)
CREATE VIEW journal_entries_decrypted AS
SELECT 
    je.id,
    je.student_id,
    je.title,
    -- Note: Actual decryption would happen in application layer with proper key management
    'ENCRYPTED_CONTENT' as content_placeholder,
    je.word_count,
    je.reading_time_minutes,
    je.privacy_level,
    je.is_private,
    je.is_shareable_with_teacher,
    je.is_shareable_with_parent,
    je.created_at,
    je.updated_at,
    je.last_edited_at
FROM journal_entries je
WHERE je.deleted_at IS NULL;

-- Function to log journal access
CREATE OR REPLACE FUNCTION log_journal_access(
    p_journal_entry_id UUID,
    p_accessed_by UUID,
    p_access_type VARCHAR(50),
    p_access_source VARCHAR(100) DEFAULT 'web',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    access_log_id UUID;
    entry_privacy privacy_level;
    was_encrypted BOOLEAN;
BEGIN
    -- Get privacy level at time of access
    SELECT privacy_level, (encrypted_content IS NOT NULL)
    INTO entry_privacy, was_encrypted
    FROM journal_entries
    WHERE id = p_journal_entry_id;
    
    -- Insert access log
    INSERT INTO journal_access_log (
        journal_entry_id,
        accessed_by,
        access_type,
        access_source,
        was_encrypted,
        privacy_level_at_access,
        ip_address,
        user_agent,
        request_id
    ) VALUES (
        p_journal_entry_id,
        p_accessed_by,
        p_access_type,
        p_access_source,
        was_encrypted,
        entry_privacy,
        p_ip_address,
        p_user_agent,
        uuid_generate_v4()
    ) RETURNING id INTO access_log_id;
    
    RETURN access_log_id;
END;
$$ LANGUAGE plpgsql; 