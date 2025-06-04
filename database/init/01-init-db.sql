-- Mentra Database Initialization Script
-- This script runs when the PostgreSQL container starts for the first time

-- Ensure the database exists
SELECT 'CREATE DATABASE mentra_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mentra_dev');

-- Create test database for running tests
SELECT 'CREATE DATABASE mentra_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mentra_test');

-- Connect to the main database
\c mentra_dev;

-- Create application user with limited privileges (if not exists)
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mentra_app') THEN
      CREATE ROLE mentra_app WITH LOGIN PASSWORD 'mentra_app_password';
   END IF;
END
$$;

-- Grant necessary permissions to application user
GRANT CONNECT ON DATABASE mentra_dev TO mentra_app;
GRANT USAGE ON SCHEMA public TO mentra_app;
GRANT CREATE ON SCHEMA public TO mentra_app;

-- Set up logging for development (optional)
-- This helps track database operations during development
CREATE TABLE IF NOT EXISTS dev_logs (
  id SERIAL PRIMARY KEY,
  level VARCHAR(20),
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initialization log
INSERT INTO dev_logs (level, message, metadata) 
VALUES ('INFO', 'Database initialized successfully', 
        jsonb_build_object('timestamp', CURRENT_TIMESTAMP, 'version', '1.0.0')); 