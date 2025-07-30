-- =====================================================
-- COMPREHENSIVE DATABASE OPTIMIZATION FOR 6FB-BOOKING
-- Backend Systems Specialist Findings Implementation
-- Target: 70% Query Performance Improvement (200-500ms → 50-150ms)
-- =====================================================

-- =====================================================
-- PHASE 1: CRITICAL HIGH-IMPACT INDEXES (Apply First)
-- =====================================================

-- 1. USER AUTHENTICATION & ROLE OPTIMIZATION (Most Frequent Queries)
-- Addresses: Auth middleware, user lookups, role validation, dev bypass
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_auth_performance_optimized 
ON users(email, is_active, unified_role, id) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_location_role_active 
ON users(location_id, unified_role, is_active, email) 
WHERE is_active = true;

-- Phone-based authentication optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone_auth_optimized 
ON users(phone, is_active, unified_role) 
WHERE is_active = true AND phone IS NOT NULL;

-- 2. APPOINTMENT BOOKING & AVAILABILITY (Core Business Logic)
-- Addresses: Availability checks, booking creation, conflict detection
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_barber_datetime_status_optimized 
ON appointments(barber_id, start_time, end_time, status, id) 
WHERE status IN ('confirmed', 'in_progress', 'completed');

-- Critical availability check optimization  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_availability_conflict_check 
ON appointments(barber_id, DATE(start_time), start_time, end_time, status) 
WHERE status IN ('confirmed', 'in_progress');

-- Client appointment history optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_client_history_optimized 
ON appointments(client_id, start_time DESC, status, id, barber_id) 
WHERE status != 'cancelled';

-- Location-based appointment filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_location_date_status 
ON appointments(location_id, DATE(start_time), status, barber_id) 
WHERE status != 'cancelled';

-- 3. PAYMENT PROCESSING & STRIPE INTEGRATION
-- Addresses: Payment lookups, Stripe webhook processing, revenue analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_stripe_webhook_optimized 
ON payments(stripe_payment_intent_id, status, created_at DESC, id) 
WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_status_amount 
ON payments(user_id, status, created_at DESC, amount, appointment_id) 
WHERE status = 'completed';

-- Appointment payment relationship optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_appointment_lookup 
ON payments(appointment_id, status, amount, created_at) 
WHERE status IN ('completed', 'pending');

-- =====================================================
-- PHASE 2: AI DASHBOARD & ANALYTICS OPTIMIZATION
-- =====================================================

-- 4. AI DASHBOARD ANALYTICS (Heavy Query Optimization)
-- Addresses: Revenue dashboards, business intelligence, AI recommendations

-- Daily revenue analytics (most expensive query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_daily_revenue_ai_optimized 
ON payments(DATE_TRUNC('day', created_at), user_id, location_id, amount, status, service_id) 
WHERE status = 'completed';

-- Hourly booking analytics for real-time AI insights
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_hourly_bookings_ai 
ON appointments(DATE_TRUNC('hour', start_time), location_id, barber_id, status, service_id, total_amount);

-- Weekly/Monthly AI trend analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_weekly_trends_ai 
ON payments(DATE_TRUNC('week', created_at), user_id, amount, service_id) 
WHERE status = 'completed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_monthly_patterns_ai 
ON appointments(DATE_TRUNC('month', start_time), location_id, barber_id, client_id, status) 
WHERE status = 'completed';

-- AI customer behavior analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_customer_behavior_optimized 
ON appointments(client_id, start_time DESC, service_id, total_amount, barber_id) 
WHERE status = 'completed' AND start_time > NOW() - INTERVAL '1 year';

-- AI revenue prediction data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_revenue_prediction_training 
ON appointments(barber_id, service_id, start_time, total_amount, status, duration) 
WHERE status = 'completed' AND start_time > NOW() - INTERVAL '1 year';

-- 5. VECTOR KNOWLEDGE SERVICE (RAG SYSTEM)
-- Addresses: AI conversation history, business intelligence embeddings

-- Embedding cache performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embedding_cache_performance_optimized 
ON embedding_cache(content_type, entity_id, is_active, last_used_at DESC, embedding_dimension) 
WHERE is_active = true;

-- Search analytics optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_analytics_performance 
ON search_analytics(user_id, created_at DESC, search_type, query_hash, results_count);

-- Query suggestion optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_suggestions_optimized 
ON search_query_suggestions(normalized_query, popularity_score DESC, last_suggested_at);

-- =====================================================
-- PHASE 3: SERVICE & LOCATION MULTI-TENANCY
-- =====================================================

-- 6. SERVICE & PRICING OPTIMIZATION
-- Addresses: Service lookups, pricing calculations, availability
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_location_pricing_optimized 
ON services(location_id, is_active, category, price, duration, id) 
WHERE is_active = true;

-- Service template optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_templates_category_tier 
ON service_templates(category, six_fb_tier, is_active, base_price) 
WHERE is_active = true;

-- 7. BARBER AVAILABILITY & SCHEDULING
-- Addresses: Barber scheduling, availability calculations, workload distribution
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_barber_availability_date_optimized 
ON barber_availability(barber_id, date, day_of_week, is_available, start_time, end_time) 
WHERE is_available = true;

-- Time-off tracking optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_barber_timeoff_period 
ON barber_time_off(barber_id, start_date, end_date, is_approved) 
WHERE is_approved = true;

-- Special availability optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_barber_special_availability 
ON barber_special_availability(barber_id, date, start_time, end_time);

-- =====================================================
-- PHASE 4: COMMISSION & FINANCIAL OPTIMIZATION
-- =====================================================

-- 8. COMMISSION CALCULATIONS (High-frequency Financial Queries)
-- Note: Commission tables don't exist in current schema, creating placeholders
-- These would be used for commission tracking, payout calculations

-- Future commission optimization (when implemented)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissions_barber_date_optimized 
-- ON commissions(barber_id, created_at DESC, status, amount) 
-- WHERE status = 'approved';

-- Payout processing optimization (when implemented)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payouts_barber_period 
-- ON payouts(barker_id, payout_date, status, total_amount) 
-- WHERE status IN ('pending', 'completed');

-- =====================================================
-- PHASE 5: NOTIFICATION & COMMUNICATION
-- =====================================================

-- 9. NOTIFICATION DELIVERY & STATUS TRACKING
-- Addresses: Notification sending, delivery tracking, retry logic
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_queue_status_delivery 
ON notification_queue(status, delivery_method, scheduled_at, user_id, notification_type);

-- SMS conversation optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_conversations_user_status 
ON sms_conversations(customer_phone, status, created_at DESC, id);

-- SMS message tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_messages_conversation_time 
ON sms_messages(conversation_id, created_at DESC, direction, twilio_sid);

-- Email analytics optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_analytics_events_performance 
ON email_analytics_events(email_address, event_type, timestamp DESC, message_id, campaign_id);

-- =====================================================
-- PHASE 6: SEARCH & FILTERING OPTIMIZATION
-- =====================================================

-- 10. ADVANCED SEARCH FUNCTIONALITY
-- Addresses: Search APIs, filtering, admin dashboards
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_search_comprehensive 
ON appointments(location_id, status, start_time DESC, barber_id, client_id, service_id) 
WHERE status != 'cancelled';

-- User search optimization with full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search_comprehensive 
ON users(location_id, unified_role, is_active, email, first_name, last_name) 
WHERE is_active = true;

-- PostgreSQL full-text search support
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_fulltext_search_optimized 
ON users USING gin(to_tsvector('english', 
    COALESCE(first_name, '') || ' ' || 
    COALESCE(last_name, '') || ' ' || 
    COALESCE(email, '')
));

-- Client search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_search_optimized 
ON clients(email, phone, first_name, last_name, is_active) 
WHERE is_active = true;

-- =====================================================
-- PHASE 7: RECURRING APPOINTMENTS & BUSINESS LOGIC
-- =====================================================

-- 11. RECURRING APPOINTMENTS OPTIMIZATION
-- Addresses: Subscription business model, recurring booking management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_patterns_active 
ON recurring_appointment_patterns(client_id, barber_id, is_active, next_occurrence, frequency) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_series_active 
ON recurring_appointment_series(pattern_id, is_active, start_date, end_date) 
WHERE is_active = true;

-- Exception handling for recurring appointments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_exceptions_pattern_date 
ON recurring_appointment_exceptions(pattern_id, exception_date, exception_type);

-- 12. BOOKING RULES & VALIDATION
-- Addresses: Business rule enforcement, booking validation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_rules_location_active 
ON booking_rules(location_id, is_active, rule_type, priority) 
WHERE is_active = true;

-- Blackout dates optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blackout_dates_location_date 
ON blackout_dates(location_id, blackout_date, reason, is_active) 
WHERE is_active = true;

-- Holiday calendar optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holiday_calendar_date_location 
ON holiday_calendar(holiday_date, location_id, is_active) 
WHERE is_active = true;

-- =====================================================
-- PHASE 8: INTEGRATION & WEBHOOK OPTIMIZATION
-- =====================================================

-- 13. WEBHOOK & INTEGRATION PERFORMANCE
-- Addresses: Google Calendar sync, Stripe webhooks, third-party integrations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_endpoints_active 
ON webhook_endpoints(is_active, event_types, url, created_at DESC) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_logs_endpoint_status 
ON webhook_logs(endpoint_id, status, created_at DESC, event_type, response_code);

-- Marketing campaign optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketing_campaigns_active 
ON marketing_campaigns(is_active, campaign_type, start_date, end_date, target_audience) 
WHERE is_active = true;

-- =====================================================
-- PHASE 9: PERFORMANCE MONITORING & MAINTENANCE
-- =====================================================

-- 14. CACHE & PERFORMANCE TRACKING
-- Addresses: Cache invalidation, performance monitoring, optimization tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_invalidation_tracking_optimized 
ON appointments(barber_id, start_time, updated_at, status) 
WHERE updated_at > start_time - INTERVAL '1 hour';

-- Performance monitoring indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_monitoring_users_optimized 
ON users(created_at DESC, last_login_at DESC, is_active, unified_role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_monitoring_appointments_optimized 
ON appointments(created_at DESC, start_time DESC, updated_at DESC, status, location_id);

-- =====================================================
-- SPECIALIZED VIEWS FOR PERFORMANCE MONITORING
-- =====================================================

-- Query performance monitoring view
CREATE OR REPLACE VIEW v_query_performance_monitoring AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        WHEN idx_scan < 1000 THEN 'MODERATE_USAGE'
        ELSE 'HIGH_USAGE'
    END as usage_category,
    ROUND(100.0 * idx_tup_read / NULLIF(idx_scan, 0), 2) as avg_tuples_per_scan
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- Database health monitoring view
CREATE OR REPLACE VIEW v_database_health_metrics AS
SELECT 
    'table_sizes' as metric_type,
    schemaname || '.' || tablename as object_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'index_usage' as metric_type,
    schemaname || '.' || indexname as object_name,
    idx_scan::text as size,
    idx_scan as size_bytes
FROM pg_stat_user_indexes 
ORDER BY size_bytes DESC;

-- Real-time connection monitoring view
CREATE OR REPLACE VIEW v_connection_monitoring AS
SELECT 
    state,
    COUNT(*) as connection_count,
    MAX(NOW() - query_start) as longest_query_duration,
    AVG(NOW() - query_start) as avg_query_duration
FROM pg_stat_activity 
WHERE datname = current_database()
GROUP BY state;

-- =====================================================
-- MAINTENANCE FUNCTIONS
-- =====================================================

-- Function to analyze query performance impact
CREATE OR REPLACE FUNCTION analyze_query_performance_impact()
RETURNS TABLE(
    table_name text,
    index_name text,
    scans_before bigint,
    scans_after bigint,
    improvement_percentage numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::text,
        i.indexname::text,
        0::bigint as scans_before, -- Placeholder for before stats
        i.idx_scan as scans_after,
        0.0::numeric as improvement_percentage -- Calculate after implementation
    FROM pg_stat_user_indexes i
    JOIN pg_tables t ON i.tablename = t.tablename
    WHERE i.schemaname = 'public'
    ORDER BY i.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to monitor index creation progress
CREATE OR REPLACE FUNCTION monitor_index_creation_progress()
RETURNS TABLE(
    query text,
    state text,
    duration interval
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.query,
        a.state,
        NOW() - a.query_start as duration
    FROM pg_stat_activity a
    WHERE a.query LIKE '%CREATE INDEX CONCURRENTLY%'
    AND a.state != 'idle';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE VALIDATION QUERIES
-- =====================================================

-- Test queries to validate performance improvements
-- Run these before and after index creation to measure improvement

-- Query 1: User authentication performance test
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT id, email, unified_role, is_active 
-- FROM users 
-- WHERE email = 'test@example.com' AND is_active = true;

-- Query 2: Appointment availability check performance test  
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT id, start_time, end_time, status
-- FROM appointments 
-- WHERE barber_id = 1 
-- AND DATE(start_time) = CURRENT_DATE 
-- AND status IN ('confirmed', 'in_progress');

-- Query 3: Daily revenue analytics performance test
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT DATE_TRUNC('day', created_at) as date, SUM(amount) as revenue
-- FROM payments 
-- WHERE status = 'completed' 
-- AND created_at >= CURRENT_DATE - INTERVAL '30 days'
-- GROUP BY DATE_TRUNC('day', created_at)
-- ORDER BY date DESC;

-- Query 4: Client appointment history performance test
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT a.id, a.start_time, a.service_name, u.first_name as barber_name
-- FROM appointments a
-- JOIN users u ON a.barber_id = u.id
-- WHERE a.client_id = 1 
-- AND a.status != 'cancelled'
-- ORDER BY a.start_time DESC 
-- LIMIT 20;

-- =====================================================
-- INDEX MAINTENANCE SCHEDULE
-- =====================================================

-- Weekly maintenance routine
CREATE OR REPLACE FUNCTION weekly_index_maintenance()
RETURNS void AS $$
BEGIN
    -- Analyze tables for query planner optimization
    ANALYZE users;
    ANALYZE appointments;
    ANALYZE payments;
    ANALYZE services;
    ANALYZE clients;
    
    -- Log maintenance completion
    RAISE NOTICE 'Weekly index maintenance completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE TARGETS & EXPECTATIONS
-- =====================================================

/*
PERFORMANCE IMPROVEMENT TARGETS:

1. User Authentication Queries: 200ms → 20ms (90% improvement)
2. Appointment Availability Checks: 300ms → 50ms (83% improvement)  
3. Payment/Revenue Analytics: 500ms → 100ms (80% improvement)
4. Client History Queries: 150ms → 30ms (80% improvement)
5. Search & Filtering: 400ms → 80ms (80% improvement)
6. AI Analytics Queries: 800ms → 150ms (81% improvement)

OVERALL TARGET: 70% improvement (200-500ms → 50-150ms)

RESOURCE IMPACT:
- Index Storage: +150-250MB (acceptable for performance gain)  
- Write Performance: +5-15% overhead (acceptable for read optimization)
- Memory Usage: +100-200MB for index caching
- CPU Impact: Minimal during normal operations

IMPLEMENTATION TIMELINE:
- Phase 1 (Critical): Apply immediately - auth, booking, payment indexes
- Phase 2 (Analytics): Within 24 hours - AI dashboard optimization  
- Phase 3 (Advanced): Within 48 hours - full-text search, integrations
- Phase 4 (Monitoring): Within 72 hours - performance tracking setup

ROLLBACK PLAN:
- All indexes created with CONCURRENTLY for zero-downtime
- Individual indexes can be dropped if causing issues
- Performance monitoring to validate improvements
- Gradual rollout with validation at each phase
*/