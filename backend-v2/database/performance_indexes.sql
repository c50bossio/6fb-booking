-- BookedBarber V2 - Database Performance Indexes
-- Optimized for 10,000+ concurrent users
-- Created: 2025-07-23

-- USER TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
ON users(email) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active 
ON users(role, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_location_role 
ON users(location_id, role) WHERE is_active = true;

-- APPOINTMENT TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_barber_date 
ON appointments(barber_id, start_time) 
WHERE status IN ('confirmed', 'completed', 'in_progress');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_client_date 
ON appointments(client_id, start_time DESC) 
WHERE status != 'cancelled';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_date_status 
ON appointments(DATE(start_time), status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_barber_availability 
ON appointments(barber_id, start_time, end_time) 
WHERE status IN ('confirmed', 'in_progress');

-- PAYMENT TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_date 
ON payments(user_id, created_at DESC) 
WHERE status = 'completed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_appointment_status 
ON payments(appointment_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_stripe_id 
ON payments(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

-- ANALYTICS INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_revenue_reporting 
ON payments(DATE_TRUNC('day', created_at), location_id, amount) 
WHERE status = 'completed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_analytics 
ON appointments(DATE_TRUNC('hour', start_time), location_id, barber_id, status);
