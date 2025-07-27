-- Enterprise-Grade Database Performance Indexes for BookedBarber V2
-- Optimized for 50,000+ concurrent users and sub-100ms query response times

-- =============================================================================
-- CRITICAL PERFORMANCE INDEXES (Priority 1 - Immediate Deployment)
-- =============================================================================

-- Users table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active_btree 
ON users USING btree(email, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_organization 
ON users USING btree(role, organization_id, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at_desc 
ON users USING btree(created_at DESC);

-- Appointments table optimizations (highest traffic)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_barber_date_status 
ON appointments USING btree(barber_id, appointment_date, status) 
WHERE status IN ('confirmed', 'pending', 'completed');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_user_status_date 
ON appointments USING btree(user_id, status, appointment_date DESC) 
WHERE status IN ('confirmed', 'pending', 'completed');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_location_date 
ON appointments USING btree(location_id, appointment_date) 
WHERE appointment_date >= CURRENT_DATE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_revenue_analytics 
ON appointments USING btree(appointment_date, status, total_amount) 
WHERE status = 'completed' AND total_amount > 0;

-- Availability slots optimization (real-time booking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_barber_availability_efficient 
ON barber_availability USING btree(barber_id, date, start_time, is_available) 
WHERE is_available = true;

-- Payments table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status_created 
ON payments USING btree(status, created_at DESC) 
WHERE status IN ('completed', 'pending', 'failed');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_amount 
ON payments USING btree(user_id, status, amount DESC) 
WHERE status = 'completed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_stripe_intent 
ON payments USING hash(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

-- =============================================================================
-- HIGH-PRIORITY INDEXES (Priority 2 - Deploy within 48 hours)
-- =============================================================================

-- Services and pricing optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_active_duration 
ON services USING btree(is_active, duration_minutes, price) 
WHERE is_active = true;

-- Clients relationship optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_barber_active 
ON clients USING btree(barber_id, is_active, created_at DESC) 
WHERE is_active = true;

-- Reviews and ratings optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_barber_rating 
ON reviews USING btree(barber_id, rating DESC, created_at DESC) 
WHERE is_approved = true;

-- Notifications optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
ON notifications USING btree(user_id, is_read, created_at DESC) 
WHERE is_read = false;

-- Commission tracking optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissions_barber_period 
ON commissions USING btree(barber_id, calculation_date DESC, status) 
WHERE status = 'calculated';

-- =============================================================================
-- ANALYTICS AND REPORTING INDEXES (Priority 3)
-- =============================================================================

-- Revenue analytics optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_revenue_daily 
ON appointments USING btree(DATE(appointment_date), status, total_amount) 
WHERE status = 'completed' AND total_amount > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_barber_performance 
ON appointments USING btree(barber_id, DATE(appointment_date), status) 
WHERE status IN ('completed', 'cancelled', 'no_show');

-- Location analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_location_revenue 
ON appointments USING btree(location_id, DATE(appointment_date), total_amount) 
WHERE status = 'completed';

-- User engagement analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_user_activity 
ON appointments USING btree(user_id, appointment_date DESC) 
WHERE status IN ('completed', 'confirmed');

-- =============================================================================
-- SPECIALIZED INDEXES FOR COMPLEX QUERIES
-- =============================================================================

-- Partial indexes for hot data (last 90 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_recent_hot 
ON appointments USING btree(appointment_date DESC, barber_id, status) 
WHERE appointment_date >= CURRENT_DATE - INTERVAL '90 days';

-- GIN indexes for full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search_gin 
ON users USING gin(to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_search_gin 
ON services USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- =============================================================================
-- COMPOSITE INDEXES FOR SIX FIGURE BARBER METHODOLOGY
-- =============================================================================

-- Client value tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_six_figure_client_value 
ON appointments USING btree(user_id, status, total_amount DESC, appointment_date DESC) 
WHERE status = 'completed' AND total_amount > 0;

-- Barber productivity metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_six_figure_barber_productivity 
ON appointments USING btree(barber_id, DATE(appointment_date), duration_minutes, total_amount) 
WHERE status = 'completed';

-- Revenue optimization tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_six_figure_revenue_optimization 
ON appointments USING btree(DATE(appointment_date), location_id, barber_id, total_amount DESC) 
WHERE status = 'completed' AND appointment_date >= CURRENT_DATE - INTERVAL '30 days';

-- =============================================================================
-- MATERIALIZED VIEWS FOR COMPLEX ANALYTICS
-- =============================================================================

-- Daily revenue summary (refreshed hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_revenue_summary AS
SELECT 
    DATE(appointment_date) as date,
    location_id,
    barber_id,
    COUNT(*) as total_appointments,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
    SUM(total_amount) FILTER (WHERE status = 'completed') as daily_revenue,
    AVG(total_amount) FILTER (WHERE status = 'completed') as avg_appointment_value,
    SUM(duration_minutes) FILTER (WHERE status = 'completed') as total_service_minutes
FROM appointments 
WHERE appointment_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(appointment_date), location_id, barber_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_revenue_unique 
ON mv_daily_revenue_summary (date, location_id, barber_id);

-- Barber performance summary (refreshed daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_barber_performance_summary AS
SELECT 
    barber_id,
    DATE_TRUNC('week', appointment_date) as week_start,
    COUNT(*) as total_appointments,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_appointments,
    COUNT(*) FILTER (WHERE status = 'no_show') as no_show_appointments,
    SUM(total_amount) FILTER (WHERE status = 'completed') as weekly_revenue,
    AVG(total_amount) FILTER (WHERE status = 'completed') as avg_ticket_size,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'completed')::numeric / 
        NULLIF(COUNT(*)::numeric, 0) * 100, 2
    ) as completion_rate
FROM appointments 
WHERE appointment_date >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY barber_id, DATE_TRUNC('week', appointment_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_barber_performance_unique 
ON mv_barber_performance_summary (barber_id, week_start);

-- Client lifetime value summary (refreshed nightly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_client_lifetime_value AS
SELECT 
    user_id,
    COUNT(*) as total_appointments,
    SUM(total_amount) as lifetime_value,
    AVG(total_amount) as avg_appointment_value,
    MAX(appointment_date) as last_appointment_date,
    MIN(appointment_date) as first_appointment_date,
    ROUND(
        COUNT(*)::numeric / 
        NULLIF(EXTRACT(DAYS FROM (MAX(appointment_date) - MIN(appointment_date)))::numeric / 30, 0),
        2
    ) as appointments_per_month
FROM appointments 
WHERE status = 'completed' AND total_amount > 0
GROUP BY user_id
HAVING COUNT(*) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_client_ltv_unique 
ON mv_client_lifetime_value (user_id);

-- =============================================================================
-- PERFORMANCE MONITORING QUERIES
-- =============================================================================

-- Create performance monitoring table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC(12,4) NOT NULL,
    metric_unit VARCHAR(20) DEFAULT 'ms',
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_time 
ON performance_metrics USING btree(metric_name, timestamp DESC);

-- =============================================================================
-- INDEX MAINTENANCE AND MONITORING
-- =============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_performance_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_barber_performance_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_lifetime_value;
    
    -- Log refresh completion
    INSERT INTO performance_metrics (metric_name, metric_value, metric_unit, context)
    VALUES ('materialized_view_refresh', EXTRACT(EPOCH FROM NOW()), 'seconds', '{"event": "views_refreshed"}');
END;
$$ LANGUAGE plpgsql;

-- Function to analyze index usage
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    table_name text,
    index_name text,
    index_scans bigint,
    tuples_read bigint,
    tuples_fetched bigint,
    size_mb numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.relname::text as table_name,
        i.relname::text as index_name,
        s.idx_scan as index_scans,
        s.idx_tup_read as tuples_read,
        s.idx_tup_fetch as tuples_fetched,
        ROUND(pg_relation_size(i.oid) / 1024.0 / 1024.0, 2) as size_mb
    FROM pg_stat_user_indexes s
    JOIN pg_class i ON i.oid = s.indexrelid
    JOIN pg_class t ON t.oid = s.relid
    WHERE s.schemaname = 'public'
    ORDER BY s.idx_scan DESC, size_mb DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to identify slow queries
CREATE OR REPLACE FUNCTION get_slow_query_stats()
RETURNS TABLE(
    calls bigint,
    total_time numeric,
    mean_time numeric,
    query text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_stat_statements.calls,
        ROUND(pg_stat_statements.total_exec_time::numeric / 1000, 2) as total_time,
        ROUND(pg_stat_statements.mean_exec_time::numeric / 1000, 2) as mean_time,
        pg_stat_statements.query
    FROM pg_stat_statements
    WHERE pg_stat_statements.mean_exec_time > 100 -- Queries over 100ms
    ORDER BY pg_stat_statements.mean_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- AUTOMATED MAINTENANCE SCHEDULE
-- =============================================================================

-- Schedule for materialized view refresh (adjust based on your scheduler)
-- Example cron jobs:
-- 0 * * * * - Refresh mv_daily_revenue_summary hourly
-- 0 2 * * * - Refresh mv_barber_performance_summary daily at 2 AM
-- 0 3 * * * - Refresh mv_client_lifetime_value daily at 3 AM

-- =============================================================================
-- PERFORMANCE VALIDATION QUERIES
-- =============================================================================

-- Test critical query performance
-- Run these queries to validate index effectiveness

-- 1. User login performance (should be < 5ms)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, email, password_hash, role, is_active 
FROM users 
WHERE email = 'test@example.com' AND is_active = true;

-- 2. Appointment slot availability (should be < 10ms)
EXPLAIN (ANALYZE, BUFFERS)
SELECT ba.start_time, ba.end_time 
FROM barber_availability ba
WHERE ba.barber_id = 1 
  AND ba.date = CURRENT_DATE 
  AND ba.is_available = true
ORDER BY ba.start_time;

-- 3. Daily revenue calculation (should be < 50ms)
EXPLAIN (ANALYZE, BUFFERS)
SELECT DATE(appointment_date) as date, SUM(total_amount) as revenue
FROM appointments 
WHERE appointment_date >= CURRENT_DATE - INTERVAL '30 days'
  AND status = 'completed'
GROUP BY DATE(appointment_date)
ORDER BY date DESC;

-- 4. User appointment history (should be < 20ms)
EXPLAIN (ANALYZE, BUFFERS)
SELECT a.id, a.appointment_date, a.status, a.total_amount, s.name as service_name
FROM appointments a
JOIN services s ON s.id = a.service_id
WHERE a.user_id = 123
  AND a.status IN ('completed', 'confirmed')
ORDER BY a.appointment_date DESC
LIMIT 20;

-- =============================================================================
-- CLEANUP AND OPTIMIZATION COMMANDS
-- =============================================================================

-- Update table statistics
ANALYZE users;
ANALYZE appointments;
ANALYZE payments;
ANALYZE barber_availability;
ANALYZE services;
ANALYZE clients;

-- Vacuum and reindex (run during maintenance windows)
-- VACUUM ANALYZE appointments;
-- REINDEX TABLE appointments;

-- Check for unused indexes (run monthly)
-- SELECT * FROM analyze_index_usage() WHERE index_scans < 100;

-- Monitor query performance (run weekly)  
-- SELECT * FROM get_slow_query_stats();

COMMIT;