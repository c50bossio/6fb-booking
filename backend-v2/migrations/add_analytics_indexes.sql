-- Analytics Performance Optimization Indexes
-- These indexes are specifically designed to improve analytics query performance

-- Create indexes for payments table (analytics-heavy table)
CREATE INDEX IF NOT EXISTS idx_payments_status_created_at ON payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_user_id_status ON payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Create indexes for appointments table (core analytics queries)
CREATE INDEX IF NOT EXISTS idx_appointments_user_id_start_time ON appointments(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status_start_time ON appointments(status, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_name ON appointments(service_name);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);

-- Create indexes for clients table (retention analytics)
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_id ON clients(id);

-- Create composite indexes for complex analytics queries
CREATE INDEX IF NOT EXISTS idx_appointments_user_status_time ON appointments(user_id, status, start_time);
CREATE INDEX IF NOT EXISTS idx_payments_user_status_created ON payments(user_id, status, created_at);

-- Index for Six Figure Barber metrics queries
CREATE INDEX IF NOT EXISTS idx_appointments_client_user_status ON appointments(client_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_amount_status ON payments(amount, status);

-- Enterprise analytics indexes (for multiple location queries)
CREATE INDEX IF NOT EXISTS idx_appointments_user_client_time ON appointments(user_id, client_id, start_time);
CREATE INDEX IF NOT EXISTS idx_payments_user_amount_created ON payments(user_id, amount, created_at);

-- Analyze tables after creating indexes to update query planner statistics
ANALYZE payments;
ANALYZE appointments;
ANALYZE clients;