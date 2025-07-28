#!/usr/bin/env python3
"""
Database Performance Monitoring for 6fb-booking Platform
=========================================================

This script provides monitoring queries to track the effectiveness of database indexes
and identify performance bottlenecks in the booking system.

Usage:
    python db_performance_monitoring.py [--database-url DATABASE_URL]
    
Environment Variables:
    DATABASE_URL: PostgreSQL connection string (defaults to development SQLite)
"""

import os
import sys
import time
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Any
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine import Engine


class DatabasePerformanceMonitor:
    """Monitor database performance and index usage."""
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.getenv(
            'DATABASE_URL', 
            'sqlite:///./backend-v2/6fb_booking.db'
        )
        self.engine = create_engine(self.database_url)
        self.is_postgresql = 'postgresql' in self.database_url
        
    def run_all_checks(self) -> Dict[str, Any]:
        """Run all performance monitoring checks."""
        print("🔍 Running Database Performance Analysis...")
        print(f"Database: {'PostgreSQL' if self.is_postgresql else 'SQLite'}")
        print(f"URL: {self.database_url}")
        print("-" * 60)
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'database_type': 'postgresql' if self.is_postgresql else 'sqlite',
            'checks': {}
        }
        
        # 1. Index Usage Statistics
        print("\n📊 1. INDEX USAGE STATISTICS")
        results['checks']['index_usage'] = self.check_index_usage()
        
        # 2. Query Performance Analysis
        print("\n⚡ 2. QUERY PERFORMANCE ANALYSIS")
        results['checks']['query_performance'] = self.analyze_query_performance()
        
        # 3. Table Statistics
        print("\n📈 3. TABLE STATISTICS")
        results['checks']['table_stats'] = self.get_table_statistics()
        
        # 4. Critical Query Benchmarks
        print("\n🎯 4. CRITICAL QUERY BENCHMARKS")
        results['checks']['query_benchmarks'] = self.benchmark_critical_queries()
        
        # 5. Index Size Analysis
        print("\n💾 5. INDEX SIZE ANALYSIS")
        results['checks']['index_sizes'] = self.analyze_index_sizes()
        
        return results
    
    def check_index_usage(self) -> Dict[str, Any]:
        """Check database index usage statistics."""
        if self.is_postgresql:
            return self._check_postgresql_index_usage()
        else:
            return self._check_sqlite_index_usage()
    
    def _check_postgresql_index_usage(self) -> Dict[str, Any]:
        """Check PostgreSQL index usage via pg_stat_user_indexes."""
        query = text("""
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_tup_read,
                idx_tup_fetch,
                idx_scan,
                CASE 
                    WHEN idx_scan = 0 THEN 'UNUSED'
                    WHEN idx_scan < 10 THEN 'LOW_USAGE'
                    WHEN idx_scan < 100 THEN 'MEDIUM_USAGE'
                    ELSE 'HIGH_USAGE'
                END as usage_level
            FROM pg_stat_user_indexes 
            WHERE tablename IN ('users', 'appointments', 'payments', 'barber_availability', 
                               'clients', 'services')
            ORDER BY idx_scan DESC;
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query)
            indexes = [dict(row) for row in result]
            
        # Analyze usage patterns
        usage_summary = {
            'UNUSED': 0,
            'LOW_USAGE': 0,
            'MEDIUM_USAGE': 0,
            'HIGH_USAGE': 0
        }
        
        for idx in indexes:
            usage_summary[idx['usage_level']] += 1
            print(f"  {idx['indexname']:30} | {idx['usage_level']:12} | Scans: {idx['idx_scan']:6}")
        
        print(f"\n  Summary: {usage_summary}")
        return {'indexes': indexes, 'usage_summary': usage_summary}
    
    def _check_sqlite_index_usage(self) -> Dict[str, Any]:
        """Check SQLite index information (limited compared to PostgreSQL)."""
        tables = ['users', 'appointments', 'payments', 'barber_availability', 'clients', 'services']
        indexes = []
        
        with self.engine.connect() as conn:
            for table in tables:
                try:
                    # Get indexes for each table
                    result = conn.execute(text(f"PRAGMA index_list({table})"))
                    table_indexes = [dict(row) for row in result]
                    
                    for idx in table_indexes:
                        # Get index info
                        idx_info = conn.execute(text(f"PRAGMA index_info({idx['name']})"))
                        columns = [dict(row)['name'] for row in idx_info]
                        
                        indexes.append({
                            'table': table,
                            'index_name': idx['name'],
                            'unique': bool(idx['unique']),
                            'columns': columns
                        })
                        print(f"  {idx['name']:30} | {table:15} | Columns: {', '.join(columns)}")
                        
                except Exception as e:
                    print(f"  ⚠ Error checking indexes for {table}: {e}")
        
        return {'indexes': indexes, 'note': 'SQLite provides limited index usage statistics'}
    
    def analyze_query_performance(self) -> Dict[str, Any]:
        """Analyze query performance using EXPLAIN."""
        critical_queries = {
            'barber_appointments': """
                SELECT * FROM appointments 
                WHERE barber_id = 1 AND start_time >= '2025-01-01' 
                ORDER BY start_time
            """,
            'user_login': """
                SELECT * FROM users 
                WHERE email = 'test@example.com' AND is_active = true
            """,
            'payment_history': """
                SELECT * FROM payments 
                WHERE user_id = 1 AND status = 'completed' 
                ORDER BY created_at DESC
            """,
            'barber_availability': """
                SELECT * FROM barber_availability 
                WHERE barber_id = 1 AND day_of_week = 1 AND is_active = true
            """
        }
        
        performance_results = {}
        
        with self.engine.connect() as conn:
            for query_name, query in critical_queries.items():
                try:
                    # Time the query execution
                    start_time = time.time()
                    
                    if self.is_postgresql:
                        explain_result = conn.execute(text(f"EXPLAIN ANALYZE {query}"))
                    else:
                        explain_result = conn.execute(text(f"EXPLAIN QUERY PLAN {query}"))
                    
                    execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds
                    
                    explain_output = [dict(row) for row in explain_result]
                    
                    performance_results[query_name] = {
                        'execution_time_ms': round(execution_time, 2),
                        'explain_plan': explain_output
                    }
                    
                    print(f"  {query_name:20} | {execution_time:6.2f}ms")
                    
                except Exception as e:
                    print(f"  ⚠ Error analyzing {query_name}: {e}")
                    performance_results[query_name] = {'error': str(e)}
        
        return performance_results
    
    def get_table_statistics(self) -> Dict[str, Any]:
        """Get table row counts and basic statistics."""
        tables = ['users', 'appointments', 'payments', 'barber_availability', 'clients', 'services']
        stats = {}
        
        with self.engine.connect() as conn:
            for table in tables:
                try:
                    # Get row count
                    result = conn.execute(text(f"SELECT COUNT(*) as count FROM {table}"))
                    row_count = result.fetchone()[0]
                    
                    stats[table] = {'row_count': row_count}
                    print(f"  {table:20} | {row_count:8} rows")
                    
                except Exception as e:
                    print(f"  ⚠ Error getting stats for {table}: {e}")
                    stats[table] = {'error': str(e)}
        
        return stats
    
    def benchmark_critical_queries(self) -> Dict[str, Any]:
        """Benchmark the most critical queries for the booking system."""
        benchmarks = {}
        
        # Define critical queries with realistic parameters
        critical_queries = {
            'dashboard_load': """
                SELECT COUNT(*) FROM appointments 
                WHERE barber_id = 1 AND start_time >= CURRENT_DATE
            """,
            'booking_conflicts': """
                SELECT COUNT(*) FROM appointments 
                WHERE barber_id = 1 
                AND start_time BETWEEN '2025-07-28 10:00:00' AND '2025-07-28 11:00:00'
                AND status IN ('confirmed', 'pending')
            """,
            'payment_processing': """
                SELECT * FROM payments 
                WHERE stripe_payment_intent_id = 'pi_test_123' 
                LIMIT 1
            """,
            'availability_check': """
                SELECT * FROM barber_availability 
                WHERE barber_id = 1 AND day_of_week = 1 AND is_active = true
            """
        }
        
        with self.engine.connect() as conn:
            for query_name, query in critical_queries.items():
                try:
                    # Run query multiple times for accurate timing
                    times = []
                    for _ in range(5):
                        start_time = time.time()
                        conn.execute(text(query))
                        end_time = time.time()
                        times.append((end_time - start_time) * 1000)
                    
                    avg_time = sum(times) / len(times)
                    min_time = min(times)
                    max_time = max(times)
                    
                    benchmarks[query_name] = {
                        'avg_time_ms': round(avg_time, 2),
                        'min_time_ms': round(min_time, 2),
                        'max_time_ms': round(max_time, 2),
                        'runs': len(times)
                    }
                    
                    performance_rating = "🟢 FAST" if avg_time < 10 else "🟡 MODERATE" if avg_time < 50 else "🔴 SLOW"
                    print(f"  {query_name:20} | {avg_time:6.2f}ms avg | {performance_rating}")
                    
                except Exception as e:
                    print(f"  ⚠ Error benchmarking {query_name}: {e}")
                    benchmarks[query_name] = {'error': str(e)}
        
        return benchmarks
    
    def analyze_index_sizes(self) -> Dict[str, Any]:
        """Analyze the size of database indexes."""
        if self.is_postgresql:
            return self._analyze_postgresql_index_sizes()
        else:
            return self._analyze_sqlite_index_sizes()
    
    def _analyze_postgresql_index_sizes(self) -> Dict[str, Any]:
        """Analyze PostgreSQL index sizes."""
        query = text("""
            SELECT 
                schemaname,
                tablename,
                indexname,
                pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
                pg_relation_size(indexrelid) as size_bytes
            FROM pg_stat_user_indexes 
            WHERE tablename IN ('users', 'appointments', 'payments', 'barber_availability', 
                               'clients', 'services')
            ORDER BY pg_relation_size(indexrelid) DESC;
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query)
            indexes = [dict(row) for row in result]
            
        total_size = sum(idx['size_bytes'] for idx in indexes)
        
        for idx in indexes:
            print(f"  {idx['indexname']:30} | {idx['index_size']:>10}")
        
        print(f"\n  Total Index Size: {total_size / 1024 / 1024:.2f} MB")
        
        return {'indexes': indexes, 'total_size_bytes': total_size}
    
    def _analyze_sqlite_index_sizes(self) -> Dict[str, Any]:
        """Analyze SQLite database size (limited index size info)."""
        try:
            # Get database file size
            db_path = self.database_url.replace('sqlite:///', '')
            if os.path.exists(db_path):
                db_size = os.path.getsize(db_path)
                print(f"  Database file size: {db_size / 1024 / 1024:.2f} MB")
                return {'database_size_bytes': db_size}
            else:
                print("  Database file not found")
                return {'error': 'Database file not found'}
        except Exception as e:
            print(f"  ⚠ Error analyzing database size: {e}")
            return {'error': str(e)}


def main():
    """Main function to run database performance monitoring."""
    parser = argparse.ArgumentParser(description='Monitor database performance for 6fb-booking')
    parser.add_argument('--database-url', help='Database URL (PostgreSQL or SQLite)')
    parser.add_argument('--output', help='Output results to JSON file')
    
    args = parser.parse_args()
    
    monitor = DatabasePerformanceMonitor(args.database_url)
    results = monitor.run_all_checks()
    
    if args.output:
        import json
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n📄 Results saved to: {args.output}")
    
    # Performance recommendations
    print("\n" + "="*60)
    print("🎯 PERFORMANCE RECOMMENDATIONS")
    print("="*60)
    
    query_benchmarks = results['checks'].get('query_benchmarks', {})
    slow_queries = [name for name, data in query_benchmarks.items() 
                   if isinstance(data, dict) and data.get('avg_time_ms', 0) > 50]
    
    if slow_queries:
        print("🔴 SLOW QUERIES DETECTED:")
        for query in slow_queries:
            avg_time = query_benchmarks[query]['avg_time_ms']
            print(f"   - {query}: {avg_time}ms (consider adding more specific indexes)")
    else:
        print("🟢 All critical queries performing well!")
    
    print("\n💡 GENERAL RECOMMENDATIONS:")
    print("   - Monitor index usage regularly")
    print("   - Run VACUUM on SQLite or ANALYZE on PostgreSQL monthly")
    print("   - Consider partitioning large tables (appointments, payments)")
    print("   - Implement query caching for frequently accessed data")


if __name__ == '__main__':
    main()