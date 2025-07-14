-- Production Database Indexes for BookedBarber V2
-- Optimized for 10,000+ concurrent users
-- Run this script on staging and production PostgreSQL databases

-- Performance note: Create indexes during low-traffic periods
-- Estimated execution time: 5-15 minutes depending on data size

BEGIN;

-- User table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
    ON users(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_stripe_customer_id 
    ON users(stripe_customer_id) 
    WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
    ON users(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active 
    ON users(is_active) 
    WHERE is_active = true;

-- Appointment table optimizations (critical for booking performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_datetime 
    ON appointments(appointment_datetime);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_user_id 
    ON appointments(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_barber_id 
    ON appointments(barber_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_status 
    ON appointments(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_date_status 
    ON appointments(appointment_datetime, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_user_status 
    ON appointments(user_id, status);

-- Payment table optimizations (for financial reporting)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_created_at 
    ON payments(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status 
    ON payments(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_id 
    ON payments(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_stripe_payment_intent_id 
    ON payments(stripe_payment_intent_id) 
    WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_amount 
    ON payments(amount_cents);

-- Client table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_user_id 
    ON clients(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_email 
    ON clients(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_phone 
    ON clients(phone) 
    WHERE phone IS NOT NULL;

-- Barber availability optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_barber_availability_date 
    ON barber_availability(date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_barber_availability_barber_date 
    ON barber_availability(barber_id, date);

-- Notification table optimizations (if exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id 
    ON notifications(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at 
    ON notifications(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_status 
    ON notifications(status);

-- Audit log optimizations (if exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at 
    ON audit_logs(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id 
    ON audit_logs(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action 
    ON audit_logs(action);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_search 
    ON appointments(barber_id, appointment_datetime, status) 
    WHERE status IN ('confirmed', 'pending');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_reporting 
    ON payments(created_at, status, amount_cents) 
    WHERE status = 'completed';

-- Full-text search indexes (if using PostgreSQL full-text search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search 
    ON users USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || email));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_search 
    ON clients USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || email));

COMMIT;

-- Performance analysis queries
-- Run these after creating indexes to verify performance improvements

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries (run separately after enabling log_statement_stats)
-- SELECT query, total_time, mean_time, calls 
-- FROM pg_stat_statements 
-- ORDER BY total_time DESC 
-- LIMIT 10;