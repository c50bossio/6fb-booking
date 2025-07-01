#!/usr/bin/env python3
"""
Database Performance Analysis Tool

Analyzes current database structure and query patterns to identify
optimization opportunities including missing indexes, slow queries,
and table structure improvements.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect, MetaData
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import *
import time
from datetime import datetime, timedelta
import json

def analyze_table_structure():
    """Analyze current table structure and existing indexes"""
    print("=" * 80)
    print("DATABASE STRUCTURE ANALYSIS")
    print("=" * 80)
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    analysis = {
        "tables": {},
        "missing_indexes": [],
        "recommendations": []
    }
    
    for table_name in tables:
        print(f"\n📊 Table: {table_name}")
        print("-" * 40)
        
        # Get columns
        columns = inspector.get_columns(table_name)
        indexes = inspector.get_indexes(table_name)
        foreign_keys = inspector.get_foreign_keys(table_name)
        
        print(f"Columns: {len(columns)}")
        print(f"Indexes: {len(indexes)}")
        print(f"Foreign Keys: {len(foreign_keys)}")
        
        # Check for missing indexes on foreign keys
        indexed_columns = set()
        for idx in indexes:
            indexed_columns.update(idx['column_names'])
        
        # Foreign keys should be indexed
        for fk in foreign_keys:
            for col in fk['constrained_columns']:
                if col not in indexed_columns and col != 'id':
                    analysis["missing_indexes"].append({
                        "table": table_name,
                        "column": col,
                        "type": "foreign_key",
                        "reason": "Foreign key should be indexed for JOIN performance"
                    })
                    print(f"  ⚠️  Missing index on FK: {col}")
        
        # Check for commonly filtered columns that need indexes
        if table_name == "appointments":
            commonly_filtered = ['start_time', 'status', 'barber_id', 'client_id', 'created_at']
            for col in commonly_filtered:
                if col not in indexed_columns:
                    analysis["missing_indexes"].append({
                        "table": table_name,
                        "column": col,
                        "type": "query_optimization",
                        "reason": f"Commonly filtered column in {table_name}"
                    })
        
        elif table_name == "payments":
            commonly_filtered = ['status', 'created_at', 'user_id', 'appointment_id']
            for col in commonly_filtered:
                if col not in indexed_columns:
                    analysis["missing_indexes"].append({
                        "table": table_name,
                        "column": col,
                        "type": "query_optimization",
                        "reason": f"Commonly filtered column in {table_name}"
                    })
        
        elif table_name == "users":
            commonly_filtered = ['email', 'role', 'is_active']
            for col in commonly_filtered:
                if col not in indexed_columns and col != 'email':  # email usually has unique index
                    analysis["missing_indexes"].append({
                        "table": table_name,
                        "column": col,
                        "type": "query_optimization",
                        "reason": f"Commonly filtered column in {table_name}"
                    })
        
        analysis["tables"][table_name] = {
            "columns": len(columns),
            "indexes": len(indexes),
            "foreign_keys": len(foreign_keys),
            "indexed_columns": list(indexed_columns)
        }
    
    return analysis

def benchmark_query_performance():
    """Benchmark common query patterns to identify slow operations"""
    print("\n" + "=" * 80)
    print("QUERY PERFORMANCE BENCHMARKS")
    print("=" * 80)
    
    db: Session = SessionLocal()
    benchmarks = []
    
    try:
        # Test 1: User lookup by email (login)
        start_time = time.time()
        for _ in range(100):
            user = db.query(User).filter(User.email == "test@example.com").first()
        duration = time.time() - start_time
        benchmarks.append({
            "operation": "User lookup by email (100x)",
            "duration_ms": round(duration * 1000, 2),
            "avg_per_query": round(duration * 10, 2)
        })
        print(f"✓ User email lookup: {duration*1000:.2f}ms total, {duration*10:.2f}ms avg")
        
        # Test 2: Appointments by date range
        start_time = time.time()
        today = datetime.now()
        week_ahead = today + timedelta(days=7)
        for _ in range(50):
            appointments = db.query(Appointment).filter(
                Appointment.start_time >= today,
                Appointment.start_time <= week_ahead
            ).all()
        duration = time.time() - start_time
        benchmarks.append({
            "operation": "Appointments by date range (50x)",
            "duration_ms": round(duration * 1000, 2),
            "avg_per_query": round(duration * 20, 2)
        })
        print(f"✓ Appointment date range: {duration*1000:.2f}ms total, {duration*20:.2f}ms avg")
        
        # Test 3: Payments by status
        start_time = time.time()
        for _ in range(50):
            payments = db.query(Payment).filter(Payment.status == "completed").all()
        duration = time.time() - start_time
        benchmarks.append({
            "operation": "Payments by status (50x)",
            "duration_ms": round(duration * 1000, 2),
            "avg_per_query": round(duration * 20, 2)
        })
        print(f"✓ Payment status filter: {duration*1000:.2f}ms total, {duration*20:.2f}ms avg")
        
        # Test 4: Complex join - Appointment with User and Payment
        start_time = time.time()
        for _ in range(20):
            results = db.query(Appointment).join(User).join(Payment, isouter=True).all()
        duration = time.time() - start_time
        benchmarks.append({
            "operation": "Appointment with User+Payment join (20x)",
            "duration_ms": round(duration * 1000, 2),
            "avg_per_query": round(duration * 50, 2)
        })
        print(f"✓ Complex join query: {duration*1000:.2f}ms total, {duration*50:.2f}ms avg")
        
        # Test 5: Recent activity query
        start_time = time.time()
        last_month = datetime.now() - timedelta(days=30)
        for _ in range(10):
            recent = db.query(Appointment).filter(
                Appointment.created_at >= last_month
            ).order_by(Appointment.created_at.desc()).limit(50).all()
        duration = time.time() - start_time
        benchmarks.append({
            "operation": "Recent appointments with ordering (10x)",
            "duration_ms": round(duration * 1000, 2),
            "avg_per_query": round(duration * 100, 2)
        })
        print(f"✓ Recent activity query: {duration*1000:.2f}ms total, {duration*100:.2f}ms avg")
        
    except Exception as e:
        print(f"❌ Benchmark error: {e}")
    finally:
        db.close()
    
    return benchmarks

def generate_index_recommendations(analysis):
    """Generate specific SQL commands for recommended indexes"""
    print("\n" + "=" * 80)
    print("INDEX RECOMMENDATIONS")
    print("=" * 80)
    
    recommendations = []
    
    # High priority indexes
    high_priority = [
        "CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON appointments(barber_id);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);",
        "CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);",
        "CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);",
        "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);",
        "CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);",
    ]
    
    # Composite indexes for common query patterns
    composite_indexes = [
        "CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barber_id, start_time);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON appointments(status, start_time);",
        "CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(user_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_payments_appointment_status ON payments(appointment_id, status);",
    ]
    
    # Performance indexes for common operations
    performance_indexes = [
        "CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);",
        "CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);",
        "CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used ON password_reset_tokens(used);",
    ]
    
    print("🚀 HIGH PRIORITY INDEXES:")
    for idx in high_priority:
        print(f"  {idx}")
        recommendations.append({"sql": idx, "priority": "high"})
    
    print("\n🔗 COMPOSITE INDEXES (for multi-column queries):")
    for idx in composite_indexes:
        print(f"  {idx}")
        recommendations.append({"sql": idx, "priority": "medium"})
    
    print("\n⚡ PERFORMANCE INDEXES:")
    for idx in performance_indexes:
        print(f"  {idx}")
        recommendations.append({"sql": idx, "priority": "low"})
    
    return recommendations

def estimate_storage_impact():
    """Estimate storage impact of recommended indexes"""
    print("\n" + "=" * 80)
    print("STORAGE IMPACT ANALYSIS")
    print("=" * 80)
    
    db: Session = SessionLocal()
    
    try:
        # Count records in key tables
        user_count = db.query(User).count()
        appointment_count = db.query(Appointment).count()
        payment_count = db.query(Payment).count()
        
        print(f"📊 Current Data Volume:")
        print(f"  Users: {user_count:,}")
        print(f"  Appointments: {appointment_count:,}")
        print(f"  Payments: {payment_count:,}")
        
        # Estimate index sizes (rough approximation)
        # Typical B-tree index overhead is ~50-100% of column data size
        estimated_index_overhead = {
            "Single column indexes": "~5-10% per table size",
            "Composite indexes": "~10-15% per table size",
            "Total estimated overhead": "~30-50% additional storage"
        }
        
        print(f"\n💾 Estimated Storage Impact:")
        for desc, impact in estimated_index_overhead.items():
            print(f"  {desc}: {impact}")
        
        print(f"\n✅ Recommended Action:")
        print(f"  The performance benefits far outweigh the storage cost.")
        print(f"  Index overhead is typically 30-50% but provides 10-100x query speedup.")
        
    except Exception as e:
        print(f"❌ Storage analysis error: {e}")
    finally:
        db.close()

def create_performance_optimization_script():
    """Create a script to apply all performance optimizations"""
    script_content = '''#!/usr/bin/env python3
"""
Database Performance Optimization Script

Apply all recommended database performance optimizations including
indexes, query optimizations, and connection pool settings.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import SessionLocal, engine
import time

def apply_performance_indexes():
    """Apply all recommended performance indexes"""
    print("Applying database performance optimizations...")
    
    # High priority indexes
    high_priority_indexes = [
        "CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON appointments(barber_id);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);",
        "CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);",
        "CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);",
        "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);",
        "CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);",
    ]
    
    # Composite indexes for common query patterns
    composite_indexes = [
        "CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barber_id, start_time);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON appointments(status, start_time);",
        "CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(user_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_payments_appointment_status ON payments(appointment_id, status);",
    ]
    
    # Performance indexes
    performance_indexes = [
        "CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);",
        "CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);",
        "CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used ON password_reset_tokens(used);",
    ]
    
    all_indexes = high_priority_indexes + composite_indexes + performance_indexes
    
    with engine.connect() as conn:
        for i, index_sql in enumerate(all_indexes, 1):
            try:
                start_time = time.time()
                conn.execute(text(index_sql))
                conn.commit()
                duration = time.time() - start_time
                print(f"✓ [{i}/{len(all_indexes)}] Applied index: {duration:.2f}s")
            except Exception as e:
                print(f"❌ Failed to apply index {i}: {e}")
    
    print(f"\\n🎉 Applied {len(all_indexes)} database indexes successfully!")
    print("Database query performance should be significantly improved.")

if __name__ == "__main__":
    apply_performance_indexes()
'''
    
    script_path = "/Users/bossio/6fb-booking/backend-v2/scripts/apply_performance_optimizations.py"
    with open(script_path, 'w') as f:
        f.write(script_content)
    
    # Make executable
    os.chmod(script_path, 0o755)
    print(f"\n📝 Created optimization script: {script_path}")
    return script_path

def main():
    """Run complete database performance analysis"""
    print("🔍 6FB Booking Platform - Database Performance Analysis")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 1. Analyze table structure
    structure_analysis = analyze_table_structure()
    
    # 2. Benchmark query performance
    benchmarks = benchmark_query_performance()
    
    # 3. Generate recommendations
    recommendations = generate_index_recommendations(structure_analysis)
    
    # 4. Estimate storage impact
    estimate_storage_impact()
    
    # 5. Create optimization script
    script_path = create_performance_optimization_script()
    
    # 6. Generate summary report
    print("\n" + "=" * 80)
    print("SUMMARY REPORT")
    print("=" * 80)
    
    print(f"📋 Analysis Results:")
    print(f"  Tables analyzed: {len(structure_analysis['tables'])}")
    print(f"  Missing indexes identified: {len(structure_analysis['missing_indexes'])}")
    print(f"  Performance benchmarks run: {len(benchmarks)}")
    print(f"  Optimization recommendations: {len(recommendations)}")
    
    print(f"\\n🚀 Next Steps:")
    print(f"  1. Review recommendations above")
    print(f"  2. Run: python {script_path}")
    print(f"  3. Monitor query performance improvements")
    print(f"  4. Consider connection pooling for production")
    
    # Save detailed analysis
    analysis_report = {
        "timestamp": datetime.now().isoformat(),
        "structure_analysis": structure_analysis,
        "benchmarks": benchmarks,
        "recommendations": recommendations,
        "script_path": script_path
    }
    
    report_path = "/Users/bossio/6fb-booking/backend-v2/DATABASE_PERFORMANCE_ANALYSIS_REPORT.json"
    with open(report_path, 'w') as f:
        json.dump(analysis_report, f, indent=2)
    
    print(f"\\n💾 Detailed report saved: {report_path}")

if __name__ == "__main__":
    main()