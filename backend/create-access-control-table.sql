-- Create access_control_audit_log table with correct columns
CREATE TABLE IF NOT EXISTS access_control_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_role VARCHAR(50),
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    action VARCHAR(50),
    result VARCHAR(20) DEFAULT 'allowed',
    ip_address INET,
    user_agent TEXT,
    additional_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_control_audit_user_id ON access_control_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_access_control_audit_created_at ON access_control_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_access_control_audit_result ON access_control_audit_log(result);
CREATE INDEX IF NOT EXISTS idx_access_control_audit_action ON access_control_audit_log(action); 