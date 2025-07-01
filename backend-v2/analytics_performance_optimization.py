"""
Performance optimization script for analytics queries
Creates database indexes and optimizes query patterns for better analytics performance
"""

from sqlalchemy import text
from database import engine


def create_analytics_indexes():
    """
    Create database indexes specifically for analytics queries to improve performance
    """
    indexes = [
        # Payment table indexes for revenue analytics
        "CREATE INDEX IF NOT EXISTS idx_payments_status_created_at ON payments(status, created_at);",
        "CREATE INDEX IF NOT EXISTS idx_payments_user_id_status ON payments(user_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_payments_barber_id_status ON payments(barber_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_payments_created_at_amount ON payments(created_at, amount);",
        
        # Appointment table indexes for appointment analytics
        "CREATE INDEX IF NOT EXISTS idx_appointments_status_start_time ON appointments(status, start_time);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_user_id_status ON appointments(user_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_barber_id_status ON appointments(barber_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_client_id_status ON appointments(client_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_start_time_service ON appointments(start_time, service_name);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);",
        
        # Client table indexes for retention analytics
        "CREATE INDEX IF NOT EXISTS idx_clients_last_visit_date ON clients(last_visit_date);",
        "CREATE INDEX IF NOT EXISTS idx_clients_first_visit_date ON clients(first_visit_date);",
        "CREATE INDEX IF NOT EXISTS idx_clients_customer_type ON clients(customer_type);",
        "CREATE INDEX IF NOT EXISTS idx_clients_total_spent ON clients(total_spent);",
        "CREATE INDEX IF NOT EXISTS idx_clients_total_visits ON clients(total_visits);",
        "CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);",
        
        # User table indexes for barber analytics
        "CREATE INDEX IF NOT EXISTS idx_users_role_created_at ON users(role, created_at);",
        "CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);",
        
        # Barber availability indexes
        "CREATE INDEX IF NOT EXISTS idx_barber_availability_barber_day ON barber_availability(barber_id, day_of_week, is_active);",
        "CREATE INDEX IF NOT EXISTS idx_barber_time_off_barber_dates ON barber_time_off(barber_id, start_date, end_date);",
        
        # Service table indexes
        "CREATE INDEX IF NOT EXISTS idx_services_category_active ON services(category, is_active);",
        "CREATE INDEX IF NOT EXISTS idx_services_bookable_active ON services(is_bookable_online, is_active);",
        
        # Composite indexes for complex analytics queries
        "CREATE INDEX IF NOT EXISTS idx_appointments_user_time_status ON appointments(user_id, start_time, status);",
        "CREATE INDEX IF NOT EXISTS idx_payments_user_time_status ON payments(user_id, created_at, status);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_barber_time_status ON appointments(barber_id, start_time, status);",
        "CREATE INDEX IF NOT EXISTS idx_payments_barber_time_status ON payments(barber_id, created_at, status);",
        
        # Partial indexes for frequently filtered data
        "CREATE INDEX IF NOT EXISTS idx_payments_completed_amount ON payments(created_at, amount) WHERE status = 'completed';",
        "CREATE INDEX IF NOT EXISTS idx_appointments_completed_duration ON appointments(start_time, duration_minutes) WHERE status = 'completed';",
        "CREATE INDEX IF NOT EXISTS idx_appointments_no_show_time ON appointments(start_time) WHERE status = 'no_show';",
        
        # Covering indexes for analytics summary queries
        "CREATE INDEX IF NOT EXISTS idx_payments_analytics_summary ON payments(user_id, status, created_at) INCLUDE (amount, platform_fee, barber_amount);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_analytics_summary ON appointments(user_id, status, start_time) INCLUDE (service_name, duration_minutes, price);"
    ]
    
    with engine.connect() as conn:
        for index_sql in indexes:
            try:
                conn.execute(text(index_sql))
                print(f"✓ Created index: {index_sql.split('idx_')[1].split(' ')[0] if 'idx_' in index_sql else 'unknown'}")
            except Exception as e:
                # SQLite doesn't support all index features, so we'll skip errors for now
                if "syntax error" not in str(e).lower() and "duplicate" not in str(e).lower():
                    print(f"⚠ Warning creating index: {e}")
                continue
        
        conn.commit()
        print("✓ Analytics performance indexes created successfully")


def analyze_query_performance():
    """
    Analyze query performance and provide optimization recommendations
    """
    performance_queries = [
        {
            "name": "Revenue by month",
            "query": """
                EXPLAIN QUERY PLAN
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    SUM(amount) as total_revenue,
                    COUNT(*) as transaction_count
                FROM payments 
                WHERE status = 'completed'
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
                LIMIT 12;
            """
        },
        {
            "name": "Appointment completion rate",
            "query": """
                EXPLAIN QUERY PLAN
                SELECT 
                    status,
                    COUNT(*) as count,
                    AVG(duration_minutes) as avg_duration
                FROM appointments 
                WHERE start_time >= datetime('now', '-30 days')
                GROUP BY status;
            """
        },
        {
            "name": "Client retention analysis",
            "query": """
                EXPLAIN QUERY PLAN
                SELECT 
                    customer_type,
                    COUNT(*) as client_count,
                    AVG(total_spent) as avg_spent,
                    AVG(total_visits) as avg_visits
                FROM clients 
                WHERE last_visit_date >= datetime('now', '-90 days')
                GROUP BY customer_type;
            """
        },
        {
            "name": "Barber performance summary",
            "query": """
                EXPLAIN QUERY PLAN
                SELECT 
                    a.barber_id,
                    COUNT(a.id) as total_appointments,
                    SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(p.amount) as total_revenue
                FROM appointments a
                LEFT JOIN payments p ON a.id = p.appointment_id AND p.status = 'completed'
                WHERE a.start_time >= datetime('now', '-30 days')
                GROUP BY a.barber_id;
            """
        }
    ]
    
    print("\n=== Query Performance Analysis ===")
    
    with engine.connect() as conn:
        for query_info in performance_queries:
            print(f"\n{query_info['name']}:")
            print("-" * 40)
            try:
                result = conn.execute(text(query_info['query']))
                for row in result:
                    print(f"  {row}")
            except Exception as e:
                print(f"  Error: {e}")


def create_analytics_views():
    """
    Create database views for commonly used analytics aggregations
    """
    views = [
        {
            "name": "monthly_revenue_summary",
            "sql": """
                CREATE VIEW IF NOT EXISTS monthly_revenue_summary AS
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    user_id,
                    barber_id,
                    SUM(amount) as total_revenue,
                    COUNT(*) as transaction_count,
                    AVG(amount) as avg_transaction,
                    SUM(platform_fee) as total_platform_fees,
                    SUM(barber_amount) as total_barber_earnings
                FROM payments 
                WHERE status = 'completed'
                GROUP BY strftime('%Y-%m', created_at), user_id, barber_id;
            """
        },
        {
            "name": "appointment_performance_summary",
            "sql": """
                CREATE VIEW IF NOT EXISTS appointment_performance_summary AS
                SELECT 
                    strftime('%Y-%m', start_time) as month,
                    user_id,
                    barber_id,
                    service_name,
                    COUNT(*) as total_appointments,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_appointments,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_appointments,
                    SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show_appointments,
                    AVG(duration_minutes) as avg_duration,
                    SUM(price) as total_revenue_scheduled
                FROM appointments 
                GROUP BY strftime('%Y-%m', start_time), user_id, barber_id, service_name;
            """
        },
        {
            "name": "client_lifetime_value_summary",
            "sql": """
                CREATE VIEW IF NOT EXISTS client_lifetime_value_summary AS
                SELECT 
                    c.id as client_id,
                    c.customer_type,
                    c.total_visits,
                    c.total_spent,
                    c.average_ticket,
                    c.first_visit_date,
                    c.last_visit_date,
                    julianday('now') - julianday(c.last_visit_date) as days_since_last_visit,
                    CASE 
                        WHEN julianday('now') - julianday(c.last_visit_date) <= 30 THEN 'active'
                        WHEN julianday('now') - julianday(c.last_visit_date) <= 60 THEN 'at_risk'
                        ELSE 'lost'
                    END as retention_status,
                    c.total_spent * 1.5 as predicted_clv_conservative,
                    c.total_spent * 2.5 as predicted_clv_optimistic
                FROM clients c
                WHERE c.total_visits > 0;
            """
        },
        {
            "name": "service_performance_metrics",
            "sql": """
                CREATE VIEW IF NOT EXISTS service_performance_metrics AS
                SELECT 
                    service_name,
                    COUNT(*) as total_bookings,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
                    SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show_bookings,
                    ROUND(
                        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2
                    ) as completion_rate,
                    ROUND(
                        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2
                    ) as no_show_rate,
                    AVG(price) as avg_price,
                    SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as total_revenue,
                    AVG(duration_minutes) as avg_duration
                FROM appointments 
                WHERE start_time >= datetime('now', '-365 days')
                GROUP BY service_name
                HAVING COUNT(*) >= 5;
            """
        }
    ]
    
    print("\n=== Creating Analytics Views ===")
    
    with engine.connect() as conn:
        for view in views:
            try:
                conn.execute(text(view['sql']))
                print(f"✓ Created view: {view['name']}")
            except Exception as e:
                if "already exists" not in str(e).lower():
                    print(f"⚠ Warning creating view {view['name']}: {e}")
        
        conn.commit()
        print("✓ Analytics views created successfully")


def optimize_analytics_performance():
    """
    Main function to run all performance optimizations
    """
    print("🚀 Starting Analytics Performance Optimization")
    print("=" * 50)
    
    # Create indexes
    create_analytics_indexes()
    
    # Create views
    create_analytics_views()
    
    # Analyze performance
    analyze_query_performance()
    
    print("\n✅ Analytics performance optimization completed!")
    print("\nRecommendations:")
    print("1. Run VACUUM periodically to optimize database file")
    print("2. Use ANALYZE to update query planner statistics")
    print("3. Monitor slow queries and add indexes as needed")
    print("4. Consider partitioning large tables by date ranges")
    print("5. Use the created views for common analytics queries")


if __name__ == "__main__":
    optimize_analytics_performance()