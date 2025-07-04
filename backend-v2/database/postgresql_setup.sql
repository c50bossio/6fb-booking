-- PostgreSQL Database Setup Script for BookedBarber V2
-- This script creates the database, users, and basic configuration for production deployment

-- =============================================================================
-- DATABASE CREATION AND CONFIGURATION
-- =============================================================================

-- Create database (run as superuser)
CREATE DATABASE bookedbarber_v2
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0
    CONNECTION LIMIT = 100;

-- Create database for staging environment
CREATE DATABASE bookedbarber_v2_staging
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0
    CONNECTION LIMIT = 50;

-- Create database for testing
CREATE DATABASE bookedbarber_v2_test
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0
    CONNECTION LIMIT = 20;

-- =============================================================================
-- USER CREATION AND PERMISSIONS
-- =============================================================================

-- Create application user for production
CREATE USER bookedbarber_app WITH
    PASSWORD '${APP_DB_PASSWORD}'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    LOGIN
    NOREPLICATION
    NOBYPASSRLS
    CONNECTION LIMIT 50;

-- Create read-only user for analytics/reporting
CREATE USER bookedbarber_readonly WITH
    PASSWORD '${READONLY_DB_PASSWORD}'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    LOGIN
    NOREPLICATION
    NOBYPASSRLS
    CONNECTION LIMIT 10;

-- Create backup user
CREATE USER bookedbarber_backup WITH
    PASSWORD '${BACKUP_DB_PASSWORD}'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    LOGIN
    NOREPLICATION
    NOBYPASSRLS
    CONNECTION LIMIT 2;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Connect to production database
\c bookedbarber_v2

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO bookedbarber_app;
GRANT CREATE ON SCHEMA public TO bookedbarber_app;

-- Grant table permissions to app user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bookedbarber_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bookedbarber_app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO bookedbarber_app;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bookedbarber_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bookedbarber_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO bookedbarber_app;

-- Grant read-only permissions
GRANT USAGE ON SCHEMA public TO bookedbarber_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bookedbarber_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO bookedbarber_readonly;

-- Grant backup permissions
GRANT USAGE ON SCHEMA public TO bookedbarber_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bookedbarber_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO bookedbarber_backup;

-- =============================================================================
-- EXTENSIONS AND CONFIGURATION
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- =============================================================================
-- PERFORMANCE CONFIGURATION
-- =============================================================================

-- Configure database for optimal performance
ALTER DATABASE bookedbarber_v2 SET timezone = 'UTC';
ALTER DATABASE bookedbarber_v2 SET statement_timeout = '30s';
ALTER DATABASE bookedbarber_v2 SET lock_timeout = '10s';
ALTER DATABASE bookedbarber_v2 SET idle_in_transaction_session_timeout = '30s';
ALTER DATABASE bookedbarber_v2 SET log_statement = 'all';
ALTER DATABASE bookedbarber_v2 SET log_min_duration_statement = 1000;

-- =============================================================================
-- STAGING ENVIRONMENT SETUP
-- =============================================================================

-- Connect to staging database
\c bookedbarber_v2_staging

-- Enable extensions for staging
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant permissions for staging
GRANT USAGE ON SCHEMA public TO bookedbarber_app;
GRANT CREATE ON SCHEMA public TO bookedbarber_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bookedbarber_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bookedbarber_app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO bookedbarber_app;

-- Set default privileges for staging
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bookedbarber_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bookedbarber_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO bookedbarber_app;

-- Configure staging database
ALTER DATABASE bookedbarber_v2_staging SET timezone = 'UTC';
ALTER DATABASE bookedbarber_v2_staging SET statement_timeout = '30s';

-- =============================================================================
-- TEST ENVIRONMENT SETUP
-- =============================================================================

-- Connect to test database
\c bookedbarber_v2_test

-- Enable extensions for testing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant permissions for testing
GRANT USAGE ON SCHEMA public TO bookedbarber_app;
GRANT CREATE ON SCHEMA public TO bookedbarber_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bookedbarber_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bookedbarber_app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO bookedbarber_app;

-- Set default privileges for testing
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bookedbarber_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bookedbarber_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO bookedbarber_app;

-- Configure test database
ALTER DATABASE bookedbarber_v2_test SET timezone = 'UTC';

-- =============================================================================
-- MONITORING AND LOGGING
-- =============================================================================

-- Return to production database
\c bookedbarber_v2

-- Create monitoring schema
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Create table for query performance tracking
CREATE TABLE IF NOT EXISTS monitoring.query_performance (
    id SERIAL PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL,
    query_text TEXT NOT NULL,
    execution_time_ms NUMERIC(10,2) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_name VARCHAR(255),
    database_name VARCHAR(255),
    INDEX (query_hash),
    INDEX (executed_at)
);

-- Create table for connection monitoring
CREATE TABLE IF NOT EXISTS monitoring.connection_stats (
    id SERIAL PRIMARY KEY,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_connections INTEGER,
    active_connections INTEGER,
    idle_connections INTEGER,
    waiting_connections INTEGER,
    max_connections INTEGER
);

-- Grant monitoring permissions
GRANT USAGE ON SCHEMA monitoring TO bookedbarber_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA monitoring TO bookedbarber_readonly;

-- =============================================================================
-- BACKUP AND MAINTENANCE
-- =============================================================================

-- Create backup schema
CREATE SCHEMA IF NOT EXISTS backup;

-- Create backup log table
CREATE TABLE IF NOT EXISTS backup.backup_log (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL,
    backup_size_bytes BIGINT,
    backup_path VARCHAR(500),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'running',
    error_message TEXT
);

-- Grant backup permissions
GRANT USAGE ON SCHEMA backup TO bookedbarber_backup;
GRANT ALL ON ALL TABLES IN SCHEMA backup TO bookedbarber_backup;

-- =============================================================================
-- SECURITY CONFIGURATION
-- =============================================================================

-- Row Level Security (RLS) setup for multi-tenant data
-- This will be applied after schema migration

-- Create security schema
CREATE SCHEMA IF NOT EXISTS security;

-- Create audit log table
CREATE TABLE IF NOT EXISTS security.audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON security.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON security.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON security.audit_log(table_name);

-- Grant audit permissions
GRANT USAGE ON SCHEMA security TO bookedbarber_app;
GRANT INSERT, SELECT ON security.audit_log TO bookedbarber_app;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

-- Display completion message
SELECT 'PostgreSQL setup completed successfully!' AS message;
SELECT 'Remember to:' AS reminder;
SELECT '1. Set environment variables for passwords' AS step_1;
SELECT '2. Configure connection pooling (pgBouncer)' AS step_2;
SELECT '3. Run Alembic migrations' AS step_3;
SELECT '4. Import existing data' AS step_4;
SELECT '5. Set up backup schedule' AS step_5;